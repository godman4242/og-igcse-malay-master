// The user-Gemini "higher quality" translation provider. Mirrors the
// openrouter provider suite: batch-as-numbered-list, count-mismatch → bounded
// per-word fallback, genuine failure THROWS (router degrades to gtx), and the
// availability gate is the USER key only.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../instructProviders/gemini', () => ({
  callGeminiByok: vi.fn(),
  hasUserGeminiKey: vi.fn(() => true),
}))

import { callGeminiByok, hasUserGeminiKey } from '../../../instructProviders/gemini'
import { geminiTranslateBatch, geminiTranslateOne } from '../geminiByok.js'

beforeEach(() => {
  vi.clearAllMocks()
  hasUserGeminiKey.mockReturnValue(true)
})

describe('geminiTranslateBatch', () => {
  it('returns [] for empty input without calling the model', async () => {
    expect(await geminiTranslateBatch([], 'ms', 'en')).toEqual([])
    expect(callGeminiByok).not.toHaveBeenCalled()
  })

  it('throws when no user Gemini key is set (so the router falls through to gtx)', async () => {
    hasUserGeminiKey.mockReturnValue(false)
    await expect(geminiTranslateBatch(['makan'], 'ms', 'en')).rejects.toThrow()
    expect(callGeminiByok).not.toHaveBeenCalled()
  })

  it('names the languages in full (Malay→English), not raw ISO codes', async () => {
    callGeminiByok.mockResolvedValueOnce('1. to eat')
    await geminiTranslateBatch(['makan'], 'ms', 'en')
    const arg = callGeminiByok.mock.calls[0][0]
    const userContent = arg.messages.find(m => m.role === 'user').content
    expect(userContent).toContain('Malay')
    expect(userContent).toContain('English')
    expect(userContent).not.toMatch(/\bms\b/)
  })

  it('maps a matching numbered reply to gemini-tagged provider results', async () => {
    callGeminiByok.mockResolvedValueOnce('1. to eat\n2. to drink')
    const out = await geminiTranslateBatch(['makan', 'minum'], 'ms', 'en')
    expect(callGeminiByok).toHaveBeenCalledTimes(1)
    expect(out).toEqual([
      { text: 'to eat', source: 'gemini', provider: 'gemini' },
      { text: 'to drink', source: 'gemini', provider: 'gemini' },
    ])
  })

  it('falls back to bounded per-word calls on a count mismatch', async () => {
    callGeminiByok
      .mockResolvedValueOnce('1. only one gloss')   // batch attempt (mismatch)
      .mockResolvedValueOnce('to eat')              // per-word: makan
      .mockResolvedValueOnce('to drink')            // per-word: minum
    const out = await geminiTranslateBatch(['makan', 'minum'], 'ms', 'en')
    expect(callGeminiByok).toHaveBeenCalledTimes(3)
    expect(out.map(r => r.text)).toEqual(['to eat', 'to drink'])
    expect(out.every(r => r.provider === 'gemini')).toBe(true)
  })

  it('propagates a model error (rejects) so the router degrades to gtx', async () => {
    callGeminiByok.mockRejectedValueOnce(new Error('429 quota'))
    await expect(geminiTranslateBatch(['makan'], 'ms', 'en')).rejects.toThrow()
  })
})

describe('geminiTranslateOne', () => {
  it('returns a single provider-shaped gloss', async () => {
    callGeminiByok.mockResolvedValueOnce('1. to eat')
    expect(await geminiTranslateOne('makan', 'ms', 'en')).toEqual({
      text: 'to eat', source: 'gemini', provider: 'gemini',
    })
  })
})
