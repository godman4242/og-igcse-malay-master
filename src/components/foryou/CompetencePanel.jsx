import { categoryLabel } from '../../lib/topicLabels'

const SKILL_LABEL = {
  reading: 'Reading', listening: 'Listening', writing: 'Writing',
  speaking: 'Speaking', vocab: 'Vocab', grammar: 'Grammar', exam: 'Exam',
}

// "Where you stand" — a simple skill-meter OLM. All data is composed upstream
// in competenceSnapshot (pure); this is presentation only.
export default function CompetencePanel({ snapshot }) {
  if (!snapshot) return null
  const { readinessPct, mastered, bars, weakSpots } = snapshot
  const maxCount = Math.max(1, ...bars.map(b => b.count))

  return (
    <section>
      <h3 className="text-base font-bold mb-2.5">Where you stand</h3>
      <div className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-4">
          {typeof readinessPct === 'number' && (
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{readinessPct}%</p>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>exam readiness</p>
            </div>
          )}
          <div>
            <p className="text-2xl font-bold">{mastered}</p>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>words mastered</p>
          </div>
        </div>

        <div className="space-y-1.5" aria-label="Practice balance, last 7 days">
          {bars.map(b => (
            <div key={b.skill} className="flex items-center gap-2">
              <span className="text-[11px] w-16 flex-shrink-0" style={{ color: 'var(--color-dim)' }}>
                {SKILL_LABEL[b.skill] || b.skill}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-card2)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.round((b.count / maxCount) * 100)}%`,
                  background: b.neglected ? 'var(--color-border)' : 'var(--color-accent)',
                }} />
              </div>
              {b.neglected && (
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-dim)' }}>untouched</span>
              )}
            </div>
          ))}
        </div>

        {weakSpots?.length > 0 && (
          <div>
            <p className="text-[11px] mb-1.5" style={{ color: 'var(--color-dim)' }}>Your weak spots this week</p>
            <div className="flex flex-wrap gap-1.5">
              {weakSpots.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                  {categoryLabel(t)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
