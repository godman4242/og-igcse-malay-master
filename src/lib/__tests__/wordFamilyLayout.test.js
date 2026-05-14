import { describe, it, expect } from 'vitest'
import { layoutTree, bezierPath, sortFormsByPOS, POS_ORDER, POS_STYLE } from '../wordFamilyLayout'

const F = (word, pos = 'verb', type = 'meN-') => ({ word, pos, type, meaning: 'm' })

describe('layoutTree (radial positioning math)', () => {
  it('returns empty for empty / non-array input', () => {
    expect(layoutTree([])).toEqual([])
    expect(layoutTree(null)).toEqual([])
    expect(layoutTree(undefined)).toEqual([])
  })

  it('places a single form directly above the centre (angle = -π/2)', () => {
    const out = layoutTree([F('menulis')], { cx: 250, cy: 250, r: 175 })
    expect(out).toHaveLength(1)
    expect(out[0].form.word).toBe('menulis')
    expect(out[0].angle).toBeCloseTo(-Math.PI / 2, 5)
    expect(out[0].x).toBeCloseTo(250, 5)
    expect(out[0].y).toBeCloseTo(75, 5) // 250 - 175
  })

  it('spaces N forms evenly around the centre at radius r', () => {
    const forms = [F('a'), F('b'), F('c'), F('d')]
    const out = layoutTree(forms, { cx: 100, cy: 100, r: 50 })
    // Each node must sit on the radius-50 circle
    for (const n of out) {
      const dx = n.x - 100
      const dy = n.y - 100
      expect(Math.hypot(dx, dy)).toBeCloseTo(50, 5)
    }
    // Successive angles differ by exactly 2π/N
    for (let i = 1; i < out.length; i++) {
      expect(out[i].angle - out[i - 1].angle).toBeCloseTo((2 * Math.PI) / 4, 5)
    }
  })

  it('Bezier control points lie ON the radial vector between centre and node', () => {
    // Pulling control points along the same vector is what keeps the
    // path sweeping outward smoothly instead of zig-zagging across the
    // tree. Pin that contract: cp1 and cp2 are collinear with cx/cy and
    // the node, and lie between the two.
    const out = layoutTree([F('a'), F('b'), F('c')], { cx: 0, cy: 0, r: 100 })
    for (const n of out) {
      const angle = Math.atan2(n.y, n.x)
      expect(Math.atan2(n.cp1.y, n.cp1.x)).toBeCloseTo(angle, 5)
      expect(Math.atan2(n.cp2.y, n.cp2.x)).toBeCloseTo(angle, 5)
      expect(Math.hypot(n.cp1.x, n.cp1.y)).toBeLessThan(100)
      expect(Math.hypot(n.cp2.x, n.cp2.y)).toBeLessThan(100)
      expect(Math.hypot(n.cp1.x, n.cp1.y)).toBeLessThan(Math.hypot(n.cp2.x, n.cp2.y))
    }
  })

  it('handles a max-size family (9 forms) without two nodes overlapping', () => {
    const forms = Array.from({ length: 9 }, (_, i) => F(`w${i}`))
    const out = layoutTree(forms, { cx: 250, cy: 250, r: 175 })
    expect(out).toHaveLength(9)
    // Minimum distance between any two nodes must exceed 2× NODE_R (32+32=64)
    // to guarantee zero circle overlap in the rendered SVG.
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const d = Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y)
        expect(d).toBeGreaterThan(64)
      }
    }
  })
})

describe('sortFormsByPOS', () => {
  it('groups verbs → nouns → adjectives, preserving inner order', () => {
    const forms = [
      F('menulis', 'verb'),
      F('tulisan', 'noun'),
      F('bertulis', 'adj'),
      F('ditulis', 'verb'),
      F('penulis', 'noun'),
    ]
    const sorted = sortFormsByPOS(forms)
    expect(sorted.map(f => f.word)).toEqual(['menulis', 'ditulis', 'tulisan', 'penulis', 'bertulis'])
  })

  it('treats unknown POS values as verbs (defensive default)', () => {
    const forms = [F('a', 'unknown'), F('b', 'verb')]
    const sorted = sortFormsByPOS(forms)
    expect(sorted).toHaveLength(2)
    // Both end up in the verb bucket, input order preserved
    expect(sorted.map(f => f.word)).toEqual(['a', 'b'])
  })
})

describe('bezierPath', () => {
  it('emits a valid SVG path string in M-C form', () => {
    const node = { x: 10, y: 20, cp1: { x: 1, y: 2 }, cp2: { x: 3, y: 4 } }
    expect(bezierPath(0, 0, node)).toBe('M 0 0 C 1 2, 3 4, 10 20')
  })
})

describe('POS palette', () => {
  it('exposes the three IGCSE POS keys with a colour + label + soft fill each', () => {
    expect(POS_ORDER).toEqual(['verb', 'noun', 'adj'])
    for (const k of POS_ORDER) {
      expect(POS_STYLE[k]).toBeDefined()
      expect(POS_STYLE[k].color).toMatch(/var\(--color-/)
      expect(POS_STYLE[k].soft).toMatch(/^rgba\(/)
      expect(POS_STYLE[k].label).toBeTruthy()
    }
  })
})
