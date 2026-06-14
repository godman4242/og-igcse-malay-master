import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, ChevronRight, Check, X, Volume2, MessageSquare, Sparkles, Loader2, RefreshCw, Pause, Star } from 'lucide-react'
import PASSAGES from '../data/comprehensionPassages'
import DICTIONARY from '../data/dictionary'
import { speak, speakWithBoundaries, tokenizeWithOffsets } from '../lib/speech'
import { isGeminiAvailable } from '../lib/gemini'
import { callTextAI } from '../lib/aiText'
import useStore from '../store/useStore'
import DictionaryIcon from '../components/DictionaryIcon'
import { prioritiseByInterests } from '../lib/interests'
import { leadByLang } from '../lib/passageOrder'
import Meta from '../components/Meta'

const QGEN_SYSTEM_PROMPT = `You are an IGCSE comprehension question writer. Given a passage in Malay or English, generate 5 fresh IGCSE-style multiple-choice questions covering varied skills (factual, vocabulary, inference, tone, main_idea). Question wording must match the passage language. Distractors must be plausible — not obviously absurd.

Return ONLY valid JSON, no markdown:
{
  "questions": [
    {
      "id": <integer 1-5>,
      "type": "factual" | "vocabulary" | "inference" | "tone" | "main_idea",
      "question": "<the question>",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIndex": <0-3>,
      "explanation": "<short, evidence-based explanation>",
      "referenceText": "<short verbatim quote from the passage that justifies the answer>"
    }
  ]
}`

export default function Comprehension() {
  const [passage, setPassage] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: selectedIndex }
  const [showExplanation, setShowExplanation] = useState(false)
  const [complete, setComplete] = useState(false)
  const [selectedWord, setSelectedWord] = useState(null)
  const [aiQuestions, setAiQuestions] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [readingWordIdx, setReadingWordIdx] = useState(-1)
  const [isReading, setIsReading] = useState(false)
  const speakerRef = useRef(null)
  const addMistake = useStore(s => s.addMistake)
  const logSkillActivity = useStore(s => s.logSkillActivity)
  const userInterests = useStore(s => s.userInterests) ?? []
  const studyLang = useStore(s => s.studyLang)

  // Order passages two-tier: study language LEADS (Fork I — an English learner
  // opens the picker to English passages on top), interest-starred topics float
  // within each language group. Both are stable "reorder, don't filter" sorts,
  // so the full list stays reachable below the lead. leadByLang runs LAST so
  // language is the primary key over the interest-prioritised wrappers.
  const prioritisedPassages = useMemo(
    () => leadByLang(
      prioritiseByInterests(PASSAGES, userInterests, (p) => [p.topic]),
      studyLang,
      (w) => w.item.lang,
    ),
    [userInterests, studyLang],
  )

  // Same tokeniser the read-along boundary-mapper uses, so the highlighted
  // word index always lines up with the visible button index.
  const tokens = useMemo(() => tokenizeWithOffsets(passage?.text || ''), [passage?.text])

  // Stop any in-flight playback when the passage changes or component unmounts.
  useEffect(() => {
    setIsReading(false)
    setReadingWordIdx(-1)
    return () => {
      if (speakerRef.current) {
        speakerRef.current.cancel()
        speakerRef.current = null
      }
    }
  }, [passage?.id])

  const startReadAlong = () => {
    if (!passage || isReading) return
    setIsReading(true)
    setReadingWordIdx(-1)
    speakerRef.current = speakWithBoundaries({
      text: passage.text,
      lang: passage.lang === 'en' ? 'en-GB' : 'ms-MY',
      rate: 0.85,
      onWordChange: (idx) => setReadingWordIdx(idx),
      onEnd: () => { setIsReading(false); setReadingWordIdx(-1); speakerRef.current = null },
      onError: () => { setIsReading(false); setReadingWordIdx(-1); speakerRef.current = null },
    })
  }

  const stopReadAlong = () => {
    if (speakerRef.current) {
      speakerRef.current.cancel()
      speakerRef.current = null
    }
    setIsReading(false)
    setReadingWordIdx(-1)
  }

  const handleGenerateQuestions = async () => {
    if (!passage || generating) return
    setGenerating(true)
    setGenError(null)
    try {
      const langName = passage.lang === 'en' ? 'English' : 'Bahasa Melayu'
      const userMsg = `Passage language: ${langName}\nPassage title: ${passage.title}\n\nPassage:\n"""\n${passage.text}\n"""\n\nGenerate 5 fresh IGCSE-style questions. Reply with the JSON shape only.`
      const raw = await callTextAI({
        systemPrompt: QGEN_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
        maxTokens: 2000,
      })
      const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      const parsed = JSON.parse(cleaned)
      if (!Array.isArray(parsed.questions) || !parsed.questions.length) throw new Error('empty')
      setAiQuestions(parsed.questions)
      setQuestionIndex(0)
      setAnswers({})
      setShowExplanation(false)
      setComplete(false)
    } catch (err) {
      setGenError(err.message === 'empty' ? 'Generator returned no questions.' : 'Could not generate. Falling back to canned questions.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Passage Selection ──
  if (!passage) {
    return (
      <div className="space-y-3 animate-fadeUp">
        <Meta 
          title="Comprehension | IGCSE Malay Master" 
          description="Practice IGCSE Paper 1 reading skills with bilingual passages, interactive dictionary lookups, and AI-generated questions."
        />
        <h2 className="text-lg font-bold">Paper 1 Comprehension</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--color-dim)' }}>
          Read IGCSE-style passages in Malay or English and answer the questions. On Malay passages, tap any word to look it up.
        </p>
        {prioritisedPassages.map(({ item: p, matchedInterests }) => {
          const starred = matchedInterests.size > 0
          return (
            <button key={p.id} onClick={() => { setPassage(p); setQuestionIndex(0); setAnswers({}); setComplete(false); setAiQuestions(null); setSelectedWord(null) }}
              className="w-full text-left rounded-2xl p-4 transition-transform"
              style={{
                background: 'var(--color-card)',
                border: '1px solid ' + (starred ? 'var(--color-orange)' : 'var(--color-border)'),
                boxShadow: starred ? '0 0 0 1px rgba(255,145,0,0.25)' : 'none',
              }}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  {starred && <Star size={12} fill="var(--color-orange)" style={{ color: 'var(--color-orange)' }} />}
                  {p.title}
                </h3>
                <ChevronRight size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              {p.titleEn && p.titleEn !== p.title && (
                <p className="text-xs mb-2" style={{ color: 'var(--color-dim)' }}>{p.titleEn}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: p.lang === 'en' ? 'rgba(0,229,255,0.15)' : 'rgba(255,77,109,0.15)',
                    color: p.lang === 'en' ? 'var(--color-cyan)' : 'var(--color-accent)',
                  }}>
                  {p.lang === 'en' ? 'EN' : 'MY'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(68,138,255,0.15)', color: 'var(--color-blue)' }}>
                  {p.topic}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: p.difficulty === 'beginner' ? 'rgba(0,230,118,0.15)' : p.difficulty === 'advanced' ? 'rgba(255,82,82,0.15)' : 'rgba(255,145,0,0.15)',
                    color: p.difficulty === 'beginner' ? 'var(--color-green)' : p.difficulty === 'advanced' ? 'var(--color-red)' : 'var(--color-orange)',
                  }}>
                  {p.difficulty}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent2)' }}>
                  {p.questions.length} questions
                </span>
                {starred && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                    style={{ background: 'rgba(255,145,0,0.15)', color: 'var(--color-orange)' }}>
                    <Star size={9} fill="currentColor" /> Your interest
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const questions = aiQuestions || passage.questions
  const currentQ = questions[questionIndex]
  const userAnswer = answers[currentQ?.id]
  const isAnswered = userAnswer !== undefined
  const isCorrect = isAnswered && userAnswer === currentQ.correctIndex
  const score = Object.entries(answers).filter(([qId, ans]) => {
    const q = questions.find(q => q.id === Number(qId))
    return q && ans === q.correctIndex
  }).length

  // ── Score Screen ──
  if (complete) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="space-y-4 animate-fadeUp">
        <Meta title={`Finished: ${passage.title} | IGCSE Malay Master`} />
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-4xl mb-2">{pct >= 80 ? '\u{1F3C6}' : pct >= 60 ? '\u{1F389}' : '\u{1F4AA}'}</p>
          <h2 className="text-xl font-bold mb-1">Comprehension Complete!</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--color-dim)' }}>{passage.title}</p>
          <span className="text-3xl font-bold" style={{
            color: pct >= 80 ? 'var(--color-green)' : pct >= 60 ? 'var(--color-orange)' : 'var(--color-red)',
          }}>
            {score}/{questions.length}
          </span>
          <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>{pct}% correct</p>
        </div>

        {/* Review answers */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-3">Review</h3>
          {questions.map((q, i) => {
            const ans = answers[q.id]
            const correct = ans === q.correctIndex
            return (
              <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2 mb-1">
                  {correct ? <Check size={14} style={{ color: 'var(--color-green)' }} /> : <X size={14} style={{ color: 'var(--color-red)' }} />}
                  <span className="text-xs font-bold">{q.questionEn || q.question}</span>
                </div>
                {!correct && (
                  <p className="text-xs ml-6" style={{ color: 'var(--color-dim)' }}>
                    Correct: {q.options[q.correctIndex]} — {q.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setQuestionIndex(0); setAnswers({}); setComplete(false) }}
            className="flex-1 p-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'var(--color-accent2)' }}>
            Try Again
          </button>
          <button onClick={() => setPassage(null)}
            className="flex-1 p-3 rounded-xl font-bold text-sm"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
            <ArrowLeft size={14} className="inline mr-1" /> All Passages
          </button>
        </div>
      </div>
    )
  }

  // ── Active Reading + Questions ──
  const handleSelectAnswer = (optIndex) => {
    if (isAnswered) return
    setAnswers(prev => ({ ...prev, [currentQ.id]: optIndex }))
    setShowExplanation(true)
    if (optIndex !== currentQ.correctIndex) {
      addMistake?.({
        type: 'comprehension',
        source: passage.id,
        language: passage.lang === 'en' ? 'en' : 'ms',
        category: 'comprehension',
        severity: currentQ.type === 'inference' ? 'high' : 'med',
        word: '',
        surface: currentQ.question,
        given: currentQ.options[optIndex] || '',
        correct: currentQ.options[currentQ.correctIndex] || '',
        note: currentQ.explanation || `${currentQ.type} question`,
      })
    }
  }

  const handleNext = () => {
    setShowExplanation(false)
    if (questionIndex >= questions.length - 1) {
      setComplete(true)
      logSkillActivity('reading') // one finished question set = one Reading unit (paper-balance meter)
    } else {
      setQuestionIndex(questionIndex + 1)
    }
  }

  const handleWordTap = (word) => {
    // Dictionary lookup is Malay-only. For English passages, the word click
    // is a no-op (TTS still works on the panel above).
    if (passage.lang === 'en') return
    const clean = word.replace(/[.,!?;:'"()]/g, '').toLowerCase()
    const meaning = DICTIONARY[clean]
    setSelectedWord(meaning ? { word: clean, meaning } : { word: clean, meaning: null })
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      <Meta title={`${passage.title} | IGCSE Malay Master`} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setPassage(null)} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-xs font-bold" style={{ color: 'var(--color-accent2)' }}>
          Q{questionIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Passage */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-bold text-sm mb-2">{passage.title}</h3>
        <div className="text-sm leading-relaxed">
          {tokens.map((t) => (
            <span key={t.index}>
              <button onClick={() => handleWordTap(t.word)}
                className="hover:underline transition-colors"
                style={{
                  color: 'var(--color-text)',
                  background: readingWordIdx === t.index ? 'rgba(124,58,237,0.22)' : 'transparent',
                  borderRadius: 3,
                  padding: '0 2px',
                  transition: 'background-color 120ms ease',
                }}>
                {t.word}
              </button>{' '}
            </span>
          ))}
        </div>
        {/* TTS */}
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          {isReading ? (
            <button onClick={stopReadAlong}
              className="text-xs flex items-center gap-1 font-semibold"
              style={{ color: 'var(--color-accent2)' }}
              aria-label="Stop read-along">
              <Pause size={11} /> Stop
            </button>
          ) : (
            <button onClick={startReadAlong}
              className="text-xs flex items-center gap-1 font-semibold"
              style={{ color: 'var(--color-cyan)' }}
              aria-label="Read passage aloud with word highlighting">
              <Volume2 size={11} /> Read along
            </button>
          )}
          {isGeminiAvailable() && (
            <button onClick={handleGenerateQuestions} disabled={generating}
              className="text-xs flex items-center gap-1"
              style={{ color: aiQuestions ? 'var(--color-accent2)' : 'var(--color-cyan)', opacity: generating ? 0.6 : 1 }}>
              {generating
                ? <><Loader2 size={11} className="animate-spin" /> Generating...</>
                : <><RefreshCw size={11} /> {aiQuestions ? 'Regenerate AI questions' : 'Get fresh AI questions'}</>}
            </button>
          )}
          {genError && (
            <span className="text-xs" style={{ color: 'var(--color-orange)' }}>{genError}</span>
          )}
        </div>
      </div>

      {/* Word lookup popup */}
      {selectedWord && (
        <div className="rounded-xl p-3 flex items-center justify-between gap-2"
          style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}>
          <div className="flex items-center gap-2 min-w-0">
            {passage.lang !== 'en' && (
              <DictionaryIcon word={selectedWord.word} meaning={selectedWord.meaning || undefined} size={28} />
            )}
            <div className="min-w-0">
              <span className="font-bold text-sm">{selectedWord.word}</span>
              {selectedWord.meaning ? (
                <span className="text-xs ml-2" style={{ color: 'var(--color-cyan)' }}>= {selectedWord.meaning}</span>
              ) : (
                <span className="text-xs ml-2" style={{ color: 'var(--color-dim)' }}>(not in dictionary)</span>
              )}
            </div>
          </div>
          <button onClick={() => speak(selectedWord.word, passage.lang === 'en' ? 'en-GB' : 'ms-MY')} style={{ color: 'var(--color-cyan)' }}>
            <Volume2 size={14} />
          </button>
        </div>
      )}

      {/* Current Question */}
      {currentQ && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent2)' }}>
              {currentQ.type}
            </span>
          </div>
          <p className="text-sm font-bold mb-1">{currentQ.question}</p>
          {currentQ.questionEn && (
            <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{currentQ.questionEn}</p>
          )}

          {/* Options */}
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              const selected = userAnswer === i
              const isRight = i === currentQ.correctIndex
              let bg = 'var(--color-surface)'
              let border = 'var(--color-border)'
              if (isAnswered) {
                if (isRight) { bg = 'rgba(0,230,118,0.1)'; border = 'var(--color-green)' }
                else if (selected && !isRight) { bg = 'rgba(255,82,82,0.1)'; border = 'var(--color-red)' }
              } else if (selected) {
                bg = 'rgba(68,138,255,0.1)'; border = 'var(--color-blue)'
              }

              return (
                <button key={i} onClick={() => handleSelectAnswer(i)}
                  className="w-full text-left p-3 rounded-xl text-sm transition-colors flex items-center gap-2"
                  style={{ background: bg, border: `1.5px solid ${border}` }}>
                  {isAnswered && isRight && <Check size={14} style={{ color: 'var(--color-green)' }} />}
                  {isAnswered && selected && !isRight && <X size={14} style={{ color: 'var(--color-red)' }} />}
                  {opt}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="mt-3 p-3 rounded-xl text-xs" style={{
              background: isCorrect ? 'rgba(0,230,118,0.06)' : 'rgba(255,82,82,0.06)',
              border: `1px solid ${isCorrect ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}`,
            }}>
              <p className="font-bold mb-1" style={{ color: isCorrect ? 'var(--color-green)' : 'var(--color-red)' }}>
                {passage.lang === 'en'
                  ? (isCorrect ? 'Correct!' : 'Not quite.')
                  : (isCorrect ? 'Betul!' : 'Tidak tepat.')}
              </p>
              <p style={{ color: 'var(--color-dim)' }}>{currentQ.explanation}</p>
              {currentQ.referenceText && (
                <p className="mt-1 italic" style={{ color: 'var(--color-cyan)' }}>
                  "{currentQ.referenceText}"
                </p>
              )}
            </div>
          )}

          {/* Next button */}
          {isAnswered && (
            <button onClick={handleNext}
              className="w-full mt-3 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1"
              style={{ background: 'var(--color-accent)' }}>
              {questionIndex >= questions.length - 1 ? 'See Results' : 'Next Question'} <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {questions.map((q, i) => {
          const answered = answers[q.id] !== undefined
          const correct = answered && answers[q.id] === q.correctIndex
          return (
            <div key={i} className="w-2 h-2 rounded-full transition-colors"
              style={{
                background: i === questionIndex ? 'var(--color-accent)'
                  : correct ? 'var(--color-green)'
                  : answered ? 'var(--color-red)'
                  : 'var(--color-border)',
              }} />
          )
        })}
      </div>
    </div>
  )
}
