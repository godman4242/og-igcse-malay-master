# Pure-lib test coverage — `writingFormats.js` (plan + spec)

**Date:** 2026-06-14 (UTC) · **Mode:** local build-loop self-source (queue empty) · **Type:**
behaviour-preserving test coverage (tests only; `writingFormats.js` stays byte-identical).

## Problem

`src/lib/writingFormats.js` is the lightweight IGCSE writing **format catalogue** — split out of the
heavy `writingGrader.js` so the Dashboard (`RecentPerformance.jsx`) and `MistakeJournal.jsx` can list
formats without dragging in the 700-line grader. It exports:

- `FORMATS` — 27 format objects (13 English `eng` + 14 Malay `malay`), each `{ id, label, lang,
  minWords, maxWords, markers[], requiredHints[] }`. The grader keys band/word-count logic off these.
- `FORMATS_BY_ID` — `Object.fromEntries(FORMATS.map(f => [f.id, f]))` derived map.
- `listFormats(lang)` — pure filter: `FORMATS.filter(f => !lang || f.lang === lang)`.

It has **3 consumers** (writingGrader, Dashboard RecentPerformance, MistakeJournal) and **no dedicated
test file**. A malformed format (typo'd `lang`, duplicate `id`, inverted word bounds, empty markers)
would silently corrupt grading + the Dashboard's weakest-format signal. Pure, deterministic, zero
imports beyond data → an ideal pin.

## Criteria fit

no-paywall ✓ (no UX change) · learning/pedagogy ✓ (protects the writing-grader contract from silent
regressions) · low friction ✓ (tests only) · convenience n/a. Continues the
`interleave→pronunciation→feedback→patterns` pure-lib coverage thread.

## Measurable Done (observable pass/fail)

1. New `src/lib/__tests__/writingFormats.test.js` added; `npm run test:run` green with the new file's
   tests passing (count rises by the number added).
2. **Red-proofed:** temporarily mutate ≥1 SUT behaviour (e.g. `listFormats`'s `!lang` guard, or break
   one `FORMATS` entry) → confirm the matching test(s) fail for the right reason → restore
   byte-identical (`git checkout src/lib/writingFormats.js` = zero diff).
3. `npm run build && npm run test:run && npm run lint` all green (0 errors; only the 3 known
   exhaustive-deps warnings).
4. `writingFormats.js` unchanged (tests-only commit).

### Coverage map (grounded in the live file, hand-typed literals — not re-derived from the SUT)

- **`listFormats` (5):** no-arg → all 27; `undefined`/`null`/`''` (all falsy) → all 27 (the `!lang`
  short-circuit); `'eng'` → 13; `'malay'` → 14; unknown `'french'` → `[]`. Counts are hand-typed
  literals so a filter regression fails.
- **`FORMATS_BY_ID` (3):** `Object.keys(...).length === FORMATS.length` (pins **id uniqueness** — a
  dup id would collapse the map → fewer keys); a known id (`'eng-email'`) maps **by reference** to its
  FORMATS entry; an absent id → `undefined`.
- **`FORMATS` data integrity (5–6):** every entry has a non-empty string `id`+`label`; `lang` ∈
  `{eng, malay}`; `minWords`/`maxWords` are numbers with `0 < minWords < maxWords`; `markers` +
  `requiredHints` are non-empty arrays of non-empty strings; **id-prefix↔lang convention** (`eng-*` ⇒
  `lang:'eng'`, `ms-*` ⇒ `lang:'malay'`); exact split 13 `eng` + 14 `malay` = 27.

## What NOT to break (invariants)

- `writingFormats.js` byte-identical (no STORE_VERSION, no schema, no free-path, no `instruct.js` API
  touch — none apply; tests only).
- Don't assert shuffle/order beyond the catalogue's literal source order (it has none — it's static).
- Don't import the heavy `writingGrader` (defeats the split-out purpose); import `writingFormats`
  directly, matching its 3 consumers.

## Decide-and-flag forks (pre-resolved)

- **Pick this lib over `json.js`?** YES — `writingFormats` has higher blast radius (3 consumers incl.
  the grader) + a mix of pure fn (`listFormats`) + derived map (`FORMATS_BY_ID`) + data catalogue.
  *Veto:* `json.js` (`tryParseJSON`, subtle greedy-regex) is the next thread target — queue it.
- **Assert exact counts (13/14/27)?** YES — they're load-bearing and a count drift = a real catalogue
  change a reviewer should see. Hand-typed literals, not `FORMATS.length`-derived.
- **Assert id-prefix↔lang?** YES — it's a real convention every entry follows; pins a future typo.

## Hostile self-review of THIS plan

- Breaks an invariant? No — tests only, byte-identical SUT.
- Done measurable? Yes — exact test counts + red-proof + green gate.
- One-cycle sized? Yes — ~13–14 tests on a 179-line pure file.
- Best use of effort? Yes — top untested pure lib by blast radius; continues the proven thread; an
  honest coverage cycle beats inventing a marginal feature.
