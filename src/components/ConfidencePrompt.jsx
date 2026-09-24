// src/components/ConfidencePrompt.jsx
// "How sure are you?" pre-reveal prompt — 3-point scale

/**
 * @param {Object} props
 * @param {Function} props.onSelect - Called with confidence level (1=unsure, 2=think so, 3=certain)
 */
export default function ConfidencePrompt({ onSelect }) {
  const levels = [
    { value: 1, label: 'Unsure', emoji: '🤔', color: 'var(--color-red)' },
    { value: 2, label: 'Think so', emoji: '🤷', color: 'var(--color-orange)' },
    { value: 3, label: 'Certain', emoji: '😎', color: 'var(--color-green)' },
  ]

  return (
    <div className="rounded-xl p-3" style={{
      background: 'color-mix(in srgb, var(--color-gold) 6%, transparent)',
      border: '1px solid color-mix(in srgb, var(--color-gold) 20%, transparent)',
    }}>
      <p className="text-xs font-bold text-center mb-2" style={{ color: 'var(--color-gold)' }}>
        How confident are you?
      </p>
      <div className="flex gap-2">
        {levels.map(l => (
          <button key={l.value} onClick={() => onSelect(l.value)}
            className="flex-1 py-2 rounded-lg text-center transition-all hover:scale-105"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
            <div className="text-lg">{l.emoji}</div>
            <div className="text-[10px] font-bold" style={{ color: l.color }}>{l.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
