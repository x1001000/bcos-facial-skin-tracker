"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

export function ConsentForm({
  patientId,
  onSigned,
}: {
  patientId: string;
  onSigned: () => void;
}) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [name, setName] = useState("");
  const [hasStrokes, setHasStrokes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    let drawing = false;
    let last: { x: number; y: number } | null = null;
    const getPt = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * c.width,
        y: ((e.clientY - rect.top) / rect.height) * c.height,
      };
    };
    const down = (e: PointerEvent) => {
      drawing = true;
      last = getPt(e);
      c.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drawing || !last) return;
      const p = getPt(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      setHasStrokes(true);
    };
    const up = () => {
      drawing = false;
      last = null;
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointerleave", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointerleave", up);
    };
  }, []);

  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasStrokes(false);
  }

  async function submit() {
    if (!hasStrokes || !name.trim()) return;
    const c = canvasRef.current;
    if (!c) return;
    setSubmitting(true);
    const data = c.toDataURL("image/png");
    const res = await fetch("/api/consents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patient_id: patientId, signed_name: name, signature_data: data }),
    });
    setSubmitting(false);
    if (res.ok) onSigned();
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{t("consent_title")}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{t("consent_intro")}</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-700">{t("consent_signed_name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder=""
          />
        </label>
        <div>
          <div className="text-sm text-zinc-700 mb-1">{t("consent_signature")}</div>
          <canvas
            ref={canvasRef}
            width={500}
            height={140}
            className="w-full max-w-md rounded-md border border-zinc-300 bg-white touch-none"
          />
          <button
            type="button"
            onClick={clear}
            className="mt-2 text-xs text-zinc-500 underline"
          >
            {t("consent_clear")}
          </button>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!hasStrokes || !name.trim() || submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {t("consent_sign")}
        </button>
      </div>
    </div>
  );
}
