// @vitest-environment jsdom
//
// GOAL #31 (second half): the mode switch is locked while AI thinks (GOAL #26),
// so a hung own-key OpenRouter or Supabase request kept Cikgu locked until the
// server gave up. Gemini already stops at 25 s; the other two routes now do too.
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

// The Supabase route: a call that hangs until useAI's cancel() aborts it, or
// until the test streams words (supa.stream) / finishes it (supa.resolve).
const supa = vi.hoisted(() => ({ calls: 0, reject: null, resolve: null, stream: null }))
vi.mock('../../lib/ai', async () => {
  const { useState } = await import('react')
  return {
    getRemainingCalls: () => 5,
    useAI: () => {
      const [streamedText, setStreamedText] = useState('')
      supa.stream = setStreamedText
      return {
        isLoading: false,
        streamedText,
        call: () => { supa.calls++; return new Promise((res, rej) => { supa.resolve = res; supa.reject = rej }) },
        cancel: () => supa.reject?.(new Error('Request aborted')),
      }
    },
  }
})

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { setUserOpenRouterKey, MODELS_CACHE_KEY } = await import('../../lib/openrouter')
const { default: CikguBot } = await import('../CikguBot.jsx')

let root, host
const ask = async (q) => {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(CikguBot))))
  await act(async () => btn(/^AI/).click())
  const input = host.querySelector('input[type="text"]')
  const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  await act(async () => { setVal.call(input, q); input.dispatchEvent(new Event('input', { bubbles: true })) })
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
}
const btn = (re) => [...host.querySelectorAll('button')].find(b => re.test(b.textContent.trim()))
const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
const hangFetch = () => vi.stubGlobal('fetch', vi.fn((url, opts = {}) => new Promise((_, rej) => {
  const abort = () => rej(new DOMException('aborted', 'AbortError'))
  if (opts.signal?.aborted) abort()
  else opts.signal?.addEventListener('abort', abort)
})))
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  useStore.getState().clearCikguHistory()
  useStore.setState(s => ({ auth: { ...s.auth, user: { id: 'u1', email: 'a@b.c' } } }))
  supa.calls = 0
  hangFetch() // Every fetch (Gemini, OpenRouter) hangs until its signal aborts.
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  setUserOpenRouterKey(null)
})

it('a hung OpenRouter and a hung Supabase request each give up after 25 s', async () => {
  setUserOpenRouterKey('sk-or-test')
  localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ ts: Date.now(), ids: ['m/free'] }))
  await ask('Explain the meN- prefix')

  await advance(25_000) // Gemini's own bound → on to OpenRouter
  expect(supa.calls).toBe(0)
  await advance(25_000) // OpenRouter gives up → on to Supabase
  expect(supa.calls).toBe(1)
  await advance(25_000) // Supabase gives up → the Expert fallback answers
  const last = useStore.getState().ai.cikguHistory.at(-1)
  expect(last.role).toBe('assistant')
  expect(last.content).toMatch(/AI unavailable/)
  expect(btn(/^Expert/).disabled).toBe(false)
})

it('a Supabase answer that has started streaming is not cut off at 25 s', async () => {
  await ask('Explain the meN- prefix')
  await advance(25_000) // Gemini gives up → Supabase (no OpenRouter key)
  expect(supa.calls).toBe(1)
  await advance(5_000)
  await act(async () => supa.stream('Imbuhan meN- digunakan untuk'))
  await advance(40_000) // well past the 25 s bound, still streaming
  expect(useStore.getState().ai.cikguHistory.at(-1).role).toBe('user')
  await act(async () => supa.resolve({ response: 'Imbuhan meN- digunakan untuk kata kerja aktif.' }))
  expect(useStore.getState().ai.cikguHistory.at(-1).content).toMatch(/kata kerja aktif/)
})
