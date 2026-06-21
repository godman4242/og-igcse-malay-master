import { lazy } from 'react'

// Recover lazy-loaded routes from a stale/missing chunk fetch.
//
// React.lazy(() => import('./X')) throws "Failed to fetch dynamically imported
// module" when the chunk URL can't load. The common real-world cause for THIS
// app: it redeploys on every build-loop commit, so a tab left open across a
// deploy holds the OLD hashed chunk URLs — the next navigation to a not-yet-
// loaded route 404s and dumps the user on the ErrorBoundary ("Something went
// wrong"). A transient network blip does the same.
//
// Fix (Vite's own recommendation for vite:preloadError): on a chunk-load error,
// do ONE full page reload to fetch index.html again with the fresh chunk hashes.
// Guarded by sessionStorage so we never reload-loop: if it already reloaded once
// for this route and the chunk STILL won't load, we rethrow and let the
// ErrorBoundary show (a genuine failure, not a stale deploy).

const FLAG_PREFIX = 'chunk-reload:'

// Match the dynamic-import failure across browsers; never match an ordinary
// in-component runtime error (those must reach the ErrorBoundary, not reload).
export function isChunkLoadError(err) {
  const msg = (err && (err.message || String(err))) || ''
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|dynamically imported module/i.test(
    msg,
  )
}

function safeGet(storage, key) {
  try {
    return storage ? storage.getItem(key) : null
  } catch {
    return null
  }
}
function safeSet(storage, key, val) {
  try {
    storage && storage.setItem(key, val)
  } catch {
    /* private-mode / quota — ignore */
  }
}
function safeRemove(storage, key) {
  try {
    storage && storage.removeItem(key)
  } catch {
    /* ignore */
  }
}

// Testable core — deps injected so it runs in the `node` test env.
export function retryImport(importFn, key, deps = {}) {
  const storage =
    'storage' in deps ? deps.storage : typeof sessionStorage !== 'undefined' ? sessionStorage : null
  const reload =
    deps.reload ||
    (() => {
      if (typeof window !== 'undefined') window.location.reload()
    })
  const flag = FLAG_PREFIX + key

  return importFn().then(
    mod => {
      // Loaded cleanly — drop any stale guard so a future blip can reload again.
      safeRemove(storage, flag)
      return mod
    },
    err => {
      if (!isChunkLoadError(err)) throw err // a real bug inside the route — surface it
      // No storage ⇒ can't guard against an infinite reload loop ⇒ don't reload.
      if (!storage) throw err
      if (safeGet(storage, flag) === '1') throw err // already reloaded once, still broken
      safeSet(storage, flag, '1')
      reload()
      return new Promise(() => {}) // never resolves — the page is reloading
    },
  )
}

export function lazyWithRetry(importFn, key) {
  return lazy(() => retryImport(importFn, key))
}
