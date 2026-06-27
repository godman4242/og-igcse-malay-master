// Pins the improvement-detection scoring math (score.mjs reattemptVerdict +
// reattemptSummary) — the SHIP GATE for the act-on-feedback re-attempt loop.
// score.mjs is pure helpers with no imports, so it loads cleanly under vitest
// WITHOUT the Node extensionless resolver.
//
// The load-bearing rule: a cosmeticEdit that the grader scores UP (band rise or a
// ✗→✓ flip on the missed requirement) is OVER-PRAISE; a realImprovement that the
// grader scores up is correct DETECTION. The verdict uses the MEDIAN band + the
// MAJORITY coverage across N samples so a single flaky sample can't decide it.
import { describe, it, expect } from 'vitest'
import { reattemptVerdict, reattemptSummary } from '../../../scripts/ai-tier-eval/score.mjs'

const COSMETIC = { id: 'c1', label: 'cosmeticEdit', taskId: 't', targetReq: 2 }
const REAL = { id: 'r1', label: 'realImprovement', taskId: 't', targetReq: 2 }

describe('reattemptVerdict', () => {
  it('looksImproved=false when band + coverage are unchanged (the cosmetic ideal)', () => {
    const before = { bands: [3, 3, 3], coverages: [{ req_2: false }, { req_2: false }, { req_2: false }] }
    const after = { bands: [3, 3, 3], coverages: [{ req_2: false }, { req_2: false }, { req_2: false }] }
    const v = reattemptVerdict(COSMETIC, before, after)
    expect(v.bandRose).toBe(false)
    expect(v.flipToMet).toBe(false)
    expect(v.looksImproved).toBe(false)
  })

  it('looksImproved=true on a median band rise', () => {
    const before = { bands: [2, 2, 3], coverages: [{ req_2: false }] }
    const after = { bands: [4, 4, 3], coverages: [{ req_2: false }] }
    const v = reattemptVerdict(REAL, before, after)
    expect(v.bandBefore).toBe(2); expect(v.bandAfter).toBe(4)
    expect(v.bandRose).toBe(true); expect(v.looksImproved).toBe(true)
  })

  it('looksImproved=true on a majority ✗→✓ flip even with an unchanged band', () => {
    const before = { bands: [3, 3, 3], coverages: [{ req_2: false }, { req_2: false }, { req_2: false }] }
    const after = { bands: [3, 3, 3], coverages: [{ req_2: true }, { req_2: true }, { req_2: false }] }
    const v = reattemptVerdict(REAL, before, after)
    expect(v.metBefore).toBe(false); expect(v.metAfter).toBe(true)
    expect(v.flipToMet).toBe(true); expect(v.looksImproved).toBe(true)
  })

  it('a single flaky high sample does NOT trip the median (robustness)', () => {
    const before = { bands: [2, 2, 2], coverages: [{ req_2: false }] }
    const after = { bands: [2, 2, 6], coverages: [{ req_2: false }] } // one outlier
    const v = reattemptVerdict(COSMETIC, before, after)
    expect(v.bandAfter).toBe(2) // median ignores the 6
    expect(v.looksImproved).toBe(false)
  })

  it('a single flaky ✓ sample does NOT trip the majority flip', () => {
    const before = { bands: [3], coverages: [{ req_2: false }, { req_2: false }, { req_2: false }] }
    const after = { bands: [3], coverages: [{ req_2: true }, { req_2: false }, { req_2: false }] } // 1/3 met
    const v = reattemptVerdict(COSMETIC, before, after)
    expect(v.metAfter).toBe(false)
    expect(v.flipToMet).toBe(false); expect(v.looksImproved).toBe(false)
  })

  it('null bands (all parse-missed) yield no false improvement', () => {
    const v = reattemptVerdict(COSMETIC, { bands: [], coverages: [] }, { bands: [], coverages: [] })
    expect(v.bandBefore).toBeNull(); expect(v.bandAfter).toBeNull()
    expect(v.looksImproved).toBe(false)
  })
})

describe('reattemptSummary', () => {
  it('counts cosmetic over-praise and real recall separately', () => {
    const verdicts = [
      { id: 'c1', label: 'cosmeticEdit', looksImproved: false },
      { id: 'c2', label: 'cosmeticEdit', looksImproved: true },  // over-praise
      { id: 'c3', label: 'cosmeticEdit', looksImproved: false },
      { id: 'r1', label: 'realImprovement', looksImproved: true }, // detected
      { id: 'r2', label: 'realImprovement', looksImproved: false }, // missed
    ]
    const s = reattemptSummary(verdicts)
    expect(s.cosmeticTotal).toBe(3)
    expect(s.overPraised).toBe(1)
    expect(s.overPraisedIds).toEqual(['c2'])
    expect(s.realTotal).toBe(2)
    expect(s.realDetected).toBe(1)
    expect(s.realRecall).toBeCloseTo(0.5)
    expect(s.missedRealIds).toEqual(['r2'])
  })

  it('a perfect run = 0 over-praise, full real recall (the ship case)', () => {
    const verdicts = [
      { id: 'c1', label: 'cosmeticEdit', looksImproved: false },
      { id: 'c2', label: 'cosmeticEdit', looksImproved: false },
      { id: 'r1', label: 'realImprovement', looksImproved: true },
    ]
    const s = reattemptSummary(verdicts)
    expect(s.overPraised).toBe(0)
    expect(s.overPraiseRate).toBe(0)
    expect(s.realRecall).toBe(1)
  })
})
