// Reconcile the persisted `sync` slice at rehydration. The whole sync slice is
// persisted (no partialize), so two ephemeral runtime flags can survive a
// reload in a stale state and permanently block the queue flush — both the
// Layout flush trigger and processSyncQueue gate on them:
//
//  1. syncStatus === 'syncing' — a flush can't survive a page reload, so a
//     persisted 'syncing' is always stale. Left as-is it deadlocks the queue
//     (the flush guard is `syncStatus !== 'syncing'`, and the manual Retry
//     button is disabled while 'syncing'). Coerce → 'pending' (queued work)
//     or 'synced' (empty). (Observed 2026-05-29: queue frozen ~5h.)
//
//  2. networkStatus === 'offline' while the device is actually online — the
//     flush's `isOnline` check (`networkStatus === 'online'`) and the Layout
//     trigger both bail, so the queue never drains even though connectivity is
//     fine. (Observed 2026-05-29: hydrate + blob push succeeded — both need
//     network — while the queue flush kept early-returning 'pending' because
//     this flag was stale.) When the caller knows the device is online
//     (navigator.onLine), heal it so the next flush proceeds. If genuinely
//     offline we leave it; the 'online' DOM event will set it later.
//
// Returns the SAME reference when nothing needs changing, so a no-op reconcile
// doesn't bust shallow-equality. Pure + dependency-free (isOnline is passed in,
// not read here) so useStore can call it synchronously at store-creation time
// as a plain static import — syncEngine can't be (INEFFECTIVE_DYNAMIC_IMPORT).
//  3. cloudUnavailable === true — an observation about the LAST session ("the
//     backend didn't answer"), so on a cold load it describes a backend nobody
//     has contacted yet. Left as-is it shows a red "Cloud backup unavailable"
//     pill on a perfectly healthy backend. Clear it; the first failed cloud
//     call re-raises it within seconds. (C1-hardening, 2026-08-03.)
export function reconcileSyncStatusOnLoad(sync, isOnline = true) {
  if (!sync) return sync
  let next = sync
  if (next.syncStatus === 'syncing') {
    next = { ...next, syncStatus: next.queue?.length ? 'pending' : 'synced' }
  }
  if (isOnline && next.networkStatus === 'offline') {
    next = { ...next, networkStatus: 'online' }
  }
  if (next.cloudUnavailable) {
    next = { ...next, cloudUnavailable: false }
  }
  return next
}

/**
 * The header sync pill's text + colour, as a pure function of the sync slice.
 *
 * Extracted from Layout (C1-hardening) for two reasons: it makes the
 * "an unreachable backend produces a VISIBLE error" contract testable without
 * mounting Layout, and the pre-existing nested ternary had no place to express
 * `cloudUnavailable` — which is precisely the state a PAUSED Supabase project
 * leaves the app in (SUPABASE_CONFIG.enabled is a presence check, so the app
 * believes cloud sync is on while every call rejects).
 *
 * Ordering is deliberate: device-offline outranks cloud-unreachable, because
 * "you are offline" is the actionable one and is also the more likely cause of
 * a failed call. cloud-unreachable then outranks the queue states — an empty
 * queue is NOT proof of a healthy backend, which was the whole silent failure.
 *
 * @returns {{ text: string, tone: 'offline'|'error'|'idle', canRetry: boolean }}
 */
export function cloudPillLabel(sync) {
  const queued = sync?.queue?.length || 0
  if (sync?.networkStatus === 'offline') {
    return { text: `Offline · ${queued} queued`, tone: 'offline', canRetry: false }
  }
  if (sync?.cloudUnavailable) {
    return { text: 'Cloud backup unavailable', tone: 'error', canRetry: true }
  }
  if (sync?.syncStatus === 'syncing') {
    return { text: 'Syncing...', tone: 'idle', canRetry: false }
  }
  if (sync?.syncStatus === 'error') {
    return { text: `Sync error · ${queued} queued`, tone: 'error', canRetry: true }
  }
  if (queued > 0) {
    return { text: `${queued} pending`, tone: 'idle', canRetry: true }
  }
  return { text: 'Synced', tone: 'idle', canRetry: false }
}
