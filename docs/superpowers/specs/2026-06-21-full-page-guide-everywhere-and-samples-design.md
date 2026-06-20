# Full Page Guide everywhere + in-box ▶ + dock v2 + built-in samples — Design Spec

**Date:** 2026-06-21 · **Author:** Kheshav (vision) + Claude (sharpened) · **Status:** ready to build (loop or attended)

> This sharpens Kheshav's spoken vision into **measurable** requirements. It deliberately separates
> **already-shipped** behaviour from the **new** work so we don't rebuild what exists.

---

## 0. What is ALREADY shipped (do NOT rebuild — verify only)

| Capability | Where | Status |
|---|---|---|
| Pause/Explore — click the dimmed area → whole page lights up & is clickable; click again / ⏸ → re-spotlight | `guideController` `pause/resume`, `overlayClickBehavior` | ✅ Phase 1 (`guide-pause-skip.spec.js`) |
| The old "click-dark → box dead → refresh" **hang** | `onDestroyStarted` now calls `destroy()` | ✅ Phase 1 (fixed) |
| Skip-to-step — tap "N of M" → type a number → jump | `popoverDecorations.makeProgressJumpable` + `jumpTo` | ✅ Phase 1 |
| Drag box to an edge → dock + minimize (re-expands on hover/focus) | `dragDock.js` (8 fixed zones) + controller | ✅ Phase 2 (`guide-drag-dock.spec.js`) |
| Header ▶ "Tour this page" → per-page deep dive with an **animated arrow** + "what it does + example" | `pageGuides.js`, `GuidePointer.jsx`, `useGuide.startPage` | ✅ Phase 3a — **Dashboard only** |

**First action of the build:** smoke-confirm the 3 shipped behaviours on the live site (`guide-pause-skip` + `guide-drag-dock` e2e already green). If any is actually broken in the browser, that is an **axis-1 correctness gap** and is fixed BEFORE any new work.

---

## 1. The new requirements (each has a measurable Done)

**R1 — ▶ "Tour this page" on EVERY route, not just home.**
- *Done:* the header ▶ renders on all 21 routes in `App.jsx`; tapping it on route X starts a page-scoped deep dive for X. Pinned by a test asserting `Object.keys(PAGE_GUIDES)` ⊇ every `APP_ROUTES` entry (so no page is left without a guide).
- *Note:* this is gated by R6 (content must exist per page). Ship page-by-page; `PAGE_GUIDE_ROUTES` grows as each page's content lands.

**R2 — In-box ▶ "play" button (YouTube-style: ⏸ pause = the existing toggle; ▶ here = "go deeper").**
- A ▶ button inside the guide popover. Tapping it — **whether you're in the whole-app Quick/Full tour OR already in a page guide** — drops you into the **Full Page Guide for the current route** (the most in-depth, per-page walk-through).
- *Done:* from a running Full tour on route X, tapping the in-box ▶ tears down the tour and starts `startPage(X)`; e2e proves the page-guide popover + arrow appear. If the current route has no page guide, the ▶ is hidden (never a dead button).

**R3 — One-line controls; never wrap (the "bloat" fix).**
- The popover's button row (Back / Next / Pause / ▶ / ⠿ drag) must stay on **one line**. When space is tight, **labels collapse to icons** — never wrap to a second line.
- *Done:* an e2e at the 390×844 mobile viewport asserts the footer's `scrollHeight` ≤ a single-row height (no wrap) on the longest step; visual check dark + light.

**R4 — Minimize-to-icons when docked.**
- When the box is docked to an edge/corner, the control **labels** ("Next →", "← Back", "⏸ Pause") hide, leaving **icons only**; it re-expands (labels return) on hover/focus AND on **double-click** (R5d).
- *Done:* e2e: after docking, the docked box contains no visible label text, only icon controls; after double-click it returns to the default centered position with labels.

**R5 — Dock v2: "drag anywhere, like a video PiP."**
- **R5a — Full-edge, no-gap margins.** The drop margins cover the **entire** length of all 4 edges + 4 corners with **no gaps** (today the edge zones are insets ~18–82%). The whole perimeter highlights as droppable so it's intuitive you can place it anywhere.
- **R5b — Drag ALONG the margin.** Once near/over an edge, the box can slide to **any position along that edge** (not just the centered snap point) and stays where dropped.
- **R5c — Corners.** Dropping in any corner docks there (keyboard parity stays edges-only; corners are pointer drag).
- **R5d — Double-click to restore.** Double-clicking the minimized/docked box expands it to its **default** centered position.
- *Done:* `dragDock.js` gains an along-edge position model (pure, unit-tested: a drop at x=10% of the top edge docks at 10%, not snapped to centre); e2e: drag to top-left → docks corner; drag along top edge → two different x positions both hold; double-click → restored.

**R6 — Per-page deep-dive CONTENT for every page (the big lift).**
- Each route gets a Full Page Guide that walks **every meaningful control** on that page with: an **arrow** to the control, a plain-English **what it does**, and a **concrete example/use-case**.
- Worked example of the standard (Kheshav's own): the **PDF reader** deep dive MUST explain **Select**, **Individual**, **Reflow** (and the other reader controls), each with an example of when to use it — none of which the main tour covers (correctly — the main tour stays short; the ▶ is exactly for this depth).
- *Done (per page):* `PAGE_GUIDES[route]` has a step per meaningful control; `pageGuides.test.js` validates shape + selector; **content hand-verified against the LIVE control** (the load-bearing no-confident-wrong rule — a wrong explanation is worse than none). Ship **one page per cycle/commit**.

**R7 — Built-in "Try a sample" on the content pages (mirror the Writing analyzer).**
- The Writing analyzer already has "New here? Try a sample" (`getWritingSample` → `writingSamples.js`). Extend the same pattern so a new user can see a page **in action immediately** — first target: the **PDF reader** gets a built-in IGCSE-style Malay reading passage sample, surfaced by its Full Page Guide ("Tap here to load a sample and watch reveal-gated reading work").
- *Done:* a `getReadingSample(lang)` data module + a "Try a sample" CTA on the PDF reader when empty; the page-guide step points at it; e2e loads the sample and asserts the reader renders it.

---

## 2. Decisions (decide-and-flag)

- **D1 — Sample content = ORIGINAL IGCSE-style passages, NOT scanned Cambridge past-papers.** Real Cambridge/0546 past-papers are **copyrighted**; bundling them into a public site is a legal risk and breaks no-paywall/clean-IP hygiene. We author **original Malay reading passages written to the IGCSE format & difficulty** (same as `writingSamples.js` uses original drafts). *Veto:* if you have license to redistribute specific papers, say so and we'll use them instead.
- **D2 — Phasing (mechanics first, content second).** Build the **mechanics** (R2 in-box ▶, R3 one-line, R4/R5 dock v2, R7 sample infra) before the **content** (R6 per-page prose), because mechanics have crisp pass/fail Done and zero content risk; content is the slow, must-verify lift shipped one page per cycle. See the plan's phase order.
- **D3 — Loop vs attended (my honest recommendation).** The **mechanical** phases (3b/dock-v2/sample-infra) are a great fit for the autonomous loop — measurable Done, no content risk. The **per-page CONTENT** (R6) the loop *can* do (its gate web-verifies Malay), but "is this the clearest explanation of this button?" is a judgment call — so **spot-check each page's deep dive on the live site as it ships** (≈15s per page). Don't let content pages ship un-glanced.
- **D4 — No `STORE_VERSION` bump** unless we add a persisted "page-guide seen" memory (out of scope here; the ▶ stays user-initiated).

---

## 3. Guardrails (carry every cycle)

- **No confident-wrong content.** Every line of page-guide prose + every sample passage is hand-verified against the live control / web authority. This is axis-1.
- **Surgical diffs**, reuse the existing engine (`startTour({tier:'page'})`), keep the heavy `pageGuides.js` content **lazy** + the eager `pageGuideRoutes.js` seam tiny (measure the index delta each cycle).
- **Don't regress Phases 1/2/3a:** `guide-pause-skip` + `guide-drag-dock` + `guide-full-page` e2e stay green.
- **Chaos/"go wild" e2e** per phase (Kheshav's standing rule): spam Next/Back, click backdrop mid-animation, drag the box off-screen, start a page guide from inside a tour, switch theme mid-guide, navigate away mid-guide — none may hang or strand the box.
- **Discovery surfaces:** every shipped piece updates README + RESUME_HERE in the same commit (GOAL.md ship contract).
```
