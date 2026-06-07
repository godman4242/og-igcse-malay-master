// src/lib/gestureModel.js
//
// Pure gesture → intent classifier for the PDF reader's select mode. This is the
// SINGLE source of truth for what each mouse gesture means, so the mapping can
// never silently invert again (it once shipped backwards because the logic lived
// inline in the DOM hook with no test).
//
// Kheshav's canonical mapping (2026-06-07):
//   left-drag  → 'words'  — select the swept tokens as INDIVIDUAL words
//   right-drag → 'phrase' — group the swept tokens into ONE phrase (compositional
//                           meaning, e.g. "jam tangan" = watch, not o'clock + hand)
//   single token (no drag, either button) → 'word'

/**
 * @param {{ button:number, startIndex:number, endIndex:number }} g
 * @returns {{ kind:'word'|'words'|'phrase', startIndex:number, endIndex:number }}
 */
export function classifyGesture(g = {}) {
  const s = g.startIndex
  const e = g.endIndex
  if (!Number.isFinite(s) || !Number.isFinite(e)) {
    return { kind: 'word', startIndex: s, endIndex: e }
  }
  const startIndex = Math.min(s, e)
  const endIndex = Math.max(s, e)
  if (startIndex === endIndex) return { kind: 'word', startIndex, endIndex }
  // right button (2) drags a phrase; left button (0, or anything else) drags words.
  const kind = g.button === 2 ? 'phrase' : 'words'
  return { kind, startIndex, endIndex }
}
