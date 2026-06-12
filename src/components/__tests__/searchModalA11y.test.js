// @vitest-environment jsdom
//
// F11 — SearchModal is a real dialog for assistive tech:
// role="dialog" + aria-modal="true" + aria-label, Escape closes it, and on
// close focus returns to whatever triggered it (header search button).
//
// SearchModal pulls the zustand store (persist → localStorage), so the
// in-memory Storage shim must be installed BEFORE the store module loads
// (Node 25's bare global localStorage stub throws on setItem) — hence the
// dynamic import inside beforeEach, mirroring authGuardSignInMergeIntegration.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let React, act, createRoot, SearchModal
let root, host, trigger

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
  ;({ default: SearchModal } = await import('../SearchModal'))

  host = document.createElement('div')
  document.body.appendChild(host)
  trigger = document.createElement('button')
  trigger.id = 'search-trigger'
  document.body.appendChild(trigger)
  trigger.focus()
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  trigger.remove()
})

const render = async (el) => act(async () => root.render(el))

describe('SearchModal dialog semantics (F11)', () => {
  it('exposes role="dialog", aria-modal and an accessible name when open', async () => {
    await render(React.createElement(SearchModal, { open: true, onClose: vi.fn() }))
    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBeTruthy()
  })

  it('moves focus inside on open and closes on Escape', async () => {
    const onClose = vi.fn()
    await render(React.createElement(SearchModal, { open: true, onClose }))
    expect(host.contains(document.activeElement)).toBe(true)

    await act(async () => {
      document.activeElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the trigger when it closes', async () => {
    await render(React.createElement(SearchModal, { open: true, onClose: vi.fn() }))
    expect(host.contains(document.activeElement)).toBe(true)
    await render(React.createElement(SearchModal, { open: false, onClose: vi.fn() }))
    expect(document.activeElement).toBe(trigger)
  })
})
