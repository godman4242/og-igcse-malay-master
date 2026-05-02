import GRAMMAR_FEEDBACK, { VOCAB_TIPS } from '../data/feedbackRules'

function fallbackFeedback(drill) {
  return {
    explanation: drill?.hint || (drill?.rule ? `Rule: ${drill.rule}` : `Expected answer: ${drill?.answer || 'See correction.'}`),
    mnemonic: drill?.rule ? `Rule focus: ${drill.rule}` : null,
    examples: [],
    relatedRule: null,
  }
}

export function buildDrillFeedback(drill, correct) {
  if (correct) return null
  if (!drill) return null

  const key = drill.rule || drill.hint
  if (!key) return fallbackFeedback(drill)

  return GRAMMAR_FEEDBACK[key] || fallbackFeedback(drill)
}

export function buildTenseFeedback(drill, chosen) {
  if (!drill || chosen === drill.answer) return null

  const correctFeedback = GRAMMAR_FEEDBACK[drill.answer]
  const chosenFeedback = GRAMMAR_FEEDBACK[chosen]

  return {
    explanation: correctFeedback?.explanation || `The correct tense marker is "${drill.answer}".`,
    mnemonic: correctFeedback?.mnemonic || null,
    examples: correctFeedback?.examples || [],
    relatedRule: chosenFeedback
      ? `You chose "${chosen}". This sentence needs "${drill.answer}" (${drill.tense}).`
      : null,
  }
}

export function buildVocabFeedback(card) {
  const state = card?.state ?? 0
  if (state === 0) return VOCAB_TIPS.new
  if (state === 1) return VOCAB_TIPS.learning
  if (state === 3) return VOCAB_TIPS.relearning
  return VOCAB_TIPS.review
}

/**
 * Cluster B — Three-line session feedback (Hattie & Timperley: Feed-Up / Feed-Back / Feed-Forward).
 * Returns { goal, now, next, nextHref } based on context and store state.
 *
 * @param {'study-session'|'roleplay'|'writing'|'grammar-drill'} context
 * @param {object} data - context-specific signal: { accuracy, reviewed, deck } for study-session
 * @param {object} storeState - useStore.getState() snapshot
 */
export function buildSessionFeedback(context, data = {}, storeState = {}) {
  const calibration = storeState.getConfidenceCalibration?.() || null
  const examDate = storeState.examDate || null
  const daysToExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
    : null

  const goalLine = (() => {
    if (daysToExam !== null && daysToExam > 0) {
      if (daysToExam <= 14) return `Final stretch — ${daysToExam} days to exam. Hold steady on what you know; secure weak points.`
      if (daysToExam <= 60) return `Review phase — ${daysToExam} days out. Aim for 85%+ on review-state cards.`
      return `Build phase — ${daysToExam} days out. Steady daily reps lock in long-term retention.`
    }
    return 'Move steadily toward Band 5: aim for 85%+ on review-state cards.'
  })()

  if (context === 'study-session') {
    const acc = data.accuracy ?? 0
    const reviewed = data.reviewed ?? 0
    const calibSnippet = calibration && calibration.totalEntries >= 5
      ? ` Confidence calibration: ${calibration.overconfidentPct}% over (Sure→Wrong) · ${calibration.underconfidentPct}% under (Unsure→Right).`
      : ''
    const now = `Today: ${acc}% accuracy across ${reviewed} cards.${calibSnippet}`
    let next, nextHref
    if (acc < 60) {
      next = 'Tag wrong answers by reason in the Mistakes journal — that\'s where the biggest gains are.'
      nextHref = '/mistakes'
    } else if (acc < 80) {
      next = 'Try a Mixed session to interleave grammar and reading — varied practice strengthens transfer.'
      nextHref = '/'
    } else if (storeState.ai?.roleplayHistory?.length === 0) {
      next = 'Strong run! Try a Roleplay scenario — Paper 3 oral practice is the next lever.'
      nextHref = '/roleplay'
    } else {
      next = 'Strong run! Tomorrow keep it tight — review queue first, then add 5 new cards.'
      nextHref = '/'
    }
    return { goal: goalLine, now, next, nextHref }
  }

  if (context === 'grammar-drill') {
    const acc = data.accuracy ?? 0
    return {
      goal: 'Grammar accuracy is a Paper 2 band lever — aim for 80%+ on each drill type.',
      now: `Drill accuracy: ${acc}%${data.weakest ? ` · weakest pattern: ${data.weakest}` : ''}.`,
      next: acc >= 80 ? 'Try transformation drills — the harder format builds production skills.' : 'Focus the next session on the weakest pattern; small daily reps fix it fast.',
      nextHref: '/grammar',
    }
  }

  if (context === 'roleplay') {
    const score = data.score ?? 0
    return {
      goal: 'Paper 3 oral hits Band 5 with task fulfilment + range + accuracy. Spoken stems carry the most weight per minute.',
      now: `Roleplay score: ${score}/100${data.scenario ? ` · scenario: ${data.scenario}` : ''}.`,
      next: score >= 70 ? 'Try a different scenario to broaden topical range.' : 'Re-attempt this scenario after reviewing the suggested phrases — repetition compounds.',
      nextHref: '/roleplay',
    }
  }

  if (context === 'writing') {
    const band = data.band ?? null
    return {
      goal: 'Paper 2 writing rewards range × accuracy. Genre conventions matter as much as vocabulary.',
      now: band !== null ? `Estimated band: ${band}.` : 'Submission analyzed.',
      next: 'Pick one suggested correction and rewrite that sentence — focused revision sticks better than re-reading.',
      nextHref: '/writing',
    }
  }

  return { goal: goalLine, now: '', next: '', nextHref: null }
}

