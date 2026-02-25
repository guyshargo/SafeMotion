/**
 * Posture – maps MediaPipe Pose Landmarker 33 indices to left/right body parts.
 * Indices 0–32 follow MediaPipe: 0=nose, 1–3=left eye, 4–6=right eye, 7–8=ears,
 * 9–10=mouth, 11–12=shoulders, 13–14=elbows, 15–16=wrists, 17–22=fingers,
 * 23–24=hips, 25–26=knees, 27–28=ankles, 29–30=heels, 31–32=foot index.
 * When mirror=true (e.g. mirrored camera), left/right are swapped so "left" means user's left.
 */
export class Posture {
    constructor(landmarks, mirror = false) {
        const L = (leftIdx, rightIdx) => mirror ? [landmarks[rightIdx], landmarks[leftIdx]] : [landmarks[leftIdx], landmarks[rightIdx]];
        const [l11, r11] = L(11, 12);
        const [l13, r13] = L(13, 14);
        const [l15, r15] = L(15, 16);
        const [l17, r17] = L(17, 18);
        const [l19, r19] = L(19, 20);
        const [l21, r21] = L(21, 22);
        const [l23, r23] = L(23, 24);
        const [l25, r25] = L(25, 26);
        const [l27, r27] = L(27, 28);
        const [l29, r29] = L(29, 30);
        const [l31, r31] = L(31, 32);
        const [l1, r1] = L(1, 4);
        const [l2, r2] = L(2, 5);
        const [l3, r3] = L(3, 6);
        const [l7, r7] = L(7, 8);
        const [l9, r9] = L(9, 10);

        // Head
        this.nose = landmarks[0];
        this.leftEye = { inner: l1, mid: l2, outer: l3 };
        this.rightEye = { inner: r1, mid: r2, outer: r3 };
        this.leftEar = l7;
        this.rightEar = r7;
        this.mouth = { left: l9, right: r9 };

        // Upper body
        this.shoulder = { left: l11, right: r11 };
        this.elbow = { left: l13, right: r13 };
        this.wrist = { left: l15, right: r15 };
        this.finger = {
            pinky: { left: l17, right: r17 },
            index: { left: l19, right: r19 },
            thumb: { left: l21, right: r21 },
        };
        this.hip = { left: l23, right: r23 };

        // Lower body
        this.knee = { left: l25, right: r25 };
        this.ankle = { left: l27, right: r27 };
        this.heel = { left: l29, right: r29 };
        this.foot = { left: l31, right: r31 };
    }

    #difference(a, b) {
        if (!a || !b) return null;
        return a - b;
    }

    #distance(a, b) {
        if (!a || !b) return null;

        return Math.sqrt(
            (a.x - b.x) ** 2 +
            (a.y - b.y) ** 2 +
            (a.z - b.z) ** 2
        );
    }

    #angle(A, B, C) {
        if (!A || !B || !C) return null;

        const BA = [A.x - B.x, A.y - B.y, A.z - B.z];
        const BC = [C.x - B.x, C.y - B.y, C.z - B.z];

        const dot = BA[0] * BC[0] + BA[1] * BC[1] + BA[2] * BC[2];
        const magBA = Math.hypot(...BA);
        const magBC = Math.hypot(...BC);

        return Math.acos(dot / (magBA * magBC)) * 180 / Math.PI;
    }

    #leftKneeAngle() {
        return this.#angle(
            this.hip.left,
            this.knee.left,
            this.ankle.left
        );
    }

    #rightKneeAngle() {
        return this.#angle(
            this.hip.right,
            this.knee.right,
            this.ankle.right
        );
    }

    isHead() {
        return (this.nose?.visibility ?? 0) > 0.5 && (this.leftEye?.inner?.visibility ?? 0) > 0.5 &&
            (this.rightEye?.inner?.visibility ?? 0) > 0.5 && (this.leftEye?.mid?.visibility ?? 0) > 0.5 &&
            (this.rightEye?.mid?.visibility ?? 0) > 0.5 && (this.leftEye?.outer?.visibility ?? 0) > 0.5 &&
            (this.rightEye?.outer?.visibility ?? 0) > 0.5 && (this.leftEar?.visibility ?? 0) > 0.5 &&
            (this.rightEar?.visibility ?? 0) > 0.5 && (this.mouth?.left?.visibility ?? 0) > 0.5 &&
            (this.mouth?.right?.visibility ?? 0) > 0.5;
    }

    isLeftArm() {
        return (this.shoulder?.left?.visibility ?? 0) > 0.5 && (this.elbow?.left?.visibility ?? 0) > 0.5 &&
            (this.wrist?.left?.visibility ?? 0) > 0.5 && (this.finger?.pinky?.left?.visibility ?? 0) > 0.5 &&
            (this.finger?.index?.left?.visibility ?? 0) > 0.5 && (this.finger?.thumb?.left?.visibility ?? 0) > 0.5;
    }

    isRightArm() {
        return (this.shoulder?.right?.visibility ?? 0) > 0.5 && (this.elbow?.right?.visibility ?? 0) > 0.5 &&
            (this.wrist?.right?.visibility ?? 0) > 0.5 && (this.finger?.pinky?.right?.visibility ?? 0) > 0.5 &&
            (this.finger?.index?.right?.visibility ?? 0) > 0.5 && (this.finger?.thumb?.right?.visibility ?? 0) > 0.5;
    }
    isUpperBody() {
        return this.isLeftArm() && this.isRightArm() &&
            (this.hip?.left?.visibility ?? 0) > 0.5 && (this.hip?.right?.visibility ?? 0) > 0.5;
    }

    isLowerBody() {
        return (this.knee?.left?.visibility ?? 0) > 0.5 && (this.knee?.right?.visibility ?? 0) > 0.5 &&
            (this.ankle?.left?.visibility ?? 0) > 0.5 && (this.ankle?.right?.visibility ?? 0) > 0.5 &&
            (this.heel?.left?.visibility ?? 0) > 0.5 && (this.heel?.right?.visibility ?? 0) > 0.5 &&
            (this.foot?.left?.visibility ?? 0) > 0.5 && (this.foot?.right?.visibility ?? 0) > 0.5;
    }

    isSquatting(angleThreshold = 100) {
        const left = this.#angle(this.hip.left, this.knee.left, this.ankle.left);
        const right = this.#angle(this.hip.right, this.knee.right, this.ankle.right);

        return left < angleThreshold && right < angleThreshold;
    }

    isLeftHandUp() {
        if (!this.isLeftArm()) return false;
        // y increases downward; hand up = wrist above shoulder = wrist.y < shoulder.y
        const diff = this.#difference(this.wrist?.left?.y, this.shoulder?.left?.y);
        return diff != null && diff < 0;
    }

    isRightHandUp() {
        if (!this.isRightArm()) return false;
        const diff = this.#difference(this.wrist?.right?.y, this.shoulder?.right?.y);
        return diff != null && diff < 0;
    }

    isBothHandsDown() {
        return !this.isLeftHandUp() && !this.isRightHandUp();
    }
}