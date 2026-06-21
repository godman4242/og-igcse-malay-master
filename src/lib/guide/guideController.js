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
import { zoneForPoint, alongEdgeRectForZone, clampBoxSize, DEFAULT_THRESHOLD } from './dragDock'
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

// Tpause★ — the eager GuideHud's "Resume tour" pill calls this to bring a paused,
// un-docked (box-hidden) tour back. The controller chunk is already loaded
// whenever a tour is running, so the HUD lazy-imports this on click (zero eager
// cost). No-op when no tour is active or it's not paused.
export function resumeActiveTour() {
  if (_active && typeof _active.resume === 'function') _active.resume()
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
    if (resizeCleanup) resizeCleanup()
    clearPointerTracking()
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', onPopState)
    }
    // Capture the driver root (driver.js puts `driver-active` on <body>) BEFORE
    // destroy() removes that class, so we clear the free-roam veil-off class off
    // the right element. Else it lingers and a re-opened tour starts undimmed
    // (driver re-adds `driver-active`, re-matching `.driver-active.guide-explore`).
    // Tdim★.
    const freeRoamRoot =
      typeof document !== 'undefined'
        ? document.querySelector('.driver-active') || document.documentElement
        : null
    try { driverObj && driverObj.destroy() } catch { /* idempotent */ }
    freeRoamRoot && freeRoamRoot.classList.remove('guide-explore', 'guide-paused') // Tpause★ — clear both veil-off + chrome-hide
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

  // ── Pause / Explore + Free-roam (Tdim★) ───────────────────────────
  // 'spotlight' = page dimmed + locked (default); 'explore' = veil off (pause),
  // whole page clickable. The box stays live in both.
  let mode = 'spotlight'

  // FREE-ROAM is the backdrop-DIM axis, which is SEPARATE from the box-CHROME
  // (docked/minimized) axis. The dim turns OFF — the whole page becomes
  // interactive + undimmed while the popover (and the page-guide arrow) stay —
  // whenever EITHER the tour is paused (explore) OR the box is docked/minimized
  // (Tdim★: minimizing frees the learner to roam, not follow step-by-step). The
  // dim returns only when spotlight AND undocked. The `guide-explore` CSS class on
  // the driver root is the single switch for both triggers.
  function freeRoam() {
    return mode === 'explore' || dockedZone != null
  }
  function syncFreeRoam() {
    if (typeof document === 'undefined') return
    const root = document.querySelector('.driver-active') || document.documentElement
    root && root.classList.toggle('guide-explore', freeRoam())
  }

  // Tpause★ — pause HIDES the guide chrome (CSS), splitting by minimized state:
  // un-docked → the whole popover box hides (the HUD's Resume pill is the way
  // back); docked → only the explanation hides, the icon strip + N/M jumper stay.
  // This needs its OWN root class (separate from `guide-explore`, which is also on
  // for a docked-but-not-paused box) so CSS can tell "paused" from "free-roam".
  function syncPausedClass() {
    if (typeof document === 'undefined') return
    const root = document.querySelector('.driver-active') || document.documentElement
    root && root.classList.toggle('guide-paused', mode === 'explore')
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
    syncFreeRoam()
    syncPausedClass()                   // hide the chrome (Tpause★)
    setGuideState({ paused: true })     // HUD shows the Resume pill when un-docked
    emitPointer()                       // paused → the page-guide arrow hides too
    updatePauseButton()
    onEv('guide_paused', { tier, stepIndex: active })
  }

  function resume() {
    if (torn || settled || mode === 'spotlight') return
    mode = 'spotlight'
    syncFreeRoam()                      // dim returns only if also undocked (Tdim★)
    syncPausedClass()                   // chrome returns (Tpause★)
    setGuideState({ paused: false })
    updatePauseButton()
    emitPointer()                       // restore the arrow now the box is shown
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
  // Tslide★ — where ALONG the edge the box was dropped (its top-left mid-drag),
  // so it stays put across Next/Back instead of snapping to the edge centre.
  // null ⇒ centred snap (keyboard dock, which has no drop point).
  let dockedOrigin = null
  let dragCleanup = null
  // Tresize★ — the user-chosen box size (PowerPoint-style resize). null ⇒ default
  // (CSS auto/max-width). In-session only — no store, no STORE_VERSION bump; held
  // across Next/Back by re-applying it on every step render (like reapplyDock).
  let boxSize = null
  let resizeCleanup = null

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

  // `origin` (pointer drop) = the box's top-left where it was released → slide it
  // there along the edge (Tslide★). Omitted (keyboard dock) ⇒ centred snap.
  function dock(zone, origin = null) {
    if (torn || settled || !zone) return
    dockedZone = zone
    dockedOrigin = origin
    const pop = popoverEl()
    if (pop) {
      // Apply the docked (minimized) class FIRST so offsetWidth/Height is the
      // SHRUNK box — else the along-edge clamp uses the wide floating width and
      // every off-centre drop collapses to the same spot (Tslide★).
      applyDockClass(zone)
      const box = { width: pop.offsetWidth, height: pop.offsetHeight }
      const { left, top } = alongEdgeRectForZone(zone, box, viewport(), dockedOrigin)
      positionBox(left, top)
    }
    syncFreeRoam()                      // minimized = free-roam: drop the dim (Tdim★)
    setGuideState({ dragging: false, zone: null, docked: zone, announce: `Guide docked to ${ZONE_LABEL[zone]}.` })
    onEv('guide_docked', { tier, stepIndex: active })
  }

  function undock() {
    if (torn || settled || !dockedZone) return
    dockedZone = null
    dockedOrigin = null
    applyDockClass(null)
    syncFreeRoam()                      // un-minimize → dim returns (unless paused)
    setGuideState({ docked: null, announce: 'Guide floating.' })
    onEv('guide_undocked', { tier, stepIndex: active })
  }

  // Double-click to restore (Phase 3b★ / T6 / R5d). Since a docked/minimized box
  // no longer re-expands on hover (T2★), a double-click brings it back: undock
  // (if docked) AND clear any inline drag position so the box returns to its
  // default centred flow position with full labels (the labels are CSS-gated on
  // .guide-docked, which undock removes).
  function restoreDefault() {
    if (torn || settled) return
    if (dockedZone) undock()
    const pop = popoverEl()
    if (!pop) return
    pop.style.left = ''
    pop.style.top = ''
    pop.style.right = ''
    pop.style.bottom = ''
    pop.removeAttribute('data-guide-dragged')
    // Restore = a FULL reset: also clear any PowerPoint resize back to the
    // default CSS size (Tresize★), so a double-click is the one pointer way back
    // to default position AND size.
    boxSize = null
    pop.style.width = ''
    pop.style.height = ''
    pop.style.maxWidth = ''
    pop.removeAttribute('data-guide-resized')
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
    // Docked class FIRST → offsetWidth is the minimized width, so the slide clamp
    // is correct on the freshly re-rendered popover too (Tslide★).
    applyDockClass(dockedZone)
    const box = { width: pop.offsetWidth, height: pop.offsetHeight }
    const { left, top } = alongEdgeRectForZone(dockedZone, box, viewport(), dockedOrigin)
    positionBox(left, top)
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
      if (z) {
        // Dock where the box was released ALONG the edge (Tslide★), not the centre.
        const r = pop.getBoundingClientRect()
        dock(z, { left: r.left, top: r.top })
        return
      }
      dockedZone = null
      dockedOrigin = null
      applyDockClass(null)
      syncFreeRoam()                    // floated free (not docked) → dim returns
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

  // ── Resize (Phase 3b★ / Tresize★) ────────────────────────────────────
  // PowerPoint-style: a corner grip resizes the box (width + height); the chosen
  // size HOLDS across Next/Back (re-applied on every step render, like the dock).
  // Pure clamping lives in dragDock.clampBoxSize; this is the impure DOM glue.

  // Write the held size onto the popover. `maxWidth:none` overrides BOTH the 320px
  // theme cap and the 220px docked cap so the user's chosen width wins in either
  // state (resize works minimized OR floating). No-op until the user resizes.
  function applyBoxSize() {
    const pop = popoverEl()
    if (!pop || !boxSize) return
    pop.style.width = boxSize.width + 'px'
    pop.style.height = boxSize.height + 'px'
    pop.style.maxWidth = 'none'
    pop.setAttribute('data-guide-resized', '')
  }

  // Clamp a requested size and apply it live (no announce — the move loop calls
  // this on every pointermove; announcing each frame would spam the live region).
  function resizeBox(width, height) {
    if (torn || settled) return
    boxSize = clampBoxSize({ width, height }, viewport())
    applyBoxSize()
  }

  function announceSize() {
    if (boxSize) {
      setGuideState({ announce: `Guide resized to ${Math.round(boxSize.width)} by ${Math.round(boxSize.height)} pixels.` })
    }
  }

  // Impure pointer-drag loop for the corner grip. Anchors on the box's current
  // rect so the delta tracks the pointer 1:1; commits one announce on release.
  function startResize(downEvent) {
    if (torn || settled || typeof window === 'undefined') return
    const pop = popoverEl()
    if (!pop) return
    const rect = pop.getBoundingClientRect()
    const startW = rect.width
    const startH = rect.height
    const startX = downEvent.clientX
    const startY = downEvent.clientY
    try { downEvent.target?.setPointerCapture?.(downEvent.pointerId) } catch { /* capture optional */ }

    const onMove = (e) => { resizeBox(startW + (e.clientX - startX), startH + (e.clientY - startY)) }
    const onUp = () => { cleanup(); announceSize() }
    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      resizeCleanup = null
    }
    resizeCleanup = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Keyboard/switch parity: grow/shrink from the current size by a fixed step.
  function keyboardResize(dw, dh) {
    if (torn || settled) return
    const pop = popoverEl()
    if (!pop) return
    const base = boxSize || { width: pop.getBoundingClientRect().width, height: pop.getBoundingClientRect().height }
    resizeBox(base.width + dw, base.height + dh)
    announceSize()
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
    if (mode === 'explore') { setGuideState({ pointer: null }); return } // arrows hide while paused (Tpause★)
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
        onRestore: restoreDefault,
        onResizeStart: startResize,
        onResizeKey: keyboardResize,
        docked: dockedZone,
        canGoDeeper: canGoDeeper(),
        onGoDeeper: goDeeper,
      })
      applyBoxSize()                    // re-apply the held resize first (Tresize★)
      reapplyDock()                     // so the dock measures the resized box
      syncFreeRoam()                    // keep the dim in sync on every step render (Tdim★)
      syncPausedClass()                 // keep the chrome-hide in sync on every step render (Tpause★)
      trackPointer()
      // driver positions the popover (its internal reposition) SYNCHRONOUSLY right
      // AFTER this hook returns, overwriting reapplyDock's inline left/top with the
      // step's spotlight placement. Re-stick the dock on the next frame (after that
      // reposition) so a docked box HOLDS where it was parked along the margin
      // across Next/Back instead of jumping to each step's spotlight (Tslide★).
      if (dockedZone && typeof window !== 'undefined') {
        const raf = typeof window.requestAnimationFrame === 'function'
          ? window.requestAnimationFrame.bind(window)
          : (cb) => setTimeout(cb, 16)
        raf(() => { if (!torn && !settled) { applyBoxSize(); reapplyDock() } })
      }
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
    dock, undock, restoreDefault, getMode: () => mode, getDockState: () => dockedZone,
    isFreeRoam: freeRoam, getTier: () => tier,
    resizeBox, getBoxSize: () => boxSize,   // Tresize★ — automation seam, like dock/getDockState
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
