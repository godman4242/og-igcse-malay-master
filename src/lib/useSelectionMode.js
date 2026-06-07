// Hook that turns POINTER interaction (mouse + touch + pen) over a tokenized text
// container into the interaction primitives we want (Kheshav's mapping — see
// gestureModel.js):
//   1. primary click (no drag)  => single token      ('word')
//   2. left/primary + drag      => individual words   ('words')   [unless grouped]
//   3. right-click + drag        => grouped phrase     ('phrase')
//   4. touch/primary + drag with the Group toggle on  => grouped phrase ('phrase')
//
// Pointer Events unify mouse/touch/pen so select mode works on phones (the app's
// primary device), which the old mouse-only handlers did not. The gesture→intent
// decision lives in the pure `classifyGesture` so it's unit tested and can't
// silently invert. Callers wrap their reader root with the returned handlers and
// pass the current `groupIntent` ('words' | 'phrase') from the toolbar toggle;
// each token span must carry `data-token-i={index}`.

import { useCallback, useRef } from 'react'
import { classifyGesture } from './gestureModel'

export default function useSelectionMode(onCommit, groupIntent) {
  const startRef = useRef(null) // { i, button, pointerId }
  const lastRef = useRef(null)  // last hovered i

  const tokenIndexFromEvent = (e) => {
    const el = e.target?.closest?.('[data-token-i]')
    if (!el) return null
    const i = Number(el.getAttribute('data-token-i'))
    return Number.isFinite(i) ? i : null
  }

  const onPointerDown = useCallback((e) => {
    const i = tokenIndexFromEvent(e)
    if (i === null) return // not on a token → let the browser scroll/select normally
    if (e.button === 2) e.preventDefault() // suppress contextmenu so right-drag works
    startRef.current = { i, button: e.button, pointerId: e.pointerId }
    lastRef.current = i
    // Capture so the drag keeps tracking even when the pointer leaves the exact
    // span (and, on touch, so we still receive moves). pan-y on the root lets a
    // vertical scroll cancel instead.
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* unsupported */ }
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!startRef.current) return
    const i = tokenIndexFromEvent(e)
    if (i !== null) lastRef.current = i
  }, [])

  const onPointerUp = useCallback((e) => {
    const start = startRef.current
    if (!start) return
    startRef.current = null
    try { e.currentTarget.releasePointerCapture?.(start.pointerId) } catch { /* ignore */ }
    const endIndex = tokenIndexFromEvent(e) ?? lastRef.current
    if (endIndex === null) return
    const { kind, startIndex, endIndex: end } = classifyGesture({
      button: start.button,
      startIndex: start.i,
      endIndex,
      groupIntent,
    })
    onCommit?.({ startIndex, endIndex: end, kind, button: start.button })
  }, [onCommit, groupIntent])

  // A scroll (or any aborted gesture) cancels the in-flight selection silently.
  const onPointerCancel = useCallback((e) => {
    const start = startRef.current
    startRef.current = null
    if (start) { try { e.currentTarget.releasePointerCapture?.(start.pointerId) } catch { /* ignore */ } }
  }, [])

  const onContextMenu = useCallback((e) => {
    // Right-click + drag is the phrase gesture; suppress the OS menu in the reader.
    e.preventDefault()
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu }
}
