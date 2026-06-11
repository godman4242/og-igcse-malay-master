// guideController — the route-aware engine behind the in-app guide ("App tour").
//
// Framework-agnostic: React Router's `navigate`, telemetry's `onEvent`, the
// `driver.js` factory, and `waitForElement` are all INJECTED, so the whole
// step-flow unit-tests with stubs (no browser, no real lib). The React layer
// (useGuide) supplies the live `navigate`/`onEvent`/reduced-motion; in the real
// app `driver.js` + its CSS are dynamic-imported here so they only ever land in
// a lazy chunk that loads the moment a tour starts.
//
// Step-flow contract (see __tests__/guideController.test.js):
//  - same-route next  → moveTo(next) immediately, no navigate
//  - cross-route next → navigate(route) → waitFor(selector) → moveTo(next)
//  - target missing   → skip it (advance past), never dead-end
//  - destroy()        → tears down the driver + ignores any in-flight advance
//  - new tour while one runs → destroys the previous first
//  - telemetry carries ONLY { tier, stepIndex } — never user content
//
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md §5.

import { waitForElement } from './waitForElement'

// Module-level singleton: only one tour at a time. A new tour destroys the old.
let _active = null

export function stopActiveTour() {
  if (_active) {
    try { _active.destroy() } catch { /* already gone */ }
    _active = null
  }
}

export function startTour(steps, opts = {}) {
  const {
    tier = 'quick',
    navigate,
    driverFactory = null, // injected in tests; real app dynamic-imports driver.js
    waitFor = waitForElement,
    onEvent,
    getPath,
    prefersReducedMotion = false,
    onPopoverRender = undefined, // React layer themes the body-level popover here
  } = opts

  // A new tour supersedes any running one.
  stopActiveTour()

  const onEv = typeof onEvent === 'function' ? onEvent : () => {}
  const list = Array.isArray(steps) ? steps : []

  let active = -1
  let settled = false // a completed/dismissed event has been (or must not be) emitted
  let torn = false    // the driver has been torn down
  let driverObj = null
  let currentRoute =
    typeof getPath === 'function'
      ? getPath()
      : (typeof window !== 'undefined' ? window.location.pathname : '/')

  const driverSteps = list.map((s) => ({
    ...(s.selector ? { element: s.selector } : {}),
    popover: {
      title: s.title,
      description: s.body,
      ...(s.side ? { side: s.side } : {}),
      ...(s.align ? { align: s.align } : {}),
    },
  }))

  // Find the next *renderable* step from `start`, moving by `dir` (+1/-1).
  // Navigates across routes and waits for spotlight targets; a target that
  // never mounts is skipped. Returns the index, or -1 if none remain that way.
  async function resolve(start, dir) {
    let i = start
    while (i >= 0 && i < list.length) {
      const step = list[i]
      if (step.route != null && step.route !== currentRoute) {
        await navigate(step.route)
        if (torn || settled) return -1
        currentRoute = step.route
      }
      if (step.selector) {
        const node = await waitFor(step.selector)
        if (torn || settled) return -1
        if (!node) { i += dir; continue } // missing → skip, never dead-end
      }
      return i
    }
    return -1
  }

  function markCompleted() {
    if (settled) return
    settled = true
    onEv('guide_completed', { tier })
  }

  function markDismissed() {
    if (settled) return
    settled = true
    onEv('guide_dismissed', { tier, stepIndex: active })
  }

  function destroyDriver() {
    if (torn) return
    torn = true
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', onPopState)
    }
    try { driverObj && driverObj.destroy() } catch { /* idempotent */ }
    if (_active === handle) _active = null
  }

  // Browser back/forward mid-tour would strand the popover on a stale route —
  // tear down cleanly. The tour's own navigation uses history.pushState, which
  // does NOT fire popstate, so this only catches genuine user back/forward.
  function onPopState() { teardownSilently() }

  // Programmatic teardown (React unmount / superseded by a new tour): emit
  // nothing — settle silently so the driver's own onDestroyStarted won't log a
  // spurious dismissal.
  function teardownSilently() {
    if (torn) return
    settled = true
    destroyDriver()
  }

  async function landOn(target) {
    active = target
    driverObj.moveTo(target)
    onEv('guide_step', { tier, stepIndex: target })
  }

  async function handleNext() {
    if (torn || settled || !driverObj) return
    const target = await resolve(active + 1, +1)
    if (torn || settled) return
    if (target === -1) { markCompleted(); destroyDriver(); return }
    await landOn(target)
  }

  async function handlePrev() {
    if (torn || settled || !driverObj) return
    const target = await resolve(active - 1, -1)
    if (torn || settled) return
    if (target === -1) return // nothing before the current step — stay put
    await landOn(target)
  }

  const config = {
    animate: !prefersReducedMotion,
    popoverClass: 'guide-theme',
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    allowClose: true,
    smoothScroll: true,
    stagePadding: 6,
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done ✓',
    steps: driverSteps,
    ...(onPopoverRender ? { onPopoverRender } : {}),
    onNextClick: () => handleNext(),
    onPrevClick: () => handlePrev(),
    onCloseClick: () => { markDismissed(); destroyDriver() },
    // Esc / backdrop close routes through driver's own destroy → log dismissal
    // (no-op if we already settled via complete/close/programmatic teardown).
    onDestroyStarted: () => {
      markDismissed()
      torn = true
      if (typeof window !== 'undefined') window.removeEventListener('popstate', onPopState)
      if (_active === handle) _active = null
    },
  }

  const handle = { destroy: teardownSilently }
  _active = handle
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', onPopState)
  }

  const ready = (async () => {
    onEv('guide_started', { tier })
    if (torn || settled) return

    const factory = driverFactory || (await import('driver.js')).driver
    if (torn || settled) return
    if (!driverFactory) {
      // Default styling for popover/overlay; our .guide-theme overrides win on
      // specificity. Only pulled in on the real (lazy) path.
      try { await import('driver.js/dist/driver.css') } catch { /* css optional */ }
      if (torn || settled) return
    }
    driverObj = factory(config)

    const first = await resolve(0, +1)
    if (torn || settled) return
    if (first === -1) { markCompleted(); destroyDriver(); return }
    active = first
    driverObj.drive(first)
    onEv('guide_step', { tier, stepIndex: first })
  })()

  handle.ready = ready
  return handle
}
