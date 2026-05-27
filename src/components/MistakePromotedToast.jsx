import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Sparkles, X } from 'lucide-react'
import useStore from '../store/useStore'
import useTheaterMode from '../hooks/useTheaterMode'

// Phase 5 — Tight Feedback Loops. Mistakes auto-promote to FSRS cards
// inside `addMistake`, but the moment was previously silent. This toast
// fires when the set of mistakes with `promotedCardId !== null` grows,
// regardless of which surface logged the mistake — keeping the wiring DRY
// across Writing / Roleplay / Comprehension / Listening / Speaking /
// interleavedSession. The "delta of a Set of IDs" approach (vs. count)
// gives us the exact mistake that was just promoted, so we can show its
// word + gloss without relying on timestamp ordering.
//
// Visual rationale: positioned bottom-right (vs. MistakeToast's bottom-
// centre) so the two can coexist when a single addMistake call triggers
// both events. Emerald palette signals "leveled up" / "added to deck"
// rather than the purple "saved for review" of the logging toast.

const DISMISS_AFTER_MS = 3200
const EXIT_MS = 220

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function MistakePromotedToast() {
  const mistakes = useStore(s => s.mistakes)
  const { theaterMode } = useTheaterMode()
  const navigate = useNavigate()

  const promotedSnapshot = useMemo(() => {
    const ids = []
    const byId = new Map()
    for (const m of mistakes) {
      if (m && m.promotedCardId) {
        ids.push(m.id)
        byId.set(m.id, m)
      }
    }
    return { ids, byId }
  }, [mistakes])

  const prevIds = useRef(null)
  const dismissTimer = useRef(null)
  const unmountTimer = useRef(null)
  const [latest, setLatest] = useState(null)
  const [extraCount, setExtraCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    // First effect run = baseline. Otherwise Zustand persist rehydration
    // would pop a toast for every previously-promoted mistake on app load.
    if (prevIds.current === null) {
      prevIds.current = new Set(promotedSnapshot.ids)
      return
    }
    const prev = prevIds.current
    const newlyPromoted = promotedSnapshot.ids.filter(id => !prev.has(id))
    prevIds.current = new Set(promotedSnapshot.ids)
    if (newlyPromoted.length === 0) return

    // Show the most recently added of the new batch.
    const newestId = newlyPromoted[newlyPromoted.length - 1]
    const newest = promotedSnapshot.byId.get(newestId)
    if (!newest) return

    setLatest(newest)
    setExtraCount(prevExtra => (mounted ? prevExtra + newlyPromoted.length : newlyPromoted.length - 1))
    setMounted(true)
    requestAnimationFrame(() => setEntered(true))

    clearTimeout(dismissTimer.current)
    clearTimeout(unmountTimer.current)
    dismissTimer.current = setTimeout(() => setEntered(false), DISMISS_AFTER_MS)
  }, [promotedSnapshot, mounted])

  useEffect(() => {
    if (entered) return
    if (!mounted) return
    unmountTimer.current = setTimeout(() => {
      setMounted(false)
      setLatest(null)
      setExtraCount(0)
    }, EXIT_MS + 100)
    return () => clearTimeout(unmountTimer.current)
  }, [entered, mounted])

  useEffect(() => () => {
    clearTimeout(dismissTimer.current)
    clearTimeout(unmountTimer.current)
  }, [])

  const dismiss = () => {
    clearTimeout(dismissTimer.current)
    setEntered(false)
  }

  const openDeck = () => {
    dismiss()
    navigate('/study')
  }

  if (!mounted || !latest) return null

  const reduced = prefersReducedMotion()
  const word = (latest.word || '').trim()
  const gloss = (latest.correct || '').trim()

  return (
    <div
      key="mistake-promoted-toast"
      role="status"
      aria-live="polite"
      className="fixed z-[var(--z-toast)] flex items-stretch gap-2 rounded-2xl shadow-xl overflow-hidden max-w-[320px]"
      style={{
        right: 16,
        bottom: theaterMode ? 16 : 88,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.97) 0%, rgba(5,150,105,0.97) 100%)',
        color: '#fff',
        backdropFilter: 'blur(8px)',
        opacity: entered ? 1 : 0,
        transform: `translateY(${entered ? 0 : (reduced ? 0 : 14)}px)`,
        transition: reduced
          ? `opacity ${EXIT_MS}ms ease`
          : `opacity ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1)`,
      }}
    >
      <div className="flex items-center justify-center pl-3 pr-1">
        <div className="relative">
          <Layers size={20} strokeWidth={2.2} aria-hidden={true} />
          <Sparkles
            size={10}
            strokeWidth={2.5}
            className="absolute -top-1.5 -right-1.5"
            style={{ color: '#fef9c3' }}
            aria-hidden={true}
          />
        </div>
      </div>
      <div className="flex-1 py-2 pr-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          Added to your review deck
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-sm font-bold truncate" lang={latest.language === 'en' ? 'en' : 'ms'}>
            {word || 'New card'}
          </span>
          {gloss && (
            <span className="text-[11px] opacity-85 truncate">— {gloss}</span>
          )}
          {extraCount > 0 && (
            <span
              className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            >
              +{extraCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 pr-2">
        <button
          onClick={openDeck}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}
        >
          Open deck
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.16)' }}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )
}
