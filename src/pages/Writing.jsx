import { useState, useMemo } from 'react'
import { FileText, ChevronDown, ChevronUp, Sparkles, Loader2, AlertCircle, Plus, Volume2 } from 'lucide-react'
import { KARANGAN_TEMPLATES } from '../data/writing'
import { useAI, getRemainingCalls } from '../lib/ai'
import { speak } from '../lib/speech'
import useStore from '../store/useStore'
import ThreeLineFeedback from '../components/ThreeLineFeedback'
import { buildSessionFeedback } from '../lib/feedback'
import { score as gradeWriting, listFormats, autoDetectFormat } from '../lib/writingGrader'
import WritingTutor from '../components/WritingTutor'
import { isGeminiAvailable, fetchAIGrade } from '../lib/gemini'
import { isOpenRouterAvailable } from '../lib/openrouter'
import { useNavigate } from 'react-router-dom'

export default function Writing() {
  const [lang, setLang] = useState('eng')
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [mlPaper, setMlPaper] = useState(2)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [isAIGrading, setIsAIGrading] = useState(false)
  const [format, setFormat] = useState('auto')
  const autoDetect = useStore(s => s.writingTutor?.autoDetectFormat ?? true)
  const logWritingFeedback = useStore(s => s.logWritingFeedback)
  const ai = useAI()
  const addCard = useStore(s => s.addCard)
  const navigate = useNavigate()

  const availableFormats = useMemo(() => listFormats(lang === 'eng' ? 'eng' : 'malay'), [lang])

  const liveDetected = useMemo(() => {
    if (!autoDetect || !text || text.length < 50) return null
    const r = autoDetectFormat(text, lang === 'eng' ? 'eng' : 'malay')
    if (!r.format || r.confidence < 0.15) return null
    return r
  }, [text, lang, autoDetect])

  const getAIFeedback = async () => {
    if (!text || text.length < 30) return
    setAiFeedback(null)
    try {
      const result = await ai.call({
        action: 'writing-feedback',
        payload: {
          messages: [{ role: 'user', content: text }],
          scenarioContext: lang === 'malay'
            ? `The essay is written in Malay. Focus on Malay grammar, imbuhan, and IGCSE criteria. Paper ${mlPaper}.`
            : 'The essay is written in English. Focus on English grammar and IGCSE criteria.',
        },
        stream: false,
      })
      const parsed = typeof result.response === 'string' ? tryParseJSON(result.response) : result.response
      setAiFeedback(parsed)
    } catch {
      // Error handled by useAI hook
    }
  }

  const analyze = async () => {
    const r = gradeWriting(text, {
      lang: lang === 'eng' ? 'eng' : 'malay',
      format,
      paper: mlPaper,
    })
    if (r.error) { alert(r.message); return }
    
    // For English essays, trigger the AI Deep Pass if Gemini is available
    if (lang === 'eng' && isGeminiAvailable()) {
      r.aiGrade = null;
      setResults(r)
      setIsAIGrading(true)
      
      try {
        const aiResponse = await fetchAIGrade(text, r.formatHints, r.metrics, r.errorSummary, r.findings)
        setResults(prev => ({
          ...prev,
          aiGrade: aiResponse,
          band: aiResponse.band // Override the local band with AI band
        }))
        logWritingFeedback?.({
          lang: 'eng',
          format: r.format,
          band: aiResponse.band,
          words: r.words,
        })
      } catch (err) {
        console.error('AI Grading failed', err)
        alert('AI Grading failed (falling back to local grade): ' + err.message)
        // Fallback to local grade if AI fails
        logWritingFeedback?.({
          lang: 'eng',
          format: r.format,
          band: r.band,
          words: r.words,
        })
      } finally {
        setIsAIGrading(false)
      }
    } else {
      setResults(r)
      logWritingFeedback?.({
        lang: lang === 'eng' ? 'eng' : 'malay',
        format: r.format,
        band: r.band,
        words: r.words,
      })
    }
  }

  const bandColors = { 1: 'var(--color-red)', 2: 'var(--color-red)', 3: 'var(--color-orange)', 4: 'var(--color-orange)', 5: '#69f0ae', 6: 'var(--color-green)' }

  return (
    <div className="space-y-3 animate-fadeUp">
      <h2 className="text-lg font-bold">Writing Analyzer</h2>

      {/* Language toggle */}
      <div className="flex gap-2">
        {[
          { id: 'eng', label: 'English' },
          { id: 'malay', label: 'Bahasa Melayu' },
          { id: 'templates', label: 'Templates' },
        ].map(l => (
          <button key={l.id} onClick={() => { setLang(l.id); setResults(null); setText('') }}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: lang === l.id ? 'var(--color-accent)' : 'var(--color-card)',
              color: lang === l.id ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (lang === l.id ? 'var(--color-accent)' : 'var(--color-border)'),
            }}>
            {l.label}
          </button>
        ))}
      </div>

      {/* TEMPLATES TAB */}
      {lang === 'templates' && (
        <TemplatesView />
      )}

      {/* Paper selector for Malay */}
      {lang === 'malay' && (
        <div className="flex gap-2">
          {[2, 4].map(p => (
            <button key={p} onClick={() => setMlPaper(p)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: mlPaper === p ? 'var(--color-accent2)' : 'var(--color-card)',
                color: mlPaper === p ? '#fff' : 'var(--color-dim)',
                border: '1px solid ' + (mlPaper === p ? 'var(--color-accent2)' : 'var(--color-border)'),
              }}>
              Paper {p}
            </button>
          ))}
        </div>
      )}

      {/* Format dropdown — hidden when templates tab active */}
      {lang !== 'templates' && (
        <div className="rounded-2xl p-3 space-y-2"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-sm outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <option value="auto">Auto-detect</option>
            <option value="general">General (no format-specific rules)</option>
            <optgroup label={lang === 'eng' ? 'English formats' : 'Format Bahasa Melayu'}>
              {availableFormats.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </optgroup>
          </select>
          {liveDetected && format === 'auto' && (
            <p className="text-[11px]" style={{ color: 'var(--color-cyan)' }}>
              Looks like <strong>{liveDetected.format.label}</strong> ({Math.round(liveDetected.confidence * 100)}% confident)
            </p>
          )}
        </div>
      )}

      {/* Text area — hidden when templates tab active */}
      {lang !== 'templates' && <textarea value={text} onChange={e => setText(e.target.value)}
        className="w-full p-4 rounded-2xl text-sm outline-none resize-y"
        style={{
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          color: 'var(--color-text)', minHeight: 200,
        }}
        placeholder={lang === 'eng' ? 'Paste or write your English essay here...' : 'Tulis karangan Bahasa Melayu anda di sini...'} />}

      {lang !== 'templates' && <button onClick={analyze} disabled={isAIGrading}
        className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
        style={{ background: 'var(--color-accent)', opacity: isAIGrading ? 0.7 : 1 }}>
        {isAIGrading ? <><Loader2 size={16} className="animate-spin" /> Analyzing with AI...</> : `Analyze ${lang === 'eng' ? 'Essay' : 'Karangan'}`}
      </button>}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {(() => {
            const fb = buildSessionFeedback('writing', { band: results.band }, useStore.getState())
            return (
              <ThreeLineFeedback goal={fb.goal} now={fb.now} next={fb.next}
                onNextClick={fb.nextHref ? () => navigate(fb.nextHref) : null} />
            )
          })()}
          {/* Band Score */}
          <div className="flex items-center gap-4 rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ border: '4px solid ' + bandColors[results.band], color: bandColors[results.band] }}>
              {results.band}
            </div>
            <div>
              <p className="font-bold">Band {results.band}/6</p>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                {results.words} words{results.isMalay ? ` · Paper ${results.paper}` : ''}
              </p>
            </div>
          </div>

          {/* Techniques / AI Format Markers */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-3">
              {results.isMalay ? 'Penanda Wacana' : 'Techniques & Conventions'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {results.isMalay ? (
                results.pw.length > 0
                  ? results.pw.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--color-green)' }}>{p}</span>
                  ))
                  : <span className="text-xs" style={{ color: 'var(--color-dim)' }}>No discourse markers found</span>
              ) : results.aiGrade ? (
                // AI-driven format conventions
                <>
                  {Object.entries(results.aiGrade.marker_check).map(([key, used]) => (
                    <span key={key} className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1"
                      style={{ 
                        background: used ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)', 
                        color: used ? 'var(--color-green)' : 'var(--color-orange)' 
                      }}>
                      {used ? '✓' : '✗'} {key.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {results.aiGrade.positives.length > 0 && (
                    <div className="w-full mt-2 space-y-1">
                      {results.aiGrade.positives.map((pos, i) => (
                        <p key={i} className="text-xs" style={{ color: 'var(--color-green)' }}>+ {pos}</p>
                      ))}
                    </div>
                  )}
                </>
              ) : isAIGrading ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-dim)' }}>
                  <Loader2 size={12} className="animate-spin" /> AI is evaluating techniques...
                </div>
              ) : (
                // Fallback to local heuristic
                <>
                  <span className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{ background: results.sims > 0 ? 'rgba(0,230,118,0.15)' : 'rgba(179,136,255,0.15)', color: results.sims > 0 ? 'var(--color-green)' : 'var(--color-purple)' }}>
                    Similes: {results.sims}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{ background: results.mets > 0 ? 'rgba(0,230,118,0.15)' : 'rgba(68,138,255,0.15)', color: results.mets > 0 ? 'var(--color-green)' : 'var(--color-blue)' }}>
                    Metaphors: {results.mets}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{ background: results.disc.length >= 3 ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)', color: results.disc.length >= 3 ? 'var(--color-green)' : 'var(--color-orange)' }}>
                    Discourse: {results.disc.length}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full font-semibold"
                    style={{ background: results.vocab.length >= 3 ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)', color: results.vocab.length >= 3 ? 'var(--color-green)' : 'var(--color-orange)' }}>
                    Formal: {results.vocab.length}
                  </span>
                </>
              )}
            </div>
            {results.aiGrade?.justification && (
              <p className="mt-3 text-xs italic" style={{ color: 'var(--color-dim)' }}>
                "{results.aiGrade.justification}"
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-xs font-bold mb-2">Structure</h3>
              <Stat label="Paragraphs" value={results.paras} good={results.paras >= 3} />
              <Stat label="Sentences" value={results.sents} />
              <Stat label="Avg Length" value={results.avgLen} good={results.avgLen >= 12} />
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-xs font-bold mb-2">Stats</h3>
              <Stat label="Words" value={results.words} good={results.words >= 250} />
              {results.isMalay
                ? <Stat label="Formal" value={results.formal.length} good={results.formal.length >= 3} />
                : <Stat label="Complex" value={results.complex} good={results.complex > 0} />
              }
            </div>
          </div>

          {/* Format fidelity - Fallback for local heuristic when no AI grade */}
          {results.formatLabel && results.format !== 'general' && !results.aiGrade && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-sm font-bold mb-1">
                Format: {results.formatLabel}
                {results.detectedAuto && results.formatConfidence < 1 && (
                  <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--color-dim)' }}>
                    auto-detected · {Math.round(results.formatConfidence * 100)}%
                  </span>
                )}
              </h3>
              {!isAIGrading && results.formatHits.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-green)' }}>Markers used (Local)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {results.formatHits.map((m, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--color-green)' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {!isAIGrading && results.formatMisses.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-orange)' }}>Markers missing (Local)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {results.formatMisses.slice(0, 6).map((m, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,145,0,0.12)', color: 'var(--color-orange)' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {isAIGrading && (
                <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--color-dim)' }}>
                  <Loader2 size={12} className="animate-spin" /> AI is verifying format conventions...
                </div>
              )}
            </div>
          )}

          {/* Sub-bands (English only) */}
          {results.subBands && (
            <SubBandsPanel sub={results.subBands} metrics={results.metrics} />
          )}

          {/* Issues with inline highlights (English only) */}
          {results.findings && results.findings.length > 0 && (
            <IssuesPanel text={text} findings={results.findings} summary={results.errorSummary} />
          )}

          {/* Tips */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-2">{results.isMalay ? 'Penambahbaikan' : 'Improve'}</h3>
            {results.aiGrade ? (
              results.aiGrade.improvements.map((t, i) => (
                <p key={i} className="text-sm py-1" style={{ color: 'var(--color-dim)' }}>• {t}</p>
              ))
            ) : isAIGrading ? (
              <div className="flex items-center gap-2 text-xs py-2" style={{ color: 'var(--color-dim)' }}>
                <Loader2 size={12} className="animate-spin" /> AI is generating personalized tips...
              </div>
            ) : (
              results.tips.map((t, i) => (
                <p key={i} className="text-sm py-1" style={{ color: 'var(--color-dim)' }}>• {t}</p>
              ))
            )}
          </div>

          {/* Free AI tutor — Gemini / OpenRouter */}
          {(isGeminiAvailable() || isOpenRouterAvailable()) && (
            <WritingTutor text={text} results={results} />
          )}

          {/* AI Feedback Button — Claude via Edge Function */}
          {getRemainingCalls() > 0 && (
            <button onClick={getAIFeedback} disabled={ai.isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: 'var(--color-accent2)', opacity: ai.isLoading ? 0.7 : 1 }}>
              {ai.isLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing with AI...</>
              ) : (
                <><Sparkles size={14} /> Get AI Feedback</>
              )}
            </button>
          )}

          {/* AI Error */}
          {ai.error && (
            <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
              style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.2)' }}>
              <AlertCircle size={12} />
              {ai.error.code === 'rate_limited' ? 'Daily AI limit reached.' : 'AI feedback unavailable — showing basic analysis above.'}
            </div>
          )}

          {/* AI Feedback Panel */}
          {aiFeedback && <AIFeedbackPanel feedback={aiFeedback} addCard={addCard} />}
        </div>
      )}
    </div>
  )
}

function TemplatesView() {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
        Paper 4 Q3 karangan structures with penanda wacana and example phrases.
      </p>
      {KARANGAN_TEMPLATES.map(t => {
        const isOpen = expanded === t.id
        return (
          <div key={t.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <button onClick={() => setExpanded(isOpen ? null : t.id)}
              className="w-full flex items-center justify-between p-4">
              <div className="text-left">
                <h3 className="font-bold text-sm">{t.title}</h3>
                <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{t.titleEn} · {t.wordTarget} words</p>
              </div>
              {isOpen ? <ChevronUp size={16} style={{ color: 'var(--color-dim)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-dim)' }} />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                {/* Structure */}
                <div className="space-y-2">
                  {t.structure.map((s, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: 'var(--color-accent2)' }}>{i + 1}</span>
                        <span className="text-sm font-bold">{s.section}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-dim)' }}>{s.hint}</p>
                      <p className="text-xs italic px-2 py-1.5 rounded-lg" style={{ background: 'rgba(0,229,255,0.08)', color: 'var(--color-cyan)' }}>
                        {s.example}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Penanda Wacana */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
                  <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--color-green)' }}>Penanda Wacana to use:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {t.markers.map((m, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full font-semibold"
                        style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--color-green)' }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, value, good }) {
  return (
    <div className="flex justify-between py-1 text-xs border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
      <span style={{ color: 'var(--color-dim)' }}>{label}</span>
      <span className="font-bold" style={{ color: good === true ? 'var(--color-green)' : good === false ? 'var(--color-red)' : 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  )
}

function bandColor(b) {
  if (b >= 6) return 'var(--color-green)'
  if (b >= 5) return '#69f0ae'
  if (b >= 4) return 'var(--color-orange)'
  return 'var(--color-red)'
}

const SUB_BAND_LABELS = {
  content:  { label: 'Content',  hint: 'Length, paragraphs, idea development' },
  accuracy: { label: 'Accuracy', hint: 'Grammar + spelling error density' },
  vocab:    { label: 'Vocabulary', hint: 'Range (TTR), formal/sophisticated words' },
  variety:  { label: 'Sentence Variety', hint: 'Length variance + complex structures' },
  cohesion: { label: 'Cohesion', hint: 'Unique discourse markers used' },
  format:   { label: 'Format', hint: 'Required conventions of the chosen format' },
}

function SubBandsPanel({ sub, metrics }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-3">Band Breakdown</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(sub).map(([k, v]) => {
          const meta = SUB_BAND_LABELS[k] || { label: k, hint: '' }
          return (
            <div key={k} className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ border: '2px solid ' + bandColor(v), color: bandColor(v) }}>
                {v}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{meta.label}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--color-dim)' }}>{meta.hint}</p>
              </div>
            </div>
          )
        })}
      </div>
      {metrics && (
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <MetricLine label="Errors / 100w (high)" value={metrics.errorsPer100} />
          <MetricLine label="Errors / 100w (all)" value={metrics.allErrorsPer100} />
          <MetricLine label="Lexical diversity (TTR)" value={metrics.ttr} />
          <MetricLine label="Sentence-length σ" value={metrics.sentLenStd} />
          <MetricLine label="Complex / total sentences" value={metrics.complexRatio} />
          <MetricLine label="Opener variety" value={metrics.openerVariety} />
          <MetricLine label="Avg syllables / word" value={metrics.avgSyll} />
          <MetricLine label="Long-word ratio" value={metrics.longWordRatio} />
          <MetricLine label="Unique discourse markers" value={metrics.uniqueDiscourse} />
          <MetricLine label="Formal vocabulary hits" value={metrics.formalCount} />
        </div>
      )}
    </div>
  )
}

function MetricLine({ label, value }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--color-dim)' }}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

const SEVERITY_COLOR = {
  high:   { bg: 'rgba(255,82,82,0.12)',   fg: 'var(--color-red)',    underline: 'var(--color-red)' },
  medium: { bg: 'rgba(255,145,0,0.12)',   fg: 'var(--color-orange)', underline: 'var(--color-orange)' },
  low:    { bg: 'rgba(0,229,255,0.10)',   fg: 'var(--color-cyan)',   underline: 'var(--color-cyan)' },
}

const TYPE_LABEL = {
  spelling:    'Spelling',
  grammar:     'Grammar',
  confusable:  'Confused word',
  punctuation: 'Punctuation',
  style:       'Style',
}

function IssuesPanel({ text, findings, summary }) {
  const [active, setActive] = useState(null) // index of selected finding
  const [filter, setFilter] = useState('all') // 'all' | 'high' | 'medium' | 'low'

  const visible = useMemo(() => {
    if (filter === 'all') return findings
    return findings.filter(f => f.severity === filter)
  }, [findings, filter])

  const highlighted = useMemo(() => renderHighlighted(text, visible, active), [text, visible, active])

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold">Issues found ({summary?.counts?.total ?? findings.length})</h3>
        <div className="flex gap-1 text-[10px]">
          {[
            { id: 'all',    label: `All (${summary?.counts?.total ?? findings.length})`, color: 'var(--color-text)' },
            { id: 'high',   label: `High (${summary?.counts?.high ?? 0})`,    color: 'var(--color-red)' },
            { id: 'medium', label: `Med (${summary?.counts?.medium ?? 0})`,   color: 'var(--color-orange)' },
            { id: 'low',    label: `Low (${summary?.counts?.low ?? 0})`,      color: 'var(--color-cyan)' },
          ].map(b => (
            <button key={b.id} onClick={() => { setFilter(b.id); setActive(null) }}
              className="px-2 py-0.5 rounded-full font-bold uppercase"
              style={{
                background: filter === b.id ? b.color : 'transparent',
                color: filter === b.id ? '#000' : b.color,
                border: '1px solid ' + b.color,
              }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Highlighted essay */}
      <div className="rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: 280, overflowY: 'auto' }}>
        {highlighted}
      </div>

      {/* List of issues */}
      {visible.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>No issues at this severity.</p>
      ) : (
        <div className="space-y-1.5">
          {visible.map((f) => {
            const orig = findings.indexOf(f)
            const sel = active === orig
            const sc = SEVERITY_COLOR[f.severity] || SEVERITY_COLOR.low
            return (
              <button key={orig} onClick={() => setActive(sel ? null : orig)}
                className="w-full text-left rounded-lg px-2.5 py-2 transition-all"
                style={{
                  background: sel ? sc.bg : 'transparent',
                  border: '1px solid ' + (sel ? sc.fg : 'var(--color-border)'),
                }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                    style={{ background: sc.bg, color: sc.fg }}>
                    {TYPE_LABEL[f.type] || f.type}
                  </span>
                  <span className="text-xs italic" style={{ color: 'var(--color-text)' }}>
                    “{f.excerpt.length > 50 ? f.excerpt.slice(0, 50) + '…' : f.excerpt}”
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>
                  {f.message}
                </p>
                {f.suggestion && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-green)' }}>
                    Suggested: <span className="font-mono">{f.suggestion}</span>
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function renderHighlighted(text, findings, activeIdx) {
  if (!findings || findings.length === 0) return text
  // Build non-overlapping segments. If two findings overlap, prefer the higher severity.
  const sevRank = { high: 3, medium: 2, low: 1 }
  const sorted = [...findings].sort((a, b) => a.start - b.start || (sevRank[b.severity] - sevRank[a.severity]))
  const segments = []
  let cursor = 0
  for (const f of sorted) {
    if (f.start < cursor) continue   // skip overlap
    if (f.start > cursor) segments.push({ text: text.slice(cursor, f.start), finding: null })
    segments.push({ text: text.slice(f.start, f.end), finding: f })
    cursor = f.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), finding: null })

  return segments.map((seg, i) => {
    if (!seg.finding) return <span key={i}>{seg.text}</span>
    const sc = SEVERITY_COLOR[seg.finding.severity] || SEVERITY_COLOR.low
    const isActive = activeIdx !== null && findings[activeIdx] === seg.finding
    return (
      <span key={i} title={seg.finding.message}
        style={{
          background: isActive ? sc.bg : 'transparent',
          textDecoration: 'underline',
          textDecorationStyle: 'wavy',
          textDecorationColor: sc.underline,
          textDecorationThickness: '2px',
          textUnderlineOffset: '3px',
          borderRadius: '2px',
          padding: '0 1px',
        }}>
        {seg.text}
      </span>
    )
  })
}

function AIFeedbackPanel({ feedback, addCard }) {
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

function tryParseJSON(text) {
  if (!text) return null
  try {
    if (typeof text === 'object') return text
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { return null }
    }
    return null
  }
}
