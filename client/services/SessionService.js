const SERVICE_WS_URL = "ws://127.0.0.1:8000";
const SERVICE_HTTP_URL = "http://127.0.0.1:8000";

export const DEFAULT_SESSION_ID = "default";

export const getSessionCount = async (sessionId) => {
    try {
        const res = await fetch(`${SERVICE_HTTP_URL}/session/count/${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        return data.success ? data.count : 0;
    } catch (error) {
        console.error("Error getting session count:", error);
        return 0;
    }
};

export const joinSession = async (sessionId, id = 0) => {
    if (!sessionId) return { success: false, error: "Missing session id" };

    const numericId = parseInt(id, 10);
    const effectiveId = isNaN(numericId) ? 0 : numericId;

    console.log(`Joining session via WebSocket: ${sessionId}, id=${effectiveId}`);

    return new Promise((resolve) => {
        let resolved = false;
        const finish = (result) => {
            if (resolved) return;
            resolved = true;
            resolve(result);
        };

        try {
            const ws = new WebSocket(`${SERVICE_WS_URL}/session/ws/${encodeURIComponent(sessionId)}/${effectiveId}`);
            const remoteStreams = [];
            const userJoinedCallbacks = new Set();
            const streamAddedCallbacks = new Set();

            const userLeftCallbacks = new Set();
            const signalCallbacks = new Set();
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "user_joined") {
                    if (!remoteStreams.some((s) => String(s.id) === String(data.id))) {
                        remoteStreams.push({ id: data.id, stream: null });
                    }
                    userJoinedCallbacks.forEach((cb) => cb(data.id, data.count));
                } else if (data.type === "user_left") {
                    const idx = remoteStreams.findIndex((s) => s.id === data.id);
                    if (idx >= 0) remoteStreams.splice(idx, 1);
                    userLeftCallbacks.forEach((cb) => cb(data.id, data.count));
                } else if (data.type === "offer" || data.type === "answer" || data.type === "ice") {
                    signalCallbacks.forEach((cb) => cb(data));
                } else if (data.success) {
                    finish({
                        success: true,
                        id: data.id,
                        sessionId: data.sessionId || sessionId,
                        participantCount: data.count ?? 1,
                        participants: data.participants ?? [],
                        onUserJoined: (cb) => userJoinedCallbacks.add(cb),
                        onUserLeft: (cb) => userLeftCallbacks.add(cb),
                        onSignal: (cb) => signalCallbacks.add(cb),
                        sendSignal: (msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg)),
                        onStreamAdded: (cb) => streamAddedCallbacks.add(cb),
                        addRemoteStream: (remoteId, stream) => {
                            const entry = remoteStreams.find((s) => String(s.id) === String(remoteId));
                            if (entry) entry.stream = stream;
                            else remoteStreams.push({ id: remoteId, stream });
                            streamAddedCallbacks.forEach((cb) => cb(remoteId, stream));
                        },
                        getRemoteStreams: () => [...remoteStreams],
                        close: () => ws.close(),
                    });
                } else {
                    finish({ success: false, error: data.error || "Session not found" });
                }
            };

            ws.onerror = (error) => {
                console.error(`Error joining session: ${error}`);
                ws.close();
                finish({ success: false, error: "Connection failed. Is the server running?" });
            };

            ws.onclose = (event) => {
                if (!resolved) {
                    finish({ success: false, error: event.code === 4001 ? "Session not found" : "Connection closed" });
                }
            };
        } catch (error) {
            console.error(`Error joining session: ${error}`);
            finish({ success: false, error: "Connection failed" });
        }
    });
};