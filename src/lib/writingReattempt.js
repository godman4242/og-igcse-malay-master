// Pure helpers for the act-on-feedback loop. No React, no store, no AI calls.
// Mirrors the writingMistakeHarvest.js split: testable field-mapping in isolation.

// The ✗ requirements of a graded task — those whose coverage flag is not true —
// each paired with its authored how-to-fix hint (empty string when none authored).
export function missedRequirements(task, coverage = {}) {
  if (!task || !Array.isArray(task.requirements)) return []
  return task.requirements
    .map((text, index) => ({ index, text, hint: (task.hints && task.hints[index]) || '' }))
    .filter(({ index }) => coverage?.[`req_${index}`] !== true)
}

// The writingHistory entry for a graded attempt. Task fields are added ONLY when a
// task was graded, so the no-task entry stays byte-identical to today.
export function buildAttemptEntry({ lang, format, band, words, task, aiResponse }) {
  const entry = { lang, format, band, words }
  if (task?.id) {
    entry.taskId = task.id
    entry.contentBand = typeof aiResponse?.content_band === 'number' ? aiResponse.content_band : null
    entry.coverage = aiResponse?.task_coverage ?? null
  }
  return entry
}

// Diff two attempt entries for the SAME task. `improved` is true ONLY on a real,
// earned change: a higher content band OR a requirement that flipped ✗→✓.
export function compareAttempts(prevEntry, currEntry, task) {
  if (!prevEntry || !currEntry) return null
  const bandBefore = typeof prevEntry.contentBand === 'number' ? prevEntry.contentBand : null
  const bandAfter = typeof currEntry.contentBand === 'number' ? currEntry.contentBand : null
  const before = prevEntry.coverage || {}
  const after = currEntry.coverage || {}
  const flipsToMet = []
  const flipsToMissed = []
  const reqCount = task?.requirements?.length || 0
  for (let i = 0; i < reqCount; i++) {
    const wasMet = before[`req_${i}`] === true
    const nowMet = after[`req_${i}`] === true
    if (!wasMet && nowMet) flipsToMet.push(i)
    if (wasMet && !nowMet) flipsToMissed.push(i)
  }
  const delta = (bandBefore != null && bandAfter != null) ? bandAfter - bandBefore : null
  const improved = (delta != null && delta > 0) || flipsToMet.length > 0
  return { bandBefore, bandAfter, delta, flipsToMet, flipsToMissed, improved }
}

// The two most recent writingHistory entries for a task (oldest-first), or null.
export function lastTwoAttemptsForTask(history, taskId) {
  if (!Array.isArray(history) || !taskId) return null
  const forTask = history.filter(e => e.taskId === taskId)
  if (forTask.length < 2) return null
  return forTask.slice(-2)
}
