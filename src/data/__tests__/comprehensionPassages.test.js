import { describe, it, expect } from 'vitest'
import COMPREHENSION_PASSAGES from '../comprehensionPassages.js'

// Content-truth + answer-key integrity coverage for the Paper-1 comprehension
// fallback bank. `correctIndex` is the GRADED key (Comprehension.jsx compares the
// learner's choice against it and renders options[correctIndex] as "Correct:"), so
// a mismarked key teaches a confident-wrong answer — the worst failure for a
// learning tool. These tests pin the one bug found (the "memakan" affix key) plus
// a key-resolves-in-range invariant over the whole bank.

const byId = (id) => COMPREHENSION_PASSAGES.find((p) => p.id === id)

describe('comprehensionPassages — "memakan" affix key (content truth)', () => {
  const kesihatan = byId('kesihatan')
  // The grammar question asking about the affix on the passage word "memakan".
  const q = kesihatan?.questions.find((x) => /memakan/.test(x.question))

  it('the kesihatan passage and its "memakan" affix question exist', () => {
    expect(kesihatan).toBeTruthy()
    expect(q).toBeTruthy()
  })

  it('marks the affix on "memakan" as the prefix "me-", NOT a meN-...-kan suffix', () => {
    // "memakan" = meN- + makan; makan is m-initial (l/m/n/r/w/y → no change),
    // so the prefix surfaces as "me-" with NO suffix. The correct option is "A) me-".
    expect(q.options[q.correctIndex]).toMatch(/^A\) me-$/)
    expect(q.correctIndex).toBe(0)
  })

  it('explains "memakan" as a prefix-only word, with no fabricated -kan suffix', () => {
    const exp = q.explanation
    // The old key invented "(-kan implied transitive)" to justify the wrong answer:
    // reject the hand-wave AND any "-kan" inside the affix decomposition.
    expect(exp.toLowerCase()).not.toContain('implied')
    expect(exp).not.toContain('(-kan')
    // ...and affirm the correct analysis (me- prefix, no suffix).
    expect(exp).toMatch(/no -kan suffix|no suffix|no change/i)
  })
})

describe('comprehensionPassages — answer-key integrity (all passages)', () => {
  it('every question has an in-range correctIndex resolving to a non-empty option', () => {
    for (const p of COMPREHENSION_PASSAGES) {
      for (const q of p.questions) {
        expect(Array.isArray(q.options), `${p.id} q${q.id} options is an array`).toBe(true)
        expect(Number.isInteger(q.correctIndex), `${p.id} q${q.id} correctIndex is an integer`).toBe(true)
        expect(q.correctIndex, `${p.id} q${q.id} correctIndex >= 0`).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex, `${p.id} q${q.id} correctIndex in range`).toBeLessThan(q.options.length)
        const answer = q.options[q.correctIndex]
        expect(typeof answer, `${p.id} q${q.id} resolved answer is a string`).toBe('string')
        expect(answer.trim().length, `${p.id} q${q.id} resolved answer non-empty`).toBeGreaterThan(0)
      }
    }
  })

  it('question ids are unique within each passage', () => {
    for (const p of COMPREHENSION_PASSAGES) {
      const ids = p.questions.map((q) => q.id)
      expect(new Set(ids).size, `${p.id} has unique question ids`).toBe(ids.length)
    }
  })
})
