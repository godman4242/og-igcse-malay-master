import { describe, it, expect } from 'vitest'
import { buildGroundingIndex, verifyPair } from '../dictionaryGrounding.js'

// Phase 2 grounding — Tier 1 (owned data). verifyPair checks an AI-proposed
// Malay↔English pair against trusted owned data: the curated dictionary + the
// learner's own cards. Exact owned match → auto-verify (high); known Malay but a
// different English → mismatch with the canonical suggestion (low); unknown →
// learner-in-the-loop confirm (low). NEVER auto-accepts an unverified guess.

const PAIRS = [
  { m: 'rumah', e: 'house' },
  { m: 'adalah', e: 'is/are' },        // multi-sense via '/'
  { m: 'anda', e: 'you (formal)' },    // parenthetical
  { m: 'aplikasi', e: 'application (app)' },
]

describe('buildGroundingIndex', () => {
  it('indexes owned pairs and merges learner cards (union, dedupe)', () => {
    const index = buildGroundingIndex(PAIRS, [{ m: 'kucing', e: 'cat' }, { m: 'rumah', e: 'home' }])
    // Card adds a new word…
    expect(verifyPair('kucing', 'cat', index).verified).toBe(true)
    // …and a second sense for an existing word (union, not overwrite).
    expect(verifyPair('rumah', 'home', index).verified).toBe(true)
    expect(verifyPair('rumah', 'house', index).verified).toBe(true)
  })

  it('tolerates empty / missing inputs without throwing', () => {
    expect(() => buildGroundingIndex()).not.toThrow()
    expect(() => buildGroundingIndex(null, null)).not.toThrow()
  })
})

describe('verifyPair', () => {
  const index = buildGroundingIndex(PAIRS)

  it('verifies an exact owned pair with high confidence', () => {
    const r = verifyPair('rumah', 'house', index)
    expect(r.verified).toBe(true)
    expect(r.confidence).toBe('high')
    expect(r.canonicalEn).toBe('house')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(verifyPair('  Rumah ', 'HOUSE', index).verified).toBe(true)
  })

  it('matches any sense of a multi-sense entry (slash-separated)', () => {
    expect(verifyPair('adalah', 'is', index).verified).toBe(true)
    expect(verifyPair('adalah', 'are', index).verified).toBe(true)
  })

  it('matches the parenthetical-stripped main term, but not the qualifier alone', () => {
    expect(verifyPair('anda', 'you', index).verified).toBe(true)
    expect(verifyPair('anda', 'you (formal)', index).verified).toBe(true)
    expect(verifyPair('anda', 'formal', index).verified).toBe(false) // qualifier ≠ meaning
  })

  it('flags a mismatch (known Malay, wrong English) with the canonical suggestion', () => {
    const r = verifyPair('rumah', 'car', index)
    expect(r.verified).toBe(false)
    expect(r.confidence).toBe('low')
    expect(r.canonicalEn).toBe('house')
    expect(r.suggestion).toMatch(/house/i)
  })

  it('returns unverified+low for an unknown Malay word (→ learner confirm)', () => {
    const r = verifyPair('xyzabc', 'something', index)
    expect(r.verified).toBe(false)
    expect(r.confidence).toBe('low')
    expect(r.canonicalEn).toBeUndefined()
  })

  it('never throws on empty / garbage input', () => {
    expect(verifyPair('', '', index)).toMatchObject({ verified: false })
    expect(verifyPair(null, undefined, index)).toMatchObject({ verified: false })
    expect(verifyPair('rumah', 'house', null)).toMatchObject({ verified: false })
  })
})
