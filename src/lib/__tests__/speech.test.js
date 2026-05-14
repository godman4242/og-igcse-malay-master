import { describe, it, expect } from 'vitest'
import { tokenizeWithOffsets, parseRatingKeyword } from '../speech'

describe('tokenizeWithOffsets', () => {
  it('returns empty array for empty / non-string input', () => {
    expect(tokenizeWithOffsets('')).toEqual([])
    expect(tokenizeWithOffsets(null)).toEqual([])
    expect(tokenizeWithOffsets(undefined)).toEqual([])
    expect(tokenizeWithOffsets(42)).toEqual([])
  })

  it('tokenises a simple Malay sentence with correct offsets', () => {
    const out = tokenizeWithOffsets('Saya makan nasi.')
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ word: 'Saya', start: 0, end: 4, index: 0 })
    expect(out[1]).toEqual({ word: 'makan', start: 5, end: 10, index: 1 })
    expect(out[2]).toEqual({ word: 'nasi.', start: 11, end: 16, index: 2 })
  })

  it('collapses multi-whitespace and survives leading/trailing whitespace', () => {
    const out = tokenizeWithOffsets('   hello   world  ')
    expect(out.map(t => t.word)).toEqual(['hello', 'world'])
    expect(out[0].start).toBe(3)
    expect(out[1].start).toBe(11)
  })

  it('treats newlines and tabs as whitespace (paragraph-flat token stream)', () => {
    const out = tokenizeWithOffsets('rumah\nsaya\tdi\nkampung')
    expect(out.map(t => t.word)).toEqual(['rumah', 'saya', 'di', 'kampung'])
    expect(out.map(t => t.index)).toEqual([0, 1, 2, 3])
  })

  it('character offsets round-trip — slicing the source by start/end recovers each word', () => {
    const text = 'Pelajar itu sedang membaca buku di perpustakaan.'
    const out = tokenizeWithOffsets(text)
    for (const t of out) {
      expect(text.slice(t.start, t.end)).toBe(t.word)
    }
  })
})

describe('parseRatingKeyword (speak-to-rate spotter)', () => {
  it('returns null for non-string / empty / no-keyword input', () => {
    expect(parseRatingKeyword('')).toBeNull()
    expect(parseRatingKeyword(null)).toBeNull()
    expect(parseRatingKeyword(undefined)).toBeNull()
    expect(parseRatingKeyword(42)).toBeNull()
    expect(parseRatingKeyword('saya tak tahu')).toBeNull()
    expect(parseRatingKeyword('   !!!   ')).toBeNull()
  })

  it('maps each of the four FSRS keywords to the right rating int', () => {
    expect(parseRatingKeyword('again')).toBe(1)
    expect(parseRatingKeyword('hard')).toBe(2)
    expect(parseRatingKeyword('good')).toBe(3)
    expect(parseRatingKeyword('easy')).toBe(4)
  })

  it('is case-insensitive and tolerates punctuation / surrounding chatter', () => {
    expect(parseRatingKeyword('Good.')).toBe(3)
    expect(parseRatingKeyword('EASY!')).toBe(4)
    expect(parseRatingKeyword('um, hard I think')).toBe(2)
    expect(parseRatingKeyword('that was easy peasy')).toBe(4)
  })

  it('whole-word match only — does not fire on substrings', () => {
    // ASR sometimes returns longer English words that happen to contain a
    // keyword as a substring. We must not auto-rate on those.
    expect(parseRatingKeyword('hardest')).toBeNull()
    expect(parseRatingKeyword('goodness')).toBeNull()
    expect(parseRatingKeyword('uneasy')).toBeNull()
    expect(parseRatingKeyword('regain')).toBeNull()
  })

  it('priority on conflicts goes again > hard > good > easy (conservative grade)', () => {
    // Student self-corrects mid-utterance — always take the harder grade
    // so spacing intervals stay conservative.
    expect(parseRatingKeyword('easy no wait again')).toBe(1)
    expect(parseRatingKeyword('good actually hard')).toBe(2)
    expect(parseRatingKeyword('easy I mean good')).toBe(3)
  })

  it('handles natural-speech phrasings the ASR is likely to emit', () => {
    expect(parseRatingKeyword('try again please')).toBe(1)
    expect(parseRatingKeyword("that's a hard one")).toBe(2)
    expect(parseRatingKeyword('I got it good')).toBe(3)
    expect(parseRatingKeyword('too easy')).toBe(4)
  })
})
