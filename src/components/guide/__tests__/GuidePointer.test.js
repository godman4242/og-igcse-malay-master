// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, GuidePointer
let root, host

const box = { left: 400, top: 300, width: 200, height: 100 }
const target = { left: 460, top: 600, width: 80, height: 40 }

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: GuidePointer } = await import('../GuidePointer'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('GuidePointer', () => {
  it('renders an SVG arrow (path + arrowhead) for a box→target pointer', async () => {
    await act(async () => { root.render(React.createElement(GuidePointer, { pointer: { box, target } })) })
    const svg = host.querySelector('svg.guide-pointer')
    expect(svg).toBeTruthy()
    expect(svg.querySelector('path')).toBeTruthy()        // the line
    expect(svg.querySelector('polygon')).toBeTruthy()     // the arrowhead
    expect(svg.getAttribute('aria-hidden')).toBe('true')  // decorative
  })

  it('renders nothing when the pointer has no target', async () => {
    await act(async () => { root.render(React.createElement(GuidePointer, { pointer: { box, target: null } })) })
    expect(host.querySelector('svg.guide-pointer')).toBe(null)
  })
})
