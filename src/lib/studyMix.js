// src/lib/studyMix.js
// Pure study-mix preset policy. A preset adds a BOUNDED need-bonus to ONE skill
// so the daily plan's single skill-focus slot leans that way — SELECTION ONLY,
// never FSRS, never above the spine. Default 'balanced' = identity (zero bonus).
//
// The bonus is intentionally small (2): it can tip a coin-flip toward the
// preferred skill, but a genuinely urgent need (>= 3) still wins. Constrained
// autonomy, not a hard override (expertise-reversal guard for beginners).

export const MIX_NEED_BONUS = 2

export const STUDY_MIX_PRESETS = [
  { id: 'balanced', label: 'Balanced', emphasis: null },
  { id: 'more-speaking', label: 'More speaking', emphasis: 'speaking' },
  { id: 'more-writing', label: 'More writing', emphasis: 'writing' },
  { id: 'more-grammar', label: 'More grammar', emphasis: 'grammar' },
]

const BY_ID = new Map(STUDY_MIX_PRESETS.map(p => [p.id, p]))

export function isValidPreset(id) {
  return BY_ID.has(id)
}

export function presetEmphasis(id) {
  return BY_ID.get(id)?.emphasis ?? null
}

// Bonus added to `skillKind`'s need under `presetId`. 0 for balanced/unknown
// (identity) and for any non-emphasised skill.
export function mixNeedBonus(presetId, skillKind) {
  const emphasis = presetEmphasis(presetId)
  return emphasis && emphasis === skillKind ? MIX_NEED_BONUS : 0
}
