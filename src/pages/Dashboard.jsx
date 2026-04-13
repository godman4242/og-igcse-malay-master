import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, Flame, Target, TrendingUp, Zap, Calendar, ArrowRight, Trophy, Download } from 'lucide-react'
import useStore from '../store/useStore'
import { getDueCards, State } from '../lib/fsrs'
import QuickReview from '../components/QuickReview'

export default function Dashboard() {
  const navigate = useNavigate()
  const cards = useStore(s => s.cards)
  const streak = useStore(s => s.getStreak())
  const streakFreezes = useStore(s => s.streakFreezes)
  const engagementXP = useStore(s => s.engagementXP)
  const dailyGoal = useStore(s => s.dailyGoal)
  const reviewedToday = useStore(s => s.reviewedToday)
  const lastStudyDate = useStore(s => s.lastStudyDate)
  const studyHistory = useStore(s => s.studyHistory)
  const grammarStats = useStore(s => s.grammarStats)
  const studyPlan = useStore(s => s.getStudyPlan())
  const challenge = useStore(s => s.getChallengeStats())
  const ensureDailyChallenge = useStore(s => s.ensureDailyChallenge)
  const shouldShowInstallPrompt = useStore(s => s.shouldShowInstallPrompt)
  const dismissInstallPrompt = useStore(s => s.dismissInstallPrompt)
  const setInstallPromptAccepted = useStore(s => s.setInstallPromptAccepted)
  const trackInstallPromptShown = useStore(s => s.trackInstallPromptShown)
  const trackInstallPromptAccepted = useStore(s => s.trackInstallPromptAccepted)
  const [installPromptEvent, setInstallPromptEvent] = useState(null)

  useEffect(() => {
    ensureDailyChallenge()
  }, [ensureDailyChallenge])

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPromptEvent(event)
    }
    const onInstalled = () => {
      setInstallPromptAccepted()
      setInstallPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [setInstallPromptAccepted])

  useEffect(() => {
    if (installPromptEvent && shouldShowInstallPrompt()) {
      trackInstallPromptShown()
    }
  }, [installPromptEvent, shouldShowInstallPrompt, trackInstallPromptShown])

  const todayStr = new Date().toDateString()
  const todayReviews = lastStudyDate === todayStr ? reviewedToday : 0
  const due = getDueCards(cards)
  const goalPct = Math.min(100, Math.round((todayReviews / dailyGoal) * 100))

  // Weak topics (FSRS-based)
  const deckStats = {}
  cards.forEach(c => {
    if (!deckStats[c.t]) deckStats[c.t] = { total: 0, weak: 0 }
    deckStats[c.t].total++
    if ((c.state ?? 0) <= 1 || (c.lapses || 0) >= 3) deckStats[c.t].weak++
  })
  const weakTopics = Object.entries(deckStats)
    .map(([name, s]) => ({ name, pct: Math.round((s.weak / s.total) * 100) }))
    .filter(t => t.pct > 30)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)

  // 7-day forecast: how many cards come due each day
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const count = cards.filter(c => {
      if (!c.due) return i === 0
      const dueDate = new Date(c.due)
      if (i === 0) return dueDate <= dayEnd
      return dueDate > dayStart && dueDate <= dayEnd
    }).length

    return {
      label: i === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' }),
      count,
    }
  })
  const maxForecast = Math.max(1, ...forecast.map(f => f.count))

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
    'var(--color-surface)',
    'rgba(0,230,118,0.25)',
    'rgba(0,230,118,0.55)',
    'var(--color-green)',
  ]

  // Total grammar drills completed
  const grammarTotal = Object.values(grammarStats).reduce((sum, s) => sum + s.total, 0)
  const grammarCorrect = Object.values(grammarStats).reduce((sum, s) => sum + s.correct, 0)

  // Phase colors for exam countdown
  const phaseColors = {
    build: 'var(--color-blue)',
    strengthen: 'var(--color-orange)',
    review: 'var(--color-accent)',
    final: 'var(--color-red)',
  }
  const phaseLabels = {
    build: 'Building',
    strengthen: 'Strengthening',
    review: 'Reviewing',
    final: 'Final Push',
  }

  return (
    <div className="space-y-4 animate-fadeUp">
      {/* Exam Countdown (if set) */}
      {studyPlan && (
        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${phaseColors[studyPlan.phase]}15, ${phaseColors[studyPlan.phase]}05)`,
            border: `1px solid ${phaseColors[studyPlan.phase]}40`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: phaseColors[studyPlan.phase] }} />
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${phaseColors[studyPlan.phase]}20`, color: phaseColors[studyPlan.phase] }}>
                {phaseLabels[studyPlan.phase]}
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: phaseColors[studyPlan.phase] }}>
                {studyPlan.daysLeft}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-dim)' }}>days left</div>
            </div>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{studyPlan.recommendation}</p>
          {/* Exam readiness bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>Readiness</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${studyPlan.readinessPct}%`,
                  background: `linear-gradient(90deg, ${phaseColors[studyPlan.phase]}, var(--color-green))`,
                }} />
            </div>
            <span className="text-[10px] font-bold" style={{ color: phaseColors[studyPlan.phase] }}>
              {studyPlan.readinessPct}%
            </span>
          </div>
        </div>
      )}

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

      {/* Daily Challenge */}
      {challenge && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Trophy size={15} style={{ color: 'var(--color-orange)' }} />
              Daily Challenge
            </h3>
            <span className="text-xs font-bold" style={{ color: challenge.complete ? 'var(--color-green)' : 'var(--color-orange)' }}>
              {challenge.complete ? 'Complete' : `${challenge.totalPct}%`}
            </span>
          </div>
          <div className="space-y-2">
            <ChallengeRow label="Reviews" done={challenge.reviewDone} target={challenge.reviewTarget} />
            <ChallengeRow label="Grammar" done={challenge.grammarDone} target={challenge.grammarTarget} />
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--color-dim)' }}>
            Mode: {challenge.mode === 'final_sprint' ? 'Final Sprint' : challenge.mode === 'exam_week' ? 'Exam Week' : 'Normal'}
          </p>
          {challenge.complete && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-green)' }}>
              +50 XP earned today. Keep the streak alive.
            </p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Brain size={18} />, label: 'Due Now', value: due.length, color: 'var(--color-red)', action: () => navigate('/study') },
          { icon: <Flame size={18} />, label: 'Streak', value: `${streak} days`, color: 'var(--color-orange)' },
          { icon: <BookOpen size={18} />, label: 'XP', value: engagementXP, color: 'var(--color-blue)' },
          { icon: <Target size={18} />, label: 'Freezes', value: streakFreezes, color: 'var(--color-green)' },
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

      {/* Install prompt */}
      {installPromptEvent && shouldShowInstallPrompt() && (
        <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{ background: 'linear-gradient(135deg, rgba(68,138,255,0.1), rgba(124,58,237,0.1))', border: '1px solid var(--color-border)' }}>
          <div>
            <p className="text-sm font-bold">Install IGCSE Malay Master</p>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Faster launch and better offline access.</p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'var(--color-accent2)' }}
              onClick={async () => {
                installPromptEvent.prompt()
                const choice = await installPromptEvent.userChoice
                if (choice?.outcome === 'accepted') {
                  setInstallPromptAccepted()
                  trackInstallPromptAccepted()
                }
                setInstallPromptEvent(null)
              }}
            >
              <Download size={12} className="inline mr-1" />
              Install
            </button>
            <button
              className="px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'var(--color-card2)', color: 'var(--color-dim)' }}
              onClick={() => {
                dismissInstallPrompt()
                setInstallPromptEvent(null)
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Quick Review Widget */}
      {goalPct < 100 && <QuickReview />}

      {/* 7-Day Review Forecast */}
      {cards.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <ArrowRight size={16} style={{ color: 'var(--color-cyan)' }} /> Review Forecast
          </h3>
          <div className="flex items-end gap-1.5" style={{ height: 60 }}>
            {forecast.map((f, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold" style={{ color: f.count > 0 ? 'var(--color-text)' : 'var(--color-dim)' }}>
                  {f.count > 0 ? f.count : ''}
                </span>
                <div className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(4, (f.count / maxForecast) * 40)}px`,
                    background: i === 0 ? 'var(--color-accent)' : 'var(--color-accent2)',
                    opacity: i === 0 ? 1 : 0.6,
                  }} />
                <span className="text-[9px]" style={{ color: 'var(--color-dim)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

function ChallengeRow({ label, done, target }) {
  const pct = Math.round((done / Math.max(1, target)) * 100)
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: 'var(--color-dim)' }}>{label}</span>
        <span className="font-bold">{done}/{target}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, background: 'var(--color-accent2)' }} />
      </div>
    </div>
  )
}
