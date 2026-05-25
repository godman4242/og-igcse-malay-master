import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BookOpen, Zap, Trash2, CheckCircle, BarChart3, ArrowRight, FileText, Mic, MessageSquare, PenLine, Plus } from 'lucide-react'
import useStore from '../store/useStore'
import { clusterMistakes, weakestWritingFormats, weakestSpeakingTopics } from '../lib/patterns'
import { listFormats } from '../lib/writingFormats'

const CATEGORY_LABEL = {
  vocab: 'Vocab', imbuhan: 'Imbuhan', tense: 'Tense', spelling: 'Spelling',
  cohesion: 'Cohesion', register: 'Register', pronunciation: 'Pronunciation',
  comprehension: 'Comprehension', fluency: 'Fluency', other: 'Other',
}
const CATEGORY_COLOR = {
  vocab: 'var(--color-blue)', imbuhan: 'var(--color-purple)', tense: 'var(--color-accent2)',
  spelling: 'var(--color-orange)', cohesion: 'var(--color-cyan)', register: 'var(--color-orange)',
  pronunciation: 'var(--color-accent)', comprehension: 'var(--color-green)',
  fluency: 'var(--color-cyan)', other: 'var(--color-dim)',
}
const SOURCE_ICON = {
  vocab: <BookOpen size={14} />, grammar: <Zap size={14} />,
  writing: <PenLine size={14} />, roleplay: <MessageSquare size={14} />,
  comprehension: <FileText size={14} />, speaking: <Mic size={14} />,
}

export default function MistakeJournal() {
  const navigate = useNavigate()
  const mistakes = useStore(s => s.mistakes)
  const cards = useStore(s => s.cards)
  const writingHistory = useStore(s => s.writingHistory)
  const speakingHistory = useStore(s => s.speakingHistory)
  const markMistakeReviewed = useStore(s => s.markMistakeReviewed)
  const promoteMistakeToCard = useStore(s => s.promoteMistakeToCard)
  const setActiveDeck = useStore(s => s.setActiveDeck)
  const clearOldMistakes = useStore(s => s.clearOldMistakes)
  const [filter, setFilter] = useState('all')
  const mistakeDeckSize = cards.filter(c => c.t === 'Mistakes').length

  const activeMistakes = mistakes.filter(m => !m.reviewed)
  const filtered = filter === 'all'
    ? activeMistakes
    : activeMistakes.filter(m => (m.category || m.type) === filter)

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

      {/* Filter tabs — category-driven so writing/speaking/comprehension mistakes get their own pill */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(() => {
          const counts = {}
          activeMistakes.forEach(m => {
            const key = m.category || (m.type === 'vocab' ? 'vocab' : m.type === 'grammar' ? 'imbuhan' : 'other')
            counts[key] = (counts[key] || 0) + 1
          })
          const order = ['all', 'vocab', 'imbuhan', 'tense', 'spelling', 'cohesion', 'register', 'comprehension', 'fluency', 'pronunciation', 'other']
            .filter(k => k === 'all' || counts[k])
          return order.map(id => {
            const label = id === 'all' ? `All (${activeMistakes.length})`
              : `${CATEGORY_LABEL[id] || id} (${counts[id]})`
            const active = filter === id
            return (
              <button key={id} onClick={() => setFilter(id)}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: active ? 'var(--color-accent2)' : 'var(--color-card)',
                  color: active ? '#fff' : 'var(--color-dim)',
                  border: '1px solid ' + (active ? 'var(--color-accent2)' : 'var(--color-border)'),
                }}>
                {label}
              </button>
            )
          })
        })()}
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
        {filtered.map(m => {
          const cat = m.category || (m.type === 'vocab' ? 'vocab' : 'other')
          const catColor = CATEGORY_COLOR[cat] || 'var(--color-dim)'
          const headline = m.word || (m.surface ? m.surface.slice(0, 64) + (m.surface.length > 64 ? '…' : '') : (m.note ? m.note.slice(0, 64) : '—'))
          const canPromote = !m.promotedCardId && m.word && m.correct && m.language === 'ms'
          const sevDot = m.severity === 'high' ? 'var(--color-red)' : m.severity === 'low' ? 'var(--color-dim)' : 'var(--color-orange)'
          return (
            <div key={m.id} className="rounded-xl p-3"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.04)', color: catColor }}>
                  {SOURCE_ICON[m.type] || <AlertTriangle size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                      style={{ background: 'rgba(255,255,255,0.05)', color: catColor }}>
                      {CATEGORY_LABEL[cat] || cat}
                    </span>
                    <span className="text-[9px]" style={{ color: 'var(--color-dim)' }}>via {m.type}</span>
                    {m.language && (
                      <span className="text-[9px] px-1 rounded uppercase"
                        style={{ color: 'var(--color-dim)', border: '1px solid var(--color-border)' }}>
                        {m.language === 'en' ? 'EN' : 'MY'}
                      </span>
                    )}
                    {m.attempts > 1 && (
                      <span className="text-[9px] font-bold" style={{ color: 'var(--color-red)' }}>
                        ×{m.attempts}
                      </span>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sevDot }} />
                  </div>
                  <p className="text-sm font-bold truncate">{headline}</p>
                  {m.correct && m.given && m.given !== m.correct && (
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-dim)' }}>
                      <span style={{ color: 'var(--color-red)' }}>{m.given}</span>
                      {' → '}
                      <span style={{ color: 'var(--color-green)' }}>{m.correct}</span>
                    </p>
                  )}
                  {!m.given && m.correct && (
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-cyan)' }}>= {m.correct}</p>
                  )}
                  {m.note && (
                    <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-dim)' }}>{m.note}</p>
                  )}
                  {m.promotedCardId && (
                    <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-green)' }}>
                      <CheckCircle size={9} /> In Mistakes deck
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col gap-1">
                  {canPromote && (
                    <button onClick={() => promoteMistakeToCard(m.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-blue)' }}
                      title="Promote to flashcard">
                      <Plus size={14} />
                    </button>
                  )}
                  <button onClick={() => markMistakeReviewed(m.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-green)' }}
                    title="Mark fixed">
                    <CheckCircle size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick actions — preset Mistakes deck for one-tap focused review */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate('/study')}
          className="p-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1"
          style={{ background: 'var(--color-accent)' }}>
          <ArrowRight size={12} /> Practice all
        </button>
        <button onClick={() => { setActiveDeck('Mistakes'); navigate('/study') }}
          disabled={mistakeDeckSize === 0}
          className="p-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1"
          style={{
            background: mistakeDeckSize > 0 ? 'var(--color-accent2)' : 'var(--color-card2)',
            color: mistakeDeckSize > 0 ? '#fff' : 'var(--color-dim)',
          }}>
          <ArrowRight size={12} /> Mistakes deck ({mistakeDeckSize})
        </button>
      </div>
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
