import { useRef } from 'react'
import { X, BookOpen } from 'lucide-react'
import { masteredCards } from '../../lib/fsrs'
import { useFocusTrap } from '../../lib/useFocusTrap'

// "Mastered words" review panel — opened from the Dashboard "Mastered: N" tile.
// Honors the tile's promise (the audit found it silently jumped into the
// due-review session) and serves the motivation/identity pillar: a calm,
// scrollable look at what you've already learned. Lazy-loaded by Dashboard so
// it adds zero weight to the eager cold-load chunk. `cards` is the already
// studyLang-scoped deck, so the list length matches the tile's count exactly.
export default function MasteredWordsModal({ cards, onClose }) {
  const dialogRef = useRef(null)
  // Dialog semantics: trap focus while open, Esc closes, focus returns to the
  // trigger on close. Mirrors SearchModal.
  useFocusTrap(dialogRef, { active: true, onClose })
  const mastered = masteredCards(cards)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mastered words"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BookOpen size={15} style={{ color: 'var(--color-blue)' }} aria-hidden="true" />
            Mastered words
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-card2)', color: 'var(--color-dim)' }}>
              {mastered.length}
            </span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full"
            style={{ color: 'var(--color-dim)' }}
          >
            <X size={18} />
          </button>
        </div>

        {mastered.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold mb-1">No mastered words yet</p>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              Keep reviewing — a word counts as mastered once it sticks for about three weeks.
            </p>
          </div>
        ) : (
          <ul className="overflow-y-auto flex-1 px-2 py-2">
            {mastered.map((c, i) => (
              <li
                key={(c.m || '') + '-' + i}
                className="flex items-baseline justify-between gap-3 px-3 py-2.5"
                style={{ borderBottom: i < mastered.length - 1 ? '1px solid var(--color-border)' : 'none' }}
              >
                <span className="font-semibold text-sm truncate">{c.m}</span>
                <span className="text-xs text-right truncate" style={{ color: 'var(--color-dim)' }}>{c.e}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
