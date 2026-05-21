#!/usr/bin/env node
//
// Generates AI dictionary icons via the Gemini 2.5 Flash Image API,
// then converts the PNG payload to size-bounded WebP via `cwebp` from
// libwebp. Idempotent: only generates entries missing from the manifest
// or missing on disk. Throttled to ~15 req/min for free-tier safety.
//
// Run via: npm run gen:dict-icons -- [flags]
//
// Flags:
//   --only=a,b,c    Generate only these Malay keys
//   --force         Re-generate even if cached
//   --dry-run       Print the plan without calling the API
//   --quality=85    cwebp quality (default 85)
//   --size=256      Output edge in pixels (default 256)
//   --help          This message
//
// The script reads VITE_GEMINI_KEY from the process env. The npm
// script wires `--env-file=.env.local` so the key loads automatically
// from the project's local env file.

import { readFile, writeFile, mkdir, access, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const execFileP = promisify(execFile)

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ICONS_DIR = join(ROOT, 'public', 'dict-icons')
const MANIFEST_PATH = join(ROOT, 'src', 'data', 'dictionaryIconsManifest.json')
const ICONS_SOURCE = join(ROOT, 'src', 'data', 'dictionaryIcons.js')

const MODEL = 'gemini-2.5-flash-image'
const RATE_DELAY_MS = 4000
const DEFAULT_QUALITY = 85
const DEFAULT_SIZE = 256

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  console.log(`Usage: npm run gen:dict-icons -- [flags]

Flags:
  --only=a,b,c    Generate only these Malay keys
  --force         Re-generate even if cached
  --dry-run       Print the plan without calling the API
  --quality=85    cwebp quality (default 85)
  --size=256      Output edge in pixels (default 256)
  --help          This message
`)
  process.exit(0)
}

async function main() {
  const apiKey = process.env.VITE_GEMINI_KEY || process.env.GEMINI_KEY
  if (!apiKey) die('VITE_GEMINI_KEY or GEMINI_KEY missing. Set it in .env.local or pass via env.')

  await ensureCwebp()
  await mkdir(ICONS_DIR, { recursive: true })

  const allKeys = await readEmojiMapKeys()
  let target = allKeys
  if (args.only && args.only.length) {
    target = args.only.filter(k => allKeys.includes(k))
    const unknown = args.only.filter(k => !allKeys.includes(k))
    if (unknown.length) console.warn(`Skipping unknown keys: ${unknown.join(', ')}`)
  }

  const manifest = await loadManifest()
  const planned = []
  const cached = []
  for (const key of target) {
    const slug = slugify(key)
    const outPath = join(ICONS_DIR, `${slug}.webp`)
    const fileExists = await pathExists(outPath)
    const hasEntry = !!manifest.icons[key]
    if (!args.force && fileExists && hasEntry) {
      cached.push(key); continue
    }
    planned.push({ key, slug, outPath })
  }

  console.log(`Plan: ${planned.length} to generate, ${cached.length} cached, ${target.length} total`)
  if (planned.length === 0) { console.log('Nothing to do.'); return }
  if (args.dryRun) {
    console.log('Dry run — would generate:')
    for (const p of planned) console.log(`  ${p.key} -> ${p.slug}.webp`)
    return
  }

  let okCount = 0, failCount = 0
  for (const [i, p] of planned.entries()) {
    process.stdout.write(`[${i + 1}/${planned.length}] ${p.key}... `)
    try {
      const png = await callGeminiImage({ apiKey, key: p.key })
      await pngToWebp(png, p.outPath, args.size || DEFAULT_SIZE, args.quality || DEFAULT_QUALITY)
      manifest.icons[p.key] = {
        file: `${p.slug}.webp`,
        at: new Date().toISOString(),
      }
      manifest.generatedAt = new Date().toISOString()
      manifest.model = MODEL
      await saveManifest(manifest)
      console.log('OK')
      okCount++
    } catch (err) {
      console.log(`FAIL — ${err.message}`)
      failCount++
    }
    if (i < planned.length - 1) await sleep(RATE_DELAY_MS)
  }

  console.log(`\nDone. ${okCount} generated, ${failCount} failed, ${cached.length} cached.`)
  if (failCount > 0) process.exit(2)
}

async function readEmojiMapKeys() {
  const src = await readFile(ICONS_SOURCE, 'utf8')
  const keys = []
  const re = /^\s*['"]?([a-zA-Z][a-zA-Z\s-]*?)['"]?\s*:\s*['"][^'"]+['"]\s*,?\s*$/gm
  let m
  while ((m = re.exec(src)) !== null) keys.push(m[1].trim())
  if (!keys.length) die('Found 0 keys in src/data/dictionaryIcons.js')
  return keys
}

async function loadManifest() {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8')
    const json = JSON.parse(raw)
    if (!json.icons) json.icons = {}
    return json
  } catch {
    return {
      version: 1,
      model: MODEL,
      style: 'minimalist Southeast-Asian flat icon, high contrast, no text',
      size: DEFAULT_SIZE,
      format: 'webp',
      generatedAt: null,
      icons: {},
    }
  }
}

async function saveManifest(manifest) {
  const sorted = {}
  for (const k of Object.keys(manifest.icons).sort()) sorted[k] = manifest.icons[k]
  manifest.icons = sorted
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
}

function buildPrompt(key) {
  const english = ENGLISH_OVERRIDES[key] || null
  const subject = english ? `"${english}" (Malay: "${key}")` : `the Malay word "${key}"`
  return `A single minimalist flat-design icon representing ${subject}.

STYLE
- One centred subject occupying ~65% of a square 1:1 frame, generous padding.
- Bold simple shapes, thick clean linework, no shading, no 3D, no shadows, no gradients.
- Solid warm off-white background (#F8F4EC).
- Limited palette: warm reds, teal, deep green, mustard yellow accents.
- Subtle Southeast Asian / Malay cultural flavour where contextually appropriate (e.g. traditional Malay house silhouettes, banana-leaf cues for rice dishes, tropical greenery for nature words). Never tip into stereotype or caricature.
- Recognisable at a 56-pixel display size on a flashcard.

CRITICAL: absolutely NO text, letters, numbers, words, or typography anywhere in the image.`
}

// Tiny per-key English-meaning overrides so the prompt has a clearer
// concept than the Malay headword alone. Mirrors the curation rationale
// in src/data/dictionaryIcons.js — when ambiguity exists, lock to the
// IGCSE-syllabus sense.
const ENGLISH_OVERRIDES = {
  abang: 'older brother',
  adik: 'younger sibling',
  air: 'water',
  anak: 'child',
  api: 'fire',
  aplikasi: 'mobile application',
  ayah: 'father',
  ayam: 'chicken',
  baca: 'reading a book',
  baik: 'thumbs up — kind / good',
  bandar: 'city skyline',
  baru: 'new / sparkle',
  bas: 'bus',
  basikal: 'bicycle',
  beg: 'school backpack',
  belajar: 'studying with a pencil',
  berenang: 'swimming',
  berjalan: 'walking person',
  biru: 'blue colour swatch',
  buah: 'fruit',
  buku: 'open book',
  bunga: 'flower',
  hari: 'calendar day',
  hijau: 'green colour swatch',
  hitam: 'black colour swatch',
  hujan: 'rain cloud',
  hutan: 'forest of trees',
  ibu: 'mother',
  ikan: 'fish',
  jam: 'clock face',
  kaki: 'foot / leg',
  kasut: 'sports shoe',
  kawan: 'two friends',
  kereta: 'car',
  komputer: 'laptop computer',
  kuning: 'yellow colour swatch',
  laut: 'sea wave',
  makan: 'eating from a plate',
  mata: 'eye',
  merah: 'red colour swatch',
  minum: 'drinking from a cup',
  nasi: 'mound of cooked rice on a plate',
  pelajar: 'student wearing graduation cap',
  putih: 'white colour swatch',
  roti: 'bread loaf',
  rumah: 'traditional Malay house with peaked roof',
  sekolah: 'school building',
  tangan: 'hand',
  telefon: 'mobile phone',
  tidur: 'sleeping face on pillow',
}

async function callGeminiImage({ apiKey, key }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`
  const body = {
    contents: [{ parts: [{ text: buildPrompt(key) }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    if (res.status === 429 && /limit: 0/.test(txt)) {
      throw new Error(
        `API 429: image generation has limit=0 on your Gemini free tier. ` +
        `Enable billing at https://aistudio.google.com/app/billing or use a paid project key.`
      )
    }
    throw new Error(`API ${res.status}: ${txt.slice(0, 400)}`)
  }
  const json = await res.json()
  const parts = json?.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find(p => p.inlineData?.data)
  if (!imagePart) {
    const finishReason = json?.candidates?.[0]?.finishReason
    throw new Error(`No image in response (finishReason=${finishReason})`)
  }
  return Buffer.from(imagePart.inlineData.data, 'base64')
}

async function pngToWebp(pngBuffer, outPath, size, quality) {
  const tmp = join(tmpdir(), `icon-${process.pid}-${Date.now()}.png`)
  await writeFile(tmp, pngBuffer)
  try {
    await execFileP('cwebp', ['-quiet', '-q', String(quality), '-resize', String(size), '0', tmp, '-o', outPath])
  } finally {
    await rm(tmp).catch(() => {})
  }
}

async function ensureCwebp() {
  try {
    await execFileP('cwebp', ['-version'])
  } catch {
    die('cwebp not found on PATH. Install via `brew install webp` or `apt install webp`.')
  }
}

function slugify(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function parseArgs(argv) {
  const out = { only: null, force: false, dryRun: false, help: false, quality: null, size: null }
  for (const a of argv) {
    if (a === '--force') out.force = true
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--help' || a === '-h') out.help = true
    else if (a.startsWith('--only=')) out.only = a.slice(7).split(',').map(s => s.trim()).filter(Boolean)
    else if (a.startsWith('--quality=')) out.quality = Number(a.slice(10))
    else if (a.startsWith('--size=')) out.size = Number(a.slice(7))
  }
  return out
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
async function pathExists(p) { try { await access(p); return true } catch { return false } }
function die(msg) { console.error(msg); process.exit(1) }

await main().catch(err => { console.error('FATAL:', err.message); process.exit(1) })
