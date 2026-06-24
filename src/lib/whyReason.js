// src/lib/whyReason.js
// Single source of truth for the For-You "why" copy. Pure. The reason PROSE is
// English (matches the page's existing subtitles); the CONTENT (which weak
// spots) is already studyLang-scoped upstream in ForYou.jsx.

import { categoryLabel } from './topicLabels'

const PICKED_FALLBACK = 'A focused session built from what you most need to review.'

const RAIL_REASONS = {
  'still-remember': 'Words you have not seen in a while — a quick check they are still in memory.',
  saved: 'Words you captured while reading — practising them turns saves into recall.',
}

export function reasonForTask(task) {
  return (task && typeof task.reason === 'string' && task.reason) || ''
}

export function reasonForPicked(focusTopics) {
  const topics = (Array.isArray(focusTopics) ? focusTopics : []).filter(Boolean)
  if (topics.length === 0) return PICKED_FALLBACK
  return `Built around your weak spots this week: ${topics.map(categoryLabel).join(', ')}.`
}

export function reasonForRail(shelfId) {
  return RAIL_REASONS[shelfId] || ''
}
