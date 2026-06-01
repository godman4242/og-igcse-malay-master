import { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, BookmarkPlus, Check, Loader2, X } from 'lucide-react'
import { normalizeSelection } from '../lib/selectionToCard'
import { speak, hasSpeechSynthesis } from '../lib/speech'
import useStore from '../store/useStore'

// translate.js drags in every provider + the IndexedDB cache; keep it OUT of
// the eager Layout bundle and load it only when a word is actually selected.
const loadTranslate = () => import('../lib/translate').then(m => m.translateWord)

// Universal select→translate→add-to-cards (spec 2026-06-01, MVP/Tier 1).
// Mounted ONCE in Layout. Listens on the document for a text selection on any
// reading surface, shows a small popover with the translation + 🔊 + Save, and
// adds a { m, e, ex, t:'Saved' } card to the FSRS deck (deduped). Transient —
// no persistent highlight in this tier. Bails inside inputs/editables and any
// [data-no-select-card] container (so it never fights the Writing/Import
// composers or offers to "translate" the UI chrome).

const POPOVER_W = 230
const DECK = 'Saved'

// Walk ancestors to decide whether a selection anchor is off-limits: form
// fields, editable regions, or an explicitly opted-out container.
function isExcluded(node) {
  let el = node?.nodeType === 3 ? node.parentElement : node
  while (el) {
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true
    if (el.isContentEditable) return true
    if (el.hasAttribute?.('data-no-select-card')) return true
    el = el.parentElement
  }
  return false
}

// Pull the sentence around the selection out of its container so the card gets
// a useful example (`ex`). Best-effort: falls back to the term itself.
function contextSentence(node, term) {
  const host = node?.nodeType === 3 ? node.parentElement : node
  const text = host?.textContent?.replace(/\s+/g, ' ').trim()
  if (!text) return term
  const sentences = text.split(/(?<=[.!?…])\s+/)
  const hit = sentences.find(s => s.includes(term))
  const out = (hit || text).trim()
  return out.length > 160 ? out.slice(0, 157) + '…' : out
}

export default function SelectionToCard() {
  const addCard = useStore(s => s.addCard)
  // [status] idle | translating | translated | saved | dupe | error
  const [state, setState] = useState({ status: 'idle' })
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const popRef = useRef(null)
  const dismissTimer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(dismissTimer.current)
    setState({ status: 'idle' })
  }, [])

  const handleSelection = useCallback(() => {
    // Let the selection settle (mouseup fires before it's final on some
    // browsers), and never clobber a popover the user is interacting with.
    setTimeout(() => {
      const st = stateRef.current.status
      if (st === 'saved' || st === 'dupe') return
      const sel = window.getSelection?.()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        if (st !== 'idle') dismiss()
        return
      }
      const range = sel.getRangeAt(0)
      const anchor = sel.anchorNode
      // Don't re-trigger when the selection is inside our own popover.
      if (popRef.current && anchor && popRef.current.contains(anchor.nodeType === 3 ? anchor.parentElement : anchor)) return
      if (isExcluded(anchor)) { if (st !== 'idle') dismiss(); return }
      const norm = normalizeSelection(sel.toString())
      if (!norm) { if (st !== 'idle') dismiss(); return }

      const rect = range.getBoundingClientRect()
      const ex = contextSentence(anchor, norm.term)
      setState({ status: 'translating', term: norm.term, rect, ex, translation: '' })

      loadTranslate()
        .then(translateWord => translateWord(norm.term, 'ms', 'en'))
        .then(res => {
          if (stateRef.current.term !== norm.term) return // selection changed mid-flight
          const text = res?.text?.trim()
          if (!text || res.source === 'error') {
            setState(s => ({ ...s, status: 'error' }))
          } else {
            setState(s => ({ ...s, status: 'translated', translation: text }))
          }
        })
        .catch(() => setState(s => ({ ...s, status: 'error' })))
    }, 10)
  }, [dismiss])

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('touchend', handleSelection)
    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('touchend', handleSelection)
    }
  }, [handleSelection])

  // Dismiss on Escape or scroll (the anchored rect would otherwise drift).
  useEffect(() => {
    if (state.status === 'idle') return
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    const onScroll = () => { if (stateRef.current.status !== 'saved' && stateRef.current.status !== 'dupe') dismiss() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [state.status, dismiss])

  if (state.status === 'idle' || !state.rect) return null

  const { rect } = state
  const vw = window.innerWidth
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - POPOVER_W / 2), vw - POPOVER_W - 8)
  // Prefer above the selection; flip below when there isn't room.
  const above = rect.top > 120
  const top = above ? rect.top - 8 : rect.bottom + 8

  const save = () => {
    const exists = useStore.getState().cards.some(c => c.m === state.term && c.t === DECK)
    if (exists) {
      setState(s => ({ ...s, status: 'dupe' }))
    } else {
      addCard({ m: state.term, e: state.translation, ex: state.ex, t: DECK })
      setState(s => ({ ...s, status: 'saved' }))
    }
    dismissTimer.current = setTimeout(dismiss, 1400)
  }

  const saved = state.status === 'saved'
  const dupe = state.status === 'dupe'

  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label="Save word to flashcards"
      className="fixed z-[60] rounded-xl shadow-xl p-2.5 animate-fadeUp"
      style={{
        left, top, width: POPOVER_W,
        transform: above ? 'translateY(-100%)' : 'none',
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
      }}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection alive on click
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{state.term}</span>
        <div className="flex items-center gap-1">
          {hasSpeechSynthesis() && (
            <button onClick={() => speak(state.term, 'ms-MY')} aria-label="Pronounce"
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
              <Volume2 size={11} />
            </button>
          )}
          <button onClick={dismiss} aria-label="Close"
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ color: 'var(--color-dim)' }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {state.status === 'translating' && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-dim)' }}>
          <Loader2 size={12} className="animate-spin" /> Translating…
        </p>
      )}
      {state.status === 'error' && (
        <p className="text-xs" style={{ color: 'var(--color-orange)' }}>
          Couldn’t translate right now — check your connection.
        </p>
      )}
      {(state.status === 'translated' || saved || dupe) && (
        <>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text)' }}>{state.translation}</p>
          <button
            onClick={save}
            disabled={saved || dupe}
            className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-white transition-all"
            style={{ background: saved ? 'var(--color-green)' : dupe ? 'var(--color-surface)' : 'var(--color-accent)', color: dupe ? 'var(--color-dim)' : '#fff' }}>
            {saved ? <><Check size={13} /> Saved to deck</>
              : dupe ? <>Already in your deck</>
                : <><BookmarkPlus size={13} /> Save to flashcards</>}
          </button>
        </>
      )}
    </div>
  )
}
