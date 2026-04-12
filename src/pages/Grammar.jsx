import { useState } from 'react'
import { CheckCircle, XCircle, BookOpen, Zap, AlertTriangle, Shuffle, RotateCcw } from 'lucide-react'
import { IMBUHAN_DRILLS, TENSE_DRILLS, ERROR_DRILLS, TRANSFORM_DRILLS, GRAMMAR_RULES } from '../data/grammar'
import useStore from '../store/useStore'

const TABS = [
  { id: 'drill', label: 'Imbuhan', icon: <Zap size={14} /> },
  { id: 'tense', label: 'Tense', icon: <BookOpen size={14} /> },
  { id: 'error', label: 'Find Error', icon: <AlertTriangle size={14} /> },
  { id: 'transform', label: 'Transform', icon: <Shuffle size={14} /> },
  { id: 'rules', label: 'Rules', icon: <BookOpen size={14} /> },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Grammar() {
  const [tab, setTab] = useState('drill')
  const grammarStats = useStore(s => s.grammarStats)
  const updateGrammarStats = useStore(s => s.updateGrammarStats)
  const resetGrammarStats = useStore(s => s.resetGrammarStats)

  // Imbuhan state
  const [drillIdx, setDrillIdx] = useState(0)
  const [input, setInput] = useState('')
  const [fb, setFb] = useState(null)
  const [drills] = useState(() => shuffle(IMBUHAN_DRILLS))

  // Tense state
  const [tenseIdx, setTenseIdx] = useState(0)
  const [tenseFb, setTenseFb] = useState(null)
  const [tenses] = useState(() => shuffle(TENSE_DRILLS))

  // Error state
  const [errorIdx, setErrorIdx] = useState(0)
  const [errorFb, setErrorFb] = useState(null)
  const [errors] = useState(() => shuffle(ERROR_DRILLS))

  // Transform state
  const [transIdx, setTransIdx] = useState(0)
  const [transInput, setTransInput] = useState('')
  const [transFb, setTransFb] = useState(null)
  const [transforms] = useState(() => shuffle(TRANSFORM_DRILLS))

  const drill = drills[drillIdx % drills.length]
  const tense = tenses[tenseIdx % tenses.length]
  const error = errors[errorIdx % errors.length]
  const transform = transforms[transIdx % transforms.length]

  const checkDrill = () => {
    if (fb || !input.trim()) return
    const correct = input.trim().toLowerCase() === drill.answer.toLowerCase()
    setFb({ correct, answer: drill.answer, rule: drill.rule })
    updateGrammarStats('imbuhan', correct)
    setTimeout(() => {
      setFb(null)
      setInput('')
      setDrillIdx(i => i + 1)
    }, 2200)
  }

  const checkTense = (chosen) => {
    if (tenseFb) return
    const correct = chosen === tense.answer
    setTenseFb({ correct, chosen, answer: tense.answer })
    updateGrammarStats('tense', correct)
    setTimeout(() => {
      setTenseFb(null)
      setTenseIdx(i => i + 1)
    }, 2200)
  }

  const checkError = (chosen) => {
    if (errorFb) return
    const correct = chosen === error.answer
    setErrorFb({ correct, chosen, answer: error.answer, explanation: error.explanation, correction: error.correction })
    updateGrammarStats('error', correct)
    setTimeout(() => {
      setErrorFb(null)
      setErrorIdx(i => i + 1)
    }, 3000)
  }

  const checkTransform = () => {
    if (transFb || !transInput.trim()) return
    const userAns = transInput.trim().toLowerCase().replace(/\.\s*$/, '')
    const correctAns = transform.answer.toLowerCase().replace(/\.\s*$/, '')
    const correct = userAns === correctAns
    setTransFb({ correct, answer: transform.answer })
    updateGrammarStats('transform', correct)
    setTimeout(() => {
      setTransFb(null)
      setTransInput('')
      setTransIdx(i => i + 1)
    }, 2500)
  }

  const getStatKey = () => {
    if (tab === 'drill') return 'imbuhan'
    if (tab === 'tense') return 'tense'
    if (tab === 'error') return 'error'
    if (tab === 'transform') return 'transform'
    return null
  }

  const statKey = getStatKey()
  const stats = statKey ? (grammarStats[statKey] || { correct: 0, total: 0 }) : null

  return (
    <div className="space-y-3 animate-fadeUp">
      <h2 className="text-lg font-bold">Grammar Drills</h2>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              background: tab === t.id ? 'var(--color-accent2)' : 'var(--color-card)',
              color: tab === t.id ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (tab === t.id ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Score bar (for drill tabs) */}
      {stats && stats.total > 0 && (
        <div className="flex items-center justify-between rounded-xl px-4 py-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex gap-4 text-xs">
            <span style={{ color: 'var(--color-green)' }}><b>{stats.correct}</b> correct</span>
            <span style={{ color: 'var(--color-dim)' }}><b>{stats.total}</b> total</span>
            <span style={{ color: 'var(--color-accent)' }}><b>{Math.round((stats.correct / stats.total) * 100)}%</b></span>
          </div>
          <button onClick={() => resetGrammarStats(statKey)} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      )}

      {/* IMBUHAN DRILLS */}
      {tab === 'drill' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          {/* Drill type badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,176,255,0.12)', color: 'var(--color-cyan)' }}>
              {drill.type === 'prefix' ? `Add ${drill.prefix}` : drill.type === 'passive' ? 'Active → Passive' : `Add ${drill.suffix}`}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
              #{(drillIdx % drills.length) + 1}/{drills.length}
            </span>
          </div>

          {drill.type === 'prefix' && (
            <>
              <p className="text-center text-2xl font-bold mb-1">{drill.root}</p>
              <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{drill.hint}</p>
            </>
          )}
          {drill.type === 'passive' && (
            <>
              <p className="text-center text-lg font-bold mb-1">{drill.active}</p>
              <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{drill.hint}</p>
            </>
          )}
          {drill.type === 'suffix' && (
            <>
              <p className="text-center text-2xl font-bold mb-1">{drill.root}</p>
              <p className="text-center text-xs mb-2" style={{ color: 'var(--color-dim)' }}>
                Make: <span style={{ color: 'var(--color-cyan)' }}>{drill.meaning}</span>
              </p>
              <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{drill.hint}</p>
            </>
          )}

          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkDrill()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type your answer..." autoFocus />

          <button onClick={checkDrill} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>
            Check
          </button>

          {fb && (
            <div className="mt-3 p-3 rounded-xl text-sm" style={{
              background: fb.correct ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
              border: '1px solid ' + (fb.correct ? 'var(--color-green)' : 'var(--color-red)'),
            }}>
              <div className="flex items-center gap-2 font-bold mb-1" style={{ color: fb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
                {fb.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {fb.correct ? 'Betul!' : `Jawapan: ${fb.answer}`}
              </div>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Rule: {fb.rule}</p>
            </div>
          )}
        </div>
      )}

      {/* TENSE MARKERS */}
      {tab === 'tense' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,176,255,0.12)', color: 'var(--color-cyan)' }}>
              Choose tense marker
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
              #{(tenseIdx % tenses.length) + 1}/{tenses.length}
            </span>
          </div>

          <p className="text-center text-lg font-bold mb-2">{tense.sentence}</p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{tense.translation}</p>

          <div className="grid grid-cols-2 gap-2">
            {tense.options.map(opt => (
              <button key={opt} onClick={() => checkTense(opt)}
                className="p-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: tenseFb
                    ? (opt === tense.answer ? 'rgba(0,230,118,0.15)' : tenseFb.chosen === opt ? 'rgba(255,82,82,0.15)' : 'var(--color-card2)')
                    : 'var(--color-card2)',
                  border: '2px solid ' + (tenseFb && opt === tense.answer ? 'var(--color-green)' : 'var(--color-border)'),
                  color: 'var(--color-text)',
                }}>
                {opt}
              </button>
            ))}
          </div>

          {tenseFb && (
            <p className="text-center text-xs mt-3 font-bold" style={{ color: tenseFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
              {tenseFb.correct ? 'Betul!' : `Jawapan: ${tense.answer}`} — Tense: {tense.tense}
            </p>
          )}
        </div>
      )}

      {/* FIND THE ERROR */}
      {tab === 'error' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,82,82,0.12)', color: 'var(--color-red)' }}>
              Cari Kesalahan
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
              #{(errorIdx % errors.length) + 1}/{errors.length}
            </span>
          </div>

          <p className="text-center text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            {error.sentence}
          </p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>
            Tap the word with the imbuhan error, or "No error" if correct.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {error.options.map(opt => (
              <button key={opt} onClick={() => checkError(opt)}
                className="p-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: errorFb
                    ? (opt === error.answer ? 'rgba(0,230,118,0.15)' : errorFb.chosen === opt && !errorFb.correct ? 'rgba(255,82,82,0.15)' : 'var(--color-card2)')
                    : 'var(--color-card2)',
                  border: '2px solid ' + (errorFb && opt === error.answer ? 'var(--color-green)' : 'var(--color-border)'),
                  color: opt === 'No error' ? 'var(--color-green)' : 'var(--color-text)',
                }}>
                {opt}
              </button>
            ))}
          </div>

          {errorFb && (
            <div className="mt-3 p-3 rounded-xl text-sm" style={{
              background: errorFb.correct ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
              border: '1px solid ' + (errorFb.correct ? 'var(--color-green)' : 'var(--color-red)'),
            }}>
              <div className="flex items-center gap-2 font-bold mb-1" style={{ color: errorFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
                {errorFb.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {errorFb.correct ? 'Betul!' : `Jawapan: ${errorFb.answer}`}
              </div>
              {errorFb.correction && (
                <p className="text-xs mb-1" style={{ color: 'var(--color-cyan)' }}>
                  Pembetulan: <b>{errorFb.correction}</b>
                </p>
              )}
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{errorFb.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* SENTENCE TRANSFORMATION */}
      {tab === 'transform' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(179,136,255,0.12)', color: 'var(--color-purple)' }}>
              {transform.type.replace(/-/g, ' ')}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
              #{(transIdx % transforms.length) + 1}/{transforms.length}
            </span>
          </div>

          <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-cyan)' }}>
            {transform.instruction}
          </p>
          <p className="text-center text-lg font-bold mb-2">{transform.sentence}</p>
          <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>{transform.hint}</p>

          <input type="text" value={transInput} onChange={e => setTransInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && checkTransform()}
            className="w-full p-3 rounded-xl text-sm mb-3 outline-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
            placeholder="Type your answer..." />

          <button onClick={checkTransform} className="w-full p-3 rounded-xl font-bold text-sm text-black"
            style={{ background: 'var(--color-green)' }}>
            Check
          </button>

          {transFb && (
            <div className="mt-3 p-3 rounded-xl text-sm" style={{
              background: transFb.correct ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
              border: '1px solid ' + (transFb.correct ? 'var(--color-green)' : 'var(--color-red)'),
            }}>
              <div className="flex items-center gap-2 font-bold mb-1" style={{ color: transFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
                {transFb.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {transFb.correct ? 'Betul!' : `Jawapan: ${transFb.answer}`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RULES REFERENCE */}
      {tab === 'rules' && (
        <div className="space-y-3">
          {Object.entries(GRAMMAR_RULES).map(([key, section]) => (
            <div key={key} className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-accent)' }}>{section.title}</h3>
              {section.rules.map((r, i) => (
                <div key={i} className="py-2 border-b last:border-0 text-sm" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs" style={{ color: 'var(--color-cyan)' }}>{r.pattern}</span>
                    {r.note && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
                        style={{
                          background: r.note.includes('drops') ? 'rgba(255,82,82,0.15)' : 'rgba(68,138,255,0.15)',
                          color: r.note.includes('drops') ? 'var(--color-red)' : 'var(--color-blue)',
                        }}>
                        {r.note}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{r.example}</p>
                </div>
              ))}
            </div>
          ))}

          {/* Quick memory aid */}
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)' }}>
            <p className="font-bold text-lg mb-1" style={{ color: 'var(--color-red)' }}>P, T, K, S DROP!</p>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              When adding meN- or peN- prefix, these consonants are replaced by the nasal sound
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
