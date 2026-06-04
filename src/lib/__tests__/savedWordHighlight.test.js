import { describe, it, expect } from 'vitest'
import { findSavedWordMatches, savedWordsForMode, wordAtOffset } from '../savedWordHighlight'

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

describe('wordAtOffset', () => {
  const text = 'Saya suka makan nasi'
  //            0123456789...        'makan' is [10,15)

  it('returns the saved word when the offset falls inside its span', () => {
    expect(wordAtOffset(text, 10, ['makan'])).toBe('makan') // at start
    expect(wordAtOffset(text, 12, ['makan'])).toBe('makan') // mid-word
    expect(wordAtOffset(text, 14, ['makan'])).toBe('makan') // last char
  })

  it('returns null when the offset is on the space between words', () => {
    expect(wordAtOffset(text, 9, ['makan'])).toBeNull()  // the space before 'makan'
    expect(wordAtOffset(text, 15, ['makan'])).toBeNull() // the space after 'makan' (== end, exclusive)
  })

  it('returns null when the offset is inside a non-saved word', () => {
    expect(wordAtOffset(text, 1, ['makan'])).toBeNull() // inside 'Saya'
  })

  it('matches a multi-word phrase when the offset lands anywhere within it', () => {
    const phrase = 'ke rumah sakit hari ini' // 'rumah sakit' is [3,14)
    expect(wordAtOffset(phrase, 3, ['rumah sakit'])).toBe('rumah sakit')  // start
    expect(wordAtOffset(phrase, 8, ['rumah sakit'])).toBe('rumah sakit')  // the inner space
    expect(wordAtOffset(phrase, 13, ['rumah sakit'])).toBe('rumah sakit') // last char
  })

  it('returns null for an offset past the end or for empty inputs', () => {
    expect(wordAtOffset(text, 999, ['makan'])).toBeNull()
    expect(wordAtOffset('', 0, ['makan'])).toBeNull()
    expect(wordAtOffset(text, 12, [])).toBeNull()
    expect(wordAtOffset(text, 12, null)).toBeNull()
  })
})
