// Pure-helper test for the eval harness's thinking-budget selector.
//
// thinkingConfigForGrade(model) lives in scripts/ai-tier-eval/thinkingBudget.mjs
// (a tiny standalone pure module), NOT in harness.mjs. Reason: harness.mjs ends
// with a top-level `main().catch(...)`, so importing harness.mjs from a vitest
// test would EXECUTE the whole eval run. A separate pure module keeps the helper
// unit-testable in isolation. harness.mjs imports it.
//
// The selector encodes the per-family thinking knob from the current Gemini docs:
//   gemini-2.5-flash  → thinkingBudget:0   (dynamic thinking ON by default; 0 disables)
//   gemini-3.x-flash  → thinkingLevel:'low' (thinkingLevel defaults to "medium")
//   anything else     → undefined          (omit; let the model default)

import { describe, it, expect } from 'vitest'
import { thinkingConfigForGrade } from '../../../scripts/ai-tier-eval/thinkingBudget.mjs'

describe('thinkingConfigForGrade', () => {
  it('gemini-2.5-flash → { thinkingBudget: 0 }', () => {
    expect(thinkingConfigForGrade('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 })
  })

  it('gemini-3.5-flash → { thinkingLevel: "low" }', () => {
    expect(thinkingConfigForGrade('gemini-3.5-flash')).toEqual({ thinkingLevel: 'low' })
  })

  it('a 3.x sibling (gemini-3.1-flash) → { thinkingLevel: "low" }', () => {
    expect(thinkingConfigForGrade('gemini-3.1-flash')).toEqual({ thinkingLevel: 'low' })
  })

  it('an unknown model → undefined (omit thinkingConfig)', () => {
    expect(thinkingConfigForGrade('something-else')).toBeUndefined()
  })
})
