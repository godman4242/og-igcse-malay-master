#!/usr/bin/env node
//
// Generates AI dictionary icons via the Pollinations FLUX API,
// applies a razor-sharp SVG circle mask to cut out a perfect circle
// with a transparent exterior, and saves as a tiny WebP.
//
// Run via: node scripts/generate-dict-icons-hf.mjs --force

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ICONS_DIR = join(ROOT, 'public', 'dict-icons')
const MANIFEST_PATH = join(ROOT, 'src', 'data', 'dictionaryIconsManifest.json')
const ICONS_SOURCE = join(ROOT, 'src', 'data', 'dictionaryIcons.js')

const MODEL = 'flux (pollinations)'
const RATE_DELAY_MS = 2000
const DEFAULT_QUALITY = 90
const DEFAULT_SIZE = 256

const args = parseArgs(process.argv.slice(2))

async function main() {
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
      const imgBuffer = await callImageAPI({ key: p.key })
      await processAndSaveCircleWebp(imgBuffer, p.outPath, args.size || DEFAULT_SIZE, args.quality || DEFAULT_QUALITY)
      
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
      style: 'solid contrasting circular iOS app icon',
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
  const english = ENGLISH_OVERRIDES[key] || key
  return `A highly polished, modern iOS-style 2D vector flat-design app icon representing "${english}". 

STYLE:
- The icon subject must be vibrant, simple, and perfectly centered. 
- The background MUST be a completely solid, bright, highly contrasting color that fills the entire frame (like vivid blue, purple, or deep green) so it stands out on both light and dark screens.
- Do not use a white background. The background MUST be a solid vibrant color.
- No gradients, no complex shading. Extremely clean and minimalist, using thick bold shapes.

CRITICAL INSTRUCTIONS:
- Absolutely NO text, NO letters, NO words, NO typography anywhere in the image.
- Do NOT draw any borders or frames around the edge.`
}

const ENGLISH_OVERRIDES = {
  abang: 'an older brother teenager smiling',
  adik: 'a young child sibling smiling',
  air: 'a clean, pure, bright blue water droplet',
  ajar: 'a teacher pointing at a whiteboard',
  anak: 'a cute baby or child',
  api: 'a bright orange campfire flame',
  aplikasi: 'a smartphone screen showing colorful app icons',
  ayah: 'a father figure playing with a child',
  ayam: 'a chicken',
  baca: 'a person reading an open book',
  baik: 'a large thumbs up symbol',
  bandar: 'a modern city skyline with tall buildings',
  baru: 'sparkles representing something new and shiny',
  bas: 'a yellow school bus',
  basikal: 'a bicycle',
  beg: 'a school backpack',
  belajar: 'a student studying with a pencil at a desk',
  beli: 'a shopping cart full of groceries',
  berenang: 'a person swimming in water',
  berjalan: 'a person walking down a road',
  biru: 'a pure solid bright blue paint splash',
  buah: 'a red apple fruit',
  buku: 'a colorful open book',
  bunga: 'a beautiful blooming pink flower',
  cari: 'a magnifying glass searching',
  dengar: 'an ear listening to sound waves',
  fikir: 'a thought bubble above a head',
  guna: 'a silver wrench or tool being used',
  hantar: 'a mail envelope being sent',
  hari: 'a calendar page',
  hijau: 'a completely pure solid vibrant green paint splash',
  hitam: 'a completely pure solid black paint splash',
  hujan: 'a rain cloud with blue raindrops',
  hutan: 'a thick forest of trees',
  ibu: 'a mother figure hugging a child',
  ikan: 'a colorful fish swimming',
  jalan: 'a paved road or street',
  jam: 'a clock face',
  jual: 'a storefront or money changing hands',
  kaki: 'a human foot or leg',
  kasut: 'a sports running shoe',
  kawan: 'two friends shaking hands',
  kereta: 'a sleek modern car',
  kerja: 'a professional briefcase',
  komputer: 'a laptop computer',
  kuning: 'a completely pure solid bright yellow paint splash',
  latih: 'someone lifting heavy weights or exercising',
  laut: 'a beautiful crashing ocean wave',
  lukis: 'an artists palette and paintbrush',
  main: 'a video game controller',
  makan: 'a person eating food from a plate',
  masak: 'a frying pan with a spatula cooking',
  mata: 'a human eye',
  merah: 'a completely pure solid bright red paint splash',
  minum: 'a person drinking from a cup',
  nasi: 'a mound of cooked white rice on a plate',
  nyanyi: 'a person singing passionately into a microphone',
  pelajar: 'a student wearing a graduation cap',
  potong: 'a pair of scissors cutting paper',
  putih: 'a pure solid white paint splash outlined in black',
  roti: 'a loaf of sliced bread',
  rumah: 'a traditional house with a peaked roof',
  sekolah: 'a school building',
  tahu: 'a glowing yellow lightbulb representing knowledge or an idea',
  tangan: 'a human hand waving',
  tanya: 'a large bold question mark symbol',
  telefon: 'a telephone or mobile phone',
  tidur: 'a sleeping face on a pillow',
  tulis: 'a hand writing with a pen',
  ubah: 'circular refresh or change arrows'
}

async function callImageAPI({ key }) {
  const prompt = encodeURIComponent(buildPrompt(key));
  const seed = Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&model=flux&nologo=true&seed=${seed}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API failed: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processAndSaveCircleWebp(imageBuffer, outPath, size, quality) {
  // Create a perfectly sharp SVG circle mask
  const circleSvg = `<svg width="${size}" height="${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#fff"/>
  </svg>`;

  // Apply the mask to the image using 'dest-in' blending
  await sharp(imageBuffer)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: Buffer.from(circleSvg), blend: 'dest-in' }])
    .webp({ quality })
    .toFile(outPath);
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
