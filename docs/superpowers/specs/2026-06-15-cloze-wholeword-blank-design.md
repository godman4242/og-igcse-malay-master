# Design — whole-word cloze blanking (kill mid-word `_____` leaks)

**Date:** 2026-06-15 · **Loop cycle (self-sourced, queue empty)** · **Axis 1 (correctness) + Axis 2 (pedagogy)**

## Problem (Real — concrete evidence)

The example-sentence "blank the target word" used by the produce/cloze study surfaces is a **naive,
no-word-boundary** substring replace, duplicated at **7 sites in 5 files**:

```js
card.ex.replace(new RegExp(card.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')
```

- `src/components/study/ClozeMode.jsx:12`
- `src/components/study/ProduceMode.jsx:28`
- `src/components/study/FlashcardMode.jsx:283`, `:337`
- `src/components/MixedSession.jsx:268`, `:292`, `:373`

Because there is no word boundary, a target word that appears as a **substring of a longer word** in the
example is blanked mid-word — AND every occurrence is blanked. Real card in the **FREE Academic English 2**
deck (`src/data/academicEn2.js`, seeded by `seedAcademicEnglish2`, studied as `lang:'en'` cards):

```
m="compute"  ex="Computers can compute huge sums in seconds."
naive →  "_____rs can _____ huge sums in seconds."   ❌ mangles "Computers" + the leftover "rs" leaks the answer
want  →  "Computers can _____ huge sums in seconds."  ✅
```

The leftover `_____rs` both renders a broken word AND **hands the learner the answer** ("Computers" ⇒ the
word is "compute"), defeating the whole point of a produce/cloze retrieval prompt (the app's #1 principle:
active recall). This is a confident-wrong learning artifact, not cosmetic.

The app **already has** the correct whole-word notion: `src/lib/savedWordHighlight.js` builds
`(?<![\p{L}\p{N}])(?:word)(?![\p{L}\p{N}])` with `'giu'` flags ("so 'ada' won't match inside 'kepada'"),
and the canonical saved-words cloze builder (`src/lib/clozeBuilder.js`) blanks via that whole-word matcher.
The 7 study-mode sites simply never adopted it.

## Fix (Measurable Done)

One pure helper `blankInExample(sentence, word, blank='_____')` in `src/lib/blankWord.js` that blanks
**whole-word** (case-insensitive, Unicode boundary) occurrences of `word` in `sentence`, reusing the SAME
boundary logic as `savedWordHighlight.js`. Replace all 7 naive sites with a call to it.

**Done = observable pass/fail:**
- New `src/lib/__tests__/blankWord.test.js` (red-proofed against a naive stub first):
  - the real `compute`/"Computers" case → `"Computers can _____ huge sums in seconds."` (NOT `_____rs`)
  - `ada`/"kepada" substring case stays unblanked; whole-word `ada` blanks
  - multi-word phrase (`alat komunikasi`), reduplication (`jalan-jalan`), regex-special escape, all
    whole-word occurrences blanked, non-string/empty guards
- Existing `produceMode.test.js` blanked-context assertions still pass (rumah → `_____`, no `rumah`).
- Full gate green (`build && test:run && lint`).

## What NOT to break

- Keep blanking **ALL** whole-word occurrences (current `g`-flag behaviour) — the bug is ONLY substring
  matching, not multiplicity. Do **not** switch to first-occurrence-only (that's `clozeBuilder`'s separate
  contract for the saved-words session; changing these modes would be scope creep / behaviour drift).
- No `STORE_VERSION` bump (pure render-string change, no persisted data). No schema/free-path touch.
- No feature deleted. `instruct.js` API untouched. Surgical diffs — only swap the regex expression for a
  helper call at each of the 7 sites; the surrounding JSX/handlers are unchanged.

## Decide-and-flag

- **New helper file vs inline boundary regex at each site?** → New pure helper. *Why:* the expression is
  duplicated 7× today; a shared helper is unit-testable (measurable Done) and prevents the next site from
  re-introducing the naive form. *Veto note:* if a reviewer prefers zero new files, inlining the lookaround
  regex at each site is equivalent behaviourally but loses the single test anchor — rejected.
- **Reuse `findSavedWordMatches` vs a local boundary regex?** → Local boundary regex in the helper (same
  pattern string), not the match-span API. *Why:* `findSavedWordMatches` returns spans for highlighting;
  here we want a plain string `.replace`. Sharing the literal boundary pattern keeps the notion identical
  without coupling the helper to the highlighter's span shape. *Veto:* acceptable to import a shared
  `wholeWordRegex` later if a third consumer appears; not worth a refactor now.

## Content verification

`compute → mengira/mengkomput` gloss and the example sentence are unchanged (no content edited). The fix is
pure logic. The `compute` collision was found by scanning all 180 academic-deck `ex` strings; it is the
only substring collision in the seeded decks today — but the fix hardens the whole class (imported cards,
future seed words) across all 5 study surfaces.
