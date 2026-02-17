import React, { useState } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { joinSession, DEFAULT_SESSION_ID } from '../services/SessionService';
import { VideoPage } from './pages/VideoPage';
import { HomePage } from './pages/HomePage';

// Session

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/session/:sessionId/:id" element={<VideoPage />} />
    </Routes>
  );
}