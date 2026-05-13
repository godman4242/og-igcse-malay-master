// Hook that turns mouse interaction over a tokenized text container into
// the four interaction primitives we want:
//   1. left-click (no drag)        => single token
//   2. left-click + drag           => list of individual tokens (multi-word, individual)
//   3. right-click (no drag)       => single token (treated like left-click for translate mode)
//   4. right-click + drag          => contiguous phrase (joined as one)
//
// Callers wrap their reader root with the returned event handlers. Each
// span representing a token must carry `data-token-i={index}` so we can
// build a stable selection range as the mouse moves.

import { useCallback, useRef } from 'react'

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
    const a = Math.min(start.i, endIndex)
    const b = Math.max(start.i, endIndex)
    onCommit?.({
      startIndex: a,
      endIndex: b,
      isPhrase: start.button === 2 && a !== b,        // right-drag = phrase
      isMulti: start.button === 0 && a !== b,         // left-drag = individual
      isSingle: a === b,
      button: start.button,
    })
  }, [onCommit])

  const onContextMenu = useCallback((e) => {
    // We use right-click + drag as a phrase gesture; suppress the OS menu
    // inside the reader root.
    e.preventDefault()
  }, [])

  return { onMouseDown, onMouseMove, onMouseUp, onContextMenu }
}
