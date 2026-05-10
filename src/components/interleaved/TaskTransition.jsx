/**
 * TaskTransition — 600ms ambient animation slot between tasks.
 * Shown when status === 'transition'. Provides a smooth visual break
 * that signals "new task incoming" without a jarring hard cut.
 */
export default function TaskTransition({ nextTask }) {
  const typeLabel = {
    'fc': 'Flashcard',
    'quiz': 'Quiz',
    'cloze': 'Fill in the Blank',
    'micro-write': 'Write a Sentence',
    'micro-speak': 'Speak',
  }[nextTask?.type] ?? 'Next'

  const typeColor = {
    'fc': 'var(--color-blue)',
    'quiz': 'var(--color-orange)',
    'cloze': 'var(--color-purple)',
    'micro-write': 'var(--color-purple)',
    'micro-speak': 'var(--color-red)',
  }[nextTask?.type] ?? 'var(--color-accent)'

  return (
    <div
      className="flex flex-col items-center justify-center py-16 animate-fadeUp"
      style={{ minHeight: 220 }}
    >
      {/* Ambient pulse ring */}
      <div className="relative flex items-center justify-center mb-6">
        <div
          className="absolute w-16 h-16 rounded-full animate-ping opacity-20"
          style={{ background: typeColor }}
        />
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ background: `${typeColor}18`, border: `1.5px solid ${typeColor}40` }}
        >
          {{
            'fc': '🃏',
            'quiz': '🎯',
            'cloze': '✏️',
            'micro-write': '✍️',
            'micro-speak': '🎤',
          }[nextTask?.type] ?? '⚡'}
        </div>
      </div>

      <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: typeColor }}>
        Up Next
      </p>
      <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
        {typeLabel}
      </p>
      {nextTask?.card && (
        <p className="text-sm mt-1" style={{ color: 'var(--color-dim)' }}>
          {nextTask.card.m}
        </p>
      )}
    </div>
  )
}
