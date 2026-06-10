// Router wiring for the "higher quality" (OpenRouter) provider:
//  - preferred 'quality' tries openrouter FIRST, then degrades to the gtx chain.
//  - the quality cache namespace ('q') does NOT collide with the free one ('')
//    in EITHER direction (the gotcha-#1 fix), proven against the real cache.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Real translation cache (memCache works under jsdom) so namespace isolation is
// exercised for real, not stubbed.
import { writeCache, clearCache } from '../translationCache.js'

vi.mock('../store/useStore', () => ({
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
vi.mock('../translate/providers/gtx', () => ({
  gtxTranslateOne: vi.fn(async (t) => ({ text: `gtx:${t}`, source: 'gtx', provider: 'gtx' })),
  gtxTranslateBatch: vi.fn(async (texts) => texts.map(t => ({ text: `gtx:${t}`, source: 'gtx', provider: 'gtx' }))),
  isGtxAvailable: () => true,
}))
vi.mock('../translate/providers/openrouter', () => ({
  openrouterTranslateOne: vi.fn(async (t) => ({ text: `or:${t}`, source: 'openrouter', provider: 'openrouter' })),
  openrouterTranslateBatch: vi.fn(async (texts) => texts.map(t => ({ text: `or:${t}`, source: 'openrouter', provider: 'openrouter' }))),
}))
vi.mock('../translate/providers/geminiByok', () => ({
  geminiTranslateOne: vi.fn(async (t) => ({ text: `gem:${t}`, source: 'gemini', provider: 'gemini' })),
  geminiTranslateBatch: vi.fn(async (texts) => texts.map(t => ({ text: `gem:${t}`, source: 'gemini', provider: 'gemini' }))),
}))
vi.mock('../openrouter', () => ({
  isOpenRouterAvailable: vi.fn(() => true),
  hasUserOpenRouterKey: vi.fn(() => false),
}))
vi.mock('../instructProviders/gemini', () => ({
  hasUserGeminiKey: vi.fn(() => false),
}))

import { translateBatch, translateWord, hasQualityTranslateKey } from '../translate.js'
import { gtxTranslateBatch } from '../translate/providers/gtx'
import { openrouterTranslateBatch } from '../translate/providers/openrouter'
import { geminiTranslateBatch } from '../translate/providers/geminiByok'
import { isOpenRouterAvailable, hasUserOpenRouterKey } from '../openrouter'
import { hasUserGeminiKey } from '../instructProviders/gemini'

beforeEach(async () => {
  vi.clearAllMocks()
  isOpenRouterAvailable.mockReturnValue(true)
  hasUserOpenRouterKey.mockReturnValue(false)
  hasUserGeminiKey.mockReturnValue(false)
  await clearCache()
})

describe('translate.js — quality provider routing', () => {
  it('quality pref calls OpenRouter EVEN when a free gtx gloss is already cached (namespace fix)', async () => {
    // Pre-seed the FREE namespace with a gtx gloss for the word.
    await writeCache('makan', 'ms', 'en', { text: 'gtx:makan', source: 'gtx', provider: 'gtx' }, {}, '')

    const out = await translateBatch(['makan'], 'ms', 'en', { provider: 'quality' })

    expect(openrouterTranslateBatch).toHaveBeenCalledTimes(1)
    expect(gtxTranslateBatch).not.toHaveBeenCalled()
    expect(out[0]).toEqual({ text: 'or:makan', source: 'openrouter', provider: 'openrouter' })
  })

  it('quality degrades to the gtx chain when OpenRouter fails (never dead-ends)', async () => {
    openrouterTranslateBatch.mockRejectedValueOnce(new Error('429'))
    const out = await translateBatch(['minum'], 'ms', 'en', { provider: 'quality' })
    expect(openrouterTranslateBatch).toHaveBeenCalledTimes(1)
    expect(gtxTranslateBatch).toHaveBeenCalledTimes(1)
    expect(out[0]).toEqual({ text: 'gtx:minum', source: 'gtx', provider: 'gtx' })
  })

  it('a free request never calls OpenRouter', async () => {
    const out = await translateBatch(['rumah'], 'ms', 'en', { provider: 'gtx' })
    expect(openrouterTranslateBatch).not.toHaveBeenCalled()
    expect(gtxTranslateBatch).toHaveBeenCalledTimes(1)
    expect(out[0].source).toBe('gtx')
  })

  it('quality and free caches do not collide either way (a cached quality gloss does not satisfy a free read)', async () => {
    // First a quality call caches "or:buku" under ns='q'.
    await translateBatch(['buku'], 'ms', 'en', { provider: 'quality' })
    expect(openrouterTranslateBatch).toHaveBeenCalledTimes(1)

    // A subsequent quality call is served from the 'q' cache (no second OR call).
    await translateBatch(['buku'], 'ms', 'en', { provider: 'quality' })
    expect(openrouterTranslateBatch).toHaveBeenCalledTimes(1)

    // A FREE call for the same word must NOT see the quality gloss — it calls gtx.
    const free = await translateBatch(['buku'], 'ms', 'en', { provider: 'gtx' })
    expect(gtxTranslateBatch).toHaveBeenCalledTimes(1)
    expect(free[0]).toEqual({ text: 'gtx:buku', source: 'gtx', provider: 'gtx' })
  })

  it('a quality call that degrades to gtx does NOT poison the quality namespace — a later retry re-attempts OpenRouter', async () => {
    // First quality call: OpenRouter is throttled → degrades to gtx.
    openrouterTranslateBatch.mockRejectedValueOnce(new Error('429'))
    const first = await translateBatch(['ayam'], 'ms', 'en', { provider: 'quality' })
    expect(first[0]).toEqual({ text: 'gtx:ayam', source: 'gtx', provider: 'gtx' })
    expect(openrouterTranslateBatch).toHaveBeenCalledTimes(1)

    // 429 clears. A second quality call must RE-ATTEMPT OpenRouter (the degraded
    // gtx gloss was NOT cached under ns='q'), and now returns the premium gloss.
    const second = await translateBatch(['ayam'], 'ms', 'en', { provider: 'quality' })
    expect(openrouterTranslateBatch).toHaveBeenCalledTimes(2)
    expect(second[0]).toEqual({ text: 'or:ayam', source: 'openrouter', provider: 'openrouter' })

    // And the degraded gtx gloss WAS cached in the free namespace — a free request
    // for the same word is served from cache (gtx not re-called).
    const free = await translateBatch(['ayam'], 'ms', 'en', { provider: 'gtx' })
    expect(gtxTranslateBatch).toHaveBeenCalledTimes(1) // only the original degrade
    expect(free[0]).toEqual({ text: 'gtx:ayam', source: 'gtx', provider: 'gtx' })
  })

  it('translateWord honours the quality provider too', async () => {
    const r = await translateWord('lari', 'ms', 'en', { provider: 'quality' })
    expect(r).toEqual({ text: 'or:lari', source: 'openrouter', provider: 'openrouter' })
  })
})

describe('translate.js — user-Gemini quality provider (additive fork, 2026-06-10)', () => {
  it('quality routes to the user Gemini provider when OpenRouter is unavailable', async () => {
    isOpenRouterAvailable.mockReturnValue(false)
    hasUserGeminiKey.mockReturnValue(true)
    const out = await translateBatch(['makan'], 'ms', 'en', { provider: 'quality' })
    expect(geminiTranslateBatch).toHaveBeenCalledTimes(1)
    expect(openrouterTranslateBatch).not.toHaveBeenCalled()
    expect(out[0]).toEqual({ text: 'gem:makan', source: 'gemini', provider: 'gemini' })
  })

  it('quality degrades OpenRouter → Gemini → gtx in order (never dead-ends)', async () => {
    hasUserGeminiKey.mockReturnValue(true)
    openrouterTranslateBatch.mockRejectedValueOnce(new Error('429'))
    geminiTranslateBatch.mockRejectedValueOnce(new Error('quota'))
    const out = await translateBatch(['minum'], 'ms', 'en', { provider: 'quality' })
    expect(openrouterTranslateBatch).toHaveBeenCalledTimes(1)
    expect(geminiTranslateBatch).toHaveBeenCalledTimes(1)
    expect(gtxTranslateBatch).toHaveBeenCalledTimes(1)
    expect(out[0]).toEqual({ text: 'gtx:minum', source: 'gtx', provider: 'gtx' })
  })

  it('a free request never calls the Gemini quality provider, even with a key', async () => {
    hasUserGeminiKey.mockReturnValue(true)
    await translateBatch(['rumah'], 'ms', 'en', { provider: 'gtx' })
    expect(geminiTranslateBatch).not.toHaveBeenCalled()
  })

  it('a Gemini quality gloss caches under the quality namespace (no free-cache collision)', async () => {
    isOpenRouterAvailable.mockReturnValue(false)
    hasUserGeminiKey.mockReturnValue(true)

    // First quality call hits Gemini and caches under 'q'.
    await translateBatch(['buku'], 'ms', 'en', { provider: 'quality' })
    expect(geminiTranslateBatch).toHaveBeenCalledTimes(1)
    // Second quality call is served from the 'q' cache.
    await translateBatch(['buku'], 'ms', 'en', { provider: 'quality' })
    expect(geminiTranslateBatch).toHaveBeenCalledTimes(1)
    // A FREE call must NOT see the Gemini gloss — it calls gtx.
    const free = await translateBatch(['buku'], 'ms', 'en', { provider: 'gtx' })
    expect(free[0]).toEqual({ text: 'gtx:buku', source: 'gtx', provider: 'gtx' })
  })

  it('a Gemini quality call that degrades to gtx does NOT poison the quality namespace', async () => {
    isOpenRouterAvailable.mockReturnValue(false)
    hasUserGeminiKey.mockReturnValue(true)
    geminiTranslateBatch.mockRejectedValueOnce(new Error('quota'))

    const first = await translateBatch(['ayam'], 'ms', 'en', { provider: 'quality' })
    expect(first[0]).toEqual({ text: 'gtx:ayam', source: 'gtx', provider: 'gtx' })

    // Quota clears — the retry must RE-ATTEMPT Gemini, not serve the cached gtx gloss.
    const second = await translateBatch(['ayam'], 'ms', 'en', { provider: 'quality' })
    expect(geminiTranslateBatch).toHaveBeenCalledTimes(2)
    expect(second[0]).toEqual({ text: 'gem:ayam', source: 'gemini', provider: 'gemini' })
  })
})

describe('hasQualityTranslateKey (UI gate)', () => {
  it('is false with no user keys — the env OpenRouter key never lights the toggle', async () => {
    isOpenRouterAvailable.mockReturnValue(true) // env key present
    expect(hasQualityTranslateKey()).toBe(false)
  })

  it('is true with a user OpenRouter key OR a user Gemini key', async () => {
    hasUserOpenRouterKey.mockReturnValue(true)
    expect(hasQualityTranslateKey()).toBe(true)
    hasUserOpenRouterKey.mockReturnValue(false)
    hasUserGeminiKey.mockReturnValue(true)
    expect(hasQualityTranslateKey()).toBe(true)
  })
})
