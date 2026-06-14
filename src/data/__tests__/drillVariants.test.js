// Bilingual variant badges — the adaptive-variant badge/desc must name the
// REAL recall direction for both card languages. F5 brought English parity to
// the study loop, but the badge stayed hardcoded Malay: an English learner saw
// "E → M — English to Malay" on a reverse card that is actually Malay→English.
//
// `variantInfoFor(variant, lang)` is the single source of the language-correct
// badge/desc. Direction model:
//   - standard / hint : shown = the WORD (card.m) → recall = the GLOSS (card.e)
//   - reverse         : shown = the GLOSS (card.e) → recall = the WORD (card.m)
// where for 'ms' cards card.m is Malay (gloss English) and for 'en' cards
// card.m is English (gloss Malay). cloze/audio/produce are language-neutral.
// lang omitted ⇒ 'ms' ⇒ byte-identical to the legacy VARIANT_INFO.

import { describe, it, expect } from 'vitest'
import { variantInfoFor, VARIANT_INFO } from '../drillVariants'

describe('variantInfoFor — direction-bearing variants', () => {
  it('standard: Malay card shows Malay→English, English card shows English→Malay', () => {
    expect(variantInfoFor('standard', 'ms')).toMatchObject({ badge: 'M → E', desc: 'Malay to English' })
    expect(variantInfoFor('standard', 'en')).toMatchObject({ badge: 'E → M', desc: 'English to Malay' })
  })

  it('reverse: Malay card shows English→Malay, English card shows Malay→English', () => {
    expect(variantInfoFor('reverse', 'ms')).toMatchObject({ badge: 'E → M', desc: 'English to Malay' })
    expect(variantInfoFor('reverse', 'en')).toMatchObject({ badge: 'M → E', desc: 'Malay to English' })
  })

  it('hint: badge direction flips by lang, desc stays neutral', () => {
    expect(variantInfoFor('hint', 'ms')).toMatchObject({ badge: 'M → E+', desc: 'With hint available' })
    expect(variantInfoFor('hint', 'en')).toMatchObject({ badge: 'E → M+', desc: 'With hint available' })
  })
})

describe('variantInfoFor — neutral variants are language-independent', () => {
  for (const v of ['cloze', 'audio', 'produce']) {
    it(`${v} is identical for both languages`, () => {
      expect(variantInfoFor(v, 'en')).toEqual(VARIANT_INFO[v])
      expect(variantInfoFor(v, 'ms')).toEqual(VARIANT_INFO[v])
    })
  }
})

describe('variantInfoFor — back-compat & safety', () => {
  it('omitted lang behaves as Malay (byte-identical to VARIANT_INFO)', () => {
    for (const v of Object.keys(VARIANT_INFO)) {
      expect(variantInfoFor(v)).toEqual(VARIANT_INFO[v])
    }
  })

  it('preserves the variant color', () => {
    expect(variantInfoFor('reverse', 'en').color).toBe(VARIANT_INFO.reverse.color)
    expect(variantInfoFor('hint', 'en').color).toBe(VARIANT_INFO.hint.color)
  })

  it('returns the base entry for an unknown variant', () => {
    expect(variantInfoFor('nope', 'en')).toBe(VARIANT_INFO.nope) // undefined, no throw
  })
})
