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
- **T2b★ — "N of M" step jumper stays in the minimized strip.** ✅ **SHIPPED 2026-06-21** (local build loop, with
  T2c★). Confirmed against live code: the `makeProgressJumpable` jumper lives in `popover.progress`
  (`.driver-popover-progress-text`), which the `.guide-docked` CSS never hides → it stays visible + tappable. Pinned
  with a regression e2e in `guide-drag-dock.spec.js`: dock → the "N of M" jumper is visible showing "1" → tap it →
  type "2" → Enter jumps to step 2 (Quick steps 1→2 share route `/`, so no nav) while the box stays docked.
- **T2c★ — Explanation/error in a SEPARATE box when minimized (sketch 1).** ✅ **SHIPPED 2026-06-21** (local build
  loop, with T2b★). **Discovery during build:** the shipped T2★'s `.guide-docked .driver-popover-description {
  display:none }` was DEAD CSS — driver.js sets an inline `display:block` on the description that overrode the
  non-`!important` rule, so the explanation always showed when docked, just as bare unstyled inline text (the T2★
  comment "description stays hidden" was wrong; browser-verified `getComputedStyle.display === 'block'`). Per the
  re-steer (explanation in a SEPARATE box, NOT hidden), removed the dead rule and styled the docked description as a
  distinct boxed card (`var(--color-card2)` bg + `1px var(--color-border)` + radius + margin-top + `max-height:30vh;
  overflow-y:auto` + 12px) — CSS-only, theme-safe. *Done:* e2e — docked → the explanation has its own border
  (`border-top-width: 1px`, RED-proofed from `0px`), is visible, and is a separate node from the icon-control footer
  (both visible).
- **Tdim★ — Minimize = FREE-ROAM (no backdrop dim); arrows + explanations STAY.** ✅ **SHIPPED 2026-06-21** (local
  build loop). The backdrop **dim/spotlight** and the box **chrome** are SEPARATE axes. Implemented by making the
  existing `guide-explore` veil-off class (previously pause-only) the SINGLE backdrop-dim switch driven by a derived
  predicate `freeRoam() = (mode==='explore') || (dockedZone != null)`: a new `syncFreeRoam()` toggles it from
  pause/resume/dock/undock/drag-float and on every step render, so minimizing turns OFF driver's dim (whole page
  interactive + scrollable, `.driver-overlay` opacity→0) while the popover + page-guide arrow stay mounted. The dim
  returns only when spotlight AND undocked. Teardown captures the driver root (driver.js puts `driver-active` on
  `<body>`) BEFORE `destroy()` and clears `guide-explore`, so a re-opened tour starts dimmed. CSS-only comment change
  (reused the existing theme-safe `.guide-explore` rules — no new color tokens). *Done:* e2e in
  `guide-drag-dock.spec.js` — minimize → `.driver-overlay` opacity `0` + `.driver-active.guide-explore` present +
  explanation visible; un-minimize → dim returns; close-while-minimized → no stale `guide-explore` on `<body>`. +2
  red-proofed unit tests via the new `handle.isFreeRoam()` (resume-while-docked keeps free-roam). `guide-pause-skip` +
  `guide-full-page` stay green (pause path unchanged).
- **Tpause★ — Pause hides chrome; behaviour SPLITS by minimized state (corrected 2026-06-21).** ✅ **SHIPPED
  2026-06-21** (local build loop). A new `guide-paused` class on the driver root (toggled by `pause()/resume()` and
  re-synced every step render, like Tdim★'s `guide-explore`) is the CSS chrome-hide switch — SEPARATE from the dim
  switch (`guide-explore` is also on for a docked-but-not-paused box, so paused needs its own class):
  - **Paused & NOT minimized →** the whole popover box hides (`.guide-paused .driver-popover:not(.guide-docked){display:none}`);
    the controller publishes `paused` to `guideState` so the eager `GuideHud` renders ONE floating **"▶ Resume tour"** pill
    (the only way back, since the box's own Resume button is hidden) — it lazy-imports the already-loaded controller chunk
    and calls the new `resumeActiveTour()` seam. Page stays un-dimmed + interactive (free-roam already lifted the veil).
  - **Paused & minimized →** only the explanation hides (`.guide-paused .guide-docked .driver-popover-title,…-description{display:none !important}`
    — `!important` beats driver's inline `display`, same as T2c★); the icon strip (header + footer) + the N/M jumper stay,
    so the docked strip's own ⏸→▶ button covers recovery (no FAB while docked).
  - Page-guide **arrows hide whenever paused** — `emitPointer()` early-returns `pointer:null` in explore mode.
  *Done:* e2e — (a) `guide-pause-skip.spec.js` updated: backdrop click → box `toBeHidden()` + Resume pill visible → pill
  click restores box + spotlight; (b) `guide-drag-dock.spec.js` +1: minimize → pause → description hidden BUT footer +
  jumper still visible + no FAB → resume → description back. +3 red-proofed unit tests (`guideState.paused` in INITIAL;
  controller publishes/clears/resets `paused`; `resumeActiveTour()` resumes; HUD renders the pill only when paused &&
  !docked). CSS theme-safe (`--color-accent`/`--color-on-bright`, FAB inside the `.light` subtree). No STORE_VERSION
  (guideState is in-memory). Eager index +0.29 kB (the FAB JSX). Guide e2e 14/14.
- **Tslide★ — Slide the minimized box ALONG the margin (R5b — pulled forward from Phase 4 T4/T5).** ✅ **SHIPPED
  2026-06-21** (local build loop). Once docked/minimized, the box can be **dropped anywhere along that edge** (not just
  the centred snap) and **holds there across Next/Back**. Pure model `alongEdgeRectForZone(zone, boxSize, viewport,
  origin, margin)` in `dragDock.js`: an EDGE slides on its long axis (cross axis pinned to the dock margin via the
  centred snap), a CORNER stays pinned, `origin==null` (keyboard dock) ⇒ centred snap, any non-finite coord ⇒ centred
  on that axis; always clamped on-screen. `guideController` captures the drop point (`pop.getBoundingClientRect()` in
  `onUp`) as `dockedOrigin`, threads it through `dock(zone, origin)` + `reapplyDock`, clears it on undock/float.
  **Two clobber bugs found + fixed during build:** (1) `dock`/`reapplyDock` measured `offsetWidth` BEFORE applying the
  docked class → the clamp used the wide floating width and every off-centre drop collapsed to one spot → reordered to
  applyDockClass-then-measure, and **removed the `max-width:0.15s` transition** (it made the shrunk width unreadable
  synchronously; already off for reduced-motion). (2) driver.js re-positions the popover to each step's spotlight
  SYNCHRONOUSLY right after `onPopoverRender`, clobbering `reapplyDock` → re-stick the dock on the next `rAF` (after
  driver's reposition); this ALSO fixes a latent shipped bug where a docked box jumped to the spotlight on every
  Next/Back. *Done:* +8 red-proofed unit tests (`dragDock.test.js` — slide x/y, clamp, corners-don't-slide, null/non-
  finite origin → centred); e2e in `guide-drag-dock.spec.js` — drop on the LEFT vs RIGHT of the top edge → two distinct
  docked x's, and the right position HOLDS byte-exact across a Back. CSS-only (no color tokens → theme-safe); in-memory
  `dockedOrigin` (no STORE_VERSION). **This satisfies Phase 4 T4+T5 — marked done below.**
- **Tresize★ — Resizable box like PowerPoint (minimized OR not).** ✅ **SHIPPED 2026-06-21** (local build loop). A
  corner grip (⤡, bottom-right) lets the user **resize** the box (width + height) by pointer-drag OR arrow keys
  (keyboard/switch parity — right/down grow, left/up shrink); the chosen size **holds across Next/Back** (re-applied
  every step render, like `reapplyDock`) and is kept in an in-memory closure var (in-session only — **no
  STORE_VERSION bump**). Pure `clampBoxSize(size, viewport, opts)` in `dragDock.js` (min 200×120, max 90% of the
  viewport, per-axis, non-finite→min, max floored at min so a tiny viewport can't invert); impure glue
  (`startResize` pointer loop + `keyboardResize` + `applyBoxSize` setting `maxWidth:none` so the chosen width wins in
  BOTH docked + floating states) in `guideController`; the decorator adds the grip + wires it (and adds it to
  `RESTORE_IGNORE` so a double-tap on the grip never yanks the box to centre). **Self-review found + fixed:**
  `restoreDefault` (double-click) now ALSO clears the resize back to the default CSS size — the one pointer way back
  from a resize. *Done:* e2e in `guide-drag-dock.spec.js` — drag the grip → box grows → advancing a step keeps the
  new size → double-click resets to default size; +7 red-proofed unit tests (`clampBoxSize` min/max/per-axis/non-
  finite/tiny-viewport/custom-fraction in `dragDock.test.js`, +4 decorator tests for the grip wiring in
  `popoverDecorations.test.js`). CSS-driven, token colours → dark + light safe; eager index byte-identical (all JS in
  the lazy guide chunk). **Phase 3b★ is now COMPLETE.**
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

- **T4 — Pure along-edge dock model.** ✅ **SHIPPED 2026-06-21 as Tslide★** (above) — `alongEdgeRectForZone` returns an arbitrary along-edge position (clamped), corners stay pinned; `dragDock.test.js` cases green.
- **T5 — Wire along-edge + full-edge zones in the UI.** ✅ **SHIPPED 2026-06-21 as Tslide★** — the controller positions the box at the dropped along-edge coordinate and holds it across Next/Back (e2e proven). _(The existing `GuideDockZones` full-edge bands already had no insets; no further zone-rendering change was needed.)_
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
  - ✅ **Increment 1 (sample foundation) SHIPPED 2026-06-21** (local build loop): `src/data/readingSamples.js` (`getReadingSample(lang)`, vetted MS/EN passages reused verbatim from `comprehensionPassages.js`) + the empty-state "New here? Try a sample." CTA (`data-guide="pdf-sample"`, dynamic-imported, reflow-only). +6 unit tests + `reading-sample.spec.js` (2/2). Done because the loaded-state controls (the guide's arrow targets) only mount after a doc loads, and a missing-anchor step hangs-then-skips → the sample is the prerequisite.
  - ✅ **Increment 2 (deep-dive GUIDE CONTENT) SHIPPED 2026-06-22** (local build loop): `/pdf-reader` entry in `pageGuides.js` (9 steps — intro + 8 anchored) + added to `PAGE_GUIDE_ROUTES` (header ▶ now lit on the reader) + 7 new `data-guide="pdf-…"` anchors on the loaded-state controls (pdf-reading / pdf-mode / pdf-translate / pdf-sentences / pdf-fulltranslation / pdf-view / pdf-replace; pdf-sample from increment 1). Opens on the sample step so the arrows resolve; conditional-only controls (Individual/Group, Sharper read, dense ease) taught in an always-mounted step's body to avoid missing-anchor hangs. +3 red-proofed unit tests + `guide-pdf-reader.spec.js` (2/2); README updated. **T9 COMPLETE.**
- ✅ **T10 — Study** (`/study`) — **SHIPPED 2026-06-22** (local build loop). `/study` entry in `pageGuides.js` (intro + 5 anchored: deck switch · the 7 modes incl. Produce · DUE/LEARNING/KNOWN · flip-and-grade FSRS rating · skip + keyboard shortcuts) + `/study` in `PAGE_GUIDE_ROUTES` + 5 `data-guide="study-…"` anchors in `Study.jsx` (active-card wrapper always-mounted). **Theater-mode gap fixed:** `/study` hides the header during a session, so a floating ▶ "Tour this page" pill (beside the Lights-On exit) keeps the deep dive reachable. +2 red-proofed unit tests (`pageGuides.test.js`) + `guide-study.spec.js` (2/2); 2 tests re-pointed off `/study`→`/grammar` (no-guide example). README updated. Gate: build 0 · 1862 unit · lint 0 · guide e2e 20/20.
- **T11 — Smart Study / Practice** (`/smart-study`, `/practice`).
  - ✅ **`/smart-study` SHIPPED 2026-06-22** (local build loop). `/smart-study` entry in `pageGuides.js` (intro + 3 anchored: Public/Mic speaking toggle · Begin Session — what one adaptive ~20-min cycle does, recognition→recall→production, leading with words owed/recently-wrong · Manual Study Mode shortcut) + `/smart-study` in `PAGE_GUIDE_ROUTES` + 3 `data-guide="smartstudy-…"` anchors in `SmartStudy.jsx`. The **config/landing screen** is the guide target — it does NOT enter theater mode (only the active `SmartSession` does), so the normal **header ▶** is the entry and the anchors mount right there (no floating pill needed, unlike /study). Every pedagogy claim grounded against `interleavedQueue.js` `buildCycle`/`buildSession`/`selectFocalCards` (no confident-wrong). +2 red-proofed unit tests (`pageGuides.test.js`) + `guide-smart-study.spec.js` (2/2). README updated. Gate: build 0 · 1864 unit · lint 0 · new e2e 2/2.
  - ✅ **`/practice` SHIPPED 2026-06-22** (local build loop). `/practice` entry in `pageGuides.js` (intro + 3 anchored: grouped-by-exam-skill layout · each tile is a one-tap launcher · the live status cues — "due"/"to fix"/"% ready"/"saved") + `/practice` in `PAGE_GUIDE_ROUTES` + 3 `data-guide="practice-…"` anchors in `Practice.jsx` (`practice-groups` first section · `practice-tile` Study tile · `practice-cue` Mistakes tile). Like `/smart-study` the hub is a **non-theater** page → the normal header ▶ is the entry; anchors sit on ALWAYS-mounted elements (the cue concept is taught in the step body, not anchored to the conditional badge, so no missing-anchor hang). Every claim grounded against `practiceSurfaces.js` + `Practice.jsx` `statusText` (no confident-wrong). +2 red-proofed unit tests (`pageGuides.test.js`) + `guide-practice.spec.js` (2/2). README updated. Gate: build 0 · 1866 unit · lint 0 · guide e2e 24/24. **T11 COMPLETE.**
- ✅ **T12 — Roleplay** (`/roleplay`) — **SHIPPED 2026-06-22** (local build loop). `/roleplay` entry in `pageGuides.js` (intro + 3 anchored: language toggle — Malay 0546 Paper 3 vs English 0500/0510 oral · Scenarios/History tabs — history keeps each session's score /6 · a scenario card — its turn/key-word badges + the two run modes, adaptive **AI Practice** (scored, uses the daily AI quota) vs offline **Static Mode** (rule-based, Malay-only)) + `/roleplay` in `PAGE_GUIDE_ROUTES` + 3 `data-guide="roleplay-…"` anchors in `Roleplay.jsx` (`roleplay-lang` toggle · `roleplay-tabs` row · `roleplay-scenario` on the first card via an `idx===0` guard). The **picker** is a non-theater page (only the active session enters theater mode) → the normal **header ▶** is the entry; all anchors sit on always-mounted elements (default tab `scenarios`, scenario list never empty → no missing-anchor hang). Content web-verified: Malay 0546 speaking = Paper 3; English oral = 0500 Component 4 / 0510 Paper 3 — "Paper 3" attributed only to the Malay exam (no confident-wrong). +2 red-proofed unit tests (`pageGuides.test.js`) + `guide-roleplay.spec.js` (2/2). README updated. Gate: build 0 · 1868 unit · lint 0 · guide e2e 6/6.
- ✅ **T13 — Grammar** (`/grammar`) — **SHIPPED 2026-06-22** (local build loop). `/grammar` entry in `pageGuides.js` (intro + 4 anchored: SRS vs Cram scheduling pill · Malay/English toggle · the skill tabs with their red due-counts · the drill card — type-or-tap answering, instant feedback + rule, every answer feeds the spaced schedule) + `/grammar` in `PAGE_GUIDE_ROUTES` + 4 `data-guide="grammar-…"` anchors in `Grammar.jsx` (`grammar-mode` pill · `grammar-lang` toggle row · `grammar-tabs` tab row · `grammar-drill` on BOTH mutually-exclusive drill branches — Malay imbuhan card + a wrapper around the English `McqDrillCard`). Grammar is a normal (non-theater) page → the header ▶ is the entry; every anchor sits on an always-mounted element (the pill/toggle/tabs render unconditionally; the default tab is `drill` so a drill card is always present at landing). Content grounded against `Grammar.jsx` (TABS_MS/TABS_EN, the SRS/Cram copy, the due-badge logic) — the one Malay example "meN- + tulis → menulis (the 't' drops)" is the exact in-app vetted drill `prefix-meN-tulis` (no new Malay authored, no confident-wrong). The two tests that used `/grammar` as their "route with NO page guide" fixture (`guideController.test.js` canGoDeeper=false + `guide-full-page.spec.js` go-deeper-absent) were re-pointed to `/settings` (last in the rollout, T25 → no future churn). +2 red-proofed unit tests (`pageGuides.test.js`) + `guide-grammar.spec.js` (2/2). README updated. Gate: build 0 · 1870 unit · lint 0 · guide e2e 12/12 (incl. re-pointed full-page 4/4) + imbuhan-interleave 7/7 (no Grammar regression).
- ✅ **T14 — Writing** (`/writing`) — **SHIPPED 2026-06-22** (local build loop). `/writing` entry in `pageGuides.js` (intro + 5 anchored: a built-in sample draft · the English/Bahasa Melayu/Templates toggle (+ Malay Paper 2/4) · one of the 21 IGCSE formats (Auto-detect + band-6 exemplar) · the composer · the Analyze button → band /6 + corrections/tips) + `/writing` in `PAGE_GUIDE_ROUTES` + 5 `data-guide="writing-…"` anchors in `Writing.jsx`; opens on the sample step (folds in Phase 5's "Try a sample"). Writing is a normal page AT LANDING (theater mode engages only while drafting) → the header ▶ is the entry. +3 red-proofed unit tests (`pageGuides.test.js`) + `guide-writing.spec.js` (2/2). README updated. Gate: build 0 · 1873 unit · lint 0 · guide e2e 8/8.
- ✅ **T15 — Comprehension** (`/comprehension`) — **SHIPPED 2026-06-22** (local build loop). `/comprehension` entry in `pageGuides.js` (intro + 2 anchored + a centered "Inside a passage" summary: the passage picker that leads with `studyLang` · the EN/MY·topic·difficulty·question-count·interest-star badges · the reading loop — read, tap a Malay word to look it up, Read-along TTS, answer the MCQs with an instant explanation + supporting quote, score, wrong answers → Mistake Journal) + `/comprehension` in `PAGE_GUIDE_ROUTES` + 2 `data-guide="comprehension-…"` anchors in `Comprehension.jsx` (`comprehension-passages` first card · `comprehension-badges` its badge row, both via an `idx === 0` guard). Comprehension is a normal (non-theater) page → the header ▶ is the entry; the picker is the landing state. The reading-screen mechanics only mount after a passage opens, so they're taught in a centered `arrow:'none'` summary step (no selector → never misses) rather than via arrows that would hit a missing node — mirroring how `/roleplay` teaches the in-session run-modes in the card body. The BYOK "Get fresh AI questions" button (gated on `isGeminiAvailable()`) was omitted to stay ADD-calm. Content grounded against `Comprehension.jsx` (Paper 1 heading, `leadByLang` ordering, the five badges, Malay-only word tap, Read-along highlight, MCQ + `referenceText`, score, `addMistake`) — no new Malay, no confident-wrong. +2 red-proofed unit tests (`pageGuides.test.js`) + `guide-comprehension.spec.js` (2/2). README updated. Gate: build 0 · 1875 unit · lint 0 · guide e2e 6/6.
- ✅ **T16 — Listening** (`/listening`) — **SHIPPED 2026-06-22** (local build loop). `/listening` entry in `pageGuides.js` (intro + 2 anchored + a centered "Inside a passage" summary: the passage picker that leads with `studyLang` · the EN/MY·difficulty·question-count badges · the hear-it loop — Play to hear it (text stays hidden), replay once slightly slower, questions unlock after one listen, MCQ instant verdict + explanation, score, "Show transcript" at the end, wrong answers → Mistake Journal) + `/listening` in `PAGE_GUIDE_ROUTES` + 2 `data-guide="listening-…"` anchors in `Listening.jsx` (`listening-passages` first card · `listening-badges` its badge row, both via an `idx === 0` guard). Listening is a normal (non-theater) page → the header ▶ is the entry; the picker is the landing state. The hear-it loop only mounts after a passage opens, so it's taught in a centered `arrow:'none'` summary step (no selector → never misses) — mirroring `/comprehension`. **Differs from Comprehension:** only 3 badges (no topic/interest-star — Listening uses `leadByLang` only, not `prioritiseByInterests`), and the unique mechanic is audio-first reveal-gating (text hidden, ≤2 plays, second slower, questions gated on `playsUsed>=1`). Content grounded against `Listening.jsx` (Paper 4 heading, `leadByLang`, `speakerHint`, the 3 badges, `MAX_PLAYS`/slower-replay, `canStartQuestions`, MCQ + explanation, score, transcript reveal, `addMistake`, TTS-gating) — no new Malay, no confident-wrong. `/listening` was already in `APP_ROUTES` + `FULL_TOUR` (route reconcile not needed). +2 red-proofed unit tests (`pageGuides.test.js`) + `guide-listening.spec.js` (2/2). README updated. Gate: build 0 · 1877 unit · lint 0 · guide e2e 8/8 (listening 2/2 + comprehension 2/2 + full-page 4/4).
- **T17 — Speaking** · **T18 — Import** · **T19 — Mistakes** · **T20 — Exam Rehearsal** · **T21 — For You** · **T22 — Word Families** · **T23 — Cikgu** · **T24 — Dictation / Cloze-Listening / Saved-cloze** · **T25 — Settings**.
- Each: arrow + what-it-does + example per meaningful control; `pageGuides.test.js` shape check; live spot-check.

**When PHASE 3c completes, R1 is satisfied** (every route has a ▶ that works). At that point also do the deferred **route reconcile** (`APP_ROUTES` 19→21 + the 2 missing `FULL_TOUR` steps for Dictation + Cloze-Listening) so the whole-app tour covers everything too.

---

## Definition of done (whole epic)
Every route has a working header ▶ + in-box ▶; controls never wrap; dock works anywhere along the perimeter + corners + double-click-restore; PDF reader (and Writing) have a "Try a sample"; all guide e2e green; README + RESUME_HERE current; zero confident-wrong content (spot-checked).
```
