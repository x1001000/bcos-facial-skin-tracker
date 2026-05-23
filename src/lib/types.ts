export const REGIONS = [
  "forehead",
  "left_cheek",
  "right_cheek",
  "nose",
  "perioral",
  "chin",
] as const;

export type Region = (typeof REGIONS)[number];

export type RegionMetrics = {
  L: number;
  a: number;
  b: number;
  texture: number;
  pore: number;
  wrinkle: number;
};

export type SkinProfile = {
  quality: {
    yaw: number;
    pitch: number;
    luminance: number;
    ipd: number;
    blur: number;
    passed: boolean;
  };
  per_region: Record<Region, RegionMetrics>;
  global: {
    symmetry: number;
    overall_texture: number;
    overall_redness: number;
  };
};

export type Patient = {
  id: string;
  name: string;
  birth_year: number | null;
  notes: string | null;
  created_at: string;
};

export type Visit = {
  id: string;
  patient_id: string;
  captured_at: string;
  image_path: string;
  landmarks_path: string | null;
  profile_json: string;
  quality_passed: number;
};

export type VisitWithProfile = Visit & { profile: SkinProfile };

export type TreatmentSuggestion = {
  id: string;
  patient_id: string;
  visit_id: string;
  rule_id: string;
  region: Region | "global";
  metric: string;
  delta: number;
  status: "suggested" | "accepted" | "edited" | "rejected";
  text: string;
  edited_text: string | null;
  reject_reason: string | null;
  created_at: string;
};

export type Consent = {
  id: string;
  patient_id: string;
  signed_name: string;
  signature_data: string;
  signed_at: string;
};
