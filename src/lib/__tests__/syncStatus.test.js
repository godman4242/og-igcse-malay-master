// Regression: a persisted sync.syncStatus of 'syncing' is STALE on load and,
// left as-is, permanently deadlocks the sync queue.
//
// Root cause (observed 2026-05-29 via telemetry): the queue flush froze for
// ~5h — events kept enqueuing (sync_queue_enqueued latest 08:39) but no flush
// was even ATTEMPTED after 03:50. The store persists the whole `sync` slice
// (no partialize) including `syncStatus`. If a flush set 'syncing' (the
// concurrency guard) and the tab closed during the await before the reset,
// 'syncing' got persisted. On reload, Layout's flush trigger and the store's
// retry both guard on `syncStatus !== 'syncing'`, and the manual Retry button
// is disabled while 'syncing' — so nothing could ever move it off 'syncing'.
//
// Fix: reconcile a stale 'syncing' at rehydration to a live value. This pins
// the pure logic; the wiring lives in useStore.js onRehydrateStorage.

import { describe, it, expect } from 'vitest'
import { reconcileSyncStatusOnLoad } from '../syncStatus.js'

describe('reconcileSyncStatusOnLoad', () => {
  it('coerces a stale "syncing" with queued work to "pending" (lets the flush re-fire)', () => {
    const out = reconcileSyncStatusOnLoad({
      syncStatus: 'syncing', queue: [{ id: 'a' }], networkStatus: 'online', lastError: null,
    })
    expect(out.syncStatus).toBe('pending')
    expect(out.queue).toHaveLength(1)        // queued work preserved — must not be dropped
    expect(out.networkStatus).toBe('online') // other fields preserved
  })

  it('coerces a stale "syncing" with an empty queue to "synced"', () => {
    expect(reconcileSyncStatusOnLoad({ syncStatus: 'syncing', queue: [] }).syncStatus).toBe('synced')
  })

  it('treats a missing queue as empty (→ synced)', () => {
    expect(reconcileSyncStatusOnLoad({ syncStatus: 'syncing' }).syncStatus).toBe('synced')
  })

  it('leaves non-syncing statuses untouched (returns the same reference — no needless re-render)', () => {
    const synced = { syncStatus: 'synced', queue: [] }
    expect(reconcileSyncStatusOnLoad(synced)).toBe(synced)
    const errored = { syncStatus: 'error', queue: [{ id: 'a' }], lastError: 'boom' }
    expect(reconcileSyncStatusOnLoad(errored)).toBe(errored)
    const pending = { syncStatus: 'pending', queue: [{ id: 'a' }] }
    expect(reconcileSyncStatusOnLoad(pending)).toBe(pending)
  })

  it('is null / undefined safe', () => {
    expect(reconcileSyncStatusOnLoad(null)).toBe(null)
    expect(reconcileSyncStatusOnLoad(undefined)).toBe(undefined)
  })
})
