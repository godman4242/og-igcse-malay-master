// Tier-2 persistent highlighting: subtly marks the learner's saved words
// wherever they appear in page prose, so they get a passive "I've saved this"
// recognition cue while reading. Uses the CSS Custom Highlight API, which paints
// ranges WITHOUT mutating the DOM — so it never fights React's render or breaks
// text selection / the select-to-card popover. Degrades to a no-op where the API
// is absent. The pure match logic lives in lib/savedWordHighlight.js (unit-tested);
// this hook is the DOM/CSS glue, verified via Playwright.

import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import useStore from '../store/useStore'
import { findSavedWordMatches, savedWordsForMode } from '../lib/savedWordHighlight'

const HIGHLIGHT_NAME = 'saved-words'
const MAX_RANGES = 2000 // safety cap so a huge page can never stall the paint
const EMPTY = []

function supportsHighlightApi() {
  return typeof CSS !== 'undefined' && !!CSS.highlights && typeof window.Highlight === 'function'
}

// Walk the visible prose under <main>, map every saved-word occurrence to a
// Range, and hand the set to the browser's highlight registry. Skips form
// fields, buttons, script/style, and anything opted out via [data-no-highlight].
function applyHighlights(words) {
  const main = document.querySelector('main')
  if (!main) return
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT
      const p = node.parentElement
      if (!p || p.closest('[data-no-highlight], script, style, input, textarea, button')) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const ranges = []
  let node
  while ((node = walker.nextNode()) && ranges.length < MAX_RANGES) {
    for (const m of findSavedWordMatches(node.nodeValue, words)) {
      const r = document.createRange()
      r.setStart(node, m.start)
      r.setEnd(node, m.end)
      ranges.push(r)
    }
  }
  if (ranges.length) CSS.highlights.set(HIGHLIGHT_NAME, new window.Highlight(...ranges))
  else CSS.highlights.delete(HIGHLIGHT_NAME)
}

// Mounted once in Layout. Re-highlights on navigation and whenever the saved-word
// set changes, and watches <main> for async/lazy content (e.g. AI-generated
// comprehension questions) so late-arriving text gets marked too. Our own
// highlighting adds no DOM nodes, so the observer never loops on itself.
export default function useSavedWordHighlights() {
  const { pathname } = useLocation()
  const cards = useStore(s => s.cards)
  const highlightMode = useStore(s => s.highlightMode)

  // A stable string trigger: the effect re-runs only when navigation happens or
  // the highlighted-word set actually changes (mode switch or new saved words).
  const key = useMemo(
    () => savedWordsForMode(cards || EMPTY, highlightMode).join('|').toLowerCase(),
    [cards, highlightMode],
  )

  useEffect(() => {
    if (!supportsHighlightApi()) return
    const { cards: liveCards, highlightMode: liveMode } = useStore.getState()
    const words = savedWordsForMode(liveCards || EMPTY, liveMode)
    if (!words.length) { CSS.highlights.delete(HIGHLIGHT_NAME); return }

    let raf = 0
    const run = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => applyHighlights(words))
    }
    run()
    const settle = setTimeout(run, 350) // catch lazily-rendered page content

    const main = document.querySelector('main')
    let observer, debounce
    if (main && typeof MutationObserver === 'function') {
      observer = new MutationObserver(() => {
        clearTimeout(debounce)
        debounce = setTimeout(run, 200)
      })
      observer.observe(main, { childList: true, subtree: true, characterData: true })
    }
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
      clearTimeout(debounce)
      observer?.disconnect()
    }
  }, [pathname, key])
}
