# Codebase-quality strategy (2026-06-03)

A Design & Research output: a **durable, evidence-based strategy** for raising the
codebase's internal quality without risking the live, deployed app. Strategy-level
by design — **detailed line-level refactor plans are written just-before-execution**
(after the feature roadmap lands) so they reflect the real current code and don't go
stale. Companion to the learning roadmap (`2026-06-03-learning-roadmap-and-trackb.md`).

## 1. The quality-first rationale (and why refactor-LAST)
Quality is the only axis here (Kheshav's directive). That does NOT mean "refactor
everything now" — it means **sequence for the highest-quality outcome with the least
regression risk to a working, deployed product.**
- The files the queued learning features touch are **already healthy** (`Study.jsx`
  180 LOC, `MistakeJournal.jsx` 339, `SelectionToCard.jsx` 247, `Layout.jsx` 295) —
  so refactoring buys those features **zero** quality and only adds risk.
- The real refactor target, `useStore.js`, is the **single highest-risk file** in
  the app (persistence migrations + cloud sync + the state every page depends on;
  the 2026-05-28 settings-sync-loop bug lived here).
- **Therefore: build the features first, refactor after.** Refactoring last means it
  runs against a known-good, feature-complete app with a *bigger* test net (the
  features add tests), and you never gamble the working deploy for no feature gain.

## 2. Evidence (scan, 2026-06-03)
- Total `src`: 188 files, ~38.4k LOC.
- **Size hotspots:** `useStore.js` **1,937** (92 actions) · `lib/writingErrors.js`
  1,366 · `data/cikguKnowledge.js` 1,231 (content) · `Speaking.jsx` 897 ·
  `Settings.jsx` 873 · `Dashboard.jsx` 857 · `data/dictionary.js` 844 (content) ·
  `Grammar.jsx` 832 · `lib/writingErrorsMalay.js` 830 · `CikguBot.jsx` 780.
- **Test coverage:** strong on `lib/` (32 suites). **Weak on the store itself** —
  only `syncEnqueue` + `syncRehydrateGuard` test `src/store/` directly. The store's
  core (FSRS review action, mistakes pipeline, streak/freeze, dailyChallenge,
  **migrations**) is covered only indirectly or not at all. **This is the key risk.**
- **Good news:** `useStore.js` is already informally sectioned by comment headers
  into ~14 domains — the slice seams are visible, not tangled.

## 3. Targets, ranked (Risk-adjusted value)
| Rank | Target | Size | Value | Risk | Approach |
|------|--------|------|-------|------|----------|
| **1** | `useStore.js` → slices | 1,937 / 92 actions | High (maintainability + fewer state bugs) | **High** (migrations, sync, universal dep) | **Characterization tests FIRST**, then Zustand slices pattern, one domain at a time |
| **2** | Big page components → hooks | Speaking/Settings/Dashboard/Grammar/CikguBot (780–900) | Med (readability, reuse) | Low-Med (mostly presentational) | Extract logic to custom hooks (CLAUDE.md Phase-1 "Architectural Detox") |
| 3 | `lib/writingErrors*.js` | 1,366 + 830 | Low | Low | Mostly regex/data tables — leave unless touched; split data from logic only if a feature needs it |
| — | content data files (`dictionary`, `cikguKnowledge`, `scenarios`) | large | — | — | **Not a target** — large content files are fine |

## 4. The non-negotiable method (applies to every refactor step)
1. **Behaviour-preserving only.** No functional/UX change in a refactor commit. If
   behaviour should change, that's a *feature*, done separately.
2. **Characterization tests FIRST** (esp. Target 1). Before moving any store logic,
   write tests that pin its CURRENT behaviour — FSRS review transitions, mistake
   add/promote/dedupe, streak/freeze math, dailyChallenge, and **a migration test
   per `STORE_VERSION` step** (old shape → migrate → asserted new shape). You cannot
   safely slice an untested 1,937-line store; the tests are the safety net.
3. **One slice / one component per commit.** Each step independently builds, lints,
   passes `test:run` + e2e, and is deployable on its own. Never a big-bang rewrite
   (that's the regression trap from the insights report).
4. **Persistence safety.** Slicing the store must NOT change the persisted shape or
   the localStorage key (`igcse-malay-store`) without a migration. Round-trip a real
   persisted blob through rehydrate in a test before/after.
5. **Verify + eyeball + deploy** each step (same gates as features); refresh
   `RESUME_HERE` in the same commit; confirm Vercel READY.

## 5. Target 1 — `useStore.js` slices (the careful one)
- **Pattern:** Zustand "slices" — split the single `create()` into domain creators
  (`createCardsSlice`, `createMistakesSlice`, `createStreakSlice`, `createSyncSlice`,
  `createAiSlice`, `createSettingsSlice`, …) combined in one store, preserving the
  exact same persisted shape + the `persist`/`migrate` config. Seams follow the
  existing comment sections (§2).
- **Order within the track (low-risk → high-risk):** start with leaf domains that
  little else mutates (e.g. `translation`, `identity`, `confidenceLog`), prove the
  slices pattern + migration round-trip, THEN move the high-traffic ones (cards,
  mistakes, sync) once the harness is trusted.
- **Hard constraints:** keep `STORE_VERSION` + the full `migrate` chain intact and
  tested; keep every action's external signature identical (pages call them by name);
  keep the getter-returns-new-object discipline (CLAUDE.md) so no new render loops.
- **Detailed plan:** write it *just before* this track starts (post-features), from
  the then-current store — not now (it would drift as the 3 features add actions).

## 6. Target 2 — big page components → hooks
- For Speaking/Settings/Dashboard/Grammar/CikguBot: extract state machines + effects
  into `useXxx()` hooks (mirrors the ALREADY-DONE `Study.jsx` detox — its 180 LOC is
  the proof this works and the pattern to copy: `useInterleavedSession`, mode
  sub-components). Presentational JSX stays in the page; logic moves to a tested hook.
- Lower risk than the store; can be done piecemeal and even opportunistically when a
  feature next touches one of these pages.

## 7. Sequence (whole roadmap)
1. **Learning features** (fresh sessions, one each): tappable → mistake micro-drills
   → generative cloze.
2. **Codebase-quality track** (after features):
   a. Store **characterization + migration tests** (pure safety net — ships value
      even if no slicing follows: it locks in current behaviour).
   b. `useStore.js` slices, leaf-first.
   c. Page-component hook extraction (opportunistic).
3. (Independent, anytime) `writingErrors*` data/logic split — only if a feature needs it.

## 8. Open decisions for Kheshav (defaults bold)
1. **Store refactor pattern:** **Zustand slices** (keep one store + persisted shape;
   split the creator) vs. leave the monolith but only extract pure helpers. Default:
   slices — it's the real maintainability win and the seams already exist.
2. **Scope of Step 2a:** **write store characterization + migration tests regardless**
   (high value, low risk, and they protect the features too) — even if you later
   decide NOT to slice. Confirm. (Recommended: yes, do 2a soon — it's the cheapest
   quality + safety win on the board.)
3. **Page-hook extraction:** **opportunistic** (extract when a feature next touches
   the page) vs. a dedicated sweep. Default: opportunistic, to avoid churn for churn's
   sake.

## 9. What this doc deliberately does NOT do
- No line-level store plan (writes just-before-execution to avoid staleness).
- No refactor of healthy/feature-touched files or content data files.
- No behaviour/UX changes — those are features, specced elsewhere.
