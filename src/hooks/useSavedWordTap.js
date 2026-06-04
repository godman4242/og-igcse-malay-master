// Tap (or keyboard-select) an already-highlighted saved word while reading → a
// small READ-ONLY review popover (meaning + 🔊 + example). A *review* gesture,
// distinct from SelectionToCard's *save* gesture. Mounted once in Layout next to
// useSavedWordHighlights.
//
// How it stays out of selection/copy/link's way *by construction* (spec §3 bars):
//   • REVIEW fires only on a true no-drag CLICK (pointer moved ≤6px, selection
//     stays collapsed) — a selection needs the drag, so the two never fight.
//   • A drag-selection of a saved word is left to SelectionToCard (which surfaces
//     "already in your flashcards"); we bail while a pointer was recently active.
//   • The hit-test reads the caret under the finger; we never preventDefault or
//     intercept, so links/buttons/inputs keep working — and we also bail inside
//     them explicitly.
//   • Keyboard path (WCAG 2.1.1): ::highlight() ranges aren't focusable DOM nodes,
//     so the keyboard trigger is keyboard text-selection — selecting a saved word
//     with Shift+Arrow fires `selectionchange`, and we open the same popover via
//     the same hit-test. (Esc/focus handling lives in SavedWordPopover.)

import { useCallback, useEffect, useRef, useState } from 'react'
import useStore from '../store/useStore'
import { matchAtOffset, savedWordsForMode } from '../lib/savedWordHighlight'
import { isDueForRecall } from '../lib/fsrs'

const DRAG_TOLERANCE = 6 // px — beyond this a click is really a drag/selection
const POINTER_GRACE_MS = 400 // after a pointer gesture, treat selectionchange as mouse-driven
const SELECTION_DEBOUNCE_MS = 120

// Only words that are actually highlighted are tappable, so gate on the same API
// the highlighter needs — if it can't paint, there's no affordance to tap.
function supportsHighlightApi() {
  return typeof CSS !== 'undefined' && !!CSS.highlights && typeof window.Highlight === 'function'
}

// Cross-browser caret hit-test → { node, offset } | null.
// Chromium/WebKit: document.caretRangeFromPoint. Firefox: caretPositionFromPoint.
function caretFromPoint(x, y) {
  if (typeof document.caretRangeFromPoint === 'function') {
    const r = document.caretRangeFromPoint(x, y)
    return r ? { node: r.startContainer, offset: r.startOffset } : null
  }
  if (typeof document.caretPositionFromPoint === 'function') {
    const p = document.caretPositionFromPoint(x, y)
    return p ? { node: p.offsetNode, offset: p.offset } : null
  }
  return null
}

// Mirror the highlighter's skip list + link-safety: never act inside a form field,
// link, button, an opted-out region, or our own/another popover.
function isExcluded(node) {
  const el = node?.nodeType === 3 ? node.parentElement : node
  return !!el?.closest?.('[data-no-highlight], [role="dialog"], a, button, input, textarea, select')
}

// Given a hit-test result, build the popover payload if it landed on a saved word
// that we actually hold a card for. Returns null otherwise.
function reviewAt(node, offset) {
  if (!node || node.nodeType !== 3 || isExcluded(node)) return null
  const { cards, highlightMode } = useStore.getState()
  const words = savedWordsForMode(cards || [], highlightMode)
  if (!words.length) return null
  const match = matchAtOffset(node.nodeValue, offset, words)
  if (!match) return null
  const card = (cards || []).find(c => c.m && c.m.toLowerCase() === match.word)
  if (!card) return null
  // Rect of the word itself (not the click point) so the popover anchors over it.
  const range = document.createRange()
  range.setStart(node, match.start)
  range.setEnd(node, match.end)
  const rect = range.getBoundingClientRect()
  // Tier-2: due/weak cards open in recall-first mode; strong cards stay instant.
  return { word: card.m, english: card.e, ex: card.ex || '', rect, recall: isDueForRecall(card) }
}

export default function useSavedWordTap() {
  const [popover, setPopover] = useState(null)
  const popoverRef = useRef(null)
  useEffect(() => { popoverRef.current = popover }, [popover])

  const dismiss = useCallback(() => setPopover(null), [])

  useEffect(() => {
    if (!supportsHighlightApi()) return

    const down = { x: 0, y: 0 }
    let pointerActiveUntil = 0
    let selTimer = 0

    const onPointerDown = (e) => { down.x = e.clientX; down.y = e.clientY }

    const onPointerUp = (e) => {
      pointerActiveUntil = Date.now() + POINTER_GRACE_MS
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      if (moved > DRAG_TOLERANCE) return // a drag → it's a selection; leave it alone
      // Never treat a click inside a popover as a new trigger.
      if (e.target?.closest?.('[data-saved-word-popover]')) return
      const sel = window.getSelection?.()
      if (sel && !sel.isCollapsed) return // text is selected → not a plain click
      const caret = caretFromPoint(e.clientX, e.clientY)
      if (!caret) return
      const next = reviewAt(caret.node, caret.offset)
      if (next) setPopover(next)
    }

    // Keyboard trigger (WCAG 2.1.1): a Shift+Arrow selection lands on a saved word.
    // Debounced, and skipped while a pointer gesture is in play (that path is owned
    // by the click handler above / SelectionToCard) so mouse drags don't double-fire.
    const onSelectionChange = () => {
      clearTimeout(selTimer)
      selTimer = setTimeout(() => {
        if (Date.now() < pointerActiveUntil) return // mouse/touch selection — not us
        if (popoverRef.current) return // already open; don't churn
        const sel = window.getSelection?.()
        if (!sel || sel.isCollapsed || !sel.rangeCount) return
        const range = sel.getRangeAt(0)
        const next = reviewAt(range.startContainer, range.startOffset)
        if (next) setPopover(next)
      }, SELECTION_DEBOUNCE_MS)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      clearTimeout(selTimer)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [])

  return { popover, dismiss }
}
