# Demo script (target 3 minutes)

Record a screen capture in Loom. Voice over in English (or zh-TW if you prefer). Keep mouse motion deliberate — the reviewer is watching for the workflow, not the cursor.

## 0:00 — Opening (15s)

> "This is BCOS — Beauty Clinic OS — a standardized facial-photo intake and longitudinal tracking prototype for medical aesthetic clinics. Built end-to-end as a single-engineer prototype, runs entirely in the browser, no server-side AI."

Open `/patients`. The two seeded patients are visible (Lin and Chen). One has right-cheek redness drift across three visits; the other has forehead texture improvement.

## 0:15 — Patient timeline + comparison (45s)

Click into **林佳穎 (Lin, Jia-Ying)**.

> "Each patient has a timeline of standardized visits. The comparison panel lets the clinician pick any two visits — here, the 84-day baseline and today. The image strip below uses landmark-anchored ROIs, so even with small pose differences we measure the same anatomical patch."

Pull the metric chart dropdown:

> "These are quantified per-region metrics in CIELAB plus texture, pore-density, and wrinkle-edge proxies. The redness signal — a-star in CIELAB — is climbing on the right cheek and stable elsewhere. The delta table flags positive deltas in red."

## 1:00 — Treatment planner (40s)

Click **Treatment plan**.

> "From those deltas, the rule engine auto-generates editable suggestions. Each one cites the region, metric, and delta value that triggered it — no black-box score."

Click **Accept** on one suggestion. Click **Edit** on another and modify the text. Click **Reject** on a third with a short reason.

> "Staff are always the author. They accept, edit, or reject with a reason — the rejection signal is captured, which becomes training data for later iterations."

## 1:40 — Photo intake (50s)

Click **New visit** → bilingual consent → camera page.

> "Capture is gated on five live dimensions: face detected, pose within ±8°, distance, lighting, and focus. The HUD updates 30 times a second. The button stays disabled until everything is green and stable for several frames — that is what standardized intake means. We block the capture, rather than try to fix it after the fact."

Slowly tilt your head — show the pose gauge going amber.  
Move closer/farther — show the distance gauge moving.  
Hold steady — show all gates green and then the button enables.

Click capture.

> "On capture, the full skin profile — per-region L\*, a\*, b\*, texture, pore proxy, wrinkle proxy — is computed in the browser and saved. The new visit appears on the patient timeline immediately."

## 2:30 — Depth area: Mandarin + consent (20s)

Toggle the language switch to 中.

> "Taiwan clinics run in Mandarin — toggle is in the header, default is zh-TW. Consent capture is per-patient on first visit, signed and dated."

Show the consent record.

## 2:50 — Closeout (10s)

> "Three rules across the prototype: capture-time gating beats post-hoc correction; landmark-anchored ROIs make small pose differences irrelevant; every suggestion is explainable down to the triggering metric. Codebase, PRD, and TDD in the linked repo."

End.
