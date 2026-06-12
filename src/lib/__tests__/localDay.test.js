/* global process */
// TZ MUST be set before any Date is constructed (and before the imports below,
// which may touch Date), or the local-vs-UTC boundary assertions are
// meaningless and silently pass on a UTC CI machine. Malaysia (UTC+8, no DST)
// is the app's primary audience — exactly the timezone where the "day rolls at
// 08:00 local" bug (P2-C3) bites.
process.env.TZ = 'Asia/Kuala_Lumpur'

import { describe, it, expect } from 'vitest'
import { toLocalISO, getTodayISO } from '../localDay.js'
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
