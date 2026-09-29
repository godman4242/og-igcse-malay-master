// @vitest-environment jsdom
//
// 2026-09-28 bug hunt U6: AI roleplay runs only through the ai-proxy, which needs
// a signed-in account — yet a signed-out learner saw "AI Roleplay available — 50
// calls remaining today" and an "AI Practice" button, and only learned otherwise
// after typing a reply ("Sign in to use AI roleplay"). Tell the truth up front.
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

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { default: Roleplay } = await import('../Roleplay.jsx')

let root, host
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

const mount = async (user) => {
  useStore.setState(s => ({ auth: { ...s.auth, user } }))
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Roleplay))))
}

it('signed out: no "calls remaining" promise and no AI Practice button — a sign-in note instead', async () => {
  await mount(null)
  expect(host.textContent).not.toMatch(/calls remaining/)
  expect([...host.querySelectorAll('button')].some(b => /AI Practice/.test(b.textContent))).toBe(false)
  expect(host.textContent).toMatch(/Sign in/)
})

it('signed in: the AI banner and AI Practice are offered as before', async () => {
  await mount({ id: 'u1', email: 'a@b.c' })
  expect(host.textContent).toMatch(/calls remaining today/)
  expect([...host.querySelectorAll('button')].some(b => /AI Practice/.test(b.textContent))).toBe(true)
})

// Older-#8 follow-up: out of calls, Roleplay said "Add your own free key →" — but
// Roleplay's AI is the ai-proxy's shared daily cap only; a learner's own key never
// reaches it, so adding one changed nothing. Say when AI is back instead.
it('signed in, out of calls: no "add your own key" promise — AI is back tomorrow', async () => {
  const { getTodayISO } = await import('../../lib/localDay')
  localStorage.setItem('igcse-ai-daily', JSON.stringify({ count: 50, date: getTodayISO() }))
  await mount({ id: 'u1', email: 'a@b.c' })
  localStorage.removeItem('igcse-ai-daily')
  expect(host.textContent).not.toMatch(/your own.*key/i)
  expect(host.textContent).toMatch(/back tomorrow/i)
  expect([...host.querySelectorAll('button')].some(b => /AI Practice/.test(b.textContent))).toBe(false)
})
