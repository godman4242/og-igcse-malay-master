// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { masteredCards, countMastered, State, MASTERED_STABILITY_DAYS } from '../fsrs'

const card = (over) => ({ m: 'x', e: 'y', state: State.Review, stability: 30, ...over })

describe('masteredCards', () => {
  it('returns cards in Review with stability >= MASTERED_STABILITY_DAYS', () => {
    const cards = [
      card({ m: 'rumah', stability: MASTERED_STABILITY_DAYS }), // exactly at threshold → mastered
      card({ m: 'makan', stability: 100 }),                     // above → mastered
      card({ m: 'baru', stability: 5 }),                        // below → not
      card({ m: 'fresh', state: State.New, stability: 999 }),   // not Review → not
    ]
    expect(masteredCards(cards).map(c => c.m)).toEqual(['rumah', 'makan'])
  })

  it('returns [] for non-arrays', () => {
    expect(masteredCards(null)).toEqual([])
    expect(masteredCards(undefined)).toEqual([])
  })

  it('countMastered stays equal to masteredCards length (cannot drift)', () => {
    const cards = [card({ stability: 30 }), card({ stability: 1 }), card({ stability: 50 })]
    expect(countMastered(cards)).toBe(masteredCards(cards).length)
    expect(countMastered(cards)).toBe(2)
  })
})
