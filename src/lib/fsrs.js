import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs'

// Configure FSRS with default parameters (trained on hundreds of millions of reviews)
const params = generatorParameters()
const f = fsrs(params)

export { Rating, State }

/**
 * Create a fresh FSRS card state for new cards
 */
export function createNewCardState() {
  const card = createEmptyCard()
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: null,
  }
}

/**
 * Convert old SM-2 card fields to approximate FSRS state.
 * Maps box levels to stability values (days until ~90% forgetting).
 */
export function migrateFromSM2(card) {
  const box = card.box || 1
  const stabilityMap = { 1: 0.5, 2: 2, 3: 7, 4: 21, 5: 90 }
  const difficultyMap = { 1: 7, 2: 6, 3: 5, 4: 4, 5: 3 }

  const stability = stabilityMap[box] || 0.5
  const difficulty = difficultyMap[box] || 5

  // Determine FSRS state from box
  let state = State.New
  if (box >= 4) state = State.Review
  else if (box >= 2) state = State.Learning

  const now = new Date()
  const lastReview = card.lastReview ? new Date(card.lastReview) : now
  const nextReview = card.nextReview ? new Date(card.nextReview) : now

  return {
    due: nextReview.toISOString(),
    stability,
    difficulty,
    elapsed_days: card.interval || 0,
    scheduled_days: card.interval || 0,
    reps: card.totalReviews || 0,
    lapses: box === 1 && (card.totalReviews || 0) > 0 ? 1 : 0,
    state,
    last_review: lastReview.toISOString(),
  }
}

/**
 * Convert our stored card FSRS fields into a ts-fsrs Card object
 */
function toFSRSCard(card) {
  return {
    due: new Date(card.due || new Date()),
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: card.elapsed_days || 0,
    scheduled_days: card.scheduled_days || 0,
    reps: card.reps || 0,
    lapses: card.lapses || 0,
    state: card.state ?? State.New,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  }
}

/**
 * Get scheduling options for all 4 ratings.
 * Returns { [Rating]: { card, interval_display } }
 */
export function getSchedulingOptions(card) {
  const fsrsCard = toFSRSCard(card)
  const now = new Date()
  const scheduling = f.repeat(fsrsCard, now)

  const options = {}
  for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    const result = scheduling[rating]
    const scheduled = result.card
    options[rating] = {
      card: {
        due: scheduled.due.toISOString(),
        stability: scheduled.stability,
        difficulty: scheduled.difficulty,
        elapsed_days: scheduled.elapsed_days,
        scheduled_days: scheduled.scheduled_days,
        reps: scheduled.reps,
        lapses: scheduled.lapses,
        state: scheduled.state,
        last_review: now.toISOString(),
      },
      interval_display: formatInterval(scheduled.scheduled_days, scheduled.due, now),
    }
  }
  return options
}

/**
 * Review a card with a given rating. Returns updated card fields.
 */
export function reviewCard(card, rating) {
  const options = getSchedulingOptions(card)
  return options[rating].card
}

/**
 * Format an interval for display (e.g., "10m", "1d", "3d", "2w", "1mo")
 */
function formatInterval(scheduledDays, dueDate, now) {
  if (scheduledDays === 0) {
    // Learning step — show minutes
    const diffMs = new Date(dueDate) - now
    const mins = Math.max(1, Math.round(diffMs / 60000))
    if (mins < 60) return `${mins}m`
    return `${Math.round(mins / 60)}h`
  }
  if (scheduledDays < 1) return '<1d'
  if (scheduledDays === 1) return '1d'
  if (scheduledDays < 7) return `${Math.round(scheduledDays)}d`
  if (scheduledDays < 30) return `${Math.round(scheduledDays / 7)}w`
  if (scheduledDays < 365) return `${Math.round(scheduledDays / 30)}mo`
  return `${(scheduledDays / 365).toFixed(1)}y`
}

/**
 * Check if a card is due for review
 */
export function isDue(card) {
  if (!card.due) return true
  return new Date(card.due) <= new Date()
}

/**
 * Should a tapped saved word open in "recall-first" mode (hide the meaning behind
 * a Show-meaning tap, turning the glance into a retrieval rep)? True when the card
 * is a current learning target: due for review, OR still being learned (New /
 * Learning / Relearning — note Relearning=3 is a LAPSED card, exactly when recall
 * matters most, which a naïve `state <= Learning` would miss), OR frequently lapsed
 * (lapses >= 3). Strong, settled cards return false → instant gloss (reading flow).
 * Mirrors drillVariants.js's FSRS-state-driven presentation. Tier-2 only.
 */
export function isDueForRecall(card) {
  if (!card) return false
  const state = card.state ?? State.New
  if (state === State.New || state === State.Learning || state === State.Relearning) return true
  if ((card.lapses || 0) >= 3) return true
  return isDue(card)
}

/**
 * Filter cards that are due for review
 */
export function getDueCards(cards) {
  return cards.filter(isDue)
}

// "Mastered" — graduated (Review-state) cards whose FSRS stability has reached
// the app's stable threshold (21 days, matching STILL_REMEMBER_DEFAULTS /
// RECALL_PROBE_DEFAULT stabilityDays). The Dashboard tile that replaced the
// retired XP counter (feature #6): an informational competence signal instead
// of an abstract ever-growing number.
export const MASTERED_STABILITY_DAYS = 21

// The mastered cards themselves (Review state, stability past the threshold).
// countMastered is derived from this so the Dashboard tile's number and the
// "Mastered words" panel's list can never drift apart.
export function masteredCards(cards, minStabilityDays = MASTERED_STABILITY_DAYS) {
  if (!Array.isArray(cards)) return []
  return cards.filter(c =>
    c?.state === State.Review && (c.stability || 0) >= minStabilityDays
  )
}

export function countMastered(cards, minStabilityDays = MASTERED_STABILITY_DAYS) {
  return masteredCards(cards, minStabilityDays).length
}

/**
 * Sort cards by priority: due cards first (most overdue first), then by state
 */
export function sortByPriority(cards) {
  return [...cards].sort((a, b) => {
    const aDue = isDue(a)
    const bDue = isDue(b)
    if (aDue && !bDue) return -1
    if (!aDue && bDue) return 1
    if (aDue && bDue) {
      // Most overdue first
      return new Date(a.due || 0) - new Date(b.due || 0)
    }
    // Not due: sort by state (New first, then Learning, etc.)
    return (a.state ?? 0) - (b.state ?? 0)
  })
}

const DAY_MS = 86400000

// Default thresholds for the "Still remember these?" spacing probe. These match
// the Settings "Default" mode; "Strict" passes 30/21, "Custom" passes the
// learner's own numbers, and disabling passes { enabled: false }.
export const STILL_REMEMBER_DEFAULTS = { enabled: true, stabilityDays: 21, idleDays: 14 }

// The full recall-probe config the store persists (the selector above reads the
// {enabled, stabilityDays, idleDays} subset). `mode` is the UI's named preset.
export const RECALL_PROBE_DEFAULT = { enabled: true, mode: 'default', stabilityDays: 21, idleDays: 14 }

// Named presets → their day thresholds. 'custom' is absent on purpose (it keeps
// the learner's own numbers).
export const RECALL_PROBE_PRESETS = {
  default: { stabilityDays: 21, idleDays: 14 },
  strict: { stabilityDays: 30, idleDays: 21 },
}

/**
 * Merge a Settings patch into the current recall-probe config, then snap the day
 * thresholds to the named preset (Default/Strict) — Custom keeps the supplied
 * days. Pure; the store's setRecallProbe action delegates here so the
 * mode→days rule lives in one tested place.
 *
 * @param {object} [patch]
 * @param {object} [current]
 * @returns {{enabled:boolean, mode:string, stabilityDays:number, idleDays:number}}
 */
export function resolveRecallProbe(patch = {}, current = RECALL_PROBE_DEFAULT) {
  const next = { ...RECALL_PROBE_DEFAULT, ...current, ...patch }
  const preset = RECALL_PROBE_PRESETS[next.mode]
  return preset ? { ...next, ...preset } : next
}

/**
 * "Still remember these?" — the INVERSE of a due/recall queue. Surfaces cards the
 * learner probably thinks are solid so a low-stakes probe can catch *silent*
 * forgetting: settled (stability ≥ stabilityDays), idle (last reviewed ≥ idleDays
 * ago), and NOT currently due. Never-reviewed (New) cards have no last_review and
 * are excluded. Pure; `now` injectable for tests. Returns longest-unseen first.
 *
 * @param {Array}  cards
 * @param {{enabled?:boolean, stabilityDays?:number, idleDays?:number}} [config]
 * @param {number} [now]
 */
export function stillRememberCards(cards, config = STILL_REMEMBER_DEFAULTS, now = Date.now()) {
  if (!Array.isArray(cards)) return []
  const cfg = config || STILL_REMEMBER_DEFAULTS
  if (cfg.enabled === false) return []
  const stabilityDays = typeof cfg.stabilityDays === 'number' ? cfg.stabilityDays : STILL_REMEMBER_DEFAULTS.stabilityDays
  const idleDays = typeof cfg.idleDays === 'number' ? cfg.idleDays : STILL_REMEMBER_DEFAULTS.idleDays

  return cards
    .filter(c => {
      if (!c || !c.last_review) return false
      // "Not due" relative to the injected `now` — must not reuse isDue(), which
      // reads the real wall clock and would disagree with an injected `now`.
      const dueMs = c.due ? new Date(c.due).getTime() : -Infinity
      if (Number.isNaN(dueMs) || dueMs <= now) return false
      if ((c.stability ?? 0) < stabilityDays) return false
      const idleMs = now - new Date(c.last_review).getTime()
      if (Number.isNaN(idleMs)) return false
      return idleMs >= idleDays * DAY_MS
    })
    .sort((a, b) => new Date(a.last_review).getTime() - new Date(b.last_review).getTime())
}

/**
 * Cluster E.7 — Comeback queue: highest-stability mature cards regardless of due date.
 * For users returning after >=7 days. Eases re-entry instead of dumping a backlog.
 */
export function buildComebackQueue(cards, count = 5) {
  return [...cards]
    .filter(c => (c.stability ?? 0) > 0)
    .sort((a, b) => (b.stability ?? 0) - (a.stability ?? 0))
    .slice(0, count)
}
