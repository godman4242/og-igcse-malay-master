// Provider-agnostic INSTRUCT seam — the single place that decides "does this
// user have a generative instruct model available, and how do we call it?".
//
// Why this exists (spec F3): instruct features (e.g. Option F's simpler-Malay
// sentence rewrite) must be BYOK-gated — the env VITE_OPENROUTER_KEY is the
// deployment owner's own key, and per-sentence generative calls would spend his
// shared rate limit. And the planned multi-provider router (Gemini / Ollama /
// more BYOK keys) needs ONE hook to extend: this file. Callers must therefore
// never hardcode hasUserOpenRouterKey()/callOpenRouter() — they ask this seam.
//
// v1: the only instruct provider is a user-supplied OpenRouter key.

import { hasUserOpenRouterKey, callOpenRouter } from './openrouter'

/**
 * True when the user has their OWN instruct-capable provider configured.
 * Deliberately ignores the shared env key (no-paywall ≠ spend-the-owner's-key).
 * @returns {boolean}
 */
export function hasInstructProvider() {
  return hasUserOpenRouterKey()
}

/**
 * Run one instruct call on the user's provider.
 * @param {{systemPrompt: string, messages: Array<{role:string,content:string}>,
 *          maxTokens?: number, signal?: AbortSignal}} args
 * @returns {Promise<string>} the model's response text; AbortError propagates.
 */
export function callInstruct(args) {
  return callOpenRouter(args)
}
