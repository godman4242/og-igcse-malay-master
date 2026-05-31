// Unit suite for Bring-Your-Own-Key (BYOK): the OpenRouter user-key layer,
// the callTextAI provider router, and the speaking-coach prompt builder.
// Design: docs/superpowers/specs/2026-05-30-byok-design.md

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  setUserOpenRouterKey, getUserOpenRouterKey, hasUserOpenRouterKey,
  isOpenRouterAvailable, verifyOpenRouterKey,
} from '../openrouter.js'
import { buildCoachPrompt, cleanCoachText } from '../speakingCoach.js'

describe('openrouter user-key layer', () => {
  beforeEach(() => {
    setUserOpenRouterKey('') // reset to no user key
  })

  it('stores and reflects a user key', () => {
    expect(hasUserOpenRouterKey()).toBe(false)
    setUserOpenRouterKey('sk-or-test')
    expect(hasUserOpenRouterKey()).toBe(true)
    expect(getUserOpenRouterKey()).toBe('sk-or-test')
  })

  it('trims whitespace and clears on empty/whitespace input', () => {
    setUserOpenRouterKey('  sk-or-spaced  ')
    expect(getUserOpenRouterKey()).toBe('sk-or-spaced')
    setUserOpenRouterKey('   ')
    expect(hasUserOpenRouterKey()).toBe(false)
    expect(getUserOpenRouterKey()).toBe(null)
  })

  it('isOpenRouterAvailable is true once a user key is set', () => {
    setUserOpenRouterKey('sk-or-test')
    expect(isOpenRouterAvailable()).toBe(true)
  })
})

describe('verifyOpenRouterKey', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates the key against the auth endpoint, not a chat model', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: { label: 'k' } }) }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(verifyOpenRouterKey('sk-or-valid')).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/key')
    expect(opts.method).toBe('GET')
    expect(opts.headers.Authorization).toBe('Bearer sk-or-valid')
  })

  it('rejects on a 401 (genuinely invalid key)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => 'Unauthorized' })))
    await expect(verifyOpenRouterKey('sk-or-bad')).rejects.toThrow()
  })

  it('does NOT fail just because free chat models are down (no completions call)', async () => {
    // A valid key whose /chat/completions would 503: the auth endpoint still 200s.
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/key')) return { ok: true, status: 200, json: async () => ({ data: {} }) }
      return { ok: false, status: 503, text: async () => 'model unavailable' }
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyOpenRouterKey('sk-or-valid')).resolves.toBe(true)
  })

  it('throws (without hitting the network) when no key is available', async () => {
    setUserOpenRouterKey('')
    vi.stubEnv('VITE_OPENROUTER_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(verifyOpenRouterKey('')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})

describe('buildCoachPrompt', () => {
  const series = { bands: [3, 4, 4], first: 3, last: 4, delta: 1, best: 4, avg: 3.7, count: 3 }
  const weakness = { tallied: 3, flagTotal: 2, top: [{ category: 'fewMarkers', count: 2 }] }

  it('includes the band trend and the top weakness in the user message', () => {
    const { userMsg } = buildCoachPrompt(series, weakness, 'eng')
    expect(userMsg).toContain('3, 4, 4')
    expect(userMsg).toContain('3.7')
    expect(userMsg.toLowerCase()).toContain('connector') // fewMarkers → "few connectors"
  })

  it('switches the system prompt by language', () => {
    const en = buildCoachPrompt(series, weakness, 'eng').systemPrompt
    const ms = buildCoachPrompt(series, weakness, 'malay').systemPrompt
    expect(en).not.toEqual(ms)
    expect(ms.toLowerCase()).toContain('jurulatih') // Malay for "coach"
  })

  it('handles a no-weakness (balanced) case without throwing', () => {
    const { userMsg } = buildCoachPrompt(series, { tallied: 3, flagTotal: 0, top: [] }, 'eng')
    expect(typeof userMsg).toBe('string')
    expect(userMsg.length).toBeGreaterThan(0)
  })
})

describe('cleanCoachText', () => {
  it('strips reasoning <think> blocks (e.g. DeepSeek R1)', () => {
    expect(cleanCoachText('<think>let me reason...</think>You improved from 3 to 4.'))
      .toBe('You improved from 3 to 4.')
  })

  it('strips stray code fences and trims', () => {
    expect(cleanCoachText('```\nGreat work — drill connectors next.\n```')).toBe('Great work — drill connectors next.')
  })

  it('returns empty string for null/undefined', () => {
    expect(cleanCoachText(null)).toBe('')
    expect(cleanCoachText(undefined)).toBe('')
  })

  it('leaves a normal answer untouched', () => {
    expect(cleanCoachText('Nice upward trend — focus on connectors.')).toBe('Nice upward trend — focus on connectors.')
  })
})
