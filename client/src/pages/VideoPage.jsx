import { useState, useEffect, useRef } from 'react';
import { Session } from '../../services/Session';
import { Video } from '../components/Video';
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  handleAnswer,
  addIceCandidate,
} from '../../services/WebRTCService';

export function VideoPage({ id, sessionId, sessionConnection }) {
  const [stream, setStream] = useState(null);
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [participantCount, setParticipantCount] = useState(
    sessionConnection?.participantCount ?? 1
  );
  const [connectedUsers, setConnectedUsers] = useState(
    sessionConnection?.participants ?? []
  );
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());

  useEffect(() => {
    if (!sessionConnection) return;
    setParticipantCount(sessionConnection.participantCount ?? 1);
    const initialParticipants = (sessionConnection.participants ?? []).filter(
      (uid) => String(uid) !== String(id)
    );
    setConnectedUsers(sessionConnection.participants ?? []);
    setRemoteStreams((prev) => {
      const existing = new Set(prev.map((r) => String(r.id)));
      const added = initialParticipants.filter((uid) => !existing.has(String(uid)));
      return [...prev, ...added.map((uid) => ({ id: uid, stream: null }))];
    });
    sessionConnection.onUserJoined((remoteId, count) => {
      setRemoteStreams((prev) => {
        if (prev.some((r) => String(r.id) === String(remoteId))) return prev;
        return [...prev, { id: remoteId, stream: null }];
      });
      setConnectedUsers((prev) => (prev.some((u) => String(u) === String(remoteId)) ? prev : [...prev, remoteId]));
      if (count != null) setParticipantCount(count);
      else setParticipantCount((prev) => prev + 1);
    });
    sessionConnection.onUserLeft?.((leftId, count) => {
      const pc = peerConnectionsRef.current.get(String(leftId));
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(String(leftId));
      }
      setRemoteStreams((prev) => prev.filter((r) => String(r.id) !== String(leftId)));
      setConnectedUsers((prev) => prev.filter((uid) => String(uid) !== String(leftId)));
      if (count != null) setParticipantCount(count);
      else setParticipantCount((prev) => Math.max(1, prev - 1));
    });
    sessionConnection.onStreamAdded?.((remoteId, stream) => {
      setRemoteStreams((prev) =>
        prev.map((r) => (String(r.id) === String(remoteId) ? { ...r, stream } : r))
      );
    });
    return () => {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      sessionConnection?.close?.();
    };
  }, [sessionConnection, id]);

  useEffect(() => {
    if (!sessionConnection || !stream) return;
    const myId = parseInt(id, 10) || 0;
    const ensurePeer = (remoteId) => {
      const key = String(remoteId);
      if (peerConnectionsRef.current.has(key)) return;
      const pc = createPeerConnection(
        remoteId,
        stream,
        (rid, s) => sessionConnection.addRemoteStream(rid, s),
        (rid, candidate) =>
          sessionConnection.sendSignal({
            type: 'ice',
            to: parseInt(rid, 10) || rid,
            candidate: candidate?.toJSON ? candidate.toJSON() : candidate,
          })
      );
      peerConnectionsRef.current.set(key, pc);
      const otherId = parseInt(remoteId, 10) || 0;
      if (myId > otherId) {
        createOffer(pc).then((offer) =>
          sessionConnection.sendSignal({
            type: 'offer',
            to: Number(remoteId) || remoteId,
            offer,
          })
        );
      }
    };
    const handleSignal = async (data) => {
      const target = String(data.from);
      let pc = peerConnectionsRef.current.get(target);
      if (!pc && stream) {
        ensurePeer(data.from);
        pc = peerConnectionsRef.current.get(target);
      }
      if (!pc) return;
      if (data.type === 'offer') {
        await createAnswer(pc, data.offer);
        sessionConnection.sendSignal({
          type: 'answer',
          to: parseInt(data.from, 10) ?? data.from,
          answer: pc.localDescription,
        });
      } else if (data.type === 'answer') {
        await handleAnswer(pc, data.answer);
      } else if (data.type === 'ice' && data.candidate) {
        await addIceCandidate(pc, data.candidate);
      }
    };
    sessionConnection.onSignal(handleSignal);
    (sessionConnection.participants ?? []).forEach((uid) => {
      if (String(uid) !== String(id)) ensurePeer(uid);
    });
    const onJoined = (remoteId) => ensurePeer(remoteId);
    sessionConnection.onUserJoined(onJoined);
  }, [sessionConnection, stream, id]);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session parameters');
      return;
    }

    const session = new Session(id, sessionId);
    sessionRef.current = session;

    session
      .start()
      .then(({ stream: s, poseLandmarker: pm }) => {
        setStream(s);
        setPoseLandmarker(pm);
      })
      .catch((e) => setError(e.message));

    return () => {
      sessionRef.current?.stop();
    };
  }, [id, sessionId]);

  const handleEndSession = () => {
    sessionRef.current?.stop();
    window.close();
    if (!window.closed) window.location.href = '/';
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>{error}</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Starting camera...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <p className="text-white/90 text-lg font-semibold mb-2">
        {participantCount} {participantCount === 1 ? 'person' : 'people'} in session
      </p>
      <p className="text-white/70 text-sm mb-4">
        Connected: {connectedUsers.map((uid) => (String(uid) === String(id) ? `You (${uid})` : `User ${uid}`)).join(', ')}
      </p>
      <div className="flex flex-wrap justify-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-white/80 text-sm mb-2">Webcam + Skeleton</span>
          <Video stream={stream} poseLandmarker={poseLandmarker} isSkeletonShow={false} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white/80 text-sm mb-2">Skeleton only</span>
          <Video stream={stream} poseLandmarker={poseLandmarker} isSkeletonShow />
        </div>
        {remoteStreams.map(({ id: remoteId, stream: remoteStream }) => (
          <div key={remoteId} className="flex flex-col items-center">
            <span className="text-white/80 text-sm mb-2">User {remoteId}</span>
            {remoteStream ? (
              <Video stream={remoteStream} poseLandmarker={null} isSkeletonShow={false} />
            ) : (
              <div className="w-64 h-48 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                Connecting...
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleEndSession}
        className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl"
      >
        End Session
      </button>
    </div>
  );
}
