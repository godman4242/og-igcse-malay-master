// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, GuideHud, setGuideState, resetGuideState
let root, host

// Poll until a lazy-loaded element appears. The test first AWAITS the lazy
// chunk's import itself (below), so however slow a CPU-starved full-suite run
// makes that load, only React's few Suspense-retry ticks remain here. Never
// fix a flake by raising this tick count — wait on the real thing instead.
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
    await import('../GuideDockZones') // the same module React.lazy is loading — no tick budget can lose this race
    const zones = await waitForEl('.guide-dock-zones')
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
})
