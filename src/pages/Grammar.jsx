import { useState, useMemo, useRef, useEffect } from 'react'
import { CheckCircle, XCircle, BookOpen, Zap, AlertTriangle, Shuffle, RotateCcw, Clock } from 'lucide-react'
import { IMBUHAN_DRILLS, TENSE_DRILLS, ERROR_DRILLS, TRANSFORM_DRILLS, GRAMMAR_RULES } from '../data/grammar'
import {
  TENSE_DRILLS_EN,
  SVA_DRILLS_EN,
  ARTICLE_DRILLS_EN,
  CONFUSABLE_DRILLS_EN,
  FIND_ERROR_DRILLS_EN,
  TRANSFORM_DRILLS_EN,
  GRAMMAR_RULES_EN,
} from '../data/grammarEng'
import useStore from '../store/useStore'
import { isDue as isFSRSDue } from '../lib/fsrs'
import GRAMMAR_FEEDBACK from '../data/feedbackRules'
import { buildDrillFeedback, buildTenseFeedback } from '../lib/feedback'
import ElaborativeFeedback from '../components/ElaborativeFeedback'
import ActiveCorrection from '../components/ActiveCorrection'
import { agentFeedbackEngine } from '../core/agent'
const TABS_MS = [
  { id: 'drill', label: 'Imbuhan', icon: <Zap size={14} />, statKey: 'imbuhan' },
  { id: 'tense', label: 'Tense', icon: <BookOpen size={14} />, statKey: 'tense' },
  { id: 'error', label: 'Find Error', icon: <AlertTriangle size={14} />, statKey: 'error' },
  { id: 'transform', label: 'Transform', icon: <Shuffle size={14} />, statKey: 'transform' },
  { id: 'rules', label: 'Rules', icon: <BookOpen size={14} />, statKey: null },
]

const TABS_EN = [
  { id: 'drill', label: 'Confusables', icon: <Zap size={14} />, statKey: 'imbuhan' },
  { id: 'tense', label: 'Tense', icon: <BookOpen size={14} />, statKey: 'tense' },
  { id: 'sva', label: 'SVA', icon: <BookOpen size={14} />, statKey: 'sva' },
  { id: 'articles', label: 'Articles', icon: <BookOpen size={14} />, statKey: 'articles' },
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
  const [lang, setLang] = useState('malay')
  const [tab, setTab] = useState('drill')
  const [cramMode, setCramMode] = useState(false)
  const isEng = lang === 'eng'
  const TABS = isEng ? TABS_EN : TABS_MS
  const grammarStats = useStore(s => s.grammarStats)
  const grammarCards = useStore(s => s.grammarCards)
  const updateGrammarStats = useStore(s => s.updateGrammarStats)
  const resetGrammarStats = useStore(s => s.resetGrammarStats)
  const reviewGrammarDrill = useStore(s => s.reviewGrammarDrill)
  const cognitiveProfile = useStore(s => s.cognitiveProfile)
  const logCognitiveMistake = useStore(s => s.logCognitiveMistake)
  const addMasteredConcept = useStore(s => s.addMasteredConcept)

  // Active drill source per tab (lang-aware).
  const drillSrc = isEng ? CONFUSABLE_DRILLS_EN : IMBUHAN_DRILLS
  const tenseSrc = isEng ? TENSE_DRILLS_EN : TENSE_DRILLS
  const errorSrc = isEng ? FIND_ERROR_DRILLS_EN : ERROR_DRILLS
  const transformSrc = isEng ? TRANSFORM_DRILLS_EN : TRANSFORM_DRILLS
  const svaSrc = SVA_DRILLS_EN
  const articleSrc = ARTICLE_DRILLS_EN

  // SRS-sorted drills (or stable-shuffled in cram mode)
  const sortedImbuhan = useMemo(() => cramMode ? (cramImbuhan || shuffle(drillSrc)) : sortDrillsBySRS(drillSrc, grammarCards), [grammarCards, cramMode, cramImbuhan, drillSrc])
  const sortedTense = useMemo(() => cramMode ? (cramTense || shuffle(tenseSrc)) : sortDrillsBySRS(tenseSrc, grammarCards), [grammarCards, cramMode, cramTense, tenseSrc])
  const sortedError = useMemo(() => cramMode ? (cramError || shuffle(errorSrc)) : sortDrillsBySRS(errorSrc, grammarCards), [grammarCards, cramMode, cramError, errorSrc])
  const sortedTransform = useMemo(() => cramMode ? (cramTransform || shuffle(transformSrc)) : sortDrillsBySRS(transformSrc, grammarCards), [grammarCards, cramMode, cramTransform, transformSrc])
  const sortedSva = useMemo(() => cramMode ? (cramSva || shuffle(svaSrc)) : sortDrillsBySRS(svaSrc, grammarCards), [grammarCards, cramMode, cramSva, svaSrc])
  const sortedArticles = useMemo(() => cramMode ? (cramArticles || shuffle(articleSrc)) : sortDrillsBySRS(articleSrc, grammarCards), [grammarCards, cramMode, cramArticles, articleSrc])

  // Due counts per tab
  const dueCounts = {
    drill: countDue(drillSrc, grammarCards),
    tense: countDue(tenseSrc, grammarCards),
    error: countDue(errorSrc, grammarCards),
    transform: countDue(transformSrc, grammarCards),
    sva: countDue(svaSrc, grammarCards),
    articles: countDue(articleSrc, grammarCards),
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

  // SVA + Articles state (English only)
  const [svaIdx, setSvaIdx] = useState(0)
  const [svaFb, setSvaFb] = useState(null)
  const [artIdx, setArtIdx] = useState(0)
  const [artFb, setArtFb] = useState(null)

  // Timer cleanup (R3)
  const pendingTimers = useRef([])
  useEffect(() => () => pendingTimers.current.forEach(clearTimeout), [])

  // Stable cram decks — shuffled once when cramMode activates (L6)
  const [cramImbuhan, setCramImbuhan] = useState(() => cramMode ? shuffle(drillSrc) : null)
  const [cramTense, setCramTense] = useState(() => cramMode ? shuffle(tenseSrc) : null)
  const [cramError, setCramError] = useState(() => cramMode ? shuffle(errorSrc) : null)
  const [cramTransform, setCramTransform] = useState(() => cramMode ? shuffle(transformSrc) : null)
  const [cramSva, setCramSva] = useState(() => cramMode ? shuffle(svaSrc) : null)
  const [cramArticles, setCramArticles] = useState(() => cramMode ? shuffle(articleSrc) : null)

  useEffect(() => {
    if (cramMode) {
      setCramImbuhan(shuffle(drillSrc))
      setCramTense(shuffle(tenseSrc))
      setCramError(shuffle(errorSrc))
      setCramTransform(shuffle(transformSrc))
      setCramSva(shuffle(svaSrc))
      setCramArticles(shuffle(articleSrc))
    }
  }, [cramMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const drill = sortedImbuhan[drillIdx % sortedImbuhan.length]
  const tense = sortedTense[tenseIdx % sortedTense.length]
  const error = sortedError[errorIdx % sortedError.length]
  const transform = sortedTransform[transIdx % sortedTransform.length]
  const sva = sortedSva[svaIdx % sortedSva.length]
  const article = sortedArticles[artIdx % sortedArticles.length]

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
    
    let feedbackObj = buildDrillFeedback(drill, correct)
    
    let conceptId = 'general';
    if (drill.type === 'prefix' && drill.prefix) {
       conceptId = drill.prefix === 'meN-' ? 'prefix_meN' : 
                   drill.prefix === 'ber-' ? 'prefix_beR' : 
                   drill.prefix === 'peN-' ? 'prefix_peN' : 
                   drill.prefix === 'di-' ? 'prefix_di' : 'general';
    } else if (drill.type === 'suffix' && drill.suffix) {
       conceptId = drill.suffix === '-kan' ? 'suffix_kan' :
                   drill.suffix === '-i' ? 'suffix_i' : 'general';
    }

    if (correct) {
      if (conceptId !== 'general') addMasteredConcept(conceptId);
    } else {
      if (conceptId !== 'general') {
        const mistakeData = { conceptId, userInput: input.trim(), correctAnswer: drill.answer };
        logCognitiveMistake(mistakeData);
        const intervention = agentFeedbackEngine.generateIntervention(mistakeData, cognitiveProfile);
        feedbackObj = {
          ...feedbackObj,
          generativePrompt: intervention.message
        };
      }
      setNeedsCorrection(true)
    }

    setDrillFeedback(feedbackObj)
    updateGrammarStats('imbuhan', correct)
    reviewGrammarDrill(drill.id, correct)
    
    if (correct) {
      pendingTimers.current.push(setTimeout(() => {
        setFb(null)
        setDrillFeedback(null)
        setInput('')
        setDrillIdx(i => i + 1)
      }, 2200))
    }
  }

  const handleCorrectionComplete = () => {
    setFb(null); setDrillFeedback(null); setInput(''); setNeedsCorrection(false);
    setDrillIdx(i => i + 1);
  }

  // English MCQ "drill" (confusables) reuses the cloze pattern.
  const checkDrillMCQ = (chosen) => {
    if (fb) return
    const correct = chosen === drill.answer
    setFb({ correct, chosen, answer: drill.answer, rule: drill.rule })
    if (!correct) {
      setDrillFeedback({
        explanation: drill.rule || `Correct answer: ${drill.answer}`,
        mnemonic: null,
        examples: [],
        relatedRule: null,
      })
    }
    updateGrammarStats('imbuhan', correct)
    reviewGrammarDrill(drill.id, correct)
    pendingTimers.current.push(setTimeout(() => {
      setFb(null)
      setDrillFeedback(null)
      setDrillIdx(i => i + 1)
    }, correct ? 2200 : 4500))
  }

  const checkSva = (chosen) => {
    if (svaFb) return
    const correct = chosen === sva.answer
    setSvaFb({ correct, chosen, answer: sva.answer, rule: sva.rule })
    updateGrammarStats('sva', correct)
    reviewGrammarDrill(sva.id, correct)
    pendingTimers.current.push(setTimeout(() => { setSvaFb(null); setSvaIdx(i => i + 1) }, correct ? 2200 : 4500))
  }

  const checkArticle = (chosen) => {
    if (artFb) return
    const correct = chosen === article.answer
    setArtFb({ correct, chosen, answer: article.answer, rule: article.rule })
    updateGrammarStats('articles', correct)
    reviewGrammarDrill(article.id, correct)
    pendingTimers.current.push(setTimeout(() => { setArtFb(null); setArtIdx(i => i + 1) }, correct ? 2200 : 4500))
  }

  const checkTense = (chosen) => {
    if (tenseFb) return
    const correct = chosen === tense.answer
    setTenseFb({ correct, chosen, answer: tense.answer })
    setTenseFeedback(buildTenseFeedback(tense, chosen))
    updateGrammarStats('tense', correct)
    reviewGrammarDrill(tense.id, correct)
    pendingTimers.current.push(setTimeout(() => {
      setTenseFb(null)
      setTenseFeedback(null)
      setTenseIdx(i => i + 1)
    }, correct ? 2200 : 5000))
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
    pendingTimers.current.push(setTimeout(() => {
      setErrorFb(null)
      setErrorFeedback(null)
      setErrorIdx(i => i + 1)
    }, correct ? 3000 : 5000))
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
    pendingTimers.current.push(setTimeout(() => {
      setTransFb(null)
      setTransFeedback(null)
      setTransInput('')
      setTransIdx(i => i + 1)
    }, correct ? 2500 : 5000))
  }

  const currentTab = TABS.find(t => t.id === tab)
  const statKey = currentTab?.statKey
  const stats = statKey ? (grammarStats[statKey] || { correct: 0, total: 0 }) : null

  // Reset focus indices and feedback when switching language so we never
  // render a drill from the wrong source on the first frame.
  const switchLang = (next) => {
    if (next === lang) return
    setLang(next)
    setTab('drill')
    setDrillIdx(0); setTenseIdx(0); setErrorIdx(0); setTransIdx(0)
    setSvaIdx(0); setArtIdx(0)
    setFb(null); setTenseFb(null); setErrorFb(null); setTransFb(null)
    setSvaFb(null); setArtFb(null)
    setInput(''); setTransInput('')
    setNeedsCorrection(false)
  }

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

      {/* Language toggle */}
      <div className="flex gap-2">
        {[{ id: 'malay', label: 'Bahasa Melayu' }, { id: 'eng', label: 'English' }].map(l => (
          <button key={l.id} onClick={() => switchLang(l.id)}
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

      {/* DRILL TAB — Imbuhan (Malay text-input) or Confusables (English MCQ) */}
      {tab === 'drill' && !isEng && (
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

      {/* DRILL TAB — English Confusables (MCQ) */}
      {tab === 'drill' && isEng && (
        <McqDrillCard
          item={drill} fb={fb} onPick={checkDrillMCQ}
          idx={drillIdx} total={sortedImbuhan.length}
          badge="Choose the correct word" badgeColor="cyan"
          getNextReview={getNextReview} />
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
                {tenseFb.correct ? (isEng ? 'Correct!' : 'Betul!') : `${isEng ? 'Answer' : 'Jawapan'}: ${tense.answer}`} — Tense: {tense.tense}
              </p>
              {isEng && tense.rule && (
                <p className="text-center text-[11px] mt-1" style={{ color: 'var(--color-dim)' }}>{tense.rule}</p>
              )}
              {!tenseFb.correct && tenseFeedback && !isEng && (
                <ElaborativeFeedback feedback={tenseFeedback} />
              )}
            </div>
          )}
        </div>
      )}

      {/* SVA TAB (English only) */}
      {tab === 'sva' && isEng && (
        <McqDrillCard
          item={sva} fb={svaFb} onPick={checkSva}
          idx={svaIdx} total={sortedSva.length}
          badge="Subject-verb agreement" badgeColor="cyan"
          getNextReview={getNextReview} />
      )}

      {/* ARTICLES TAB (English only) */}
      {tab === 'articles' && isEng && (
        <McqDrillCard
          item={article} fb={artFb} onPick={checkArticle}
          idx={artIdx} total={sortedArticles.length}
          badge="Choose the correct article" badgeColor="cyan"
          getNextReview={getNextReview} />
      )}

      {/* FIND THE ERROR */}
      {tab === 'error' && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,82,82,0.12)', color: 'var(--color-red)' }}>
              {isEng ? 'Find the Error' : 'Cari Kesalahan'}
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
            {isEng ? 'Tap the part with the error, or "No error" if the sentence is correct.' : 'Tap the word with the imbuhan error, or "No error" if correct.'}
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
                {errorFb.correct ? (isEng ? 'Correct!' : 'Betul!') : `${isEng ? 'Answer' : 'Jawapan'}: ${errorFb.answer}`}
              </div>
              {errorFb.correction && (
                <p className="text-xs mb-1" style={{ color: 'var(--color-cyan)' }}>
                  {isEng ? 'Correction' : 'Pembetulan'}: <b>{errorFb.correction}</b>
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
                {transFb.correct ? (isEng ? 'Correct!' : 'Betul!') : `${isEng ? 'Answer' : 'Jawapan'}: ${transFb.answer}`}
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
          {Object.entries(isEng ? GRAMMAR_RULES_EN : GRAMMAR_RULES).map(([key, section]) => (
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
          {!isEng && (
            <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)' }}>
              <p className="font-bold text-lg mb-1" style={{ color: 'var(--color-red)' }}>P, T, K, S DROP!</p>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                When adding meN- or peN- prefix, these consonants are replaced by the nasal sound
              </p>
            </div>
          )}
          {isEng && (
            <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
              <p className="font-bold text-lg mb-1" style={{ color: 'var(--color-green)' }}>Read it ALOUD.</p>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                Most IGCSE grammar errors disappear when you read the sentence aloud — your ear catches what your eye misses.
              </p>
            </div>
          )}
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

// Generic multiple-choice drill card used by the English Confusables, SVA,
// and Articles tabs. Mirrors the styling of the Tense card so the page
// feels uniform across drill types.
function McqDrillCard({ item, fb, onPick, idx, total, badge, badgeColor, getNextReview }) {
  const colourMap = {
    cyan: { bg: 'rgba(0,176,255,0.12)', fg: 'var(--color-cyan)' },
    purple: { bg: 'rgba(179,136,255,0.12)', fg: 'var(--color-purple)' },
    green: { bg: 'rgba(0,230,118,0.12)', fg: 'var(--color-green)' },
  }
  const c = colourMap[badgeColor] || colourMap.cyan
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{ background: c.bg, color: c.fg }}>
          {badge}
        </span>
        <div className="flex items-center gap-2">
          {getNextReview(item.id) && !fb && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(0,176,255,0.08)', color: 'var(--color-cyan)' }}>
              {getNextReview(item.id)}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
            #{(idx % total) + 1}/{total}
          </span>
        </div>
      </div>

      <p className="text-center text-base font-bold mb-4 px-2">{item.sentence}</p>

      <div className="grid grid-cols-2 gap-2">
        {item.options.map(opt => (
          <button key={opt} onClick={() => onPick(opt)}
            className="p-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: fb
                ? (opt === item.answer ? 'rgba(0,230,118,0.15)' : fb.chosen === opt ? 'rgba(255,82,82,0.15)' : 'var(--color-card2)')
                : 'var(--color-card2)',
              border: '2px solid ' + (fb && opt === item.answer ? 'var(--color-green)' : 'var(--color-border)'),
              color: 'var(--color-text)',
            }}>
            {opt}
          </button>
        ))}
      </div>

      {fb && (
        <div className="mt-3 p-3 rounded-xl text-sm" style={{
          background: fb.correct ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
          border: '1px solid ' + (fb.correct ? 'var(--color-green)' : 'var(--color-red)'),
        }}>
          <div className="flex items-center gap-2 font-bold mb-1" style={{ color: fb.correct ? 'var(--color-green)' : 'var(--color-red)' }}>
            {fb.correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {fb.correct ? 'Correct!' : `Answer: ${item.answer}`}
          </div>
          {item.rule && (
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{item.rule}</p>
          )}
        </div>
      )}
    </div>
  )
}
