import { RotateCcw, ArrowLeft, Volume2, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { speak } from '../lib/speech'
import { fireConfetti } from '../lib/confetti'
import useStore from '../store/useStore'

export default function RoleplayScorecard({ scenario, messages, scoreData, onRetry, onExit }) {
  const [expandedTurn, setExpandedTurn] = useState(null)
  const addRoleplayHistory = useStore(s => s.addRoleplayHistory)
  const addMistake = useStore(s => s.addMistake)
  const addCard = useStore(s => s.addCard)

  // Save to history on first render
  useState(() => {
    const score = scoreData?.overallBand || 0
    addRoleplayHistory({
      scenarioId: scenario.id,
      turns: messages.filter(m => m.role === 'student').length,
      score,
    })

    // Log missed vocab as mistakes
    if (scoreData?.keyPhraseMissed) {
      scoreData.keyPhraseMissed.forEach(phrase => {
        addMistake({
          type: 'vocab',
          source: 'roleplay',
          word: phrase,
          correct: phrase,
          given: '',
        })
      })
    }

    if (score >= 5) setTimeout(() => fireConfetti(), 300)
  })

  // Fallback scoring from local analysis if AI scoring failed
  const studentMessages = messages.filter(m => m.role === 'student')
  const allText = studentMessages.map(m => m.text).join(' ')
  const wordCount = allText.split(/\s+/).filter(w => w.length > 1).length

  const hasAIScore = scoreData?.overallBand != null
  const band = hasAIScore ? scoreData.overallBand : Math.min(6, Math.max(1, Math.round(wordCount / 15)))
  const bandColor = band >= 5 ? 'var(--color-green)' : band >= 3 ? 'var(--color-orange)' : 'var(--color-red)'

  const addMissedToStudyDeck = () => {
    if (!scoreData?.keyPhraseMissed) return
    scoreData.keyPhraseMissed.forEach(phrase => {
      addCard({
        m: phrase,
        e: phrase,
        t: `Roleplay: ${scenario.title}`,
        p: 'n',
        ex: `From roleplay scenario: ${scenario.titleEn}`,
        mn: '',
      })
    })
  }

  return (
    <div className="space-y-4 animate-fadeUp">
      {/* Overall score */}
      <div className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <p className="text-4xl mb-2">{band >= 5 ? '\u{1F3C6}' : band >= 3 ? '\u{1F389}' : '\u{1F4AA}'}</p>
        <h2 className="text-xl font-bold mb-1">Roleplay Complete!</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--color-dim)' }}>{scenario.title} — {scenario.titleEn}</p>

        {/* Band ring */}
        <div className="relative w-24 h-24 mx-auto">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-border)" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={bandColor}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(band / 6) * 264} 264`}
              style={{ transition: 'stroke-dasharray 1s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: bandColor }}>
              {band}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>/ 6</span>
          </div>
        </div>
        {hasAIScore && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-dim)' }}>IGCSE Paper 3 Band</p>
        )}
        {!hasAIScore && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-orange)' }}>Estimated score (AI scoring unavailable)</p>
        )}
      </div>

      {/* AI breakdown */}
      {hasAIScore && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Vocabulary', data: scoreData.vocabulary },
            { label: 'Grammar', data: scoreData.grammar },
            { label: 'Fluency', data: scoreData.fluency },
            { label: 'Task', data: scoreData.taskCompletion },
          ].map((item, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{item.label}</span>
                <span className="text-sm font-bold" style={{
                  color: item.data?.band >= 5 ? 'var(--color-green)' : item.data?.band >= 3 ? 'var(--color-orange)' : 'var(--color-red)'
                }}>
                  {item.data?.band || '-'}/6
                </span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{item.data?.comment || ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {scoreData?.strengths?.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--color-green)' }}>Strengths</h3>
          <ul className="space-y-1 text-xs" style={{ color: 'var(--color-dim)' }}>
            {scoreData.strengths.map((s, i) => (
              <li key={i}>+ {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas to improve */}
      {scoreData?.areasToImprove?.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--color-orange)' }}>Areas to Improve</h3>
          <ul className="space-y-1 text-xs" style={{ color: 'var(--color-dim)' }}>
            {scoreData.areasToImprove.map((s, i) => (
              <li key={i}>- {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key phrases missed */}
      {scoreData?.keyPhraseMissed?.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-cyan)' }}>Key Phrases You Missed</h3>
            <button onClick={addMissedToStudyDeck}
              className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-bold"
              style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--color-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
              <Plus size={10} /> Add to Deck
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {scoreData.keyPhraseMissed.map((phrase, i) => (
              <button key={i} onClick={() => speak(phrase)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <Volume2 size={10} style={{ color: 'var(--color-cyan)' }} />
                {phrase}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Turn-by-turn review — side-by-side with grammar annotations */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-bold text-sm mb-3">Conversation Review</h3>
        {messages.reduce((pairs, msg, i) => {
          if (msg.role === 'examiner' && messages[i + 1]?.role === 'student') {
            pairs.push({
              turnNum: pairs.length + 1,
              examiner: msg.text,
              student: messages[i + 1].text,
              modelAnswer: scenario.modelAnswers?.[pairs.length + 1],
              feedback: msg.feedback,
            })
          }
          return pairs
        }, []).map((pair, i) => {
          // Client-side vocab/imbuhan analysis
          const studentLower = pair.student.toLowerCase()
          const vocabHit = (scenario.keyVocab || []).filter(v => studentLower.includes(v.toLowerCase()))
          const imbuhanHit = (scenario.keyImbuhan || []).filter(v => studentLower.includes(v.toLowerCase()))

          return (
            <div key={i} className="mb-4 pb-4 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <button onClick={() => setExpandedTurn(expandedTurn === i ? null : i)}
                className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: 'var(--color-blue)' }}>Turn {pair.turnNum}</span>
                {expandedTurn === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <p className="text-xs mb-2" style={{ color: 'var(--color-dim)' }}>
                <strong style={{ color: 'var(--color-cyan)' }}>Pemeriksa:</strong> {pair.examiner}
              </p>

              {/* Student response with highlighted vocab/imbuhan */}
              <div className="text-xs mb-2">
                <strong>Awak:</strong>{' '}
                <span>{highlightKeywords(pair.student, vocabHit, imbuhanHit)}</span>
              </div>

              {/* Vocab/imbuhan chips */}
              {(vocabHit.length > 0 || imbuhanHit.length > 0) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {vocabHit.map((v, j) => (
                    <span key={`v${j}`} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                      style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-green)' }}>
                      <CheckCircle size={8} /> {v}
                    </span>
                  ))}
                  {imbuhanHit.map((v, j) => (
                    <span key={`i${j}`} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                      style={{ background: 'rgba(0,229,255,0.12)', color: 'var(--color-cyan)' }}>
                      <CheckCircle size={8} /> {v}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded: side-by-side comparison */}
              {expandedTurn === i && (
                <div className="space-y-2">
                  {pair.modelAnswer && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg text-xs"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
                        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>Your answer</p>
                        <p style={{ color: 'var(--color-text)' }}>{pair.student}</p>
                      </div>
                      <div className="p-2 rounded-lg text-xs"
                        style={{ background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.15)' }}>
                        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-green)' }}>Model answer</p>
                        <p style={{ color: 'var(--color-text)' }}>{pair.modelAnswer}</p>
                        <button onClick={() => speak(pair.modelAnswer)} className="mt-1.5 flex items-center gap-1"
                          style={{ color: 'var(--color-green)' }}>
                          <Volume2 size={10} /> Dengar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Grammar annotations from AI feedback */}
                  {pair.feedback?.grammarNote && (
                    <div className="p-2 rounded-lg text-xs"
                      style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)' }}>
                      <p className="font-bold mb-0.5" style={{ color: 'var(--color-cyan)' }}>Grammar note:</p>
                      <p style={{ color: 'var(--color-dim)' }}>{pair.feedback.grammarNote}</p>
                    </div>
                  )}

                  {/* Missing key vocab for this turn (from model answer comparison) */}
                  {pair.modelAnswer && (() => {
                    const modelLower = pair.modelAnswer.toLowerCase()
                    const modelVocab = (scenario.keyVocab || []).filter(v => modelLower.includes(v.toLowerCase()))
                    const missed = modelVocab.filter(v => !studentLower.includes(v.toLowerCase()))
                    if (missed.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-bold" style={{ color: 'var(--color-orange)' }}>Missed:</span>
                        {missed.map((v, j) => (
                          <button key={j} onClick={() => speak(v)}
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                            style={{ background: 'rgba(255,145,0,0.12)', color: 'var(--color-orange)' }}>
                            <XCircle size={8} /> {v}
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onRetry} className="flex-1 p-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent2)' }}>
          <RotateCcw size={14} /> Try Again
        </button>
        <button onClick={onExit} className="flex-1 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          <ArrowLeft size={14} /> All Scenarios
        </button>
      </div>
    </div>
  )
}

/**
 * Highlight key vocabulary and imbuhan in student text.
 * Returns an array of React elements with colored spans.
 */
function highlightKeywords(text, vocabHits, imbuhanHits) {
  if (vocabHits.length === 0 && imbuhanHits.length === 0) return text

  // Build regex from all hits (longer phrases first to avoid partial matches)
  const allHits = [...vocabHits, ...imbuhanHits].sort((a, b) => b.length - a.length)
  const escaped = allHits.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')

  const parts = text.split(regex)
  return parts.map((part, i) => {
    const lower = part.toLowerCase()
    const isVocab = vocabHits.some(v => v.toLowerCase() === lower)
    const isImbuhan = imbuhanHits.some(v => v.toLowerCase() === lower)

    if (isVocab) {
      return <span key={i} className="font-bold" style={{ color: 'var(--color-green)' }}>{part}</span>
    }
    if (isImbuhan) {
      return <span key={i} className="font-bold" style={{ color: 'var(--color-cyan)' }}>{part}</span>
    }
    return part
  })
}
