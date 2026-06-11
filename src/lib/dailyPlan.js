// src/lib/dailyPlan.js
//
// Pure "What should I do today?" synthesis layer. Turns the eight scattered
// Dashboard signals (due cards, fix-up queue, study plan, exam readiness, exam
// due, speaking/writing/exam history, daily challenge) into ONE ordered,
// time-budgeted action queue.
//
// Design: docs/superpowers/specs/2026-05-29-daily-plan-spine-design.md
//
// Contract guarantees:
//   - Pure. No React, no store import, no module-scope Date.now().
//   - Never throws on missing/nullable input (Static-tier offline users have
//     no dailyChallenge, no exam attempts, no exam date).
//   - Deterministic given (inputs, now) — trivially snapshot-testable.
//
// It does NOT introduce a competing daily counter: completion is *derived*
// from existing history timestamps via deriveTaskDone (no new persisted state).

const BUDGET_BY_LEVEL = { casual: 10, standard: 20, intensive: 40 }

function asArray(v) {
  return Array.isArray(v) ? v : []
}

// Same local calendar day as `now`? Accepts ISO string or epoch ms; tolerant
// of null/garbage (returns false).
export function isSameLocalDay(value, now) {
  if (value == null) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  const n = new Date(now)
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

// Phase mirrors getStudyPlan().phase / ensureDailyChallenge mode so the spine
// and the existing daily challenge never disagree. No exam date => 'build'
// (foundation focus) once there's a deck, else 'build' regardless.
function derivePhase(studyPlan) {
  if (studyPlan && studyPlan.phase) return studyPlan.phase
  return 'build'
}

// Readiness surface with explicit graceful degradation (spec §4.4):
//   1. band-based exam readiness if attempts exist (most exam-meaningful)
//   2. else card-maturity readiness if an exam date is set
//   3. else null (UI shows a "do a rehearsal to unlock" prompt)
export function deriveReadiness(inputs) {
  const { examReadiness, studyPlan } = inputs
  if (examReadiness && typeof examReadiness.smoothed === 'number') {
    return { value: examReadiness.smoothed, source: 'exam' }
  }
  if (studyPlan && typeof studyPlan.readinessPct === 'number') {
    return { value: studyPlan.readinessPct, source: 'maturity' }
  }
  return null
}

// Has the student already done this task's *kind* today? Derived only —
// no new persisted state. Enhanced tier reads the dailyChallenge counters;
// Static tier (challenge == null) falls back to FSRS last_review timestamps.
export function deriveTaskDone(task, inputs, now) {
  const cards = asArray(inputs.cards)
  const grammarCards = inputs.grammarCards || {}
  const challenge = inputs.challenge
  const mistakes = asArray(inputs.mistakes)
  const speakingHistory = asArray(inputs.speakingHistory)
  const writingHistory = asArray(inputs.writingHistory)
  const examAttempts = asArray(inputs.examAttempts)

  switch (task.id) {
    case 'review':
      if (challenge && typeof challenge.reviewTarget === 'number' && challenge.reviewTarget > 0) {
        return challenge.reviewDone >= challenge.reviewTarget
      }
      return cards.some(c => isSameLocalDay(c.last_review, now))
    case 'grammar':
      if (challenge && typeof challenge.grammarTarget === 'number' && challenge.grammarTarget > 0) {
        return challenge.grammarDone >= challenge.grammarTarget
      }
      return Object.values(grammarCards).some(c => isSameLocalDay(c.last_review, now))
    case 'fixups':
      return mistakes.some(m => isSameLocalDay(m.lastReviewedAt, now))
    case 'speaking':
      return speakingHistory.some(e => isSameLocalDay(e.ts, now))
    case 'writing':
      return writingHistory.some(e => isSameLocalDay(e.ts, now))
    case 'exam':
      return examAttempts.some(e => isSameLocalDay(e.ts, now))
    case 'foundation':
      return cards.some(c => isSameLocalDay(c.last_review, now))
    default:
      return false
  }
}

// Pick exactly ONE skill focus for the day (speaking | writing | grammar) by
// "most need", with novelty (skip a skill already practised today) and a
// phase-aware bias. Returns a task candidate or null.
function pickSkillFocus(inputs, now, phase) {
  const speakingHistory = asArray(inputs.speakingHistory)
  const writingHistory = asArray(inputs.writingHistory)
  const grammarCards = inputs.grammarCards || {}

  const speakingToday = speakingHistory.some(e => isSameLocalDay(e.ts, now))
  const writingToday = writingHistory.some(e => isSameLocalDay(e.ts, now))

  // Lower recent band => higher need. Never practised => moderate need (3).
  const latestSpeakBand = speakingHistory[0]?.band
  const latestWriteScore = writingHistory[0]?.score ?? writingHistory[0]?.band
  const speakingNeed = speakingToday ? 0 : (speakingHistory.length ? clamp(6 - (latestSpeakBand || 0), 0, 6) : 3)
  const writingNeed = writingToday ? 0 : (writingHistory.length ? clamp(6 - (latestWriteScore || 0), 0, 6) : 3)

  const dueGrammar = Object.values(grammarCards).filter(c => {
    if (!c || !c.due) return true
    return new Date(c.due).getTime() <= now
  }).length
  // Grammar need scales with due drills; in the 'build' phase grammar gets a
  // small bias (foundation), near the exam speaking/writing matter more.
  let grammarNeed = clamp(dueGrammar / 3, 0, 6)
  if (phase === 'build') grammarNeed += 1

  const candidates = [
    { id: 'speaking', need: speakingNeed, kind: 'speak', route: '/speaking',
      label: 'Practise speaking', est: 6,
      reason: 'Paper 3 is the scariest exam — short daily reps build fluency and cut anxiety.' },
    { id: 'writing', need: writingNeed, kind: 'write', route: '/writing', est: 8,
      label: 'Write & get feedback',
      reason: 'Sentence-level feedback turns vague effort into specific, fixable gains.' },
    { id: 'grammar', need: grammarNeed, kind: 'grammar', route: '/grammar', est: 5,
      label: 'Drill grammar', sublabelExtra: dueGrammar ? `${dueGrammar} drills due` : null,
      reason: 'A different skill adds variety, and spacing the reps is what makes them stick.' },
  ]
  // Tie-break order: speaking > writing > grammar (speaking is the exam most
  // students fear). Stable: candidates already in that order.
  candidates.sort((a, b) => b.need - a.need)
  const top = candidates[0]
  if (!top || top.need <= 0) return null
  return {
    id: top.id,
    kind: top.kind,
    label: top.label,
    sublabel: top.sublabelExtra || `~${top.est} min`,
    route: top.route,
    estMinutes: top.est,
    reason: top.reason,
    priority: phase === 'final' ? 35 : 60,
  }
}

// Main entry. inputs: see spec §4.1. Returns a JSON-serialisable plan.
export function buildDailyPlan(inputs = {}, now = Date.now()) {
  const cards = asArray(inputs.cards)
  const dueCount = typeof inputs.dueCount === 'number'
    ? inputs.dueCount
    : cards.filter(c => !c.due || new Date(c.due).getTime() <= now).length
  const fixUpQueue = asArray(inputs.fixUpQueue)
  const studyPlan = inputs.studyPlan || null
  const examDue = inputs.examDue || null
  const dailyGoalLevel = inputs.dailyGoalLevel || 'standard'
  const isComeback = !!inputs.isComeback

  const phase = derivePhase(studyPlan)
  const daysLeft = studyPlan && typeof studyPlan.daysLeft === 'number' ? studyPlan.daysLeft : null
  const readiness = deriveReadiness(inputs)
  const budgetMin = BUDGET_BY_LEVEL[dailyGoalLevel] ?? 20

  // Empty / brand-new deck: the empty-state FirstRunCard owns this moment.
  if (cards.length === 0) {
    return { tasks: [], budgetMin, readiness, phase, daysLeft, allDone: false, isComeback }
  }

  const candidates = []

  // 1. Overdue spaced review — highest, time-sensitive. Interleaved when the
  //    deck is large enough to mix; plain study otherwise.
  if (dueCount > 0) {
    const est = clamp(Math.ceil(dueCount * 0.5), 3, 15)
    candidates.push({
      id: 'review', kind: 'review',
      label: isComeback ? 'Ease back in with a review' : 'Review due cards',
      sublabel: `${dueCount} due · ~${est} min`,
      route: dueCount >= 4 ? '/smart-study' : '/study',
      estMinutes: est,
      reason: 'Spaced review is time-sensitive — clearing due cards locks in what you already learned.',
      priority: 100,
      always: true, // never hidden by the time budget
    })
  }

  // 2. Top weakness fix-ups.
  if (fixUpQueue.length > 0) {
    const count = fixUpQueue.length
    const est = clamp(count, 2, 8)
    candidates.push({
      id: 'fixups', kind: 'fixups',
      label: 'Fix your top mistakes',
      sublabel: `${count} to review · ~${est} min`,
      route: '/mistakes',
      estMinutes: est,
      reason: 'Targeted correction of your own errors beats undirected practice.',
      priority: 80,
    })
  }

  // 3. Exam rehearsal when due (or one day out). Big rock — front-loaded by
  //    priority near the exam so it makes the cut.
  const examDueNow = examDue && (examDue.dueNow || (typeof daysLeft === 'number' && daysLeft <= 1))
  if (examDueNow) {
    candidates.push({
      id: 'exam', kind: 'exam',
      label: 'Do a full exam rehearsal',
      sublabel: '~20 min',
      route: '/exam-rehearsal',
      estMinutes: 20,
      reason: 'A timed rehearsal is the single best predictor of how ready you actually are.',
      priority: phase === 'final' || phase === 'review' ? 90 : 50,
    })
  }

  // 4. One rotating skill focus (speaking | writing | grammar).
  const skill = pickSkillFocus(inputs, now, phase)
  if (skill) candidates.push(skill)

  // 5. Foundation / new vocab — only when the deck is thin or far from the exam
  //    (the 'build' phase), and there isn't already a big queue of due work.
  if ((phase === 'build' || cards.length < 40) && dueCount < 15) {
    candidates.push({
      id: 'foundation', kind: 'foundation',
      label: 'Learn new words',
      sublabel: '~6 min',
      route: '/word-families',
      estMinutes: 6,
      reason: 'Far from the exam, growing your vocabulary base pays the highest dividend.',
      priority: phase === 'build' ? 55 : 30,
    })
  }

  // Order by priority (desc), stable for equal priorities.
  candidates.sort((a, b) => b.priority - a.priority)

  // Budget fill: always include `always` tasks; otherwise add while we're under
  // budget and below the 4-task overload cap.
  const tasks = []
  let acc = 0
  for (const c of candidates) {
    const fits = acc + c.estMinutes <= budgetMin
    const include = c.always || tasks.length < 2 || (fits && tasks.length < 4)
    if (!include) continue
    acc += c.estMinutes
    const { always, sublabelExtra, need, ...clean } = c // strip internal fields
    void always; void sublabelExtra; void need
    tasks.push({ ...clean, done: deriveTaskDone(clean, inputs, now) })
    if (tasks.length >= 5) break
  }

  const allDone = tasks.length > 0 && tasks.every(t => t.done)
  return { tasks, budgetMin, readiness, phase, daysLeft, allDone, isComeback }
}
