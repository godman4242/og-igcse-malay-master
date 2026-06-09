# Full-translation Page (Option G) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated, reveal-gated **"Full translation"** page to the PDF reader — paragraph→whole-document English, Malay always visible, free `gtx` by default with the BYOK "Higher quality" path, framed as a post-reading comprehension check.

**Architecture:** A new full-screen **view inside `PDFReader`** (a `showFullTranslation` flag + an early return rendering a new `FullTranslationView` component), reusing the already-parsed in-memory `pdfData.pages` — **no router route, no re-parse**. New pure logic lives in `paragraphModel.js` and a generic, extracted `revealState.js`; the reveal/translate orchestration reuses the proven `translateDocument` runner + cache. `PDFReader.jsx` gets a minimal, surgical diff.

**Tech Stack:** React 19, Vitest (unit), Playwright (e2e), `ts-fsrs` (unaffected), the existing `translate.js`/`translateDocument.js` pipeline + IndexedDB `translationCache`.

**Spec:** `docs/superpowers/specs/2026-06-09-full-translation-page-design.md`

---

## File Structure

**Create:**
- `src/lib/revealState.js` — generic id-keyed reveal-state reducer (extracted from `sentenceRevealState.js`).
- `src/lib/__tests__/revealState.test.js` — unit tests for the generic reducer.
- `src/lib/paragraphModel.js` — pure paragraph model: `buildParagraphs`, `splitForTranslation`, `planParagraphTranslation`, `assembleParagraphGloss`.
- `src/lib/__tests__/paragraphModel.test.js` — unit tests for the four pure functions.
- `src/components/FullTranslationView.jsx` — the full-screen page component.
- `tests/e2e/full-translation.spec.js` — e2e (GO WILD).

**Modify:**
- `src/lib/sentenceRevealState.js` — becomes a thin re-export of `revealState.js` (keeps existing imports + `sentenceRevealState.test.js` green, unchanged).
- `src/pages/PDFReader.jsx` — import `FullTranslationView`; add `showFullTranslation` state (+ reset); add a toolbar entry button; add the early return.
- `RESUME_HERE.md` — refresh the top block + paste-ready kickoff (Task 9).

**Reuse unchanged:** `src/lib/translateDocument.js` (`translateDocument`), `src/lib/translate.js` (`translateBatch`), `src/lib/translationCache.js` (namespace split), `src/lib/sentenceModel.js` (`detectDocLanguage`), `src/lib/openrouter.js` (`hasUserOpenRouterKey`).

---

## Task 1: Extract a generic `revealState` reducer (+ keep the sentence shim green)

**Files:**
- Create: `src/lib/revealState.js`
- Create: `src/lib/__tests__/revealState.test.js`
- Modify: `src/lib/sentenceRevealState.js` (→ re-export shim)

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/revealState.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  createRevealState, isRevealed, reveal, hide, setShowAll, hideAll,
} from '../revealState.js'

// Generic id-keyed reveal reducer, extracted from sentenceRevealState so it can back
// BOTH the sentence reveal and the Full-translation page (Step 1 of
// docs/superpowers/plans/2026-06-09-full-translation-page.md). Reveal-gated default:
// nothing revealed, showAll off. The module `../revealState.js` does NOT exist yet.

describe('createRevealState', () => {
  it('starts reveal-gated: nothing revealed, showAll off', () => {
    expect(createRevealState()).toEqual({ showAll: false, revealed: {} })
  })
})

describe('isRevealed', () => {
  it('is false for an id in the initial gated state', () => {
    expect(isRevealed(createRevealState(), '1:0')).toBe(false)
  })
  it('is true once revealed, false for others', () => {
    const s = reveal(createRevealState(), '1:0')
    expect(isRevealed(s, '1:0')).toBe(true)
    expect(isRevealed(s, '2:0')).toBe(false)
  })
  it('is true for every id when showAll is on', () => {
    const s = setShowAll(createRevealState(), true)
    expect(isRevealed(s, 'anything')).toBe(true)
  })
})

describe('reducers are immutable', () => {
  it('reveal does not mutate the previous state', () => {
    const s0 = createRevealState()
    const s1 = reveal(s0, '3:1')
    expect(s0).toEqual({ showAll: false, revealed: {} })
    expect(s1).not.toBe(s0)
    expect(isRevealed(s1, '3:1')).toBe(true)
  })
})

describe('hide', () => {
  it('hides a previously revealed id', () => {
    let s = reveal(createRevealState(), '1:0')
    s = hide(s, '1:0')
    expect(isRevealed(s, '1:0')).toBe(false)
  })
  it('is a no-op for an id that was never revealed', () => {
    expect(isRevealed(hide(createRevealState(), 'x'), 'x')).toBe(false)
  })
})

describe('hideAll', () => {
  it('collapses everything back to the gated default', () => {
    let s = setShowAll(createRevealState(), true)
    s = reveal(s, '1:0')
    expect(hideAll()).toEqual({ showAll: false, revealed: {} })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/revealState.test.js`
Expected: FAIL — `Failed to resolve import "../revealState.js"`.

- [ ] **Step 3: Create the generic reducer**

Create `src/lib/revealState.js`:

```js
// Generic id-keyed reveal-state reducer for any "reveal-gated" layer. The word-gloss
// layer has its own docGlossState; THIS reducer backs the sentence reveal (via the
// sentenceRevealState re-export) AND the Full-translation page (paragraph reveal).
// Reveal-gated default: nothing revealed, showAll off. No DOM. Ids are arbitrary
// stable strings (sentenceId, paraId).

/** Initial state: reveal-gated (nothing revealed, showAll off). */
export function createRevealState() {
  return { showAll: false, revealed: {} }
}

/** Is this id currently revealed? showAll overrides per-id reveals. */
export function isRevealed(state, id) {
  return Boolean(state.showAll || (state.revealed && state.revealed[id]))
}

/** Reveal one id (immutable). */
export function reveal(state, id) {
  return { ...state, revealed: { ...state.revealed, [id]: true } }
}

/** Hide one previously-revealed id (immutable; no-op if not revealed). */
export function hide(state, id) {
  const revealed = { ...state.revealed }
  delete revealed[id]
  return { ...state, revealed }
}

/** Toggle the "show all" escape hatch (immutable). */
export function setShowAll(state, value) {
  return { ...state, showAll: Boolean(value) }
}

/** Collapse everything back to the gated default. */
export function hideAll() {
  return createRevealState()
}
```

- [ ] **Step 4: Convert `sentenceRevealState.js` to a thin re-export shim**

Replace the **entire** contents of `src/lib/sentenceRevealState.js` with:

```js
// The sentence-reveal layer's reducer IS the generic id-keyed reveal reducer in
// ./revealState.js. This module stays as an alias so existing imports (PDFReader.jsx)
// and tests (sentenceRevealState.test.js) keep working unchanged. See revealState.js.
export {
  createRevealState as createSentenceState,
  isRevealed as isSentenceRevealed,
  reveal as revealSentence,
  hide as hideSentence,
  setShowAll as setShowAllSentences,
  hideAll as hideAllSentences,
} from './revealState.js'
```

- [ ] **Step 5: Run both reducer test files to verify they pass**

Run: `npx vitest run src/lib/__tests__/revealState.test.js src/lib/__tests__/sentenceRevealState.test.js`
Expected: PASS — both files green (the sentence shim satisfies the old tests unchanged).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(reveal): extract generic revealState reducer; sentenceRevealState becomes a shim"
```

---

## Task 2: `buildParagraphs` (paragraph model)

**Files:**
- Create: `src/lib/paragraphModel.js`
- Create: `src/lib/__tests__/paragraphModel.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/paragraphModel.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildParagraphs } from '../paragraphModel.js'

// RED handoff — Step 2 of docs/superpowers/plans/2026-06-09-full-translation-page.md.
// buildParagraphs(pages) flattens the in-memory pdfData.pages
// ([{ pageNum, paragraphs: string[] }]) into stable paragraph units for the
// Full-translation page. The module `../paragraphModel.js` does NOT exist yet.

const PAGES = [
  { pageNum: 1, paragraphs: ['Saya suka nasi.', '  ', 'Dia minum air.'] },
  { pageNum: 2, paragraphs: ['Kami pergi ke pasar.'] },
]

describe('buildParagraphs', () => {
  it('flattens pages into {paraId, pageNum, text}, skipping empty/whitespace paragraphs', () => {
    expect(buildParagraphs(PAGES)).toEqual([
      { paraId: '1:0', pageNum: 1, text: 'Saya suka nasi.' },
      { paraId: '1:2', pageNum: 1, text: 'Dia minum air.' },
      { paraId: '2:0', pageNum: 2, text: 'Kami pergi ke pasar.' },
    ])
  })
  it('trims surrounding whitespace but keeps the paragraph index stable', () => {
    expect(buildParagraphs([{ pageNum: 3, paragraphs: ['  Hello world.  '] }]))
      .toEqual([{ paraId: '3:0', pageNum: 3, text: 'Hello world.' }])
  })
  it('returns [] for empty/missing input', () => {
    expect(buildParagraphs([])).toEqual([])
    expect(buildParagraphs(undefined)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/paragraphModel.test.js`
Expected: FAIL — `Failed to resolve import "../paragraphModel.js"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/paragraphModel.js`:

```js
// Pure paragraph model for the Full-translation page (Option G).
// Spec: docs/superpowers/specs/2026-06-09-full-translation-page-design.md (design 2)
// No DOM, no network. Operates on the in-memory pdfData.pages
// ([{ pageNum, paragraphs: string[] }]) the PDF reader already holds.

/**
 * Flatten pages into stable paragraph units, skipping empty/whitespace-only ones.
 * @param {Array<{pageNum:number, paragraphs:string[]}>} pages
 * @returns {Array<{paraId:string, pageNum:number, text:string}>}
 */
export function buildParagraphs(pages) {
  const out = []
  for (const page of pages || []) {
    const paragraphs = page.paragraphs || []
    paragraphs.forEach((para, pi) => {
      const text = (para || '').trim()
      if (!text) return
      out.push({ paraId: `${page.pageNum}:${pi}`, pageNum: page.pageNum, text })
    })
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/paragraphModel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(fulltx): paragraphModel.buildParagraphs"
```

---

## Task 3: `splitForTranslation` (over-long paragraph → sentence chunks)

**Files:**
- Modify: `src/lib/paragraphModel.js`
- Modify: `src/lib/__tests__/paragraphModel.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/paragraphModel.test.js` (add the import at the top: change line 2 to `import { buildParagraphs, splitForTranslation } from '../paragraphModel.js'`):

```js
describe('splitForTranslation', () => {
  it('returns the whole text as one chunk when within the cap', () => {
    expect(splitForTranslation('Saya suka nasi goreng.', 4000)).toEqual(['Saya suka nasi goreng.'])
  })
  it('returns [] for empty/whitespace', () => {
    expect(splitForTranslation('   ')).toEqual([])
    expect(splitForTranslation(undefined)).toEqual([])
  })
  it('splits an over-long paragraph at sentence boundaries into <= maxChars chunks', () => {
    // Three 20-char sentences; cap 25 → each sentence is its own chunk.
    const text = 'Aaaaaaaaaaaaaaaaaa a. Bbbbbbbbbbbbbbbbbb b. Cccccccccccccccccc c.'
    const chunks = splitForTranslation(text, 25)
    expect(chunks.length).toBe(3)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(25)
    // Rejoining reconstructs the readable paragraph (whitespace-normalised).
    expect(chunks.join(' ')).toBe(text)
  })
  it('packs multiple short sentences into one chunk up to the cap', () => {
    const text = 'Satu. Dua. Tiga. Empat.'
    expect(splitForTranslation(text, 4000)).toEqual(['Satu. Dua. Tiga. Empat.'])
  })
  it('never splits mid-word: a single over-long sentence becomes its own chunk', () => {
    const long = 'x'.repeat(50) + '.'
    const chunks = splitForTranslation(long, 10)
    expect(chunks).toEqual([long]) // one over-long piece, not chopped mid-word
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/paragraphModel.test.js`
Expected: FAIL — `splitForTranslation is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/paragraphModel.js`:

```js
// Sentence boundary: a terminator (. ! ? …) followed by whitespace. The terminator
// stays attached to its sentence. Mirrors sentenceModel's SENTENCE_END discipline,
// applied to a raw string instead of `parts`.
const SENTENCE_SPLIT = /(?<=[.!?…])\s+/u

/**
 * Split text into sendable chunks no longer than maxChars, breaking only at sentence
 * boundaries (never mid-word). Returns [text] when it already fits; a single sentence
 * longer than maxChars becomes its own (over-long) chunk rather than being chopped.
 * Handles gtx's ~5000-char per-call cap.
 * @param {string} text
 * @param {number} [maxChars=4000]
 * @returns {string[]}
 */
export function splitForTranslation(text, maxChars = 4000) {
  const t = (text || '').trim()
  if (!t) return []
  if (t.length <= maxChars) return [t]
  const pieces = t.split(SENTENCE_SPLIT)
  const chunks = []
  let cur = ''
  for (const piece of pieces) {
    if (cur && cur.length + 1 + piece.length > maxChars) {
      chunks.push(cur)
      cur = ''
    }
    cur = cur ? `${cur} ${piece}` : piece
  }
  if (cur) chunks.push(cur)
  return chunks
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/paragraphModel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(fulltx): paragraphModel.splitForTranslation (gtx char-cap safety)"
```

---

## Task 4: `planParagraphTranslation` (skip-translated + dedupe + per-para chunk map)

**Files:**
- Modify: `src/lib/paragraphModel.js`
- Modify: `src/lib/__tests__/paragraphModel.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/paragraphModel.test.js` (extend the import to include `planParagraphTranslation`):

```js
describe('planParagraphTranslation', () => {
  const paras = [
    { paraId: '1:0', pageNum: 1, text: 'Saya suka nasi.' },
    { paraId: '1:1', pageNum: 1, text: 'Dia minum air.' },
    { paraId: '1:2', pageNum: 1, text: 'Saya suka nasi.' }, // identical text to 1:0
  ]
  it('returns deduped chunks + a per-paragraph ordered chunk map', () => {
    const { chunks, perPara } = planParagraphTranslation(paras)
    expect(chunks).toEqual(['Saya suka nasi.', 'Dia minum air.']) // identical text deduped
    expect(perPara).toEqual({
      '1:0': ['Saya suka nasi.'],
      '1:1': ['Dia minum air.'],
      '1:2': ['Saya suka nasi.'],
    })
  })
  it('skips paragraphs already translated (in `have`)', () => {
    const { chunks, perPara } = planParagraphTranslation(paras, { have: { '1:0': { text: 'x' }, '1:2': { text: 'y' } } })
    expect(chunks).toEqual(['Dia minum air.'])
    expect(perPara).toEqual({ '1:1': ['Dia minum air.'] })
  })
  it('is empty when everything is already translated', () => {
    const have = { '1:0': {}, '1:1': {}, '1:2': {} }
    expect(planParagraphTranslation(paras, { have })).toEqual({ chunks: [], perPara: {} })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/paragraphModel.test.js`
Expected: FAIL — `planParagraphTranslation is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/paragraphModel.js`:

```js
/**
 * Build the volume-safe translation plan for a set of paragraphs: skip the ones
 * already translated (`have[paraId]`), split each remaining one into sub-chunks, record
 * its ordered chunk list in `perPara`, and return the DEDUPED flat list to actually send.
 * @param {Array<{paraId:string, text:string}>} paras
 * @param {{have?:Record<string,unknown>, maxChars?:number}} [opts]
 * @returns {{chunks:string[], perPara:Record<string,string[]>}}
 */
export function planParagraphTranslation(paras, { have = {}, maxChars = 4000 } = {}) {
  const perPara = {}
  const chunks = []
  const seen = new Set()
  for (const p of paras || []) {
    if (have[p.paraId]) continue
    const pieces = splitForTranslation(p.text, maxChars)
    perPara[p.paraId] = pieces
    for (const c of pieces) {
      if (seen.has(c)) continue
      seen.add(c)
      chunks.push(c)
    }
  }
  return { chunks, perPara }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/paragraphModel.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(fulltx): paragraphModel.planParagraphTranslation"
```

---

## Task 5: `assembleParagraphGloss` (rejoin translated sub-chunks)

**Files:**
- Modify: `src/lib/paragraphModel.js`
- Modify: `src/lib/__tests__/paragraphModel.test.js`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/paragraphModel.test.js` (extend the import to include `assembleParagraphGloss`):

```js
describe('assembleParagraphGloss', () => {
  const results = {
    'Satu.': { text: 'One.', source: 'gtx' },
    'Dua.': { text: 'Two.', source: 'gtx' },
    'Bad.': { text: 'Bad.', source: 'error' },
  }
  it('rejoins sub-chunk translations into one readable paragraph', () => {
    expect(assembleParagraphGloss(['Satu.', 'Dua.'], results)).toEqual({ text: 'One. Two.', source: 'gtx' })
  })
  it('a single chunk passes through unchanged', () => {
    expect(assembleParagraphGloss(['Satu.'], results)).toEqual({ text: 'One.', source: 'gtx' })
  })
  it('source is "error" only when EVERY chunk errored', () => {
    expect(assembleParagraphGloss(['Bad.'], results).source).toBe('error')
    // a partial failure still surfaces the good source
    expect(assembleParagraphGloss(['Satu.', 'Bad.'], results).source).toBe('gtx')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/paragraphModel.test.js`
Expected: FAIL — `assembleParagraphGloss is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/paragraphModel.js`:

```js
/**
 * Rejoin a paragraph's translated sub-chunks for display. `source` is 'error' only if
 * EVERY chunk errored (a partial failure still surfaces a real provider source — an
 * errored chunk's `text` falls back to the original Malay, so the paragraph stays
 * readable rather than blank).
 * @param {string[]} chunks  the paragraph's ordered sub-chunks (from perPara)
 * @param {Record<string,{text:string,source:string}>} results  from translateDocument
 * @returns {{text:string, source:string}}
 */
export function assembleParagraphGloss(chunks, results) {
  const parts = []
  let source = 'error'
  let anyOk = false
  for (const c of chunks || []) {
    const r = results?.[c]
    if (r && r.text) parts.push(r.text)
    if (r && r.source && r.source !== 'error') { anyOk = true; source = r.source }
  }
  return { text: parts.join(' ').trim(), source: anyOk ? source : 'error' }
}
```

- [ ] **Step 4: Run the FULL unit suite to verify nothing regressed**

Run: `npm run test:run`
Expected: PASS — all existing tests plus the new `revealState` + `paragraphModel` files green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(fulltx): paragraphModel.assembleParagraphGloss"
```

---

## Task 6: `FullTranslationView` component

**Files:**
- Create: `src/components/FullTranslationView.jsx`

- [ ] **Step 1: Write the component**

Create `src/components/FullTranslationView.jsx`:

```jsx
// The Full-translation page (Option G): a dedicated, reveal-gated, full-screen surface
// for paragraph→whole-document English. Spec:
// docs/superpowers/specs/2026-06-09-full-translation-page-design.md
//
// COMPREHENSION check, not vocab (read the Malay first). Reveal-gated: opens with all
// Malay, nothing revealed; tap a paragraph to reveal its English inline beneath (Malay
// stays visible); "Reveal all" is the opt-in exam-cram escape hatch. Free gtx by
// default; the BYOK "Higher quality" pill shows only with a key. Paragraph-pure — no
// word/sentence tapping here (back arrow returns to the reader for vocab work).
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { ArrowLeft, Languages, Eye, EyeOff, ChevronUp, Sparkles } from 'lucide-react'
import { translateBatch } from '../lib/translate'
import { translateDocument } from '../lib/translateDocument'
import {
  buildParagraphs, splitForTranslation, planParagraphTranslation, assembleParagraphGloss,
} from '../lib/paragraphModel'
import { createRevealState, isRevealed, reveal, hide, setShowAll, hideAll } from '../lib/revealState'

export default function FullTranslationView({ pages, quality = false, onToggleQuality, hasKey = false, onBack }) {
  const paras = useMemo(() => buildParagraphs(pages), [pages])
  const [glossById, setGlossById] = useState({})          // paraId -> { text, source }
  const [revealState, setRevealState] = useState(createRevealState)
  const [pending, setPending] = useState(() => new Set()) // paraIds being lazily fetched
  const [bulk, setBulk] = useState(null)                  // { done, total } | null
  const abortRef = useRef(null)
  // navigator.onLine read lazily (React-19 purity: no impure call in useState init body).
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const goOn = () => setOnline(true)
    const goOff = () => setOnline(false)
    window.addEventListener('online', goOn)
    window.addEventListener('offline', goOff)
    return () => { window.removeEventListener('online', goOn); window.removeEventListener('offline', goOff) }
  }, [])
  // Cancel any in-flight bulk job if the page unmounts (back / navigate away).
  useEffect(() => () => abortRef.current?.abort(), [])

  const provider = quality ? 'quality' : undefined

  // Lazily translate + reveal ONE paragraph (mirrors the reader's revealSentenceHandler).
  const revealOne = useCallback((p) => {
    setRevealState(s => reveal(s, p.paraId))
    if (glossById[p.paraId]) return
    const chunks = splitForTranslation(p.text)
    setPending(prev => new Set(prev).add(p.paraId))
    translateDocument(chunks, { translateBatch, provider }).then(results => {
      const g = assembleParagraphGloss(chunks, results)
      if (g.text) setGlossById(prev => ({ ...prev, [p.paraId]: g }))
      setPending(prev => { const n = new Set(prev); n.delete(p.paraId); return n })
    })
  }, [glossById, provider])

  const collapseOne = useCallback((p) => {
    setRevealState(s => hide(s, p.paraId))
  }, [])

  // Bulk "Reveal all" — translate every not-yet-done paragraph (deduped sub-chunks),
  // cancellable + resumable from the per-text cache.
  const revealAll = useCallback(async () => {
    setRevealState(s => setShowAll(s, true))
    const { chunks, perPara } = planParagraphTranslation(paras, { have: glossById })
    if (!chunks.length) return
    const ac = new AbortController()
    abortRef.current = ac
    setBulk({ done: 0, total: chunks.length })
    const results = await translateDocument(chunks, {
      translateBatch, signal: ac.signal, onProgress: setBulk, provider,
    })
    setGlossById(prev => {
      const next = { ...prev }
      for (const [paraId, cks] of Object.entries(perPara)) {
        if (next[paraId]) continue
        const g = assembleParagraphGloss(cks, results)
        if (g.text) next[paraId] = g
      }
      return next
    })
    setBulk(null)
    abortRef.current = null
  }, [paras, glossById, provider])

  const cancelBulk = useCallback(() => { abortRef.current?.abort(); setBulk(null) }, [])
  const hideAllParas = useCallback(() => setRevealState(hideAll()), [])

  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 -mx-3 px-3 py-2 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onBack} aria-label="Back to reader"
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <ArrowLeft size={12} /> Reader
          </button>
          <h2 className="text-sm font-bold flex items-center gap-1">
            <Languages size={14} style={{ color: 'var(--color-accent)' }} /> Full translation
          </h2>

          {hasKey && (
            <button onClick={onToggleQuality} data-testid="quality-toggle-fulltx" aria-pressed={quality}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: quality ? 'var(--color-purple)' : 'var(--color-card)',
                       color: quality ? '#fff' : 'var(--color-text)', border: '1px solid var(--color-border)' }}
              title="Higher-quality translation using your own OpenRouter key (falls back to free if it's busy)">
              <Sparkles size={12} /> Higher quality
            </button>
          )}

          <button onClick={revealState.showAll ? hideAllParas : revealAll}
            disabled={!!bulk || (!online && !revealState.showAll)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                     color: revealState.showAll ? 'var(--color-accent)' : 'var(--color-text)' }}
            title="Reveal or hide the English for every paragraph (for timed comprehension cram)">
            {revealState.showAll ? <><EyeOff size={12} /> Hide all</> : <><Eye size={12} /> Reveal all</>}
          </button>

          <span className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--color-dim)', background: 'var(--color-card)' }}>
            {paras.length} paragraphs
          </span>
        </div>

        {bulk && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div className="h-full transition-all" style={{ background: 'var(--color-accent)',
                width: bulk.total ? `${Math.round((bulk.done / bulk.total) * 100)}%` : '10%' }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-dim)' }}>{bulk.done}/{bulk.total}</span>
            <button onClick={cancelBulk} className="text-[10px] font-bold underline" style={{ color: 'var(--color-red)' }}>Cancel</button>
          </div>
        )}

        <div className="mt-1 text-[10px] flex items-start gap-1" style={{ color: 'var(--color-dim)' }}>
          <Languages size={10} className="mt-0.5 flex-shrink-0" />
          <span>Machine translation — a guide to the meaning, not an authoritative answer. Read the Malay first; reveal the English to check your understanding.</span>
        </div>
        {!online && (
          <div className="mt-1 text-[10px]" style={{ color: 'var(--color-orange)' }}>
            Offline — new translations are paused; already-translated paragraphs still reveal.
          </div>
        )}
      </div>

      {/* Paragraphs */}
      <div className="space-y-3">
        {paras.map((p) => {
          const shown = isRevealed(revealState, p.paraId)
          const g = glossById[p.paraId]
          const isPending = pending.has(p.paraId)
          return (
            <div key={p.paraId} className="rounded-2xl p-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{p.text}</p>
              {!shown ? (
                <button onClick={() => revealOne(p)} disabled={!online && !g}
                  aria-label="Reveal English for this paragraph"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold rounded-lg px-2.5 py-1 disabled:opacity-50"
                  style={{ color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
                  <Languages size={12} /> Show English
                </button>
              ) : (
                <div aria-live="polite" className="animate-fadeUp mt-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'color-mix(in srgb, var(--color-accent) 9%, transparent)',
                           borderLeft: '2px solid var(--color-accent)' }}>
                  <span style={{ color: 'var(--color-text)' }}>
                    {isPending ? '…' : (g?.text || (online ? '…' : '— offline —'))}
                  </span>
                  <span className="inline-flex items-center gap-2 ml-2 align-middle">
                    <span className="inline-flex items-center gap-0.5 text-[0.72em] uppercase tracking-wide"
                      style={{ color: 'var(--color-dim)' }} title="Machine-translated — a guide, not authoritative">
                      <Languages size={9} /> machine
                    </span>
                    <button onClick={() => collapseOne(p)} aria-label="Hide English for this paragraph"
                      style={{ color: 'var(--color-dim)' }} title="Hide"><ChevronUp size={13} /></button>
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FSRS path hint — vocab work stays in the reader (paragraph-pure page). */}
      <div className="text-[11px] py-3" style={{ color: 'var(--color-dim)' }}>
        <span className="font-bold">Tip:</span> Found an unknown word? Tap{' '}
        <span className="inline-flex items-center gap-0.5"><ArrowLeft size={11} /> Reader</span>{' '}
        to look it up and add it to your deck.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: PASS — zero errors; `FullTranslationView` lands in its own lazy chunk only once `PDFReader` imports it (next task).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(fulltx): FullTranslationView page component"
```

---

## Task 7: Wire `FullTranslationView` into `PDFReader.jsx` (surgical)

**Files:**
- Modify: `src/pages/PDFReader.jsx` (import ~line 21; state ~line 91; `resetGloss` ~line 156; early return ~line 666; toolbar button ~line 776)

> DO NOT rewrite the file. Make ONLY the five edits below.

- [ ] **Step 1: Add the import**

After the `import SentenceReveal from '../components/SentenceReveal'` line, add:

```jsx
import FullTranslationView from '../components/FullTranslationView'
```

- [ ] **Step 2: Add the `showFullTranslation` state**

Immediately after the `const [quality, setQuality] = useState(false)` line, add:

```jsx
  // Full-translation page (Option G) — a full-screen takeover rendered from this same
  // component (reuses the in-memory parsed doc; no re-parse). Off by default.
  const [showFullTranslation, setShowFullTranslation] = useState(false)
```

- [ ] **Step 3: Reset it on a new/cleared document**

In `resetGloss`, add `setShowFullTranslation(false)` alongside the other resets (e.g. directly after `setSentenceMode(false)`):

```jsx
    setShowFullTranslation(false)
```

- [ ] **Step 4: Add the early return (full-screen takeover)**

Directly **after** the `if (loading) { … }` block and **before** the main `return (` of the reader, add:

```jsx
  // Full-translation takeover — presents as its own page (back arrow returns here),
  // reusing the already-parsed pages in memory.
  if (showFullTranslation && pdfData) {
    return (
      <FullTranslationView
        pages={pdfData.pages}
        quality={quality}
        onToggleQuality={() => setQuality(q => !q)}
        hasKey={hasUserOpenRouterKey()}
        onBack={() => setShowFullTranslation(false)}
      />
    )
  }
```

- [ ] **Step 5: Add the toolbar entry button**

Directly **after** the closing `)}` of the `view === 'reflow' && sentenceMode && …` toolbar block (the "Translate sentences / Show all sentences" group) and **before** the `<span … {pdfData.pages.length} pages …>` element, add:

```jsx
          {/* Full-translation page entry — a dedicated reveal-gated surface for
              paragraph→whole-document English (the BYOK "Higher quality" home).
              Hidden on English documents (source ≈ target, no-op). */}
          {!sentenceDisabled && (
            <button onClick={() => setShowFullTranslation(true)} data-testid="full-translation-open"
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
              title="Open the full-document translation page (read the Malay first; reveal English to check)">
              <Languages size={12} /> Full translation
            </button>
          )}
```

- [ ] **Step 6: Build + lint + full unit suite**

Run: `npm run build && npm run lint && npm run test:run`
Expected: build zero errors (PDFReader chunk stays lean; FullTranslationView is its own chunk); lint 0 errors (only the 3 pre-existing exhaustive-deps warnings); all unit tests green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(fulltx): wire Full-translation page into PDFReader (surgical)"
```

---

## Task 8: e2e — `full-translation.spec.js` (GO WILD)

**Files:**
- Create: `tests/e2e/full-translation.spec.js`

> Reuses the existing `tests/e2e/fixtures/sentences-malay.pdf` and `english-doc.pdf`. The gtx mock echoes `EN-<q>`, so a revealed paragraph's English starts with `EN-`.

- [ ] **Step 1: Write the e2e spec**

Create `tests/e2e/full-translation.spec.js`:

```js
// E2E for the Full-translation page (Option G). Reveal-gated: opens all-Malay,
// nothing revealed; tap a paragraph → its English slides in beneath (Malay stays);
// "Reveal all" is the opt-in bulk hatch (cancellable, cache-resumable); machine marker
// always on; paragraph-pure; English doc hides the entry; back returns to the reader
// with the word + sentence layers intact.
//
// GO WILD ([[feedback_go_wild_smoke_test]]): cancel mid bulk run, offline, spam
// entry/back + reveal-all, theme swap. Run SOLO:
//   npx playwright test full-translation --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fx = (f) => path.join(__dirname, 'fixtures', f)

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

function mockTranslate(page, { delayMs = 0, calls } = {}) {
  page.route('**/api/translate', (r) => r.abort()) // DeepL/Google proxy → fall through to gtx
  page.route('**/translate_a/single**', async (r) => {
    if (calls) calls.n += 1
    if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
    const u = new URL(r.request().url())
    const q = u.searchParams.get('q') || ''
    await r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([[[`EN-${q}`, q, null, null, 10]], null, 'ms']),
    })
  })
}

async function loadReflow(page, fixture) {
  await page.locator('input[type=file]').first().setInputFiles(fx(fixture))
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
}

const openBtn = (page) => page.getByRole('button', { name: 'Full translation' })
const reveals = (page) => page.getByRole('button', { name: 'Reveal English for this paragraph' })
const collapses = (page) => page.getByRole('button', { name: 'Hide English for this paragraph' })
const backBtn = (page) => page.getByRole('button', { name: 'Back to reader' })

test.beforeEach(async ({ page }) => {
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('opens reveal-gated: all Malay, nothing revealed until tapped', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await expect(backBtn(page)).toBeVisible()
  // Reveal-gated: paragraphs present, none revealed.
  await expect(reveals(page).first()).toBeVisible()
  await expect(collapses(page)).toHaveCount(0)
  // Machine-translation framing is always on.
  await expect(page.getByText(/Machine translation/).first()).toBeVisible()
  await reveals(page).first().click()
  await expect(page.getByText(/^EN-/).first()).toBeVisible()
  await expect(page.getByText('machine').first()).toBeVisible()
  await expect(collapses(page).first()).toBeVisible()
})

test('reveal all shows every paragraph; hide all collapses back to gated', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  const n = await reveals(page).count()
  expect(n).toBeGreaterThanOrEqual(1)
  await page.getByRole('button', { name: 'Reveal all' }).click()
  await expect(collapses(page)).toHaveCount(n)
  await page.getByRole('button', { name: 'Hide all' }).click()
  await expect(collapses(page)).toHaveCount(0)
  await expect(reveals(page)).toHaveCount(n)
})

test('re-running reveal-all resumes from cache — no new network calls', async ({ page }) => {
  const calls = { n: 0 }
  mockTranslate(page, { calls })
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await page.getByRole('button', { name: 'Reveal all' }).click()
  await expect.poll(() => calls.n).toBeGreaterThan(0)
  const first = calls.n
  await page.getByRole('button', { name: 'Hide all' }).click()
  await page.getByRole('button', { name: 'Reveal all' }).click()
  await page.waitForTimeout(300)
  expect(calls.n).toBe(first) // every paragraph already cached/glossed
})

test('English document hides the Full-translation entry', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'english-doc.pdf')
  await expect(openBtn(page)).toHaveCount(0)
})

test('back returns to the reader with the word + sentence layers intact', async ({ page }) => {
  mockTranslate(page)
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await backBtn(page).click()
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sentences', exact: true })).toBeVisible()
})

test('offline: reveal shows a pending/offline state, no crash', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  page.route('**/api/translate', (r) => r.abort())
  page.route('**/translate_a/single**', (r) => r.abort()) // simulate offline
  await loadReflow(page, 'sentences-malay.pdf')
  await openBtn(page).click()
  await reveals(page).first().click()
  await page.waitForTimeout(400)
  await expect(collapses(page).first()).toBeVisible() // still revealed, no English, no crash
  await expect(backBtn(page)).toBeEnabled()
  expect(errors).toHaveLength(0)
})

test('GO WILD: cancel mid bulk run + spam entry/back + theme screenshots', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e))
  mockTranslate(page, { delayMs: 120 })
  await loadReflow(page, 'sentences-malay.pdf')
  // Spam the entry/back round-trip — must not crash or leak.
  for (let i = 0; i < 4; i++) {
    await openBtn(page).click()
    await backBtn(page).click()
  }
  await openBtn(page).click()
  await page.getByRole('button', { name: 'Reveal all' }).click()
  // Cancel mid-flight (button appears while the bulk job runs).
  const cancel = page.getByRole('button', { name: 'Cancel' })
  if (await cancel.isVisible().catch(() => false)) await cancel.click()
  await page.screenshot({ path: 'test-results/full-translation/dark.png', fullPage: true })
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await expect(backBtn(page)).toBeVisible()
  await page.screenshot({ path: 'test-results/full-translation/light.png', fullPage: true })
  expect(errors).toHaveLength(0)
})
```

- [ ] **Step 2: Run the e2e SOLO**

Run: `npx playwright test full-translation --config tests/e2e/playwright.config.js`
Expected: PASS — all cases green. (Run solo per `[[project_e2e_config_invocation]]`; parallel flakes are dev-server contention.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(fulltx): e2e for the Full-translation page (GO WILD)"
```

---

## Task 9: Final verification, RESUME refresh, ship

**Files:**
- Modify: `RESUME_HERE.md`

- [ ] **Step 1: Full verification gate (show output, don't assert)**

Run: `npm run build && npm run lint && npm run test:run`
Expected: build zero errors (PDFReader chunk lean; FullTranslationView its own chunk); lint 0 errors (3 pre-existing warnings only); all unit tests green.

- [ ] **Step 2: Eyeball the app — light AND dark, 390×844**

Run `/verify` (or `/run`): load a Malay PDF → open **Full translation** → confirm: opens all-Malay; "Show English" reveals inline beneath with the `machine` marker; "Reveal all" → progress + reveal; "Hide all" collapses; back arrow returns to the reader intact; "Higher quality" pill appears only with a key; both themes correct.

- [ ] **Step 3: Refresh `RESUME_HERE.md`**

Replace the top "▶ START THE NEXT SESSION HERE" status note + paste-ready box so the **next** session reflects that Option G shipped, and set the next target to **Option F** (L2 Malay sentence simplification) → Layout-view sentence reveal. (Mirror the canonical kickoff in the spec's "Paste-ready Implementation kickoff" section.)

- [ ] **Step 4: Commit (atomic — pre-commit runs `git add -A`)**

```bash
git add -A
git commit -m "feat(fulltx): Full-translation page (Option G) + RESUME refresh"
```

- [ ] **Step 5: Confirm prod READY**

The repo auto-pushes on commit. Confirm the **PUBLIC** project `upg-igcse-malay-master.vercel.app` reaches READY (Vercel MCP `list_deployments` / `get_deployment`), per `[[project_two_vercel_projects]]`.

- [ ] **Step 6: Bounded self-review + honest verdict**

Run `superpowers:requesting-code-review` on the `PDFReader.jsx` + `FullTranslationView.jsx` + model diffs. Then state honestly whether the result hit the "can't get better" bar; if not, keep going until it does.

---

## Self-Review (plan vs spec)

**Spec coverage:**
- Architecture A (view inside PDFReader, reuse in-memory doc, no re-parse) → Task 7 (early return + `pages={pdfData.pages}`). ✓
- Layout A (stacked, per-¶, Malay always visible, inline reveal beneath) → Task 6 render. ✓
- Reveal unit = paragraph; over-long → sentence sub-chunks → Task 3 (`splitForTranslation`) + Task 5 (`assembleParagraphGloss`). ✓
- Reveal-gated default; lazy per-¶; "Reveal all" opt-in + cancellable → Task 6 (`revealOne`/`revealAll`/`cancelBulk`). ✓
- Paragraph-pure (no word/sentence tapping; back-arrow hint) → Task 6 (no add path; FSRS hint). ✓
- BYOK shared with reader → Task 6 (`quality`/`onToggleQuality` props) + Task 7 (passed from PDFReader). ✓
- EN-doc gate → Task 7 (`!sentenceDisabled` on the entry) + e2e English-doc test. ✓
- Honesty marker / framing → Task 6 (header note + per-¶ `machine`). ✓
- Volume-safe + cancellable + resumable + offline → Task 6 (`translateDocument` + abort + cache + online state) + e2e cache/offline/cancel tests. ✓
- Reuse reveal reducer (id-agnostic) → Task 1 (extract + shim; sentence tests stay green). ✓
- `var(--color-*)`, React-19 purity (lazy `navigator.onLine`), no selector allocation (component-local state, not Zustand selectors) → Task 6. ✓
- Test plan (pure units TDD + e2e GO WILD) → Tasks 1–5 (units) + Task 8 (e2e). ✓

**Placeholder scan:** none — every code/test step contains complete content.

**Type/name consistency:** `revealState` exports (`createRevealState/isRevealed/reveal/hide/setShowAll/hideAll`) used identically in `revealState.js`, the `sentenceRevealState` shim, and `FullTranslationView`. `paragraphModel` exports (`buildParagraphs/splitForTranslation/planParagraphTranslation/assembleParagraphGloss`) match across the model file, its tests, and the component. `FullTranslationView` props (`pages/quality/onToggleQuality/hasKey/onBack`) match the Task 7 call site. The `{ chunks, perPara }` shape from `planParagraphTranslation` is consumed exactly that way in `revealAll`. ✓
