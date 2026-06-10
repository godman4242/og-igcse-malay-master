// Unit suite for the callTextAI provider router. Mocks the providers so we
// can assert the strict-opt-in routing + fallback without real network.
// Design: docs/superpowers/specs/2026-05-30-byok-design.md
// User-Gemini rung: the multi-provider router fast-follow (2026-06-10) —
// user OpenRouter → user Gemini (client-direct) → server Gemini proxy.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { callOpenRouter, callGemini, callGeminiByok, state } = vi.hoisted(() => ({
  callOpenRouter: vi.fn(),
  callGemini: vi.fn(),
  callGeminiByok: vi.fn(),
  state: { userKeyPresent: false, geminiKeyPresent: false },
}))

vi.mock('../openrouter.js', () => ({
  hasUserOpenRouterKey: () => state.userKeyPresent,
  callOpenRouter,
}))
vi.mock('../gemini.js', () => ({ callGemini }))
vi.mock('../instructProviders/gemini.js', () => ({
  hasUserGeminiKey: () => state.geminiKeyPresent,
  callGeminiByok,
}))

import { callTextAI } from '../aiText.js'

describe('callTextAI routing', () => {
  beforeEach(() => {
    callOpenRouter.mockReset()
    callGemini.mockReset()
    callGeminiByok.mockReset()
    state.userKeyPresent = false
    state.geminiKeyPresent = false
  })

  it('routes to the server Gemini default when no user key is set', async () => {
    callGemini.mockResolvedValue('gemini-says')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('gemini-says')
    expect(callOpenRouter).not.toHaveBeenCalled()
    expect(callGeminiByok).not.toHaveBeenCalled()
  })

  it("routes to OpenRouter on the user's key when set", async () => {
    state.userKeyPresent = true
    callOpenRouter.mockResolvedValue('or-says')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('or-says')
    expect(callGemini).not.toHaveBeenCalled()
    expect(callGeminiByok).not.toHaveBeenCalled()
  })

  it('falls back to Gemini when the OpenRouter call throws (no dead end)', async () => {
    state.userKeyPresent = true
    callOpenRouter.mockRejectedValue(new Error('boom'))
    callGemini.mockResolvedValue('gemini-fallback')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('gemini-fallback')
    expect(callGemini).toHaveBeenCalledTimes(1)
  })

  it("routes to the user's Gemini key (client-direct) when set, ahead of the server proxy", async () => {
    state.geminiKeyPresent = true
    callGeminiByok.mockResolvedValue('byok-gemini-says')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('byok-gemini-says')
    expect(callOpenRouter).not.toHaveBeenCalled()
    expect(callGemini).not.toHaveBeenCalled()
  })

  it('prefers the user OpenRouter key over the user Gemini key (shipped order unchanged)', async () => {
    state.userKeyPresent = true
    state.geminiKeyPresent = true
    callOpenRouter.mockResolvedValue('or-says')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('or-says')
    expect(callGeminiByok).not.toHaveBeenCalled()
    expect(callGemini).not.toHaveBeenCalled()
  })

  it('falls OpenRouter → user Gemini → returns without touching the server when user Gemini succeeds', async () => {
    state.userKeyPresent = true
    state.geminiKeyPresent = true
    callOpenRouter.mockRejectedValue(new Error('429'))
    callGeminiByok.mockResolvedValue('byok-gemini-fallback')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('byok-gemini-fallback')
    expect(callGemini).not.toHaveBeenCalled()
  })

  it('falls back to the server proxy when the user Gemini call throws (no dead end)', async () => {
    state.geminiKeyPresent = true
    callGeminiByok.mockRejectedValue(new Error('quota'))
    callGemini.mockResolvedValue('server-fallback')
    const out = await callTextAI({ systemPrompt: 's', messages: [] })
    expect(out).toBe('server-fallback')
    expect(callGemini).toHaveBeenCalledTimes(1)
  })

  it('propagates an AbortError from the user Gemini call without hitting the server', async () => {
    state.geminiKeyPresent = true
    const abort = new DOMException('aborted', 'AbortError')
    callGeminiByok.mockRejectedValue(abort)
    await expect(callTextAI({ systemPrompt: 's', messages: [] })).rejects.toBe(abort)
    expect(callGemini).not.toHaveBeenCalled()
  })
})
