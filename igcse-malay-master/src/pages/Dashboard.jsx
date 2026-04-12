import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, Flame, Target, TrendingUp } from 'lucide-react'
import useStore from '../store/useStore'
import { getDueCards } from '../lib/sm2'

export default function Dashboard() {
  const navigate = useNavigate()
  const cards = useStore(s => s.cards)
  const streak = useStore(s => s.getStreak())
  const dailyGoal = useStore(s => s.dailyGoal)
  const reviewedToday = useStore(s => s.reviewedToday)
  const lastStudyDate = useStore(s => s.lastStudyDate)
  const todayStr = new Date().toDateString()
  const todayReviews = lastStudyDate === todayStr ? reviewedToday : 0
  const due = getDueCards(cards)
  const mastered = cards.filter(c => c.box >= 4).length
  const goalPct = Math.min(100, Math.round((todayReviews / dailyGoal) * 100))

  // Weak topics
  const deckStats = {}
  cards.forEach(c => {
    if (!deckStats[c.t]) deckStats[c.t] = { total: 0, weak: 0 }
    deckStats[c.t].total++
    if ((c.box || 1) <= 2) deckStats[c.t].weak++
  })
  const weakTopics = Object.entries(deckStats)
    .map(([name, s]) => ({ name, pct: Math.round((s.weak / s.total) * 100) }))
    .filter(t => t.pct > 30)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)

  // Heatmap (last 7 days placeholder)
  const heatmap = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), active: d.toDateString() === todayStr ? todayReviews > 0 : false }
  })

  return (
    <div className="space-y-4">
      {/* Welcome + Goal Ring */}
      <div className="rounded-2xl p-5 flex items-center gap-5"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-accent)" strokeWidth="8"
              strokeLinecap="round" strokeDasharray={`${goalPct * 2.64} 264`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{goalPct}%</span>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold">Daily Goal</h2>
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
            {todayReviews}/{dailyGoal} cards reviewed
          </p>
          {goalPct >= 100 && <span className="text-xs font-bold" style={{ color: 'var(--color-green)' }}>Goal complete!</span>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Brain size={18} />, label: 'Due Now', value: due.length, color: 'var(--color-red)', action: () => navigate('/study') },
          { icon: <Flame size={18} />, label: 'Streak', value: `${streak} days`, color: 'var(--color-orange)' },
          { icon: <BookOpen size={18} />, label: 'Total Cards', value: cards.length, color: 'var(--color-blue)' },
          { icon: <Target size={18} />, label: 'Mastered', value: mastered, color: 'var(--color-green)' },
        ].map((s, i) => (
          <button key={i} onClick={s.action}
            className="rounded-xl p-4 text-left transition-transform hover:scale-[1.02]"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>{s.icon}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Weekly Activity */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} /> This Week</h3>
        <div className="flex gap-2 justify-between">
          {heatmap.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  background: d.active ? 'var(--color-green)' : 'var(--color-surface)',
                  color: d.active ? '#000' : 'var(--color-dim)',
                  border: '1px solid var(--color-border)',
                }}>
                {d.active ? '✓' : ''}
              </div>
              <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3">Focus Areas</h3>
          {weakTopics.map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <span className="text-sm">{t.name}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,82,82,0.15)', color: 'var(--color-red)' }}>
                {t.pct}% weak
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/study')}
          className="rounded-xl p-4 font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>
          Start Review ({due.length} due)
        </button>
        <button onClick={() => navigate('/roleplay')}
          className="rounded-xl p-4 font-bold text-sm text-white"
          style={{ background: 'var(--color-accent2)' }}>
          Practice Speaking
        </button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="text-center py-8 rounded-2xl"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-4xl mb-3">📚</p>
          <p className="font-bold mb-1">No cards yet!</p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-dim)' }}>Load a topic pack or import text to get started</p>
          <button onClick={() => navigate('/settings')}
            className="px-5 py-2 rounded-xl font-bold text-sm text-white"
            style={{ background: 'var(--color-accent2)' }}>
            Load Topic Pack
          </button>
        </div>
      )}
    </div>
  )
}
