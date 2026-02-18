import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Posture } from "./Posture";

// Mediapipe pose landmarker model URL
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Mediapipe WASM URL
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

/**
 * Session class
 * @param {string} id - The id of the user
 * @param {string} sessionId - The id of the session
 */
export class Session {
  constructor(id, sessionId, schedule = []) {
    this.id = id;
    this.sessionId = sessionId;

    // Schedule of the session
    this.schedule = schedule;

    // Video elements
    this.poseLandmarker = null;
    this.stream = null;

    this.isStarted = false;
    this.isFinished = false;
    this.isMistake = false;
  }

  /**
   * Starts the session
   */
  async start() {
    this.isStarted = true;

    // Open webcam
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true });

    // Resolve the vision tasks
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);

    // Create the pose landmarker
    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU", },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  /**
   * Stops the session
   */
  stop() {
    // Stop the all tracks in the stream and null the stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // Stop the pose landmarker and null the pose landmarker
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }

    // Set the session to not started
    this.isStarted = false;
    this.isFinished = true;
  }

  /**
   * Detects the pose from a video element
   * @param {HTMLVideoElement} videoElement - The video element
   * @param {number} timestampMs - The timestamp in milliseconds
   * @returns {PoseLandmarkerResult | null} The pose landmarker result
   */
  detectPose(videoElement, timestampMs) {
    // Check if the pose landmarker is available and the video element is ready
    if (!this.poseLandmarker || videoElement.readyState < 2) return null;

    const skeleton = this.poseLandmarker.detectForVideo(videoElement, timestampMs);
    if (!skeleton?.landmarks?.length) return { skeleton, result: '---' };
    // mirror: false — MediaPipe already uses subject left/right (person's left = 11, right = 12)
    const posture = new Posture(skeleton.landmarks[0], false);

    // Swap labels for mirrored display: MediaPipe "left" is on image left = user's right on screen
    let result = null;
    if (posture.isLeftHandUp() && posture.isRightHandUp()) result = 'Both Hands Up';
    else if (posture.isLeftHandUp()) result = 'Left Hand Up';
    else if (posture.isRightHandUp()) result = 'Right Hand Up';

    this.isFinished = this.schedule.length === 0;

    return { skeleton, result };
  }
}
