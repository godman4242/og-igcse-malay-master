// src/lib/interleave.js
// Logic for interleaving tasks to maximize long-term retention

import { getDueCards, sortByPriority } from './fsrs'
import { IMBUHAN_DRILLS, TENSE_DRILLS, ERROR_DRILLS, TRANSFORM_DRILLS } from '../data/grammar'

export function buildMixedSession({ cards, grammarCards, settings = {}, lang }) {
  // compRatio is implicit (= 1 - vocab - grammar); destructure only the ones we use.
  const { vocabRatio = 0.5, grammarRatio = 0.3, sessionSize = 15 } = settings

  const dueVocab = sortByPriority(getDueCards(cards))
  // The grammar drills (imbuhan/tense/error/transform) are Malay-only concepts —
  // imbuhan does not exist in English — so a v34 English session must NOT
  // interleave them (CLAUDE.md: "Malay & English decks never mix in one session").
  // lang==='en' drops grammar and folds its slots into vocab/comprehension via
  // cTarget. Any other value (undefined / 'ms') keeps the Malay path byte-identical.
  const malayGrammar = lang !== 'en'
  const allDrills = malayGrammar
    ? [...IMBUHAN_DRILLS, ...TENSE_DRILLS, ...ERROR_DRILLS, ...TRANSFORM_DRILLS]
    : []
  const dueGrammar = allDrills.filter(d => !grammarCards[d.id] || new Date(grammarCards[d.id].due) <= new Date())

  const vTarget = Math.round(sessionSize * vocabRatio)
  const gTarget = malayGrammar ? Math.round(sessionSize * grammarRatio) : 0
  const cTarget = Math.max(1, sessionSize - vTarget - gTarget)

  const vocab = dueVocab.slice(0, vTarget).map(item => ({ type: 'vocab', item }))
  const grammar = shuffleArray(dueGrammar).slice(0, gTarget).map(item => ({ type: 'grammar', item }))
  const comp = shuffleArray(dueVocab.slice(vTarget).filter(c => c.ex && c.ex.length > 15)).slice(0, cTarget).map(item => ({ type: 'comprehension', item }))

  return interleaveItems([...vocab, ...grammar, ...comp])
}

function interleaveItems(items) {
  const byType = {}
  items.forEach(it => { byType[it.type] = byType[it.type] || []; byType[it.type].push(it) })
  const result = []
  const types = Object.keys(byType)
  while (types.some(t => byType[t].length > 0)) {
    types.forEach(t => { if (byType[t].length > 0) result.push(byType[t].shift()) })
  }
  return result
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function getMixedSessionSummary(results) {
  const total = results.length
  const correct = results.filter(r => r.correct).length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const byType = {}
  results.forEach(r => {
    if (!byType[r.type]) byType[r.type] = { total: 0, correct: 0 }
    byType[r.type].total++
    if (r.correct) byType[r.type].correct++
  })

  let weakest = null
  let worstAcc = 101
  Object.entries(byType).forEach(([type, stats]) => {
    const acc = stats.total > 0 ? (stats.correct / stats.total) * 100 : 100
    if (acc < worstAcc) { worstAcc = acc; weakest = type }
  })

  return { total, correct, accuracy, byType, weakest: worstAcc < 100 ? weakest : null }
}