// src/lib/dictionaryGrounding.js
//
// Phase 2 accuracy backbone — Tier 1 (owned data). A pure, source-agnostic check
// that an AI-proposed Malay↔English pair is trustworthy BEFORE it lands in a deck.
// Tier 1 grounds against data we own outright (the curated dictionary + the
// learner's cards) → zero licensing risk, highest trust. The boolean-shaped result
// stays identical when Tier 2 (a permissive real-Malay-word validity list) and
// Tier 3 (CC0 Wikidata translations) layer in later.
//
// GUARDRAIL: never auto-verify an unknown or mismatched pair — those return
// verified:false so the caller routes them to learner-in-the-loop confirm. We do
// NOT trust noisy machine-translated bulk lists as an accuracy authority.
//
// Licensing decision: docs/superpowers/specs/2026-06-06-for-you-phase2-dictionary-licensing.md
// Design: docs/superpowers/specs/2026-06-06-personalized-for-you-design.md §5.4

function norm(s) {
  return typeof s === 'string' ? s.toLowerCase().trim().replace(/\s+/g, ' ') : ''
}

// Split one English gloss into the set of senses it covers. Handles multi-sense
// separators (/ , ;) and parentheticals: 'you (formal)' → {'you (formal)', 'you'}
// (the stripped main term is a valid match; the qualifier alone is NOT added, so
// 'formal' won't false-verify). 'is/are' → {'is', 'are'}.
function splitSenses(english) {
  const out = new Set()
  for (const rawPart of String(english).split(/[/,;]/)) {
    const part = norm(rawPart)
    if (!part) continue
    out.add(part)
    const stripped = norm(part.replace(/\([^)]*\)/g, '')) // drop parentheticals
    if (stripped && stripped !== part) out.add(stripped)
  }
  return out
}

function toPairList(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Build a grounding index from owned pairs. Keyed by normalised Malay; each entry
 * keeps the original English for display + the union of its normalised senses.
 * Learner cards merge in (union of senses; first display wins).
 *
 * @param {Array<{m:string,e:string}>} [dictionaryPairs]
 * @param {Array<{m:string,e:string}>} [cards]
 * @returns {Map<string,{en:string, senses:Set<string>}>}
 */
export function buildGroundingIndex(dictionaryPairs = [], cards = []) {
  const index = new Map()
  for (const pair of [...toPairList(dictionaryPairs), ...toPairList(cards)]) {
    const m = norm(pair && pair.m)
    const e = pair && typeof pair.e === 'string' ? pair.e.trim() : ''
    if (!m || !e) continue
    const senses = splitSenses(e)
    const existing = index.get(m)
    if (existing) {
      for (const s of senses) existing.senses.add(s)
    } else {
      index.set(m, { en: e, senses })
    }
  }
  return index
}

/**
 * Verify an AI-proposed Malay↔English pair against the owned index.
 *
 * @param {string} malay
 * @param {string} english
 * @param {Map} index  - from buildGroundingIndex
 * @returns {{verified:boolean, confidence:'high'|'medium'|'low', canonicalEn?:string, suggestion?:string}}
 */
export function verifyPair(malay, english, index) {
  const m = norm(malay)
  const e = norm(english)
  if (!m || !e || !(index instanceof Map)) {
    return { verified: false, confidence: 'low' }
  }
  const entry = index.get(m)
  if (!entry) {
    // Unknown Malay word → defer to the learner (Tier 2/3 may catch it later).
    return { verified: false, confidence: 'low' }
  }
  if (entry.senses.has(e)) {
    return { verified: true, confidence: 'high', canonicalEn: entry.en }
  }
  // Known word, but the proposed meaning doesn't match → surface the canonical.
  return {
    verified: false,
    confidence: 'low',
    canonicalEn: entry.en,
    suggestion: `Dictionary lists "${entry.en}"`,
  }
}
