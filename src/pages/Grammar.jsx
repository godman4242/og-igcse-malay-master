import { useState, useMemo } from 'react'
import { CheckCircle, XCircle, BookOpen, Zap, AlertTriangle, Shuffle, RotateCcw, Clock } from 'lucide-react'
import { IMBUHAN_DRILLS, TENSE_DRILLS, ERROR_DRILLS, TRANSFORM_DRILLS, GRAMMAR_RULES } from '../data/grammar'
import useStore from '../store/useStore'
import { isDue as isFSRSDue } from '../lib/fsrs'
import GRAMMAR_FEEDBACK from '../data/feedbackRules'
import { buildDrillFeedback, buildTenseFeedback } from '../lib/feedback'
import ElaborativeFeedback from '../components/ElaborativeFeedback'
import ActiveCorrection from '../components/ActiveCorrection'

const TABS = [
  { id: 'drill', label: 'Imbuhan', icon: <Zap size={14} />, statKey: 'imbuhan' },
  { id: 'tense', label: 'Tense', icon: <BookOpen size={14} />, statKey: 'tense' },
  { id: 'error', label: 'Find Error', icon: <AlertTriangle size={14} />, statKey: 'error' },
  { id: 'transform', label: 'Transform', icon: <Shuffle size={14} />, statKey: 'transform' },
  { id: 'rules', label: 'Rules', icon: <BookOpen size={14} />, statKey: null },
]

// Sort drills by SRS priority: due first, then unseen, then not-yet-due
function sortDrillsBySRS(drills, grammarCards) {
  return [...drills].sort((a, b) => {
    const cardA = grammarCards[a.id]
    const cardB = grammarCards[b.id]

    // Unseen drills — treat as "new" (after due, before not-yet-due)
    const aIsNew = !cardA
    const bIsNew = !cardB
    const aIsDue = cardA ? isFSRSDue(cardA) : false
    const bIsDue = cardB ? isFSRSDue(cardB) : false

    // Due first
    if (aIsDue && !bIsDue) return -1
    if (!aIsDue && bIsDue) return 1
    // New second
    if (aIsNew && !bIsNew) return -1
    if (!aIsNew && bIsNew) return 1
    // Both due: most overdue first
    if (aIsDue && bIsDue) {
      return new Date(cardA.due) - new Date(cardB.due)
    }
    return 0
  })
}

function countDue(drills, grammarCards) {
  return drills.filter(d => {
    const card = grammarCards[d.id]
    return !card || isFSRSDue(card)
  }).length
}

export default function Grammar() {
  const [tab, setTab] = useState('drill')
  const [cramMode, setCramMode] = useState(false)
  const grammarStats = useStore(s => s.grammarStats)
  const grammarCards = useStore(s => s.grammarCards)
  const updateGrammarStats = useStore(s => s.updateGrammarStats)
  const resetGrammarStats = useStore(s => s.resetGrammarStats)
  const reviewGrammarDrill = useStore(s => s.reviewGrammarDrill)

  // SRS-sorted drills (or shuffled in cram mode)
  const sortedImbuhan = useMemo(() => cramMode ? shuffle(IMBUHAN_DRILLS) : sortDrillsBySRS(IMBUHAN_DRILLS, grammarCards), [grammarCards, cramMode])
  const sortedTense = useMemo(() => cramMode ? shuffle(TENSE_DRILLS) : sortDrillsBySRS(TENSE_DRILLS, grammarCards), [grammarCards, cramMode])
  const sortedError = useMemo(() => cramMode ? shuffle(ERROR_DRILLS) : sortDrillsBySRS(ERROR_DRILLS, grammarCards), [grammarCards, cramMode])
  const sortedTransform = useMemo(() => cramMode ? shuffle(TRANSFORM_DRILLS) : sortDrillsBySRS(TRANSFORM_DRILLS, grammarCards), [grammarCards, cramMode])

  // Due counts per tab
  const dueCounts = {
    drill: countDue(IMBUHAN_DRILLS, grammarCards),
    tense: countDue(TENSE_DRILLS, grammarCards),
    error: countDue(ERROR_DRILLS, grammarCards),
    transform: countDue(TRANSFORM_DRILLS, grammarCards),
  }

  // Imbuhan state
  const [drillIdx, setDrillIdx] = useState(0)
  const [input, setInput] = useState('')
  const [fb, setFb] = useState(null)
  const [drillFeedback, setDrillFeedback] = useState(null)
  const [needsCorrection, setNeedsCorrection] = useState(false)

  // Tense state
  const [tenseIdx, setTenseIdx] = useState(0)
  const [tenseFb, setTenseFb] = useState(null)
  const [tenseFeedback, setTenseFeedback] = useState(null)

  // Error state
  const [errorIdx, setErrorIdx] = useState(0)
  const [errorFb, setErrorFb] = useState(null)
  const [errorFeedback, setErrorFeedback] = useState(null)

  // Transform state
  const [transIdx, setTransIdx] = useState(0)
  const [transInput, setTransInput] = useState('')
  const [transFb, setTransFb] = useState(null)
  const [transFeedback, setTransFeedback] = useState(null)

  const drill = sortedImbuhan[drillIdx % sortedImbuhan.length]
  const tense = sortedTense[tenseIdx % sortedTense.length]
  const error = sortedError[errorIdx % sortedError.length]
  const transform = sortedTransform[transIdx % sortedTransform.length]

  // Get next review info for current drill
  const getNextReview = (drillId) => {
    const card = grammarCards[drillId]
    if (!card) return null
    if (isFSRSDue(card)) return 'Due now'
    const days = Math.ceil((new Date(card.due) - new Date()) / 86400000)
    if (days === 0) return 'Due today'
    if (days === 1) return 'Tomorrow'
    return `In ${days}d`
  }

  const checkDrill = () => {
    if (fb || !input.trim()) return
    const correct = input.trim().toLowerCase() === drill.answer.toLowerCase()
    setFb({ correct, answer: drill.answer, rule: drill.rule })
    setDrillFeedback(buildDrillFeedback(drill, correct))
    updateGrammarStats('imbuhan', correct)
    reviewGrammarDrill(drill.id, correct)
    
    if (correct) {
      setTimeout(() => {
        setFb(null)
        setDrillFeedback(null)
        setInput('')
        setDrillIdx(i => i + 1)
      }, 2200)
    } else {
      setNeedsCorrection(true)
    }
  }

  const handleCorrectionComplete = () => {
    setFb(null); setDrillFeedback(null); setInput(''); setNeedsCorrection(false);
    setDrillIdx(i => i + 1);
  }

  const checkTense = (chosen) => {
    if (tenseFb) return
    const correct = chosen === tense.answer
    setTenseFb({ correct, chosen, answer: tense.answer })
    setTenseFeedback(buildTenseFeedback(tense, chosen))
    updateGrammarStats('tense', correct)
    reviewGrammarDrill(tense.id, correct)
    setTimeout(() => {
      setTenseFb(null)
      setTenseFeedback(null)
      setTenseIdx(i => i + 1)
    }, correct ? 2200 : 5000)
  }

  const checkError = (chosen) => {
    if (errorFb) return
    const correct = chosen === error.answer
    setErrorFb({ correct, chosen, answer: error.answer, explanation: error.explanation, correction: error.correction })
    if (!correct) {
      setErrorFeedback({
        explanation: error.explanation,
        mnemonic: error.correction ? `Correct form: ${error.correction}` : null,
        examples: [],
        relatedRule: null,
      })
    }
    updateGrammarStats('error', correct)
    reviewGrammarDrill(error.id, correct)
    setTimeout(() => {
      setErrorFb(null)
      setErrorFeedback(null)
      setErrorIdx(i => i + 1)
    }, correct ? 3000 : 5000)
  }

  const checkTransform = () => {
    if (transFb || !transInput.trim()) return
    const userAns = transInput.trim().toLowerCase().replace(/\.\s*$/, '')
    const correctAns = transform.answer.toLowerCase().replace(/\.\s*$/, '')
    const correct = userAns === correctAns
    setTransFb({ correct, answer: transform.answer })
    if (!correct) {
      const passiveFeedback = GRAMMAR_FEEDBACK['Convert meN- to di-']
      setTransFeedback(passiveFeedback || {
        explanation: `Expected: ${transform.answer}`,
        mnemonic: transform.hint,
        examples: [],
        relatedRule: null,
      })
    }
    updateGrammarStats('transform', correct)
    reviewGrammarDrill(transform.id, correct)
    setTimeout(() => {
      setTransFb(null)
      setTransFeedback(null)
      setTransInput('')
      setTransIdx(i => i + 1)
    }, correct ? 2500 : 5000)
  }

  const currentTab = TABS.find(t => t.id === tab)
  const statKey = currentTab?.statKey
  const stats = statKey ? (grammarStats[statKey] || { correct: 0, total: 0 }) : null

  return (
    <div className="space-y-3 animate-fadeUp">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Grammar Drills</h2>
        <button onClick={() => setCramMode(!cramMode)}
          className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
          style={{
            background: cramMode ? 'rgba(255,145,0,0.15)' : 'var(--color-card)',
            color: cramMode ? 'var(--color-orange)' : 'var(--color-dim)',
            border: '1px solid ' + (cramMode ? 'var(--color-orange)' : 'var(--color-border)'),
          }}>
          {cramMode ? <Shuffle size={10} /> : <Clock size={10} />}
          {cramMode ? 'Cram' : 'SRS'}
        </button>
      </div>

      {/* Tabs with due badges */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all relative"
            style={{
              background: tab === t.id ? 'var(--color-accent2)' : 'var(--color-card)',
              color: tab === t.id ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (tab === t.id ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}>
            {t.icon} {t.label}
            {t.statKey && dueCounts[t.id] > 0 && (
              <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'var(--color-red)',
                  color: '#fff',
                }}>
                {dueCounts[t.id]}
              </span>
            )}
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
          {/* Drill type badge + SRS info */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,176,255,0.12)', color: 'var(--color-cyan)' }}>
              {drill.type === 'prefix' ? `Add ${drill.prefix}` : drill.type === 'passive' ? 'Active → Passive' : `Add ${drill.suffix}`}
            </span>
            <div className="flex items-center gap-2">
              {getNextReview(drill.id) && !fb && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,176,255,0.08)', color: 'var(--color-cyan)' }}>
                  {getNextReview(drill.id)}
                </span>
              )}
              <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                #{(drillIdx % sortedImbuhan.length) + 1}/{sortedImbuhan.length}
              </span>
            </div>
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

          {fb && !fb.correct && needsCorrection ? (
            <ActiveCorrection correctAnswer={fb.answer} onComplete={handleCorrectionComplete} />
          ) : null}

          {fb && !needsCorrection && (
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
          {fb && !fb.correct && drillFeedback && (
            <ElaborativeFeedback feedback={drillFeedback} />
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
            <div className="flex items-center gap-2">
              {getNextReview(tense.id) && !tenseFb && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,176,255,0.08)', color: 'var(--color-cyan)' }}>
                  {getNextReview(tense.id)}
                </span>
              )}
              <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                #{(tenseIdx % sortedTense.length) + 1}/{sortedTense.length}
              </span>
            </div>
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
            <div>
              <p className="text-center text-xs mt-3 font-bold" style={{ color: tenseFb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
                {tenseFb.correct ? 'Betul!' : `Jawapan: ${tense.answer}`} — Tense: {tense.tense}
              </p>
              {!tenseFb.correct && tenseFeedback && (
                <ElaborativeFeedback feedback={tenseFeedback} />
              )}
            </div>
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
            <div className="flex items-center gap-2">
              {getNextReview(error.id) && !errorFb && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,176,255,0.08)', color: 'var(--color-cyan)' }}>
                  {getNextReview(error.id)}
                </span>
              )}
              <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                #{(errorIdx % sortedError.length) + 1}/{sortedError.length}
              </span>
            </div>
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
          {errorFb && !errorFb.correct && errorFeedback && (
            <ElaborativeFeedback feedback={errorFeedback} />
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
            <div className="flex items-center gap-2">
              {getNextReview(transform.id) && !transFb && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,176,255,0.08)', color: 'var(--color-cyan)' }}>
                  {getNextReview(transform.id)}
                </span>
              )}
              <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                #{(transIdx % sortedTransform.length) + 1}/{sortedTransform.length}
              </span>
            </div>
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
          {transFb && !transFb.correct && transFeedback && (
            <ElaborativeFeedback feedback={transFeedback} />
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

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
