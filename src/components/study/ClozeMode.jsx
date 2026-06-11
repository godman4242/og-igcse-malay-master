import { useState } from 'react'
import { Rating } from '../../lib/fsrs'
import ConfidenceSlot from './ConfidenceSlot'
import WrongExtras from './WrongExtras'

export default function ClozeMode({ card, session }) {
  const [input, setInput] = useState('')
  const [fb, setFb] = useState(null)

  const sentence = (card.ex || `${card.m} means ${card.e}`)
    .replace(new RegExp(card.m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____')

  const check = () => {
    const correct = input.trim().toLowerCase() === card.m.toLowerCase()
    setFb({ correct, answer: card.m })
    session.rate(correct ? Rating.Good : Rating.Again)
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-3">Fill in the blank</h3>
      <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {sentence}
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>Hint: {card.e}</p>
      <ConfidenceSlot shouldShow={!fb} confidence={session.confidence} onSelect={session.setConfidence} />
      <input type="text" value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()}
        className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
        style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
        placeholder="Fill in the blank..." autoFocus />
      <div className="flex gap-2">
        <button onClick={check} className="flex-1 p-3 rounded-xl font-bold text-sm text-black"
          style={{ background: 'var(--color-green)' }}>Check</button>
        <button onClick={session.nextCard} className="flex-1 p-3 rounded-xl font-bold text-sm"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>Skip</button>
      </div>
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
