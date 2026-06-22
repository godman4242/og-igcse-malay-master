import { describe, it, expect, vi, afterEach } from 'vitest'
import { startTour, stopActiveTour, resumeActiveTour } from '../guideController'
import { decoratePopover } from '../popoverDecorations'
import { getGuideState } from '../guideState'

// Decorator is exercised in its own jsdom suite; here we only assert the
// controller's onPopoverRender wrapper CALLS it (and the injected themer).
vi.mock('../popoverDecorations', () => ({ decoratePopover: vi.fn() }))

// The controller is pure infra: driver.js, navigate, and waitForElement are all
// injected so we can drive its step-flow with stubs — no browser, no real lib.
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md §5/Task 3.

function found() { return { nodeType: 1 } }

// Fresh stub driver per startTour; records every call so tests can assert flow.
function driverHarness() {
  const created = []
  const factory = (config) => {
    const calls = { config, drive: [], moveTo: [], destroyed: 0 }
    const inst = {
      drive: (i = 0) => calls.drive.push(i),
      moveTo: (i) => calls.moveTo.push(i),
      moveNext: () => calls.moveTo.push('next'),
      movePrevious: () => calls.moveTo.push('prev'),
      destroy: () => { calls.destroyed += 1 },
      isActive: () => calls.destroyed === 0,
      refresh: () => {},
    }
    created.push({ inst, calls })
    return inst
  }
  return { factory, created }
}

function baseOpts(over = {}) {
  return {
    tier: 'quick',
    navigate: vi.fn(async () => {}),
    waitFor: vi.fn(async () => found()),
    onEvent: vi.fn(),
    getPath: () => '/',
    ...over,
  }
}

afterEach(() => stopActiveTour())

describe('guideController.startTour', () => {
  it('renders the first step via drive() and emits started + first step', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const opts = baseOpts()
    const handle = startTour(steps, { ...opts, driverFactory: factory })
    await handle.ready
    expect(created[0].calls.drive).toEqual([0])
    const events = opts.onEvent.mock.calls.map(c => c[0])
    expect(events[0]).toBe('guide_started')
    expect(events).toContain('guide_step')
  })

  it('same-route next advances immediately without navigating', async () => {
    const steps = [
      { id: 'a', route: '/', selector: '[data-tour="a"]', title: 'A', body: 'a' },
      { id: 'b', route: '/', selector: '[data-tour="b"]', title: 'B', body: 'b' },
    ]
    const { factory, created } = driverHarness()
    const opts = baseOpts()
    const handle = startTour(steps, { ...opts, driverFactory: factory })
    await handle.ready
    opts.navigate.mockClear()
    await created[0].calls.config.onNextClick()
    expect(opts.navigate).not.toHaveBeenCalled()
    expect(created[0].calls.moveTo).toEqual([1])
  })

  it('cross-route next navigates, waits for the target, THEN advances (in order)', async () => {
    const steps = [
      { id: 'a', route: '/', selector: '[data-tour="a"]', title: 'A', body: 'a' },
      { id: 'b', route: '/study', selector: '[data-tour="b"]', title: 'B', body: 'b' },
    ]
    const order = []
    const navigate = vi.fn(async (r) => { order.push('nav:' + r) })
    const waitFor = vi.fn(async (s) => { order.push('wait:' + s); return found() })
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ navigate, waitFor }), driverFactory: factory })
    await handle.ready
    order.length = 0
    await created[0].calls.config.onNextClick()
    expect(order).toEqual(['nav:/study', 'wait:[data-tour="b"]'])
    expect(navigate).toHaveBeenCalledWith('/study')
    expect(created[0].calls.moveTo).toEqual([1])
  })

  it('skips a step whose target never mounts — never dead-ends', async () => {
    const steps = [
      { id: 'a', route: '/', title: 'A', body: 'a' }, // modal
      { id: 'b', route: '/', selector: '[data-tour="missing"]', title: 'B', body: 'b' },
      { id: 'c', route: '/', selector: '[data-tour="c"]', title: 'C', body: 'c' },
    ]
    const waitFor = vi.fn(async (s) => (s.includes('missing') ? null : found()))
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ waitFor }), driverFactory: factory })
    await handle.ready
    expect(created[0].calls.drive).toEqual([0])
    await created[0].calls.config.onNextClick()
    expect(created[0].calls.moveTo).toEqual([2]) // index 1 skipped
  })

  it('destroy() tears down the driver and cancels a pending advance', async () => {
    const steps = [
      { id: 'a', route: '/', title: 'A', body: 'a' },
      { id: 'b', route: '/', selector: '[data-tour="b"]', title: 'B', body: 'b' },
    ]
    let release
    const waitFor = vi.fn(() => new Promise(r => { release = r }))
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ waitFor }), driverFactory: factory })
    await handle.ready
    const pending = created[0].calls.config.onNextClick()
    handle.destroy()
    expect(created[0].calls.destroyed).toBe(1)
    release(found())
    await pending
    expect(created[0].calls.moveTo).toEqual([]) // never advanced after destroy
  })

  it('starting a new tour destroys the active one first', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const h1 = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await h1.ready
    const h2 = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await h2.ready
    expect(created[0].calls.destroyed).toBe(1)
    expect(created.length).toBe(2)
  })

  it('emits started/step/completed carrying ONLY tier + stepIndex (no user content)', async () => {
    const steps = [
      { id: 'a', route: '/', title: 'Hello', body: 'secret body text' },
      { id: 'b', route: '/', title: 'Bye', body: 'more secret' },
    ]
    const onEvent = vi.fn()
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    await created[0].calls.config.onNextClick() // → step 1
    await created[0].calls.config.onNextClick() // → past end → completed
    const events = onEvent.mock.calls.map(c => ({ name: c[0], payload: c[1] }))
    expect(events[0]).toEqual({ name: 'guide_started', payload: { tier: 'quick' } })
    expect(events).toContainEqual({ name: 'guide_step', payload: { tier: 'quick', stepIndex: 0 } })
    expect(events).toContainEqual({ name: 'guide_step', payload: { tier: 'quick', stepIndex: 1 } })
    expect(events.at(-1)).toEqual({ name: 'guide_completed', payload: { tier: 'quick' } })
    const blob = JSON.stringify(events)
    expect(blob).not.toContain('secret')
    expect(blob).not.toContain('Hello')
  })

  it('closing mid-tour emits guide_dismissed with the current step index, and destroys', async () => {
    const steps = [
      { id: 'a', route: '/', title: 'A', body: 'a' },
      { id: 'b', route: '/', selector: '[data-tour="b"]', title: 'B', body: 'b' },
    ]
    const onEvent = vi.fn()
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ tier: 'full', onEvent }), driverFactory: factory })
    await handle.ready
    await created[0].calls.config.onNextClick() // → step 1
    created[0].calls.config.onCloseClick()
    const events = onEvent.mock.calls.map(c => ({ name: c[0], payload: c[1] }))
    expect(events.at(-1)).toEqual({ name: 'guide_dismissed', payload: { tier: 'full', stepIndex: 1 } })
    expect(created[0].calls.destroyed).toBe(1)
  })

  it('passes animate:false under reduced-motion and the guide-theme popover class', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ prefersReducedMotion: true }), driverFactory: factory })
    await handle.ready
    expect(created[0].calls.config.animate).toBe(false)
    expect(created[0].calls.config.popoverClass).toBe('guide-theme')
  })

  it('onPopoverRender wrapper calls the injected themer AND decorates the popover', async () => {
    decoratePopover.mockClear()
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const onPopoverRender = vi.fn()
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ onPopoverRender }), driverFactory: factory })
    await handle.ready
    const wrapped = created[0].calls.config.onPopoverRender
    expect(typeof wrapped).toBe('function')
    wrapped({ any: 'popover' }, {})            // invoke as driver.js would
    expect(onPopoverRender).toHaveBeenCalled() // React themer still runs
    expect(decoratePopover).toHaveBeenCalled() // our controls get injected
  })

  it('REGRESSION: onDestroyStarted actually destroys the driver (no dead box)', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    // Simulate a backdrop/Esc destroy request the way driver.js would.
    created[0].calls.config.onDestroyStarted()
    expect(created[0].calls.destroyed).toBe(1)          // was 0 → the hang
    const names = onEvent.mock.calls.map(c => c[0])
    expect(names).toContain('guide_dismissed')
  })

  it('pause()/resume() toggle explore mode + emit telemetry; pause is idempotent', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    expect(handle.getMode()).toBe('spotlight')
    handle.pause()
    expect(handle.getMode()).toBe('explore')
    handle.pause()                       // idempotent — no second event
    handle.resume()
    expect(handle.getMode()).toBe('spotlight')
    const names = onEvent.mock.calls.map(c => c[0])
    expect(names.filter(n => n === 'guide_paused')).toHaveLength(1)
    expect(names.filter(n => n === 'guide_resumed')).toHaveLength(1)
  })

  it('overlayClickBehavior PAUSES (never closes) — backdrop click cannot kill the box', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    expect(typeof created[0].calls.config.overlayClickBehavior).toBe('function')
    created[0].calls.config.overlayClickBehavior()
    expect(handle.getMode()).toBe('explore')
    expect(created[0].calls.destroyed).toBe(0)    // did NOT close
  })

  it('jumpTo(n) lands on step n (1-based), navigating its route', async () => {
    const steps = [
      { id: 'a', route: '/', title: 'A', body: 'a' },
      { id: 'b', route: '/study', selector: '[data-tour="b"]', title: 'B', body: 'b' },
      { id: 'c', route: '/grammar', selector: '[data-tour="c"]', title: 'C', body: 'c' },
    ]
    const navigate = vi.fn(async () => {})
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ navigate }), driverFactory: factory })
    await handle.ready
    await handle.jumpTo(3)                         // → index 2
    expect(navigate).toHaveBeenCalledWith('/grammar')
    expect(created[0].calls.moveTo).toEqual([2])
  })

  it('jumpTo ignores out-of-range / non-numeric values', async () => {
    const steps = [
      { id: 'a', route: '/', title: 'A', body: 'a' },
      { id: 'b', route: '/', selector: '[data-tour="b"]', title: 'B', body: 'b' },
    ]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    await handle.jumpTo(99)
    await handle.jumpTo(0)
    await handle.jumpTo('x')
    expect(created[0].calls.moveTo).toEqual([])
  })

  it('jumpTo while paused returns to spotlight mode', async () => {
    const steps = [
      { id: 'a', route: '/', title: 'A', body: 'a' },
      { id: 'b', route: '/', selector: '[data-tour="b"]', title: 'B', body: 'b' },
    ]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    handle.pause()
    await handle.jumpTo(2)
    expect(handle.getMode()).toBe('spotlight')
  })

  it('dock(zone) records the dock, emits guide_docked, and updates guideState', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    expect(handle.getDockState()).toBe(null)
    handle.dock('top')
    expect(handle.getDockState()).toBe('top')
    expect(getGuideState().docked).toBe('top')
    expect(onEvent.mock.calls.map((c) => c[0])).toContain('guide_docked')
  })

  it('undock() clears the dock and emits guide_undocked', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    handle.dock('br')
    handle.undock()
    expect(handle.getDockState()).toBe(null)
    expect(getGuideState().docked).toBe(null)
    expect(onEvent.mock.calls.map((c) => c[0])).toContain('guide_undocked')
  })

  it('dock(null) / dock after teardown are no-ops', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    handle.dock(null)
    expect(handle.getDockState()).toBe(null)
    handle.destroy()
    handle.dock('top')
    expect(handle.getDockState()).toBe(null)
  })

  it('teardown resets the guideState HUD (dragging/docked cleared)', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    handle.dock('left')
    expect(getGuideState().docked).toBe('left')
    handle.destroy()
    expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '', pointer: null, paused: false })
  })

  it('onPopoverRender wrapper passes drag/dock callbacks to decoratePopover', async () => {
    decoratePopover.mockClear()
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
    const arg = decoratePopover.mock.calls.at(-1)[1]
    expect(typeof arg.onDragStart).toBe('function')
    expect(typeof arg.onDock).toBe('function')
  })

  it('restoreDefault() undocks, clears the dock state, and is exposed on the handle (T6)', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    handle.dock('top')
    expect(handle.getDockState()).toBe('top')
    expect(typeof handle.restoreDefault).toBe('function')
    handle.restoreDefault()
    expect(handle.getDockState()).toBe(null)
    expect(getGuideState().docked).toBe(null)
    expect(onEvent.mock.calls.map((c) => c[0])).toContain('guide_undocked')
  })

  it('onPopoverRender wrapper passes onRestore to decoratePopover (T6)', async () => {
    decoratePopover.mockClear()
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
    expect(typeof decoratePopover.mock.calls.at(-1)[1].onRestore).toBe('function')
  })

  it('keyboard dock toggles: re-pressing the same edge floats the box', async () => {
    decoratePopover.mockClear()
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
    const onDock = decoratePopover.mock.calls.at(-1)[1].onDock
    onDock('top')
    expect(handle.getDockState()).toBe('top')
    onDock('top') // same edge again → float
    expect(handle.getDockState()).toBe(null)
  })

  // ── Tdim★ — Minimize = FREE-ROAM. The backdrop-dim axis is SEPARATE from the
  // box-chrome axis: free-roam (driver's dim off, whole page interactive) is on
  // whenever the tour is paused (explore) OR the box is docked/minimized; the dim
  // returns only when spotlight AND undocked. This suite runs in the `node` env
  // (the controller guards all DOM access), so we assert the derived predicate via
  // the handle; the actual `guide-explore` DOM toggle is pinned in the e2e.
  it('Tdim★: docking puts the box in free-roam; undock returns to dimmed spotlight', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    expect(handle.isFreeRoam()).toBe(false) // spotlight + undocked by default
    handle.dock('top')
    expect(handle.isFreeRoam()).toBe(true)  // minimized = free-roam (dim off)
    handle.undock()
    expect(handle.isFreeRoam()).toBe(false) // un-minimize → dim returns
  })

  it('Tdim★: resuming while docked keeps free-roam ON (the docked dim is independent of pause)', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    handle.dock('top')   // free-roam via minimize
    handle.pause()       // also free-roam via explore
    handle.resume()      // back to spotlight MODE, but still docked → dim stays off
    expect(handle.isFreeRoam()).toBe(true)
    handle.undock()      // now spotlight AND undocked → dim finally returns
    expect(handle.isFreeRoam()).toBe(false)
  })

  // Tpause★ — pausing publishes `paused` to guideState so the eager HUD can show
  // the lone "Resume tour" pill (the only way back once the box is CSS-hidden);
  // resume clears it; teardown resets it.
  it('Tpause★: pause sets guideState.paused, resume clears it, teardown resets it', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    expect(getGuideState().paused).toBe(false)
    handle.pause()
    expect(getGuideState().paused).toBe(true)
    handle.resume()
    expect(getGuideState().paused).toBe(false)
    handle.pause()
    expect(getGuideState().paused).toBe(true)
    stopActiveTour()                       // teardown
    expect(getGuideState().paused).toBe(false)
  })

  // Tpause★ — the eager HUD's Resume pill calls this module seam (the controller
  // chunk is already loaded when a tour runs), so it must resume the active tour.
  it('Tpause★: resumeActiveTour() resumes the active tour from explore mode', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    handle.pause()
    expect(handle.getMode()).toBe('explore')
    resumeActiveTour()
    expect(handle.getMode()).toBe('spotlight')
    expect(getGuideState().paused).toBe(false)
  })

  it('a non-page tour never sets guideState.pointer', async () => {
    const steps = [{ id: 'a', route: '/', selector: '[data-tour="a"]', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ tier: 'quick' }), driverFactory: factory })
    await handle.ready
    created[0].calls.config.onPopoverRender({ wrapper: {} }, {}) // render a step
    expect(getGuideState().pointer).toBe(null)
  })

  it('exposes the tier on the handle so the page-guide branch is testable', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ tier: 'page' }), driverFactory: factory })
    await handle.ready
    expect(handle.getTier()).toBe('page')
  })

  // ── In-box ▶ "go deeper" (Phase 3b / R2) ──────────────────────────────
  describe('go deeper (in-box ▶)', () => {
    it('passes canGoDeeper=true to the decorator on a route that HAS a page guide', async () => {
      decoratePopover.mockClear()
      const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
      const { factory, created } = driverHarness()
      const handle = startTour(steps, { ...baseOpts({ getPath: () => '/' }), driverFactory: factory, onGoDeeper: vi.fn() })
      await handle.ready
      created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
      const arg = decoratePopover.mock.calls.at(-1)[1]
      expect(arg.canGoDeeper).toBe(true)
      expect(typeof arg.onGoDeeper).toBe('function')
    })

    it('passes canGoDeeper=false on a route with NO page guide', async () => {
      decoratePopover.mockClear()
      // /grammar has no page guide (PAGE_GUIDE_ROUTES = '/', '/pdf-reader', '/study').
      const steps = [{ id: 'a', route: '/grammar', title: 'A', body: 'a' }]
      const { factory, created } = driverHarness()
      const handle = startTour(steps, { ...baseOpts({ getPath: () => '/grammar' }), driverFactory: factory, onGoDeeper: vi.fn() })
      await handle.ready
      created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
      expect(decoratePopover.mock.calls.at(-1)[1].canGoDeeper).toBe(false)
    })

    it('passes canGoDeeper=false when no onGoDeeper is injected', async () => {
      decoratePopover.mockClear()
      const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
      const { factory, created } = driverHarness()
      const handle = startTour(steps, { ...baseOpts({ getPath: () => '/' }), driverFactory: factory })
      await handle.ready
      created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
      expect(decoratePopover.mock.calls.at(-1)[1].canGoDeeper).toBe(false)
    })

    it('goDeeper tears down the tour first, then calls onGoDeeper(route) on a microtask', async () => {
      decoratePopover.mockClear()
      const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
      const { factory, created } = driverHarness()
      const onGoDeeper = vi.fn()
      const handle = startTour(steps, { ...baseOpts({ getPath: () => '/' }), driverFactory: factory, onGoDeeper })
      await handle.ready
      created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
      const goDeeper = decoratePopover.mock.calls.at(-1)[1].onGoDeeper
      goDeeper()
      expect(created[0].calls.destroyed).toBe(1) // old tour torn down synchronously
      expect(onGoDeeper).not.toHaveBeenCalled()  // start deferred to a microtask
      await Promise.resolve()
      expect(onGoDeeper).toHaveBeenCalledWith('/')
    })
  })
})
