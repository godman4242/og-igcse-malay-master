import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight, BookOpen, Zap } from 'lucide-react'
import { IMBUHAN_DRILLS, TENSE_DRILLS, GRAMMAR_RULES } from '../data/grammar'

const TABS = [
  { id: 'drill', label: 'Imbuhan Drills', icon: <Zap size={14} /> },
  { id: 'tense', label: 'Tense Markers', icon: <BookOpen size={14} /> },
  { id: 'rules', label: 'Rules Reference', icon: <BookOpen size={14} /> },
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
  const [drillIdx, setDrillIdx] = useState(0)
  const [input, setInput] = useState('')
  const [fb, setFb] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [tenseIdx, setTenseIdx] = useState(0)
  const [tenseFb, setTenseFb] = useState(null)
  const [tenseScore, setTenseScore] = useState({ correct: 0, total: 0 })
  const [drills] = useState(() => shuffle(IMBUHAN_DRILLS))
  const [tenses] = useState(() => shuffle(TENSE_DRILLS))

  const drill = drills[drillIdx % drills.length]
  const tense = tenses[tenseIdx % tenses.length]

  const checkDrill = () => {
    const correct = input.trim().toLowerCase() === drill.answer.toLowerCase()
    setFb({ correct, answer: drill.answer, rule: drill.rule })
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    setTimeout(() => {
      setFb(null)
      setInput('')
      setDrillIdx(i => i + 1)
    }, 2000)
  }

  const checkTense = (chosen) => {
    if (tenseFb) return
    const correct = chosen === tense.answer
    setTenseFb({ correct, chosen, answer: tense.answer })
    setTenseScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    setTimeout(() => {
      setTenseFb(null)
      setTenseIdx(i => i + 1)
    }, 2000)
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      <h2 className="text-lg font-bold">Grammar Drills</h2>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
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

      {/* IMBUHAN DRILLS */}
      {tab === 'drill' && (
        <div>
          {/* Score */}
          <div className="flex justify-center gap-6 text-center text-xs py-2 mb-2">
            <div><div className="text-lg font-bold" style={{ color: 'var(--color-green)' }}>{score.correct}</div><div style={{ color: 'var(--color-dim)' }}>CORRECT</div></div>
            <div><div className="text-lg font-bold" style={{ color: 'var(--color-dim)' }}>{score.total}</div><div style={{ color: 'var(--color-dim)' }}>TOTAL</div></div>
            <div><div className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%</div><div style={{ color: 'var(--color-dim)' }}>ACCURACY</div></div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            {drill.type === 'prefix' && (
              <>
                <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-cyan)' }}>
                  Add prefix: {drill.prefix}
                </p>
                <p className="text-center text-2xl font-bold mb-1">{drill.root}</p>
                <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>
                  {drill.hint}
                </p>
              </>
            )}
            {drill.type === 'passive' && (
              <>
                <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-cyan)' }}>
                  Convert to passive (di-)
                </p>
                <p className="text-center text-lg font-bold mb-1">{drill.active}</p>
                <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>
                  {drill.hint}
                </p>
              </>
            )}
            {drill.type === 'suffix' && (
              <>
                <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-cyan)' }}>
                  Add {drill.suffix} to make: {drill.meaning}
                </p>
                <p className="text-center text-2xl font-bold mb-1">{drill.root}</p>
                <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>
                  {drill.hint}
                </p>
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
                  {fb.correct ? 'Correct!' : `Answer: ${fb.answer}`}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Rule: {fb.rule}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TENSE MARKERS */}
      {tab === 'tense' && (
        <div>
          <div className="flex justify-center gap-6 text-center text-xs py-2 mb-2">
            <div><div className="text-lg font-bold" style={{ color: 'var(--color-green)' }}>{tenseScore.correct}</div><div style={{ color: 'var(--color-dim)' }}>CORRECT</div></div>
            <div><div className="text-lg font-bold" style={{ color: 'var(--color-dim)' }}>{tenseScore.total}</div><div style={{ color: 'var(--color-dim)' }}>TOTAL</div></div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--color-cyan)' }}>
              Choose the correct tense marker
            </p>
            <p className="text-center text-lg font-bold mb-2">{tense.sentence}</p>
            <p className="text-center text-xs mb-4" style={{ color: 'var(--color-dim)' }}>
              {tense.translation}
            </p>

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
              <p className="text-center text-xs mt-3 font-bold" style={{ color: 'var(--color-dim)' }}>
                Tense: {tense.tense}
              </p>
            )}
          </div>
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
              When adding meN- prefix, these consonants are replaced by the nasal sound
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
