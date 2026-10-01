import { describe, it, expect } from 'vitest'
import { IMBUHAN_DRILLS, TRANSFORM_DRILLS, ERROR_DRILLS } from '../grammar'

// Content-truth pins from the 2026-10-01 audit of src/data/grammar.js
// (docs/research/2026-10-01-grammar-content-audit.md). A wrong rule line is
// read by a learner who can't tell it's wrong, so each fix is pinned exactly.
// Drill ids are grammarCards keys — they never change.

const byId = (list, id) => list.find(d => d.id === id)

describe('grammar.js — explanation lines a learner can trust', () => {
  it('pengajaran: ajar starts with a vowel, so no "K drops" (peng- + vowel)', () => {
    const d = byId(TRANSFORM_DRILLS, 'transform-noun-mengajar2')
    expect(d.answer).toBe('pengajaran')
    expect(d.hint).not.toMatch(/K drops/)
    expect(d.hint).toMatch(/vowel/)
  })

  it('pekerja is pe- (the ber- pair of bekerja), matching wordFamilies — the hint no longer says peN-', () => {
    const d = byId(IMBUHAN_DRILLS, 'prefix-peN-kerja')
    expect(d.answer).toBe('pekerja')
    expect(d.prefix).toBe('peN-') // grouping key for the UI/concept tracker — unchanged on purpose
    expect(d.rule).toMatch(/^pe- \+ kerja/)
    expect(d.hint).toMatch(/^pe- \+ kerja/)
    expect(d.hint).not.toMatch(/^peN-/)
  })

  it('checked-and-cleared lines keep their verified answers (Kamus Dewan)', () => {
    // mencomel = merungut (comel II), so "kucing yang mencomel" is the error
    expect(byId(ERROR_DRILLS, 'error-mencomel').correction).toBe('comel')
    // loanwords keep t: mentadbir / menterjemahkan (Kamus Dewan: mentafsirkan, penafsir)
    expect(byId(ERROR_DRILLS, 'error-mentadbir').answer).toBe('No error')
    expect(byId(ERROR_DRILLS, 'error-menterjemahkan').answer).toBe('No error')
  })
})
