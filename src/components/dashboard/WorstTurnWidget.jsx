import { memo } from 'react'
import { Mic, ArrowRight } from 'lucide-react'

// Spotlights the lowest-band recent speaking session and offers a one-tap
// rematch. Pulls from speakingHistory only; roleplay turns are graded
// holistically and don't survive at turn-level granularity in storage.
const WorstTurnWidget = memo(function WorstTurnWidget({ session, navigate }) {
  const bandColor = session.band >= 5 ? 'var(--color-green)' : session.band >= 3 ? 'var(--color-orange)' : 'var(--color-red)'
  const dateLabel = new Date(session.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const onRetry = () => navigate('/speaking', { state: { topicId: session.topicId || session.scenarioId } })
  return (
    <div className="rounded-2xl p-4" style={{ background: 'color-mix(in srgb, var(--color-red) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-red) 18%, transparent)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-red)' }}>
          <Mic size={14} /> Re-do your weakest answer
        </h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--color-red) 15%, transparent)', color: bandColor }}>
          band {session.band}/6
        </span>
      </div>
      <p className="text-xs mb-1" style={{ color: 'var(--color-dim)' }}>
        Topic <strong style={{ color: 'var(--color-text)' }}>{session.topicId || session.scenarioId}</strong> · {dateLabel} · {session.wordCount || 0} words
      </p>
      {session.transcript && (
        <p className="text-[11px] italic line-clamp-2 mb-2" style={{ color: 'var(--color-dim)' }}>
          "{session.transcript.slice(0, 160)}{session.transcript.length > 160 ? '…' : ''}"
        </p>
      )}
      <button onClick={onRetry}
        className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
        style={{ color: 'var(--color-on-bright)', background: 'var(--color-accent2)' }}>
        Try this topic again <ArrowRight size={12} />
      </button>
    </div>
  )
})

export default WorstTurnWidget
