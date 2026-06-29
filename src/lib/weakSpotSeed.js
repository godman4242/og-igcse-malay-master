// src/lib/weakSpotSeed.js
//
// Turns the learner's real weak spots — buildLearnerProfile().focusTopics, the
// top-3 weak mistake-categories over the last 14 days — into a readable,
// language-aware goal + topic list. The For-You make-deck panel uses it to seed
// the AI deck / roleplay generators with one tap ("Practise your weak spots"),
// instead of making the learner type a goal. Empty mistakes → empty seed (the
// panel hides the entry). Pure: no React, no store, no network.
//
// Malay phrasing is the Claude-verified quality gate (the owner is not
// Malay-fluent). Note `tense → "penanda masa"`: Malay marks time lexically
// (sudah/sedang/akan), not by conjugation, so "time markers" is the accurate
// gloss — not "kala".
// Spec: docs/superpowers/specs/2026-06-29-weak-spot-practice-seed-design.md

import { buildLearnerProfile } from './learnerProfile.js'

// Mistake-category slug → readable phrase, per language. Slugs come from the
// store's mistake pipeline (v11) + the profile's `imbuhan:meN-` refinement.
const TOPIC_LABELS = {
  ms: {
    vocab: 'kosa kata',
    imbuhan: 'imbuhan',
    'imbuhan:meN-': 'imbuhan (awalan meN-)',
    tense: 'penanda masa',
    spelling: 'ejaan',
    cohesion: 'penanda wacana',
    register: 'laras bahasa',
    pronunciation: 'sebutan',
    comprehension: 'pemahaman',
    fluency: 'kelancaran',
    other: 'latihan am',
  },
  en: {
    vocab: 'vocabulary',
    imbuhan: 'word-building (imbuhan)',
    'imbuhan:meN-': 'word-building with meN- prefixes',
    tense: 'verb tenses',
    spelling: 'spelling',
    cohesion: 'linking ideas',
    register: 'formal vs informal register',
    pronunciation: 'pronunciation',
    comprehension: 'reading comprehension',
    fluency: 'speaking fluency',
    other: 'general practice',
  },
}

function labelFor(slug, lang) {
  const map = TOPIC_LABELS[lang === 'en' ? 'en' : 'ms']
  return map[slug] || map.other
}

// Natural list join: "a" · "a and b" · "a, b and c" (Malay uses "dan").
function joinPhrases(items, lang) {
  const and = lang === 'en' ? 'and' : 'dan'
  if (items.length <= 1) return items[0] || ''
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`
}

/**
 * Build a one-tap practice seed from the learner's weak spots.
 *
 * @param {object} store - the Zustand store (only `store.mistakes` is read)
 * @param {'ms'|'en'} [lang] - the active study language (default 'ms')
 * @returns {{ topics: string[], goal: string }} readable weak-area phrases and a
 *   goal sentence to seed the generators; both empty when there are no weak spots.
 */
export function weakSpotSeed(store, lang = 'ms') {
  // Computed during ForYou render — a throw would white-screen the panel, so a
  // corrupted store degrades to "no weak spots" (cf. the try/catch around
  // buildLearnerProfile in RoleplaySession / useWritingEvaluator).
  let slugs = []
  try {
    const profile = buildLearnerProfile(store, { lang })
    if (Array.isArray(profile.focusTopics)) slugs = profile.focusTopics
  } catch {
    return { topics: [], goal: '' }
  }
  const topics = slugs.map(slug => labelFor(slug, lang))
  if (!topics.length) return { topics: [], goal: '' }
  const lead = lang === 'en' ? 'Focus on my weak areas' : 'Fokus pada kelemahan saya'
  return { topics, goal: `${lead}: ${joinPhrases(topics, lang)}.` }
}
