// Data-integrity pins for the Academic English seed (AWL Sublist 3). Mirrors the
// Sublist 1/2 pins exactly: the canonical 60 headwords, every card studiable
// (non-empty target + Malay gloss), and an example that actually contains the
// base word (so cloze/produce blanking has something to blank). Catches a typo'd
// headword, an empty gloss, or a drifted count.
import { describe, it, expect } from 'vitest'
import ACADEMIC_EN_3 from '../academicEn3'

// The canonical AWL Sublist 3 (Coxhead 2000) — the independent answer key. The
// data file is the contestant; this list is verified against eapfoundation.com /
// Victoria University of Wellington, never reverse-derived from the data file.
const AWL_SUBLIST_3 = [
  'alternative', 'circumstance', 'comment', 'compensate', 'component', 'consent',
  'considerable', 'constant', 'constrain', 'contribute', 'convene', 'coordinate',
  'core', 'corporate', 'correspond', 'criteria', 'deduce', 'demonstrate',
  'document', 'dominate', 'emphasis', 'ensure', 'exclude', 'framework', 'fund',
  'illustrate', 'immigrate', 'imply', 'initial', 'instance', 'interact',
  'justify', 'layer', 'link', 'locate', 'maximise', 'minor', 'negate', 'outcome',
  'partner', 'philosophy', 'physical', 'proportion', 'publish', 'react',
  'register', 'rely', 'remove', 'scheme', 'sequence', 'sex', 'shift', 'specify',
  'sufficient', 'task', 'technical', 'technique', 'technology', 'valid', 'volume',
]

describe('academicEn3 seed data', () => {
  it('is an array of all 60 AWL Sublist 3 headwords (no extras, no misses)', () => {
    expect(Array.isArray(ACADEMIC_EN_3)).toBe(true)
    expect(ACADEMIC_EN_3).toHaveLength(60)
    const words = ACADEMIC_EN_3.map(e => e.m)
    expect([...words].sort()).toEqual([...AWL_SUBLIST_3].sort())
  })

  it('has no duplicate headwords', () => {
    const words = ACADEMIC_EN_3.map(e => e.m)
    expect(new Set(words).size).toBe(words.length)
  })

  it('does not overlap AWL Sublists 1 or 2 (the sublists are disjoint by construction)', async () => {
    const { default: S1 } = await import('../academicEn')
    const { default: S2 } = await import('../academicEn2')
    const earlier = new Set([...S1, ...S2].map(e => e.m))
    for (const { m } of ACADEMIC_EN_3) {
      expect(earlier.has(m), `"${m}" must not appear in an earlier sublist`).toBe(false)
    }
  })

  it('every entry is studiable: non-empty target, Malay gloss, example, valid POS', () => {
    const POS = new Set(['v', 'n', 'adj'])
    for (const entry of ACADEMIC_EN_3) {
      expect(entry.m, 'headword').toBeTruthy()
      expect(entry.m).toBe(entry.m.toLowerCase().trim())
      expect(entry.e, `gloss for "${entry.m}"`).toBeTruthy()
      expect(entry.e.trim().length, `gloss for "${entry.m}"`).toBeGreaterThan(1)
      expect(entry.ex, `example for "${entry.m}"`).toBeTruthy()
      expect(POS.has(entry.p), `POS for "${entry.m}" is ${entry.p}`).toBe(true)
    }
  })

  it('each example contains its base headword as a whole word (cloze/produce can blank it)', () => {
    for (const { m, ex } of ACADEMIC_EN_3) {
      const hit = new RegExp(`\\b${m}\\b`, 'i').test(ex)
      expect(hit, `example for "${m}" must contain the word: "${ex}"`).toBe(true)
    }
  })
})
