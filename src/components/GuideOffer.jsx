import { useEffect, useState, useCallback } from 'react'
import { Sparkles, X } from 'lucide-react'
import useStore from '../store/useStore'
import { useGuide } from '../hooks/useGuide'

// GuideOffer — the once-only, skippable first-run prompt: "New here? Take a
// 60-second tour." Shows ~2s after first paint (so it doesn't fight the
// Dashboard FirstRunCard), only while the Quick tour is unseen. Taking OR
// dismissing marks it seen, so it never nags again. Always replayable from
// Settings → App guide.
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md §6.
export default function GuideOffer() {
  const seenQuick = useStore(s => s.guide?.seenQuick ?? false)
  const markGuideSeen = useStore(s => s.markGuideSeen)
  const { start } = useGuide()
  const [show, setShow] = useState(false)

  const dismiss = useCallback(() => {
    markGuideSeen('quick')
    setShow(false)
  }, [markGuideSeen])

  const take = useCallback(() => {
    setShow(false)
    start('quick') // start() also marks the tour seen
  }, [start])

  // Debounced first-paint reveal — let the Dashboard settle first.
  useEffect(() => {
    if (seenQuick) return
    const id = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(id)
  }, [seenQuick])

  // Keyboard-dismissible.
  useEffect(() => {
    if (!show) return
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show, dismiss])

  if (!show || seenQuick) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Take a quick tour of the app"
      data-tour="guide-offer"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[min(92vw,360px)] rounded-2xl p-4 shadow-xl animate-fadeUp"
      style={{
        zIndex: 'var(--z-toast)',
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ color: 'var(--color-dim)' }}
      >
        <X size={15} />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-accent-subtle)' }}>
          <Sparkles size={18} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>New here?</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-dim)' }}>
            Take a 60-second tour to see how everything works.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={take}
          className="flex-1 text-xs font-bold px-3 py-2 rounded-xl"
          style={{ background: 'var(--color-accent)', color: '#fff', minHeight: 40 }}
        >
          Take the tour
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs font-bold px-3 py-2 rounded-xl"
          style={{ background: 'var(--color-card2)', color: 'var(--color-dim)', border: '1px solid var(--color-border)', minHeight: 40 }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
