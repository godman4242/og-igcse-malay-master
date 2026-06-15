import { describe, it, expect } from 'vitest'
import { containsWholeWord, wholeWordSplitRegex } from '../wholeWordMatch'

// The roleplay scorecard credited a key vocab/imbuhan word when it only appeared
// as a SUBSTRING of an unrelated word. These pin the whole-word contract with the
// real reproducing cases from scenarios.js.

describe('containsWholeWord — no substring false-credit', () => {
  it('does NOT match a key word inside an unrelated longer word', () => {
    // keyVocab 'menu' (restaurant scenario) inside 'menunggu' (to wait) / 'menunjukkan' (to show)
    expect(containsWholeWord('Saya menunggu makanan dan bil', 'menu')).toBe(false)
    expect(containsWholeWord('Pelayan menunjukkan tempat duduk', 'menu')).toBe(false)
    // keyVocab 'bil' inside 'ambil' (take)
    expect(containsWholeWord('Tolong ambil barang itu', 'bil')).toBe(false)
    // keyVocab 'harga' (phone scenario) inside 'berharga' (valuable)
    expect(containsWholeWord('Telefon ini sangat berharga', 'harga')).toBe(false)
  })

  it('matches a key word used as a standalone whole word (case-insensitive)', () => {
    expect(containsWholeWord('Boleh saya lihat menu?', 'menu')).toBe(true)
    expect(containsWholeWord('Ini BIL saya', 'bil')).toBe(true)
    expect(containsWholeWord('Berapa Harga telefon ini?', 'harga')).toBe(true)
  })

  it('matches a multi-word phrase as a unit', () => {
    expect(containsWholeWord('Saya naik kapal terbang ke KL', 'kapal terbang')).toBe(true)
    // but not when it is glued into a longer token
    expect(containsWholeWord('kapal terbanglah', 'kapal terbang')).toBe(false)
  })

  it('matches hyphenated reduplication as a whole', () => {
    expect(containsWholeWord('Beli gula-gula di kedai', 'gula-gula')).toBe(true)
    // A hyphen is a word boundary (same convention as savedWordHighlight.js /
    // blankWord.js for reduplication like 'jalan-jalan'), so the bare half does
    // match — but the substring inside an UN-hyphenated token must not.
    expect(containsWholeWord('Beli gulai ayam', 'gula')).toBe(false)
  })

  it('guards non-string / empty inputs (drop-in for .includes — never throws)', () => {
    expect(containsWholeWord(null, 'menu')).toBe(false)
    expect(containsWholeWord('Saya makan', '')).toBe(false)
    expect(containsWholeWord('Saya makan', '   ')).toBe(false)
    expect(containsWholeWord(undefined, undefined)).toBe(false)
  })
})

describe('wholeWordSplitRegex — split keeps whole-word delimiters', () => {
  it('splits on the whole word only, leaving substrings intact', () => {
    const re = wholeWordSplitRegex(['menu'])
    expect('Saya menunggu menu di sini'.split(re)).toEqual(
      ['Saya menunggu ', 'menu', ' di sini'],
    )
  })

  it('prefers the longest phrase over a contained shorter word', () => {
    const re = wholeWordSplitRegex(['kapal', 'kapal terbang'])
    expect('Naik kapal terbang ke KL'.split(re)).toEqual(
      ['Naik ', 'kapal terbang', ' ke KL'],
    )
  })

  it('returns null when there is no non-empty word', () => {
    expect(wholeWordSplitRegex([])).toBe(null)
    expect(wholeWordSplitRegex(['', '  '])).toBe(null)
    expect(wholeWordSplitRegex(null)).toBe(null)
  })
})
