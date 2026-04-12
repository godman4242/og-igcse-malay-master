import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, Flame, Target, TrendingUp, Zap } from 'lucide-react'
import useStore from '../store/useStore'
import { getDueCards } from '../lib/sm2'

export default function Dashboard() {
  const navigate = useNavigate()
  const cards = useStore(s => s.cards)
  const streak = useStore(s => s.getStreak())
  const dailyGoal = useStore(s => s.dailyGoal)
  const reviewedToday = useStore(s => s.reviewedToday)
  const lastStudyDate = useStore(s => s.lastStudyDate)
  const studyHistory = useStore(s => s.studyHistory)
  const grammarStats = useStore(s => s.grammarStats)

  const todayStr = new Date().toDateString()
  const todayReviews = lastStudyDate === todayStr ? reviewedToday : 0
  const due = getDueCards(cards)
  const mastered = cards.filter(c => (c.box || 1) >= 4).length
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

  // Heatmap (last 14 days) — driven by real studyHistory
  const [heatmapDays] = useState(() => {
    const now = Date.now()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now - (13 - i) * 86400000)
      return {
        day: d.toLocaleDateString('en', { weekday: 'narrow' }),
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      }
    })
  })

  const getHeatLevel = (dateStr) => {
    const entry = studyHistory[dateStr]
    if (!entry || entry.reviews === 0) return 0
    if (entry.reviews < 5) return 1
    if (entry.reviews < 15) return 2
    return 3
  }

  const heatColors = [
    'var(--color-surface)',         // 0 — no activity
    'rgba(0,230,118,0.25)',         // 1 — light
    'rgba(0,230,118,0.55)',         // 2 — medium
    'var(--color-green)',           // 3 — heavy
  ]

  // Total grammar drills completed
  const grammarTotal = Object.values(grammarStats).reduce((sum, s) => sum + s.total, 0)
  const grammarCorrect = Object.values(grammarStats).reduce((sum, s) => sum + s.correct, 0)

  return (
    <div className="space-y-4 animate-fadeUp">
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

      {/* 14-Day Activity Heatmap */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} /> Last 14 Days</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapDays.map((d, i) => {
            const level = getHeatLevel(d.date)
            const entry = studyHistory[d.date]
            const reviews = entry?.reviews || 0
            const mins = entry?.minutes || 0
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: heatColors[level],
                    color: level >= 2 ? '#000' : 'var(--color-dim)',
                    border: '1px solid var(--color-border)',
                  }}
                  title={`${d.label}: ${reviews} reviews${mins > 0 ? `, ${mins} min` : ''}`}>
                  {reviews > 0 ? reviews : ''}
                </div>
                <span className="text-[9px]" style={{ color: 'var(--color-dim)' }}>{d.day}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px]" style={{ color: 'var(--color-dim)' }}>
          <span>Less</span>
          {heatColors.map((c, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c, border: '1px solid var(--color-border)' }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Grammar Progress */}
      {grammarTotal > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Zap size={16} style={{ color: 'var(--color-purple)' }} /> Grammar Drills
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{grammarTotal} drills completed</span>
            <span className="text-xs font-bold" style={{ color: 'var(--color-green)' }}>
              {grammarTotal > 0 ? Math.round((grammarCorrect / grammarTotal) * 100) : 0}% accuracy
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'imbuhan', label: 'Imbuhan', color: 'var(--color-cyan)' },
              { key: 'tense', label: 'Tense', color: 'var(--color-blue)' },
              { key: 'error', label: 'Error', color: 'var(--color-red)' },
              { key: 'transform', label: 'Transform', color: 'var(--color-purple)' },
            ].map(g => {
              const s = grammarStats[g.key] || { correct: 0, total: 0 }
              return (
                <div key={g.key} className="text-center p-2 rounded-lg" style={{ background: 'var(--color-card2)' }}>
                  <div className="text-lg font-bold" style={{ color: g.color }}>
                    {s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0}%
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{g.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {/* First-time onboarding */}
      {cards.length === 0 && (
        <div className="space-y-4">
          <div className="text-center py-6 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(255,77,109,0.1), rgba(124,58,237,0.1))', border: '1px solid var(--color-border)' }}>
            <p className="text-4xl mb-3">Selamat Datang!</p>
            <h2 className="text-lg font-bold mb-1">Welcome to IGCSE Malay Master</h2>
            <p className="text-sm px-4" style={{ color: 'var(--color-dim)' }}>
              The smartest way to ace your IGCSE Malay exam. Let's get started in 3 steps:
            </p>
          </div>

          <div className="space-y-3">
            {[
              { step: 1, title: 'Load a Topic Pack', desc: 'Choose vocabulary topics from the IGCSE syllabus', action: () => navigate('/settings'), btn: 'Choose Topics', color: 'var(--color-accent)', icon: '📚' },
              { step: 2, title: 'Start Studying', desc: '6 study modes: flashcards, quiz, type, listen, cloze, and speak', action: () => navigate('/study'), btn: 'Go to Study', color: 'var(--color-accent2)', icon: '🧠' },
              { step: 3, title: 'Practice Speaking', desc: 'Interactive roleplay scenarios for Paper 3 exam prep', action: () => navigate('/roleplay'), btn: 'Try Roleplay', color: 'var(--color-green)', icon: '🎤' },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-4 rounded-2xl p-4"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: `${s.color}20`, border: `2px solid ${s.color}` }}>
                  {s.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{s.icon} {s.title}</p>
                  <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{s.desc}</p>
                </div>
                <button onClick={s.action}
                  className="px-4 py-2 rounded-xl font-bold text-xs text-white flex-shrink-0"
                  style={{ background: s.color }}>
                  {s.btn}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
