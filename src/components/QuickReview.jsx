import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Volume2, ArrowRight, Zap } from 'lucide-react'
import useStore from '../store/useStore'
import { getDueCards, Rating } from '../lib/fsrs'
import { speak } from '../lib/speech'

const MAX_QUICK = 5

export default function QuickReview() {
  const navigate = useNavigate()
  const cards = useStore(s => s.cards)
  const reviewCardAction = useStore(s => s.reviewCardAction)
  const updateStreak = useStore(s => s.updateStreak)

  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)

  const due = getDueCards(cards)
  if (due.length === 0 || done >= MAX_QUICK) return null

  const card = due[idx % due.length]
  if (!card) return null

  const rate = (rating) => {
    reviewCardAction(card.m, rating)
    updateStreak()
    setFlipped(false)
    setDone(d => d + 1)
    setIdx(i => i + 1)
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Zap size={14} style={{ color: 'var(--color-accent)' }} /> Quick Review
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
          {done}/{MAX_QUICK}
        </span>
      </div>

      {/* Mini card */}
      <div className="cursor-pointer rounded-xl p-4 text-center mb-3 transition-all"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', minHeight: 80 }}
        onClick={() => setFlipped(!flipped)}>
        {!flipped ? (
          <div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-lg font-bold">{card.m}</p>
              <button onClick={e => { e.stopPropagation(); speak(card.m) }}
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ color: 'var(--color-cyan)' }}>
                <Volume2 size={12} />
              </button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-dim)' }}>tap to reveal</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{card.e}</p>
            {card.ex && <p className="text-[10px] italic mt-1" style={{ color: 'var(--color-dim)' }}>{card.ex}</p>}
          </div>
        )}
      </div>

      {/* Rating buttons (compact) */}
      {flipped && (
        <div className="flex gap-1.5">
          {[
            { rating: Rating.Again, label: 'Again', color: 'var(--color-red)' },
            { rating: Rating.Good, label: 'Good', color: 'var(--color-blue)' },
            { rating: Rating.Easy, label: 'Easy', color: 'var(--color-green)' },
          ].map(r => (
            <button key={r.rating} onClick={() => rate(r.rating)}
              className="flex-1 py-2 rounded-lg font-bold text-xs text-white"
              style={{ background: r.color }}>
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Open full study link */}
      <button onClick={() => navigate('/study')}
        className="w-full mt-2 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1"
        style={{ color: 'var(--color-dim)' }}>
        Open full study <ArrowRight size={10} />
      </button>
    </div>
  )
}
