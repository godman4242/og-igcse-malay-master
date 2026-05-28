import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, BookOpen } from 'lucide-react'
import useStore from '../store/useStore'
import { trackEvent } from '../lib/telemetry'

// First-Run Tour — single inline activation card on Dashboard.
// Design: docs/2026-05-27-first-run-tour-design.md (v3, commit 087a82d).
//
// Gate: shown until the user rates their first FSRS card. Pure derived
// state via Zustand selectors — no store API, no persisted flag, no
// STORE_VERSION bump.
//
// Variants:
//   - Populated deck (cards.length > 0): "Your first session is ready" → /study
//   - Empty deck    (cards.length === 0): "Welcome — let's build your deck" → /word-families
//
// Telemetry events are wired in Task 3.

export default function FirstRunCard() {
  const navigate = useNavigate()
  const hasReviewed = useStore(s =>
    (s.cards ?? []).some(c => c.last_review != null)
  )
  const deckCount = useStore(s => (s.cards ?? []).length)

  const isPopulated = deckCount > 0
  const variant = isPopulated ? 'populated' : 'empty'

  useEffect(() => {
    if (hasReviewed) return
    trackEvent('first_run_card_shown', { variant })
    // Once per mount — matches spec §Telemetry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (hasReviewed) return null

  const headlineId = 'first-run-card-headline'
  const headline = isPopulated
    ? 'Your first session is ready'
    : "Welcome — let's build your deck"
  const supporting = isPopulated
    ? 'A few cards · about 2 minutes'
    : 'Pick a topic to start learning Malay'
  const ctaLabel = isPopulated ? 'Start studying →' : 'Add words →'
  const ctaTarget = isPopulated ? '/study' : '/word-families'
  const Icon = isPopulated ? Sparkles : BookOpen

  const onClick = () => {
    trackEvent('first_run_cta_clicked', { variant })
    navigate(ctaTarget)
  }

  return (
    <section
      role="region"
      aria-labelledby={headlineId}
      className="rounded-2xl p-5 shadow-md"
      style={{
        background: 'var(--color-card)',
        borderLeft: '4px solid var(--color-accent)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ background: 'rgba(124,58,237,0.12)' }}
          aria-hidden={true}
        >
          <Icon size={20} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            id={headlineId}
            className="text-base font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            {headline}
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-dim)' }}
          >
            {supporting}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClick}
          className="text-sm font-bold px-4 py-2 rounded-full"
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </section>
  )
}
