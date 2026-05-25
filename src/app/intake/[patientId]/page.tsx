"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { QualityHUD, type GateState } from "@/components/QualityHUD";
import { getLandmarker } from "@/lib/vision/landmarker";
import { estimatePose, frameQualityPasses, QUALITY_TARGETS } from "@/lib/vision/quality";
import { laplacianVariance, luma } from "@/lib/vision/metrics";
import { buildProfile } from "@/lib/vision/profile";

const PREVIEW_W = 360;
const PREVIEW_H = 480;

// Returns the source rect to draw from `v` so it covers a target aspect ratio (center-crop).
function coverCrop(vw: number, vh: number, targetAR: number) {
  const sourceAR = vw / vh;
  if (sourceAR > targetAR) {
    const sw = vh * targetAR;
    return { sx: (vw - sw) / 2, sy: 0, sw, sh: vh };
  }
  const sh = vw / targetAR;
  return { sx: 0, sy: (vh - sh) / 2, sw: vw, sh };
}

export default function IntakePage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { t } = useI18n();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState>({
    face: false,
    pose: false,
    distance: false,
    lighting: false,
    focus: false,
  });
  const [values, setValues] = useState({
    yaw: 0,
    pitch: 0,
    ipd: 0,
    luminance: 0,
    blur: 0,
  });
  const [stable, setStable] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stableRef = useRef(0);
  const lastLandmarksRef = useRef<{ x: number; y: number; z: number }[] | null>(null);

  // Start camera + load landmarker.
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 1280, height: 720 },
          audio: false,
        });
        if (cancelled) return;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        await getLandmarker();
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  // Per-frame loop.
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let stopped = false;
    const previewCanvas = previewCanvasRef.current!;
    previewCanvas.width = PREVIEW_W;
    previewCanvas.height = PREVIEW_H;
    const overlay = overlayRef.current!;
    overlay.width = PREVIEW_W;
    overlay.height = PREVIEW_H;
    const pctx = previewCanvas.getContext("2d", { willReadFrequently: true })!;
    const octx = overlay.getContext("2d")!;

    async function loop() {
      if (stopped) return;
      const v = videoRef.current;
      if (!v || v.readyState < 2) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // Mirror preview canvas horizontally so the patient-facing display matches expectations.
      // Center-crop so portrait phone cameras and landscape webcams both fill the portrait box.
      const { sx, sy, sw, sh } = coverCrop(v.videoWidth, v.videoHeight, PREVIEW_W / PREVIEW_H);
      pctx.save();
      pctx.scale(-1, 1);
      pctx.drawImage(v, sx, sy, sw, sh, -PREVIEW_W, 0, PREVIEW_W, PREVIEW_H);
      pctx.restore();

      const lm = await getLandmarker();
      const result = lm.detectForVideo(previewCanvas, performance.now());
      octx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);

      // Draw oval guide
      octx.strokeStyle = "rgba(255,255,255,0.7)";
      octx.lineWidth = 2;
      octx.setLineDash([6, 4]);
      octx.beginPath();
      octx.ellipse(PREVIEW_W / 2, PREVIEW_H / 2, 130, 180, 0, 0, Math.PI * 2);
      octx.stroke();
      octx.setLineDash([]);

      const faces = result.faceLandmarks;
      if (faces.length > 0) {
        const landmarks = faces[0];
        lastLandmarksRef.current = landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z }));

        // Draw a sparse landmark cloud.
        octx.fillStyle = "rgba(56,189,248,0.7)";
        for (let i = 0; i < landmarks.length; i += 4) {
          const p = landmarks[i];
          octx.fillRect(p.x * PREVIEW_W - 1, p.y * PREVIEW_H - 1, 2, 2);
        }

        const pose = estimatePose(lastLandmarksRef.current, PREVIEW_W, PREVIEW_H);
        // Crude per-frame luminance + blur on the downsampled preview.
        const img = pctx.getImageData(0, 0, PREVIEW_W, PREVIEW_H);
        const lum = new Float32Array(PREVIEW_W * PREVIEW_H);
        let lsum = 0;
        for (let i = 0, j = 0; i < img.data.length; i += 4, j++) {
          const l = luma(img.data[i], img.data[i + 1], img.data[i + 2]);
          lum[j] = l;
          lsum += l;
        }
        const meanLum = (lsum / lum.length) * (100 / 255);
        const blur = laplacianVariance(lum, PREVIEW_W, PREVIEW_H);

        const q = { yaw: pose.yaw, pitch: pose.pitch, ipd: pose.ipd, luminance: meanLum, blur };
        const { flags, passed } = frameQualityPasses(q);
        const next: GateState = {
          face: true,
          pose: flags.yaw && flags.pitch,
          distance: flags.ipd,
          lighting: flags.luminance,
          focus: flags.blur,
        };
        setGate(next);
        setValues(q);
        // Track stability: how many consecutive frames have all gates passed.
        if (passed) stableRef.current++;
        else stableRef.current = 0;
        setStable(stableRef.current);
      } else {
        lastLandmarksRef.current = null;
        stableRef.current = 0;
        setStable(0);
        setGate({ face: false, pose: false, distance: false, lighting: false, focus: false });
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [ready]);

  const allGreen = Object.values(gate).every(Boolean);

  const capture = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    const live = lastLandmarksRef.current;
    if (!live) {
      setError("face lost at capture moment");
      return;
    }
    // Capture a high-res still, center-cropped to match the portrait preview the user saw.
    const vw = v.videoWidth || 1280;
    const vh = v.videoHeight || 720;
    const { sx, sy, sw, sh } = coverCrop(vw, vh, PREVIEW_W / PREVIEW_H);
    const c = document.createElement("canvas");
    c.width = Math.round(sw);
    c.height = Math.round(sh);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    // Mirror to match preview orientation
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(v, sx, sy, sw, sh, -c.width, 0, c.width, c.height);
    ctx.restore();
    // Reuse the most recent landmarks from the live VIDEO-mode loop.
    // Landmarks are normalized to the cover-cropped frame, which is identical
    // between the preview and this capture canvas.
    const landmarks = live.map((l) => ({ x: l.x, y: l.y, z: l.z }));
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    const profile = buildProfile(imageData, landmarks);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);

    setSaving(true);
    const res = await fetch(`/api/patients/${patientId}/visits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image_data_url: dataUrl,
        landmarks,
        profile,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/patients/${patientId}`);
    } else {
      setError(`save failed: ${res.status}`);
    }
  }, [patientId, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 space-y-4">
      <Link href={`/patients/${patientId}`} className="text-xs text-zinc-500 hover:underline">
        ← back
      </Link>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{t("intake_title")}</h1>
        <span className="text-xs text-zinc-500">stable frames: {stable}</span>
      </div>
      <p className="text-sm text-zinc-600">{t("intake_hint")}</p>

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-black p-2 sm:p-3 shadow-sm">
        <div
          className="relative mx-auto w-full"
          style={{ maxWidth: PREVIEW_W, aspectRatio: `${PREVIEW_W} / ${PREVIEW_H}` }}
        >
          {/* Hidden source video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="hidden"
          />
          <canvas ref={previewCanvasRef} className="absolute inset-0 h-full w-full" />
          <canvas ref={overlayRef} className="absolute inset-0 h-full w-full pointer-events-none" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-200">
              {t("intake_loading_model")}
            </div>
          )}
        </div>
      </div>

      <QualityHUD gate={gate} values={values} />

      <div className="text-xs text-zinc-500">
        targets: yaw/pitch ≤±{QUALITY_TARGETS.yawAbs}°, ipd {QUALITY_TARGETS.ipdMin}-{QUALITY_TARGETS.ipdMax}px,
        L {QUALITY_TARGETS.luminanceMin}-{QUALITY_TARGETS.luminanceMax}, blur ≥{QUALITY_TARGETS.blurMin}
      </div>

      <div className="flex gap-2">
        <button
          disabled={!allGreen || stable < 5 || saving || !!capturedImage}
          onClick={capture}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-30"
        >
          {saving ? "…" : t("intake_capture")}
        </button>
        {capturedImage && (
          <button
            onClick={() => {
              setCapturedImage(null);
              stableRef.current = 0;
              setStable(0);
            }}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm"
          >
            {t("intake_retake")}
          </button>
        )}
      </div>

      {capturedImage && (
        <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedImage} alt="captured" className="max-w-xs rounded" />
        </div>
      )}
    </div>
  );
}
