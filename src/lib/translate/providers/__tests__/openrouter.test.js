// The OpenRouter "higher quality" translation provider. OpenRouter returns ONE
// completion, so a batch of N words is sent as a numbered prompt and the reply
// parsed back into N glosses; a count mismatch falls back to bounded per-word
// calls. A genuine failure (no key / model error) THROWS so the router degrades
// to the free gtx chain instead of dead-ending.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../openrouter', () => ({
  callOpenRouter: vi.fn(),
  isOpenRouterAvailable: vi.fn(() => true),
}))

import { callOpenRouter, isOpenRouterAvailable } from '../../../openrouter'
import {
  parseNumberedList,
  openrouterTranslateBatch,
  openrouterTranslateOne,
} from '../openrouter.js'

beforeEach(() => {
  vi.clearAllMocks()
  isOpenRouterAvailable.mockReturnValue(true)
})

describe('parseNumberedList', () => {
  it('parses a clean numbered list into ordered glosses', () => {
    const reply = '1. to eat\n2. to drink\n3. house'
    expect(parseNumberedList(reply)).toEqual(['to eat', 'to drink', 'house'])
  })

  it('tolerates ragged markers: "1)" "2 -" "3:" and stray blank lines', () => {
    const reply = '\n1) cat\n\n2 - dog\n3: bird\n'
    expect(parseNumberedList(reply)).toEqual(['cat', 'dog', 'bird'])
  })

  it('ignores non-numbered prose lines (preamble/notes)', () => {
    const reply = 'Sure! Here you go:\n1. red\n2. blue\nHope that helps.'
    expect(parseNumberedList(reply)).toEqual(['red', 'blue'])
  })

  it('strips surrounding quotes/markdown emphasis from a gloss', () => {
    const reply = '1. "to run"\n2. **fast**'
    expect(parseNumberedList(reply)).toEqual(['to run', 'fast'])
  })

  it('returns [] for empty/garbage input', () => {
    expect(parseNumberedList('')).toEqual([])
    expect(parseNumberedList('no numbers here at all')).toEqual([])
  })
})

describe('openrouterTranslateBatch', () => {
  it('returns [] for empty input without calling the model', async () => {
    expect(await openrouterTranslateBatch([], 'ms', 'en')).toEqual([])
    expect(callOpenRouter).not.toHaveBeenCalled()
  })

  it('throws when OpenRouter is unavailable (so the router falls through to gtx)', async () => {
    isOpenRouterAvailable.mockReturnValue(false)
    await expect(openrouterTranslateBatch(['makan'], 'ms', 'en')).rejects.toThrow()
    expect(callOpenRouter).not.toHaveBeenCalled()
  })

  it('maps a matching numbered reply to aligned provider results', async () => {
    callOpenRouter.mockResolvedValueOnce('1. to eat\n2. to drink')
    const out = await openrouterTranslateBatch(['makan', 'minum'], 'ms', 'en')
    expect(callOpenRouter).toHaveBeenCalledTimes(1)
    expect(out).toEqual([
      { text: 'to eat', source: 'openrouter', provider: 'openrouter' },
      { text: 'to drink', source: 'openrouter', provider: 'openrouter' },
    ])
  })

  it('falls back to bounded per-word calls on a count mismatch', async () => {
    // Batch reply has the wrong count (1 gloss for 2 words) → per-word fallback.
    callOpenRouter
      .mockResolvedValueOnce('1. only one gloss')   // batch attempt (mismatch)
      .mockResolvedValueOnce('to eat')              // per-word: makan
      .mockResolvedValueOnce('to drink')            // per-word: minum
    const out = await openrouterTranslateBatch(['makan', 'minum'], 'ms', 'en')
    expect(callOpenRouter).toHaveBeenCalledTimes(3)
    expect(out.map(r => r.text)).toEqual(['to eat', 'to drink'])
    expect(out.every(r => r.provider === 'openrouter')).toBe(true)
  })

  it('propagates a model error (rejects) so the router degrades to gtx', async () => {
    callOpenRouter.mockRejectedValueOnce(new Error('429 rate limited'))
    await expect(openrouterTranslateBatch(['makan'], 'ms', 'en')).rejects.toThrow()
  })
})

describe('openrouterTranslateOne', () => {
  it('returns a single provider-shaped gloss', async () => {
    callOpenRouter.mockResolvedValueOnce('1. to eat')
    expect(await openrouterTranslateOne('makan', 'ms', 'en')).toEqual({
      text: 'to eat', source: 'openrouter', provider: 'openrouter',
    })
  })
})
