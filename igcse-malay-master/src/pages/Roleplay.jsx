import { useState } from 'react'
import { ArrowRight, Mic, MessageSquare, Volume2, RotateCcw } from 'lucide-react'
import SCENARIOS from '../data/scenarios'
import DICTIONARY from '../data/dictionary'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import { fireConfetti } from '../lib/confetti'

export default function Roleplay() {
  const [scenario, setScenario] = useState(null)
  const [turn, setTurn] = useState(0)
  const [responses, setResponses] = useState([])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [complete, setComplete] = useState(false)

  const startScenario = (s) => {
    setScenario(s)
    setTurn(0)
    setResponses([])
    setInput('')
    setComplete(false)
  }

  const submitResponse = () => {
    if (!input.trim()) return
    const newResponses = [...responses, { turn, text: input.trim() }]
    setResponses(newResponses)
    setInput('')
    if (turn >= scenario.turns.length - 1) {
      setComplete(true)
    } else {
      setTurn(turn + 1)
    }
  }

  const speakResponse = async () => {
    if (!hasSpeechRecognition()) {
      alert('Speech recognition is not supported in this browser. Try Chrome.')
      return
    }
    setListening(true)
    try {
      const results = await startRecognition('ms-MY')
      if (results.length > 0) {
        setInput(results[0].transcript)
      }
    } catch (e) {
      console.error('Speech error:', e)
    }
    setListening(false)
  }

  // Scenario list
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

  // Completed scorecard
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
    const score = Math.min(100, Math.round(
      (responses.length / scenario.turns.length) * 30 +
      Math.min(30, uniqueVocab * 3) +
      Math.min(20, uniqueImbuhan * 5) +
      Math.min(20, avgWords * 2)
    ))

    // Fire confetti for good scores
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

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-green)' }}>{responses.length}</div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>Turns</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-blue)' }}>{avgWords}</div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>Avg Words</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-cyan)' }}>{uniqueVocab}</div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>Dict Words Used</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-purple)' }}>{uniqueImbuhan}</div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>Imbuhan Used</div>
          </div>
        </div>

        {/* Per-turn improvement suggestions */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-2">Analysis</h3>
          <div className="space-y-1 text-xs" style={{ color: 'var(--color-dim)' }}>
            {avgWords < 8 && <p>• Try to use longer sentences (8+ words per turn)</p>}
            {uniqueImbuhan < 3 && <p>• Use more imbuhan (meN-, ber-, di-) to show grammar range</p>}
            {uniqueVocab < 5 && <p>• Incorporate more vocabulary from your study decks</p>}
            {complexSentences < 2 && <p>• Add complex sentences with conjunctions (kerana, tetapi, supaya)</p>}
            {score >= 80 && <p style={{ color: 'var(--color-green)' }}>• Excellent performance! You're exam-ready.</p>}
          </div>
        </div>

        {/* Review responses */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-3">Your Responses</h3>
          {responses.map((r, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-blue)' }}>Examiner:</p>
              <p className="text-sm mb-2" style={{ color: 'var(--color-dim)' }}>{scenario.turns[i].examiner}</p>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-green)' }}>You:</p>
              <p className="text-sm">{r.text}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => startScenario(scenario)} className="flex-1 p-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent2)' }}>
            <RotateCcw size={14} /> Retry
          </button>
          <button onClick={() => setScenario(null)} className="flex-1 p-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            All Scenarios
          </button>
        </div>
      </div>
    )
  }

  // Active roleplay
  const currentTurn = scenario.turns[turn]
  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Context bar */}
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

      {/* Progress */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((turn + 1) / scenario.turns.length) * 100}%`, background: 'linear-gradient(90deg, var(--color-accent2), var(--color-accent))' }} />
      </div>

      {/* Previous responses */}
      {responses.map((r, i) => (
        <div key={i} className="space-y-2">
          <div className="rounded-xl p-3 max-w-[85%]"
            style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Examiner</p>
            <p className="text-sm">{scenario.turns[i].examiner}</p>
          </div>
          <div className="rounded-xl p-3 max-w-[85%] ml-auto"
            style={{ background: 'var(--color-accent2)', borderBottomRightRadius: 3 }}>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>You</p>
            <p className="text-sm text-white">{r.text}</p>
          </div>
        </div>
      ))}

      {/* Current examiner prompt */}
      <div className="rounded-xl p-3 max-w-[85%]"
        style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Examiner</p>
        <p className="text-sm">{currentTurn.examiner}</p>
        <button onClick={() => speak(currentTurn.examiner)} className="mt-2 text-xs flex items-center gap-1"
          style={{ color: 'var(--color-cyan)' }}>
          <Volume2 size={12} /> Listen
        </button>
      </div>

      {/* Hint */}
      <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)' }}>
        💡 {currentTurn.hint}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitResponse() } }}
          className="flex-1 p-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)', minHeight: 48 }}
          placeholder="Type your response in Malay..." autoFocus />
        {hasSpeechRecognition() && (
          <button onClick={speakResponse}
            className="w-12 rounded-xl flex items-center justify-center"
            style={{
              background: listening ? 'var(--color-red)' : 'var(--color-accent2)',
              color: '#fff',
              animation: listening ? 'pulse 1s infinite' : 'none',
            }}>
            <Mic size={20} />
          </button>
        )}
        <button onClick={submitResponse}
          className="px-4 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>
          Send
        </button>
      </div>
    </div>
  )
}
