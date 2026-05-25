# Beauty Clinic OS — Facial Skin Tracker

AI Fund Build Challenge submission. Standardized facial photo intake, quantified skin profiles, longitudinal comparison, explainable treatment planning. Mandarin (zh-TW) UX and consent capture are visible depth areas.

**Submission docs:**
- [PRD](docs/PRD.md) — target user, workflow, wedge-to-platform path
- [TDD](docs/TDD.md) — imaging pipeline, photo-consistency controls, rules engine
- [Authorship note](docs/AUTHORSHIP.md) — what I built, reused, broke, debugged
- [Demo script](docs/DEMO_SCRIPT.md) — 3-minute walkthrough (TBD)

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The patient roster starts empty — add a patient and run the intake flow to populate it.

A modern browser with camera access (Chrome or Safari) is required for the intake page. MediaPipe Face Landmarker WASM is loaded from the public CDN at first use.

## Known limitations

- No server-side WB calibration. The luminance gate gets close, but cross-device color drift is a v1 item.
- ROI metrics are CV proxies, not dermatology-grade biomarkers. They are *consistent* across visits, which is the property we need; they are not biomarkers. Discussed in TDD §"Model reliability and explainability".
- Single-user prototype: no auth, no multi-clinic tenancy. Discussed in TDD §"What would change in production".

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · MediaPipe Tasks Vision (Face Landmarker, GPU) · better-sqlite3 · Recharts.

## Deploy

Deployed to Fly.io with a persistent volume mounted at `/data` for `bcos.db` and uploaded images (`fly.toml`, `Dockerfile`, `docker-entrypoint.sh`). `npm run build` succeeds with zero TypeScript errors. For a multi-clinic production deploy you would swap SQLite for Postgres and the local volume for signed-URL blob storage (TDD discusses the migration).
