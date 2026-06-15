# Quiz distractors must match the answer's language (English-card quiz fix)

**Date:** 2026-06-15 · **Loop cycle (self-sourced, queue empty → GOAL-driven assessment)**
**Axis:** 2 (learning efficacy / pedagogy) + 6 (bilingual completeness) — both, one fix.

## Problem (Real — grounded, not a guess)

`generateQuizOptions(card, cardIdx, dictionary)` (`src/lib/study/quizOptions.js:24`) always draws
its 3 distractors from `Object.values(dictionary)`. The only call site is
`QuizMode.jsx:11`, where `dictionary = DICTIONARY` (`src/data/dictionary.js`) — a **Malay→English**
map, so `Object.values()` is a list of **English** gloss strings.

- **Malay card** (`card.lang === 'ms'`/undefined): `card.m` = Malay word (prompt), `card.e` = English
  gloss (correct answer). Distractors are other English glosses → **correct** (all 4 options English).
- **English card** (`card.lang === 'en'`, shipped v34 True English study mode, 2026-06-14): `card.m` =
  English word (prompt), `card.e` = **Malay** gloss (correct answer). Distractors are still **English**
  glosses → **broken**: the four options are `[Malay-gloss (correct), English, English, English]`. The
  only Malay-looking option is **always** the answer.

**Reachable:** `useStudySession.js:25` scopes the whole session to `cardsForLang(allCards, studyLang)`;
when `studyLang === 'en'` it serves only `lang:'en'` cards, and `MODES` (`Study.jsx:18`) offers Quiz with
**no lang guard**. An English learner who builds a deck (`seedEnglishStarter` / `seedAcademicEnglish` /
Import / MakeDeck) and picks Quiz hits this every card.

**Impact:** defeats the **test effect** (axis-2) — the quiz is trivially solvable by picking the only
Malay word, teaching nothing — and Quiz mode is effectively **broken for English learners** (axis-6).

## Measurable Done (observable pass/fail)

A red-proofed unit test: for an English card `{ m:'abundant', e:'banyak', lang:'en' }`, every distractor
(the 3 options that are not `card.e`) is a **Malay word** drawn from the dictionary KEYS, and **none** is
an English gloss value. Before the fix this is RED (distractors are English values); after, GREEN. The
Malay-card path stays **byte-identical** (a pinned-shuffle regression test proves the exact option list is
unchanged for `lang:'ms'`/undefined cards).

## The fix (surgical — pool by language, 1 line)

In `generateQuizOptions`, pick the distractor pool by the answer's language:

```js
// Distractors must be the SAME language as the correct answer (card.e).
// Malay card: card.e is an English gloss → distractors are other English
// glosses (dictionary VALUES). English card (v34): card.e is a Malay gloss →
// distractors must be Malay words (dictionary KEYS), else the quiz is
// trivially solvable (the only Malay-looking option is always correct).
const all = card.lang === 'en' ? Object.keys(dictionary) : Object.values(dictionary)
```

`card.lang === 'en'` is false for `'ms'`/undefined → `Object.values` → Malay path byte-identical.
`Object.keys(DICTIONARY)` is 825 real curated Malay words — a plausible distractor pool ("which Malay
word means X"). The existing `!opts.includes(r)` dedup + small-dict guard are untouched.

## What NOT to break

- Malay-card option list (must be byte-identical — pinned).
- Determinism per `(cardIdx, card.m)`; 4 unique options; null-card → `[]`; small-dict no-infinite-loop.
- No `STORE_VERSION` / schema / free-path / `instruct.js` / content change — pure logic; nothing to
  web-verify (Malay words come from the already-curated `DICTIONARY`; no new content authored).

## Decide-and-flag

- **Decision:** distractor pool = `Object.keys(dictionary)` for English cards. **Why:** the dictionary
  keys ARE the Malay vocabulary, already imported in QuizMode, 825 plausible options — same difficulty as
  the Malay path's `Object.values`. **Veto (use the reversed `dictionaryEn` Malay values instead):**
  rejected — adds an import + async chunk for no quality gain; the keys are a fine, synchronous pool.
- **Veto (add a lang guard hiding Quiz for English):** rejected — that DELETES a mode for English
  learners (axis-6 regression); fixing the pool keeps Quiz working in both languages.
