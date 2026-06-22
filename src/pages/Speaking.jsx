import { useState, useRef, useEffect, useMemo } from 'react'
import useTheaterMode from '../hooks/useTheaterMode'
import { useLocation } from 'react-router-dom'

// Stable empty-array reference for selectors so unrelated store updates
// don't re-render the page when speakingHistory is undefined.
const EMPTY_ARR = []
import {
  Mic, MicOff, Square, Volume2, ArrowLeft, Sparkles, Loader2, AlertCircle, X, Keyboard,
} from 'lucide-react'
import TOPICS, { TOPICS_EN } from '../data/speakingTopics'
import {
  speak, hasSpeechRecognition, hasSpeechSynthesis, describeSpeechError,
} from '../lib/speech'

// How long the mic can be "on" with zero words captured before we stop
// pretending and tell the student honestly (ms-MY STT can run but transcribe
// nothing — see describeSpeechError). 6s is long enough not to nag a student
// who's just gathering their thoughts.
const NO_CAPTURE_SECS = 6
import {
  heuristicGrade, aiGrade, aiGradeAvailable, weaknessFlags,
} from '../lib/speakingGrader'
import { computeWordDiff } from '../lib/diff'
import { capDuration } from '../lib/duration'
import { createAudioRecorder, hasAudioRecording } from '../lib/audioRecorder'
import { hasUserOpenRouterKey } from '../lib/openrouter'
import useStore from '../store/useStore'

const STAGE = {
  PICK: 'pick',
  PREP: 'prep',
  RECORD: 'record',
  RESULTS: 'results',
}

export default function Speaking() {
  const location = useLocation()
  const presetTopicId = location?.state?.topicId
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const [lang, setLang] = useState(() => {
    // INITIAL value: a preset topic wins; otherwise seed from the global study language (Fork I). Still toggleable in-page.
    if (!presetTopicId) return studyLang === 'en' ? 'eng' : 'malay'
    return TOPICS_EN.some(t => t.id === presetTopicId) ? 'eng' : 'malay'
  })
  const [stage, setStage] = useState(STAGE.PICK)
  const [topic, setTopic] = useState(null)
  const isEng = lang === 'eng'
  const activeTopics = isEng ? TOPICS_EN : TOPICS
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [recording, setRecording] = useState(false)
  const [didStopListening, setDidStopListening] = useState(false)
  const [recError, setRecError] = useState(null)
  // Type-what-you-said fallback: when STT can't hear (unsupported language,
  // blocked/absent mic, offline) the student types instead and still gets the
  // full band + fixes, because grading runs on text, not audio.
  const [typed, setTyped] = useState('')
  const [showType, setShowType] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [durationSec, setDurationSec] = useState(0)
  const [heuristic, setHeuristic] = useState(null)
  const [ai, setAi] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  // Record + playback (spec §4b/D): the student replays themselves next to the
  // model TTS. Works with no STT, so it's the real pronunciation-practice value
  // on the ms-MY backend that transcribes nothing. `audioUrl` is an object URL
  // for the captured Blob; revoked on reset/unmount to avoid leaks.
  const [audioUrl, setAudioUrl] = useState(null)
  const recRef = useRef(null)
  const tickRef = useRef(null)
  const abortRef = useRef(null)
  const audioRecRef = useRef(null)
  const audioUrlRef = useRef(null)

  const { setTheaterMode } = useTheaterMode()
  const sessionActive = stage === STAGE.PREP || stage === STAGE.RECORD
  useEffect(() => {
    if (sessionActive) setTheaterMode(true)
    return () => setTheaterMode(false)
  }, [sessionActive, setTheaterMode])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      // Stop any in-flight recorder and release the object URL on unmount.
      audioRecRef.current?.stop().catch(() => {})
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  // Drop the current recording + free its object URL. Called when a fresh
  // attempt starts, when the student switches to typing, or on reset.
  const clearAudio = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setAudioUrl(null)
  }

  const logSpeakingSession = useStore(s => s.logSpeakingSession)
  const addMistake = useStore(s => s.addMistake)
  const speakingHistory = useStore(s => s.speakingHistory) || EMPTY_ARR
  const recentSpeaking = useMemo(() => speakingHistory.slice(-5).reverse(), [speakingHistory])

  // Auto-select a preset topic when arriving from a deep-link (e.g. the
  // Dashboard "Re-do your weakest answer" widget). Only runs once.
  useEffect(() => {
    if (!presetTopicId || topic) return
    const match = activeTopics.find(t => t.id === presetTopicId)
    if (match) setTopic(match)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetTopicId])

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

  // `resume: true` restarts the mic after an unexpected pause WITHOUT wiping the
  // transcript captured so far (the student keeps their train of thought).
  const beginRecording = ({ resume = false } = {}) => {
    if (!hasSpeechRecognition()) {
      setRecError('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }
    setRecError(null)
    if (!resume) {
      setTranscript('')
      setInterim('')
      setHeuristic(null)
      setAi(null)
      setAiError(null)
      setTyped('')
      setShowType(false)
      clearAudio()
      // Start capturing audio in parallel so the student can replay themselves
      // later (spec §4b/D). Best-effort: a denied/absent mic must never block
      // speaking — the SpeechRecognition path and grading run regardless.
      if (hasAudioRecording()) {
        const ar = createAudioRecorder()
        ar.start().then(() => { audioRecRef.current = ar }).catch(() => { audioRecRef.current = null })
      }
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = isEng ? 'en-GB' : 'ms-MY'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      // Any result (even interim) proves the backend is hearing us — clears the
      // flicker-loop guard so an actively-speaking student is never cut off.
      if (recRef.current) { recRef.current._gotResult = true; recRef.current._restarts = 0 }
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
      const msg = describeSpeechError(ev.error, isEng ? 'English' : 'Malay')
      if (!msg) return // benign (no-speech / aborted) — keep listening
      // A real error won't fix itself by restarting — stop, explain, and open
      // the type fallback so the student is never stuck talking to a wall.
      if (recRef.current) recRef.current._stopRequested = true
      try { rec.stop() } catch { /* already stopped */ }
      setRecording(false)
      setDidStopListening(false)
      setRecError(msg)
      setShowType(true)
    }
    rec.onend = () => {
      // If the user clicked stop, don't auto-restart.
      if (recRef.current && recRef.current._stopRequested) return
      // Flicker guard: if the session keeps ending instantly with NOTHING ever
      // captured, the backend can't transcribe this language (the ms-MY silent
      // failure) — restarting just flickers the mic indicator. Stop the loop and
      // open the type fallback instead of pretending to listen.
      const r = recRef.current
      if (r && !r._gotResult) {
        r._restarts = (r._restarts || 0) + 1
        if (r._restarts >= 3) {
          r._stopRequested = true
          setRecording(false)
          setShowType(true)
          setRecError(isEng
            ? "We can't pick up your voice here — type your answer below instead."
            : 'Kami tidak dapat mengesan suara anda — taip jawapan di bawah.')
          return
        }
      }
      // Otherwise this is a normal post-silence end — restart for continuous mode.
      try {
        rec.start()
      } catch {
        // Restart failed (e.g. browser policy or permission lost)
        setRecording(false)
        setDidStopListening(true)
      }
    }
    recRef.current = rec
    recRef.current._stopRequested = false
    recRef.current._gotResult = false
    recRef.current._restarts = 0
    rec.start()
    if (!resume) setStartedAt(Date.now()) // keep the original start time across resumes
    setRecording(true)
    setDidStopListening(false)
    setStage(STAGE.RECORD)
  }
  const startRecording = () => beginRecording({ resume: false })
  const resumeRecording = () => beginRecording({ resume: true })

  // Enter the answer screen in pure-type mode — no mic, just the textarea. The
  // first-class alternative for students whose browser can't transcribe Malay.
  const startTyping = () => {
    setRecError(null)
    setTranscript('')
    setInterim('')
    setHeuristic(null)
    setAi(null)
    setAiError(null)
    setTyped('')
    setShowType(true)
    setRecording(false)
    setDidStopListening(false)
    setStartedAt(Date.now())
    clearAudio() // pure-type mode has no recording to replay
    setStage(STAGE.RECORD)
  }

  // Finalize the parallel audio capture into a replayable object URL when the
  // student actually spoke; discard it for a typed-only answer. Async + best-
  // effort so it never blocks grading or the jump to RESULTS.
  const finalizeAudio = (wasTyped) => {
    const ar = audioRecRef.current
    audioRecRef.current = null
    if (!ar) return
    ar.stop().then((blob) => {
      if (wasTyped || !blob || blob.size === 0) return
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      setAudioUrl(url)
    }).catch(() => {})
  }

  const stopRecording = () => {
    // Works whether or not a mic session is active — a typed-only answer (the
    // no-STT path) has no recRef but must still grade.
    if (recRef.current) {
      recRef.current._stopRequested = true
      try { recRef.current.stop() } catch { /* already stopped */ }
      recRef.current = null
    }
    setRecording(false)
    setDidStopListening(false)
    const finalDuration = capDuration(startedAt ? (Date.now() - startedAt) / 1000 : durationSec)
    setDurationSec(finalDuration)

    // Build the heuristic grade synchronously. Fall back to the typed answer
    // when STT captured nothing — the grade is computed from text either way.
    const spoken = (transcript + ' ' + interim).trim()
    const fullTranscript = spoken || typed.trim()
    const wasTyped = !spoken && !!fullTranscript
    // Keep the recording only for a spoken answer (so it can be replayed); a
    // typed-only answer has nothing meaningful to hear back.
    finalizeAudio(wasTyped)
    // Mirror a typed-only answer into `transcript` so the results view, the AI
    // grade and the diff all read from one place.
    if (wasTyped) setTranscript(fullTranscript)
    if (fullTranscript) {
      const h = heuristicGrade({
        transcript: fullTranscript,
        topic,
        durationSec: finalDuration,
        lang,
        typed: wasTyped, // skip pace/duration penalties for a typed answer
      })
      setHeuristic(h)
      logSpeakingSession?.({
        topicId: topic.id,
        band: h.band,
        durationSec: h.durationSec,
        wordCount: h.wordCount,
        transcript: fullTranscript.slice(0, 1000), // cap for storage
        lang,
        weak: weaknessFlags(h, topic), // exact weakness flags (additive JSONB)
      })
      // Pipe weak speaking sessions into the mistake journal so the Fix-Up
      // queue surfaces fluency/marker/filler patterns alongside writing errors.
      if (h.band <= 3 && Array.isArray(h.tips)) {
        const language = isEng ? 'en' : 'ms' // lang is 'eng'|'malay' (never 'en') — use the existing isEng so English sessions log English-tagged mistakes
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
    // Auto-run the AI examiner for users on their OWN key (BYOK) — it's the
    // accurate grade and it's billed to them, so the heuristic stays a quick
    // estimate. Owner-key users keep the manual button (protects the daily quota).
    if (fullTranscript && aiGradeAvailable() && hasUserOpenRouterKey()) {
      runAiGrade(fullTranscript)
    }
    setStage(STAGE.RESULTS)
  }

  const runAiGrade = async (explicitTranscript) => {
    if (!topic) return
    const fullTranscript = (explicitTranscript || (transcript + ' ' + interim)).trim()
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
    setTyped('')
    setShowType(false)
    audioRecRef.current?.stop().catch(() => {})
    audioRecRef.current = null
    clearAudio()
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
        <div className="flex gap-2" data-guide="speaking-lang">
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
          {activeTopics.map((t, idx) => {
            const lastBand = recentSpeaking.find(h => h.topicId === t.id)?.band
            return (
              <button key={t.id} onClick={() => { setTopic(t); setStage(STAGE.PREP) }}
                {...(idx === 0 ? { 'data-guide': 'speaking-topics' } : {})}
                className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01]"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold">{t.title}</h3>
                  <div className="flex items-center gap-1.5" {...(idx === 0 ? { 'data-guide': 'speaking-badges' } : {})}>
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
          <Mic size={14} /> {isEng ? 'Speak my answer' : 'Bercakap jawapan'}
        </button>
        {/* Typing is a first-class alternative, not just a fallback — Malay STT is
            unreliable, so a student can always choose to type and still get graded. */}
        <button onClick={startTyping}
          className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <Keyboard size={14} /> {isEng ? 'Type my answer instead' : 'Taip jawapan saya'}
        </button>
        {/* Mic pre-prompt (friction #6): set expectations before the browser's
            permission popup, so it isn't denied by reflex. */}
        {hasSpeechRecognition() && (
          <p className="text-[11px] text-center flex items-center justify-center gap-1.5" style={{ color: 'var(--color-dim)' }}>
            <Mic size={11} />
            {isEng
              ? 'Your browser will ask for mic access — tap Allow so you can speak.'
              : 'Pelayar akan minta akses mikrofon — tap Benarkan untuk bercakap.'}
          </p>
        )}
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
    // In the RECORD stage the mic is only NOT recording when it stopped on its
    // own (the user's "Stop & grade" jumps straight to RESULTS).
    const paused = !recording && didStopListening
    // The mic claims to be on but nothing is coming through (the ms-MY silent
    // failure). Be honest after a short grace period and open the fallback.
    const noCapture = recording && !liveText && durationSec >= NO_CAPTURE_SECS
    const showFallback = showType || noCapture || !!recError
    // In pure-type mode (entered via "Type my answer", no mic) there's no speech
    // context, so hide the recording status + live-transcript card.
    const speechContext = recording || paused || noCapture || !!liveText
    return (
      <div className="space-y-4 animate-fadeUp">
        {recError ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid var(--color-red)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <MicOff size={15} style={{ color: 'var(--color-red)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--color-red)' }}>
                {isEng ? 'Mic problem' : 'Masalah mikrofon'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{recError}</p>
          </div>
        ) : noCapture ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,152,0,0.1)', border: '1px solid var(--color-orange)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <MicOff size={15} style={{ color: 'var(--color-orange)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--color-orange)' }}>
                {isEng ? 'Not hearing you' : 'Tidak mendengar anda'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              {isEng
                ? "The mic is on but no words are coming through. Check it's allowed and speak clearly — or type your answer below."
                : 'Mikrofon hidup tetapi tiada perkataan dikesan. Pastikan ia dibenarkan dan bercakap dengan jelas — atau taip jawapan di bawah.'}
            </p>
          </div>
        ) : recording ? (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid var(--color-accent)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--color-red)' }} />
              <span className="text-sm font-bold">Recording…</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              {durationSec}s elapsed · target ~{topic.expectedDurationSec}s
            </p>
          </div>
        ) : paused ? (
          // Mic stopped on its own (long pause / browser silence cut-off). Be
          // loud and honest about it — and give a one-tap way back in.
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,152,0,0.1)', border: '1px solid var(--color-orange)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <MicOff size={15} style={{ color: 'var(--color-orange)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--color-orange)' }}>
                {isEng ? 'Stopped listening' : 'Berhenti mendengar'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              {isEng ? 'The mic paused after a silence — tap Resume to keep going.' : 'Mikrofon berhenti selepas senyap — tap Sambung untuk teruskan.'}
            </p>
          </div>
        ) : null}

        {speechContext && (
          <div className="rounded-2xl p-4 min-h-[180px]" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h4 className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--color-dim)' }}>Live transcript</h4>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              <span>{transcript}</span>{' '}
              <span style={{ color: 'var(--color-dim)' }}>{interim}</span>
              {!liveText && <span style={{ color: 'var(--color-dim)' }}>{isEng ? 'Start speaking…' : 'Mula bercakap…'}</span>}
            </p>
          </div>
        )}

        {/* Type-what-you-said fallback. Always reachable via the toggle; opens
            automatically when the mic can't hear (no-capture watchdog or a
            surfaced error) so the learning loop never dead-ends. */}
        {showFallback ? (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
              {isEng ? 'Type your answer instead' : 'Taip jawapan anda'}
            </label>
            <textarea value={typed} onChange={e => setTyped(e.target.value)} rows={4}
              className="w-full p-3 rounded-xl text-sm outline-none resize-y"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              placeholder={isEng
                ? 'Type what you wanted to say — you’ll still get a band and fixes.'
                : 'Taip apa yang anda ingin katakan — anda tetap dapat band dan pembetulan.'} />
          </div>
        ) : (
          <button onClick={() => setShowType(true)} className="w-full text-xs underline" style={{ color: 'var(--color-dim)' }}>
            {isEng ? 'Can’t speak right now? Type your answer instead' : 'Tidak boleh bercakap sekarang? Taip jawapan anda'}
          </button>
        )}

        {/* Resume is the primary action when the mic stopped on its own; it
            restarts listening without discarding what was already transcribed. */}
        {paused && (
          <button onClick={resumeRecording}
            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent)' }}>
            <Mic size={14} /> {isEng ? 'Resume recording' : 'Sambung rakaman'}
          </button>
        )}
        <button onClick={stopRecording}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{
            background: recording ? 'var(--color-red)' : 'var(--color-surface)',
            border: recording ? 'none' : '1px solid var(--color-border)',
            color: recording ? '#fff' : 'var(--color-text)',
          }}>
          <Square size={14} /> {recording
            ? (isEng ? 'Stop & grade' : 'Berhenti & nilai')
            : (isEng ? 'Grade my answer' : 'Nilai jawapan')}
        </button>
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
            No answer captured yet — speak or type your answer, then grade.
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
              <p className="font-bold">
                Band {heuristic.band}/6
                {aiGradeAvailable() && (
                  <span className="text-[10px] font-normal ml-1.5" style={{ color: 'var(--color-dim)' }}>· quick estimate</span>
                )}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                {heuristic.typed
                  ? `${heuristic.wordCount} words · typed`
                  : `${heuristic.wordCount} words · ${heuristic.durationSec}s · ${heuristic.wordsPerSec} wps`}
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

          {/* Listen back (spec §4b/D) — replay yourself next to the model TTS.
              The strongest free pronunciation practice: no STT needed. The model
              is the AI's improved version of your answer when available, else the
              topic prompt read in native Malay/English for ear-training. */}
          {(audioUrl || hasSpeechSynthesis()) && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Volume2 size={14} style={{ color: 'var(--color-cyan)' }} />
                {isEng ? 'Listen back' : 'Dengar semula'}
              </h3>
              {audioUrl ? (
                <div>
                  <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: 'var(--color-dim)' }}>
                    {isEng ? 'Your answer' : 'Jawapan anda'}
                  </p>
                  <audio src={audioUrl} controls className="w-full" style={{ height: 38 }} />
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                  {isEng
                    ? 'Speak (don’t type) your next answer to record it and hear yourself back here.'
                    : 'Bercakap (bukan taip) jawapan seterusnya untuk merakam dan dengar semula di sini.'}
                </p>
              )}
              {hasSpeechSynthesis() && (() => {
                const modelText = ai?.improvedTranscript || topic.prompt
                const improved = !!ai?.improvedTranscript
                return (
                  <div>
                    <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: 'var(--color-dim)' }}>
                      {improved
                        ? (isEng ? 'Model — your answer, improved' : 'Model — jawapan anda, diperbaik')
                        : (isEng ? 'Model — hear the prompt' : 'Model — dengar soalan')}
                    </p>
                    <button onClick={() => speak(modelText, isEng ? 'en-GB' : 'ms-MY')}
                      className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
                      <Volume2 size={14} /> {isEng ? 'Play model' : 'Main model'}
                    </button>
                    {audioUrl && (
                      <p className="text-[11px] mt-2" style={{ color: 'var(--color-dim)' }}>
                        {isEng
                          ? 'Compare the rhythm and clarity of your answer with the model.'
                          : 'Bandingkan rentak dan kejelasan jawapan anda dengan model.'}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

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
