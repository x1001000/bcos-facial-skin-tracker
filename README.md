# Beauty Clinic OS — Facial Skin Tracker

AI Fund Build Challenge submission. Standardized facial photo intake, quantified skin profiles, longitudinal comparison, explainable treatment planning. Mandarin (zh-TW) UX and consent capture are visible depth areas.

**Submission docs:**
- [PRD](docs/PRD.md) — target user, workflow, wedge-to-platform path
- [TDD](docs/TDD.md) — imaging pipeline, photo-consistency controls, rules engine
- [Authorship note](docs/AUTHORSHIP.md) — what I built, reused, broke, debugged
- [Demo script](docs/DEMO_SCRIPT.md) — 3-minute walkthrough

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Two synthetic patients are seeded on first launch (delete `bcos.db` to reset).

A modern browser with camera access (Chrome or Safari) is required for the intake page. MediaPipe Face Landmarker WASM is loaded from the public CDN at first use.

## What's real vs. synthetic in the demo

- **Real:** vision pipeline (CIELAB, texture, pore proxy, wrinkle proxy, pose estimation), capture-time gating, rule engine, all UI, DB.
- **Real on capture:** when you take a live photo on `/intake/[patientId]`, the full skin profile is computed in your browser from the real image data.
- **Synthetic:** the two seed patients' three-visit histories use placeholder face SVGs and profile metrics generated to produce realistic-looking trends (right-cheek redness drift, forehead texture improvement). This is so the comparison view and treatment planner have something to demo against on a fresh install. Once you take a real photo, real metrics enter the dataset.

## Known limitations

- No server-side WB calibration. The luminance gate gets close, but cross-device color drift is a v1 item.
- ROI metrics are CV proxies, not dermatology-grade biomarkers. They are *consistent* across visits, which is the property we need; they are not biomarkers. Discussed in TDD §"Model reliability and explainability".
- Single-user prototype: no auth, no multi-clinic tenancy. Discussed in TDD §"What would change in production".

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · MediaPipe Tasks Vision (Face Landmarker, GPU) · better-sqlite3 · Recharts.

## Deploy

Tested for Vercel. `npm run build` succeeds with zero TypeScript errors. The DB file (`bcos.db`) is created on first request in the project root; for Vercel you would swap to Postgres + signed-URL blob storage (TDD discusses the migration).
