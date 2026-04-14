import { useState } from 'react'
import { ArrowRight, Mic, Volume2, RotateCcw, MessageSquare, Sparkles, History, Zap } from 'lucide-react'
import SCENARIOS from '../data/scenarios'
import DICTIONARY from '../data/dictionary'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import { evaluateResponse, generateFeedback } from '../lib/cikguBot'
import { fireConfetti } from '../lib/confetti'
import { getRemainingCalls } from '../lib/ai'
import RoleplaySession from '../components/RoleplaySession'
import useStore from '../store/useStore'

export default function Roleplay() {
  const [scenario, setScenario] = useState(null)
  const [mode, setMode] = useState(null) // 'ai' | 'static'
  const [tab, setTab] = useState('scenarios') // 'scenarios' | 'history'
  const roleplayHistory = useStore(s => s.ai.roleplayHistory)

  // ── AI Mode ──
  if (scenario && mode === 'ai') {
    return (
      <RoleplaySession
        scenario={scenario}
        onExit={() => { setScenario(null); setMode(null) }}
      />
    )
  }

  // ── Static Mode (existing rule-based roleplay) ──
  if (scenario && mode === 'static') {
    return (
      <StaticRoleplay
        scenario={scenario}
        onExit={() => { setScenario(null); setMode(null) }}
      />
    )
  }

  // ── Scenario Selection ──
  const aiAvailable = getRemainingCalls() > 0 && import.meta.env.VITE_AI_MOCK === 'true' || getRemainingCalls() > 0

  return (
    <div className="space-y-3 animate-fadeUp">
      <h2 className="text-lg font-bold mb-1">Interactive Roleplay</h2>
      <p className="text-sm mb-2" style={{ color: 'var(--color-dim)' }}>
        Practice IGCSE Paper 3 speaking scenarios. The app plays the examiner — you respond!
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('scenarios')}
          className="flex-1 py-2 rounded-xl text-xs font-bold text-center transition-colors"
          style={{
            background: tab === 'scenarios' ? 'var(--color-accent2)' : 'var(--color-card)',
            color: tab === 'scenarios' ? '#fff' : 'var(--color-dim)',
            border: tab === 'scenarios' ? 'none' : '1px solid var(--color-border)',
          }}>
          Scenarios
        </button>
        <button onClick={() => setTab('history')}
          className="flex-1 py-2 rounded-xl text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
          style={{
            background: tab === 'history' ? 'var(--color-accent2)' : 'var(--color-card)',
            color: tab === 'history' ? '#fff' : 'var(--color-dim)',
            border: tab === 'history' ? 'none' : '1px solid var(--color-border)',
          }}>
          <History size={12} /> History {roleplayHistory.length > 0 && `(${roleplayHistory.length})`}
        </button>
      </div>

      {tab === 'scenarios' && (
        <div className="space-y-3">
          {/* AI status banner */}
          {aiAvailable ? (
            <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
              style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.12)' }}>
              <Zap size={12} style={{ color: 'var(--color-cyan)' }} />
              <span style={{ color: 'var(--color-cyan)' }}>AI Roleplay available — {getRemainingCalls()} calls remaining today</span>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(255,145,0,0.08)', color: 'var(--color-orange)', border: '1px solid rgba(255,145,0,0.12)' }}>
              AI unavailable — using static roleplay mode
            </div>
          )}

          {SCENARIOS.map(s => (
            <div key={s.id} className="rounded-2xl p-4 transition-transform"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold">{s.title}</h3>
                <ArrowRight size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{s.contextEn}</p>
              <div className="flex gap-2 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent2)' }}>
                  {s.totalTurns || s.turns.length} turns
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(68,138,255,0.15)', color: 'var(--color-blue)' }}>
                  Paper 3
                </span>
                {s.keyVocab && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(0,229,255,0.15)', color: 'var(--color-cyan)' }}>
                    {s.keyVocab.length} key words
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {aiAvailable && (
                  <button onClick={() => { setScenario(s); setMode('ai') }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 text-white"
                    style={{ background: 'var(--color-accent2)' }}>
                    <Sparkles size={12} /> AI Practice
                  </button>
                )}
                <button onClick={() => { setScenario(s); setMode('static') }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <MessageSquare size={12} /> {aiAvailable ? 'Static Mode' : 'Practice'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {roleplayHistory.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm" style={{ color: 'var(--color-dim)' }}>No roleplay history yet. Complete a session to see your progress!</p>
            </div>
          ) : (
            roleplayHistory.map((entry, i) => {
              const sc = SCENARIOS.find(s => s.id === entry.scenarioId)
              const bandColor = entry.score >= 5 ? 'var(--color-green)' : entry.score >= 3 ? 'var(--color-orange)' : 'var(--color-red)'
              return (
                <div key={i} className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <div>
                    <p className="text-sm font-bold">{sc?.title || entry.scenarioId}</p>
                    <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                      {new Date(entry.date).toLocaleDateString()} — {entry.turns} turns
                    </p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold" style={{ color: bandColor }}>{entry.score}</span>
                    <span className="text-xs" style={{ color: 'var(--color-dim)' }}>/6</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Static Roleplay (original rule-based mode, preserved as fallback) ──

function StaticRoleplay({ scenario, onExit }) {
  const [turn, setTurn] = useState(0)
  const [responses, setResponses] = useState([])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [complete, setComplete] = useState(false)
  const [turnFeedback, setTurnFeedback] = useState(null)

  const submitResponse = () => {
    if (!input.trim()) return
    const evaluation = evaluateResponse(input.trim())
    const feedback = generateFeedback(evaluation)
    const newResponse = { turn, text: input.trim(), evaluation, feedback }
    const newResponses = [...responses, newResponse]
    setResponses(newResponses)
    setTurnFeedback({ evaluation, feedback })
    setInput('')

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
      if (results.length > 0) setInput(results[0].transcript)
    } catch (err) { console.error('Speech error:', err) }
    setListening(false)
  }

  // ── Scorecard ──
  if (complete) {
    const wordCount = responses.reduce((sum, r) => sum + r.text.split(/\s+/).length, 0)
    const avgWords = Math.round(wordCount / responses.length)
    const allText = responses.map(r => r.text).join(' ').toLowerCase()
    const allWords = allText.split(/\s+/).filter(w => w.length > 1)
    const dictMatches = allWords.filter(w => DICTIONARY[w.replace(/[.,!?]/g, '')])
    const uniqueVocab = new Set(dictMatches).size
    const imbuhanPrefixes = allText.match(/\b(me[nm]?[a-z]+|ber[a-z]+|di[a-z]+|ter[a-z]+)\b/g) || []
    const uniqueImbuhan = new Set(imbuhanPrefixes).size
    const sentences = responses.map(r => r.text.split(/[.!?]+/).filter(s => s.trim().length > 3)).flat()
    const complexSentences = sentences.filter(s => /(yang|kerana|tetapi|walaupun|supaya|apabila|jika)/i.test(s)).length
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
          <p className="text-4xl mb-3">{score >= 80 ? '\u{1F3C6}' : score >= 60 ? '\u{1F389}' : '\u{1F4AA}'}</p>
          <h2 className="text-xl font-bold mb-2">Roleplay Complete!</h2>
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>{scenario.title}</p>
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

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--color-cyan)' }} /> Analysis
          </h3>
          {responses.map((r, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: 'var(--color-blue)' }}>Turn {i + 1}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: r.evaluation.quality === 'excellent' ? 'rgba(0,230,118,0.15)' : r.evaluation.quality === 'good' ? 'rgba(255,145,0,0.15)' : 'rgba(255,82,82,0.15)',
                    color: r.evaluation.quality === 'excellent' ? 'var(--color-green)' : r.evaluation.quality === 'good' ? 'var(--color-orange)' : 'var(--color-red)',
                  }}>
                  {r.evaluation.overall}%
                </span>
              </div>
              <p className="text-sm mb-1">{r.text}</p>
              <p className="text-xs italic" style={{ color: 'var(--color-cyan)' }}>{r.feedback}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-2">Suggestions</h3>
          <div className="space-y-1 text-xs" style={{ color: 'var(--color-dim)' }}>
            {avgWords < 8 && <p>- Try longer sentences (8+ words per turn)</p>}
            {uniqueImbuhan < 3 && <p>- Use more imbuhan (meN-, ber-, di-)</p>}
            {uniqueVocab < 5 && <p>- Include more dictionary words in your answers</p>}
            {complexSentences < 2 && <p>- Add complex sentences with connectors (kerana, tetapi, supaya)</p>}
            {score >= 80 && <p style={{ color: 'var(--color-green)' }}>- Excellent performance! You're exam-ready.</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setTurn(0); setResponses([]); setInput(''); setComplete(false); setTurnFeedback(null) }}
            className="flex-1 p-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent2)' }}>
            <RotateCcw size={14} /> Try Again
          </button>
          <button onClick={onExit} className="flex-1 p-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            All Scenarios
          </button>
        </div>
      </div>
    )
  }

  // ── Active Turn ──
  const currentTurn = scenario.turns[turn]
  return (
    <div className="space-y-3 animate-fadeUp">
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">{scenario.title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'var(--color-accent2)', color: '#fff' }}>
            Turn {turn + 1}/{scenario.turns.length}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{scenario.context}</p>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((turn + 1) / scenario.turns.length) * 100}%`, background: 'linear-gradient(90deg, var(--color-accent2), var(--color-accent))' }} />
      </div>

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
          <div className="ml-auto max-w-[85%] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}>
            <MessageSquare size={12} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-cyan)' }}>{r.feedback}</span>
            <span className="ml-auto font-bold" style={{
              color: r.evaluation.quality === 'excellent' ? 'var(--color-green)' : r.evaluation.quality === 'good' ? 'var(--color-orange)' : 'var(--color-red)'
            }}>
              {r.evaluation.overall}%
            </span>
          </div>
        </div>
      ))}

      <div className="rounded-xl p-3 max-w-[85%]"
        style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Pemeriksa</p>
        <p className="text-sm">{currentTurn.examiner}</p>
        <button onClick={() => speak(currentTurn.examiner)} className="mt-2 text-xs flex items-center gap-1"
          style={{ color: 'var(--color-cyan)' }}>
          <Volume2 size={12} /> Dengar
        </button>
      </div>

      <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)' }}>
        Hint: {currentTurn.hint}
      </div>

      {turnFeedback && (
        <div className="rounded-xl p-3 animate-fadeUp" style={{
          background: turnFeedback.evaluation.quality === 'excellent' ? 'rgba(0,230,118,0.12)' : turnFeedback.evaluation.quality === 'good' ? 'rgba(255,145,0,0.12)' : 'rgba(255,82,82,0.12)',
          border: '1px solid ' + (turnFeedback.evaluation.quality === 'excellent' ? 'var(--color-green)' : turnFeedback.evaluation.quality === 'good' ? 'var(--color-orange)' : 'var(--color-red)'),
        }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--color-cyan)' }} />
            <span className="text-sm font-bold" style={{
              color: turnFeedback.evaluation.quality === 'excellent' ? 'var(--color-green)' : turnFeedback.evaluation.quality === 'good' ? 'var(--color-orange)' : 'var(--color-red)'
            }}>
              {turnFeedback.evaluation.overall}%
            </span>
            <span className="text-xs">{turnFeedback.feedback}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitResponse() } }}
          className="flex-1 p-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)', minHeight: 48 }}
          placeholder="Taip jawapan dalam Bahasa Melayu..." autoFocus />
        {hasSpeechRecognition() && (
          <button onClick={speakResponse}
            className="w-12 rounded-xl flex items-center justify-center"
            style={{ background: listening ? 'var(--color-red)' : 'var(--color-accent2)', color: '#fff' }}>
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
