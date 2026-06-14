// Behaviour-preserving coverage for src/lib/writingFormats.js — the lightweight
// IGCSE writing FORMAT CATALOGUE split out of writingGrader.js (so the Dashboard
// + MistakeJournal can list formats without the 700-line grader). Three exports:
//   - FORMATS: 27 static format objects (13 English `eng` + 14 Malay `malay`).
//   - FORMATS_BY_ID: Object.fromEntries(FORMATS.map(...)) derived id→format map.
//   - listFormats(lang): PURE filter — FORMATS.filter(f => !lang || f.lang===lang).
// Counts (13 / 14 / 27) are hand-typed LITERALS, NOT re-derived from FORMATS.length,
// so a catalogue regression (added/dropped/relang'd format) actually fails here.
// writingFormats.js is byte-identical: this adds tests only.
import { describe, it, expect } from 'vitest'
import { FORMATS, FORMATS_BY_ID, listFormats } from '../writingFormats'

const EN_COUNT = 13
const MS_COUNT = 14
const TOTAL = 27

describe('listFormats', () => {
  it('no argument → returns the whole catalogue (the !lang short-circuit)', () => {
    expect(listFormats()).toHaveLength(TOTAL)
    expect(Array.isArray(listFormats())).toBe(true)
  })

  it('falsy lang (undefined / null / empty string) → returns all (never filters)', () => {
    expect(listFormats(undefined)).toHaveLength(TOTAL)
    expect(listFormats(null)).toHaveLength(TOTAL)
    expect(listFormats('')).toHaveLength(TOTAL)
  })

  it("'eng' → only the 13 English formats", () => {
    const eng = listFormats('eng')
    expect(eng).toHaveLength(EN_COUNT)
    expect(eng.every(f => f.lang === 'eng')).toBe(true)
  })

  it("'malay' → only the 14 Malay formats", () => {
    const ms = listFormats('malay')
    expect(ms).toHaveLength(MS_COUNT)
    expect(ms.every(f => f.lang === 'malay')).toBe(true)
  })

  it('unknown lang → empty array (no match, not a throw)', () => {
    expect(listFormats('french')).toEqual([])
  })
})

describe('FORMATS_BY_ID', () => {
  it('has exactly one entry per format → pins id uniqueness (a dup id would collapse the map)', () => {
    expect(Object.keys(FORMATS_BY_ID)).toHaveLength(FORMATS.length)
    expect(Object.keys(FORMATS_BY_ID)).toHaveLength(TOTAL)
  })

  it('maps a known id to its FORMATS entry BY REFERENCE', () => {
    const fromArray = FORMATS.find(f => f.id === 'eng-email')
    expect(FORMATS_BY_ID['eng-email']).toBe(fromArray)
    expect(FORMATS_BY_ID['ms-surat-rasmi']).toBe(FORMATS.find(f => f.id === 'ms-surat-rasmi'))
  })

  it('an absent id → undefined', () => {
    expect(FORMATS_BY_ID['does-not-exist']).toBeUndefined()
  })
})

describe('FORMATS data integrity', () => {
  it('the catalogue is exactly 13 English + 14 Malay = 27', () => {
    expect(FORMATS).toHaveLength(TOTAL)
    expect(FORMATS.filter(f => f.lang === 'eng')).toHaveLength(EN_COUNT)
    expect(FORMATS.filter(f => f.lang === 'malay')).toHaveLength(MS_COUNT)
  })

  it('every entry has a non-empty string id and label', () => {
    for (const f of FORMATS) {
      expect(typeof f.id).toBe('string')
      expect(f.id.length).toBeGreaterThan(0)
      expect(typeof f.label).toBe('string')
      expect(f.label.length).toBeGreaterThan(0)
    }
  })

  it("every lang is exactly 'eng' or 'malay'", () => {
    for (const f of FORMATS) {
      expect(['eng', 'malay']).toContain(f.lang)
    }
  })

  it('word bounds are numbers with 0 < minWords < maxWords', () => {
    for (const f of FORMATS) {
      expect(typeof f.minWords).toBe('number')
      expect(typeof f.maxWords).toBe('number')
      expect(f.minWords).toBeGreaterThan(0)
      expect(f.maxWords).toBeGreaterThan(f.minWords)
    }
  })

  it('markers + requiredHints are non-empty arrays of non-empty strings', () => {
    for (const f of FORMATS) {
      expect(Array.isArray(f.markers)).toBe(true)
      expect(f.markers.length).toBeGreaterThan(0)
      expect(f.markers.every(m => typeof m === 'string' && m.length > 0)).toBe(true)
      expect(Array.isArray(f.requiredHints)).toBe(true)
      expect(f.requiredHints.length).toBeGreaterThan(0)
      expect(f.requiredHints.every(h => typeof h === 'string' && h.length > 0)).toBe(true)
    }
  })

  it("id prefix matches lang: 'eng-*' ⇒ eng, 'ms-*' ⇒ malay", () => {
    for (const f of FORMATS) {
      if (f.lang === 'eng') expect(f.id.startsWith('eng-')).toBe(true)
      else expect(f.id.startsWith('ms-')).toBe(true)
    }
  })
})
