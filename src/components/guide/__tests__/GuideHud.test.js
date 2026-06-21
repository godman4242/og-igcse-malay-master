// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, GuideHud, setGuideState, resetGuideState
let root, host

// Poll until a lazy-loaded element appears (the dynamic import resolves across
// several microtasks/macrotasks; one act flush isn't enough). The budget is
// generous (100) because under full-suite PARALLEL load the dynamic import is
// CPU-starved and can need many more ticks than in isolation — too tight a
// budget (was 25) made this flaky in the pre-commit gate, which can spuriously
// block the build loop. The helper early-returns the instant the element
// exists, so a large budget costs nothing on the fast path.
const waitForEl = async (sel, tries = 100) => {
  for (let i = 0; i < tries; i++) {
    if (host.querySelector(sel)) return host.querySelector(sel)
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  }
  return host.querySelector(sel)
}

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: GuideHud } = await import('../GuideHud'))
  ;({ setGuideState, resetGuideState } = await import('../../../lib/guide/guideState'))
  resetGuideState()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  resetGuideState()
})

describe('GuideHud', () => {
  it('renders no dock zones while idle', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    expect(host.querySelector('.guide-dock-zones')).toBe(null)
  })

  it('renders the lazy dock zones once a drag begins', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    await act(async () => { setGuideState({ dragging: true, zone: 'top' }) })
    const zones = await waitForEl('.guide-dock-zones') // lazy GuideDockZones chunk resolves
    expect(zones).toBeTruthy()
    expect(host.querySelector('[data-zone="top"]').classList.contains('is-active')).toBe(true)
  })

  it('announces dock changes via the polite live region', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    await act(async () => { setGuideState({ announce: 'Guide docked to top edge.' }) })
    const live = host.querySelector('[role="status"][aria-live="polite"]')
    expect(live).toBeTruthy()
    expect(live.textContent).toContain('Guide docked to top edge.')
  })

  it('renders the Resume pill only when paused AND not docked (Tpause★)', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    expect(host.querySelector('.guide-resume-fab')).toBe(null)            // idle → no pill
    // Paused & un-docked → the lone way back appears.
    await act(async () => { setGuideState({ paused: true, docked: null }) })
    const fab = host.querySelector('.guide-resume-fab')
    expect(fab).toBeTruthy()
    expect(fab.getAttribute('aria-label')).toMatch(/resume/i)
    // Paused but docked → no pill (the docked icon strip carries its own Resume).
    await act(async () => { setGuideState({ paused: true, docked: 'top' }) })
    expect(host.querySelector('.guide-resume-fab')).toBe(null)
    // Resumed → pill gone.
    await act(async () => { setGuideState({ paused: false, docked: null }) })
    expect(host.querySelector('.guide-resume-fab')).toBe(null)
  })

  it('renders the lazy arrow when a pointer is set', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    await act(async () => {
      setGuideState({ pointer: {
        box: { left: 400, top: 300, width: 200, height: 100 },
        target: { left: 460, top: 600, width: 80, height: 40 },
      } })
    })
    const svg = await waitForEl('svg.guide-pointer') // lazy GuidePointer chunk resolves
    expect(svg).toBeTruthy()
  })
})
