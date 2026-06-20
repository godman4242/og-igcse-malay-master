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
import { decoratePopover, splitButtonIconLabel } from './popoverDecorations'
import { zoneForPoint, snapRectForZone, DEFAULT_THRESHOLD } from './dragDock'
import { setGuideState, resetGuideState } from './guideState'
import { PAGE_GUIDE_ROUTES } from './pageGuideRoutes'

// Re-exported for spec-contract symmetry; the eager GuideHud imports these
// directly from ./guideState so it never pulls this lazy controller into index.
export { subscribeGuideState, getGuideState } from './guideState'

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
    onGoDeeper = null,           // React layer: open the Full Page Guide for a route
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
    if (dragCleanup) dragCleanup()
    clearPointerTracking()
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', onPopState)
    }
    try { driverObj && driverObj.destroy() } catch { /* idempotent */ }
    resetGuideState()
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

  // ── Pause / Explore ───────────────────────────────────────────────
  // 'spotlight' = page dimmed + locked (default); 'explore' = veil off, whole
  // page clickable so a learner can wander. The box stays live in both.
  let mode = 'spotlight'

  function applyExploreClass(on) {
    if (typeof document === 'undefined') return
    const root = document.querySelector('.driver-active') || document.documentElement
    root && root.classList.toggle('guide-explore', on)
  }

  function updatePauseButton() {
    if (typeof document === 'undefined') return
    const btn = document.querySelector('.driver-popover .guide-pause-btn')
    if (!btn) return
    const explore = mode === 'explore'
    btn.textContent = explore ? '▶ Resume' : '⏸ Pause'
    btn.setAttribute('aria-label', explore ? 'Resume the guided tour' : 'Pause the tour to explore the page')
    btn.setAttribute('aria-pressed', String(explore))
    // textContent reset wiped the icon/label spans — re-split so a docked box
    // stays icon-only after a pause/resume toggle (R4 / T2).
    splitButtonIconLabel(btn)
  }

  function pause() {
    if (torn || settled || mode === 'explore') return
    mode = 'explore'
    applyExploreClass(true)
    updatePauseButton()
    onEv('guide_paused', { tier, stepIndex: active })
  }

  function resume() {
    if (torn || settled || mode === 'spotlight') return
    mode = 'spotlight'
    applyExploreClass(false)
    updatePauseButton()
    onEv('guide_resumed', { tier, stepIndex: active })
  }

  function togglePause() { mode === 'explore' ? resume() : pause() }

  // Skip-to-step: land on a specific 1-based step number. Route-aware — reuses
  // resolve() so a missing target snaps to the nearest renderable step.
  async function jumpTo(displayIndex) {
    if (torn || settled || !driverObj) return
    const idx = Math.round(Number(displayIndex)) - 1
    if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) return
    if (mode === 'explore') resume()            // landing implies spotlight
    const dir = idx >= active ? +1 : -1
    const target = await resolve(idx, dir)
    if (torn || settled) return
    if (target === -1) return
    await landOn(target)
    onEv('guide_jumped', { tier, stepIndex: target })
  }

  // ── In-box ▶ "go deeper" (Phase 3b / R2) ─────────────────────────────
  // Leave this tour and open the Full Page Guide for the route we're on. Tear
  // THIS tour down first, then start the page guide on a microtask so the old
  // driver is fully gone before the new one mounts (else the two popovers race).
  // Only wired when onGoDeeper is injected (useGuide); the decorator shows the
  // button only when the current route actually HAS a page guide.
  function canGoDeeper() {
    return typeof onGoDeeper === 'function' && PAGE_GUIDE_ROUTES.includes(currentRoute)
  }
  function goDeeper() {
    if (torn || settled || typeof onGoDeeper !== 'function') return
    const route = currentRoute
    onEv('guide_go_deeper', { tier, stepIndex: active })
    teardownSilently()
    Promise.resolve().then(() => onGoDeeper(route))
  }

  // ── Drag + Dock (Phase 2) ────────────────────────────────────────────
  // The popover is position:fixed, so a free drag is just inline left/top. The
  // pure dragDock.js decides zones + snap targets; this is the impure glue +
  // state emission. In-session only — no store, no STORE_VERSION bump.
  let dockedZone = null
  let dragCleanup = null

  const ZONE_LABEL = {
    top: 'top edge', bottom: 'bottom edge', left: 'left edge', right: 'right edge',
    tl: 'top-left corner', tr: 'top-right corner', bl: 'bottom-left corner', br: 'bottom-right corner',
  }

  function popoverEl() {
    return typeof document === 'undefined' ? null : document.querySelector('.driver-popover')
  }
  function viewport() {
    return { width: window.innerWidth, height: window.innerHeight }
  }

  function applyDockClass(zone) {
    const pop = popoverEl()
    if (!pop) return
    for (const z of Object.keys(ZONE_LABEL)) pop.classList.remove('guide-docked-' + z)
    pop.classList.toggle('guide-docked', !!zone)
    if (zone) pop.classList.add('guide-docked-' + zone)
    // Keep the handle's pressed state in sync without waiting for a step re-render
    // (driver only re-renders the popover on step change).
    const grip = pop.querySelector('.guide-drag-handle')
    if (grip) grip.setAttribute('aria-pressed', String(!!zone))
  }

  function positionBox(left, top) {
    const pop = popoverEl()
    if (!pop) return
    pop.style.left = left + 'px'
    pop.style.top = top + 'px'
    pop.style.right = 'auto'
    pop.style.bottom = 'auto'
    pop.setAttribute('data-guide-dragged', '')
  }

  function dock(zone) {
    if (torn || settled || !zone) return
    dockedZone = zone
    const pop = popoverEl()
    if (pop) {
      const box = { width: pop.offsetWidth, height: pop.offsetHeight }
      const { left, top } = snapRectForZone(zone, box, viewport())
      positionBox(left, top)
      applyDockClass(zone)
    }
    setGuideState({ dragging: false, zone: null, docked: zone, announce: `Guide docked to ${ZONE_LABEL[zone]}.` })
    onEv('guide_docked', { tier, stepIndex: active })
  }

  function undock() {
    if (torn || settled || !dockedZone) return
    dockedZone = null
    applyDockClass(null)
    setGuideState({ docked: null, announce: 'Guide floating.' })
    onEv('guide_undocked', { tier, stepIndex: active })
  }

  // Keyboard arrow path only: re-pressing the currently-docked edge floats the
  // box. Pointer drops call dock() directly, so releasing on the current zone
  // still re-docks (not toggles) — the magnetic-drop behaviour stays intuitive.
  function keyboardDock(edge) {
    if (dockedZone === edge) undock()
    else dock(edge)
  }

  // Re-stick the dock after driver re-renders the popover on a step change.
  function reapplyDock() {
    if (!dockedZone) return
    const pop = popoverEl()
    if (!pop) return
    const box = { width: pop.offsetWidth, height: pop.offsetHeight }
    const { left, top } = snapRectForZone(dockedZone, box, viewport())
    positionBox(left, top)
    applyDockClass(dockedZone)
  }

  // Impure pointer-drag loop. Delegates all geometry to dragDock.js. A no-move
  // click (< 4px) is treated as a click → no dock/float (so tapping the grip
  // never accidentally docks).
  function startDrag(downEvent) {
    if (torn || settled || typeof window === 'undefined') return
    const pop = popoverEl()
    if (!pop) return
    const rect = pop.getBoundingClientRect()
    const offsetX = downEvent.clientX - rect.left
    const offsetY = downEvent.clientY - rect.top
    const startX = downEvent.clientX
    const startY = downEvent.clientY
    let moved = false
    let zone = null
    try { downEvent.target?.setPointerCapture?.(downEvent.pointerId) } catch { /* capture optional */ }

    const onMove = (e) => {
      positionBox(e.clientX - offsetX, e.clientY - offsetY)
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > 4) {
        moved = true
        setGuideState({ dragging: true, zone: null, docked: dockedZone, announce: 'Dragging guide — release on a green zone to dock.' })
      }
      if (!moved) return
      const z = zoneForPoint({ x: e.clientX, y: e.clientY }, viewport(), DEFAULT_THRESHOLD)
      if (z !== zone) { zone = z; setGuideState({ dragging: true, zone: z, docked: dockedZone }) }
    }
    const onUp = (e) => {
      cleanup()
      if (!moved) { setGuideState({ dragging: false, zone: null, docked: dockedZone }); return }
      const z = zoneForPoint({ x: e.clientX, y: e.clientY }, viewport(), DEFAULT_THRESHOLD)
      if (z) { dock(z); return }
      dockedZone = null
      applyDockClass(null)
      setGuideState({ dragging: false, zone: null, docked: null, announce: 'Guide moved.' })
    }
    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dragCleanup = null
    }
    dragCleanup = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ── Page-guide arrow (Phase 3) ───────────────────────────────────────
  // Emits the box + target rects for the current step so GuideHud can draw the
  // animated arrow. Only active for tier:'page'. driver uses smoothScroll, so we
  // compute on rAF (after layout settles) and re-emit on scroll/resize so the
  // arrow tracks the element. All DOM-guarded (node tests have no window).
  let pointerCleanup = null
  const isPageGuide = () => tier === 'page'

  function rectLite(r) {
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }

  function emitPointer() {
    if (!isPageGuide()) return
    const pop = popoverEl()
    const step = list[active]
    if (!pop || !step || !step.selector) { setGuideState({ pointer: null }); return }
    const targetEl = document.querySelector(step.selector)
    if (!targetEl) { setGuideState({ pointer: null }); return }
    setGuideState({ pointer: { box: rectLite(pop.getBoundingClientRect()), target: rectLite(targetEl.getBoundingClientRect()) } })
  }

  function clearPointerTracking() {
    if (pointerCleanup) { pointerCleanup(); pointerCleanup = null }
  }

  function trackPointer() {
    if (!isPageGuide() || typeof window === 'undefined') return
    clearPointerTracking()
    const raf = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (cb) => setTimeout(cb, 16)
    raf(() => emitPointer())                 // after smoothScroll/layout settles
    const onMove = () => emitPointer()
    window.addEventListener('scroll', onMove, true) // capture: catch inner scrollers
    window.addEventListener('resize', onMove)
    pointerCleanup = () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }

  const config = {
    animate: !prefersReducedMotion,
    popoverClass: 'guide-theme',
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    allowClose: true,
    // Clicking the dark area PAUSES into explore mode (never closes). This is
    // also the fix for the old hang — the backdrop no longer routes to destroy.
    overlayClickBehavior: () => pause(),
    smoothScroll: true,
    stagePadding: 6,
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done ✓',
    steps: driverSteps,
    // Wrap the React-injected themer so we ALSO inject our Pause/Resume button
    // and tap-to-jump progress on every step render. Both always run.
    onPopoverRender: (popover, o) => {
      if (typeof onPopoverRender === 'function') onPopoverRender(popover, o)
      decoratePopover(popover, {
        mode,
        current: active + 1,
        total: list.length,
        onTogglePause: togglePause,
        onJump: jumpTo,
        onDragStart: startDrag,
        onDock: keyboardDock,
        docked: dockedZone,
        canGoDeeper: canGoDeeper(),
        onGoDeeper: goDeeper,
      })
      reapplyDock()
      trackPointer()
    },
    onNextClick: () => handleNext(),
    onPrevClick: () => handlePrev(),
    onCloseClick: () => { markDismissed(); destroyDriver() },
    // Esc / programmatic destroy request: log the dismissal AND actually tear
    // down. driver.js suppresses its own teardown when this hook is overridden —
    // omitting destroy() is what left the box mounted-but-dead (the hang bug).
    // (Backdrop click no longer reaches here — overlayClickBehavior pauses; see
    // pause() — but Esc still does, so this fix stands.)
    onDestroyStarted: () => {
      if (torn) return
      markDismissed()
      destroyDriver()
    },
  }

  const handle = {
    destroy: teardownSilently, pause, resume, togglePause, jumpTo,
    dock, undock, getMode: () => mode, getDockState: () => dockedZone,
    getTier: () => tier,
  }
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
