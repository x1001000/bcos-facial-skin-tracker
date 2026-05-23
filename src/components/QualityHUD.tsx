"use client";

import { useI18n } from "@/lib/i18n/provider";

export type GateState = {
  face: boolean;
  pose: boolean;
  distance: boolean;
  lighting: boolean;
  focus: boolean;
};

type Numbers = {
  yaw: number;
  pitch: number;
  ipd: number;
  luminance: number;
  blur: number;
};

export function QualityHUD({
  gate,
  values,
}: {
  gate: GateState;
  values: Numbers;
}) {
  const { t } = useI18n();
  const items: { key: keyof GateState; label: string; value: string }[] = [
    {
      key: "face",
      label: t("quality_face"),
      value: gate.face ? "OK" : "—",
    },
    {
      key: "pose",
      label: t("quality_pose"),
      value: `yaw ${values.yaw.toFixed(0)}° / pitch ${values.pitch.toFixed(0)}°`,
    },
    {
      key: "distance",
      label: t("quality_distance"),
      value: `${values.ipd.toFixed(0)} px`,
    },
    {
      key: "lighting",
      label: t("quality_lighting"),
      value: `L≈${values.luminance.toFixed(0)}`,
    },
    {
      key: "focus",
      label: t("quality_focus"),
      value: values.blur.toFixed(0),
    },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <div
          key={it.key}
          className={`rounded-md border px-2 py-1 text-[11px] ${
            gate[it.key]
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          <div className="font-medium">{it.label}</div>
          <div className="opacity-80">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
