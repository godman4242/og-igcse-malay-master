import { describe, it, expect } from 'vitest'
import { buildGroundingIndex, verifyPair } from '../dictionaryGrounding.js'
import { WIKIDATA_MS_EN } from '../../data/wikidataMalayEn.js'

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

// Tier 3 — CC0 Wikidata pairs fold in as a THIRD source. They widen coverage so
// trustworthy AI pairs auto-verify, but at MEDIUM confidence (trusted, not our
// hand-curated authority). Owned data always wins for display + confidence.
describe('verifyPair — Tier 3 (extra/Wikidata pairs)', () => {
  it('verifies an extra-only pair as medium confidence', () => {
    const index = buildGroundingIndex([], [], [{ m: 'payung', e: 'umbrella' }])
    const r = verifyPair('payung', 'umbrella', index)
    expect(r.verified).toBe(true)
    expect(r.confidence).toBe('medium')
    expect(r.canonicalEn).toBe('umbrella')
  })

  it('keeps an owned sense HIGH even when the same pair also appears in extra', () => {
    const index = buildGroundingIndex([{ m: 'rumah', e: 'house' }], [], [{ m: 'rumah', e: 'house' }])
    expect(verifyPair('rumah', 'house', index).confidence).toBe('high')
  })

  it('owned + extra senses on one word keep their own confidence tiers', () => {
    // owned says "house" (high); Wikidata adds "home" (medium) for the same word.
    const index = buildGroundingIndex([{ m: 'rumah', e: 'house' }], [], [{ m: 'rumah', e: 'home' }])
    expect(verifyPair('rumah', 'house', index)).toMatchObject({ verified: true, confidence: 'high' })
    expect(verifyPair('rumah', 'home', index)).toMatchObject({ verified: true, confidence: 'medium' })
    // display string prefers the owned gloss
    expect(verifyPair('rumah', 'home', index).canonicalEn).toBe('house')
  })

  it('an extra-known word with a wrong meaning still flags a mismatch (never silent-ship)', () => {
    const index = buildGroundingIndex([], [], [{ m: 'payung', e: 'umbrella' }])
    const r = verifyPair('payung', 'tent', index)
    expect(r.verified).toBe(false)
    expect(r.confidence).toBe('low')
    expect(r.suggestion).toMatch(/umbrella/i)
  })
})

// Locks the committed CC0 asset's shape so a bad regeneration can't slip through.
describe('WIKIDATA_MS_EN committed asset', () => {
  it('is a non-trivial array of clean {m,e} string pairs', () => {
    expect(Array.isArray(WIKIDATA_MS_EN)).toBe(true)
    expect(WIKIDATA_MS_EN.length).toBeGreaterThan(2000)
    for (const p of WIKIDATA_MS_EN.slice(0, 200)) {
      expect(typeof p.m).toBe('string')
      expect(typeof p.e).toBe('string')
      expect(p.m).toBe(p.m.toLowerCase()) // normalised lemma, no stray case
      expect(p.m).not.toMatch(/[0-9]/)
    }
  })

  it('feeds buildGroundingIndex so a real Wikidata pair verifies at medium', () => {
    const index = buildGroundingIndex([], [], WIKIDATA_MS_EN)
    expect(verifyPair('payung', 'umbrella', index)).toMatchObject({ verified: true, confidence: 'medium' })
  })
})
