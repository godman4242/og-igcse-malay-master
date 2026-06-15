# Roleplay scorecard — whole-word key-vocab/imbuhan detection (no substring false-credit)

**Date:** 2026-06-15 · **Loop:** local build loop, self-sourced (queue empty → GOAL-driven assessment)
**GOAL axis:** 1 (correctness) + 2 (pedagogy — false-positive feedback defeats retrieval).

## Problem (Real — concrete, reproducible)

`src/components/RoleplayScorecard.jsx` decides which scenario `keyVocab`/`keyImbuhan` words a
student "used" with a **naive substring `.includes()`** — the SAME bug class fixed last cycle in the
study modes (`blankWord.js`). Four sites:

- `:322-324` — `studentLower.includes(v.toLowerCase())` → `vocabHit` / `imbuhanHit`
- `:395-397` — `modelLower.includes(...)` / `!studentLower.includes(...)` → `modelVocab` / `missed`
- `:444` — `highlightKeywords` builds `new RegExp('(' + escaped.join('|') + ')', 'gi')` with **no
  word boundary** → splits/highlights substrings.

These feed **student-facing feedback**, not cosmetics:
1. Green **"✓ used <word>" chips** (`:345-360`) — false credit.
2. Orange **"Missed:" chips** (`:393-411`) — wrongly suppressed.
3. The highlighted student text (`:341`) — mangled mid-word colouring.

**Reproduced (real scenario data, plausible input):**
- `keyVocab: 'menu'` (`scenarios.js:63`, restaurant) → `.includes()` TRUE inside **"menunggu"**
  (to wait), **"menunjukkan"** (to show) — utterly unrelated words. False green "✓ menu".
- `keyVocab: 'bil'` (restaurant) → TRUE inside **"ambil"** (take).
- `keyVocab: 'harga'` (`:38`, phone) → TRUE inside **"berharga"** (valuable).

The whole-word boundary the app already ships (`savedWordHighlight.js`'s
`(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])`, "so 'ada' won't match inside 'kepada'") returns **false** for
all three — the correct answer. (Node-verified before building.)

## Measurable Done (observable pass/fail)

- New `src/lib/wholeWordMatch.js` `containsWholeWord('Saya menunggu makanan', 'menu') === false`
  (substring impl returns `true`); `containsWholeWord('Boleh saya lihat menu?', 'menu') === true`.
- A mounted-component test: with `keyVocab:['menu']` and student text "Saya menunggu makanan", the
  green "✓ used" chip count is **0** (pre-fix: 1). With student "Boleh saya lihat menu?", it is **1**
  (positive control — the fix must not break genuine detection).
- Full gate green; lint 0 errors (no new exhaustive-deps warning — hooks untouched).

## Fix (surgical — no rewrite)

One new pure helper `src/lib/wholeWordMatch.js` (mirrors how `blankWord.js` was introduced):
- `containsWholeWord(text, word)` → boolean, drop-in for `text.includes(word)` (case-insensitive,
  Unicode-aware, phrase/hyphen-safe — same boundary as `savedWordHighlight.js`/`blankWord.js`).
- `wholeWordSplitRegex(words)` → a capturing global regex (longest-first) for `String.split`-based
  highlighting; `null` when no non-empty word.

RoleplayScorecard: swap the 4 `.includes()` → `containsWholeWord(pair.student|pair.modelAnswer, v)`;
swap the `highlightKeywords` regex → `wholeWordSplitRegex([...vocabHits, ...imbuhanHits])`. Remove the
now-unused `studentLower`/`modelLower` locals (lint). The `isVocab`/`isImbuhan` exact-equality checks
(`:449-450`) are unchanged — they still receive whole-word parts.

## What NOT to break

- `studyLang='ms'` Malay scenarios + English scenarios both render the same chips/highlights.
- Genuine multi-word phrases (`'kapal terbang'`, `'pencuci mulut'`, `'gula-gula'`) still match as a
  unit (longest-first + literal space/hyphen in the boundary regex).
- The mistake-language logging effect (`:18-46`, pinned by `roleplayScorecardMistakeLang.test.js`) is
  untouched — that test must stay green.
- No content edit, no `STORE_VERSION` bump, no schema/free-path break, `instruct.js` API untouched.

## Decide-and-flag

- *Decision:* one shared `wholeWordMatch.js` helper (boolean + split-regex), not inlined.
  *Why:* single unit-testable anchor; stops the next surface re-inlining a substring match (exactly
  the lesson of last cycle's `blankWord.js`). *Veto:* could reuse `findSavedWordMatches` for the
  boolean — rejected: it allocates a fresh regex per word per render and doesn't give a split-regex
  for the highlight; a 2-export helper is lighter and covers both needs.
- *Decision:* span-detection stays `.split`-based (minimal diff), not rewritten to span-offsets.
  *Why:* surgical; `RoleplayScorecard.jsx` carries a known exhaustive-deps warning — keep the diff
  to the matching logic.
