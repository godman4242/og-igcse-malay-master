import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BookOpen, Zap, Trash2, CheckCircle, BarChart3, ArrowRight, FileText, Mic } from 'lucide-react'
import useStore from '../store/useStore'
import { clusterMistakes, weakestWritingFormats, weakestSpeakingTopics } from '../lib/patterns'
import { listFormats } from '../lib/writingGrader'

export default function MistakeJournal() {
  const navigate = useNavigate()
  const mistakes = useStore(s => s.mistakes)
  const writingHistory = useStore(s => s.writingHistory)
  const speakingHistory = useStore(s => s.speakingHistory)
  const markMistakeReviewed = useStore(s => s.markMistakeReviewed)
  const clearOldMistakes = useStore(s => s.clearOldMistakes)
  const [filter, setFilter] = useState('all')

  const activeMistakes = mistakes.filter(m => !m.reviewed)
  const filtered = filter === 'all'
    ? activeMistakes
    : activeMistakes.filter(m => m.type === filter)

  // Frequency chart — top 10 most failed items
  const freqMap = {}
  activeMistakes.forEach(m => {
    const key = m.type === 'vocab' ? m.word : m.word
    freqMap[key] = (freqMap[key] || 0) + 1
  })
  const topMistakes = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const maxFreq = Math.max(1, ...topMistakes.map(([, c]) => c))

  // Pattern clustering — groups mistakes by underlying grammar rule
  const clusters = clusterMistakes(mistakes)

  // Performance trends across writing + speaking
  const weakWriting = weakestWritingFormats(writingHistory)
  const weakSpeaking = weakestSpeakingTopics(speakingHistory)
  const allFormats = listFormats()
  const formatLabel = (id) => allFormats.find(f => f.id === id)?.label || id

  // Empty state guard — only show the celebration if there is no signal
  // anywhere across mistakes / writing / speaking history.
  const hasAnySignal = activeMistakes.length > 0 || weakWriting.length > 0 || weakSpeaking.length > 0
  if (!hasAnySignal) {
    return (
      <div className="text-center py-16 animate-fadeUp">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-lg font-bold mb-2">No Mistakes!</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-dim)' }}>
          Keep studying and any mistakes will appear here for review.
        </p>
        <button onClick={() => navigate('/study')}
          className="px-6 py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>
          Go Study
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fadeUp">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <AlertTriangle size={18} style={{ color: 'var(--color-orange)' }} />
          Mistake Journal
        </h2>
        <button onClick={clearOldMistakes}
          className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ color: 'var(--color-dim)', border: '1px solid var(--color-border)' }}>
          <Trash2 size={10} /> Clean up
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: `All (${activeMistakes.length})`, icon: <BarChart3 size={12} /> },
          { id: 'vocab', label: `Vocab (${activeMistakes.filter(m => m.type === 'vocab').length})`, icon: <BookOpen size={12} /> },
          { id: 'grammar', label: `Grammar (${activeMistakes.filter(m => m.type === 'grammar').length})`, icon: <Zap size={12} /> },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filter === f.id ? 'var(--color-accent2)' : 'var(--color-card)',
              color: filter === f.id ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (filter === f.id ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}>
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Frequency chart */}
      {topMistakes.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <BarChart3 size={14} style={{ color: 'var(--color-red)' }} /> Most Frequent Mistakes
          </h3>
          <div className="space-y-2">
            {topMistakes.map(([word, count]) => (
              <div key={word} className="flex items-center gap-2">
                <span className="text-xs font-mono w-24 truncate" style={{ color: 'var(--color-text)' }}>{word}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxFreq) * 100}%`,
                      background: count >= 3 ? 'var(--color-red)' : count >= 2 ? 'var(--color-orange)' : 'var(--color-accent)',
                    }} />
                </div>
                <span className="text-[10px] font-bold w-6 text-right" style={{ color: 'var(--color-dim)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance trends — weakest writing formats + speaking topics */}
      {(weakWriting.length > 0 || weakSpeaking.length > 0) && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <BarChart3 size={14} style={{ color: 'var(--color-blue)' }} /> Performance Trends
          </h3>
          {weakWriting.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
                  <FileText size={10} className="inline mr-1" /> Weakest writing formats
                </span>
                <button onClick={() => navigate('/writing')}
                  className="text-[10px] font-bold flex items-center gap-1"
                  style={{ color: 'var(--color-cyan)' }}>
                  Practice <ArrowRight size={10} />
                </button>
              </div>
              <div className="space-y-1.5">
                {weakWriting.map(w => (
                  <PerfRow key={w.key} label={formatLabel(w.key)} avg={w.avg} last={w.last} total={w.total} />
                ))}
              </div>
            </div>
          )}
          {weakSpeaking.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
                  <Mic size={10} className="inline mr-1" /> Weakest speaking topics
                </span>
                <button onClick={() => navigate('/speaking')}
                  className="text-[10px] font-bold flex items-center gap-1"
                  style={{ color: 'var(--color-cyan)' }}>
                  Practice <ArrowRight size={10} />
                </button>
              </div>
              <div className="space-y-1.5">
                {weakSpeaking.map(s => (
                  <PerfRow key={s.key} label={s.key} avg={s.avg} last={s.last} total={s.total} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pattern clustering */}
      {clusters.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,145,0,0.08)', border: '1px solid rgba(255,145,0,0.2)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--color-orange)' }}>
            <AlertTriangle size={14} /> Weak Patterns
          </h3>
          <div className="space-y-2">
            {clusters.map(c => (
              <div key={c.pattern} className="flex items-start gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(255,82,82,0.15)', color: 'var(--color-red)' }}>
                  {c.count}x
                </span>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{c.pattern}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mistake list */}
      <div className="space-y-2">
        {filtered.map(m => (
          <div key={m.id} className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: m.type === 'vocab' ? 'rgba(68,138,255,0.15)' : 'rgba(179,136,255,0.15)',
                color: m.type === 'vocab' ? 'var(--color-blue)' : 'var(--color-purple)',
              }}>
              {m.type === 'vocab' ? <BookOpen size={14} /> : <Zap size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{m.word}</p>
              <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-dim)' }}>
                <span>{m.type === 'vocab' ? 'Vocabulary' : `Grammar (${m.source})`}</span>
                <span>•</span>
                <span>{new Date(m.timestamp).toLocaleDateString()}</span>
              </div>
              {m.correct && m.type === 'vocab' && (
                <p className="text-[10px]" style={{ color: 'var(--color-cyan)' }}>Correct: {m.correct}</p>
              )}
            </div>
            <button onClick={() => markMistakeReviewed(m.id)}
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-green)' }}
              title="Mark as reviewed">
              <CheckCircle size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <button onClick={() => navigate('/study')}
        className="w-full p-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
        style={{ background: 'var(--color-accent)' }}>
        <ArrowRight size={14} /> Practice Weak Words
      </button>
    </div>
  )
}

function PerfRow({ label, avg, last, total }) {
  const avgRounded = Math.round(avg * 10) / 10
  const colour = avg >= 5 ? 'var(--color-green)' : avg >= 4 ? '#69f0ae' : avg >= 3 ? 'var(--color-orange)' : 'var(--color-red)'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex-1 truncate" style={{ color: 'var(--color-text)' }}>{label}</span>
      <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{total}× · last {last}/6</span>
      <span className="font-bold" style={{ color: colour }}>avg {avgRounded}/6</span>
    </div>
  )
}
