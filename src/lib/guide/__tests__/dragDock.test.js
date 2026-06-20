import { describe, it, expect } from 'vitest'
import { zoneForPoint, snapRectForZone, shouldDetach, DOCK_ZONES } from '../dragDock'

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
