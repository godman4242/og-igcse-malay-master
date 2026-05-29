// A persisted `sync.syncStatus === 'syncing'` is always STALE on load: a flush
// cannot survive a page reload, so no flush is actually in flight. Left as-is
// it permanently DEADLOCKS sync — the Layout flush trigger and the store's
// retry both guard on `syncStatus !== 'syncing'`, and the manual "Retry sync"
// button is `disabled` while 'syncing'. So nothing can ever move it off
// 'syncing' again, and the queue grows forever without flushing.
// (Observed 2026-05-29: queue flush frozen ~5h while events kept enqueuing.)
//
// Reconcile a stale 'syncing' at rehydration to a live value: 'pending' if
// there is queued work (so the Layout mount effect re-fires the flush), else
// 'synced'. Non-syncing statuses are returned unchanged (same reference) so a
// no-op reconcile doesn't bust shallow-equality and force a re-render.
//
// Pure and dependency-free on purpose: useStore.js needs it synchronously at
// store-creation time (rehydration runs before React mounts), so it must be a
// plain static import. It deliberately does NOT live in syncEngine.js, which
// useStore dynamic-imports — a static import of that module would trip
// Rollup's INEFFECTIVE_DYNAMIC_IMPORT and defeat the cloud-sync code split.
export function reconcileSyncStatusOnLoad(sync) {
  if (!sync || sync.syncStatus !== 'syncing') return sync
  return { ...sync, syncStatus: sync.queue?.length ? 'pending' : 'synced' }
}
