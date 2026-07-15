import { describe, it, expect } from 'vitest'
import { lintDrills, findUnresolvedWords, collectDrills, categorizeGaps, lintDictionaryHeader, lintExampleQuality } from '../../../scripts/lint-content.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import * as GRAMMAR from '../grammar.js'
import * as GRAMMAR_EN from '../grammarEng.js'
import DICTIONARY from '../dictionary.js'
import EXAMPLES from '../dictionaryExamples.js'

// Guard born from the 2026-06-12 review. Two layers:
//   (a) the structural lint catches the bug-CLASS on seeded fixtures, and
//   (b) explicit assertions lock the SPECIFIC fixes so a careless future edit
//       that re-introduces one fails the unit suite, not just the CLI.

const here = dirname(fileURLToPath(import.meta.url))
const REAL_DRILLS = [...collectDrills([GRAMMAR]), ...collectDrills([GRAMMAR_EN])]

describe('content-lint — structural FATAL checks', () => {
  it('the real grammar/drill corpus is clean (no content errors)', () => {
    expect(lintDrills(REAL_DRILLS)).toEqual([])
  })

  it('catches answer === correction (the P1-3 bug-class)', () => {
    const errors = lintDrills([{ id: 'seed-eq', answer: 'foo', correction: 'foo' }])
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/answer===correction/)
  })

  it('catches a duplicate multiple-choice option', () => {
    const errors = lintDrills([{ id: 'seed-dup', options: ['a', 'b', 'a'], answer: 'b' }])
    expect(errors.some((e) => /dup-option/.test(e))).toBe(true)
  })

  it('catches an answer that is not one of the options', () => {
    const errors = lintDrills([{ id: 'seed-miss', options: ['a', 'b'], answer: 'c' }])
    expect(errors.some((e) => /answer-not-in-options/.test(e))).toBe(true)
  })

  it('passes a well-formed multiple-choice drill', () => {
    expect(lintDrills([{ id: 'seed-ok', options: ['a', 'b', 'c'], answer: 'b' }])).toEqual([])
  })

  it('treats a "No error" drill (absent / null correction) as valid', () => {
    expect(lintDrills([{ id: 'seed-ne', options: ['x', 'No error'], answer: 'No error' }])).toEqual([])
    expect(lintDrills([{ id: 'seed-ne2', options: ['x', 'No error'], answer: 'No error', correction: null }])).toEqual([])
  })

  it('flags every problem in one mixed-fixture pass', () => {
    const errors = lintDrills([
      { id: 'multi', options: ['a', 'a', 'b'], answer: 'z', correction: 'z' },
    ])
    expect(errors.some((e) => /dup-option/.test(e))).toBe(true)
    expect(errors.some((e) => /answer-not-in-options/.test(e))).toBe(true)
    expect(errors.some((e) => /answer===correction/.test(e))).toBe(true)
  })
})

describe('content-lint — dictionary-coverage warn check', () => {
  it('flags a made-up sentence word but not the known ones', () => {
    const found = findUnresolvedWords(
      [{ id: 'seed-warn', sentence: 'Saya pergi sekolah xyzzyq.' }],
      DICTIONARY,
    )
    const words = found.map((u) => u.word)
    expect(words).toContain('xyzzyq')
    expect(words).not.toContain('saya')
    expect(words).not.toContain('pergi')
    expect(words).not.toContain('sekolah')
  })

  it('no longer reports `semalam` — the P1 dictionary gap is closed', () => {
    const real = findUnresolvedWords(collectDrills([GRAMMAR]), DICTIONARY)
    expect(real.find((u) => u.word === 'semalam')).toBeUndefined()
    const probe = findUnresolvedWords([{ id: 'probe', sentence: 'Dia balik semalam.' }], DICTIONARY)
    expect(probe.find((u) => u.word === 'semalam')).toBeUndefined()
  })
})

describe('content-lint — locked specific fixes (2026-06-12 review)', () => {
  const byId = (id) => GRAMMAR.ERROR_DRILLS.find((d) => d.id === id)

  it('mentadbir & menterjemahkan are "No error" with no self-contradicting correction (P1-3)', () => {
    for (const id of ['error-mentadbir', 'error-menterjemahkan']) {
      const drill = byId(id)
      expect(drill).toBeDefined()
      expect(drill.answer).toBe('No error')
      expect(drill.correction).toBeUndefined()
      expect(drill.options).toContain('No error')
    }
  })

  it('eng-art-information has unique options including its answer', () => {
    const drill = GRAMMAR_EN.ARTICLE_DRILLS_EN.find((d) => d.id === 'eng-art-information')
    expect(drill).toBeDefined()
    expect(new Set(drill.options).size).toBe(drill.options.length)
    expect(drill.options).toContain(drill.answer)
  })

  it('persahabatan glosses as "friendship" (P1-4)', () => {
    expect(DICTIONARY['persahabatan']).toBe('friendship')
  })

  it('semalam is in the dictionary', () => {
    expect(DICTIONARY['semalam']).toBe('yesterday')
  })
})

describe('content-lint — gap triage (review feature #2)', () => {
  const dict = { 'basuh': 'to wash', 'tangkap': 'to catch', 'siar': 'broadcast/stroll', 'baca': 'to read' }

  const gap = (word, drills) => ({ word, drills })

  it('classifies a planted wrong form from an error-ID drill as "planted"', () => {
    const drills = [{
      id: 'error-salin', _set: 'ERROR_DRILLS', type: 'error',
      sentence: 'Dia mengsalin nota itu.', options: ['mengsalin', 'nota', 'No error'],
      answer: 'mengsalin', correction: 'menyalin',
    }]
    const out = categorizeGaps([gap('mengsalin', ['error-salin'])], drills, dict)
    expect(out[0].category).toBe('planted')
  })

  it('classifies an affixed form whose root is in the dictionary as "inflection"', () => {
    const drills = [{ id: 'd1', sentence: 'Emak membasuh baju.' }]
    const out = categorizeGaps([gap('membasuh', ['d1'])], drills, dict)
    expect(out[0].category).toBe('inflection')
    expect(out[0].root).toBe('basuh')
  })

  it('restores the dropped nasal consonant (menangkap → tangkap)', () => {
    const drills = [{ id: 'd2', sentence: 'Polis menangkap pencuri itu.' }]
    const out = categorizeGaps([gap('menangkap', ['d2'])], drills, dict)
    expect(out[0].category).toBe('inflection')
    expect(out[0].root).toBe('tangkap')
  })

  it('un-reduplicates (bersiarsiar → siar)', () => {
    const drills = [{ id: 'd3', sentence: 'Kami bersiar-siar di taman.' }]
    const out = categorizeGaps([gap('bersiarsiar', ['d3'])], drills, dict)
    expect(out[0].category).toBe('inflection')
    expect(out[0].root).toBe('siar')
  })

  it('classifies a consistently-capitalised mid-sentence word as "properNoun"', () => {
    const drills = [{ id: 'd4', sentence: 'Kawan saya Ahmad suka membaca.' }]
    const out = categorizeGaps([gap('ahmad', ['d4'])], drills, dict)
    expect(out[0].category).toBe('properNoun')
  })

  it('classifies an unknown bare word as "missing" — the actionable bucket', () => {
    const drills = [{ id: 'd5', sentence: 'Saya suka kucing itu.' }]
    const out = categorizeGaps([gap('kucing', ['d5'])], drills, dict)
    expect(out[0].category).toBe('missing')
  })
})

describe('content-lint — dictionary header count (doc-rot guard)', () => {
  it('errors when the header count does not match the real entry count', () => {
    const errors = lintDictionaryHeader('// IGCSE Malay vocabulary — 804 entries', { a: 1, b: 2 })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/header says 804/)
    expect(errors[0]).toMatch(/actual 2/)
  })

  it('passes when the header matches', () => {
    expect(lintDictionaryHeader('// IGCSE Malay vocabulary — 2 entries', { a: 1, b: 2 })).toEqual([])
  })

  it('the REAL dictionary header matches its real entry count', () => {
    const src = readFileSync(resolve(here, '../dictionary.js'), 'utf8')
    expect(lintDictionaryHeader(src, DICTIONARY)).toEqual([])
  })
})

describe('lintExampleQuality — every example must be blank-able for cloze', () => {
  it('flags an empty example', () => {
    expect(lintExampleQuality({ air: '' })[0]).toMatch(/empty/)
  })
  it('flags a too-short example', () => {
    expect(lintExampleQuality({ air: 'Air sejuk.' })[0]).toMatch(/words/)
  })
  it('flags a headword hidden inside a longer word (not blank-able)', () => {
    // "membaca" contains "baca" but not as a whole word → cloze can't blank it
    expect(lintExampleQuality({ baca: 'Saya suka membaca buku cerita setiap malam hari.' })[0])
      .toMatch(/whole word/)
  })
  it('passes a clean example', () => {
    expect(lintExampleQuality({ air: 'Saya minum air sejuk selepas berlari di padang.' })).toEqual([])
  })
  it('the REAL dictionaryExamples all pass the quality guard', () => {
    expect(lintExampleQuality(EXAMPLES)).toEqual([])
  })
})
