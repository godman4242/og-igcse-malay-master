// Unit suite for the Speaking Progression pure functions (band trend,
// recurring weakness, due-for-reattempt) + the weaknessFlags extractor.
// All pure — exhaustively testable with plain fixtures.
// Design: docs/superpowers/specs/2026-05-30-speaking-progression-design.md

import { describe, it, expect } from 'vitest'
import { weaknessFlags } from '../speakingGrader.js'
import { speakingBandSeries, recurringSpeakingWeakness } from '../patterns.js'

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

// Build a speaking record. `ts` is an ISO string; oldest-to-newest ordering
// is by ts. `weak` omitted unless provided (old-format records lack it).
// (Function declaration — hoisted, so later describe blocks may use it too.)
function rec({ ts, band, topicId = 'hobby', lang = 'malay', weak, durationSec = 80, wordCount = 100 }) {
  return { id: ts, ts, band, topicId, durationSec, wordCount, lang, ...(weak ? { weak } : {}) }
}

describe('speakingBandSeries', () => {
  it('orders oldest→newest and computes first/last/delta/best/avg/count', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3 }),
      rec({ ts: '2026-05-22T10:00:00Z', band: 4 }),
      rec({ ts: '2026-05-24T10:00:00Z', band: 5 }),
    ]
    const s = speakingBandSeries(history, { lang: 'malay' })
    expect(s.bands).toEqual([3, 4, 5])
    expect(s.first).toBe(3)
    expect(s.last).toBe(5)
    expect(s.delta).toBe(2)
    expect(s.best).toBe(5)
    expect(s.avg).toBe(4)
    expect(s.count).toBe(3)
  })

  it('rounds avg to 1 decimal place', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3 }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 4 }),
      rec({ ts: '2026-05-22T10:00:00Z', band: 4 }),
    ]
    expect(speakingBandSeries(history, { lang: 'malay' }).avg).toBe(3.7)
  })

  it('scopes to the requested language (eng vs malay)', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 2, lang: 'malay' }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 6, lang: 'eng' }),
    ]
    expect(speakingBandSeries(history, { lang: 'eng' }).bands).toEqual([6])
    expect(speakingBandSeries(history, { lang: 'malay' }).bands).toEqual([2])
  })

  it('keeps only the last n attempts', () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      rec({ ts: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`, band: 3 }))
    expect(speakingBandSeries(history, { lang: 'malay', n: 8 }).count).toBe(8)
  })

  it('returns a safe empty shape for no scoped attempts', () => {
    const s = speakingBandSeries([], { lang: 'malay' })
    expect(s).toEqual({ lang: 'malay', bands: [], first: null, last: null, delta: 0, best: null, avg: null, count: 0 })
  })
})

describe('recurringSpeakingWeakness', () => {
  it('picks the most frequent weak category across recent attempts', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3, weak: ['fewMarkers', 'fillerHeavy'] }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 3, weak: ['fewMarkers'] }),
      rec({ ts: '2026-05-22T10:00:00Z', band: 4, weak: ['weakVocab'] }),
    ]
    const r = recurringSpeakingWeakness(history, { lang: 'malay' })
    expect(r.tallied).toBe(3)
    expect(r.flagTotal).toBe(4)
    expect(r.top[0]).toEqual({ category: 'fewMarkers', count: 2 })
  })

  it('counts clean attempts toward tallied with flagTotal 0 (balanced state)', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 6, weak: [] }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 6, weak: [] }),
    ]
    const r = recurringSpeakingWeakness(history, { lang: 'malay' })
    expect(r.tallied).toBe(2)
    expect(r.flagTotal).toBe(0)
    expect(r.top).toEqual([])
  })

  it('ignores old-format records that have no weak array', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3 }), // no weak
      rec({ ts: '2026-05-21T10:00:00Z', band: 3, weak: ['repetitive'] }),
    ]
    const r = recurringSpeakingWeakness(history, { lang: 'malay' })
    expect(r.tallied).toBe(1)
    expect(r.top[0].category).toBe('repetitive')
  })

  it('scopes by language', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3, lang: 'eng', weak: ['tooShort'] }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 3, lang: 'malay', weak: ['fewMarkers'] }),
    ]
    expect(recurringSpeakingWeakness(history, { lang: 'eng' }).top[0].category).toBe('tooShort')
  })

  it('respects the window cap (newest first)', () => {
    const history = Array.from({ length: 15 }, (_, i) =>
      rec({ ts: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`, band: 3, weak: ['fewMarkers'] }))
    expect(recurringSpeakingWeakness(history, { lang: 'malay', window: 12 }).tallied).toBe(12)
  })
})
