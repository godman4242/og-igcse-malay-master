import { useState, useRef, useEffect } from 'react'
import {
  Mic, Square, Volume2, ArrowLeft, Sparkles, Loader2, AlertCircle, X,
} from 'lucide-react'
import TOPICS, { TOPICS_EN } from '../data/speakingTopics'
import {
  speak, hasSpeechRecognition, hasSpeechSynthesis,
} from '../lib/speech'
import {
  heuristicGrade, aiGrade, aiGradeAvailable,
} from '../lib/speakingGrader'
import { computeWordDiff } from '../lib/diff'
import useStore from '../store/useStore'

const STAGE = {
  PICK: 'pick',
  PREP: 'prep',
  RECORD: 'record',
  RESULTS: 'results',
}

export default function Speaking() {
  const [lang, setLang] = useState('malay')
  const [stage, setStage] = useState(STAGE.PICK)
  const [topic, setTopic] = useState(null)
  const isEng = lang === 'eng'
  const activeTopics = isEng ? TOPICS_EN : TOPICS
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [recording, setRecording] = useState(false)
  const [recError, setRecError] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [durationSec, setDurationSec] = useState(0)
  const [heuristic, setHeuristic] = useState(null)
  const [ai, setAi] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const recRef = useRef(null)
  const tickRef = useRef(null)
  const abortRef = useRef(null)
  const logSpeakingSession = useStore(s => s.logSpeakingSession)
  const addMistake = useStore(s => s.addMistake)
  const speakingHistory = useStore(s => s.speakingHistory ?? [])
  const recentSpeaking = speakingHistory.slice(-5).reverse()

  // Tick the duration once a second while recording.
  useEffect(() => {
    if (!recording || !startedAt) {
      clearInterval(tickRef.current)
      return
    }
    tickRef.current = setInterval(() => {
      setDurationSec(Math.floor((Date.now() - startedAt) / 1000))
    }, 500)
    return () => clearInterval(tickRef.current)
  }, [recording, startedAt])

  const startRecording = () => {
    if (!hasSpeechRecognition()) {
      setRecError('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }
    setRecError(null)
    setTranscript('')
    setInterim('')
    setHeuristic(null)
    setAi(null)
    setAiError(null)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = isEng ? 'en-GB' : 'ms-MY'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript + ' '
        else interimText += r[0].transcript + ' '
      }
      if (finalText) setTranscript(prev => (prev + ' ' + finalText).trim())
      setInterim(interimText.trim())
    }
    rec.onerror = (ev) => {
      // Don't blow up on benign no-speech errors.
      if (ev.error === 'no-speech') return
      setRecError(`Mic error: ${ev.error || 'unknown'}`)
    }
    rec.onend = () => {
      // If the user clicked stop, don't auto-restart.
      if (recRef.current && recRef.current._stopRequested) return
      // Some browsers stop after silence — restart for continuous mode.
      try { rec.start() } catch { /* already started */ }
    }
    recRef.current = rec
    recRef.current._stopRequested = false
    rec.start()
    setStartedAt(Date.now())
    setRecording(true)
    setStage(STAGE.RECORD)
  }

  const stopRecording = () => {
    if (!recRef.current) return
    recRef.current._stopRequested = true
    try { recRef.current.stop() } catch { /* already stopped */ }
    recRef.current = null
    setRecording(false)
    const finalDuration = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : durationSec
    setDurationSec(finalDuration)

    // Build the heuristic grade synchronously
    const fullTranscript = (transcript + ' ' + interim).trim()
    if (fullTranscript) {
      const h = heuristicGrade({
        transcript: fullTranscript,
        topic,
        durationSec: finalDuration,
        lang,
      })
      setHeuristic(h)
      logSpeakingSession?.({
        topicId: topic.id,
        band: h.band,
        durationSec: h.durationSec,
        wordCount: h.wordCount,
        transcript: fullTranscript.slice(0, 1000), // cap for storage
        lang,
      })
      // Pipe weak speaking sessions into the mistake journal so the Fix-Up
      // queue surfaces fluency/marker/filler patterns alongside writing errors.
      if (h.band <= 3 && Array.isArray(h.tips)) {
        const language = lang === 'en' ? 'en' : 'ms'
        h.tips.slice(0, 3).forEach(tip => {
          const lower = tip.toLowerCase()
          const category = lower.includes('filler') || lower.includes('pengisi') ? 'fluency'
            : lower.includes('marker') || lower.includes('penanda') ? 'cohesion'
            : lower.includes('vocab') || lower.includes('kosa') ? 'vocab'
            : 'fluency'
          addMistake?.({
            type: 'speaking',
            source: topic.id,
            language,
            category,
            severity: h.band <= 2 ? 'high' : 'med',
            word: '',
            surface: fullTranscript.slice(0, 200),
            note: tip,
          })
        })
      }
    }
    setStage(STAGE.RESULTS)
  }

  const runAiGrade = async () => {
    if (!topic) return
    const fullTranscript = (transcript + ' ' + interim).trim()
    if (!fullTranscript) return
    setAiLoading(true)
    setAiError(null)
    setAi(null)
    try {
      abortRef.current = new AbortController()
      const result = await aiGrade({
        transcript: fullTranscript,
        topic,
        durationSec,
        lang,
        signal: abortRef.current.signal,
      })
      if (result.error === 'parse') {
        setAi({ raw: result.raw })
      } else {
        setAi(result)
      }
    } catch (e) {
      setAiError(e?.message || 'AI grade failed')
    } finally {
      setAiLoading(false)
    }
  }

  const reset = () => {
    setStage(STAGE.PICK)
    setTopic(null)
    setTranscript('')
    setInterim('')
    setStartedAt(null)
    setDurationSec(0)
    setHeuristic(null)
    setAi(null)
    setAiError(null)
    setRecError(null)
  }

  // ─────────────── PICK ───────────────
  if (stage === STAGE.PICK) {
    return (
      <div className="space-y-3 animate-fadeUp">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Mic size={18} style={{ color: 'var(--color-accent)' }} /> Speaking Practice
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
          {isEng
            ? 'Practise IGCSE 0500/0510 speaking. Pick a topic, prepare for a moment, then record your response. The app transcribes you live and grades the result.'
            : 'Practise IGCSE Paper 3 speaking. Pick a topic, prepare for a moment, then record your response. The app transcribes you live and grades the result.'}
        </p>
        <div className="flex gap-2">
          {[{ id: 'malay', label: 'Bahasa Melayu' }, { id: 'eng', label: 'English' }].map(l => (
            <button key={l.id} onClick={() => { setLang(l.id); setTopic(null) }}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: lang === l.id ? 'var(--color-accent)' : 'var(--color-card)',
                color: lang === l.id ? '#fff' : 'var(--color-dim)',
                border: '1px solid ' + (lang === l.id ? 'var(--color-accent)' : 'var(--color-border)'),
              }}>
              {l.label}
            </button>
          ))}
        </div>
        {!hasSpeechRecognition() && (
          <div className="rounded-lg p-3 text-xs flex items-start gap-2"
            style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)', color: 'var(--color-red)' }}>
            <AlertCircle size={12} className="mt-0.5" />
            <span>Your browser doesn&apos;t support speech recognition. Open this page in Chrome.</span>
          </div>
        )}
        <div className="space-y-2">
          {activeTopics.map(t => {
            const lastBand = recentSpeaking.find(h => h.topicId === t.id)?.band
            return (
              <button key={t.id} onClick={() => { setTopic(t); setStage(STAGE.PREP) }}
                className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01]"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold">{t.title}</h3>
                  <div className="flex items-center gap-1.5">
                    {lastBand !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-green)' }}>
                        Last: B{lastBand}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-dim)' }}>
                      ~{t.expectedDurationSec}s
                    </span>
                  </div>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{t.titleEn}</p>
              </button>
            )
          })}
        </div>

        {recentSpeaking.length > 0 && (
          <details className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <summary className="text-sm font-bold cursor-pointer">{isEng ? 'Recent sessions' : 'Sesi terkini'}</summary>
            <div className="mt-2 space-y-1">
              {recentSpeaking.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <span>{[...TOPICS, ...TOPICS_EN].find(t => t.id === h.topicId)?.title || h.topicId}</span>
                  <span style={{ color: 'var(--color-dim)' }}>
                    Band {h.band} · {h.durationSec}s
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    )
  }

  // ─────────────── PREP ───────────────
  if (stage === STAGE.PREP && topic) {
    return (
      <div className="space-y-4 animate-fadeUp">
        <button onClick={reset} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
          <ArrowLeft size={12} /> Pick another topic
        </button>
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-bold">{topic.title}</h3>
            {hasSpeechSynthesis() && (
              <button onClick={() => speak(topic.prompt, isEng ? 'en-GB' : 'ms-MY')} className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
                <Volume2 size={11} />
              </button>
            )}
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>{topic.prompt}</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h4 className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--color-cyan)' }}>{isEng ? 'Suggested cues' : 'Cadangan isi'}</h4>
          <ul className="space-y-1">
            {topic.cues.map((c, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <span style={{ color: 'var(--color-cyan)' }}>•</span>
                <span style={{ color: 'var(--color-text)' }}>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={startRecording}
          disabled={!hasSpeechRecognition()}
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent)', opacity: hasSpeechRecognition() ? 1 : 0.5 }}>
          <Mic size={14} /> Start recording
        </button>
        {recError && (
          <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(255,82,82,0.08)', color: 'var(--color-red)' }}>
            {recError}
          </div>
        )}
      </div>
    )
  }

  // ─────────────── RECORD ───────────────
  if (stage === STAGE.RECORD && topic) {
    const liveText = (transcript + ' ' + interim).trim()
    return (
      <div className="space-y-4 animate-fadeUp">
        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid var(--color-accent)' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--color-red)' }} />
            <span className="text-sm font-bold">Recording…</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
            {durationSec}s elapsed · target ~{topic.expectedDurationSec}s
          </p>
        </div>

        <div className="rounded-2xl p-4 min-h-[180px]" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h4 className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--color-dim)' }}>Live transcript</h4>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            <span>{transcript}</span>{' '}
            <span style={{ color: 'var(--color-dim)' }}>{interim}</span>
            {!liveText && <span style={{ color: 'var(--color-dim)' }}>Mula bercakap…</span>}
          </p>
        </div>

        <button onClick={stopRecording}
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-red)' }}>
          <Square size={14} /> Stop &amp; grade
        </button>
        {recError && (
          <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(255,82,82,0.08)', color: 'var(--color-red)' }}>
            {recError}
          </div>
        )}
      </div>
    )
  }

  // ─────────────── RESULTS ───────────────
  return (
    <div className="space-y-4 animate-fadeUp">
      <button onClick={reset} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
        <ArrowLeft size={12} /> Try another topic
      </button>

      {!heuristic ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
            No speech captured. Try recording again.
          </p>
          <button onClick={() => setStage(STAGE.PREP)}
            className="mt-3 px-4 py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: 'var(--color-accent)' }}>
            Back to topic
          </button>
        </div>
      ) : (
        <>
          {/* Band card */}
          <div className="flex items-center gap-4 rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ border: '4px solid var(--color-accent)', color: 'var(--color-accent)' }}>
              {heuristic.band}
            </div>
            <div className="flex-1">
              <p className="font-bold">Band {heuristic.band}/6</p>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                {heuristic.wordCount} words · {heuristic.durationSec}s · {heuristic.wordsPerSec} wps
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Penanda wacana" value={heuristic.markerCount} good={heuristic.markerCount >= 2} />
            <Stat label="Kosa kata formal" value={heuristic.formalCount} good={heuristic.formalCount >= 2} />
            <Stat label="Kepelbagaian" value={heuristic.uniqueWordRatio} good={heuristic.uniqueWordRatio >= 0.45} />
            <Stat label="Pengisi" value={heuristic.fillerCount} good={heuristic.fillerCount <= 3} reverse />
            {heuristic.cuesTotal > 0 && (
              <Stat label="Isi disentuh" value={`${heuristic.cuesHit}/${heuristic.cuesTotal}`} good={heuristic.cuesHit >= heuristic.cuesTotal * 0.75} />
            )}
            <Stat label="Ayat" value={heuristic.sentenceCount} good={heuristic.sentenceCount >= 4} />
          </div>

          {/* Tips */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-2">Penambahbaikan</h3>
            {heuristic.tips.map((t, i) => (
              <p key={i} className="text-sm py-1" style={{ color: 'var(--color-dim)' }}>• {t}</p>
            ))}
          </div>

          {/* Transcript */}
          <details className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <summary className="text-sm font-bold cursor-pointer">Transkrip</summary>
            <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
              {transcript || '(empty)'}
            </p>
          </details>

          {/* AI grade */}
          {aiGradeAvailable() ? (
            !ai && !aiLoading && !aiError && (
              <button onClick={runAiGrade}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: 'var(--color-accent2)' }}>
                <Sparkles size={14} /> Get detailed AI grade
              </button>
            )
          ) : (
            <div className="rounded-lg p-3 text-xs flex items-start gap-2"
              style={{ background: 'rgba(255,145,0,0.08)', border: '1px solid rgba(255,145,0,0.2)', color: 'var(--color-orange)' }}>
              <AlertCircle size={12} className="mt-0.5" />
              <span>Add VITE_GEMINI_KEY to .env.local for detailed AI grading.</span>
            </div>
          )}

          {aiLoading && (
            <div className="text-sm flex items-center gap-2" style={{ color: 'var(--color-dim)' }}>
              <Loader2 size={14} className="animate-spin" /> AI examiner is grading…
            </div>
          )}
          {aiError && (
            <div className="rounded-lg p-3 text-xs flex items-start gap-2"
              style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)', color: 'var(--color-red)' }}>
              <X size={12} className="mt-0.5" />
              <span>{aiError}</span>
            </div>
          )}
          {ai && <AIGradeCard ai={ai} transcript={transcript} />}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, good, reverse }) {
  // `reverse` = lower is better (e.g. fillers)
  const isGood = good
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: isGood ? 'var(--color-green)' : reverse ? 'var(--color-orange)' : 'var(--color-orange)' }}>
        {value}
      </p>
    </div>
  )
}

function AIGradeCard({ ai, transcript }) {
  if (ai.raw) {
    // Could not parse JSON — show raw response so the student isn't blocked.
    return (
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent2)' }}>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--color-accent2)' }} /> AI Examiner
        </h3>
        <p className="text-sm whitespace-pre-wrap">{ai.raw}</p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent2)' }}>
      <div className="flex items-center gap-3">
        <Sparkles size={14} style={{ color: 'var(--color-accent2)' }} />
        <h3 className="text-sm font-bold">AI Examiner — Band {ai.band}/6</h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--color-text)' }}>{ai.summary}</p>

      {ai.strengths?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-green)' }}>Strengths</p>
          {ai.strengths.map((s, i) => (
            <p key={i} className="text-sm py-0.5" style={{ color: 'var(--color-text)' }}>• {s}</p>
          ))}
        </div>
      )}

      {ai.improvements?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-orange)' }}>Top fixes</p>
          {ai.improvements.map((it, i) => (
            <div key={i} className="rounded-lg p-2 mb-1.5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-bold">{it.issue}</p>
              {it.evidence && <p className="text-[11px] italic mt-1" style={{ color: 'var(--color-dim)' }}>“{it.evidence}”</p>}
              <p className="text-[12px] mt-1">{it.fix}</p>
            </div>
          ))}
        </div>
      )}

      {ai.vocabUpgrades?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-purple)' }}>Vocab upgrades</p>
          <div className="flex flex-wrap gap-1.5">
            {ai.vocabUpgrades.map((v, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-lg"
                style={{ background: 'rgba(179,136,255,0.12)', color: 'var(--color-purple)' }}>
                {v.used} → <strong>{v.better}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {ai.improvedTranscript && transcript && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--color-cyan)' }}>Pronunciation & Flow Fixes</p>
          <div className="text-sm leading-relaxed p-3 rounded-xl" style={{ background: 'var(--color-surface)' }}>
            {computeWordDiff(transcript, ai.improvedTranscript).map((part, i) => {
              if (part.type === 'add') {
                return <span key={i} className="px-1 mx-0.5 rounded" style={{ background: 'rgba(0,230,118,0.2)', color: 'var(--color-green)' }}>{part.value}</span>
              }
              if (part.type === 'remove') {
                return <span key={i} className="px-1 mx-0.5 rounded line-through opacity-60" style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--color-red)' }}>{part.value}</span>
              }
              return <span key={i} style={{ color: 'var(--color-text)' }}>{part.value} </span>
            })}
          </div>
        </div>
      )}

      {ai.nextStep && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>Next step</p>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>{ai.nextStep}</p>
        </div>
      )}
    </div>
  )
}
