import { useState } from 'react'
import { Rating } from '../../lib/fsrs'
import { speak } from '../../lib/speech'
import ConfidenceSlot from './ConfidenceSlot'
import WrongExtras from './WrongExtras'

export default function ListenMode({ card, session }) {
  const [input, setInput] = useState('')
  const [fb, setFb] = useState(null)

  const check = () => {
    const correct = input.trim().toLowerCase() === card.m.toLowerCase()
    setFb({ correct, answer: card.m })
    if (correct) session.rate(Rating.Good)
  }

  const reveal = () => {
    setFb({ correct: false, answer: card.m })
    setTimeout(session.nextCard, 2000)
  }

  return (
    <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm mb-4" style={{ color: 'var(--color-dim)' }}>Listen and type the Malay word</p>
      <button onClick={() => speak(card.m)} className="px-8 py-4 rounded-2xl font-bold text-lg mb-4"
        style={{ background: 'var(--color-accent2)', color: '#fff' }}>
        🔊 Play Sound
      </button>
      <ConfidenceSlot shouldShow={!fb} confidence={session.confidence} onSelect={session.setConfidence} />
      <input type="text" value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()}
        className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
        style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
        placeholder="Type what you hear..." autoFocus />
      <div className="flex gap-2">
        <button onClick={check} className="flex-1 p-3 rounded-xl font-bold text-sm text-black"
          style={{ background: 'var(--color-green)' }}>Check</button>
        <button onClick={reveal}
          className="flex-1 p-3 rounded-xl font-bold text-sm"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>Reveal</button>
      </div>
      {fb && (
        <p className="mt-3 text-sm font-bold" style={{ color: fb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
          {fb.correct ? `✅ ${card.m} = ${card.e}` : `💡 ${fb.answer} = ${card.e}`}
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
