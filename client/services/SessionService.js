import {SocketConnection} from './SocketConnection';

const SERVER_URL = "http://127.0.0.1:8000";
const SERVER_WS_URL = "ws://127.0.0.1:8000";

export const DEFAULT_SESSION_ID = "default";

/** 
 * Join a session
 * @param {string} sessionId - The session id
 * @param {string} id - The id of the user
 * @returns {Promise<{success: boolean, error: string, id: string, sessionId: string, participantCount: number, participants: string[], onUserJoined: (cb: (id: string, count: number) => void) => void, onUserLeft: (cb: (id: string, count: number) => void) => void, onSignal: (cb: (data: any) => void) => void, sendSignal: (msg: any) => void, onStreamAdded: (cb: (id: string, stream: MediaStream) => void) => void, addRemoteStream: (remoteId: string, stream: MediaStream) => void, getRemoteStreams: () => {id: string, stream: MediaStream}[], close: () => void}>}
 */
export const joinSession = async (sessionId, id) => {
    // Check if session id is missing
    if (!sessionId) return { success: false, error: "Missing session id" };

    try {
        const socketConnection = new SocketConnection(`${SERVER_WS_URL}/session/ws`);
        const response = await socketConnection.connect(sessionId, id);

        return {success: true, data: response};
    } catch (error) {
        console.error('Error joining session:', error);
        const message = error?.error ?? error?.message ?? String(error);
        return { success: false, error: message };
    }
};

export const getSessionCount = async (sessionId) => {
    try {
        const res = await fetch(`${SERVER_URL}/session/count/${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        return data.success ? data.count : 0;
    } catch (error) {
        console.error("Error getting session count:", error);
        return 0;
    }
};

