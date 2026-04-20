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
