import type { Landmark } from "./rois";

export type QualityFrame = {
  yaw: number;          // degrees
  pitch: number;        // degrees
  ipd: number;          // pixels
  luminance: number;    // mean L*
  blur: number;         // variance of Laplacian (higher = sharper)
};

export const QUALITY_TARGETS = {
  yawAbs: 8,
  pitchAbs: 8,
  ipdMin: 140,
  ipdMax: 220,
  luminanceMin: 30,
  luminanceMax: 85,
  blurMin: 60,
};

export function frameQualityPasses(q: QualityFrame): {
  passed: boolean;
  flags: Record<keyof QualityFrame, boolean>;
} {
  const flags = {
    yaw: Math.abs(q.yaw) <= QUALITY_TARGETS.yawAbs,
    pitch: Math.abs(q.pitch) <= QUALITY_TARGETS.pitchAbs,
    ipd: q.ipd >= QUALITY_TARGETS.ipdMin && q.ipd <= QUALITY_TARGETS.ipdMax,
    luminance:
      q.luminance >= QUALITY_TARGETS.luminanceMin &&
      q.luminance <= QUALITY_TARGETS.luminanceMax,
    blur: q.blur >= QUALITY_TARGETS.blurMin,
  };
  const passed = Object.values(flags).every(Boolean);
  return { passed, flags };
}

// Estimate yaw/pitch from a few canonical landmarks. Crude but sufficient
// as a gating signal — full PnP solve is overkill for a prototype.
export function estimatePose(landmarks: Landmark[], width: number, height: number): {
  yaw: number;
  pitch: number;
  ipd: number;
} {
  if (landmarks.length < 478) return { yaw: 0, pitch: 0, ipd: 0 };
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const noseTip = landmarks[1];
  const chin = landmarks[152];
  const forehead = landmarks[10];

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  // yaw: lateral offset of nose from eye midline, normalized by eye span
  const eyeSpan = Math.hypot(
    (rightEye.x - leftEye.x) * width,
    (rightEye.y - leftEye.y) * height,
  );
  const noseOffsetX = (noseTip.x - eyeMidX) * width;
  const yaw = Math.atan2(noseOffsetX, eyeSpan * 0.75) * (180 / Math.PI);
  // pitch: vertical offset of nose-tip relative to mid-eye/chin span
  const faceHeight = Math.hypot(
    (chin.x - forehead.x) * width,
    (chin.y - forehead.y) * height,
  );
  const noseOffsetY = (noseTip.y - eyeMidY) * height;
  const pitch = Math.atan2(noseOffsetY - faceHeight * 0.32, faceHeight * 0.5) *
    (180 / Math.PI);
  return { yaw, pitch, ipd: eyeSpan };
}
