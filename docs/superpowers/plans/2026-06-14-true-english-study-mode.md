# True English Study Mode — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a student learning English (IGCSE 0510 ESL) a first-class vocab→FSRS study loop, by adding a target-language dimension to the *existing* study engine — not a parallel app.

**Architecture:** Generalize `card.m` = target word / `card.e` = L1 gloss (the study modes already treat them that way), add an additive `card.lang: 'ms'|'en'` + a persisted global `studyLang`, filter the single deck by it, and switch only the **TTS/STT locale** + a few label strings by `card.lang`. English vocab is seeded by **reversing the existing Malay↔English dictionary** and grown from the learner's own texts via the already-shipped reader. **`fsrs.js`, the reader `{pages}` core, and the gloss→FSRS pipeline are never rewritten.**

**Tech Stack:** React 19, Zustand 5 (persisted, STORE_VERSION 33→34), ts-fsrs (untouched), Web Speech API, Vitest, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-14-true-english-study-mode-design.md` (read it for WHY / the decided forks A–K / acceptance F1–F6, N1–N6, Q-*).

---

## Read-first (don't re-derive — these are the verified facts the plan rests on)

- `card.m` = prompt/target word (TTS'd), `card.e` = answer/gloss — **already** how all 6 modes work
  (`FlashcardMode.jsx:94,152`, `Listen/SpeakMode`, `Quiz/Type` check `=== card.e`). English = a `lang` flag +
  locale switch, **not** a study-loop rewrite.
- Cards have **no `lang`** today; created via `{ ...card, ...fsrsState }` (`useStore.js:1231`), deduped on
  `(m,t)` (`:1229`). STORE_VERSION = **33** (`useStore.js:38`).
- TTS/STT locale is **hardcoded `'ms-MY'`** in the study components — the only language-coupled code.
- No global study-language pref exists (grep-verified zero); persisted siblings = `ocrLang`/`asrLang`/
  `examRehearsalLang`.
- **Repo conventions (CLAUDE.md):** surgical diffs, read the full big-file before editing, `var(--color-*)`
  only, no allocation-in-selectors, lazy data chunks, FeedbackLive on any drill, ≥44px targets, pre-commit
  gate runs build+test+lint automatically.

---

## File structure (decomposition locked here)

- **Create** `src/lib/langLocale.js` — pure `localeFor(lang)` → `'ms-MY' | 'en-GB'` (single source of truth; IGCSE = British English). Tiny.
- **Create** `src/lib/langLocale.test.js`.
- **Create** `src/lib/cardLang.js` — pure `cardsForLang(cards, lang)` (the `(c.lang||'ms')` guard in one place) + `LANGS` constant.
- **Create** `src/lib/cardLang.test.js`.
- **Create** `src/lib/reverseDictionary.js` — pure `buildEnDictionary(dict, opts)` → `{ entries, stats }` (reversal + cleanup rules).
- **Create** `src/lib/reverseDictionary.test.js`.
- **Create** `scripts/build-en-dictionary.mjs` — thin wrapper: import the pure builder + `DICTIONARY`, write `src/data/dictionaryEn.js`, print the yield (Q-SEED).
- **Create (generated, committed)** `src/data/dictionaryEn.js` — `{ english: 'malay gloss' }` + a header with the build stats.
- **Modify** `src/store/useStore.js` — `lang` on every card-creation path; `studyLang` state + `setStudyLang`; **STORE_VERSION 33→34** migration (backfill card `lang:'ms'`, add `studyLang:'ms'`); `BACKUP_KEYS` += `studyLang`.
- **Create** `src/store/__tests__/studyLangMigration.test.js` — red-proofed migration + backfill.
- **Modify** `src/components/study/{FlashcardMode,ListenMode,SpeakMode}.jsx` — locale via `localeFor(card.lang)`; a couple of lang-aware label strings.
- **Modify** `src/lib/study/interleavedQueue.js` + `src/hooks/useInterleavedSession.js` — filter focal pool by active `studyLang`.
- **Modify** `src/pages/Dashboard.jsx` — counts via `cardsForLang`; the compact switcher; English empty-state.
- **Modify** `src/pages/Study.jsx` + `src/pages/SmartStudy.jsx` — source cards via `cardsForLang(cards, studyLang)`; entry switcher.
- **Modify** `src/pages/Settings.jsx` — `studyLang` segmented control (beside the other `'ms'|'en'` prefs).
- **Modify** `src/pages/Import.jsx` + `src/pages/PDFReader.jsx` — English gloss path (reversed dict + `lang:'en'`) when `studyLang==='en'`.
- *(Cuttable, Fork I)* **Modify** `Roleplay/Speaking/Grammar/Writing/Listening` — seed initial local `lang` from `studyLang`.
- **Create** `tests/e2e/study-lang.spec.js` — switch persists, English deck seeds + studies, no Malay/English mixing.
- **Modify** `RESUME_HERE.md`, `CLAUDE.md` — feature note + STORE_VERSION + seed yield + chunk note (final commit).

**Build order:** 1 locale helper → 2 card-lang filter → 3 reversed-dict core → 4 builder script + data → 5 store (lang + studyLang + migration) → 6 study-mode locale → 7 queue/Dashboard/Study filter → 8 switch UI → 9 English gloss path → 10 empty-state/onboarding → 11 (opt) surface seeding → 12 e2e → 13 docs/gate/deploy.

---

## Task 1: Locale helper (`src/lib/langLocale.js`)

**Files:**
- Create: `src/lib/langLocale.js`
- Test: `src/lib/langLocale.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/langLocale.test.js
import { describe, it, expect } from 'vitest'
import { localeFor } from './langLocale'

describe('localeFor', () => {
  it('maps ms → ms-MY (Malay)', () => { expect(localeFor('ms')).toBe('ms-MY') })
  it('maps en → en-GB (IGCSE = British English)', () => { expect(localeFor('en')).toBe('en-GB') })
  it('defaults missing/unknown lang to Malay (back-compat with un-tagged cards)', () => {
    expect(localeFor(undefined)).toBe('ms-MY')
    expect(localeFor('zz')).toBe('ms-MY')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/langLocale.test.js`
Expected: FAIL — `Failed to resolve import "./langLocale"`.

- [ ] **Step 3: Write the implementation**

```js
// src/lib/langLocale.js
// Single source of truth for the speech locale of a study language. Study modes
// must call this instead of hardcoding 'ms-MY' (Q-LOCALE). IGCSE English is the
// British exam → 'en-GB'. Unknown/undefined → Malay (back-compat: un-tagged cards
// predate the v34 `lang` field and are Malay).
export function localeFor(lang) {
  return lang === 'en' ? 'en-GB' : 'ms-MY'
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/langLocale.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/langLocale.js src/lib/langLocale.test.js
git commit -m "feat(en-study): localeFor(lang) — single TTS/STT locale source (Task 1)"
```

---

## Task 2: Deck language filter (`src/lib/cardLang.js`)

**Files:**
- Create: `src/lib/cardLang.js`
- Test: `src/lib/cardLang.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/cardLang.test.js
import { describe, it, expect } from 'vitest'
import { cardsForLang, LANGS } from './cardLang'

const cards = [
  { m: 'abang', e: 'older brother', lang: 'ms' },
  { m: 'brother', e: 'abang', lang: 'en' },
  { m: 'rumah', e: 'house' },            // un-tagged (pre-v34) → treated as Malay
]

describe('cardsForLang', () => {
  it('returns only cards of the asked language', () => {
    expect(cardsForLang(cards, 'en').map(c => c.m)).toEqual(['brother'])
  })
  it('treats a missing lang as Malay (back-compat)', () => {
    expect(cardsForLang(cards, 'ms').map(c => c.m)).toEqual(['abang', 'rumah'])
  })
  it('non-array → []', () => { expect(cardsForLang(null, 'ms')).toEqual([]) })
  it('LANGS lists the two supported languages', () => {
    expect(LANGS).toEqual(['ms', 'en'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/cardLang.test.js`
Expected: FAIL — `Failed to resolve import "./cardLang"`.

- [ ] **Step 3: Write the implementation**

```js
// src/lib/cardLang.js
// The deck is ONE array partitioned by card.lang. This guard ('ms' when absent)
// lives in exactly one place so every consumer (Dashboard counts, Study source,
// Smart-Study focal pool) filters identically and pre-v34 cards stay Malay.
export const LANGS = ['ms', 'en']

export function cardsForLang(cards, lang) {
  if (!Array.isArray(cards)) return []
  const want = lang === 'en' ? 'en' : 'ms'
  return cards.filter((c) => (c && c.lang === 'en' ? 'en' : 'ms') === want)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/cardLang.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cardLang.js src/lib/cardLang.test.js
git commit -m "feat(en-study): cardsForLang deck filter with ms back-compat guard (Task 2)"
```

---

## Task 3: Reversed-dictionary core (`src/lib/reverseDictionary.js`)

**Files:**
- Create: `src/lib/reverseDictionary.js`
- Test: `src/lib/reverseDictionary.test.js`

> Cleanup rules (spec Fork E caveats): an English headword must be a single word OR a 2-word collocation;
> drop function-word definitions containing `/` (e.g. `'is/are'`); join ≤3 distinct Malay equivalents that
> collide on one English gloss with `' / '`; lowercase the English key; never emit an empty gloss.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/reverseDictionary.test.js
import { describe, it, expect } from 'vitest'
import { buildEnDictionary } from './reverseDictionary'

describe('buildEnDictionary', () => {
  it('reverses malay→english into english→malay', () => {
    const { entries } = buildEnDictionary({ abang: 'older brother', rumah: 'house' })
    expect(entries['house']).toBe('rumah')
    expect(entries['older brother']).toBe('abang') // 2-word collocation kept
  })

  it('joins many-to-one collisions with " / " (capped at 3)', () => {
    const { entries } = buildEnDictionary({ lihat: 'to look', pandang: 'to look', tengok: 'to look', tatap: 'to look' })
    expect(entries['to look'].split(' / ')).toHaveLength(3)
  })

  it('drops function-word definitions containing a slash', () => {
    const { entries, stats } = buildEnDictionary({ adalah: 'is/are' })
    expect(entries['is/are']).toBeUndefined()
    expect(stats.droppedSlash).toBe(1)
  })

  it('drops glosses longer than 2 words', () => {
    const { entries, stats } = buildEnDictionary({ x: 'a very long phrase here' })
    expect(Object.keys(entries)).toHaveLength(0)
    expect(stats.droppedMultiWord).toBe(1)
  })

  it('reports a stats summary', () => {
    const { stats } = buildEnDictionary({ rumah: 'house', adalah: 'is/are' })
    expect(stats).toMatchObject({ source: 2, kept: 1, droppedSlash: 1 })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/reverseDictionary.test.js`
Expected: FAIL — `Failed to resolve import "./reverseDictionary"`.

- [ ] **Step 3: Write the implementation**

```js
// src/lib/reverseDictionary.js
// Pure: reverse the Malay→English DICTIONARY into an English→Malay seed for the
// English study deck. It is a STARTER (IGCSE-Malay vocab seen from the other side),
// not a curated English curriculum — the reader is the real engine (spec Fork E).
// Cleanup keeps single words + 2-word collocations, joins collisions, drops the
// rest, and logs the yield so truncation is never silent (Q-SEED).
const MAX_GLOSS_WORDS = 2
const MAX_COLLISION = 3

export function buildEnDictionary(dict, { maxGlossWords = MAX_GLOSS_WORDS, maxCollision = MAX_COLLISION } = {}) {
  const entries = {}
  const collisions = {} // enKey -> Set(malay)
  const stats = { source: 0, kept: 0, droppedSlash: 0, droppedMultiWord: 0, droppedEmpty: 0, collisionsMerged: 0 }
  for (const [malay, english] of Object.entries(dict || {})) {
    stats.source++
    const en = String(english || '').trim().toLowerCase()
    const ms = String(malay || '').trim()
    if (!en || !ms) { stats.droppedEmpty++; continue }
    if (en.includes('/')) { stats.droppedSlash++; continue }          // 'is/are' etc.
    if (en.split(/\s+/).length > maxGlossWords) { stats.droppedMultiWord++; continue }
    if (!collisions[en]) collisions[en] = new Set()
    collisions[en].add(ms)
  }
  for (const [en, msSet] of Object.entries(collisions)) {
    const list = [...msSet].slice(0, maxCollision)
    if (list.length > 1) stats.collisionsMerged++
    entries[en] = list.join(' / ')
    stats.kept++
  }
  return { entries, stats }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/reverseDictionary.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reverseDictionary.js src/lib/reverseDictionary.test.js
git commit -m "feat(en-study): pure reversed-dictionary builder + cleanup rules (Task 3)"
```

---

## Task 4: Builder script + committed `dictionaryEn.js`

**Files:**
- Create: `scripts/build-en-dictionary.mjs`
- Create (generated, committed): `src/data/dictionaryEn.js`
- Modify: `package.json` (a `build:en-dict` script)

- [ ] **Step 1: Write the builder script**

```js
// scripts/build-en-dictionary.mjs
// Regenerates src/data/dictionaryEn.js from the committed Malay→English DICTIONARY
// by reversing + cleaning it (src/lib/reverseDictionary.js). Run when dictionary.js
// changes. Prints the yield (Q-SEED) so the drop counts are visible, never silent.
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildEnDictionary } from '../src/lib/reverseDictionary.js'

// dictionary.js exports `default DICTIONARY` — import it the same way src/ does.
const { default: DICTIONARY } = await import('../src/data/dictionary.js')

const { entries, stats } = buildEnDictionary(DICTIONARY)
const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)))
const header = `// English→Malay study seed — GENERATED by scripts/build-en-dictionary.mjs (do not hand-edit).\n`
  + `// ${stats.kept} English headwords from ${stats.source} Malay entries · dropped: `
  + `${stats.droppedMultiWord} multi-word, ${stats.droppedSlash} slash-defs, ${stats.droppedEmpty} empty `
  + `· ${stats.collisionsMerged} collisions merged. STARTER set — see spec Fork E.\n`
const body = `const DICTIONARY_EN = ${JSON.stringify(sorted, null, 2)};\nexport default DICTIONARY_EN;\n`
await writeFile(join(process.cwd(), 'src', 'data', 'dictionaryEn.js'), header + body)
console.table(stats)
console.log('wrote src/data/dictionaryEn.js')
```

> **Verify at impl:** confirm `src/data/dictionary.js`'s export style (it defines `const DICTIONARY = {…}`).
> If it is NOT a default export, adjust both the import here and in `dictionaryEn.js` consumers to match
> (`Import.jsx` already imports `DICTIONARY` — copy that import style).

- [ ] **Step 2: Add the npm script + run it**

In `package.json` `scripts`: `"build:en-dict": "node scripts/build-en-dictionary.mjs"`.
Run: `npm run build:en-dict`
Expected: a `console.table` of stats (kept/dropped counts) + `src/data/dictionaryEn.js` written with a few
hundred entries. **Eyeball ~10 random entries** for sane Malay glosses (manual quality pass, spec §8).

- [ ] **Step 3: Lazy-load guard (N4) — confirm it is NOT eagerly imported**

`dictionaryEn.js` must only be imported where English is actually used (the English gloss path + the starter
seed action), via dynamic `import('../data/dictionaryEn.js')` or inside a code-split page — NOT at the top of
`useStore.js`/`App.jsx`. (It rides the data chunk like `dictionary.js`, which is already split.)

- [ ] **Step 4: Commit**

```bash
git add scripts/build-en-dictionary.mjs src/data/dictionaryEn.js package.json
git commit -m "feat(en-study): generate committed English→Malay study seed (Task 4)"
```

---

## Task 5: Store — `lang` on cards, `studyLang` pref, STORE_VERSION 33→34

**Files:**
- Modify: `src/store/useStore.js`
- Test: `src/store/__tests__/studyLangMigration.test.js`

> Mirrors the shipped `examRehearsalLang`/`asrLang` pref pattern (persisted, `commitPrefMutation`, BACKUP_KEYS).
> **Read the full store region first** (initial state, the card-creation paths, the migrate callback,
> BACKUP_KEYS) before editing — big-file surgical-diff rule.

- [ ] **Step 1: Write the failing migration test**

```js
// src/store/__tests__/studyLangMigration.test.js
import { describe, it, expect } from 'vitest'
import { migrate, STORE_VERSION } from '../useStore' // export `migrate` if not already (see Step 3)

describe('STORE_VERSION 34 — English study mode', () => {
  it('bumped to 34', () => { expect(STORE_VERSION).toBe(34) })

  it('backfills lang:ms on existing cards and adds studyLang:ms', () => {
    const old = { cards: [{ m: 'rumah', e: 'house' }, { m: 'abang', e: 'older brother', lang: 'ms' }] }
    const next = migrate(old, 33)
    expect(next.cards.every(c => c.lang === 'ms')).toBe(true)
    expect(next.studyLang).toBe('ms')
  })

  it('does not clobber an already-tagged English card', () => {
    const old = { cards: [{ m: 'brother', e: 'abang', lang: 'en' }] }
    const next = migrate(old, 33)
    expect(next.cards[0].lang).toBe('en')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- studyLangMigration`
Expected: FAIL — `STORE_VERSION` is 33 / `migrate` not exported or no studyLang.

- [ ] **Step 3: Implement the store changes**

1. **Initial state:** add top-level `studyLang: 'ms',` (near the other prefs).
2. **Setter:** beside `setExamRehearsalLang`, add
   `setStudyLang: (lang) => get().commitPrefMutation(() => ({ studyLang: lang === 'en' ? 'en' : 'ms' })),`.
3. **Card creation paths — stamp `lang`:** every place a card object is built needs `lang`. The default comes
   from the *active* `studyLang` unless the caller passes one:
   - In `addCard`/`addCards`: `addedCard = { ...card, lang: card.lang || get().studyLang || 'ms', ...fsrsState }`
     (and the same for the `addCards` map). The dedupe key stays `(m, t)` — **but** because an English card can
     share an `m` spelling with nothing Malay (different words), no extra key change is needed; if a future
     collision matters, widen to `(m, t, lang)` — flag, don't pre-optimize.
   - Confirm `promoteMistakeToCard` sets `lang` from the mistake's `language` if present, else `studyLang`
     (Phase 1 promotion is still Malay-gated, so this is forward-compat only).
4. **STORE_VERSION:** `33` → `34` + update the inline comment to mention `lang` on cards + `studyLang`.
5. **`BACKUP_KEYS`:** add `'studyLang'` so export/import round-trips it.
6. **`migrate` callback:** add a `version < 34` block that maps `state.cards` to `{ ...c, lang: c.lang || 'ms' }`
   and sets `studyLang: state.studyLang || 'ms'`. **Preserve all other fields** (spread, don't replace).
   If `migrate` isn't currently a named export, export it (or expose a tiny pure `migrateState(state, from)`
   the persist `migrate` calls) so the test can hit it directly.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- studyLangMigration`
Expected: PASS.

- [ ] **Step 5: Full unit run (no regression in existing store tests)**

Run: `npm run test:run`
Expected: all green (existing card/sync/migration suites unaffected — changes are additive).

- [ ] **Step 6: Commit**

```bash
git add src/store/useStore.js src/store/__tests__/studyLangMigration.test.js
git commit -m "feat(en-study): card lang + studyLang pref + STORE_VERSION 34 migration (Task 5)"
```

---

## Task 6: Study modes speak the card's language

**Files:**
- Modify: `src/components/study/FlashcardMode.jsx`, `ListenMode.jsx`, `SpeakMode.jsx`

> Read each full component first. The ONLY changes: replace hardcoded `'ms-MY'` / bare `speak(card.m)` with
> `localeFor(card.lang)`, and make the 1–2 hardcoded language label strings lang-aware. Quiz/Type/Cloze are
> already direction-neutral (they compare to `card.e`) — leave them.

- [ ] **Step 1: FlashcardMode — locale by card.lang**

Import: `import { localeFor } from '../../lib/langLocale'`. Then:
- Line ~94: `speak(card.m, 'ms-MY', 0.85, {…})` → `speak(card.m, localeFor(card.lang), 0.85, {…})`.
- Line ~152: same replacement.
- Line ~306: `speak(card.m)` → `speak(card.m, localeFor(card.lang))`.
- Any visible "Malay"/"in Malay" label near the speak button → derive from `card.lang`
  (e.g. `card.lang === 'en' ? 'English' : 'Malay'`).

- [ ] **Step 2: ListenMode — locale + lang-aware feedback**

- Line ~26: `speak(card.m)` → `speak(card.m, localeFor(card.lang))` (import `localeFor`).
- The `FeedbackLive` text (`${card.m} means ${card.e}`) reads fine for both directions — leave the wording.

- [ ] **Step 3: SpeakMode — STT locale by card.lang**

- Line ~54: `startRecognition('ms-MY')` → `startRecognition(localeFor(card.lang))` (import `localeFor`).
- Keep the existing `hasSpeechRecognition()` guard.

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: build green; 0 lint errors (no new exhaustive-deps warnings).

- [ ] **Step 5: Commit**

```bash
git add src/components/study/FlashcardMode.jsx src/components/study/ListenMode.jsx src/components/study/SpeakMode.jsx
git commit -m "feat(en-study): study modes use localeFor(card.lang) for TTS/STT (Task 6)"
```

---

## Task 7: Filter the deck by `studyLang` (Dashboard, Study, Smart-Study)

**Files:**
- Modify: `src/pages/Dashboard.jsx`, `src/pages/Study.jsx`, `src/pages/SmartStudy.jsx`, `src/lib/study/interleavedQueue.js`, `src/hooks/useInterleavedSession.js`

> Pattern: read `studyLang` from the store (extract the value, NOT inside a selector that allocates), then
> source cards through `cardsForLang(cards, studyLang)`. Do NOT change `fsrs.js` — pass it pre-filtered cards.

- [ ] **Step 1: interleavedQueue — accept a pre-filtered pool**

`selectFocalCards`/`buildSession` already take `cards`. The cleanest change keeps them pure: the **caller**
(`useInterleavedSession`) passes `cardsForLang(cards, studyLang)` as the `cards` argument, and the
hypercorrection/mistake lookups (`cards.find(c => c.m === word)`) then naturally only see the active language.
Add a unit test in `interleavedQueue.test.js` (or the hook test) that a session built from a mixed pool +
`lang='en'` contains only English cards.

```js
// add to the relevant existing test file
it('a session sources only the active language', () => {
  const cards = [{ m: 'rumah', e: 'house', lang: 'ms', state: 2, due: '2000-01-01' },
                 { m: 'house', e: 'rumah', lang: 'en', state: 2, due: '2000-01-01' }]
  const session = buildSession({ cards: cardsForLang(cards, 'en'), grammarCards: {}, /* …existing args… */ })
  expect(session.every(t => !t.card || t.card.lang === 'en')).toBe(true)
})
```

- [ ] **Step 2: useInterleavedSession — feed the filtered pool**

Import `cardsForLang`; read `studyLang` (value, not in selector); pass `cardsForLang(cards, studyLang)` where it
currently passes `cards`. Verify the failing test from Step 1 now passes.

- [ ] **Step 3: Dashboard — counts + Study/SmartStudy source by language**

- Dashboard: `const studyLang = useStore(s => s.studyLang) || 'ms'`; then
  `const langCards = useMemo(() => cardsForLang(cards, studyLang), [cards, studyLang])`; feed `langCards` into
  `countMastered(...)`, `getDueCards(...)`, deck-size, study-plan inputs (replace the bare `cards`).
- Study.jsx / SmartStudy.jsx: source the session deck from `cardsForLang(cards, studyLang)`.

- [ ] **Step 4: Run unit + build**

Run: `npm run test:run -- interleavedQueue && npm run build`
Expected: the new "only active language" test passes; build green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.jsx src/pages/Study.jsx src/pages/SmartStudy.jsx src/lib/study/interleavedQueue.js src/hooks/useInterleavedSession.js src/lib/study/interleavedQueue.test.js
git commit -m "feat(en-study): scope Dashboard/Study/Smart-Study to studyLang (Task 7)"
```

---

## Task 8: The `studyLang` switch UI (Settings + Dashboard/Study)

**Files:**
- Modify: `src/pages/Settings.jsx`, `src/pages/Dashboard.jsx` (+ optionally a tiny `src/components/StudyLangSwitch.jsx`)

> Page UI rides on build/lint + the e2e (Task 12) — repo norm (pages aren't unit-tested). Use `var(--color-*)`,
> ≥44px targets, labels on fills use `var(--color-on-bright)`.

- [ ] **Step 1: Settings — segmented control**

Beside the other language prefs, add a "Study language" segmented control bound to `studyLang`/`setStudyLang`
(🇲🇾 Malay / 🇬🇧 English), with a one-line helper: *"Pick the language you're revising. Switch any time — your
Malay and English decks stay separate."* Use the shipped `InfoPreview` `(?)` pattern if a visual aid helps.

- [ ] **Step 2: Dashboard/Study — compact switcher**

A small inline switch at the top of the Dashboard (and Study/Smart-Study entry) reading
`Studying: 🇲🇾 Malay ▾ / 🇬🇧 English`, one tap to flip. Optionally extract `StudyLangSwitch.jsx` and reuse in
both. Reads `studyLang`, calls `setStudyLang`.

- [ ] **Step 3: Build + lint + eyeball**

Run: `npm run build && npm run lint`
Expected: green. Eyeball dark + light, mobile 390×844.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.jsx src/pages/Dashboard.jsx src/components/StudyLangSwitch.jsx
git commit -m "feat(en-study): studyLang switch in Settings + Dashboard/Study (Task 8)"
```

---

## Task 9: English gloss path (Import + PDFReader)

**Files:**
- Modify: `src/pages/Import.jsx`, `src/pages/PDFReader.jsx`

> When `studyLang==='en'`, a tapped/imported English word is looked up in the reversed dict for a Malay gloss,
> and the created card is `{ m:English, e:Malay, lang:'en' }`. When `'ms'`, behaviour is exactly as today.

- [ ] **Step 1: Import.jsx — English lookup + card lang**

- Lazy-load the seed where used: `const { default: DICTIONARY_EN } = await import('../data/dictionaryEn.js')`
  (or a top-of-handler dynamic import; keep it off the eager path — N4).
- In the word-analysis path, when `studyLang==='en'` look up `DICTIONARY_EN[clean]` for the Malay gloss
  (mirror the existing `DICTIONARY[clean]` Malay path).
- In the card-build map (currently `m: w.word, e: w.meaning`), when `studyLang==='en'` set
  `{ m: w.word /* English */, e: w.meaning /* Malay gloss */, lang: 'en', t: deck, … }`. `addCards` will also
  stamp `lang` from `studyLang` (Task 5), so passing `lang:'en'` explicitly is belt-and-suspenders + correct
  when the active language differs.

- [ ] **Step 2: PDFReader.jsx — English gloss in the tap→card path**

Find the gloss/`addCards` path (uses `g.malay`/`g.display`). When `studyLang==='en'`, resolve the gloss via
`DICTIONARY_EN` (lazy import) and build `{ m: <englishWord>, e: <malayGloss>, lang: 'en', … }`. **Do not touch**
the reveal-gate / `{pages}` reader core (N1) — only the card object that the existing add path produces.

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: green; confirm `dictionaryEn.js` lands in a lazy/data chunk, eager `index` ~unchanged (N4).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Import.jsx src/pages/PDFReader.jsx
git commit -m "feat(en-study): English gloss path for Import + reader when studyLang=en (Task 9)"
```

---

## Task 10: English empty-state + "Start your English deck"

**Files:**
- Modify: `src/pages/Dashboard.jsx` (and/or `Study.jsx` empty state)

- [ ] **Step 1: Seed action (store) — `seedEnglishStarter`**

Add a store action that lazy-imports `dictionaryEn.js`, maps a capped starter slice (e.g. first ~50 by
frequency-agnostic order, or all — DECIDE-AND-FLAG: default **all kept entries**, veto = cap to 50) into
`{ m:english, e:malay, t:'English', lang:'en' }` cards via the existing `addCards` (which dedupes + stamps
FSRS). Guard: a try/catch around the import → no-op on failure (never break the dashboard).

- [ ] **Step 2: Empty-state UI**

When `studyLang==='en'` and `cardsForLang(cards,'en').length === 0`, the Dashboard/Study shows a non-punitive
card: *"Start your English deck"* with two CTAs — **"Add the starter set (N words)"** (calls
`seedEnglishStarter`) and **"Import an English text"** (routes to `/pdf-reader` or `/import`). Mirror the
existing empty-state copy tone.

- [ ] **Step 3: Build + lint + eyeball**

Run: `npm run build && npm run lint`
Expected: green; eyeball the empty state in both themes with `studyLang='en'` and an empty English deck.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx src/store/useStore.js
git commit -m "feat(en-study): English empty-state + Start-your-English-deck seed (Task 10)"
```

---

## Task 11 (OPTIONAL — Fork I cut-line): bilingual surfaces follow `studyLang`

**Files:**
- Modify: `src/pages/Roleplay.jsx`, `Speaking.jsx`, `Grammar.jsx`, `Writing.jsx`, `Listening.jsx`

> The one task you can cut to stay bounded. It only changes the *initial* value of each page's existing local
> toggle — the toggle stays (N6).

- [ ] **Step 1: Seed initial toggle from studyLang**

In each page, read `studyLang` and use it as the initial `useState` for the local `lang` (mapping `'ms'|'en'`
to whatever that page's toggle expects — e.g. Grammar uses `'malay'|'english'`, Writing uses `'eng'|'ms'`; map
accordingly). Keep the toggle fully functional.

- [ ] **Step 2: Build + lint + commit**

Run: `npm run build && npm run lint`
Expected: green; the MS/EN toggles still flip on each page.
```bash
git add src/pages/Roleplay.jsx src/pages/Speaking.jsx src/pages/Grammar.jsx src/pages/Writing.jsx src/pages/Listening.jsx
git commit -m "feat(en-study): bilingual surfaces default their toggle to studyLang (Task 11)"
```

---

## Task 12: e2e — switch persists, English deck works, no mixing

**Files:**
- Create: `tests/e2e/study-lang.spec.js`

> Use the `bindStore()` pattern from `mistake-promotion.spec.js` (the Vite `?t=` module-URL trap) to seed/read
> store state. Re-bind after every `goto`/`reload`.

- [ ] **Step 1: Write the e2e**

```js
// tests/e2e/study-lang.spec.js
import { test, expect } from '@playwright/test'

test('studyLang switch persists across reload', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /English/i }).first().click() // the Study-language control
  await page.reload()
  await page.goto('/settings')
  await expect(page.getByRole('button', { name: /English/i }).first()).toHaveAttribute('aria-pressed', 'true')
})

test('English empty state seeds a deck, then Study shows only English cards', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /English/i }).first().click()
  await page.goto('/')
  await page.getByRole('button', { name: /Add the starter set/i }).click()
  await expect(page.getByText(/Due|cards/i)).toBeVisible()
  // No Malay-only voice/word leaks into the English session — spot-check a known English headword renders.
  await page.goto('/study')
  await expect(page.locator('body')).not.toContainText('Maximum update depth')
})
```

- [ ] **Step 2: Run + iterate selectors to green**

Run: `npm run test:e2e -- study-lang`
Expected: PASS (adjust role/name selectors to the real control labels from Task 8/10).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/study-lang.spec.js
git commit -m "test(en-study): studyLang switch + English deck + no-mixing e2e (Task 12)"
```

---

## Task 13: Docs, full gate, deploy

**Files:**
- Modify: `RESUME_HERE.md`, `CLAUDE.md`

- [ ] **Step 1: Full gate**

Run: `npm run build && npm run test:run && npm run lint && npm run test:e2e -- study-lang`
Expected: build green (note the data-chunk size for `dictionaryEn.js`; confirm eager `index` ~unchanged, N4);
all unit tests green incl. the new pure cores + migration; 0 lint errors; the new e2e green.

- [ ] **Step 2: Eyeball** (manual): the switch in Settings + Dashboard; English empty-state → seed → study an
English card (flashcard speaks an English voice if available); flip back to Malay → the Malay deck is intact and
unchanged. Dark + light, mobile 390×844.

- [ ] **Step 3: Update docs**

`CLAUDE.md`: add "English-as-target study mode (0510 ESL): `studyLang` pref + `card.lang`; deck filtered by
`cardsForLang`; `m`=target/`e`=gloss generalization; English seed = reversed dictionary (`dictionaryEn.js`) +
reader-grown" to the overview + state-management notes; bump the STORE_VERSION line to 34.
`RESUME_HERE.md`: a SHIPPED block (STORE_VERSION 34, the seed yield number, the new lazy chunk size, the Phase-2
follow-ups: 0500 academic vocab, BYOK 0510 seed, productive direction, per-language streaks, English
mistake-promotion, English `unknownDensity`). Move the "True English study mode" item out of ▶️ Next.

- [ ] **Step 4: Commit (gate runs automatically) + confirm prod**

```bash
git add CLAUDE.md RESUME_HERE.md
git commit -m "docs(en-study): true English study mode Phase 1 shipped — STORE_VERSION 34, seed yield (Task 13)"
```
Then confirm the PUBLIC Vercel deploy reaches READY (upg- project).

---

## ▶️ BOUNDED PHASE-1 BUILD KICKOFF (paste to start the build session)

> Smallest shippable slice. No spike needed (no model/toolchain risk — it's data + wiring). **Start at Task 1.**
> Approve with **"build phase 1"**, or veto any single decision (Forks A–K in the spec) in one line and I'll
> adjust the plan first.

```
Build Phase 1 of "True English study mode" — first-class IGCSE 0510 (English as a Second
Language) vocab→FSRS study, by adding a target-language dimension to the EXISTING study
engine. Spec + plan are committed:
  docs/superpowers/specs/2026-06-14-true-english-study-mode-design.md
  docs/superpowers/plans/2026-06-14-true-english-study-mode.md

WHY: the app is bilingual on its practice surfaces but Malay-primary in its core vocab loop —
an English learner has no first-class deck. The fix is small: the study modes ALREADY treat
card.m = prompt word / card.e = gloss, so English = a card.lang flag + a TTS/STT locale switch
+ content, NOT a study-loop rewrite. English vocab is seeded by reversing the existing
Malay↔English dictionary and grown from the learner's own texts via the shipped reader.

DO, in plan order, TDD (red watched before green), gate green per commit:
  Tasks 1–3  pure cores: localeFor(lang) · cardsForLang(cards,lang) · buildEnDictionary (reverse+clean)
  Task 4     scripts/build-en-dictionary.mjs → committed src/data/dictionaryEn.js (lazy-only import; print yield)
  Task 5     store: card.lang on every creation path · studyLang pref+setter · STORE_VERSION 33→34 migration
             (backfill lang:'ms', add studyLang:'ms') · BACKUP_KEYS. Red-proof the migration.
  Task 6     study modes speak card's language (localeFor(card.lang)) — the ONLY language-coupled code
  Task 7     filter Dashboard counts + Study + Smart-Study focal pool by studyLang (pass fsrs.js pre-filtered cards)
  Task 8     studyLang switch UI: Settings segmented control + compact Dashboard/Study switcher
  Task 9     English gloss path in Import + PDFReader when studyLang='en' (reversed dict → {m:EN,e:MS,lang:'en'})
  Task 10    English empty-state + "Start your English deck" seed action
  Task 11    OPTIONAL (Fork I cut-line): bilingual surfaces default their toggle to studyLang — CUT to stay bounded if needed
  Task 12    e2e study-lang.spec.js (switch persists · seed+study · no MS/EN mixing) — bindStore() ?t= trap applies
  Task 13    docs + full gate + record seed yield + STORE_VERSION 34 + confirm Vercel READY

OBSERVABLE DONE: flip Settings→English → Dashboard/Study show ONLY English cards → "Add the
starter set" seeds an English deck → study a flashcard and it speaks an English voice → flip
back to Malay and the Malay deck is byte-identical to before. studyLang persists across reload
(v34). Eager index bundle ~unchanged (dictionaryEn.js is a lazy/data chunk). Existing Malay
users see zero change until they flip the switch.

DON'T BREAK / CONSTRAINTS (N1–N6): do NOT rewrite fsrs.js, the reveal-gated {pages} reader core,
or the gloss→FSRS pipeline. No new route (reuse /study /smart-study /dashboard). Migration is
additive + reversible; pre-v34 cards read as Malay via (card.lang||'ms'). One active language
(ADD-first); the existing per-surface MS/EN toggles stay. var(--color-*) only; ≥44px targets.

DECIDE & FLAG every remaining fork (veto note each). Questions only for destructive/money/invariant.
VERIFY: the session opens by reading the spec + plan, then starts at Task 1. First green commit =
the pure src/lib/langLocale.js helper.
```

---

## Self-review (plan ↔ spec)

**Spec coverage:** F1→T5/T8; F2→T7; F3→T6; F4→T10; F5→T9; F6→T5 (migration defaults). N1→T6/T7/T9 (no core rewrite); N2→Fork D (no route task); N3→T5 migration; N4→T4 Step 3 + T9 Step 3 (lazy data chunk); N5→T8 (one switch); N6→T11 (toggle kept). Q-SEED→T4 (printed stats + header); Q-LOCALE→T1 (single helper, tested); Q-MIGRATION→T5 (red-proofed). Forks: A→copy framing (T8/T13); B→T5/T6 (m/e generalization); C→T5/T7/T8; D→no-route (whole plan); E→T3/T4/T9/T10; F→T5/T7; G→T5; H→T8; I→T11 (cuttable); J→shared (no task = correct); K→receptive only (no task = correct).

**Placeholder scan:** the "verify at impl" notes (dictionary.js export style in T4; exact line numbers in T6; page toggle value-maps in T11; selector labels in T12) are explicit verify-steps with defaults, not blanks. The starter-seed cap (T10) and the dedupe-key widening (T5) are decide-and-flag defaults with veto notes, not TODOs.

**Type consistency:** `localeFor(lang)→'ms-MY'|'en-GB'` (T1) consumed in T6. `cardsForLang(cards,lang)→Card[]` (T2) consumed in T7/T10/T12. `buildEnDictionary(dict)→{entries,stats}` (T3) consumed by the T4 script (writes `DICTIONARY_EN` default export) consumed in T9/T10. `studyLang`/`setStudyLang` (T5) consumed in T6-pool/T7/T8/T9/T10/T11. `card.lang` stamped in T5, read in T6/T7. `migrate(state, from)` (T5) hit by the T5 test. Consistent.

**Honest scope flags:** Task 11 is explicitly cuttable (Fork I); English mistake-promotion + English `unknownDensity` + productive direction + per-language streaks + a curated 0510/0500 seed are all Phase 2 (spec §7 OUT) — not silently dropped.
