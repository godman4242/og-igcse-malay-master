import { describe, it, expect } from 'vitest'
import { composeReadiness, READINESS_WEIGHTS } from '../examReadiness'

// composeReadiness is the single source of truth for the Exam Rehearsal
// composite %. The load-bearing guarantee: adding the optional `listeningPct`
// field must NOT change the score of attempts that predate the listening stage
// (they have no listeningPct) — present-component normalisation keeps the core
// three at the old 0.30/0.35/0.35 weights summing to 1.0.

const OLD = (a) => Math.round(
  (a.comprehensionPct || 0) * 0.3
  + ((a.writingBand || 0) / 6) * 100 * 0.35
  + ((a.speakingBand || 0) / 6) * 100 * 0.35
)

describe('composeReadiness', () => {
  it('is byte-identical to the pre-listening formula for a 3-skill attempt', () => {
    const a = { comprehensionPct: 80, writingBand: 4, speakingBand: 5 }
    expect(composeReadiness(a)).toBe(OLD(a)) // 77
    expect(composeReadiness(a)).toBe(77)
  })

  it('treats a missing listeningPct the same as a pre-listening attempt', () => {
    const a = { comprehensionPct: 50, writingBand: 3, speakingBand: 3, listeningPct: null }
    expect(composeReadiness(a)).toBe(OLD(a))
  })

  it('folds listening in via 1.30 normalisation when present', () => {
    // comp 80 / w4 / s5 → 76.5 core; + 60*0.30 = 94.5; /1.30 = 72.69 → 73
    const a = { comprehensionPct: 80, writingBand: 4, speakingBand: 5, listeningPct: 60 }
    expect(composeReadiness(a)).toBe(73)
  })

  it('distinguishes listeningPct:0 (present, drags score down) from absent', () => {
    const withZero = { comprehensionPct: 80, writingBand: 4, speakingBand: 5, listeningPct: 0 }
    const without = { comprehensionPct: 80, writingBand: 4, speakingBand: 5 }
    expect(composeReadiness(withZero)).toBe(59) // 76.5 / 1.30
    expect(composeReadiness(without)).toBe(77)
    expect(composeReadiness(withZero)).toBeLessThan(composeReadiness(without))
  })

  it('returns 0 for null / undefined / all-zero attempts', () => {
    expect(composeReadiness(null)).toBe(0)
    expect(composeReadiness(undefined)).toBe(0)
    expect(composeReadiness({ comprehensionPct: 0, writingBand: 0, speakingBand: 0 })).toBe(0)
  })

  it('exposes the four base weights', () => {
    expect(READINESS_WEIGHTS).toEqual({ comprehension: 0.30, writing: 0.35, speaking: 0.35, listening: 0.30 })
  })
})
