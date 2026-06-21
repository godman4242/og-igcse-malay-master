// dragDock.js — pure geometry for the guide box's drag-to-dock.
// No DOM. Mirrors gestureModel.js: the SINGLE source of truth for "which dock
// zone is this point in?" and "where does a docked box snap to?" so the mapping
// is unit-tested and can't silently drift. Used by guideController's drag loop +
// keyboard dock path; GuideDockZones renders the same 8 zones.
//
// Zones: 4 edges (top|bottom|left|right) + 4 corners (tl|tr|bl|br). A point
// within `threshold` px of an edge is "in" that edge's band; within threshold of
// two adjacent edges → the corner. Free centre (no band) → null (float, no dock).

export const DOCK_ZONES = ['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br']

export const DEFAULT_THRESHOLD = 80 // margin-band thickness in px
const DEFAULT_MARGIN = 12           // gap from the viewport edge when docked

const finite = (n) => Number.isFinite(n)
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)

/**
 * Which dock zone contains `point`, or null if it's in the free centre.
 * @param {{x:number,y:number}} point  pointer position (clientX/clientY)
 * @param {{width:number,height:number}} viewport
 * @param {number} [threshold]
 * @returns {'top'|'bottom'|'left'|'right'|'tl'|'tr'|'bl'|'br'|null}
 */
export function zoneForPoint(point, viewport, threshold = DEFAULT_THRESHOLD) {
  if (!point || !viewport) return null
  const { x, y } = point
  const { width, height } = viewport
  if (!finite(x) || !finite(y) || !finite(width) || !finite(height)) return null
  const left = x <= threshold
  const right = x >= width - threshold
  const top = y <= threshold
  const bottom = y >= height - threshold
  if (top && left) return 'tl'
  if (top && right) return 'tr'
  if (bottom && left) return 'bl'
  if (bottom && right) return 'br'
  if (top) return 'top'
  if (bottom) return 'bottom'
  if (left) return 'left'
  if (right) return 'right'
  return null
}

/**
 * Top-left position a box of `boxSize` snaps to when docked in `zone`.
 * Clamped so a box larger than the viewport still stays on-screen.
 * @returns {{left:number,top:number}}
 */
export function snapRectForZone(zone, boxSize, viewport, margin = DEFAULT_MARGIN) {
  const bw = boxSize?.width ?? 0
  const bh = boxSize?.height ?? 0
  const vw = viewport?.width ?? 0
  const vh = viewport?.height ?? 0
  const midX = (vw - bw) / 2
  const midY = (vh - bh) / 2
  const maxX = vw - bw - margin
  const maxY = vh - bh - margin
  let left
  let top
  switch (zone) {
    case 'top':    left = midX;   top = margin; break
    case 'bottom': left = midX;   top = maxY;   break
    case 'left':   left = margin; top = midY;   break
    case 'right':  left = maxX;   top = midY;   break
    case 'tl':     left = margin; top = margin; break
    case 'tr':     left = maxX;   top = margin; break
    case 'bl':     left = margin; top = maxY;   break
    case 'br':     left = maxX;   top = maxY;   break
    default:       return { left: midX, top: midY }
  }
  return {
    left: clamp(left, margin, Math.max(margin, maxX)),
    top: clamp(top, margin, Math.max(margin, maxY)),
  }
}

/**
 * Top-left a box of `boxSize` docks to in `zone`, SLIDING along the edge to
 * wherever it was dropped (Tslide★). `origin` = the box's current top-left
 * mid-drag (where the user released it). An EDGE slides on its long axis (the
 * cross axis stays pinned to the dock margin via the centred snap); a CORNER
 * stays pinned (a corner is a point — nothing to slide along). When `origin` is
 * null/undefined (keyboard dock has no drop point), or a coordinate is
 * non-finite, that axis falls back to the centred snap. Always clamped on-screen.
 * @param {string} zone
 * @param {{width:number,height:number}} boxSize
 * @param {{width:number,height:number}} viewport
 * @param {{left:number,top:number}|null} [origin]
 * @param {number} [margin]
 * @returns {{left:number,top:number}}
 */
export function alongEdgeRectForZone(zone, boxSize, viewport, origin, margin = DEFAULT_MARGIN) {
  const snapped = snapRectForZone(zone, boxSize, viewport, margin)
  if (!origin || !zone) return snapped
  const bw = boxSize?.width ?? 0
  const bh = boxSize?.height ?? 0
  const vw = viewport?.width ?? 0
  const vh = viewport?.height ?? 0
  const maxX = vw - bw - margin
  const maxY = vh - bh - margin
  const slideX = finite(origin.left) ? clamp(origin.left, margin, Math.max(margin, maxX)) : snapped.left
  const slideY = finite(origin.top) ? clamp(origin.top, margin, Math.max(margin, maxY)) : snapped.top
  switch (zone) {
    case 'top':
    case 'bottom':
      return { left: slideX, top: snapped.top }   // horizontal edge → slide x
    case 'left':
    case 'right':
      return { left: snapped.left, top: slideY }  // vertical edge → slide y
    default:
      return snapped                              // corners (+ unknown): no slide
  }
}

/**
 * True when a docked box should detach — the pointer has left its dock band
 * (moved to the centre, or into a different zone's band).
 */
export function shouldDetach(point, dockedZone, viewport, threshold = DEFAULT_THRESHOLD) {
  return zoneForPoint(point, viewport, threshold) !== dockedZone
}
