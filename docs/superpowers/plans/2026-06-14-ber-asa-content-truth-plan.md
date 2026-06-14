# Plan — Content-truth fix: `ber- + asa → berasa` drill taught the WRONG root

**UTC 2026-06-14 14:08 · local build loop, self-sourced (queue empty) · GOAL axis-1 (content truth)**

This is the pre-thought `▶ NEXT` thread flagged by the last two content-truth ships (kejar→mengejar,
peN-/penulis): *"the still-muddled `ber- + asa → berasa` notation (grammar.js line 37 + GRAMMAR_RULES['ber-']'s
example) — ambiguous root `rasa` vs `asa`; needs a grounded ruling before touching."* Grounded ruling done.

## Problem (the evidence)

`src/data/grammar.js` teaches `berasa` ("to feel") two **contradictory** ways:

- **Drill (line 37):** `{ root: 'asa', answer: 'berasa', rule: 'ber- + asa → berasa', hint: 'ber- + asa' }`
  — treats `berasa` as plain `ber-` + a vowel-initial root `asa`.
- **Reference table (line 157):** files `berasa` under `pattern:'be- + r-initial syllable'`, `note:'Avoids ber-r'`
  (next to `bekerja`) — i.e. the root starts with **`r`** (`rasa`). Its example string `'bekerja, berasa → berasa'`
  is also **garbled** (`berasa → berasa` says nothing).

`drill.rule` is **shown to the student** (Grammar.jsx line 588 `Rule: {fb.rule}` + read aloud line 574) AND is the
`GRAMMAR_FEEDBACK` lookup key. So the drill displays a confident-wrong morphology lesson — the worst failure for a
learning tool — and contradicts the app's own reference table one section below.

## Grounded ruling (web-verified — not memory)

`berasa` (to feel/taste) = **`ber-` + `rasa`**. Root = **`rasa`**, NOT `asa`. The prefix `ber-` reduces to `be-`
before an **r-initial root** (the prefix's r drops to avoid `berrasa`): `be- + rasa → berasa`, `be- + rehat →
berehat`, `be- + renang → berenang`. Same be-reduction family as the app's own `bekerja` (which is triggered by
`-er-` in the first syllable). `asa` is a *separate* word ("hope"; `putus asa`).

- Sources: [awalmulamy — ber-/be-](https://awalmulamy.blogspot.com/2021/02/perkataan-bermula-huruf-ber.html);
  [malaytuitionsg — fungsi imbuhan beR-](https://malaytuitionsg.com/fungsi-kata-imbuhan-ber/) (ber- → be- before
  r-initial root: berasa, berenang, berehat).
- App's own corroboration: `cikguKnowledge.js:943` "Saya **berasa** tidak sihat" (= I feel unwell); `aiMocks.js:12`
  "use 'saya **berasa**' instead of 'saya **rasa**'" (ties berasa to root rasa); many `scenarios.js` uses.

## Fix (surgical — 3 data edits + 1 new feedback entry)

1. **`grammar.js` drill (line 37):** `root:'asa'`→`'rasa'`; `rule:'ber- + asa → berasa'`→`'be- + r → r drops'`
   (matches the file's `'{form} + {letter} → {letter} drops'` convention, e.g. `meng- + k → k drops`);
   `hint:'ber- + asa'`→`'ber- + rasa'`. **`answer:'berasa'` UNCHANGED** — only the taught root/reason changes.
2. **`grammar.js` reference table (line 157):** example `'bekerja, berasa → berasa'`→`'bekerja, berasa, berenang'`
   (degarbled; 3 web-verified be-/r forms, matches sibling rows' format). Pattern + note kept (the "avoids ber-r"
   grouping of kerja + r-initial roots is a defensible IGCSE simplification).
3. **`feedbackRules.js`:** add `GRAMMAR_FEEDBACK['be- + r → r drops']` — precise elaborative feedback for the
   r-initial-root case (examples rasa→berasa, rehat→berehat, renang→berenang; all web-verified), so the drill's
   feedback is grounded (axis-2: immediate specific feedback). `relatedRule` cross-links the kerja `-er-` case.

## Measurable Done (observable pass/fail)

New `grammar.test.js` block, red-proofed (must FAIL on current data first):
- `prefix-ber-asa` drill: `root === 'rasa'`, `answer === 'berasa'`, `rule === 'be- + r → r drops'`, `hint` matches `/rasa/`.
- `GRAMMAR_RULES['ber-']` r-initial row: example NOT garbled (`!/berasa → berasa/`), contains `berasa` + `bekerja`.
- The drill's `rule` resolves to a real `GRAMMAR_FEEDBACK` entry (grounded feedback, no dangling key).

Then: `npm run build && npm run test:run && npm run lint` all green.

## What NOT to break

- Answer key `berasa` stays identical (no grading change). · No `STORE_VERSION` bump (pure data). · No schema /
  free-path / `instruct.js` touch. · `bekerja` drill + its feedback entry untouched. · `studyLang`/bilingual
  unaffected (Malay grammar data). · feedback.test.js uses specific keys by reference, no count assertion — adding
  a key is safe.

## Decide-and-flag

- **Dedicated feedback key vs reuse `be- + kerja`:** dedicated. *Why:* the kerja entry's text says "kerja" and
  would display wrongly on a rasa drill; rasa is the distinct r-initial-root case. *Veto:* costs one small
  web-verified entry — worth it for correct feedback.
- **Fix the root vs swap drill to `berenang`:** fix the root. *Why:* `berasa` is heavily used across the app
  (scenarios/cikgu/mocks) and is a genuine high-frequency word; preserving it with the correct root is more
  surgical than replacing the drill's identity. *Veto:* keeps the rasa/asa surface ambiguity in the source, but
  the corrected root + the new feedback entry resolve the *taught* content, which is what the student sees.
