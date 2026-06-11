// Provider-agnostic instruct seam — now a multi-provider ROUTER over the
// adapter registry in src/lib/instructProviders/. The public API
// (hasInstructProvider / callInstruct) is FROZEN: PDFReader and every future
// instruct caller go through it unchanged.
//
// Router semantics pinned here: auto-order (registry order, configured only),
// preferred-first override, cooldown skip with exponential growth on
// consecutive quota failures (120s → ×2 → cap 30 min), all-cooling still
// tries, switch events on non-first success, AbortError propagates raw with
// no cooldown and no event, all-fail throws the LAST error.
// Spec: docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md
// Plan: docs/superpowers/plans/2026-06-10-multi-provider-instruct-router.md (Task 3)

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// Vision capability mirrors the real registry: openrouter + gemini see,
// ollama does NOT (spec D5 — excluded from the vision rung).
vi.mock('../instructProviders/openrouter', () => ({
  openrouterAdapter: { id: 'openrouter', label: 'OpenRouter', hasKey: vi.fn(), call: vi.fn(), verify: vi.fn(), supportsVision: true, callVision: vi.fn() },
}))
vi.mock('../instructProviders/gemini', () => ({
  geminiAdapter: { id: 'gemini', label: 'Gemini', hasKey: vi.fn(), call: vi.fn(), verify: vi.fn(), supportsVision: true, callVision: vi.fn() },
}))
vi.mock('../instructProviders/ollama', () => ({
  ollamaAdapter: { id: 'ollama', label: 'Ollama (local)', hasKey: vi.fn(), call: vi.fn(), verify: vi.fn() },
}))
vi.mock('../telemetry', () => ({ trackEvent: vi.fn() }))

import { openrouterAdapter } from '../instructProviders/openrouter'
import { geminiAdapter } from '../instructProviders/gemini'
import { ollamaAdapter } from '../instructProviders/ollama'
import { trackEvent } from '../telemetry'
import {
  hasInstructProvider, callInstruct,
  getConfiguredInstructProviders, setInstructPreference, getInstructPreference,
  subscribeInstructSwitch, __resetInstructRouter,
  hasVisionProvider, callInstructVision, getConfiguredVisionProviders,
} from '../instruct'

// The vitest env is 'node': minimal in-memory localStorage for the
// preference slot (same pattern as openrouterModels.test.js).
beforeAll(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
})

const T0 = 1_000_000_000_000
const ARGS = { systemPrompt: 'sys', messages: [{ role: 'user', content: 'ayat' }], maxTokens: 220 }
const quotaErr = (msg = 'quota hit') => Object.assign(new Error(msg), { cause: 'quota' })

beforeEach(() => {
  vi.clearAllMocks()
  __resetInstructRouter()
  setInstructPreference('auto')
  openrouterAdapter.hasKey.mockReturnValue(false)
  geminiAdapter.hasKey.mockReturnValue(false)
  ollamaAdapter.hasKey.mockReturnValue(false)
})

describe('hasInstructProvider', () => {
  it('is true when ANY adapter has a key, false when none do', () => {
    expect(hasInstructProvider()).toBe(false)
    geminiAdapter.hasKey.mockReturnValue(true)
    expect(hasInstructProvider()).toBe(true)
    geminiAdapter.hasKey.mockReturnValue(false)
    openrouterAdapter.hasKey.mockReturnValue(true)
    expect(hasInstructProvider()).toBe(true)
  })
})

describe('ordering', () => {
  it('auto-order is registry order (openrouter → gemini → ollama last), configured only', () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    expect(getConfiguredInstructProviders().map(p => p.id)).toEqual(['openrouter', 'gemini'])
    openrouterAdapter.hasKey.mockReturnValue(false)
    expect(getConfiguredInstructProviders().map(p => p.id)).toEqual(['gemini'])
    // ollama is always LAST in auto-order even when configured
    ollamaAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.hasKey.mockReturnValue(true)
    expect(getConfiguredInstructProviders().map(p => p.id)).toEqual(['openrouter', 'gemini', 'ollama'])
  })

  it('a preferred provider goes first; auto/unset/unknown keep auto-order', () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    setInstructPreference('gemini')
    expect(getInstructPreference()).toBe('gemini')
    expect(getConfiguredInstructProviders().map(p => p.id)).toEqual(['gemini', 'openrouter'])
    setInstructPreference('auto')
    expect(getConfiguredInstructProviders().map(p => p.id)).toEqual(['openrouter', 'gemini'])
    setInstructPreference('nonsense-id')
    expect(getConfiguredInstructProviders().map(p => p.id)).toEqual(['openrouter', 'gemini'])
  })

  it('callInstruct consults the preferred provider first', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.call.mockResolvedValue('dari gemini')
    setInstructPreference('gemini')
    await expect(callInstruct(ARGS)).resolves.toBe('dari gemini')
    expect(geminiAdapter.call).toHaveBeenCalledWith(ARGS)
    expect(openrouterAdapter.call).not.toHaveBeenCalled()
  })
})

describe('callInstruct routing', () => {
  it('forwards args verbatim and resolves on first-choice success — no switch event', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.call.mockResolvedValue('Ayat mudah.')
    const cb = vi.fn()
    subscribeInstructSwitch(cb)

    await expect(callInstruct(ARGS)).resolves.toBe('Ayat mudah.')
    expect(openrouterAdapter.call).toHaveBeenCalledTimes(1)
    expect(openrouterAdapter.call).toHaveBeenCalledWith(ARGS)
    expect(geminiAdapter.call).not.toHaveBeenCalled()
    expect(cb).not.toHaveBeenCalled()
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('throws when no provider is configured, without calling any adapter', async () => {
    await expect(callInstruct(ARGS)).rejects.toThrow()
    expect(openrouterAdapter.call).not.toHaveBeenCalled()
    expect(geminiAdapter.call).not.toHaveBeenCalled()
  })

  it('falls through on quota and fires ONE switch event {from, to, cause}', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.call.mockRejectedValue(quotaErr())
    geminiAdapter.call.mockResolvedValue('fallback text')
    const cb = vi.fn()
    subscribeInstructSwitch(cb)

    await expect(callInstruct(ARGS, { now: T0 })).resolves.toBe('fallback text')
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0]).toMatchObject({ from: 'openrouter', to: 'gemini', cause: 'quota' })
    // telemetry carries provider ids only — never key material
    expect(trackEvent).toHaveBeenCalledWith('instruct_provider_switch',
      expect.objectContaining({ from: 'openrouter', to: 'gemini', cause: 'quota' }))
  })

  it('rejects with the LAST error when every adapter fails', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.call.mockRejectedValue(new Error('first failure'))
    const last = new Error('second failure')
    geminiAdapter.call.mockRejectedValue(last)
    await expect(callInstruct(ARGS, { now: T0 })).rejects.toBe(last)
  })

  it('AbortError rethrows immediately — no further adapters, no cooldown, no event', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    const abortErr = new DOMException('Aborted', 'AbortError')
    openrouterAdapter.call.mockRejectedValueOnce(abortErr)
    const cb = vi.fn()
    subscribeInstructSwitch(cb)

    await expect(callInstruct(ARGS, { now: T0 })).rejects.toBe(abortErr)
    expect(geminiAdapter.call).not.toHaveBeenCalled()
    expect(cb).not.toHaveBeenCalled()

    // no cooldown was set: the very next call tries openrouter again
    openrouterAdapter.call.mockResolvedValueOnce('recovered')
    await expect(callInstruct(ARGS, { now: T0 + 1000 })).resolves.toBe('recovered')
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('cooldowns', () => {
  beforeEach(() => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
  })

  it('a failed adapter is skipped while cooling, and tried again after expiry', async () => {
    openrouterAdapter.call.mockRejectedValueOnce(quotaErr())
    geminiAdapter.call.mockResolvedValue('via gemini')
    await callInstruct(ARGS, { now: T0 })
    expect(openrouterAdapter.call).toHaveBeenCalledTimes(1)

    // 60s later: openrouter still cooling (base 120s) — straight to gemini
    await callInstruct(ARGS, { now: T0 + 60_000 })
    expect(openrouterAdapter.call).toHaveBeenCalledTimes(1)
    expect(geminiAdapter.call).toHaveBeenCalledTimes(2)

    // 121s later: cooldown expired — openrouter tried again
    openrouterAdapter.call.mockResolvedValueOnce('back on openrouter')
    await expect(callInstruct(ARGS, { now: T0 + 121_000 })).resolves.toBe('back on openrouter')
  })

  it('consecutive quota failures double the cooldown (120s → 240s)', async () => {
    openrouterAdapter.call.mockRejectedValue(quotaErr())
    geminiAdapter.call.mockResolvedValue('via gemini')

    await callInstruct(ARGS, { now: T0 })                 // fail #1 → cool 120s
    const t1 = T0 + 121_000
    await callInstruct(ARGS, { now: t1 })                 // expired → fail #2 → cool 240s
    expect(openrouterAdapter.call).toHaveBeenCalledTimes(2)

    await callInstruct(ARGS, { now: t1 + 200_000 })       // 200s < 240s → skipped
    expect(openrouterAdapter.call).toHaveBeenCalledTimes(2)

    await callInstruct(ARGS, { now: t1 + 241_000 })       // expired → tried (fail #3)
    expect(openrouterAdapter.call).toHaveBeenCalledTimes(3)
  })

  it('caps the quota cooldown at 30 minutes', async () => {
    openrouterAdapter.call.mockRejectedValue(quotaErr())
    geminiAdapter.call.mockResolvedValue('via gemini')

    // Drive many consecutive quota failures, each after the prior cooldown.
    let now = T0
    for (let i = 0; i < 12; i++) {
      await callInstruct(ARGS, { now })
      now += 31 * 60_000 // always past any cooldown ≤ 30 min
    }
    const tries = openrouterAdapter.call.mock.calls.length
    expect(tries).toBe(12) // every attempt went through ⇒ no cooldown exceeded 30 min

    // And the cooldown is genuinely ~30 min now, not still doubling:
    await callInstruct(ARGS, { now: now - 31 * 60_000 + 29 * 60_000 }) // 29 min after last fail → skipped
    expect(openrouterAdapter.call.mock.calls.length).toBe(tries)
    await callInstruct(ARGS, { now: now - 31 * 60_000 + 30 * 60_000 + 1000 }) // >30 min → tried
    expect(openrouterAdapter.call.mock.calls.length).toBe(tries + 1)
  })

  it('a success resets the consecutive-quota escalation', async () => {
    openrouterAdapter.call.mockRejectedValueOnce(quotaErr())
    geminiAdapter.call.mockResolvedValue('via gemini')
    await callInstruct(ARGS, { now: T0 })                          // fail #1 → 120s

    openrouterAdapter.call.mockResolvedValueOnce('ok again')
    await expect(callInstruct(ARGS, { now: T0 + 121_000 })).resolves.toBe('ok again') // success → reset

    openrouterAdapter.call.mockRejectedValueOnce(quotaErr())
    await callInstruct(ARGS, { now: T0 + 122_000 })                // fail → 120s again (not 240s)
    openrouterAdapter.call.mockResolvedValueOnce('after base cooldown')
    await expect(callInstruct(ARGS, { now: T0 + 122_000 + 121_000 })).resolves.toBe('after base cooldown')
  })

  it('when ALL configured adapters are cooling, they are tried anyway (never dead-end untried)', async () => {
    openrouterAdapter.call.mockRejectedValueOnce(new Error('down'))
    geminiAdapter.call.mockRejectedValueOnce(new Error('down too'))
    await expect(callInstruct(ARGS, { now: T0 })).rejects.toThrow('down too')

    // 10s later both are cooling — but the call must still attempt them.
    openrouterAdapter.call.mockResolvedValueOnce('tried anyway')
    await expect(callInstruct(ARGS, { now: T0 + 10_000 })).resolves.toBe('tried anyway')
  })
})

// ── Phase 2 vision rung — callInstructVision (Sharper read) ─────────────
// Routes ONLY to supportsVision adapters (R2: an image must never reach a
// blind text model), reusing the same cooldown/switch machinery. callInstruct
// is FROZEN — its suites above pin that the refactor changed nothing.
// Spec: docs/superpowers/specs/2026-06-11-past-paper-ocr-vision-rung-design.md (Fork 1B)

const VARGS = {
  systemPrompt: 'sys',
  messages: [{ role: 'user', content: 'transcribe' }],
  images: [{ mimeType: 'image/png', data: 'B64' }],
}

describe('hasVisionProvider / getConfiguredVisionProviders', () => {
  it('is true only when a VISION-capable adapter has a key (ollama never counts)', () => {
    expect(hasVisionProvider()).toBe(false)
    ollamaAdapter.hasKey.mockReturnValue(true)
    expect(hasVisionProvider()).toBe(false) // configured but blind
    expect(hasInstructProvider()).toBe(true) // …yet still a TEXT provider
    geminiAdapter.hasKey.mockReturnValue(true)
    expect(hasVisionProvider()).toBe(true)
  })

  it('lists only vision-capable providers, in call order with preferred-first', () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    ollamaAdapter.hasKey.mockReturnValue(true)
    expect(getConfiguredVisionProviders().map(p => p.id)).toEqual(['openrouter', 'gemini'])
    setInstructPreference('gemini')
    expect(getConfiguredVisionProviders().map(p => p.id)).toEqual(['gemini', 'openrouter'])
  })
})

describe('callInstructVision routing', () => {
  it('throws cause no_vision_provider when no vision-capable adapter is configured', async () => {
    await expect(callInstructVision(VARGS)).rejects.toMatchObject({ cause: 'no_vision_provider' })
    // a configured TEXT-ONLY provider must not change that — and must never be invoked
    ollamaAdapter.hasKey.mockReturnValue(true)
    await expect(callInstructVision(VARGS)).rejects.toMatchObject({ cause: 'no_vision_provider' })
    expect(ollamaAdapter.call).not.toHaveBeenCalled()
  })

  it('routes to the first vision adapter with args verbatim — never .call()', async () => {
    geminiAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.callVision.mockResolvedValue('Nasi lemak.')
    await expect(callInstructVision(VARGS)).resolves.toBe('Nasi lemak.')
    expect(geminiAdapter.callVision).toHaveBeenCalledWith(VARGS)
    expect(geminiAdapter.call).not.toHaveBeenCalled()
  })

  it('auto-switches to the next vision provider on quota and fires the switch event', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.callVision.mockRejectedValue(quotaErr())
    geminiAdapter.callVision.mockResolvedValue('TEXT')
    const cb = vi.fn()
    subscribeInstructSwitch(cb)

    await expect(callInstructVision(VARGS, { now: T0 })).resolves.toBe('TEXT')
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0]).toMatchObject({ from: 'openrouter', to: 'gemini', cause: 'quota' })
    expect(trackEvent).toHaveBeenCalledWith('instruct_provider_switch',
      expect.objectContaining({ from: 'openrouter', to: 'gemini', cause: 'quota' }))
  })

  it('a vision quota failure cools the provider for the TEXT path too (one quota pool per key)', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.callVision.mockRejectedValue(quotaErr())
    geminiAdapter.callVision.mockResolvedValue('vision ok')
    await callInstructVision(VARGS, { now: T0 })

    geminiAdapter.call.mockResolvedValue('text via gemini')
    await expect(callInstruct(ARGS, { now: T0 + 60_000 })).resolves.toBe('text via gemini')
    expect(openrouterAdapter.call).not.toHaveBeenCalled() // still cooling from the vision 429
  })

  it('AbortError rethrows immediately — no fallback, no cooldown, no event', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    const abortErr = new DOMException('Aborted', 'AbortError')
    openrouterAdapter.callVision.mockRejectedValueOnce(abortErr)
    const cb = vi.fn()
    subscribeInstructSwitch(cb)

    await expect(callInstructVision(VARGS, { now: T0 })).rejects.toBe(abortErr)
    expect(geminiAdapter.callVision).not.toHaveBeenCalled()
    expect(cb).not.toHaveBeenCalled()
  })

  it('rejects with the LAST error when every vision adapter fails', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.callVision.mockRejectedValue(new Error('first'))
    const last = new Error('second')
    geminiAdapter.callVision.mockRejectedValue(last)
    await expect(callInstructVision(VARGS, { now: T0 })).rejects.toBe(last)
  })

  it('GUARD: callInstruct is unchanged — a text-only provider still serves it, vision fields ignored', async () => {
    ollamaAdapter.hasKey.mockReturnValue(true)
    ollamaAdapter.call.mockResolvedValue('dari ollama')
    await expect(callInstruct(ARGS)).resolves.toBe('dari ollama')
    expect(ollamaAdapter.call).toHaveBeenCalledWith(ARGS)
    // and callInstruct NEVER consults callVision
    expect(openrouterAdapter.callVision).not.toHaveBeenCalled()
    expect(geminiAdapter.callVision).not.toHaveBeenCalled()
  })
})

describe('subscribeInstructSwitch', () => {
  it('returns an unsubscribe fn; an unsubscribed callback never fires', async () => {
    openrouterAdapter.hasKey.mockReturnValue(true)
    geminiAdapter.hasKey.mockReturnValue(true)
    openrouterAdapter.call.mockRejectedValue(quotaErr())
    geminiAdapter.call.mockResolvedValue('fallback')

    const cb = vi.fn()
    const unsub = subscribeInstructSwitch(cb)
    unsub()
    await callInstruct(ARGS, { now: T0 })
    expect(cb).not.toHaveBeenCalled()
  })
})
