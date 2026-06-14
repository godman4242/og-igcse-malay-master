// Data-integrity pins for the Academic English seed (AWL Sublist 1). A learning
// tool ships content, so the content has invariants: the canonical 60 headwords,
// every card studiable (non-empty target + Malay gloss), and an example that
// actually contains the base word (so cloze/produce blanking has something to
// blank). Catches a typo'd headword, an empty gloss, or a drifted count.
import { describe, it, expect } from 'vitest'
import ACADEMIC_EN from '../academicEn'

// The canonical AWL Sublist 1 (Coxhead 2000) — the independent answer key. The
// data file is the contestant; this list is verified against eapfoundation.com /
// Victoria University of Wellington, never reverse-derived from the data file.
const AWL_SUBLIST_1 = [
  'analyse', 'approach', 'area', 'assess', 'assume', 'authority', 'available',
  'benefit', 'concept', 'consist', 'constitute', 'context', 'contract', 'create',
  'data', 'define', 'derive', 'distribute', 'economy', 'environment', 'establish',
  'estimate', 'evident', 'export', 'factor', 'finance', 'formula', 'function',
  'identify', 'income', 'indicate', 'individual', 'interpret', 'involve', 'issue',
  'labour', 'legal', 'legislate', 'major', 'method', 'occur', 'percent', 'period',
  'policy', 'principle', 'proceed', 'process', 'require', 'research', 'respond',
  'role', 'section', 'sector', 'significant', 'similar', 'source', 'specific',
  'structure', 'theory', 'vary',
]

describe('academicEn seed data', () => {
  it('is an array of all 60 AWL Sublist 1 headwords (no extras, no misses)', () => {
    expect(Array.isArray(ACADEMIC_EN)).toBe(true)
    expect(ACADEMIC_EN).toHaveLength(60)
    const words = ACADEMIC_EN.map(e => e.m)
    expect([...words].sort()).toEqual([...AWL_SUBLIST_1].sort())
  })

  it('has no duplicate headwords', () => {
    const words = ACADEMIC_EN.map(e => e.m)
    expect(new Set(words).size).toBe(words.length)
  })

  it('every entry is studiable: non-empty target, Malay gloss, example, valid POS', () => {
    const POS = new Set(['v', 'n', 'adj'])
    for (const entry of ACADEMIC_EN) {
      expect(entry.m, 'headword').toBeTruthy()
      expect(entry.m).toBe(entry.m.toLowerCase().trim())
      expect(entry.e, `gloss for "${entry.m}"`).toBeTruthy()
      expect(entry.e.trim().length, `gloss for "${entry.m}"`).toBeGreaterThan(1)
      expect(entry.ex, `example for "${entry.m}"`).toBeTruthy()
      expect(POS.has(entry.p), `POS for "${entry.m}" is ${entry.p}`).toBe(true)
    }
  })

  it('each example contains its base headword as a whole word (cloze/produce can blank it)', () => {
    for (const { m, ex } of ACADEMIC_EN) {
      const hit = new RegExp(`\\b${m}\\b`, 'i').test(ex)
      expect(hit, `example for "${m}" must contain the word: "${ex}"`).toBe(true)
    }
  })
})
