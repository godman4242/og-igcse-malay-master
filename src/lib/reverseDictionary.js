// Pure: reverse the Malay→English DICTIONARY into an English→Malay seed for the
// English study deck. It is a STARTER (IGCSE-Malay vocab seen from the other side),
// not a curated English curriculum — the reader is the real engine (spec Fork E).
// Cleanup keeps single words + 2-word collocations, joins collisions, drops the
// rest, and reports the yield so truncation is never silent (spec Q-SEED).
const MAX_GLOSS_WORDS = 2
const MAX_COLLISION = 3

export function buildEnDictionary(dict, { maxGlossWords = MAX_GLOSS_WORDS, maxCollision = MAX_COLLISION } = {}) {
  const collisions = {} // enKey -> Set(malay)
  const stats = { source: 0, kept: 0, droppedSlash: 0, droppedMultiWord: 0, droppedEmpty: 0, collisionsMerged: 0 }
  for (const [malay, english] of Object.entries(dict || {})) {
    stats.source++
    const en = String(english || '').trim().toLowerCase()
    const ms = String(malay || '').trim()
    if (!en || !ms) { stats.droppedEmpty++; continue }
    if (en.includes('/')) { stats.droppedSlash++; continue }                 // 'is/are' etc.
    if (en.split(/\s+/).length > maxGlossWords) { stats.droppedMultiWord++; continue }
    if (!collisions[en]) collisions[en] = new Set()
    collisions[en].add(ms)
  }
  const entries = {}
  for (const [en, msSet] of Object.entries(collisions)) {
    const list = [...msSet].slice(0, maxCollision)
    if (msSet.size > 1) stats.collisionsMerged++
    entries[en] = list.join(' / ')
    stats.kept++
  }
  return { entries, stats }
}
