import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BookOpen, Zap, Trash2, CheckCircle, BarChart3, ArrowRight } from 'lucide-react'
import useStore from '../store/useStore'

export default function MistakeJournal() {
  const navigate = useNavigate()
  const mistakes = useStore(s => s.mistakes)
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

  // Pattern detection for grammar mistakes
  const grammarMistakes = activeMistakes.filter(m => m.type === 'grammar')
  const patterns = []
  const sourceCount = {}
  grammarMistakes.forEach(m => {
    sourceCount[m.source] = (sourceCount[m.source] || 0) + 1
  })
  const sortedSources = Object.entries(sourceCount).sort((a, b) => b[1] - a[1])
  if (sortedSources.length > 0) {
    const [topSource, count] = sortedSources[0]
    if (count >= 2) {
      const sourceLabels = {
        prefix: 'imbuhan prefix drills',
        passive: 'passive voice conversions',
        suffix: 'suffix drills',
        tense: 'tense marker exercises',
        error: 'error identification',
        transform: 'sentence transformation',
      }
      patterns.push(`You frequently struggle with ${sourceLabels[topSource] || topSource} (${count} mistakes)`)
    }
  }

  // Check for meN- vs peN- confusion
  const menPenMistakes = grammarMistakes.filter(m =>
    m.word.includes('meN') || m.word.includes('peN')
  ).length
  if (menPenMistakes >= 2) {
    patterns.push('You may be confusing meN- and peN- prefix rules — they follow the same P,T,K,S drop pattern')
  }

  if (activeMistakes.length === 0) {
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

      {/* Pattern detection */}
      {patterns.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,145,0,0.08)', border: '1px solid rgba(255,145,0,0.2)' }}>
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-orange)' }}>
            <AlertTriangle size={14} /> Patterns Detected
          </h3>
          {patterns.map((p, i) => (
            <p key={i} className="text-xs mb-1" style={{ color: 'var(--color-dim)' }}>• {p}</p>
          ))}
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
