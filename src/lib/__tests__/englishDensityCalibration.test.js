import { describe, it, expect } from 'vitest'
import ENGLISH_FREQUENCY from '../../data/englishFrequency.js'
import DICTIONARY_EN from '../../data/dictionaryEn.js'
import { buildKnownEnglish, makeIsKnownEnglish } from '../englishKnownWords.js'
import { unknownDensity, isDense, DENSE_THRESHOLD } from '../unknownDensity.js'

// End-to-end calibration against the REAL shipped assets (the high-frequency list
// + the dictionaryEn seed). This is the guard that the dense-page nudge fires on a
// genuinely-too-hard English page but NOT on normal IGCSE-level English — i.e. the
// 0.4 threshold separates "within reach" from "demonstrably too hard" for the
// blended known-word set. If a future asset/threshold change breaks that split,
// this test catches it.
const isKnown = makeIsKnownEnglish(
  buildKnownEnglish({ frequency: ENGLISH_FREQUENCY.split('\n'), seed: Object.keys(DICTIONARY_EN) }),
)
const density = (text) => unknownDensity(text.split(/\s+/), {}, undefined, isKnown)

// Normal IGCSE-level English narrative — almost all high-frequency words.
const EASY = `The boy walked to the shop near his house to buy some bread and milk for
his mother. It was a sunny day and the street was full of people going to work and
school. He felt happy because his friends were waiting for him by the river.`

// Dense academic/technical English — most content words are rare/specialist.
const HARD = `The pharmacological intervention demonstrated negligible efficacy; subsequent
histological analysis revealed substantial parenchymal degeneration alongside aberrant
cytokine proliferation, corroborating the hypothesis that immunomodulatory dysregulation
precipitates irreversible neuronal apoptosis within the afflicted cerebral hemispheres.`

describe('English dense-page calibration (real assets)', () => {
  it('computes a real, non-trivial unknown-word density for English text', () => {
    const d = density(EASY)
    expect(d.total).toBeGreaterThanOrEqual(20) // a real stretch of running words
    expect(typeof d.ratio).toBe('number')
  })

  it('does NOT flag normal IGCSE-level English as dense (no false nudge)', () => {
    const d = density(EASY)
    expect(d.ratio).toBeLessThan(DENSE_THRESHOLD)
    expect(d.ratio).toBeLessThan(0.2) // comfortably under, not a near-miss
    expect(isDense(d)).toBe(false)
  })

  it('DOES flag genuinely-too-hard academic English as dense (nudge fires)', () => {
    const d = density(HARD)
    expect(d.ratio).toBeGreaterThan(DENSE_THRESHOLD)
    expect(d.ratio).toBeGreaterThan(0.5)
    expect(isDense(d)).toBe(true)
  })

  it('the high-frequency base covers the commonest function/content words', () => {
    for (const w of ['the', 'because', 'people', 'house', 'school', 'work']) {
      expect(isKnown(w)).toBe(true)
    }
  })
})
