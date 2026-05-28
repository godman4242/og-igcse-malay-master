// Pins nextScheduledRetryMs — the backoff math that broke the mobile sync
// loop (commit follows). Loop history: Layout's effect re-fired on every
// `sync.syncStatus` change, calling flushSyncQueue back-to-back without
// honouring `nextRetryAt`. Mobile networks fail more often than desktop,
// so the loop only showed there. Fix: the store schedules ONE setTimeout
// retry at the earliest queued nextRetryAt, using this helper for the math.

import { describe, it, expect } from 'vitest'
import { nextScheduledRetryMs } from '../syncEngine.js'

describe('nextScheduledRetryMs', () => {
  it('returns null for an empty queue (nothing to retry)', () => {
    expect(nextScheduledRetryMs([], 0)).toBeNull()
    expect(nextScheduledRetryMs(undefined, 0)).toBeNull()
    expect(nextScheduledRetryMs(null, 0)).toBeNull()
  })

  it('returns the default delay when no event has a parseable nextRetryAt', () => {
    const queue = [{ id: 'a' }, { id: 'b', nextRetryAt: 'not-a-date' }]
    expect(nextScheduledRetryMs(queue, 0)).toBe(5000)
  })

  it('returns the delta to the earliest nextRetryAt in the queue', () => {
    const now = Date.parse('2026-05-28T12:00:00Z')
    const queue = [
      { id: 'a', nextRetryAt: '2026-05-28T12:00:10Z' }, // +10s
      { id: 'b', nextRetryAt: '2026-05-28T12:00:03Z' }, // +3s — earliest
      { id: 'c', nextRetryAt: '2026-05-28T12:00:30Z' }, // +30s
    ]
    expect(nextScheduledRetryMs(queue, now)).toBe(3000)
  })

  it('floors at MIN_RETRY_DELAY_MS even if nextRetryAt has already passed', () => {
    // Critical: this is the property that breaks the tight-loop. If we
    // returned `earliest - now` directly, a queue full of past-due events
    // would produce 0 or negative delays and the setTimeout would fire
    // immediately — same hammer as before, just one layer down.
    const now = Date.parse('2026-05-28T12:00:00Z')
    const queue = [{ id: 'a', nextRetryAt: '2026-05-28T11:59:00Z' }] // -60s
    expect(nextScheduledRetryMs(queue, now)).toBe(1000)
  })

  it('ignores events with missing nextRetryAt when others have one', () => {
    const now = Date.parse('2026-05-28T12:00:00Z')
    const queue = [
      { id: 'a' }, // no nextRetryAt — skipped
      { id: 'b', nextRetryAt: '2026-05-28T12:00:07Z' }, // +7s
    ]
    expect(nextScheduledRetryMs(queue, now)).toBe(7000)
  })
})
