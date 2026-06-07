// Pointer arbitration + pinch/double-tap zoom for the PDF Layout view (Step 4).
//
// Select v2 (useSelectionMode) starts a selection on the FIRST pointerdown. The
// conflict this hook resolves: a SECOND pointer means the gesture is a PINCH, not
// a selection. So this hook sits ABOVE the selection hook and arbitrates:
//   • 1 pointer on a token  → forward to the selection hook (select / tap-translate)
//   • a 2nd pointerdown      → abort the in-flight selection (sel.onPointerCancel)
//                              and enter pinch mode; swallow pointer events from the
//                              selection hook while ≥2 pointers are down
//   • pinch end              → commit the new zoom + ignore the trailing pointerups
//                              so they can't commit a stray selection
//   • double-tap (1 pointer) → toggle zoom (fit ⟷ ~2×fit); suppress that tap's commit
//
// During a live pinch we only apply a cheap CSS transform (smooth); the caller
// re-renders the canvases crisp at the settled `zoom` on gesture end (never mid-
// pinch). The pinch RATIO is finger-distance based, so incidental scrolling can't
// corrupt it. Pure scale math (clampScale / doubleTapNextScale) is unit-tested.

import { useCallback, useRef, useState } from 'react'
import { clampScale, doubleTapNextScale } from './pdfLayout'

const ZOOM_BOUNDS = { min: 1, max: 4 } // zoom is a multiplier on the fit-to-width base
const DOUBLE_TAP_MS = 300
const TAP_MOVE_PX = 10 // a "tap" moved less than this
const DOUBLE_TAP_DIST = 40 // two taps within this many px count as a double-tap

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export default function usePinchZoom(sel) {
  const [zoom, setZoom] = useState(1) // committed zoom (drives the crisp re-render)
  const [liveScale, setLiveScale] = useState(1) // CSS transform during a live pinch (1 = none)

  const pointers = useRef(new Map()) // pointerId → { x, y }
  const committedZoom = useRef(1)
  const liveRef = useRef(1)
  const pinchStartDist = useRef(0)
  const downInfo = useRef(null) // { x, y } of a single-pointer down (tap detection)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const suppressUp = useRef(false) // ignore trailing pointerups after a pinch

  const onPointerDown = useCallback((e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const n = pointers.current.size
    if (n === 1) {
      downInfo.current = { x: e.clientX, y: e.clientY }
      sel.onPointerDown(e)
    } else if (n === 2) {
      // Second finger down → PINCH. Abort any in-flight selection.
      sel.onPointerCancel(e)
      const pts = [...pointers.current.values()]
      pinchStartDist.current = dist(pts[0], pts[1]) || 1
    }
  }, [sel])

  const onPointerMove = useCallback((e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const n = pointers.current.size
    if (n >= 2) {
      e.preventDefault?.() // suppress browser gestures during the pinch
      const pts = [...pointers.current.values()]
      const ratio = dist(pts[0], pts[1]) / pinchStartDist.current
      const targetZoom = clampScale(committedZoom.current * ratio, ZOOM_BOUNDS)
      const s = targetZoom / committedZoom.current // CSS scale relative to the rendered size
      liveRef.current = s
      setLiveScale(s)
    } else if (n === 1) {
      sel.onPointerMove(e)
    }
  }, [sel])

  const onPointerUp = useCallback((e) => {
    const had2 = pointers.current.size >= 2
    pointers.current.delete(e.pointerId)

    if (had2) {
      // A finger lifted from a pinch.
      if (pointers.current.size < 2) {
        const next = clampScale(committedZoom.current * liveRef.current, ZOOM_BOUNDS)
        committedZoom.current = next
        setZoom(next)
        liveRef.current = 1
        setLiveScale(1)
        pinchStartDist.current = 0
        // If a finger is still down, ignore its eventual up so it can't select.
        suppressUp.current = pointers.current.size > 0
      }
      return // swallow — never forward a pinch pointerup to the selection hook
    }

    if (suppressUp.current) {
      if (pointers.current.size === 0) suppressUp.current = false
      sel.onPointerCancel(e)
      return
    }

    // Single-pointer up: distinguish tap (maybe double) from a drag-commit.
    const di = downInfo.current
    const moved = di ? Math.hypot(e.clientX - di.x, e.clientY - di.y) : Infinity
    if (di && moved < TAP_MOVE_PX) {
      const lt = lastTap.current
      const now = e.timeStamp
      if (now - lt.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < DOUBLE_TAP_DIST) {
        // Double-tap → zoom toggle; suppress this tap's selection/translate.
        sel.onPointerCancel(e)
        const nextZoom = doubleTapNextScale(committedZoom.current, 1)
        committedZoom.current = nextZoom
        setZoom(nextZoom)
        lastTap.current = { t: 0, x: 0, y: 0 }
        return
      }
      lastTap.current = { t: now, x: e.clientX, y: e.clientY }
    }
    sel.onPointerUp(e)
  }, [sel])

  const onPointerCancel = useCallback((e) => {
    const had2 = pointers.current.size >= 2
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) {
      liveRef.current = 1
      setLiveScale(1)
      pinchStartDist.current = 0
    }
    if (!had2) sel.onPointerCancel(e)
  }, [sel])

  const liveStyle = liveScale !== 1
    ? { transform: `scale(${liveScale})`, transformOrigin: 'top center', willChange: 'transform' }
    : undefined

  return {
    zoom,
    liveStyle,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu: sel.onContextMenu,
    },
  }
}
