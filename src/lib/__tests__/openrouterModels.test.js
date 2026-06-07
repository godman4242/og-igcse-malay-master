// Unit suite for OpenRouter free-model discovery: the pure picker (filter/rank
// the live /models response), the cached async resolver with offline fallback,
// and the callOpenRouter wiring that consumes them.
//
// Why this exists: OpenRouter rotates its free-tier model slugs every few months.
// The app used to hardcode 3 slugs (deepseek-r1-0528, llama-4-scout, gemma-3-1b),
// all of which were retired → every AI call 404'd. These tests pin the self-healing
// replacement. See the deck-generator 404 incident, 2026-06-07.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import {
  pickFreeModels, getFreeModels, FALLBACK_FREE_MODELS,
  MODELS_CACHE_KEY, callOpenRouter, setUserOpenRouterKey,
} from '../openrouter.js'

// The vitest env is 'node' (no DOM), so production code wraps every localStorage
// access in try/catch and silently no-ops. These tests need a real store, so
// install a minimal in-memory one.
beforeAll(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
})

// A trimmed shape of the real /api/v1/models response.
const FREE = (id, ctx = 8192, extra = {}) => ({ id, context_length: ctx, pricing: { prompt: '0', completion: '0' }, ...extra })
const PAID = (id, ctx = 8192) => ({ id, context_length: ctx, pricing: { prompt: '0.0000007', completion: '0.0000014' } })

describe('pickFreeModels (pure)', () => {
  it('keeps only models whose prompt AND completion are free', () => {
    const json = { data: [FREE('a/free-1:free'), PAID('b/paid-1'), FREE('c/free-2:free')] }
    const ids = pickFreeModels(json)
    expect(ids).toContain('a/free-1:free')
    expect(ids).toContain('c/free-2:free')
    expect(ids).not.toContain('b/paid-1')
  })

  it('excludes non-chat / unsuitable categories (music, coder, safety, embeddings)', () => {
    const json = { data: [
      FREE('google/lyria-3-pro-preview'),
      FREE('qwen/qwen3-coder:free'),
      FREE('nvidia/nemotron-content-safety:free'),
      FREE('some/text-embedding:free'),
      FREE('meta-llama/llama-3.3-70b-instruct:free'),
    ] }
    const ids = pickFreeModels(json)
    expect(ids).toEqual(['meta-llama/llama-3.3-70b-instruct:free'])
  })

  it('ranks preferred general-instruct families first, then by context length', () => {
    const json = { data: [
      FREE('unknown/big-model:free', 999999),
      FREE('openai/gpt-oss-120b:free', 131072),
      FREE('meta-llama/llama-3.3-70b-instruct:free', 131072),
    ] }
    const ids = pickFreeModels(json, { limit: 3 })
    // llama-3.3-70b is the top preferred pattern, gpt-oss-120b second; the
    // unknown model trails despite its huge context.
    expect(ids[0]).toBe('meta-llama/llama-3.3-70b-instruct:free')
    expect(ids[1]).toBe('openai/gpt-oss-120b:free')
    expect(ids[2]).toBe('unknown/big-model:free')
  })

  it('respects the limit and dedupes', () => {
    const json = { data: [
      FREE('meta-llama/llama-3.3-70b-instruct:free'),
      FREE('meta-llama/llama-3.3-70b-instruct:free'),
      FREE('openai/gpt-oss-120b:free'),
      FREE('z/extra-1:free'),
      FREE('z/extra-2:free'),
    ] }
    const ids = pickFreeModels(json, { limit: 2 })
    expect(ids.length).toBe(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('returns [] for malformed input without throwing', () => {
    expect(pickFreeModels(null)).toEqual([])
    expect(pickFreeModels({})).toEqual([])
    expect(pickFreeModels({ data: 'nope' })).toEqual([])
  })
})

describe('getFreeModels (cached + fallback)', () => {
  beforeEach(() => {
    try { localStorage.removeItem(MODELS_CACHE_KEY) } catch { /* ignore */ }
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns a fresh cache without hitting the network', async () => {
    const now = 1_000_000_000_000
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ ts: now - 1000, ids: ['cached/model:free'] }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const ids = await getFreeModels({ now })
    expect(ids).toEqual(['cached/model:free'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches and caches on a cache miss', async () => {
    const now = 2_000_000_000_000
    const json = { data: [{ id: 'meta-llama/llama-3.3-70b-instruct:free', context_length: 131072, pricing: { prompt: '0', completion: '0' } }] }
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => json }))
    vi.stubGlobal('fetch', fetchMock)

    const ids = await getFreeModels({ now })
    expect(ids).toEqual(['meta-llama/llama-3.3-70b-instruct:free'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const cached = JSON.parse(localStorage.getItem(MODELS_CACHE_KEY))
    expect(cached.ids).toEqual(['meta-llama/llama-3.3-70b-instruct:free'])
    expect(cached.ts).toBe(now)
  })

  it('re-fetches once the cache is older than the TTL', async () => {
    const now = 3_000_000_000_000
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ ts: now - (25 * 60 * 60 * 1000), ids: ['stale/model:free'] }))
    const json = { data: [{ id: 'openai/gpt-oss-120b:free', context_length: 131072, pricing: { prompt: '0', completion: '0' } }] }
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => json }))
    vi.stubGlobal('fetch', fetchMock)

    const ids = await getFreeModels({ now })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(ids).toEqual(['openai/gpt-oss-120b:free'])
  })

  it('falls back to the curated list when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    const ids = await getFreeModels({ now: 4_000_000_000_000 })
    expect(ids).toEqual(FALLBACK_FREE_MODELS)
  })

  it('falls back when the response is non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    const ids = await getFreeModels({ now: 5_000_000_000_000 })
    expect(ids).toEqual(FALLBACK_FREE_MODELS)
  })

  it('the curated fallback contains only currently-valid :free slugs', () => {
    expect(FALLBACK_FREE_MODELS.length).toBeGreaterThan(0)
    for (const id of FALLBACK_FREE_MODELS) expect(id).toMatch(/:free$/)
    // The 3 retired slugs must never reappear in the fallback.
    expect(FALLBACK_FREE_MODELS).not.toContain('google/gemma-3-1b-it:free')
    expect(FALLBACK_FREE_MODELS).not.toContain('meta-llama/llama-4-scout:free')
    expect(FALLBACK_FREE_MODELS).not.toContain('deepseek/deepseek-r1-0528:free')
  })
})

describe('callOpenRouter consumes the discovered model list', () => {
  beforeEach(() => {
    setUserOpenRouterKey('sk-or-test')
    // Seed a fresh cache so getFreeModels resolves offline; fetch then only
    // sees the completions call.
    localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify({ ts: Date.now(), ids: ['live/model-a:free', 'live/model-b:free'] }))
  })
  afterEach(() => {
    setUserOpenRouterKey('')
    try { localStorage.removeItem(MODELS_CACHE_KEY) } catch { /* ignore */ }
    vi.unstubAllGlobals()
  })

  it('uses the first cached model and returns its content', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'hello' } }] }) }))
    vi.stubGlobal('fetch', fetchMock)

    const out = await callOpenRouter({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] })
    expect(out).toBe('hello')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('live/model-a:free')
  })

  it('falls through to the next model when the first 404s (the stale-slug bug)', async () => {
    let call = 0
    const fetchMock = vi.fn(async () => {
      call++
      if (call === 1) return { ok: false, status: 404, text: async () => 'No endpoints found' }
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'second' } }] }) }
    })
    vi.stubGlobal('fetch', fetchMock)

    const out = await callOpenRouter({ systemPrompt: 's', messages: [{ role: 'user', content: 'hi' }] })
    expect(out).toBe('second')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
