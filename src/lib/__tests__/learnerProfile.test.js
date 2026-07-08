import { describe, it, expect } from 'vitest'
import { buildLearnerProfile } from '../learnerProfile.js'
import { toLocalISO } from '../localDay.js'

const DAY = 86400000
const now = Date.now()

const emptyStore = () => ({
  mistakes: [],
  confidenceLog: [],
  writingHistory: [],
  studyHistory: {},
})

// studyHistory keys are LOCAL day keys (matches learnerProfile.js + useStore).
const isoDate = (offsetDays) => toLocalISO(new Date(now - offsetDays * DAY))

const isoTs = (offsetDays) =>
  new Date(now - offsetDays * DAY).toISOString()

describe('buildLearnerProfile — base shape', () => {
  it('returns medium for an empty store with no premature scaffolding', () => {
    const p = buildLearnerProfile(emptyStore(), { lang: 'ms' })
    expect(p.scaffoldLevel).toBe('medium')
    expect(p.focusTopics).toEqual([])
    expect(p.recentStrengths).toEqual([])
    expect(p.signals.writingBandRolling).toBeNull()
    expect(p.signals.fsrsLapseRate7d).toBe(0)
    expect(p.signals.confusionHits14d).toBe(0)
    expect(p.signals.severityEscalations7d).toBe(0)
  })

  it('keeps profile JSON under the 500-character budget', () => {
    const store = {
      ...emptyStore(),
      mistakes: Array.from({ length: 20 }).map((_, i) => ({
        id: `m${i}`, category: 'imbuhan', severity: 'high', language: 'ms',
        word: 'kerja', surface: 'mengerja', timestamp: now - i * DAY,
      })),
      confidenceLog: Array.from({ length: 30 }).map((_, i) => ({
        word: 'kerja', level: 3, correct: true, ts: now - i * DAY, mode: 'fc',
      })),
      writingHistory: [{ ts: isoTs(1), lang: 'malay', format: 'narrative', band: 5, words: 200 }],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(JSON.stringify(p).length).toBeLessThanOrEqual(500)
  })
})

describe('buildLearnerProfile — scaffold thresholds', () => {
  it('returns heavy when rolling writing band is below 3', () => {
    const store = {
      ...emptyStore(),
      writingHistory: [
        { ts: isoTs(1), lang: 'malay', band: 2, format: 'narrative' },
        { ts: isoTs(2), lang: 'malay', band: 3, format: 'article' },
        { ts: isoTs(3), lang: 'malay', band: 2, format: 'narrative' },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.scaffoldLevel).toBe('heavy')
    expect(p.signals.writingBandRolling).toBeCloseTo(2.33, 1)
  })

  it('returns heavy when FSRS lapse rate (study mistakes / total reviews) exceeds 0.4', () => {
    const store = {
      ...emptyStore(),
      studyHistory: {
        [isoDate(1)]: { reviews: 10, minutes: 5 },
      },
      mistakes: Array.from({ length: 5 }).map((_, i) => ({
        id: `m${i}`, category: 'vocab', severity: 'low', source: 'study', language: 'ms',
        word: `w${i}`, attempts: 1, timestamp: now - DAY,
      })),
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.signals.fsrsLapseRate7d).toBeCloseTo(0.5, 1)
    expect(p.scaffoldLevel).toBe('heavy')
  })

  it('returns heavy when 3 or more mistakes escalated severity this week', () => {
    const store = {
      ...emptyStore(),
      mistakes: [
        { id: 'a', category: 'imbuhan', severity: 'high', attempts: 5, language: 'ms', timestamp: now - DAY },
        { id: 'b', category: 'imbuhan', severity: 'med',  attempts: 3, language: 'ms', timestamp: now - 2 * DAY },
        { id: 'c', category: 'vocab',   severity: 'med',  attempts: 3, language: 'ms', timestamp: now - 3 * DAY },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.signals.severityEscalations7d).toBe(3)
    expect(p.scaffoldLevel).toBe('heavy')
  })

  it('returns light when band ≥ 5, lapse rate < 0.15, no escalations', () => {
    const store = {
      ...emptyStore(),
      writingHistory: [
        { ts: isoTs(1), lang: 'malay', band: 5, format: 'narrative' },
        { ts: isoTs(2), lang: 'malay', band: 6, format: 'article' },
        { ts: isoTs(3), lang: 'malay', band: 5, format: 'narrative' },
      ],
      studyHistory: { [isoDate(1)]: { reviews: 100, minutes: 30 } },
      mistakes: [], // no escalations, no study lapses
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.scaffoldLevel).toBe('light')
  })

  it('returns medium when between heavy and light boundaries', () => {
    const store = {
      ...emptyStore(),
      writingHistory: [
        { ts: isoTs(1), lang: 'malay', band: 4, format: 'narrative' },
      ],
      studyHistory: { [isoDate(1)]: { reviews: 10, minutes: 5 } },
      mistakes: [
        { id: 'a', category: 'vocab', severity: 'low', source: 'study', attempts: 2, language: 'ms', timestamp: now - DAY },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.scaffoldLevel).toBe('medium')
  })
})

describe('buildLearnerProfile — lang filtering', () => {
  it('maps lang ms to malay when reading writingHistory', () => {
    const store = {
      ...emptyStore(),
      writingHistory: [
        { ts: isoTs(1), lang: 'malay', band: 2, format: 'narrative' },
        { ts: isoTs(1), lang: 'eng',   band: 6, format: 'article' },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.signals.writingBandRolling).toBe(2)
    expect(p.scaffoldLevel).toBe('heavy')
  })

  it('maps lang en to eng when reading writingHistory', () => {
    const store = {
      ...emptyStore(),
      writingHistory: [
        { ts: isoTs(1), lang: 'malay', band: 2, format: 'narrative' },
        { ts: isoTs(1), lang: 'eng',   band: 6, format: 'article' },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'en' })
    expect(p.signals.writingBandRolling).toBe(6)
    expect(p.scaffoldLevel).toBe('light')
  })
})

describe('buildLearnerProfile — focusTopics', () => {
  it('returns empty when no mistakes — never invents struggle', () => {
    const p = buildLearnerProfile(emptyStore(), { lang: 'ms' })
    expect(p.focusTopics).toEqual([])
  })

  it('weights by severity (4× high) and recency (2× last 3 days)', () => {
    const store = {
      ...emptyStore(),
      mistakes: [
        // imbuhan, high severity, recent → weight 4 × 2 = 8
        { id: 'a', category: 'imbuhan', severity: 'high', language: 'ms', word: 'kerja', surface: 'mengerja', timestamp: now - DAY },
        // vocab, low, recent → 1 × 2 = 2
        { id: 'b', category: 'vocab', severity: 'low', language: 'ms', word: 'pokok', timestamp: now - DAY },
        // tense, medium, older → 2 × 1 = 2
        { id: 'c', category: 'tense', severity: 'med', language: 'ms', word: 'sudah', timestamp: now - 10 * DAY },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.focusTopics[0]).toMatch(/^imbuhan/)
    expect(p.focusTopics.length).toBeLessThanOrEqual(3)
  })

  it('emits imbuhan:meN- when the surface form starts with a meN- prefix', () => {
    const store = {
      ...emptyStore(),
      mistakes: [
        { id: 'a', category: 'imbuhan', severity: 'high', language: 'ms', word: 'pukul', surface: 'memukul', timestamp: now - DAY },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.focusTopics).toContain('imbuhan:meN-')
  })

  it('caps focusTopics at 3 entries', () => {
    const store = {
      ...emptyStore(),
      mistakes: ['vocab', 'imbuhan', 'tense', 'spelling', 'cohesion'].map((cat, i) => ({
        id: `m${i}`, category: cat, severity: 'high', language: 'ms', word: `w${i}`, timestamp: now - DAY,
      })),
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.focusTopics.length).toBeLessThanOrEqual(3)
  })

  it('ignores mistakes older than 14 days', () => {
    const store = {
      ...emptyStore(),
      mistakes: [
        { id: 'a', category: 'imbuhan', severity: 'high', language: 'ms', word: 'kerja', timestamp: now - 20 * DAY },
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.focusTopics).toEqual([])
  })

  it('honours the injected `now` for its recency window (no wall-clock drift)', () => {
    // A mistake pinned at a FIXED wall-clock instant, far in the "past" of real
    // Date.now(). It must still count when `now` is injected next to it — the
    // window must follow the injected clock, not real time. (Regression: the
    // For-You weak-spots panel drifted with wall-clock and its pin test
    // time-bombed 14 days after the fixture date — see competenceSnapshot.)
    const pinnedNow = new Date('2026-06-24T12:00:00').getTime()
    const store = {
      ...emptyStore(),
      mistakes: [
        { id: 'a', category: 'vocab', severity: 'high', language: 'ms', word: 'pokok', timestamp: pinnedNow - DAY },
      ],
    }
    expect(buildLearnerProfile(store, { lang: 'ms' }, pinnedNow).focusTopics).toContain('vocab')
    // Same mistake, but the clock advanced 20 days → outside the 14-day window.
    expect(buildLearnerProfile(store, { lang: 'ms' }, pinnedNow + 20 * DAY).focusTopics).toEqual([])
  })
})

describe('buildLearnerProfile — recentStrengths', () => {
  it('returns empty for new users — never invents praise', () => {
    const p = buildLearnerProfile(emptyStore(), { lang: 'ms' })
    expect(p.recentStrengths).toEqual([])
  })

  it('emits a mode as a strength only when ≥5 correct AND 0 wrong in last 14d', () => {
    const store = {
      ...emptyStore(),
      confidenceLog: [
        ...Array.from({ length: 6 }).map((_, i) => ({
          word: `w${i}`, level: 3, correct: true, ts: now - i * DAY, mode: 'fc',
        })),
        // quiz mode has a wrong answer → disqualified
        ...Array.from({ length: 6 }).map((_, i) => ({
          word: `q${i}`, level: 3, correct: i !== 0, ts: now - i * DAY, mode: 'quiz',
        })),
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.recentStrengths.length).toBe(1)
    expect(p.recentStrengths[0]).toMatch(/flash/i)
  })

  it('caps recentStrengths at 2 entries', () => {
    const store = {
      ...emptyStore(),
      confidenceLog: [
        ...Array.from({ length: 6 }).map((_, i) => ({ word: `w${i}`, level: 3, correct: true, ts: now - DAY, mode: 'fc' })),
        ...Array.from({ length: 6 }).map((_, i) => ({ word: `s${i}`, level: 3, correct: true, ts: now - DAY, mode: 'speak' })),
        ...Array.from({ length: 6 }).map((_, i) => ({ word: `l${i}`, level: 3, correct: true, ts: now - DAY, mode: 'listen' })),
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.recentStrengths.length).toBeLessThanOrEqual(2)
  })
})

describe('buildLearnerProfile — confusionHits14d', () => {
  it('counts confidenceLog entries where level==3 (certain) AND correct==false within 14 days', () => {
    const store = {
      ...emptyStore(),
      confidenceLog: [
        { word: 'a', level: 3, correct: false, ts: now - DAY, mode: 'fc' },     // counts
        { word: 'b', level: 3, correct: true,  ts: now - DAY, mode: 'fc' },     // skip (correct)
        { word: 'c', level: 1, correct: false, ts: now - DAY, mode: 'fc' },     // skip (level 1, not confident)
        { word: 'd', level: 3, correct: false, ts: now - 20 * DAY, mode: 'fc' }, // skip (>14d)
      ],
    }
    const p = buildLearnerProfile(store, { lang: 'ms' })
    expect(p.signals.confusionHits14d).toBe(1)
  })
})

describe('buildLearnerProfile — defensive inputs', () => {
  it('treats a missing store object as empty without throwing', () => {
    const p = buildLearnerProfile(null, { lang: 'ms' })
    expect(p.scaffoldLevel).toBe('medium')
  })

  it('treats invalid lang as ms', () => {
    const store = {
      ...emptyStore(),
      writingHistory: [{ ts: isoTs(1), lang: 'malay', band: 2, format: 'narrative' }],
    }
    const p = buildLearnerProfile(store, {})
    expect(p.signals.writingBandRolling).toBe(2)
  })
})
