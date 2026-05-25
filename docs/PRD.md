# PRD — Beauty Clinic OS (Facial Skin Tracker wedge)

**Author:** PHIL — 2026-05-23  
**Status:** Build-challenge prototype, panel-ready scope

## Target user

**Primary:** Lead aesthetician / clinical operator at a Taiwan medical-aesthetic clinic. Sees 6–14 returning patients per day, runs intake personally for VIP cases, and reviews longitudinal progress before each follow-up consultation.

**Secondary:** Owner/MD who reviews treatment plans and outcomes weekly; uses the same view to coach junior staff and to justify treatment recommendations to patients during the chair-side conversation.

These users are domain experts who already *do* longitudinal tracking — with their eyes, an iPad camera, and a Line album. The wedge is not "AI replaces the clinician's judgment." It is **giving the clinician a consistent measurement** so the eye gets paired with a number the patient can also see.

## Workflow today vs. with BCOS

Today, a typical follow-up visit looks like:
1. Operator snaps a photo on whatever device is handy, lighting whatever it is.
2. Photo lives in Line/iPhone Photos/iPad gallery, sometimes labelled.
3. At follow-up, the operator scrolls through old photos and **visually estimates** whether redness, texture, or pigmentation has changed.
4. Treatment plan is whatever the clinician concludes — and is hard to defend later because no measurement was recorded.

With BCOS:
1. Operator opens patient → **New visit** → consent (first time only) → camera page.
2. Camera **refuses to capture** until pose, distance, lighting, and focus are within target ranges. This is the standardization layer; it's the most important step.
3. On capture, a **quantified skin profile** is computed and stored: per-region L\*/a\*/b\* in CIELAB, texture variance, pore-density proxy, wrinkle-edge proxy, plus global symmetry. The profile JSON is durable so newer methods can recompute history.
4. The patient view shows a **side-by-side photo viewer** + **per-region metric chart** over visits. Quality-flagged visits are visibly badged, not silently averaged into the trend.
5. The **treatment planner** auto-generates explainable suggestions from the latest visit's deltas vs. the baseline visit. Each suggestion cites the region, metric, delta, and rule. Staff accept, edit, or reject with a reason.

## Why this approach fits clinic operations

- **Capture-time gating, not post-hoc correction.** Beauty-clinic photos are notoriously inconsistent. Rather than ship a complicated normalization pipeline that nobody trusts, we block the capture itself until conditions are good. The operator gets immediate, visible feedback through the HUD gauges — they understand exactly *why* they can't capture yet.
- **Explainable rules over a black-box score.** Aestheticians and MDs justify treatment decisions to patients and to each other. A suggestion that says "right-cheek a\* up 1.8 vs baseline → consider anti-inflammatory regimen" is reviewable. A skin-score-of-72 is not.
- **Landmark-anchored ROIs.** Visit-to-visit pose is never identical. By defining ROIs as polygons over MediaPipe FaceMesh landmark indices, we always measure the same anatomical patch even when the head moves a few degrees.
- **Editable suggestions, not autopilot.** The clinician is always the author of the treatment plan. The product produces a draft, the staff edits, accepts, or rejects — and the rejection reason is captured, which becomes the training signal for later iterations.
- **Bilingual UX.** Taiwan clinics need Mandarin support; reviewers and visitors arrive in English. Toggle is in the header (`en` / `zh-TW`); default is `en` and the choice persists per browser.

## Why this is the wedge

A defensible Beauty Clinic OS needs (a) **proprietary longitudinal data on patient outcomes** and (b) **trust from clinicians who would otherwise stick with Line + Excel**. The standardized photo intake is the smallest piece of software that produces both:

- It's the **lowest-effort behavior change** for the clinic (one extra app, one more tap), so adoption clears the bar.
- Every captured visit produces a structured, comparable record we own. After a few hundred visits per clinic per month, the cross-clinic benchmarking dataset is unique.
- It is the **chair-side conversation tool** patients respond to ("look — the redness on your right cheek is up 12% since your last visit"), which raises retention and average revenue per patient.

## Wedge → Platform path

| Phase | Wedge | Platform addition |
|---|---|---|
| 0 (this build) | Standardized intake, quantified profile, longitudinal view, explainable plan | Consent + photo history, Mandarin UX |
| 1 (months 1–3) | Above + multi-operator CRM, scheduling | Appointment ↔ visit linkage, outcome tracking (patient satisfaction at visit + N), shared-device workflow |
| 2 (months 3–6) | Above + Line integration for patient-facing recap, payment | Treatment-product inventory, supplier ordering, pricing-suggestion engine |
| 3 (months 6–12) | Above + benchmarking across clinics (opt-in) | Cross-clinic outcomes dataset → first ML model on real labels (rather than the proxy metrics) |

Note that ML modeling lives at **Phase 3**, not Phase 0. The Phase-0 product is intentionally rule-based and explainable. The proprietary data we collect in Phases 0–2 is what *makes a Phase-3 model trainable* — and is the moat.

## What this prototype is and is not

**Is:** a working, end-to-end web app where a clinician can intake a photo with quality gating, see quantified per-region metrics, compare two visits side-by-side, view per-region metric trends, and receive editable, rule-based treatment suggestions cited to specific metric deltas. Mandarin UX and consent capture are visible in the product.

**Is not:** a dermatology-grade diagnostic tool. The metrics are CV proxies (CIELAB channel statistics, Laplacian variance, edge density, simple blob counting). They are *consistent* across visits — which is the property we actually need for longitudinal tracking — but they are not biomarkers.

This honesty matters because (a) the clinician must know what they're looking at, and (b) the wedge story does not require us to claim dermatology accuracy on day 1.
