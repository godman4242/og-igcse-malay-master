// src/data/drillVariants.js
// Maps FSRS stability ranges to presentation variants (desirable difficulty)
// Bjork (1994): appropriately challenging retrieval improves long-term retention

import { State } from '../lib/fsrs'

/**
 * Variant types:
 * - standard:    Malay → English flashcard (default)
 * - hint:        Standard + hint button available
 * - reverse:     English → Malay (harder recall direction)
 * - cloze:       Fill in the Malay word in a sentence context
 * - audio:       Listen to TTS, type the Malay word (no visual)
 * - produce:     Given English + sentence context, produce the Malay word
 */

const VARIANT_TIERS = [
  { maxStability: 0,    variants: ['standard'],                    label: 'New' },
  { maxStability: 7,    variants: ['standard', 'hint'],            label: 'Learning' },
  { maxStability: 21,   variants: ['standard'],                    label: 'Review' },
  { maxStability: 90,   variants: ['reverse', 'cloze', 'audio'],   label: 'Strong' },
  { maxStability: Infinity, variants: ['produce', 'reverse', 'audio'], label: 'Mature' },
]

/**
 * Select a presentation variant for a card based on its FSRS stability.
 * Uses card word as seed for deterministic-per-card randomness.
 * @param {Object} card - Card with FSRS fields (stability, state)
 * @returns {{ variant: string, label: string }}
 */
export function selectVariant(card) {
  const stability = card.stability || 0
  const state = card.state ?? State.New

  // New and Learning cards always get standard presentation
  if (state === State.New) return { variant: 'standard', label: 'New' }
  if (state === State.Learning) return { variant: 'hint', label: 'Learning' }
  if (state === State.Relearning) return { variant: 'standard', label: 'Relearn' }

  // Review cards — pick variant based on stability
  const tier = VARIANT_TIERS.find(t => stability <= t.maxStability) || VARIANT_TIERS[VARIANT_TIERS.length - 1]
  const variants = tier.variants

  // Deterministic pick based on card word — same card always gets same variant
  // (until stability changes enough to move tiers)
  const hash = simpleHash(card.m || '')
  const variant = variants[hash % variants.length]

  return { variant, label: tier.label }
}

/**
 * Check if a card has an example sentence usable for cloze/produce variants.
 * Falls back to standard if no example available.
 */
export function selectVariantSafe(card) {
  const result = selectVariant(card)
  const hasExample = card.ex && card.ex.length > 10

  // Cloze and produce need example sentences
  if ((result.variant === 'cloze' || result.variant === 'produce') && !hasExample) {
    return { variant: 'reverse', label: result.label }
  }

  return result
}

/**
 * Get display info for a variant (icon hint, color)
 */
export const VARIANT_INFO = {
  standard: { badge: 'M → E',   color: 'var(--color-blue)',   desc: 'Malay to English' },
  hint:     { badge: 'M → E+',  color: 'var(--color-cyan)',   desc: 'With hint available' },
  reverse:  { badge: 'E → M',   color: 'var(--color-orange)', desc: 'English to Malay' },
  cloze:    { badge: 'Fill',    color: 'var(--color-purple)', desc: 'Fill in the blank' },
  audio:    { badge: 'Listen',  color: 'var(--color-green)',  desc: 'Audio only' },
  produce:  { badge: 'Produce', color: 'var(--color-red)',    desc: 'Produce in context' },
}

// Language of the target word (card.m) vs its gloss (card.e), by card.lang.
// 'ms' card: m = Malay, e = English gloss. 'en' card: m = English, e = Malay.
const WORD_LANG = { ms: 'Malay', en: 'English' }
const GLOSS_LANG = { ms: 'English', en: 'Malay' }

/**
 * Language-correct variant display info. The direction-bearing variants
 * (standard/hint show the WORD → recall the GLOSS; reverse shows the GLOSS →
 * recall the WORD) flip their badge/desc by card language. cloze/audio/produce
 * are language-neutral and pass through unchanged.
 *
 * `lang` omitted ⇒ 'ms' ⇒ byte-identical to the legacy VARIANT_INFO, so Malay
 * behaviour is preserved. Unknown variants return the (undefined) base entry.
 *
 * @param {string} variant
 * @param {'ms'|'en'} [lang]
 * @returns {{ badge: string, color: string, desc: string } | undefined}
 */
export function variantInfoFor(variant, lang = 'ms') {
  const base = VARIANT_INFO[variant]
  if (!base) return base
  const word = WORD_LANG[lang] || WORD_LANG.ms
  const gloss = GLOSS_LANG[lang] || GLOSS_LANG.ms
  if (variant === 'standard') {
    return { ...base, badge: `${word[0]} → ${gloss[0]}`, desc: `${word} to ${gloss}` }
  }
  if (variant === 'hint') {
    // Badge direction flips; desc ('With hint available') is neutral, kept.
    return { ...base, badge: `${word[0]} → ${gloss[0]}+` }
  }
  if (variant === 'reverse') {
    return { ...base, badge: `${gloss[0]} → ${word[0]}`, desc: `${gloss} to ${word}` }
  }
  return base
}

function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}
