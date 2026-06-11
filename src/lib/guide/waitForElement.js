// waitForElement — resolves when a selector's node exists in the document, or
// resolves `null` after a timeout. PURE-ish infra: every browser dependency
// (document, window/timers, MutationObserver) is injected so it unit-tests in a
// node env with a fake clock. The guide controller treats a `null` resolve as
// "skip this step" — so this NEVER rejects (a rejection would dead-end a tour).
//
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md §5/Task 2.

export function waitForElement(selector, opts = {}) {
  const {
    timeoutMs = 3000,
    intervalMs = 100,
    doc = (typeof document !== 'undefined' ? document : undefined),
    win = (typeof window !== 'undefined' ? window : globalThis),
  } = opts

  return new Promise((resolve) => {
    if (!doc || typeof doc.querySelector !== 'function') {
      resolve(null)
      return
    }

    // Fast path: already mounted.
    const immediate = doc.querySelector(selector)
    if (immediate) {
      resolve(immediate)
      return
    }

    let settled = false
    let intervalId = null
    let timeoutId = null
    let observer = null

    const cleanup = () => {
      if (intervalId != null) win.clearInterval(intervalId)
      if (timeoutId != null) win.clearTimeout(timeoutId)
      if (observer) {
        try { observer.disconnect() } catch { /* observer already gone */ }
      }
    }

    const settle = (value) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(value)
    }

    const check = () => {
      if (settled) return
      const el = doc.querySelector(selector)
      if (el) settle(el)
    }

    // Poll as the dependable baseline (works without MutationObserver).
    intervalId = win.setInterval(check, intervalMs)
    timeoutId = win.setTimeout(() => settle(null), timeoutMs)

    // Accelerator: react instantly to DOM mutations when available (real
    // browser). Guarded so the node test env (no MutationObserver) just polls.
    const MO = win.MutationObserver
    const root = doc.body || doc.documentElement
    if (typeof MO === 'function' && root && typeof root.nodeType === 'number') {
      try {
        observer = new MO(check)
        observer.observe(root, { childList: true, subtree: true })
      } catch {
        observer = null
      }
    }
  })
}
