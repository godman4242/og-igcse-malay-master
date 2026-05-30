// Unit suite for the Speaking Progression pure functions (band trend,
// recurring weakness, due-for-reattempt) + the weaknessFlags extractor.
// All pure — exhaustively testable with plain fixtures.
// Design: docs/superpowers/specs/2026-05-30-speaking-progression-design.md

import { describe, it, expect } from 'vitest'
import { weaknessFlags } from '../speakingGrader.js'

// A "clean" band-6-shaped heuristic result: nothing should flag.
const cleanH = {
  durationSec: 90, wordsPerSec: 2.0, markerCount: 3, formalCount: 3,
  uniqueWordRatio: 0.6, fillerCount: 1, wordCount: 120, cuesHit: 4, cuesTotal: 4,
}
const topic = { expectedDurationSec: 90 }

describe('weaknessFlags', () => {
  it('returns [] for a clean, well-rounded attempt', () => {
    expect(weaknessFlags(cleanH, topic)).toEqual([])
  })

  it('flags tooShort when duration is under 70% of expected', () => {
    expect(weaknessFlags({ ...cleanH, durationSec: 50 }, topic)).toContain('tooShort')
  })

  it('flags disfluent for too-slow and too-fast pace', () => {
    expect(weaknessFlags({ ...cleanH, wordsPerSec: 1.0 }, topic)).toContain('disfluent')
    expect(weaknessFlags({ ...cleanH, wordsPerSec: 3.5 }, topic)).toContain('disfluent')
  })

  it('flags fewMarkers, weakVocab, repetitive on low signals', () => {
    const flags = weaknessFlags(
      { ...cleanH, markerCount: 1, formalCount: 1, uniqueWordRatio: 0.3 }, topic)
    expect(flags).toEqual(expect.arrayContaining(['fewMarkers', 'weakVocab', 'repetitive']))
  })

  it('flags fillerHeavy when fillers exceed max(3, 4% of words)', () => {
    expect(weaknessFlags({ ...cleanH, fillerCount: 10, wordCount: 100 }, topic)).toContain('fillerHeavy')
  })

  it('flags missedCues when under 75% of cues addressed', () => {
    expect(weaknessFlags({ ...cleanH, cuesHit: 1, cuesTotal: 4 }, topic)).toContain('missedCues')
  })

  it('uses a 75s default expected duration when topic is missing', () => {
    // 50s < 75*0.7=52.5 -> tooShort; passing no topic must not throw.
    expect(weaknessFlags({ ...cleanH, durationSec: 50 }, undefined)).toContain('tooShort')
  })

  it('returns [] when the heuristic result is null/undefined', () => {
    expect(weaknessFlags(null, topic)).toEqual([])
  })
})
