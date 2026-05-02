// src/components/MixedSession.jsx
// Unified session UI for interleaved vocab + grammar + comprehension practice

import { useState, useMemo } from 'react'
import { CheckCircle, XCircle, Trophy, BookOpen, Zap, PenLine, Volume2 } from 'lucide-react'
import useStore from '../store/useStore'
import { buildMixedSession, getMixedSessionSummary } from '../lib/interleave'
import { buildDrillFeedback, buildTenseFeedback, buildVocabFeedback, buildSessionFeedback } from '../lib/feedback'
import ElaborativeFeedback from './ElaborativeFeedback'
import ConfidencePrompt from './ConfidencePrompt'
import ThreeLineFeedback from './ThreeLineFeedback'
import { Rating } from '../lib/fsrs'
import { speak } from '../lib/speech'
import { selectVariantSafe, VARIANT_INFO } from '../data/drillVariants'

const TYPE_LABELS = {
  vocab: { label: 'Vocabulary', icon: <BookOpen size={12} />, color: 'var(--color-blue)' },
  grammar: { label: 'Grammar', icon: <Zap size={12} />, color: 'var(--color-purple)' },
  comprehension: { label: 'Comprehension', icon: <PenLine size={12} />, color: 'var(--color-cyan)' },
}

export default function MixedSession({ onClose }) {
  const cards = useStore(s => s.cards)
  const grammarCards = useStore(s => s.grammarCards)
  const reviewCardAction = useStore(s => s.reviewCardAction)
  const reviewGrammarDrill = useStore(s => s.reviewGrammarDrill)
  const updateStreak = useStore(s => s.updateStreak)
  const logConfidence = useStore(s => s.logConfidence)

  const session = useMemo(() => buildMixedSession({ cards, grammarCards }), [])

  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [elaborative, setElaborative] = useState(null)
  const [results, setResults] = useState([])
  const [flipped, setFlipped] = useState(false)
  const [confidence, setConfidence] = useState(null)
  const [variantInput, setVariantInput] = useState('')
  const [variantFb, setVariantFb] = useState(null)

  if (session.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-lg font-bold mb-2">Nothing due!</p>
        <p className="text-sm mb-4" style={{ color: 'var(--color-dim)' }}>All caught up. Check back later.</p>
        <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>Back to Dashboard</button>
      </div>
    )
  }

  // Session complete
  if (idx >= session.length) {
    const summary = getMixedSessionSummary(results)
    const fb = buildSessionFeedback('study-session', {
      accuracy: summary.accuracy, reviewed: summary.total, deck: 'mixed',
    }, useStore.getState())
    return (
      <div className="space-y-4 animate-fadeUp">
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <Trophy size={48} className="mx-auto mb-3" style={{ color: 'var(--color-green)' }} />
          <h2 className="text-xl font-bold mb-1">Mixed Session Complete!</h2>
          <p className="text-3xl font-bold mb-1" style={{ color: summary.accuracy >= 80 ? 'var(--color-green)' : summary.accuracy >= 50 ? 'var(--color-orange)' : 'var(--color-red)' }}>
            {summary.accuracy}%
          </p>
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>{summary.correct}/{summary.total} correct</p>
        </div>

        <ThreeLineFeedback goal={fb.goal} now={fb.now} next={fb.next} nextHref={fb.nextHref} />

        {/* Per-category breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(summary.byType).filter(([, s]) => s.total > 0).map(([type, stats]) => {
            const info = TYPE_LABELS[type]
            const acc = Math.round((stats.correct / stats.total) * 100)
            return (
              <div key={type} className="rounded-xl p-3 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="text-lg font-bold" style={{ color: info.color }}>{acc}%</div>
                <div className="text-[10px] flex items-center justify-center gap-1" style={{ color: 'var(--color-dim)' }}>
                  {info.icon} {info.label}
                </div>
              </div>
            )
          })}
        </div>

        {summary.weakest && (
          <div className="rounded-xl p-3 text-xs text-center" style={{ background: 'rgba(255,145,0,0.08)', border: '1px solid rgba(255,145,0,0.2)', color: 'var(--color-orange)' }}>
            Focus area: <b>{summary.weakest}</b> — lowest accuracy this session
          </div>
        )}

        <button onClick={onClose} className="w-full p-3 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>Back to Dashboard</button>
      </div>
    )
  }

  const current = session[idx]
  const typeInfo = TYPE_LABELS[current.type]
  const progress = Math.round(((idx) / session.length) * 100)

  const advance = (correct) => {
    setResults(prev => [...prev, { type: current.type, correct }])
    updateStreak()
    setTimeout(() => {
      setFeedback(null)
      setElaborative(null)
      setInput('')
      setFlipped(false)
      setConfidence(null)
      setVariantInput('')
      setVariantFb(null)
      setIdx(i => i + 1)
    }, correct ? 1500 : 4000)
  }

  const handleVocabRate = (rating) => {
    const correct = rating >= Rating.Good
    reviewCardAction(current.item.m, rating)
    if (confidence && logConfidence) {
      logConfidence(current.item.m, confidence, correct)
    }
    setFeedback({ correct })
    if (!correct) {
      setElaborative({ explanation: buildVocabFeedback(current.item), mnemonic: null, examples: [], relatedRule: null })
    }
    advance(correct)
  }

  const handleGrammarCheck = () => {
    if (feedback || !input.trim()) return
    const drill = current.item
    const correct = input.trim().toLowerCase() === drill.answer.toLowerCase()
    setFeedback({ correct, answer: drill.answer })
    setElaborative(buildDrillFeedback(drill, correct))
    reviewGrammarDrill(drill.id, correct)
    advance(correct)
  }

  const handleTenseCheck = (chosen) => {
    if (feedback) return
    const drill = current.item
    const correct = chosen === drill.answer
    setFeedback({ correct, answer: drill.answer })
    setElaborative(buildTenseFeedback(drill, chosen))
    reviewGrammarDrill(drill.id, correct)
    advance(correct)
  }

  const handleCompCheck = () => {
    if (feedback || !input.trim()) return
    const correct = input.trim().toLowerCase() === current.item.m.toLowerCase()
    setFeedback({ correct, answer: current.item.m })
    if (!correct) {
      reviewCardAction(current.item.m, Rating.Again)
    } else {
      reviewCardAction(current.item.m, Rating.Good)
    }
    advance(correct)
  }

  // Adaptive variant for vocab items
  const vocabVariant = current.type === 'vocab' ? selectVariantSafe(current.item) : null
  const vInfo = vocabVariant ? VARIANT_INFO[vocabVariant.variant] : null

  const handleVariantCheck = () => {
    if (variantFb || !variantInput.trim()) return
    const correct = variantInput.trim().toLowerCase() === current.item.m.toLowerCase()
    setVariantFb({ correct, answer: current.item.m })
    reviewCardAction(current.item.m, correct ? Rating.Good : Rating.Again)
    advance(correct)
  }

  // Use standard for vocab if variant is standard/hint, otherwise use variant mode
  const useStandardVocab = !vocabVariant || vocabVariant.variant === 'standard' || vocabVariant.variant === 'hint'

  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
          {typeInfo.icon} {typeInfo.label}
        </span>
        <span style={{ color: 'var(--color-dim)' }}>{idx + 1}/{session.length}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-green))' }} />
      </div>

      {/* VOCAB ITEM — standard/hint variant */}
      {current.type === 'vocab' && useStandardVocab && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="text-center mb-4">
            <p className="text-2xl font-bold mb-1">{current.item.m}</p>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{current.item.t}</p>
            <button onClick={() => speak(current.item.m)} className="mt-2 p-1.5 rounded-full"
              style={{ color: 'var(--color-cyan)', border: '1px solid var(--color-border)' }}>
              <Volume2 size={14} />
            </button>
          </div>

          {!flipped && !feedback && (
            <ConfidencePrompt onSelect={(level) => {
              setConfidence(level)
              setFlipped(true)
            }} />
          )}

          {flipped && !feedback && (
            <>
              <p className="text-center text-lg font-bold mb-3" style={{ color: 'var(--color-accent)' }}>{current.item.e}</p>
              <div className="flex gap-2">
                <button onClick={() => handleVocabRate(Rating.Again)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'var(--color-red)' }}>Again</button>
                <button onClick={() => handleVocabRate(Rating.Good)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'var(--color-blue)' }}>Good</button>
                <button onClick={() => handleVocabRate(Rating.Easy)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'var(--color-green)' }}>Easy</button>
              </div>
            </>
          )}

          {feedback && (
            <div className="flex items-center gap-2 justify-center text-sm font-bold"
              style={{ color: feedback.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {feedback.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {feedback.correct ? 'Nice!' : `Review: ${current.item.e}`}
            </div>
          )}
          {elaborative && <ElaborativeFeedback feedback={elaborative} />}
        </div>
      )}

      {/* VOCAB ITEM — adaptive variant (reverse/cloze/audio/produce) */}
      {current.type === 'vocab' && !useStandardVocab && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          {/* Variant badge */}
          <div className="flex justify-center mb-3">
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
              style={{ background: `${vInfo.color}15`, color: vInfo.color }}>
              {vInfo.badge} — {vInfo.desc}
            </span>
          </div>

          {/* Reverse: English → type Malay */}
          {vocabVariant.variant === 'reverse' && (
            <>
              <p className="text-center text-xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>{current.item.e}</p>
              <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{current.item.t}</p>
            </>
          )}

          {/* Cloze: fill in the blank */}
          {vocabVariant.variant === 'cloze' && (
            <>
              <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {(current.item.ex || `___ means ${current.item.e}`)
                  .replace(new RegExp(current.item.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')}
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>Meaning: {current.item.e}</p>
            </>
          )}

          {/* Audio: listen and type */}
          {vocabVariant.variant === 'audio' && (
            <div className="text-center mb-4">
              <button onClick={() => speak(current.item.m)} className="px-6 py-3 rounded-2xl font-bold text-sm mb-2"
                style={{ background: 'var(--color-accent2)', color: '#fff' }}>
                🔊 Play Sound
              </button>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Meaning: {current.item.e}</p>
            </div>
          )}

          {/* Produce: English + context → type Malay */}
          {vocabVariant.variant === 'produce' && (
            <>
              <p className="text-center text-xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>{current.item.e}</p>
              {current.item.ex && (
                <div className="p-3 rounded-xl mb-3 text-sm italic"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
                  {current.item.ex.replace(new RegExp(current.item.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')}
                </div>
              )}
            </>
          )}

          {/* Shared input + check */}
          <input type="text" value={variantInput} onChange={e => setVariantInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVariantCheck()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type the Malay word..." autoFocus />
          <button onClick={handleVariantCheck} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>

          {variantFb && (
            <div className="mt-3 flex items-center gap-2 justify-center text-sm font-bold"
              style={{ color: variantFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {variantFb.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {variantFb.correct ? 'Betul!' : `Jawapan: ${variantFb.answer}`}
            </div>
          )}
          {elaborative && <ElaborativeFeedback feedback={elaborative} />}
        </div>
      )}

      {/* GRAMMAR ITEM (imbuhan/passive/suffix) */}
      {current.type === 'grammar' && current.item.type !== undefined && !current.item.options && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-center text-2xl font-bold mb-1">{current.item.root || current.item.active || current.item.sentence}</p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{current.item.hint}</p>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGrammarCheck()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type your answer..." autoFocus />
          <button onClick={handleGrammarCheck} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>
          {feedback && (
            <div className="mt-3 flex items-center gap-2 justify-center text-sm font-bold"
              style={{ color: feedback.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {feedback.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {feedback.correct ? 'Betul!' : `Jawapan: ${feedback.answer}`}
            </div>
          )}
          {elaborative && <ElaborativeFeedback feedback={elaborative} />}
        </div>
      )}

      {/* GRAMMAR ITEM (tense — has options) */}
      {current.type === 'grammar' && current.item.options && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-center text-lg font-bold mb-2">{current.item.sentence}</p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{current.item.translation}</p>
          <div className="grid grid-cols-2 gap-2">
            {current.item.options.map(opt => (
              <button key={opt} onClick={() => handleTenseCheck(opt)}
                className="p-3 rounded-xl text-sm font-semibold"
                style={{
                  background: feedback ? (opt === current.item.answer ? 'rgba(0,230,118,0.15)' : 'var(--color-card2)') : 'var(--color-card2)',
                  border: '2px solid ' + (feedback && opt === current.item.answer ? 'var(--color-green)' : 'var(--color-border)'),
                  color: 'var(--color-text)',
                }}>{opt}</button>
            ))}
          </div>
          {feedback && (
            <p className="text-center text-xs mt-3 font-bold" style={{ color: feedback.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {feedback.correct ? 'Betul!' : `Jawapan: ${feedback.answer}`}
            </p>
          )}
          {elaborative && <ElaborativeFeedback feedback={elaborative} />}
        </div>
      )}

      {/* COMPREHENSION ITEM (cloze) */}
      {current.type === 'comprehension' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--color-cyan)' }}>Fill in the blank</p>
          <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {(current.item.ex || `${current.item.m} means ${current.item.e}`)
              .replace(new RegExp(current.item.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')}
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>Hint: {current.item.e}</p>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCompCheck()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Fill in the blank..." autoFocus />
          <button onClick={handleCompCheck} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>
          {feedback && (
            <div className="mt-3 flex items-center gap-2 justify-center text-sm font-bold"
              style={{ color: feedback.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {feedback.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {feedback.correct ? 'Correct!' : `Answer: ${feedback.answer}`}
            </div>
          )}
        </div>
      )}

      {/* Cancel */}
      <button onClick={onClose} className="w-full text-center text-xs py-2"
        style={{ color: 'var(--color-dim)' }}>
        End Session
      </button>
    </div>
  )
}
