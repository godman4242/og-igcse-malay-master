// Unit suite for the callTextAI provider router. Mocks the two providers so we
// can assert the strict-opt-in routing + fallback without real network.
// Design: docs/superpowers/specs/2026-05-30-byok-design.md

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { callOpenRouter, callGemini, state } = vi.hoisted(() => ({
  callOpenRouter: vi.fn(),
  callGemini: vi.fn(),
  state: { userKeyPresent: false },
}))

vi.mock('../openrouter.js', () => ({
  hasUserOpenRouterKey: () => state.userKeyPresent,
  callOpenRouter,
}))
vi.mock('../gemini.js', () => ({ callGemini }))

import { callTextAI } from '../aiText.js'

describe('callTextAI routing', () => {
  beforeEach(() => {
    callOpenRouter.mockReset()
    callGemini.mockReset()
    state.userKeyPresent = false
  })

  it('routes to the server Gemini default when no user key is set', async () => {
    callGemini.mockResolvedValue('gemini-says')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('gemini-says')
    expect(callOpenRouter).not.toHaveBeenCalled()
  })

  it("routes to OpenRouter on the user's key when set", async () => {
    state.userKeyPresent = true
    callOpenRouter.mockResolvedValue('or-says')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('or-says')
    expect(callGemini).not.toHaveBeenCalled()
  })

  it('falls back to Gemini when the OpenRouter call throws (no dead end)', async () => {
    state.userKeyPresent = true
    callOpenRouter.mockRejectedValue(new Error('boom'))
    callGemini.mockResolvedValue('gemini-fallback')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('gemini-fallback')
    expect(callGemini).toHaveBeenCalledTimes(1)
  })
})
