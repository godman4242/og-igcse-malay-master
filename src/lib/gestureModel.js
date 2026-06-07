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
//
// `groupIntent` (2026-06-07, touch support): phones have no right button, so the
// group/individual choice comes from a toolbar toggle instead. When set to
// 'phrase' it makes a primary (left/touch) drag group; the right button still
// always groups regardless. Omitting it preserves the desktop default exactly.

/**
 * @param {{ button:number, startIndex:number, endIndex:number, groupIntent?:'words'|'phrase' }} g
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
  // Right button (2) always groups. Otherwise an explicit 'phrase' group intent
  // (from the touch toggle) groups; the default is individual words.
  let kind = 'words'
  if (g.button === 2 || g.groupIntent === 'phrase') kind = 'phrase'
  return { kind, startIndex, endIndex }
}
