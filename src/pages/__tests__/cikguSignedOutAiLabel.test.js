// @vitest-environment jsdom
//
// 2026-09-28 bug hunt (U6 sibling, GOAL #11): Cikgu Maya's AI mode told a
// signed-out learner "AI Mode (Free via Gemini Flash)" with a "(50)" call count,
// yet /api/gemini and the ai-proxy both refuse without a session — every question
// came back "[AI unavailable]". Only the learner's OWN OpenRouter key works signed out.
import { it, expect, afterEach } from 'vitest'

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
const { setUserOpenRouterKey } = await import('../../lib/openrouter')
const { default: CikguBot } = await import('../CikguBot.jsx')

let root, host
afterEach(async () => {
  await act(async () => root.unmount()); host.remove()
  setUserOpenRouterKey(null)
  useStore.setState(s => ({ auth: { ...s.auth, showModal: false } }))
})

const mountInAiMode = async (user) => {
  useStore.setState(s => ({ auth: { ...s.auth, user } }))
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))))
  const aiBtn = [...host.querySelectorAll('button')].find(b => /^AI/.test(b.textContent.trim()))
  await act(async () => aiBtn.click())
}
const button = (re) => [...host.querySelectorAll('button')].find(b => re.test(b.textContent.trim()))

it('signed out, no own key: no free-AI promise or call count — a sign-in button instead', async () => {
  await mountInAiMode(null)
  expect(host.textContent).not.toMatch(/Gemini|calls remaining|\(\d+\)/)
  const signIn = button(/Sign in/)
  expect(signIn).toBeTruthy()
  await act(async () => signIn.click())
  expect(useStore.getState().auth.showModal).toBe(true)
})

it('signed out WITH their own OpenRouter key: says it runs on OpenRouter (that path works)', async () => {
  setUserOpenRouterKey('sk-or-test')
  await mountInAiMode(null)
  expect(host.textContent).toMatch(/AI Mode \(Free via OpenRouter\)/)
  expect(button(/Sign in/)).toBeFalsy()
})

it('signed in: the Gemini label and call count are shown as before', async () => {
  await mountInAiMode({ id: 'u1', email: 'a@b.c' })
  expect(host.textContent).toMatch(/AI Mode \(Free via Gemini Flash\)/)
  expect(button(/^AI/).textContent).toMatch(/\(\d+\)/)
  expect(button(/Sign in/)).toBeFalsy()
})
