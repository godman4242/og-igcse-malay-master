import { useState } from 'react'
import { Trophy, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import { buildSessionFeedback } from '../../lib/feedback'
import { getTodayISO, toLocalISO } from '../../lib/localDay'
import ThreeLineFeedback from '../ThreeLineFeedback'

// End-of-session screen: stats, optimal-challenge prompt (every 3rd
// session), daily-goal reflection prompt (when daily goal is hit).
// Replaces the inline `showSummary` block that used to live in Study.jsx.
export default function SessionSummary({ session }) {
  const navigate = useNavigate()
  const sessionFeedbackCount = useStore(s => s.sessionFeedback?.length ?? 0)
  const reflections = useStore(s => s.reflections)
  const dailyGoal = useStore(s => s.dailyGoal)
  const reviewedToday = useStore(s => s.reviewedToday)
  const logSessionFeedback = useStore(s => s.logSessionFeedback)
  const logReflection = useStore(s => s.logReflection)

  const [challengeAnswered, setChallengeAnswered] = useState(false)
  const [reflectionAnswered, setReflectionAnswered] = useState(false)
  const [reflectionMode, setReflectionMode] = useState(null)
  const [reflectionNote, setReflectionNote] = useState('')

  const { sessionStats, activeDeck, restartSession } = session
  const endTime = sessionStats.endTime || sessionStats.startTime + 60000
  const minutes = Math.max(1, Math.round((endTime - sessionStats.startTime) / 60000))
  const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0
  const feedback = buildSessionFeedback('study-session', {
    accuracy, reviewed: sessionStats.reviewed, deck: activeDeck,
  }, useStore.getState())

  const showChallengePrompt = !challengeAnswered && (sessionFeedbackCount % 3 === 0)
  const todayISO = getTodayISO()
  const reflectedToday = (reflections || []).some(r =>
    toLocalISO(new Date(r.ts)) === todayISO,
  )
  const showReflectionPrompt = !reflectionAnswered && !reflectedToday && reviewedToday >= dailyGoal

  return (
    <div className="space-y-4 animate-fadeUp">
      <div className="rounded-2xl p-6 text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <Trophy size={48} className="mx-auto mb-3" style={{ color: 'var(--color-green)' }} />
        <h2 className="text-xl font-bold mb-1">Session Complete!</h2>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          All due cards reviewed. Great work!
        </p>
      </div>

      <ThreeLineFeedback
        goal={feedback.goal}
        now={feedback.now}
        next={feedback.next}
        onNextClick={feedback.nextHref ? () => navigate(feedback.nextHref) : null}
      />

      {showChallengePrompt && (
        <div className="rounded-xl p-3" style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold mb-2 text-center" style={{ color: 'var(--color-dim)' }}>How was that?</p>
          <div className="flex gap-2">
            {[
              { id: 'easy', emoji: '\u{1F971}', label: 'Too easy' },
              { id: 'right', emoji: '✅', label: 'Just right' },
              { id: 'hard', emoji: '\u{1F630}', label: 'Too hard' },
            ].map(c => (
              <button key={c.id} onClick={() => {
                if (logSessionFeedback) logSessionFeedback({ deck: activeDeck, accuracy, perceived: c.id })
                setChallengeAnswered(true)
              }}
                className="flex-1 py-2 rounded-lg text-center transition-all hover:scale-105"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="text-lg">{c.emoji}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{c.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showReflectionPrompt && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <p className="text-sm font-bold mb-2 text-center" style={{ color: 'var(--color-purple)' }}>
            {'\u{1F389}'} Daily goal hit! What clicked today?
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
            {[
              { id: 'vocab', emoji: '\u{1F4DA}', label: 'Vocab' },
              { id: 'grammar', emoji: '\u{1F4D6}', label: 'Grammar' },
              { id: 'speak', emoji: '\u{1F5E3}️', label: 'Speaking' },
              { id: 'read', emoji: '\u{1F4F0}', label: 'Reading' },
            ].map(m => (
              <button key={m.id} onClick={() => setReflectionMode(m.id)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: reflectionMode === m.id ? 'var(--color-purple)' : 'var(--color-card2)',
                  border: '1px solid ' + (reflectionMode === m.id ? 'var(--color-purple)' : 'var(--color-border)'),
                  color: reflectionMode === m.id ? '#fff' : 'var(--color-dim)',
                }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <input type="text" value={reflectionNote} onChange={e => setReflectionNote(e.target.value.slice(0, 60))}
            placeholder="Optional note (60 chars)"
            className="w-full p-2 rounded-lg text-xs outline-none mb-2"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <div className="flex gap-2">
            <button onClick={() => setReflectionAnswered(true)}
              className="flex-1 py-1.5 rounded-lg text-xs"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Skip
            </button>
            <button onClick={() => {
              if (reflectionMode && logReflection) {
                logReflection({ bestMode: reflectionMode, note: reflectionNote })
              }
              setReflectionAnswered(true)
            }} disabled={!reflectionMode}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--color-purple)' }}>
              Save
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Reviewed', value: sessionStats.reviewed, color: 'var(--color-blue)' },
          { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 80 ? 'var(--color-green)' : accuracy >= 50 ? 'var(--color-orange)' : 'var(--color-red)' },
          { label: 'Correct', value: sessionStats.correct, color: 'var(--color-green)' },
          { label: 'Minutes', value: minutes, color: 'var(--color-cyan)' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={restartSession}
          className="flex-1 p-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent)' }}>
          <RotateCcw size={14} /> Keep Studying
        </button>
      </div>
    </div>
  )
}
