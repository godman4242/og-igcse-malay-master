// src/lib/interleave.js
// Builds interleaved practice sessions mixing vocab + grammar + comprehension

import { getDueCards, sortByPriority } from './fsrs'
import { IMBUHAN_DRILLS, TENSE_DRILLS, ERROR_DRILLS, TRANSFORM_DRILLS } from '../data/grammar'

/**
 * Build a mixed session with items from multiple categories.
 * Items are interleaved: V, G, V, G, V, C, V, G, ... (never 3 of same type in a row)
 *
 * @param {Object} params
 * @param {Array} params.cards - All vocab cards from store
 * @param {Object} params.grammarCards - Grammar SRS state from store
 * @param {number} [params.targetSize=15] - Desired session length
 * @param {Object} [params.ratios] - { vocab, grammar, comprehension } ratios summing to 1
 * @returns {Array<{ type: 'vocab'|'grammar'|'comprehension', item: Object }>}
 */
export function buildMixedSession({
  cards,
  grammarCards,
  targetSize = 15,
  ratios = { vocab: 0.5, grammar: 0.3, comprehension: 0.2 },
}) {
  // 1. Gather due items
  const dueVocab = sortByPriority(getDueCards(cards))
  const allDrills = [...IMBUHAN_DRILLS, ...TENSE_DRILLS, ...ERROR_DRILLS, ...TRANSFORM_DRILLS]
  const dueGrammar = allDrills.filter(d => {
    const card = grammarCards[d.id]
    return !card || new Date(card.due) <= new Date()
  })

  // 2. Calculate per-type targets
  const vocabTarget = Math.round(targetSize * ratios.vocab)
  const grammarTarget = Math.round(targetSize * ratios.grammar)
  const compTarget = Math.max(1, targetSize - vocabTarget - grammarTarget)

  // 3. Select items
  const vocabItems = dueVocab.slice(0, vocabTarget).map(c => ({ type: 'vocab', item: c }))
  const grammarItems = shuffleArray(dueGrammar).slice(0, grammarTarget).map(d => ({ type: 'grammar', item: d }))

  // Comprehension: pick vocab cards in sentence context (cloze-style)
  const compCandidates = dueVocab.filter(c => c.ex && c.ex.length > 10)
  const compItems = compCandidates.slice(0, compTarget).map(c => ({ type: 'comprehension', item: c }))

  // 4. Interleave — avoid 3 of same type in a row
  const all = [...vocabItems, ...grammarItems, ...compItems]
  return interleaveItems(all)
}

/**
 * Interleave items so no more than 2 of the same type appear consecutively.
 */
function interleaveItems(items) {
  if (items.length <= 2) return items

  const byType = {}
  items.forEach(item => {
    if (!byType[item.type]) byType[item.type] = []
    byType[item.type].push(item)
  })

  const result = []
  const types = Object.keys(byType)

  while (types.some(t => byType[t].length > 0)) {
    for (const t of types) {
      if (byType[t].length > 0) {
        result.push(byType[t].shift())
      }
    }
  }

  return result
}

/**
 * Get a summary of a completed mixed session.
 * @param {Array<{ type: string, correct: boolean }>} results
 * @returns {Object}
 */
export function getMixedSessionSummary(results) {
  const byType = { vocab: { correct: 0, total: 0 }, grammar: { correct: 0, total: 0 }, comprehension: { correct: 0, total: 0 } }

  results.forEach(r => {
    if (!byType[r.type]) byType[r.type] = { correct: 0, total: 0 }
    byType[r.type].total++
    if (r.correct) byType[r.type].correct++
  })

  const total = results.length
  const correct = results.filter(r => r.correct).length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  // Find weakest category
  let weakest = null
  let lowestAcc = 101
  Object.entries(byType).forEach(([type, stats]) => {
    if (stats.total > 0) {
      const acc = Math.round((stats.correct / stats.total) * 100)
      if (acc < lowestAcc) {
        lowestAcc = acc
        weakest = type
      }
    }
  })

  return { byType, total, correct, accuracy, weakest }
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
