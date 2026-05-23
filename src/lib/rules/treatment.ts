import type { Region, SkinProfile } from "../types";

export type Rule = {
  id: string;
  region: Region | "global";
  metric: keyof SkinProfile["per_region"][Region] | "symmetry" | "overall_texture" | "overall_redness";
  // Trigger when delta vs baseline crosses this threshold.
  // For relative metrics, value is fraction (0.10 = 10%).
  // For absolute color/symmetry metrics, value is in metric units.
  threshold: number;
  mode: "relative" | "absolute";
  direction: "increase" | "decrease";
  text_en: string;
  text_zh: string;
};

export const RULES: Rule[] = [
  {
    id: "rcheek_a_up",
    region: "right_cheek",
    metric: "a",
    threshold: 1.5,
    mode: "absolute",
    direction: "increase",
    text_en:
      "Right-cheek erythema (a*) trending upward. Consider anti-inflammatory regimen and re-evaluate any recent device-based treatments on this region.",
    text_zh:
      "右臉頰紅斑（a*）呈上升趨勢。建議考慮抗發炎處置，並重新評估近期該區的儀器療程。",
  },
  {
    id: "lcheek_a_up",
    region: "left_cheek",
    metric: "a",
    threshold: 1.5,
    mode: "absolute",
    direction: "increase",
    text_en:
      "Left-cheek erythema (a*) trending upward. Consider anti-inflammatory regimen and re-evaluate any recent device-based treatments on this region.",
    text_zh:
      "左臉頰紅斑（a*）呈上升趨勢。建議考慮抗發炎處置，並重新評估近期該區的儀器療程。",
  },
  {
    id: "forehead_texture_up",
    region: "forehead",
    metric: "texture",
    threshold: 0.15,
    mode: "relative",
    direction: "increase",
    text_en:
      "Forehead texture variance increased >15%. Review exfoliation cadence and consider topical retinoid review.",
    text_zh:
      "額頭紋理變異增加超過 15%。建議檢視角質代謝步驟，並評估外用 A 醇方案。",
  },
  {
    id: "forehead_wrinkle_up",
    region: "forehead",
    metric: "wrinkle",
    threshold: 0.20,
    mode: "relative",
    direction: "increase",
    text_en:
      "Forehead wrinkle-edge density up >20%. Discuss neuromodulator timing or topical peptide options.",
    text_zh:
      "額頭皺紋邊緣密度上升超過 20%。可與病患討論神經調節劑施打時機或外用胜肽方案。",
  },
  {
    id: "nose_pore_up",
    region: "nose",
    metric: "pore",
    threshold: 0.15,
    mode: "relative",
    direction: "increase",
    text_en:
      "Nasal pore-density proxy increased >15%. Consider salicylic acid or sebum-control protocol.",
    text_zh:
      "鼻部毛孔密度代理指標上升超過 15%。建議考慮水楊酸或控油方案。",
  },
  {
    id: "perioral_wrinkle_up",
    region: "perioral",
    metric: "wrinkle",
    threshold: 0.20,
    mode: "relative",
    direction: "increase",
    text_en:
      "Perioral wrinkle-edge density up >20%. Consider hydration support and review lip area volumization plan.",
    text_zh:
      "嘴唇周圍皺紋邊緣密度上升超過 20%。建議加強保濕並重新評估唇周豐盈方案。",
  },
  {
    id: "global_symmetry_up",
    region: "global",
    metric: "symmetry",
    threshold: 2.0,
    mode: "absolute",
    direction: "increase",
    text_en:
      "Left/right cheek erythema asymmetry has widened. Investigate unilateral cause (sun exposure, sleeping position, recent unilateral treatment).",
    text_zh:
      "雙頰紅斑不對稱程度擴大。建議追查單側成因（日曬、睡姿、近期單側療程）。",
  },
  {
    id: "global_texture_down",
    region: "global",
    metric: "overall_texture",
    threshold: 0.10,
    mode: "relative",
    direction: "decrease",
    text_en:
      "Overall facial texture variance has improved >10%. Document current regimen as the working baseline.",
    text_zh:
      "整體臉部紋理變異改善超過 10%。建議將目前療程組合記錄為當前基準。",
  },
];

export type Triggered = {
  rule: Rule;
  delta: number;
  baseline: number;
  current: number;
};

function pickMetric(p: SkinProfile, rule: Rule): number {
  if (rule.region === "global") {
    if (rule.metric === "symmetry") return p.global.symmetry;
    if (rule.metric === "overall_texture") return p.global.overall_texture;
    if (rule.metric === "overall_redness") return p.global.overall_redness;
    return 0;
  }
  const region = p.per_region[rule.region];
  return (region as Record<string, number>)[rule.metric as string] ?? 0;
}

export function evaluateRules(
  baseline: SkinProfile,
  current: SkinProfile,
): Triggered[] {
  const out: Triggered[] = [];
  for (const rule of RULES) {
    const bv = pickMetric(baseline, rule);
    const cv = pickMetric(current, rule);
    const diff = cv - bv;
    let triggered = false;
    if (rule.mode === "absolute") {
      triggered =
        rule.direction === "increase"
          ? diff >= rule.threshold
          : diff <= -rule.threshold;
    } else {
      if (bv === 0) continue;
      const rel = diff / Math.abs(bv);
      triggered =
        rule.direction === "increase"
          ? rel >= rule.threshold
          : rel <= -rule.threshold;
    }
    if (triggered) out.push({ rule, delta: diff, baseline: bv, current: cv });
  }
  return out;
}
