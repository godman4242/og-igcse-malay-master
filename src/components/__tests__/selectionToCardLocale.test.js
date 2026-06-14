// Structural regression guard (repo convention cf. roleplaySttLocale.test.js /
// studyTtsLocale.test.js): the universal select→card popover's Pronounce button
// must speak the SELECTED term in its DETECTED source language, not a hardcoded
// 'ms-MY'. SelectionToCard is the reader's English Select-mode path (v34) — an
// English learner who taps 🔊 on a selected English word must hear it in en-GB,
// not the Malay gloss in a Malay voice. The Malay path is byte-identical
// (source==='ms' → state.term is the Malay word → localeFor('ms')==='ms-MY').
//
// Source-pinned (not mounted): SelectionToCard is selection-event driven (window
// getSelection + a dynamic translate import) — heavy to drive in jsdom, and the
// bug is a one-line locale hardcode, so the pin is the right grain.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(resolve(here, '../SelectionToCard.jsx'), 'utf8')

describe('SelectionToCard Pronounce button follows the term language (structural)', () => {
  it('never hardcodes the Pronounce speak() locale to ms-MY', () => {
    expect(code).not.toMatch(/speak\([^)]*,\s*'ms-MY'\s*\)/)
  })

  it('speaks the selected term in its detected source locale via localeFor', () => {
    expect(code).toMatch(/import \{ localeFor \}/)
    expect(code).toMatch(/speak\(\s*state\.term,\s*localeFor\(state\.source\)\s*\)/)
  })
})
