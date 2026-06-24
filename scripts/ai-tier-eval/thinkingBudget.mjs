// Thinking-budget selector for the eval harness's Content (task-aware grade)
// surface. Standalone + pure so it's unit-testable in isolation — harness.mjs
// ends with a top-level `main().catch(...)`, so a test importing harness.mjs
// would execute the whole eval run; importing THIS module does not.
//
// Why per family (grounded in the current Gemini docs, 2026-06):
//   gemini-2.5-flash: dynamic thinking is ON by default; the knob is
//     generationConfig.thinkingConfig.thinkingBudget — set 0 to DISABLE thinking
//     so it can't eat the maxOutputTokens budget mid-JSON.
//   gemini-3.x-flash (3.5 / 3.1 …): thinkingConfig.thinkingLevel defaults to
//     "medium"; valid values include "low" / "high". We pick "low" — minimal
//     thinking, leaving the output budget for the (bigger) task-aware JSON.
//   anything else: omit thinkingConfig (undefined) and let the model default —
//     we don't guess a knob shape for a family we don't recognise.
//
// Order matters: check '2.5' BEFORE the generic '3.' so a future 'gemini-2.5…'
// can never fall through to the 3.x branch.

/**
 * @param {string} model  e.g. 'gemini-2.5-flash', 'gemini-3.5-flash'
 * @returns {{thinkingBudget:0}|{thinkingLevel:'low'}|undefined}
 *   undefined ⇒ caller should OMIT thinkingConfig entirely.
 */
export function thinkingConfigForGrade(model) {
  const m = String(model || '')
  if (m.includes('2.5')) return { thinkingBudget: 0 }
  if (m.includes('3.')) return { thinkingLevel: 'low' }
  return undefined
}
