import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, CheckCircle, SkipForward } from 'lucide-react'

/**
 * SpeakingMicroTurn — 30s spoken sentence production task.
 * This is the "graduation" task at the end of a thematic micro-cycle.
 *
 * Architecture note: We do NOT require the Gemini grader here.
 * Self-grading keeps latency zero and avoids API cost inside the session loop.
 * If the student wants AI grading, they can visit /speaking afterward.
 */
export default function SpeakingMicroTurn({ task, onComplete }) {
  const { card, prompt } = task

  const [phase, setPhase] = useState('ready')     // 'ready' | 'recording' | 'done'
  const [selfGrade, setSelfGrade] = useState(null) // true | false
  const [seconds, setSeconds] = useState(0)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [micError, setMicError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const timerRef = useRef(null)
  const MAX_SECONDS = 30

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.start()
      setPhase('recording')
      setSeconds(0)

      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording()
            return MAX_SECONDS
          }
          return s + 1
        })
      }, 1000)

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        setHasRecorded(true)
        setPhase('done')
      }
    } catch {
      setMicError('Microphone access denied. Use Public Mode or grant mic permission.')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const grade = (correct) => {
    setSelfGrade(correct)
    setTimeout(() => onComplete({ correct, type: 'micro-speak' }), 500)
  }

  // Mic error fallback — treat as skipped
  if (micError) {
    return (
      <div className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <MicOff size={32} className="mx-auto mb-3" style={{ color: 'var(--color-red)' }} />
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text)' }}>Mic not available</p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{micError}</p>
        <button onClick={() => onComplete({ skipped: true, type: 'micro-speak' })}
          className="px-6 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          Skip Speaking
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold"
          style={{ background: 'rgba(255,82,82,0.12)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.25)' }}>
          <Mic size={11} /> Cycle Graduation
        </span>
      </div>

      {/* Focal word */}
      <div className="text-center mb-4">
        <span className="text-2xl font-bold px-4 py-1.5 rounded-xl inline-block"
          style={{ background: 'var(--color-surface)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
          {card.m}
        </span>
        <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{card.e}</p>
      </div>

      {/* Prompt */}
      <div className="p-3 rounded-xl mb-4 text-sm leading-relaxed"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
        {prompt}
      </div>

      {/* Recording phase */}
      {phase === 'ready' && (
        <div className="flex gap-2">
          <button onClick={startRecording}
            className="flex-1 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: 'var(--color-red)', color: '#fff' }}>
            <Mic size={16} /> Start Speaking
          </button>
          <button onClick={() => onComplete({ skipped: true, type: 'micro-speak' })}
            className="px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-1"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            <SkipForward size={13} /> Skip
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center">
          {/* Pulsing mic animation */}
          <div className="relative inline-flex mb-4">
            <div className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: 'var(--color-red)' }} />
            <button onClick={stopRecording}
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-red)' }}>
              <MicOff size={24} color="#fff" />
            </button>
          </div>
          {/* Timer dots — non-numerical, ADHD-friendly */}
          <div className="flex justify-center gap-1 mb-2">
            {Array.from({ length: MAX_SECONDS }, (_, i) => (
              <div key={i} className="w-1 h-1 rounded-full transition-all duration-300"
                style={{ background: i < seconds ? 'var(--color-red)' : 'var(--color-border)' }} />
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Tap to stop</p>
        </div>
      )}

      {/* Self-grading phase */}
      {phase === 'done' && hasRecorded && (
        <div>
          <p className="text-xs text-center mb-3" style={{ color: 'var(--color-dim)' }}>
            Did you use <strong style={{ color: 'var(--color-accent)' }}>{card.m}</strong> correctly in a sentence?
          </p>
          <div className="flex gap-2">
            <button onClick={() => grade(false)}
              className="flex-1 p-3 rounded-xl font-bold text-sm"
              style={{ background: selfGrade === false ? 'rgba(255,82,82,0.2)' : 'var(--color-card2)', color: 'var(--color-red)', border: '2px solid ' + (selfGrade === false ? 'var(--color-red)' : 'var(--color-border)') }}>
              ❌ Not quite
            </button>
            <button onClick={() => grade(true)}
              className="flex-1 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
              style={{ background: selfGrade === true ? 'rgba(0,230,118,0.2)' : 'var(--color-card2)', color: 'var(--color-green)', border: '2px solid ' + (selfGrade === true ? 'var(--color-green)' : 'var(--color-border)') }}>
              <CheckCircle size={14} /> Yes!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
