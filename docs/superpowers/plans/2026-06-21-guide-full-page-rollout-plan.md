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

## PHASE 3b★ — Minimize / Pause redesign (ATTENDED RE-STEER 2026-06-21, HIGHEST priority)

> Kheshav reviewed the shipped guide live (sketches in the 2026-06-21 session). The shipped T2 **hover-expand is
> wrong**; this phase revises R4 and adds a real minimized vs paused distinction. **Mechanical, crisp pass/fail —
> loop-safe.** Build top-down; ship T6 (double-click-restore) WITH T2★ or the minimized box becomes unrecoverable.

- **T2★ — Persistent icon-margin, NO hover-expand (revises + supersedes T2's `:hover` restore).** ✅ **SHIPPED
  2026-06-21** (local build loop, with T6). When docked/minimized, controls are **icon-only** and stay that way on
  hover/focus. Removed the `.guide-docked .guide-btn-label` + box-width + description `:hover/:focus-within`
  re-expand (kept the `display:none`); the docked footer tightened to a no-gap pill (`justify-content:flex-end`,
  nav-btns `gap:0` + `button+button margin-left:0`). CSS-only (no color tokens → dark+light safe). *Done:* e2e
  `guide-drag-dock.spec.js` — dock → hover → labels **still hidden** (`.guide-btn-label:visible` count 0), icons
  present, Next reachable by name. Eager index byte-identical (478.05 kB stash-verified).
- **T2b★ — "N of M" step jumper stays in the minimized strip.** The Phase-1 `makeProgressJumpable` "16/22" control
  remains **visible + tappable** in the minimized box (type a number → jump steps). *Done:* e2e — minimized box
  contains the N/M jumper; tapping it + typing a number jumps the step while still minimized.
- **T2c★ — Explanation/error in a SEPARATE box when minimized (sketch 1).** When minimized, the step
  explanation/error text renders in a **distinct element outside** the icon strip (not crammed into the margin
  pill). *Done:* e2e — minimized → the explanation text node is separate from the icon-control node; both visible.
- **Tpause★ — Pause HIDES the guide chrome.** When paused (the existing ⏸/explore toggle), the popover box + icons +
  explanation **hide** (so the page is fully unobstructed) while the page stays interactive (click-to-explore is
  unchanged); resume restores the box. *Done:* e2e — pause → guide box not visible AND page still clickable →
  resume → box returns. **Flag:** this EXTENDS shipped explore-mode (today the box stays); confirm the reconciliation
  reads right live. Keep `guide-pause-skip.spec.js` green (or update it to the new hide-on-pause expectation).
- **T6 (pulled forward) — Double-click to restore (R5d).** ✅ **SHIPPED 2026-06-21** (local build loop, with T2★).
  Double-clicking the minimized/docked box returns it to the default position (undock + clear inline left/top/right/
  bottom + `data-guide-dragged` + labels back via the `.guide-docked` class removal). Controller `restoreDefault()`
  (exposed on the handle, passed to the decorator as `onRestore`); the decorator wires ONE idempotent `dblclick` on
  the popover wrapper that ignores action controls (`RESTORE_IGNORE` — Next/Back/Done/Pause/▶/N-of-M jumper) so a
  fast double-tap on a button never also yanks the box to centre. **Required by T2★** (hover no longer restores).
  *Done:* e2e — dock, double-click the title, box undocked + labels back. +6 red-proofed unit tests.

**After 3b★ → go straight to Phase 3c (per-page CONTENT), PDF reader FIRST** (Kheshav's #1 ask: every page needs a
deep dive; PDF reader's Select/Individual/Reflow/Group are the most confusing for new users). Dock-v2 (Phase 4 T4/T5)
and samples (Phase 5) come after the content rollout. **The animated arrow is DEFERRED** (Kheshav: not important now).

---

## PHASE 3b — in-box ▶ + one-line/minimize controls (mechanics, no content risk)

- **T1 — One-line controls, never wrap (R3).** ⏸ **DEFERRED — not a red-provable gap today (browser-measured 2026-06-21).** A 390×844 probe of the live undocked footer showed it does NOT wrap or overflow with the 4 current controls (footer `scrollH==clientH==46`; nav `scrollW==clientW==226` inside a 318px popover). Because **T3 placed the new ▶ in the HEADER row (not the footer)**, the footer still carries only 4 controls → R3's wrap never materialises. T1 becomes relevant only when something actually crowds the footer (e.g. a future control there, or the docked 220px box — which is **T2**'s job). Pick it up then with real evidence; don't ship churn CSS against a non-wrapping footer.
- **T2 — Minimize-to-icons when docked (R4).** ✅ SHIPPED 2026-06-21 — ⚠️ **the hover/`:focus-within` re-expand is NOW SUPERSEDED by `T2★` above** (Kheshav wants persistent icons, no hover-expand). The icon-collapse + `splitButtonIconLabel` plumbing is REUSED by T2★; only the re-expand-on-hover is being removed. When `guide-docked`, the footer control **labels** collapse so only the icons show (←  →  ⏸  ✓); they return on hover/`:focus-within` (alongside the box re-expanding). The decorator's new pure `splitButtonIconLabel` (exported) splits each footer button's `"icon + word"` text into a `.guide-btn-ico` + `.guide-btn-label` span (order-preserved; the gap-space lives inside the label so it hides cleanly) and sets `aria-label`=word on the icon-only nav buttons (never clobbering the Pause button's richer label) — so screen readers keep a name and the `getByRole('button',{name:/Next/i})` e2e still resolves while docked. `splitFooterLabels` runs every `decoratePopover`; the controller re-runs `splitButtonIconLabel` after `updatePauseButton` resets the text (so a pause toggle *while docked* stays icon-only). CSS-only minimize (no color tokens → dark+light safe); pure-icon buttons (×) left alone. Hover/focus re-expand only — **double-click-restore is T6** (Phase 4, clamped out). +7 red-proofed unit tests + 1 e2e (pointer-dock → labels hidden / icons visible / Next reachable by name → hover restores). *Done:* e2e green — docked box shows icons only, no visible label text. Byte-neutral on the eager index (all changes lazy/CSS).
- **T3 — In-box ▶ "go deeper" button (R2).** ✅ **SHIPPED 2026-06-21** (local build loop). ▶ button added in `popoverDecorations.syncGoDeeper` inside a new `.guide-header-controls` header row beside the ⠿ grip (NOT the footer — keeps the footer un-crowded, sidesteps T1). Controller `goDeeper()` tears down the tour then `startPage(currentRoute)` on a microtask; `canGoDeeper()` gates visibility on `PAGE_GUIDE_ROUTES.includes(currentRoute)` (hidden when no page guide). `useGuide` wires `onGoDeeper → startPage` via a ref (no dep cycle). +10 red-proofed unit tests + 3 e2e (present/tap-tears-down-and-fires, absent on a no-guide route, real useGuide re-entry). Works from Quick/Full tour AND a page guide. **Gotcha handled:** `destroy()` → `Promise.resolve().then(startPage)` so the old driver is gone first.

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
