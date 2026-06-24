// Pins the over-praise ship-gate math (score.mjs overPraiseRate). score.mjs is
// pure helpers with no imports, so it loads cleanly under vitest WITHOUT the Node
// extensionless resolver. An essay is flagged when ANY of its samples exceeds its
// expectedContentMax — that single-sample sensitivity is the whole robustness
// guarantee, so it is pinned here explicitly.
import { describe, it, expect } from 'vitest'
import { overPraiseRate } from '../../../scripts/ai-tier-eval/score.mjs'

describe('overPraiseRate', () => {
  it('flags an essay when ANY sample exceeds its ceiling, and leaves clean ones', () => {
    const results = [
      { id: 'clean-offtopic', expectedContentMax: 2, samples: [1, 2, 2] },      // within ceiling
      { id: 'over-offtopic', expectedContentMax: 2, samples: [2, 5, 2] },       // one sample over → flagged
      { id: 'clean-partial', expectedContentMax: 4, samples: [3, 4, 4] },       // within ceiling
      { id: 'clean-ontask', expectedContentMax: 6, samples: [5, 6, 6] },        // 6 is the ceiling, not over
    ]
    const { rate, flagged } = overPraiseRate(results)
    expect(flagged.map(r => r.id)).toEqual(['over-offtopic'])
    expect(rate).toBeCloseTo(1 / 4)
  })

  it('a fully clean set has rate 0 and no flags (the ship case)', () => {
    const results = [
      { id: 'a', expectedContentMax: 2, samples: [1, 2, 1] },
      { id: 'b', expectedContentMax: 4, samples: [4, 3, 4] },
      { id: 'c', expectedContentMax: 6, samples: [6, 6, 6] },
    ]
    const { rate, flagged } = overPraiseRate(results)
    expect(rate).toBe(0)
    expect(flagged).toEqual([])
  })

  it('does not divide by zero on an empty result set', () => {
    expect(overPraiseRate([]).rate).toBe(0)
  })
})
