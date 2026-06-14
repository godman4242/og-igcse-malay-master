// Behaviour-preserving coverage for src/lib/patterns.js — the mistake-clustering +
// performance-trend aggregations behind the Dashboard widgets. Eight exported pure functions:
//   - clusterMistakes(mistakes):            group unreviewed grammar mistakes by drill-ID pattern
//   - weakestWritingFormats(history, n):     aggregateByKey('format') — weakest avg band first
//   - weakestSpeakingTopics(history, n):     union topicId|scenarioId|topic, then aggregateByKey
//   - worstSpeakingSession(history):         lowest band, 30-day window, newer-ts tiebreak  [Date.now]
//   - rollingActivity(w, s, study, days):    daily sparkline series w/ carry-forward            [new Date]
//   - speakingBandSeries(history, opts):     last-N bands + headline summary, language-scoped
//   - recurringSpeakingWeakness(history, o): tally record.weak flags over a window, language-scoped
//   - topicsDueForReattempt(history, now, o): weak/stale topics worth another go               [now injected]
//
// Strings/numbers OWNED BY patterns.js (pattern→description map, synthesized shapes, averages) are
// asserted as hand-typed literals (or distinctive ASCII substrings for the em-dash descriptions) so a
// regression actually fails. The two clock-reading fns use fake timers; topicsDueForReattempt takes
// `now` as a param (callers pass Date.now()) so it gets an injected epoch. Day-keyed fns use LOCAL day
// fields (toLocalISO / setHours) — test timestamps are built with the LOCAL `new Date(y,m,d,…)`
// constructor so day-keys are deterministic regardless of the runner's timezone.
// patterns.js is byte-identical: this adds tests only.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clusterMistakes,
  weakestWritingFormats,
  weakestSpeakingTopics,
  worstSpeakingSession,
  rollingActivity,
  speakingBandSeries,
  recurringSpeakingWeakness,
  topicsDueForReattempt,
} from '../patterns'

const DAY = 86400000

// A grammar mistake record as clusterMistakes reads it (m.word = drill ID).
const gm = (word, extra = {}) => ({ type: 'grammar', reviewed: false, word, ...extra })

describe('clusterMistakes', () => {
  it('keeps only unreviewed grammar mistakes, and only patterns with 2+ mistakes', () => {
    const out = clusterMistakes([
      gm('tense-ali-makan'),
      gm('tense-siti-pergi'), // tense-markers → count 2 → surfaces
      gm('passive-ibu-masak'), // passive-voice → count 1 → dropped (< 2)
      gm('tense-x', { reviewed: true }), // reviewed → excluded
      { type: 'vocab', reviewed: false, word: 'tense-y' }, // not grammar → excluded
    ])
    expect(out).toHaveLength(1)
    expect(out[0].pattern).toBe('tense-markers')
    expect(out[0].count).toBe(2)
    expect(out[0].drillIds).toEqual(['tense-ali-makan', 'tense-siti-pergi'])
  })

  it('sorts clusters by count desc and de-dupes drillIds (repeat of same drill still counts)', () => {
    const out = clusterMistakes([
      // meN-PTKS-drop: 3 distinct drills → count 3
      gm('prefix-meN-tulis'),
      gm('prefix-meN-pukul'),
      gm('prefix-meN-kira'),
      // ber-prefix: the SAME drill twice → count 2, drillIds length 1 (dedup)
      gm('prefix-ber-lari'),
      gm('prefix-ber-lari'),
    ])
    expect(out.map(c => c.pattern)).toEqual(['meN-PTKS-drop', 'ber-prefix']) // 3 before 2
    expect(out[0].count).toBe(3)
    expect(out[1].count).toBe(2)
    expect(out[1].drillIds).toEqual(['prefix-ber-lari']) // de-duped to one
  })

  it('classifies every drill-ID prefix into the right pattern + description', () => {
    // [drillId, expectedPattern, distinctive ASCII substring of the description]
    const table = [
      ['prefix-meN-pukul', 'meN-PTKS-drop', 'these consonants DROP'], // p ∈ PTKS
      ['prefix-meN-makan', 'meN-standard', 'the consonant stays'], // m ∉ PTKS
      ['prefix-ber-jalan', 'ber-prefix', 'belajar/bekerja exceptions'],
      ['prefix-peN-tulis', 'peN-prefix', 'doer nouns'],
      ['passive-ibu-masak', 'passive-voice', 'dropped consonants return'],
      ['suffix-kan-bersih', 'suffix-kan', 'indicates action on an object'],
      ['suffix-kean-adil', 'suffix-ke-an', 'creates abstract nouns'],
      ['suffix-an-makan', 'suffix-an', 'creates result nouns'],
      ['suffix-peNan-didik', 'suffix-peN-an', 'creates process nouns'],
      ['tense-ali-makan', 'tense-markers', 'sudah/sedang/akan/belum'],
      ['error-3', 'error-identification', 'Identifying imbuhan errors'],
      ['transform-5', 'sentence-transform', 'Sentence transformation exercises'],
    ]
    for (const [id, pattern, descPart] of table) {
      // feed the SAME drill twice so the cluster clears the count >= 2 gate
      const out = clusterMistakes([gm(id), gm(id)])
      expect(out, `for ${id}`).toHaveLength(1)
      expect(out[0].pattern, `pattern for ${id}`).toBe(pattern)
      expect(out[0].description, `description for ${id}`).toContain(descPart)
    }
  })

  it('falls back to the "other" pattern (description === "other") for an unrecognised drill ID', () => {
    const out = clusterMistakes([gm('random-thing-a'), gm('random-thing-b')])
    expect(out[0].pattern).toBe('other')
    expect(out[0].description).toBe('other') // no PATTERN_DESCRIPTIONS entry → pattern string itself
  })

  it('returns [] when there are no qualifying grammar mistakes', () => {
    expect(clusterMistakes([])).toEqual([])
    expect(clusterMistakes([gm('tense-x', { reviewed: true })])).toEqual([])
  })
})

describe('weakestWritingFormats (aggregateByKey on format)', () => {
  const wh = [
    { format: 'email', band: 6, ts: '2026-06-01' },
    { format: 'email', band: 4, ts: '2026-06-05' }, // email: 2 attempts, avg 5, last = later-ts band 4
    { format: 'report', band: 3, ts: '2026-06-02' },
    { format: 'report', band: 3, ts: '2026-06-06' }, // report: 2 attempts, avg 3
    { format: 'review', band: 2, ts: '2026-06-03' }, // review: 1 attempt → excluded (minAttempts 2)
  ]

  it('excludes formats with < 2 attempts and sorts weakest (lowest avg) first', () => {
    const out = weakestWritingFormats(wh)
    expect(out.map(g => g.key)).toEqual(['report', 'email']) // 3 < 5, review dropped
    expect(out[0]).toMatchObject({ key: 'report', avg: 3, last: 3, total: 2 })
    expect(out[1]).toMatchObject({ key: 'email', avg: 5, last: 4, total: 2 }) // last = most-recent-ts band
  })

  it('respects the limit and ignores non-number bands; null/undefined history → []', () => {
    expect(weakestWritingFormats(wh, 1)).toHaveLength(1)
    expect(weakestWritingFormats(wh, 1)[0].key).toBe('report')
    // a non-number band does not count toward the group total
    const withJunk = [...wh, { format: 'report', band: 'x', ts: '2026-06-07' }]
    expect(weakestWritingFormats(withJunk).find(g => g.key === 'report').total).toBe(2)
    expect(weakestWritingFormats(null)).toEqual([])
    expect(weakestWritingFormats(undefined)).toEqual([])
  })
})

describe('weakestSpeakingTopics (unions topicId | scenarioId | topic)', () => {
  it('aggregates topicId and scenarioId under the same topic key, drops untagged entries', () => {
    const sh = [
      { topicId: 'food', band: 3, ts: '2026-06-01' },
      { scenarioId: 'food', band: 5, ts: '2026-06-02' }, // unioned into 'food' → 2 attempts, avg 4
      { topic: 'travel', band: 2, ts: '2026-06-03' },
      { topicId: 'travel', band: 4, ts: '2026-06-05' }, // travel → 2 attempts, avg 3
      { band: 4, ts: '2026-06-04' }, // no topic id at all → filtered out
    ]
    const out = weakestSpeakingTopics(sh)
    expect(out.map(g => g.key)).toEqual(['travel', 'food']) // avg 3 before avg 4
    expect(out.find(g => g.key === 'food').total).toBe(2) // proves the topicId/scenarioId union
    expect(out.find(g => g.key === 'food').avg).toBe(4)
  })
})

describe('worstSpeakingSession (Date.now, 30-day window)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const NOW = new Date(2026, 5, 14, 12, 0, 0).getTime() // local 2026-06-14 noon
  const setNow = () => vi.setSystemTime(NOW)
  const ago = days => NOW - days * DAY

  it('returns null with fewer than 2 scorable sessions', () => {
    setNow()
    expect(worstSpeakingSession([])).toBe(null)
    expect(worstSpeakingSession([{ topicId: 'a', band: 3, ts: ago(1) }])).toBe(null)
    // one valid + one missing band → still < 2 scorable
    expect(worstSpeakingSession([
      { topicId: 'a', band: 3, ts: ago(1) },
      { topicId: 'b', ts: ago(2) },
    ])).toBe(null)
  })

  it('picks the lowest band, breaking ties toward the newer session', () => {
    setNow()
    const lowest = worstSpeakingSession([
      { topicId: 'a', band: 5, ts: ago(1) },
      { topicId: 'b', band: 3, ts: ago(2) },
    ])
    expect(lowest.topicId).toBe('b') // band 3 < 5

    const tie = worstSpeakingSession([
      { topicId: 'old', band: 3, ts: ago(3) },
      { topicId: 'new', band: 3, ts: ago(1) },
    ])
    expect(tie.topicId).toBe('new') // equal band → newer ts wins
  })

  it('ignores sessions older than 30 days when 2+ recent ones exist', () => {
    setNow()
    const out = worstSpeakingSession([
      { topicId: 'ancient', band: 1, ts: ago(40) }, // out of window
      { topicId: 'r1', band: 4, ts: ago(2) },
      { topicId: 'r2', band: 5, ts: ago(1) },
    ])
    expect(out.topicId).toBe('r1') // band 4 (the ancient band-1 is excluded)
  })

  it('falls back to all sessions when fewer than 2 are recent', () => {
    setNow()
    const out = worstSpeakingSession([
      { topicId: 'ancient', band: 1, ts: ago(40) },
      { topicId: 'recent', band: 4, ts: ago(2) },
    ])
    expect(out.topicId).toBe('ancient') // only 1 recent → pool = all → band 1 wins
  })
})

describe('rollingActivity (new Date today, local day keys)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('builds one oldest-first entry per day with averaging, carry-forward and zero-filled reviews', () => {
    vi.setSystemTime(new Date(2026, 5, 14, 12, 0, 0)) // local 2026-06-14 → window: 06-12, 06-13, 06-14
    const writing = [
      { band: 4, ts: new Date(2026, 5, 12, 9, 0, 0).getTime() },
      { band: 6, ts: new Date(2026, 5, 12, 15, 0, 0).getTime() }, // same day → averaged to 5
    ]
    const speaking = [{ band: 4, ts: new Date(2026, 5, 13, 10, 0, 0).getTime() }]
    const study = { '2026-06-14': { reviews: 7 } }

    const out = rollingActivity(writing, speaking, study, 3)
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ day: '2026-06-12', writingBand: 5, speakingBand: null, reviews: 0 })
    expect(out[1]).toEqual({ day: '2026-06-13', writingBand: 5, speakingBand: 4, reviews: 0 }) // writing carried
    expect(out[2]).toEqual({ day: '2026-06-14', writingBand: 5, speakingBand: 4, reviews: 7 }) // both carried + reviews
  })

  it('returns all-null bands and zero reviews when there is no data', () => {
    vi.setSystemTime(new Date(2026, 5, 14, 12, 0, 0))
    const out = rollingActivity([], [], {}, 2)
    expect(out).toHaveLength(2)
    expect(out.every(d => d.writingBand === null && d.speakingBand === null && d.reviews === 0)).toBe(true)
    expect(out[1].day).toBe('2026-06-14') // newest is last
  })
})

describe('speakingBandSeries (language-scoped, last-N + summary)', () => {
  it('returns a safe empty shape when no attempts are scoped', () => {
    expect(speakingBandSeries([], { lang: 'ms' })).toEqual({
      lang: 'ms', bands: [], first: null, last: null, delta: 0, best: null, avg: null, count: 0,
    })
  })

  it('scopes by language (en/eng vs ms/undefined) and summarises oldest→newest', () => {
    const sh = [
      { band: 3, ts: '2026-06-01', lang: 'en' },
      { band: 5, ts: '2026-06-02', lang: 'eng' }, // eng counts as English
      { band: 2, ts: '2026-06-03', lang: 'ms' },
      { band: 4, ts: '2026-06-04' }, // undefined lang → Malay bucket
    ]
    const en = speakingBandSeries(sh, { lang: 'en' })
    expect(en).toMatchObject({ bands: [3, 5], first: 3, last: 5, delta: 2, best: 5, avg: 4, count: 2 })

    const ms = speakingBandSeries(sh, { lang: 'ms' })
    expect(ms).toMatchObject({ bands: [2, 4], first: 2, last: 4, delta: 2, best: 4, avg: 3, count: 2 })
  })

  it('keeps only the last N (newest by ts) and rounds avg to one decimal', () => {
    const sh = [
      { band: 1, ts: '2026-06-01', lang: 'en' },
      { band: 2, ts: '2026-06-02', lang: 'en' },
      { band: 2, ts: '2026-06-03', lang: 'en' },
    ]
    expect(speakingBandSeries(sh, { lang: 'en' }).avg).toBe(1.7) // 5/3 = 1.666… → 1.7

    const win = speakingBandSeries(sh, { lang: 'en', n: 2 })
    expect(win.bands).toEqual([2, 2]) // last 2 by ts
    expect(win.first).toBe(2)
    expect(win.last).toBe(2)
  })
})

describe('recurringSpeakingWeakness (tally record.weak over a window)', () => {
  it('tallies only records WITH a weak array (empty array counts, missing array does not)', () => {
    const sh = [
      { lang: 'en', weak: ['grammar', 'vocab'], ts: '2026-06-03' },
      { lang: 'en', weak: ['grammar'], ts: '2026-06-02' },
      { lang: 'en', ts: '2026-06-01' }, // no weak array → not counted at all
      { lang: 'en', weak: [], ts: '2026-06-04' }, // clean attempt → counted, contributes 0 flags
    ]
    const out = recurringSpeakingWeakness(sh, { lang: 'en' })
    expect(out.tallied).toBe(3) // the 3 with weak arrays (incl. the empty one)
    expect(out.flagTotal).toBe(3) // 2 + 1 + 0
    expect(out.top).toEqual([{ category: 'grammar', count: 2 }, { category: 'vocab', count: 1 }])
  })

  it('honours the window (newest first) and language scope, and caps top at 2', () => {
    const sh = [
      { lang: 'en', weak: ['a'], ts: '2026-06-01' },
      { lang: 'en', weak: ['b'], ts: '2026-06-02' },
      { lang: 'en', weak: ['c'], ts: '2026-06-03' },
      { lang: 'ms', weak: ['z'], ts: '2026-06-04' }, // wrong language → excluded under lang:'en'
    ]
    const win = recurringSpeakingWeakness(sh, { lang: 'en', window: 2 })
    expect(win.tallied).toBe(2) // newest 2 English records (b, c)
    expect(win.flagTotal).toBe(2)

    const all = recurringSpeakingWeakness(sh, { lang: 'en' })
    expect(all.tallied).toBe(3) // the Malay record never counts
    expect(all.top).toHaveLength(2) // 3 distinct categories → capped at 2
  })
})

describe('topicsDueForReattempt (injected now, local "today")', () => {
  const NOW = new Date(2026, 5, 14, 12, 0, 0).getTime() // local 2026-06-14 noon
  const at = (mo, d, h = 10) => new Date(2026, mo, d, h, 0, 0).getTime()

  it('surfaces weak (band ≤ 3) and stale (>3 days) topics, excluding today + strong-recent', () => {
    const sh = [
      { topicId: 'a', band: 2, ts: at(5, 13) }, // yesterday, band 2 → weak
      { topicId: 'b', band: 5, ts: at(5, 9) }, // 5 days ago, band 5 → stale
      { topicId: 'c', band: 5, ts: at(5, 13) }, // yesterday, band 5, recent → neither → excluded
      { topicId: 'd', band: 1, ts: at(5, 14, 9) }, // practised TODAY → excluded (no same-day nag)
    ]
    const out = topicsDueForReattempt(sh, NOW, { lang: 'ms' })
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ topicId: 'a', lastBand: 2, lastTs: at(5, 13), reason: 'weak' })
    expect(out[1]).toMatchObject({ topicId: 'b', lastBand: 5, reason: 'stale' }) // weak ranks before stale
    expect(out[0].t).toBeUndefined() // internal epoch field is dropped from the public shape
  })

  it('uses the most recent attempt per topic for the band/reason', () => {
    const sh = [
      { topicId: 'x', band: 5, ts: at(5, 5) }, // older, strong
      { topicId: 'x', band: 2, ts: at(5, 12) }, // newer, weak → this one wins
    ]
    const out = topicsDueForReattempt(sh, NOW, { lang: 'ms' })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ topicId: 'x', lastBand: 2, reason: 'weak' })
  })

  it('ranks same-reason topics oldest-first and respects the limit + language scope', () => {
    const sh = [
      { topicId: 'p', band: 5, ts: at(5, 10) }, // 4 days ago → stale
      { topicId: 'q', band: 5, ts: at(5, 8) }, // 6 days ago → stale (older)
      { topicId: 'en1', band: 1, ts: at(5, 9), lang: 'en' }, // wrong language → excluded under ms
    ]
    const out = topicsDueForReattempt(sh, NOW, { lang: 'ms' })
    expect(out.map(t => t.topicId)).toEqual(['q', 'p']) // oldest stale first, English excluded

    const capped = topicsDueForReattempt(sh, NOW, { lang: 'ms', limit: 1 })
    expect(capped).toHaveLength(1)
    expect(capped[0].topicId).toBe('q')
  })
})
