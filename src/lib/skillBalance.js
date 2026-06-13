// Per-paper balance meter — pure 7-day aggregator (review feature #7).
// Spec: docs/superpowers/specs/2026-06-13-per-paper-balance-meter-design.md
//
// One "activity" = one completed unit per surface (session COUNTS, not
// minutes). Reading/Listening/Grammar are read from the persisted
// skillActivity log ({ 'YYYY-MM-DD': { reading: N, … } }, local-day keyed);
// Writing/Speaking/Exam derive from the existing history arrays so the meter
// is honest from day one; Vocab = in-window study days with reviews > 0
// (studyHistory has no per-session counts — active days is the honest proxy).
//
// Imported by the EAGER Dashboard — keep this module dependency-light.

import { toLocalISO } from './localDay'

export const SKILL_KEYS = ['reading', 'listening', 'writing', 'speaking', 'vocab', 'grammar', 'exam']

export const BALANCE_WINDOW_DAYS = 7

// Local-day key set for the window ending at todayISO (inclusive).
// todayISO is parsed as LOCAL midnight so the window never shifts across UTC.
function windowKeys(todayISO, days) {
  const [y, m, d] = todayISO.split('-').map(Number)
  const today = new Date(y, m - 1, d)
  const keys = new Set()
  for (let i = 0; i < days; i++) {
    const dt = new Date(today)
    dt.setDate(today.getDate() - i)
    keys.add(toLocalISO(dt))
  }
  return keys
}

function countInWindow(entries, tsField, keys) {
  let n = 0
  for (const e of entries || []) {
    const ts = e?.[tsField]
    if (!ts) continue
    const day = toLocalISO(new Date(ts))
    if (keys.has(day)) n++
  }
  return n
}

/**
 * Roll the last `days` local days of per-skill activity into counts.
 * @param {object} sources - { skillActivity, writingHistory, speakingHistory,
 *                             roleplayHistory, studyHistory, examAttempts }
 * @param {string} todayISO - local 'YYYY-MM-DD' (from getTodayISO())
 * @returns {{ counts: Record<string, number>, total: number, neglected: string[] }}
 */
export function skillBalance(sources, todayISO, days = BALANCE_WINDOW_DAYS) {
  const s = sources || {}
  const keys = windowKeys(todayISO, days)

  const counts = { reading: 0, listening: 0, writing: 0, speaking: 0, vocab: 0, grammar: 0, exam: 0 }

  // Logged skills (the new skillActivity slice)
  for (const day of keys) {
    const rec = s.skillActivity?.[day]
    if (!rec) continue
    for (const skill of ['reading', 'listening', 'grammar']) {
      const v = rec[skill]
      if (typeof v === 'number' && v > 0) counts[skill] += v
    }
  }

  // Derived skills (existing history arrays)
  counts.writing = countInWindow(s.writingHistory, 'ts', keys)
  counts.speaking = countInWindow(s.speakingHistory, 'ts', keys)
    + countInWindow(s.roleplayHistory, 'date', keys)
  counts.exam = countInWindow(s.examAttempts, 'ts', keys)

  // Vocab — active study days in the window
  for (const day of keys) {
    if ((s.studyHistory?.[day]?.reviews || 0) > 0) counts.vocab++
  }

  let total = 0
  for (const k of SKILL_KEYS) total += counts[k]
  const neglected = SKILL_KEYS.filter(k => counts[k] === 0)

  return { counts, total, neglected }
}
