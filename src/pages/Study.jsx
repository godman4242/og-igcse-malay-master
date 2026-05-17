import { useEffect } from 'react'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { SkipForward, Ear, PenLine, HelpCircle, Keyboard, AudioLines } from 'lucide-react'
import useStudySession from '../hooks/useStudySession'
import useTheaterMode from '../hooks/useTheaterMode'
import FlashcardMode from '../components/study/FlashcardMode'
import QuizMode from '../components/study/QuizMode'
import TypeMode from '../components/study/TypeMode'
import ListenMode from '../components/study/ListenMode'
import ClozeMode from '../components/study/ClozeMode'
import SpeakMode from '../components/study/SpeakMode'
import SessionSummary from '../components/study/SessionSummary'
import Meta from '../components/Meta'

const MODES = [
  { id: 'fc',     label: 'Flashcard', icon: <HelpCircle size={14} /> },
  { id: 'quiz',   label: 'Quiz',      icon: <HelpCircle size={14} /> },
  { id: 'type',   label: 'Type',      icon: <Keyboard size={14} /> },
  { id: 'listen', label: 'Listen',    icon: <Ear size={14} /> },
  { id: 'cloze',  label: 'Cloze',     icon: <PenLine size={14} /> },
  { id: 'speak',  label: 'Speak',     icon: <AudioLines size={14} /> },
]

export default function Study() {
  const session = useStudySession()
  const {
    card, mode, sorted, decks, filtered, due, activeDeck,
    changeDeck, sessionStats, showSummary,
    comeback, comebackDismissed, comebackDays, dismissComeback,
    nextCard,
  } = session
  const { setTheaterMode } = useTheaterMode()
  const reducedMotion = useReducedMotion()

  const sessionActive = !showSummary && !!card
  useEffect(() => {
    if (sessionActive) setTheaterMode(true)
    return () => setTheaterMode(false)
  }, [sessionActive, setTheaterMode])

  // Empty deck
  if (!sorted.length) {
    return (
      <div className="text-center py-16 animate-fadeUp">
        <p className="text-5xl mb-4">🎓</p>
        <p className="text-lg font-bold mb-2">No cards to study!</p>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          Load a topic pack from Settings, or import text to create cards.
        </p>
      </div>
    )
  }

  if (showSummary) return <SessionSummary session={session} />

  const pct = filtered.length > 0 ? Math.round(((filtered.length - due.length) / filtered.length) * 100) : 0
  // Mode component is remounted per card so its local input/feedback state resets cleanly.
  const cardKey = card ? `${card.m}-${card.t}-${session.cardIdx}` : 'empty'

  return (
    <div className="space-y-3 animate-fadeUp">
      <Meta 
        title={`Study: ${activeDeck} | IGCSE Malay Master`} 
        description={`Master IGCSE Malay vocabulary in the ${activeDeck} deck using spaced repetition and multiple interactive modes.`}
      />
      {/* Deck selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {decks.map(d => (
          <button key={d} onClick={() => changeDeck(d)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              background: activeDeck === d ? 'var(--color-accent)' : 'var(--color-card)',
              color: activeDeck === d ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (activeDeck === d ? 'var(--color-accent)' : 'var(--color-border)'),
            }}>
            {d}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-green))' }} />
      </div>

      {/* Comeback welcome */}
      {comeback && !comebackDismissed && (
        <div className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(68,138,255,0.08))',
            border: '1px solid rgba(124,58,237,0.3)',
          }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-purple)' }}>
                👋 Welcome back{comebackDays ? ` after ${comebackDays} days` : ''}!
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-dim)' }}>
                Let's warm up with {Math.max(0, 5 - sessionStats.reviewed)} easy cards you already know well.
                {sessionStats.reviewed > 0 && sessionStats.reviewed < 5 && (
                  <span style={{ color: 'var(--color-green)' }}> ({sessionStats.reviewed}/5 done)</span>
                )}
              </p>
            </div>
            <button onClick={dismissComeback}
              className="text-[10px] px-2 py-1 rounded-full font-bold flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-purple)', border: '1px solid rgba(124,58,237,0.3)' }}>
              Skip
            </button>
          </div>
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                style={{ background: i < sessionStats.reviewed ? 'var(--color-purple)' : 'rgba(124,58,237,0.15)' }} />
            ))}
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {MODES.map(m => (
          <button key={m.id} onClick={() => session.setMode(m.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: mode === m.id ? 'var(--color-accent2)' : 'var(--color-card)',
              color: mode === m.id ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (mode === m.id ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Stats row — FSRS-based */}
      <div className="flex justify-center gap-6 text-center text-xs py-2">
        <div><div className="text-lg font-bold" style={{ color: 'var(--color-red)' }}>{due.length}</div><div style={{ color: 'var(--color-dim)' }}>DUE</div></div>
        <div><div className="text-lg font-bold" style={{ color: 'var(--color-orange)' }}>{filtered.filter(c => (c.state ?? 0) <= 1).length}</div><div style={{ color: 'var(--color-dim)' }}>LEARNING</div></div>
        <div><div className="text-lg font-bold" style={{ color: 'var(--color-green)' }}>{filtered.filter(c => c.state === 2 && (c.stability || 0) >= 21).length}</div><div style={{ color: 'var(--color-dim)' }}>KNOWN</div></div>
      </div>

      {/* Active mode — keyed by mode+card so per-mode local state resets on advance */}
      <AnimatePresence mode="wait" initial={false}>
        {card && (
          <Motion.div
            key={`${mode}-${cardKey}`}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {mode === 'fc'     && <FlashcardMode card={card} session={session} />}
            {mode === 'quiz'   && <QuizMode card={card} session={session} cardIdx={session.cardIdx} />}
            {mode === 'type'   && <TypeMode card={card} session={session} />}
            {mode === 'listen' && <ListenMode card={card} session={session} />}
            {mode === 'cloze'  && <ClozeMode card={card} session={session} />}
            {mode === 'speak'  && <SpeakMode card={card} session={session} />}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Skip button + keyboard hint */}
      <div className="flex flex-col items-center gap-2">
        <button onClick={nextCard} className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          <SkipForward size={14} /> Next Card
        </button>
        {mode === 'fc' && (
          <p className="text-[10px] text-center" style={{ color: 'var(--color-dim)' }}>
            Keys: Space=flip · 1=Again · 2=Hard · 3=Good · 4=Easy · S=sound · N/→=next
          </p>
        )}
      </div>
    </div>
  )
}
