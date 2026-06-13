import { describe, it, expect } from 'vitest'
import { buildValiditySet, isRealMalayWord, annotateValidity } from '../malayValidity.js'

// Tier-2 grounding — a permissive (CC-BY 4.0) real-Malay-word VALIDITY check.
// It confirms an AI-proposed Malay word is a genuine word (catches invented
// non-words) but NEVER claims the translation is right, so it only ever decorates
// the confirm-flow's "Check these" rows — additive labels, no auto-verify.

describe('buildValiditySet', () => {
  it('builds a lowercase Set from a newline string, dropping blanks', () => {
    const set = buildValiditySet('rumah\nMakan\n\n  belajar  \n')
    expect(set instanceof Set).toBe(true)
    expect(set.size).toBe(3)
    expect(set.has('rumah')).toBe(true)
    expect(set.has('makan')).toBe(true) // lowercased
    expect(set.has('belajar')).toBe(true) // trimmed
  })

  it('also accepts an array of words', () => {
    const set = buildValiditySet(['rumah', 'MAKAN'])
    expect(set.has('rumah')).toBe(true)
    expect(set.has('makan')).toBe(true)
  })

  it('tolerates junk input without throwing', () => {
    expect(buildValiditySet().size).toBe(0)
    expect(buildValiditySet(null).size).toBe(0)
    expect(buildValiditySet(42).size).toBe(0)
  })
})

describe('isRealMalayWord', () => {
  const set = buildValiditySet('rumah\nmakan\nmalam\nbelajar')

  it('matches a known single word, case/space-insensitively', () => {
    expect(isRealMalayWord('rumah', set)).toBe(true)
    expect(isRealMalayWord('  RuMaH ', set)).toBe(true)
  })

  it('rejects an unknown (possibly invented) word', () => {
    expect(isRealMalayWord('flurbplim', set)).toBe(false)
  })

  it('accepts a multi-word phrase only when EVERY token is real', () => {
    expect(isRealMalayWord('makan malam', set)).toBe(true) // both real
    expect(isRealMalayWord('makan zzz', set)).toBe(false) // one invented token
  })

  it('returns false for empty input or a non-Set index', () => {
    expect(isRealMalayWord('', set)).toBe(false)
    expect(isRealMalayWord('rumah', null)).toBe(false)
    expect(isRealMalayWord(undefined, set)).toBe(false)
  })
})

describe('annotateValidity', () => {
  const set = buildValiditySet('rumah\nmakan')

  it('adds a validWord flag without dropping or mutating existing fields', () => {
    const review = [
      { m: 'rumah', e: 'house', ex: 'rumah saya', suggestion: 'Dictionary lists "home"' },
      { m: 'zxqw', e: 'nonsense' },
    ]
    const out = annotateValidity(review, set)
    expect(out[0]).toMatchObject({ m: 'rumah', e: 'house', ex: 'rumah saya', validWord: true })
    expect(out[0].suggestion).toBe('Dictionary lists "home"') // preserved
    expect(out[1].validWord).toBe(false)
    // original array untouched (returns a new array of new objects)
    expect(review[0].validWord).toBeUndefined()
  })

  it('tolerates junk input', () => {
    expect(annotateValidity(null, set)).toEqual([])
    expect(annotateValidity([{ m: 'rumah' }], null)).toEqual([{ m: 'rumah', validWord: false }])
  })
})
