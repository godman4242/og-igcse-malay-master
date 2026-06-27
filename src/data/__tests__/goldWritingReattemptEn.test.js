// Well-formedness gate for the IMPROVEMENT-DETECTION gold set (Task 5).
//
// Runs in the UNIT gate (vitest include glob = src/**/__tests__/**), so it lives
// under src/. It imports the pure gold-data array from scripts/ (no Node resolver
// needed — the array has no imports) and `getTask` from the real catalogue, and
// asserts the gold set is structurally sound + weighted toward subtle cosmetic
// edits (the failure mode the eval exists to catch). The keyed eval RUN itself is
// manual (Task 5, owner's Gemini key).
import { describe, it, expect } from 'vitest'
import { GOLD_REATTEMPT_EN } from '../../../scripts/ai-tier-eval/goldWritingReattemptEn.mjs'
import { getTask } from '../writingTasks.js'

const LABELS = ['cosmeticEdit', 'realImprovement']

describe('goldWritingReattemptEn (improvement-detection gold set)', () => {
  it('has 10 pairs, each well-formed and pointing at a real task + requirement', () => {
    expect(GOLD_REATTEMPT_EN.length).toBe(10)
    const pairIds = new Set()
    for (const p of GOLD_REATTEMPT_EN) {
      const task = getTask(p.taskId)
      expect(task).not.toBe(null)                                // resolves to an authored task
      expect(LABELS).toContain(p.label)                          // label in enum
      expect(Number.isInteger(p.targetReq)).toBe(true)
      expect(p.targetReq).toBeGreaterThanOrEqual(0)
      expect(p.targetReq).toBeLessThan(task.requirements.length) // a real requirement index
      // before/after are full authored essays with stable ids
      for (const side of [p.before, p.after]) {
        expect(typeof side.id).toBe('string')
        expect(typeof side.text).toBe('string')
        expect(side.text.length).toBeGreaterThan(40)             // a genuine answer, not a stub
      }
      // The edit must actually change the text (a no-op is not a test case).
      expect(p.after.text).not.toBe(p.before.text)
      expect(pairIds.has(p.id)).toBe(false)                      // pair ids unique
      pairIds.add(p.id)
    }
  })

  it('is weighted toward subtle cosmetic edits (the over-praise trap): 6 cosmetic, 4 real', () => {
    const cosmetic = GOLD_REATTEMPT_EN.filter(p => p.label === 'cosmeticEdit').length
    const real = GOLD_REATTEMPT_EN.filter(p => p.label === 'realImprovement').length
    expect(cosmetic).toBe(6)
    expect(real).toBe(4)
    expect(cosmetic).toBeGreaterThan(GOLD_REATTEMPT_EN.length / 2)
  })

  it('every realImprovement shares its before essay with a cosmeticEdit on the same target (isolates the edit)', () => {
    // A real/cosmetic pair sharing a before + targetReq means the ONLY difference
    // the grader sees is the edit itself — so a divergent verdict is attributable
    // to the content change, not to two unrelated essays.
    const cosmeticKeys = new Set(
      GOLD_REATTEMPT_EN.filter(p => p.label === 'cosmeticEdit').map(p => `${p.before.id}:${p.targetReq}`),
    )
    for (const p of GOLD_REATTEMPT_EN.filter(p => p.label === 'realImprovement')) {
      expect(cosmeticKeys.has(`${p.before.id}:${p.targetReq}`)).toBe(true)
    }
  })
})
