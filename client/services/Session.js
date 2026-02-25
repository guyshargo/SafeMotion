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
  constructor(id, sessionId, trainer = []) {
    this.id = id;
    this.sessionId = sessionId;

    // Schedule of the session
    this.trainer = trainer;
    this.finTrainings = []
    this.current = this.trainer.session.length > 0 ? this.trainer.session[0] : null
    this.awaitingRelax = false;

    // Video elements
    this.poseLandmarker = null;
    this.stream = null;

    // Performance states
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
   * Finishes the training
   * @param {number} repeats - The number of repeats
   * @param {number} sets - The number of sets
   * @returns {Object} The updated repeats and sets
   */
  finTraining(repeats, sets) {
    this.awaitingRelax = false;

    // Check if there are more trainings to finish
    if (this.trainer.session.length > 0) {
      repeats -= 1;

      // Check if number of repeats are finished
      if (repeats === 0) {
        repeats = this.current.repeats;
        sets -= 1;

        // Check if number of sets are finished
        if (sets === 0) {
          // Add current training to finished trainings
          this.finTrainings.push(this.current);

          // Remove training from session and define next training
          this.trainer.session.shift();
          this.current = this.trainer.session.length > 0 ? this.trainer.session[0] : null;

          return { updatedRepeats: this.current?.repeats || 0, updatedSets: this.current?.setRepeats || 0 };
        }
      }
    }

    return { updatedRepeats: repeats, updatedSets: sets };
  }

  /**
   * Starts the relaxation detection
   */
  startRelaxDetection() {
    if (!this.current) return;

    // Define waiting by given relax posture, if no relax posture is given, next training right away
    this.awaitingRelax = Boolean(this.current.relaxId);
  }

  #poseIdToText(poseId, fallback = '---') {
    const poseMap = {
      leftHandUp: 'Left hand up',
      rightHandUp: 'Right hand up',
      bothHandUp: 'Both hands up',
      bothHandsDown: 'Both hands down',
    };

    return poseMap[poseId] || fallback;
  }

  /**
   * Check posture performance based on current set
   */
  #checkPosture(posture) {
    let result = {
      detectedText: '---',
      expectedText: this.current?.name || '---',
      isSucceeded: false,
      type: 'warning'
    };

    // Check if current training is available
    if (!this.current) return result;

    // Check if waiting for relaxation
    const expectedPoseId = this.awaitingRelax && this.current?.relaxId ?
      this.current.relaxId :
      this.current.id;

    // Define expected text
    result.expectedText = this.#poseIdToText(expectedPoseId, this.current?.name || '---');

    // Define detected text
    let detectedPoseId = 'bothHandsDown';
    if (posture.isLeftHandUp()) {
      if (posture.isRightHandUp()) {
        result.detectedText = 'Both hands up';
        detectedPoseId = 'bothHandUp';
      }
      else {
        result.detectedText = 'Left hand up';
        detectedPoseId = 'leftHandUp';
      }
    }
    else if (posture.isRightHandUp()) {
      result.detectedText = 'Right hand up';
      detectedPoseId = 'rightHandUp';
    }
    else {
      result.detectedText = 'Both hands down';
      detectedPoseId = 'bothHandsDown';
    }

    result.isSucceeded = detectedPoseId === expectedPoseId;
    result.type = result.isSucceeded ? 'success' : detectedPoseId === 'bothHandsDown' ? 'warning' : 'error';

    return result;
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
    const poseCheck = this.#checkPosture(posture);

    this.isFinished = this.trainer.session.length === 0;

    return { skeleton, poseCheck };
  }
}
