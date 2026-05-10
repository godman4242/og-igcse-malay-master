import { useState, useEffect, useRef } from 'react'
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BookmarkCheck, Zap, X } from 'lucide-react'
import useStore from '../store/useStore'
import useTheaterMode from '../hooks/useTheaterMode'

const DISMISS_AFTER_MS = 3000

export default function MistakeToast() {
  const mistakesLen = useStore(s => s.mistakes.length)
  const { theaterMode } = useTheaterMode()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()

  const prevLen = useRef(mistakesLen)
  const dismissTimer = useRef(null)
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const delta = mistakesLen - prevLen.current
    prevLen.current = mistakesLen
    if (delta <= 0) return

    setCount(c => c + delta)
    setVisible(true)

    clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => setVisible(false), DISMISS_AFTER_MS)
  }, [mistakesLen])

  // Reset count after the toast finishes hiding so the next isolated mistake
  // starts fresh rather than continuing the previous stack.
  useEffect(() => {
    if (visible) return
    const t = setTimeout(() => setCount(0), 300)
    return () => clearTimeout(t)
  }, [visible])

  useEffect(() => () => clearTimeout(dismissTimer.current), [])

  const dismiss = () => {
    clearTimeout(dismissTimer.current)
    setVisible(false)
  }

  const goToMistakes = () => {
    dismiss()
    navigate('/mistakes')
  }

  const message = count <= 1 ? 'Saved to Mistakes' : `Saved to Mistakes · +${count}`

  return (
    <AnimatePresence>
      {visible && (
        <Motion.div
          key="mistake-toast"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5 shadow-lg"
          style={{
            background: 'rgba(124,58,237,0.95)',
            color: '#fff',
            bottom: theaterMode ? 16 : 80,
            backdropFilter: 'blur(8px)',
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
        </Motion.div>
      )}
    </AnimatePresence>
  )
}
