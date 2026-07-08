// @vitest-environment jsdom
//
// PLAUSIBLE finding (2026-07-03 review) — ai.js non-stream path double-encodes.
// The streaming path returns the model's text as a PLAIN string (readSSEStream
// accumulates raw text). The non-stream path wrapped `data.response` in an
// unconditional JSON.stringify, so a plain-text edge reply "Selamat pagi!" came
// back as '"Selamat pagi!"' — literal quote characters leaking into the reply.
// The object case (edge already JSON.parsed structured output) must STILL come
// back as a JSON string, because deckGenerator/scenarioGenerator parse it.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../config/supabaseConfig', () => ({
  SUPABASE_CONFIG: { url: 'https://test.supabase.co', key: 'sb_publishable_x', enabled: true },
}))

vi.mock('../../config/supabase', () => ({
  initSupabase: async () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'eyJtest' } } }) },
  }),
}))

import { callAI } from '../ai.js'

// A minimal non-streaming JSON Response for the ai-proxy.
function fakeJsonResponse(bodyObj) {
  return {
    ok: true,
    status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => bodyObj,
  }
}

describe('callAI — non-stream response encoding (double-encode regression)', () => {
  beforeEach(() => {
    const mem = {}
    vi.stubGlobal('localStorage', {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v) },
      removeItem: (k) => { delete mem[k] },
      clear: () => { for (const k of Object.keys(mem)) delete mem[k] },
    })
    vi.stubEnv('VITE_AI_MOCK', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns a plain-text reply verbatim (no wrapping quotes)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      fakeJsonResponse({ response: 'Selamat pagi!', tokensUsed: 5 })
    ))

    const result = await callAI({ action: 'chat', payload: {}, stream: false })

    // Must equal the raw text, exactly as the streaming path would return it.
    expect(result.response).toBe('Selamat pagi!')
    expect(result.tokensUsed).toBe(5)
  })

  it('returns structured output as a JSON string (deck/scenario parse contract preserved)', async () => {
    const structured = { role: 'waiter', opening: 'Selamat datang' }
    vi.stubGlobal('fetch', vi.fn(async () =>
      fakeJsonResponse({ response: structured, tokensUsed: 3 })
    ))

    const result = await callAI({ action: 'chat', payload: {}, stream: false })

    // Object → JSON string, so the caller's JSON.parse round-trips.
    expect(typeof result.response).toBe('string')
    expect(JSON.parse(result.response)).toEqual(structured)
  })

  // #42 — the daily-usage counter is best-effort. A storage write failure
  // (quota exceeded / Safari private mode) must NOT convert an already-received
  // successful reply into an AIError (nor trip the circuit breaker).
  it('a localStorage write failure does not turn a successful reply into an error', async () => {
    const mem = {}
    vi.stubGlobal('localStorage', {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: () => { throw new DOMException('quota', 'QuotaExceededError') },
      removeItem: () => {},
      clear: () => {},
    })
    vi.stubGlobal('fetch', vi.fn(async () =>
      fakeJsonResponse({ response: 'Hai!', tokensUsed: 2 })
    ))

    const result = await callAI({ action: 'chat', payload: {}, stream: false })
    expect(result.response).toBe('Hai!')
  })
})
