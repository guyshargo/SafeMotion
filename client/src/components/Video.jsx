import { useRef, useEffect, useState } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * Video component
 * @param {MediaStream} stream - The stream to display
 * @param {Session} session - The session to use
 * @param {boolean} devMode - Whether to show the skeleton
 * @returns {JSX.Element} The video component
 */
export const Video = ({
  stream = null, devMode = false, session = null
}) => {
  // Posture analysis result state
  const [result, setResult] = useState(null);

  // Training states
  const [repeats, setRepeats] = useState(session?.current?.repeats || 0);
  const [sets, setSets] = useState(session?.current?.setRepeats || 0);
  const [countdown, setCountdown] = useState(null);

  // Video element reference
  const videoRef = useRef(null);

  // Canvas element reference
  const skeletonRef = useRef(null);

  // Drawing utilities reference
  const drawingUtilsRef = useRef(null);
  const rafRef = useRef(null);

  // General visual map
  const visualMap = {
    'error': '#FF474C',
    'warning': '#FFED29',
    'success': '#41DC8E'
  }

  /**
   * Detects the pose and draws the skeleton on the canvas
   */
  const detectAndDraw = () => {
    if (!session || !stream || !videoRef.current) return;

    // Get the canvas and context
    const canvas = skeletonRef.current;
    const ctx = canvas?.getContext('2d') || null;

    // Get the width and height of the video
    const w = videoRef.current.videoWidth;
    const h = videoRef.current.videoHeight;

    // Check if width and height are different from the canvas
    if (canvas && ctx && w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      drawingUtilsRef.current = new DrawingUtils(ctx);
    }

    // Check if the video is ready and the width and height are available
    if (w && h && videoRef.current.readyState >= 2) {
      const drawingUtils = drawingUtilsRef.current;

      // Detect the skeleton from the video using the pose landmarker
      const poseResult = session.detectPose(videoRef.current, performance.now() * 1000);
      if (!poseResult) {
        rafRef.current = requestAnimationFrame(detectAndDraw);
        return;
      }

      const { skeleton, poseCheck } = poseResult;
      setResult(poseCheck);

      // Check if the drawing utilities are available and the skeleton is available
      if (devMode && canvas && ctx && drawingUtils && skeleton?.landmarks?.length) {
        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Draw the landmarks
        for (const landmarks of skeleton.landmarks) {
          // Draw the connectors
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
            color: 'lightgreen',
            lineWidth: 3,
          });

          // Draw the landmarks
          drawingUtils.drawLandmarks(landmarks, {
            color: 'red',
            lineWidth: 1,
            radius: 3,
          });
        }
      }
    }

    // Request the next animation frame
    rafRef.current = requestAnimationFrame(detectAndDraw);
  };

  // Video element effect
  useEffect(() => {
    // Check if video element and stream are available
    if (!videoRef.current || !stream) return;

    // Attach stream to video
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => { });

    // Ensure there is only one active animation loop.
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Detect and draw the skeleton
    detectAndDraw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [stream, session]);

  // Define countdown timer
  useEffect(() => {
    const timerValue = Number.parseInt(session?.current?.timer, 10);

    // Reset when no active set or pose is no longer matching
    if (!session?.current || !result?.isSucceeded) {
      setCountdown(null);
      return;
    }

    // Check if waiting for relaxation
    if (session?.awaitingRelax) return;

    // Start countdown only once
    if (countdown === null && timerValue > 0)
      setCountdown(timerValue);
  }, [result?.isSucceeded]);

  // Countdown timer effect
  useEffect(() => {
    // Check if countdown is not active or pose is not succeeded
    if (countdown === null || !result?.isSucceeded) return;

    const timeout = setTimeout(() => {
      // Check if countdown is finished
      if (countdown <= 1) {
        // Check if waiting for relaxation
        if (session?.current?.relaxId) {
          // Start relaxation detection
          session.startRelaxDetection();
        } else {
          // Finish training
          const { updatedRepeats, updatedSets } = session?.finTraining(repeats, sets);
          setRepeats(updatedRepeats);
          setSets(updatedSets);
        }

        setCountdown(null);
        return;
      }

      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [countdown, result?.isSucceeded, session]);

  // Relaxation detection effect
  useEffect(() => {
    // Check if waiting for relaxation or pose is not succeeded
    if (!session?.awaitingRelax || !result?.isSucceeded) return;

    // Finish training
    session.awaitingRelax = false;
    const { updatedRepeats, updatedSets } = session.finTraining(repeats, sets);
    setRepeats(updatedRepeats);
    setSets(updatedSets);
    setCountdown(null);
  }, [result?.isSucceeded, session, repeats, sets]);

  return (
    <div className="relative h-150 aspect-video rounded-lg overflow-hidden">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`block w-full h-full object-cover scale-x-[-1] ${devMode ? 'absolute inset-0 z-0' : ''}`}
      />

      {/* Skeleton canvas */}
      {devMode && (
        <canvas
          ref={skeletonRef}
          className="absolute inset-0 w-full h-full z-3 pointer-events-none scale-x-[-1]"
        />
      )}

      {/* Session UI */}
      {session?.isStarted && (
        <div className="absolute inset-0 w-full h-full p-4 z-2 flex items-center justify-center">
          {result && (
            <div
              className={`w-full h-full flex flex-row rounded-lg border-30 ${result ? 'opacity-70' : 'bg-transparent'} p-4 justify-between gap-4`}
              style={{ borderColor: result && result.type ? visualMap[result.type] : null }}
            >
              {/* Left info block */}
              <div className='flex flex-col h-fit gap-2 bg-white p-4 rounded-lg'>
                <h1 className="text-2xl font-bold">Need to perform: {session.isFinished ? 'Finished' : result.expectedText}</h1>
                <h1 className="text-2xl font-bold">Detected: {session.isFinished ? 'Finished' : result.detectedText}</h1>
                <h1 className="text-2xl font-bold">Hold: {countdown || '---'}</h1>
              </div>

              {/* Right info block */}
              <div className='flex flex-col h-fit gap-2 bg-white p-4 rounded-lg'>
                <h1 className="text-2xl font-bold">Repeats: {repeats}</h1>
                <h1 className="text-2xl font-bold">Sets: {sets}</h1>
              </div>
            </div>)}
        </div>
      )}
    </div>
  );
};