import { useState } from 'react'
import { ArrowLeft, ChevronRight, Check, X, Volume2, MessageSquare, Sparkles, Loader2 } from 'lucide-react'
import PASSAGES from '../data/comprehensionPassages'
import DICTIONARY from '../data/dictionary'
import { speak } from '../lib/speech'
import { useAI, getRemainingCalls } from '../lib/ai'

export default function Comprehension() {
  const [passage, setPassage] = useState(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: selectedIndex }
  const [showExplanation, setShowExplanation] = useState(false)
  const [complete, setComplete] = useState(false)
  const [selectedWord, setSelectedWord] = useState(null)
  const [aiQuestions, setAiQuestions] = useState(null)
  const ai = useAI()

  // ── Passage Selection ──
  if (!passage) {
    return (
      <div className="space-y-3 animate-fadeUp">
        <h2 className="text-lg font-bold">Paper 1 Comprehension</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--color-dim)' }}>
          Read Malay passages and answer IGCSE-style questions. Tap any word to look it up.
        </p>
        {PASSAGES.map(p => (
          <button key={p.id} onClick={() => { setPassage(p); setQuestionIndex(0); setAnswers({}); setComplete(false); setAiQuestions(null) }}
            className="w-full text-left rounded-2xl p-4 transition-transform"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm">{p.title}</h3>
              <ChevronRight size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-dim)' }}>{p.titleEn}</p>
            <div className="flex gap-2">
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
            </div>
          </button>
        ))}
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
  }

  const handleNext = () => {
    setShowExplanation(false)
    if (questionIndex >= questions.length - 1) {
      setComplete(true)
    } else {
      setQuestionIndex(questionIndex + 1)
    }
  }

  const handleWordTap = (word) => {
    const clean = word.replace(/[.,!?;:'"()]/g, '').toLowerCase()
    const meaning = DICTIONARY[clean]
    setSelectedWord(meaning ? { word: clean, meaning } : { word: clean, meaning: null })
  }

  return (
    <div className="space-y-3 animate-fadeUp">
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
          {passage.text.split(/\s+/).map((word, i) => (
            <span key={i}>
              <button onClick={() => handleWordTap(word)}
                className="hover:underline transition-colors"
                style={{ color: 'var(--color-text)' }}>
                {word}
              </button>{' '}
            </span>
          ))}
        </div>
        {/* TTS */}
        <button onClick={() => speak(passage.text.slice(0, 200))}
          className="mt-2 text-xs flex items-center gap-1" style={{ color: 'var(--color-cyan)' }}>
          <Volume2 size={11} /> Listen (first paragraph)
        </button>
      </div>

      {/* Word lookup popup */}
      {selectedWord && (
        <div className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}>
          <div>
            <span className="font-bold text-sm">{selectedWord.word}</span>
            {selectedWord.meaning ? (
              <span className="text-xs ml-2" style={{ color: 'var(--color-cyan)' }}>= {selectedWord.meaning}</span>
            ) : (
              <span className="text-xs ml-2" style={{ color: 'var(--color-dim)' }}>(not in dictionary)</span>
            )}
          </div>
          <button onClick={() => speak(selectedWord.word)} style={{ color: 'var(--color-cyan)' }}>
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
                {isCorrect ? 'Betul!' : 'Tidak tepat.'}
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
