// Renders the "Why?" reason-tag chips and the optional "you were sure
// but wrong" callout shown after a wrong answer in any study mode.
//
// `pendingWrongWord` and `tagReason` come from useStudySession; the mode
// component decides whether to mount this based on its own feedback
// state (typically `fb && !fb.correct`).

const REASON_CHIPS = [
  { id: 'unknown', label: 'Didn’t know', emoji: '\u{1F937}' },
  { id: 'confused', label: 'Confused with another', emoji: '\u{1F501}' },
  { id: 'typo', label: 'Typo', emoji: '✏️' },
  { id: 'misread', label: 'Misread', emoji: '\u{1F441}️' },
]

export default function WrongExtras({ pendingWrongWord, hypercorrect, reasonTagged, onTagReason, answer }) {
  if (!pendingWrongWord) return null
  return (
    <div className="mt-3 space-y-2">
      {hypercorrect && (
        <div className="rounded-xl p-3 text-xs leading-relaxed"
          style={{ background: 'rgba(255,145,0,0.12)', border: '1px solid rgba(255,145,0,0.3)', color: 'var(--color-orange)' }}>
          <span className="font-bold">⚠️ You were sure, but it was wrong.</span> These are the most fixable errors — your brain noticed the gap. Lock in the correct answer:
          {answer && (
            <div data-testid="hypercorrect-answer"
              className="mt-2 px-3 py-2 rounded-lg text-center text-base font-bold"
              style={{ background: 'var(--color-surface)', border: '1px solid rgba(255,145,0,0.4)', color: 'var(--color-text)' }}>
              {answer}
            </div>
          )}
        </div>
      )}
      <div>
        <p className="text-[10px] mb-1.5" style={{ color: 'var(--color-dim)' }}>Why?</p>
        <div className="flex flex-wrap gap-1.5">
          {REASON_CHIPS.map(c => (
            <button key={c.id} onClick={() => onTagReason(c.id)} disabled={reasonTagged !== null}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: reasonTagged === c.id ? 'var(--color-accent)' : 'var(--color-card2)',
                border: '1px solid ' + (reasonTagged === c.id ? 'var(--color-accent)' : 'var(--color-border)'),
                color: reasonTagged === c.id ? '#fff' : 'var(--color-dim)',
              }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
