/**
 * sessionResult.js — Unified result schema for Smart Session tasks.
 *
 * Each task in a Smart Session produces a TaskResult when completed.
 * The session accumulates these into a SessionResult for the summary screen.
 */

/**
 * Create a result record for a completed task.
 *
 * @param {object} task      - The task that was completed
 * @param {object} outcome   - { correct: bool, skipped?: bool, rating?, score? }
 * @returns {TaskResult}
 */
export function createTaskResult(task, outcome) {
  return {
    type: task.type,
    focalWord: task.card?.m ?? null,
    weight: task.weight,
    correct: !!outcome.correct,
    skipped: !!outcome.skipped,
    rating: outcome.rating ?? null,
    score: outcome.score ?? null,
    ts: Date.now(),
  }
}

/**
 * Build a session summary from an array of task results.
 *
 * @param {TaskResult[]} results
 * @param {number}       startTime - session start timestamp (ms)
 * @returns {SessionSummary}
 */
export function buildSessionSummary(results, startTime) {
  const endTime = Date.now()
  const durationMs = endTime - startTime
  const durationMin = Math.max(1, Math.round(durationMs / 60000))

  const completed = results.filter(r => !r.skipped)
  const skipped = results.filter(r => r.skipped)
  const correct = completed.filter(r => r.correct)
  const wrong = completed.filter(r => !r.correct)

  // Per-type breakdown
  const byType = {}
  for (const r of completed) {
    if (!byType[r.type]) {
      byType[r.type] = { total: 0, correct: 0, wrong: 0 }
    }
    byType[r.type].total++
    if (r.correct) byType[r.type].correct++
    else byType[r.type].wrong++
  }

  // Per-word breakdown (which focal words were strong/weak?)
  const byWord = {}
  for (const r of completed) {
    if (!r.focalWord) continue
    if (!byWord[r.focalWord]) {
      byWord[r.focalWord] = { total: 0, correct: 0, wrong: 0 }
    }
    byWord[r.focalWord].total++
    if (r.correct) byWord[r.focalWord].correct++
    else byWord[r.focalWord].wrong++
  }

  // Identify weakest words (any word with > 50% wrong)
  const weakWords = Object.entries(byWord)
    .filter(([, stats]) => stats.wrong > stats.correct)
    .map(([word]) => word)

  // Accuracy as a percentage (0-100)
  const accuracy = completed.length > 0
    ? Math.round((correct.length / completed.length) * 100)
    : 0

  return {
    startTime,
    endTime,
    durationMin,
    totalTasks: results.length,
    completedCount: completed.length,
    skippedCount: skipped.length,
    correctCount: correct.length,
    wrongCount: wrong.length,
    accuracy,
    byType,
    byWord,
    weakWords,
  }
}
