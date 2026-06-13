// Phase-2 completion increment A — deck generation through the multi-provider
// BYOK instruct router. generateDeckText predated instruct.js (2026-06-10), so
// a learner whose only key is Gemini/Ollama could never generate a deck.
// Contract pinned here: callInstruct FIRST when a provider is configured, the
// pre-existing chain (OpenRouter env/user key → edge proxy) when not, and an
// instruct failure falls through to the old chain instead of rejecting.
// Spec: docs/superpowers/specs/2026-06-13-for-you-phase2-completion-design.md §A

import { describe, it, expect, vi, beforeEach } from 'vitest'

const instructMock = vi.hoisted(() => ({
  hasInstructProvider: vi.fn(),
  callInstruct: vi.fn(),
}))
const openrouterMock = vi.hoisted(() => ({
  isOpenRouterAvailable: vi.fn(),
  callOpenRouter: vi.fn(),
}))
const aiMock = vi.hoisted(() => ({ callAI: vi.fn() }))

vi.mock('../instruct.js', () => instructMock)
vi.mock('../openrouter.js', () => openrouterMock)
vi.mock('../ai.js', () => aiMock)

import { generateDeckText } from '../deckGenerator'

describe('generateDeckText — instruct-router-first chain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    instructMock.hasInstructProvider.mockReturnValue(false)
    openrouterMock.isOpenRouterAvailable.mockReturnValue(false)
    instructMock.callInstruct.mockResolvedValue('instruct text')
    openrouterMock.callOpenRouter.mockResolvedValue('openrouter text')
    aiMock.callAI.mockResolvedValue({ response: 'edge text' })
  })

  it('uses callInstruct FIRST when a BYOK provider is configured', async () => {
    instructMock.hasInstructProvider.mockReturnValue(true)
    openrouterMock.isOpenRouterAvailable.mockReturnValue(true) // even with OpenRouter available
    const text = await generateDeckText({ goal: 'order food' })
    expect(text).toBe('instruct text')
    expect(instructMock.callInstruct).toHaveBeenCalledTimes(1)
    const args = instructMock.callInstruct.mock.calls[0][0]
    expect(typeof args.systemPrompt).toBe('string')
    expect(args.messages?.[0]?.role).toBe('user')
    expect(openrouterMock.callOpenRouter).not.toHaveBeenCalled()
    expect(aiMock.callAI).not.toHaveBeenCalled()
  })

  it('keeps the pre-existing chain when no instruct provider exists (behaviour freeze)', async () => {
    openrouterMock.isOpenRouterAvailable.mockReturnValue(true)
    expect(await generateDeckText({ goal: 'order food' })).toBe('openrouter text')
    expect(instructMock.callInstruct).not.toHaveBeenCalled()

    openrouterMock.isOpenRouterAvailable.mockReturnValue(false)
    expect(await generateDeckText({ goal: 'order food' })).toBe('edge text')
  })

  it('falls through to the old chain when callInstruct fails (never rejects the flow)', async () => {
    instructMock.hasInstructProvider.mockReturnValue(true)
    instructMock.callInstruct.mockRejectedValue(new Error('all adapters cooling down'))
    openrouterMock.isOpenRouterAvailable.mockReturnValue(true)
    expect(await generateDeckText({ goal: 'order food' })).toBe('openrouter text')
  })

  it('propagates AbortError raw (cancel must stay a cancel)', async () => {
    instructMock.hasInstructProvider.mockReturnValue(true)
    const abort = new DOMException('Aborted', 'AbortError')
    instructMock.callInstruct.mockRejectedValue(abort)
    await expect(generateDeckText({ goal: 'order food' })).rejects.toBe(abort)
    expect(openrouterMock.callOpenRouter).not.toHaveBeenCalled()
  })
})
