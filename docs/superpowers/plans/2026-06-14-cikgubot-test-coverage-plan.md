# Plan — Pure-lib test coverage for `src/lib/cikguBot.js` (Malay roleplay evaluator)

**Date:** 2026-06-14 (local build loop, self-sourced — queue empty)
**Type:** Behaviour-preserving test coverage. `cikguBot.js` stays **byte-identical**.

## Problem

`src/lib/cikguBot.js` (246 lines, 7 exports) is the **Malay static-mode roleplay evaluator** —
`Roleplay.jsx` imports `evaluateResponse` + `generateFeedback` to score a learner's turn when the AI
quota is exhausted. It has **no dedicated test file**, so its scoring bands, the loose imbuhan-regex
behaviour, the feedback branch routing, and the session-summary aggregation are all unpinned. A silent
regression here (e.g. a band threshold drifting, or `addTurn` losing its immutability) would degrade the
speaking-prep feedback with no test to catch it.

## Criteria-fit (criteria stack: no-paywall > learning/pedagogy quality > low friction > convenience)

- **#2 learning/pedagogy quality** — this IS the speaking-practice feedback engine. Pinning it protects a
  core IGCSE Paper 3 prep surface.
- Pure + deterministic-enough to pin reliably (only `Math.random` in feedback-text pick and `Date.now()`
  in timestamps — both controllable via `vi` seams).
- Live code (imported by `Roleplay.jsx`), not dead — worth the coverage.

## Measurable Done (observable pass/fail)

1. New file `src/lib/__tests__/cikguBot.test.js` with **all assertions grounded in real probed output**
   (captured via a node probe before writing — never hand-computed).
2. Coverage of **all 7 exports + 2 constants**:
   - `evaluateResponse` — score bands (`needs_work`/`fair`/`good`/`excellent`), each flag, the
     `length:1` empty-string gotcha, the loose imbuhan regex (false-positives like "selamat"/"pagi").
   - `generateFeedback` — band routing incl. **`fair`→negative branch**, the three "good" suffixes,
     default persona = casual; `Math.random` seeded for determinism.
   - `getNextPrompt` — topic routing, unknown-topic→general fallback, the `Math.min` clamp.
   - `initializeConversation` — persona name/greeting, empty turns, `startTime` via fake timers.
   - `addTurn` — **immutability** of the input conversation, score accumulation, turn shape, timestamp.
   - `generateSessionSummary` — empty-turns branch + multi-turn strengths/suggestions gates + the
     avg-band `quality` ladder; fake timers for `durationSeconds`.
   - `CIKGU_PERSONAS` / `VOCABULARY_CATEGORIES` shape.
3. **Red-proofed:** mutate a SUT behaviour (e.g. a band threshold), watch the matching tests fail for the
   right reason, restore byte-identical (`git checkout`, zero diff), confirm all green.
4. Gate green: `npm run build && npm run test:run && npm run lint` — 0 errors, only the 3 known
   exhaustive-deps warnings.

## What NOT to break

- `cikguBot.js` itself — **byte-identical**, tests only. No STORE_VERSION bump (no store touch).
- No new lint warnings; no e2e needed (pure logic, no UI render).

## Decide-and-flag forks (pre-resolved)

- **Math.random handling:** seed via `vi.spyOn(Math, 'random').mockReturnValue(0)` to assert the exact
  feedback string deterministically (index 0 of each persona array). Veto: if flaky, assert array
  membership instead — but seeding is cleaner and matches the real first-element output already probed.
- **Date.now handling:** `vi.useFakeTimers()` + `vi.setSystemTime()` for `startTime`/`timestamp`/duration.
- **generateSessionSummary inputs:** construct conversation objects directly (the fn only reads
  `turns[].evaluation`, `score`, `startTime`) rather than driving the full `addTurn` loop — smaller,
  clearer, and the addTurn integration is covered separately.

## Hostile self-review of this plan

- Breaks an invariant? No — tests-only, no store/schema/free-path/instruct.js touch.
- Done measurable? Yes — file exists, N grounded tests, red-proof shown, gate green.
- One-cycle-sized? Yes — single pure module, ~30 tests, no app code change.
- Best use of effort? Yes — a live pedagogy surface with zero coverage; continues the proven pure-lib
  thread with a *real* gap (the named `examReadiness`/`skillBalance`/`passageOrder` candidates already
  have tests; `confidence.js` doesn't exist).
