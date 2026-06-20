import { describe, it, expect, vi, afterEach } from 'vitest'
import { startTour, stopActiveTour } from '../guideController'

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

  it('forwards an injected onPopoverRender (React themes the body-level popover)', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const onPopoverRender = vi.fn()
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ onPopoverRender }), driverFactory: factory })
    await handle.ready
    expect(created[0].calls.config.onPopoverRender).toBe(onPopoverRender)
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
})
