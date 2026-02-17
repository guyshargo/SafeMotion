import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Session } from '../../services/Session';
import { joinSession } from '../../services/SessionService';
import { Video } from '../components/Video';
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  handleAnswer,
  addIceCandidate,
} from '../../services/WebRTCService';

export function VideoPage() {
  const navigate = useNavigate();

  // Get sessionId and id from URL
  const { sessionId, id } = useParams();

  // Stream and pose landmarker states
  const [stream, setStream] = useState(null);
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const sessionRef = useRef(null);

  // Remote streams state
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const peerConnectionsRef = useRef(new Map());

  // Connection and error state
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState(null);

  // Connect to session on mount
  useEffect(() => {
    let conn = null;

    const run = async () => {
      try {
        const res = await joinSession(sessionId, id);
        if (!res.success) {
          setError(res.error || 'Could not connect to session');
          return;
        }
        conn = res.data;
        setConnection(conn);

        const raw = conn.userIds ?? [];
        const userIds = [...new Set(raw.map((u) => String(u)))];
        setConnectedUsers(userIds);
        const seen = new Set();
        setRemoteStreams(
          userIds
            .filter((uid) => {
              if (String(uid) === String(id)) return false;
              if (seen.has(String(uid))) return false;
              seen.add(String(uid));
              return true;
            })
            .map((uid) => ({ id: uid, stream: null }))
        );

        conn.onUserJoined((remoteId) => {
          const key = String(remoteId);
          if (key === String(id)) return;
          setRemoteStreams((prev) =>
            prev.some((r) => String(r.id) === key)
              ? prev
              : [...prev, { id: remoteId, stream: null }]
          );
          setConnectedUsers((prev) =>
            prev.some((u) => String(u) === key) ? prev : [...prev, remoteId]
          );
        });
        conn.onUserLeft?.((leftId) => {
          peerConnectionsRef.current.get(String(leftId))?.close();
          peerConnectionsRef.current.delete(String(leftId));
          setRemoteStreams((prev) => prev.filter((r) => String(r.id) !== String(leftId)));
          setConnectedUsers((prev) => prev.filter((uid) => String(uid) !== String(leftId)));
        });
        conn.onStreamAdded?.((remoteId, stream) => {
          setRemoteStreams((prev) =>
            prev.map((r) => (String(r.id) === String(remoteId) ? { ...r, stream } : r))
          );
        });
      } catch (err) {
        setError(err?.error ?? err?.message ?? 'Connection failed');
      }
    };

    run();

    return () => {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      conn?.close?.();
    };
  }, [sessionId, id]);

  useEffect(() => {
    if (!connection || !stream) return;
    const myId = parseInt(id, 10) || 0;
    const ensurePeer = (remoteId) => {
      const key = String(remoteId);
      if (peerConnectionsRef.current.has(key)) return;
      const pc = createPeerConnection(
        remoteId,
        stream,
        (rid, s) => connection.addRemoteStream(rid, s),
        (rid, candidate) =>
          connection.sendSignal({
            type: 'ice',
            to: rid,
            candidate: candidate?.toJSON ? candidate.toJSON() : candidate,
          })
      );
      peerConnectionsRef.current.set(key, pc);
      const otherId = parseInt(remoteId, 10) || 0;
      if (myId > otherId) {
        createOffer(pc)
          .then((offer) =>
            connection.sendSignal({
              type: 'offer',
              to: remoteId,
              offer,
            })
          )
          .catch((err) => console.error('Create offer failed:', err));
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
      try {
        if (data.type === 'offer') {
          await createAnswer(pc, data.offer);
          connection.sendSignal({
            type: 'answer',
            to: data.from,
            answer: pc.localDescription,
          });
        } else if (data.type === 'answer') {
          await handleAnswer(pc, data.answer);
        } else if (data.type === 'ice' && data.candidate) {
          await addIceCandidate(pc, data.candidate);
        }
      } catch (err) {
        console.error('Signal handling failed:', err);
      }
    };
    const unsubSignal = connection.onSignal(handleSignal);
    const unsubJoined = connection.onUserJoined((remoteId) => ensurePeer(remoteId));
    (connection.userIds ?? []).forEach((uid) => {
      if (String(uid) !== String(id)) ensurePeer(uid);
    });
    return () => {
      unsubSignal?.();
      unsubJoined?.();
    };
  }, [connection, stream, id]);

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

  // Early-render UI
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-400 underline">
          Back to home
        </button>
      </div>
    );
  }
  if (!connection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Connecting to session...</p>
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

  const uniqueUsers = [...new Set(connectedUsers.map((u) => String(u)))];
  const remoteList = remoteStreams.filter((r, i, arr) => arr.findIndex((x) => String(x.id) === String(r.id)) === i);

  const userIdsTitle = uniqueUsers
    .map((uid) => (String(uid) === String(id) ? `You (${uid})` : uid))
    .join(', ');

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <p className="text-white/90 text-lg font-semibold mb-2">
        Users in session: {userIdsTitle}
      </p>
      <div className="flex flex-wrap justify-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-white/80 text-sm mb-2">You (video)</span>
          <Video stream={stream} poseLandmarker={null} isSkeletonShow={false} />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-white/80 text-sm mb-2">You (skeleton)</span>
          <Video stream={stream} poseLandmarker={poseLandmarker} isSkeletonShow />
        </div>
        {remoteList.map(({ id: remoteId, stream: remoteStream }) => (
          <div key={remoteId} className="flex flex-col items-center">
            <span className="text-white/80 text-sm mb-2">User {remoteId}</span>
            {remoteStream ? (
              <Video stream={remoteStream} poseLandmarker={null} isSkeletonShow={false} />
            ) : (
              <div className="w-80 aspect-video bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
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
