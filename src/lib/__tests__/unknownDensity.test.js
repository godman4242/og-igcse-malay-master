import { describe, it, expect } from 'vitest'
import { unknownDensity, isDense, DENSE_THRESHOLD, MIN_DENSE_TOKENS } from '../unknownDensity.js'
import { buildGroundingIndex } from '../dictionaryGrounding.js'

// A built-in DICTIONARY-shaped map: normalisedWord → truthy entry.
const DICT = { rumah: 'house', makan: 'eat', saya: 'I', pergi: 'go' }
const strTokens = (s) => s.split(/\s+/)
const objTokens = (s) => s.split(/\s+/).map((word, i) => ({ word, i }))

describe('unknownDensity', () => {
  it('exports the conservative 0.4 threshold', () => {
    expect(DENSE_THRESHOLD).toBe(0.4)
  })

  it('returns ratio 0 for empty / null / undefined input', () => {
    expect(unknownDensity([], DICT)).toEqual({ unknown: 0, total: 0, ratio: 0 })
    expect(unknownDensity(null, DICT)).toEqual({ unknown: 0, total: 0, ratio: 0 })
    expect(unknownDensity(undefined, DICT)).toEqual({ unknown: 0, total: 0, ratio: 0 })
  })

  it('is 0 when every content word is dictionary-known', () => {
    const r = unknownDensity(strTokens('saya makan rumah'), DICT)
    expect(r).toEqual({ unknown: 0, total: 3, ratio: 0 })
  })

  it('is 1 when every content word is unknown', () => {
    const r = unknownDensity(strTokens('xkata ykata zkata'), DICT)
    expect(r).toEqual({ unknown: 3, total: 3, ratio: 1 })
  })

  it('ignores punctuation-only tokens', () => {
    const r = unknownDensity(strTokens('rumah !!! ... — makan'), DICT)
    expect(r.total).toBe(2) // only rumah + makan are content
    expect(r.unknown).toBe(0)
  })

  it('ignores pure-number and symbol tokens', () => {
    const r = unknownDensity(strTokens('123 3.5 2026 rumah'), DICT)
    expect(r.total).toBe(1) // only rumah
    expect(r.unknown).toBe(0)
  })

  it('ignores 1-character tokens', () => {
    const r = unknownDensity(strTokens('a i z rumah baru'), DICT)
    // a/i/z are 1-char → ignored; rumah (known) + baru (unknown) counted
    expect(r.total).toBe(2)
    expect(r.unknown).toBe(1)
    expect(r.ratio).toBeCloseTo(0.5)
  })

  it('counts grounding-verified words as known', () => {
    const idx = buildGroundingIndex([{ m: 'kucing', e: 'cat' }, { m: 'anjing', e: 'dog' }])
    // kucing + anjing are NOT in DICT but ARE grounding-known → known.
    const r = unknownDensity(strTokens('kucing anjing zword'), DICT, idx)
    expect(r.total).toBe(3)
    expect(r.unknown).toBe(1) // only zword
    expect(r.ratio).toBeCloseTo(1 / 3)
  })

  it('does NOT dedupe — counts running words (token coverage, not types)', () => {
    const r = unknownDensity(strTokens('baru baru baru rumah'), DICT)
    expect(r.total).toBe(4)
    expect(r.unknown).toBe(3) // baru ×3 all count
    expect(r.ratio).toBeCloseTo(0.75)
  })

  it('accepts {word} object tokens (activeTokens shape)', () => {
    const r = unknownDensity(objTokens('saya makan zword'), DICT)
    expect(r.total).toBe(3)
    expect(r.unknown).toBe(1)
  })

  it('strips surrounding punctuation before classifying (rumah. → rumah)', () => {
    const r = unknownDensity(strTokens('rumah, makan! "saya"'), DICT)
    expect(r.unknown).toBe(0)
    expect(r.total).toBe(3)
  })

  it('computes a clean 0.4 boundary ratio (2 unknown of 5)', () => {
    const r = unknownDensity(strTokens('saya makan rumah aword bword'), DICT)
    expect(r.total).toBe(5)
    expect(r.unknown).toBe(2)
    expect(r.ratio).toBeCloseTo(0.4)
    expect(r.ratio >= DENSE_THRESHOLD).toBe(true) // boundary is inclusive-dense
  })

  it('is case-insensitive (RUMAH counts as known)', () => {
    const r = unknownDensity(strTokens('RUMAH Makan'), DICT)
    expect(r.unknown).toBe(0)
    expect(r.total).toBe(2)
  })
})

describe('isDense', () => {
  it('exports a sensible minimum-token floor', () => {
    expect(MIN_DENSE_TOKENS).toBe(20)
  })

  it('is false below the token floor even when the ratio is high', () => {
    expect(isDense({ total: 5, ratio: 1 })).toBe(false)
  })

  it('is false at/above the floor when the ratio is below threshold', () => {
    expect(isDense({ total: 50, ratio: 0.39 })).toBe(false)
  })

  it('is true at/above the floor and at/above the threshold (inclusive boundary)', () => {
    expect(isDense({ total: 20, ratio: 0.4 })).toBe(true)
    expect(isDense({ total: 100, ratio: 0.6 })).toBe(true)
  })

  it('is safe on empty / undefined input', () => {
    expect(isDense()).toBe(false)
    expect(isDense({ total: 0, ratio: 0 })).toBe(false)
  })
})
