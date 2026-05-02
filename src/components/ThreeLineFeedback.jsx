// src/components/ThreeLineFeedback.jsx
// Cluster B — Hattie & Timperley three-line feedback contract: Feed-Up, Feed-Back, Feed-Forward.

import { Target, BarChart2, ArrowRight } from 'lucide-react'

/**
 * @param {Object} props
 * @param {string} props.goal - "where am I going?"
 * @param {string} props.now - "how am I going?"
 * @param {string} props.next - "where to next?"
 * @param {string} [props.nextHref] - optional path; renders an anchor if provided
 * @param {Function} [props.onNextClick] - optional click handler (overrides nextHref)
 */
export default function ThreeLineFeedback({ goal, now, next, nextHref, onNextClick }) {
  if (!goal && !now && !next) return null

  const nextEl = next && (onNextClick ? (
    <button onClick={onNextClick} className="text-left w-full">
      <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{next}</span>
    </button>
  ) : nextHref ? (
    <a href={nextHref} className="text-left w-full block">
      <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{next}</span>
    </a>
  ) : (
    <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{next}</span>
  ))

  return (
    <div className="rounded-xl p-3 space-y-2"
      style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
      {goal && (
        <div className="flex items-start gap-2 text-xs leading-relaxed">
          <Target size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-cyan)' }} />
          <div>
            <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>Goal · </span>
            <span style={{ color: 'var(--color-text)' }}>{goal}</span>
          </div>
        </div>
      )}
      {now && (
        <div className="flex items-start gap-2 text-xs leading-relaxed">
          <BarChart2 size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-orange)' }} />
          <div>
            <span className="font-bold" style={{ color: 'var(--color-orange)' }}>Now · </span>
            <span style={{ color: 'var(--color-text)' }}>{now}</span>
          </div>
        </div>
      )}
      {next && (
        <div className="flex items-start gap-2 text-xs leading-relaxed">
          <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
          <div className="flex-1">
            <span className="font-bold" style={{ color: 'var(--color-accent)' }}>Next · </span>
            {nextEl}
          </div>
        </div>
      )}
    </div>
  )
}
