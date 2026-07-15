# Dictionary Example Sentences — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every one of the 825 Malay dictionary words a verified example sentence, so cloze/Produce/context study works for any word — not just the 254 topic-pack words that have one today.

**Architecture:** Additive. Grow the existing parallel map `src/data/dictionaryExamples.js` (254 → 825), wire the 3 remaining card-creation paths to consult `getExample()`, and add a hard content-lint guard that keeps every *existing* example blank-able for cloze. `dictionary.js` is never touched (its string-map shape is the one hard invariant). Content lands in gate-green batches (~45 words each); this plan covers the machinery + Batch 1.

**Tech Stack:** React 19, Zustand, Vitest, Node ESM lint scripts. Spec: `docs/superpowers/specs/2026-07-15-dictionary-examples-design.md`.

## Global Constraints

- **`src/data/dictionary.js` values MUST stay strings** — never edited by this work (pinned by `dictionary.test.js`, `contentLint.test.js`, `listeningMistakes.test.js`).
- **No STORE_VERSION bump** — examples ride the existing optional `ex` card field.
- **Example house style:** 7–15 words, IGCSE-standard register, headword used *naturally* as a whole word inside the sentence, concrete/situational (never a definition).
- **Every new example web-verified** (PRPM / Kamus Dewan / native corpora), never memory alone — a wrong Malay example is confident-wrong (the worst defect). Compose from words already in the dictionary where natural (comprehensible input).
- **Gate green per batch:** `npm run build` + `npm run test:run` + `npm run lint`.

---

### Task 1: Example-quality guard + fix the 4 flagged entries + soft-lint report

**Files:**
- Modify: `scripts/lint-content.mjs` (add `lintExampleQuality`)
- Modify: `src/data/__tests__/contentLint.test.js` (add guard tests)
- Modify: `src/data/dictionaryExamples.js` (fix 4 entries: `goreng`, `basikal`, `baca`, `suami`)
- Create: `scripts/report-example-vocab.mjs` (soft, non-gated vocab report)

**Interfaces:**
- Produces: `lintExampleQuality(examples: Record<string,string>) => string[]` (empty ⇒ clean). Reuses `blankInExample` from `src/lib/blankWord.js` so "headword present as a whole word" means *exactly* "cloze can blank it."

- [ ] **Step 1: Add the guard to `scripts/lint-content.mjs`** (after `lintDictionaryHeader`):

```js
import { blankInExample } from '../src/lib/blankWord.js'

// Every dictionary example must be blank-able for cloze/Produce: a non-empty
// string, 5–18 words, with the headword present as a WHOLE word (same matcher
// the study surfaces use). Guards only the entries that EXIST — never asserts
// "every dictionary word has an example" (that would redden the gate through
// the multi-session grind; completeness is flipped on in the final batch).
export function lintExampleQuality(examples) {
  const errors = []
  for (const [word, ex] of Object.entries(examples)) {
    if (typeof ex !== 'string' || !ex.trim()) { errors.push(`${word}: empty/invalid example`); continue }
    const wc = ex.trim().split(/\s+/).length
    if (wc < 5 || wc > 18) errors.push(`${word}: ${wc} words (want 5–18)`)
    if (blankInExample(ex, word) === ex) errors.push(`${word}: headword not present as a whole word (cloze can't blank it)`)
  }
  return errors
}
```

- [ ] **Step 2: Add tests to `src/data/__tests__/contentLint.test.js`** (mirror the existing `lintDictionaryHeader` block; add the import `lintExampleQuality` and `import EXAMPLES from '../dictionaryExamples.js'`):

```js
describe('lintExampleQuality', () => {
  it('flags an empty example', () => {
    expect(lintExampleQuality({ air: '' })[0]).toMatch(/empty/)
  })
  it('flags a too-short example', () => {
    expect(lintExampleQuality({ air: 'Air sejuk.' })[0]).toMatch(/words/)
  })
  it('flags a headword hidden inside a longer word (not blank-able)', () => {
    // "membaca" contains "baca" but not as a whole word
    expect(lintExampleQuality({ baca: 'Saya suka membaca buku cerita setiap malam hari.' })[0])
      .toMatch(/whole word/)
  })
  it('passes a clean example', () => {
    expect(lintExampleQuality({ air: 'Saya minum air sejuk selepas berlari di padang.' })).toEqual([])
  })
  it('the REAL dictionaryExamples all pass the quality guard', () => {
    expect(lintExampleQuality(EXAMPLES)).toEqual([])
  })
})
```

- [ ] **Step 3: Run — verify the REAL-data test FAILS on the 4 known entries**

Run: `npx vitest run src/data/__tests__/contentLint.test.js -t "quality"`
Expected: the "REAL dictionaryExamples all pass" case FAILS listing `goreng`, `basikal`, `baca`, `suami` (headword not a whole word). The 4 unit cases PASS (guard logic works). This is the red-proof.

- [ ] **Step 4: Web-verify + fix the 4 entries in `src/data/dictionaryExamples.js`** so the bare headword appears (keep 7–15 words, IGCSE register). Candidate replacements to verify against PRPM/Kamus Dewan before committing:

```js
'goreng': 'Nasi goreng ialah makanan kegemaran keluarga saya.',
'basikal': 'Saya menunggang basikal ke sekolah setiap pagi.',
'baca': 'Baca buku ini dengan teliti sebelum peperiksaan.',
'suami': 'Suami Puan Aminah bekerja sebagai seorang guru.',
```

- [ ] **Step 5: Run — verify GREEN**

Run: `npx vitest run src/data/__tests__/contentLint.test.js`
Expected: all pass, including "REAL dictionaryExamples all pass the quality guard".

- [ ] **Step 6: Add the soft vocab report `scripts/report-example-vocab.mjs`** (a tool I read while authoring; NOT imported by any test):

```js
// Reports content words used in examples that are NOT in dictionary.js (minus a
// closed-class allowlist). Lower is better = more comprehensible input. Advisory
// only — natural sentences win over a zero score. Run: node scripts/report-example-vocab.mjs
import DICTIONARY from '../src/data/dictionary.js'
import EXAMPLES from '../src/data/dictionaryExamples.js'

const ALLOW = new Set([
  // pronouns / determiners / particles / conjunctions / prepositions
  'saya','awak','dia','kami','kita','mereka','anda','aku','engkau','kau','beliau','nya','ku','mu',
  'ini','itu','yang','dan','atau','tetapi','tapi','kerana','sebab','jika','kalau','untuk','pada','di','ke','dari','dengan','oleh','akan','telah','sudah','sedang','masih','juga','pula','lah','kah','pun','para','se','ia','adalah','ialah','tidak','tak','bukan','ada','sangat','amat','sekali','lebih','paling','setiap','semua','banyak','sedikit','beberapa','ramai','para',
  // common numbers / time
  'satu','dua','tiga','pukul','tahun','hari','pagi','petang','malam','tadi','nanti','esok','semalam',
])
const dictKeys = new Set(Object.keys(DICTIONARY))
const strip = w => w.toLowerCase().replace(/[^a-zÀ-ɏ-]/g,'')
let totalOOV = 0
for (const [word, ex] of Object.entries(EXAMPLES)) {
  const oov = ex.split(/\s+/).map(strip).filter(Boolean)
    .filter(w => w !== word && !dictKeys.has(w) && !ALLOW.has(w))
  if (oov.length) { totalOOV += oov.length; console.log(`${word.padEnd(20)} OOV: ${[...new Set(oov)].join(', ')}`) }
}
console.log(`\nTotal out-of-vocabulary content-word uses: ${totalOOV} across ${Object.keys(EXAMPLES).length} examples`)
```

- [ ] **Step 7: Commit**

```bash
git add scripts/lint-content.mjs scripts/report-example-vocab.mjs src/data/__tests__/contentLint.test.js src/data/dictionaryExamples.js
git commit -m "feat(examples): example-quality content-lint guard + fix 4 non-blankable entries"
```

---

### Task 2: Wire the 3 card-creation paths to `getExample()`

**Files:**
- Modify: `src/pages/PDFReader.jsx` (`addGloss`, ~:922)
- Modify: `src/components/SearchModal.jsx` (`handleAdd`, ~:34)
- Modify: `src/pages/Import.jsx` (~:189)
- Create: `src/data/__tests__/dictionaryExamples.test.js`

**Interfaces:**
- Consumes: `getExample(malayWord) => string | null` (already exported from `dictionaryExamples.js`).

- [ ] **Step 1: Failing test — `src/data/__tests__/dictionaryExamples.test.js`**

```js
import { describe, it, expect } from 'vitest'
import EXAMPLES, { getExample } from '../dictionaryExamples.js'

describe('getExample', () => {
  it('returns the curated example for a covered word', () => {
    expect(getExample('makanan')).toBe(EXAMPLES['makanan'])
    expect(typeof getExample('makanan')).toBe('string')
  })
  it('returns null for an uncovered word (callers fall back to placeholder)', () => {
    expect(getExample('zxqwv')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify it passes** (getExample already exists): `npx vitest run src/data/__tests__/dictionaryExamples.test.js` → PASS. (This pins the accessor the 3 wirings depend on.)

- [ ] **Step 3: Edit `src/components/SearchModal.jsx`** — add `import { getExample } from '../data/dictionaryExamples'` near the `DICTIONARY` import, and change `handleAdd`:

```js
const handleAdd = (malay, english) => {
  addCard({ m: malay, e: english, t: 'Search', p: 'n', ex: getExample(malay) || `${malay} (${english}).`, mn: '' })
}
```

- [ ] **Step 4: Edit `src/pages/PDFReader.jsx`** — add `import { getExample } from '../data/dictionaryExamples'`, and in `addGloss`:

```js
addCards([{ m: g.malay, e: g.display, lang: plan.lang, t: deckName, p: 'n', ex: getExample(g.malay) || `${g.malay} — ${g.display}`, mn: '' }])
```

- [ ] **Step 5: Edit `src/pages/Import.jsx`** (~:189) — add the import, and:

```js
ex: getExample(w.word) || `${w.word} (${w.meaning || translations[w.word] || '?'}).`,
```

- [ ] **Step 6: Behavioral test — extend `src/components/__tests__/` for SearchModal** (representative of the 3; if a SearchModal test file exists, extend it, else create `SearchModal.examples.test.jsx`): render the modal, search a word that HAS an example (e.g. one from EXAMPLES that is also in DICTIONARY), click add, assert the added card's `ex === getExample(word)` (not the placeholder). Reader/Import covered by build + manual spot-check (spec §Verification step 4).

- [ ] **Step 7: Run the gate**

Run: `npm run build && npx vitest run src/data/__tests__/dictionaryExamples.test.js src/components/__tests__/SearchModal*.test.jsx`
Expected: build clean, tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/PDFReader.jsx src/components/SearchModal.jsx src/pages/Import.jsx src/data/__tests__/dictionaryExamples.test.js src/components/__tests__/
git commit -m "feat(examples): card-creation paths use curated getExample() before placeholder"
```

---

### Task 3: Batch 1 — 45 verified examples (`abad` … `basuh`)

**Files:**
- Modify: `src/data/dictionaryExamples.js` (add 45 entries, alphabetically placed)
- Modify: `RESUME_HERE.md` (coverage 254 → ~299) + `docs/loop/GOAL.md`

The 45 target words (verified missing): `abad, acara, adalah, adat, agak, agar, akan, akaun, akhirnya, aku, almari, amat, ambil, anak lelaki, anak perempuan, anda, angin, angkat, antara, antarabangsa, apa, apabila, api, asam laksa, atau, awak, awal, awan, bagaimana, bagaimanapun, baharu, bahasa, bahu, baik, bakat, balik, balu, banjir, bank, bantal, bantu, banyak, baru, bas ekspres, basuh`.

- [ ] **Step 1: For each word, web-verify a 7–15-word example** (headword as a whole word; compose from in-dictionary vocabulary where natural). Cross-check the sense against PRPM/Kamus Dewan. Add to `dictionaryExamples.js` in alphabetical order. Note any word needing a sense correction.

- [ ] **Step 2: Run the quality guard on the new data**

Run: `npx vitest run src/data/__tests__/contentLint.test.js -t "quality"`
Expected: PASS (all 45 new examples blank-able + in range). Fix any flagged before proceeding.

- [ ] **Step 3: Run the soft vocab report + minimize OOV**

Run: `node scripts/report-example-vocab.mjs`
Review the Batch-1 words; rephrase examples that introduce avoidable unknown words.

- [ ] **Step 4: Full gate**

Run: `npm run build && npm run test:run && npm run lint`
Expected: build clean, ~2192+ tests pass, lint 0 errors (3 known warnings).

- [ ] **Step 5: Update handoff docs** — RESUME_HERE coverage line (254 → 299) + supersede note; GOAL.md epic #2 progress.

- [ ] **Step 6: Commit** (full gate runs automatically via pre-commit)

```bash
git add src/data/dictionaryExamples.js RESUME_HERE.md docs/loop/GOAL.md
git commit -m "feat(examples): Batch 1 — 45 verified examples (abad…basuh), coverage 254→299/825"
```

---

## Subsequent batches (out of this session)

Repeat Task 3's pattern per ~45-word alphabetical batch until 825/825. In the **final** batch, add a completeness assertion to `contentLint.test.js` — `Object.keys(DICTIONARY).every(w => w in EXAMPLES)` — to flip full coverage on once and keep it enforced.

## Self-Review

- **Spec coverage:** data growth (Task 3 + subsequent) ✓; 3-path wiring (Task 2) ✓; hard guard-on-existing (Task 1) ✓; soft vocab lint (Task 1 Step 6) ✓; fix-the-4 (Task 1 Step 4) ✓; no STORE_VERSION / dictionary.js untouched (Global Constraints) ✓; batched gate-green delivery ✓; final-batch parity assertion (Subsequent batches) ✓.
- **Placeholders:** none — real code in every code step; the "web-verify" steps show candidate text to verify, not TBDs.
- **Type consistency:** `lintExampleQuality(examples) => string[]`, `getExample(word) => string|null`, `blankInExample(sentence, word) => string` used consistently across tasks.
