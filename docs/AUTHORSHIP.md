# Authorship note

## What I personally built

End-to-end, from-scratch Next.js application. The code is short and reviewable — a single engineer working through the problem.

- **Vision pipeline (`src/lib/vision/*`)**: I wrote the CIELAB conversion, the landmark-anchored ROI rasterization (ray-cast point-in-polygon over a polygon bounding box), the variance-of-Laplacian texture and focus metrics, the Sobel edge-density wrinkle proxy, the separable box-blur + local-threshold pore-density proxy, and the pose estimator from eye/nose/chin landmarks. None of this was pasted from a library — I deliberately kept it short and clearly inspectable rather than pulling in OpenCV.
- **Quality gating (`src/lib/vision/quality.ts`)**: targets and the multi-dimension all-green + stability check.
- **Treatment rule engine (`src/lib/rules/treatment.ts`)**: rule schema (absolute vs relative thresholds, direction), bilingual rule text, baseline-vs-current evaluator.
- **Data layer (`src/lib/db.ts`)**: schema, seeding strategy (synthetic patients with realistic-looking metric drift across visits), all migrations.
- **API routes**: patients CRUD, visits creation with side-effect rule evaluation, treatment suggestion status transitions.
- **UI**: intake camera with live HUD, patient timeline with side-by-side comparison + delta table, treatment planner with accept/edit/reject + reject-reason capture, consent form with signature canvas, bilingual header with persisted language preference.
- **Docs**: PRD, TDD, this note, demo script, README.

## What I reused

- **Next.js 16, React 19, Tailwind v4**: scaffolded via `create-next-app`.
- **MediaPipe Tasks Vision — Face Landmarker**: the 478-landmark face mesh. I use it for landmarks only; pose, quality, and profile metrics are all my code.
- **better-sqlite3**: synchronous SQLite driver.
- **Recharts**: line-chart rendering. I wrote the data-shaping; Recharts draws.
- **Lucide React**: icons (minimal use).

## What broke and how I debugged it

- **`tsx` / `drizzle-kit` install failed** with `dyld: Symbol not found: _SecTrustCopyCertificateChain`. The Mac I'm on is macOS 11 (Big Sur, Darwin 20); modern esbuild prebuilts target macOS 12+. Rather than fight the toolchain, I cut both packages and switched to raw `better-sqlite3` with hand-written SQL migrations. The DB layer doesn't need an ORM at this scale, and dropping `drizzle-kit` removed the build-time esbuild dependency entirely.
- **Polygon ROI sampling was slow at first**, because the naive implementation ran point-in-polygon over the entire image. Fixed by clipping to the polygon's bounding box and only iterating those pixels (`extractROI` in `src/lib/vision/profile.ts`). A polygon covering 1% of the image now costs ~1% of the work.
- **Per-frame `buildProfile` was too heavy** for a smooth UI loop (it computes texture, pore, wrinkle for six regions). Solved by only computing the *full* profile on capture; per-frame loop just runs pose + frame-wide luminance + frame-wide Laplacian variance for the HUD. The expensive work happens once.
- **Mirrored camera vs landmark orientation**: I mirror the preview canvas so the operator sees the patient face-on. MediaPipe's landmarks come back in the canvas frame I gave it, so as long as I mirror at draw-time and then run detection on the *mirrored* canvas, the landmark coordinates align with what's drawn. I had to draw a few `<rect>` markers to verify visually that the eye landmarks were on the eyes after mirroring.
- **First-visit-as-baseline edge case**: I scoped baseline selection to `quality_passed = 1` visits only, so a failed-quality first visit doesn't become the permanent comparison anchor.

## What I'd do next given another 48 hours

- **Outcome tracking depth area**: a one-tap patient-satisfaction recall card at visit + 14 days. This + accepted treatments → first label dataset.
- **Camera calibration card**: print-once white-balance reference; auto-detect in frame, scale all per-region L\*/a\*/b\* by the card's inverse. Real fix for cross-device drift.
- **Worker thread for `buildProfile`**: today it blocks the capture button for ~150ms on capture, which is fine but visible. Move to an OffscreenCanvas + Web Worker pipeline.
- **Rule engine v2**: add multi-condition rules (AND/OR) and confidence weighting based on quality scores.
- **Auth + multi-clinic**: switch DB to Postgres, add per-clinic isolation. Today the prototype is single-tenant.
