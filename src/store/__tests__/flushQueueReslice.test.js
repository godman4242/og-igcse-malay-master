// P1-2 — sync events enqueued DURING a flush must not be dropped, and two
// overlapping flushes must not double-process.
//
// Root cause: flushSyncQueue captured the queue, did awaited network work, then
// REPLACED the whole queue with `result.remainingQueue` — clobbering anything
// enqueued mid-flight (a `card_removed` lost this way never reaches the cloud,
// since deletes don't heal via the sign-in union). And there was no re-entrancy
// guard, so Layout's `online` handler + the queue.length effect could run two
// flushes at once and process the same events twice.
//
// Fix: re-slice the LIVE queue by processed / failed / dead-lettered event ids
// (keep mid-flush adds), plus an in-flight guard. See P1-2 in
// docs/reviews/2026-06-12-full-codebase-review.md.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Force the cloud path on (the store gates flush on SUPABASE_CONFIG.enabled).
vi.mock('../../config/supabaseConfig', () => ({
  SUPABASE_CONFIG: { enabled: true },
}))
// Neutralize the debounced blob push (no real network, no live 5s timer work).
vi.mock('../../config/supabase', () => ({
  pushStateBlob: vi.fn(async () => {}),
}))
// Controllable cloud event processor — same module the store dynamic-imports.
vi.mock('../../lib/cloudSync', () => ({
  processCloudSyncEvent: vi.fn(async () => {}),
  archiveCloudSyncEvent: vi.fn(async () => {}),
}))

import useStore from '../useStore'
import { processCloudSyncEvent } from '../../lib/cloudSync'

function mkEvent(id, malay) {
  return {
    id,
    idempotencyKey: `sync:${id}`,
    type: 'card_removed',
    payload: { malay, deck: 'x' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    attempts: 0,
  }
}

describe('P1-2 — flushSyncQueue preserves mid-flush enqueues + guards re-entrancy', () => {
  let processed

  beforeEach(() => {
    processed = []
    processCloudSyncEvent.mockReset()
    useStore.setState({
      userRole: 'enhanced',
      auth: { ...useStore.getState().auth, user: null }, // skip the real blob push
      sync: {
        ...useStore.getState().sync,
        networkStatus: 'online',
        syncStatus: 'pending',
        queue: [],
        lastError: null,
      },
    })
  })

  it('an event enqueued during an in-flight flush still reaches the cloud (not dropped)', async () => {
    processCloudSyncEvent.mockImplementation(async (event) => {
      processed.push(event)
      // Simulate a concurrent mutation during the awaited network round-trip.
      if (event.payload.malay === 'first') {
        useStore.getState().enqueueSyncEventAction('card_removed', { malay: 'midflush', deck: 'x' })
      }
    })
    useStore.setState(s => ({ sync: { ...s.sync, queue: [mkEvent('ev1', 'first')] } }))

    await useStore.getState().flushSyncQueue()

    // The mid-flush card_removed must be processed (reach the cloud), not lost.
    expect(processed.some(e => e.payload.malay === 'first')).toBe(true)
    expect(processed.some(e => e.payload.malay === 'midflush')).toBe(true)
  })

  it('the queue re-slice keeps a mid-flush add instead of clobbering it', async () => {
    processCloudSyncEvent.mockImplementation(async (event) => {
      processed.push(event)
      if (event.payload.malay === 'first') {
        // Enqueue mid-flight, then go offline so the auto-drain does NOT consume
        // it — leaving it observable in the queue (pure re-slice assertion).
        useStore.getState().enqueueSyncEventAction('card_removed', { malay: 'midflush', deck: 'x' })
        useStore.getState().setNetworkStatus(false)
      }
    })
    useStore.setState(s => ({ sync: { ...s.sync, queue: [mkEvent('ev1', 'first')] } }))

    await useStore.getState().flushSyncQueue()

    const q = useStore.getState().sync.queue
    expect(q.some(e => e.payload.malay === 'first')).toBe(false)   // processed → removed
    expect(q.some(e => e.payload.malay === 'midflush')).toBe(true) // mid-flush → KEPT
  })

  it('a second flush while one is in-flight is a no-op (re-entrancy guard)', async () => {
    let release
    const gate = new Promise(r => { release = r })
    let calls = 0
    processCloudSyncEvent.mockImplementation(async (event) => {
      calls += 1
      processed.push(event)
      await gate // hold the first flush in-flight
    })
    useStore.setState(s => ({ sync: { ...s.sync, queue: [mkEvent('ev1', 'first')] } }))

    const p1 = useStore.getState().flushSyncQueue() // starts, parks on gate
    const r2 = await useStore.getState().flushSyncQueue() // re-entrant → must bail FAST

    expect(r2).toBe(false) // guard rejected the overlapping flush

    release()
    await p1
    expect(calls).toBe(1) // ev1 processed exactly once, never double-processed
  })
})
