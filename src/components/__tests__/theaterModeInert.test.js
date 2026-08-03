// @vitest-environment jsdom
//
// Theater mode a11y (WCAG 2.1 SC 4.1.2 Name/Role/Value, axe rule
// `aria-hidden-focus`): Layout hides the header and the bottom nav during a
// study session with `aria-hidden={theaterMode}` plus CSS that only removes
// them VISUALLY (`opacity-0`, `h-0 overflow-hidden`, `translate-y-full`,
// `pointer-events-none`). None of those remove an element from the TAB ORDER —
// `pointer-events-none` blocks the mouse only, and `overflow:hidden` clips
// without unfocusing. So every button inside stayed keyboard-reachable while
// being stripped from the accessibility tree: a keyboard/switch learner tabbed
// through ~8 controls that are invisible AND unannounced, on every single
// study/roleplay/speaking/writing session (theater mode defaults ON).
//
// The invariant asserted here is the general one rather than "these two
// elements have `inert`", so any FUTURE aria-hidden container in Layout that
// wraps a focusable control fails this test too.
//
// `inert` is the fix: it removes descendants from the tab order AND the
// accessibility tree. React 19 renders it as a real boolean attribute.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, MemoryRouter, Layout, TheaterModeContext
let root, host

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const mem = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)) },
      removeItem: (k) => { mem.delete(k) },
      clear: () => { mem.clear() },
      key: (i) => [...mem.keys()][i] ?? null,
      get length() { return mem.size },
    },
  })
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ MemoryRouter } = await import('react-router-dom'))
  ;({ default: Layout } = await import('../Layout'))
  ;({ TheaterModeContext } = await import('../../contexts/TheaterModeContext'))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const renderLayout = (theaterMode) =>
  act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/study'] },
        React.createElement(
          TheaterModeContext.Provider,
          { value: { theaterMode, setTheaterMode: () => {} } },
          React.createElement(Layout, null, React.createElement('div', null, 'page'))
        )
      )
    )
  )

// Every element that is hidden from assistive tech but still holds a focusable
// descendant — the exact axe `aria-hidden-focus` violation. `inert` exempts it.
const hiddenButFocusable = () =>
  [...host.querySelectorAll('[aria-hidden="true"]')]
    .filter(el => !el.hasAttribute('inert'))
    .flatMap(el => [...el.querySelectorAll(FOCUSABLE)])

describe('Layout theater mode — nothing focusable may hide inside an aria-hidden subtree', () => {
  it('exposes no focusable control inside an aria-hidden container while theater mode is ON', async () => {
    await renderLayout(true)

    const trapped = hiddenButFocusable()
    const describe_ = (el) =>
      `<${el.tagName.toLowerCase()}> ${el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40)}`
    expect(
      trapped.map(describe_),
      'focusable controls stranded inside an aria-hidden subtree'
    ).toEqual([])
  })

  it('marks the header and the bottom nav inert while theater mode is ON', async () => {
    await renderLayout(true)

    expect(host.querySelector('header').hasAttribute('inert')).toBe(true)
    expect(host.querySelector('nav').hasAttribute('inert')).toBe(true)
  })

  it('leaves the header and the bottom nav interactive when theater mode is OFF', async () => {
    await renderLayout(false)

    const header = host.querySelector('header')
    const nav = host.querySelector('nav')
    expect(header.hasAttribute('inert')).toBe(false)
    expect(nav.hasAttribute('inert')).toBe(false)
    expect(header.getAttribute('aria-hidden')).not.toBe('true')
    expect(nav.getAttribute('aria-hidden')).not.toBe('true')
    // The nav's 5 primary destinations stay reachable.
    expect(nav.querySelectorAll('button').length).toBeGreaterThanOrEqual(5)
  })
})
