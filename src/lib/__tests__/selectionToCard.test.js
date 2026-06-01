import { describe, it, expect } from 'vitest'
import { normalizeSelection, isCardWorthy } from '../selectionToCard'

describe('normalizeSelection', () => {
  it('returns null for empty / whitespace-only input', () => {
    expect(normalizeSelection('')).toBeNull()
    expect(normalizeSelection('   ')).toBeNull()
    expect(normalizeSelection('\n\t ')).toBeNull()
    expect(normalizeSelection(null)).toBeNull()
    expect(normalizeSelection(undefined)).toBeNull()
  })

  it('trims and reports a single word', () => {
    expect(normalizeSelection('  Makan. ')).toEqual({ term: 'Makan', wordCount: 1 })
  })

  it('strips leading/trailing punctuation but keeps inner hyphens', () => {
    expect(normalizeSelection('"jalan-jalan"')).toEqual({ term: 'jalan-jalan', wordCount: 1 })
    expect(normalizeSelection('(rumah),')).toEqual({ term: 'rumah', wordCount: 1 })
    expect(normalizeSelection('…makan?')).toEqual({ term: 'makan', wordCount: 1 })
  })

  it('collapses internal whitespace and counts words for a short phrase', () => {
    expect(normalizeSelection('  rumah    sakit ')).toEqual({ term: 'rumah sakit', wordCount: 2 })
  })

  it('keeps phrases up to 6 words', () => {
    expect(normalizeSelection('satu dua tiga empat lima enam')).toEqual({
      term: 'satu dua tiga empat lima enam', wordCount: 6,
    })
  })

  it('rejects long selections (a sentence, not a card)', () => {
    expect(normalizeSelection('satu dua tiga empat lima enam tujuh')).toBeNull()
  })

  it('rejects numbers-only / punctuation-only selections', () => {
    expect(normalizeSelection('123')).toBeNull()
    expect(normalizeSelection('  42 ')).toBeNull()
    expect(normalizeSelection('!!! ...')).toBeNull()
  })

  it('keeps a token that mixes letters and digits (e.g. covid-19)', () => {
    expect(normalizeSelection('covid-19')).toEqual({ term: 'covid-19', wordCount: 1 })
  })
})

describe('isCardWorthy', () => {
  it('is true exactly when normalizeSelection returns a term', () => {
    expect(isCardWorthy('Makan')).toBe(true)
    expect(isCardWorthy('rumah sakit')).toBe(true)
    expect(isCardWorthy('')).toBe(false)
    expect(isCardWorthy('123')).toBe(false)
    expect(isCardWorthy('a b c d e f g')).toBe(false)
  })
})
