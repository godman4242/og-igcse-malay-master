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
 * `canRetry` (drives the button's disabled state) and `showRetryIcon` are
 * SEPARATE predicates, and were before this extraction too — the old markup
 * disabled on `queue.length === 0` but drew the icon on
 * `error || (queued && online)`. Collapsing them into one flag would silently
 * take the Retry escape hatch away from an OFFLINE device with queued work,
 * which is exactly the state a stale `networkStatus:'offline'` flag leaves you
 * in (the bug reconcileSyncStatusOnLoad exists to heal). Only ONE thing is new:
 * an unreachable cloud makes Retry available even with an empty queue.
 *
 * @returns {{ text: string, tone: 'offline'|'error'|'idle', canRetry: boolean, showRetryIcon: boolean }}
 */
export function cloudPillLabel(sync) {
  const queued = sync?.queue?.length || 0
  const online = sync?.networkStatus !== 'offline'
  const unreachable = !!sync?.cloudUnavailable
  const errored = sync?.syncStatus === 'error'
  // Pre-existing predicates, preserved verbatim; `unreachable` is the addition.
  const canRetry = queued > 0 || unreachable
  const showRetryIcon = errored || unreachable || (queued > 0 && online)
  const out = (text, tone) => ({ text, tone, canRetry, showRetryIcon })

  if (!online) return out(`Offline · ${queued} queued`, 'offline')
  if (unreachable) return out('Cloud backup unavailable', 'error')
  if (sync?.syncStatus === 'syncing') return out('Syncing...', 'idle')
  if (errored) return out(`Sync error · ${queued} queued`, 'error')
  if (queued > 0) return out(`${queued} pending`, 'idle')
  return out('Synced', 'idle')
}
