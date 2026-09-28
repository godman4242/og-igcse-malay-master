// GOAL #24: "Translate page" → Cancel must stop the free gtx word loop, and a re-run
// must fetch only the words the cancelled run never got. Real router + real gtx
// provider + real cache; only `fetch` is stubbed (the free endpoint is rate-limited).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clearCache } from '../translationCache.js'

vi.mock('../../store/useStore', () => ({
  default: { getState: () => ({ translation: {}, userRole: 'static' }) },
}))
vi.mock('../translate/providers/deepl', () => ({
  deeplTranslateOne: vi.fn(), deeplTranslateBatch: vi.fn(),
  isDeepLAvailable: () => false, isDeepLPairSupported: () => false, deeplCompareUrl: () => '',
}))
vi.mock('../translate/providers/google', () => ({
  googleTranslateOne: vi.fn(), googleTranslateBatch: vi.fn(),
  isGoogleAvailable: () => false, googleCompareUrl: () => '',
}))

import { translateBatch } from '../translate.js'
import { translateDocument } from '../translateDocument.js'

const WORDS = Array.from({ length: 28 }, (_, i) => `kata${i}`)
let fetched
let onFetch

beforeEach(async () => {
  await clearCache()
  fetched = []
  onFetch = null
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const word = new URL(url).searchParams.get('q')
    fetched.push(word)
    await onFetch?.(fetched.length)
    return { ok: true, json: async () => [[[`en-${word}`]]] }
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('Translate page — Cancel stops the free word loop (GOAL #24)', () => {
  it('Cancel after 5 words → no further fetches, and a re-run fetches only the other 23', async () => {
    const run1 = new AbortController()
    onFetch = (n) => { if (n === 5) run1.abort() }
    const out1 = await translateDocument(WORDS, { translateBatch, signal: run1.signal })

    expect(fetched).toHaveLength(5)
    // The cancelled run keeps what it paid for and never records the rest as failures.
    expect(Object.keys(out1)).toEqual(WORDS.slice(0, 5))
    expect(out1.kata0).toMatchObject({ text: 'en-kata0', source: 'gtx' })

    onFetch = null
    const out2 = await translateDocument(WORDS, { translateBatch, signal: new AbortController().signal })

    expect(fetched).toHaveLength(28)
    expect(new Set(fetched).size).toBe(28)
    expect(out2.kata27).toMatchObject({ text: 'en-kata27', source: 'gtx' })
  })

  it('a word already fetched is cached at once — a re-run started before run #1 returns skips it', async () => {
    const run1 = new AbortController()
    let release
    onFetch = (n) => {
      if (n === 3) {
        run1.abort()
        // Hold word 3 in flight so run #1 has NOT returned when the re-run reads the cache.
        return new Promise((r) => { release = r })
      }
    }
    const pending1 = translateDocument(WORDS, { translateBatch, signal: run1.signal })
    await vi.waitFor(() => expect(fetched).toHaveLength(3))

    onFetch = null
    const out2 = await translateDocument(WORDS, { translateBatch, signal: new AbortController().signal })
    release?.()
    await pending1

    // Words 1–2 came from run #1's per-word cache writes; word 3 was still in flight.
    expect(fetched.filter(w => w === 'kata0' || w === 'kata1')).toHaveLength(2)
    expect(out2.kata0).toMatchObject({ text: 'en-kata0' })
  })
})
