// scripts/asr-accuracy-harness.mjs — measure on-device Whisper word accuracy (1 − WER)
// on real {audio, ground-truth} fixtures. MANUAL, never CI (spec D10: a real model +
// audio decode + non-determinism don't belong in the commit gate — same rule as OCR).
//
// Run:
//   node scripts/asr-accuracy-harness.mjs [--dir <folder>] [--lang ms|en] [--model <id>] [--remote]
//     --dir <folder>  every .wav with a same-name .txt ground truth beside it. Without
//                     --dir, falls back to the committed e2e fixtures (asr-clean-*.wav
//                     vs asr-ground-truth.json).
//     --lang ms|en    Whisper language hint (default ms).
//     --model <id>    model to load (default 'model' = the self-hosted public/asr dir).
//     --remote        allow loading <id> from the HF Hub (Task-0 generic baseline);
//                     omit it for the self-hosted local model.
//
// NODE AUDIO NOTE: transformers.js read_audio() needs a browser AudioContext, so in Node
// we decode the WAV ourselves with `wavefile` → 16 kHz mono Float32Array and pass that to
// the pipeline (per HF's node-audio-processing guide). WAV fixtures only in Node.
//
// Records the real Malay/English WER in RESUME_HERE.md (spec Q-WER — the
// on-device-primary gate: Malay must be ≤ 40% WER / ≥ 60% accuracy).
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pipeline, env } from '@huggingface/transformers'
import wavefile from 'wavefile'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.resolve(__dirname, '../tests/e2e/fixtures')
const arg = (f) => { const i = process.argv.indexOf(f); return i !== -1 ? process.argv[i + 1] : null }
const modelId = arg('--model') || 'model'
const remote = process.argv.includes('--remote')
const lang = arg('--lang') || 'ms'
const dtype = arg('--dtype') || 'q8' // q8 = what we ship; fp32 to measure an un-quantized export
env.allowRemoteModels = remote
env.localModelPath = path.resolve(__dirname, '../public/asr')

// Word accuracy = 1 − WER (word-level Levenshtein over normalized tokens). Copied from
// scripts/ocr-accuracy-harness.mjs so the OCR + ASR harnesses report the same metric.
function wordAccuracy(ref, hyp) {
  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean)
  const r = norm(ref), h = norm(hyp)
  if (!r.length) return 0
  const dp = Array.from({ length: r.length + 1 }, (_, i) => { const row = new Array(h.length + 1).fill(0); row[0] = i; return row })
  for (let j = 0; j <= h.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= r.length; i += 1) for (let j = 1; j <= h.length; j += 1)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1))
  return Math.max(0, 1 - dp[r.length][h.length] / r.length)
}

// WAV → 16 kHz mono Float32Array (transformers.js can't decode audio paths in Node).
function loadAudio(file) {
  const wav = new wavefile.WaveFile(readFileSync(file))
  wav.toBitDepth('32f')
  wav.toSampleRate(16000)
  let samples = wav.getSamples()
  if (Array.isArray(samples)) {
    if (samples.length > 1) {
      const S = Math.sqrt(2) // merge channels into the first
      for (let i = 0; i < samples[0].length; i += 1) samples[0][i] = (S * (samples[0][i] + samples[1][i])) / 2
    }
    samples = samples[0]
  }
  return Float32Array.from(samples)
}

const dirFlag = process.argv.indexOf('--dir')
let pairs
if (dirFlag !== -1 && process.argv[dirFlag + 1]) {
  const dir = path.resolve(process.argv[dirFlag + 1])
  let files = readdirSync(dir).filter((f) => /\.wav$/i.test(f))
  // If the folder tags language by filename prefix (e.g. `ms-0.wav`, `en-3.wav`),
  // respect --lang so a clip is never transcribed with the wrong language hint.
  // Untagged single-language folders fall through and use every wav.
  const tagged = files.filter((f) => new RegExp(`^${lang}[-_.]`, 'i').test(f))
  if (tagged.length) files = tagged
  pairs = files
    .map((f) => ({ name: f, audio: path.join(dir, f), truthFile: path.join(dir, f.replace(/\.[^.]+$/, '.txt')) }))
    .filter((p) => existsSync(p.truthFile)).map((p) => ({ ...p, truth: readFileSync(p.truthFile, 'utf8') }))
} else {
  const gt = JSON.parse(readFileSync(path.join(FIXTURES, 'asr-ground-truth.json'), 'utf8'))
  const f = `asr-clean-${lang === 'en' ? 'english' : 'malay'}.wav`
  pairs = [{ name: f, audio: path.join(FIXTURES, f), truth: gt[lang] }].filter((p) => existsSync(p.audio))
}
if (!pairs.length) { console.error('No {audio, ground-truth} pairs found.'); process.exit(1) }
pairs.sort((a, b) => a.name.localeCompare(b.name))

console.log(`Model: ${modelId}${remote ? ' (remote Hub)' : ' (self-hosted public/asr)'} · lang=${lang} · ${pairs.length} clip(s)\n`)
const t = await pipeline('automatic-speech-recognition', modelId, { dtype })
const rows = []
let sum = 0
for (const p of pairs) {
  const out = await t(loadAudio(p.audio), { language: lang === 'en' ? 'english' : 'malay', task: 'transcribe', chunk_length_s: 30, return_timestamps: true })
  const acc = wordAccuracy(p.truth, out.text || '')
  sum += acc
  rows.push({ fixture: p.name, accuracy: `${(acc * 100).toFixed(1)}%`, wer: `${((1 - acc) * 100).toFixed(1)}%` })
}
const meanAcc = sum / rows.length
rows.push({ fixture: `MEAN (${lang})`, accuracy: `${(meanAcc * 100).toFixed(1)}%`, wer: `${((1 - meanAcc) * 100).toFixed(1)}%` })
console.table(rows)
console.log('Q-WER gate: Malay must be ≥ 60% accuracy (≤ 40% WER) to ship on-device-primary.')
console.log('Record the numbers in RESUME_HERE.md (manual gate, spec D10 — never CI).')
