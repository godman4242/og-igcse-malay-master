// Unit suite for the Gemini BYOK instruct adapter: key slot, request shaping,
// response parsing, model discovery (cached, fallback), the native-endpoint
// call, and the auth-only key verify.
//
// CRITICAL (spec R1): the adapter calls the NATIVE generateContent endpoint
// with the key in the x-goog-api-key HEADER. The OpenAI-compat endpoint
// CORS-fails in browsers, and keys never belong in URLs. The user's BYOK key
// must NEVER touch our /api/gemini proxy.
// Spec: docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md
// Plan: docs/superpowers/plans/2026-06-10-multi-provider-instruct-router.md (Task 1)

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import {
  setUserGeminiKey, getUserGeminiKey, hasUserGeminiKey,
  buildGeminiRequest, parseGeminiResponse,
  pickGeminiModels, getGeminiModels,
  callGeminiByok, verifyGeminiKey,
  GEMINI_MODELS_CACHE_KEY, FALLBACK_GEMINI_MODELS,
  geminiAdapter,
} from '../gemini.js'

// The vitest env is 'node' (no DOM): install a minimal in-memory localStorage,
// same pattern as openrouterModels.test.js.
beforeAll(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
})

beforeEach(() => {
  setUserGeminiKey('')
  try { localStorage.removeItem(GEMINI_MODELS_CACHE_KEY) } catch { /* ignore */ }
})
afterEach(() => { vi.unstubAllGlobals() })

describe('gemini user-key slot', () => {
  it('stores and reflects a user key', () => {
    expect(hasUserGeminiKey()).toBe(false)
    setUserGeminiKey('AIzaTest')
    expect(hasUserGeminiKey()).toBe(true)
    expect(getUserGeminiKey()).toBe('AIzaTest')
  })

  it('trims whitespace and clears on empty/whitespace input', () => {
    setUserGeminiKey('  AIzaSpaced  ')
    expect(getUserGeminiKey()).toBe('AIzaSpaced')
    setUserGeminiKey('   ')
    expect(hasUserGeminiKey()).toBe(false)
    expect(getUserGeminiKey()).toBe(null)
  })

  it('persists to its own localStorage slot (never the Zustand store)', () => {
    setUserGeminiKey('AIzaPersist')
    expect(localStorage.getItem('igcse-gemini-key')).toBe('AIzaPersist')
    setUserGeminiKey('')
    expect(localStorage.getItem('igcse-gemini-key')).toBe(null)
  })

  it('keeps the in-memory value when localStorage throws (private mode)', () => {
    const real = globalThis.localStorage
    globalThis.localStorage = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    }
    try {
      setUserGeminiKey('AIzaPrivate')
      expect(getUserGeminiKey()).toBe('AIzaPrivate')
      expect(hasUserGeminiKey()).toBe(true)
    } finally {
      globalThis.localStorage = real
    }
  })
})

describe('buildGeminiRequest (pure)', () => {
  it('maps assistant→model and everything else→user in contents', () => {
    const body = buildGeminiRequest({
      systemPrompt: '',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'tool', content: 'weird' },
      ],
    })
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'hello' }] },
      { role: 'user', parts: [{ text: 'weird' }] },
    ])
  })

  it('sets systemInstruction only when a systemPrompt is given', () => {
    const withSys = buildGeminiRequest({ systemPrompt: 'be brief', messages: [] })
    expect(withSys.systemInstruction).toEqual({ parts: [{ text: 'be brief' }] })
    const noSys = buildGeminiRequest({ systemPrompt: '', messages: [] })
    expect(noSys.systemInstruction).toBeUndefined()
  })

  it('carries maxTokens into generationConfig.maxOutputTokens', () => {
    const body = buildGeminiRequest({ systemPrompt: 's', messages: [], maxTokens: 220 })
    expect(body.generationConfig.maxOutputTokens).toBe(220)
  })
})

describe('parseGeminiResponse (pure)', () => {
  it('joins all text parts of the first candidate', () => {
    const json = { candidates: [{ content: { parts: [{ text: 'Ayat ' }, { text: 'mudah.' }] } }] }
    expect(parseGeminiResponse(json)).toBe('Ayat mudah.')
  })

  it('throws cause "empty" on missing/empty candidates (safety block shape)', () => {
    for (const json of [null, {}, { candidates: [] }, { candidates: [{ content: { parts: [] } }] }, { promptFeedback: { blockReason: 'SAFETY' } }]) {
      let err = null
      try { parseGeminiResponse(json) } catch (e) { err = e }
      expect(err, JSON.stringify(json)).toBeTruthy()
      expect(err.cause).toBe('empty')
    }
  })
})

// A trimmed shape of the real ListModels response.
const MODEL = (name, methods = ['generateContent']) => ({ name, supportedGenerationMethods: methods })

describe('pickGeminiModels (pure)', () => {
  it('keeps generateContent-supporting flash models, strips the models/ prefix', () => {
    const json = { models: [
      MODEL('models/gemini-3.5-flash'),
      MODEL('models/gemini-3.5-pro'),                      // not flash
      MODEL('models/gemini-2.5-flash', ['embedContent']),  // wrong method
    ] }
    expect(pickGeminiModels(json)).toEqual(['gemini-3.5-flash'])
  })

  it('excludes non-text flash variants (tts/image/live/audio/embedding)', () => {
    const json = { models: [
      MODEL('models/gemini-3.5-flash-preview-tts'),
      MODEL('models/gemini-3.5-flash-image'),
      MODEL('models/gemini-3.5-flash-live'),
      MODEL('models/gemini-3.5-flash-native-audio'),
      MODEL('models/gemini-3.5-flash'),
    ] }
    expect(pickGeminiModels(json)).toEqual(['gemini-3.5-flash'])
  })

  it('dedupes, caps, and puts newer versions first', () => {
    const json = { models: [
      MODEL('models/gemini-2.5-flash'),
      MODEL('models/gemini-3.5-flash'),
      MODEL('models/gemini-3.5-flash'),
      MODEL('models/gemini-3.5-flash-lite'),
      MODEL('models/gemini-2.5-flash-lite'),
    ] }
    const ids = pickGeminiModels(json)
    expect(ids.length).toBeLessThanOrEqual(3)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe('gemini-3.5-flash')
  })

  it('returns [] for malformed input without throwing', () => {
    expect(pickGeminiModels(null)).toEqual([])
    expect(pickGeminiModels({})).toEqual([])
    expect(pickGeminiModels({ models: 'nope' })).toEqual([])
  })
})

describe('getGeminiModels (cached + fallback)', () => {
  beforeEach(() => { setUserGeminiKey('AIzaTest') })

  it('returns a fresh (<24h) cache without hitting the network', async () => {
    const now = 1_000_000_000_000
    localStorage.setItem(GEMINI_MODELS_CACHE_KEY, JSON.stringify({ ts: now - 1000, ids: ['gemini-cached-flash'] }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await getGeminiModels({ now })).toEqual(['gemini-cached-flash'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches with the key header and caches on a miss', async () => {
    const now = 2_000_000_000_000
    const json = { models: [MODEL('models/gemini-3.5-flash')] }
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => json }))
    vi.stubGlobal('fetch', fetchMock)

    const ids = await getGeminiModels({ now })
    expect(ids).toEqual(['gemini-3.5-flash'])
    const [url, opts] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('generativelanguage.googleapis.com/v1beta/models')
    expect(opts.headers['x-goog-api-key']).toBe('AIzaTest')
    expect(String(url)).not.toContain('AIzaTest') // key never in the URL
    const cached = JSON.parse(localStorage.getItem(GEMINI_MODELS_CACHE_KEY))
    expect(cached.ids).toEqual(['gemini-3.5-flash'])
    expect(cached.ts).toBe(now)
  })

  it('re-fetches once the cache is older than 24h', async () => {
    const now = 3_000_000_000_000
    localStorage.setItem(GEMINI_MODELS_CACHE_KEY, JSON.stringify({ ts: now - (25 * 60 * 60 * 1000), ids: ['stale-flash'] }))
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ models: [MODEL('models/gemini-3.5-flash')] }) }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await getGeminiModels({ now })).toEqual(['gemini-3.5-flash'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to gemini-3.5-flash when the fetch fails or returns garbage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down') }))
    expect(await getGeminiModels({ now: 4_000_000_000_000 })).toEqual(FALLBACK_GEMINI_MODELS)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ junk: true }) })))
    expect(await getGeminiModels({ now: 4_000_000_000_001 })).toEqual(FALLBACK_GEMINI_MODELS)
    expect(FALLBACK_GEMINI_MODELS).toEqual(['gemini-3.5-flash'])
  })

  it('propagates AbortError instead of swallowing it into the fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('Aborted', 'AbortError') }))
    await expect(getGeminiModels({ now: 5_000_000_000_000 })).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('callGeminiByok', () => {
  const seedModels = () => localStorage.setItem(GEMINI_MODELS_CACHE_KEY, JSON.stringify({ ts: Date.now(), ids: ['gemini-3.5-flash'] }))
  const ARGS = { systemPrompt: 'sys', messages: [{ role: 'user', content: 'ayat' }], maxTokens: 220 }

  it('POSTs the NATIVE generateContent endpoint with the key in the header, never the URL', async () => {
    setUserGeminiKey('AIzaCall')
    seedModels()
    const fetchMock = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Ayat mudah.' }] } }] }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(callGeminiByok(ARGS)).resolves.toBe('Ayat mudah.')
    const [url, opts] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent')
    expect(opts.method).toBe('POST')
    expect(opts.headers['x-goog-api-key']).toBe('AIzaCall')
    expect(String(url)).not.toContain('AIzaCall')
    expect(String(url)).not.toContain('key=')
    const body = JSON.parse(opts.body)
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'sys' }] })
    expect(body.generationConfig.maxOutputTokens).toBe(220)
  })

  it('never touches our /api/gemini proxy', async () => {
    setUserGeminiKey('AIzaCall')
    seedModels()
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'x' }] } }] }) }))
    vi.stubGlobal('fetch', fetchMock)
    await callGeminiByok(ARGS)
    for (const [url] of fetchMock.mock.calls) {
      expect(String(url)).not.toContain('/api/gemini')
    }
  })

  it('throws cause "no_key" without hitting the network when no key is set', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(callGeminiByok(ARGS)).rejects.toMatchObject({ cause: 'no_key' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps 429 → cause "quota"', async () => {
    setUserGeminiKey('AIzaCall')
    seedModels()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, text: async () => 'quota exceeded' })))
    await expect(callGeminiByok(ARGS)).rejects.toMatchObject({ cause: 'quota', status: 429 })
  })

  it('maps other non-ok → cause "http", network failures → "network", empty body → "empty"', async () => {
    setUserGeminiKey('AIzaCall')
    seedModels()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })))
    await expect(callGeminiByok(ARGS)).rejects.toMatchObject({ cause: 'http', status: 500 })

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(callGeminiByok(ARGS)).rejects.toMatchObject({ cause: 'network' })

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [] }) })))
    await expect(callGeminiByok(ARGS)).rejects.toMatchObject({ cause: 'empty' })
  })

  it('propagates AbortError raw (no wrapping, no cause)', async () => {
    setUserGeminiKey('AIzaCall')
    seedModels()
    const abortErr = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn(async () => { throw abortErr }))
    await expect(callGeminiByok(ARGS)).rejects.toBe(abortErr)
  })
})

describe('verifyGeminiKey (auth-only — never a completion)', () => {
  it('GETs /v1beta/models with the key header and resolves true on ok', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ models: [] }) }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyGeminiKey('AIzaVerify')).resolves.toBe(true)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/v1beta/models')
    expect(String(url)).not.toContain(':generateContent')
    expect((opts.method || 'GET')).toBe('GET')
    expect(opts.headers['x-goog-api-key']).toBe('AIzaVerify')
    expect(String(url)).not.toContain('AIzaVerify')
  })

  it('rejects "Invalid" on 400/401/403 and with the status otherwise', async () => {
    for (const status of [400, 401, 403]) {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status, text: async () => 'bad key' })))
      await expect(verifyGeminiKey('AIzaBad')).rejects.toThrow(/invalid/i)
    }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, text: async () => 'down' })))
    await expect(verifyGeminiKey('AIzaOk')).rejects.toThrow(/503/)
  })

  it('throws without hitting the network when given no key', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyGeminiKey('')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('geminiAdapter (registry contract)', () => {
  it('exposes the five-part adapter contract wired to the BYOK fns', () => {
    expect(geminiAdapter.id).toBe('gemini')
    expect(typeof geminiAdapter.label).toBe('string')
    setUserGeminiKey('')
    expect(geminiAdapter.hasKey()).toBe(false)
    setUserGeminiKey('AIzaAdapter')
    expect(geminiAdapter.hasKey()).toBe(true)
    expect(typeof geminiAdapter.call).toBe('function')
    expect(typeof geminiAdapter.verify).toBe('function')
  })
})
