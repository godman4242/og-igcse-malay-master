import { useState, useRef, useEffect } from 'react'
import { Rating } from '../../lib/fsrs'
import { speak, startRecognition, hasSpeechRecognition } from '../../lib/speech'
import { scorePronunciation } from '../../lib/pronunciation'
import { createAudioRecorder, hasAudioRecording } from '../../lib/audioRecorder'
import { speakTargetFor } from '../../lib/speakTarget'

export default function SpeakMode({ card, session }) {
  // Practise the example SENTENCE when the card has a real one (sentence prosody is
  // the exam-relevant skill + says the word in context); fall back to the word.
  const sayThis = speakTargetFor(card)
  const isSentence = !!sayThis && sayThis !== (card.m || '').trim()
  const [result, setResult] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  // Record-and-compare (review feature #9): capture the attempt in PARALLEL with
  // STT so the learner can replay themselves next to the model TTS — pure
  // metacognition that still teaches even where ms-MY speech recognition
  // transcribes nothing/garbage. Object URL only; NEVER persisted (privacy +
  // storage), revoked on the next attempt / card change / unmount. Mirrors the
  // proven Speaking.jsx pattern (best-effort: a denied mic never blocks STT).
  const [audioUrl, setAudioUrl] = useState(null)
  const audioUrlRef = useRef(null)
  const audioRecRef = useRef(null)

  const clearAudio = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setAudioUrl(null)
  }

  // Stop an in-flight recorder + release the object URL on unmount. Study remounts
  // this component per card (key={card.m}), so unmount also fires on card advance —
  // resetting the attempt and revoking the previous recording's URL automatically.
  useEffect(() => {
    return () => {
      audioRecRef.current?.stop().catch(() => {})
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const record = async () => {
    setIsRecording(true)
    setResult(null)
    clearAudio()
    // Best-effort parallel capture — a denied/absent mic must never block STT or
    // scoring, so failures are swallowed and audioRecRef simply stays null.
    if (hasAudioRecording()) {
      const ar = createAudioRecorder()
      ar.start().then(() => { audioRecRef.current = ar }).catch(() => { audioRecRef.current = null })
    }
    try {
      const results = await startRecognition('ms-MY')
      if (results.length > 0) {
        const r = scorePronunciation(sayThis, results[0].transcript)
        setResult({ ...r, spoken: results[0].transcript, confidence: results[0].confidence })
        if (r.score >= 80) session.rate(Rating.Easy)
        else if (r.score >= 50) session.rate(Rating.Good)
      }
    } catch {
      setResult({ error: 'Could not recognize speech. Try again.' })
    } finally {
      // Finalize the parallel capture into a replayable URL (best-effort — a
      // typed/empty capture just yields no replay; STT result is independent).
      const ar = audioRecRef.current
      audioRecRef.current = null
      if (ar) {
        ar.stop().then((blob) => {
          if (!blob || blob.size === 0) return
          const url = URL.createObjectURL(blob)
          audioUrlRef.current = url
          setAudioUrl(url)
        }).catch(() => {})
      }
      setIsRecording(false)
    }
  }

  return (
    <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--color-cyan)' }}>
        Pronunciation Practice
      </p>
      <p className="text-2xl font-bold mb-1">{card.m}</p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{card.e}</p>

      {isSentence && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>Say this sentence</p>
          <p className="text-base font-semibold">“{sayThis}”</p>
        </div>
      )}

      <button onClick={() => speak(sayThis)} className="px-6 py-2 rounded-xl font-bold text-sm mb-4"
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

      {/* Record-and-compare (#9): appears whenever a recording was captured —
          even if STT scored nothing — so replaying yourself still teaches. */}
      {audioUrl && (
        <div className="mt-4 rounded-xl p-3 space-y-2 text-left"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
            Hear yourself vs the model
          </p>
          <div className="flex items-center gap-2">
            <audio src={audioUrl} controls className="flex-1 min-w-0" style={{ height: 38 }} aria-label="Your recording" />
            <button onClick={() => speak(sayThis)} aria-label="Hear the model pronunciation"
              className="flex-shrink-0 px-3 rounded-xl font-bold text-sm flex items-center gap-1.5"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-cyan)', minHeight: 44 }}>
              🔊 Model
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
            Play yourself, then the model — compare the rhythm and clarity.
          </p>
        </div>
      )}
    </div>
  )
}
