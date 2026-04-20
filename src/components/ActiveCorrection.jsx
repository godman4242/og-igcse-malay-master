// src/components/ActiveCorrection.jsx
// Implements the "Feedback Correction Effect": forcing active production of correct answer

import { useState, useRef, useEffect } from 'react'

export default function ActiveCorrection({ correctAnswer, onComplete }) {
  const [input, setInput] = useState('')
  const [isCorrect, setIsCorrect] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setInput(val)
    // Strict check to ensure student types it correctly
    if (val.trim().toLowerCase() === correctAnswer.toLowerCase().replace(/\.\s*$/, '')) {
      setIsCorrect(true)
      setTimeout(onComplete, 800)
    }
  }

  return (
    <div className="mt-3 space-y-2 animate-fadeUp">
      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
        Type the correct answer to continue:
      </p>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        className="w-full p-3 rounded-xl text-sm outline-none transition-all"
        style={{ 
          background: 'var(--color-surface)', 
          border: `2px solid ${isCorrect ? 'var(--color-green)' : 'var(--color-accent)'}`,
          color: isCorrect ? 'var(--color-green)' : 'var(--color-text)',
        }}
        placeholder="Type correction..."
      />
    </div>
  )
}