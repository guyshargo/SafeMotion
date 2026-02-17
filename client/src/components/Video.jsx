import { useRef, useEffect } from 'react';
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';

export const Video = ({ stream = null, poseLandmarker = null, isSkeletonShow = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingUtilsRef = useRef(null);
  const rafRef = useRef(null);

  // Attach stream to video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.play().catch(() => {});
  }, [stream]);

  // Resize canvas to match video and run detection + draw loop (only when skeleton is shown)
  useEffect(() => {
    if (!isSkeletonShow) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !poseLandmarker || !stream) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncCanvasSize = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        drawingUtilsRef.current = new DrawingUtils(ctx);
      }
    };

    let drawingUtils = drawingUtilsRef.current;

    const detectAndDraw = () => {
      if (!poseLandmarker || !stream) return;

      syncCanvasSize();
      const w = video.videoWidth;
      const h = video.videoHeight;

      if (w && h && video.readyState >= 2) {
        const result = poseLandmarker.detectForVideo(video, performance.now() * 1000);

        drawingUtils = drawingUtilsRef.current;
        if (drawingUtils && result?.landmarks?.length) {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, w, h);
          for (const landmarks of result.landmarks) {
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
              color: '#00ff00',
              lineWidth: 2,
            });
            drawingUtils.drawLandmarks(landmarks, {
              color: '#ff0000',
              lineWidth: 1,
              radius: 3,
            });
          }
        }
      }

      rafRef.current = requestAnimationFrame(detectAndDraw);
    };

    detectAndDraw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [stream, poseLandmarker, isSkeletonShow]);

  return (
    <div className="relative w-80 aspect-video bg-slate-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`block w-full h-full object-cover ${isSkeletonShow ? 'opacity-0 pointer-events-none absolute inset-0' : ''}`}
      />
      {isSkeletonShow && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}
    </div>
  );
};