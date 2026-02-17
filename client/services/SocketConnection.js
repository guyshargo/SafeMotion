export class SocketConnection {
    constructor(url) {
        // URL of the websocket
        this.url = url;

        // Websocket connection
        this.ws = null;

        this.remoteStreams = [];
        this.userJoinedCallbacks = new Set();
        this.streamAddedCallbacks = new Set();
        this.userLeftCallbacks = new Set();
        this.signalCallbacks = new Set();
    }

    connect(sessionId, id) {
        return new Promise((resolve, reject) => {
            // Join session websocket
            this.ws = new WebSocket(`${this.url}/${sessionId}/${id}`);

            // On receiving a message
            this.ws.onmessage = (data) => {
                const message = JSON.parse(data.data);

                switch (message.type) {
                    case "user_joined":
                        if (!this.remoteStreams.some((s) => String(s.id) === String(message.id))) {
                            this.remoteStreams.push({ id: message.id, stream: null });
                        }
                        this.userJoinedCallbacks.forEach((cb) => cb(message.id, message.count));
                        break;
                    case "user_left":
                        const idx = this.remoteStreams.findIndex((s) => s.id === message.id);
                        if (idx >= 0) this.remoteStreams.splice(idx, 1);
                        this.userLeftCallbacks.forEach((cb) => cb(message.id, message.count));
                        break;
                    case "offer":
                    case "answer":
                    case "ice":
                        this.signalCallbacks.forEach((cb) => cb(message));
                        break;

                    // User joined session
                    case "join":
                        // recieve : { type: "join", success: boolean, sessionId: string, participants: string[] }
                        if (!message.success || message.sessionId !== sessionId) {
                            reject({ success: false, error: message.error || "Session not found" });
                        }
                        else {
                            resolve({
                                success: true,
                                id,
                                sessionId: sessionId,
                                participantCount: message.participants?.length || 1,
                                userIds: message.participants || [],

                                // Callbacks (return unsubscribe)
                                onUserJoined: (cb) => {
                                    this.userJoinedCallbacks.add(cb);
                                    return () => this.userJoinedCallbacks.delete(cb);
                                },
                                onUserLeft: (cb) => {
                                    this.userLeftCallbacks.add(cb);
                                    return () => this.userLeftCallbacks.delete(cb);
                                },
                                onSignal: (cb) => {
                                    this.signalCallbacks.add(cb);
                                    return () => this.signalCallbacks.delete(cb);
                                },
                                sendSignal: (msg) => this.ws.readyState === WebSocket.OPEN && this.ws.send(JSON.stringify(msg)),
                                onStreamAdded: (cb) => this.streamAddedCallbacks.add(cb),
                                addRemoteStream: (remoteId, stream) => {
                                    const entry = this.remoteStreams.find((s) => String(s.id) === String(remoteId));
                                    if (entry) entry.stream = stream;
                                    else this.remoteStreams.push({ id: remoteId, stream });
                                    this.streamAddedCallbacks.forEach((cb) => cb(remoteId, stream));
                                },
                                getRemoteStreams: () => [...this.remoteStreams],
                                close: () => this.ws.close(),
                            });
                        }
                        break;
                    default:
                        reject({ success: false, error: message.error || "Session not found" });
                        break;
                }
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