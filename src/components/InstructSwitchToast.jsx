import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, X } from 'lucide-react'
import { subscribeInstructSwitch, getConfiguredInstructProviders } from '../lib/instruct'
import useTheaterMode from '../hooks/useTheaterMode'

// Multi-provider router UX (spec R6): when callInstruct silently falls back to
// another configured provider (quota / failure on the first choice), this
// toast names the real switch and links to the AI-providers settings — the
// learner already made the decision by configuring multiple keys, so we never
// interrupt mid-feature, just inform. Mounted globally in Layout beside
// MistakeToast; throttled to one toast per from→to pair per minute so retry
// loops can't spam. Timestamps come from the router payload (ts) — no
// Date.now() in render (React 19 purity).

const SHOW_MS = 6000
const EXIT_MS = 220
const THROTTLE_MS = 60_000

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function InstructSwitchToast() {
  const [event, setEvent] = useState(null)
  const [entered, setEntered] = useState(false)
  const lastShown = useRef(new Map()) // "from>to" → last event ts
  const dismissTimer = useRef(null)
  const unmountTimer = useRef(null)
  const navigate = useNavigate()
  const { theaterMode } = useTheaterMode()

  useEffect(() => {
    const unsub = subscribeInstructSwitch((payload) => {
      const key = `${payload.from}>${payload.to}`
      const last = lastShown.current.get(key)
      if (last != null && payload.ts - last < THROTTLE_MS) return
      lastShown.current.set(key, payload.ts)

      clearTimeout(dismissTimer.current)
      clearTimeout(unmountTimer.current)
      setEvent(payload)
      requestAnimationFrame(() => setEntered(true))
      dismissTimer.current = setTimeout(() => setEntered(false), SHOW_MS)
    })
    return () => {
      unsub()
      clearTimeout(dismissTimer.current)
      clearTimeout(unmountTimer.current)
    }
  }, [])

  useEffect(() => {
    if (entered || !event) return
    unmountTimer.current = setTimeout(() => setEvent(null), EXIT_MS + 100)
    return () => clearTimeout(unmountTimer.current)
  }, [entered, event])

  const dismiss = () => {
    clearTimeout(dismissTimer.current)
    setEntered(false)
  }

  const openSettings = () => {
    dismiss()
    navigate('/settings#byok')
  }

  if (!event) return null

  const labels = new Map(getConfiguredInstructProviders().map(p => [p.id, p.label]))
  const name = (id) => labels.get(id) || (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'AI')
  const verb = event.cause === 'quota' ? 'hit a limit' : 'had a problem'
  const reduced = prefersReducedMotion()

  return (
    <div
      data-testid="instruct-switch-toast"
      role="status"
      aria-live="polite"
      className="fixed z-[var(--z-toast)] left-1/2 flex items-center gap-2 rounded-2xl shadow-xl px-3 py-2 max-w-[340px] w-[calc(100%-32px)]"
      style={{
        bottom: theaterMode ? 16 : 88,
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        opacity: entered ? 1 : 0,
        transform: `translateX(-50%) translateY(${entered ? 0 : (reduced ? 0 : 14)}px)`,
        transition: reduced
          ? `opacity ${EXIT_MS}ms ease`
          : `opacity ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1), transform ${EXIT_MS}ms cubic-bezier(0.16,1,0.3,1)`,
      }}
    >
      <Zap size={16} className="flex-shrink-0" style={{ color: 'var(--color-orange)' }} aria-hidden={true} />
      <div className="flex-1 min-w-0 text-[12px] leading-snug">
        <span className="font-semibold">{name(event.from)}</span> {verb} — switched to{' '}
        <span className="font-semibold">{name(event.to)}</span>
        <button
          onClick={openSettings}
          className="block text-[11px] font-bold mt-0.5"
          style={{ color: 'var(--color-accent)' }}
        >
          AI settings →
        </button>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--color-card2)', color: 'var(--color-dim)' }}
      >
        <X size={10} />
      </button>
    </div>
  )
}
