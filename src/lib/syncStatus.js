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
export function reconcileSyncStatusOnLoad(sync, isOnline = true) {
  if (!sync) return sync
  let next = sync
  if (next.syncStatus === 'syncing') {
    next = { ...next, syncStatus: next.queue?.length ? 'pending' : 'synced' }
  }
  if (isOnline && next.networkStatus === 'offline') {
    next = { ...next, networkStatus: 'online' }
  }
  return next
}
