import { useState, useMemo, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import useTheaterMode from '../hooks/useTheaterMode'
import { listFormats, autoDetectFormat } from '../lib/writingGrader'
import { isGeminiAvailable } from '../lib/gemini'
import { isOpenRouterAvailable } from '../lib/openrouter'
import { getRemainingCalls } from '../lib/ai'
import { buildSessionFeedback } from '../lib/feedback'
import { getExemplar } from '../data/exemplars'

import ThreeLineFeedback from '../components/ThreeLineFeedback'
import WritingTutor from '../components/WritingTutor'
import TemplatesView from '../components/writing/TemplatesView'
import Stat from '../components/writing/Stat'
import SubBandsPanel from '../components/writing/SubBandsPanel'
import IssuesPanel from '../components/writing/IssuesPanel'
import ExemplarPanel from '../components/writing/ExemplarPanel'
import AIFeedbackPanel from '../components/writing/AIFeedbackPanel'
import ConnectorChecklist from '../components/writing/ConnectorChecklist'
import useWritingEvaluator from '../hooks/useWritingEvaluator'

const BAND_COLORS = {
  1: 'var(--color-red)',
  2: 'var(--color-red)',
  3: 'var(--color-orange)',
  4: 'var(--color-orange)',
  5: '#69f0ae',
  6: 'var(--color-green)',
}

export default function Writing() {
  const [lang, setLang] = useState('eng')
  const [mlPaper, setMlPaper] = useState(2)
  const [format, setFormat] = useState('auto')
  const [textareaFocused, setTextareaFocused] = useState(false)

  const autoDetect = useStore(s => s.writingTutor?.autoDetectFormat ?? true)
  const addCard = useStore(s => s.addCard)
  const navigate = useNavigate()
  const { setTheaterMode } = useTheaterMode()

  const {
    text, setText,
    results,
    aiFeedback,
    isAIGrading,
    analyze,
    getAIFeedback,
    ai,
    reset,
  } = useWritingEvaluator({ lang, format, mlPaper })

  const availableFormats = useMemo(
    () => listFormats(lang === 'eng' ? 'eng' : 'malay'),
    [lang],
  )

  const liveDetected = useMemo(() => {
    if (!autoDetect || !text || text.length < 50) return null
    const r = autoDetectFormat(text, lang === 'eng' ? 'eng' : 'malay')
    if (!r.format || r.confidence < 0.15) return null
    return r
  }, [text, lang, autoDetect])

  const resolvedFormatId = useMemo(() => {
    if (format !== 'auto' && format !== 'general') return format
    if (format === 'auto' && liveDetected) return liveDetected.format.id
    return null
  }, [format, liveDetected])

  const exemplar = useMemo(
    () => (resolvedFormatId ? getExemplar(resolvedFormatId) : null),
    [resolvedFormatId],
  )

  // Theater Mode: trigger only when the textarea is FOCUSED *and* has content.
  // Both conditions matter: focus alone shouldn't hide chrome before any
  // writing begins, and stale text in a blurred textarea shouldn't keep the
  // chrome hidden after analysis. Dropping the `!results` gate lets theater
  // re-engage cleanly when the user clicks back in to edit after analyzing.
  const isDrafting = lang !== 'templates' && textareaFocused && text.length > 0
  useEffect(() => {
    if (isDrafting) setTheaterMode(true)
    return () => setTheaterMode(false)
  }, [isDrafting, setTheaterMode])

  const onLangChange = (id) => {
    setLang(id)
    reset()
  }

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
          <button key={l.id} onClick={() => onLangChange(l.id)}
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

      {lang === 'templates' && <TemplatesView />}

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

      {lang !== 'templates' && exemplar && !isDrafting && <ExemplarPanel exemplar={exemplar} />}

      {lang === 'malay' && <ConnectorChecklist text={text} />}

      {lang !== 'templates' && (
        <textarea value={text} onChange={e => setText(e.target.value)}
          onFocus={() => setTextareaFocused(true)}
          onBlur={() => setTextareaFocused(false)}
          className="w-full p-4 rounded-2xl text-sm outline-none resize-y"
          style={{
            background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
            color: 'var(--color-text)', minHeight: 200,
          }}
          placeholder={lang === 'eng' ? 'Paste or write your English essay here...' : 'Tulis karangan Bahasa Melayu anda di sini...'} />
      )}

      {lang !== 'templates' && (
        <button onClick={analyze} disabled={isAIGrading}
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent)', opacity: isAIGrading ? 0.7 : 1 }}>
          {isAIGrading
            ? <><Loader2 size={16} className="animate-spin" /> Analyzing with AI...</>
            : `Analyze ${lang === 'eng' ? 'Essay' : 'Karangan'}`}
        </button>
      )}

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
              style={{ border: '4px solid ' + BAND_COLORS[results.band], color: BAND_COLORS[results.band] }}>
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
                <>
                  {Object.entries(results.aiGrade.marker_check).map(([key, used]) => (
                    <span key={key} className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1"
                      style={{
                        background: used ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)',
                        color: used ? 'var(--color-green)' : 'var(--color-orange)',
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

          {/* Format fidelity (local-only fallback when no AI grade) */}
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

          {results.subBands && (
            <SubBandsPanel sub={results.subBands} metrics={results.metrics} />
          )}

          {results.findings && results.findings.length > 0 && (
            <IssuesPanel
              key={`${results.band ?? 0}-${results.findings.length}`}
              text={text}
              findings={results.findings}
              summary={results.errorSummary}
              band={results.band}
            />
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

          {(isGeminiAvailable() || isOpenRouterAvailable()) && (
            <WritingTutor text={text} results={results} />
          )}

          {getRemainingCalls() > 0 && (
            <button onClick={getAIFeedback} disabled={ai.isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: 'var(--color-accent2)', opacity: ai.isLoading ? 0.7 : 1 }}>
              {ai.isLoading
                ? <><Loader2 size={14} className="animate-spin" /> Analyzing with AI...</>
                : <><Sparkles size={14} /> Get AI Feedback</>}
            </button>
          )}

          {ai.error && (
            <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
              style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.2)' }}>
              <AlertCircle size={12} />
              {ai.error.code === 'rate_limited' ? 'Daily AI limit reached.' : 'AI feedback unavailable — showing basic analysis above.'}
            </div>
          )}

          {aiFeedback && <AIFeedbackPanel feedback={aiFeedback} addCard={addCard} />}
        </div>
      )}
    </div>
  )
}
