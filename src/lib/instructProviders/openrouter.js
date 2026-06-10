// OpenRouter instruct adapter — a THIN wrapper over the shipped BYOK layer in
// src/lib/openrouter.js (unchanged). The gate stays the USER key only: the env
// VITE_OPENROUTER_KEY never makes hasKey() true (F3 invariant — no-paywall ≠
// spend-the-owner's-key).
//
// callOpenRouter throws untyped Errors with the HTTP status embedded in the
// message ("OpenRouter <model>: 429 …") — map the 429 shape to the typed cause
// 'quota' so the router's cooldown/auto-switch logic can react; everything
// else (incl. AbortError) passes through raw.
// SECURITY BAR: this module must not import useStore.

import { hasUserOpenRouterKey, callOpenRouter, verifyOpenRouterKey } from '../openrouter'

export const openrouterAdapter = {
  id: 'openrouter',
  label: 'OpenRouter',
  hasKey: hasUserOpenRouterKey,
  call: async (args) => {
    try {
      return await callOpenRouter(args)
    } catch (err) {
      if (err?.name !== 'AbortError' && !err?.cause && /:\s*429\b/.test(err?.message || '')) {
        err.cause = 'quota'
      }
      throw err
    }
  },
  verify: ({ signal } = {}) => verifyOpenRouterKey(undefined, { signal }),
}
