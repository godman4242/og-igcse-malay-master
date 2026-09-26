// api/gemini.js spends the OWNER's GEMINI_KEY for any signed-in account, and
// signup is open. Pins the three answers from the 2026-09-26 server-function
// review: (1) minting accounts can't push the key past an all-accounts
// ceiling, (2) the body is size-capped and reduced to the fields the app
// sends before it reaches Google, (3) no error path echoes Google's body or
// puts the key where an error message could carry it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env.GEMINI_DAILY_CAP = '200'
  process.env.GEMINI_ALL_ACCOUNTS_DAILY_CAP = '2'
})

// Real guard.js runs; only Supabase is faked. A bearer token IS the uid, and
// the RPC is a real per-(uid, endpoint) counter, like the live table.
const counts = new Map()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async (token) => ({ data: { user: { id: token } }, error: null }),
    },
    rpc: async (_fn, { p_uid, p_endpoint }) => {
      const k = `${p_uid}|${p_endpoint}`
      counts.set(k, (counts.get(k) || 0) + 1)
      return { data: counts.get(k), error: null }
    },
  }),
}))

import handler from '../gemini.js'
import { chatWithGemini, fetchAIGrade } from '../../src/lib/gemini.js'

const KEY = 'test-gemini-key-SECRET'
const OK_BODY = { candidates: [{ content: { parts: [{ text: 'hai' }] } }] }

// Exactly what src/lib/gemini.js callGemini sends for a task-aware grade.
const appBody = () => ({
  contents: [{ role: 'user', parts: [{ text: 'Saya suka membaca.' }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
    thinkingConfig: { thinkingLevel: 'low' },
  },
  systemInstruction: { parts: [{ text: 'You are an examiner.' }] },
})

function call(uid, body = appBody()) {
  const res = { statusCode: 0, body: undefined }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  const req = { method: 'POST', headers: { authorization: `Bearer ${uid}` }, body }
  return handler(req, res).then(() => res)
}

let fetchMock
beforeEach(() => {
  counts.clear()
  process.env.SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srk'
  process.env.GEMINI_KEY = KEY
  fetchMock = vi.fn(async () => new Response(JSON.stringify(OK_BODY), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('api/gemini — Q1: account minting', () => {
  it('a fresh account cannot push the owner key past the all-accounts ceiling', async () => {
    expect((await call('uid-a')).statusCode).toBe(200)
    expect((await call('uid-b')).statusCode).toBe(200)
    const third = await call('uid-c') // new account, own counter at 1 — still refused
    expect(third.statusCode).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('api/gemini — Q1b: $0 junk cannot drain the shared allowance', () => {
  it('an invalid request is refused before it is counted', async () => {
    const rpcCalls = () => [...counts.values()].reduce((a, b) => a + b, 0)
    for (const bad of [
      { contents: [] },
      { contents: [{ role: 'user', parts: [{ text: '' }] }] },
      { contents: [{ role: 'user', parts: [] }] },
      { contents: [{ role: 'root', parts: [{ text: 'hi' }] }] },
    ]) {
      expect((await call('uid-a', bad)).statusCode, JSON.stringify(bad)).toBe(400)
    }
    expect(rpcCalls()).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a missing server key refuses without counting', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.GEMINI_KEY
    expect((await call('uid-a')).statusCode).toBe(500)
    expect(counts.size).toBe(0)
  })
})

describe('api/gemini — Q2: body reaches Google capped and reduced', () => {
  it('413s a body over 128 KB without calling Google', async () => {
    const body = appBody()
    body.contents[0].parts[0].text = 'a'.repeat(130 * 1024)
    const res = await call('uid-a', body)
    expect(res.statusCode).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses media parts — a tiny fileData/inlineData part can cost ~1M tokens', async () => {
    const video = { fileData: { mimeType: 'video/*', fileUri: 'https://www.youtube.com/watch?v=x' } }
    const image = { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } }
    for (const part of [video, image, { text: 'hi', fileData: video.fileData }]) {
      const body = appBody()
      body.contents[0].parts.push(part)
      expect((await call('uid-a', body)).statusCode, JSON.stringify(part)).toBe(400)
      const sys = appBody()
      sys.systemInstruction.parts.push(part)
      expect((await call('uid-a', sys)).statusCode, 'systemInstruction').toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('400s a body with no contents array without calling Google', async () => {
    const res = await call('uid-a', { prompt: 'hi' })
    expect(res.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // The REAL bodies src/lib/gemini.js builds — not a hand copy — so a field
  // added to callGemini that the server would strip fails here.
  it('forwards every body the app really sends byte-for-byte', async () => {
    const sent = []
    vi.stubGlobal('fetch', vi.fn(async (_u, init) => {
      sent.push(init.body)
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }), { status: 200 })
    }))
    const essay = 'Saya suka membaca buku. '.repeat(40)
    const task = { prompt: 'Write about a trip', bullets: ['a'], requirements: ['Say where'], type: 'letter', audience: 'friend', wordRange: [150, 200] }
    await chatWithGemini([{ role: 'user', content: 'Apa itu imbuhan?' }, { role: 'assistant', content: 'Imbuhan…' }, { role: 'user', content: 'Contoh?' }], 'ctx')
    await fetchAIGrade(essay, ['has_title'], { words: 120 }, '', [], undefined, undefined, 'malay')
    await fetchAIGrade(essay, ['has_title'], { words: 120 }, '', [], undefined, task, 'eng')
    expect(sent).toHaveLength(3)

    vi.stubGlobal('fetch', fetchMock)
    for (const body of sent) {
      fetchMock.mockClear()
      counts.clear() // 3 calls vs this file's all-accounts ceiling of 2
      expect((await call('uid-a', JSON.parse(body))).statusCode).toBe(200)
      expect(fetchMock.mock.calls[0][1].body).toBe(body)
    }
  })

  it('drops fields the app never sends and bounds the output budget', async () => {
    const body = appBody()
    body.tools = [{ googleSearch: {} }] // paid Search grounding
    body.cachedContent = 'cachedContents/x'
    body.generationConfig.maxOutputTokens = 65536
    body.generationConfig.thinkingConfig = { thinkingLevel: 'low', thinkingBudget: 1e9, includeThoughts: true }
    body.generationConfig.responseSchema = { type: 'object' }
    await call('uid-a', body)
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(Object.keys(sent).sort()).toEqual(['contents', 'generationConfig', 'systemInstruction'])
    expect(sent.generationConfig).toEqual({
      temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' },
    })
  })

  it('a nonsense output budget falls back to the default, never below 1', async () => {
    for (const v of [-5, 0, 0.5, true, '999']) {
      fetchMock.mockClear()
      counts.clear()
      const body = appBody()
      body.generationConfig.maxOutputTokens = v
      await call('uid-a', body)
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig.maxOutputTokens, String(v)).toBe(1024)
    }
  })
})

describe('api/gemini — Q3: nothing secret or upstream reaches the client', () => {
  it('sends the key in a header, never the URL', async () => {
    await call('uid-a')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).not.toContain(KEY)
    expect(init.headers['x-goog-api-key']).toBe(KEY)
  })

  it('does not echo Google\'s error body — or its status — on a non-2xx', async () => {
    // A relayed 403 would tell any user "the owner's key is blocked", and look
    // like "your session is bad" to the client. Only 429 (back off) survives.
    const upstream = { error: { code: 403, message: 'API key not valid', details: [{ metadata: { consumer: 'projects/987654321' } }] } }
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(upstream), { status: 403 }))
    const res = await call('uid-a')
    expect(res.statusCode).toBe(502)
    expect(JSON.stringify(res.body)).not.toMatch(/987654321|API key not valid|403/)

    fetchMock.mockResolvedValueOnce(new Response('{"error":{"code":429}}', { status: 429 }))
    expect((await call('uid-a')).statusCode).toBe(429)
  })

  it('does not echo a non-JSON upstream body through the catch', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>internal proxy page projects/987654321</html>', { status: 200 }))
    const res = await call('uid-a')
    expect(res.statusCode).toBe(500)
    expect(JSON.stringify(res.body)).not.toMatch(/html|987654321/)
  })

  it('does not echo a network error message', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed for ?key=${KEY}`))
    const res = await call('uid-a')
    expect(JSON.stringify(res.body)).not.toContain(KEY)
  })
})
