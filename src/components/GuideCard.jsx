import { Compass } from 'lucide-react'
import { useGuide } from '../hooks/useGuide'

// GuideCard — the replayable entry point for the in-app guide ("App tour").
// Mounted FIRST in Settings (before Stats) so it's the obvious place to find
// the tour again. Starting a tour here works from any device.
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md §5.
export default function GuideCard() {
  const { start } = useGuide()

  return (
    <div
      data-tour="guide-card"
      className="rounded-2xl p-4"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
        <Compass size={14} style={{ color: 'var(--color-accent)' }} /> App guide
      </h3>
      <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>
        New here, or showing someone the app? Take a guided tour — it spotlights
        each feature and explains what it does.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => start('quick')}
          className="text-xs font-bold px-3 py-2 rounded-xl"
          style={{ background: 'var(--color-accent)', color: '#fff', minHeight: 40 }}
        >
          Quick tour (60 sec)
        </button>
        <button
          type="button"
          onClick={() => start('full')}
          className="text-xs font-bold px-3 py-2 rounded-xl"
          style={{ background: 'var(--color-card2)', color: 'var(--color-text)', border: '1px solid var(--color-border)', minHeight: 40 }}
        >
          Full tour
        </button>
      </div>
    </div>
  )
}
