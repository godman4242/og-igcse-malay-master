import { Trophy, FileText, Mic } from 'lucide-react'
import { weakestWritingFormats, weakestSpeakingTopics } from '../../lib/patterns'
import { listFormats } from '../../lib/writingFormats'

export default function RecentPerformance({ writing, speaking, navigate }) {
  const lastWriting = writing.length ? writing[writing.length - 1] : null
  const lastSpeaking = speaking.length ? speaking[speaking.length - 1] : null
  const weakWriting = weakestWritingFormats(writing, 2)
  const weakSpeaking = weakestSpeakingTopics(speaking, 2)
  const formats = listFormats()
  const formatLabel = (id) => formats.find(f => f.id === id)?.label || id || 'unknown'
  const bandColor = (b) =>
    b >= 5 ? 'var(--color-green)' :
    b >= 4 ? 'var(--color-green-mid)' :
    b >= 3 ? 'var(--color-orange)' : 'var(--color-red)'

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Trophy size={15} style={{ color: 'var(--color-cyan)' }} /> Recent Performance
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {/* Writing */}
        <button onClick={() => navigate('/writing')}
          className="text-left rounded-xl p-3 transition-all hover:opacity-90"
          style={{ background: 'var(--color-card2)' }}>
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
            <FileText size={10} /> Writing
          </div>
          {lastWriting ? (
            <>
              <div className="text-xl font-bold" style={{ color: bandColor(lastWriting.band) }}>
                {lastWriting.band}/6
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--color-dim)' }}>
                {formatLabel(lastWriting.format)}
              </div>
            </>
          ) : (
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>No attempts yet</div>
          )}
          {weakWriting.length > 0 && (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>Weakest</div>
              {weakWriting.map(w => (
                <div key={w.key} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="truncate flex-1" style={{ color: 'var(--color-text)' }}>{formatLabel(w.key)}</span>
                  <span className="font-bold ml-1" style={{ color: bandColor(w.avg) }}>
                    {(Math.round(w.avg * 10) / 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </button>

        {/* Speaking */}
        <button onClick={() => navigate('/speaking')}
          className="text-left rounded-xl p-3 transition-all hover:opacity-90"
          style={{ background: 'var(--color-card2)' }}>
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
            <Mic size={10} /> Speaking
          </div>
          {lastSpeaking ? (
            <>
              <div className="text-xl font-bold" style={{ color: bandColor(lastSpeaking.band) }}>
                {lastSpeaking.band}/6
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--color-dim)' }}>
                {lastSpeaking.topicId || lastSpeaking.scenarioId || lastSpeaking.topic || 'topic'}
              </div>
            </>
          ) : (
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>No attempts yet</div>
          )}
          {weakSpeaking.length > 0 && (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>Weakest</div>
              {weakSpeaking.map(s => (
                <div key={s.key} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="truncate flex-1" style={{ color: 'var(--color-text)' }}>{s.key}</span>
                  <span className="font-bold ml-1" style={{ color: bandColor(s.avg) }}>
                    {(Math.round(s.avg * 10) / 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
