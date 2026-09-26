// api/translate.js spends the OWNER's DEEPL_KEY / GOOGLE_TRANSLATE_KEY. Neither
// is set in production today (the handler 503s before any upstream call), but
// src/lib/translate/providers/google.js tells the owner to add one — so the
// caps must already hold when that happens. Same three questions as
// gemini.test.js: account minting, body size before the provider, no echo.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env.TRANSLATE_DAILY_CAP = '500'
  process.env.TRANSLATE_ALL_ACCOUNTS_DAILY_CAP = '2'
})

const counts = new Map()
const rpc = vi.fn(async (_fn, { p_uid, p_endpoint }) => {
  const k = `${p_uid}|${p_endpoint}`
  counts.set(k, (counts.get(k) || 0) + 1)
  return { data: counts.get(k), error: null }
})
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async (token) => ({ data: { user: { id: token } }, error: null }) },
    rpc,
  }),
}))

import handler from '../translate.js'

function call(uid, body) {
  const res = { statusCode: 0, body: undefined }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return handler({ method: 'POST', headers: { authorization: `Bearer ${uid}` }, body }, res).then(() => res)
}
const deepl = (texts) => ({ provider: 'deepl', texts, from: 'MS', to: 'EN' })

let fetchMock
beforeEach(() => {
  counts.clear()
  rpc.mockClear()
  process.env.SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk'
  process.env.DEEPL_KEY = 'deepl-SECRET:fx'
  process.env.GOOGLE_TRANSLATE_KEY = 'google-SECRET'
  fetchMock = vi.fn(async (url) => new Response(JSON.stringify(
    String(url).includes('deepl')
      ? { translations: [{ text: 'hello' }] }
      : { data: { translations: [{ translatedText: 'hello' }] } },
  ), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('api/translate — Q1: account minting', () => {
  it('a fresh account cannot push the owner key past the all-accounts ceiling', async () => {
    expect((await call('uid-a', deepl(['satu']))).statusCode).toBe(200)
    expect((await call('uid-b', deepl(['dua']))).statusCode).toBe(200)
    expect((await call('uid-c', deepl(['tiga']))).statusCode).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('a rejected request costs no allowance (validation runs before the counter)', async () => {
    await call('uid-a', { provider: 'deepl', texts: [], from: 'MS', to: 'EN' })
    await call('uid-a', { provider: 'nope', texts: ['x'], from: 'MS', to: 'EN' })
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('api/translate — Q2: size-capped before the provider', () => {
  it('413s more than 100 texts without calling the provider', async () => {
    const res = await call('uid-a', deepl(Array.from({ length: 101 }, () => 'kata')))
    expect(res.statusCode).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('413s more than 30,000 characters without calling the provider', async () => {
    const res = await call('uid-a', { provider: 'google', texts: ['a'.repeat(30_001)], from: 'ms', to: 'en' })
    expect(res.statusCode).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('400s non-string texts without calling the provider', async () => {
    const res = await call('uid-a', deepl([{ evil: true }]))
    expect(res.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still translates a real batch on both providers', async () => {
    const d = await call('uid-a', deepl(['satu', 'dua']))
    expect(d.body).toEqual({ translations: [{ text: 'hello' }] })
    expect(String(fetchMock.mock.calls[0][1].body)).toBe('text=satu&text=dua&source_lang=MS&target_lang=EN-GB')
    const g = await call('uid-a', { provider: 'google', texts: ['satu'], from: 'ms', to: 'en' })
    expect(g.body).toEqual({ translations: [{ text: 'hello' }] })
  })
})

describe('api/translate — refuses cleanly, without counting', () => {
  it('a hostile provider value is a 400, not a crash', async () => {
    const res = await call('uid-a', { provider: { toString: 1 }, texts: ['x'], from: 'MS', to: 'EN' })
    expect(res.statusCode).toBe(400)
  })

  it('a missing server key refuses before the counter', async () => {
    delete process.env.DEEPL_KEY
    expect((await call('uid-a', deepl(['satu']))).statusCode).toBe(503)
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('api/translate — Q3: no upstream body, status or key in errors', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

  it('an upstream error becomes a 502 — the owner\'s quota/key state stays private', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"message":"Wrong key deepl-SECRET"}', { status: 456 }))
    const res = await call('uid-a', deepl(['satu']))
    expect(res.statusCode).toBe(502)
    expect(JSON.stringify(res.body)).not.toMatch(/SECRET|Wrong key|456/)
  })

  it('a network failure or a non-JSON 2xx is a static 502', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    const a = await call('uid-a', deepl(['satu']))
    fetchMock.mockResolvedValueOnce(new Response('<html>proxy page google-SECRET</html>', { status: 200 }))
    const b = await call('uid-a', { provider: 'google', texts: ['satu'], from: 'ms', to: 'en' })
    for (const res of [a, b]) {
      expect(res.statusCode).toBe(502)
      expect(JSON.stringify(res.body)).not.toMatch(/SECRET|html|fetch failed/)
    }
  })

  it('the Google key travels in a header, never the URL', async () => {
    await call('uid-a', { provider: 'google', texts: ['satu'], from: 'ms', to: 'en' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).not.toContain('google-SECRET')
    expect(init.headers['x-goog-api-key']).toBe('google-SECRET')
  })
})
