# Pure-lib test coverage — `pronunciation.js` (pronunciation scoring) — plan

**Self-sourced** (local build loop, queue empty). Pre-thought item from the `interleave.js` pin's
`▶ NEXT` thread in `RESUME_HERE.md`: "~18 untested pure `src/lib/` helpers remain — next strongest
targets: `pronunciation` (scoring), `feedback`, `patterns`."

## Problem

`src/lib/pronunciation.js` powers the **Speak study mode** (`SpeakMode.jsx` imports
`scorePronunciation`) — it scores a learner's spoken attempt against the expected Malay text and
emits per-word feedback + Malay-specific tips. It has **no dedicated test file**. Its scoring logic
carries subtle, regression-prone rules (the `close` threshold, extra/missing-word handling, tip
selection precedence, score rounding, dedup + cap) that a future edit could silently invert.

## Criteria-fit (criteria stack: no-paywall > learning quality > low friction > convenience)

Pure behaviour-preserving coverage of a **pedagogy-central** scorer. Highest-safety cycle: no app
behaviour change, no STORE_VERSION/schema/free-path/frozen-API touch. The doc explicitly endorses
"behaviour-preserving test coverage" as a legitimate self-sourced cycle ("An idle, honest cycle
beats prod churn").

## Measurable Done (observable pass/fail)

- New `src/lib/__tests__/pronunciation.test.js` covering `scorePronunciation` + `generatePracticeSentences`.
- **Red-proofed:** temporarily mutate ≥3 SUT behaviours, watch the matching tests fail for the right
  reason, restore byte-identical → all green.
- `pronunciation.js` stays **byte-identical** (tests only).
- Gate green: `npm run build && npm run test:run && npm run lint` — 0 errors, only the 3 known
  exhaustive-deps warnings; unit count rises by the number of new tests.

## What the tests pin (grounded against the source, hand-computed expectations)

- **Exact match** → `status:'correct'`, full point; score 100 on all-correct.
- **`close` threshold** = `levenshtein(exp, spk) <= ceil(exp.length * 0.3)` → half point. Pin a
  case just inside the threshold (1 edit on a long word) and one just outside (1 edit on a short
  word where `ceil(len*0.3)=0`).
- **Wrong** → `status:'wrong'`; a missing spoken word renders `spoken:'—'`.
- **Extra spoken words** beyond expected length → `status:'extra'` rows appended.
- **Score rounding** = `round(score / max(1, expWords.length) * 100)`; counts (`correct`/`close`/
  `wrong`/`total`) are consistent with the rows.
- **Tips:** MALAY_TIPS pattern match (e.g. a missed word containing `ny`/`ng`/`sy`); the general
  fallback tips (long word > 8 chars; imbuhan-prefix regex) fire only when no MALAY_TIPS hit; the
  "Perfect pronunciation!" tip on zero misses; dedup (`new Set`) + `slice(0, 3)` cap.
- **`normalize`** (via behaviour): punctuation stripped, case-folded, whitespace collapsed — so
  `"Saya, makan!"` vs `"saya makan"` scores 100.
- **`generatePracticeSentences`:** `ex.length > 5` filter; `count` cap; mapping shape
  (`{ malay, english, word }`); the `c.ex.split('(')[0].trim()` malay extraction; `c.m` fallback
  when `ex` absent. Assert **count/shape/membership, never shuffle order** (`Math.random`).

## What NOT to break

- `pronunciation.js` byte-identical — this is a test-only cycle.
- Don't assert on `Math.random`-dependent ordering in `generatePracticeSentences`.
- No new lint warnings.

## Decide-and-flag forks (pre-resolved)

- **Target = `pronunciation` over `feedback`/`patterns`.** `feedback.js`'s `buildSessionFeedback`
  is time-dependent (`Date.now()`/`new Date()`), harder to pin deterministically; `pronunciation`'s
  core is fully deterministic and more pedagogy-central. Veto: if it were already tested, switch to
  `feedback`'s pure trio — confirmed it is not.
- **Test `generatePracticeSentences` despite no current consumers.** It's still exported; pinning
  count/shape/filter is cheap and guards the contract. Veto: skip if it required mocking `Math.random`
  to assert anything meaningful — it doesn't (count/shape/membership are order-independent).
