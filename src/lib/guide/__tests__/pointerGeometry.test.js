import { describe, it, expect } from 'vitest'
import { arrowPath } from '../pointerGeometry'

const VP = { width: 1000, height: 800 }
// box centred ~ (500,400); helper to make a rect-lite
const rect = (left, top, width = 200, height = 100) => ({ left, top, width, height })

describe('arrowPath', () => {
  it('target below the box → start at box bottom, head points down (~90°)', () => {
    const box = rect(400, 300)            // box centre (500,350), bottom edge y=400
    const target = rect(460, 600, 80, 40) // target centre (500,620) — below
    const r = arrowPath(box, target, VP)
    expect(r.start.y).toBeGreaterThan(box.top)          // starts near/under the box
    expect(r.end.y).toBeLessThan(target.top + 1)        // ends just above the target top
    expect(r.headDeg).toBeGreaterThan(45)
    expect(r.headDeg).toBeLessThan(135)
    expect(r.clamped).toBe(false)
    expect(typeof r.path).toBe('string')
  })

  it('target above the box → head points up (~-90°/270°)', () => {
    const box = rect(400, 500)
    const target = rect(460, 100, 80, 40)
    const r = arrowPath(box, target, VP)
    expect(r.end.y).toBeGreaterThan(target.top + target.height - 1) // ends near target bottom
    expect(r.start.y).toBeLessThan(box.top + 1)                     // starts at box top
  })

  it('target to the right → start at box right edge', () => {
    const box = rect(100, 350)
    const target = rect(800, 360, 80, 40)
    const r = arrowPath(box, target, VP)
    expect(r.start.x).toBeGreaterThan(box.left + box.width - 1)
    expect(Math.abs(r.headDeg)).toBeLessThan(45)        // pointing right-ish
  })

  it('off-screen target clamps the end to the viewport and flags it', () => {
    const box = rect(400, 350)
    const target = rect(2000, 360, 80, 40) // way off to the right
    const r = arrowPath(box, target, VP)
    expect(r.end.x).toBeLessThanOrEqual(VP.width)
    expect(r.clamped).toBe(true)
  })

  it('degenerate (overlapping rects) returns a finite, safe arrow', () => {
    const box = rect(400, 350)
    const r = arrowPath(box, box, VP)
    expect(Number.isFinite(r.start.x)).toBe(true)
    expect(Number.isFinite(r.end.x)).toBe(true)
    expect(Number.isFinite(r.headDeg)).toBe(true)
  })
})
