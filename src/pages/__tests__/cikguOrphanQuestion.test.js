// @vitest-environment jsdom
//
// GOAL #31 (item-26 chaos pass): ask in AI mode, then reload or leave the page
// while the AI is thinking → the question sat unanswered forever, and a late
// reply from the closed page could land under the NEXT question.
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
  useStore.setState(s => ({ auth: { ...s.auth, user: { id: 'u1', email: 'a@b.c' } } }))
  // Every AI call hangs until release(), then fails → the Expert fallback.
  const gate = new Promise(r => { release = r })
  vi.stubGlobal('fetch', vi.fn(() => gate.then(() => { throw new Error('offline') })))
})
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  host?.remove(); root = null
  vi.unstubAllGlobals()
})

const history = () => useStore.getState().ai.cikguHistory
const roles = () => history().map(m => m.role).join(',')
const mount = async () => {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))))
}
const unmount = async () => { await act(async () => root.unmount()); host.remove(); root = null }
const btn = (re) => [...host.querySelectorAll('button')].find(b => re.test(b.textContent.trim()))
const ask = async (q) => {
  const input = host.querySelector('input[type="text"]')
  const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  await act(async () => { setVal.call(input, q); input.dispatchEvent(new Event('input', { bubbles: true })) })
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
}

it('a reload mid-answer: the saved question gets a visible "ask again" reply on the next visit', async () => {
  // What a reload leaves behind: the question persisted, the request died with the page.
  useStore.getState().addCikguMessage({ role: 'user', content: 'Explain the meN- prefix' })
  await mount()
  expect(roles()).toBe('user,assistant')
  expect(history().at(-1).content).toMatch(/not answered/i)
  expect(host.textContent).toMatch(/ask it again/i)
})

it('leaving mid-answer and coming back: no two questions in a row, ever', async () => {
  await mount()
  await act(async () => btn(/^AI/).click())
  await ask('Explain the meN- prefix')
  expect(roles()).toBe('user') // AI still thinking
  await unmount()

  // Back on /cikgu: mode is Expert again, the switch unlocked — the old question is marked.
  await mount()
  expect(roles()).toBe('user,assistant')
  await ask('What is the ber- prefix?')
  expect(roles()).toBe('user,assistant,user,assistant')

  // The closed page's late reply must not land under the new question.
  await act(async () => { release() })
  await new Promise(r => setTimeout(r, 20))
  expect(roles()).toBe('user,assistant,user,assistant')
})

it('a reply that arrives after leaving, before coming back, is kept under its question', async () => {
  await mount()
  await act(async () => btn(/^AI/).click())
  await ask('Explain the meN- prefix')
  await unmount()
  await act(async () => { release() })
  await vi.waitFor(() => expect(roles()).toBe('user,assistant'))
  expect(history().at(-1).content).not.toMatch(/not answered/i)

  await mount()
  expect(roles()).toBe('user,assistant') // nothing re-marked
})
