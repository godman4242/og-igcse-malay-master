// Feature #6 (retire/retie XP) — the XP tile's replacement metric.
// "Mastered" = cards in FSRS Review state with stability ≥ 21 days (the same
// threshold the app already calls "stable" — STILL_REMEMBER_DEFAULTS /
// RECALL_PROBE_DEFAULT stabilityDays). An informational competence signal
// instead of an abstract ever-growing number.

import { describe, it, expect } from 'vitest'
import { countMastered, State } from '../fsrs'

describe('countMastered', () => {
  it('counts Review-state cards at or above the 21-day stability threshold', () => {
    const cards = [
      { m: 'a', state: State.Review, stability: 30 },   // mastered
      { m: 'b', state: State.Review, stability: 21 },   // boundary — mastered
      { m: 'c', state: State.Review, stability: 5 },    // too fresh
      { m: 'd', state: State.Learning, stability: 40 }, // not graduated
      { m: 'e' },                                       // new card, no FSRS fields
    ]
    expect(countMastered(cards)).toBe(2)
  })

  it('accepts a custom threshold', () => {
    const cards = [{ m: 'a', state: State.Review, stability: 10 }]
    expect(countMastered(cards, 7)).toBe(1)
    expect(countMastered(cards, 21)).toBe(0)
  })

  it('returns 0 for empty or malformed input', () => {
    expect(countMastered([])).toBe(0)
    expect(countMastered(null)).toBe(0)
    expect(countMastered(undefined)).toBe(0)
  })
})
