// Unit suite for the OpenRouter instruct adapter — a THIN wrapper over the
// shipped BYOK fns in src/lib/openrouter.js (which itself is unchanged).
// Locks: the env VITE_OPENROUTER_KEY never makes hasKey() true (F3 invariant),
// 429-ish failures are mapped to the typed cause 'quota' for the router's
// cooldown logic, and AbortError passes through raw.
// Plan: docs/superpowers/plans/2026-06-10-multi-provider-instruct-router.md (Task 2)

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../openrouter', () => ({
  hasUserOpenRouterKey: vi.fn(),
  callOpenRouter: vi.fn(),
  callOpenRouterVision: vi.fn(),
  verifyOpenRouterKey: vi.fn(),
}))

import { hasUserOpenRouterKey, callOpenRouter, callOpenRouterVision, verifyOpenRouterKey } from '../../openrouter'
import { openrouterAdapter } from '../openrouter.js'

beforeEach(() => { vi.clearAllMocks() })

describe('openrouterAdapter contract', () => {
  it('exposes id/label and delegates hasKey to hasUserOpenRouterKey (env key never counts)', () => {
    expect(openrouterAdapter.id).toBe('openrouter')
    expect(typeof openrouterAdapter.label).toBe('string')
    hasUserOpenRouterKey.mockReturnValue(false)
    expect(openrouterAdapter.hasKey()).toBe(false) // even if env key exists, fn is the gate
    hasUserOpenRouterKey.mockReturnValue(true)
    expect(openrouterAdapter.hasKey()).toBe(true)
  })

  it('call forwards args verbatim and resolves the text', async () => {
    callOpenRouter.mockResolvedValue('Ayat mudah.')
    const ac = new AbortController()
    const args = { systemPrompt: 's', messages: [{ role: 'user', content: 'a' }], maxTokens: 220, signal: ac.signal }
    await expect(openrouterAdapter.call(args)).resolves.toBe('Ayat mudah.')
    expect(callOpenRouter).toHaveBeenCalledWith(args)
  })

  it('maps a 429-ish failure message to cause "quota" without swallowing the original', async () => {
    const orig = new Error('OpenRouter meta-llama/llama-3.3-70b-instruct:free: 429 rate limited')
    callOpenRouter.mockRejectedValue(orig)
    let err = null
    try { await openrouterAdapter.call({ systemPrompt: 's', messages: [] }) } catch (e) { err = e }
    expect(err.cause).toBe('quota')
    expect(err.message).toContain('429')
  })

  it('leaves non-quota failures untyped/untouched', async () => {
    const orig = new Error('OpenRouter some/model:free: empty response')
    callOpenRouter.mockRejectedValue(orig)
    await expect(openrouterAdapter.call({ systemPrompt: 's', messages: [] })).rejects.toBe(orig)
  })

  it('propagates AbortError raw — never wrapped, never typed', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError')
    callOpenRouter.mockRejectedValue(abortErr)
    await expect(openrouterAdapter.call({ systemPrompt: 's', messages: [] })).rejects.toBe(abortErr)
  })

  it('verify delegates to verifyOpenRouterKey (auth-only)', async () => {
    verifyOpenRouterKey.mockResolvedValue(true)
    const ac = new AbortController()
    await expect(openrouterAdapter.verify({ signal: ac.signal })).resolves.toBe(true)
    expect(verifyOpenRouterKey).toHaveBeenCalledWith(undefined, { signal: ac.signal })
  })
})

// ── Phase 2 vision rung (Sharper read) ──────────────────────
describe('openrouterAdapter vision capability', () => {
  it('declares supportsVision and forwards callVision args verbatim', async () => {
    expect(openrouterAdapter.supportsVision).toBe(true)
    callOpenRouterVision.mockResolvedValue('Nasi lemak.')
    const args = { systemPrompt: 's', messages: [], images: [{ mimeType: 'image/png', data: 'B' }] }
    await expect(openrouterAdapter.callVision(args)).resolves.toBe('Nasi lemak.')
    expect(callOpenRouterVision).toHaveBeenCalledWith(args)
  })

  it('maps a 429-ish vision failure to cause "quota" (same as the text path)', async () => {
    const orig = new Error('OpenRouter vl/model-a:free: 429 rate limited')
    callOpenRouterVision.mockRejectedValue(orig)
    let err = null
    try { await openrouterAdapter.callVision({ systemPrompt: 's', messages: [], images: [] }) } catch (e) { err = e }
    expect(err.cause).toBe('quota')
  })

  it('propagates AbortError raw from callVision', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError')
    callOpenRouterVision.mockRejectedValue(abortErr)
    await expect(openrouterAdapter.callVision({ systemPrompt: 's', messages: [], images: [] })).rejects.toBe(abortErr)
    expect(abortErr.cause).toBeUndefined()
  })
})
