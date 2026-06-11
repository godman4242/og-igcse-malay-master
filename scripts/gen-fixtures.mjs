// gen-fixtures.mjs — generate the PDF Layout View test fixtures.
// Run once:  node scripts/gen-fixtures.mjs
// Produces (committed) tests/e2e/fixtures/layout-2col.pdf + scanned.pdf, then
// verifies each parses with the LEGACY pdfjs build (the main build warns/breaks
// under Node). layout-2col must yield real text tokens; scanned must yield zero.
import { chromium } from 'playwright'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.resolve(__dirname, '../tests/e2e/fixtures')
const TWO_COL = path.join(FIXTURES, 'layout-2col.pdf')
const SCANNED = path.join(FIXTURES, 'scanned.pdf')
const MULTI = path.join(FIXTURES, 'layout-multi.pdf')
const SENTENCES_MS = path.join(FIXTURES, 'sentences-malay.pdf')
const ENGLISH_DOC = path.join(FIXTURES, 'english-doc.pdf')
const LONG_PARA_MS = path.join(FIXTURES, 'long-paragraph-malay.pdf')
const DENSE_MS = path.join(FIXTURES, 'dense-malay.pdf')
const SPARSE_MS = path.join(FIXTURES, 'sparse-malay.pdf')

const b = await chromium.launch()
const p = await b.newPage()

// layout-2col.pdf: two columns + a black-ink SVG diagram + known tokens.
await p.setContent(`<div style="column-count:2;font:16px serif;padding:24px">
  <p>Lihat <b>rajah</b> di bawah. Saya suka <b>jam tangan</b> baru itu.</p>
  <svg width="120" height="80"><rect x="2" y="2" width="116" height="76" fill="none" stroke="#000" stroke-width="2"/><line x1="2" y1="2" x2="118" y2="78" stroke="#000"/></svg>
  <p style="break-before:column">Adik saya <b>membaca buku</b> di <b>rumah</b>.</p>
  <p>Halaman dua: <b>air</b> itu sejuk.</p></div>`)
await p.pdf({ path: TWO_COL, format: 'A4' })

// scanned.pdf: a RASTER image only → no text layer → exercises the degrade path.
// NB: SVG <text> would render as real (selectable) vector text in the PDF, so we
// rasterize the words onto a <canvas> and embed the resulting PNG bitmap — a true
// "scanned page" with zero getTextContent items.
await p.setContent('<canvas id="c" width="400" height="560"></canvas>')
const scannedDataUrl = await p.evaluate(() => {
  const c = document.getElementById('c')
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 400, 560)
  ctx.fillStyle = '#000'
  ctx.font = '28px serif'
  ctx.fillText('kertas imbasan', 40, 80)
  return c.toDataURL('image/png')
})
await p.setContent(`<img src="${scannedDataUrl}" style="width:100%"/>`)
await p.pdf({ path: SCANNED, format: 'A4' })

// layout-multi.pdf: 4 forced pages → exercises lazy render (page N only renders
// when scrolled near) + the page-count assertion. Each page has a marker token.
const pageBlock = (n, marker) => `<div style="break-after:page;height:1000px;font:16px serif;padding:24px">
  <h2>Muka surat ${n}</h2>
  <p>Ini ialah <b>${marker}</b> pada halaman ${n}. Saya suka <b>jam tangan</b> baru itu.</p>
</div>`
await p.setContent(`<div>${[1, 2, 3, 4].map((n) => pageBlock(n, `penanda${n}`)).join('')}</div>`)
await p.pdf({ path: MULTI, format: 'A4', printBackground: true })

// sentences-malay.pdf: a Malay passage for the sentence-level reveal e2e — several
// punctuation-sentences including one LONG sentence that wraps across visual lines
// (so the "reveal the WHOLE wrapped sentence" case is exercised). Rich in Malay
// function words so detectDocLanguage → 'ms' (Sentence mode stays enabled).
await p.setContent(`<div style="font:16px serif;padding:24px;max-width:380px">
  <p>Saya suka membaca buku di rumah pada waktu malam.</p>
  <p>Pada suatu hari yang cerah, adik saya dan kawan-kawannya pergi ke pasar bersama ibu untuk membeli ikan, sayur, dan buah-buahan yang masih segar di gerai berhampiran sungai itu.</p>
  <p>Apa khabar kamu hari ini?</p></div>`)
await p.pdf({ path: SENTENCES_MS, format: 'A4' })

// english-doc.pdf: an English-only passage (zero Malay markers, >=12 words) → the
// EN no-op: detectDocLanguage returns 'en' and Sentence mode is disabled with a reason.
await p.setContent(`<div style="font:16px serif;padding:24px;max-width:380px">
  <p>The weather today is bright and warm across the whole country.</p>
  <p>Children play happily in the park near the river while their parents rest.</p>
  <p>Birds sing softly from the tall green trees standing above the quiet path.</p></div>`)
await p.pdf({ path: ENGLISH_DOC, format: 'A4' })

// long-paragraph-malay.pdf: ONE Malay paragraph far longer than the gtx ~4000-char
// per-call cap, kept on a SINGLE page (tiny font + tight line-height so pdf.js does
// not paginate it — pagination would split it into one-paragraph-per-page and defeat
// the test). Exercises the Full-translation page's over-long path end-to-end:
// splitForTranslation must break it into >1 sentence sub-chunk and assembleParagraphGloss
// must rejoin them. Many Malay function words → detectDocLanguage stays 'ms'.
const longSentences = []
for (let i = 1; i <= 40; i += 1) {
  longSentences.push(`Pada hari yang ke-${i}, saya dan keluarga saya pergi ke pasar untuk membeli ikan, sayur, dan buah-buahan yang masih segar di gerai berhampiran sungai itu.`)
}
const longText = longSentences.join(' ') // ~40 × ~150 chars ≈ 6000 chars > 4000 cap
if (longText.length <= 4000) {
  console.error('❌ long-paragraph fixture text is not over the 4000-char cap:', longText.length)
  process.exit(1)
}
await p.setContent(`<div style="font:7px serif;line-height:1.1;padding:18px;max-width:520px"><p>${longText}</p></div>`)
await p.pdf({ path: LONG_PARA_MS, format: 'A4' })

// dense-malay.pdf: a passage WAY above a beginner's level — advanced/literary
// Malay nouns absent from the IGCSE beginner dictionary, with just enough common
// markers ("yang", "dan", "untuk", "ini") to register as Malay. ≥ 40% unknown,
// ≥ 20 content words → the dense-page nudge fires. (Self-verified below.)
await p.setContent(`<div style="font:14px serif;padding:24px;max-width:380px">
  <p>Perlembagaan dan kedaulatan negara memerlukan ketelusan, akauntabiliti, serta integriti
  yang menyeluruh untuk membendung penyelewengan, rasuah, dan ketirisan dalam pentadbiran.</p>
  <p>Kelestarian alam sekitar dan kebolehpasaran graduan ialah cabaran perindustrian yang
  menuntut penambahbaikan dasar, pemerkasaan komuniti, dan kecekapan birokrasi ini.</p></div>`)
await p.pdf({ path: DENSE_MS, format: 'A4' })

// sparse-malay.pdf: a beginner passage built almost entirely from dictionary
// words → density well below threshold → NO nudge. ≥ 20 content words.
await p.setContent(`<div style="font:14px serif;padding:24px;max-width:380px">
  <p>Saya suka membaca buku di rumah pada waktu pagi dan malam.</p>
  <p>Adik saya makan nasi dan minum air sejuk di dapur itu.</p>
  <p>Ibu dan bapa saya pergi ke pasar untuk membeli ikan dan sayur baru.</p></div>`)
await p.pdf({ path: SPARSE_MS, format: 'A4' })

await b.close()

// --- verify each parses (legacy build under Node) ---
const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs')
GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
const { readFile } = await import('fs/promises')

async function parse(file) {
  const data = new Uint8Array(await readFile(file))
  const doc = await getDocument({ data }).promise
  const words = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    for (const item of tc.items) {
      if (item.str) for (const w of item.str.split(/\s+/)) if (w) words.push(w)
    }
  }
  const numPages = doc.numPages
  await doc.destroy()
  return { words, numPages }
}

const twoColWords = (await parse(TWO_COL)).words
const scannedWords = (await parse(SCANNED)).words
const multi = await parse(MULTI)

const expected = ['rajah', 'jam', 'tangan', 'membaca', 'buku', 'rumah', 'air']
const missing = expected.filter((w) => !twoColWords.includes(w))
if (missing.length) {
  console.error('❌ layout-2col.pdf missing expected tokens:', missing)
  console.error('   got:', twoColWords.join(' '))
  process.exit(1)
}
if (scannedWords.length !== 0) {
  console.error('❌ scanned.pdf should have ZERO text items, got:', scannedWords)
  process.exit(1)
}
if (multi.numPages < 3) {
  console.error('❌ layout-multi.pdf should span >=3 pages, got:', multi.numPages)
  process.exit(1)
}
if (!multi.words.includes('penanda4')) {
  console.error('❌ layout-multi.pdf missing the last-page marker token penanda4')
  process.exit(1)
}

const msWords = (await parse(SENTENCES_MS)).words
const enWords = (await parse(ENGLISH_DOC)).words
const msExpected = ['Saya', 'membaca', 'pasar', 'khabar']
const msMissing = msExpected.filter((w) => !msWords.includes(w))
if (msMissing.length) {
  console.error('❌ sentences-malay.pdf missing expected tokens:', msMissing)
  process.exit(1)
}
if (!enWords.includes('weather') || !enWords.includes('Birds')) {
  console.error('❌ english-doc.pdf missing expected English tokens; got:', enWords.join(' '))
  process.exit(1)
}

const longParsed = await parse(LONG_PARA_MS)
if (longParsed.numPages !== 1) {
  console.error('❌ long-paragraph-malay.pdf must stay on ONE page (else the paragraph splits); got pages:', longParsed.numPages)
  process.exit(1)
}
if (!longParsed.words.includes('pasar') || longParsed.words.join(' ').length <= 4000) {
  console.error('❌ long-paragraph-malay.pdf should be a single >4000-char Malay paragraph; chars:', longParsed.words.join(' ').length)
  process.exit(1)
}

// Dense/sparse fixtures: verify the REAL density classification (the same code
// the app runs) so the e2e can trust them. Import the app modules directly.
const { default: DICTIONARY } = await import('../src/data/dictionary.js')
const { unknownDensity, isDense } = await import('../src/lib/unknownDensity.js')
const { detectDocLanguage } = await import('../src/lib/sentenceModel.js')
const { buildGroundingIndex } = await import('../src/lib/dictionaryGrounding.js')
const DICT_PAIRS = Object.entries(DICTIONARY).map(([m, e]) => ({ m, e }))
const grounding = buildGroundingIndex(DICT_PAIRS, []) // fresh learner: no cards

const denseWords = (await parse(DENSE_MS)).words
const sparseWords = (await parse(SPARSE_MS)).words
const denseD = unknownDensity(denseWords, DICTIONARY, grounding)
const sparseD = unknownDensity(sparseWords, DICTIONARY, grounding)

if (detectDocLanguage(denseWords) !== 'ms') {
  console.error('❌ dense-malay.pdf must detect as Malay; got:', detectDocLanguage(denseWords))
  process.exit(1)
}
if (!isDense(denseD)) {
  console.error('❌ dense-malay.pdf must be DENSE (≥20 words, ≥40% unknown); got:', denseD)
  process.exit(1)
}
if (detectDocLanguage(sparseWords) !== 'ms') {
  console.error('❌ sparse-malay.pdf must detect as Malay; got:', detectDocLanguage(sparseWords))
  process.exit(1)
}
if (isDense(sparseD)) {
  console.error('❌ sparse-malay.pdf must NOT be dense; got:', sparseD)
  process.exit(1)
}

console.log('✅ layout-2col.pdf tokens OK:', expected.join(', '))
console.log('✅ scanned.pdf has no text layer (degrade path OK)')
console.log(`✅ layout-multi.pdf spans ${multi.numPages} pages (penanda1..penanda4)`)
console.log('✅ sentences-malay.pdf Malay sentences OK (incl. long wrapping sentence)')
console.log('✅ english-doc.pdf English-only OK (EN no-op path)')
console.log(`✅ long-paragraph-malay.pdf single-page over-long paragraph OK (${longParsed.words.join(' ').length} chars, 1 page)`)
console.log(`✅ dense-malay.pdf DENSE OK (${denseD.unknown}/${denseD.total} unknown = ${(denseD.ratio * 100).toFixed(0)}%, lang=ms)`)
console.log(`✅ sparse-malay.pdf sparse OK (${sparseD.unknown}/${sparseD.total} unknown = ${(sparseD.ratio * 100).toFixed(0)}%, lang=ms)`)
