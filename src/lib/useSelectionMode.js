// Hook that turns mouse interaction over a tokenized text container into the
// interaction primitives we want (Kheshav's mapping — see gestureModel.js):
//   1. left-click  (no drag)  => single token         ('word')
//   2. left-click  + drag      => individual words      ('words')
//   3. right-click (no drag)  => single token         ('word')
//   4. right-click + drag      => grouped phrase        ('phrase')
//
// The gesture→intent decision lives in the pure `classifyGesture` so it's unit
// tested and can't silently invert. Callers wrap their reader root with the
// returned handlers; each token span must carry `data-token-i={index}`.

import { useCallback, useRef } from 'react'
import { classifyGesture } from './gestureModel'

export default function useSelectionMode(onCommit) {
  const startRef = useRef(null) // { i, button }
  const lastRef = useRef(null)  // last hovered i

  const tokenIndexFromEvent = (e) => {
    const el = e.target?.closest?.('[data-token-i]')
    if (!el) return null
    const i = Number(el.getAttribute('data-token-i'))
    return Number.isFinite(i) ? i : null
  }

  const onMouseDown = useCallback((e) => {
    const i = tokenIndexFromEvent(e)
    if (i === null) return
    if (e.button === 2) e.preventDefault() // suppress contextmenu so right-drag works
    startRef.current = { i, button: e.button }
    lastRef.current = i
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!startRef.current) return
    const i = tokenIndexFromEvent(e)
    if (i !== null) lastRef.current = i
  }, [])

  const onMouseUp = useCallback((e) => {
    const start = startRef.current
    if (!start) return
    startRef.current = null
    const endIndex = tokenIndexFromEvent(e) ?? lastRef.current
    if (endIndex === null) return
    const { kind, startIndex, endIndex: end } = classifyGesture({
      button: start.button,
      startIndex: start.i,
      endIndex,
    })
    onCommit?.({ startIndex, endIndex: end, kind, button: start.button })
  }, [onCommit])

  const onContextMenu = useCallback((e) => {
    // We use right-click + drag as a phrase gesture; suppress the OS menu
    // inside the reader root.
    e.preventDefault()
  }, [])

  return { onMouseDown, onMouseMove, onMouseUp, onContextMenu }
}
