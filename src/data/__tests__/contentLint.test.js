import { describe, it, expect } from 'vitest'
import { lintDrills, findUnresolvedWords, collectDrills } from '../../../scripts/lint-content.mjs'
import * as GRAMMAR from '../grammar.js'
import * as GRAMMAR_EN from '../grammarEng.js'
import DICTIONARY from '../dictionary.js'

// Guard born from the 2026-06-12 review. Two layers:
//   (a) the structural lint catches the bug-CLASS on seeded fixtures, and
//   (b) explicit assertions lock the SPECIFIC fixes so a careless future edit
//       that re-introduces one fails the unit suite, not just the CLI.

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
