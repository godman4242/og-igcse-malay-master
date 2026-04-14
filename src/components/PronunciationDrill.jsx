import { useState, useCallback } from 'react'
import { Mic, Volume2, RotateCcw, ChevronRight, AlertCircle } from 'lucide-react'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import { scorePronunciation } from '../lib/pronunciation'

export default function PronunciationDrill({ sentences, onComplete }) {
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [listening, setListening] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [scores, setScores] = useState([])

  const current = sentences[index]
  const isLast = index >= sentences.length - 1
  const speechAvailable = hasSpeechRecognition()

  const handleRecord = useCallback(async () => {
    if (!speechAvailable || listening) return
    setListening(true)
    setResult(null)
    try {
      const results = await startRecognition('ms-MY')
      if (results.length > 0) {
        const spoken = results[0].transcript
        const scored = scorePronunciation(current.malay || current.word, spoken)
        setResult(scored)
        setAttempts(a => a + 1)
        setScores(prev => [...prev, scored.score])
      }
    } catch (err) {
      console.error('Speech error:', err)
    }
    setListening(false)
  }, [current, speechAvailable, listening])

  const handleNext = () => {
    if (isLast) {
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      onComplete?.({ totalAttempts: attempts, avgScore, sentences: sentences.length })
      return
    }
    setIndex(i => i + 1)
    setResult(null)
  }

  const handleRetry = () => {
    setResult(null)
  }

  if (!speechAvailable) {
    return (
      <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <AlertCircle size={24} className="mx-auto mb-2" style={{ color: 'var(--color-orange)' }} />
        <p className="text-sm font-bold mb-1">Speech not supported</p>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
          Your browser doesn't support speech recognition. Try Chrome on Android for the best experience.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: 'var(--color-dim)' }}>
          {index + 1} / {sentences.length}
        </span>
        <div className="flex-1 mx-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / sentences.length) * 100}%`, background: 'var(--color-accent2)' }} />
        </div>
        {scores.length > 0 && (
          <span className="text-xs font-bold" style={{ color: 'var(--color-cyan)' }}>
            Avg: {Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%
          </span>
        )}
      </div>

      {/* Target sentence */}
      <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <p className="text-lg font-bold mb-2">{current.malay || current.word}</p>
        {current.english && (
          <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{current.english}</p>
        )}
        <button onClick={() => speak(current.malay || current.word)}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 mx-auto"
          style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--color-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
          <Volume2 size={14} /> Listen First
        </button>
      </div>

      {/* Record button */}
      {!result && (
        <button onClick={handleRecord} disabled={listening}
          className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
          style={{
            background: listening ? 'var(--color-red)' : 'var(--color-accent2)',
            transform: listening ? 'scale(1.02)' : 'scale(1)',
          }}>
          <Mic size={20} className={listening ? 'animate-pulse' : ''} />
          {listening ? 'Listening...' : 'Hold to Speak'}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Score */}
          <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <span className="text-3xl font-bold" style={{
              color: result.score >= 80 ? 'var(--color-green)' : result.score >= 50 ? 'var(--color-orange)' : 'var(--color-red)'
            }}>
              {result.score}%
            </span>
            <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>
              {result.correct}/{result.total} words correct
              {result.close > 0 && `, ${result.close} close`}
            </p>
          </div>

          {/* Word-by-word results */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {result.words.filter(w => w.status !== 'extra').map((w, i) => (
              <span key={i} className="px-2 py-1 rounded-lg text-sm font-bold"
                style={{
                  background: w.status === 'correct' ? 'rgba(0,230,118,0.15)'
                    : w.status === 'close' ? 'rgba(255,145,0,0.15)'
                    : 'rgba(255,82,82,0.15)',
                  color: w.status === 'correct' ? 'var(--color-green)'
                    : w.status === 'close' ? 'var(--color-orange)'
                    : 'var(--color-red)',
                }}>
                {w.word}
              </span>
            ))}
          </div>

          {/* Tips */}
          {result.tips?.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)' }}>
              {result.tips.map((tip, i) => (
                <p key={i} className="text-xs py-0.5" style={{ color: 'var(--color-cyan)' }}>{tip}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleRetry}
              className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              <RotateCcw size={14} /> Retry
            </button>
            <button onClick={handleNext}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1"
              style={{ background: 'var(--color-accent2)' }}>
              {isLast ? 'Finish' : 'Next'} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
