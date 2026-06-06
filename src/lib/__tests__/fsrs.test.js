import { describe, it, expect } from 'vitest'
import {
  Rating,
  State,
  createNewCardState,
  migrateFromSM2,
  getSchedulingOptions,
  reviewCard,
  isDue,
  isDueForRecall,
  getDueCards,
  sortByPriority,
  buildComebackQueue,
  stillRememberCards,
  resolveRecallProbe,
  RECALL_PROBE_DEFAULT,
} from '../fsrs.js'

describe('createNewCardState', () => {
  it('returns a serialisable card with all required fields', () => {
    const c = createNewCardState()
    expect(c).toMatchObject({
      stability: expect.any(Number),
      difficulty: expect.any(Number),
      elapsed_days: expect.any(Number),
      scheduled_days: expect.any(Number),
      reps: 0,
      lapses: 0,
      state: State.New,
      last_review: null,
    })
    expect(typeof c.due).toBe('string')
    expect(() => new Date(c.due)).not.toThrow()
    expect(Number.isNaN(new Date(c.due).getTime())).toBe(false)
  })
})

describe('migrateFromSM2', () => {
  it('maps box 1 → fragile state, box 5 → mature stability', () => {
    const fragile = migrateFromSM2({ box: 1, totalReviews: 1 })
    expect(fragile.stability).toBeLessThan(2)
    expect(fragile.lapses).toBe(1)

    const mature = migrateFromSM2({ box: 5, totalReviews: 20 })
    expect(mature.stability).toBeGreaterThanOrEqual(30)
    expect(mature.state).toBe(State.Review)
  })

  it('handles missing fields without throwing', () => {
    const c = migrateFromSM2({})
    expect(c.stability).toBeGreaterThan(0)
    expect(c.state).toBe(State.New)
  })
})

describe('getSchedulingOptions', () => {
  it('returns one entry per rating with valid card + interval_display', () => {
    const card = createNewCardState()
    const opts = getSchedulingOptions(card)
    for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      expect(opts[rating]).toBeDefined()
      expect(opts[rating].card).toMatchObject({
        due: expect.any(String),
        stability: expect.any(Number),
        difficulty: expect.any(Number),
      })
      expect(typeof opts[rating].interval_display).toBe('string')
      expect(opts[rating].interval_display.length).toBeGreaterThan(0)
    }
  })

  it('Easy schedules a longer interval than Again', () => {
    const card = createNewCardState()
    const opts = getSchedulingOptions(card)
    const againDue = new Date(opts[Rating.Again].card.due).getTime()
    const easyDue = new Date(opts[Rating.Easy].card.due).getTime()
    expect(easyDue).toBeGreaterThan(againDue)
  })
})

describe('reviewCard', () => {
  it('increments reps on Good rating', () => {
    const card = createNewCardState()
    const after = reviewCard(card, Rating.Good)
    expect(after.reps).toBe(card.reps + 1)
    expect(after.last_review).not.toBeNull()
  })

  it('Again rating bumps lapses on a mature card', () => {
    // Simulate a mature review-state card.
    const mature = {
      ...createNewCardState(),
      stability: 30,
      difficulty: 5,
      state: State.Review,
      reps: 5,
      lapses: 0,
      last_review: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      due: new Date(Date.now() - 60 * 1000).toISOString(),
    }
    const after = reviewCard(mature, Rating.Again)
    expect(after.lapses).toBeGreaterThan(0)
  })
})

describe('isDue / getDueCards', () => {
  it('treats cards with no due as due', () => {
    expect(isDue({})).toBe(true)
  })

  it('past due → true, future due → false', () => {
    const past = { due: new Date(Date.now() - 1000).toISOString() }
    const future = { due: new Date(Date.now() + 60_000).toISOString() }
    expect(isDue(past)).toBe(true)
    expect(isDue(future)).toBe(false)
  })

  it('getDueCards filters correctly', () => {
    const cards = [
      { due: new Date(Date.now() - 1000).toISOString() },
      { due: new Date(Date.now() + 60_000).toISOString() },
      {},
    ]
    expect(getDueCards(cards)).toHaveLength(2)
  })
})

describe('isDueForRecall', () => {
  const future = () => new Date(Date.now() + 7 * 86400000).toISOString()

  it('is false for a strong, well-settled Review card not yet due', () => {
    expect(isDueForRecall({ state: State.Review, due: future(), stability: 100, lapses: 0 })).toBe(false)
  })

  it('is true when the card is past due (even if Review state)', () => {
    expect(isDueForRecall({ state: State.Review, due: new Date(Date.now() - 1000).toISOString(), lapses: 0 })).toBe(true)
  })

  it('is true for New / Learning / Relearning regardless of due date', () => {
    expect(isDueForRecall({ state: State.New, due: future() })).toBe(true)
    expect(isDueForRecall({ state: State.Learning, due: future() })).toBe(true)
    // Relearning (=3) is a lapsed card — the naïve `state <= Learning` would MISS it.
    expect(isDueForRecall({ state: State.Relearning, due: future() })).toBe(true)
  })

  it('is true for a frequently-lapsed card (lapses >= 3) even if Review and not due', () => {
    expect(isDueForRecall({ state: State.Review, due: future(), lapses: 3 })).toBe(true)
  })

  it('tolerates a missing/empty card', () => {
    expect(isDueForRecall(null)).toBe(false)
    expect(isDueForRecall(undefined)).toBe(false)
    // No due → isDue treats it as due → recall.
    expect(isDueForRecall({ state: State.Review })).toBe(true)
  })
})

describe('sortByPriority', () => {
  it('puts due cards before non-due', () => {
    const future = { due: new Date(Date.now() + 60_000).toISOString(), state: State.New }
    const past = { due: new Date(Date.now() - 1000).toISOString(), state: State.Review }
    const sorted = sortByPriority([future, past])
    expect(sorted[0]).toBe(past)
  })

  it('orders due cards by most-overdue first', () => {
    const a = { due: new Date(Date.now() - 1000).toISOString() }
    const b = { due: new Date(Date.now() - 100_000).toISOString() }
    const sorted = sortByPriority([a, b])
    expect(sorted[0]).toBe(b)
  })
})

describe('stillRememberCards', () => {
  const DAY = 86400000
  const NOW = new Date('2026-06-06T12:00:00Z').getTime()
  const DEFAULTS = { enabled: true, stabilityDays: 21, idleDays: 14 }

  // A card that qualifies under the defaults: settled (stability 40 ≥ 21),
  // idle (reviewed 20d ago ≥ 14), and not due (due 10d in the future).
  function settledCard(over = {}) {
    return {
      m: 'word', state: State.Review, stability: 40,
      last_review: new Date(NOW - 20 * DAY).toISOString(),
      due: new Date(NOW + 10 * DAY).toISOString(),
      ...over,
    }
  }

  it('includes a settled, idle, not-due card', () => {
    const out = stillRememberCards([settledCard()], DEFAULTS, NOW)
    expect(out).toHaveLength(1)
    expect(out[0].m).toBe('word')
  })

  it('excludes a card that is still due (the inverse of a recall queue)', () => {
    const due = settledCard({ due: new Date(NOW - 1000).toISOString() })
    expect(stillRememberCards([due], DEFAULTS, NOW)).toHaveLength(0)
  })

  it('excludes a card below the stability threshold', () => {
    const weak = settledCard({ stability: 20 }) // < 21
    expect(stillRememberCards([weak], DEFAULTS, NOW)).toHaveLength(0)
  })

  it('excludes a card reviewed too recently (under the idle threshold)', () => {
    const fresh = settledCard({ last_review: new Date(NOW - 13 * DAY).toISOString() }) // < 14
    expect(stillRememberCards([fresh], DEFAULTS, NOW)).toHaveLength(0)
  })

  it('excludes never-reviewed / New cards (no last_review)', () => {
    const fresh = settledCard({ last_review: null, state: State.New })
    expect(stillRememberCards([fresh], DEFAULTS, NOW)).toHaveLength(0)
  })

  it('treats the thresholds inclusively (exactly-at-boundary qualifies)', () => {
    const onEdge = settledCard({
      stability: 21,
      last_review: new Date(NOW - 14 * DAY).toISOString(),
    })
    expect(stillRememberCards([onEdge], DEFAULTS, NOW)).toHaveLength(1)
  })

  it('respects custom thresholds (Strict mode shape)', () => {
    const strict = { enabled: true, stabilityDays: 30, idleDays: 21 }
    const card = settledCard() // stability 40, idle 20d
    // idle 20d < 21 → excluded under Strict, included under Default
    expect(stillRememberCards([card], strict, NOW)).toHaveLength(0)
    expect(stillRememberCards([card], DEFAULTS, NOW)).toHaveLength(1)
  })

  it('returns [] when the feature is disabled', () => {
    expect(stillRememberCards([settledCard()], { ...DEFAULTS, enabled: false }, NOW)).toHaveLength(0)
  })

  it('orders most-idle (longest-unseen) first', () => {
    const a = settledCard({ m: 'recent', last_review: new Date(NOW - 15 * DAY).toISOString() })
    const b = settledCard({ m: 'oldest', last_review: new Date(NOW - 40 * DAY).toISOString() })
    const out = stillRememberCards([a, b], DEFAULTS, NOW)
    expect(out.map(c => c.m)).toEqual(['oldest', 'recent'])
  })

  it('tolerates empty / garbage input and a missing config', () => {
    expect(stillRememberCards([], DEFAULTS, NOW)).toEqual([])
    expect(stillRememberCards(null, DEFAULTS, NOW)).toEqual([])
    // Missing config → falls back to defaults (enabled, 21/14).
    expect(stillRememberCards([settledCard()], undefined, NOW)).toHaveLength(1)
  })
})

describe('resolveRecallProbe', () => {
  it('defaults to Default mode (enabled, 21/14)', () => {
    expect(resolveRecallProbe()).toEqual(RECALL_PROBE_DEFAULT)
    expect(RECALL_PROBE_DEFAULT).toMatchObject({ enabled: true, mode: 'default', stabilityDays: 21, idleDays: 14 })
  })

  it('Strict mode forces 30/21 regardless of incoming days', () => {
    const out = resolveRecallProbe({ mode: 'strict' }, { stabilityDays: 5, idleDays: 5 })
    expect(out).toMatchObject({ mode: 'strict', stabilityDays: 30, idleDays: 21 })
  })

  it('switching to Default overrides previously-custom days', () => {
    const out = resolveRecallProbe({ mode: 'default' }, { mode: 'custom', stabilityDays: 99, idleDays: 99 })
    expect(out).toMatchObject({ stabilityDays: 21, idleDays: 14 })
  })

  it('Custom mode keeps the supplied days', () => {
    const out = resolveRecallProbe({ mode: 'custom', stabilityDays: 45, idleDays: 30 }, RECALL_PROBE_DEFAULT)
    expect(out).toMatchObject({ mode: 'custom', stabilityDays: 45, idleDays: 30 })
  })

  it('toggling enabled is independent of mode/days', () => {
    const out = resolveRecallProbe({ enabled: false }, { mode: 'strict', stabilityDays: 30, idleDays: 21 })
    expect(out).toMatchObject({ enabled: false, mode: 'strict', stabilityDays: 30, idleDays: 21 })
  })

  it('a partial patch merges over the current config', () => {
    const out = resolveRecallProbe({ stabilityDays: 50 }, { enabled: true, mode: 'custom', stabilityDays: 40, idleDays: 25 })
    expect(out).toMatchObject({ mode: 'custom', stabilityDays: 50, idleDays: 25 })
  })
})

describe('buildComebackQueue', () => {
  it('returns highest-stability cards first, capped at count', () => {
    const cards = [
      { stability: 5 },
      { stability: 100 },
      { stability: 50 },
      { stability: 0 }, // excluded — never seen
      { stability: 200 },
    ]
    const q = buildComebackQueue(cards, 3)
    expect(q).toHaveLength(3)
    expect(q[0].stability).toBe(200)
    expect(q[1].stability).toBe(100)
    expect(q[2].stability).toBe(50)
  })

  it('excludes new cards (stability 0)', () => {
    const cards = [{ stability: 0 }, { stability: 0 }]
    expect(buildComebackQueue(cards)).toHaveLength(0)
  })
})
