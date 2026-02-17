import React, { useState } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { joinSession, DEFAULT_SESSION_ID } from '../services/SessionService';
import { VideoPage } from './pages/VideoPage';
import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:sessionId/:id" element={<SessionRoute />} />
    </Routes>
  );
}

function SessionRoute() {
  const { sessionId, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [joinState, setJoinState] = useState(
    location.state?.sessionConnection ? { status: 'success', sessionConnection: location.state.sessionConnection } : { status: 'joining' }
  );

  React.useEffect(() => {
    if (location.state?.sessionConnection) return;
    if (!sessionId || !id) return;
    setJoinState({ status: 'joining' });
    joinSession(sessionId, parseInt(id, 10)).then((result) => {
      if (result?.success) {
        setJoinState({ status: 'success', sessionConnection: result });
      } else {
        setJoinState({ status: 'error', message: result?.error || 'Could not connect to session' });
      }
    });
  }, [sessionId, id]);

  if (joinState.status === 'joining') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Connecting to session...</p>
      </div>
    );
  }
  if (joinState.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>{joinState.message || 'Session not found'}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-400 underline">
          Back to home
        </button>
      </div>
    );
  }
  return (
    <VideoPage
      id={id}
      sessionId={sessionId}
      sessionConnection={joinState.sessionConnection}
    />
  );
}