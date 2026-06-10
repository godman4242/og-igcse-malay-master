// Provider router for text AI calls. One place that decides which backend a
// call uses, so the rest of the app stays provider-agnostic.
//
// Rule (strict opt-in): only a USER-supplied key reroutes the Gemini-default
// features — so users who haven't opted in behave EXACTLY as before. Order:
// user OpenRouter key → user Gemini key (client-direct, never our proxy) →
// the server Gemini proxy. Unlike the BYOK-only instruct seam (instruct.js),
// the server fallback is part of this router's contract — these features must
// never dead-end for keyless users.
//
// All providers share the { systemPrompt, messages, maxTokens, signal }
// contract and return a string, so JSON-parsing call sites are unaffected.
// Design: docs/superpowers/specs/2026-05-30-byok-design.md (+ the 2026-06-10
// multi-provider router fast-follow: user Gemini ahead of the server proxy).

import { hasUserOpenRouterKey, callOpenRouter } from './openrouter'
import { hasUserGeminiKey, callGeminiByok } from './instructProviders/gemini'
import { callGemini } from './gemini'

export async function callTextAI(opts) {
  if (hasUserOpenRouterKey()) {
    try {
      return await callOpenRouter(opts)
    } catch {
      // Their key/model hiccuped — fall through to the next provider.
    }
  }
  if (hasUserGeminiKey()) {
    try {
      return await callGeminiByok(opts)
    } catch (err) {
      // A cancelled call must stay cancelled — don't retry it on the server.
      if (err?.name === 'AbortError') throw err
      // Quota/network hiccup — fall through to the server default.
    }
  }
  return callGemini(opts)
}
