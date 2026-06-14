# Plan — pure-lib test coverage for `src/lib/json.js` (`tryParseJSON`)

**Date:** 2026-06-14 · **Mode:** local build loop, Self-source (queue empty) · **Type:** behaviour-preserving test coverage.

## Problem
`src/lib/json.js` exports `tryParseJSON` — the best-effort JSON parser that survives common LLM
output quirks (object pass-through, bare JSON, prose-wrapped `{...}` recovery). It is **load-bearing
for AI writing feedback** (`src/hooks/useWritingEvaluator.js` parses the model's response through it),
yet has **no dedicated test file**. It was the pre-thought `▶ NEXT` target named in the
`writingFormats` shipped section of `RESUME_HERE.md`.

## Criteria-fit
no-paywall (N/A) · learning/pedagogy quality (pins the correctness of the AI-feedback parse path —
a silent regression here would degrade writing feedback) · low friction · convenience. Lowest-risk
class of work for an unsupervised prod deploy: **the SUT stays byte-identical** (tests only).

## Measurable Done (observable pass/fail)
- New `src/lib/__tests__/json.test.js` with **15** tests, all green.
- Every expected value is grounded against the function's **real output** (node probe captured before
  writing assertions), not guessed.
- **Red-proof:** temporarily mutate ≥2 SUT behaviours at once and confirm **exactly the matching
  tests fail** for the right reason; restore `json.js` byte-identical (`git checkout` → zero diff).
- Gate green: `npm run build` (eager `index` unchanged) + `npm run test:run` (+15) + `npm run lint`
  (0 errors, same 3 pre-existing warnings).

## What NOT to break
- `json.js` MUST stay byte-identical — this is coverage, not a behaviour change.
- No `STORE_VERSION` bump, no schema/free-path/`instruct.js`-API touch (none are involved).
- Don't over-fit: skip incidental JS coercion edges (number/boolean inputs) — the real consumer only
  passes strings or objects, so pinning `JSON.parse(42)` coercion would pin accident, not contract.

## Test cases (all grounded via node probe)
1. `''` → `null` (falsy guard)
2. `null` → `null`
3. `undefined` → `null`
4. plain object → returns the **same reference** (`toBe`, no clone)
5. array → returns the **same reference** (`toBe`) — the array-passthrough-via-`typeof` gotcha
6. bare object string `'{"a":1}'` → `{a:1}`
7. bare array string `'[1,2,3]'` → `[1,2,3]`
8. bare primitive string `'123'` → `123` (first-try parse, no recovery)
9. prose-wrapped object → extracts the `{...}` → `{band:6}`
10. multiline `{...}` in prose → `{a:1}` (`[\s\S]` spans newlines)
11. code-fence ```` ```json … ``` ```` wrapped → `{a:1,b:[2,3]}` (real LLM quirk)
12. **greedy over-capture:** two objects in prose `'{"a":1} text {"b":2}'` → `null`
    (first-`{`-to-last-`}` span is invalid JSON — important gotcha)
13. nested object in prose → `{a:{b:2},c:[1,2]}` (greedy correctly captures when last `}` is the closer)
14. no-braces prose → `null`
15. malformed brace content `'{not valid json}'` → `null` (inner `JSON.parse` of the match throws)

## Decide-and-flag
- **Decision:** assert object/array pass-through by reference (`toBe`), prose-recovery by value
  (`toEqual`). *Why:* pins both that pass-through doesn't clone AND that recovery yields the right
  shape. *Veto:* none — both are real contract.
- **Decision:** skip number/boolean primitive inputs. *Why:* not part of the documented contract or
  real usage; pinning incidental coercion is over-fitting. *Veto:* if a future consumer passes raw
  numbers, add then.

## Hostile self-review of this plan
Breaks no invariant (tests only). Done is measurable (15 green + red-proof + gate). One-cycle-sized.
Genuinely useful: it's the pre-vetted NEXT thread and pins a real AI-feedback path. → proceed.
