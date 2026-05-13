import { describe, it, expect } from 'vitest'
import { tokenizeWithOffsets } from '../speech'

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
