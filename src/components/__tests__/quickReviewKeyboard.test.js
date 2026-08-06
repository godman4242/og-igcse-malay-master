// @vitest-environment jsdom
//
// Census A9 (2026-08-06): the Dashboard's Quick Review widget was mouse-only.
//
// The reveal was a bare `<div className="cursor-pointer" onClick={…}>` — no
// role, no tabIndex, no key handler. And because the Again/Good/Easy buttons
// only render once `flipped` is true, a keyboard or switch user could not reach
// the rating controls EITHER: focus skipped the whole widget, so the one
// "study without leaving the Dashboard" affordance was unusable end to end.
//
// Contract pinned: the reveal is reachable by Tab, operable with Enter AND
// Space (both, per WCAG 2.1.1 — a role="button" is expected to answer to both),
// exposes its state via aria-expanded, and once revealed the rating buttons are
// really there to be pressed.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

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

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: QuickReview } = await import('../QuickReview')
const { default: useStore } = await import('../../store/useStore')
const { createNewCardState } = await import('../../lib/fsrs')

const dueCard = () => ({
  m: 'rumah',
  e: 'house',
  t: 'Test',
  lang: 'ms',
  ...createNewCardState(),
  due: new Date(Date.now() - 86400000).toISOString(), // yesterday → due
})

describe('QuickReview is keyboard-operable (census A9)', () => {
  let root, container

  const mount = async () => {
    useStore.setState({ cards: [dueCard()], studyLang: 'ms' })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(
      React.createElement(MemoryRouter, null, React.createElement(QuickReview)),
    ))
  }

  const reveal = () => container.querySelector('[data-testid="quick-review-reveal"]')
  const press = async (key) => {
    await act(async () => {
      reveal().dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }))
    })
  }
  const ratingButtons = () =>
    [...container.querySelectorAll('button')].filter(b => ['Again', 'Good', 'Easy'].includes(b.textContent.trim()))

  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
    root = null
  })

  it('mounts with a due card (guards the fixture)', async () => {
    await mount()
    expect(container.textContent).toContain('rumah')
  })

  it('exposes the reveal to assistive tech and to Tab', async () => {
    await mount()
    const el = reveal()
    expect(el, 'the reveal needs a stable hook').toBeTruthy()
    expect(el.getAttribute('role')).toBe('button')
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.getAttribute('aria-expanded')).toBe('false')
  })

  it('reveals the answer on Enter', async () => {
    await mount()
    await press('Enter')
    expect(container.textContent).toContain('house')
    expect(reveal().getAttribute('aria-expanded')).toBe('true')
  })

  it('reveals the answer on Space too', async () => {
    await mount()
    await press(' ')
    expect(container.textContent).toContain('house')
  })

  it('lets a keyboard user actually reach the rating buttons', async () => {
    await mount()
    expect(ratingButtons(), 'ratings are hidden until revealed — that is the trap').toHaveLength(0)
    await press('Enter')
    expect(ratingButtons()).toHaveLength(3)
  })

  it('gives the pronounce control a real tap target', async () => {
    // It sits inside the newly focusable card, so a 20x20 hit area is a worse
    // trap once the widget is keyboard-reachable than it was before.
    await mount()
    const speakBtn = [...container.querySelectorAll('button')]
      .find(b => b.getAttribute('aria-label') === 'Pronounce rumah')
    expect(speakBtn, 'the pronounce control needs an accessible name').toBeTruthy()
    expect(speakBtn.className).toMatch(/min-w-\[44px\]/)
    expect(speakBtn.className).toMatch(/min-h-\[44px\]/)
  })
})
