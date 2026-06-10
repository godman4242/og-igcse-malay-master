// "Higher quality" translation provider on the user's OWN Gemini key
// (client-direct via the instructProviders/gemini adapter — never our
// /api/gemini proxy, which runs on the deployment owner's key). Same
// `{ one, batch }` shape as the other providers; the numbered-list
// prompt/parse/per-word-fallback core is shared via instructTranslate.js.
//
// Availability is the USER key only — there is no env-Gemini translate path,
// so a keyless user can never reach this provider. A genuine failure THROWS
// so the router (`providerOrder`) degrades to the free gtx chain.
// Decision: 2026-06-10 quality-translate fork, resolved ADDITIVE (user keys
// add quality providers; env OpenRouter + free gtx paths unchanged).

import { callGeminiByok, hasUserGeminiKey } from '../../instructProviders/gemini'
import { makeInstructTranslator } from './instructTranslate'

const translator = makeInstructTranslator({
  providerId: 'gemini',
  isAvailable: hasUserGeminiKey,
  call: callGeminiByok,
})

/**
 * Translate a batch of texts on the user's Gemini key. Throws when no key is
 * configured or the model call fails (so the router degrades to gtx).
 * Empty input → [].
 *
 * @param {string[]} texts
 * @param {string} [from]
 * @param {string} [to]
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<Array<{text:string,source:string,provider:string}>>}
 */
export const geminiTranslateBatch = translator.batch

/**
 * Single-item convenience mirroring the other providers' `*One` export.
 *
 * @param {string} text
 * @param {string} [from]
 * @param {string} [to]
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<{text:string,source:string,provider:string}>}
 */
export const geminiTranslateOne = translator.one
