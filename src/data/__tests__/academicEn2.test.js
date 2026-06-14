// Data-integrity pins for the Academic English seed (AWL Sublist 2). Mirrors the
// Sublist 1 pins exactly: the canonical 60 headwords, every card studiable
// (non-empty target + Malay gloss), and an example that actually contains the
// base word (so cloze/produce blanking has something to blank). Catches a typo'd
// headword, an empty gloss, or a drifted count.
import { describe, it, expect } from 'vitest'
import ACADEMIC_EN_2 from '../academicEn2'

// The canonical AWL Sublist 2 (Coxhead 2000) — the independent answer key. The
// data file is the contestant; this list is verified against eapfoundation.com /
// Victoria University of Wellington, never reverse-derived from the data file.
const AWL_SUBLIST_2 = [
  'achieve', 'acquire', 'administrate', 'affect', 'appropriate', 'aspect',
  'assist', 'category', 'chapter', 'commission', 'community', 'complex',
  'compute', 'conclude', 'conduct', 'consequent', 'construct', 'consume',
  'credit', 'culture', 'design', 'distinct', 'element', 'equate', 'evaluate',
  'feature', 'final', 'focus', 'impact', 'injure', 'institute', 'invest', 'item',
  'journal', 'maintain', 'normal', 'obtain', 'participate', 'perceive',
  'positive', 'potential', 'previous', 'primary', 'purchase', 'range', 'region',
  'regulate', 'relevant', 'reside', 'resource', 'restrict', 'secure', 'seek',
  'select', 'site', 'strategy', 'survey', 'text', 'tradition', 'transfer',
]

describe('academicEn2 seed data', () => {
  it('is an array of all 60 AWL Sublist 2 headwords (no extras, no misses)', () => {
    expect(Array.isArray(ACADEMIC_EN_2)).toBe(true)
    expect(ACADEMIC_EN_2).toHaveLength(60)
    const words = ACADEMIC_EN_2.map(e => e.m)
    expect([...words].sort()).toEqual([...AWL_SUBLIST_2].sort())
  })

  it('has no duplicate headwords', () => {
    const words = ACADEMIC_EN_2.map(e => e.m)
    expect(new Set(words).size).toBe(words.length)
  })

  it('does not overlap AWL Sublist 1 (the sublists are disjoint by construction)', async () => {
    const { default: ACADEMIC_EN_1 } = await import('../academicEn')
    const s1 = new Set(ACADEMIC_EN_1.map(e => e.m))
    for (const { m } of ACADEMIC_EN_2) {
      expect(s1.has(m), `"${m}" must not appear in both sublists`).toBe(false)
    }
  })

  it('every entry is studiable: non-empty target, Malay gloss, example, valid POS', () => {
    const POS = new Set(['v', 'n', 'adj'])
    for (const entry of ACADEMIC_EN_2) {
      expect(entry.m, 'headword').toBeTruthy()
      expect(entry.m).toBe(entry.m.toLowerCase().trim())
      expect(entry.e, `gloss for "${entry.m}"`).toBeTruthy()
      expect(entry.e.trim().length, `gloss for "${entry.m}"`).toBeGreaterThan(1)
      expect(entry.ex, `example for "${entry.m}"`).toBeTruthy()
      expect(POS.has(entry.p), `POS for "${entry.m}" is ${entry.p}`).toBe(true)
    }
  })

  it('each example contains its base headword as a whole word (cloze/produce can blank it)', () => {
    for (const { m, ex } of ACADEMIC_EN_2) {
      const hit = new RegExp(`\\b${m}\\b`, 'i').test(ex)
      expect(hit, `example for "${m}" must contain the word: "${ex}"`).toBe(true)
    }
  })
})
