import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Volume2, X, BookOpen, Eye, Check } from 'lucide-react'
import { speak, hasSpeechSynthesis } from '../lib/speech'
import useStore from '../store/useStore'

// READ-ONLY review popover for an already-saved word the learner tapped (or
// keyboard-selected) while reading. Distinct from SelectionToCard's SAVE popover:
// no save button (it's already a card) — just the meaning, a 🔊, the example
// sentence, and a quiet "Review in Study" link. Presentational + its own dismiss
// effects; the trigger/hit-test lives in useSavedWordTap.
//
// Tier-2 (adaptive, never forced — evidence: retrieval-with-feedback beats lookup,
// but forcing effort backfires on motivation, so only DUE/weak words get it):
//   • recall mode (recall=true): meaning hidden behind a one-tap "Show meaning"
//     button — a retrieval attempt, then reveal = feedback. After reveal, a subtle
//     "I forgot this" routes a SOFT signal to the Mistake journal (severity:'low').
//     GUARDRAIL: it must NEVER call an FSRS Rating / reschedule the card.
//   • instant mode (recall=false): the meaning shows immediately (reading flow).
//
// Accessibility (WCAG 1.4.13 / 2.1.1 — a hard bar, not polish): role="dialog" with
// an accessible name, focus moves IN on open and is RESTORED on close, dismissible
// with Esc / outside-click / scroll / tab-away, never obscuring or trapping.

const POPOVER_W = 240

// Underline the word within its example sentence (first, case-insensitive
// occurrence) — dual-coding the form in context. Plain sentence if not found.
function underlineWord(sentence, word) {
  const i = word ? sentence.toLowerCase().indexOf(word.toLowerCase()) : -1
  if (i < 0) return sentence
  return (
    <>
      {sentence.slice(0, i)}
      <span style={{ color: 'var(--color-text)', textDecoration: 'underline' }}>
        {sentence.slice(i, i + word.length)}
      </span>
      {sentence.slice(i + word.length)}
    </>
  )
}

export default function SavedWordPopover({ word, english, ex, rect, recall = false, onClose }) {
  const navigate = useNavigate()
  const addMistake = useStore(s => s.addMistake)
  const popRef = useRef(null)
  const returnFocusRef = useRef(null)
  // recall mode gates the meaning behind a retrieval attempt; instant mode is
  // revealed from the start.
  const [revealed, setRevealed] = useState(!recall)
  const [flagged, setFlagged] = useState(false)

  // Move focus into the dialog on open; restore it to the prior element on close.
  useEffect(() => {
    returnFocusRef.current = document.activeElement
    popRef.current?.focus()
    return () => {
      const el = returnFocusRef.current
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus()
    }
  }, [])

  // When the meaning is revealed (recall mode), the "Show meaning" button unmounts;
  // pull focus back into the dialog so a keyboard/AT user is never stranded (and so
  // the tab-away close below doesn't fire on the unmount).
  useEffect(() => {
    if (revealed) popRef.current?.focus()
  }, [revealed])

  // Dismiss on Escape (without moving focus first — WCAG 1.4.13) or on scroll
  // (the anchored rect would otherwise drift), plus outside-click.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    const onScroll = () => onClose()
    const onDocPointer = (e) => {
      if (!popRef.current?.contains(e.target)) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('mousedown', onDocPointer, true)
    document.addEventListener('touchstart', onDocPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('mousedown', onDocPointer, true)
      document.removeEventListener('touchstart', onDocPointer, true)
    }
  }, [onClose])

  if (!rect) return null

  const vw = window.innerWidth
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - POPOVER_W / 2), vw - POPOVER_W - 8)
  const above = rect.top > 120
  const top = above ? rect.top - 8 : rect.bottom + 8

  const goStudy = () => { onClose(); navigate('/study') }

  // SOFT forgot-signal: journal-only, never an FSRS reschedule (severity:'low' also
  // means addMistake skips card auto-promotion entirely — see store ~line 1316).
  const forgot = () => {
    addMistake({ type: 'review', category: 'vocab', source: 'tappable-review', language: 'ms', word, correct: english, severity: 'low' })
    setFlagged(true)
  }

  return (
    <div
      ref={popRef}
      data-saved-word-popover
      role="dialog"
      aria-label={`Review saved word: ${word}`}
      tabIndex={-1}
      className="fixed z-[60] rounded-xl shadow-xl p-2.5 animate-fadeUp outline-none"
      style={{
        left, top, width: POPOVER_W,
        transform: above ? 'translateY(-100%)' : 'none',
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
      }}
      // Tab away to a real element outside → close. We ignore a null relatedTarget
      // (e.g. focus falling to <body> when "Show meaning" unmounts) so revealing the
      // meaning doesn't close the popover; outside-CLICK is handled separately above.
      onBlur={(e) => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) onClose() }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{word}</span>
        <div className="flex items-center gap-1">
          {hasSpeechSynthesis() && (
            <button onClick={() => speak(word, 'ms-MY')} aria-label={`Pronounce ${word}`}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
              <Volume2 size={11} />
            </button>
          )}
          <button onClick={onClose} aria-label="Close"
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ color: 'var(--color-dim)' }}>
            <X size={12} />
          </button>
        </div>
      </div>

      {!revealed ? (
        // Recall mode, pre-reveal: a retrieval attempt before the answer.
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--color-dim)' }}>Do you remember this word?</p>
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: 'var(--color-accent)', color: '#fff' }}>
            <Eye size={13} /> Show meaning
          </button>
        </>
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>{english}</p>

          {ex && ex !== word && (
            <p className="text-xs italic mt-1 mb-2 line-clamp-2" style={{ color: 'var(--color-dim)' }}>
              {underlineWord(ex, word)}
            </p>
          )}
          {(!ex || ex === word) && <div className="mb-2" />}

          <button
            onClick={goStudy}
            className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: 'var(--color-surface)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
            <BookOpen size={13} /> Review in Study
          </button>

          {recall && (
            flagged ? (
              <p className="mt-1.5 text-[11px] flex items-center justify-center gap-1" style={{ color: 'var(--color-green)' }}>
                <Check size={11} /> Added to your fix-up list
              </p>
            ) : (
              <button
                onClick={forgot}
                className="mt-1.5 w-full text-[11px] text-center hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-dim)' }}>
                I forgot this
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}
