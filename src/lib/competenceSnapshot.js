// src/lib/competenceSnapshot.js
// Pure composer for the For-You "Where you stand" panel. Reuses existing
// aggregators — no new tracking, no persisted state. Returns null on an empty
// deck (the panel is hidden; GetStarted owns that moment).
//
// `readinessPct` is passed in (getExamReadiness is a store getter, not pure);
// everything else is composed here. buildLearnerProfile reads recency windows
// via its own Date.now() — a pre-existing trait shared with forYouShelves.

import { countMastered } from './fsrs'
import { skillBalance, SKILL_KEYS } from './skillBalance'
import { buildLearnerProfile } from './learnerProfile'

export function buildCompetenceSnapshot(input = {}, now = Date.now()) {
  const {
    langCards = [], readinessPct = null, todayISO, lang = 'ms',
    skillActivity, writingHistory, speakingHistory, roleplayHistory,
    studyHistory, examAttempts, mistakes, confidenceLog,
  } = input
  void now
  if (!Array.isArray(langCards) || langCards.length === 0) return null

  const balance = skillBalance(
    { skillActivity, writingHistory, speakingHistory, roleplayHistory, studyHistory, examAttempts },
    todayISO,
  )
  const profile = buildLearnerProfile(
    { mistakes, confidenceLog, writingHistory, studyHistory }, { lang },
  )
  const bars = SKILL_KEYS.map(skill => ({
    skill,
    count: balance.counts[skill] || 0,
    neglected: balance.neglected.includes(skill),
  }))
  return {
    readinessPct: typeof readinessPct === 'number' ? readinessPct : null,
    mastered: countMastered(langCards),
    bars,
    weakSpots: profile.focusTopics,
  }
}
