import { useState } from 'react'
import { Rating } from '../../lib/fsrs'
import { generateQuizOptions } from '../../lib/study/quizOptions'
import DICTIONARY from '../../data/dictionary'
import ConfidenceSlot from './ConfidenceSlot'
import WrongExtras from './WrongExtras'
import FeedbackLive from '../FeedbackLive'

export default function QuizMode({ card, cardIdx, session }) {
  const [fb, setFb] = useState(null)
  const opts = generateQuizOptions(card, cardIdx, DICTIONARY)

  const check = (answer) => {
    if (fb) return
    const correct = answer === card.e
    setFb({ correct, answer: card.e })
    session.rate(correct ? Rating.Good : Rating.Again)
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-center text-xl font-bold mb-1">{card.m}</p>
      <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>Choose the correct meaning</p>
      <ConfidenceSlot shouldShow={!fb} confidence={session.confidence} onSelect={session.setConfidence} />
      <div className="grid grid-cols-2 gap-2">
        {opts.map((opt, i) => (
          <button key={i} onClick={() => check(opt)}
            className="p-3 rounded-xl text-sm font-medium text-left transition-all"
            style={{
              background: fb ? (opt === card.e ? 'rgba(0,230,118,0.15)' : fb.answer !== opt ? 'var(--color-card2)' : 'rgba(255,82,82,0.15)') : 'var(--color-card2)',
              border: '2px solid ' + (fb && opt === card.e ? 'var(--color-green)' : 'var(--color-border)'),
              color: 'var(--color-text)',
            }}>
            {opt}
          </button>
        ))}
      </div>
      <FeedbackLive text={fb ? (fb.correct ? 'Correct!' : `Not quite — the correct meaning is ${fb.answer}`) : ''} />
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
