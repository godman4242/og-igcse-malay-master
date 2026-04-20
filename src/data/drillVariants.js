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

function simpleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h)
}
