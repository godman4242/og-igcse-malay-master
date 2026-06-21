import { describe, it, expect } from 'vitest'
import {
  zoneForPoint,
  snapRectForZone,
  alongEdgeRectForZone,
  shouldDetach,
  clampBoxSize,
  MIN_BOX_SIZE,
  MAX_BOX_FRACTION,
  DOCK_ZONES,
} from '../dragDock'

const VP = { width: 1000, height: 800 }
const T = 80

describe('zoneForPoint', () => {
  it('returns null for a point in the free centre', () => {
    expect(zoneForPoint({ x: 500, y: 400 }, VP, T)).toBe(null)
  })
  it('detects the four edges', () => {
    expect(zoneForPoint({ x: 500, y: 10 }, VP, T)).toBe('top')
    expect(zoneForPoint({ x: 500, y: 790 }, VP, T)).toBe('bottom')
    expect(zoneForPoint({ x: 10, y: 400 }, VP, T)).toBe('left')
    expect(zoneForPoint({ x: 990, y: 400 }, VP, T)).toBe('right')
  })
  it('detects the four corners (corner beats edge)', () => {
    expect(zoneForPoint({ x: 10, y: 10 }, VP, T)).toBe('tl')
    expect(zoneForPoint({ x: 990, y: 10 }, VP, T)).toBe('tr')
    expect(zoneForPoint({ x: 10, y: 790 }, VP, T)).toBe('bl')
    expect(zoneForPoint({ x: 990, y: 790 }, VP, T)).toBe('br')
  })
  it('returns null for non-finite or missing input', () => {
    expect(zoneForPoint({ x: NaN, y: 5 }, VP, T)).toBe(null)
    expect(zoneForPoint(null, VP, T)).toBe(null)
    expect(zoneForPoint({ x: 5, y: 5 }, null, T)).toBe(null)
  })
})

describe('snapRectForZone', () => {
  const box = { width: 300, height: 200 }
  it('top edge: horizontally centred, near the top', () => {
    expect(snapRectForZone('top', box, VP)).toEqual({ left: (1000 - 300) / 2, top: 12 })
  })
  it('bottom-right corner: pinned to bottom-right with the margin', () => {
    expect(snapRectForZone('br', box, VP)).toEqual({ left: 1000 - 300 - 12, top: 800 - 200 - 12 })
  })
  it('left edge: vertically centred, near the left', () => {
    expect(snapRectForZone('left', box, VP)).toEqual({ left: 12, top: (800 - 200) / 2 })
  })
  it('clamps when the box is larger than the viewport (never off-screen)', () => {
    const big = { width: 2000, height: 2000 }
    const r = snapRectForZone('br', big, VP)
    expect(r.left).toBe(12)
    expect(r.top).toBe(12)
  })
  it('unknown zone falls back to centred', () => {
    expect(snapRectForZone('nope', box, VP)).toEqual({ left: 350, top: 300 })
  })
})

describe('alongEdgeRectForZone (Tslide★ — box slides ALONG the docked edge)', () => {
  const box = { width: 300, height: 100 }
  // VP is 1000x800; margin 12 ⇒ maxX = 1000-300-12 = 688, maxY = 800-100-12 = 688.

  it('top edge: keeps the dropped along-edge x (NOT snapped to centre); pins to the top margin', () => {
    // Box dropped with its left at 70px (≈10% across the edge) on the top band.
    const r = alongEdgeRectForZone('top', box, VP, { left: 70, top: 5 })
    expect(r).toEqual({ left: 70, top: 12 })         // slid, not centred (centre would be 350)
    // The centred snap is what we are explicitly NOT doing.
    expect(r.left).not.toBe(snapRectForZone('top', box, VP).left)
  })

  it('bottom edge: slides x, pins to the bottom margin', () => {
    const r = alongEdgeRectForZone('bottom', box, VP, { left: 500, top: 790 })
    expect(r).toEqual({ left: 500, top: 800 - 100 - 12 })
  })

  it('left edge: slides y, pins to the left margin', () => {
    const r = alongEdgeRectForZone('left', box, VP, { left: 5, top: 300 })
    expect(r).toEqual({ left: 12, top: 300 })
  })

  it('right edge: slides y, pins to the right margin', () => {
    const r = alongEdgeRectForZone('right', box, VP, { left: 990, top: 300 })
    expect(r).toEqual({ left: 1000 - 300 - 12, top: 300 })
  })

  it('clamps the slid axis on-screen (never off the edge)', () => {
    expect(alongEdgeRectForZone('top', box, VP, { left: -100, top: 5 }).left).toBe(12)   // clamp low
    expect(alongEdgeRectForZone('top', box, VP, { left: 9999, top: 5 }).left).toBe(688)  // clamp high
    expect(alongEdgeRectForZone('left', box, VP, { left: 5, top: -50 }).top).toBe(12)
    expect(alongEdgeRectForZone('left', box, VP, { left: 5, top: 9999 }).top).toBe(688)
  })

  it('corners do NOT slide — they stay pinned exactly like the centred snap', () => {
    for (const z of ['tl', 'tr', 'bl', 'br']) {
      expect(alongEdgeRectForZone(z, box, VP, { left: 500, top: 500 })).toEqual(snapRectForZone(z, box, VP))
    }
  })

  it('no drop origin (keyboard dock) falls back to the centred snap', () => {
    expect(alongEdgeRectForZone('top', box, VP, null)).toEqual(snapRectForZone('top', box, VP))
    expect(alongEdgeRectForZone('left', box, VP, undefined)).toEqual(snapRectForZone('left', box, VP))
  })

  it('a non-finite origin coordinate falls back to the centred value on that axis', () => {
    const r = alongEdgeRectForZone('top', box, VP, { left: NaN, top: 5 })
    expect(r.left).toBe(snapRectForZone('top', box, VP).left)   // 350
    expect(r.top).toBe(12)
  })
})

describe('clampBoxSize (Tresize★ — PowerPoint-style resize bounds)', () => {
  // VP 1000x800, MAX_BOX_FRACTION 0.9 ⇒ maxW = 900, maxH = 720. MIN = 200x120.
  it('passes a size that is already within bounds through unchanged', () => {
    expect(clampBoxSize({ width: 400, height: 300 }, VP)).toEqual({ width: 400, height: 300 })
  })
  it('clamps a too-SMALL size UP to the min bounds (controls stay usable)', () => {
    expect(clampBoxSize({ width: 50, height: 40 }, VP)).toEqual({ width: MIN_BOX_SIZE.width, height: MIN_BOX_SIZE.height })
  })
  it('clamps a too-LARGE size DOWN to MAX_BOX_FRACTION of the viewport', () => {
    expect(clampBoxSize({ width: 5000, height: 5000 }, VP)).toEqual({
      width: 1000 * MAX_BOX_FRACTION,
      height: 800 * MAX_BOX_FRACTION,
    })
  })
  it('clamps each axis independently', () => {
    expect(clampBoxSize({ width: 50, height: 5000 }, VP)).toEqual({ width: 200, height: 720 })
  })
  it('a non-finite width/height falls back to the min on that axis', () => {
    expect(clampBoxSize({ width: NaN, height: 300 }, VP)).toEqual({ width: 200, height: 300 })
    expect(clampBoxSize({ width: 400, height: undefined }, VP)).toEqual({ width: 400, height: 120 })
  })
  it('never inverts on a tiny viewport — the max can never drop below the min', () => {
    // 100*0.9 = 90 < min 200, so the cap is raised to the min, not below it.
    expect(clampBoxSize({ width: 400, height: 300 }, { width: 100, height: 100 })).toEqual({ width: 200, height: 120 })
  })
  it('honours a custom maxFraction', () => {
    expect(clampBoxSize({ width: 5000, height: 5000 }, VP, { maxFraction: 0.5 })).toEqual({ width: 500, height: 400 })
  })
})

describe('shouldDetach', () => {
  it('false while the pointer is still in the docked band', () => {
    expect(shouldDetach({ x: 500, y: 10 }, 'top', VP, T)).toBe(false)
  })
  it('true when the pointer reaches the free centre', () => {
    expect(shouldDetach({ x: 500, y: 400 }, 'top', VP, T)).toBe(true)
  })
  it('true when the pointer moves to a different zone', () => {
    expect(shouldDetach({ x: 500, y: 790 }, 'top', VP, T)).toBe(true)
  })
})

describe('DOCK_ZONES', () => {
  it('exports all 8 zone keys', () => {
    expect(DOCK_ZONES).toEqual(['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br'])
  })
})
