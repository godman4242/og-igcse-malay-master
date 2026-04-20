import { useState } from 'react'
import { ChevronDown, ChevronUp, Lightbulb, BookOpen } from 'lucide-react'

export default function ElaborativeFeedback({ feedback, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  if (!feedback || !feedback.explanation) return null

  return (
    <div
      className="mt-2 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(68,138,255,0.06)',
        border: '1px solid rgba(68,138,255,0.2)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold"
        style={{ color: 'var(--color-blue)' }}
      >
        <span className="flex items-center gap-1.5">
          <Lightbulb size={13} />
          Here's why
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
            {feedback.explanation}
          </p>

          {feedback.mnemonic && (
            <div
              className="flex items-start gap-1.5 text-xs p-2 rounded-lg"
              style={{ background: 'rgba(255,145,0,0.08)', color: 'var(--color-orange)' }}
            >
              <span className="font-bold shrink-0">Remember:</span>
              <span>{feedback.mnemonic}</span>
            </div>
          )}

          {feedback.examples && feedback.examples.length > 0 && (
            <div>
              <p
                className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"
                style={{ color: 'var(--color-dim)' }}
              >
                <BookOpen size={10} /> Related examples
              </p>
              <div className="space-y-1">
                {feedback.examples.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span style={{ color: 'var(--color-dim)' }}>{ex.root}</span>
                    <span style={{ color: 'var(--color-dim)' }}>&rarr;</span>
                    <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>{ex.result}</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>({ex.gloss})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feedback.relatedRule && (
            <p className="text-[10px] italic" style={{ color: 'var(--color-dim)' }}>
              {feedback.relatedRule}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

