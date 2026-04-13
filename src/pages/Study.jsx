import { useState, useEffect, useMemo } from 'react'
import { Volume2, SkipForward, Mic, Ear, PenLine, HelpCircle, Keyboard, AudioLines, Trophy, RotateCcw } from 'lucide-react'
import useStore from '../store/useStore'
import DICTIONARY from '../data/dictionary'
import { getDueCards, sortByPriority, getSchedulingOptions, Rating, State } from '../lib/fsrs'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import { scorePronunciation } from '../lib/pronunciation'
import { fireConfetti } from '../lib/confetti'

// Seeded PRNG based on string hash — deterministic per card, looks random
function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function generateQuizOptions(card, cardIdx, dictionary) {
  if (!card) return []
  const rng = seededRandom(`${cardIdx}:${card.m}`)
  const all = Object.values(dictionary)
  const opts = [card.e]
  while (opts.length < 4) {
    const r = all[Math.floor(rng() * all.length)]
    if (!opts.includes(r)) opts.push(r)
  }
  // Fisher-Yates shuffle with seeded RNG
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]]
  }
  return opts
}

const MODES = [
  { id: 'fc', label: 'Flashcard', icon: <HelpCircle size={14} /> },
  { id: 'quiz', label: 'Quiz', icon: <HelpCircle size={14} /> },
  { id: 'type', label: 'Type', icon: <Keyboard size={14} /> },
  { id: 'listen', label: 'Listen', icon: <Ear size={14} /> },
  { id: 'cloze', label: 'Cloze', icon: <PenLine size={14} /> },
  { id: 'speak', label: 'Speak', icon: <AudioLines size={14} /> },
]

const STATE_LABELS = {
  [State.New]: { label: 'New', color: 'var(--color-blue)' },
  [State.Learning]: { label: 'Learning', color: 'var(--color-orange)' },
  [State.Review]: { label: 'Review', color: 'var(--color-green)' },
  [State.Relearning]: { label: 'Relearn', color: 'var(--color-red)' },
}

export default function Study() {
  const activeDeck = useStore(s => s.activeDeck)
  const setActiveDeck = useStore(s => s.setActiveDeck)
  const reviewCardAction = useStore(s => s.reviewCardAction)
  const updateStreak = useStore(s => s.updateStreak)
  const addStudyMinutes = useStore(s => s.addStudyMinutes)
  const cards = useStore(s => s.cards)

  // Derive decks and filtered cards locally to avoid new-array-every-render selectors
  const decks = ['All', ...Array.from(new Set(cards.map(c => c.t))).sort()]
  const filtered = activeDeck === 'All' ? cards : cards.filter(c => c.t === activeDeck)
  const [mode, setMode] = useState('fc')
  const [flipped, setFlipped] = useState(false)
  const [cardIdx, setCardIdx] = useState(0)
  const [quizFb, setQuizFb] = useState(null)
  const [typeInput, setTypeInput] = useState('')
  const [typeFb, setTypeFb] = useState(null)
  const [listenFb, setListenFb] = useState(null)
  const [listenInput, setListenInput] = useState('')
  const [clozeInput, setClozeInput] = useState('')
  const [clozeFb, setClozeFb] = useState(null)
  const [speakResult, setSpeakResult] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, wrong: 0, startTime: Date.now() })
  const [showSummary, setShowSummary] = useState(false)

  const sorted = sortByPriority(filtered)
  const card = sorted[cardIdx % Math.max(1, sorted.length)]

  // Get FSRS scheduling options for current card (shows predicted intervals)
  const scheduling = useMemo(() => {
    if (!card) return null
    try {
      return getSchedulingOptions(card)
    } catch {
      return null
    }
  }, [card?.m, card?.due, card?.stability, card?.state])

  const nextCard = () => {
    setFlipped(false)
    setQuizFb(null)
    setTypeFb(null)
    setListenFb(null)
    setClozeFb(null)
    setSpeakResult(null)
    setTypeInput('')
    setListenInput('')
    setClozeInput('')
    setCardIdx(i => i + 1)
  }

  // Quiz options — deterministic per card via seeded PRNG (pure)
  const generatedQuizOpts = mode === 'quiz' ? generateQuizOptions(card, cardIdx, DICTIONARY) : []

  const rate = (rating) => {
    if (!card) return
    reviewCardAction(card.m, rating)
    updateStreak()
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (rating >= Rating.Good ? 1 : 0),
      wrong: prev.wrong + (rating === Rating.Again ? 1 : 0),
    }))
    setTimeout(() => {
      // Check if all due cards reviewed after this action
      const remaining = getDueCards(useStore.getState().cards.filter(
        c => activeDeck === 'All' ? true : c.t === activeDeck
      ))
      if (remaining.length === 0 && sessionStats.reviewed > 0) {
        const mins = Math.max(1, Math.round((Date.now() - sessionStats.startTime) / 60000))
        addStudyMinutes(mins)
        fireConfetti(3000)
        setShowSummary(true)
      } else {
        nextCard()
      }
    }, 300)
  }

  // Keyboard shortcuts for flashcard mode
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!card || !sorted.length) return

      if (mode === 'fc') {
        if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f) }
        if (e.key === '1') rate(Rating.Again)
        if (e.key === '2') rate(Rating.Hard)
        if (e.key === '3') rate(Rating.Good)
        if (e.key === '4') rate(Rating.Easy)
        if (e.key === 'ArrowRight' || e.key === 'n') nextCard()
        if (e.key === 's') speak(card.m)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, card, sorted.length])

  const checkQuiz = (answer) => {
    if (quizFb) return
    const correct = answer === card.e
    setQuizFb({ correct, answer: card.e })
    rate(correct ? Rating.Good : Rating.Again)
  }

  const checkType = () => {
    const correct = typeInput.trim().toLowerCase() === card.e.toLowerCase() ||
      card.e.toLowerCase().includes(typeInput.trim().toLowerCase())
    setTypeFb({ correct, answer: card.e })
    rate(correct ? Rating.Good : Rating.Again)
  }

  const checkListen = () => {
    const correct = listenInput.trim().toLowerCase() === card.m.toLowerCase()
    setListenFb({ correct, answer: card.m })
    if (correct) rate(Rating.Good)
    else setListenFb({ correct: false, answer: card.m })
  }

  const checkCloze = () => {
    const correct = clozeInput.trim().toLowerCase() === card.m.toLowerCase()
    setClozeFb({ correct, answer: card.m })
    rate(correct ? Rating.Good : Rating.Again)
  }

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

  // Session Summary
  if (showSummary) {
    const minutes = Math.max(1, Math.round((Date.now() - sessionStats.startTime) / 60000))
    const accuracy = sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0
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
          <button onClick={() => {
            setShowSummary(false)
            setSessionStats({ reviewed: 0, correct: 0, wrong: 0, startTime: Date.now() })
            setCardIdx(0)
          }}
            className="flex-1 p-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent)' }}>
            <RotateCcw size={14} /> Keep Studying
          </button>
        </div>
      </div>
    )
  }

  // Progress
  const due = getDueCards(filtered)
  const pct = filtered.length > 0 ? Math.round(((filtered.length - due.length) / filtered.length) * 100) : 0

  // FSRS state badge for current card
  const stateInfo = STATE_LABELS[card?.state ?? 0] || STATE_LABELS[0]

  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Deck selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {decks.map(d => (
          <button key={d} onClick={() => { setActiveDeck(d); setCardIdx(0) }}
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

      {/* Mode selector */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setCardIdx(c => c) }}
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

      {/* FLASHCARD MODE */}
      {mode === 'fc' && card && (
        <div>
          <div className="perspective cursor-pointer" style={{ height: 260 }} onClick={() => setFlipped(!flipped)}>
            <div className={`w-full h-full relative preserve-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}
              style={{ borderRadius: 14 }}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-5 rounded-2xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <span className="absolute top-2 right-3 text-[10px] px-2 py-0.5 rounded-full text-white"
                  style={{ background: stateInfo.color }}>
                  {stateInfo.label}
                </span>
                <button className="absolute bottom-2 right-3 w-7 h-7 rounded-full flex items-center justify-center border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-cyan)' }}
                  onClick={e => { e.stopPropagation(); speak(card.m) }}>
                  <Volume2 size={14} />
                </button>
                <p className="text-2xl font-bold text-center mb-1">{card.m}</p>
                <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{card.t}</p>
                <p className="text-xs mt-auto" style={{ color: 'var(--color-dim)' }}>tap to flip</p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-5 rounded-2xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <p className="text-xl font-bold text-center mb-2" style={{ color: 'var(--color-accent)' }}>{card.e}</p>
                {card.ex && <p className="text-xs text-center italic" style={{ color: 'var(--color-dim)' }}>{card.ex}</p>}
              </div>
            </div>
          </div>
          {/* FSRS Rating buttons with predicted intervals */}
          <div className="flex gap-2 justify-center mt-3">
            {[
              { rating: Rating.Again, label: 'Again', color: 'var(--color-red)' },
              { rating: Rating.Hard, label: 'Hard', color: 'var(--color-orange)' },
              { rating: Rating.Good, label: 'Good', color: 'var(--color-blue)' },
              { rating: Rating.Easy, label: 'Easy', color: 'var(--color-green)' },
            ].map(r => (
              <button key={r.rating} onClick={() => rate(r.rating)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex flex-col items-center gap-0.5"
                style={{ background: r.color }}>
                <span>{r.label}</span>
                {scheduling && scheduling[r.rating] && (
                  <span className="text-[10px] font-normal opacity-80">
                    {scheduling[r.rating].interval_display}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUIZ MODE */}
      {mode === 'quiz' && card && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-center text-xl font-bold mb-1">{card.m}</p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>Choose the correct meaning</p>
          <div className="grid grid-cols-2 gap-2">
            {generatedQuizOpts.map((opt, i) => (
              <button key={i} onClick={() => checkQuiz(opt)}
                className="p-3 rounded-xl text-sm font-medium text-left transition-all"
                style={{
                  background: quizFb ? (opt === card.e ? 'rgba(0,230,118,0.15)' : quizFb.answer !== opt ? 'var(--color-card2)' : 'rgba(255,82,82,0.15)') : 'var(--color-card2)',
                  border: '2px solid ' + (quizFb && opt === card.e ? 'var(--color-green)' : 'var(--color-border)'),
                  color: 'var(--color-text)',
                }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TYPE MODE */}
      {mode === 'type' && card && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-center text-xl font-bold mb-1">{card.m}</p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>Type the English meaning</p>
          <input type="text" value={typeInput} onChange={e => setTypeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkType()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type meaning..." autoFocus />
          <button onClick={checkType} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>
          {typeFb && (
            <p className="text-center mt-3 text-sm font-bold" style={{ color: typeFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {typeFb.correct ? '✅ Correct!' : `❌ ${typeFb.answer}`}
            </p>
          )}
        </div>
      )}

      {/* LISTEN MODE */}
      {mode === 'listen' && card && (
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--color-dim)' }}>Listen and type the Malay word</p>
          <button onClick={() => speak(card.m)} className="px-8 py-4 rounded-2xl font-bold text-lg mb-4"
            style={{ background: 'var(--color-accent2)', color: '#fff' }}>
            🔊 Play Sound
          </button>
          <input type="text" value={listenInput} onChange={e => setListenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkListen()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type what you hear..." autoFocus />
          <div className="flex gap-2">
            <button onClick={checkListen} className="flex-1 p-3 rounded-xl font-bold text-sm text-black"
              style={{ background: 'var(--color-green)' }}>Check</button>
            <button onClick={() => { setListenFb({ correct: false, answer: card.m }); setTimeout(nextCard, 2000) }}
              className="flex-1 p-3 rounded-xl font-bold text-sm"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>Reveal</button>
          </div>
          {listenFb && (
            <p className="mt-3 text-sm font-bold" style={{ color: listenFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {listenFb.correct ? `✅ ${card.m} = ${card.e}` : `💡 ${listenFb.answer} = ${card.e}`}
            </p>
          )}
        </div>
      )}

      {/* CLOZE MODE */}
      {mode === 'cloze' && card && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3">Fill in the blank</h3>
          <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {(card.ex || `${card.m} means ${card.e}`).replace(new RegExp(card.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')}
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>Hint: {card.e}</p>
          <input type="text" value={clozeInput} onChange={e => setClozeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkCloze()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Fill in the blank..." autoFocus />
          <div className="flex gap-2">
            <button onClick={checkCloze} className="flex-1 p-3 rounded-xl font-bold text-sm text-black"
              style={{ background: 'var(--color-green)' }}>Check</button>
            <button onClick={nextCard} className="flex-1 p-3 rounded-xl font-bold text-sm"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>Skip</button>
          </div>
          {clozeFb && (
            <p className="text-center mt-3 text-sm font-bold" style={{ color: clozeFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {clozeFb.correct ? '✅ Correct!' : `❌ ${clozeFb.answer}`}
            </p>
          )}
        </div>
      )}

      {/* SPEAK MODE — Pronunciation Practice */}
      {mode === 'speak' && card && (
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--color-cyan)' }}>
            Pronunciation Practice
          </p>
          <p className="text-2xl font-bold mb-1">{card.m}</p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{card.e}</p>

          {/* Listen to correct pronunciation */}
          <button onClick={() => speak(card.m)} className="px-6 py-2 rounded-xl font-bold text-sm mb-4"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
            🔊 Listen First
          </button>

          {/* Record button */}
          {hasSpeechRecognition() ? (
            <button
              onClick={async () => {
                setIsRecording(true)
                setSpeakResult(null)
                try {
                  const results = await startRecognition('ms-MY')
                  if (results.length > 0) {
                    const result = scorePronunciation(card.m, results[0].transcript)
                    setSpeakResult({ ...result, spoken: results[0].transcript, confidence: results[0].confidence })
                    if (result.score >= 80) rate(Rating.Easy)
                    else if (result.score >= 50) rate(Rating.Good)
                  }
                } catch {
                  setSpeakResult({ error: 'Could not recognize speech. Try again.' })
                }
                setIsRecording(false)
              }}
              className="w-full py-4 rounded-2xl font-bold text-lg mb-4 transition-all"
              style={{
                background: isRecording ? 'var(--color-red)' : 'var(--color-accent2)',
                color: '#fff',
                boxShadow: isRecording ? '0 0 20px rgba(255,82,82,0.4)' : 'none',
              }}>
              {isRecording ? '🎙️ Listening...' : '🎤 Tap & Speak'}
            </button>
          ) : (
            <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)' }}>
              Speech recognition not available in this browser. Try Chrome.
            </div>
          )}

          {/* Pronunciation result */}
          {speakResult && !speakResult.error && (
            <div className="space-y-3">
              {/* Score */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{
                    border: '4px solid ' + (speakResult.score >= 80 ? 'var(--color-green)' : speakResult.score >= 50 ? 'var(--color-orange)' : 'var(--color-red)'),
                    color: speakResult.score >= 80 ? 'var(--color-green)' : speakResult.score >= 50 ? 'var(--color-orange)' : 'var(--color-red)',
                  }}>
                  {speakResult.score}%
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{speakResult.score >= 80 ? 'Excellent!' : speakResult.score >= 50 ? 'Good try!' : 'Keep practicing!'}</p>
                  <p className="text-xs" style={{ color: 'var(--color-dim)' }}>You said: "{speakResult.spoken}"</p>
                </div>
              </div>

              {/* Word-by-word diff */}
              <div className="flex flex-wrap gap-1 justify-center p-3 rounded-xl"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {speakResult.words.map((w, i) => (
                  <span key={i} className="px-2 py-1 rounded text-sm font-semibold"
                    style={{
                      background: w.status === 'correct' ? 'rgba(0,230,118,0.2)' : w.status === 'close' ? 'rgba(255,145,0,0.2)' : 'rgba(255,82,82,0.2)',
                      color: w.status === 'correct' ? 'var(--color-green)' : w.status === 'close' ? 'var(--color-orange)' : 'var(--color-red)',
                    }}>
                    {w.word || w.spoken}
                    {w.status === 'wrong' && <span className="text-[10px] ml-1">({w.spoken})</span>}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-4 text-xs">
                <span style={{ color: 'var(--color-green)' }}>✅ {speakResult.correct}</span>
                <span style={{ color: 'var(--color-orange)' }}>〜 {speakResult.close}</span>
                <span style={{ color: 'var(--color-red)' }}>✗ {speakResult.wrong}</span>
              </div>
            </div>
          )}

          {speakResult?.error && (
            <p className="text-sm" style={{ color: 'var(--color-red)' }}>{speakResult.error}</p>
          )}
        </div>
      )}

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
