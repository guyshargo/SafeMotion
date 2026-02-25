// ICE servers configuration
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

// Pending candidates map
const pendingCandidates = new WeakMap();

/**
 * Drains the pending candidates for a peer connection
 * @param {RTCPeerConnection} pc - The peer connection
 * @returns {Promise<void>}
 */
export const drainPendingCandidates = async (pc) => {
    // Get the queue of pending candidates for the peer connection
    const queue = pendingCandidates.get(pc);

    // If there are no pending candidates, return
    if (!queue) return;

    // Delete the queue of pending candidates for the peer connection
    pendingCandidates.delete(pc);

    // Add the pending candidates to the peer connection
    for (const c of queue) 
        await pc.addIceCandidate(c);
}

/**
 * Creates a peer connection for a remote user
 * @param {string} remoteId - The id of the remote user
 * @param {MediaStream} localStream - The local stream
 * @param {function} onRemoteStream - The function to call when a remote stream is added
 * @param {function} onIceCandidate - The function to call when an ICE candidate is received
 * @returns {RTCPeerConnection} The peer connection
 */
export const createPeerConnection = (
    remoteId, localStream, onRemoteStream, onIceCandidate
) => {
    // Create a new peer connection
    const pc = new RTCPeerConnection({ iceServers });

    // Add the local stream to the peer connection
    if (localStream)
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // On track event, call the onRemoteStream function
    pc.ontrack = (e) => {
        const stream = e.streams?.[0] || (e.track ? new MediaStream([e.track]) : null);
        if (stream) onRemoteStream(remoteId, stream);
    };

    // On ICE candidate event, call the onIceCandidate function
    pc.onicecandidate = (e) => {
        if (e.candidate) onIceCandidate(remoteId, e.candidate);
    };

    return pc;
}

/**
 * Creates an offer for a peer connection
 * @param {RTCPeerConnection} pc - The peer connection
 * @returns {RTCSessionDescription} The offer
 */
export const createOffer = async (pc) => {
    // Create an offer for the peer connection
    const offer = await pc.createOffer();

    // Set the local description for the peer connection
    await pc.setLocalDescription(offer);
    return offer;
}


/**
 * Creates an answer for a peer connection
 * @param {RTCPeerConnection} pc - The peer connection
 * @param {RTCSessionDescription} offer - The offer
 * @returns {RTCSessionDescription} The answer
 */
export const createAnswer = async (pc, offer) => {
    // Set the remote description for the peer connection
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Drain the pending candidates
    await drainPendingCandidates(pc);

    // Create an answer for the peer connection
    const answer = await pc.createAnswer();

    // Set the local description for the peer connection
    await pc.setLocalDescription(answer);
}

/**
 * Handles the answer from a remote user
 * @param {RTCPeerConnection} pc - The peer connection
 * @param {RTCSessionDescription} answer - The answer
 */
export const handleAnswer = async (pc, answer) => {
    // Set the remote description for the peer connection
    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    // Drain the pending candidates
    await drainPendingCandidates(pc);
}

/**
 * Adds an ICE candidate to a peer connection
 * @param {RTCPeerConnection} pc - The peer connection
 * @param {RTCIceCandidate} candidate - The ICE candidate
 */
export const addIceCandidate = async (pc, candidate) => {
    try {
        // If the remote description is available, add the ICE candidate to the peer connection
        if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
        } else {
            // If the remote description is not available, add the ICE candidate to the queue
            const queue = pendingCandidates.get(pc) || [];
            queue.push(candidate);
            pendingCandidates.set(pc, queue);
        }
    } catch (error) {
        console.warn("Error adding ICE candidate:", error);
    }
}
