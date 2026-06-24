// src/lib/topicLabels.js
// Shared mistake-category → human label map. Extracted from forYouShelves.js so
// the "Picked for you" chips and the whyReason copy share ONE source (DRY).
// 'imbuhan:meN-' is the refined meN- prefix family (learnerProfile.focusTopics).

export const CATEGORY_LABELS = {
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

export function categoryLabel(topic) {
  return CATEGORY_LABELS[topic] || topic
}
