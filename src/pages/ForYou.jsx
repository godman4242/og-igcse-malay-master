import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Brain, Bookmark, Target, ArrowRight, Zap, Plus } from 'lucide-react'
import useStore from '../store/useStore'
import { getDueCards } from '../lib/fsrs'
import { buildForYouShelves } from '../lib/forYouShelves'
import { speak, hasSpeechSynthesis } from '../lib/speech'
import MakeDeckPanel from '../components/MakeDeckPanel'

// "For You" — a personalized, shelf-based home built entirely from signals the
// app already has (no AI). Additive: Dashboard remains the home at `/`; this is
// a parallel landing reached from the bottom nav. The page snapshots the store
// once per visit — AnimatedRoutes re-keys on pathname, so each navigation here
// remounts and re-derives fresh shelves. Pure builder = no per-shelf store subs.
// Design: docs/superpowers/specs/2026-06-06-personalized-for-you-design.md §5.1

const SHELF_ICON = {
  'keep-going': Zap,
  picked: Sparkles,
  'still-remember': Brain,
  saved: Bookmark,
  goal: Target,
}

export default function ForYou() {
  const navigate = useNavigate()

  // Raw reactive slices.
  const cards = useStore(s => s.cards)
  const mistakes = useStore(s => s.mistakes)
  const grammarCards = useStore(s => s.grammarCards)
  const speakingHistory = useStore(s => s.speakingHistory)
  const writingHistory = useStore(s => s.writingHistory)
  const examAttempts = useStore(s => s.examAttempts)
  const confidenceLog = useStore(s => s.confidenceLog)
  const studyHistory = useStore(s => s.studyHistory)
  const dailyGoalLevel = useStore(s => s.dailyGoalLevel)
  const identity = useStore(s => s.identity)
  const recallProbe = useStore(s => s.recallProbe)

  // Getter functions — stable refs; called in the body (never inside a selector).
  const getStudyPlan = useStore(s => s.getStudyPlan)
  const getChallengeStats = useStore(s => s.getChallengeStats)
  const getFixUpQueue = useStore(s => s.getFixUpQueue)
  const getExamReadiness = useStore(s => s.getExamReadiness)
  const getNextExamDue = useStore(s => s.getNextExamDue)
  const getDaysSinceLastSession = useStore(s => s.getDaysSinceLastSession)

  // One fixed "now" per mount (lazy useState initializer — the lint-clean way to
  // capture an impure value once) — keeps render pure and the day stable.
  const [now] = useState(() => Date.now())

  // Mirror DailyPlan.jsx's call site so "Keep going" matches the Dashboard plan.
  const daysSince = getDaysSinceLastSession()
  const dailyPlanInputs = {
    cards,
    dueCount: getDueCards(cards).length,
    grammarCards,
    studyPlan: getStudyPlan(),
    challenge: getChallengeStats(),
    fixUpQueue: getFixUpQueue(3),
    examReadiness: getExamReadiness(),
    examDue: getNextExamDue(),
    speakingHistory, writingHistory, examAttempts, mistakes, dailyGoalLevel,
    isComeback: daysSince != null && daysSince >= 7,
  }

  const shelves = buildForYouShelves({
    cards, mistakes, confidenceLog, writingHistory, studyHistory, speakingHistory,
    identity: { idealSelf: identity?.idealSelf || '', goalPreset: identity?.goalPreset ?? null },
    recallProbe,
    dailyPlanInputs,
    lang: 'ms',
  }, now)

  const visible = shelves.filter(s => !s.hidden)

  // "Still remember these?" inline retrieval — tap to reveal. Pure UI state; this
  // probe NEVER touches FSRS (it's a low-stakes self-check, not a graded review).
  const [revealed, setRevealed] = useState(() => new Set())
  const reveal = (key) => setRevealed(prev => new Set(prev).add(key))

  return (
    <div className="space-y-6 animate-fadeUp">
      <header className="pt-1">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles size={20} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
          For You
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-dim)' }}>
          Picked from what you have been learning
        </p>
      </header>

      {visible.length === 0 ? (
        <GetStarted navigate={navigate} />
      ) : (
        visible.map(shelf => (
          <Shelf
            key={shelf.id}
            shelf={shelf}
            navigate={navigate}
            revealed={revealed}
            reveal={reveal}
          />
        ))
      )}

      {/* Phase 2 — key-gated AI custom deck generator (grounded, never silent-ship). */}
      <MakeDeckPanel navigate={navigate} />
    </div>
  )
}

function ShelfHeader({ shelf }) {
  const Icon = SHELF_ICON[shelf.id] || Sparkles
  return (
    <div className="mb-2.5">
      <h3 className="text-base font-bold flex items-center gap-2">
        <Icon size={16} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
        {shelf.title}
      </h3>
      {shelf.subtitle && (
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-dim)' }}>{shelf.subtitle}</p>
      )}
    </div>
  )
}

// Horizontal-scroll rail wrapper (mobile-first).
function Rail({ children }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x" style={{ scrollbarWidth: 'thin' }}>
      {children}
    </div>
  )
}

function PrimaryButton({ label, onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm text-white"
      style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' }}>
      {label} <ArrowRight size={15} aria-hidden={true} />
    </button>
  )
}

function Shelf({ shelf, navigate, revealed, reveal }) {
  // "Picked for you" — a single hero with weak-topic chips + a launch CTA.
  if (shelf.kind === 'session') {
    return (
      <section>
        <ShelfHeader shelf={shelf} />
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          {shelf.items.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {shelf.items.map(it => (
                <span key={it.id} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                  {it.label}
                </span>
              ))}
            </div>
          )}
          <PrimaryButton label={shelf.cta.label} onClick={() => navigate(shelf.cta.route)} />
        </div>
      </section>
    )
  }

  // "Toward your goal" — surface buttons.
  if (shelf.kind === 'link') {
    return (
      <section>
        <ShelfHeader shelf={shelf} />
        <div className="flex flex-wrap gap-2">
          {shelf.items.map(it => (
            <button key={it.id} onClick={() => navigate(it.route)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              {it.label} <ArrowRight size={14} style={{ color: 'var(--color-dim)' }} aria-hidden={true} />
            </button>
          ))}
        </div>
      </section>
    )
  }

  // "Keep going" — today's undone plan tasks as a rail.
  if (shelf.kind === 'tasks') {
    return (
      <section>
        <ShelfHeader shelf={shelf} />
        <Rail>
          {shelf.items.map(it => (
            <button key={it.id} onClick={() => navigate(it.route)}
              className="flex-shrink-0 w-44 rounded-2xl p-3.5 text-left snap-start"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-bold leading-tight">{it.label}</p>
              {it.sublabel && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-dim)' }}>{it.sublabel}</p>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2" style={{ color: 'var(--color-accent)' }}>
                Start <ArrowRight size={12} aria-hidden={true} />
              </span>
            </button>
          ))}
        </Rail>
      </section>
    )
  }

  // "Still remember these?" + "From your saved words" — word-card rails.
  const isProbe = shelf.id === 'still-remember'
  return (
    <section>
      <ShelfHeader shelf={shelf} />
      <Rail>
        {shelf.items.map(it => {
          const key = `${shelf.id}:${it.id}`
          const isOpen = !isProbe || revealed.has(key)
          return (
            <div key={key}
              className="flex-shrink-0 w-36 rounded-2xl p-3.5 snap-start"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-bold leading-tight">{it.m}</p>
                {hasSpeechSynthesis() && (
                  <button onClick={() => speak(it.m, 'ms-MY')} aria-label={`Hear ${it.m}`}
                    className="text-[13px] leading-none" style={{ color: 'var(--color-dim)' }}>🔊</button>
                )}
              </div>
              {isProbe && !isOpen ? (
                <button onClick={() => reveal(key)}
                  className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{ background: 'var(--color-card2)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
                  Show meaning
                </button>
              ) : (
                <p className="text-[12px] mt-1.5" style={{ color: 'var(--color-dim)' }}>{it.e}</p>
              )}
            </div>
          )
        })}
      </Rail>
      {shelf.cta && (
        <div className="mt-2.5">
          <PrimaryButton label={shelf.cta.label} onClick={() => navigate(shelf.cta.route)} />
        </div>
      )}
    </section>
  )
}

// Brand-new learner: every shelf hid. Point them at the fastest way to create
// the signals that light the shelves up.
function GetStarted({ navigate }) {
  return (
    <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="text-4xl mb-2">🌱</div>
      <p className="text-lg font-bold mb-1">Your home fills up as you learn</p>
      <p className="text-sm leading-relaxed max-w-xs mx-auto mb-4" style={{ color: 'var(--color-dim)' }}>
        Add some words and do a session — then this page will hand you a personalized queue every time you open it.
      </p>
      <div className="flex flex-col gap-2 max-w-[260px] mx-auto">
        <PrimaryButton label="Learn new words" onClick={() => navigate('/word-families')} />
        <button onClick={() => navigate('/import')}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-semibold text-sm"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <Plus size={15} aria-hidden={true} /> Import your own text
        </button>
      </div>
    </div>
  )
}
