import { useState } from 'react'
import { ArrowRight, Mic, Volume2, RotateCcw, MessageSquare, Sparkles } from 'lucide-react'
import SCENARIOS from '../data/scenarios'
import DICTIONARY from '../data/dictionary'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import { evaluateResponse, generateFeedback } from '../lib/cikguBot'
import { fireConfetti } from '../lib/confetti'

export default function Roleplay() {
  const [scenario, setScenario] = useState(null)
  const [turn, setTurn] = useState(0)
  const [responses, setResponses] = useState([])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [complete, setComplete] = useState(false)
  const [turnFeedback, setTurnFeedback] = useState(null)

  const startScenario = (s) => {
    setScenario(s)
    setTurn(0)
    setResponses([])
    setInput('')
    setComplete(false)
    setTurnFeedback(null)
  }

  const submitResponse = () => {
    if (!input.trim()) return

    // Evaluate with Cikgu Bot
    const evaluation = evaluateResponse(input.trim())
    const feedback = generateFeedback(evaluation)

    const newResponse = {
      turn,
      text: input.trim(),
      evaluation,
      feedback
    }

    const newResponses = [...responses, newResponse]
    setResponses(newResponses)
    setTurnFeedback({ evaluation, feedback })
    setInput('')

    // Auto-advance after showing feedback
    setTimeout(() => {
      setTurnFeedback(null)
      if (turn >= scenario.turns.length - 1) {
        setComplete(true)
      } else {
        setTurn(turn + 1)
      }
    }, 2500)
  }

  const speakResponse = async () => {
    if (!hasSpeechRecognition()) return
    setListening(true)
    try {
      const results = await startRecognition('ms-MY')
      if (results.length > 0) {
        setInput(results[0].transcript)
      }
    } catch (err) {
      console.error('Speech error:', err)
    }
    setListening(false)
  }

  // ── Scenario List ──
  if (!scenario) {
    return (
      <div className="space-y-3 animate-fadeUp">
        <h2 className="text-lg font-bold mb-1">Interactive Roleplay</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-dim)' }}>
          Practice IGCSE Paper 3 speaking scenarios. The app plays the examiner — you respond!
        </p>
        <div className="space-y-3">
          {SCENARIOS.map(s => (
            <button key={s.id} onClick={() => startScenario(s)}
              className="w-full text-left rounded-2xl p-4 transition-transform hover:scale-[1.01]"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{s.title}</h3>
                <ArrowRight size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{s.contextEn}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent2)' }}>
                  {s.turns.length} turns
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(68,138,255,0.15)', color: 'var(--color-blue)' }}>
                  Paper 3
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Scorecard ──
  if (complete) {
    const wordCount = responses.reduce((sum, r) => sum + r.text.split(/\s+/).length, 0)
    const avgWords = Math.round(wordCount / responses.length)

    // Deep analysis
    const allText = responses.map(r => r.text).join(' ').toLowerCase()
    const allWords = allText.split(/\s+/).filter(w => w.length > 1)
    const dictMatches = allWords.filter(w => DICTIONARY[w.replace(/[.,!?]/g, '')])
    const uniqueVocab = new Set(dictMatches).size
    const imbuhanPrefixes = allText.match(/\b(me[nm]?[a-z]+|ber[a-z]+|di[a-z]+|ter[a-z]+)\b/g) || []
    const uniqueImbuhan = new Set(imbuhanPrefixes).size
    const sentences = responses.map(r => r.text.split(/[.!?]+/).filter(s => s.trim().length > 3)).flat()
    const complexSentences = sentences.filter(s => /(yang|kerana|tetapi|walaupun|supaya|apabila|jika)/i.test(s)).length

    // Combined score: 50% scenario completion + 50% Cikgu Bot average
    const botAvg = responses.length > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.evaluation.overall, 0) / responses.length)
      : 0
    const scenarioScore = Math.min(100, Math.round(
      (responses.length / scenario.turns.length) * 30 +
      Math.min(30, uniqueVocab * 3) +
      Math.min(20, uniqueImbuhan * 5) +
      Math.min(20, avgWords * 2)
    ))
    const score = Math.round(scenarioScore * 0.5 + botAvg * 0.5)

    if (score >= 70) setTimeout(() => fireConfetti(), 300)

    return (
      <div className="space-y-4 animate-fadeUp">
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-4xl mb-3">{score >= 80 ? '🏆' : score >= 60 ? '🎉' : '💪'}</p>
          <h2 className="text-xl font-bold mb-2">Roleplay Complete!</h2>
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>{scenario.title}</p>

          {/* Score ring */}
          <div className="relative w-24 h-24 mx-auto mt-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={score >= 80 ? 'var(--color-green)' : score >= 60 ? 'var(--color-orange)' : 'var(--color-red)'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${score * 2.64} 264`}
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: score >= 80 ? 'var(--color-green)' : score >= 60 ? 'var(--color-orange)' : 'var(--color-red)' }}>
                {score}
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Turns', value: responses.length, color: 'var(--color-green)' },
            { label: 'Avg Words', value: avgWords, color: 'var(--color-blue)' },
            { label: 'Dict Words', value: uniqueVocab, color: 'var(--color-cyan)' },
            { label: 'Imbuhan', value: uniqueImbuhan, color: 'var(--color-purple)' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--color-dim)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Per-turn feedback from Cikgu Bot */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--color-cyan)' }} /> Cikgu Bot Analysis
          </h3>
          {responses.map((r, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: 'var(--color-blue)' }}>Turn {i + 1}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: r.evaluation.quality === 'excellent' ? 'rgba(0,230,118,0.15)'
                      : r.evaluation.quality === 'good' ? 'rgba(255,145,0,0.15)'
                      : 'rgba(255,82,82,0.15)',
                    color: r.evaluation.quality === 'excellent' ? 'var(--color-green)'
                      : r.evaluation.quality === 'good' ? 'var(--color-orange)'
                      : 'var(--color-red)',
                  }}>
                  {r.evaluation.overall}%
                </span>
              </div>
              <p className="text-sm mb-1">{r.text}</p>
              <p className="text-xs italic" style={{ color: 'var(--color-cyan)' }}>{r.feedback}</p>
              {/* Breakdown badges */}
              <div className="flex flex-wrap gap-1 mt-1">
                {r.evaluation.hasGreeting && <Badge label="Salam" color="var(--color-green)" />}
                {r.evaluation.hasCourtesy && <Badge label="Sopan" color="var(--color-green)" />}
                {r.evaluation.hasQuestions && <Badge label="Soalan" color="var(--color-blue)" />}
                {r.evaluation.hasConnectors && <Badge label="Penghubung" color="var(--color-purple)" />}
                {r.evaluation.imbuhanCount > 0 && <Badge label={`${r.evaluation.imbuhanCount} imbuhan`} color="var(--color-cyan)" />}
                {r.evaluation.length >= 8 && <Badge label="Panjang" color="var(--color-orange)" />}
              </div>
            </div>
          ))}
        </div>

        {/* Analysis suggestions */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-2">Suggestions</h3>
          <div className="space-y-1 text-xs" style={{ color: 'var(--color-dim)' }}>
            {avgWords < 8 && <p>• Cuba guna ayat lebih panjang (8+ perkataan setiap giliran)</p>}
            {uniqueImbuhan < 3 && <p>• Guna lebih banyak imbuhan (meN-, ber-, di-) untuk tunjuk penguasaan tatabahasa</p>}
            {uniqueVocab < 5 && <p>• Masukkan lebih banyak perkataan daripada kamus dalam jawapan awak</p>}
            {complexSentences < 2 && <p>• Tambah ayat kompleks dengan kata penghubung (kerana, tetapi, supaya)</p>}
            {!responses.some(r => r.evaluation.hasCourtesy) && <p>• Jangan lupa kata sopan santun (terima kasih, sila, tolong)</p>}
            {score >= 80 && <p style={{ color: 'var(--color-green)' }}>• Prestasi cemerlang! Awak sudah bersedia untuk peperiksaan.</p>}
          </div>
        </div>

        {/* Review responses */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-3">Conversation Log</h3>
          {responses.map((r, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-blue)' }}>Pemeriksa:</p>
              <p className="text-sm mb-2" style={{ color: 'var(--color-dim)' }}>{scenario.turns[i].examiner}</p>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-green)' }}>Awak:</p>
              <p className="text-sm">{r.text}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => startScenario(scenario)} className="flex-1 p-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent2)' }}>
            <RotateCcw size={14} /> Cuba Lagi
          </button>
          <button onClick={() => setScenario(null)} className="flex-1 p-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            Semua Senario
          </button>
        </div>
      </div>
    )
  }

  // ── Active Roleplay ──
  const currentTurn = scenario.turns[turn]
  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Context bar */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">{scenario.title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'var(--color-accent2)', color: '#fff' }}>
            Giliran {turn + 1}/{scenario.turns.length}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{scenario.context}</p>
      </div>

      {/* Progress */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((turn + 1) / scenario.turns.length) * 100}%`, background: 'linear-gradient(90deg, var(--color-accent2), var(--color-accent))' }} />
      </div>

      {/* Previous responses with inline feedback */}
      {responses.map((r, i) => (
        <div key={i} className="space-y-2">
          <div className="rounded-xl p-3 max-w-[85%]"
            style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Pemeriksa</p>
            <p className="text-sm">{scenario.turns[i].examiner}</p>
          </div>
          <div className="rounded-xl p-3 max-w-[85%] ml-auto"
            style={{ background: 'var(--color-accent2)', borderBottomRightRadius: 3 }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Awak</p>
            <p className="text-sm text-white">{r.text}</p>
          </div>
          {/* Inline Cikgu feedback */}
          <div className="ml-auto max-w-[85%] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}>
            <MessageSquare size={12} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-cyan)' }}>{r.feedback}</span>
            <span className="ml-auto font-bold" style={{
              color: r.evaluation.quality === 'excellent' ? 'var(--color-green)'
                : r.evaluation.quality === 'good' ? 'var(--color-orange)'
                : 'var(--color-red)'
            }}>
              {r.evaluation.overall}%
            </span>
          </div>
        </div>
      ))}

      {/* Current examiner prompt */}
      <div className="rounded-xl p-3 max-w-[85%]"
        style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Pemeriksa</p>
        <p className="text-sm">{currentTurn.examiner}</p>
        <button onClick={() => speak(currentTurn.examiner)} className="mt-2 text-xs flex items-center gap-1"
          style={{ color: 'var(--color-cyan)' }}>
          <Volume2 size={12} /> Dengar
        </button>
      </div>

      {/* Hint */}
      <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)' }}>
        💡 {currentTurn.hint}
      </div>

      {/* Live feedback toast */}
      {turnFeedback && (
        <div className="rounded-xl p-3 animate-fadeUp" style={{
          background: turnFeedback.evaluation.quality === 'excellent' ? 'rgba(0,230,118,0.12)'
            : turnFeedback.evaluation.quality === 'good' ? 'rgba(255,145,0,0.12)'
            : 'rgba(255,82,82,0.12)',
          border: '1px solid ' + (turnFeedback.evaluation.quality === 'excellent' ? 'var(--color-green)'
            : turnFeedback.evaluation.quality === 'good' ? 'var(--color-orange)'
            : 'var(--color-red)'),
        }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--color-cyan)' }} />
            <span className="text-sm font-bold" style={{
              color: turnFeedback.evaluation.quality === 'excellent' ? 'var(--color-green)'
                : turnFeedback.evaluation.quality === 'good' ? 'var(--color-orange)'
                : 'var(--color-red)'
            }}>
              {turnFeedback.evaluation.overall}%
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text)' }}>{turnFeedback.feedback}</span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitResponse() } }}
          className="flex-1 p-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)', minHeight: 48 }}
          placeholder="Taip jawapan dalam Bahasa Melayu..." autoFocus />
        {hasSpeechRecognition() && (
          <button onClick={speakResponse}
            className="w-12 rounded-xl flex items-center justify-center"
            style={{
              background: listening ? 'var(--color-red)' : 'var(--color-accent2)',
              color: '#fff',
            }}>
            <Mic size={20} />
          </button>
        )}
        <button onClick={submitResponse}
          className="px-4 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>
          Hantar
        </button>
      </div>
    </div>
  )
}

function Badge({ label, color }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
      style={{ background: `${color}15`, color }}>
      {label}
    </span>
  )
}
