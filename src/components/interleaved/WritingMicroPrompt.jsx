import { useState, useRef, useEffect } from 'react'
import { PenLine, CheckCircle, SkipForward } from 'lucide-react'

/**
 * WritingMicroPrompt — a 60-90s sentence production task.
 * The student writes ONE sentence using the focal word.
 * Grading is self-assessed (correct/incorrect toggle) to avoid AI latency.
 */
export default function WritingMicroPrompt({ task, onComplete }) {
  const { card, prompt } = task
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [selfGrade, setSelfGrade] = useState(null) // true | false
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    if (!input.trim() || submitted) return
    setSubmitted(true)
  }

  const grade = (correct) => {
    setSelfGrade(correct)
    setTimeout(() => onComplete({ correct, type: 'micro-write' }), 500)
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      {/* Header badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold"
          style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-purple)', border: '1px solid rgba(124,58,237,0.25)' }}
        >
          <PenLine size={11} /> Micro-Write
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(68,138,255,0.1)', color: 'var(--color-blue)' }}>
          Focal word
        </span>
      </div>

      {/* Focal word chip */}
      <div className="text-center mb-4">
        <span
          className="text-2xl font-bold px-4 py-1.5 rounded-xl inline-block"
          style={{ background: 'var(--color-surface)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
        >
          {card.m}
        </span>
        <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{card.e}</p>
      </div>

      {/* Prompt */}
      <div
        className="p-3 rounded-xl mb-4 text-sm leading-relaxed"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      >
        {prompt}
      </div>

      {/* Input */}
      {!submitted ? (
        <>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submit())}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none resize-none"
            style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-text)',
              minHeight: 80,
            }}
            placeholder="Write your sentence here…"
          />
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="flex-1 p-3 rounded-xl font-bold text-sm text-black transition-opacity"
              style={{ background: input.trim() ? 'var(--color-green)' : 'var(--color-card2)', color: input.trim() ? 'var(--color-on-bright)' : undefined, opacity: input.trim() ? 1 : 0.5 }}
            >
              Submit
            </button>
            <button
              onClick={() => onComplete({ skipped: true, type: 'micro-write' })}
              className="px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-1"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
            >
              <SkipForward size={13} /> Skip
            </button>
          </div>
        </>
      ) : (
        /* Self-grading panel */
        <div>
          <div
            className="p-3 rounded-xl mb-4 text-sm italic leading-relaxed"
            style={{ background: 'rgba(68,138,255,0.06)', border: '1px solid rgba(68,138,255,0.18)', color: 'var(--color-text)' }}
          >
            "{input}"
          </div>
          <p className="text-xs text-center mb-3" style={{ color: 'var(--color-dim)' }}>
            Did your sentence use <strong style={{ color: 'var(--color-accent)' }}>{card.m}</strong> correctly?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => grade(false)}
              className="flex-1 p-3 rounded-xl font-bold text-sm"
              style={{ background: selfGrade === false ? 'rgba(255,82,82,0.2)' : 'var(--color-card2)', color: 'var(--color-red)', border: '2px solid ' + (selfGrade === false ? 'var(--color-red)' : 'var(--color-border)') }}
            >
              ❌ Not quite
            </button>
            <button
              onClick={() => grade(true)}
              className="flex-1 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
              style={{ background: selfGrade === true ? 'rgba(0,230,118,0.2)' : 'var(--color-card2)', color: 'var(--color-green)', border: '2px solid ' + (selfGrade === true ? 'var(--color-green)' : 'var(--color-border)') }}
            >
              <CheckCircle size={14} /> Yes!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
