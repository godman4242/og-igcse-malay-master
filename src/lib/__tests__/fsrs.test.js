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
