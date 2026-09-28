// @vitest-environment jsdom
//
// GOAL #26 (2026-09-28 chaos pass): ask in AI mode, flip to Expert while the AI
// is still thinking, ask again → Expert's instant reply landed first and the AI
// fallback for the FIRST question landed after it, under the wrong question.
import { it, expect, afterEach, beforeEach, vi } from 'vitest'

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
globalThis.IS_REACT_ACT_ENVIRONMENT = true
Element.prototype.scrollIntoView = () => {}

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { default: CikguBot } = await import('../CikguBot.jsx')

let root, host, release
beforeEach(() => {
  useStore.getState().clearCikguHistory()
  // Every AI call hangs until release(), then fails → the Expert fallback.
  const gate = new Promise(r => { release = r })
  vi.stubGlobal('fetch', vi.fn(() => gate.then(() => { throw new Error('offline') })))
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove()
  vi.unstubAllGlobals()
})

const btn = (re) => [...host.querySelectorAll('button')].find(b => re.test(b.textContent.trim()))
const ask = async (q) => {
  const input = host.querySelector('input[type="text"]')
  const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  await act(async () => { setVal.call(input, q); input.dispatchEvent(new Event('input', { bubbles: true })) })
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
}

it('flipping AI → Expert while AI is thinking never puts a reply under the wrong question', async () => {
  useStore.setState(s => ({ auth: { ...s.auth, user: { id: 'u1', email: 'a@b.c' } } }))
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))))
  await act(async () => btn(/^AI/).click())

  await ask('Explain the meN- prefix')
  expect(useStore.getState().ai.cikguHistory.at(-1)?.role).toBe('user') // AI still thinking
  expect(btn(/^Expert/).disabled).toBe(true)

  await act(async () => btn(/^Expert/).click())
  await ask('What is the ber- prefix?')

  await act(async () => { release() })
  await vi.waitFor(() => expect(useStore.getState().ai.cikguHistory.at(-1)?.role).toBe('assistant'))

  // Each question is answered before the next one is asked.
  const roles = useStore.getState().ai.cikguHistory.map(m => m.role)
  expect(roles.join(',')).not.toMatch(/user,user/)
  roles.forEach((r, i) => expect(r).toBe(i % 2 ? 'assistant' : 'user'))
  // Unlocked again once the reply is in — never stuck.
  expect(btn(/^Expert/).disabled).toBe(false)
  expect(btn(/^AI/).disabled).toBe(false)
})
