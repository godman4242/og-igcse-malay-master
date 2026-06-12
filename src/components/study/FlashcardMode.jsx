import { useState, useEffect } from 'react'
import { Volume2, Mic, MicOff } from 'lucide-react'
import { Rating, State } from '../../lib/fsrs'
import { speak, startKeywordSpotter, hasSpeechRecognition } from '../../lib/speech'
import { VARIANT_INFO } from '../../data/drillVariants'
import DictionaryIcon from '../DictionaryIcon'
import FeedbackLive from '../FeedbackLive'

// Shared announce line for the four typed answer sub-modes (WCAG 4.1.3).
const answerAnnounce = (fb) =>
  fb ? (fb.correct ? 'Correct!' : `Not quite — the answer is ${fb.answer}`) : ''

const RATING_LABELS = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }

const STATE_LABELS = {
  [State.New]: { label: 'New', color: 'var(--color-blue)' },
  [State.Learning]: { label: 'Learning', color: 'var(--color-orange)' },
  [State.Review]: { label: 'Review', color: 'var(--color-green)' },
  [State.Relearning]: { label: 'Relearn', color: 'var(--color-red)' },
}

// Owns 5 sub-modes (standard / hint / reverse / cloze / audio / produce)
// dispatched off the FSRS-driven `cardVariant` from useStudySession.
export default function FlashcardMode({ card, session }) {
  const [flipped, setFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [reverseInput, setReverseInput] = useState('')
  const [reverseFb, setReverseFb] = useState(null)
  const [adaptClozeInput, setAdaptClozeInput] = useState('')
  const [adaptClozeFb, setAdaptClozeFb] = useState(null)
  const [audioInput, setAudioInput] = useState('')
  const [audioFb, setAudioFb] = useState(null)
  const [produceInput, setProduceInput] = useState('')
  const [produceFb, setProduceFb] = useState(null)
  const [spotterOn, setSpotterOn] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastMatch, setLastMatch] = useState(null)
  // React 19 "adjust state on prop change" pattern — synchronously reset
  // per-card UI state when the card prop changes. Cheaper than remounting
  // the component (which would also blow away spotterOn / isSpeaking).
  const [prevCardKey, setPrevCardKey] = useState(card?.m)
  if (card?.m !== prevCardKey) {
    setPrevCardKey(card?.m)
    setFlipped(false)
    setShowHint(false)
    setLastMatch(null)
  }

  const { cardVariant, scheduling, vocabTip, rate, nextCard } = session
  const variantInfo = VARIANT_INFO[cardVariant.variant]
  const stateInfo = STATE_LABELS[card?.state ?? 0] || STATE_LABELS[0]

  const checkReverse = () => {
    if (reverseFb) return
    const correct = reverseInput.trim().toLowerCase() === card.m.toLowerCase()
    setReverseFb({ correct, answer: card.m })
    rate(correct ? Rating.Good : Rating.Again)
  }
  const checkAdaptCloze = () => {
    if (adaptClozeFb) return
    const correct = adaptClozeInput.trim().toLowerCase() === card.m.toLowerCase()
    setAdaptClozeFb({ correct, answer: card.m })
    rate(correct ? Rating.Good : Rating.Again)
  }
  const checkAudio = () => {
    if (audioFb) return
    const correct = audioInput.trim().toLowerCase() === card.m.toLowerCase()
    setAudioFb({ correct, answer: card.m })
    rate(correct ? Rating.Good : Rating.Again)
  }
  const checkProduce = () => {
    if (produceFb) return
    const correct = produceInput.trim().toLowerCase() === card.m.toLowerCase()
    setProduceFb({ correct, answer: card.m })
    rate(correct ? Rating.Good : Rating.Again)
  }

  // Keyboard shortcuts (only active while this component is mounted,
  // i.e. while mode === 'fc'). Standard / hint variant only.
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (!card) return
      if (cardVariant.variant !== 'standard' && cardVariant.variant !== 'hint') return
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f) }
      if (e.key === '1') rate(Rating.Again)
      if (e.key === '2') rate(Rating.Hard)
      if (e.key === '3') rate(Rating.Good)
      if (e.key === '4') rate(Rating.Easy)
      if (e.key === 'ArrowRight' || e.key === 'n') nextCard()
      if (e.key === 's') speakCard()
    }
    const speakCard = () => speak(card.m, 'ms-MY', 0.85, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    })
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [card, cardVariant.variant, rate, nextCard])

  // Speak-to-rate: continuous keyword spotter runs only while the answer is
  // visible (flipped=true) on standard/hint variants, the student has opted
  // in via the mic toggle, and TTS is not actively reading the card aloud
  // (gated on `isSpeaking`, which `speak()`'s onStart/onEnd flip). Stops
  // immediately on flip-back, card change, variant change, unmount, or
  // when the student presses a rating button by hand.
  useEffect(() => {
    if (!spotterOn || !flipped || isSpeaking) return
    if (cardVariant.variant !== 'standard' && cardVariant.variant !== 'hint') return
    if (!hasSpeechRecognition()) return

    const ctl = startKeywordSpotter({
      onMatch: (rating) => {
        setLastMatch(rating)
        rate(rating)
      },
      onError: () => setSpotterOn(false),
    })
    return () => ctl.stop()
  }, [spotterOn, flipped, isSpeaking, cardVariant.variant, card?.m, rate])

  if (!card) return null

  return (
    <div>
      {cardVariant.variant !== 'standard' && (
        <div className="flex justify-center mb-2">
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold"
            style={{ background: `${variantInfo.color}15`, color: variantInfo.color }}>
            {variantInfo.badge} — {variantInfo.desc}
          </span>
        </div>
      )}

      {(cardVariant.variant === 'standard' || cardVariant.variant === 'hint') && (
        <>
          <div className="perspective cursor-pointer" style={{ height: 260 }} onClick={() => setFlipped(!flipped)}>
            <div className={`w-full h-full relative preserve-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}
              style={{ borderRadius: 14 }}>
              <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-5 rounded-2xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <span className="absolute top-2 right-3 text-[10px] px-2 py-0.5 rounded-full text-white"
                  style={{ background: stateInfo.color }}>
                  {stateInfo.label}
                </span>
                <button className="absolute bottom-2 right-3 w-7 h-7 rounded-full flex items-center justify-center border"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-cyan)' }}
                  onClick={e => {
                    e.stopPropagation()
                    speak(card.m, 'ms-MY', 0.85, {
                      onStart: () => setIsSpeaking(true),
                      onEnd: () => setIsSpeaking(false),
                      onError: () => setIsSpeaking(false),
                    })
                  }}>
                  <Volume2 size={14} />
                </button>
                <DictionaryIcon word={card.m} meaning={card.e} size={56} className="mb-2" />
                <p className="text-2xl font-bold text-center mb-1">{card.m}</p>
                <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{card.t}</p>
                {cardVariant.variant === 'hint' && !showHint && !flipped && (
                  <button onClick={e => { e.stopPropagation(); setShowHint(true) }}
                    className="mt-2 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-card2)', color: 'var(--color-cyan)', border: '1px solid var(--color-border)' }}>
                    Show hint
                  </button>
                )}
                {showHint && !flipped && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-cyan)' }}>
                    Starts with: {card.e.charAt(0).toUpperCase()}...
                  </p>
                )}
                <p className="text-xs mt-auto" style={{ color: 'var(--color-dim)' }}>tap to flip</p>
              </div>
              <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-5 rounded-2xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <p className="text-xl font-bold text-center mb-2" style={{ color: 'var(--color-accent)' }}>{card.e}</p>
                {card.ex && <p className="text-xs text-center italic" style={{ color: 'var(--color-dim)' }}>{card.ex}</p>}
              </div>
            </div>
          </div>
          {hasSpeechRecognition() && (
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                onClick={() => setSpotterOn(v => !v)}
                aria-pressed={spotterOn}
                aria-label={spotterOn ? 'Disable speak-to-rate' : 'Enable speak-to-rate'}
                title={spotterOn ? 'Speak Again / Hard / Good / Easy' : 'Tap to rate by voice'}
                className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-full font-bold transition-all"
                style={{
                  background: spotterOn ? 'var(--color-accent2)' : 'var(--color-card2)',
                  color: spotterOn ? '#fff' : 'var(--color-dim)',
                  border: '1px solid var(--color-border)',
                  boxShadow: spotterOn && flipped && !isSpeaking ? '0 0 12px rgba(124,77,255,0.45)' : 'none',
                }}>
                {spotterOn
                  ? <Mic size={12} className={flipped && !isSpeaking ? 'animate-pulse' : ''} />
                  : <MicOff size={12} />}
                <span>{spotterOn ? 'Voice on' : 'Voice rate'}</span>
              </button>
              {spotterOn && flipped && !isSpeaking && (
                <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                  Say: <strong style={{ color: 'var(--color-red)' }}>Again</strong> ·{' '}
                  <strong style={{ color: 'var(--color-orange)' }}>Hard</strong> ·{' '}
                  <strong style={{ color: 'var(--color-blue)' }}>Good</strong> ·{' '}
                  <strong style={{ color: 'var(--color-green)' }}>Easy</strong>
                </span>
              )}
              {spotterOn && isSpeaking && (
                <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                  Listening paused while reading…
                </span>
              )}
              {spotterOn && !flipped && !isSpeaking && (
                <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                  Flip the card to grade by voice
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-center mt-2">
            {[
              { rating: Rating.Again, label: 'Again', color: 'var(--color-red)' },
              { rating: Rating.Hard, label: 'Hard', color: 'var(--color-orange)' },
              { rating: Rating.Good, label: 'Good', color: 'var(--color-blue)' },
              { rating: Rating.Easy, label: 'Easy', color: 'var(--color-green)' },
            ].map(r => (
              <button key={r.rating} onClick={() => rate(r.rating)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex flex-col items-center gap-0.5 transition-all"
                style={{
                  background: r.color,
                  boxShadow: lastMatch === r.rating ? `0 0 14px ${r.color}` : 'none',
                  transform: lastMatch === r.rating ? 'scale(1.04)' : 'none',
                }}>
                <span>{r.label}{lastMatch === r.rating ? ' 🎤' : ''}</span>
                {scheduling && scheduling[r.rating] && (
                  <span className="text-[10px] font-normal opacity-80">
                    {scheduling[r.rating].interval_display}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {cardVariant.variant === 'reverse' && (
        <div className="rounded-2xl p-5 relative" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <span className="absolute top-2 right-3 text-[10px] px-2 py-0.5 rounded-full text-white"
            style={{ background: stateInfo.color }}>{stateInfo.label}</span>
          <p className="text-center text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-orange)' }}>
            English → Malay
          </p>
          <p className="text-center text-2xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>{card.e}</p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{card.t}</p>
          <input type="text" value={reverseInput} onChange={e => setReverseInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkReverse()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type the Malay word..." autoFocus />
          <button onClick={checkReverse} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>
          <FeedbackLive text={answerAnnounce(reverseFb)} />
          {reverseFb && (
            <p className="text-center mt-3 text-sm font-bold" style={{ color: reverseFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {reverseFb.correct ? '✅ Correct!' : `❌ ${reverseFb.answer}`}
            </p>
          )}
        </div>
      )}

      {cardVariant.variant === 'cloze' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-center text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-purple)' }}>
            Fill in the blank
          </p>
          <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {(card.ex || `___ means ${card.e}`)
              .replace(new RegExp(card.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')}
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>Meaning: {card.e}</p>
          <input type="text" value={adaptClozeInput} onChange={e => setAdaptClozeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkAdaptCloze()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type the missing word..." autoFocus />
          <button onClick={checkAdaptCloze} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>
          <FeedbackLive text={answerAnnounce(adaptClozeFb)} />
          {adaptClozeFb && (
            <p className="text-center mt-3 text-sm font-bold" style={{ color: adaptClozeFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {adaptClozeFb.correct ? '✅ Correct!' : `❌ ${adaptClozeFb.answer}`}
            </p>
          )}
        </div>
      )}

      {cardVariant.variant === 'audio' && (
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--color-green)' }}>
            Audio Only — Listen & Type
          </p>
          <button onClick={() => speak(card.m)} className="px-8 py-4 rounded-2xl font-bold text-lg mb-4"
            style={{ background: 'var(--color-accent2)', color: '#fff' }}>
            🔊 Play Sound
          </button>
          <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>Meaning: {card.e}</p>
          <input type="text" value={audioInput} onChange={e => setAudioInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkAudio()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type what you hear..." autoFocus />
          <button onClick={checkAudio} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>
          <FeedbackLive text={answerAnnounce(audioFb)} />
          {audioFb && (
            <p className="mt-3 text-sm font-bold" style={{ color: audioFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {audioFb.correct ? `✅ ${card.m}` : `❌ ${audioFb.answer}`}
            </p>
          )}
        </div>
      )}

      {cardVariant.variant === 'produce' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-center text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-red)' }}>
            Produce in Context
          </p>
          <p className="text-center text-xl font-bold mb-1" style={{ color: 'var(--color-accent)' }}>{card.e}</p>
          {card.ex && (
            <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed italic"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              {card.ex.replace(new RegExp(card.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')}
            </div>
          )}
          <input type="text" value={produceInput} onChange={e => setProduceInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkProduce()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type the Malay word..." autoFocus />
          <button onClick={checkProduce} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>Check</button>
          <FeedbackLive text={answerAnnounce(produceFb)} />
          {produceFb && (
            <p className="text-center mt-3 text-sm font-bold" style={{ color: produceFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {produceFb.correct ? '✅ Correct!' : `❌ ${produceFb.answer}`}
            </p>
          )}
        </div>
      )}

      {vocabTip && (
        <div className="mt-2 px-3 py-2 rounded-xl text-xs" style={{
          background: 'rgba(68,138,255,0.06)',
          border: '1px solid rgba(68,138,255,0.2)',
          color: 'var(--color-blue)',
        }}>
          <span className="font-bold">Tip: </span>{vocabTip}
        </div>
      )}
    </div>
  )
}
