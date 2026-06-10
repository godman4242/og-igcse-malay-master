// Provider-agnostic instruct seam — the single hook the future multi-provider
// router (Gemini / Ollama / …) will extend. Callers must never hardcode
// hasUserOpenRouterKey/callOpenRouter; they go through this seam.
// Spec: docs/superpowers/specs/2026-06-10-option-f-l2-simplification-design.md (F3)
// Plan: docs/superpowers/plans/2026-06-10-option-f-l2-simplification.md (Task 2)

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../openrouter', () => ({
  hasUserOpenRouterKey: vi.fn(),
  callOpenRouter: vi.fn(),
}))

import { hasUserOpenRouterKey, callOpenRouter } from '../openrouter'
import { hasInstructProvider, callInstruct } from '../instruct'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('hasInstructProvider', () => {
  it('is true when the user has their own OpenRouter key (v1 provider)', () => {
    hasUserOpenRouterKey.mockReturnValue(true)
    expect(hasInstructProvider()).toBe(true)
  })

  it('is false without a user key — the env/shared key never counts', () => {
    hasUserOpenRouterKey.mockReturnValue(false)
    expect(hasInstructProvider()).toBe(false)
  })
})

describe('callInstruct', () => {
  it('forwards {systemPrompt, messages, maxTokens, signal} and resolves the text', async () => {
    callOpenRouter.mockResolvedValue('Ayat mudah.')
    const ac = new AbortController()
    const args = {
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'ayat' }],
      maxTokens: 220,
      signal: ac.signal,
    }
    await expect(callInstruct(args)).resolves.toBe('Ayat mudah.')
    expect(callOpenRouter).toHaveBeenCalledTimes(1)
    expect(callOpenRouter).toHaveBeenCalledWith(args)
  })

  it('propagates AbortError (cancellation is the caller’s signal, not a failure)', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError')
    callOpenRouter.mockRejectedValue(abortErr)
    await expect(callInstruct({ systemPrompt: 's', messages: [] })).rejects.toBe(abortErr)
  })
})
