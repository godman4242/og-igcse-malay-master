// Provider-agnostic INSTRUCT seam — the single place that decides "does this
// user have a generative instruct model available, and how do we call it?".
//
// Why this exists (spec F3): instruct features (e.g. Option F's simpler-Malay
// sentence rewrite) must be BYOK-gated — the env VITE_OPENROUTER_KEY is the
// deployment owner's own key, and per-sentence generative calls would spend his
// shared rate limit. Callers must never hardcode a provider — they ask this seam.
//
// v2 (multi-provider router, spec 2026-06-10): a registry of provider adapters
// (src/lib/instructProviders/ — each {id, label, hasKey, call, verify} with its
// OWN localStorage key slot, never the Zustand store). callInstruct tries the
// preferred provider first; on failure it puts that provider on a cooldown
// (base 120s, doubling per consecutive quota failure, cap 30 min, in-memory
// only) and falls through to the next configured one. A successful fallback
// emits a switch event (subscribeInstructSwitch — surfaced as a Layout toast)
// and an ids-only telemetry event. PUBLIC API FROZEN: hasInstructProvider() /
// callInstruct(args) keep their signatures and semantics (string-resolving,
// AbortError-propagating) — PDFReader and future callers need zero edits.

import { openrouterAdapter } from './instructProviders/openrouter'
import { geminiAdapter } from './instructProviders/gemini'
import { trackEvent } from './telemetry'

// Auto-order: quality + speed first, local last (spec R9). Adding provider #4
// = one adapter module + one line here.
const REGISTRY = [openrouterAdapter, geminiAdapter]

const PREFERRED_STORAGE = 'igcse-instruct-preferred'

const COOLDOWN_BASE_MS = 120_000
const COOLDOWN_CAP_MS = 30 * 60_000

// In-memory only (a reload forgets cooldowns — fine, by design).
// id → { until: ms, quotaStreak: n, lastCause: string }
let cooldowns = new Map()
let listeners = new Set()

/**
 * True when the user has their OWN instruct-capable provider configured.
 * Deliberately ignores shared env keys (no-paywall ≠ spend-the-owner's-key).
 * Sync — safe to call in render.
 * @returns {boolean}
 */
export function hasInstructProvider() {
  return REGISTRY.some(a => a.hasKey())
}

/** The user's preferred provider id, or 'auto' (default). */
export function getInstructPreference() {
  try { return localStorage.getItem(PREFERRED_STORAGE) || 'auto' } catch { return 'auto' }
}

export function setInstructPreference(id) {
  try {
    if (id && id !== 'auto') localStorage.setItem(PREFERRED_STORAGE, id)
    else localStorage.removeItem(PREFERRED_STORAGE)
  } catch { /* private mode — preference just won't persist */ }
}

// Configured adapters in call order: preferred first (when set and configured),
// the rest in registry auto-order.
function orderedAdapters() {
  const configured = REGISTRY.filter(a => a.hasKey())
  const pref = getInstructPreference()
  if (pref !== 'auto') {
    const idx = configured.findIndex(a => a.id === pref)
    if (idx > 0) {
      const [preferred] = configured.splice(idx, 1)
      configured.unshift(preferred)
    }
  }
  return configured
}

/** Configured providers ({id, label}) in call order — for the Settings picker. */
export function getConfiguredInstructProviders() {
  return orderedAdapters().map(a => ({ id: a.id, label: a.label }))
}

/**
 * Subscribe to provider auto-switch events ({from, to, cause, ts}).
 * @returns {() => void} unsubscribe
 */
export function subscribeInstructSwitch(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function emitSwitch(payload) {
  // ids only — never key material (key-security bar)
  trackEvent('instruct_provider_switch', { from: payload.from, to: payload.to, cause: payload.cause })
  for (const cb of [...listeners]) {
    try { cb(payload) } catch { /* one bad listener never breaks the call */ }
  }
}

function isCooling(id, now) {
  const c = cooldowns.get(id)
  return !!c && now < c.until
}

function noteFailure(id, cause, now) {
  const prev = cooldowns.get(id)
  const quotaStreak = cause === 'quota' ? ((prev?.quotaStreak || 0) + 1) : 0
  const duration = quotaStreak > 1
    ? Math.min(COOLDOWN_BASE_MS * 2 ** (quotaStreak - 1), COOLDOWN_CAP_MS)
    : COOLDOWN_BASE_MS
  cooldowns.set(id, { until: now + duration, quotaStreak, lastCause: cause || 'error' })
}

/**
 * Run one instruct call on the user's best available provider.
 * Tries configured adapters in order, skipping any on active cooldown (unless
 * ALL are cooling — then they're tried anyway; never dead-end untried). A
 * success by a non-first adapter emits a switch event. All-fail throws the
 * last error; AbortError always propagates raw, immediately.
 *
 * @param {{systemPrompt: string, messages: Array<{role:string,content:string}>,
 *          maxTokens?: number, signal?: AbortSignal}} args
 * @param {{now?: number}} [opts] test seam — time injection
 * @returns {Promise<string>} the model's response text
 */
export async function callInstruct(args, { now = Date.now() } = {}) {
  const configured = orderedAdapters()
  if (!configured.length) {
    const err = new Error('No instruct provider configured')
    err.cause = 'no_key'
    throw err
  }

  const active = configured.filter(a => !isCooling(a.id, now))
  const toTry = active.length ? active : configured
  const first = configured[0]

  let lastError = null
  for (const adapter of toTry) {
    try {
      const text = await adapter.call(args)
      const c = cooldowns.get(adapter.id)
      if (c) cooldowns.delete(adapter.id) // success resets cooldown + quota streak
      if (adapter.id !== first.id) {
        // The first choice either failed this call or was skipped on cooldown.
        const cause = lastError?.cause || cooldowns.get(first.id)?.lastCause || 'error'
        emitSwitch({ from: first.id, to: adapter.id, cause, ts: now })
      }
      return text
    } catch (err) {
      if (err?.name === 'AbortError') throw err // cancellation: no cooldown, no event
      noteFailure(adapter.id, err?.cause, now)
      lastError = err
    }
  }
  throw lastError
}

/** Test-only: clear cooldowns and listeners between unit tests. */
export function __resetInstructRouter() {
  cooldowns = new Map()
  listeners = new Set()
}
