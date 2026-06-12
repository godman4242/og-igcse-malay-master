#!/usr/bin/env node
// Content-lint guard for grammar drills + dictionary glosses.
//
// Born from the 2026-06-12 full-codebase review, which found two drills that
// marked the CORRECT learner wrong (P1-3: answer === correction), a duplicate
// multiple-choice option (grammarEng `eng-art-information`), and a drill word
// (`semalam`) missing from the dictionary. All of those are mechanically
// detectable, so this guard makes that whole bug-class un-shippable.
//
// FATAL checks (non-zero exit → blocks the pre-commit gate):
//   1. answer !== correction   — a drill must never grade the right answer wrong
//   2. MCQ options unique       — no duplicate option in a multiple-choice drill
//   3. answer ∈ options         — the keyed answer must actually be selectable
// WARN-only check (never blocks the build):
//   4. every Malay drill-sentence content word resolves in the built-in
//      dictionary — surfaces gloss / unknownDensity gaps (e.g. the missing
//      `semalam`). Warn-only "to start": inflected forms and proper nouns are
//      expected noise here; this list feeds dictionary-gap triage, not a gate.
//
// Pure + importable: the checks are exported as plain functions so the unit
// test (src/data/__tests__/contentLint.test.js) can drive them against seeded
// bad fixtures. The data files are plain ESM with no DOM/network imports, so
// this runs under bare `node` in the pre-commit hook.

import { pathToFileURL } from 'node:url'
import * as GRAMMAR from '../src/data/grammar.js'
import * as GRAMMAR_EN from '../src/data/grammarEng.js'
import DICTIONARY from '../src/data/dictionary.js'

// ── helpers ────────────────────────────────────────────────────────────────

// Collect every drill object (anything with a string `id`) from the array
// exports of one or more ESM namespace objects. Tags each with its export name
// for readable error locations. Non-array exports (GRAMMAR_RULES tables, the
// default object) are ignored.
export function collectDrills(modules) {
  const drills = []
  for (const mod of modules) {
    for (const [setName, value] of Object.entries(mod)) {
      if (!Array.isArray(value)) continue
      for (const drill of value) {
        if (drill && typeof drill === 'object' && typeof drill.id === 'string') {
          drills.push({ ...drill, _set: setName })
        }
      }
    }
  }
  return drills
}

// Normalise a running word to a dictionary-comparable key: lowercase, drop any
// character that isn't a basic latin letter (punctuation, the blank `___`,
// digits). Mirrors the "content word" intent of src/lib/unknownDensity.js.
function normWord(word) {
  return String(word).toLowerCase().replace(/[^a-z]/g, '')
}

// ── FATAL checks (1–3) ───────────────────────────────────────────────────────

export function lintDrills(drills) {
  const errors = []
  const at = (d) => `${d._set || '?'} / ${d.id}`

  for (const d of drills) {
    // 1. answer must never equal its own correction (P1-3). A null/absent
    //    correction (the "No error" drills) is fine.
    if (typeof d.correction === 'string' && d.correction.length > 0 && d.answer === d.correction) {
      errors.push(
        `[answer===correction] ${at(d)}: answer and correction are the identical string ${JSON.stringify(d.answer)} — the correct learner gets marked wrong.`,
      )
    }

    // 2 + 3 apply only to multiple-choice drills (those carrying an options list).
    if (Array.isArray(d.options)) {
      // 2. options unique
      const seen = new Set()
      for (const opt of d.options) {
        const key = typeof opt === 'string' ? opt : JSON.stringify(opt)
        if (seen.has(key)) {
          errors.push(`[dup-option] ${at(d)}: duplicate option ${JSON.stringify(opt)} in ${JSON.stringify(d.options)}.`)
        }
        seen.add(key)
      }
      // 3. answer ∈ options
      if (d.answer !== undefined && !d.options.includes(d.answer)) {
        errors.push(
          `[answer-not-in-options] ${at(d)}: answer ${JSON.stringify(d.answer)} is not one of the options ${JSON.stringify(d.options)}.`,
        )
      }
    }
  }
  return errors
}

// ── WARN-only check (4) ──────────────────────────────────────────────────────

// Build the set of known single words from the dictionary, splitting multi-word
// keys ('sains komputer' → 'sains', 'komputer') so each running word can resolve.
function buildKnownWords(dictionary) {
  const known = new Set()
  for (const key of Object.keys(dictionary)) {
    for (const part of key.split(/\s+/)) {
      const n = normWord(part)
      if (n) known.add(n)
    }
  }
  return known
}

// Find Malay drill-sentence words with no dictionary gloss. Only running text
// (multi-word `sentence` / `active` fields) is scanned — single-word transform
// prompts ('mengajar') are derivation targets, not sentences. Returns a sorted,
// de-duplicated list of { word, drills }.
export function findUnresolvedWords(drills, dictionary) {
  const known = buildKnownWords(dictionary)
  const FIELDS = ['sentence', 'active']
  const unresolved = new Map() // word → Set(drill ids)

  for (const d of drills) {
    for (const field of FIELDS) {
      const text = d[field]
      if (typeof text !== 'string' || !text.includes(' ')) continue
      for (const token of text.split(/\s+/)) {
        const n = normWord(token)
        if (!n || n.length <= 1) continue // drop punctuation / single chars
        if (known.has(n)) continue
        if (!unresolved.has(n)) unresolved.set(n, new Set())
        unresolved.get(n).add(d.id)
      }
    }
  }

  return [...unresolved.entries()]
    .map(([word, ids]) => ({ word, drills: [...ids].sort() }))
    .sort((a, b) => a.word.localeCompare(b.word))
}

// ── CLI runner ───────────────────────────────────────────────────────────────

function run() {
  const malayDrills = collectDrills([GRAMMAR])
  const engDrills = collectDrills([GRAMMAR_EN])
  const allDrills = [...malayDrills, ...engDrills]

  const errors = lintDrills(allDrills)
  const unresolved = findUnresolvedWords(malayDrills, DICTIONARY)

  console.log(`[lint-content] ${allDrills.length} drills checked (${malayDrills.length} MS, ${engDrills.length} EN).`)

  if (unresolved.length) {
    const CAP = 40
    console.log(
      `\n[lint-content] ⚠ ${unresolved.length} Malay drill-sentence word-form(s) have no dictionary gloss (warn-only — inflected forms & proper nouns are expected; triage feeds review feature #2):`,
    )
    console.log(
      '  ' + unresolved.slice(0, CAP).map((u) => u.word).join(', ') + (unresolved.length > CAP ? `, …(+${unresolved.length - CAP} more)` : ''),
    )
  }

  if (errors.length) {
    console.error(`\n[lint-content] ❌ ${errors.length} content error(s) — commit aborted:`)
    for (const e of errors) console.error('  • ' + e)
    process.exit(1)
  }

  console.log('\n[lint-content] ✓ no content errors.')
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) run()
