import { useState } from 'react'
import { Rating } from '../../lib/fsrs'
import { blankInExample } from '../../lib/blankWord'
import ConfidenceSlot from './ConfidenceSlot'
import WrongExtras from './WrongExtras'
import FeedbackLive from '../FeedbackLive'

// Produce mode — the SELECTABLE productive-recall drill (active production beats
// recognition, the app's #1 principle). Shows the gloss (card.e) and asks the
// learner to PRODUCE the target word (card.m) — the same direction as
// FlashcardMode's reverse/produce variants, but available for ANY card instead
// of only when the FSRS variant engine serves a Strong/Mature card.
//
// Direction flips by card.lang (mirrors FlashcardMode reverse :255/:263):
//   - ms card (card.e = English gloss) → show English, "Type the Malay word…"
//   - en card (card.e = Malay gloss)   → show Malay,   "Type the English word…"
// Grading is an EXACT trim+lowercase match vs card.m (production demands the
// precise word — not TypeMode's lenient includes()).
export default function ProduceMode({ card, session }) {
  const [input, setInput] = useState('')
  const [fb, setFb] = useState(null)
  const [showHint, setShowHint] = useState(false)

  const isEn = card.lang === 'en'
  // A usable example sentence (the repo's own cloze/produce threshold,
  // drillVariants.js selectVariantSafe) → show a blanked context line.
  const hasContext = !!card.ex && card.ex.length > 10
  const blanked = hasContext ? blankInExample(card.ex, card.m) : ''

  const check = () => {
    if (fb) return
    const trimmed = input.trim().toLowerCase()
    if (!trimmed) return
    const correct = trimmed === card.m.toLowerCase()
    setFb({ correct, answer: card.m })
    session.rate(correct ? Rating.Good : Rating.Again)
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-center text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-red)' }}>
        Produce — {isEn ? 'Malay → English' : 'English → Malay'}
      </p>
      <p className="text-center text-2xl font-bold mb-1" data-testid="produce-gloss" style={{ color: 'var(--color-accent)' }}>{card.e}</p>
      <p className="text-center text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{card.t}</p>

      {hasContext && (
        <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed italic" data-testid="produce-context"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          {blanked}
        </div>
      )}

      <ConfidenceSlot shouldShow={!fb} confidence={session.confidence} onSelect={session.setConfidence} />

      <input type="text" value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()}
        className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
        style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
        placeholder={isEn ? 'Type the English word...' : 'Type the Malay word...'} autoFocus />

      <button onClick={check} className="w-full p-3 rounded-xl font-bold text-sm"
        style={{ background: 'var(--color-green)', color: 'var(--color-on-bright)' }}>Check</button>

      {!fb && !showHint && (
        <button onClick={() => setShowHint(true)} className="w-full mt-2 p-2 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--color-card2)', color: 'var(--color-cyan)', border: '1px solid var(--color-border)' }}>
          Show first letter
        </button>
      )}
      {!fb && showHint && (
        <p className="text-center mt-2 text-xs" data-testid="produce-hint" style={{ color: 'var(--color-cyan)' }}>
          Starts with: {card.m.charAt(0)}…
        </p>
      )}

      <FeedbackLive text={fb ? (fb.correct ? 'Correct!' : `Not quite — the answer is ${fb.answer}`) : ''} />
      {fb && (
        <p className="text-center mt-3 text-sm font-bold" style={{ color: fb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
          {fb.correct ? '✅ Correct!' : `❌ ${fb.answer}`}
        </p>
      )}
      {fb && !fb.correct && (
        <WrongExtras
          pendingWrongWord={session.pendingWrongWord}
          hypercorrect={session.hypercorrect}
          reasonTagged={session.reasonTagged}
          onTagReason={session.tagReason}
          answer={fb.answer}
        />
      )}
    </div>
  )
}
