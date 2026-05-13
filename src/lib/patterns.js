// src/lib/patterns.js
// Clusters mistakes by underlying grammar rule

/**
 * Cluster mistakes by underlying grammar pattern.
 * @param {Array} mistakes - From store.mistakes (type: 'grammar'|'vocab')
 * @returns {Array<{ pattern: string, description: string, count: number, drillIds: string[] }>}
 */
export function clusterMistakes(mistakes) {
  const grammarMistakes = mistakes.filter(m => m.type === 'grammar' && !m.reviewed)
  const clusters = {}

  grammarMistakes.forEach(m => {
    const pattern = classifyPattern(m.word) // m.word is the drill ID
    if (!clusters[pattern]) {
      clusters[pattern] = {
        pattern,
        description: PATTERN_DESCRIPTIONS[pattern] || pattern,
        count: 0,
        drillIds: [],
      }
    }
    clusters[pattern].count++
    if (!clusters[pattern].drillIds.includes(m.word)) {
      clusters[pattern].drillIds.push(m.word)
    }
  })

  return Object.values(clusters)
    .filter(c => c.count >= 2) // Only show patterns with 2+ mistakes
    .sort((a, b) => b.count - a.count)
}

/**
 * Classify a drill ID into a grammar pattern.
 * Drill IDs follow format: {type}-{prefix/detail}-{root}
 * e.g., prefix-meN-tulis, passive-ibu-masak, suffix-kan-bersih, tense-ali-makan
 */
function classifyPattern(drillId) {
  if (drillId.startsWith('prefix-meN-')) {
    // Extract the sub-rule from the drill ID
    const root = drillId.replace('prefix-meN-', '')
    const firstChar = root.charAt(0).toLowerCase()
    if ('ptks'.includes(firstChar)) return 'meN-PTKS-drop'
    return 'meN-standard'
  }
  if (drillId.startsWith('prefix-ber-')) return 'ber-prefix'
  if (drillId.startsWith('prefix-peN-')) return 'peN-prefix'
  if (drillId.startsWith('passive-')) return 'passive-voice'
  if (drillId.startsWith('suffix-kan-')) return 'suffix-kan'
  if (drillId.startsWith('suffix-kean-')) return 'suffix-ke-an'
  if (drillId.startsWith('suffix-an-')) return 'suffix-an'
  if (drillId.startsWith('suffix-peNan-')) return 'suffix-peN-an'
  if (drillId.startsWith('tense-')) return 'tense-markers'
  if (drillId.startsWith('error-')) return 'error-identification'
  if (drillId.startsWith('transform-')) return 'sentence-transform'
  return 'other'
}

const PATTERN_DESCRIPTIONS = {
  'meN-PTKS-drop': 'meN- with P, T, K, S roots — these consonants DROP when the prefix is added',
  'meN-standard': 'meN- with non-PTKS roots — the consonant stays',
  'ber-prefix': 'ber- prefix — usually straightforward, watch for belajar/bekerja exceptions',
  'peN-prefix': 'peN- prefix (doer nouns) — follows same PTKS rules as meN-',
  'passive-voice': 'Active to passive conversion — meN- → di-, dropped consonants return',
  'suffix-kan': '-kan suffix — indicates action on an object',
  'suffix-ke-an': 'ke-...-an circumfix — creates abstract nouns',
  'suffix-an': '-an suffix — creates result nouns',
  'suffix-peN-an': 'peN-...-an circumfix — creates process nouns',
  'tense-markers': 'Tense markers — sudah/sedang/akan/belum',
  'error-identification': 'Identifying imbuhan errors in sentences',
  'sentence-transform': 'Sentence transformation exercises',
}

// ─────────────────────────────────────────────────────────────────────
// Performance trends across writing + speaking histories
// ─────────────────────────────────────────────────────────────────────

/**
 * Group entries by `key` (format / topic), compute average band, sort
 * weakest first. Excludes groups with < minAttempts samples to keep the
 * signal honest.
 */
function aggregateByKey(entries, key, minAttempts = 2) {
  const groups = {}
  for (const e of entries) {
    const k = e[key]
    if (!k || typeof e.band !== 'number') continue
    if (!groups[k]) groups[k] = { key: k, total: 0, sum: 0, last: null, lastTs: 0 }
    groups[k].total += 1
    groups[k].sum += e.band
    const ts = e.ts ? new Date(e.ts).getTime() : 0
    if (ts >= groups[k].lastTs) {
      groups[k].lastTs = ts
      groups[k].last = e.band
    }
  }
  return Object.values(groups)
    .filter(g => g.total >= minAttempts)
    .map(g => ({ ...g, avg: g.sum / g.total }))
    .sort((a, b) => a.avg - b.avg)
}

/**
 * Surface the weakest 3 writing formats (lowest average band, ≥2 attempts).
 * Returns [{ key, avg, last, total }] — caller does the labelling.
 */
export function weakestWritingFormats(writingHistory, limit = 3) {
  return aggregateByKey(writingHistory || [], 'format', 2).slice(0, limit)
}

/**
 * Surface the weakest 3 speaking topics — same shape as above.
 * Speaking entries use either `topicId` (og grader) or `scenarioId`
 * (upg grader); we union them.
 */
export function weakestSpeakingTopics(speakingHistory, limit = 3) {
  const normalised = (speakingHistory || []).map(e => ({
    ...e,
    topic: e.topicId || e.scenarioId || e.topic,
  })).filter(e => e.topic)
  return aggregateByKey(normalised, 'topic', 2).slice(0, limit)
}

/**
 * Find the worst recent speaking session (lowest band, ≥2 candidates so a
 * single bad day doesn't dominate forever). Newer sessions break ties so
 * the widget feels reactive rather than dwelling on ancient sessions.
 * Returns null when there is nothing useful to show.
 */
export function worstSpeakingSession(speakingHistory) {
  const items = (speakingHistory || []).filter(e => typeof e.band === 'number' && (e.topicId || e.scenarioId))
  if (items.length < 2) return null
  // Limit to last 30 days so the widget reflects current weakness.
  const cutoff = Date.now() - 30 * 86400000
  const recent = items.filter(e => new Date(e.ts).getTime() >= cutoff)
  const pool = recent.length >= 2 ? recent : items
  return [...pool].sort((a, b) => {
    if (a.band !== b.band) return a.band - b.band
    return new Date(b.ts) - new Date(a.ts)
  })[0]
}

/**
 * Roll up the last N days of activity into a sparkline series.
 * Returns [{ day: 'YYYY-MM-DD', writingBand, speakingBand, reviews }] —
 * one entry per day in the window, oldest first. Missing days carry
 * forward writing/speaking band from the previous day so the sparkline
 * stays continuous; reviews are zero-filled.
 */
export function rollingActivity(writingHistory, speakingHistory, studyHistory, days = 30) {
  const out = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let lastWriting = null
  let lastSpeaking = null

  // Pre-bucket by day for O(N) lookup.
  const wByDay = {}
  ;(writingHistory || []).forEach(e => {
    const k = (e.ts || '').slice(0, 10)
    if (!k) return
    const arr = (wByDay[k] = wByDay[k] || [])
    if (typeof e.band === 'number') arr.push(e.band)
  })
  const sByDay = {}
  ;(speakingHistory || []).forEach(e => {
    const k = (e.ts || '').slice(0, 10)
    if (!k) return
    const arr = (sByDay[k] = sByDay[k] || [])
    if (typeof e.band === 'number') arr.push(e.band)
  })

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    const w = wByDay[k]
    const s = sByDay[k]
    if (w && w.length) lastWriting = w.reduce((a, x) => a + x, 0) / w.length
    if (s && s.length) lastSpeaking = s.reduce((a, x) => a + x, 0) / s.length
    const reviews = studyHistory?.[k]?.reviews || 0
    out.push({
      day: k,
      writingBand: lastWriting,
      speakingBand: lastSpeaking,
      reviews,
    })
  }
  return out
}
