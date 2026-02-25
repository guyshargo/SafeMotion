import { SocketConnection } from './SocketConnection';

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

        return { success: true, data: response };
    } catch (error) {
        console.error('Error joining session:', error);
        const message = error?.error ?? error?.message ?? String(error);
        return { success: false, error: message };
    }
};


/**
 * Stop a session
 * @param {string} sessionId - The session id
 * @param {string} id - The id of the user
 * @returns {Promise<{success: boolean, error: string}>}
 */
export const stopSession = async (sessionId, id) => {
    // Check if session id is missing
    if (!sessionId) return { success: false, error: "Missing session id" };
    if (!id) return { success: false, error: "Missing id" };

    try {
        // Send request to stop the session
        const response = await fetch(`${SERVER_URL}/session/stop/${sessionId}/${id}`);
        const data = await response.json();

        // Check if the request was successful
        return data.success ?
            { success: true, data: data.message } :
            { success: false, error: data.error };

    } catch (error) {
        console.error('Error stopping session:', error);
        const message = error?.error ?? error?.message ?? String(error);
        return { success: false, error: message };
    }
}; 

/**
 * Get training session schedule
 * @param {string} sessionId - The id of the session
 * @returns {Promise<{success: boolean, data: Array<>}>}
 */
export const getTrainingSessionSchedule = async (sessionId) => {
    // Check if session id is missing
    if (!sessionId) return { success: false, error: "Missing session id" };

    try {
        // Send request to get the training session schedule
        const response = await fetch(`${SERVER_URL}/session/${sessionId}`);
        const data = await response.json();
        
        // Check if the request was successful
        return data.success ?
            { success: true, data: data.data } :
            { success: false, error: data.error };
    }
    catch(error) {
        console.error('Error getting training session schedule:', error);
        return { success: false, error: error.message };
    }
}; 