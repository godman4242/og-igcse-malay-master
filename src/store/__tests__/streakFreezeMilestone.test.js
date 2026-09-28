// Streak freeze vs milestone (bug hunt 2026-09-28, R1 #8 / census A12).
// A freeze keeps the count where it was; the milestone check used to re-fire on that
// unchanged count and hand the freeze straight back — a streak parked on 7/14/30… never broke.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../lib/confetti', async (orig) => ({ ...(await orig()), fireConfetti: vi.fn() }))

import useStore from '../useStore'

const DAY = 86400000
const start = new Date(2026, 8, 1, 12).getTime() // 1 Sep 2026, local noon

function studyOn(dayOffset) {
  vi.setSystemTime(start + dayOffset * DAY)
  useStore.getState().updateStreak()
}

describe('updateStreak — a freeze is not refunded by the milestone it protected', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    useStore.setState({ streak: { count: 0, last: null }, streakFreezes: 0, streakFreezeLog: [] })
  })
  afterEach(() => vi.useRealTimers())

  it('7 days → 13-day gap → 6-day gap: the freeze is used once, then the streak breaks', () => {
    for (let d = 0; d < 7; d++) studyOn(d)
    expect(useStore.getState().streak.count).toBe(7)
    expect(useStore.getState().streakFreezes).toBe(1) // earned at 7

    studyOn(6 + 14) // 13 missed days
    expect(useStore.getState().streak.count).toBe(7)
    expect(useStore.getState().streakFreezes).toBe(0) // spent, not re-awarded

    studyOn(20 + 7) // 6 missed days, no freeze left
    expect(useStore.getState().streak.count).toBe(1)
    expect(useStore.getState().streakFreezeLog.map(e => e.type)).toEqual(['awarded', 'consumed'])
  })

  it('a milestone reached by a real study day still awards exactly one freeze', () => {
    for (let d = 0; d < 14; d++) studyOn(d)
    expect(useStore.getState().streak.count).toBe(14)
    expect(useStore.getState().streakFreezes).toBe(2) // 7 and 14
    studyOn(13) // same day again — no double award
    expect(useStore.getState().streakFreezes).toBe(2)
  })
})
