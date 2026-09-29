// THE PURE HALF OF THE CHAOS RUNNER — every judgement it makes, with no I/O.
//
// Split out because the gate has to be gated too: the runner mutates source, so a test
// cannot import it without running it. These functions carry every decision that could
// be wrong in a way that makes a broken plant look like a caught one, and
// `chaosLib.test.mjs` pins each of them.
import { posix } from 'node:path'

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

/**
 * Summary parsers, keyed by name. Only formats checked against REAL runner output ship as
 * presets; anything else is configured as `{ failed: '<regex>', passed: '<regex>' }`, each
 * with one capture group. Guessing a format and shipping it as a preset would be the exact
 * unverified claim this tool exists to catch.
 *
 * Every parser takes the LAST match: the summary is the last thing a runner prints, and a
 * test is free to log a line that looks like one.
 */
export const SUMMARY_PRESETS = {
  // `Tests  2 failed | 5 passed (7)` — read off the `Tests` LINE only, so a test name or a
  // stack trace containing "1 failed" cannot feed the gate a number.
  vitest(out) {
    const line = last(/^\s*(Tests\s+.*)$/gm, out)
    if (line === null) return { failed: null, passed: null, evidence: [] }
    return { failed: num(/(\d+)\s+failed/.exec(line[1])), passed: num(/(\d+)\s+passed/.exec(line[1])), evidence: [line[1].trim()] }
  },
  // node:test — the spec reporter (`ℹ fail 1`) and the TAP reporter (`# fail 1`).
  node(out) {
    const failed = last(/^(?:ℹ|#) fail (\d+)\s*$/gm, out)
    const passed = last(/^(?:ℹ|#) pass (\d+)\s*$/gm, out)
    return { failed: num(failed), passed: num(passed), evidence: [failed, passed].filter(Boolean).map((m) => m[0].trim()) }
  },
}

function last(regex, text) {
  let found = null
  for (const m of text.matchAll(regex)) found = m
  return found
}

function num(match) {
  return match === null || match === undefined ? null : Number(match[1])
}

/**
 * The counts a run reported (`null` where it reported none), their sum as `total`, and the
 * summary text they were read from as `evidence` — printed beside every verdict, because a
 * probe whose parser matched nothing has not passed. ANSI colour is stripped first.
 */
export function testCounts(summary, out) {
  const clean = out.replace(ANSI, '')
  let counts
  if (typeof summary === 'string') {
    const preset = SUMMARY_PRESETS[summary]
    if (preset === undefined) throw new Error(`unknown summary preset '${summary}' (known: ${Object.keys(SUMMARY_PRESETS).join(', ')})`)
    counts = preset(clean)
  } else {
    const failed = last(new RegExp(summary.failed, 'gm'), clean)
    const passed = last(new RegExp(summary.passed, 'gm'), clean)
    counts = { failed: num(failed), passed: num(passed), evidence: [failed, passed].filter(Boolean).map((m) => m[0].trim()) }
  }
  const { failed, passed, evidence } = counts
  return { failed, passed, total: (failed ?? 0) + (passed ?? 0), evidence: evidence.length > 0 ? evidence.join(' · ') : '(no summary matched)' }
}

/**
 * How one planted run reads, against the unplanted run of the same tests.
 *  · `red`          — a non-zero exit, at least one FAILED test, and the same number of tests
 *                     as the baseline. The only passing outcome for a plant.
 *  · `green`        — a clean exit with no failed test: nothing covers the guard. A MISSING TEST.
 *  · `inconclusive` — anything else. A plant that breaks the build, or stops a test file from
 *                     LOADING, makes some runners count the file as one failed "test" — so the
 *                     total drops, and that is not a catch. Neither is a "failure" with exit 0.
 * "Any non-zero exit is red" is the tempting rule, and it counts a broken compile as a catch.
 */
export function classify(summary, code, out, baselineTotal) {
  const { failed, total } = testCounts(summary, out)
  const anyFailed = failed !== null && failed > 0
  if (code !== 0 && anyFailed && total === baselineTotal) return 'red'
  if (code === 0 && !anyFailed) return 'green'
  return 'inconclusive'
}

/**
 * Is an UNPLANTED run green enough to judge plants against? Without this, a test file that
 * is already failing hands a free RED to every plant aimed at it. Green = a clean exit, no
 * failures, and a pass count above zero — a run that collected NO tests also exits 0.
 */
export function baselineIsGreen(summary, code, out) {
  const { failed, passed } = testCounts(summary, out)
  return code === 0 && (failed === null || failed === 0) && passed !== null && passed > 0
}

/** Every occurrence, OVERLAPPING ones included — `}\n}` occurs twice in `}\n}\n}`. */
export function countOccurrences(haystack, needle) {
  let n = 0
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) n++
  return n
}

/**
 * `text` with the plant applied. Throws unless the anchor occurs EXACTLY ONCE — zero means the
 * source moved under the plant, two means it is ambiguous. The replacement is inserted
 * literally: as a plain string, `$&` / `$1` / `$$` would be String.replace patterns.
 */
export function applyPlant(text, plant) {
  const occurrences = countOccurrences(text, plant.find)
  if (occurrences !== 1) {
    throw new Error(`anchor occurs ${occurrences}× in ${plant.file}, expected exactly 1 — re-anchor the plant`)
  }
  return text.replace(plant.find, () => plant.replace)
}

/** Lines in a run's output that name a failing test (node spec ✖, TAP `not ok`, vitest ×, Jest ●). */
export function failingTestLines(out) {
  const lines = out.replace(ANSI, '').split('\n').map((l) => l.trim())
  const hits = lines.filter((l) => /^(✖|×|●|not ok\b)/.test(l) && l !== '✖ failing tests:')
  return [...new Set(hits)].slice(0, 5)
}

/**
 * Validate one exported plant. A plant file exporting garbage must not shrink the gate quietly.
 * `replace` alone may be empty — deleting a guard outright is a legitimate plant.
 */
export function validatePlant(raw, where) {
  if (typeof raw !== 'object' || raw === null) throw new Error(`${where}: plant is not an object`)
  const str = (key) => {
    const v = raw[key]
    if (typeof v !== 'string' || v.length === 0) throw new Error(`${where}: '${key}' must be a non-empty string`)
    return v
  }
  if (!Array.isArray(raw.tests) || raw.tests.length === 0 || raw.tests.some((t) => typeof t !== 'string' || t.length === 0)) {
    throw new Error(`${where}: 'tests' must be a non-empty array of non-empty strings`)
  }
  if (typeof raw.replace !== 'string') throw new Error(`${where}: 'replace' must be a string`)
  const plant = { name: str('name'), file: str('file'), find: str('find'), replace: raw.replace, tests: [...raw.tests], note: str('note') }
  if (plant.find === plant.replace) throw new Error(`${where} (${plant.name}): 'find' and 'replace' are identical`)
  const inside = (p) => !posix.isAbsolute(p) && !posix.normalize(p).startsWith('../')
  if (![plant.file, ...plant.tests].every(inside)) throw new Error(`${where} (${plant.name}): every path must be relative and inside the project`)
  // A plant that mutates its own test breaks the assertion, not the guard, and reads RED.
  if (plant.tests.some((t) => posix.normalize(t) === posix.normalize(plant.file))) {
    throw new Error(`${where} (${plant.name}): '${plant.file}' is one of its own test files — a plant breaks source, not the test`)
  }
  return plant
}

/** Validate `chaos.config.json`. Every field is required: a default here would be a silent gate. */
export function validateConfig(raw) {
  if (typeof raw !== 'object' || raw === null) throw new Error('chaos.config.json: not an object')
  const { plantsDir, expectedTotal, testCommand, summary } = raw
  if (typeof plantsDir !== 'string' || plantsDir.length === 0) throw new Error("chaos.config.json: 'plantsDir' must be a non-empty string")
  if (!Number.isInteger(expectedTotal) || expectedTotal < 1) throw new Error("chaos.config.json: 'expectedTotal' must be a positive integer — it is the count the gate may never silently drop below")
  if (!Array.isArray(testCommand) || testCommand.length === 0 || testCommand.some((t) => typeof t !== 'string')) {
    throw new Error("chaos.config.json: 'testCommand' must be a non-empty array of strings, e.g. [\"npx\", \"vitest\", \"run\"]")
  }
  if (typeof summary === 'string') {
    if (!(summary in SUMMARY_PRESETS)) throw new Error(`chaos.config.json: unknown summary preset '${summary}' (known: ${Object.keys(SUMMARY_PRESETS).join(', ')})`)
  } else if (typeof summary !== 'object' || summary === null || typeof summary.failed !== 'string' || typeof summary.passed !== 'string') {
    throw new Error("chaos.config.json: 'summary' must be a preset name or { \"failed\": \"<regex>\", \"passed\": \"<regex>\" }")
  } else {
    for (const key of ['failed', 'passed']) {
      try {
        new RegExp(summary[key], 'gm')
      } catch (err) {
        throw new Error(`chaos.config.json: summary.${key} is not a valid regex — ${err.message}`)
      }
    }
  }
  return { plantsDir, expectedTotal, testCommand, summary }
}

/** The command line. Anything that looks like an option and is not one is refused, never ignored. */
export function parseArgs(argv) {
  const unknown = argv.filter((a) => a.startsWith('-') && a !== '--list' && a !== '--check')
  if (unknown.length > 0) throw new Error(`unknown option ${unknown.join(' ')} — the options are --check and --list (anything else is a name filter)`)
  return { list: argv.includes('--list'), check: argv.includes('--check'), filters: argv.filter((a) => !a.startsWith('-')) }
}
