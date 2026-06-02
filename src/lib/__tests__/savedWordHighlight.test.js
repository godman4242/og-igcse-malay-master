import { describe, it, expect } from 'vitest'
import { findSavedWordMatches, savedWordsForMode } from '../savedWordHighlight'

describe('savedWordsForMode', () => {
  const cards = [
    { m: 'makan', e: 'eat', t: 'Saved' },
    { m: 'rumah', e: 'house', t: 'Saved' },
    { m: 'sekolah', e: 'school', t: 'Food' },
    { m: 'makan', e: 'eat', t: 'Food' }, // duplicate Malay term in another deck
    { m: '', e: 'blank', t: 'Saved' },   // junk — no Malay term
  ]

  it("returns nothing when highlighting is off", () => {
    expect(savedWordsForMode(cards, 'off')).toEqual([])
  })

  it("'saved' mode returns only the Saved-deck Malay words", () => {
    expect(savedWordsForMode(cards, 'saved').sort()).toEqual(['makan', 'rumah'])
  })

  it("'all' mode returns every deck's Malay words, de-duplicated", () => {
    expect(savedWordsForMode(cards, 'all').sort()).toEqual(['makan', 'rumah', 'sekolah'])
  })

  it('defaults unknown modes to saved-only and tolerates empty input', () => {
    expect(savedWordsForMode(cards, undefined).sort()).toEqual(['makan', 'rumah'])
    expect(savedWordsForMode(null, 'all')).toEqual([])
  })
})

describe('findSavedWordMatches', () => {
  it('returns no matches for empty text or empty word list', () => {
    expect(findSavedWordMatches('', ['makan'])).toEqual([])
    expect(findSavedWordMatches('Saya makan', [])).toEqual([])
    expect(findSavedWordMatches('Saya makan', null)).toEqual([])
  })

  it('finds a whole word, case-insensitively', () => {
    expect(findSavedWordMatches('Saya suka makan nasi', ['makan']))
      .toEqual([{ start: 10, end: 15, word: 'makan' }])
    // capitalised in the text, lowercase in the saved list
    expect(findSavedWordMatches('Makan dulu', ['makan']))
      .toEqual([{ start: 0, end: 5, word: 'makan' }])
  })

  it('does NOT match a saved word sitting inside a larger word', () => {
    // 'ada' must not match inside 'kepada' or 'adat'
    expect(findSavedWordMatches('kepada adat', ['ada'])).toEqual([])
  })

  it('finds every occurrence of a repeated word', () => {
    expect(findSavedWordMatches('makan makan lagi', ['makan'])).toEqual([
      { start: 0, end: 5, word: 'makan' },
      { start: 6, end: 11, word: 'makan' },
    ])
  })

  it('matches a multi-word phrase as one span', () => {
    expect(findSavedWordMatches('ke rumah sakit hari ini', ['rumah sakit']))
      .toEqual([{ start: 3, end: 14, word: 'rumah sakit' }])
  })

  it('prefers the longer match and never overlaps', () => {
    // 'rumah sakit' (hospital) should win over the bare 'rumah' inside it
    expect(findSavedWordMatches('rumah sakit', ['rumah', 'rumah sakit']))
      .toEqual([{ start: 0, end: 11, word: 'rumah sakit' }])
  })

  it('handles reduplicated (hyphenated) words like jalan-jalan', () => {
    expect(findSavedWordMatches('Kami jalan-jalan di pasar', ['jalan-jalan']))
      .toEqual([{ start: 5, end: 16, word: 'jalan-jalan' }])
  })

  it('treats regex-special characters in saved words literally', () => {
    // a defensive case: a stray '.' must not act as "any char"
    expect(findSavedWordMatches('abc xyz', ['a.c'])).toEqual([])
  })
})
