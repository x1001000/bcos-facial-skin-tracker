"use client";

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

let _landmarker: FaceLandmarker | null = null;
let _pending: Promise<FaceLandmarker> | null = null;

// MediaPipe's WASM module writes informational lines (e.g.
// "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.") through
// console.error, which Next.js dev overlay then surfaces as a fatal-looking
// error. Suppress that specific noise without hiding real errors.
let _consoleErrorPatched = false;
function patchConsoleErrorOnce() {
  if (_consoleErrorPatched || typeof window === "undefined") return;
  _consoleErrorPatched = true;
  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && /^(INFO|W\d{4}|I\d{4}|W .*\.cc:|E\d{4})/.test(first)) {
      console.info(...args);
      return;
    }
    orig(...args);
  };
}

export async function getLandmarker(): Promise<FaceLandmarker> {
  if (_landmarker) return _landmarker;
  if (_pending) return _pending;
  patchConsoleErrorOnce();
  _pending = (async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
    );
    const lm = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    _landmarker = lm;
    return lm;
  })();
  return _pending;
}

export type DetectResult = FaceLandmarkerResult;
