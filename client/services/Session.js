import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export class Session {
  constructor(id, encrypted) {
    this.id = id;
    this.poseLandmarker = null;
    this.stream = null;
    this.encrypted = encrypted;
    this.isStarted = false;
  }

  async start() {
    this.isStarted = true;

    // Open webcam
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true });

    const vision = await FilesetResolver.forVisionTasks(WASM_URL);

    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    return { stream: this.stream, poseLandmarker: this.poseLandmarker };
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.isStarted = false;
  }

  detectPose(videoElement, timestampMs) {
    if (!this.poseLandmarker || videoElement.readyState < 2) return null;

    return this.poseLandmarker.detectForVideo(videoElement, timestampMs);
  }
}
