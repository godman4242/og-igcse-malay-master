// src/lib/forYouShelves.js
//
// Pure builder for the "For You" personalized home. Assembles shelves from a
// plain store SNAPSHOT (no store access, no React) by composing already-shipped
// derivations: buildLearnerProfile (weak topics), buildDailyPlan (today's queue),
// stillRememberCards (the spacing-probe selector), the 'Saved' deck, and
// goalToFocus (the goal→surface map). Each shelf carries `hidden:true` when it has
// nothing to show; the caller filters. Deterministic given (snapshot, now) — the
// one impurity is buildLearnerProfile's internal Date.now() recency windows, which
// read snapshot.mistakes timestamps (a pre-existing trait of that shipped fn).
//
// Design: docs/superpowers/specs/2026-06-06-personalized-for-you-design.md §5.1
// Plan:   docs/superpowers/plans/2026-06-06-personalized-for-you.md (Phase 1)

import { buildLearnerProfile } from './learnerProfile'
import { buildDailyPlan } from './dailyPlan'
import { stillRememberCards, STILL_REMEMBER_DEFAULTS } from './fsrs'
import { goalToFocus } from './goals'

export const SHELF_ORDER = ['keep-going', 'picked', 'still-remember', 'saved', 'goal']

const SAVED_DECK = 'Saved'
const CARD_RAIL_CAP = 12

// Weak-topic category key → human-readable chip label (mistake categories, not
// card topics — see learnerProfile.focusTopics). 'imbuhan:meN-' is the refined
// meN- prefix family.
const CATEGORY_LABELS = {
  vocab: 'Vocabulary',
  imbuhan: 'Imbuhan (affixes)',
  'imbuhan:meN-': 'meN- prefixes',
  tense: 'Tenses',
  spelling: 'Spelling',
  cohesion: 'Cohesion',
  register: 'Register',
  pronunciation: 'Pronunciation',
  comprehension: 'Comprehension',
  fluency: 'Fluency',
  other: 'Mixed practice',
}

// Goal emphasis token → the surface that serves it.
const GOAL_SURFACES = {
  speaking: { label: 'Practise speaking', route: '/speaking' },
  roleplay: { label: 'Try a roleplay', route: '/roleplay' },
  writing: { label: 'Write & get feedback', route: '/writing' },
  grammar: { label: 'Drill grammar', route: '/grammar' },
  vocab: { label: 'Learn new words', route: '/word-families' },
  exam: { label: 'Exam rehearsal', route: '/exam-rehearsal' },
  listening: { label: 'Listening practice', route: '/listening' },
  comprehension: { label: 'Reading comprehension', route: '/comprehension' },
  review: { label: 'Review due cards', route: '/study' },
}

function asArray(v) {
  return Array.isArray(v) ? v : []
}

function categoryLabel(topic) {
  return CATEGORY_LABELS[topic] || topic
}

function buildKeepGoing(snapshot, now) {
  const plan = buildDailyPlan(snapshot.dailyPlanInputs || {}, now)
  const items = asArray(plan.tasks)
    .filter(t => !t.done)
    .map(t => ({ id: t.id, label: t.label, sublabel: t.sublabel, route: t.route }))
  return {
    id: 'keep-going',
    title: 'Keep going',
    kind: 'tasks',
    items,
    cta: null,
    hidden: items.length === 0,
  }
}

function buildPicked(snapshot, lang) {
  const cards = asArray(snapshot.cards)
  const profile = buildLearnerProfile(snapshot, { lang })
  const focusTopics = asArray(profile.focusTopics)
  const items = focusTopics.map(topic => ({ id: topic, label: categoryLabel(topic) }))
  const subtitle = focusTopics.length
    ? 'A focused session shaped around your weak spots'
    : 'A focused session from what you need to review'
  return {
    id: 'picked',
    title: 'Picked for you',
    kind: 'session',
    subtitle,
    items,
    cta: { label: 'Start session', route: '/smart-study' },
    hidden: cards.length === 0,
    meta: { focusTopics },
  }
}

function buildStillRemember(snapshot, now) {
  const config = snapshot.recallProbe || STILL_REMEMBER_DEFAULTS
  const cards = stillRememberCards(asArray(snapshot.cards), config, now)
    .slice(0, CARD_RAIL_CAP)
    .map(c => ({ id: c.m, m: c.m, e: c.e, ex: c.ex }))
  return {
    id: 'still-remember',
    title: 'Still remember these?',
    kind: 'cards',
    subtitle: 'A quick check on words you have not seen in a while',
    items: cards,
    cta: null,
    hidden: config.enabled === false || cards.length === 0,
  }
}

function buildSaved(snapshot) {
  const items = asArray(snapshot.cards)
    .filter(c => c && c.t === SAVED_DECK)
    .slice(0, CARD_RAIL_CAP)
    .map(c => ({ id: c.m, m: c.m, e: c.e, ex: c.ex }))
  return {
    id: 'saved',
    title: 'From your saved words',
    kind: 'cards',
    subtitle: 'Words you captured while reading',
    items,
    cta: { label: 'Practise saved words', route: '/saved-cloze' },
    hidden: items.length === 0,
  }
}

function buildGoal(snapshot) {
  const identity = snapshot.identity || {}
  const { emphasise } = goalToFocus(identity.goalPreset ?? null, identity.idealSelf || '')
  const items = emphasise
    .map(token => {
      const surface = GOAL_SURFACES[token]
      return surface ? { id: token, label: surface.label, route: surface.route } : null
    })
    .filter(Boolean)
    .slice(0, 3)
  return {
    id: 'goal',
    title: 'Toward your goal',
    kind: 'link',
    subtitle: 'Practice that moves you toward what you are aiming for',
    items,
    cta: items[0] ? { label: items[0].label, route: items[0].route } : null,
    hidden: items.length === 0,
  }
}

/**
 * Build the ordered list of "For You" shelves from a store snapshot.
 *
 * @param {object} snapshot - plain store fields (see emptySnapshot in the tests
 *   for the shape): cards, mistakes, confidenceLog, writingHistory, studyHistory,
 *   speakingHistory, identity {idealSelf, goalPreset}, recallProbe, dailyPlanInputs, lang.
 * @param {number} [now]
 * @returns {Array<{id,title,kind,items,cta,hidden,subtitle?,meta?}>} ordered, hidden flagged.
 */
export function buildForYouShelves(snapshot = {}, now = Date.now()) {
  const safe = snapshot && typeof snapshot === 'object' ? snapshot : {}
  const lang = safe.lang === 'en' ? 'en' : 'ms'
  return [
    buildKeepGoing(safe, now),
    buildPicked(safe, lang),
    buildStillRemember(safe, now),
    buildSaved(safe),
    buildGoal(safe),
  ]
}
