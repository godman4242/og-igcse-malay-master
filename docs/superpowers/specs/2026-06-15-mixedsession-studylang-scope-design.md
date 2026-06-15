# MixedSession must respect the global `studyLang` (v34) — design

**Date:** 2026-06-15 · **Loop cycle:** local build loop, self-sourced (queue empty → GOAL-driven)
**Axes:** 6 (bilingual completeness) + 2 (learning efficacy / documented invariant)

## Problem (Real — grounded, traced, reachable)

The Dashboard "Mix" quick-action (`Dashboard.jsx:805`, shown **unconditionally**, no `studyLang`
gate) mounts `MixedSession`. `MixedSession.jsx:26` reads `s.cards` (the **full deck**) and
`:33` calls `buildMixedSession({ cards, grammarCards })` — **with no `studyLang` scoping**, unlike
every other study surface (`useStudySession.js:25`, `ForYou`, Dashboard counts, `SmartSession`),
which all apply `cardsForLang(cards, studyLang)`.

Consequences for a learner studying English (`studyLang==='en'`) who also has Malay cards (the
common case — they start Malay, then seed English):

1. **Invariant break (axis-6/2).** The session mixes **Malay + English vocab** AND **Malay-only
   imbuhan/tense grammar drills** (`buildMixedSession` hardcodes `IMBUHAN_DRILLS`/`TENSE_DRILLS`/
   `ERROR_DRILLS`/`TRANSFORM_DRILLS` — imbuhan is a Malay-only concept; there is no English grammar
   in this builder). CLAUDE.md states the v34 invariant: *"Malay & English decks never mix in one
   session."* MixedSession was missed during the v34 scoping sweep.
2. **Wrong-language labels (axis-6).** In the vocab **variant** block (`MixedSession.jsx:259-331`)
   the input placeholder is hardcoded `"Type the Malay word..."` (`:318`) and the feedback is
   hardcoded `'Betul!'` / `` `Jawapan: ${answer}` `` (`:326`) — Malay, even for an English card
   whose target word (`card.m`) is English. (The badge was already fixed via
   `variantInfoFor(variant, lang)` at `:173`; the placeholder + feedback were missed.)

This is the **same bug class** as the already-fixed Quiz-distractor (2026-06-15) and TypeMode/QuizMode
instruction-language (`typeModeLang.test.js`) v34 leaks.

## Measurable Done (observable pass/fail — red-proof first)

1. `buildMixedSession({ cards: [en+ms cards], grammarCards, lang: 'en' })` → **zero** `grammar`-type
   items (RED today: returns 5; the `lang` arg is ignored entirely).
2. **Malay path byte-identical:** `buildMixedSession({ cards, grammarCards })` (no `lang`) and
   `lang:'ms'` both keep the existing target math (grammar 5 / vocab 8 / comp 2 at defaults) — the
   9 existing `interleave.test.js` cases stay green.
3. Mount `MixedSession` with `studyLang:'en'` + a mixed deck → the session shows **only** English
   cards (the Malay card's word is absent) and the variant input placeholder reads
   `"Type the English word..."`, **not** `"Type the Malay word..."` (RED before: full deck + Malay
   placeholder).
4. Mount with `studyLang:'ms'` → only Malay cards, placeholder `"Type the Malay word..."` (byte-id).

## Fix (surgical)

- **`src/lib/interleave.js`** — `buildMixedSession({ cards, grammarCards, settings, lang })`:
  `malayGrammar = lang !== 'en'`; when false, `allDrills = []` and `gTarget = 0` (slots fold into
  vocab/comprehension via the existing `cTarget = max(1, sessionSize - vTarget - gTarget)`). `lang`
  absent / `'ms'` ⇒ `malayGrammar` true ⇒ **byte-identical** Malay path.
- **`src/components/MixedSession.jsx`** — read `studyLang`; build from
  `cardsForLang(cards, studyLang)` and pass `lang: studyLang`; `const isEnItem = current?.item?.lang
  === 'en'`; placeholder + variant feedback flip on `isEnItem` (mirrors the tested ProduceMode
  inline pattern; English feedback uses `"Correct!"`/`"Answer:"` matching the comprehension block's
  existing English labels at `:401`).

## Decide-and-flag forks (pre-resolved)

- **English grammar in Mixed Session?** *Decision:* EXCLUDE. *Why:* no English grammar drills are
  wired into `buildMixedSession` (imbuhan/tense are Malay-only); an English session = vocab +
  comprehension. *Veto:* wiring English grammar (Confusables/SVA/Articles) into the mixer is a
  separate feature, out of scope for a bug fix.
- **Grammar's freed slots.** *Decision:* `gTarget = 0` for English → `cTarget` absorbs them (more
  comprehension cloze). *Veto:* leaving `gTarget = 5` would waste slots → a smaller English session.
- **Variant feedback strings.** *Decision:* en → `"Correct!"` / `"Answer:"`; ms → `"Betul!"` /
  `"Jawapan:"` (unchanged). *Why:* matches the comprehension block's existing English style; Malay
  immersion preserved for Malay sessions.

## What NOT to break

- The Malay Mixed Session (target math, grammar/comp/standard-vocab rendering) — byte-identical.
- The 9 existing `interleave.test.js` cases.
- No `STORE_VERSION` bump (no stored-format change), no schema/free-path break, no `instruct.js`
  touch, no feature deleted, no content authored (nothing to web-verify — pure logic + UI labels).

## Verification

TDD red-proof: `interleave.test.js` (+lang-scoping cases) and a new
`src/components/__tests__/mixedSessionLang.test.js` (store-driven mount, mirrors `forYouLang.test.js`)
— both RED first, then GREEN. Gate: build + test:run + lint. UI-affecting → spot-check the rendered
placeholder via the mount test (jsdom has layout-free DOM, sufficient for text assertions).
