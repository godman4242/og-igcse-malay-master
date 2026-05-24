#!/usr/bin/env node
//
// Overnight FLUX dictionary-icon generator.
//
// Pipeline (Anti-Hallucination Rule #1 ▸ SUPABASE_SETUP_MASTER.md PART 3 — every
// gate must pass before any work is claimed done):
//
//   1. Re-build the FLUX prompt manifest from src/data/wordFamilies.js
//      via `node scripts/build-missing-icons-prompts.mjs --all`. This is the
//      single source of truth — the runner never invents prompts itself.
//   2. `npm run build` → must exit 0. Build is a hard gate; failure aborts.
//   3. For every word in the manifest, generate a webp via mflux-generate using
//      the premium FLUX prompt. Already-existing webps are SKIPPED unless
//      --force is passed. Failures are retried up to RETRIES times.
//   4. Update src/data/dictionaryIconsManifest.json after each success so a
//      crash or Ctrl-C never loses progress.
//   5. Persist a resumable log at scripts/logs/flux-overnight-<ts>.log.
//   6. Exit 0 only when every webp in the manifest exists on disk.
//
// Usage:
//   node scripts/run-flux-overnight.mjs                     # generate missing only
//   node scripts/run-flux-overnight.mjs --force             # regenerate all
//   node scripts/run-flux-overnight.mjs --only=tulis,baca   # restrict by word
//   node scripts/run-flux-overnight.mjs --dry-run           # plan, no execution
//   node scripts/run-flux-overnight.mjs --skip-build        # for resumed runs
//   node scripts/run-flux-overnight.mjs --no-prompts        # don't rebuild manifest
//
// Sensible defaults for an overnight Apple-Silicon FLUX-schnell run:
//   STEPS=4, SIZE=512, RETRIES=2, RATE_DELAY_MS=400, BATTERY_STOP=20.

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, access, unlink, stat } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const ICONS_DIR = join(ROOT, 'public', 'dict-icons');
const PROMPTS_PATH = join(ROOT, 'scripts', 'missing-icons-prompts-enhanced.json');
const ICON_MANIFEST_PATH = join(ROOT, 'src', 'data', 'dictionaryIconsManifest.json');
const LOG_DIR = join(ROOT, 'scripts', 'logs');

const MODEL_ID = 'AITRADER/FLUX1-schnell-mlx-4bit';
const BASE_MODEL = 'schnell';
const STEPS = 4;
const SIZE = 512;
const RETRIES = 2;
const RATE_DELAY_MS = 400;
const BATTERY_STOP = '20';
const WEBP_QUALITY = 90;
const WEBP_SIZE = 256;

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  const out = {
    force: false,
    dryRun: false,
    skipBuild: false,
    noPrompts: false,
    only: null,
    help: false,
  };
  for (const a of argv) {
    if (a === '--force') out.force = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--skip-build') out.skipBuild = true;
    else if (a === '--no-prompts') out.noPrompts = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--only=')) out.only = a.slice(7).split(',').map(s => s.trim()).filter(Boolean);
  }
  return out;
}

if (args.help) {
  console.log(`Usage: node scripts/run-flux-overnight.mjs [options]

  --force          Regenerate every webp even if already present
  --only=A,B,C     Restrict to a comma-separated word list
  --dry-run        Plan only; do not execute generation or build
  --skip-build     Skip 'npm run build' (use on a resume after a known-good build)
  --no-prompts     Skip rebuilding the prompt manifest from wordFamilies.js
  -h, --help       Show this help`);
  process.exit(0);
}

// --- Logger --------------------------------------------------------------------

let logStream = null;
let logPath = null;
async function openLog() {
  await mkdir(LOG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  logPath = join(LOG_DIR, `flux-overnight-${ts}.log`);
  logStream = createWriteStream(logPath, { flags: 'a' });
}
function logLine(line) {
  const ts = new Date().toISOString();
  const out = `[${ts}] ${line}`;
  console.log(out);
  if (logStream) logStream.write(out + '\n');
}
function closeLog() {
  return new Promise(res => {
    if (logStream) logStream.end(res); else res();
  });
}

// --- Pipeline steps ------------------------------------------------------------

async function rebuildPromptManifest() {
  if (args.noPrompts) {
    logLine('skip: rebuilding prompt manifest (--no-prompts)');
    return;
  }
  logLine('step 1/3: rebuilding prompt manifest from wordFamilies.js');
  await new Promise((resolveP, rejectP) => {
    const child = spawn('node', ['scripts/build-missing-icons-prompts.mjs', '--all'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', d => logLine(`build-prompts: ${d.toString().trim()}`));
    child.stderr.on('data', d => logLine(`build-prompts!ERR: ${d.toString().trim()}`));
    child.on('close', code => code === 0 ? resolveP() : rejectP(new Error(`build-missing-icons-prompts exited with code ${code}`)));
  });
}

async function runNpmBuild() {
  if (args.skipBuild) {
    logLine('skip: npm run build (--skip-build)');
    return;
  }
  logLine('step 2/3: running npm run build (zero-error gate)');
  await new Promise((resolveP, rejectP) => {
    const child = spawn('npm', ['run', 'build'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stdout.on('data', d => logLine(`build: ${d.toString().trimEnd()}`));
    child.stderr.on('data', d => { const s = d.toString(); stderr += s; logLine(`build!ERR: ${s.trimEnd()}`); });
    child.on('close', code => code === 0 ? resolveP() : rejectP(new Error(`npm run build exited with code ${code}\n${stderr}`)));
  });
  logLine('build: passed');
}

async function loadPrompts() {
  const raw = await readFile(PROMPTS_PATH, 'utf8');
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`Prompt manifest is empty or malformed: ${PROMPTS_PATH}`);
  }
  return entries;
}

async function loadIconManifest() {
  let json;
  try {
    const raw = await readFile(ICON_MANIFEST_PATH, 'utf8');
    json = JSON.parse(raw);
  } catch {
    json = {
      version: 1,
      model: `mflux ${BASE_MODEL} (${MODEL_ID})`,
      style: 'premium FLUX-1-Pro circular icon (pastel glass-morphism)',
      size: WEBP_SIZE,
      format: 'webp',
      generatedAt: null,
      icons: {},
    };
  }
  return {
    header: { ...json, icons: undefined },
    icons: new Map(Object.entries(json.icons ?? {})),
  };
}

async function saveIconManifest(m) {
  const iconsObj = Object.fromEntries([...m.icons.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const out = { ...m.header, icons: iconsObj };
  await writeFile(ICON_MANIFEST_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
}

async function pathExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function generateOne({ word, prompt }) {
  const seed = Math.floor(Math.random() * 1_000_000);
  const tempFile = join(tmpdir(), `mflux_${slugify(word)}_${seed}.png`);
  try {
    await execFileP('mflux-generate', [
      '--model', MODEL_ID,
      '--base-model', BASE_MODEL,
      '--prompt', prompt,
      '--width', String(SIZE),
      '--height', String(SIZE),
      '--steps', String(STEPS),
      '--seed', String(seed),
      '--battery-percentage-stop-limit', BATTERY_STOP,
      '--output', tempFile,
    ], { maxBuffer: 32 * 1024 * 1024 });
    const buffer = await readFile(tempFile);
    return buffer;
  } finally {
    await unlink(tempFile).catch(() => {});
  }
}

function buildCircleMaskSvg(size) {
  const half = size / 2;
  const parts = [
    '<svg width="', size, '" height="', size, '">',
    '<circle cx="', half, '" cy="', half, '" r="', half, '" fill="#fff"/>',
    '</svg>',
  ];
  return parts.join('');
}

async function maskAndSaveCircleWebp(buffer, outPath) {
  const circleSvg = buildCircleMaskSvg(WEBP_SIZE);
  await sharp(buffer)
    .resize(WEBP_SIZE, WEBP_SIZE, { fit: 'cover' })
    .composite([{ input: Buffer.from(circleSvg), blend: 'dest-in' }])
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath);
}

function slugify(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function planRun(prompts, iconManifest) {
  const planned = [];
  const skipped = [];
  const filtered = args.only
    ? prompts.filter(p => args.only.includes(p.word))
    : prompts;
  for (const entry of filtered) {
    const slug = slugify(entry.word);
    const outPath = join(ICONS_DIR, `${slug}.webp`);
    const fileExists = await pathExists(outPath);
    const inManifest = iconManifest.icons.has(entry.word);
    if (!args.force && fileExists && inManifest) {
      skipped.push(entry.word);
      continue;
    }
    planned.push({ ...entry, slug, outPath });
  }
  return { planned, skipped, total: filtered.length };
}

async function generationLoop(planned, iconManifest) {
  let ok = 0;
  let fail = 0;
  const failedWords = [];

  for (const [i, job] of planned.entries()) {
    const tag = `[${i + 1}/${planned.length}] ${job.word}`;
    let attempt = 0;
    let success = false;
    let lastErr = null;
    while (attempt <= RETRIES && !success) {
      attempt++;
      try {
        logLine(`${tag} → attempt ${attempt} (steps=${STEPS}, size=${SIZE})`);
        const buffer = await generateOne(job);
        await maskAndSaveCircleWebp(buffer, job.outPath);

        const st = await stat(job.outPath);
        if (st.size < 1024) throw new Error(`output webp suspiciously small (${st.size} bytes)`);

        iconManifest.icons.set(job.word, {
          file: `${job.slug}.webp`,
          at: new Date().toISOString(),
          model: `mflux ${BASE_MODEL}`,
        });
        iconManifest.header.generatedAt = new Date().toISOString();
        iconManifest.header.model = `mflux ${BASE_MODEL} (${MODEL_ID})`;
        await saveIconManifest(iconManifest);

        logLine(`${tag} → OK (${(st.size / 1024).toFixed(1)} KiB)`);
        success = true;
        ok++;
      } catch (err) {
        lastErr = err;
        logLine(`${tag} → FAIL on attempt ${attempt}: ${err.message}`);
        if (attempt <= RETRIES) await sleep(RATE_DELAY_MS * 2);
      }
    }
    if (!success) {
      fail++;
      failedWords.push(job.word);
      logLine(`${tag} → GIVING UP after ${attempt} attempts: ${lastErr?.message}`);
    }
    if (i < planned.length - 1) await sleep(RATE_DELAY_MS);
  }

  return { ok, fail, failedWords };
}

async function verifyAllPresent(prompts, iconManifest) {
  const missing = [];
  for (const entry of prompts) {
    const outPath = join(ICONS_DIR, `${slugify(entry.word)}.webp`);
    const exists = await pathExists(outPath);
    if (!exists || !iconManifest.icons.has(entry.word)) missing.push(entry.word);
  }
  return missing;
}

async function main() {
  await openLog();
  logLine(`flux-overnight starting — args=${JSON.stringify(args)}`);
  logLine(`log path: ${logPath}`);

  try {
    if (!existsSync(ICONS_DIR)) await mkdir(ICONS_DIR, { recursive: true });

    // 1. Rebuild prompt manifest (single source of truth)
    await rebuildPromptManifest();

    // 2. Build gate (Anti-Hallucination Rule #1)
    await runNpmBuild();

    // 3. Generation pass
    const prompts = await loadPrompts();
    const iconManifest = await loadIconManifest();
    const { planned, skipped, total } = await planRun(prompts, iconManifest);
    logLine(`step 3/3: plan: total=${total} planned=${planned.length} skipped=${skipped.length} force=${args.force}`);

    if (args.dryRun) {
      logLine('--dry-run — exiting after plan');
      for (const job of planned) logLine(`would generate: ${job.word}`);
      await closeLog();
      process.exit(0);
    }

    if (planned.length === 0) {
      logLine('nothing to generate — all webps already on disk');
    } else {
      const { ok, fail, failedWords } = await generationLoop(planned, iconManifest);
      logLine(`generation pass complete — ok=${ok} fail=${fail}`);
      if (fail > 0) logLine(`failed words: ${failedWords.join(', ')}`);
    }

    // 4. Final verification
    const missing = await verifyAllPresent(prompts, iconManifest);
    if (missing.length > 0) {
      logLine(`VERIFY FAIL: ${missing.length} webps still missing after run:`);
      for (const w of missing) logLine(`  - ${w}`);
      await closeLog();
      process.exit(2);
    }

    logLine(`SUCCESS: every word in the manifest has a webp. Total icons: ${prompts.length}.`);
    await closeLog();
    process.exit(0);
  } catch (err) {
    logLine(`FATAL: ${err.message}`);
    await closeLog();
    process.exit(1);
  }
}

await main();
