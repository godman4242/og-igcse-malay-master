// Provider router for text AI calls. One place that decides which backend a
// call uses, so the rest of the app stays provider-agnostic.
//
// Rule (strict opt-in): only a USER-supplied OpenRouter key reroutes the
// Gemini-default features — so users who haven't opted in behave EXACTLY as
// before. On any OpenRouter error we fall back to the server Gemini proxy, so
// the user never hits a dead end.
//
// Both providers share the { systemPrompt, messages, maxTokens, signal }
// contract and return a string, so JSON-parsing call sites are unaffected.
// Design: docs/superpowers/specs/2026-05-30-byok-design.md

import { hasUserOpenRouterKey, callOpenRouter } from './openrouter'
import { callGemini } from './gemini'

export async function callTextAI(opts) {
  if (hasUserOpenRouterKey()) {
    try {
      return await callOpenRouter(opts)
    } catch {
      // Their key/model hiccuped — fall through to the server default.
    }
  }
  return callGemini(opts)
}
