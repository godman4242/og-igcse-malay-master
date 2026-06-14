# Content-truth fix — comprehension answer key mislabels "memakan" affix — plan

**UTC:** 2026-06-14 14:26 · **Loop cycle (self-source, axis-1 content-truth)**

## Problem (Real — concrete evidence)

`src/data/comprehensionPassages.js`, passage `kesihatan` (Healthy Lifestyle), question 5
(lines 298–305) asks *"apakah imbuhan pada 'memakan'?"* with options
`['A) me-', 'B) meN-...-kan', 'C) ber-', 'D) di-']` and **`correctIndex: 1`** (= `meN-...-kan`).

That is **wrong content**. The passage word is **"memakan"** (`Kita harus memakan lebih banyak
sayur-sayuran`). Morphologically it is **`meN-` + `makan`** with **no suffix**: the root `makan`
begins with `m` — one of the `l/m/n/r/w/y` no-change consonants — so the prefix surfaces as **`me-`**
(identical rule to the app's own `memasak` = me- + masak, `grammar.js:145`). A `-kan` form would be
`memakankan`, which is not the passage word. The current `explanation` even invents
*"(-kan implied transitive)"* to justify the wrong key.

`correctIndex` IS the graded key (`Comprehension.jsx:202` `userAnswer === currentQ.correctIndex`;
:240 displays `q.options[q.correctIndex]` as "Correct:"). So a student who **correctly** picks
`A) me-` is marked **wrong** and shown a false answer + a fabricated rule — the confident-wrong
failure axis-1 ranks highest.

**Web-verified** (not memory): memakan = prefix `me-` + makan, no `-kan` —
[Kompasiana · imbuhan pada "makan"](https://www.kompasiana.com/suprihadi48660/6330ccc34addee4d724b3e82/pemberian-imbuhan-pada-kata-makan).
Internally corroborated by the app's own `grammar.js` no-change rule (`memasak`, `menanti`) and by
the sibling Q (`mempunyai` = meN-...-i, passage `keluarga` Q5, which is correct).

## Criteria-fit

- **GOAL axis 1 (correctness & content truth)** — highest priority; a verifiably-wrong grammar key
  in a graded surface. "Fixing a confident-wrong answer ALWAYS outranks any new feature."
- HARD invariants: no STORE_VERSION/schema/free-path touch; pure data + new test file; no feature
  deleted; `instruct.js` untouched.

## Measurable Done (observable pass/fail)

A new red-proofed `src/data/__tests__/comprehensionPassages.test.js`:
1. **The fix:** `kesihatan` Q5 (the "memakan" affix Q) has `correctIndex === 0` (the `me-` option),
   and its `explanation` does **not** assert a `-kan` suffix (no `/-kan/`, no "implied").
2. **Answer-key integrity invariant** (defensible — protects a graded surface, not pure-lib
   busywork): for **every** question in **every** passage, `correctIndex` is an integer in
   `[0, options.length)` and resolves to a non-empty option string.

Watched (1) FAIL first against the pre-fix data (`correctIndex` is 1; explanation contains the
suffix claim), then green after the data edit. Gate: `build && test:run && lint` all green.

## The fix (surgical — 2 data lines)

- `comprehensionPassages.js` kesihatan Q5: `correctIndex: 1` → `correctIndex: 0`.
- Rewrite that question's `explanation` to: *'"Memakan" = meN- + makan. The root "makan" begins
  with m (one of l/m/n/r/w/y), so the prefix stays "me-" with no change — there is no -kan
  suffix.'* (removes the fabricated "(-kan implied)").

**Decision / why / veto.** *Decision:* flip the key to the already-present correct option `A) me-`
and de-fabricate the explanation, rather than rewrite the question or swap the word. *Why:* the
word is fixed by the passage text and `A) me-` is the genuinely-correct affix among the options —
the minimal, surgical correction. *Veto note:* considered changing the asked word to one that
truly has meN-...-kan (e.g. "menghabiskan") to keep `correctIndex` non-trivial — rejected:
needlessly larger diff, and the question is already pedagogically fine once the key is right.

## What NOT to break

- The other 4 grammar questions across the MS passages are correct (`dibahagikan`→passive,
  `telah`→tense marker, paired connector, `mempunyai`→meN-...-i) — leave untouched.
- English passages (3) are clean — leave untouched.
- No change to options text, question text, passage text, or any `referenceText`.
- e2e not required: a single key + explanation string edit in existing data is no layout/flow
  change; the new content test + unit gate cover it (CI runs e2e on push).
