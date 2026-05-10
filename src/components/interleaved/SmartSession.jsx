import useInterleavedSession from '../../hooks/useInterleavedSession'
import SessionProgress from './SessionProgress'
import TaskTransition from './TaskTransition'
import AdapterFlashcard from './AdapterFlashcard'
import AdapterQuiz from './AdapterQuiz'
import AdapterCloze from './AdapterCloze'
import WritingMicroPrompt from './WritingMicroPrompt'
import SpeakingMicroTurn from './SpeakingMicroTurn'
import { X, Zap } from 'lucide-react'

/**
 * SmartSession — the top-level Smart Session shell.
 *
 * Orchestrates the interleaved task queue by dispatching to mode-specific
 * components based on task.type. The useInterleavedSession hook manages all
 * state and FSRS integration.
 *
 * @param {object}  props
 * @param {boolean} props.includeSpeaking - Whether speaking tasks are enabled
 * @param {number}  props.targetMinutes   - Session duration target
 * @param {function} props.onExit         - Called when user exits the session
 */
export default function SmartSession({ includeSpeaking = true, targetMinutes = 20, onExit }) {
  const session = useInterleavedSession({ includeSpeaking, targetMinutes })
  const {
    status, currentTask, nextTask,
    totalTasks, completedTasks, currentCycleLabel,
    summary,
    startSession, resumeSession, discardAndRestart,
    completeTask, endSessionEarly,
  } = session

  // ─── Idle / pre-start screen ──────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="text-center py-8 animate-fadeUp space-y-4">
        <div className="text-5xl mb-2">⚡</div>
        <p className="text-xl font-bold">Smart Session</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>
          A thematic micro-cycle session that takes each vocabulary word from
          recognition all the way to active production.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            id="smart-session-start-btn"
            onClick={startSession}
            className="w-full py-3.5 rounded-2xl font-bold text-base"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))', color: '#fff' }}
          >
            <Zap size={16} className="inline mr-2" />
            Start Session
          </button>
          {onExit && (
            <button onClick={onExit}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Back to Study
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Resume prompt ────────────────────────────────────────────
  if (status === 'resume-prompt') {
    const remaining = totalTasks - completedTasks
    return (
      <div className="text-center py-8 animate-fadeUp space-y-4">
        <div className="text-4xl mb-2">💾</div>
        <p className="text-lg font-bold">Resume your session?</p>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          You have <strong style={{ color: 'var(--color-accent)' }}>{remaining} tasks</strong> remaining
          from your last session.
        </p>
        <div className="flex gap-2 pt-2">
          <button onClick={discardAndRestart}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            Start Fresh
          </button>
          <button onClick={resumeSession}
            className="flex-1 py-3 rounded-2xl font-bold text-sm"
            style={{ background: 'var(--color-accent)', color: '#fff' }}>
            Resume →
          </button>
        </div>
      </div>
    )
  }

  // ─── Session complete / summary ───────────────────────────────
  if (status === 'done') {
    if (!summary) {
      return (
        <div className="text-center py-12 animate-fadeUp">
          <div className="text-5xl mb-3">🎓</div>
          <p className="text-lg font-bold mb-2">No cards available</p>
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
            Load topic packs from Settings to start a Smart Session.
          </p>
          {onExit && (
            <button onClick={onExit}
              className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Back
            </button>
          )}
        </div>
      )
    }
    return (
      <SmartSessionSummary summary={summary} onExit={onExit} onRestart={startSession} />
    )
  }

  // ─── Transition animation ─────────────────────────────────────
  if (status === 'transition') {
    return (
      <div className="animate-fadeUp">
        <SessionProgress total={totalTasks} current={completedTasks} cycleLabel={currentCycleLabel} />
        <TaskTransition nextTask={nextTask} />
      </div>
    )
  }

  // ─── Active task ──────────────────────────────────────────────
  if (status === 'active' && currentTask) {
    // Key the task component on cursor so per-task local state resets cleanly
    const taskKey = `task-${completedTasks}`

    return (
      <div className="space-y-3 animate-fadeUp">
        {/* Header: progress strip + exit */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SessionProgress
              total={totalTasks}
              current={completedTasks}
              cycleLabel={currentCycleLabel}
            />
          </div>
          <button
            onClick={endSessionEarly}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
            title="End session"
          >
            <X size={14} />
          </button>
        </div>

        {/* Dispatch to the correct task component */}
        {currentTask.type === 'fc' && (
          <AdapterFlashcard
            key={taskKey}
            card={currentTask.card}
            onComplete={completeTask}
          />
        )}
        {currentTask.type === 'quiz' && (
          <AdapterQuiz
            key={taskKey}
            card={currentTask.card}
            cardIdx={completedTasks}
            onComplete={completeTask}
          />
        )}
        {currentTask.type === 'cloze' && (
          <AdapterCloze
            key={taskKey}
            card={currentTask.card}
            onComplete={completeTask}
          />
        )}
        {currentTask.type === 'micro-write' && (
          <WritingMicroPrompt
            key={taskKey}
            task={currentTask}
            onComplete={completeTask}
          />
        )}
        {currentTask.type === 'micro-speak' && (
          <SpeakingMicroTurn
            key={taskKey}
            task={currentTask}
            onComplete={completeTask}
          />
        )}

        {/* Up-next peek (reduces dread of unknown) */}
        {nextTask && (
          <p className="text-center text-[10px]" style={{ color: 'var(--color-dim)' }}>
            Up next:{' '}
            <span style={{ color: 'var(--color-text)' }}>
              {{ fc: 'Flashcard', quiz: 'Quiz', cloze: 'Fill-in', 'micro-write': 'Write', 'micro-speak': 'Speak' }[nextTask.type] ?? nextTask.type}
            </span>
          </p>
        )}
      </div>
    )
  }

  return null
}

// ─── Session summary sub-component ────────────────────────────────

function SmartSessionSummary({ summary, onExit, onRestart }) {
  const { accuracy, completedCount, correctCount, wrongCount, durationMin, weakWords, byType } = summary

  return (
    <div className="space-y-4 animate-fadeUp">
      {/* Hero */}
      <div className="text-center py-6 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(68,138,255,0.08), rgba(124,58,237,0.08))', border: '1px solid var(--color-border)' }}>
        <div className="text-5xl mb-2">{accuracy >= 80 ? '🎯' : accuracy >= 60 ? '💪' : '🔁'}</div>
        <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>{accuracy}%</p>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          {correctCount} correct · {wrongCount} wrong · {durationMin} min
        </p>
      </div>

      {/* Per-type breakdown */}
      {Object.entries(byType).length > 0 && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-dim)' }}>By Task Type</p>
          {Object.entries(byType).map(([type, stats]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm capitalize">{type.replace('-', ' ')}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round((stats.correct / stats.total) * 100)}%`, background: 'var(--color-green)' }} />
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: 'var(--color-dim)' }}>
                  {Math.round((stats.correct / stats.total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weak words */}
      {weakWords.length > 0 && (
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-red)' }}>
            Review These Words
          </p>
          <div className="flex flex-wrap gap-2">
            {weakWords.map(w => (
              <span key={w} className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(255,82,82,0.12)', color: 'var(--color-red)' }}>{w}</span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onExit && (
          <button onClick={onExit}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            Done
          </button>
        )}
        <button onClick={onRestart}
          className="flex-1 py-3 rounded-2xl font-bold text-sm"
          style={{ background: 'var(--color-accent)', color: '#fff' }}>
          New Session
        </button>
      </div>
    </div>
  )
}
