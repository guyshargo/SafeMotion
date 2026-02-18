import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Session } from '../../services/Session';
import { joinSession, stopSession, getTrainingSessionSchedule } from '../../services/SessionService';
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

  // Connection state
  const [myConnection, setMyConnection] = useState(null);

  // Other participants' streams state
  const [remoteStreams, setRemoteStreams] = useState([]);

  // Peer connections map state
  const peerConnectionsRef = useRef(new Map());

  // Connected user ids to the session
  const [connectedUsers, setConnectedUsers] = useState([]);

  // My session object reference
  const mySessionRef = useRef(null);

  // Stream and pose landmarker states
  const [myStream, setMyStream] = useState(null);

  // Error state
  const [error, setError] = useState(null);

  /**
   * Handles the event when another user joins the session
   * @param {string} userId - The id of the user who joined
   */
  const otherUserJoined = (userId) => {
    // Check if the user is the local user
    if (userId === id) return;

    // Check if the user is already in the remote streams
    if (!remoteStreams.some((stream) => stream.id === userId)) {
      // Add the user to the remote streams
      setRemoteStreams((prev) => [...prev, { id: userId, stream: null }]);

      // Add the user to the connected users
      setConnectedUsers((prev) => [...prev, userId]);
    }
  }

  /**
   * Handles the event when another user leaves the session
   * @param {string} userId - The id of the user who left
   */
  const otherUserLeft = (userId) => {
    // Close and delete the peer connection
    peerConnectionsRef.current.get(userId)?.close();
    peerConnectionsRef.current.delete(userId);

    // Remove the user from the remote streams
    let updatedRemoteStreams = remoteStreams.filter((remote) => remote.id !== userId);
    setRemoteStreams(updatedRemoteStreams);

    // Remove the user from the connected users
    let updatedConnectedUsers = connectedUsers.filter((uid) => uid !== userId);
    setConnectedUsers(updatedConnectedUsers);
  }

  /**
   * Handles the event when another user adds a stream
   * @param {string} remoteId - The id of the user who added the stream
   * @param {MediaStream} stream - The stream that was added
   */
  const otherStreamAdded = (remoteId, stream) => {
    setRemoteStreams((prev) => {
      const updatedRemoteStreams = [...prev];

      // Find index of remote stream
      const idx = updatedRemoteStreams.findIndex((r) => r.id === remoteId);

      // If remote stream exists, update it
      if (idx >= 0) {
        updatedRemoteStreams[idx].stream = stream;
      }
      // If remote stream does not exist, add it
      else {
        updatedRemoteStreams.push({ id: remoteId, stream });
      }

      // Return updated remote streams
      return updatedRemoteStreams;
    });
  }

  /**
 * Creates a peer connection for a remote user
 * @param {string} remoteId - The id of the remote user
 */
  const ensurePeerConnection = async (remoteId) => {
    // Check if the peer connection already exists
    if (peerConnectionsRef.current.has(remoteId)) return;

    // Define connection callbacks
    const onRemoteStream = (rid, stream) => myConnection.addRemoteStream(rid, stream);
    const candidate = candidate?.toJSON ? candidate.toJSON() : candidate;
    const onIceCandidate = (rid, candidate) => myConnection.sendSignal({ type: 'ice', to: rid, candidate, });

    // Create a new peer connection
    const pc = createPeerConnection(remoteId, myStream, onRemoteStream, onIceCandidate);
    peerConnectionsRef.current.set(remoteId, pc);

    // Create an offer for the remote user
    const offer = await createOffer(pc);
    myConnection.sendSignal({ type: 'offer', to: remoteId, offer, });
  };

  /**
 * Handles the signal from another user
 * @param {object} data - The signal data
 */
  const handleSignal = async (data) => {
    // Get the peer connection for the remote user
    let pc = peerConnectionsRef.current.get(data.from);

    // If the peer connection does not exist, create a new one
    if (!pc && myStream) {
      await ensurePeerConnection(data.from);
      pc = peerConnectionsRef.current.get(data.from);
    }

    try {
      switch (data.type) {
        // If offer, create an answer
        case 'offer':
          await createAnswer(pc, data.offer);
          myConnection.sendSignal({ type: 'answer', to: data.from, answer: pc.localDescription, });
          break;
        // If answer, handle it
        case 'answer':
          await handleAnswer(pc, data.answer);
          break;
        // If ICE candidate, add it to the peer connection
        case 'ice':
          if (data.candidate) {
            // Create a new ICE candidate object
            let candObj = data.candidate;
            if (data.candidate.candidate === undefined)
              candObj = new RTCIceCandidate(data.candidate);

            await addIceCandidate(pc, candObj);
          }
          break;
        default:
          console.error('Invalid signal type:', data.type);
          break;
      }
    } catch (err) {
      console.error('Signal handling failed:', err);
    }
  };

  /**
   * Handles the event when the session is ended
   */
  const handleEndSession = async () => {
    // Stop the session
    await stopSession(sessionId, id);

    // Stop the session
    mySessionRef.current?.stop();

    // Close the window and redirect to the home page
    window.close();
    if (!window.closed) window.location.href = '/';
  };

  // Connect to session on mount
  useEffect(() => {
    // Check if sessionId and id are missing
    if (!sessionId || !id) {
      let missing = 'parameters: ';
      !sessionId && (missing += 'sessionId, ');
      !id && (missing += 'id');

      setError(`Missing ${missing}.`);
      return;
    }

    /**
     * Fetches the connection to the session from the server
     */
    const fetchConnection = async () => {
      let conn = null;

      try {
        // Join session and get connection data from server
        const response = await joinSession(sessionId, id);

        // Check if connection was successful
        if (!response.success) {
          setError(response.error || 'Could not connect to session');
          return;
        }

        conn = response.data;

        // Set connection
        setMyConnection(conn);

        // Set connected users
        const userIds = conn.userIds || [];
        setConnectedUsers(userIds);

        // Set other participants' streams
        const otherUserIds = userIds.filter((user_id) => user_id != id);
        const updatedRemoteStreams = otherUserIds.map((uid) => ({ id: uid, stream: null }));
        setRemoteStreams(updatedRemoteStreams);

        // On user joined event, add the user to the remote streams and connected users
        conn.onUserJoined((userId) => otherUserJoined(userId));

        // On user left event, remove the user from the remote streams and connected users
        conn.onUserLeft((userId) => otherUserLeft(userId));

        // On stream added event, add or update the stream in the remote streams
        conn.onStreamAdded((remoteId, stream) => otherStreamAdded(remoteId, stream));
      } catch (err) {
        setError('Connection failed');
      }
    };

    /**
     * Starts a new session
     */
    const makeNewSession = async () => {
      // Get the training session schedule
      const response = await getTrainingSessionSchedule(sessionId);

      // Check if the training session schedule was successful
      if (!response.success) {
        setError(response.error || 'Could not get training session schedule');
        return;
      }
      const schedule = response.data;

      // Create a new session object
      const session = new Session(id, sessionId, schedule);
      mySessionRef.current = session;

      // Start the session
      await session.start();

      // Set the stream and pose landmarker
      setMyStream(session.stream);
    }

    fetchConnection();
    makeNewSession();

    // Cleanup function when leaving the page
    return () => {
      // Stop the session
      mySessionRef.current?.stop();

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      // Close the connection to the session
      myConnection?.close();
    };
  }, []);

  useEffect(() => {
    // Check if my connection and stream are available
    if (!myConnection || !myStream) return;

    // On signal event, handle the signal
    const unsubSignal = myConnection.onSignal(handleSignal);

    // On user joined event, ensure a peer connection
    const unsubJoined = myConnection.onUserJoined((remoteId) => ensurePeerConnection(remoteId));

    // Ensure peer connections for all connected users
    (myConnection.userIds).forEach((userId) => {
      if (userId !== id)
        ensurePeerConnection(userId);
    });

    // Cleanup function when leaving the page
    return () => {
      // Unsubscribe from the signal event
      unsubSignal?.();

      // Unsubscribe from the user joined event
      unsubJoined?.();
    };
  }, [myConnection]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6">
      {/* Error handling message */}
      {error ? (
        <div className="min-h-screen flex items-center justify-center">
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-blue-400 underline">
            Back to home
          </button>
        </div>) :
        !myConnection ? (
          <div className="min-h-screen flex items-center justify-center">
            <p>Connecting to session...</p>
          </div>
        ) :
          !myStream && (
            <div className="min-h-screen flex items-center justify-center">
              <p>Starting camera...</p>
            </div>
          )
      }

      {/* Session UI */}
      {!error && myConnection && myStream && (
        <>
          {/* Users in session title */}
          <p className="text-lg font-semibold mb-2">
            Users in session: {connectedUsers.map((uid) => (uid === id ? `You (${uid})` : uid)).join(', ')}
          </p>

          {/* Videos */}
          <div className="flex flex-wrap justify-center gap-6">
            {/* My video */}
            <div className="flex flex-col items-center">
              <span className="text-sm mb-2">You</span>
              <Video
                stream={myStream}
                isSkeletonShow={true}
                session={mySessionRef.current}
              />
            </div>

            {/* Remote videos */}
            {remoteStreams.map(({ id: remoteId, stream: remoteStream }) => (
              <div key={remoteId} className="flex flex-col items-center">
                <span className="text-sm mb-2">User {remoteId}</span>
                {/* Remote video */}
                {remoteStream ? (
                  <Video stream={remoteStream} isSkeletonShow={false} />
                ) : (
                  <div className="w-80 aspect-video bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                    Connecting...
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* End session button */}
          <button
            onClick={handleEndSession}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl"
          >
            End Session
          </button>
        </>
      )}
    </div>
  );
}
