const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

export function createPeerConnection(remoteId, localStream, onRemoteStream, onIceCandidate) {
    const pc = new RTCPeerConnection({ iceServers });
    if (localStream) {
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }
    pc.ontrack = (e) => {
        const stream = e.streams?.[0] || (e.track ? new MediaStream([e.track]) : null);
        if (stream) onRemoteStream(remoteId, stream);
    };
    pc.onicecandidate = (e) => {
        if (e.candidate) onIceCandidate(remoteId, e.candidate);
    };
    return pc;
}

export async function createOffer(pc) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
}

export async function createAnswer(pc, offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await drainPendingCandidates(pc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
}

export async function handleAnswer(pc, answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    await drainPendingCandidates(pc);
}

const pendingCandidates = new WeakMap();

export async function addIceCandidate(pc, candidate) {
    const c = candidate?.candidate != null ? candidate : new RTCIceCandidate(candidate);
    try {
        if (pc.remoteDescription) {
            await pc.addIceCandidate(c);
        } else {
            const queue = pendingCandidates.get(pc) || [];
            queue.push(c);
            pendingCandidates.set(pc, queue);
        }
    } catch (e) {
        console.warn("Error adding ICE candidate:", e);
    }
}

export async function drainPendingCandidates(pc) {
    const queue = pendingCandidates.get(pc);
    if (!queue) return;
    pendingCandidates.delete(pc);
    for (const c of queue) {
        try {
            await pc.addIceCandidate(c);
        } catch (e) {
            console.warn("Error adding pending ICE candidate:", e);
        }
    }
}
