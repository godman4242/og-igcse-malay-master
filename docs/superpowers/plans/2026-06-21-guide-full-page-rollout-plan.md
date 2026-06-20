# Full Page Guide rollout — phased plan (loop- or session-executable)

> Spec: `docs/superpowers/specs/2026-06-21-full-page-guide-everywhere-and-samples-design.md`.
> **Build order = top-down.** Each task is ONE bounded, gate-green, measurable commit. Every task:
> **(a)** red-proof new tests (watch them fail first), **(b)** add/extend a "go wild" chaos e2e,
> **(c)** keep `guide-pause-skip` + `guide-drag-dock` + `guide-full-page` e2e green, **(d)** update
> README + RESUME_HERE in the same commit. Reuse the existing engine (`startTour({tier:'page'})`),
> keep `pageGuides.js` lazy + `pageGuideRoutes.js` eager-tiny (measure the index delta each task).

## Pre-flight (Task 0 — do once, first cycle)
- **Smoke-verify the 3 shipped behaviours live** (pause, skip-to-step, drag-dock). If any actually hangs/strands in the browser → that is an **axis-1 correctness gap**; fix it (red-proof a regression test) BEFORE new work. Else proceed. (`guide-pause-skip` + `guide-drag-dock` are already green — this is the browser-eye confirmation.)

---

## PHASE 3b — in-box ▶ + one-line/minimize controls (mechanics, no content risk)

- **T1 — One-line controls, never wrap (R3).** Make the popover footer a single non-wrapping row; collapse labels to icons when tight (CSS `flex-wrap:nowrap` + a width-aware label-hide; the buttons already exist in `popoverDecorations.js` + driver's Back/Next). *Done:* 390×844 e2e asserts the footer doesn't wrap on the longest step (one row); dark+light visual. Cheapest task → do it first.
- **T2 — Minimize-to-icons when docked (R4).** When `guide-docked`, hide the control **labels** (keep icons); already hides the description. Re-expand labels on hover/focus. *Done:* e2e — docked box shows icons only, no label text.
- **T3 — In-box ▶ "go deeper" button (R2).** Add a ▶ button to the popover (via `popoverDecorations` or the controller's `onPopoverRender`) that calls a new `useGuide`/controller hook to **tear down the current tour and `startPage(currentRoute)`**. Hidden when the route has no page guide (`PAGE_GUIDE_ROUTES.includes(route)`). Works from Quick/Full tour AND from a page guide. *Done:* e2e — start Full tour, tap ▶, page-guide popover+arrow appear for that route; ▶ absent on a route with no guide. **Gotcha:** restarting a tour from inside its own teardown — sequence `destroy()` → `startPage()` on a microtask so the old driver is gone first.

## PHASE 4 — Dock v2: drag anywhere (R5)

- **T4 — Pure along-edge dock model.** Extend `dragDock.js`: given a drop point on/near an edge, return an **arbitrary position along that edge** (clamped), not one of 8 snaps; full-edge + corner hit regions with **no gaps** (R5a/R5b/R5c). Pure, unit-tested (drop at 10% of top edge → docks at 10%). *Done:* `dragDock.test.js` new cases green; Malay/UX-neutral.
- **T5 — Wire along-edge + full-edge zones in the UI.** `GuideDockZones.jsx` renders continuous full-edge margins (no insets); controller positions the box at the dropped along-edge coordinate and keeps it there across Next/Back. *Done:* e2e — drag along top edge to two x positions, both hold; corner drop docks corner.
- **T6 — Double-click to restore (R5d).** Double-clicking the docked/minimized box returns it to the default centered position (undock + clear inline left/top). *Done:* e2e — dock, double-click, box centered with labels back.

## PHASE 5 — Built-in samples (R7)

- **T7 — Reading-sample data + CTA (mirror Writing).** New `src/data/readingSamples.js` (`getReadingSample(lang)`) with **original IGCSE-format Malay (and English) reading passages** (D1 — NOT copyrighted past-papers; web-verify the Malay is correct, natural, exam-appropriate). PDF reader shows a "New here? Try a sample" CTA when empty (mirror `Writing.jsx:105-125`). *Done:* e2e loads the sample → reader renders reveal-gated text; unit test on the data shape.
- **T8 — Generalize the sample CTA** to other content pages that lack one (Comprehension/Listening already have passages; target the ones a new user lands on blank). *Done:* per-page CTA + e2e.

## PHASE 3c — per-page deep-dive CONTENT rollout (the big lift — ONE page per commit)

> This is content; **hand-verify every line against the live control** (axis-1, no confident-wrong).
> The loop CAN do this (its gate web-verifies Malay) but **Kheshav spot-checks each page live as it ships** (D3).
> Author the same shape as the shipped Dashboard guide in `pageGuides.js`; add the route to `PAGE_GUIDE_ROUTES`.

Ship in this priority order (most-used / most-confusing first), one per cycle:
- **T9 — PDF reader** (`/pdf-reader`) — explain **Select / Individual / Reflow** + tap-to-reveal gloss, dense-page ease, sentence-reveal, full-doc translate, OCR/audio import, "Try a sample" (T7). This is Kheshav's worked example of the depth bar.
- **T10 — Study** (`/study`) — the 7 modes incl. Produce, FSRS rating buttons, deck switch.
- **T11 — Smart Study / Practice** (`/smart-study`, `/practice`).
- **T12 — Roleplay** · **T13 — Grammar** · **T14 — Writing** (+ its sample) · **T15 — Comprehension** · **T16 — Listening** · **T17 — Speaking** · **T18 — Import** · **T19 — Mistakes** · **T20 — Exam Rehearsal** · **T21 — For You** · **T22 — Word Families** · **T23 — Cikgu** · **T24 — Dictation / Cloze-Listening / Saved-cloze** · **T25 — Settings**.
- Each: arrow + what-it-does + example per meaningful control; `pageGuides.test.js` shape check; live spot-check.

**When PHASE 3c completes, R1 is satisfied** (every route has a ▶ that works). At that point also do the deferred **route reconcile** (`APP_ROUTES` 19→21 + the 2 missing `FULL_TOUR` steps for Dictation + Cloze-Listening) so the whole-app tour covers everything too.

---

## Definition of done (whole epic)
Every route has a working header ▶ + in-box ▶; controls never wrap; dock works anywhere along the perimeter + corners + double-click-restore; PDF reader (and Writing) have a "Try a sample"; all guide e2e green; README + RESUME_HERE current; zero confident-wrong content (spot-checked).
```
