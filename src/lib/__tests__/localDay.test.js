/* global process */
// TZ MUST be set before any Date is constructed (and before the imports below,
// which may touch Date), or the local-vs-UTC boundary assertions are
// meaningless and silently pass on a UTC CI machine. Malaysia (UTC+8, no DST)
// is the app's primary audience — exactly the timezone where the "day rolls at
// 08:00 local" bug (P2-C3) bites.
process.env.TZ = 'Asia/Kuala_Lumpur'

import { describe, it, expect } from 'vitest'
import { toLocalISO, getTodayISO, daysUntilLocalDate } from '../localDay.js'
import { rollingActivity } from '../patterns.js'

describe('localDay — local calendar day keys (P2-C3)', () => {
  it('precondition: the test really runs in UTC+8 (else boundary cases are moot)', () => {
    // getTimezoneOffset() is minutes BEHIND UTC, so UTC+8 == -480.
    expect(new Date('2026-06-13T12:00:00Z').getTimezoneOffset()).toBe(-480)
  })

  it('returns the LOCAL day, not the UTC day, in the 16:00–24:00 UTC window', () => {
    // 22:30 UTC on Jun 13 is already 06:30 on Jun 14 in UTC+8.
    const d = new Date('2026-06-13T22:30:00.000Z')
    // The OLD (buggy) key — what toISOString().split('T')[0] produced:
    expect(d.toISOString().split('T')[0]).toBe('2026-06-13')
    // The FIX — the learner's actual local calendar day:
    expect(toLocalISO(d)).toBe('2026-06-14')
  })

  it('agrees with the UTC day in the morning-UTC window (no spurious shift)', () => {
    const d = new Date('2026-06-13T02:30:00.000Z') // 10:30 Jun 13 local
    expect(toLocalISO(d)).toBe('2026-06-13')
  })

  it('zero-pads month and day to YYYY-MM-DD', () => {
    expect(toLocalISO(new Date('2026-01-05T12:00:00+08:00'))).toBe('2026-01-05')
  })

  it('getTodayISO() is toLocalISO(now)', () => {
    expect(getTodayISO()).toBe(toLocalISO(new Date()))
  })
})

describe('daysUntilLocalDate — exam countdown counts LOCAL calendar days (P2-C3)', () => {
  // examDate is a YYYY-MM-DD string from <input type="date">. The OLD code did
  // Math.ceil((new Date(examDate) - now)/86400000), where new Date('2026-06-20')
  // parses as UTC midnight — so for the UTC+8 audience the countdown was over by
  // one during the 00:00–08:00 local window every day.

  it('exam-day morning → 0 (was 1 under the UTC-parse bug)', () => {
    const now = new Date(2026, 5, 20, 4, 0, 0) // KL June 20 04:00 (exam day)
    // Document the OLD buggy value for contrast:
    const buggy = Math.max(0, Math.ceil((new Date('2026-06-20') - now) / 86400000))
    expect(buggy).toBe(1) // <-- the bug
    expect(daysUntilLocalDate('2026-06-20', now)).toBe(0) // <-- the fix
  })

  it('five local days out in the early-morning window → 5 (was 6 under the bug)', () => {
    const now = new Date(2026, 5, 15, 3, 0, 0) // KL June 15 03:00, exam June 20
    const buggy = Math.max(0, Math.ceil((new Date('2026-06-20') - now) / 86400000))
    expect(buggy).toBe(6) // <-- the bug
    expect(daysUntilLocalDate('2026-06-20', now)).toBe(5) // <-- the fix
  })

  it('is stable across the whole exam day (afternoon also → 0)', () => {
    expect(daysUntilLocalDate('2026-06-20', new Date(2026, 5, 20, 23, 59, 0))).toBe(0)
    expect(daysUntilLocalDate('2026-06-20', new Date(2026, 5, 20, 0, 1, 0))).toBe(0)
  })

  it('tomorrow → 1', () => {
    expect(daysUntilLocalDate('2026-06-21', new Date(2026, 5, 20, 9, 0, 0))).toBe(1)
  })

  it('returns a SIGNED diff for a past exam (caller clamps)', () => {
    expect(daysUntilLocalDate('2026-06-19', new Date(2026, 5, 20, 6, 0, 0))).toBe(-1)
  })

  it('accepts a full ISO timestamp too (uses its LOCAL calendar date)', () => {
    // Both anchored at the same UTC midnight → calendar diff preserved in any TZ.
    const now = new Date('2026-06-14T00:00:00.000Z')
    expect(daysUntilLocalDate('2026-06-24T00:00:00.000Z', now)).toBe(10)
  })

  it('null / malformed input → null', () => {
    expect(daysUntilLocalDate(null, new Date())).toBe(null)
    expect(daysUntilLocalDate('not-a-date', new Date())).toBe(null)
  })
})

describe('rollingActivity uses local day keys for studyHistory (P2-C3)', () => {
  it("attributes today's reviews to the final (today) series entry", () => {
    const todayKey = getTodayISO()
    const studyHistory = { [todayKey]: { reviews: 7, minutes: 12 } }
    const series = rollingActivity([], [], studyHistory, 14)
    const last = series[series.length - 1]
    expect(last.day).toBe(todayKey) // series day-key is LOCAL...
    expect(last.reviews).toBe(7)    // ...so it finds today's local-keyed reviews
  })
})
