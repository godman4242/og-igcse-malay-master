import { useState } from 'react'
import { Rating } from '../../lib/fsrs'
import { speak, startRecognition, hasSpeechRecognition } from '../../lib/speech'
import { scorePronunciation } from '../../lib/pronunciation'

export default function SpeakMode({ card, session }) {
  const [result, setResult] = useState(null)
  const [isRecording, setIsRecording] = useState(false)

  const record = async () => {
    setIsRecording(true)
    setResult(null)
    try {
      const results = await startRecognition('ms-MY')
      if (results.length > 0) {
        const r = scorePronunciation(card.m, results[0].transcript)
        setResult({ ...r, spoken: results[0].transcript, confidence: results[0].confidence })
        if (r.score >= 80) session.rate(Rating.Easy)
        else if (r.score >= 50) session.rate(Rating.Good)
      }
    } catch {
      setResult({ error: 'Could not recognize speech. Try again.' })
    }
    setIsRecording(false)
  }

  return (
    <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--color-cyan)' }}>
        Pronunciation Practice
      </p>
      <p className="text-2xl font-bold mb-1">{card.m}</p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{card.e}</p>

      <button onClick={() => speak(card.m)} className="px-6 py-2 rounded-xl font-bold text-sm mb-4"
        style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
        🔊 Listen First
      </button>

      {hasSpeechRecognition() ? (
        <button onClick={record}
          className="w-full py-4 rounded-2xl font-bold text-lg mb-4 transition-all"
          style={{
            background: isRecording ? 'var(--color-red)' : 'var(--color-accent2)',
            color: '#fff',
            boxShadow: isRecording ? '0 0 20px rgba(255,82,82,0.4)' : 'none',
          }}>
          {isRecording ? '🎙️ Listening...' : '🎤 Tap & Speak'}
        </button>
      ) : (
        <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)' }}>
          Speech recognition not available in this browser. Try Chrome.
        </div>
      )}

      {result && !result.error && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                border: '4px solid ' + (result.score >= 80 ? 'var(--color-green)' : result.score >= 50 ? 'var(--color-orange)' : 'var(--color-red)'),
                color: result.score >= 80 ? 'var(--color-green)' : result.score >= 50 ? 'var(--color-orange)' : 'var(--color-red)',
              }}>
              {result.score}%
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">{result.score >= 80 ? 'Excellent!' : result.score >= 50 ? 'Good try!' : 'Keep practicing!'}</p>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>You said: "{result.spoken}"</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 justify-center p-3 rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {result.words.map((w, i) => (
              <span key={i} className="px-2 py-1 rounded text-sm font-semibold"
                style={{
                  background: w.status === 'correct' ? 'rgba(0,230,118,0.2)' : w.status === 'close' ? 'rgba(255,145,0,0.2)' : 'rgba(255,82,82,0.2)',
                  color: w.status === 'correct' ? 'var(--color-green)' : w.status === 'close' ? 'var(--color-orange)' : 'var(--color-red)',
                }}>
                {w.word || w.spoken}
                {w.status === 'wrong' && <span className="text-[10px] ml-1">({w.spoken})</span>}
              </span>
            ))}
          </div>

          <div className="flex justify-center gap-4 text-xs">
            <span style={{ color: 'var(--color-green)' }}>✅ {result.correct}</span>
            <span style={{ color: 'var(--color-orange)' }}>〜 {result.close}</span>
            <span style={{ color: 'var(--color-red)' }}>✗ {result.wrong}</span>
          </div>
        </div>
      )}

      {result?.error && (
        <p className="text-sm" style={{ color: 'var(--color-red)' }}>{result.error}</p>
      )}
    </div>
  )
}
