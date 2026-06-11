# Study from a Past-Paper Photo or Scan — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner photograph/upload a printed past-paper page (image, or image-only PDF) and study it in the existing reader — free, on-device OCR feeding the unchanged reveal-gated gloss → FSRS pipeline.

**Architecture:** A pure orchestration module (`src/lib/ocr.js`, injected engine — mirrors `translateDocument.js`) emits the **exact `{pages:[{pageNum,text,paragraphs}]}` shape** the reader already consumes; a lazy WASM boundary (`src/lib/ocrEngine.js`, Tesseract.js 7, self-hosted) is the only impure part; `PDFReader.handleFile` branches on file type. **The word-gloss→FSRS core is never touched.**

**Tech Stack:** Tesseract.js 7 (WASM, Apache-2.0), self-hosted `tessdata_fast` (`msa`/`eng`), pdfjs-dist (rasterise scanned-PDF pages — already a dep), Vitest, Playwright, Zustand.

**Spec:** `docs/superpowers/specs/2026-06-11-past-paper-photo-ocr-design.md` (read it for WHY / decision log / acceptance criteria F1–F3, Q-ACC, Q-CONF, N1–N7).

---

## File structure (decomposition locked here)

- **Create** `src/lib/ocr.js` — pure helpers + `runOcr` orchestration (no DOM/network/WASM).
- **Create** `src/lib/ocr.test.js` — unit tests for the above.
- **Create** `src/lib/ocrEngine.js` — lazy Tesseract.js worker boundary (self-hosted paths).
- **Modify** `src/lib/pdf.js` — add `renderPdfPageToCanvas(doc, pageNum, scale)` for scanned-PDF rasterisation.
- **Modify** `package.json` — add `tesseract.js`; add `prebuild` asset-copy script.
- **Create** `scripts/copy-ocr-assets.mjs` — copy core+worker from node_modules + fetch `tessdata_fast` into `public/ocr/`.
- **Create** `scripts/gen-ocr-fixtures.mjs` — render known-text clean + blurry PNG fixtures (uses the `sharp` dev-dep).
- **Modify** `vite.config.js` — PWA runtime-cache rule for `/ocr/**` (offline OCR).
- **Modify** `src/store/useStore.js` — `pdfReader.ocrLang` pref + STORE_VERSION 28→29 migration.
- **Modify** `src/pages/PDFReader.jsx` — accept widening + camera capture + entry copy; `handleFile` image/scanned-PDF branch; OCR progress + cancel; quality note; low-confidence word cue; Layout-toggle gate on `pdfDoc`.
- **Create** `tests/e2e/past-paper-ocr.spec.js` — happy path, scanned-PDF detection, blurry note, go-wild.
- **Modify** `RESUME_HERE.md` + `CLAUDE.md` — feature note (final commit).

**Build order:** 1–2 pure logic → 3 engine → 4 deps/assets → 5 fixtures → 6 e2e-first happy path → 7–10 wiring → 11 go-wild e2e → 12 store pref → 13 docs/verify/deploy.

---

## Task 1: Pure OCR helpers (`src/lib/ocr.js`)

**Files:**
- Create: `src/lib/ocr.js`
- Test: `src/lib/ocr.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/ocr.test.js
import { describe, it, expect } from 'vitest'
import {
  paragraphsFromOcrText, pagesFromOcrResults, meanConfidence,
  isImageOnlyPdf, lowConfidenceWords, OCR_PDF_TEXT_FLOOR, LOW_CONFIDENCE,
} from './ocr'

describe('paragraphsFromOcrText', () => {
  it('splits on blank lines, collapses single newlines, trims', () => {
    const text = 'Saya suka makan.\nNasi lemak sedap.\n\nHari ini panas.\n'
    expect(paragraphsFromOcrText(text)).toEqual([
      'Saya suka makan. Nasi lemak sedap.',
      'Hari ini panas.',
    ])
  })
  it('handles CRLF and drops empty blocks', () => {
    expect(paragraphsFromOcrText('A\r\n\r\n\r\n  \r\nB')).toEqual(['A', 'B'])
  })
  it('non-string → []', () => {
    expect(paragraphsFromOcrText(null)).toEqual([])
    expect(paragraphsFromOcrText(undefined)).toEqual([])
  })
})

describe('pagesFromOcrResults', () => {
  it('produces the extractTextFromDoc shape, one page per result', () => {
    const { pages } = pagesFromOcrResults([{ text: 'Satu.\n\nDua.' }, { text: 'Tiga.' }])
    expect(pages).toEqual([
      { pageNum: 1, text: 'Satu.\n\nDua.', paragraphs: ['Satu.', 'Dua.'] },
      { pageNum: 2, text: 'Tiga.', paragraphs: ['Tiga.'] },
    ])
  })
  it('empty input → no pages', () => {
    expect(pagesFromOcrResults([]).pages).toEqual([])
  })
})

describe('meanConfidence', () => {
  it('averages numeric confidences, NaN-safe', () => {
    expect(meanConfidence([{ confidence: 90 }, { confidence: 70 }])).toBe(80)
    expect(meanConfidence([{ confidence: 90 }, { foo: 1 }])).toBe(90)
    expect(meanConfidence([])).toBe(0)
  })
})

describe('isImageOnlyPdf', () => {
  it('true for an empty-text-layer PDF with pages', () => {
    expect(isImageOnlyPdf([{ text: '   ' }, { text: '' }])).toBe(true)
  })
  it('false once text crosses the floor', () => {
    expect(isImageOnlyPdf([{ text: 'a'.repeat(OCR_PDF_TEXT_FLOOR + 1) }])).toBe(false)
  })
  it('false for no pages', () => {
    expect(isImageOnlyPdf([])).toBe(false)
  })
})

describe('lowConfidenceWords', () => {
  it('collects normalized words below the threshold', () => {
    const set = lowConfidenceWords([
      { text: 'Nasi', confidence: 95 },
      { text: 'Lemak', confidence: LOW_CONFIDENCE - 1 },
    ])
    expect(set.has('lemak')).toBe(true)
    expect(set.has('nasi')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/ocr.test.js`
Expected: FAIL — `Failed to resolve import "./ocr"`.

- [ ] **Step 3: Write the implementation**

```js
// src/lib/ocr.js
// Pure OCR orchestration + helpers — NO DOM, NO network, NO WASM (mirrors
// translateDocument.js). The runner takes an INJECTED `recognize`, so chunking,
// progress, abort, and the shape transform are fully unit-testable; the lazy
// Tesseract.js worker lives in ./ocrEngine.js and is the only impure part.
//
// Spec: docs/superpowers/specs/2026-06-11-past-paper-photo-ocr-design.md

// Below this much non-space text across all pages, a PDF is treated as
// "image-only" (no real text layer) and OCR is offered.
export const OCR_PDF_TEXT_FLOOR = 16
// Per-word confidence (0..100) below which a word gets the existing 'unverified' cue.
export const LOW_CONFIDENCE = 70

/** Split a Tesseract text blob into paragraphs (blank line = break). */
export function paragraphsFromOcrText(text) {
  if (typeof text !== 'string') return []
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(block => block.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** One OCR result per image/page → the EXACT shape of extractTextFromDoc(). */
export function pagesFromOcrResults(results) {
  const pages = (results || []).map((r, idx) => {
    const paragraphs = paragraphsFromOcrText(r && r.text)
    return { pageNum: idx + 1, text: paragraphs.join('\n\n'), paragraphs }
  })
  return { pages }
}

/** Mean word confidence (0..100), NaN-safe; empty → 0. */
export function meanConfidence(words) {
  const vals = (words || [])
    .map(w => (w && typeof w.confidence === 'number' ? w.confidence : NaN))
    .filter(n => !Number.isNaN(n))
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** True when extracted pages carry essentially no text layer (scanned PDF). */
export function isImageOnlyPdf(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return false
  let chars = 0
  for (const p of pages) {
    const t = (p && p.text) || (p && Array.isArray(p.paragraphs) ? p.paragraphs.join(' ') : '')
    chars += String(t).replace(/\s+/g, '').length
    if (chars >= OCR_PDF_TEXT_FLOOR) return false
  }
  return true
}

/** Set of normalized words whose OCR confidence is below `threshold`. */
export function lowConfidenceWords(words, threshold = LOW_CONFIDENCE) {
  const set = new Set()
  for (const w of words || []) {
    if (w && typeof w.confidence === 'number' && w.confidence < threshold && w.text) {
      set.add(String(w.text).toLowerCase().trim())
    }
  }
  return set
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/ocr.test.js`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocr.js src/lib/ocr.test.js
git commit -m "feat(ocr): pure OCR text→pages helpers + confidence (Task 1)"
```

---

## Task 2: `runOcr` orchestration (injected engine)

**Files:**
- Modify: `src/lib/ocr.js`
- Test: `src/lib/ocr.test.js`

- [ ] **Step 1: Add the failing tests**

```js
// append to src/lib/ocr.test.js
import { runOcr } from './ocr'

describe('runOcr', () => {
  const fake = (map) => async (img) => ({ text: map[img] ?? '', words: [{ text: 'x', confidence: 80 }] })

  it('runs images sequentially and returns the pages shape', async () => {
    const { pages } = await runOcr(['a', 'b'], { recognize: fake({ a: 'Satu.', b: 'Dua.' }) })
    expect(pages.map(p => p.text)).toEqual(['Satu.', 'Dua.'])
  })

  it('emits page-level progress', async () => {
    const seen = []
    await runOcr(['a', 'b'], { recognize: fake({ a: 'A', b: 'B' }), onProgress: p => seen.push(p) })
    expect(seen.at(-1)).toEqual({ done: 2, total: 2 })
  })

  it('a thrown image becomes an empty page, never kills the run', async () => {
    const recognize = async (img) => { if (img === 'bad') throw new Error('boom'); return { text: 'ok', words: [] } }
    const { pages } = await runOcr(['bad', 'good'], { recognize })
    expect(pages[0].paragraphs).toEqual([])
    expect(pages[1].text).toBe('ok')
  })

  it('abort stops further images (partial result)', async () => {
    const ctrl = new AbortController()
    let calls = 0
    const recognize = async () => { calls += 1; if (calls === 1) ctrl.abort(); return { text: 'p', words: [] } }
    const { pages } = await runOcr(['a', 'b', 'c'], { recognize, signal: ctrl.signal })
    expect(calls).toBe(1)
    expect(pages.length).toBe(1)
  })

  it('aggregates meanConfidence + lowConfidenceWords across images', async () => {
    const recognize = async () => ({ text: 'Lemak', words: [{ text: 'Lemak', confidence: 50 }] })
    const { meanConfidence: mc, lowConfidenceWords: low } = await runOcr(['a'], { recognize })
    expect(mc).toBe(50)
    expect(low.has('lemak')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/ocr.test.js`
Expected: FAIL — `runOcr is not a function`.

- [ ] **Step 3: Implement `runOcr`**

```js
// append to src/lib/ocr.js
/**
 * OCR a list of images sequentially (one WASM worker; OCR is memory-heavy).
 * `recognize` is INJECTED: (image) => Promise<{text, words:[{text,confidence}]}>.
 * - page-level progress via onProgress({done,total})
 * - AbortSignal stops between images; partial pages are returned (cancelled ≠ errored)
 * - a thrown image yields an empty page, never rejects the whole run
 * @returns {Promise<{pages, meanConfidence:number, lowConfidenceWords:Set<string>}>}
 */
export async function runOcr(images, { recognize, onProgress, signal } = {}) {
  const results = []
  const allWords = []
  if (typeof recognize !== 'function' || !Array.isArray(images)) {
    return { pages: [], meanConfidence: 0, lowConfidenceWords: new Set() }
  }
  const total = images.length
  for (let idx = 0; idx < images.length; idx += 1) {
    if (signal && signal.aborted) break
    try {
      const r = await recognize(images[idx])
      results.push({ text: (r && r.text) || '' })
      if (r && Array.isArray(r.words)) allWords.push(...r.words)
    } catch {
      results.push({ text: '' })
    }
    if (onProgress) onProgress({ done: idx + 1, total })
  }
  const { pages } = pagesFromOcrResults(results)
  return { pages, meanConfidence: meanConfidence(allWords), lowConfidenceWords: lowConfidenceWords(allWords) }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/ocr.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocr.js src/lib/ocr.test.js
git commit -m "feat(ocr): runOcr orchestration with progress + abort (Task 2)"
```

---

## Task 3: Lazy Tesseract.js engine boundary (`src/lib/ocrEngine.js`)

**Files:**
- Create: `src/lib/ocrEngine.js`
- Test: `src/lib/ocrEngine.test.js`

> WASM can't run in Vitest; we test only the **pure `flattenWords` helper** here. The worker path is exercised by e2e (Task 6/11). **Before writing, confirm the Tesseract.js v7 `createWorker(langs, oem, options)` signature + `recognize` output shape via context7** (`/naptha/tesseract.js`).

- [ ] **Step 1: Write the failing test (pure helper only)**

```js
// src/lib/ocrEngine.test.js
import { describe, it, expect } from 'vitest'
import { flattenWords } from './ocrEngine'

describe('flattenWords', () => {
  it('flattens blocks→paragraphs→lines→words to [{text,confidence}]', () => {
    const data = { blocks: [{ paragraphs: [{ lines: [{ words: [
      { text: 'Nasi', confidence: 95 }, { text: 'lemak', confidence: 60 },
    ] }] }] }] }
    expect(flattenWords(data)).toEqual([
      { text: 'Nasi', confidence: 95 },
      { text: 'lemak', confidence: 60 },
    ])
  })
  it('missing structure → []', () => {
    expect(flattenWords(null)).toEqual([])
    expect(flattenWords({})).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/ocrEngine.test.js`
Expected: FAIL — `Failed to resolve import "./ocrEngine"`.

- [ ] **Step 3: Implement the engine**

```js
// src/lib/ocrEngine.js
// Lazy WASM boundary for OCR — the ONLY impure part of the feature. Never
// imported eagerly (dynamic import keeps Tesseract.js out of the eager bundle,
// like driver.js/pdf). Self-hosted assets under /public/ocr (offline + the
// image never reaches any third-party CDN).
//
// Spec D6/D9/D10. VERIFY the v7 createWorker signature via context7 before edit.

const ASSET_BASE = '/ocr'

/** Pure: Tesseract `data` → flat [{text,confidence}] (blocks→para→lines→words). */
export function flattenWords(data) {
  const words = []
  for (const b of data?.blocks || [])
    for (const p of b?.paragraphs || [])
      for (const l of p?.lines || [])
        for (const w of l?.words || [])
          if (w && typeof w.text === 'string') words.push({ text: w.text, confidence: w.confidence })
  return words
}

const workerCache = new Map() // langKey → worker

/**
 * Create (or reuse) a Tesseract worker for the language set and return a
 * recognizer matching runOcr's injected contract.
 * @param {{langs?: string[], onProgress?: (p:{status:string,progress:number})=>void}} opts
 */
export async function createOcrRecognizer({ langs = ['msa'], onProgress } = {}) {
  const { createWorker } = await import('tesseract.js')
  const langKey = (Array.isArray(langs) ? langs : [langs]).join('+')
  let worker = workerCache.get(langKey)
  if (!worker) {
    worker = await createWorker(langKey, 1 /* OEM.LSTM_ONLY — smaller, no legacy data */, {
      corePath: `${ASSET_BASE}/core`,
      workerPath: `${ASSET_BASE}/worker.min.js`,
      langPath: `${ASSET_BASE}/lang`,
      cacheMethod: 'write', // IndexedDB cache → offline after first run
      gzip: true,
      logger: (m) => { if (onProgress && m && typeof m.progress === 'number') onProgress(m) },
    })
    workerCache.set(langKey, worker)
  }
  return {
    async recognize(image) {
      const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
      return { text: data?.text || '', words: flattenWords(data) }
    },
    async terminate() {
      try { await worker.terminate() } catch { /* already gone */ }
      workerCache.delete(langKey)
    },
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/ocrEngine.test.js`
Expected: PASS (flattenWords cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ocrEngine.js src/lib/ocrEngine.test.js
git commit -m "feat(ocr): lazy Tesseract.js engine boundary + flattenWords (Task 3)"
```

---

## Task 4: Dependency + self-hosted assets + PWA cache

**Files:**
- Modify: `package.json`
- Create: `scripts/copy-ocr-assets.mjs`
- Modify: `vite.config.js`

- [ ] **Step 1: Add the dependency**

Run: `npm install tesseract.js@^7.0.0`
Expected: `tesseract.js` (and `tesseract.js-core`) appear in `node_modules`; `package.json` `dependencies` updated.

- [ ] **Step 2: Write the asset-copy script**

```js
// scripts/copy-ocr-assets.mjs
// Copies the Tesseract.js core (WASM) + worker out of node_modules and fetches
// the tessdata_fast Malay+English models into public/ocr/ so OCR is self-hosted
// (offline + privacy). Idempotent; safe to re-run. Network needed ONCE for langs.
import { mkdir, cp, writeFile, access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = process.cwd()
const out = join(root, 'public', 'ocr')
const langDir = join(out, 'lang')
const coreDir = join(out, 'core')

await mkdir(coreDir, { recursive: true })
await mkdir(langDir, { recursive: true })

// 1) worker + core from node_modules
const workerSrc = require.resolve('tesseract.js/dist/worker.min.js')
await cp(workerSrc, join(out, 'worker.min.js'))
const coreSrc = dirname(require.resolve('tesseract.js-core/package.json'))
await cp(coreSrc, coreDir, { recursive: true })

// 2) tessdata_fast language models (gzipped) — fetched once, then committed/cached
const LANGS = ['msa', 'eng']
const BASE = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main'
for (const lang of LANGS) {
  const dest = join(langDir, `${lang}.traineddata.gz`)
  try { await access(dest); console.log(`skip ${lang} (exists)`); continue } catch { /* fetch */ }
  const res = await fetch(`${BASE}/${lang}.traineddata`)
  if (!res.ok) throw new Error(`fetch ${lang}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { gzipSync } = await import('node:zlib')
  await writeFile(dest, gzipSync(buf))
  console.log(`wrote ${lang}.traineddata.gz (${(buf.length / 1e6).toFixed(1)} MB raw)`)
}
console.log('OCR assets ready in public/ocr/')
```

> **Decision to confirm at impl (spec §4.4):** whether to **commit** `public/ocr/**` (multi-MB binaries in the repo) or `.gitignore` it and rely on the `prebuild` step on every machine/CI. Default: **gitignore + prebuild** (keeps the repo lean; the script is idempotent). Verify CI has network for the one-time lang fetch, or commit just the two `.gz` lang files (~1–2 MB each) and gitignore `core/`.

- [ ] **Step 3: Wire the script into build**

In `package.json` `scripts`, add (and verify the existing `build` is preserved):
```json
"ocr:assets": "node scripts/copy-ocr-assets.mjs",
"prebuild": "node scripts/copy-ocr-assets.mjs"
```

- [ ] **Step 4: Run it once + verify**

Run: `npm run ocr:assets`
Expected: `public/ocr/worker.min.js`, `public/ocr/core/*`, `public/ocr/lang/msa.traineddata.gz`, `public/ocr/lang/eng.traineddata.gz` exist.

- [ ] **Step 5: PWA runtime-cache for /ocr (offline OCR)**

In `vite.config.js`, in the `VitePWA({ workbox: { ... } })` block add a runtime caching rule (traineddata exceeds the 2 MB precache limit, so cache at runtime, not precache):
```js
runtimeCaching: [
  // ...existing rules...
  {
    urlPattern: ({ url }) => url.pathname.startsWith('/ocr/'),
    handler: 'CacheFirst',
    options: { cacheName: 'ocr-assets', expiration: { maxEntries: 16 } },
  },
],
```
> Verify the existing PWA config shape first; if `globPatterns` is used, exclude `ocr/**` from precache (`globIgnores: ['**/ocr/**']`) so the build doesn't fail on the large files.

- [ ] **Step 6: Verify build still green + bundle unchanged**

Run: `npm run build`
Expected: build succeeds; **eager `index-*.js` unchanged (±0)**; no Tesseract code in the eager bundle (it is dynamically imported). Note the new lazy chunk in the build output.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/copy-ocr-assets.mjs vite.config.js .gitignore
git commit -m "build(ocr): add tesseract.js dep, self-hosted asset copy, PWA cache (Task 4)"
```

---

## Task 5: Test fixtures (known-text PNGs)

**Files:**
- Create: `scripts/gen-ocr-fixtures.mjs`
- Create (generated): `tests/e2e/fixtures/ocr-clean-malay.png`, `ocr-blurry-malay.png`, `ocr-ground-truth.json`

- [ ] **Step 1: Write the fixture generator (uses the `sharp` dev-dep)**

```js
// scripts/gen-ocr-fixtures.mjs
// Renders a known printed Malay paragraph to a CLEAN png and a BLURRY png, and
// records the ground-truth text — so the e2e can assert OCR word-accuracy
// (Q-ACC) and the low-confidence note (Q-CONF) deterministically.
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dir = join(process.cwd(), 'tests', 'e2e', 'fixtures')
await mkdir(dir, { recursive: true })

const TEXT = 'Saya suka makan nasi lemak pada waktu pagi. Hari ini cuaca sangat panas dan cerah.'
const svg = `<svg width="1000" height="220" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="40" y="90" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" fill="black">Saya suka makan nasi lemak pada waktu pagi.</text>
  <text x="40" y="150" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" fill="black">Hari ini cuaca sangat panas dan cerah.</text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(join(dir, 'ocr-clean-malay.png'))
// blur strength is empirical: tune it up until the blurry fixture reliably drops
// Tesseract mean confidence below LOW_CONFIDENCE (70) for the Q-CONF test in Task 9.
await sharp(Buffer.from(svg)).blur(3.2).png().toFile(join(dir, 'ocr-blurry-malay.png'))
await writeFile(join(dir, 'ocr-ground-truth.json'), JSON.stringify({ text: TEXT }, null, 2))
console.log('OCR fixtures written to', dir)
```

- [ ] **Step 2: Add a script entry + run**

In `package.json` `scripts`: `"ocr:fixtures": "node scripts/gen-ocr-fixtures.mjs"`.
Run: `npm run ocr:fixtures`
Expected: the three fixture files exist under `tests/e2e/fixtures/`.

- [ ] **Step 3: Commit**

```bash
git add scripts/gen-ocr-fixtures.mjs package.json tests/e2e/fixtures/
git commit -m "test(ocr): known-text clean+blurry fixtures + ground truth (Task 5)"
```

---

## Task 6: e2e happy-path FIRST (drives the wiring), then the entry/accept wiring

**Files:**
- Create: `tests/e2e/past-paper-ocr.spec.js`
- Modify: `src/pages/PDFReader.jsx` (entry card + `accept` + capture; see Task 7 for `handleFile`)

- [ ] **Step 1: Write the failing happy-path e2e**

```js
// tests/e2e/past-paper-ocr.spec.js
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const fx = (n) => join(process.cwd(), 'tests', 'e2e', 'fixtures', n)
const groundTruth = JSON.parse(readFileSync(fx('ocr-ground-truth.json'), 'utf8'))

test('photo of printed Malay → readable, tappable text (F1, Q-ACC)', async ({ page }) => {
  await page.goto('/pdf-reader')
  // Upload the clean fixture via the (widened) file input.
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  // OCR progress appears, then resolves into reader text (allow generous time on CI).
  await expect(page.getByText(/Reading your page/i)).toBeVisible()
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })

  // Q-ACC: ≥90% of ground-truth content words present in the rendered text.
  // (Task 7 adds data-testid="reader-reflow" to the reflow container.)
  const rendered = (await page.getByTestId('reader-reflow').innerText()).toLowerCase()
  const words = groundTruth.text.toLowerCase().replace(/[.,]/g, '').split(/\s+/)
  const hit = words.filter(w => rendered.includes(w)).length
  expect(hit / words.length).toBeGreaterThanOrEqual(0.9)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- past-paper-ocr`
Expected: FAIL — the file input has `accept="application/pdf"` (rejects the PNG) / no OCR path yet.

- [ ] **Step 3: Widen accept + add capture + entry copy**

In `src/pages/PDFReader.jsx`, both file inputs (the empty-state at ~line 782 and the toolbar at ~line 834):
```jsx
// change accept on BOTH inputs:
<input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden"
  onChange={(e) => handleFile(e.target.files?.[0])} />
```
Empty-state card copy (~line 777) + a camera affordance:
```jsx
<p className="text-sm font-bold mb-1">Drop a PDF or photo, or take a picture</p>
<p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
  📸 Fill the frame · good light · hold the page flat — read on your device, never uploaded.
</p>
```
Add a second hidden input + a "Take a photo" button inside the empty-state card (mobile opens the rear camera):
```jsx
<button type="button"
  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click() }}
  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold"
  style={{ background: 'var(--color-accent)', color: '#fff' }}>
  Take a photo
</button>
<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
  onChange={(e) => handleFile(e.target.files?.[0])} />
```
Add the ref near the other refs (~line 125): `const cameraInputRef = useRef(null)`.

- [ ] **Step 4: Re-run e2e (will still fail at OCR — that's Task 7)**

Run: `npm run test:e2e -- past-paper-ocr`
Expected: the input now accepts the PNG; FAIL now at "Reading your page" / `nasi` (no OCR branch yet). Good — proceed to Task 7.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/past-paper-ocr.spec.js src/pages/PDFReader.jsx
git commit -m "feat(ocr): widen reader to images + camera capture; happy-path e2e (Task 6)"
```

---

## Task 7: `handleFile` image branch + OCR progress + cancel

**Files:**
- Modify: `src/pages/PDFReader.jsx`

- [ ] **Step 1: Add OCR state + the image branch**

Near the other `useState` (~line 81–145) add:
```jsx
const [ocrProgress, setOcrProgress] = useState(null) // null | number 0..1
const [ocrConfidence, setOcrConfidence] = useState(null) // null | 0..100
const ocrAbortRef = useRef(null)
const ocrRecognizerRef = useRef(null)
const getOcrLang = useStore(s => s.pdfReader?.ocrLang) // Task 12; default 'ms' → ['msa']
```

Replace `handleFile` (~line 158) with a type-branching version (keep the existing PDF path intact):
```jsx
const handleFile = async (file) => {
  if (!file) return
  setError(null)
  resetGloss()
  destroyDoc()
  const isImage = file.type?.startsWith('image/')
  if (isImage) return runImageOcr([file])
  // ---- existing PDF path ----
  setLoading(true)
  try {
    const { doc } = await loadPdf(file)
    docRef.current = doc
    setPdfDoc(doc)
    const { pages } = await extractTextFromDoc(doc)
    if (isImageOnlyPdf(pages)) { setLoading(false); return offerPdfOcr(doc, file) } // Task 8
    setPdfDoc(doc)
    setPdfData({ pages })
    addPdfRecent({ name: file.name, sizeKB: Math.round(file.size / 1024), pages: pages.length, kind: 'pdf' })
  } catch (e) {
    setError(e?.message || 'Failed to read PDF')
  } finally {
    setLoading(false)
  }
}
```

Add the OCR runner (uses `runOcr` + the lazy engine; forces reflow; sets confidence):
```jsx
const runImageOcr = useCallback(async (images, { fromPdf = false, name = 'photo' } = {}) => {
  const { runOcr } = await import('../lib/ocr')
  const { createOcrRecognizer } = await import('../lib/ocrEngine')
  setView('reflow')
  setPdfDoc(null)
  setOcrProgress(0)
  setError(null)
  const ctrl = new AbortController()
  ocrAbortRef.current = ctrl
  const langs = getOcrLang === 'en' ? ['eng'] : ['msa']
  try {
    const rec = await createOcrRecognizer({ langs, onProgress: (m) => setOcrProgress(m.progress) })
    ocrRecognizerRef.current = rec
    const { pages, meanConfidence, lowConfidenceWords } = await runOcr(images, {
      recognize: rec.recognize, signal: ctrl.signal,
      onProgress: ({ done, total }) => setOcrProgress(total ? done / total : 1),
    })
    if (ctrl.signal.aborted) return
    setPdfData({ pages })
    setOcrConfidence(meanConfidence)
    setLowConfTokens(lowConfidenceWords) // Task 9
    addPdfRecent({ name, sizeKB: 0, pages: pages.length, kind: fromPdf ? 'pdf' : 'image' })
  } catch (e) {
    if (e?.name !== 'AbortError') setError(e?.message || 'Could not read the photo')
  } finally {
    setOcrProgress(null)
    ocrAbortRef.current = null
  }
}, [getOcrLang])
```

Cancel + cleanup: extend the unmount effect (~line 217) and `clearPdf` to abort OCR + terminate the worker:
```jsx
// in the unmount effect and clearPdf:
ocrAbortRef.current?.abort()
ocrRecognizerRef.current?.terminate?.()
ocrRecognizerRef.current = null
```

- [ ] **Step 2: Render the OCR progress + cancel UI**

Extend the `loading` early-return region (~line 793) to also cover OCR progress:
```jsx
if (ocrProgress !== null) {
  return (
    <div className="text-center py-16 animate-fadeUp" aria-live="polite">
      <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
      <p className="text-sm font-bold">Reading your page… {Math.round((ocrProgress || 0) * 100)}%</p>
      <p className="text-[11px] mb-3" style={{ color: 'var(--color-dim)' }}>Stays on your device — nothing is uploaded.</p>
      <button onClick={() => ocrAbortRef.current?.abort()}
        className="px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        Cancel
      </button>
    </div>
  )
}
```

Add the imports at the top of the file: `import { isImageOnlyPdf } from '../lib/ocr'` (only the pure helper is eager; `runOcr`/engine are dynamically imported inside `runImageOcr`).

**Testability hook:** add `data-testid="reader-reflow"` to the reflow container wrapper (the `view === 'reflow' && (…)` block, ~line 922) so the Q-ACC e2e can scope its text read. One attribute, no behaviour change.

- [ ] **Step 3: Run the happy-path e2e to verify it passes**

Run: `npm run test:e2e -- past-paper-ocr`
Expected: PASS — progress shows, OCR resolves, `nasi` visible, ≥90% words present (Q-ACC).

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: build green (eager index unchanged), 0 lint errors (no new exhaustive-deps warnings).

- [ ] **Step 5: Commit**

```bash
git add src/pages/PDFReader.jsx
git commit -m "feat(ocr): image OCR branch with progress + cancel; reflow-forced (Task 7)"
```

---

## Task 8: Image-only PDF detection + offer + rasterise

**Files:**
- Modify: `src/lib/pdf.js` (add `renderPdfPageToCanvas`)
- Modify: `src/pages/PDFReader.jsx` (`offerPdfOcr`)

- [ ] **Step 1: Add the rasterise helper to `src/lib/pdf.js`**

```js
// append to src/lib/pdf.js
// Render one PDF page to a canvas (for OCR of a scanned/image-only PDF). scale
// 2 ≈ 144→288 DPI, the quality OCR wants. Caller owns the returned canvas.
export async function renderPdfPageToCanvas(doc, pageNum, scale = 2) {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}
```

- [ ] **Step 2: Add `offerPdfOcr` to PDFReader**

```jsx
// in PDFReader.jsx
const [pdfOcrOffer, setPdfOcrOffer] = useState(null) // null | {doc, file}
const offerPdfOcr = useCallback((doc, file) => { setPdfOcrOffer({ doc, file }) }, [])

const acceptPdfOcr = useCallback(async () => {
  const { doc, file } = pdfOcrOffer || {}
  setPdfOcrOffer(null)
  if (!doc) return
  const { renderPdfPageToCanvas } = await import('../lib/pdf')
  const maxPages = Math.min(doc.numPages, 10) // spec Q6 — cap; logged below
  if (doc.numPages > 10) console.info(`[ocr] capping scanned PDF at 10 of ${doc.numPages} pages`)
  const canvases = []
  for (let i = 1; i <= maxPages; i += 1) canvases.push(await renderPdfPageToCanvas(doc, i))
  await runImageOcr(canvases, { fromPdf: true, name: file?.name || 'scan.pdf' })
}, [pdfOcrOffer, runImageOcr])
```

Render the non-punitive offer (above the reader, when `pdfOcrOffer` is set):
```jsx
{pdfOcrOffer && (
  <div className="rounded-xl p-3 text-sm flex items-center justify-between gap-3"
    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }} aria-live="polite">
    <span>This PDF has no selectable text. Read it with on-device OCR?</span>
    <span className="flex gap-2">
      <button onClick={acceptPdfOcr} className="px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ background: 'var(--color-accent)', color: '#fff' }}>Read with OCR</button>
      <button onClick={() => { setPdfOcrOffer(null); clearPdf() }} className="px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>Cancel</button>
    </span>
  </div>
)}
```
> The `if (!pdfData && !loading)` empty-state early-return (~line 760) must NOT swallow the offer: add `&& !pdfOcrOffer` to that guard, or render the offer inside that branch. Verify the control flow when wiring.

- [ ] **Step 3: Add the detection e2e**

```js
// append to tests/e2e/past-paper-ocr.spec.js
test('image-only PDF is detected and offers OCR (F2)', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('scanned-malay.pdf')) // add to fixtures (a text-layer-less PDF)
  await expect(page.getByText(/no selectable text/i)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /Read with OCR/i }).click()
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })
})
```
> Add a `scanned-malay.pdf` fixture (a PDF that embeds `ocr-clean-malay.png` with no text layer) to `gen-ocr-fixtures.mjs` — embed the PNG into a one-page PDF via a tiny helper or commit a prepared file.

- [ ] **Step 4: Run e2e**

Run: `npm run test:e2e -- past-paper-ocr`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf.js src/pages/PDFReader.jsx scripts/gen-ocr-fixtures.mjs tests/e2e/fixtures/
git commit -m "feat(ocr): detect image-only PDFs, offer OCR, rasterise pages (Task 8)"
```

---

## Task 9: Quality note + low-confidence word cue (core-safe)

**Files:**
- Modify: `src/pages/PDFReader.jsx`

> **Core-safe approach (N7):** do NOT modify `buildGlossIndex`/grounding. Keep a `lowConfTokens` Set of normalized OCR words; in the reflow token render, add a subtle dotted underline + `title` when a token's normalized form is in the set. Approximate (by surface string, not position) — fine for a soft "check me" cue.

- [ ] **Step 1: Add state + the quality banner**

```jsx
const [lowConfTokens, setLowConfTokens] = useState(() => new Set()) // normalized words
// reset in resetGloss(): setLowConfTokens(new Set()); setOcrConfidence(null)
```
Render a dismissible note when confidence is low (place near the toolbar, when `pdfData` shown):
```jsx
{ocrConfidence !== null && ocrConfidence < 70 && (
  <div className="rounded-xl p-2.5 text-xs" aria-live="polite"
    style={{ background: 'rgba(255,193,7,0.12)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
    This photo came out a bit blurry — some words may be wrong. Tap a word to check, or retake for a cleaner read.
  </div>
)}
```

- [ ] **Step 2: Mark low-confidence tokens in the reflow render**

Where reflow tokens render their `<span>` (the token map in the `view === 'reflow'` branch, ~line 922+), add a conditional style when `lowConfTokens.has(normalizeWord(token.word))`:
```jsx
// normalizeWord is ALREADY imported in PDFReader.jsx (line 27) — no new import needed.
// This token <span> is the `else` branch after the p.kind==='space' / 'punct' checks (~line 1267+).
style={{
  ...existingTokenStyle,
  ...(lowConfTokens.has(normalizeWord(p.text))
    ? { textDecoration: 'underline dotted', textDecorationColor: 'var(--color-dim)' } : {}),
}}
title={lowConfTokens.has(normalizeWord(p.text)) ? 'Low-confidence scan — tap to check' : undefined}
```

- [ ] **Step 3: Add the blurry-fixture e2e (Q-CONF)**

```js
// append to tests/e2e/past-paper-ocr.spec.js
test('blurry photo surfaces the low-confidence note (Q-CONF)', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-blurry-malay.png'))
  await expect(page.getByText(/came out a bit blurry/i)).toBeVisible({ timeout: 60_000 })
})
```

- [ ] **Step 4: Run e2e + build/lint**

Run: `npm run test:e2e -- past-paper-ocr && npm run build && npm run lint`
Expected: PASS; build green; 0 lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PDFReader.jsx tests/e2e/past-paper-ocr.spec.js
git commit -m "feat(ocr): non-punitive blurry note + low-confidence word cue (Task 9)"
```

---

## Task 10: Layout-toggle gate on `pdfDoc`

**Files:**
- Modify: `src/pages/PDFReader.jsx`

- [ ] **Step 1: Gate the Layout button + the layout render branch**

Toolbar (~line 845): wrap the Layout `<button>` so it only renders when `pdfDoc` exists:
```jsx
{pdfDoc && (
  <button onClick={() => switchView('layout')} /* …unchanged… */>
    <LayoutTemplate size={12} /> Layout
  </button>
)}
```
Harden `switchView` (~line 146): `const switchView = (v) => { if (v === 'layout' && !pdfDoc) return; setView(v); setPdfLayoutView(v === 'layout') }`.
The `view === 'layout'` render branches (~line 1185, 1367) already require `pdfDoc`; confirm they no-op safely when null (they should, since an image never sets `view='layout'`).

- [ ] **Step 2: Add a go-wild guard e2e (image never shows Layout)**

```js
// append to tests/e2e/past-paper-ocr.spec.js
test('image source hides the Layout toggle (reflow only)', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: /^Layout$/ })).toHaveCount(0)
})
```

- [ ] **Step 3: Run e2e + build**

Run: `npm run test:e2e -- past-paper-ocr && npm run build`
Expected: PASS; green.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PDFReader.jsx tests/e2e/past-paper-ocr.spec.js
git commit -m "feat(ocr): gate Layout view to PDFs only (Task 10)"
```

---

## Task 11: Go-wild e2e hardening

**Files:**
- Modify: `tests/e2e/past-paper-ocr.spec.js`

- [ ] **Step 1: Add abuse-case tests (per [[feedback_go_wild_smoke_test]])**

```js
// append to tests/e2e/past-paper-ocr.spec.js
test('cancel mid-OCR returns to the empty state cleanly', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  await page.getByRole('button', { name: /Cancel/i }).click()
  await expect(page.getByText(/Drop a PDF or photo/i)).toBeVisible()
})

test('a non-image, non-pdf file errors gracefully (no crash)', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-ground-truth.json')) // .json
  // accept filter blocks it in real UI; if forced, the reader shows an error, not a white screen
  await expect(page.locator('body')).not.toContainText('Maximum update depth')
})

test('theme swap mid-read keeps the reader intact (light+dark)', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })
  await page.evaluate(() => document.documentElement.classList.toggle('light'))
  await expect(page.getByText(/nasi/i)).toBeVisible()
})

test('offline second run works after the model is cached (N5)', async ({ page, context }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })
  await context.setOffline(true)
  await page.reload()
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })
  await context.setOffline(false)
})
```

- [ ] **Step 2: Run the full OCR e2e + the existing PDF suite (F3 — no regression)**

Run: `npm run test:e2e`
Expected: new OCR specs PASS; the existing 65 PDF e2e still PASS (digital PDFs unchanged).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/past-paper-ocr.spec.js
git commit -m "test(ocr): go-wild — cancel, bad file, theme swap, offline (Task 11)"
```

---

## Task 12: OCR language preference (store) + STORE_VERSION 28→29

**Files:**
- Modify: `src/store/useStore.js`
- Modify: `src/pages/PDFReader.jsx` (a small MS/EN toggle on the entry card)

> Mirrors the shipped `examRehearsalLang` pattern. Persisted so "remember last" works.

- [ ] **Step 1: Add the pref + migration**

Match the EXACT established style (verified against the v24/v25/v28 migrations):
1. Initial-state `pdfReader` object (~line 188): add `ocrLang: 'ms',`.
2. Add a setter next to `setExamRehearsalLang` (~line 754): `setOcrLang: (lang) => set((s) => ({ pdfReader: { ...s.pdfReader, ocrLang: lang === 'en' ? 'en' : 'ms' } })),`.
3. Bump `export const STORE_VERSION = 28` → `29` (line 36) + update its comment.
4. Add the migration block alongside the others (~line 2057), mirroring v24/v25/v28:
```js
// Migrate to v29: PDF OCR language pref. Default Malay (0546, the primary
// syllabus) while preserving any existing choice.
if (version < 29) {
  state = {
    ...state,
    pdfReader: { ocrLang: 'ms', ...(state.pdfReader || {}) },
  };
}
```

- [ ] **Step 2: Add a MS/EN toggle to the entry card**

```jsx
const setOcrLang = useStore(s => s.setOcrLang)
const ocrLang = useStore(s => s.pdfReader?.ocrLang) || 'ms'
// near the upload card:
<div className="flex rounded-lg overflow-hidden mx-auto w-fit" style={{ border: '1px solid var(--color-border)' }}>
  {['ms', 'en'].map(l => (
    <button key={l} onClick={() => setOcrLang(l)} className="px-3 py-1 text-xs font-bold"
      style={{ background: ocrLang === l ? 'var(--color-accent)' : 'transparent', color: ocrLang === l ? '#fff' : 'var(--color-text)' }}>
      {l === 'ms' ? 'Malay' : 'English'}
    </button>
  ))}
</div>
```
(`runImageOcr` already reads `getOcrLang` → `['msa']`/`['eng']`.)

- [ ] **Step 3: Verify persistence + build/lint/test**

Run: `npm run build && npm run lint && npm run test:run`
Expected: all green; reload keeps the chosen language (manual check); STORE_VERSION reads 29.

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.js src/pages/PDFReader.jsx
git commit -m "feat(ocr): persisted MS/EN OCR language pref, STORE_VERSION 28→29 (Task 12)"
```

---

## Task 13: Docs, full verification, deploy

**Files:**
- Modify: `RESUME_HERE.md`, `CLAUDE.md`

- [ ] **Step 1: Full gate**

Run: `npm run build && npm run test:run && npm run lint && npm run test:e2e`
Expected: build green (record the new lazy OCR chunk size + confirm eager `index` unchanged); ~875+ unit tests green incl. the new `ocr`/`ocrEngine` tests; 0 lint errors; e2e green incl. existing PDF suite (F3).

- [ ] **Step 2: Eyeball light + dark** (manual): empty-state card, camera button, OCR progress + cancel, blurry note, low-confidence underline, scanned-PDF offer. Mobile viewport 390×844.

- [ ] **Step 3: Update docs**

`CLAUDE.md`: add OCR to the feature list + a one-liner under Architecture ("OCR: `src/lib/ocr.js` pure + `ocrEngine.js` lazy Tesseract.js, self-hosted, emits the `{pages}` shape — core untouched"). `RESUME_HERE.md`: a SHIPPED block (what landed, STORE_VERSION 29, new lazy chunk size, the Phase 2 BYOK-vision follow-up). Note the spec/plan paths.

- [ ] **Step 4: Commit (gate runs automatically) + confirm prod**

```bash
git add CLAUDE.md RESUME_HERE.md
git commit -m "docs(ocr): past-paper photo study shipped — feature notes + handoff (Task 13)"
```
Then confirm the PUBLIC Vercel deploy reaches READY (upg- project) per [[project_two_vercel_projects]].

---

## Self-review (plan ↔ spec)

**Spec coverage:** §2 in-scope items → Tasks 6 (image ingest + camera), 8 (image-only PDF), 1–3+7 (free OCR → `{pages}`), 9 (honest quality), 6 (capture guidance/privacy copy), 7 (reflow path). Acceptance F1→T6, F2→T8, F3→T11/T13, Q-ACC→T6, Q-CONF→T9, N1→T11(empty-key implicit; **add an explicit no-key assertion in T11 if a key UI exists on this route**), N2→privacy copy + self-host (no image fetch; T11 offline proves no network dependence on the image), N3→T4/T13, N4→T7, N5→T11, N6→T9/T13, N7→T9 approach. Open Qs Q1(read-only)→honoured (no editor task), Q2→T12, Q3→T4, Q4→T8, Q5→omitted preprocessing (default "none"; add a light upscale in T7 only if Q-ACC fails on real photos), Q6→T8 cap.

**Placeholder scan:** the two "verify at impl" notes (v7 API in T3; PWA/commit-vs-prebuild in T4) are explicit decisions with defaults, not blanks. The `scanned-malay.pdf` fixture (T8) and the empty-key assertion (N1) are the two items the implementer must produce — both called out.

**Type consistency:** `runOcr` returns `{pages, meanConfidence, lowConfidenceWords:Set}` (T2) — consumed identically in T7. `createOcrRecognizer().recognize` returns `{text, words}` (T3) — matches `runOcr`'s injected contract (T2). `pagesFromOcrResults` shape `{pageNum,text,paragraphs}` (T1) == `extractTextFromDoc` (verified in `pdf.js`). `lowConfTokens` Set<normalized> (T9) ← `lowConfidenceWords` (T1). Consistent.
</content>
