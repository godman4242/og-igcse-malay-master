// Copies the Tesseract.js v7 worker + the LSTM-only WASM core variants out of
// node_modules and fetches the tessdata_fast Malay+English models into
// public/ocr/ so OCR is self-hosted (offline + privacy: the image never reaches
// a third-party CDN). Idempotent; safe to re-run. Network is needed ONCE for the
// language models (then they're committed and the fetch is skipped).
//
// Why LSTM-only cores: the engine runs createWorker(..., 1 /* OEM.LSTM_ONLY */),
// and tesseract.js getCore.js only ever imports a `*-lstm.wasm.js` variant
// (relaxedsimd / simd / plain, by browser capability). Shipping the full/legacy
// and asm.js cores (~30 MB extra) would be dead weight. Each browser fetches
// exactly one ~6.7 MB variant at runtime, cached thereafter.
//
// Spec: docs/superpowers/specs/2026-06-11-past-paper-photo-ocr-design.md (§4.4, D6)
import { mkdir, cp, writeFile, access, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const require = createRequire(import.meta.url)
const root = process.cwd()
const out = join(root, 'public', 'ocr')
const langDir = join(out, 'lang')
const coreDir = join(out, 'core')

await mkdir(coreDir, { recursive: true })
await mkdir(langDir, { recursive: true })

// 1) worker script from node_modules
const workerSrc = require.resolve('tesseract.js/dist/worker.min.js')
await cp(workerSrc, join(out, 'worker.min.js'))

// 2) LSTM-only WASM core variants (the 6 files getCore.js can request)
const coreSrcDir = dirname(require.resolve('tesseract.js-core/package.json'))
const LSTM_CORE = /-lstm\.wasm(\.js)?$/ // matches *-lstm.wasm.js and *-lstm.wasm
const coreFiles = (await readdir(coreSrcDir)).filter((f) => LSTM_CORE.test(f))
if (coreFiles.length < 6) {
  throw new Error(`expected ≥6 LSTM core files, found ${coreFiles.length}: ${coreFiles.join(', ')}`)
}
for (const f of coreFiles) await cp(join(coreSrcDir, f), join(coreDir, f))
console.log(`copied worker + ${coreFiles.length} LSTM core files → public/ocr/core/`)

// 3) tessdata_fast language models (gzipped) — fetched once, then committed
const LANGS = ['msa', 'eng']
const BASE = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main'
for (const lang of LANGS) {
  const dest = join(langDir, `${lang}.traineddata.gz`)
  try { await access(dest); console.log(`skip ${lang} (exists)`); continue } catch { /* fetch */ }
  const res = await fetch(`${BASE}/${lang}.traineddata`)
  if (!res.ok) throw new Error(`fetch ${lang}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, gzipSync(buf))
  console.log(`wrote ${lang}.traineddata.gz (${(buf.length / 1e6).toFixed(1)} MB raw)`)
}
console.log('OCR assets ready in public/ocr/')
