// grader-accuracy-harness.mjs — Gauntlet lane L0: measure writingGrader.js against
// marks a REAL Cambridge examiner awarded, for Malay 0546 and English 0510.
//
// MANUAL, not CI — same rule as ocr-/asr-accuracy-harness.mjs, but for a stronger
// reason: the fixtures are transcriptions of UCLES-copyright candidate scripts and
// live under a GITIGNORED directory (docs/GAUNTLET.md R8). They do not exist on a
// clean clone, so this can never run in CI and must never be wired into the gate.
//
// Run:  npx vite-node scripts/grader-accuracy-harness.mjs
//       npx vite-node scripts/grader-accuracy-harness.mjs -- --lang ms
//       npx vite-node scripts/grader-accuracy-harness.mjs -- --transcripts passA
//
// ⚠ vite-node, NOT bare node. writingGrader.js imports '../data/writing' without a
// file extension — Vite resolves that, Node does not (ERR_MODULE_NOT_FOUND). Running
// it through vite-node also guarantees the grader resolves EXACTLY as it does in the
// app, so the measured band is the band a student would really see.
// Note the `--` before flags: it separates our args from vite-node's own.
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠ THREE CONSTRAINTS THIS HARNESS ENFORCES IN CODE, NOT IN PROSE (§2.1):
//
//  1. RANK-ORDER ONLY FOR MALAY. The 2017 booklet marks Paper 4 out of 50; the live
//     2025-27 syllabus is /45 and 2028 is /40 with reworked descriptors. An absolute
//     Malay band-match number would be meaningless, so none is printed.
//     A second, independent reason applies to BOTH languages: writingGrader emits a
//     BAND 1-6, while the examiner awarded MARKS (/30 MS, /16 EN). There is no shared
//     scale to be "accurate" against — only an ordering to agree or disagree with.
//
//  2. NO CORRELATION COEFFICIENT AND NO "% AGREEMENT" HEADLINE. At n=7 (MS) and n=6
//     (EN) both imply a precision the sample cannot support. This file prints
//     PER-SCRIPT DELTAS and a RAW PAIR COUNT ("x of y non-tied pairs ordered
//     correctly"). A count is not a coefficient. Do not add one.
//
//  3. NO SILENT CAPS. Every script the manifest excludes is printed with its reason.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { score } from '../src/lib/writingGrader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CAL = path.resolve(__dirname, '../calibration')

const argv = process.argv.slice(2)
const argOf = (flag, dflt) => {
  const i = argv.indexOf(flag)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}
const ONLY_LANG = argOf('--lang', null)
const TRANSCRIPT_SET = argOf('--transcripts', 'final')

if (!existsSync(path.join(CAL, 'manifest.json'))) {
  console.error(`\n✖ No calibration set found at ${CAL}\n`)
  console.error('  This harness needs the gitignored calibration fixtures, which are')
  console.error('  UCLES-copyright and therefore never committed. See docs/gauntlet/L0/.\n')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(path.join(CAL, 'manifest.json'), 'utf8'))

// Band 1-6 → 0..1. Mark m/max → 0..1. Both expressed as a percentage of their own
// scale so a per-script delta is at least dimensionally meaningful, even though the
// two scales are NOT interchangeable (see constraint 1).
const bandToPct = (band) => ((band - 1) / 5) * 100
const markToPct = (m, max) => (m / max) * 100

const SETS = [
  { key: 'ms0546', lang: 'malay', label: 'Malay 0546 Paper 4', graderPaper: 2 },
  { key: 'en0510', lang: 'english', label: 'English 0510 Paper 2', graderPaper: 2 },
].filter((s) => !ONLY_LANG || s.key.startsWith(ONLY_LANG))

const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)

let anyMissing = false

for (const set of SETS) {
  const data = manifest[set.key]
  if (!data) continue

  console.log(`\n${'═'.repeat(78)}`)
  console.log(`  ${set.label}`)
  console.log(`${'═'.repeat(78)}`)
  console.log(`  source: ${data.source}`)
  console.log(`  ${data.verified}`)
  if (data.rubricDrift) console.log(`\n  ⚠ RUBRIC DRIFT: ${data.rubricDrift}`)

  const gradeable = data.scripts.filter((s) => s.gradeable)
  const excluded = data.scripts.filter((s) => !s.gradeable)

  const rows = []
  for (const s of gradeable) {
    const file = path.join(CAL, 'transcripts', TRANSCRIPT_SET, `${s.id}.txt`)
    if (!existsSync(file)) {
      console.log(`\n  ✖ MISSING TRANSCRIPT: ${s.id} (expected ${path.relative(CAL, file)})`)
      anyMissing = true
      continue
    }
    // Strip our transcription notation so the grader sees the candidate's prose.
    // [struck: x] is dropped (the candidate deleted it); [ins: x] is kept (they added
    // it); [illegible]/[unclear: x] keep the best reading or a neutral placeholder.
    const raw = readFileSync(file, 'utf8')
    const text = raw
      .replace(/\[struck:[^\]]*\]/g, ' ')
      .replace(/\[ins:\s*([^\]]*)\]/g, '$1')
      .replace(/\[unclear:\s*([^\]]*)\]/g, '$1')
      .replace(/\[illegible\]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim()

    const result = score(text, { lang: set.lang, format: 'auto', paper: set.graderPaper })
    if (result.error) {
      rows.push({ s, error: result.error, words: text.split(/\s+/).filter(Boolean).length })
      continue
    }
    const [mark, max] = s.total
    rows.push({
      s,
      words: result.words,
      band: result.band,
      sub: result.subBands,
      format: result.format || '(none)',
      examinerPct: markToPct(mark, max),
      graderPct: bandToPct(result.band),
    })
  }

  // ── Per-script deltas ────────────────────────────────────────────────────
  console.log(`\n  PER-SCRIPT DELTAS  (n=${rows.length})`)
  console.log(`  ${'─'.repeat(74)}`)
  console.log(`  ${pad('script', 15)}${padL('examiner', 12)}${padL('=%', 7)}${padL('band', 6)}${padL('=%', 7)}${padL('delta', 9)}  ${pad('format', 12)}${padL('words', 6)}`)
  console.log(`  ${'─'.repeat(74)}`)
  for (const r of rows) {
    if (r.error) {
      console.log(`  ${pad(r.s.id, 15)}${padL(r.s.total.join('/'), 12)}${padL('—', 7)}${padL('ERR', 6)}${padL('—', 7)}${padL('—', 9)}  ${pad(r.error, 12)}${padL(r.words, 6)}`)
      continue
    }
    const d = r.graderPct - r.examinerPct
    console.log(
      `  ${pad(r.s.id, 15)}${padL(r.s.total.join('/'), 12)}${padL(r.examinerPct.toFixed(0), 7)}${padL(r.band, 6)}${padL(r.graderPct.toFixed(0), 7)}${padL((d >= 0 ? '+' : '') + d.toFixed(1) + 'pp', 9)}  ${pad(r.format, 12)}${padL(r.words, 6)}`
    )
  }

  // ── Rank order ───────────────────────────────────────────────────────────
  const scored = rows.filter((r) => !r.error)
  const byExaminer = [...scored].sort((a, b) => b.examinerPct - a.examinerPct)
  console.log(`\n  RANK ORDER  (examiner's ordering, best first — does the grader agree?)`)
  console.log(`  ${'─'.repeat(74)}`)
  for (const r of byExaminer) {
    console.log(`  ${pad(r.s.id, 15)} examiner ${padL(r.s.total.join('/'), 8)}   grader band ${r.band}`)
  }

  let concordant = 0, discordant = 0, tied = 0
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const a = scored[i], b = scored[j]
      if (a.examinerPct === b.examinerPct) { tied++; continue }
      const examinerHigher = a.examinerPct > b.examinerPct
      if (a.band === b.band) { discordant++; continue } // grader can't separate them
      const graderHigher = a.band > b.band
      if (examinerHigher === graderHigher) concordant++
      else discordant++
    }
  }
  const comparable = concordant + discordant
  console.log(`\n  ${concordant} of ${comparable} non-tied pairs ordered correctly` +
    ` (${tied} pair${tied === 1 ? '' : 's'} tied by the examiner and excluded).`)
  console.log(`  ⚠ This is a RAW COUNT, deliberately not a correlation coefficient — n is far`)
  console.log(`    too small to support one. Read it as a sanity check, not an agreement study.`)
  if (data.tieWarning) console.log(`  ⚠ ${data.tieWarning}`)

  // ── Excluded, stated out loud ────────────────────────────────────────────
  if (excluded.length) {
    console.log(`\n  EXCLUDED FROM THE COMPARISON (${excluded.length}) — no silent caps`)
    console.log(`  ${'─'.repeat(74)}`)
    for (const s of excluded) {
      console.log(`  ${pad(s.id, 15)} ${s.total.join('/')}  — ${s.excludeReason}`)
    }
  }
}

if (manifest.deferred) {
  console.log(`\n${'═'.repeat(78)}`)
  console.log('  DEFERRED SETS — stated, not dropped')
  console.log(`${'═'.repeat(78)}`)
  for (const [k, v] of Object.entries(manifest.deferred)) console.log(`  ${k}: ${v}\n`)
}

console.log(`\n${'═'.repeat(78)}`)
console.log('  Record these numbers in RESUME_HERE.md. They are L0\'s baseline: the')
console.log('  before-number that lane L1 must improve on, per-script, with a linguistic')
console.log('  citation for every rule change (the anti-overfit gate).')
console.log(`${'═'.repeat(78)}\n`)

if (anyMissing) process.exit(1)
