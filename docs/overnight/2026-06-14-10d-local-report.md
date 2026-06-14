# Local build-loop report — 2026-06-14 ~10:37 UTC (18:37 KL)

**Loop:** `docs/LOCAL_BUILD_LOOP.md`, cycle 4 (final item). Same fresh `/loop` session, before the 7pm KL
cutoff.

## Item shipped
**Pure-lib test coverage** — the last unchecked queue item. Added behaviour-preserving, red-proofed unit
tests for `src/lib/diff.js` (`computeWordDiff`), the pure LCS word-diff behind the pronunciation/speaking
colored feedback.

## Why diff.js
Cleanest untested pure helper: deterministic, no randomness/DOM/deps → fully pinnable with zero flakiness.
(Other candidates `interleave`/`pronunciation` carry `Math.random` or heavier deps; flagged as next.)

## What's covered (+12 tests)
identical→equal; empty-old→add; empty-new→remove; both-empty→[]; middle insertion/deletion; replacement
(remove-then-add); full replacement (grouped); whitespace normalisation; multi-word same-type grouping;
no-two-adjacent-same-type invariant; reconstruction invariant (equal+remove == old words, equal+add == new
words) over MS/EN samples.

## Grounding + red proof
- **Grounded:** every expectation captured from the function's REAL output via a node probe before writing
  assertions (tests pin actual behaviour, not a guess).
- **Red-proofed:** mutated diff.js's group-join separator → 7/12 tests failed; restored byte-identical
  (verified `diff -q`) → 12/12 green. This is the standard non-vacuity proof for coverage of existing code.

## Gate result (`build && test:run && lint`)
- **build:** green (eager `index` unchanged).
- **test:run:** **1420 passed** (+12 from this item).
- **lint:** 0 errors, 3 pre-existing exhaustive-deps warnings.

## Hard-limits / self-review
Behaviour-preserving — `diff.js` byte-identical (only a new test file). No STORE_VERSION bump. No
schema/free-path/feature change. `instruct.js` untouched.

## Files
- `src/lib/__tests__/diff.test.js` (new, +12)
- `RESUME_HERE.md` (queue item `[x]` + shipped section)

## Deploy
Committed to `main` (= prod deploy). Confirm Vercel READY on `upg-igcse-malay-master`.

## Loop status
Build queue now EMPTY — all 4 vetted items shipped this loop (AWL Sublist 2, AWL Sublist 3,
voice/locale leak audit, pure-lib coverage). Next cycle's step-3 will hit "queue empty — nothing to build"
and STOP.
