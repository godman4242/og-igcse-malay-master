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
vi.mock('../openrouter', () => ({ isOpenRouterAvailable: vi.fn(() => true) }))

import { translateBatch, translateWord } from '../translate.js'
import { gtxTranslateBatch } from '../translate/providers/gtx'
import { openrouterTranslateBatch } from '../translate/providers/openrouter'
import { isOpenRouterAvailable } from '../openrouter'

beforeEach(async () => {
  vi.clearAllMocks()
  isOpenRouterAvailable.mockReturnValue(true)
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

  it('translateWord honours the quality provider too', async () => {
    const r = await translateWord('lari', 'ms', 'en', { provider: 'quality' })
    expect(r).toEqual({ text: 'or:lari', source: 'openrouter', provider: 'openrouter' })
  })
})
