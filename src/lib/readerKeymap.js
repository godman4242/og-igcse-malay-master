// src/lib/readerKeymap.js
//
// Pure key → action dispatcher for the reflow reader's keyboard layer.
// Mirrors gestureModel.js: the canonical key map (spec §3.3, D4–D6) lives in
// ONE tested pure function so it can never silently invert. The component's
// single delegated onKeyDown calls this, then performs the side effect by
// calling the EXISTING mode-aware functions (handleCommit / revealGloss /
// addGloss) and moving DOM focus — pointer code is untouched.
//
// Canonical map (token focused inside the reflow reader):
//   ←/↑  →/↓        move focus prev / next content token (clamped, no wrap)
//   Home / End      first / last content token
//   Shift+Arrow     extend an anchored range
//   Enter           no range → activate (reveal/translate); range → commit it
//                   with EXACTLY the kind a pointer drag would get
//   a               add the focused token's revealed gloss to the deck
//   Esc             clear an in-progress range (pass-through when none)
//   Space           deliberately NOT handled — keeps native page scroll (D5)
//
// Modified keys (Ctrl/Meta/Alt) always pass through — never hijack Ctrl+A etc.

import { classifyGesture } from './gestureModel'

const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp'])
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown'])

/**
 * @param {{ key:string, shiftKey?:boolean, ctrlKey?:boolean, metaKey?:boolean, altKey?:boolean }} ev
 * @param {{ activeIndex:number, order:number[], anchorIndex:number|null,
 *           mode?:'translate'|'select', groupOn?:boolean,
 *           hasGloss?:boolean, glossRevealed?:boolean }} ctx
 * @returns {{type:'move'|'extend',to:number} | {type:'activate'|'addDeck',index:number}
 *         | {type:'commitRange',startIndex:number,endIndex:number,kind:string}
 *         | {type:'clearRange'} | null}
 */
export function resolveReaderKey(ev = {}, ctx = {}) {
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return null

  const { key } = ev
  const order = ctx.order || []
  const pos = order.indexOf(ctx.activeIndex)
  if (!order.length || pos === -1) return null

  if (PREV_KEYS.has(key) || NEXT_KEYS.has(key)) {
    const to = PREV_KEYS.has(key)
      ? order[Math.max(0, pos - 1)]
      : order[Math.min(order.length - 1, pos + 1)]
    return { type: ev.shiftKey ? 'extend' : 'move', to }
  }
  if (key === 'Home') return { type: 'move', to: order[0] }
  if (key === 'End') return { type: 'move', to: order[order.length - 1] }

  if (key === 'Enter') {
    const anchor = ctx.anchorIndex
    if (anchor != null && anchor !== ctx.activeIndex) {
      // Range commit — classify through the SAME pure model a drag uses, so
      // keyboard ranges and pointer drags can never label a span differently.
      const { kind, startIndex, endIndex } = classifyGesture({
        button: 0,
        startIndex: anchor,
        endIndex: ctx.activeIndex,
        groupIntent: ctx.groupOn ? 'phrase' : 'words',
      })
      return { type: 'commitRange', startIndex, endIndex, kind }
    }
    return { type: 'activate', index: ctx.activeIndex }
  }

  if (key === 'a') return { type: 'addDeck', index: ctx.activeIndex }
  if (key === 'Escape') return ctx.anchorIndex != null ? { type: 'clearRange' } : null

  return null
}
