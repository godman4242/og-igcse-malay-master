import { RotateCcw, ArrowLeft, Volume2, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { speak } from '../lib/speech'
import { fireConfetti } from '../lib/confetti'
import useStore from '../store/useStore'
import ThreeLineFeedback from './ThreeLineFeedback'
import { buildSessionFeedback } from '../lib/feedback'
import { scaffoldChipLabel } from '../lib/annotationView'
import { containsWholeWord, wholeWordSplitRegex } from '../lib/wholeWordMatch'
import DICTIONARY from '../data/dictionary'

// English→Malay view of the built-in dictionary, built once. DICTIONARY itself is
// Malay→English; this reverse index lets an ENGLISH roleplay's missed phrase find
// its Malay gloss without pulling in the lazily-loaded dictionaryEn chunk
// (guardrail N4). First spelling wins, so the mapping is deterministic.
const EN_TO_MS = (() => {
  const out = {}
  for (const [ms, en] of Object.entries(DICTIONARY)) {
    const key = String(en).toLowerCase().trim()
    if (key && !(key in out)) out[key] = ms
  }
  return out
})()

// The L1 gloss for a missed phrase — i.e. the BACK of any card it produces.
// A vocab mistake's `correct` becomes the promoted card's `e`
// (promoteMistakeToCard maps m = word, e = correct), so passing the phrase itself
// minted a card whose front and back were identical: nothing to recall in
// Flashcard mode, and unanswerable in Produce mode where the gloss IS the answer.
// Returns '' when no gloss is known — the store's `added.correct` gate then
// journals the miss without minting a card, which is the honest outcome for an
// AI-generated free-form phrase that is in no dictionary.
function glossFor(phrase, lang) {
  const key = String(phrase || '').toLowerCase().trim()
  if (!key) return ''
  return (lang === 'en' ? EN_TO_MS[key] : DICTIONARY[key]) || ''
}

export default function RoleplayScorecard({ scenario, messages, scoreData, onRetry, onExit, scaffoldLevel = 'medium' }) {
  const [expandedTurn, setExpandedTurn] = useState(null)
  const addRoleplayHistory = useStore(s => s.addRoleplayHistory)
  const addMistake = useStore(s => s.addMistake)
  const addCard = useStore(s => s.addCard)

  // The roleplay's language, used by every mistake/card this component writes so
  // an English (🇬🇧) scenario's vocab misses promote to a lang:'en' card (Fork F),
  // not the Malay deck. Malay scenarios omit `lang` → undefined falls back to
  // 'ms' (byte-identical to the pre-F5-Increment-6 behaviour).
  const lang = scenario?.lang === 'en' ? 'en' : 'ms'

  // Save to history on first render
  useEffect(() => {
    const score = scoreData?.overallBand || 0
    addRoleplayHistory({
      scenarioId: scenario.id,
      turns: messages.filter(m => m.role === 'student').length,
      score,
    })

    // Log missed vocab as mistakes (auto-promotes to FSRS card per store rules)
    if (scoreData?.keyPhraseMissed) {
      scoreData.keyPhraseMissed.forEach(phrase => {
        addMistake({
          type: 'roleplay',
          source: scenario.id,
          language: lang,
          category: 'vocab',
          severity: 'med',
          word: phrase,
          correct: glossFor(phrase, lang),
          given: '',
          note: `Missed key phrase in roleplay: ${scenario.title}`,
        })
      })
    }

    // Log areas-to-improve as cohesion mistakes (no auto-promotion, journal-only)
    if (Array.isArray(scoreData?.areasToImprove)) {
      scoreData.areasToImprove.forEach(line => {
        if (!line || typeof line !== 'string') return
        addMistake({
          type: 'roleplay',
          source: scenario.id,
          language: lang,
          category: 'cohesion',
          severity: 'med',
          word: '',
          surface: line.slice(0, 140),
          note: line,
        })
      })
    }

    // Log per-turn grammar notes as imbuhan/tense mistakes.
    // RoleplaySession appends the AI reply as an EXAMINER message whose
    // `feedback` is about the answer that came just BEFORE it — the shape is
    // [E0, S1, E2(fb about S1), S3, E4(fb about S3), …]. Reading messages[i + 1]
    // journaled every note against the NEXT answer and silently dropped the last
    // turn's note (no message follows the final examiner reply).
    messages.forEach((msg, i) => {
      const fb = msg.feedback
      if (!fb) return
      const studentMsg = messages[i - 1]?.role === 'student' ? messages[i - 1] : null
      const surface = studentMsg?.text || ''
      if (fb.grammarNote && surface) {
        const note = String(fb.grammarNote).toLowerCase()
        const category = note.includes('imbuhan') || note.includes('me-') || note.includes('ber-') ? 'imbuhan'
          : note.includes('tense') || note.includes('sudah') || note.includes('akan') ? 'tense'
          : 'other'
        addMistake({
          type: 'roleplay',
          source: scenario.id,
          language: lang,
          category,
          severity: 'med',
          surface,
          note: fb.grammarNote,
        })
      }
      if (fb.missingPhrase) {
        addMistake({
          type: 'roleplay',
          source: scenario.id,
          language: lang,
          category: 'vocab',
          severity: 'med',
          word: fb.missingPhrase,
          correct: glossFor(fb.missingPhrase, lang),
          surface,
          note: `Could have used: ${fb.missingPhrase}`,
        })
      }
    })

    if (score >= 5) setTimeout(() => fireConfetti(), 300)
  }, [])

  // Fallback scoring from local analysis if AI scoring failed
  const studentMessages = messages.filter(m => m.role === 'student')
  const allText = studentMessages.map(m => m.text).join(' ')
  const wordCount = allText.split(/\s+/).filter(w => w.length > 1).length

  const hasAIScore = scoreData?.overallBand != null
  // Speaking-paper label is language-aware: "Paper 3" is the Malay 0546 speaking
  // paper, but English 0510 speaking is Component 3 — so label the English band
  // by SKILL, never with the Malay paper number (content-truth, GOAL.md axis-1).
  const isEng = lang === 'en'
  const band = hasAIScore ? scoreData.overallBand : Math.min(6, Math.max(1, Math.round(wordCount / 15)))
  const bandColor = band >= 5 ? 'var(--color-green)' : band >= 3 ? 'var(--color-orange)' : 'var(--color-red)'

  // Only phrases we can actually gloss can become a card — same rule as the
  // auto-promotion above, so the manual button can never mint the self-gloss
  // cards it used to. The button is hidden when this is empty rather than
  // silently doing nothing.
  const addableMissed = (scoreData?.keyPhraseMissed || [])
    .map(phrase => ({ phrase, gloss: glossFor(phrase, lang) }))
    .filter(x => x.gloss)

  const addMissedToStudyDeck = () => {
    addableMissed.forEach(({ phrase, gloss }) => {
      addCard({
        m: phrase,
        e: gloss,
        t: `Roleplay: ${scenario.title}`,
        p: 'n',
        ex: `From roleplay scenario: ${scenario.titleEn}`,
        mn: '',
      })
    })
  }

  const navigate = useNavigate()
  const fb = buildSessionFeedback('roleplay', {
    score: Math.round((band / 6) * 100),
    scenario: scenario.title,
  }, useStore.getState())

  return (
    <div className="space-y-4 animate-fadeUp">
      <ThreeLineFeedback goal={fb.goal} now={fb.now} next={fb.next}
        onNextClick={fb.nextHref ? () => navigate(fb.nextHref) : null} />
      {/* Overall score */}
      <div className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <p className="text-4xl mb-2">{band >= 5 ? '\u{1F3C6}' : band >= 3 ? '\u{1F389}' : '\u{1F4AA}'}</p>
        <h2 className="text-xl font-bold mb-1">Roleplay Complete!</h2>
        <p className="text-sm mb-1" style={{ color: 'var(--color-dim)' }}>{scenario.title} — {scenario.titleEn}</p>
        {scaffoldLevel !== 'medium' && (
          <span
            className="inline-block text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full mb-3"
            style={{ background: 'var(--color-card2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            title="Examiner tuned to your recent activity"
          >
            {scaffoldChipLabel(scaffoldLevel)}
          </span>
        )}

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
          <p className="text-xs mt-2" style={{ color: 'var(--color-dim)' }}>{isEng ? 'Speaking Band' : 'IGCSE Paper 3 Band'}</p>
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

      {/* Strengths — visually bigger on heavy scaffold (spec §6.4) */}
      {scoreData?.strengths?.length > 0 && (
        <div
          className="rounded-2xl"
          style={{
            background: scaffoldLevel === 'heavy' ? 'var(--color-card2)' : 'var(--color-card)',
            border: '1px solid var(--color-border)',
            padding: scaffoldLevel === 'heavy' ? 20 : 16,
          }}
        >
          <h3
            className="font-bold mb-2"
            style={{
              color: 'var(--color-green)',
              fontSize: scaffoldLevel === 'heavy' ? 18 : 14,
            }}
          >
            Strengths
          </h3>
          <ul
            className="space-y-1.5"
            style={{
              color: 'var(--color-text)',
              fontSize: scaffoldLevel === 'heavy' ? 14 : 12,
            }}
          >
            {scoreData.strengths.map((s, i) => (
              <li key={i}>+ {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas to improve — quieter on heavy; pulls aside any "Stretch:" item
          for the light-scaffold stretch panel below. */}
      {scoreData?.areasToImprove?.length > 0 && (() => {
        const items = scoreData.areasToImprove.filter(s => typeof s === 'string')
        const stretchIdx = scaffoldLevel === 'light'
          ? items.findIndex(s => /^stretch[:\s]/i.test(s))
          : -1
        const stretchItem = stretchIdx >= 0 ? items[stretchIdx] : null
        const rest = stretchIdx >= 0 ? items.filter((_, i) => i !== stretchIdx) : items
        return (
          <>
            {rest.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  opacity: scaffoldLevel === 'heavy' ? 0.85 : 1,
                }}
              >
                <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--color-orange)' }}>Areas to Improve</h3>
                <ul className="space-y-1 text-xs" style={{ color: 'var(--color-dim)' }}>
                  {rest.map((s, i) => (
                    <li key={i}>- {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {stretchItem && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'var(--color-card2)',
                  border: '1px solid var(--color-accent)',
                }}
              >
                <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-accent)' }}>
                  <Sparkles size={13} /> Stretch goal
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-text)' }}>
                  {stretchItem.replace(/^stretch[:\s]+/i, '')}
                </p>
              </div>
            )}
          </>
        )
      })()}

      {/* Key phrases missed */}
      {scoreData?.keyPhraseMissed?.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-cyan)' }}>Key Phrases You Missed</h3>
            {addableMissed.length > 0 && (
              <button onClick={addMissedToStudyDeck}
                className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-bold"
                style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--color-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
                <Plus size={10} /> Add {addableMissed.length} to Deck
              </button>
            )}
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
              // The note about THIS pair's answer rides on the NEXT examiner
              // message (see the addMistake loop above). Using msg.feedback showed
              // each note beside an answer it was not about, one turn late, and
              // never showed the final one.
              feedback: messages[i + 2]?.feedback,
            })
          }
          return pairs
        }, []).map((pair, i) => {
          // Client-side vocab/imbuhan analysis — WHOLE-word match so a key word
          // is credited only when actually used, not as a substring of an
          // unrelated word (e.g. 'menu' inside 'menunggu' = to wait).
          const vocabHit = (scenario.keyVocab || []).filter(v => containsWholeWord(pair.student, v))
          const imbuhanHit = (scenario.keyImbuhan || []).filter(v => containsWholeWord(pair.student, v))

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
                    const modelVocab = (scenario.keyVocab || []).filter(v => containsWholeWord(pair.modelAnswer, v))
                    const missed = modelVocab.filter(v => !containsWholeWord(pair.student, v))
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

  // Whole-word split (longest phrase first) — never highlight a key word inside
  // an unrelated longer word (e.g. 'menu' inside 'menunggu').
  const regex = wholeWordSplitRegex([...vocabHits, ...imbuhanHits])
  if (!regex) return text

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
