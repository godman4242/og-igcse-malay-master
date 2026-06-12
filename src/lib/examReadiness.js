// Composite "Exam Readiness" scorer — the SINGLE source of truth for the Exam
// Rehearsal composite %, extracted from useStore.getExamReadiness and
// ExamRehearsal.finishRehearsal (the formula used to live, duplicated, in both).
//
// Base weights: comprehension 0.30, writing 0.35, speaking 0.35, listening 0.30.
// Listening folds in ONLY when the attempt recorded a `listeningPct` (attempts
// logged before the listening stage shipped have none). The components actually
// present are re-normalised by their summed weight, so:
//   • a 3-skill attempt (no listeningPct) → totalW 1.0 → byte-identical to the
//     pre-listening formula, so historical readiness % never shifts;
//   • a 4-skill attempt → listening weighted 0.30/1.30 ≈ 23%.
// To change how much listening counts, tune READINESS_WEIGHTS.listening here —
// no store migration is involved.
export const READINESS_WEIGHTS = { comprehension: 0.30, writing: 0.35, speaking: 0.35, listening: 0.30 }

export function composeReadiness(a) {
  if (!a) return 0
  const c = a.comprehensionPct || 0
  const w = ((a.writingBand || 0) / 6) * 100
  const s = ((a.speakingBand || 0) / 6) * 100
  let weighted = c * READINESS_WEIGHTS.comprehension
    + w * READINESS_WEIGHTS.writing
    + s * READINESS_WEIGHTS.speaking
  let totalW = READINESS_WEIGHTS.comprehension + READINESS_WEIGHTS.writing + READINESS_WEIGHTS.speaking
  // `!= null` so a legitimate listeningPct:0 still counts (present), while an
  // absent field (older attempts) is excluded from the normalisation.
  if (a.listeningPct != null) {
    weighted += (a.listeningPct || 0) * READINESS_WEIGHTS.listening
    totalW += READINESS_WEIGHTS.listening
  }
  return Math.round(weighted / totalW)
}
