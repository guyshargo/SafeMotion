"""FastAPI router for video endpoints."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from PrintMessages import start_action, end_action, info_message, error_message
from Trainer import StubTrainer
import json

# Define the router for the session endpoints
router = APIRouter(prefix="/session", tags=["session"])

# Server-side session management
# TODO: Add a database to store the sessions
DEFAULT_TRAINER = StubTrainer()
sessions = {} 
session_connections = {}  

"""
Send a message to a socket.
@param {WebSocket} socket - The socket to send the message to
@param {dict} message - The message to send
@returns {None}
"""
async def _send_message(socket: WebSocket, message: dict):
    try:
        await socket.send_json(message)
    except Exception:
        pass

"""
Broadcast a message to all sockets in a session.
@param {string} sender_id - The id of the sender
@param {string} session_id - The session id
@param {dict} message - The message to broadcast
@returns {None}
"""
async def _broadcast_message(sender_id: str, session_id: str, message: dict):
    # Check if session exists
    if session_id not in session_connections:
        return
    
    count = len(sessions[session_id])
    message["count"] = count

    # Send message to all sockets in the session
    for id, socket in list(session_connections[session_id].items()):
        if id == sender_id:
            continue
        await _send_message(socket, message)

"""
Listen for messages from the client.
@param {WebSocket} websocket - The websocket connection
@param {string} session_id - The session id
@param {string} id - The id of the user
@returns {None}
"""
async def listen(websocket: WebSocket, session_id: str, id: str):
    # Listen for messages from the client
    while True:
        message = await websocket.receive_text()
        if not message:
            continue

        start_action("Session", "Got message", { session_id, id })
        try:
            message = json.loads(message)
            msg_type = message.get("type")
            to_id = message.get("to")

            if msg_type in ("offer", "answer", "ice") and to_id is not None:
                to_id_key = str(to_id)  # Keys are strings (from URL path)
                if session_id in session_connections and to_id_key in session_connections[session_id]:
                    message["from"] = id
                    await _send_message(session_connections[session_id][to_id_key], message)
        except (json.JSONDecodeError, KeyError):
            pass
"""
Join session. If first to enter, creates the session.
@param {WebSocket} websocket - The websocket connection
@param {string} session_id - The session id
@param {string} id - The id of the user
@returns {dict} - The response
"""
@router.websocket("/ws/{session_id:str}/{id:str}")
async def session_join_websocket(websocket: WebSocket, session_id: str, id: str):
    start_action("Session", "Join session websocket", { session_id, id })

    await websocket.accept()

    # If first to enter, create session
    if session_id not in sessions:
        sessions[session_id] = []
        session_connections[session_id] = {} 

    # Add id to session (avoid duplicates from same user connecting multiple times)
    if id not in sessions[session_id]:
        sessions[session_id].append(id)
    session_connections[session_id][id] = websocket

    info_message("Session", f"Added id to session and session connections: session_id={session_id}, id={id}")

    # Broadcast user joined to all other participants
    message = { "type": "user_joined" , "id": id }
    await _broadcast_message(id, session_id, message)

    try:
        # Send success message to client
        await websocket.send_json({
            "type":"join", 
            "success": True, 
            "sessionId": session_id, 
            "participants": list(sessions[session_id])
        })

        end_action("Session", "Join session websocket", session_id)

        # Listen for messages from the client
        await listen(websocket, session_id, id)
        
    except WebSocketDisconnect:
        pass
    finally:
        start_action("Session", "Leave session websocket", { session_id, id })
        # Remove id from session and session connections
        if session_id in session_connections:
            session_connections[session_id].pop(id, None)
            if not session_connections[session_id]:
                del session_connections[session_id]

        # Remove id from session (remove all occurrences)
        if session_id in sessions and id in sessions[session_id]:
            sessions[session_id] = [x for x in sessions[session_id] if x != id]
            if not sessions[session_id]:
                del sessions[session_id]
            else:
                await _broadcast_message(id, session_id, { "type": "user_left", "id": id })

        end_action("Session", "Leave session websocket", { session_id, id })


"""
Stop a session.
@param {string} session_id - The session id
@param {string} id - The id of the user
@returns {dict} - The response
"""
@router.get("/stop/{session_id:str}/{id:str}")
async def stop_session(session_id: str, id: str):
    start_action("Session", "Stop session", f"{session_id} id={id}")

    # Check if session exists
    if session_id not in sessions:
        error_message("Session", "Session not found", session_id)
        return {'success': False, 'error': 'Session not found'}

    # Get the ids in the session
    ids = sessions[session_id]

    # Check if the id is in the session
    if id in ids:
        ids.remove(id)

        # Check if the session is empty
        if not ids:
            del sessions[session_id]
        else:
            await _broadcast_message(id, session_id, {"type": "user_left", "id": id})

        # Close websocket if connected
        if session_id in session_connections and id in session_connections[session_id]:
            ws = session_connections[session_id].pop(id, None)

            # Check if the session connection is empty
            if not session_connections[session_id]:
                del session_connections[session_id]
            if ws is not None:
                await ws.close()
                
        end_action("Session", "Stop session", session_id)
        return {'success': True, 'message': 'User left session'}
    else:
        error_message("Session", "ID not in session", id)
        return {'success': False, 'error': 'ID not in session'}

"""
Get training session.
@param {string} session_id - The session id
@returns {dict} - The response
"""
@router.get("/{session_id:str}")
async def get_trainer(session_id: str):
    start_action("Session", "Get session schedule", session_id)

    # TODO: Get the session schedule from the database
    trainer = DEFAULT_TRAINER.toJson()

    end_action("Session", "Get session schedule", session_id)
    return {'success': True, 'data': trainer}

