// src/lib/selectionGroup.js
//
// Pure grouping logic for the PDF reader's selection bucket (Select v2). Adjacent
// individual words can be glued into one phrase so the learner sees compositional
// meaning (e.g. "jam tangan" = watch, not o'clock + hand), and split back apart.
// The bucket UI in PDFReader.jsx is a thin adapter over these.
//
// Entry shapes:
//   word   → { word, en?, type:'word',   index }
//   phrase → { word,      type:'phrase', startIndex, endIndex }
//
// Plan: docs/superpowers/plans/2026-06-07-select-v2.md Step 2.

/**
 * Merge the contiguous run of WORD entries at array positions [fromIdx..toIdx]
 * into a single phrase entry. Returns a new array. No-op (returns the input
 * unchanged) when the range is a single entry, contains a non-word entry, or the
 * covered tokens are not contiguous in the source text. Never throws.
 *
 * @param {Array} selection
 * @param {number} fromIdx - inclusive array position
 * @param {number} toIdx   - inclusive array position
 * @returns {Array}
 */
export function groupSelection(selection, fromIdx, toIdx) {
  if (!Array.isArray(selection)) return []
  const a = Math.min(fromIdx, toIdx)
  const b = Math.max(fromIdx, toIdx)
  if (!Number.isInteger(a) || !Number.isInteger(b)) return selection
  if (a < 0 || b >= selection.length) return selection
  if (a === b) return selection // group-of-one — nothing to merge

  const slice = selection.slice(a, b + 1)
  if (!slice.every((e) => e && e.type === 'word' && Number.isFinite(e.index))) return selection

  const sorted = [...slice].sort((x, y) => x.index - y.index)
  const startIndex = sorted[0].index
  const endIndex = sorted[sorted.length - 1].index
  // Contiguous = a gapless run of token indices (one token per entry).
  if (endIndex - startIndex !== sorted.length - 1) return selection

  const phrase = {
    word: sorted.map((e) => e.word).join(' '),
    type: 'phrase',
    startIndex,
    endIndex,
  }
  return [...selection.slice(0, a), phrase, ...selection.slice(b + 1)]
}

/**
 * Split the phrase entry at `idx` back into per-word entries, re-deriving one
 * token index per word from its startIndex. No-op on a non-phrase entry or a bad
 * index. Never throws.
 *
 * @param {Array} selection
 * @param {number} idx
 * @returns {Array}
 */
export function ungroupSelection(selection, idx) {
  if (!Array.isArray(selection)) return []
  if (!Number.isInteger(idx) || idx < 0 || idx >= selection.length) return selection
  const entry = selection[idx]
  if (!entry || entry.type !== 'phrase') return selection

  const words = String(entry.word).split(/\s+/).filter(Boolean)
  const start = Number.isFinite(entry.startIndex) ? entry.startIndex : 0
  const split = words.map((w, k) => ({ word: w, type: 'word', index: start + k }))
  return [...selection.slice(0, idx), ...split, ...selection.slice(idx + 1)]
}

/**
 * Build the side-by-side teaching view-model shown when a phrase is formed:
 * each part with its literal gloss, plus the phrase with its compositional gloss.
 * "jam = o'clock · tangan = hand → jam tangan = watch". Never throws.
 *
 * @param {string[]} parts
 * @param {string[]} partGlosses - aligned to parts; missing entries become ''
 * @param {string} phraseGloss
 * @returns {{ parts: Array<{w:string, gloss:string}>, phrase: {w:string, gloss:string} }}
 */
export function explainCompound(parts, partGlosses, phraseGloss) {
  const ps = Array.isArray(parts) ? parts : []
  const gs = Array.isArray(partGlosses) ? partGlosses : []
  return {
    parts: ps.map((w, i) => ({ w, gloss: gs[i] ?? '' })),
    phrase: { w: ps.join(' '), gloss: phraseGloss ?? '' },
  }
}
