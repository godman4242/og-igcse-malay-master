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
import { reconcileSyncStatusOnLoad, cloudPillLabel } from '../syncStatus.js'

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

  // networkStatus reconciliation (2026-05-29) — a stale persisted 'offline'
  // while actually online blocks the queue flush forever (flush + Layout both
  // gate on networkStatus === 'online'). Heal it when the caller is online.
  it('heals a stale "offline" networkStatus when the device is online', () => {
    const out = reconcileSyncStatusOnLoad({ syncStatus: 'synced', networkStatus: 'offline', queue: [] }, true)
    expect(out.networkStatus).toBe('online')
    expect(out.syncStatus).toBe('synced') // untouched
  })

  it('leaves "offline" alone when the device really is offline', () => {
    const sync = { syncStatus: 'pending', networkStatus: 'offline', queue: [{ id: 'a' }] }
    expect(reconcileSyncStatusOnLoad(sync, false)).toBe(sync) // same ref, no change
  })

  it('heals BOTH a stale syncing status and a stale offline flag in one pass', () => {
    const out = reconcileSyncStatusOnLoad({ syncStatus: 'syncing', networkStatus: 'offline', queue: [{ id: 'a' }] }, true)
    expect(out.syncStatus).toBe('pending')
    expect(out.networkStatus).toBe('online')
  })

  it('does not touch networkStatus when already online', () => {
    const sync = { syncStatus: 'synced', networkStatus: 'online', queue: [] }
    expect(reconcileSyncStatusOnLoad(sync, true)).toBe(sync) // same ref
  })

  // C1-hardening: `cloudUnavailable` is an observation about the CURRENT session
  // ("the backend didn't answer"), so a persisted true is stale on the next cold
  // load and would show a red "Cloud backup unavailable" pill about a backend
  // nobody has contacted yet. Clear it; the first failed call re-raises it.
  it('clears a stale persisted cloudUnavailable flag on load', () => {
    const out = reconcileSyncStatusOnLoad({ syncStatus: 'synced', networkStatus: 'online', queue: [], cloudUnavailable: true }, true)
    expect(out.cloudUnavailable).toBe(false)
    expect(out.syncStatus).toBe('synced') // untouched
  })

  it('leaves a sync slice without the flag alone (same ref)', () => {
    const sync = { syncStatus: 'synced', networkStatus: 'online', queue: [] }
    expect(reconcileSyncStatusOnLoad(sync, true)).toBe(sync)
  })
})

// The header pill is the only global surface that tells the user whether their
// work reached the cloud. Extracted from Layout's nested ternary so the "a dead
// host produces a VISIBLE error" contract is testable without mounting Layout.
describe('cloudPillLabel', () => {
  const base = { networkStatus: 'online', syncStatus: 'synced', queue: [], cloudUnavailable: false }

  it('says the backup is unavailable when the cloud did not answer', () => {
    const out = cloudPillLabel({ ...base, cloudUnavailable: true })
    expect(out.text).toBe('Cloud backup unavailable')
    expect(out.tone).toBe('error')
    expect(out.canRetry).toBe(true) // retry must NOT be disabled just because the queue is empty
  })

  it('reports it even while queued work is pending — an empty queue is not proof of a healthy backend', () => {
    expect(cloudPillLabel({ ...base, cloudUnavailable: true, queue: [{ id: 'a' }], syncStatus: 'pending' }).text)
      .toBe('Cloud backup unavailable')
  })

  it('offline wins over an unreachable cloud (the user can act on offline)', () => {
    const out = cloudPillLabel({ ...base, networkStatus: 'offline', cloudUnavailable: true, queue: [{ id: 'a' }] })
    expect(out.text).toBe('Offline · 1 queued')
    expect(out.tone).toBe('offline')
  })

  it('keeps every pre-existing state byte-identical', () => {
    expect(cloudPillLabel(base).text).toBe('Synced')
    expect(cloudPillLabel({ ...base, syncStatus: 'syncing' }).text).toBe('Syncing...')
    expect(cloudPillLabel({ ...base, syncStatus: 'error', queue: [{ id: 'a' }] }).text).toBe('Sync error · 1 queued')
    expect(cloudPillLabel({ ...base, queue: [{ id: 'a' }, { id: 'b' }] }).text).toBe('2 pending')
    expect(cloudPillLabel({ ...base, networkStatus: 'offline' }).text).toBe('Offline · 0 queued')
  })
})
