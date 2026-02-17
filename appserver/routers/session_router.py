"""FastAPI router for video endpoints."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from PrintMessages import start_action, end_action, info_message, error_message

# Define the router for the session endpoints
router = APIRouter(prefix="/session", tags=["session"])

# Server-side session management
# TODO: Add a database to store the sessions
DEFAULT_SESSION_ID = "default"
sessions = {}  # sessionId -> [id, id, ...]
session_connections = {}  # sessionId -> { id: websocket }
_next_user_id = 0


async def _broadcast_user_joined(session_id: str, new_id: int):
    """Notify all participants except new_id that a user joined."""
    if session_id not in session_connections:
        return
    count = len(sessions.get(session_id, []))
    for uid, ws in list(session_connections[session_id].items()):
        if uid != new_id:
            try:
                await ws.send_json({"type": "user_joined", "id": new_id, "count": count})
            except Exception:
                pass


async def _broadcast_user_left(session_id: str, left_id: int):
    """Notify all participants that a user left."""
    if session_id not in session_connections:
        return
    count = len(sessions.get(session_id, []))
    for uid, ws in list(session_connections[session_id].items()):
        try:
            await ws.send_json({"type": "user_left", "id": left_id, "count": count})
        except Exception:
            pass


@router.websocket("/ws/{session_id:str}/{id:int}")
async def session_join_websocket(websocket: WebSocket, session_id: str, id: int):
    """Join session. If first to enter, creates the session."""
    global _next_user_id
    await websocket.accept()

    # If first to enter, create session
    if session_id not in sessions:
        sessions[session_id] = []
        session_connections[session_id] = {}
    if session_id not in session_connections:
        session_connections[session_id] = {}

    # Assign id if 0 (first join), otherwise use provided id
    user_id = id
    if id == 0:
        _next_user_id += 1
        user_id = _next_user_id
        sessions[session_id].append(user_id)

    if user_id not in sessions[session_id]:
        sessions[session_id].append(user_id)

    session_connections[session_id][user_id] = websocket
    start_action("Session", "Join session", f"{session_id} id={user_id}")

    await _broadcast_user_joined(session_id, user_id)

    try:
        await websocket.send_json({
            "success": True,
            "sessionId": session_id,
            "id": user_id,
            "count": len(sessions[session_id]),
            "participants": list(sessions[session_id]),
        })
        end_action("Session", "Join session", session_id)
        import json
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                msg_type = msg.get("type")
                to_id = msg.get("to")
                if msg_type in ("offer", "answer", "ice") and to_id is not None:
                    if session_id in session_connections and to_id in session_connections[session_id]:
                        msg["from"] = user_id
                        await session_connections[session_id][to_id].send_json(msg)
            except (json.JSONDecodeError, KeyError):
                pass
    except WebSocketDisconnect:
        pass
    finally:
        if session_id in session_connections:
            session_connections[session_id].pop(user_id, None)
            if not session_connections[session_id]:
                del session_connections[session_id]
        if session_id in sessions and user_id in sessions[session_id]:
            sessions[session_id].remove(user_id)
            if not sessions[session_id]:
                del sessions[session_id]
            else:
                await _broadcast_user_left(session_id, user_id)


@router.get("/count/{session_id:str}")
def get_session_count(session_id: str):
    """Return the number of people in the session."""
    if session_id not in sessions:
        return {"success": False, "error": "Session not found"}
    return {"success": True, "count": len(sessions[session_id])}


@router.get("/stop/{session_id:str}/{id:int}")
def stop_session(session_id: str, id: int):
    """Remove the given id from the session."""
    start_action("Session", "Stop session", f"{session_id} id={id}")

    if session_id not in sessions:
        error_message("Session", "Session not found", session_id)
        return {'success': False, 'error': 'Session not found'}

    ids = sessions[session_id]
    if id in ids:
        ids.remove(id)
        if not ids:
            del sessions[session_id]
        end_action("Session", "Stop session", session_id)
        return {'success': True, 'message': 'User left session'}
    else:
        error_message("Session", "ID not in session", id)
        return {'success': False, 'error': 'ID not in session'}