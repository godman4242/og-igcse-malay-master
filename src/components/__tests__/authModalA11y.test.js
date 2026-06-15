// @vitest-environment jsdom
//
// AuthModal — the sign-in / "Save Your Progress" overlay must be a real dialog
// for assistive tech (parity with SearchModal / WordFamilyTree / GuideOffer):
// role="dialog" + aria-modal="true" + an accessible name, and Escape closes it.
//
// AuthModal is store-driven (auth.showModal) and early-returns unless
// SUPABASE_CONFIG.enabled — so we mock the config to enabled, install the
// localStorage shim before the store loads (Node 25's bare stub throws on
// setItem), and flip showModal via the real store action.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../config/supabaseConfig', () => ({
  SUPABASE_CONFIG: { enabled: true, url: 'https://example.supabase.co', key: 'anon-test-key' },
}))

let React, act, createRoot, AuthModal, useStore
let root, host

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
  ;({ default: useStore } = await import('../../store/useStore'))
  ;({ default: AuthModal } = await import('../AuthModal'))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => { useStore.getState().hideAuthModal() })
  await act(async () => root.unmount())
  host.remove()
})

const render = async (el) => act(async () => root.render(el))
const open = async () => act(async () => { useStore.getState().showAuthModal() })

describe('AuthModal dialog semantics', () => {
  it('exposes role="dialog", aria-modal and a resolvable accessible name when open', async () => {
    await render(React.createElement(AuthModal))
    await open()

    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')

    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const labelEl = host.querySelector('#' + labelId)
    expect(labelEl).toBeTruthy()
    expect(labelEl.textContent.trim().length).toBeGreaterThan(0)
  })

  it('closes on Escape (WCAG 2.1.2 / app dialog convention)', async () => {
    await render(React.createElement(AuthModal))
    await open()
    expect(useStore.getState().auth.showModal).toBe(true)
    // the modal content is rendered (stable close-button anchor)
    expect(host.querySelector('[aria-label="Close sign-in modal"]')).toBeTruthy()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(useStore.getState().auth.showModal).toBe(false)
  })
})
