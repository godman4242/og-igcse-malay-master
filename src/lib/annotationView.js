// Pure helpers consumed by AnnotatedWritingFeedback.jsx. Lives separately
// from the component so the rendering layer stays tiny and the tested
// behaviour stays unit-coverable without a DOM. See
// docs/2026-05-26-adaptive-scaffolding-design.md §5.

// User-facing chip label. The spec (§13 Risk) explicitly remaps "heavy" to
// "focused" so the student does not see infantilising copy.
export function scaffoldChipLabel(level) {
  if (level === 'heavy') return 'Adaptive: focused'
  if (level === 'light') return 'Adaptive: stretch'
  return 'Adaptive: balanced'
}

// Faded-scaffolding pedagogy (Bjork — desirable difficulty): on heavy
// scaffolding the model rewrite is hidden by default so the student first
// engages with the highlights; they can reveal it on demand.
export function shouldHideRewriteByDefault(level) {
  return level === 'heavy'
}

// Given the span list and an active group filter, mark each span as dimmed,
// highlighted, or fully suppressed. The "none" sentinel hides every
// highlight (clean re-reading mode).
export function partitionSpansByActiveGroup(spans, activeGroupId) {
  if (activeGroupId === 'none') {
    return spans.map(s => ({ ...s, dimmed: false, suppressed: true }))
  }
  if (activeGroupId === null || activeGroupId === undefined) {
    return spans.map(s => ({ ...s, dimmed: false, suppressed: false }))
  }
  return spans.map(s => ({
    ...s,
    dimmed: s.groupId !== activeGroupId,
    suppressed: false,
  }))
}

// Category → human label. Keep the surface short; this is what the legend
// chip and tooltip show.
export const CATEGORY_LABELS_MS = {
  imbuhan: 'Imbuhan',
  'verb-form': 'Bentuk kata kerja',
  'vocab-upgrade': 'Naik taraf kosa kata',
  cohesion: 'Kata hubung',
  'sophisticated-lexicon': 'Kosa kata canggih',
  spelling: 'Ejaan',
  register: 'Laras bahasa',
  'sentence-structure': 'Struktur ayat',
}

export const CATEGORY_LABELS_EN = {
  imbuhan: 'Verb affix',
  'verb-form': 'Verb form',
  'vocab-upgrade': 'Vocabulary lift',
  cohesion: 'Cohesion',
  'sophisticated-lexicon': 'Sophisticated lexicon',
  spelling: 'Spelling',
  register: 'Register',
  'sentence-structure': 'Sentence structure',
}

export function labelForCategory(category, lang) {
  const map = lang === 'en' ? CATEGORY_LABELS_EN : CATEGORY_LABELS_MS
  return map[category] || category
}
