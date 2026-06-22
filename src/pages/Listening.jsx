import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, Check, X, Headphones, Play, RotateCw, Lock, BookOpenCheck } from 'lucide-react'
import LISTENING_PASSAGES from '../data/listeningPassages'
import { hasSpeechSynthesis } from '../lib/speech'
import { leadByLang } from '../lib/passageOrder'
import FeedbackLive from '../components/FeedbackLive'
import useStore from '../store/useStore'

// Paper 4 listening practice. The passage text is hidden from the
// student until after they answer — the only input is what they hear.
// Up to 2 plays are allowed (matches the IGCSE format where audio is
// played twice). Passage is replayed at a slightly slower rate the
// second time so weaker listeners catch missed phrases.

const MAX_PLAYS = 2

export default function Listening() {
  const [passage, setPassage] = useState(null)
  const [playsUsed, setPlaysUsed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showExplanation, setShowExplanation] = useState(false)
  const [complete, setComplete] = useState(false)
  const [revealText, setRevealText] = useState(false)
  const addMistake = useStore(s => s.addMistake)
  const logSkillActivity = useStore(s => s.logSkillActivity)
  const studyLang = useStore(s => s.studyLang)

  const ttsSupported = hasSpeechSynthesis()

  // Lead the picker with the active study language (Fork I) — stable
  // "reorder, don't filter", so the other language's passages stay below.
  const orderedPassages = useMemo(() => leadByLang(LISTENING_PASSAGES, studyLang), [studyLang])

  // Stop any speaking when leaving the page or switching passage.
  useEffect(() => {
    return () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel() }
  }, [])

  const playPassage = () => {
    if (!passage || playsUsed >= MAX_PLAYS || playing || !ttsSupported) return
    const rate = playsUsed === 0 ? 0.95 : 0.85 // slower second play
    setPlaying(true)
    const utterance = new SpeechSynthesisUtterance(passage.text)
    utterance.lang = passage.lang === 'en' ? 'en-GB' : 'ms-MY'
    utterance.rate = rate
    utterance.onend = () => {
      setPlaying(false)
      setPlaysUsed(p => p + 1)
    }
    utterance.onerror = () => setPlaying(false)
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }

  // ── Passage Selection ──
  if (!passage) {
    return (
      <div className="space-y-3 animate-fadeUp">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Headphones size={18} style={{ color: 'var(--color-accent2)' }} /> Paper 4 Listening
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          IGCSE-style listening practice. Tap Play to hear the passage. You can replay it once — the second time plays slower. After that the questions appear.
        </p>
        {!ttsSupported && (
          <div className="rounded-xl p-3 text-xs"
            style={{ background: 'rgba(255,82,82,0.08)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.18)' }}>
            Speech synthesis is not available in this browser. Listening practice needs TTS.
          </div>
        )}
        {orderedPassages.map((p, idx) => (
          <button key={p.id} data-guide={idx === 0 ? 'listening-passages' : undefined}
            onClick={() => { setPassage(p); setPlaysUsed(0); setQuestionIndex(0); setAnswers({}); setComplete(false); setRevealText(false) }}
            className="w-full text-left rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm">{p.title}</h3>
              <ChevronRight size={16} style={{ color: 'var(--color-accent2)' }} />
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-dim)' }}>{p.speakerHint}</p>
            <div className="flex gap-2 flex-wrap" data-guide={idx === 0 ? 'listening-badges' : undefined}>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: p.lang === 'en' ? 'rgba(0,229,255,0.15)' : 'rgba(255,77,109,0.15)',
                  color: p.lang === 'en' ? 'var(--color-cyan)' : 'var(--color-accent)',
                }}>
                {p.lang === 'en' ? 'EN' : 'MY'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: p.difficulty === 'beginner' ? 'rgba(0,230,118,0.15)' : p.difficulty === 'advanced' ? 'rgba(255,82,82,0.15)' : 'rgba(255,145,0,0.15)',
                  color: p.difficulty === 'beginner' ? 'var(--color-green)' : p.difficulty === 'advanced' ? 'var(--color-red)' : 'var(--color-orange)',
                }}>
                {p.difficulty}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent2)' }}>
                {p.questions.length} questions
              </span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  const questions = passage.questions
  const currentQ = questions[questionIndex]
  const userAnswer = answers[currentQ?.id]
  const isAnswered = userAnswer !== undefined
  const isCorrect = isAnswered && userAnswer === currentQ.correctIndex
  const playsRemaining = Math.max(0, MAX_PLAYS - playsUsed)
  const canStartQuestions = playsUsed >= 1
  const score = Object.entries(answers).filter(([qId, ans]) => {
    const q = questions.find(q => q.id === Number(qId))
    return q && ans === q.correctIndex
  }).length

  // ── Score Screen ──
  if (complete) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="space-y-4 animate-fadeUp">
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-4xl mb-2">{pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F389}' : '\u{1F4AA}'}</p>
          <h2 className="text-xl font-bold mb-1">Listening complete</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--color-dim)' }}>{passage.title}</p>
          <span className="text-3xl font-bold" style={{
            color: pct >= 80 ? 'var(--color-green)' : pct >= 60 ? 'var(--color-orange)' : 'var(--color-red)',
          }}>
            {score}/{questions.length}
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{pct}% correct</p>
        </div>

        {/* Optional reveal of the transcript so students can review what they missed */}
        <button onClick={() => setRevealText(r => !r)}
          className="w-full p-3 rounded-xl text-xs font-bold"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          {revealText ? 'Hide transcript' : 'Show transcript'}
        </button>
        {revealText && (
          <div className="rounded-2xl p-4 text-sm leading-relaxed"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            {passage.text}
          </div>
        )}

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-3">Review</h3>
          {questions.map((q, i) => {
            const ans = answers[q.id]
            const correct = ans === q.correctIndex
            return (
              <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2 mb-1">
                  {correct ? <Check size={14} style={{ color: 'var(--color-green)' }} /> : <X size={14} style={{ color: 'var(--color-red)' }} />}
                  <span className="text-xs font-bold">{q.question}</span>
                </div>
                {!correct && (
                  <p className="text-xs ml-6" style={{ color: 'var(--color-dim)' }}>
                    Correct: {q.options[q.correctIndex]} — {q.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setQuestionIndex(0); setAnswers({}); setComplete(false); setPlaysUsed(0) }}
            className="flex-1 p-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'var(--color-accent2)' }}>
            Try again
          </button>
          <button onClick={() => setPassage(null)}
            className="flex-1 p-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            <ArrowLeft size={14} className="inline mr-1" /> All passages
          </button>
        </div>
      </div>
    )
  }

  // ── Active practice ──
  const handleSelectAnswer = (optIndex) => {
    if (isAnswered) return
    setAnswers(prev => ({ ...prev, [currentQ.id]: optIndex }))
    setShowExplanation(true)
    if (optIndex !== currentQ.correctIndex) {
      addMistake?.({
        type: 'comprehension',
        source: passage.id,
        language: passage.lang === 'en' ? 'en' : 'ms',
        category: 'comprehension',
        severity: currentQ.type === 'inference' ? 'high' : 'med',
        word: '',
        surface: currentQ.question,
        given: currentQ.options[optIndex] || '',
        correct: currentQ.options[currentQ.correctIndex] || '',
        note: `[Listening] ${currentQ.explanation || currentQ.type}`,
      })
    }
  }

  const handleNext = () => {
    setShowExplanation(false)
    if (questionIndex >= questions.length - 1) {
      setComplete(true)
      logSkillActivity('listening') // one scored passage = one Listening unit (paper-balance meter)
    } else {
      setQuestionIndex(questionIndex + 1)
    }
  }

  // WCAG 4.1.3 status message: a screen-reader / switch user must HEAR the
  // same correct/incorrect verdict (+ corrective explanation) the eye sees in
  // the feedback box. Empty until graded, so the region mounts unconditionally.
  const feedbackText = showExplanation
    ? `${passage.lang === 'en'
        ? (isCorrect ? 'Correct!' : 'Not quite.')
        : (isCorrect ? 'Betul!' : 'Tidak tepat.')}${currentQ?.explanation ? ' ' + currentQ.explanation : ''}`
    : ''

  return (
    <div className="space-y-3 animate-fadeUp">
      <FeedbackLive text={feedbackText} />
      <div className="flex items-center justify-between">
        <button onClick={() => setPassage(null)} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-xs font-bold" style={{ color: 'var(--color-accent2)' }}>
          {canStartQuestions ? `Q${questionIndex + 1}/${questions.length}` : 'Listen first'}
        </span>
      </div>

      {/* Player */}
      <div className="rounded-2xl p-4"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-bold text-sm mb-1">{passage.title}</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{passage.speakerHint}</p>
        <button onClick={playPassage} disabled={playsRemaining === 0 || playing || !ttsSupported}
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{
            background: playsRemaining === 0 ? 'var(--color-card2)' : 'var(--color-accent2)',
            color: playsRemaining === 0 ? 'var(--color-dim)' : '#fff',
            opacity: playing ? 0.7 : 1,
          }}>
          {playing
            ? (<><RotateCw size={14} className="animate-spin" /> Playing…</>)
            : playsRemaining === 0
              ? (<><Lock size={14} /> No replays left</>)
              : (<><Play size={14} /> {playsUsed === 0 ? 'Play passage' : 'Replay (slower)'} · {playsRemaining} left</>)
          }
        </button>
        <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--color-dim)' }}>
          You can play the passage up to {MAX_PLAYS} times. The second play is slightly slower.
        </p>
      </div>

      {!canStartQuestions && (
        <div className="rounded-xl p-3 text-xs flex items-center gap-2"
          style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--color-accent2)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <BookOpenCheck size={12} /> Listen to the passage at least once to unlock the questions.
        </div>
      )}

      {canStartQuestions && currentQ && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-accent2)' }}>{currentQ.type}</p>
          <p className="text-sm font-bold mb-3">{currentQ.question}</p>
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              const selected = userAnswer === i
              const isRight = i === currentQ.correctIndex
              let bg = 'var(--color-surface)'
              let border = 'var(--color-border)'
              if (isAnswered) {
                if (isRight) { bg = 'rgba(0,230,118,0.1)'; border = 'var(--color-green)' }
                else if (selected && !isRight) { bg = 'rgba(255,82,82,0.1)'; border = 'var(--color-red)' }
              } else if (selected) {
                bg = 'rgba(68,138,255,0.1)'; border = 'var(--color-blue)'
              }
              return (
                <button key={i} onClick={() => handleSelectAnswer(i)}
                  className="w-full text-left p-3 rounded-xl text-sm transition-colors flex items-center gap-2"
                  style={{ background: bg, border: `1.5px solid ${border}` }}>
                  {isAnswered && isRight && <Check size={14} style={{ color: 'var(--color-green)' }} />}
                  {isAnswered && selected && !isRight && <X size={14} style={{ color: 'var(--color-red)' }} />}
                  {opt}
                </button>
              )
            })}
          </div>
          {showExplanation && (
            <div className="mt-3 p-3 rounded-xl text-xs" style={{
              background: isCorrect ? 'rgba(0,230,118,0.06)' : 'rgba(255,82,82,0.06)',
              border: `1px solid ${isCorrect ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}`,
            }}>
              <p className="font-bold mb-1" style={{ color: isCorrect ? 'var(--color-green)' : 'var(--color-red)' }}>
                {passage.lang === 'en'
                  ? (isCorrect ? 'Correct!' : 'Not quite.')
                  : (isCorrect ? 'Betul!' : 'Tidak tepat.')}
              </p>
              <p style={{ color: 'var(--color-dim)' }}>{currentQ.explanation}</p>
            </div>
          )}
          {isAnswered && (
            <button onClick={handleNext}
              className="w-full mt-3 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1"
              style={{ background: 'var(--color-accent)' }}>
              {questionIndex >= questions.length - 1 ? 'See results' : 'Next question'} <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Progress dots */}
      {canStartQuestions && (
        <div className="flex justify-center gap-1.5">
          {questions.map((q, i) => {
            const answered = answers[q.id] !== undefined
            const correct = answered && answers[q.id] === q.correctIndex
            return (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{
                  background: i === questionIndex ? 'var(--color-accent)'
                    : correct ? 'var(--color-green)'
                    : answered ? 'var(--color-red)'
                    : 'var(--color-border)',
                }} />
            )
          })}
        </div>
      )}
    </div>
  )
}
