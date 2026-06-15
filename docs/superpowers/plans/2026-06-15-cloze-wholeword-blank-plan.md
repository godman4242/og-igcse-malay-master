# Plan — whole-word cloze blanking

**Date:** 2026-06-15 · Design: `../specs/2026-06-15-cloze-wholeword-blank-design.md` · **One cycle, shipped.**

## Steps (executed)

1. **Evidence.** Scanned all 180 seeded Academic-English `ex` strings (`academicEn{,2,3}.js`) for cards where the
   target `m` occurs only as a substring of a longer word under the naive `.replace(/m/gi)`. Found 1 live hit:
   `compute` / "Computers can compute…". (Malay dictionary has no `ex` field, so the seeded Malay deck doesn't trip it;
   the fix still hardens imported cards + future seed words.)
2. **TDD red.** Create `src/lib/blankWord.js` with the NAIVE impl + `src/lib/__tests__/blankWord.test.js` (10 cases).
   Run → 3 whole-word boundary cases fail for the right reason (substring leaks), 7 pass. ✅ red-proofed.
3. **Implement.** Swap the naive regex for the whole-word boundary regex (same pattern as `savedWordHighlight.js`).
   Run → 10/10 green.
4. **Swap 7 sites** to `blankInExample(...)`: `ClozeMode.jsx`, `ProduceMode.jsx`, `FlashcardMode.jsx` ×2,
   `MixedSession.jsx` ×3. Each is a one-expression replacement; surrounding JSX/handlers untouched.
5. **Gate:** `build && test:run && lint` → green (1642 tests, 0 lint errors). `produceMode.test.js` still green
   (no regression).
6. **Ship:** one commit; RESUME_HERE shipped-section + queue `[x]`; overnight report.

## Measurable Done (met)

- `blankWord.test.js`: `compute`/"Computers" → `"Computers can _____ huge sums in seconds."` (not `_____rs`). ✅
- 0 naive `replace(new RegExp(...), '_____')` sites remain in `src/`. ✅
- Full gate green; no STORE_VERSION/schema/free-path/feature change. ✅

## NOT done (out of scope, by decision)

- First-occurrence-only blanking — that's `clozeBuilder.js`'s separate saved-words contract; left untouched.
- The paper-NUMBERING relabel — needs Kheshav's product call, not solo.
