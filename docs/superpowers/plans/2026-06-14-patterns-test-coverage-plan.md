# Pure-lib test coverage — `src/lib/patterns.js` (mistake clustering + performance trends)

**Cycle:** local build loop, 2026-06-14. **Self-sourced** (queue empty). Named target in the
`feedback.js` pin's `▶ NEXT` thread — the last unshipped name in the `interleave → pronunciation →
feedback → patterns` thread chain.

## Problem

`src/lib/patterns.js` (8 exported pure functions, 312 lines) has **no dedicated test file**. It powers
the Dashboard's mistake-cluster cards (`clusterMistakes`), the weakest-format/topic widgets
(`weakestWritingFormats`/`weakestSpeakingTopics`), the worst-session callout (`worstSpeakingSession`),
the activity sparkline (`rollingActivity`), and the SpeakingProgress widget's three aggregations
(`speakingBandSeries`/`recurringSpeakingWeakness`/`topicsDueForReattempt`). A silent regression in any of
these mis-renders the learner's weak-spot signals — the wrong feedback for a learning tool.

## Criteria-fit

- **No-paywall / individual-revision-only / Malay+English first:** untouched — tests only.
- **Learning/pedagogy quality:** locks the weak-spot detection (clustering thresholds, band averaging,
  spaced-reattempt logic) so the Dashboard's "what to practise" signals can't silently drift.
- **Low friction:** zero user-facing change.

## Measurable Done (observable pass/fail)

- New `src/lib/__tests__/patterns.test.js` covering **all 8 exports** + the time-dependent branches.
- `npm run test:run` green with the new tests counted (+N).
- **Red-proof:** mutate ≥3 distinct SUT behaviours, watch exactly the matching tests fail for the right
  reason, restore byte-identical (`git checkout`, zero diff), re-run green.
- `npm run build` + `npm run lint` green (0 errors; only the 3 known exhaustive-deps warnings).
- `src/lib/patterns.js` **byte-identical** (tests only — `git diff --stat` shows no change to it).

## What NOT to break

- `patterns.js` stays byte-identical — this is coverage, not a refactor.
- No `STORE_VERSION` bump (no store touched). No Supabase/schema change. No frozen-API change.
- Tests must be **TZ-robust**: `rollingActivity` (`new Date()` today) and `topicsDueForReattempt`
  (`new Date(now)` → local midnight) use LOCAL day fields via `toLocalISO`/`setHours`. Construct test
  timestamps with the **local** `new Date(y, m, d, …)` constructor (not UTC ISO strings) so day-keys are
  deterministic regardless of the runner's timezone. `worstSpeakingSession` (`Date.now()`) uses fake
  timers.

## Decide-and-flag forks (pre-resolved)

- **Fake timers vs injected clock.** `worstSpeakingSession` + `rollingActivity` read the clock internally
  → `vi.useFakeTimers()` + `setSystemTime` (torn down in `afterEach`). `topicsDueForReattempt` takes
  `now` as a param (callers pass `Date.now()`) → inject an epoch number, no fake timers. *Veto:* if a
  function's local-midnight math proved flaky under fake timers, fall back to asserting only TZ-invariant
  properties (lengths, ordering) — not needed; local-constructor dates are deterministic.
- **Assertion grounding.** Strings/numbers OWNED BY `patterns.js` (pattern descriptions, synthesized
  shapes, averages) are hand-typed literals so a regression actually fails; `PATTERN_DESCRIPTIONS`
  passthrough asserted against the literal copy in the test (the map is module-private — assert the
  exact string, which is the contract the Dashboard renders). *Veto:* none.
- **Scope.** One cycle, one file — fully covers all 8 exports; no increments needed.

## Hostile self-review of this plan

- Breaks an invariant? No — additive test file, source untouched.
- Done measurable? Yes — all 8 exports covered, red-proof required, byte-identical source asserted.
- One-cycle-sized? Yes — pure module, ~8 functions, mirrors the 4 prior pin cycles.
- Best use of effort? With an empty queue and no genuinely-better feature above the bar, behaviour-
  preserving coverage of a Dashboard-critical signal module is exactly what §3B endorses.
