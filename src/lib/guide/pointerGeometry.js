// pointerGeometry.js — pure geometry for the Full Page Guide's animated arrow.
// No DOM. Mirrors dragDock.js: given the guide box rect and the spotlighted
// control's rect, compute where the arrow starts (a point on the box edge facing
// the target), where it ends (just outside the target edge facing the box), the
// arrowhead angle, and an SVG path. Off-screen targets clamp to the viewport.
// Rects are DOMRect-lite { left, top, width, height } so they serialise through
// guideState. Unit-tested in __tests__/pointerGeometry.test.js.

const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)

/**
 * @param {{left,top,width,height}} boxRect     the guide popover
 * @param {{left,top,width,height}} targetRect  the spotlighted control
 * @param {{width,height}} viewport
 * @returns {{ start:{x,y}, end:{x,y}, headDeg:number, path:string, clamped:boolean }}
 */
export function arrowPath(boxRect, targetRect, viewport) {
  const b = centre(boxRect)
  const t = centre(targetRect)
  const dx = t.x - b.x
  const dy = t.y - b.y

  // Pick the box edge facing the target (dominant axis), so the arrow leaves the
  // box from the side nearest the control.
  let start
  if (Math.abs(dx) > Math.abs(dy)) {
    start = { x: dx > 0 ? boxRect.left + boxRect.width : boxRect.left, y: b.y }
  } else {
    start = { x: b.x, y: dy > 0 ? boxRect.top + boxRect.height : boxRect.top }
  }

  // End just outside the target edge facing the box (so the head sits on the edge,
  // not over the control's centre).
  let end
  if (Math.abs(dx) > Math.abs(dy)) {
    end = { x: dx > 0 ? targetRect.left : targetRect.left + targetRect.width, y: t.y }
  } else {
    end = { x: t.x, y: dy > 0 ? targetRect.top : targetRect.top + targetRect.height }
  }

  // Clamp the end into the viewport for off-screen / scrolled-away targets.
  const cx = clamp(end.x, 0, viewport.width)
  const cy = clamp(end.y, 0, viewport.height)
  const clamped = cx !== end.x || cy !== end.y
  end = { x: cx, y: cy }

  const headDeg = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI

  // Gentle quadratic curve: control point offset perpendicular to the line.
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  const path = `M ${round(start.x)} ${round(start.y)} Q ${round(mx)} ${round(my)} ${round(end.x)} ${round(end.y)}`

  return { start, end, headDeg, path, clamped }
}

function round(n) { return Math.round(n * 100) / 100 }
