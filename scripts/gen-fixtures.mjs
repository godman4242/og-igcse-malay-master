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
await b.close()

// --- verify each parses (legacy build under Node) ---
const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs')
GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
const { readFile } = await import('fs/promises')

async function tokensOf(file) {
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
  await doc.destroy()
  return words
}

const twoColWords = await tokensOf(TWO_COL)
const scannedWords = await tokensOf(SCANNED)

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

console.log('✅ layout-2col.pdf tokens OK:', expected.join(', '))
console.log('✅ scanned.pdf has no text layer (degrade path OK)')
