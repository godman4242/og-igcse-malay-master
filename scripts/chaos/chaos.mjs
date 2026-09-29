#!/usr/bin/env node
// CHAOS PLANTS — prove every guard is covered by a test that can FAIL.
//
// A plant is a deliberate, surgical break in your source, declared as data and committed.
// The runner applies each one, runs the tests it names, requires at least one FAILED TEST,
// and restores the file byte-for-byte. A plant that stays green is a missing test.
//
// Run from the directory holding chaos.config.json, inside a git repo, targets committed:
//   node chaos.mjs            the gate: every plant, count-pinned
//   node chaos.mjs --check    NO mutation and no test run: validate plants, pin the count,
//                             resolve every anchor exactly once (the pre-commit half)
//   node chaos.mjs --list     print the plants, touch nothing
//   node chaos.mjs <text>     only plants whose name/file matches — NOT the gate (exits 2)
//
// ⛔ Never run the full gate in a pre-commit hook: it rewrites source. `--check` is the
// pre-commit half.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { constants } from 'node:os'
import { join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { applyPlant, baselineIsGreen, classify, countOccurrences, failingTestLines, parseArgs, testCounts, validateConfig, validatePlant } from './chaosLib.mjs'

const ROOT = process.cwd()
const TEST_TIMEOUT_MS = 15 * 60_000

function fatal(lines) {
  process.stderr.write(`\n❌ CHAOS GATE ABORTED\n   ${lines.join('\n   ')}\n\n`)
  process.exit(1)
}
const message = (err) => (err instanceof Error ? err.message : String(err))
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

let args
try {
  args = parseArgs(process.argv.slice(2))
} catch (err) {
  fatal([message(err)])
}
const filtered = args.filters.length > 0

try {
  if (git(['rev-parse', '--is-inside-work-tree']).trim() !== 'true') throw new Error('not a work tree')
} catch {
  fatal([`${ROOT} is not inside a git work tree. The chaos gate needs a git repository with the target files committed:`, 'it proves every restore with git status, so without git it could not tell a restore from damage.'])
}

// The lock, and the backups of whatever is planted right now, live in ONE directory inside .git/
// — never committed by `git add -A`, never shown as untracked. If it exists, a run is live or one
// died mid-plant, and every mode refuses: --check would otherwise pass a tree that is still planted.
const LOCK = resolve(ROOT, git(['rev-parse', '--git-path', 'chaos']).trim())
function refuseIfLocked() {
  if (!existsSync(LOCK)) return
  const backups = readdirSync(LOCK)
  fatal([
    `another chaos run holds the lock, or one died: ${LOCK}`,
    ...(backups.length > 0 ? ['it holds the ORIGINALS of planted files (each name is the repo path with "/" as "__"):', ...backups.map((f) => `  ${f}`)] : ['it holds no backups (a run died before its first plant, or one is running its baseline now).']),
    'If no chaos run is live: copy each backup over its file, check `git status`, then delete that directory.',
  ])
}
refuseIfLocked()

const configPath = join(ROOT, 'chaos.config.json')
if (!existsSync(configPath)) fatal([`no chaos.config.json in ${ROOT} — run from the directory that holds it (see harness/chaos/chaos.config.example.json)`])
let config
try {
  config = validateConfig(JSON.parse(readFileSync(configPath, 'utf8')))
} catch (err) {
  fatal([message(err)])
}

async function loadPlants() {
  const dir = resolve(ROOT, config.plantsDir)
  if (!existsSync(dir)) fatal([`plantsDir '${config.plantsDir}' does not exist (it is relative to ${ROOT})`])
  // Top level of plantsDir only. `.plants.ts` works on Node versions that strip types natively (>= 22.18).
  const files = readdirSync(dir).filter((f) => /\.plants\.(mjs|js|ts)$/.test(f)).sort()
  if (files.length === 0) fatal([`no *.plants.mjs files at the top level of ${config.plantsDir} — the gate has nothing to run`])
  const loaded = []
  for (const file of files) {
    let mod
    try {
      mod = await import(pathToFileURL(join(dir, file)).href)
    } catch (err) {
      fatal([`${file}: could not be loaded — ${message(err)}`])
    }
    if (!Array.isArray(mod.PLANTS)) fatal([`${file}: must export a PLANTS array`])
    mod.PLANTS.forEach((raw, i) => {
      try {
        loaded.push({ plant: validatePlant(raw, `${file}[${i}]`), source: file })
      } catch (err) {
        fatal([message(err)])
      }
    })
  }
  return loaded
}

const all = await loadPlants()

const names = all.map(({ plant }) => plant.name)
const dupes = names.filter((n, i) => names.indexOf(n) !== i)
if (dupes.length > 0) fatal([`duplicate plant names (the report addresses plants by name): ${[...new Set(dupes)].join(', ')}`])

// The count is pinned over EVERY declared plant, whatever the filter selects.
if (all.length !== config.expectedTotal) {
  fatal([
    `PLANT COUNT DRIFTED: found ${all.length}, expected ${config.expectedTotal}.`,
    'A gate that silently shrinks is worse than no gate. If plants were really added or removed,',
    "change 'expectedTotal' in chaos.config.json and say so in the commit — never to make a run pass.",
  ])
}

const selected = filtered ? all.filter(({ plant, source }) => args.filters.some((f) => plant.name.includes(f) || plant.file.includes(f) || source.includes(f))) : all
if (selected.length === 0) fatal([`no plant matches ${args.filters.join(' ')}`])

if (args.list) {
  process.stdout.write(`\nCHAOS PLANTS — ${selected.length} of ${all.length}\n`)
  selected.forEach(({ plant, source }, i) => process.stdout.write(`${String(i + 1).padStart(3)}. ${plant.name}\n     ${plant.file} ← ${source} [${plant.note}]\n`))
  process.stdout.write('nothing was touched (--list)\n\n')
  process.exit(0)
}

// One validation for --check AND the gate: a plant that could not run is refused before
// anything is touched, never skipped or scored.
const realRoot = realpathSync.native(ROOT)
const targets = [...new Set(selected.map(({ plant }) => normalize(plant.file)))].sort()
const tracked = new Set(git(['ls-files', '--', ...targets]).split('\n').filter(Boolean).map(normalize))
const problems = []
for (const { plant, source } of selected) {
  const say = (what) => problems.push(`${source} · ${plant.name}: ${what}`)
  const abs = resolve(ROOT, plant.file)
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    say(`${plant.file} does not exist`)
    continue
  }
  if (realpathSync.native(abs) !== join(realRoot, normalize(plant.file))) {
    say(`${plant.file} is not the file's real path (a symlink, or different letter case) — git status would watch the wrong path; name the real file`)
    continue
  }
  if (!tracked.has(normalize(plant.file))) {
    say(`${plant.file} is not tracked by git — commit it first; the gate proves each restore against git`)
    continue
  }
  const n = countOccurrences(readFileSync(abs, 'utf8'), plant.find)
  if (n !== 1) say(`anchor occurs ${n}× in ${plant.file}, expected exactly 1`)
  for (const t of plant.tests) if (!existsSync(resolve(ROOT, t))) say(`test file ${t} does not exist`)
}
if (problems.length > 0) fatal([`${problems.length} plant problem(s) — nothing was run or touched:`, ...problems.map((p) => `  ${p}`)])

if (args.check) {
  process.stdout.write(`✅ --check: ${selected.length} plant(s) valid, count = ${config.expectedTotal}, every anchor resolves exactly once. Nothing was run or touched.\n`)
  if (filtered) process.stdout.write('⚠️  FILTERED — not every plant was checked; exiting 2.\n')
  process.exit(filtered ? 2 : 0)
}

const dirty = git(['status', '--porcelain', '--', ...targets]).trim()
if (dirty.length > 0) fatal(['these files are already modified, so a restore could not be told from your work:', ...dirty.split('\n').map((l) => `  ${l}`), 'Commit or stash them, then re-run.'])

try {
  mkdirSync(LOCK) // not recursive: atomic, and it fails if another run got here first
} catch {
  refuseIfLocked()
  fatal([`could not take the lock ${LOCK}`])
}

let inFlight = null // { abs, original, backup } while a plant is in place
let child = null
/** Put the planted file back and PROVE it; the backup is only deleted once the read-back matches. */
function restoreInFlight() {
  if (inFlight === null) return true
  const { abs, original, backup } = inFlight
  writeFileSync(abs, original)
  if (!readFileSync(abs).equals(original)) return false
  rmSync(backup, { force: true })
  inFlight = null
  return true
}
function releaseLock() {
  if (inFlight === null) rmSync(LOCK, { recursive: true, force: true }) // a failed restore keeps its backup, and the lock
}
function killChild() {
  if (child?.pid !== undefined) {
    try {
      process.kill(-child.pid, 'SIGTERM') // the whole group: npx → runner → workers
    } catch {
      // already gone
    }
  }
}
function abort(signal) {
  killChild()
  const restored = restoreInFlight()
  process.stderr.write(`\n❌ CHAOS GATE ABORTED by ${signal} — ${restored ? 'every planted file is restored byte-identical' : `⚠️ RESTORE FAILED: the original is in ${LOCK}`}\n\n`)
  process.exit(128 + (constants.signals[signal] ?? 0))
}
process.on('exit', () => {
  killChild()
  restoreInFlight()
  releaseLock()
})
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => abort(signal))

/** Run `testCommand ...files` without blocking the event loop, so a signal can stop it. */
function runTests(files) {
  const [cmd, ...base] = config.testCommand
  // NODE_TEST_CONTEXT is inherited when this runner itself runs under `node --test` (CI, or its
  // own e2e suite), and it makes a child `node --test` report to its parent over a protocol
  // instead of printing a summary — so the parser matches nothing. Measured; hence removed.
  const { NODE_TEST_CONTEXT, ...env } = process.env
  void NODE_TEST_CONTEXT
  return new Promise((done) => {
    const stdout = []
    const stderr = []
    let timedOut = false
    child = spawn(cmd, [...base, ...files], { cwd: ROOT, env: { ...env, NO_COLOR: '1', FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
    const timer = setTimeout(() => {
      timedOut = true
      killChild()
    }, TEST_TIMEOUT_MS)
    child.stdout.on('data', (d) => stdout.push(d))
    child.stderr.on('data', (d) => stderr.push(d))
    child.on('error', (err) => {
      clearTimeout(timer)
      child = null
      fatal([`could not start '${cmd}': ${err.code ?? message(err)} — check testCommand in chaos.config.json`])
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      child = null
      // Both streams, always: some runners (Jest) print their whole summary on stderr.
      const out = `${Buffer.concat(stdout).toString('utf8')}${Buffer.concat(stderr).toString('utf8')}`
      if (signal !== null && !timedOut) abort(signal)
      else done({ code: timedOut ? null : code, timedOut, out })
    })
  })
}

// Every test run is compared against this: a run that writes to the tree (a snapshot, a golden,
// a fixture) produced that write under planted behaviour, and it must not survive the gate.
const statusBefore = git(['status', '--porcelain'])
function refuseIfTreeChanged(when) {
  const now = git(['status', '--porcelain'])
  if (now === statusBefore) return
  const was = new Set(statusBefore.split('\n'))
  const is = new Set(now.split('\n'))
  fatal([
    `git status changed during the run (${when}) — a test run wrote to the tree:`,
    ...[...is].filter((l) => l && !was.has(l)).map((l) => `  now:    ${l}`),
    ...[...was].filter((l) => l && !is.has(l)).map((l) => `  before: ${l}`),
    'Planted files are restored; these are not. Make the tests stop writing to the tree, then re-run.',
  ])
}

if (filtered) process.stdout.write(`\n⚠️  FILTERED RUN — ${selected.length} of ${all.length} plants. THIS IS NOT THE GATE.\n`)

// Every distinct test set must be GREEN unplanted, and its test total is what a RED must match.
const baselines = new Map()
for (const { plant } of selected) {
  const key = plant.tests.join(' ')
  if (baselines.has(key)) continue
  const { code, timedOut, out } = await runTests(plant.tests)
  const counts = testCounts(config.summary, out)
  if (timedOut || !baselineIsGreen(config.summary, code, out)) {
    fatal([`baseline for '${key}' is not green: ${timedOut ? 'timed out' : `exit ${code}`} · ${counts.evidence}.`, 'Every plant against it would score for the wrong reason. Fix the suite first — or check the summary parser matches your runner.'])
  }
  refuseIfTreeChanged(`baseline ${key}`)
  baselines.set(key, counts.total)
  process.stdout.write(`[baseline] ${key}: green · ${counts.evidence}\n`)
}

process.stdout.write(`\nCHAOS PLANTS — ${selected.length}, one test run each, serially (plants mutate shared files).\n\n`)

const results = []
for (const [i, { plant, source }] of selected.entries()) {
  process.stdout.write(`${String(i + 1).padStart(3)}/${selected.length} ${plant.name}\n`)
  const abs = resolve(ROOT, plant.file)
  const original = readFileSync(abs)
  let mutated
  try {
    mutated = applyPlant(original.toString('utf8'), plant)
  } catch (err) {
    fatal([`${plant.name}: ${message(err)} — the file changed after validation; nothing is planted`])
  }
  const backup = join(LOCK, plant.file.replaceAll('/', '__'))
  writeFileSync(backup, original)
  inFlight = { abs, original, backup }
  writeFileSync(abs, mutated)

  const { code, timedOut, out } = await runTests(plant.tests)

  // Restore FIRST, always, before judging anything.
  if (!restoreInFlight()) fatal([`RESTORE FAILED: ${plant.file} did not come back byte-identical. The original is in ${backup}; the lock stays until you restore it.`])
  refuseIfTreeChanged(`after ${plant.name}`)

  const counts = testCounts(config.summary, out)
  const baseline = baselines.get(plant.tests.join(' '))
  const read = `read: ${counts.evidence}`
  const verdict = timedOut ? 'inconclusive' : classify(config.summary, code, out, baseline)
  if (verdict === 'red') {
    results.push({ plant, status: 'RED', detail: [`${read} · ${source} [${plant.note}]`, ...failingTestLines(out).map((l) => `caught by: ${l}`)] })
  } else if (verdict === 'green') {
    results.push({ plant, status: 'STAYED-GREEN', detail: [`MISSING TEST — nothing in the named test files covers this guard · ${read}`] })
  } else {
    const why = timedOut ? `timed out after ${TEST_TIMEOUT_MS / 60_000} min` : `exit ${code} · ${counts.total} test(s), the baseline ${baseline}`
    results.push({ plant, status: 'INCONCLUSIVE', detail: [`${why} · ${read} — no clean catch: the plant broke the build, stopped a file loading, or failed with exit 0. That proves nothing.`] })
  }
}

releaseLock()
const red = results.filter((r) => r.status === 'RED').length
const bad = results.filter((r) => r.status !== 'RED')

process.stdout.write('\nCHAOS PLANT REPORT\n')
results.forEach((r, i) => process.stdout.write(`${r.status === 'RED' ? 'OK ' : 'BAD'} ${String(i + 1).padStart(3)}. [${r.status}] ${r.plant.name}\n${r.detail.map((d) => `        → ${d}\n`).join('')}`))
process.stdout.write(`${red}/${results.length} plants went RED.\n`)
process.stdout.write(`${results.length}/${results.length} files restored byte-identical; git status is what it was before the run.\n`)

if (bad.length > 0) {
  process.stderr.write(`\n❌ ${bad.length} plant(s) did not go red. A STAYED-GREEN plant is a missing test — fix the TEST, never the plant.\n\n`)
  process.exit(1)
}
if (filtered) {
  process.stdout.write('\n⚠️  FILTERED RUN — every selected plant went red, but this was not the gate; exiting 2.\n\n')
  process.exit(2)
}
process.stdout.write('\n✅ every plant went red and every file came back byte-identical.\n\n')
