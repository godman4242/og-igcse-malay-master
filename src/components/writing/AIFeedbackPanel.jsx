import { useState } from 'react'
import { Sparkles, Plus, Volume2 } from 'lucide-react'
import { speak } from '../../lib/speech'

export default function AIFeedbackPanel({ feedback, addCard }) {
  const [expandedSentence, setExpandedSentence] = useState(null)
  if (!feedback) return null

  const bandColor = (feedback.band || 3) >= 5 ? 'var(--color-green)' : (feedback.band || 3) >= 3 ? 'var(--color-orange)' : 'var(--color-red)'
  const errorTypeColor = { imbuhan: 'var(--color-red)', grammar: 'var(--color-orange)', vocab: 'var(--color-blue)', spelling: 'var(--color-purple)' }

  const addWeakWordsToStudy = () => {
    const words = feedback.imbuhanAnalysis?.incorrect || []
    words.forEach(w => {
      addCard({
        m: w.correct,
        e: `${w.rule || 'Imbuhan correction'} (was: ${w.used})`,
        t: 'Writing Corrections',
        p: 'n',
        ex: w.rule || '',
        mn: '',
      })
    })
  }

  return (
    <div className="space-y-3">
      {/* AI Band Score */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={16} style={{ color: 'var(--color-cyan)' }} />
          <h3 className="text-sm font-bold">AI Assessment</h3>
          <span className="ml-auto text-lg font-bold" style={{ color: bandColor }}>Band {feedback.band}/6</span>
        </div>
        {feedback.overall && (
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{feedback.overall}</p>
        )}
      </div>

      {/* Sentence-level annotations */}
      {feedback.sentences?.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3">Sentence Analysis</h3>
          {feedback.sentences.map((s, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <button onClick={() => setExpandedSentence(expandedSentence === i ? null : i)}
                className="w-full text-left">
                <p className="text-sm">
                  {s.errors?.length > 0 ? (
                    <span style={{ textDecoration: 'underline', textDecorationColor: 'var(--color-red)', textDecorationStyle: 'wavy', textUnderlineOffset: '3px' }}>
                      {s.text}
                    </span>
                  ) : (
                    <span>{s.text}</span>
                  )}
                  {s.errors?.length > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(255,82,82,0.15)', color: 'var(--color-red)' }}>
                      {s.errors.length} {s.errors.length === 1 ? 'error' : 'errors'}
                    </span>
                  )}
                </p>
              </button>

              {expandedSentence === i && (
                <div className="mt-2 space-y-2">
                  {s.errors?.map((err, j) => (
                    <div key={j} className="pl-3 text-xs rounded-lg p-2"
                      style={{ background: 'rgba(255,82,82,0.06)', borderLeft: `3px solid ${errorTypeColor[err.type] || 'var(--color-red)'}` }}>
                      <span className="font-bold uppercase text-[10px]" style={{ color: errorTypeColor[err.type] || 'var(--color-red)' }}>
                        {err.type}
                      </span>
                      <p style={{ color: 'var(--color-dim)' }}>{err.issue}</p>
                      {err.fix && <p style={{ color: 'var(--color-green)' }}>Fix: {err.fix}</p>}
                    </div>
                  ))}
                  {s.suggestions?.map((sug, j) => (
                    <p key={j} className="pl-3 text-xs" style={{ color: 'var(--color-cyan)' }}>Tip: {sug}</p>
                  ))}
                  {s.improved && (
                    <div className="pl-3 text-xs p-2 rounded-lg" style={{ background: 'rgba(0,230,118,0.06)', borderLeft: '3px solid var(--color-green)' }}>
                      <span className="font-bold" style={{ color: 'var(--color-green)' }}>Improved:</span>
                      <p style={{ color: 'var(--color-dim)' }}>{s.improved}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Imbuhan Analysis */}
      {feedback.imbuhanAnalysis && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">Imbuhan Analysis</h3>
            {feedback.imbuhanAnalysis.incorrect?.length > 0 && (
              <button onClick={addWeakWordsToStudy}
                className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-bold"
                style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--color-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
                <Plus size={10} /> Add to Deck
              </button>
            )}
          </div>
          {feedback.imbuhanAnalysis.correct?.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-green)' }}>Correct</p>
              <div className="flex flex-wrap gap-1">
                {feedback.imbuhanAnalysis.correct.map((w, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,230,118,0.1)', color: 'var(--color-green)' }}>{w}</span>
                ))}
              </div>
            </div>
          )}
          {feedback.imbuhanAnalysis.incorrect?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-red)' }}>Needs fixing</p>
              {feedback.imbuhanAnalysis.incorrect.map((w, i) => (
                <div key={i} className="text-xs mb-1 p-2 rounded-lg" style={{ background: 'rgba(255,82,82,0.06)' }}>
                  <span style={{ color: 'var(--color-red)' }}>{w.used}</span>
                  <span style={{ color: 'var(--color-dim)' }}> → </span>
                  <span style={{ color: 'var(--color-green)' }}>{w.correct}</span>
                  {w.rule && <p className="mt-0.5" style={{ color: 'var(--color-dim)' }}>{w.rule}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Strengths */}
      {feedback.strengths?.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-green)' }}>Strengths</h3>
          {feedback.strengths.map((s, i) => (
            <p key={i} className="text-xs py-0.5" style={{ color: 'var(--color-dim)' }}>+ {s}</p>
          ))}
        </div>
      )}

      {/* Model Paragraph */}
      {feedback.modelParagraph && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-cyan)' }}>Model Paragraph</h3>
            <button onClick={() => speak(feedback.modelParagraph)} className="text-xs flex items-center gap-1"
              style={{ color: 'var(--color-cyan)' }}>
              <Volume2 size={11} /> Listen
            </button>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-dim)' }}>{feedback.modelParagraph}</p>
        </div>
      )}
    </div>
  )
}
