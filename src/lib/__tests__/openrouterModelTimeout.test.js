// @vitest-environment jsdom
//
// 2026-09-29 loop review P2-3: Cikgu bounded its whole OpenRouter chain at 25 s, so ONE
// hung free model used the entire budget and the working models behind it never ran.
// Each model now gets its own bound; a hung one is skipped, the learner's Cancel still wins.
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
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
const { callOpenRouter, setUserOpenRouterKey, MODELS_CACHE_KEY } = await import('../openrouter.js')

const tried = []
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  tried.length = 0
  setUserOpenRouterKey('sk-or-test')
  localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ ts: Date.now(), ids: ['slow/free', 'fast/free'] }))
  vi.stubGlobal('fetch', vi.fn((url, opts = {}) => {
    const { model } = JSON.parse(opts.body)
    tried.push(model)
    if (model === 'fast/free') return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: 'Jawapan' } }] })))
    return new Promise((_, rej) => { // hangs until aborted
      const abort = () => rej(new DOMException('aborted', 'AbortError'))
      if (opts.signal?.aborted) abort(); else opts.signal?.addEventListener('abort', abort)
    })
  }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); setUserOpenRouterKey(null) })

const call = (opts) => callOpenRouter({ systemPrompt: 's', messages: [{ role: 'user', content: 'q' }], ...opts })

it('a hung model is skipped after its own bound and the next model answers', async () => {
  const p = call({ modelTimeoutMs: 20_000 })
  await vi.advanceTimersByTimeAsync(20_000)
  await expect(p).resolves.toBe('Jawapan')
  expect(tried).toEqual(['slow/free', 'fast/free'])
})

it("the learner's own cancel still stops the whole chain at once", async () => {
  const stop = new AbortController()
  const p = call({ modelTimeoutMs: 20_000, signal: stop.signal })
  const settled = expect(p).rejects.toMatchObject({ name: 'AbortError' })
  await vi.advanceTimersByTimeAsync(1_000)
  stop.abort()
  await settled
  expect(tried).toEqual(['slow/free'])
})
