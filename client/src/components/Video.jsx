import { useRef, useEffect, useState } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * Video component
 * @param {MediaStream} stream - The stream to display
 * @param {Session} session - The session to use
 * @param {boolean} isSkeletonShow - Whether to show the skeleton
 * @returns {JSX.Element} The video component
 */
export const Video = ({
  stream = null, isSkeletonShow = false, session = null
}) => {
  const [result, setResult] = useState(null);

  // Video element reference
  const videoRef = useRef(null);

  // Canvas element reference
  const skeletonRef = useRef(null);

  // Drawing utilities reference
  const drawingUtilsRef = useRef(null);
  const rafRef = useRef(null);

  /**
   * Detects the pose and draws the skeleton on the canvas
   */
  const detectAndDraw = () => {
    if (!session || !stream || !videoRef.current || !skeletonRef.current) return;

    // Get the canvas and context
    const canvas = skeletonRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the width and height of the video
    const w = videoRef.current.videoWidth;
    const h = videoRef.current.videoHeight;

    // Check if width and height are different from the canvas
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
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
      const { skeleton, result } = poseResult;
      setResult(result);

      // Check if the drawing utilities are available and the skeleton is available
      if (drawingUtils && skeleton?.landmarks?.length) {
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


  useEffect(() => {
    // Check if video element and stream are available
    if (!videoRef.current || !stream) return;

    // Attach stream to video
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => { });

    // Check if skeleton is shown, canvas element and pose landmarker are available
    if (!isSkeletonShow || !skeletonRef.current || !session || !session.poseLandmarker) return;

    detectAndDraw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-150 aspect-video rounded-lg overflow-hidden">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`block w-full h-full object-cover scale-x-[-1] ${isSkeletonShow ? 'absolute inset-0 z-0' : ''}`}
      />

      {/* Skeleton canvas */}
      {isSkeletonShow && (
        <canvas
          ref={skeletonRef}
          className="absolute inset-0 w-full h-full z-3 pointer-events-none scale-x-[-1]"
        />
      )}

      {session.isStarted && (
        <div className="absolute inset-0 w-full h-full p-4 z-2 flex items-center justify-center">
          {result && (
            <div className={`w-full h-full rounded-lg  border-30 border-green-300 opacity-70 p-4 items_center justify-start`}>
              <h1 className="text-2xl font-bold text-white">Result: {result ? result : '---'}</h1>
            </div>)}
        </div>
      )}
    </div>
  );
};