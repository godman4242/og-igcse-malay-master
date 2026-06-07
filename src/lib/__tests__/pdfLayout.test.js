import { describe, it, expect } from 'vitest'
import {
  multiplyTransform,
  itemRect,
  splitItemIntoWordRects,
  fitToWidthScale,
  clampScale,
  doubleTapNextScale,
  visiblePageRange,
} from '../pdfLayout.js'

// Pure layout geometry for the PDF Layout View. No DOM, no pdf.js objects — the
// LayoutView component passes plain numbers (viewport.transform, item.transform,
// item.width/height) into these so they're unit-testable in isolation.

describe('multiplyTransform — 2×3 affine compose (pdf.js Util.transform)', () => {
  it('identity ∘ identity = identity', () => {
    expect(multiplyTransform([1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0, 0])).toEqual([1, 0, 0, 1, 0, 0])
  })

  it('composes translation through a scaled+flipped viewport', () => {
    // V = scale 2, y-flip, page height 100; I = font-size 10 at user (5,40)
    expect(multiplyTransform([2, 0, 0, -2, 0, 100], [10, 0, 0, 10, 5, 40]))
      .toEqual([20, 0, 0, -20, 10, 20])
  })

  it('composes through a 90°-rotated viewport', () => {
    expect(multiplyTransform([0, 2, -2, 0, 100, 0], [10, 0, 0, 10, 5, 40]))
      .toEqual([0, 20, -20, 0, 20, 10])
  })
})

describe('itemRect — text item → CSS-px rect', () => {
  it('identity transform: rect sits at the origin, top lifted by ascent', () => {
    // V=I=identity, item width 5, height 1 → ascent 1, top = f - ascent = -1
    expect(itemRect([1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 10, 20], 5, 1))
      .toEqual({ left: 10, top: 19, width: 5, height: 1 })
  })

  it('scaled + y-flipped viewport scales width/height and lands on the page', () => {
    // V scale 2 y-flip H=100; I font 10 at (5,40); width 3 height 1
    // tx=[20,0,0,-20,10,20] → ascent=20, top=20-20=0, width=3*2=6, height=1*2=2
    expect(itemRect([2, 0, 0, -2, 0, 100], [10, 0, 0, 10, 5, 40], 3, 1))
      .toEqual({ left: 10, top: 0, width: 6, height: 2 })
  })

  it('rotated viewport still yields a positive-sized rect', () => {
    // V 90° scale2; tx=[0,20,-20,0,20,10] → ascent=hypot(-20,0)=20, top=10-20=-10
    expect(itemRect([0, 2, -2, 0, 100, 0], [10, 0, 0, 10, 5, 40], 3, 1))
      .toEqual({ left: 20, top: -10, width: 6, height: 2 })
  })
})

describe('splitItemIntoWordRects — proportional per-word boxes', () => {
  const rect = { left: 0, top: 0, width: 100, height: 10 }

  it('splits a two-word run proportionally by char position', () => {
    // "ab cd" len 5: "ab"[0,2)→left0 w40 ; "cd"[3,5)→left60 w40
    expect(splitItemIntoWordRects(rect, 'ab cd')).toEqual([
      { word: 'ab', left: 0, top: 0, width: 40, height: 10 },
      { word: 'cd', left: 60, top: 0, width: 40, height: 10 },
    ])
  })

  it('collapses runs of spaces — no empty rects, positions still account for the gap', () => {
    // "ab  cd" len 6: "ab"[0,2)→left0 w=200/6 ; "cd"[4,6)→left=400/6 w=200/6
    const out = splitItemIntoWordRects(rect, 'ab  cd')
    expect(out.map((w) => w.word)).toEqual(['ab', 'cd'])
    expect(out[0].left).toBeCloseTo(0)
    expect(out[1].left).toBeCloseTo(400 / 6)
    expect(out[1].width).toBeCloseTo(200 / 6)
  })

  it('drops leading/trailing whitespace without emitting empties', () => {
    const out = splitItemIntoWordRects(rect, ' a ')
    expect(out).toHaveLength(1)
    expect(out[0].word).toBe('a')
    expect(out[0].left).toBeCloseTo(100 / 3)
  })

  it('an all-whitespace / empty string yields no rects', () => {
    expect(splitItemIntoWordRects(rect, '   ')).toEqual([])
    expect(splitItemIntoWordRects(rect, '')).toEqual([])
  })
})

describe('fitToWidthScale', () => {
  it('shrinks a wide page to the container', () => {
    expect(fitToWidthScale(500, 250)).toBe(0.5)
  })
  it('enlarges a narrow page to the container', () => {
    expect(fitToWidthScale(200, 400)).toBe(2)
  })
  it('guards against a zero/garbage page width', () => {
    expect(fitToWidthScale(0, 400)).toBe(1)
  })
})

describe('clampScale', () => {
  const bounds = { min: 0.5, max: 3 }
  it('clamps above max', () => expect(clampScale(5, bounds)).toBe(3))
  it('clamps below min', () => expect(clampScale(0.1, bounds)).toBe(0.5))
  it('passes a value already in range', () => expect(clampScale(1.5, bounds)).toBe(1.5))
})

describe('doubleTapNextScale — toggle fit ⟷ ~2×fit', () => {
  it('from fit → zooms to 2×fit', () => expect(doubleTapNextScale(1, 1)).toBe(2))
  it('from zoomed → snaps back to fit', () => expect(doubleTapNextScale(2, 1)).toBe(1))
  it('from an in-between zoom → snaps back to fit (not near fit)', () =>
    expect(doubleTapNextScale(1.6, 1)).toBe(1))
})

describe('visiblePageRange — lazy render window', () => {
  // 3 pages, each 100 tall: offsets[i]=top of page i, offsets[n]=total height.
  const offsets = [0, 100, 200, 300]

  it('returns only the intersecting pages with no overscan', () => {
    expect(visiblePageRange(0, 150, offsets, 0)).toEqual([0, 1])
  })

  it('grows the window by the overscan on both sides (clamped)', () => {
    expect(visiblePageRange(0, 150, offsets, 1)).toEqual([0, 2])
  })

  it('tracks a scrolled viewport', () => {
    expect(visiblePageRange(150, 100, offsets, 0)).toEqual([1, 2])
  })

  it('returns an empty range ([0,-1]) when nothing is visible', () => {
    expect(visiblePageRange(1000, 100, offsets, 1)).toEqual([0, -1])
  })
})
