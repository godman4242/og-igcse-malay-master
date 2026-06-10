// Unit suite for the Ollama instruct adapter — local AI on the user's own
// computer (desktop-only by physics: HTTPS pages may fetch http://localhost,
// but a LAN IP is hard-blocked mixed content). Slots: URL (http/https only)
// + model; both must be set before hasKey() is true.
// Plan: docs/superpowers/plans/2026-06-10-multi-provider-instruct-router.md (Task 6)

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import {
  setOllamaUrl, getOllamaUrl, setOllamaModel, getOllamaModel,
  DEFAULT_OLLAMA_URL, listOllamaModels, verifyOllama, callOllama,
  ollamaAdapter,
} from '../ollama.js'

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
  setOllamaUrl('')
  setOllamaModel('')
})
afterEach(() => { vi.unstubAllGlobals() })

describe('ollama slots + URL validation', () => {
  it('stores a valid http(s) URL (trimmed, trailing slash stripped) and a model', () => {
    setOllamaUrl(' http://localhost:11434/ ')
    expect(getOllamaUrl()).toBe('http://localhost:11434')
    setOllamaModel(' qwen3:4b ')
    expect(getOllamaModel()).toBe('qwen3:4b')
  })

  it('rejects non-http(s) and unparseable URLs', () => {
    for (const bad of ['ftp://localhost:11434', 'localhost:11434', 'not a url', 'javascript:alert(1)']) {
      expect(() => setOllamaUrl(bad), bad).toThrow()
    }
    expect(getOllamaUrl()).toBe(null)
  })

  it('clears on empty input; exposes the default URL constant for the Settings placeholder', () => {
    setOllamaUrl('http://localhost:11434')
    setOllamaUrl('')
    expect(getOllamaUrl()).toBe(null)
    expect(DEFAULT_OLLAMA_URL).toBe('http://localhost:11434')
  })

  it('hasKey() is true only when URL AND model are both set', () => {
    expect(ollamaAdapter.hasKey()).toBe(false)
    setOllamaUrl('http://localhost:11434')
    expect(ollamaAdapter.hasKey()).toBe(false)
    setOllamaModel('qwen3:4b')
    expect(ollamaAdapter.hasKey()).toBe(true)
    setOllamaUrl('')
    expect(ollamaAdapter.hasKey()).toBe(false)
  })
})

describe('callOllama', () => {
  const ARGS = { systemPrompt: 'sys', messages: [{ role: 'user', content: 'ayat' }], maxTokens: 220 }
  const configure = () => { setOllamaUrl('http://localhost:11434'); setOllamaModel('qwen3:4b') }

  it('POSTs <url>/api/chat with model, system-first messages, stream:false, num_predict', async () => {
    configure()
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ message: { content: 'Ayat mudah.' } }) }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(callOllama(ARGS)).resolves.toBe('Ayat mudah.')
    const [url, opts] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://localhost:11434/api/chat')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.model).toBe('qwen3:4b')
    expect(body.stream).toBe(false)
    expect(body.options.num_predict).toBe(220)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'ayat' })
  })

  it('throws cause "no_key" without network when URL or model is missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(callOllama(ARGS)).rejects.toMatchObject({ cause: 'no_key' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps non-ok → "http", fetch throw → "network", missing content → "empty"; AbortError raw', async () => {
    configure()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })))
    await expect(callOllama(ARGS)).rejects.toMatchObject({ cause: 'http', status: 500 })

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') })) // CORS/refused look like this
    await expect(callOllama(ARGS)).rejects.toMatchObject({ cause: 'network' })

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ message: {} }) })))
    await expect(callOllama(ARGS)).rejects.toMatchObject({ cause: 'empty' })

    const abortErr = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn(async () => { throw abortErr }))
    await expect(callOllama(ARGS)).rejects.toBe(abortErr)
  })
})

describe('verifyOllama + listOllamaModels', () => {
  beforeEach(() => { setOllamaUrl('http://localhost:11434') })

  it('verify GETs /api/version (also proves CORS + LNA are open) and resolves true', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ version: '0.9.0' }) }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyOllama()).resolves.toBe(true)
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://localhost:11434/api/version')
  })

  it('verify rejects on non-ok / unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, text: async () => 'origin not allowed' })))
    await expect(verifyOllama()).rejects.toThrow(/403/)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(verifyOllama()).rejects.toThrow()
  })

  it('listOllamaModels parses /api/tags into a name list; garbage → []', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ models: [{ name: 'qwen3:4b' }, { name: 'llama3.2:3b' }, { junk: true }] }),
    })))
    await expect(listOllamaModels()).resolves.toEqual(['qwen3:4b', 'llama3.2:3b'])

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ nope: 1 }) })))
    await expect(listOllamaModels()).resolves.toEqual([])
  })
})

describe('ollamaAdapter (registry contract)', () => {
  it('exposes the five-part contract', () => {
    expect(ollamaAdapter.id).toBe('ollama')
    expect(typeof ollamaAdapter.label).toBe('string')
    expect(typeof ollamaAdapter.hasKey).toBe('function')
    expect(typeof ollamaAdapter.call).toBe('function')
    expect(typeof ollamaAdapter.verify).toBe('function')
  })
})
