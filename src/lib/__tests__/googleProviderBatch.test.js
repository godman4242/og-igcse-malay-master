// api/translate.js refuses >100 texts per request (413), so the client's
// Google batch must chunk — else a long document silently falls through to the
// next provider the day GOOGLE_TRANSLATE_KEY is added.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../translate/providers/sessionHeader', () => ({ getSessionAuthHeader: async () => ({}) }))

let fetchMock
beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_TRANSLATE_ENABLED', 'true')
  vi.resetModules()
  fetchMock = vi.fn(async (_url, init) => {
    const { texts } = JSON.parse(init.body)
    return new Response(JSON.stringify({ translations: texts.map(t => ({ text: `EN:${t}` })) }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('googleTranslateBatch', () => {
  it('sends at most 100 texts per proxy request and keeps order', async () => {
    const { googleTranslateBatch } = await import('../translate/providers/google.js')
    const texts = Array.from({ length: 250 }, (_, i) => `t${i}`)
    const out = await googleTranslateBatch(texts)
    const sizes = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).texts.length)
    expect(sizes).toEqual([100, 100, 50])
    expect(out.map(r => r.text)).toEqual(texts.map(t => `EN:${t}`))
  })
})

describe('googleTranslateBatch — a short reply', () => {
  // src/lib/translate.js treats a MISSING result as source:'error', which the
  // cache refuses to store. Padding it with the echoed Malay word marked
  // 'google' would cache "makan → makan" as a real translation, forever.
  it('leaves a missing result missing, never an echo marked as a translation', async () => {
    fetchMock.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ translations: [{ text: 'EN:a' }] }), { status: 200 }))
    const { googleTranslateBatch } = await import('../translate/providers/google.js')
    const out = await googleTranslateBatch(['a', 'b'])
    expect(out[0]).toEqual({ text: 'EN:a', source: 'google', provider: 'google' })
    expect(out[1]).toBeUndefined()
  })
})
