// gen-ocr-fixtures.mjs — generate the past-paper OCR test fixtures.
// Run once:  npm run ocr:fixtures
//
// Produces (committed) under tests/e2e/fixtures/:
//   ocr-clean-malay.png   — known printed Malay sentence, crisp  (Q-ACC pipeline floor)
//   ocr-blurry-malay.png  — same text, blurred                   (Q-CONF low-confidence note)
//   scanned-malay.pdf     — the clean image embedded in a PDF with ZERO text layer
//                           (Task 8 image-only-PDF detection + OCR offer)
//   ocr-ground-truth.json — { text } for the word-accuracy assertion
//
// Deviation from the plan's sharp+SVG approach: this mirrors the repo's proven
// scripts/gen-fixtures.mjs (Chromium canvas → PNG / raster-image PDF). Canvas text
// rendering avoids the librsvg font-availability risk, and the <img>→page.pdf()
// trick yields a true scanned page with no selectable text (same as scanned.pdf).
import { chromium } from 'playwright'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { mkdir, writeFile, readFile } from 'fs/promises'
import path from 'path'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.resolve(__dirname, '../tests/e2e/fixtures')
await mkdir(FIXTURES, { recursive: true })

const CLEAN_PNG = path.join(FIXTURES, 'ocr-clean-malay.png')
const BLURRY_PNG = path.join(FIXTURES, 'ocr-blurry-malay.png')
const SCANNED_PDF = path.join(FIXTURES, 'scanned-malay.pdf')
const GROUND_TRUTH = path.join(FIXTURES, 'ocr-ground-truth.json')

const LINE1 = 'Saya suka makan nasi lemak pada waktu pagi.'
const LINE2 = 'Hari ini cuaca sangat panas dan cerah.'
const TEXT = `${LINE1} ${LINE2}`

const b = await chromium.launch()
const p = await b.newPage()

// Render the two lines onto a high-res white canvas; return clean + blurred PNGs
// as base64. High resolution + strong contrast = a reliable OCR pipeline floor.
const { clean, blurry } = await p.evaluate(({ line1, line2 }) => {
  function draw(blurPx) {
    const c = document.createElement('canvas')
    c.width = 1600
    c.height = 520
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.filter = blurPx ? `blur(${blurPx}px)` : 'none'
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '600 64px "Helvetica Neue", Arial, sans-serif'
    ctx.fillText(line1, 60, 200)
    ctx.fillText(line2, 60, 360)
    return c.toDataURL('image/png')
  }
  // blur 9px is empirically tuned: Tesseract's internal Otsu binarisation
  // shrugs off light blur AND speckle noise (it denoises), so only heavy blur
  // smears the glyphs enough to crater mean word-confidence (~21, well under the
  // LOW_CONFIDENCE=70 gate) while still detecting word regions to carry the cue.
  return { clean: draw(0), blurry: draw(9) }
}, { line1: LINE1, line2: LINE2 })

const toBuf = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64')
await writeFile(CLEAN_PNG, toBuf(clean))
await writeFile(BLURRY_PNG, toBuf(blurry))
await writeFile(GROUND_TRUTH, JSON.stringify({ text: TEXT }, null, 2))

// scanned-malay.pdf: embed the CLEAN raster image only → a one-page PDF with no
// selectable text layer (isImageOnlyPdf → true). The image fills the page width
// so a scale-2 rasterise (Task 8) yields an OCR-able render.
await p.setContent(`<img src="${clean}" style="width:100%;display:block"/>`)
await p.pdf({ path: SCANNED_PDF, format: 'A4', printBackground: true })

await b.close()

// --- verify the scanned PDF truly has ZERO text items (legacy build under Node) ---
const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs')
GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
const data = new Uint8Array(await readFile(SCANNED_PDF))
const doc = await getDocument({ data }).promise
let textItems = 0
for (let i = 1; i <= doc.numPages; i += 1) {
  const tc = await (await doc.getPage(i)).getTextContent()
  textItems += tc.items.filter((it) => it.str && it.str.trim()).length
}
await doc.destroy()
if (textItems !== 0) {
  console.error(`❌ scanned-malay.pdf should have ZERO text items, got ${textItems}`)
  process.exit(1)
}

console.log('OCR fixtures written to', FIXTURES)
console.log(`  ground truth: "${TEXT}"`)
console.log(`  scanned-malay.pdf: ${doc.numPages} page, 0 text items ✓`)
