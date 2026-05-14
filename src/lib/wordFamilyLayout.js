// Pure layout math for the WordFamilyTree SVG.
//
// Kept as a leaf module so vitest can pin the contract without spinning
// up JSDOM or React: same reason `parseRatingKeyword` / `parseStopKeyword`
// live next to their UI consumers in speech.js.

// Per-POS visual palette. Centralised so the tree, the legend, and the
// future "Add to deck" badge can all read from the same source of truth.
export const POS_STYLE = {
  verb: { color: 'var(--color-blue)',   label: 'Kata Kerja', soft: 'rgba(68,138,255,0.18)'  },
  noun: { color: 'var(--color-green)',  label: 'Kata Nama',  soft: 'rgba(0,230,118,0.18)'   },
  adj:  { color: 'var(--color-purple)', label: 'Kata Sifat', soft: 'rgba(179,136,255,0.18)' },
}

// Stable POS ordering used to walk the forms in a predictable circular
// sequence (verbs → nouns → adjectives, top-clockwise).
export const POS_ORDER = ['verb', 'noun', 'adj']

// Compute radial positions for N form nodes around a center (cx, cy)
// with radius `r`. Returns one position per input form, in input order
// after a stable POS-sort so each POS group occupies a contiguous arc.
//
// Geometry:
//   - first node at the top (angle = -90°), then clockwise
//   - 360° divided evenly across all nodes
//   - cubic-Bezier control points pulled 50% of the way to the node so
//     paths sweep outward smoothly instead of running through the centre
//
// Returns: [{ form, x, y, angle, cp1: {x,y}, cp2: {x,y} }, …]
export function layoutTree(forms, { cx = 250, cy = 250, r = 175 } = {}) {
  if (!Array.isArray(forms) || forms.length === 0) return []
  const sorted = sortFormsByPOS(forms)
  const n = sorted.length
  return sorted.map((form, i) => {
    // Start at -π/2 (top), sweep clockwise
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    // Bezier control points: pull both toward the destination angle so
    // the curve fans rather than zig-zagging.
    const cp1 = { x: cx + (r * 0.4) * Math.cos(angle), y: cy + (r * 0.4) * Math.sin(angle) }
    const cp2 = { x: cx + (r * 0.75) * Math.cos(angle), y: cy + (r * 0.75) * Math.sin(angle) }
    return { form, x, y, angle, cp1, cp2 }
  })
}

// Stable POS-grouped order. Within each POS group we preserve input
// order so the data file controls the inner sequence (e.g. listing
// active before passive verbs).
export function sortFormsByPOS(forms) {
  const buckets = { verb: [], noun: [], adj: [] }
  for (const f of forms) {
    const pos = f.pos in buckets ? f.pos : 'verb'
    buckets[pos].push(f)
  }
  return POS_ORDER.flatMap(p => buckets[p])
}

// Format a node's Bezier path attribute string. Caller passes the
// center (root edge start) and the layout result for the target node.
export function bezierPath(cx, cy, node) {
  return `M ${cx} ${cy} C ${node.cp1.x} ${node.cp1.y}, ${node.cp2.x} ${node.cp2.y}, ${node.x} ${node.y}`
}
