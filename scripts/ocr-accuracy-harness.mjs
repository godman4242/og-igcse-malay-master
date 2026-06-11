// ocr-accuracy-harness.mjs — Q-VIS: measure Tesseract vs BYOK-vision word
// accuracy (1 − WER) on real fixtures. MANUAL, not CI (spec D12: a live key,
// network, and a non-deterministic model don't belong in the commit gate).
//
// Run:  GEMINI_KEY=AIza... node scripts/ocr-accuracy-harness.mjs [--dir <folder>]
//
//   --dir <folder>  every image (.png/.jpg/.jpeg) with a same-name .txt ground
//                   truth beside it. Without --dir, falls back to the committed
//                   e2e fixtures (ocr-clean-malay.png + ocr-blurry-malay.png vs
//                   ocr-ground-truth.json).
//   GEMINI_MODEL    optional override (default gemini-3.5-flash).
//
// Without GEMINI_KEY it still prints the Tesseract column (vision column skipped).
// Record the numbers in RESUME_HERE.md. Target (spec Q-VIS): vision ≥ 90% on the
// messy-printed fixture and strictly > Tesseract on every fixture.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildVisionMessages, cleanVisionText } from '../src/lib/ocrVision.js'
import { buildGeminiVisionRequest, parseGeminiResponse } from '../src/lib/instructProviders/gemini.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.resolve(__dirname, '../tests/e2e/fixtures')
const LANG_PATH = path.resolve(__dirname, '../public/ocr/lang')

const GEMINI_KEY = process.env.GEMINI_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'

// Word accuracy = 1 − WER (word-level Levenshtein over normalized tokens).
function wordAccuracy(ref, hyp) {
  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean)
  const r = norm(ref)
  const h = norm(hyp)
  if (!r.length) return 0
  const dp = Array.from({ length: r.length + 1 }, (_, i) => {
    const row = new Array(h.length + 1).fill(0)
    row[0] = i
    return row
  })
  for (let j = 0; j <= h.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= r.length; i += 1) {
    for (let j = 1; j <= h.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1),
      )
    }
  }
  return Math.max(0, 1 - dp[r.length][h.length] / r.length)
}

function discoverPairs() {
  const dirFlag = process.argv.indexOf('--dir')
  if (dirFlag !== -1 && process.argv[dirFlag + 1]) {
    const dir = path.resolve(process.argv[dirFlag + 1])
    return readdirSync(dir)
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .map((f) => ({ image: path.join(dir, f), truthFile: path.join(dir, f.replace(/\.(png|jpe?g)$/i, '.txt')) }))
      .filter((p) => existsSync(p.truthFile))
      .map((p) => ({ name: path.basename(p.image), image: p.image, truth: readFileSync(p.truthFile, 'utf8') }))
  }
  // Default: the committed e2e fixtures (clean + blurry share one ground truth).
  const truth = JSON.parse(readFileSync(path.join(FIXTURES, 'ocr-ground-truth.json'), 'utf8')).text
  return ['ocr-clean-malay.png', 'ocr-blurry-malay.png']
    .map((f) => ({ name: f, image: path.join(FIXTURES, f), truth }))
    .filter((p) => existsSync(p.image))
}

async function makeTesseract() {
  const { createWorker } = await import('tesseract.js')
  // Same self-hosted gzipped traineddata the app ships (public/ocr/lang).
  return createWorker('msa', 1, { langPath: LANG_PATH, gzip: true, cacheMethod: 'none' })
}

async function visionTranscribe(imagePath) {
  const data = readFileSync(imagePath).toString('base64')
  const mimeType = /\.png$/i.test(imagePath) ? 'image/png' : 'image/jpeg'
  const { systemPrompt, messages } = buildVisionMessages({ lang: 'ms' })
  const body = buildGeminiVisionRequest({ systemPrompt, messages, images: [{ mimeType, data }], maxTokens: 4096 })
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
  return cleanVisionText(parseGeminiResponse(await res.json()))
}

const pairs = discoverPairs()
if (!pairs.length) {
  console.error('No {image, ground-truth} pairs found.')
  process.exit(1)
}
if (!GEMINI_KEY) {
  console.log('⚠ GEMINI_KEY not set — vision column will be skipped (Tesseract only).\n')
}

console.log(`Fixtures: ${pairs.length} · Tesseract msa (self-hosted) vs ${GEMINI_KEY ? GEMINI_MODEL : 'vision SKIPPED'}\n`)
const worker = await makeTesseract()
const rows = []
for (const p of pairs) {
  const { data } = await worker.recognize(p.image)
  const tessAcc = wordAccuracy(p.truth, data?.text || '')
  let visAcc = null
  if (GEMINI_KEY) {
    try {
      visAcc = wordAccuracy(p.truth, await visionTranscribe(p.image))
    } catch (e) {
      console.error(`  vision failed on ${p.name}: ${e.message}`)
    }
  }
  rows.push({ fixture: p.name, tesseract: `${(tessAcc * 100).toFixed(1)}%`, vision: visAcc == null ? '—' : `${(visAcc * 100).toFixed(1)}%` })
}
await worker.terminate()

console.table(rows)
console.log('Q-VIS target: vision ≥ 90% on the messy fixture AND > Tesseract on every fixture.')
console.log('Record the numbers in RESUME_HERE.md (manual gate, spec D12 — never CI).')
