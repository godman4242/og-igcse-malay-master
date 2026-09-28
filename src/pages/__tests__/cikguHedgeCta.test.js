// @vitest-environment jsdom
//
// GOAL #19 (2026-09-28): Cikgu's Expert "I'm not sure" hedge always said "switch to
// ✨ AI mode … it's free" — a dead end for a signed-out learner with no own key
// (AI refuses them), and nonsense inside the AI-unavailable fallback (AI mode is
// already on and just failed). The KB answers themselves must stay byte-identical.
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
const { setUserOpenRouterKey } = await import('../../lib/openrouter')
const { getExpertResponse } = await import('../../data/cikguKnowledge.js')
const { default: CikguBot } = await import('../CikguBot.jsx')

// Scrapes a low-score peribahasa match below MIN_CONFIDENCE → the hedge.
const OFF_TOPIC = 'What does the peribahasa "harapkan pagar, pagar makan padi" mean?'
const SWITCH_LINE = /switch to \*\*✨ AI\*\* mode/

let root, host
beforeEach(() => {
  useStore.getState().clearCikguHistory()
  // Every AI route fails, so AI mode falls back to the Expert System.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove()
  setUserOpenRouterKey(null)
  vi.unstubAllGlobals()
})

const mount = async (user, { ai = false } = {}) => {
  useStore.setState(s => ({ auth: { ...s.auth, user } }))
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))))
  if (ai) {
    const aiBtn = [...host.querySelectorAll('button')].find(b => /^AI/.test(b.textContent.trim()))
    await act(async () => aiBtn.click())
  }
}
const ask = async (q) => {
  const input = host.querySelector('input[type="text"]')
  const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  await act(async () => { setVal.call(input, q); input.dispatchEvent(new Event('input', { bubbles: true })) })
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
  await vi.waitFor(() => expect(useStore.getState().ai.cikguHistory.at(-1)?.role).toBe('assistant'))
  return useStore.getState().ai.cikguHistory.at(-1).content
}

it('signed out, no own key, Expert mode: the hedge points to sign-in, not to an AI that refuses them', async () => {
  await mount(null)
  const reply = await ask(OFF_TOPIC)
  expect(reply).toMatch(/not sure/i)
  expect(reply).not.toMatch(SWITCH_LINE)
  expect(reply).toMatch(/sign in \(free\)/i)
})

it('signed in, Expert mode: the hedge still offers the free AI tutor (unchanged)', async () => {
  await mount({ id: 'u1', email: 'a@b.c' })
  const reply = await ask(OFF_TOPIC)
  expect(reply).toBe(getExpertResponse(OFF_TOPIC).text)
  expect(reply).toMatch(SWITCH_LINE)
})

it('signed out WITH their own OpenRouter key, Expert mode: AI works for them, so it is still offered', async () => {
  setUserOpenRouterKey('sk-or-test')
  await mount(null)
  expect(await ask(OFF_TOPIC)).toMatch(SWITCH_LINE)
})

it('AI mode, every AI route down: the fallback never says "switch to AI mode" (it is already on)', async () => {
  await mount({ id: 'u1', email: 'a@b.c' }, { ai: true })
  const reply = await ask(OFF_TOPIC)
  expect(reply).toMatch(/AI unavailable — using Expert System/)
  expect(reply).toMatch(/not sure/i)
  expect(reply).not.toMatch(SWITCH_LINE)
  expect(reply).not.toMatch(/sign in/i)
})

it('AI mode signed out with no key: the fallback hedge points to sign-in (the one route that unlocks AI)', async () => {
  await mount(null, { ai: true })
  const reply = await ask(OFF_TOPIC)
  expect(reply).toMatch(/AI unavailable — using Expert System/)
  expect(reply).not.toMatch(SWITCH_LINE)
  expect(reply).toMatch(/sign in \(free\)/i)
})

it('a confident KB answer is byte-identical whatever the caller passes', () => {
  const q = 'Explain the meN- prefix'
  const base = getExpertResponse(q).text
  expect(getExpertResponse(q, { aiHint: 'signin' }).text).toBe(base)
  expect(getExpertResponse(q, { aiHint: 'none' }).text).toBe(base)
})
