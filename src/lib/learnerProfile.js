// Pure, unit-testable derivation of a small "learner profile" that the AI
// evaluators use to adapt cognitive load. See
// docs/2026-05-26-adaptive-scaffolding-design.md §3 for the contract.
//
// The shape is intentionally compact (~500 chars JSONified) so the prompt
// stays cheap. We pass aggregated numbers only — no essay text, no card
// content, no names.

const DAY = 86400000

const MODE_LABELS = {
  fc: 'flashcards',
  quiz: 'multiple choice',
  'type-answer': 'spelling',
  listen: 'listening',
  cloze: 'cloze',
  speak: 'pronunciation',
}

const SEVERITY_WEIGHT = { low: 1, med: 2, high: 4 }

function langKeyWriting(lang) {
  return lang === 'en' ? 'eng' : 'malay'
}

// Detect the meN- imbuhan family. Tighter than a generic "starts with me"
// match — gates on the legal post-prefix consonant for each variant. Still
// a heuristic (no Malay stem dictionary on the client), so it errs on the
// side of false negatives rather than false positives — a false positive
// would mislabel `focusTopics`, which lies to the AI; a false negative just
// loses the meN- refinement and falls back to a plain "imbuhan" label.
function isMeNPrefix(surface) {
  if (typeof surface !== 'string' || surface.length < 6) return false
  return /^(meng[aeiouhk]|meny[s]|mem[bpf]|men[cdjtsz]|me[lmnrwy])\w{3,}/i.test(surface.trim())
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function writingBandRolling(store, lang) {
  const want = langKeyWriting(lang)
  const entries = safeArray(store.writingHistory)
    .filter(e => e?.lang === want && typeof e.band === 'number')
    .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    .slice(0, 3)
  if (entries.length === 0) return null
  const sum = entries.reduce((acc, e) => acc + e.band, 0)
  return sum / entries.length
}

function fsrsLapseRate7d(store) {
  const cutoff = Date.now() - 7 * DAY
  // Count one lapse per distinct mistake entry within the window. The store
  // already dedupes Again-rated cards within 24h via addMistake, so each
  // entry approximates "one bad day per unique word". Summing attempts would
  // inflate the rate when a long-running mistake's attempts counter persists
  // beyond the 7d review window — the agent flagged this in pre-ship review.
  // studyHistory keys are UTC isoDate (matches reviewCardAction in useStore.js).
  const lapseCount = safeArray(store.mistakes)
    .filter(m => m?.source === 'study' && typeof m.timestamp === 'number' && m.timestamp >= cutoff)
    .length

  const studyHistory = store.studyHistory && typeof store.studyHistory === 'object' ? store.studyHistory : {}
  const sevenDayKeys = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * DAY)
    sevenDayKeys.push(d.toISOString().split('T')[0])
  }
  const totalReviews = sevenDayKeys.reduce(
    (acc, k) => acc + (studyHistory[k]?.reviews || 0),
    0,
  )
  if (totalReviews === 0) return 0
  return Math.min(1, lapseCount / totalReviews)
}

function confusionHits14d(store) {
  const cutoff = Date.now() - 14 * DAY
  return safeArray(store.confidenceLog)
    .filter(e => e?.level === 3 && e.correct === false && typeof e.ts === 'number' && e.ts >= cutoff)
    .length
}

function severityEscalations7d(store) {
  const cutoff = Date.now() - 7 * DAY
  return safeArray(store.mistakes)
    .filter(m =>
      typeof m?.timestamp === 'number'
      && m.timestamp >= cutoff
      && typeof m.attempts === 'number'
      && m.attempts >= 3,
    )
    .length
}

function focusTopics(store, lang) {
  const cutoff = Date.now() - 14 * DAY
  const recentCutoff = Date.now() - 3 * DAY
  const langTag = lang === 'en' ? 'en' : 'ms'

  const buckets = new Map() // category → { weight, surfaces[] }
  for (const m of safeArray(store.mistakes)) {
    if (!m || typeof m.timestamp !== 'number' || m.timestamp < cutoff) continue
    if (m.language && m.language !== langTag) continue
    const sev = SEVERITY_WEIGHT[m.severity] ?? 1
    const recency = m.timestamp >= recentCutoff ? 2 : 1
    const weight = sev * recency
    const cat = m.category || 'other'
    const bucket = buckets.get(cat) || { weight: 0, surfaces: [] }
    bucket.weight += weight
    if (m.surface) bucket.surfaces.push(m.surface)
    buckets.set(cat, bucket)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 3)
    .map(([category, info]) => {
      if (category === 'imbuhan' && info.surfaces.some(isMeNPrefix)) {
        return 'imbuhan:meN-'
      }
      return category
    })
}

function recentStrengths(store) {
  const cutoff = Date.now() - 14 * DAY
  const byMode = new Map() // mode → { correct, wrong }
  for (const e of safeArray(store.confidenceLog)) {
    if (!e || typeof e.ts !== 'number' || e.ts < cutoff) continue
    const mode = e.mode
    if (!mode || !MODE_LABELS[mode]) continue
    const bucket = byMode.get(mode) || { correct: 0, wrong: 0 }
    if (e.correct) bucket.correct++
    else bucket.wrong++
    byMode.set(mode, bucket)
  }
  return Array.from(byMode.entries())
    .filter(([, b]) => b.correct >= 5 && b.wrong === 0)
    .sort((a, b) => b[1].correct - a[1].correct)
    .slice(0, 2)
    .map(([mode]) => MODE_LABELS[mode])
}

export function buildLearnerProfile(store, opts = {}) {
  const safeStore = store && typeof store === 'object' ? store : {}
  const lang = opts.lang === 'en' ? 'en' : 'ms'

  const signals = {
    writingBandRolling: writingBandRolling(safeStore, lang),
    fsrsLapseRate7d: fsrsLapseRate7d(safeStore),
    confusionHits14d: confusionHits14d(safeStore),
    severityEscalations7d: severityEscalations7d(safeStore),
  }

  let scaffoldLevel = 'medium'
  const band = signals.writingBandRolling
  const heavyBand = band !== null && band < 3
  const heavyLapse = signals.fsrsLapseRate7d > 0.4
  const heavyEscalations = signals.severityEscalations7d >= 3
  if (heavyBand || heavyLapse || heavyEscalations) {
    scaffoldLevel = 'heavy'
  } else if (
    band !== null && band >= 5
    && signals.fsrsLapseRate7d < 0.15
    && signals.severityEscalations7d === 0
  ) {
    scaffoldLevel = 'light'
  }

  return {
    scaffoldLevel,
    focusTopics: focusTopics(safeStore, lang),
    recentStrengths: recentStrengths(safeStore),
    signals,
  }
}
