# 🎯 Build-loop GOAL — the north-star the autonomous loop optimizes

> **This file IS the loop's intent.** Every cycle (`scripts/build-loop.sh` → each fresh process reads
> `docs/LOCAL_BUILD_LOOP.md`) reads THIS first and works toward the goal below.
> **To re-steer the loop, edit THIS file** — change the north-star or the axes and the next fresh cycle
> obeys it. No code change needed. Keep it tight and scannable (it is read every cycle).

## North-star

Make **IGCSE Malay Master** the best possible IGCSE **Malay (0546)** + **English (0500 / 0510)**
revision website — measured by how much it actually improves a student's exam outcome per minute spent.
**Keep improving until no axis below has a real, evidenced gap left.** "Best" = the axes below, **not
vibes**.

## 🎯 Current DIRECTED epic (Kheshav-approved 2026-06-21 — overrides axis-3 gap discovery)

The in-app guide's **Full Page Guide** is the directed UX/friction (axis-3) work right now:
- **Spec:** `docs/superpowers/specs/2026-06-21-full-page-guide-everywhere-and-samples-design.md`
- **Plan (build top-down, ONE task per cycle):** `docs/superpowers/plans/2026-06-21-guide-full-page-rollout-plan.md`

**Rule:** a real **axis-1 (correctness / confident-wrong content)** or **axis-2 (pedagogy)** gap STILL wins if one
clears the bar (do that first). Otherwise, the top axis-3 gap = **the next unchecked task in that plan**, built to
its measurable Done.

> **🎯 ATTENDED RE-STEER (2026-06-21, Kheshav awake + at the keyboard — SUPERSEDES the overnight clamp;
> progress refreshed 2026-06-21 PM):** Kheshav reviewed the shipped guide live and re-prioritized. The clamp is
> **LIFTED**. Build top-down, one bounded gate-green commit per cycle, to each task's measurable Done in the plan.
>
> 1. **✅ COMPLETE — Minimize / Pause / Resize redesign (`Phase 3b★`).** All shipped 2026-06-21 (verify in the plan
>    doc + `RESUME_HERE.md`, do NOT re-build): icon-pill + no-hover-expand + double-click-restore (T2★/T6); Minimized
>    = FREE-ROAM — the spotlight dim lifts, arrows + explanations stay, the explanation sits in its own box, the
>    "N of M" jumper stays (Tdim★/T2b★/T2c★); Paused & NOT minimized hides EVERYTHING + a floating Resume pill;
>    Paused WHILE minimized hides arrows/explanations only, keeps the icon strip + jumper (Tpause★); slide the
>    minimized box ALONG the margin (Tslide★); PowerPoint-style resizable box, size holds across Next/Back (Tresize★).
>    The backdrop **DIM** and the box **CHROME** are now separate axes — the redesign's key insight. **Nothing left here.**
> 2. **◀ ACTIVE NOW — ▶ "Tour this page" deep-dive CONTENT on EVERY route (R1 + R6 = Phase 3c) — Kheshav's #1 GOAL:**
>    every page (PDF reader, Import, Saved words, Cikgu Maya … ALL of them) teaches its own mechanics so a student
>    learns the whole site inside-out, fast, whenever they want. Each page's deep dive MUST give, per meaningful
>    control: **(a)** what it does, **(b)** a concrete **use-case / example**, and **(c)** a **"try it with a sample"**
>    wherever the page supports practice — mirror the Writing analyzer's sample-text button so students test the
>    mechanics live. **Fold the samples (R7 / Phase 5) INTO this per-page rollout** — ship each page's sample WITH
>    its deep dive, not as a deferred phase. ONE page per commit, every line hand-verified against the LIVE control
>    (no confident-wrong). **The PDF reader is Kheshav's worked example and goes FIRST** (Select / Individual /
>    Reflow / Group-select); its "Try a sample" foundation already shipped as **T9·1 (commit `5a00661`)** — so the
>    next cycles continue the PDF-reader deep-dive content, then the plan's priority order (T10 Study, T11
>    Smart-Study, …).
> 3. Then resume **dock-v2 (Phase 4)** + any remaining **samples (Phase 5)**.
>
> **DEFERRED — do NOT spend cycles on it:** the animated arrow ("not important right now" — Kheshav 2026-06-21).
> Per-page content (3c) still ships **one page per commit** and Kheshav **spot-checks each live** as it lands (D3).
> The Malay/English in every page-guide line is web-verified before shipping (axis-1).

## 📋 Backlog — Kheshav-requested epics not yet built (the loop's queue AFTER the directed epic)

> Captured 2026-06-21 from the curated record (specs/plans + `RESUME_HERE.md` + `~/.claude` memory) so the loop
> has a real backlog, not just ad-hoc gap discovery. **Precedence:** (1) any fresh **axis-1/axis-2** gap that clears
> the bar — always first; (2) the **Current DIRECTED epic** above until complete; (3) THEN the **loop-safe queue**
> below, top-down, ONE bounded gate-green commit per cycle, each built to its spec's measurable Done; (4) the
> **needs-Kheshav** list is NEVER solo-built. The anti-hallucination gate (measurable Done + web-verified content)
> still applies to every item.

### ✅ Loop-safe queue (bounded · clear "best" · no product / UX / architecture judgment)
0. **⚠️ AXIS-1 FIRST — confirmed adversarial-review defects (2026-07-03).** 16 CONFIRMED bugs incl.
   a P0 (valid Malay "mengikuti" flagged as HIGH misspelling) — queue + evidence + fix order in
   `docs/reviews/2026-07-03-adversarial-codebase-review.md`. **Loop-safe subset:** the grader map
   fixes (#1–6) + dailyPlan (#8–9) + translate cache (#13) + SSE buffer (#14) + audio cap (#16) —
   each bounded, TDD-able, content web-verifiable. **NOT loop-safe:** #10/#11 (sync — needs the
   cross-device test + attended care), #15 (share-link — product decision). This outranks
   everything below until cleared.
1. **ASR off the main thread → Web Worker** (perf). Audio transcription runs on the main thread (Phase 1); the spec
   names a Worker as the #1 follow-up. *Done:* runs in a Worker, main thread non-blocked, `audio-transcribe.spec.js`
   still green. — spec `docs/superpowers/specs/2026-06-13-multimodal-audio-transcribe-design.md`
2. **Academic-English seed — AWL Sublists 2 & 3** (content). Mirror the shipped Sublist-1 `src/data/academicEn.js`;
   **web-verify every DBP gloss + IGCSE example**. *Done:* new lazy chunks seeded into the 'Academic English' deck,
   canonical-list tests pin them. — spec `docs/superpowers/specs/2026-06-14-true-english-study-mode-design.md`
3. **Quality-debt #2 — AI-tier eval** (tooling). Land the keyed-BYOK comparison + confirm the thin Gemini-Cikgu
   prompt holds syllabus parity with the free expert KB. *Done:* `scripts/ai-tier-eval` reports the comparison;
   parity test green. — `~/.claude` memory: quality-debt ledger #2
   - *(Adjacent — the writing over-praise surface of this eval SHIPPED 2026-06-25 as the task-aware-writing
     ship-gate: `EVAL_SURFACE=content`, 10/10 within ceiling, 0% over-praise — see
     `docs/research/ai-tier-eval-results/2026-06-25-task-aware-content-over-praise.md`.)* **Two optional,
     non-blocking follow-ups (loop-safe, run when quota allows):** (a) an **N=3 robustness pass**
     (`EVAL_N=3`) to confirm the one at-ceiling essay `g-phones-partial-norule` stays ≤ 4 across draws; (b) a
     **`gemini-3.5-flash` production confirmation** of the over-praise gate (the v1 gate ran on the
     `gemini-2.5-flash` free proxy with thinking off — a strong lower bound, not the prod model). *Done:* each
     re-runs the existing `content` surface and records the result alongside the 2026-06-25 doc.
   - *(Malay mirror — the **Malay 0546** task-aware Content trait was BUILT 2026-06-28 (automated gate green; commit
     held for its own ship gate). Loop-safe follow-ups, run when quota allows: (a) the **Malay over-praise gate** at
     `EVAL_LANG=malay EVAL_SURFACE=content` — `N=1` is the free-quota smoke (≥9/10), `N=3` the robustness pass; (b) a
     `gemini-3.5-flash` production confirmation of the Malay gate. (c) **Malay AI-improvement harvest** — make
     `harvestAIImprovements` (in `src/lib/writingMistakeHarvest.js`, currently hardcoded `language:'en'`)
     language-aware so Malay writing tips feed the Malay mistake journal correctly; currently skipped for Malay to
     avoid mis-filing. (d) **`AddKeyNudge` Malay copy** — its surface text is English; localize for `studyLang==='ms'`.
     All bounded, clear best answer. — RESUME_HERE "IN PROGRESS (2026-06-28)".)*
4. ~~**Structural guard — a doc-less source can NEVER render the Layout view**~~ — **✅ RESOLVED 2026-06-23 (local
   build loop).** New pure `src/lib/readerView.js` `effectiveReaderView(view, hasDoc)` (returns `'layout'` only when
   Layout is selected AND a doc exists) is computed once in `PDFReader` as `viewSafe = effectiveReaderView(view,
   !!pdfDoc)`; every render decision reads `viewSafe`, so the `view==='layout'` Layout branch is structurally
   unreachable without a live `pdfDoc` — even if a future doc-less producer forgets `setView('reflow')`. The 3
   band-aids stay as belt-and-suspenders. RED→GREEN unit test `readerView.test.js` (4 cases) + e2e regression pin
   `reading-sample.spec.js` ("doc-less sample stays in Reflow even when the Layout pref is on"). When a doc IS present
   `viewSafe===view` exactly → Layout-PDF path unchanged.
5. ~~**Page-tour empty-state hang audit across ALL page-guide routes**~~ — **✅ RESOLVED 2026-06-23 (local build
   loop; finished + committed in an attended session 2026-06-23).** New parametrized e2e
   `tests/e2e/guide-empty-state-chaos.spec.js` iterates `Object.keys(PAGE_GUIDES)` (imports the source list so it
   can't drift): Part 1 asserts every anchored step's target EXISTS on the genuine empty/first-visit landing (the
   deterministic root-cause guard → zero 800ms stalls, zero silent skips), Part 2 launches the header ▶ and walks to a
   clean Done under a 15s bound (never hangs / dead-ends). The audit caught TWO live offenders — **`/study`** (whole
   page is the `<EmptyState>` when `!sorted.length`, `Study.jsx:48`, so all 5 `study-*` anchors were absent → ~4s hang
   teaching nothing; the old `guide-study.spec.js` masked it by *seeding cards*) and **`/`** (the Dashboard
   Mistake-Journal tile is `{showLoop && …}`, `Dashboard.jsx:748`, hidden until something is caught/drilled). Fix:
   convert the empty-state-unsafe anchored steps to centered `arrow:'none'` cards (render in ANY state, mirrors
   `/mistakes` + `/saved-cloze` + the `/writing`-sample precedent) — `/study` is now entirely centered; `/`'s
   Mistake-Journal step alone (its 3 ungated anchors keep their arrows). RED→GREEN proven; all 21 routes pass 21/21.
   — `tests/e2e/guide-empty-state-chaos.spec.js`, `src/lib/guide/pageGuides.js`.
6. ~~**Extend the Next re-entrancy guard to Prev + jump-to-step**~~ — **✅ RESOLVED 2026-06-23 (local build loop).**
   The Bug-B `advancing` guard covered only `handleNext`; `handlePrev` and `jumpTo` each `await resolve()` (async — it
   awaits `navigate()` + the step-wait) then `landOn()` with no guard, so a rapid Back↔Back / Next↔Back / double jumper
   tap raced two `landOn`s. **Fix:** `advancing` is now SHARED across all three nav handlers — each early-returns while
   it is set, sets it `true`, and resets in a `finally` (`jumpTo` validates its range BEFORE engaging the flag so an
   invalid jump stays a pure no-op). While ANY nav is in flight, every other is a no-op → at most one advance lands.
   RED→GREEN: 3 new `guideController.test.js` cases (double-Back, double-jumpTo, cross-handler Next+jump) RED-confirmed
   (`expected 2 to be 1`) then GREEN; e2e `user-guide`/`first-run-tour`/`guide-pause-skip`/`guide-full-page` 23/23.
   — `src/lib/guide/guideController.js` (`handleNext`/`handlePrev`/`jumpTo`).
7. ~~**`guide-drag-dock` Tslide★ pointer-drag e2e is RED on clean `main`**~~ — **✅ RESOLVED 2026-06-23 (local build
   loop). It was a REAL product bug, not a flaky assertion.** Root-caused live (instrumented run): `dock()`/`reapplyDock()`
   compute the correct along-edge `left` (12 for a left drop, 128 for a right drop) and call `positionBox`, but **driver.js
   re-writes the popover's inline `left`/`top` (NORMAL priority) to its own CENTRED placement on every step render, AFTER
   our reapply raf** — so the off-centre drop snapped back to the edge centre (70px) across Next/Back whenever driver won
   the raf timing race ("environment-sensitive" = that race). **Fix:** `positionBox` now ALSO publishes the position as CSS
   custom props `--guide-dock-left`/`--guide-dock-top`, and `.guide-docked` (index.css) pins `left`/`top` from them with
   `!important` — important-author beats driver's normal-inline, so the dock holds deterministically regardless of raf order.
   The existing e2e pins it (now passes **3× in a row**); all 11 `guide-drag-dock` tests + full-page/pdf-chaos/first-run
   green. This also closes the directed epic's "all guide e2e green" Definition of Done.
8. **CLOSE THE E2E-ROT GAP (loop-process / axis-1 "improve the loop").** *Evidence (real):* the full e2e suite was
   **CI-RED on every push 2026-06-23** (5 consecutive `gh run list` failures) from THREE stale specs that lagged
   shipped behavior — `mistake-promotion.spec.js` (v34 English vocab promotion), `generative-cloze.spec.js` (the
   FeedbackLive a11y region), `pdf-layout.spec.js` (P2-C8 clear-on-switch). They survived for many cycles because the
   build-loop gate is build/unit/lint only; e2e runs ONLY in CI, which just emails — and **Vercel auto-deploys
   regardless of CI**, so red never blocks. The 3 were repaired in an attended session (commit `24cb8c9`). *Done
   (loop-process):* each cycle that changes app behavior or a `tests/e2e/*` file MUST, before committing, EITHER run
   the e2e spec(s) covering the touched area (the local loop runs on Kheshav's machine and CAN run Playwright, unlike
   the network-blocked cloud routines) OR run `gh run list --workflow=ci.yml --limit 1` and treat a red latest run as
   a top axis-1 gap to fix FIRST. Encode the chosen rule in `docs/LOCAL_BUILD_LOOP.md`. *Measurable:* `npm run
   test:e2e` is 0-fail on `main`, and stays 0-fail because the loop won't ship a UI/e2e change without proving the
   affected specs green.
9. **Test-rigor infra — automated a11y audit + CI per-route size budget** (axis-3/axis-4; the suite is chromium-only
   + has no axe coverage and no enforced chunk budget — found 2026-06-23). *Done:* (a) an `axe-core`/`@axe-core/playwright`
   sweep over all 21 routes asserts **0 serious/critical** violations (today only tap-targets are pinned); (b) a CI
   step **fails** if any per-route PAGE chunk exceeds the **70 KB raw** budget (CLAUDE.md Verification §1), with the
   two documented exceptions (`PDFReader`, `CikguBot`) allow-listed. Both are bounded, no product judgment.
10. **Micro-guide UDL rewrite — roll out to the remaining 20 routes** (axis-3, ADD/UDL; Kheshav-requested
    2026-06-24). Page-tour steps are too long. Style spec + measurable rules + the `/study` pilot already
    shipped (commit `d5e8246`). *Done (per route, ONE page per commit):* every step `body` ≤~14 words,
    action/benefit-first, NO separate `example:` line (fold a ≤5-word cue inline only where a control isn't
    self-evident), ≤5 steps, empty-state-safe kept; that route's `guide-*.spec.js` titles/count updated +
    `pageGuides.test.js`; `guide-empty-state-chaos` adapts automatically. — spec
    `docs/superpowers/specs/2026-06-24-micro-guide-udl-style.md`.
11. ~~**Tour progress → DOTS, not "{{current}} of {{total}}"**~~ — **✅ SHIPPED (attended 2026-06-24).**
    `popoverDecorations.makeProgressJumpable` now renders **dots** (● done/current, ○ remaining; each a
    `<button>` → `onJump(i)`, direct jump-to-step) when `total ≤ 7`, and a slim proportional **bar** (tap →
    the same number input → jump preserved) when `total > 7`. Visible "N of M" is GONE; the step number lives
    in `aria-label` only. New `.guide-dot`/`.guide-progress-bar` CSS; docked dots shrink + docked footer wraps
    (7 dots fit the 220px pill). TDD: +12 unit tests (`popoverDecorations.test.js`, 40 pass); e2e
    `guide-drag-dock` (T2b★/Tpause★) + `guide-pause-skip` rewritten to dots. **Two kickoff over-lists corrected
    (grounded):** `guideController.test.js` needed NO change (it mocks `decoratePopover`; wiring unchanged), and
    `guide-pdf-reader`/`guide-pdf-chaos` had NO jumper assertions (only "7 of 10" in comments; they're bar-mode,
    nav via Next/Done). Gate green; 93/94 guide e2e pass (1 pre-existing offline flake, GOAL #8/#9).

12. **PWA auto-update reliability — returning users may be stuck on a STALE build** (axis-1; found 2026-06-24:
    Kheshav repeatedly saw old prod after a fresh deploy). The SW uses `registerType: autoUpdate` +
    skipWaiting + clientsClaim + a `needRefresh` toast (`vite.config.js`, `src/main.jsx` `useRegisterSW`). If
    the update toast isn't firing/applying, EVERY shipped fix + feature fails to reach real students — the worst
    silent failure for a learning tool. *Done:* a reproducible check (e.g. a Playwright test that loads an old
    build, deploys a new asset hash, and asserts the client picks it up within one reload OR the refresh toast
    appears and applying it updates) + the fix if it's broken; document the user-facing "how to force-update"
    step. Bounded, no product judgment. — `vite.config.js`, `src/main.jsx`.

13. **Writing: clear the grade when the task dropdown changes** (axis-1 robustness; found 2026-06-27 during the
    act-on-feedback Stage-1 build). `Writing.jsx`'s `setSelectedTaskId` handler does NOT reset `results`, so
    switching tasks *after* an analyze (before re-analyzing) renders the **previous** task's `results.aiGrade`
    against the **new** `selectedTask` — both `ContentTraitPanel` (pre-existing) and the new `ReattemptPanel` then
    show a stale/mismatched requirement coverage until you re-analyze. **Fix:** reset results on task change,
    mirroring `onFormatChange` (which already clears `selectedTaskId`). Narrow + self-correcting today, but the
    re-attempt panel makes it more visible. *Done:* a render/e2e test that selecting a different task after a grade
    clears the Content + re-attempt panels until the next Analyze. Bounded, no product judgment. — `src/pages/Writing.jsx`.

### 🔶 Needs Kheshav first — SPEC or DECIDE before any build (loop must NOT solo-build)

> **🌟 VISION EPICS (added 2026-07-03 from the expanded north-star — full critique + phased plan in
> `docs/superpowers/specs/2026-07-03-optimal-learning-environment-vision.md`).** Each needs its own
> spec+plan before code; listed here in the recommended order (quality-precondition first). None are
> loop-safe yet — they are product-shaping.
> 1. **Weak-model grading harness (flagship, budget-aware)** — decomposition + JSON + 2-sample +
>    evidence-quote behind `instruct.js`; depth is a setting; **gate on `scripts/ai-tier-eval` beating
>    the single-call baseline** (evidence: MTS QWK 0.205→0.560; research doc
>    `docs/research/2026-07-03-focus-audio-weak-model-grading.md`). Best Fable-5-window build.
> 2. **Customizable home / "study spaces" (Zen-like personalization)** — pin/reorder/hide + named
>    spaces; sensible defaults, capped knobs; STORE_VERSION bump + migration. UDL autonomy; ADD-first.
> 3. **Focus toolkit** — Web Audio self-synthesized white/pink/brown noise + study timer; honest
>    hedged copy (noise g=0.249 ADHD / −0.212 non-ADHD; **brain.fm cannot be embedded — verified**);
>    synthesized-only, no third-party tracks.
> 4. **Past-paper study, reframed** — link official specimen papers into the reader + AI-generate
>    practice Qs from any imported passage + grow the original-passage bank (never embed real papers).
> 5. **Cikgu Maya verification upgrade** — decompose-and-verify → confidence-gate self-check; gate on
>    fewer confident-wrong tutor answers vs baseline.
> 6. **`subject` seam (architecture-readiness, ongoing)** — refactor language-specific assumptions
>    behind a subject abstraction AS adjacent work touches them; gates the eventual 3rd subject. NOT a
>    near-term content push — "language done brilliantly" comes first.

- **Task-aware Writing — Malay 0546 increment (the named fast-follow to the shipped English v1).** The
  English Content / task-fulfilment axis SHIPPED 2026-06-25 (`feat/task-aware-writing-en`; ship-gate eval
  passed 10/10, over-praise 0% — `docs/research/ai-tier-eval-results/2026-06-25-task-aware-content-over-praise.md`).
  The Malay version needs its OWN authored content — a **Malay examiner Content prompt**, **authored Malay
  tasks** (mirror `src/data/writingTasks.js`), and a **Malay over-praise gold set** (mirror
  `scripts/ai-tier-eval/goldWritingTasksEn.mjs`) — all of which need Kheshav's pedagogy/content review, so
  it is NOT loop-safe to solo-build. Ship the three together as one increment, then run its own over-praise
  gate before turning the Malay Content trait ON. The built-in sample WORKS (verified live + local
  2026-06-23: loads 110 MS / 211 EN tokens, no blank). Kheshav wants a *real* recent IGCSE paper too. **DECIDED +
  flagged (copyright invariant):** do NOT embed real past-paper text into the app (Cambridge copyright → takedown/legal
  risk on the public site) — that call is made. The OPEN decision is the safe alternative: (a) a copyright-safe LINK to
  free **official Cambridge specimen papers** ("download & drop it into the reader") — needs Kheshav to accept the
  link-target + link-rot maintenance; or (b) author 1–2 MORE original IGCSE-format sample passages (in-our-control,
  durable, web-verified) to enrich `src/data/readingSamples.js`. Pick (a) and/or (b). Cross-browser e2e (add a
  webkit / mobile-Safari project — chromium-only today) is the adjacent infra decision (can be noisy → decide scope).
- **Act-on-feedback loop (Writing) — Stage 1 ✅ SHIPPED 2026-06-27 (attended); Stage 2 GATED + an outstanding eval.**
  Stage 1 closed the loop on the English Content grader: an "Improve your answer" re-attempt (specific missed
  requirements + authored how-to-fix hints), durable gap capture (`taskId`/`contentBand`/`coverage`, no migration),
  and an honest before→after that claims "improved" only on a real change. See the `[x]` record at the top of
  `RESUME_HERE.md`. **TWO follow-ups remain:**
  - **(needs-Kheshav, ~10 min) Run the Stage-1 ship gate** — the cosmetic-edit over-praise eval (`EVAL_SURFACE=reattempt`)
    was dry-run-validated but the **keyed run was not executed** (no Gemini key in the build session). On ✅ → record
    it; on ⛔ → degrade the `ReattemptPanel` improvement copy. Command + decision tree in
    `docs/research/ai-tier-eval-results/2026-06-27-reattempt-cosmetic-over-praise.md`. Quota: full N=1 = 16 calls,
    `EVAL_SAMPLE_N=5` smoke ≈8 ([[reference_gemini_free_quota_eval]]).
  - **(needs-Kheshav) Stage 2 — spaced feed-forward** via the mistake Fix-up queue (a `type:'writing'` reflect item
    that deep-links `/writing` with a *sibling* task pre-selected). **GATED** on Stage-1 usage data (do students reach
    tasks? do they re-attempt? — Stage 1 now logs `taskId` to answer this) **AND** a bigger task bank for sibling
    tasks. If usage ≈0 → build more tasks / drive adoption, NOT Stage 2 (spec §2/§7). Do NOT solo-build.
- **Cross-browser e2e coverage** — the suite runs **chromium-only** (mobile 390×844). Real iPhone-Safari users are
  untested. Adding a `webkit` Playwright project is easy but may surface many Safari-specific failures at once → decide
  whether to add it (and triage the fallout) vs stay chromium-only. Found 2026-06-23.
- **Personalized "For You" deck — Phase 2 completion** — designed + kickoff-ready, but re-seams the instruct router
  + roleplay seed (architecture) → attended build. spec `…/specs/2026-06-13-for-you-phase2-completion-design.md`
- **Direction B follow-up — make listening + exam steerable in "Tune your focus"** (Direction B v1 SHIPPED
  2026-06-24, live on prod; spec/plan `…/2026-06-24-personalization-show-me-why-*`). v1 `MixSteer` presets only steer
  **speaking/writing/grammar** — the skills `dailyPlan.pickSkillFocus` can actually surface. Making "More listening"
  / "Exam crunch" real requires adding **listening** + **exam** as first-class daily-plan candidates (new candidate
  set + priority/phase rules) → needs Kheshav to OK the new candidates before any build. *Adjacent small decision:*
  the competence panel's skill-balance bars are **account-wide** (parity with the Dashboard PaperBalance meter), NOT
  `studyLang`-scoped like its mastered-count + weak-spot chips — decide scope-per-language vs keep parity.
- **Multimodal — video → Malay transcript + more input formats** — OCR + audio + vision "Sharper read" already
  shipped; video / new formats need their own spec. memory `project_multimodal_direction`
- **BYOK quality-translation product fork + `aiText`-prefers-Gemini** — which provider is "quality" + the UX
  trade-off is a product call. plan `…/plans/2026-06-08-byok-quality-translation.md`
- **English writing-paper number — which syllabus does the Writing analyzer target?** (surfaced 2026-06-23
  during the Cikgu Malay paper-number fix.) `src/lib/gemini.js:118,134` calls English writing "Paper 2 (Writing)"
  — **correct for IGCSE English 0500 (First Language: Paper 2 = Directed Writing & Composition) but WRONG for
  0510 (ESL: writing is inside Paper 1)**. Same question hangs over the Writing analyzer's Malay **"Paper 2 or
  Paper 4"** toggle (`Writing.jsx` / `pageGuides.js:300-302` / `connectors.js:5`) — Malay 0546 Paper 2 = Reading,
  so offering "Paper 2" for *writing* is suspect. Both touch a live, band-rule-changing feature → decide the
  intended syllabus / label, don't let the loop silently flip a toggle.
- ~~Per-syllabus paper numbering~~ — **RESOLVED 2026-06-22 (Kheshav-cleared → now loop-safe).** Decision: on
  BILINGUAL / shared surfaces DROP the paper number (label by skill); keep a number only in verified single-syllabus
  context. The concrete confident-wrong fixes ("Listening (Paper 4)" etc., web-verified Malay 0546 listening = Paper 1 /
  English 0510 listening = Paper 2) are queued as the top **axis-1** item in the `RESUME_HERE.md` 🤖 queue. The loop MAY
  build it (and re-verify the numbers per the anti-hallucination gate).
- *(Separate project, NOT this app/loop: the "Straw Hat Samurai" duel game — tracked in memory only.)*

> **📌 Keep this backlog current (standing practice, requested 2026-06-21):** whenever Kheshav asks for a new
> task/feature in ANY session, append it here in the SAME session — classify it loop-safe vs needs-Kheshav, point
> it at a spec/plan if one exists. This is the only way the loop stays fed; there is no automation for it (session
> discipline). New big features get SPEC'd (→ needs-Kheshav) before they ever reach the loop-safe queue.

## How each cycle works against this goal (the anti-drift contract)

Before building anything, the cycle MUST:

1. **Assess** the live app against the 6 axes → a short **gap list**, each with **concrete evidence**:
   a real `file:line`, a reproducible behaviour, a **web-verified** wrong content item, or a measured
   number over budget. No evidence ⇒ not a gap.
2. **Pick the single biggest gap** by the priority order below that also passes the HARD invariant screen.
3. **Anti-hallucination gate** — you may ONLY build a gap that is ALL of:
   - **Real** — you can point to the concrete evidence above; never "this might help" or a guess.
   - **Measurable Done** — an observable pass/fail: a failing test that turns green, a number that moves
     past a stated threshold, a rendered element that now appears. **Never "make it nicer".**
   - **Verified** — every Malay/English gloss, grammar rule, or fact is checked against an authority on
     the web before shipping. A confident-**WRONG** change to a learning tool is worse than no change.
4. **If NO gap clears the bar → make NO commit.** Report `no gap above bar on any axis` + the closest
   candidate you considered, and let the shell back off. **This is the correct, desired outcome when the
   app is already good — it is the realization of "stop only when it cannot be improved." An idle, honest
   cycle BEATS a prod-deployed churn commit.**

## The 6 axes (priority order — break ties top-down)

1. **Correctness & content truth** *(highest)* — a broken study mode, crash, or state bug; OR a Malay/
   English gloss, grammar rule, or exemplar that is **verifiably wrong**. Gap = a reproducible defect or
   web-verified wrong content. Fixing a confident-wrong answer ALWAYS outranks any new feature.
2. **Learning efficacy (pedagogy)** — a surface that is passive where retrieval / spacing / immediate
   feedback would teach better, or a research-backed improvement to scheduling, scaffolding, or feedback.
   Must cite the principle (CLAUDE.md learning-science table) AND a real place it is missing today.
3. **UX & accessibility / low friction** — a **measurable** WCAG miss (target < 44px, missing live
   region, keyboard trap), or a real friction point that adds attention cost. This app is **ADD-first**:
   one clear next action, calm, short completable units. Gap = a specific violated rule or broken flow.
4. **Performance** — a per-route page chunk over the **70 KB raw** budget (CLAUDE.md Verification), a
   measurable TTI/runtime regression, or an infinite-render risk. Gap = a number over budget.
5. **Critical-risk test coverage** — an **untested path where a bug would silently corrupt user data or
   break the free path** (cloud sync/merge, FSRS scheduling, store migrations, money-free invariants).
   Gap = a critical path with no test AND a plausible failure mode. ⚠️ **NOT generic "add tests to
   pure-lib X".** Coverage of low-risk pure helpers is **busywork, not a gap** — prefer NO-OP over it.
6. **Bilingual completeness** — a surface broken or absent in ONE language that blocks a learner. Gap =
   a real MS/EN parity break (not cosmetic).

## Ship contract — keep discovery surfaces current (every feature cycle)

When a cycle ships a **user-facing feature** (new mode, route, or capability), the SAME commit MUST also:
- update **`README.md`** so the feature list / overview stays accurate, and
- add it to the **in-app gamified user guide** (driver.js tour, `src/lib/guide/tourSteps.js`; route-modal
  entry too if it's a new route) so the guide never goes stale.

A feature a student can't discover (absent from README + the tour) is not "done". This is alongside the
existing `RESUME_HERE.md` handoff-doc rule. (Pure-internal refactors/test-only cycles are exempt.)

## HARD invariants — never cross without a human (screen EVERY candidate)

No paywall · individual-revision only · no native-app dependency · no `STORE_VERSION` bump without a
data-preserving migration · no Supabase-schema or free-path break · `instruct.js` public API
(`hasInstructProvider` / `callInstruct`) frozen · never delete a feature · no secrets in repo or logs ·
web-verify all content. (These mirror CLAUDE.md + `~/.claude` memory — the irreversible ones.)

## "Improve the loop, not just the app"

If a cycle's highest-value gap is in the **loop itself** — this file, `LOCAL_BUILD_LOOP.md`, or
`build-loop.sh` (e.g. the assessment is missing an axis, a guardrail is weak, a backoff is wrong) — that
is a legitimate axis-1 (correctness) or axis-3 (friction) improvement. Fix it surgically, gate-green,
then resume building the app. Bound it: stop when the next change would be churn, not improvement.
