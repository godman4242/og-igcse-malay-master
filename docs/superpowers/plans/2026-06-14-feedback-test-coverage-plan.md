# Plan — Pin `src/lib/feedback.js` (drill / tense / vocab / session feedback) with tests

**Date:** 2026-06-14 (UTC) · **Mode:** local build-loop Self-source · **Type:** behaviour-preserving test coverage

## Problem
`src/lib/feedback.js` (126 lines, 4 exported functions) has **no dedicated test file**. It is the
elaborative-feedback layer behind grammar drills (`buildDrillFeedback`, `buildTenseFeedback`), the
vocab "Again" tip (`buildVocabFeedback`), and the Hattie/Timperley three-line session feedback
(`buildSessionFeedback`). It was the top target named in the `pronunciation.js` pin's `▶ NEXT`
thread. A silent regression in its threshold/precedence logic (e.g. the `acc < 60`/`< 80` study
routing, or the `state` → tip mapping) would ship wrong pedagogical guidance with no test to catch it.

## Criteria-fit
- **No-paywall / free-path:** untouched (tests only).
- **Learning/pedagogy quality:** locks in correct feedback routing — directly protects the learning
  surface. The `▶ NEXT`-thread pre-vetted this as the next-strongest pure-lib target.
- **Low friction / convenience:** zero runtime cost; `feedback.js` stays byte-identical.

## Measurable Done (observable pass/fail)
1. New file `src/lib/__tests__/feedback.test.js` with **≥ 24** tests, all green.
2. `feedback.js` is **byte-identical** (`git diff --stat` shows only the new test file + docs +
   RESUME_HERE.md).
3. **Red-proof:** temporarily mutate ≥ 3 distinct SUT behaviours (a study-routing threshold, the
   vocab `state` mapping, and the tense `relatedRule` guard) → the matching tests FAIL for the right
   reason; restore byte-identical → all green.
4. Gate green: `npm run build && npm run test:run && npm run lint` (0 errors; only the 3 known
   exhaustive-deps warnings). Unit count rises by the number of new tests.

## What to pin (grounded in the SUT + `src/data/feedbackRules.js`)
- **`buildDrillFeedback(drill, correct)`** — `correct` short-circuits to `null`; `!drill` → `null`;
  `rule` hit in `GRAMMAR_FEEDBACK` returns the entry; unknown `rule` → fallback (explanation =
  `hint`, mnemonic = `Rule focus: <rule>`); `hint`-only key lookup (no rule) hitting the map;
  neither rule nor hint → `Expected answer: <answer>` / `See correction.`
- **`buildTenseFeedback(drill, chosen)`** — `!drill` → `null`; `chosen === answer` → `null`; both in
  map → correct entry's explanation/mnemonic/examples + a `relatedRule` naming chosen vs answer +
  tense; neither in map → synthesized explanation, `mnemonic:null`, `examples:[]`, `relatedRule:null`;
  correct in map but chosen not → `relatedRule:null`.
- **`buildVocabFeedback(card)`** — `state` 0/undefined/null-card → `new`; 1 → `learning`; 3 →
  `relearning`; 2 and out-of-range → `review` (the `else`).
- **`buildSessionFeedback(context, data, storeState)`** — deterministic branches with **no**
  `examDate`: default goal line; study-session accuracy routing (`<60` → `/mistakes`, `<80` → `/`,
  `>=80` + empty roleplay history → `/roleplay`, else `/`); the calibration snippet gate
  (`totalEntries >= 5`); grammar-drill / roleplay / writing context lines + thresholds; unknown
  context → empty `now/next`. **Time-dependent goal lines** (`daysToExam`) pinned with
  `vi.useFakeTimers()` + `vi.setSystemTime` and exact UTC `examDate` offsets (10d → "Final stretch",
  30d → "Review phase", 90d → "Build phase", past → default).

Expected strings/numbers are **hand-calculated literals**, never re-derived from the SUT.

## What NOT to break (hostile-review checklist)
- `feedback.js` byte-identical — no behaviour change, no `STORE_VERSION` bump, no schema/free-path
  touch, `instruct.js` API untouched.
- No Malay-content claim shipped (the only Malay strings asserted are quoted verbatim FROM
  `feedbackRules.js`, which is unchanged — not new grammar I authored).
- Fake timers restored via `afterEach(vi.useRealTimers())` so no cross-test time leak.

## Decide-and-flag
- **Decision:** pin the WHOLE file incl. `buildSessionFeedback`, not just the "pure trio" the thread
  suggested. **Why:** its time-dependency is isolated to one `examDate` branch trivially controlled by
  fake timers; the accuracy-threshold next-step routing is genuinely important behaviour worth
  locking. **Veto:** if fake-timer setup proves flaky/over-complex, fall back to the pure trio +
  `buildSessionFeedback`'s no-`examDate` branches only (still ≥ 20 tests) — no quality loss to the core.

## Hostile self-review of THIS plan
- Breaks an invariant? No — tests only.
- Done measurable? Yes — file exists, ≥ 24 green tests, byte-identical SUT, red-proof evidence, gate.
- One-cycle-sized? Yes — one new test file, no source edits.
- Best use of effort? Yes — pre-vetted `▶ NEXT` target; behaviour-preserving coverage is the
  explicitly-blessed Self-source default when no feature clears the quality bar.
