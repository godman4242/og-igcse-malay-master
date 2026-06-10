// "Higher quality" translation provider — routes Malay→English glosses through
// OpenRouter's free instruct models (via the shared `callOpenRouter` chain),
// which read more idiomatically than the free `gtx` endpoint, especially for
// phrases and sentences. Same `{ one, batch }` shape as the gtx/google/deepl
// providers so the router can treat it interchangeably.
//
// The numbered-list prompt/parse/per-word-fallback core lives in
// instructTranslate.js (shared with the user-Gemini quality provider).
// Availability deliberately includes the env key (`isOpenRouterAvailable`) —
// the deployed site's env key lights quality glosses for everyone; only the
// UI *toggle* is user-key-gated.

import { callOpenRouter, isOpenRouterAvailable } from '../../openrouter'
import { makeInstructTranslator, parseNumberedList } from './instructTranslate'

// Re-exported for existing import sites/tests; the implementation moved to
// instructTranslate.js unchanged.
export { parseNumberedList }

const translator = makeInstructTranslator({
  providerId: 'openrouter',
  isAvailable: isOpenRouterAvailable,
  call: callOpenRouter,
})

/**
 * Translate a batch of texts via OpenRouter. Throws if OpenRouter is unavailable
 * or the model call fails (so the router degrades to gtx). Empty input → [].
 *
 * @param {string[]} texts
 * @param {string} [from]
 * @param {string} [to]
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<Array<{text:string,source:string,provider:string}>>}
 */
export const openrouterTranslateBatch = translator.batch

/**
 * Single-item convenience mirroring the other providers' `*One` export.
 *
 * @param {string} text
 * @param {string} [from]
 * @param {string} [to]
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<{text:string,source:string,provider:string}>}
 */
export const openrouterTranslateOne = translator.one
