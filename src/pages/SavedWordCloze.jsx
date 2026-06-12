import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PencilLine, ArrowRight } from 'lucide-react'
import useStore from '../store/useStore'
import { makeClozeItem } from '../lib/clozeBuilder'
import { Rating } from '../lib/fsrs'
import { fireConfetti } from '../lib/confetti'
import EmptyState from '../components/EmptyState'
import Meta from '../components/Meta'

// "Practise saved words" — a focused PRODUCTIVE-retrieval session over the words
// the learner personally captured (the 'Saved' deck). Each word is blanked
// inside its own example sentence so the learner *produces* it (generation
// effect, d≈0.40) rather than recognises it. These are real FSRS cards, so a
// rating feeds the existing scheduler via reviewCardAction:
//   "Got it"           → Rating.Good
//   "Needed the answer"→ Rating.Hard  (NOT Again — Again auto-logs a vocab
//                                      mistake; a reveal shouldn't)
// Built deliberately self-contained (NOT on useStudySession) so it can't
// regress the Study-page ClozeMode. Spec: docs/superpowers/specs/
// 2026-06-03-learning-roadmap-and-trackb.md §3 · plan: …/plans/2026-06-03-generative-cloze.md

export default function SavedWordCloze() {
  const navigate = useNavigate()
  const reviewCardAction = useStore(s => s.reviewCardAction)
  const updateStreak = useStore(s => s.updateStreak)
  const addStudyMinutes = useStore(s => s.addStudyMinutes)

  // Snapshot the queue ONCE at mount — rating a card mutates the store, and a
  // live re-filter would reshuffle the session mid-flow. Read cards via
  // getState() (not a reactive selector) so reviews don't re-render this page;
  // local state (idx/revealed) drives all transitions.
  const [entries] = useState(() =>
    useStore.getState().cards
      .filter(c => c.t === 'Saved')
      .map(c => ({ card: c, q: makeClozeItem(c) }))
      .filter(e => e.q),
  )
  const [startTime] = useState(() => Date.now())

  const [idx, setIdx] = useState(0)
  const [attempt, setAttempt] = useState('')
  const [revealed, setRevealed] = useState(null) // null | { correct: boolean }
  const [stats, setStats] = useState({ gotIt: 0, needed: 0 })
  const [done, setDone] = useState(false)

  if (!entries.length) {
    return (
      <EmptyState
        icon="📝"
        title="No saved words yet"
        body="Save words as you read (tap-select any Malay word to translate and keep it), then come back to produce them in context."
        cta={{ label: 'Import words', onClick: () => navigate('/import') }}
      />
    )
  }

  if (done) {
    const total = stats.gotIt + stats.needed
    return (
      <div className="space-y-4 animate-fadeUp">
        <Meta title="Practise saved words | IGCSE Malay Master" />
        <div className="rounded-2xl p-6 text-center"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-lg font-bold mb-1">Nice work!</h2>
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
            Practised {total} saved {total === 1 ? 'word' : 'words'}
          </p>
          <div className="flex justify-center gap-6 mt-4 text-center text-xs">
            <div><div className="text-xl font-bold" style={{ color: 'var(--color-green)' }}>{stats.gotIt}</div><div style={{ color: 'var(--color-dim)' }}>GOT IT</div></div>
            <div><div className="text-xl font-bold" style={{ color: 'var(--color-orange)' }}>{stats.needed}</div><div style={{ color: 'var(--color-dim)' }}>REVEALED</div></div>
          </div>
        </div>
        <button onClick={() => navigate('/practice')}
          className="w-full p-3 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>
          Back to Practice
        </button>
      </div>
    )
  }

  const { card, q } = entries[idx]

  const check = () => {
    if (revealed) return
    const correct = attempt.trim().toLowerCase() === q.answer.toLowerCase()
    setRevealed({ correct })
  }

  const showAnswer = () => {
    if (revealed) return
    setRevealed({ correct: false })
  }

  const rate = (rating) => {
    reviewCardAction(card.m, card.t, rating)
    const gotIt = rating === Rating.Good
    const nextStats = {
      gotIt: stats.gotIt + (gotIt ? 1 : 0),
      needed: stats.needed + (gotIt ? 0 : 1),
    }
    setStats(nextStats)

    if (idx + 1 >= entries.length) {
      // Session end — count it toward the streak/daily goal, the same way Study
      // does (reviewCardAction alone does NOT bump streak/minutes/XP).
      updateStreak()
      addStudyMinutes(Math.max(1, Math.round((Date.now() - startTime) / 60000)))
      fireConfetti(3000)
      setDone(true)
      return
    }
    setIdx(idx + 1)
    setAttempt('')
    setRevealed(null)
  }

  // Cloze sentence renderer: blank before reveal, answer underlined after.
  const renderSentence = () => {
    if (q.kind !== 'cloze') return null
    const before = q.sentence.slice(0, q.blankStart)
    const word = q.sentence.slice(q.blankStart, q.blankEnd)
    const after = q.sentence.slice(q.blankEnd)
    return (
      <div className="p-3 rounded-xl mb-3 text-sm leading-relaxed"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {before}
        {revealed
          ? <span style={{ color: 'var(--color-green)', fontWeight: 700, textDecoration: 'underline' }}>{word}</span>
          : <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>_____</span>}
        {after}
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      <Meta title="Practise saved words | IGCSE Malay Master"
        description="Produce your saved Malay words in context — a generative retrieval session that feeds your spaced-repetition schedule." />

      {/* Progress */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-dim)' }}>
        <span className="font-semibold flex items-center gap-1.5"><PencilLine size={14} /> Practise saved words</span>
        <span>{idx + 1} / {entries.length}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(idx / entries.length) * 100}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-green))' }} />
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3">
          {q.kind === 'cloze' ? 'Fill in the missing word' : 'Produce the Malay word'}
        </h3>

        {renderSentence()}

        <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>
          {q.kind === 'cloze' ? 'Meaning' : 'English'}: <span style={{ color: 'var(--color-text)' }}>{q.clue}</span>
        </p>

        <input type="text" value={attempt} onChange={e => setAttempt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          disabled={!!revealed}
          aria-label="Type the Malay word"
          className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
          placeholder="Type the Malay word…" autoFocus />

        {!revealed ? (
          <div className="flex gap-2">
            <button onClick={check} className="flex-1 p-3 rounded-xl font-bold text-sm text-black"
              style={{ background: 'var(--color-green)' }}>Check</button>
            <button onClick={showAnswer} className="flex-1 p-3 rounded-xl font-bold text-sm"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Show answer
            </button>
          </div>
        ) : (
          <>
            <p className="text-center mb-3 text-sm font-bold"
              style={{ color: revealed.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {revealed.correct ? '✅ Correct!' : `Answer: ${q.answer}`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => rate(Rating.Good)} className="flex-1 p-3 rounded-xl font-bold text-sm text-black"
                style={{ background: revealed.correct ? 'var(--color-green)' : 'var(--color-card2)', color: revealed.correct ? '#000' : 'var(--color-dim)', border: revealed.correct ? 'none' : '1px solid var(--color-border)' }}>
                Got it
              </button>
              <button onClick={() => rate(Rating.Hard)} className="flex-1 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
                style={{ background: revealed.correct ? 'var(--color-card2)' : 'var(--color-orange)', color: revealed.correct ? 'var(--color-dim)' : '#000', border: revealed.correct ? '1px solid var(--color-border)' : 'none' }}>
                Needed the answer <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
