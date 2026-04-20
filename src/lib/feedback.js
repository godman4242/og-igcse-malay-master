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

