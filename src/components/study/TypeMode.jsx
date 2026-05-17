import { useState } from 'react'
import { Rating } from '../../lib/fsrs'
import ConfidenceSlot from './ConfidenceSlot'
import WrongExtras from './WrongExtras'

export default function TypeMode({ card, session }) {
  const [input, setInput] = useState('')
  const [fb, setFb] = useState(null)

  const check = () => {
    const trimmed = input.trim().toLowerCase()
    if (!trimmed) return
    const correct = trimmed === card.e.toLowerCase() ||
      card.e.toLowerCase().includes(trimmed)
    setFb({ correct, answer: card.e })
    session.rate(correct ? Rating.Good : Rating.Again)
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-center text-xl font-bold mb-1">{card.m}</p>
      <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>Type the English meaning</p>
      <ConfidenceSlot shouldShow={!fb} confidence={session.confidence} onSelect={session.setConfidence} />
      <input type="text" value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()}
        className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
        style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
        placeholder="Type meaning..." autoFocus />
      <button onClick={check} className="w-full p-3 rounded-xl font-bold text-sm text-black"
        style={{ background: 'var(--color-green)' }}>Check</button>
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
        />
      )}
    </div>
  )
}
