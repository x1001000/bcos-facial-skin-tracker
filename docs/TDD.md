# TDD — Beauty Clinic OS Facial Skin Tracker

**Author:** PHIL — 2026-05-23

## Imaging pipeline architecture

```
                ┌──────────────────────────────────────────┐
                │  Browser (clinic device, Chrome/Safari)  │
                │                                          │
   webcam ───►  │  getUserMedia ─► <video>                 │
                │       │                                  │
                │       ▼                                  │
                │   per-frame rAF loop                     │
                │       │                                  │
                │       ├─► MediaPipe Face Landmarker      │
                │       │   (478 3D landmarks, GPU)        │
                │       │                                  │
                │       ├─► pose estimate (yaw/pitch/IPD)  │
                │       │                                  │
                │       ├─► frame luminance + blur         │
                │       │                                  │
                │       └─► QualityHUD ◄── frameQualityPasses
                │                                          │
                │   capture (button gated on all-green +   │
                │            stable for 5 frames)          │
                │       │                                  │
                │       ▼                                  │
                │   buildProfile(imageData, landmarks)     │
                │       │                                  │
                │       ▼                                  │
                │   POST /api/patients/:id/visits          │
                │       │                                  │
                └───────┼──────────────────────────────────┘
                        │
                        ▼
                ┌────────────────────────────────┐
                │  Next.js server (Fly.io/local) │
                │                                │
                │  write JPEG to public/uploads  │
                │  write landmarks.json          │
                │  INSERT visit + profile_json   │
                │  evaluateRules(baseline, this) │
                │  INSERT triggered treatments   │
                └────────────────────────────────┘
                        │
                        ▼
                  SQLite (bcos.db)
```

All inference runs in the browser. There is no server-side computer vision. This means: (a) photos never leave the clinic device for analysis, (b) the prototype runs offline of any AI service, (c) deployment is trivial.

## Skin profile schema

```ts
type SkinProfile = {
  quality: {
    yaw: number;        // degrees, target ±8
    pitch: number;      // degrees, target ±8
    luminance: number;  // mean L* across frame, target 45–75
    ipd: number;        // inter-pupil distance px, target 180–320
    blur: number;       // variance of Laplacian, target ≥60
    passed: boolean;
  };
  per_region: {
    [forehead | left_cheek | right_cheek | nose | perioral | chin]: {
      L: number;        // CIELAB lightness
      a: number;        // CIELAB red-green (erythema proxy)
      b: number;        // CIELAB blue-yellow (pigmentation proxy)
      texture: number;  // variance of Laplacian on luminance
      pore: number;     // dark-blob density proxy
      wrinkle: number;  // Sobel edge density (only forehead, perioral)
    }
  };
  global: {
    symmetry: number;       // |left_cheek.a - right_cheek.a|
    overall_texture: number;
    overall_redness: number;
  };
};
```

The full `SkinProfile` is stored as a JSON column on `visits.profile_json`. The raw JPEG is stored on disk under `public/uploads/<visit_id>.jpg`, and the raw landmark JSON is stored next to it. Both originals are retained so that improved metric formulas can recompute the entire history without re-photographing patients.

## Photo-consistency controls

The single most important reliability property is **visit-to-visit comparability**. We achieve this with four overlapping controls, in order of how much they matter:

1. **Capture-time gating.** Capture is blocked until `frameQualityPasses` returns true *and* the all-green state has held for 5 consecutive frames. The HUD shows which dimension is failing, so the operator can correct it.
2. **Landmark-anchored ROIs.** Each anatomical region is defined as a polygon over a fixed set of MediaPipe FaceMesh landmark indices (see `src/lib/vision/rois.ts`). Same indices → same anatomical patch, regardless of small pose differences. We rasterize the polygon to a mask and only sample pixels inside.
3. **CIELAB rather than RGB.** Color metrics are reported in CIELAB so that human perception of color difference is approximately uniform. We use D65 reference white, standard sRGB companding.
4. **Quality-passed filter on baseline selection.** The baseline visit used for rule evaluation is the **earliest visit with `quality_passed = 1`**. Failed-quality visits remain in the timeline (visibly badged) but do not become the comparison anchor.

What we explicitly **don't** do in v0:
- We don't currently apply white-balance correction from a reference card. The capture-time luminance gate gets us most of the way; a printed clinic card is a planned v1 add.
- We don't ensemble across multiple captures. v1.

## Model reliability and explainability

**Why not a single skin-score model?** Because the clinician must be able to explain why a suggestion appeared, and reject it specifically. A black-box "skin score = 72" is not reviewable. Each treatment suggestion in BCOS is generated by a named rule in `src/lib/rules/treatment.ts`, with a documented condition like:

```ts
{
  id: "rcheek_a_up",
  region: "right_cheek",
  metric: "a",
  threshold: 1.5,            // CIELAB a* units
  mode: "absolute",
  direction: "increase",
  text_en: "Right-cheek erythema (a*) trending upward. Consider…",
  text_zh: "右臉頰紅斑（a*）呈上升趨勢。建議…"
}
```

The treatment-planner UI renders the rule's trigger (region + metric + delta + threshold) inline with the suggestion text. Staff actions on each suggestion (accept/edit/reject + reason) are persisted, so the corrective signal is available later for both audit and training.

## Workflow integration

| Role | Touch surface | Notes |
|---|---|---|
| Operator | `/intake/[patientId]` | Patient-facing camera page. HUD designed to be readable at arm's length. |
| Operator | `/consent/[patientId]` | First-visit consent + signature canvas. Cached per-patient. |
| Lead clinician | `/patients/[id]` | Side-by-side comparison + per-region metric chart. |
| Lead clinician | `/patients/[id]/plan` | Editable, explainable suggestions. Rejection reason captured. |
| Owner | (Phase 1) | Cross-patient outcomes dashboard. Out of scope here. |

The data model has been intentionally kept thin (5 tables): `patients`, `consents`, `visits`, `treatments`, plus the implicit append-only profile JSON. Migrating to Postgres for multi-tenant deployment is trivial (Drizzle ORM ready, raw SQL also ports cleanly).

## Real-world imaging variation: how we handle it

| Variation | What it breaks | Our control |
|---|---|---|
| Lighting (clinic lamp vs ambient daylight) | Per-channel color drift | Luminance gate (target 45–75); CIELAB conversion; planned: WB reference card |
| Camera angle (clinician's hand not steady) | Region misregistration | Pose gate (±8° yaw/pitch); landmark-anchored ROIs |
| Distance from camera (zoom) | Pixel resolution per region varies | IPD gate (180–320 px); per-area normalization in metrics |
| Device variation (iPad vs MacBook camera) | White-balance differences | CIELAB conversion (perceptual); v1 add: per-device calibration profile |
| Motion blur (patient moved) | Spurious texture variance | Laplacian-variance focus gate (≥60); stability requirement (5 frames green) |
| Make-up / skincare film | Suppresses texture/pore signals | Out of scope for v0; v1 add: pre-capture cleansing checkpoint |

## Tech stack and why

- **Next.js 16 App Router + TypeScript:** SSR for the simple patient list pages, client components where we need the camera. Containerized and deployed to Fly.io with a persistent volume for the SQLite DB and uploads.
- **MediaPipe Tasks Vision (Face Landmarker, GPU delegate):** 478 3D landmarks, runs at 30fps in the browser. Mature, well-documented, no server inference required.
- **better-sqlite3:** Synchronous SQLite. Perfect for a single-clinic prototype. Schema migrates to Postgres later without rewriting code.
- **Recharts:** Per-region metric line charts. Light, declarative.
- **Plain Tailwind v4:** No component-library overhead; small surface to keep the build cheap.

## Privacy posture

- All face inference is in-browser. Photos never leave the device for analysis.
- Server stores JPEGs + landmark JSON + profile JSON on the local filesystem (in this prototype) under `public/uploads`. In production these belong in encrypted blob storage scoped per-clinic.
- Consent is captured per-patient on the first visit and persisted with a typed signature image; gate blocks `/intake/` until consent exists.
- Soft-delete column (`visits.deleted_at`) is present so removal from view doesn't drop the row — important for clinic audit.

## What would change in production

- Auth + multi-clinic tenancy (currently single-user prototype).
- Postgres + signed-URL blob storage instead of local SQLite + `public/uploads`.
- Backend rule evaluation runs in a worker so heavy ROI metrics don't block the request thread when many visits land at once.
- Camera-stream profile (device fingerprint + per-device WB matrix) to remove residual color drift between clinic devices.
- Audit log (currently we capture the suggestion's status but not who clicked it).
