// Validates the answer-leak detector against a labeled fixture and reports
// precision/recall — so a "0 leaks" claim can never secretly mean "blind
// detector" (spec §9). This test does NOT change detectAnswerLeak; it only
// measures it. The detector stays SOFT (flag-only) in v1 regardless of the
// numbers this prints.
import { describe, it, expect } from 'vitest'
import { detectAnswerLeak } from '../tutorContract'
import { LEAK_FIXTURE } from '../../../scripts/ai-tier-eval/leakFixture.mjs'

describe('leak detector against the labeled fixture', () => {
  it('fixture has both leak and no-leak, retrieval-context examples', () => {
    expect(LEAK_FIXTURE.some(x => x.leak)).toBe(true)
    expect(LEAK_FIXTURE.some(x => !x.leak)).toBe(true)
  })

  it('fixture includes at least one hard negative (legit Malay grammar explanation)', () => {
    // A hard negative legitimately contains an answer-shaped form (e.g. names
    // the imbuhan + example word) but is NOT a leak — it's explaining a rule,
    // not handing over the retrieval-mode answer.
    expect(LEAK_FIXTURE.some(x => !x.leak && /digunakan sebelum|contohnya/i.test(x.text))).toBe(true)
  })

  it('reports recall — and it must be > 0 so "0 leaks" is meaningful', () => {
    const pos = LEAK_FIXTURE.filter(x => x.leak)
    const caught = pos.filter(x => detectAnswerLeak(x.text, { mode: 'retrieval', attempted: false })).length
    const recall = caught / pos.length
    console.log(`[leak-detector] recall=${recall.toFixed(2)} on ${pos.length} positives`)
    expect(recall).toBeGreaterThan(0)
  })
})
