// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, GuideDockZones
let root, host

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: GuideDockZones } = await import('../GuideDockZones'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('GuideDockZones', () => {
  it('renders all 8 dock zones', async () => {
    await act(async () => { root.render(React.createElement(GuideDockZones, { activeZone: null })) })
    expect(host.querySelectorAll('.guide-dock-zone')).toHaveLength(8)
  })

  it('marks only the active zone with is-active', async () => {
    await act(async () => { root.render(React.createElement(GuideDockZones, { activeZone: 'top' })) })
    expect(host.querySelector('[data-zone="top"]').classList.contains('is-active')).toBe(true)
    expect(host.querySelector('[data-zone="bottom"]').classList.contains('is-active')).toBe(false)
  })
})
