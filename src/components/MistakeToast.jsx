import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookmarkCheck, Zap, X } from 'lucide-react'
import useStore from '../store/useStore'
import useTheaterMode from '../hooks/useTheaterMode'

// Rewritten without framer-motion (2026-05-25). The original used Motion +
// AnimatePresence for a single fade+translate transition, which dragged
// motion-dom (~190KB) into the eagerly loaded Layout chunk. Plain CSS
// transitions plus a tiny prefers-reduced-motion media query give the
// same UX without the dependency.

const DISMISS_AFTER_MS = 3000
const EXIT_MS = 200

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function MistakeToast() {
  const mistakesLen = useStore(s => s.mistakes.length)
  const { theaterMode } = useTheaterMode()
  const navigate = useNavigate()

  const prevLen = useRef(mistakesLen)
  const dismissTimer = useRef(null)
  const unmountTimer = useRef(null)
  // Hydration guard: Zustand `persist` may rehydrate from localStorage AFTER
  // first render. Treat the first effect run as a baseline so we never pop
  // "Saved +N" for items already on disk at app load.
  const isHydrated = useRef(false)
  const [count, setCount] = useState(0)
  // `mounted` controls whether the node is in the DOM at all; `entered`
  // toggles the CSS classes that drive opacity + translate. Splitting them
  // lets the exit animation run before the node is removed.
  const [mounted, setMounted] = useState(false)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!isHydrated.current) {
      isHydrated.current = true
      prevLen.current = mistakesLen
      return
    }
    const delta = mistakesLen - prevLen.current
    prevLen.current = mistakesLen
    if (delta <= 0) return

    setCount(c => c + delta)
    setMounted(true)
    // Defer to next frame so the CSS transition runs from the off-state.
    requestAnimationFrame(() => setEntered(true))

    clearTimeout(dismissTimer.current)
    clearTimeout(unmountTimer.current)
    dismissTimer.current = setTimeout(() => setEntered(false), DISMISS_AFTER_MS)
  }, [mistakesLen])

  // When `entered` flips off, wait the exit duration before unmounting and
  // resetting the count so the next isolated mistake starts fresh.
  useEffect(() => {
    if (entered) return
    if (!mounted) return
    unmountTimer.current = setTimeout(() => {
      setMounted(false)
      setCount(0)
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

  const goToMistakes = () => {
    dismiss()
    navigate('/mistakes')
  }

  if (!mounted) return null

  const reduced = prefersReducedMotion()
  const message = count <= 1 ? 'Saved to Mistakes' : `Saved to Mistakes · +${count}`

  // Centering: `left-1/2` + inline `transform: translateX(-50%)` only.
  // Do NOT add Tailwind `-translate-x-1/2` to the className — Tailwind v4
  // emits it as the CSS `translate` property (separate from `transform`),
  // so it would stack with the inline transform and shift the toast -100%
  // of its own width (renders at viewport x=-1 instead of centered).
  return (
    <div
      key="mistake-toast"
      className="fixed left-1/2 z-[var(--z-toast)] flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5 shadow-lg"
      style={{
        background: 'rgba(124,58,237,0.95)',
        color: '#fff',
        bottom: theaterMode ? 16 : 80,
        backdropFilter: 'blur(8px)',
        opacity: entered ? 1 : 0,
        transform: `translateX(-50%) translateY(${entered ? 0 : (reduced ? 0 : 12)}px)`,
        transition: reduced
          ? `opacity ${EXIT_MS}ms ease`
          : `opacity ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1)`,
      }}
      role="status"
      aria-live="polite"
    >
      <BookmarkCheck size={14} />
      <span className="text-xs font-semibold">{message}</span>
      {!theaterMode && (
        <button
          onClick={goToMistakes}
          className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap inline-flex items-center gap-0.5"
          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
        >
          <Zap size={10} /> Practice
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.15)' }}
      >
        <X size={10} />
      </button>
    </div>
  )
}
