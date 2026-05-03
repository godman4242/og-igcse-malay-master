import { useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, Loader2, Mic, RotateCcw, Sparkles, Volume2 } from 'lucide-react'
import SCENARIOS from '../data/scenarios'
import { hasSpeechRecognition, speak, startRecognition } from '../lib/speech'
import { gradeSpeakingAttempt, getAISpeakingFeedback, isAISpeakingFeedbackAvailable } from '../lib/speakingGrader'
import useStore from '../store/useStore'

export default function Speaking() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]?.id || '')
  const [turnIndex, setTurnIndex] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [grade, setGrade] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const writingTutor = useStore(s => s.writingTutor)
  const logSpeakingAttempt = useStore(s => s.logSpeakingAttempt)
  const speakingHistory = useStore(s => s.speakingHistory || [])

  const scenario = useMemo(
    () => SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0],
    [scenarioId]
  )
  const turn = scenario?.turns?.[turnIndex] || scenario?.turns?.[0]
  const aiProvider = writingTutor?.provider === 'openrouter' ? 'openrouter' : 'gemini'
  const aiAvailable = isAISpeakingFeedbackAvailable(aiProvider)

  const resetAttempt = () => {
    setTranscript('')
    setGrade(null)
    setAiFeedback(null)
  }

  const record = async () => {
    if (!hasSpeechRecognition()) return
    setListening(true)
    setAiFeedback(null)
    try {
      const results = await startRecognition('ms-MY')
      if (results[0]?.transcript) setTranscript(results[0].transcript)
    } catch {
      // Speech recognition errors are surfaced by the browser permission UI.
    } finally {
      setListening(false)
    }
  }

  const analyse = async () => {
    if (!transcript.trim()) return
    const localGrade = gradeSpeakingAttempt({ transcript, scenario, turn })
    setGrade(localGrade)
    setAiFeedback(null)

    const entry = {
      scenarioId: scenario.id,
      turnIndex,
      transcript,
      band: localGrade.band,
      score: localGrade.overall,
      words: localGrade.wordCount,
    }
    logSpeakingAttempt?.(entry)

    if (!aiAvailable) return
    setLoadingAI(true)
    try {
      const feedback = await getAISpeakingFeedback({
        scenario,
        turn,
        transcript,
        grade: localGrade,
        provider: aiProvider,
      })
      setAiFeedback(feedback)
    } catch {
      setAiFeedback(null)
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Speaking Grader</h2>
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>IGCSE Paper 3 oral practice</p>
        </div>
        {speakingHistory.length > 0 && (
          <div className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            {speakingHistory.length} saved
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div>
          <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--color-dim)' }}>Scenario</label>
          <select value={scenarioId} onChange={(e) => { setScenarioId(e.target.value); setTurnIndex(0); resetAttempt() }}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {scenario.turns.map((_, i) => (
            <button key={i} onClick={() => { setTurnIndex(i); resetAttempt() }}
              className="py-2 rounded-lg text-xs font-bold"
              style={{
                background: turnIndex === i ? 'var(--color-accent2)' : 'var(--color-surface)',
                border: '1px solid ' + (turnIndex === i ? 'var(--color-accent2)' : 'var(--color-border)'),
                color: turnIndex === i ? 'var(--color-text)' : 'var(--color-dim)',
              }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Pemeriksa</p>
            <p className="text-sm">{turn.examiner}</p>
          </div>
          <button onClick={() => speak(turn.examiner)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
            <Volume2 size={16} />
          </button>
        </div>
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-surface)', color: 'var(--color-dim)' }}>
          {turn.hint}
        </p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <textarea value={transcript} onChange={e => { setTranscript(e.target.value); setGrade(null); setAiFeedback(null) }}
          className="w-full p-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)', minHeight: 140 }}
          placeholder="Record or type your Malay answer here..." />

        <div className="grid grid-cols-3 gap-2">
          <button onClick={record} disabled={!hasSpeechRecognition() || listening}
            className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            style={{
              background: listening ? 'var(--color-red)' : 'var(--color-accent2)',
              color: 'var(--color-text)',
              opacity: hasSpeechRecognition() ? 1 : 0.55,
            }}>
            {listening ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
            {listening ? 'Listening' : 'Record'}
          </button>
          <button onClick={analyse} disabled={!transcript.trim() || loadingAI}
            className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            style={{ background: 'var(--color-accent)', color: 'var(--color-text)', opacity: transcript.trim() ? 1 : 0.55 }}>
            {loadingAI ? <Loader2 size={13} className="animate-spin" /> : <BarChart3 size={13} />}
            Grade
          </button>
          <button onClick={resetAttempt}
            className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {grade && (
        <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: 'var(--color-dim)' }}>Paper 3 estimate</p>
              <p className="text-3xl font-bold" style={{ color: grade.band >= 5 ? 'var(--color-green)' : grade.band >= 3 ? 'var(--color-orange)' : 'var(--color-red)' }}>
                Band {grade.band}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{grade.overall}%</p>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{grade.wordCount} words</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Metric label="Task" value={grade.task} />
            <Metric label="Fluency" value={grade.fluency} />
            <Metric label="Grammar" value={grade.grammar} />
            <Metric label="Vocab" value={grade.coverage} />
          </div>

          <FeedbackList title="Strengths" items={grade.strengths} color="var(--color-green)" />
          <FeedbackList title="Next Fixes" items={grade.fixes} color="var(--color-orange)" />

          {grade.matchedScenarioVocab.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              Scenario words: {grade.matchedScenarioVocab.join(', ')}
            </p>
          )}
        </div>
      )}

      {(loadingAI || aiFeedback) && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--color-purple)' }} /> AI examiner note
          </h3>
          {loadingAI ? (
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Checking your answer...</p>
          ) : (
            <div className="space-y-3 text-sm">
              {aiFeedback.examinerComment && <p>{aiFeedback.examinerComment}</p>}
              {aiFeedback.pronunciationTip && <Tip label="Pronunciation" text={aiFeedback.pronunciationTip} />}
              {aiFeedback.improvedAnswer && <Tip label="Stronger answer" text={aiFeedback.improvedAnswer} />}
              {aiFeedback.nextDrill && <Tip label="Next drill" text={aiFeedback.nextDrill} />}
            </div>
          )}
        </div>
      )}

      {!aiAvailable && (
        <p className="text-xs text-center" style={{ color: 'var(--color-dim)' }}>
          Add Gemini or OpenRouter in Settings for AI examiner comments. Local grading works offline.
        </p>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--color-dim)' }}>{label}</span>
        <span className="font-bold">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-card2)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: 'var(--color-cyan)' }} />
      </div>
    </div>
  )
}

function FeedbackList({ title, items, color }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase mb-1" style={{ color }}>{title}</p>
      <div className="space-y-1">
        {items.map(item => (
          <p key={item} className="text-xs flex gap-2" style={{ color: 'var(--color-dim)' }}>
            <span style={{ color }}>-</span>
            <span>{item}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

function Tip({ label, text }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-purple)' }}>{label}</p>
      <p className="text-sm">{text}</p>
    </div>
  )
}
