/**
 * SocketConnection class - represents a socket connection
 */
export class SocketConnection {
    /**
     * Constructor
     * @param {string} url - The URL of the websocket
     */
    constructor(url) {
        this.url = url;                        // The URL of the websocket
        this.ws = null;                        // The websocket connection
        this.remoteStreams = [];               // The remote streams
        this.userJoinedCallbacks = new Set();  // The user joined callbacks
        this.streamAddedCallbacks = new Set(); // The stream added callbacks
        this.userLeftCallbacks = new Set();    // The user left callbacks
        this.signalCallbacks = new Set();      // The signal callbacks
    }

    /**
     * Handles the message from the websocket
     * @param {object} message - The message from the websocket
     * @param {string} sessionId - The session id
     * @param {string} id - The id of the user
     * @param {function} resolve - The resolve function
     * @param {function} reject - The reject function
     */
    #handleMessage(message, sessionId, id, resolve, reject) {
        switch (message.type) {
            // Another user joined session
            case "user_joined":
                // If user is not already in remote streams, add them
                if (!this.remoteStreams.some((stream) => stream.id === message.id)) {
                    this.remoteStreams.push({ id: message.id, stream: null });
                }

                // Notify all users that the user joined
                this.userJoinedCallbacks.forEach((callback) => callback(message.id, message.count));
                break;

            // Another user left session
            case "user_left":
                // Find index of user in remote streams
                const idx = this.remoteStreams.findIndex((stream) => stream.id === message.id);
                
                // Check if user is in remote streams and remove them
                if (idx >= 0) 
                    this.remoteStreams.splice(idx, 1);

                // Notify all users that the user left
                this.userLeftCallbacks.forEach((callback) => callback(message.id, message.count));
                break;

            // Signal message
            case "offer":
            case "answer":
            case "ice":
                // Notify all users that a signal was received
                this.signalCallbacks.forEach((callback) => callback(message));
                break;

            // User joined session
            case "join":
                // recieve : { type: "join", success: boolean, sessionId: string, participants: string[] }
                // Check if message is successful and has a session id
                if (!message.success || message.sessionId !== sessionId) 
                    reject({ success: false, error: message.error || "Session not found" });
                else {
                    // Create response object
                    resolve({
                        success: true,
                        id,
                        sessionId,
                        participantCount: message.participants?.length || 1,
                        userIds: message.participants || [],

                        // Callbacks
                        // User joined Callback
                        onUserJoined: (callback) => {
                            this.userJoinedCallbacks.add(callback);
                            return () => this.userJoinedCallbacks.delete(callback);
                        },

                        // User left Callback
                        onUserLeft: (callback) => {
                            this.userLeftCallbacks.add(callback);
                            return () => this.userLeftCallbacks.delete(callback);
                        },

                        // Signal Callback
                        onSignal: (callback) => {
                            this.signalCallbacks.add(callback);
                            return () => this.signalCallbacks.delete(callback);
                        },

                        // Stream added Callback
                        onStreamAdded: (callback) => this.streamAddedCallbacks.add(callback),

                        // Functions
                        // Send signal function
                        sendSignal: (msg) => this.ws.readyState === WebSocket.OPEN && this.ws.send(JSON.stringify(msg)),
                        
                        // Add remote stream function
                        addRemoteStream: (remoteId, stream) => {
                            const entry = this.remoteStreams.find((s) => String(s.id) === String(remoteId));
                            if (entry) entry.stream = stream;
                            else this.remoteStreams.push({ id: remoteId, stream });
                            this.streamAddedCallbacks.forEach((callback) => callback(remoteId, stream));
                        },

                        // Get remote streams function
                        getRemoteStreams: () => [...this.remoteStreams],

                        // Close function
                        close: () => this.ws.close(),
                    });
                }
                break;
            default:
                reject({ success: false, error: message.error || "Session not found" });
                break;
        }
    }

    /**
     * Connects to the websocket
     * @param {string} sessionId - The session id
     * @param {string} id - The id of the user
     * @returns {Promise<{success: boolean, error: string, id: string, sessionId: string, participantCount: number, participants: string[], onUserJoined: (cb: (id: string, count: number) => void) => void, onUserLeft: (cb: (id: string, count: number) => void) => void, onSignal: (cb: (data: any) => void) => void, sendSignal: (msg: any) => void, onStreamAdded: (cb: (id: string, stream: MediaStream) => void) => void, addRemoteStream: (remoteId: string, stream: MediaStream) => void, getRemoteStreams: () => {id: string, stream: MediaStream}[], close: () => void}>}
     */
    connect(sessionId, id) {
        return new Promise((resolve, reject) => {
            // Join session websocket
            this.ws = new WebSocket(`${this.url}/${sessionId}/${id}`);

            // On receiving a message
            this.ws.onmessage = (data) => {
                const message = JSON.parse(data.data);
                this.#handleMessage(message, sessionId, id, resolve, reject);        
            };

            // On error
            this.ws.onerror = (error) => {
                console.error(`Error joining session: ${error}`);
                this.ws.close();
                reject({ success: false, error: "Connection failed. Is the server running?" });
            };

            // On close
            this.ws.onclose = (event) => {
                this.userJoinedCallbacks.clear();
                this.streamAddedCallbacks.clear();
                this.userLeftCallbacks.clear();
                this.signalCallbacks.clear();
                this.remoteStreams = [];
                this.ws = null;
            };
        });
    };
}