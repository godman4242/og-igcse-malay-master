import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, FileText, Mic, PenLine, Play, RotateCcw, RotateCw, Trophy, Volume2, ChevronRight, Loader2, Headphones, Lock } from 'lucide-react'
import PASSAGES from '../data/comprehensionPassages'
import LISTENING_PASSAGES from '../data/listeningPassages'
import { pickRehearsalPassage, pickRehearsalListening } from '../lib/examPassages'
import { composeReadiness } from '../lib/examReadiness'
import useStore from '../store/useStore'
import { speak, startRecognition, hasSpeechRecognition, hasSpeechSynthesis } from '../lib/speech'
import { score as gradeWriting } from '../lib/writingGrader'
import { heuristicGrade } from '../lib/speakingGrader'
import { capDuration } from '../lib/duration'
import Toast from '../components/Toast'
import Meta from '../components/Meta'

const STAGE = {
  INTRO: 'intro',
  COMP: 'comp',
  LISTEN: 'listen',
  WRITE: 'write',
  SPEAK: 'speak',
  RESULTS: 'results',
}

// Stage budgets in seconds — enforced as soft warnings, not hard cuts.
const BUDGET = { COMP: 8 * 60, LISTEN: 6 * 60, WRITE: 12 * 60, SPEAK: 10 * 60 }

// Listening: up to 2 plays (IGCSE plays the audio twice), second slower.
const MAX_LISTEN_PLAYS = 2

// Passage selection now lives in src/lib/examPassages.js (pure + tested). A
// Malay/English toggle drives the language so a learner can drill one subject,
// replacing the old uncontrolled 60/40 MS/EN random mix (Issue 4a).

// Auto-derive a directed-writing prompt from a passage. Generic enough that
// it works across the pre-written + AI-generated catalogue without bespoke
// content, while still anchoring on the passage's topic.
function buildWritingPrompt(passage) {
  const isMs = passage.lang === 'ms'
  const topic = passage.topic || passage.title
  if (isMs) {
    return {
      task: `Berdasarkan petikan di atas tentang "${passage.title}", tulis sebuah RENCANA (article) yang membincangkan pandangan anda terhadap topik ini. Sertakan dua hujah dan satu contoh nyata.`,
      target: '180-220 patah perkataan',
      format: 'ms-rencana',
    }
  }
  return {
    task: `Based on the passage above about "${passage.title}", write an ARTICLE for your school magazine sharing your views on ${topic}. Include two arguments and one concrete example.`,
    target: '180-220 words',
    format: 'eng-article',
  }
}

// Auto-derive a speaking defense prompt anchored to the passage.
function buildSpeakingPrompt(passage) {
  const isMs = passage.lang === 'ms'
  if (isMs) {
    return {
      task: `Pertahankan atau kritik hujah utama petikan dalam masa 90 saat. Gunakan sekurang-kurangnya tiga contoh dari petikan atau hidup sendiri.`,
      target: '90 saat',
    }
  }
  return {
    task: `Defend or critique the main argument of the passage in 90 seconds. Use at least three examples from the passage or your own life.`,
    target: '90 seconds',
  }
}

// Clamp seconds → mm:ss for the inline timer.
function fmtMMSS(secs) {
  if (secs < 0) secs = 0
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ExamRehearsal() {
  const navigate = useNavigate()
  const logExamAttempt = useStore(s => s.logExamAttempt)
  const getExamReadiness = useStore(s => s.getExamReadiness)
  const getNextExamDue = useStore(s => s.getNextExamDue)
  const examAttempts = useStore(s => s.examAttempts)
  const examLang = useStore(s => s.examRehearsalLang)
  const setExamLang = useStore(s => s.setExamRehearsalLang)

  const readiness = getExamReadiness()
  const nextDue = getNextExamDue()

  const [stage, setStage] = useState(STAGE.INTRO)
  const [passage, setPassage] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [compAnswers, setCompAnswers] = useState({})
  const [writingText, setWritingText] = useState('')
  const [writingResult, setWritingResult] = useState(null)
  const [speakTranscript, setSpeakTranscript] = useState('')
  const [speakInterim, setSpeakInterim] = useState('')
  const [recording, setRecording] = useState(false)
  const [didStopListening, setDidStopListening] = useState(false)
  const [stageStartedAt, setStageStartedAt] = useState(null)
  const [rehearsalStartedAt, setRehearsalStartedAt] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [results, setResults] = useState(null)

  // Listening stage (audio-only). Hidden text, ≤2 plays, score by MCQ.
  // Only present when the browser has TTS — otherwise the stage is skipped and
  // readiness normalises over the other three skills (see examReadiness.js).
  const [listenPassage, setListenPassage] = useState(null)
  const [listenPlaysUsed, setListenPlaysUsed] = useState(0)
  const [listenPlaying, setListenPlaying] = useState(false)
  const [listenQIndex, setListenQIndex] = useState(0)
  const [listenAnswers, setListenAnswers] = useState({})
  // App-consistent transient feedback (replaces jarring native alert()).
  const [toast, setToast] = useState('')

  // Stage timer ticking every second
  useEffect(() => {
    if (stage === STAGE.INTRO || stage === STAGE.RESULTS) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [stage])

  // Stop any audio when leaving the page (mirrors Listening.jsx).
  useEffect(() => {
    return () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel() }
  }, [])

  // Play the listening passage (≤2 times, second play slower). Mirrors the
  // Listening page player; uses the raw utterance API for onend/rate control.
  const playListening = () => {
    if (!listenPassage || listenPlaysUsed >= MAX_LISTEN_PLAYS || listenPlaying || !hasSpeechSynthesis()) return
    setListenPlaying(true)
    const utterance = new SpeechSynthesisUtterance(listenPassage.text)
    utterance.lang = listenPassage.lang === 'en' ? 'en-GB' : 'ms-MY'
    utterance.rate = listenPlaysUsed === 0 ? 0.95 : 0.85
    utterance.onend = () => { setListenPlaying(false); setListenPlaysUsed(p => p + 1) }
    utterance.onerror = () => setListenPlaying(false)
    speechSynthesis.cancel()
    speechSynthesis.speak(utterance)
  }

  const stageBudget = stage === STAGE.COMP ? BUDGET.COMP
    : stage === STAGE.LISTEN ? BUDGET.LISTEN
    : stage === STAGE.WRITE ? BUDGET.WRITE
    : stage === STAGE.SPEAK ? BUDGET.SPEAK
    : 0
  const elapsed = stageStartedAt ? Math.floor((now - stageStartedAt) / 1000) : 0
  const remaining = Math.max(0, stageBudget - elapsed)

  const writingPrompt = useMemo(() => passage ? buildWritingPrompt(passage) : null, [passage])
  const speakingPrompt = useMemo(() => passage ? buildSpeakingPrompt(passage) : null, [passage])

  const flashToast = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }

  const start = () => {
    const p = pickRehearsalPassage(PASSAGES, examLang)
    if (!p) {
      flashToast(examLang === 'en'
        ? 'No English passages available yet — switch to Malay or add some to the comprehension catalogue.'
        : 'No Malay passages available yet — switch to English or add some to the comprehension catalogue.')
      return
    }
    setPassage(p)
    setQuestionIndex(0)
    setCompAnswers({})
    setWritingText('')
    setWritingResult(null)
    setSpeakTranscript('')
    setSpeakInterim('')
    // Pick a listening passage only when the browser can speak it — otherwise the
    // stage is skipped and readiness normalises over the other three skills.
    setListenPassage(hasSpeechSynthesis() ? pickRehearsalListening(LISTENING_PASSAGES, examLang) : null)
    setListenPlaysUsed(0)
    setListenPlaying(false)
    setListenQIndex(0)
    setListenAnswers({})
    const startTs = Date.now()
    setStageStartedAt(startTs)
    setRehearsalStartedAt(startTs)
    setStage(STAGE.COMP)
  }

  const advanceFromComp = () => {
    setStageStartedAt(Date.now())
    setStage(listenPassage ? STAGE.LISTEN : STAGE.WRITE)
  }

  const advanceFromListen = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setListenPlaying(false)
    setStageStartedAt(Date.now())
    setStage(STAGE.WRITE)
  }

  const advanceFromWrite = () => {
    if (!passage || !writingPrompt) return
    const r = gradeWriting(writingText, {
      lang: passage.lang === 'ms' ? 'malay' : 'eng',
      format: writingPrompt.format,
    })
    if (r.error) { flashToast(r.message); return }
    setWritingResult(r)
    setStageStartedAt(Date.now())
    setStage(STAGE.SPEAK)
  }

  // The shared startRecognition is one-shot. The student can press Record
  // again to append a follow-up sentence — perfectly fine for a 90-second
  // defense and avoids the cross-browser mess of continuous SR.
  const startRecording = async () => {
    if (!hasSpeechRecognition()) {
      flashToast('Speech recognition unavailable in this browser. Type your answer instead.')
      return
    }
    setRecording(true)
    setDidStopListening(false)
    setSpeakInterim('')
    try {
      const results = await startRecognition(passage.lang === 'ms' ? 'ms-MY' : 'en-GB')
      if (results.length > 0) {
        setSpeakTranscript(t => (t + ' ' + results[0].transcript).trim())
      }
    } catch {
      // benign — student stayed silent or browser blocked mic
    } finally {
      setRecording(false)
      setDidStopListening(true)
    }
  }

  const finishRehearsal = () => {
    if (!passage) return
    const fullTranscript = (speakTranscript + ' ' + speakInterim).trim()
    const speakDuration = stageStartedAt ? Math.floor((Date.now() - stageStartedAt) / 1000) : 60
    let speakingBand = 0
    let speakSummary = null
    if (fullTranscript) {
      const h = heuristicGrade({
        transcript: fullTranscript,
        topic: { id: 'exam-rehearsal', cues: [] },
        durationSec: Math.min(speakDuration, 120),
        lang: passage.lang === 'ms' ? 'malay' : 'eng',
      })
      speakingBand = h.band
      speakSummary = h
    }

    const compTotal = passage.questions.length
    const compCorrect = Object.entries(compAnswers).filter(([qId, ans]) => {
      const q = passage.questions.find(q => q.id === Number(qId))
      return q && ans === q.correctIndex
    }).length
    const comprehensionPct = Math.round((compCorrect / Math.max(1, compTotal)) * 100)
    const writingBand = writingResult?.band || 0

    // Listening score — only when the stage actually ran (browser had TTS).
    // listeningPct stays null otherwise so composeReadiness omits it.
    const listeningTotal = listenPassage?.questions?.length || 0
    const listeningCorrect = listenPassage
      ? Object.entries(listenAnswers).filter(([qId, ans]) => {
          const q = listenPassage.questions.find(q => q.id === Number(qId))
          return q && ans === q.correctIndex
        }).length
      : 0
    const listeningPct = listenPassage ? Math.round((listeningCorrect / Math.max(1, listeningTotal)) * 100) : null

    const composite = composeReadiness({ comprehensionPct, writingBand, speakingBand, listeningPct })

    // ADHD safeguard: soft timers never lock out, so cap an abandoned-session
    // duration at 1h before it reaches telemetry. See lib/duration + improvements.md §B.
    const totalSec = capDuration(rehearsalStartedAt ? (Date.now() - rehearsalStartedAt) / 1000 : 0)

    logExamAttempt({
      passageId: passage.id,
      lang: passage.lang,
      comprehensionPct,
      writingBand,
      speakingBand,
      listeningPct,
      readinessScore: composite,
      durationSec: totalSec > 0 ? totalSec : null,
      compAnswered: Object.keys(compAnswers).length,
      compTotal,
      writingWords: writingResult?.words || 0,
      speakingWords: speakSummary?.wordCount || 0,
      listeningCorrect,
      listeningTotal,
    })

    setResults({
      comprehensionPct,
      compCorrect,
      compTotal,
      writingBand,
      writingWords: writingResult?.words || 0,
      speakingBand,
      speakSummary,
      listeningPct,
      listeningCorrect,
      listeningTotal,
      listenTitle: listenPassage?.title || null,
      composite,
      passage,
    })
    setStage(STAGE.RESULTS)
  }

  // ─────────── INTRO ───────────
  if (stage === STAGE.INTRO) {
    return (
      <div className="space-y-4 animate-fadeUp">
        <Meta title="Exam Rehearsal | IGCSE Malay Master" description="A timed IGCSE exam rehearsal across comprehension, listening, writing and speaking with a composite Readiness score." />
        <Toast text={toast} />
        <div className="flex items-center gap-2">
          <Trophy size={18} style={{ color: 'var(--color-accent2)' }} />
          <h2 className="text-lg font-bold">Spaced Exam Rehearsal</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          A full IGCSE simulation across all four skills: read a passage and
          answer comprehension questions (8 min), listen to an audio clip
          and answer on what you hear (6 min, when your browser supports audio),
          write a directed task linked to the passage (12 min), then defend your
          view aloud (10 min). One composite "Exam Readiness %" is logged at the end.
        </p>

        {readiness && (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>
              Current readiness
            </p>
            <p className="text-4xl font-bold" style={{
              color: readiness.smoothed >= 70 ? 'var(--color-green)'
                : readiness.smoothed >= 50 ? 'var(--color-orange)'
                : 'var(--color-red)',
            }}>
              {readiness.smoothed}%
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>
              {readiness.attempts} {readiness.attempts === 1 ? 'attempt' : 'attempts'} ·
              {nextDue.dueNow
                ? ' next attempt due now'
                : ` next due in ${nextDue.daysLeft} ${nextDue.daysLeft === 1 ? 'day' : 'days'}`}
            </p>
          </div>
        )}

        <div data-guide="exam-stages" className="rounded-2xl p-4 space-y-2"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-1">Stages</h3>
          <Stage icon={<FileText size={14} />} color="var(--color-cyan)" label="Comprehension" budget="8 min"
            sub={examLang === 'en'
              ? 'Read an English passage, answer 4-5 IGCSE-style questions'
              : 'Read a Malay passage, answer 4-5 IGCSE-style questions'} />
          <Stage icon={<Headphones size={14} />} color="var(--color-orange)" label="Listening" budget="6 min"
            sub="Hear a short audio clip (played up to twice) and answer — audio only, no transcript" />
          <Stage icon={<PenLine size={14} />} color="var(--color-blue)" label="Directed writing" budget="12 min"
            sub="Write a 180-220 word article responding to the passage's topic" />
          <Stage icon={<Mic size={14} />} color="var(--color-accent2)" label="Spoken defense" budget="10 min"
            sub="Defend or critique the passage's argument aloud for 90 seconds" />
        </div>

        {/* Subject toggle (Issue 4a) — pick ONE language so you can drill a single
            syllabus instead of a random MS/EN mix. Choice is persisted. */}
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-dim)' }}>Language for this rehearsal</p>
          <div data-guide="exam-lang" className="flex gap-2" role="group" aria-label="Rehearsal language">
            {[{ id: 'ms', label: 'Bahasa Melayu' }, { id: 'en', label: 'English' }].map(l => (
              <button key={l.id} onClick={() => setExamLang(l.id)}
                aria-pressed={examLang === l.id}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: examLang === l.id ? 'var(--color-accent2)' : 'var(--color-card)',
                  color: examLang === l.id ? '#fff' : 'var(--color-dim)',
                  border: '1px solid ' + (examLang === l.id ? 'var(--color-accent2)' : 'var(--color-border)'),
                }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={start} data-guide="exam-start"
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent2)' }}>
          <Play size={14} /> Start rehearsal
        </button>

        {examAttempts?.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-2">Recent attempts</h3>
            <div className="space-y-1.5">
              {examAttempts.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--color-dim)' }}>
                    {new Date(a.ts).toLocaleDateString()} · {a.passageId}
                  </span>
                  <span className="font-bold" style={{
                    color: a.readinessScore >= 70 ? 'var(--color-green)'
                      : a.readinessScore >= 50 ? 'var(--color-orange)'
                      : 'var(--color-red)',
                  }}>
                    {a.readinessScore}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => navigate('/')}
          className="w-full py-2 rounded-xl text-xs font-bold"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          Back to dashboard
        </button>
      </div>
    )
  }

  // ─────────── COMP ───────────
  if (stage === STAGE.COMP && passage) {
    const currentQ = passage.questions[questionIndex]
    const userAnswer = compAnswers[currentQ?.id]
    const allAnswered = passage.questions.every(q => compAnswers[q.id] !== undefined)
    return (
      <div className="space-y-3 animate-fadeUp">
        <StageHeader label="Comprehension" remaining={remaining} budget={stageBudget} color="var(--color-cyan)" />
        <div className="rounded-2xl p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-2">{passage.title}</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line">{passage.text}</p>
          {hasSpeechSynthesis() && (
            <button onClick={() => speak(passage.text.slice(0, 200), passage.lang === 'en' ? 'en-GB' : 'ms-MY')}
              className="mt-2 text-xs flex items-center gap-1" style={{ color: 'var(--color-cyan)' }}>
              <Volume2 size={11} /> Listen
            </button>
          )}
        </div>

        {currentQ && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-accent2)' }}>
              Q{questionIndex + 1}/{passage.questions.length} · {currentQ.type}
            </p>
            <p className="text-sm font-bold mb-3">{currentQ.question}</p>
            <div className="space-y-2">
              {currentQ.options.map((opt, i) => {
                const selected = userAnswer === i
                return (
                  <button key={i}
                    onClick={() => setCompAnswers(prev => ({ ...prev, [currentQ.id]: i }))}
                    className="w-full text-left p-3 rounded-xl text-sm transition-colors"
                    style={{
                      background: selected ? 'rgba(68,138,255,0.12)' : 'var(--color-surface)',
                      border: `1.5px solid ${selected ? 'var(--color-blue)' : 'var(--color-border)'}`,
                    }}>
                    {opt}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between mt-3">
              <button onClick={() => setQuestionIndex(i => Math.max(0, i - 1))}
                disabled={questionIndex === 0}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{
                  background: 'var(--color-card2)', border: '1px solid var(--color-border)',
                  color: 'var(--color-dim)', opacity: questionIndex === 0 ? 0.4 : 1,
                }}>
                Previous
              </button>
              {questionIndex < passage.questions.length - 1 ? (
                <button onClick={() => setQuestionIndex(i => i + 1)}
                  disabled={userAnswer === undefined}
                  className="text-xs px-3 py-1.5 rounded-full font-bold text-white flex items-center gap-1"
                  style={{
                    background: 'var(--color-accent)',
                    opacity: userAnswer === undefined ? 0.4 : 1,
                  }}>
                  Next <ChevronRight size={11} />
                </button>
              ) : (
                <button onClick={advanceFromComp} disabled={!allAnswered}
                  className="text-xs px-3 py-1.5 rounded-full font-bold text-white flex items-center gap-1"
                  style={{
                    background: 'var(--color-accent2)',
                    opacity: allAnswered ? 1 : 0.4,
                  }}>
                  Continue to writing <ChevronRight size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Question dots */}
        <div className="flex justify-center gap-1.5">
          {passage.questions.map((q, i) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{
                background: i === questionIndex ? 'var(--color-accent)'
                  : compAnswers[q.id] !== undefined ? 'var(--color-blue)'
                  : 'var(--color-border)',
              }} />
          ))}
        </div>
      </div>
    )
  }

  // ─────────── LISTEN ───────────
  if (stage === STAGE.LISTEN && listenPassage) {
    const lq = listenPassage.questions[listenQIndex]
    const lAnswer = listenAnswers[lq?.id]
    const allListenAnswered = listenPassage.questions.every(q => listenAnswers[q.id] !== undefined)
    const playsRemaining = Math.max(0, MAX_LISTEN_PLAYS - listenPlaysUsed)
    const canAnswer = listenPlaysUsed >= 1
    return (
      <div className="space-y-3 animate-fadeUp">
        <StageHeader label="Listening" remaining={remaining} budget={stageBudget} color="var(--color-orange)" />

        {/* Audio player — transcript hidden; the only input is what you hear */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
            <Headphones size={14} style={{ color: 'var(--color-orange)' }} /> {listenPassage.title}
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{listenPassage.speakerHint}</p>
          <button onClick={playListening} disabled={playsRemaining === 0 || listenPlaying}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            style={{
              background: playsRemaining === 0 ? 'var(--color-card2)' : 'var(--color-orange)',
              color: playsRemaining === 0 ? 'var(--color-dim)' : 'var(--color-on-bright)',
              opacity: listenPlaying ? 0.7 : 1,
            }}>
            {listenPlaying
              ? (<><RotateCw size={14} className="animate-spin" /> Playing…</>)
              : playsRemaining === 0
                ? (<><Lock size={14} /> No replays left</>)
                : (<><Play size={14} /> {listenPlaysUsed === 0 ? 'Play audio' : 'Replay (slower)'} · {playsRemaining} left</>)}
          </button>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--color-dim)' }}>
            Played up to {MAX_LISTEN_PLAYS} times — the second play is slightly slower. No transcript shown.
          </p>
        </div>

        {!canAnswer && (
          <div className="rounded-xl p-3 text-xs flex items-center gap-2"
            style={{ background: 'rgba(255,145,0,0.06)', color: 'var(--color-orange)', border: '1px solid rgba(255,145,0,0.18)' }}>
            <Headphones size={12} /> Play the audio at least once to unlock the questions.
          </div>
        )}

        {canAnswer && lq && (
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-orange)' }}>
              Q{listenQIndex + 1}/{listenPassage.questions.length} · {lq.type}
            </p>
            <p className="text-sm font-bold mb-3">{lq.question}</p>
            <div className="space-y-2">
              {lq.options.map((opt, i) => {
                const selected = lAnswer === i
                return (
                  <button key={i}
                    onClick={() => setListenAnswers(prev => ({ ...prev, [lq.id]: i }))}
                    className="w-full text-left p-3 rounded-xl text-sm transition-colors"
                    style={{
                      background: selected ? 'rgba(255,145,0,0.12)' : 'var(--color-surface)',
                      border: `1.5px solid ${selected ? 'var(--color-orange)' : 'var(--color-border)'}`,
                    }}>
                    {opt}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between mt-3">
              <button onClick={() => setListenQIndex(i => Math.max(0, i - 1))} disabled={listenQIndex === 0}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)', opacity: listenQIndex === 0 ? 0.4 : 1 }}>
                Previous
              </button>
              {listenQIndex < listenPassage.questions.length - 1 ? (
                <button onClick={() => setListenQIndex(i => i + 1)} disabled={lAnswer === undefined}
                  className="text-xs px-3 py-1.5 rounded-full font-bold text-white flex items-center gap-1"
                  style={{ background: 'var(--color-accent)', opacity: lAnswer === undefined ? 0.4 : 1 }}>
                  Next <ChevronRight size={11} />
                </button>
              ) : (
                <button onClick={advanceFromListen} disabled={!allListenAnswered}
                  className="text-xs px-3 py-1.5 rounded-full font-bold text-white flex items-center gap-1"
                  style={{ background: 'var(--color-accent2)', opacity: allListenAnswered ? 1 : 0.4 }}>
                  Continue to writing <ChevronRight size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Question dots */}
        {canAnswer && (
          <div className="flex justify-center gap-1.5">
            {listenPassage.questions.map((q, i) => (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{
                  background: i === listenQIndex ? 'var(--color-accent)'
                    : listenAnswers[q.id] !== undefined ? 'var(--color-orange)'
                    : 'var(--color-border)',
                }} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────── WRITE ───────────
  if (stage === STAGE.WRITE && passage && writingPrompt) {
    const wordCount = writingText.trim().split(/\s+/).filter(Boolean).length
    return (
      <div className="space-y-3 animate-fadeUp">
        <Toast text={toast} />
        <StageHeader label="Directed writing" remaining={remaining} budget={stageBudget} color="var(--color-blue)" />
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(68,138,255,0.06)', border: '1px solid rgba(68,138,255,0.2)' }}>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-blue)' }}>Task</p>
          <p className="text-sm">{writingPrompt.task}</p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--color-dim)' }}>Target: {writingPrompt.target}</p>
        </div>
        <textarea value={writingText}
          onChange={(e) => setWritingText(e.target.value)}
          placeholder={passage.lang === 'ms' ? 'Mula menulis di sini...' : 'Begin your response here...'}
          className="w-full p-3 rounded-xl text-sm outline-none resize-none"
          style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            color: 'var(--color-text)', minHeight: 280,
          }} />
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{wordCount} words</span>
          <button onClick={advanceFromWrite} disabled={wordCount < 80}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1"
            style={{ background: 'var(--color-accent2)', opacity: wordCount < 80 ? 0.4 : 1 }}>
            Continue to speaking <ChevronRight size={11} />
          </button>
        </div>
      </div>
    )
  }

  // ─────────── SPEAK ───────────
  if (stage === STAGE.SPEAK && passage && speakingPrompt) {
    const fullTranscript = (speakTranscript + ' ' + speakInterim).trim()
    const wc = fullTranscript.split(/\s+/).filter(Boolean).length
    return (
      <div className="space-y-3 animate-fadeUp">
        <Toast text={toast} />
        <StageHeader label="Spoken defense" remaining={remaining} budget={stageBudget} color="var(--color-accent2)" />
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-accent2)' }}>Task</p>
          <p className="text-sm">{speakingPrompt.task}</p>
          <p className="text-[10px] mt-2" style={{ color: 'var(--color-dim)' }}>Target: {speakingPrompt.target}</p>
        </div>
        <div className="rounded-2xl p-4 min-h-32"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          {fullTranscript ? (
            <p className="text-sm">
              {speakTranscript}
              {speakInterim && <span style={{ color: 'var(--color-dim)' }}> {speakInterim}</span>}
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
              {hasSpeechRecognition()
                ? (passage.lang === 'ms' ? 'Tekan butang Rekod dan mula bercakap...' : 'Press Record and start speaking...')
                : (passage.lang === 'ms' ? 'Pengenalan suara tidak tersedia — taip jawapan anda.' : 'Speech recognition unavailable — type your answer below.')}
            </p>
          )}
          {!recording && didStopListening && fullTranscript && hasSpeechRecognition() && (
             <div className="mt-4 flex justify-center animate-fadeUp">
                <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(255, 152, 0, 0.1)', color: 'var(--color-orange)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                   Mic paused. Click Record to keep speaking.
                </span>
             </div>
          )}
        </div>
        {!hasSpeechRecognition() && (
          <textarea value={speakTranscript}
            onChange={(e) => setSpeakTranscript(e.target.value)}
            placeholder={passage.lang === 'ms' ? 'Taip jawapan lisan anda...' : 'Type your spoken response...'}
            className="w-full p-3 rounded-xl text-sm outline-none resize-none"
            style={{
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              color: 'var(--color-text)', minHeight: 120,
            }} />
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{wc} words</span>
          {hasSpeechRecognition() && (
            <button onClick={startRecording} disabled={recording}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1"
              style={{ background: recording ? 'var(--color-red)' : 'var(--color-accent2)' }}>
              <Mic size={12} className={recording ? 'animate-pulse' : ''} /> {recording ? 'Listening…' : 'Record'}
            </button>
          )}
          <button onClick={finishRehearsal} disabled={wc < 20}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1"
            style={{ background: 'var(--color-accent)', opacity: wc < 20 ? 0.4 : 1 }}>
            Finish rehearsal <ChevronRight size={11} />
          </button>
        </div>
      </div>
    )
  }

  // ─────────── RESULTS ───────────
  if (stage === STAGE.RESULTS && results) {
    const compositeColor = results.composite >= 70 ? 'var(--color-green)'
      : results.composite >= 50 ? 'var(--color-orange)'
      : 'var(--color-red)'
    const nextDueAfter = getNextExamDue()
    return (
      <div className="space-y-4 animate-fadeUp">
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-3xl mb-2">{results.composite >= 70 ? '\u{1F3C6}' : results.composite >= 50 ? '\u{1F389}' : '\u{1F4AA}'}</p>
          <h2 className="text-lg font-bold mb-1">Rehearsal complete</h2>
          <p className="text-[10px] uppercase font-bold mb-2" style={{ color: 'var(--color-dim)' }}>
            Exam Readiness
          </p>
          <p className="text-4xl font-bold" style={{ color: compositeColor }}>{results.composite}%</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-dim)' }}>
            Next rehearsal in {nextDueAfter.daysLeft} {nextDueAfter.daysLeft === 1 ? 'day' : 'days'}
          </p>
        </div>

        <div className={`grid gap-2 ${results.listeningPct != null ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <ResultTile label="Comprehension" value={`${results.comprehensionPct}%`} sub={`${results.compCorrect}/${results.compTotal}`} color="var(--color-cyan)" />
          {results.listeningPct != null && (
            <ResultTile label="Listening" value={`${results.listeningPct}%`} sub={`${results.listeningCorrect}/${results.listeningTotal}`} color="var(--color-orange)" />
          )}
          <ResultTile label="Writing" value={`band ${results.writingBand}`} sub={`${results.writingWords} words`} color="var(--color-blue)" />
          <ResultTile label="Speaking" value={`band ${results.speakingBand}`} sub={results.speakSummary ? `${results.speakSummary.wordCount} words` : 'no audio'} color="var(--color-accent2)" />
        </div>

        {results.speakSummary?.tips?.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-2">Speaking tips</h3>
            <ul className="text-xs space-y-1" style={{ color: 'var(--color-dim)' }}>
              {results.speakSummary.tips.slice(0, 3).map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setStage(STAGE.INTRO); setResults(null) }}
            className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <RotateCcw size={12} /> Try another
          </button>
          <button onClick={() => navigate('/')}
            className="py-3 rounded-xl text-xs font-bold text-white"
            style={{ background: 'var(--color-accent2)' }}>
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  // Loading fallback
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-dim)' }} />
    </div>
  )
}

function StageHeader({ label, remaining, budget, color }) {
  const overBudget = remaining === 0 && budget > 0
  return (
    <div className="flex items-center justify-between rounded-xl p-3"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <span className="text-sm font-bold" style={{ color }}>{label}</span>
      <span className="text-xs flex items-center gap-1 font-mono"
        style={{ color: overBudget ? 'var(--color-red)' : 'var(--color-dim)' }}>
        <Clock size={11} /> {fmtMMSS(remaining)} {overBudget && '(over)'}
      </span>
    </div>
  )
}

function Stage({ icon, color, label, budget, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', color }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-dim)' }}>{budget}</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{sub}</p>
      </div>
    </div>
  )
}

function ResultTile({ label, value, sub, color }) {
  return (
    <div className="rounded-xl p-3 text-center"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-dim)' }}>{label}</p>
      <p className="text-base font-bold mt-1" style={{ color }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{sub}</p>
    </div>
  )
}
