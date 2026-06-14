import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain, AlertTriangle, Mic, PenLine, BookOpen, Trophy, Sparkles,
  ChevronRight, CheckCircle, Target,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { getDueCards } from '../../lib/fsrs'
import { buildDailyPlan } from '../../lib/dailyPlan'
import { cardsForLang } from '../../lib/cardLang'
import { scopeMistakes, scopeSpeaking, scopeWriting, scopeGrammarCards } from '../../lib/forYouLangScope'
import { trackEvent } from '../../lib/telemetry'

// Daily Plan spine — the single ordered "what should I do today?" action queue
// at the top of the Dashboard. Pure synthesis over existing store signals; the
// intelligence lives in src/lib/dailyPlan.js. This component only reads, routes,
// and renders. No store API change, no persisted state.
// Design: docs/superpowers/specs/2026-05-29-daily-plan-spine-design.md
//
// Gate: renders only for an activated deck (cards.length > 0). The empty-deck
// FirstRunCard owns the brand-new-user moment, so there's no double-CTA.

const ICON_BY_KIND = {
  review: Brain,
  fixups: AlertTriangle,
  speak: Mic,
  write: PenLine,
  grammar: BookOpen,
  exam: Trophy,
  foundation: Sparkles,
}

const COLOR_BY_KIND = {
  review: 'var(--color-accent)',
  fixups: 'var(--color-red)',
  speak: 'var(--color-accent2)',
  write: 'var(--color-accent2)',
  grammar: 'var(--color-green)',
  exam: 'var(--color-accent)',
  foundation: 'var(--color-green)',
}

const READINESS_LABEL = { exam: 'Exam readiness', maturity: 'Vocabulary mastery' }

export default function DailyPlan() {
  const navigate = useNavigate()

  // Raw slices (stable refs from Zustand). The language-TAGGED slices are scoped
  // to the active studyLang (v34: a session is ONE language) so the plan never
  // counts cross-language activity — mirrors ForYou's "Keep going" scoping. The
  // pure buildDailyPlan is untouched; we filter its INPUTS here at the call site.
  // studyLang='ms' (the default) → langCards is the whole deck + the scopers keep
  // every Malay/untagged record, so a single-language user is byte-identical.
  const cards = useStore(s => s.cards)
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const langCards = cardsForLang(cards, studyLang)
  const grammarCards = scopeGrammarCards(useStore(s => s.grammarCards), studyLang)
  const speakingHistory = scopeSpeaking(useStore(s => s.speakingHistory), studyLang)
  const writingHistory = scopeWriting(useStore(s => s.writingHistory), studyLang)
  const examAttempts = useStore(s => s.examAttempts)
  const mistakes = scopeMistakes(useStore(s => s.mistakes), studyLang)
  const dailyGoalLevel = useStore(s => s.dailyGoalLevel)
  const userRole = useStore(s => s.userRole)

  // Getter refs — called in the body (never inside a selector; they allocate).
  const getStudyPlan = useStore(s => s.getStudyPlan)
  const getChallengeStats = useStore(s => s.getChallengeStats)
  const getFixUpQueue = useStore(s => s.getFixUpQueue)
  const getExamReadiness = useStore(s => s.getExamReadiness)
  const getNextExamDue = useStore(s => s.getNextExamDue)
  const getDaysSinceLastSession = useStore(s => s.getDaysSinceLastSession)

  const isEnhanced = userRole !== 'static'
  // One fixed "now" per mount — keeps render pure (no Date.now() in render) and
  // stable for the session; a reload re-evaluates the day.
  const now = useMemo(() => Date.now(), [])

  const studyPlan = getStudyPlan()
  const challenge = getChallengeStats()
  // getFixUpQueue caps before we can filter, so pull a wider slice, scope to the
  // active language, then take the top 3 (matches the prior getFixUpQueue(3) intent).
  const fixUpQueue = scopeMistakes(getFixUpQueue(30), studyLang).slice(0, 3)
  const examReadiness = getExamReadiness()
  const examDue = getNextExamDue()
  const daysSince = getDaysSinceLastSession()
  const dueCount = getDueCards(langCards).length

  const plan = buildDailyPlan({
    cards: langCards, dueCount, grammarCards, studyPlan, challenge, fixUpQueue,
    examReadiness, examDue, speakingHistory, writingHistory, examAttempts,
    mistakes, dailyGoalLevel,
    isComeback: daysSince != null && daysSince >= 7,
  }, now)

  // Gate on "has reviewed at least once" rather than just deck size: this hands
  // off cleanly from FirstRunCard (which owns the deck-loaded-but-unreviewed
  // first session) so the two never show a competing CTA.
  const hasReviewed = cards.some(c => c.last_review != null)
  const hasTasks = plan.tasks.length > 0

  // Telemetry (Enhanced tier only) — shown once per mount.
  const shownRef = useRef(false)
  useEffect(() => {
    if (!isEnhanced || shownRef.current || !hasReviewed || !hasTasks) return
    shownRef.current = true
    trackEvent('daily_plan_shown', {
      taskCount: plan.tasks.length,
      budgetMin: plan.budgetMin,
      doneCount: plan.tasks.filter(t => t.done).length,
      phase: plan.phase,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fire a completion event on the false→true transition.
  const completedRef = useRef(false)
  useEffect(() => {
    if (!isEnhanced) return
    if (plan.allDone && !completedRef.current) {
      completedRef.current = true
      trackEvent('daily_plan_completed', { taskCount: plan.tasks.length })
    } else if (!plan.allDone) {
      completedRef.current = false
    }
  }, [plan.allDone, plan.tasks.length, isEnhanced])

  if (!hasReviewed || !hasTasks) return null

  const onTask = (task, index) => {
    if (isEnhanced) trackEvent('daily_plan_task_clicked', { kind: task.id, index })
    navigate(task.route)
  }

  const headlineId = 'daily-plan-headline'

  return (
    <section
      role="region"
      aria-labelledby={headlineId}
      className="rounded-2xl p-5 shadow-md"
      style={{ background: 'var(--color-card)', borderLeft: '4px solid var(--color-accent)' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Target size={18} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
          <h2 id={headlineId} className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {plan.allDone ? "Today's plan — done 🎉" : 'Your plan for today'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {typeof plan.daysLeft === 'number' && (
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-accent)' }}
            >
              {plan.daysLeft === 0 ? 'Exam today' : `${plan.daysLeft}d to exam`}
            </span>
          )}
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: 'var(--color-bg)', color: 'var(--color-dim)' }}
          >
            ~{plan.budgetMin} min
          </span>
        </div>
      </div>

      {/* Readiness surface with graceful degradation. */}
      {plan.readiness ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--color-dim)' }}>
            <span>{READINESS_LABEL[plan.readiness.source]}</span>
            <span className="font-bold" style={{ color: 'var(--color-text)' }}>{plan.readiness.value}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, plan.readiness.value))}%`, background: 'var(--color-accent)' }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/exam-rehearsal')}
          className="mt-3 text-xs font-semibold"
          style={{ color: 'var(--color-accent)' }}
        >
          Do an exam rehearsal to unlock your readiness score →
        </button>
      )}

      {plan.allDone ? (
        <div className="mt-4">
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
            You've finished everything on today's plan. Rest counts too.
          </p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/smart-study')}
              className="text-sm font-bold px-4 py-2 rounded-full"
              style={{ background: 'var(--color-accent)', color: '#fff', minHeight: 44 }}
            >
              Keep going →
            </button>
          </div>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {plan.tasks.map((task, index) => {
            const Icon = ICON_BY_KIND[task.kind] || Brain
            const accent = COLOR_BY_KIND[task.kind] || 'var(--color-accent)'
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onTask(task, index)}
                  className="w-full flex items-center gap-3 rounded-xl p-3 text-left"
                  style={{ background: 'var(--color-bg)', minHeight: 44, opacity: task.done ? 0.55 : 1 }}
                >
                  <span
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ background: 'var(--color-card)' }}
                    aria-hidden={true}
                  >
                    {task.done
                      ? <CheckCircle size={18} style={{ color: 'var(--color-green)' }} />
                      : <Icon size={18} style={{ color: accent }} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>
                        {task.label}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--color-dim)' }}>
                        {task.sublabel}
                      </span>
                    </span>
                    <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--color-dim)' }}>
                      {task.reason}
                    </span>
                  </span>
                  <ChevronRight size={18} style={{ color: 'var(--color-dim)' }} aria-hidden={true} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
