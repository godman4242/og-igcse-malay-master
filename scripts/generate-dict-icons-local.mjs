#!/usr/bin/env node
//
// Generates AI dictionary icons via LOCAL LM Studio (FLUX GGUF),
// applies a razor-sharp SVG circle mask to cut out a perfect circle
// with a transparent exterior, and saves as a tiny WebP.
//
// Run via: node scripts/generate-dict-icons-local.mjs --force

import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ICONS_DIR = join(ROOT, 'public', 'dict-icons')
const MANIFEST_PATH = join(ROOT, 'src', 'data', 'dictionaryIconsManifest.json')
const ICONS_SOURCE = join(ROOT, 'src', 'data', 'dictionaryIcons.js')

const MODEL = 'flux (local LM Studio)'
const RATE_DELAY_MS = 500
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
      const imgBuffer = await callLocalImageAPI({ key: p.key })
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
  abang: 'a tall older teenage brother smiling confidently',
  adik: 'a very young small boy holding hands with his much taller older brother',
  air: 'a completely clean, pure bright blue drop of water (no orange or red colors)',
  ajar: 'a teacher standing at a whiteboard pointing with a stick',
  anak: 'a cute baby in a crib',
  api: 'a bright orange and yellow campfire flame',
  aplikasi: 'a smartphone screen showing 4 colorful app icons',
  ayah: 'a father with a mustache playing with a small child',
  ayam: 'a rooster chicken',
  baca: 'a person reading an open textbook',
  baik: 'a large thumbs up symbol',
  bandar: 'a modern city skyline with tall skyscrapers',
  baru: 'sparkles representing something new, shiny, and pristine',
  bas: 'a yellow school bus',
  basikal: 'a two-wheeled bicycle',
  beg: 'a school backpack with straps',
  belajar: 'a student studying at a wooden desk with a pencil',
  beli: 'a metal shopping cart full of groceries',
  berenang: 'a person wearing goggles swimming in a pool of water',
  berjalan: 'a person walking along a path',
  biru: 'a pure solid bright blue paint splash',
  buah: 'a bright red apple fruit with a green leaf',
  buku: 'a colorful open book with pages',
  bunga: 'a beautiful blooming pink lotus flower',
  cari: 'a magnifying glass searching for clues',
  dengar: 'a human ear listening to visible sound waves',
  fikir: 'a thought bubble floating above a person\'s head',
  guna: 'a silver wrench or hammer being used to fix something',
  hantar: 'a paper mail envelope flying fast',
  hari: 'a desk calendar page showing a date',
  hijau: 'a completely pure solid vibrant green paint splash',
  hitam: 'a completely pure solid black paint splash',
  hujan: 'a gray rain cloud with blue raindrops falling',
  hutan: 'a thick forest of pine trees',
  ibu: 'a loving mother figure hugging a child',
  ikan: 'a colorful tropical fish swimming',
  jalan: 'a paved asphalt road or street with white lines',
  jam: 'a round analog clock face showing time',
  jual: 'a storefront building with money exchanging hands',
  kaki: 'a human foot and leg',
  kasut: 'a sporty athletic running shoe',
  kawan: 'two friends happily shaking hands',
  kereta: 'a sleek modern automobile car',
  kerja: 'a professional leather office briefcase',
  komputer: 'a modern laptop computer with screen open',
  kuning: 'a completely pure solid bright yellow paint splash',
  latih: 'a muscular person lifting heavy gym weights',
  laut: 'a beautiful crashing blue ocean wave',
  lukis: 'a wooden artists palette covered in paint with a paintbrush',
  main: 'a video game controller',
  makan: 'a person eating food from a plate with a fork and spoon',
  masak: 'a frying pan on a stove with a spatula cooking food',
  mata: 'a single human eye looking forward',
  merah: 'a completely pure solid bright red paint splash',
  minum: 'a person drinking water from a glass cup',
  nasi: 'a mound of cooked white rice on a plate',
  nyanyi: 'a person singing passionately into a stage microphone',
  pelajar: 'a happy student wearing a graduation cap and gown',
  potong: 'a pair of metal scissors cutting a piece of paper',
  putih: 'a pure solid white paint splash outlined in thick black',
  roti: 'a loaf of sliced baked bread',
  rumah: 'a traditional house with a peaked roof and windows',
  sekolah: 'a large school building with a clock tower',
  tahu: 'a glowing bright yellow lightbulb representing a brilliant idea',
  tangan: 'a single human hand waving hello',
  tanya: 'a large bold question mark symbol',
  telefon: 'a classic telephone or modern mobile phone',
  tidur: 'a sleeping face resting peacefully on a soft pillow',
  tulis: 'a human hand writing on paper with a pen',
  ubah: 'circular refresh or change arrows in a loop'
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { unlink } from 'node:fs/promises';

const execFileP = promisify(execFile);

async function callLocalImageAPI({ key }) {
  const prompt = buildPrompt(key);
  const seed = Math.floor(Math.random() * 1000000);
  const tempFile = join(tmpdir(), `mflux_${key}_${seed}.png`);
  
  // Using mflux-generate directly via the terminal for MLX Apple Silicon optimization
  await execFileP('mflux-generate', [
    '--model', 'AITRADER/FLUX1-schnell-mlx-4bit',
    '--base-model', 'schnell',
    '--prompt', prompt,
    '--width', '512',
    '--height', '512',
    '--steps', '4',
    '--seed', String(seed),
    '--output', tempFile
  ]);
  
  // Read the generated file into a buffer
  const imageBuffer = await readFile(tempFile);
  
  // Cleanup the temp file
  await unlink(tempFile).catch(() => {});
  
  return imageBuffer;
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
