import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import useTheaterMode from '../hooks/useTheaterMode'
import { listFormats, autoDetectFormat } from '../lib/writingGrader'
import { tasksForFormat, getTask } from '../data/writingTasks'
import { isGeminiAvailable } from '../lib/gemini'
import { isOpenRouterAvailable } from '../lib/openrouter'
import { getRemainingCalls } from '../lib/ai'
import { buildSessionFeedback } from '../lib/feedback'
import { getWritingSample } from '../data/writingSamples'

import ThreeLineFeedback from '../components/ThreeLineFeedback'
import AddKeyNudge from '../components/AddKeyNudge'
import TemplatesView from '../components/writing/TemplatesView'
import Stat from '../components/writing/Stat'
import SubBandsPanel from '../components/writing/SubBandsPanel'
import IssuesPanel from '../components/writing/IssuesPanel'
import AIFeedbackPanel from '../components/writing/AIFeedbackPanel'
import ConnectorChecklist from '../components/writing/ConnectorChecklist'
import ContentTraitPanel from '../components/writing/ContentTraitPanel'
import useWritingEvaluator from '../hooks/useWritingEvaluator'

// On-demand panels split off the Writing route chunk:
//  • ExemplarPanel pulls the heavy band-6 `exemplars.js` data (only shown once a
//    format is chosen) — it now owns the getExemplar lookup via a `formatId` prop.
//  • WritingTutor (AI tutor) only renders when an AI provider is available.
const ExemplarPanel = lazy(() => import('../components/writing/ExemplarPanel'))
const WritingTutor = lazy(() => import('../components/WritingTutor'))

// v2 annotated feedback ships in a separate chunk so it never lands on cold
// load. The lazy() boundary is the kind required by spec §5.6.
const AnnotatedWritingFeedback = lazy(() => import('../components/AnnotatedWritingFeedback'))

const BAND_COLORS = {
  1: 'var(--color-red)',
  2: 'var(--color-red)',
  3: 'var(--color-orange)',
  4: 'var(--color-orange)',
  5: '#69f0ae',
  6: 'var(--color-green)',
}

export default function Writing() {
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const [lang, setLang] = useState(studyLang === 'en' ? 'eng' : 'malay') // INITIAL value seeded from the global study language (Fork I; was hardcoded 'eng'), still toggleable in-page
  const [mlPaper, setMlPaper] = useState(2)
  const [format, setFormat] = useState('auto')
  const [selectedTaskId, setSelectedTaskId] = useState('') // '' = Free write (no task) — today's behaviour
  const [textareaFocused, setTextareaFocused] = useState(false)

  const autoDetect = useStore(s => s.writingTutor?.autoDetectFormat ?? true)
  const addCard = useStore(s => s.addCard)
  const navigate = useNavigate()
  const { setTheaterMode } = useTheaterMode()

  // Task picker (English only): tasks for the chosen format, plus the resolved
  // Task object that drives the evaluator. Free write ('' / no match) → undefined,
  // so the AI grader stays in its no-task, byte-identical-to-before mode.
  const availableTasks = useMemo(
    () => (lang === 'eng' && format !== 'auto' && format !== 'general' ? tasksForFormat(format, 'eng') : []),
    [lang, format],
  )
  const selectedTask = useMemo(
    () => (selectedTaskId ? getTask(selectedTaskId) || undefined : undefined),
    [selectedTaskId],
  )

  const {
    text, setText,
    results,
    aiFeedback,
    aiFeedbackV2,
    v2ParseRejected,
    isAIGrading,
    analyzeError,
    aiGradeUnavailable,
    analyze,
    getAIFeedback,
    ai,
    reset,
  } = useWritingEvaluator({ lang, format, mlPaper, task: selectedTask })

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
    setSelectedTaskId('') // don't carry a task across languages
    reset()
  }

  // Changing format invalidates the picked task (tasks are format-scoped).
  const onFormatChange = (id) => {
    setFormat(id)
    setSelectedTaskId('')
  }

  // First-visit "Try a sample" — drop a realistic mid-band draft into the
  // composer so a blank-page student can tap Analyze and watch the tool work.
  const loadSample = () => setText(getWritingSample(lang))
  const showSampleCta = lang !== 'templates' && !text && !results

  return (
    <div className="space-y-3 animate-fadeUp">
      <h2 className="text-lg font-bold">Writing Analyzer</h2>
      {/* Friction #5: "what this does" framing so the composer never feels blank.
          Bilingual — follows the language toggle so MS students read Malay. */}
      {lang !== 'templates' && (
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          {lang === 'malay'
            ? 'Tampal karangan dan dapatkan band IGCSE serta pembetulan khusus dengan serta-merta.'
            : 'Paste an essay and get an instant IGCSE band plus specific fixes.'}
          {showSampleCta && (
            <>
              {' '}
              <button data-guide="writing-sample" onClick={loadSample} className="font-semibold underline underline-offset-2"
                style={{ color: 'var(--color-accent)' }}>
                {lang === 'malay' ? 'Baru di sini? Cuba contoh.' : 'New here? Try a sample.'}
              </button>
            </>
          )}
        </p>
      )}

      {/* Language toggle */}
      <div data-guide="writing-lang" className="flex gap-2">
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
        <div data-guide="writing-format" className="rounded-2xl p-3 space-y-2"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>Format</label>
          <select value={format} onChange={(e) => onFormatChange(e.target.value)}
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

      {/* Task picker (English only): pick a real IGCSE-style task to be graded on
          Content / task-fulfilment, or Free write (no task = today's behaviour).
          Only shown when the chosen format has tasks. */}
      {lang === 'eng' && availableTasks.length > 0 && (
        <div data-guide="writing-task" className="rounded-2xl p-3 space-y-2"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>Task (optional)</label>
          <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-sm outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <option value="">Free write (no task)</option>
            {availableTasks.map((t, i) => (
              <option key={t.id} value={t.id}>Task {i + 1}</option>
            ))}
          </select>
          {selectedTask ? (
            <div className="space-y-2 pt-1">
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{selectedTask.prompt}</p>
              <div>
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>You must</span>
                <ul className="mt-1 space-y-1">
                  {selectedTask.requirements.map((req, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--color-dim)' }}>
                      <span style={{ color: 'var(--color-accent)' }}>•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
              Pick a task to be graded on whether you answered it. Free write just checks your English.
            </p>
          )}
        </div>
      )}

      {lang !== 'templates' && resolvedFormatId && !isDrafting && (
        <Suspense fallback={null}><ExemplarPanel formatId={resolvedFormatId} /></Suspense>
      )}

      {lang === 'malay' && <ConnectorChecklist text={text} />}

      {lang !== 'templates' && (
        <textarea data-guide="writing-compose" value={text} onChange={e => setText(e.target.value)}
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
        <button data-guide="writing-analyze" onClick={analyze} disabled={isAIGrading}
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent)', opacity: isAIGrading ? 0.7 : 1 }}>
          {isAIGrading
            ? <><Loader2 size={16} className="animate-spin" /> Analyzing with AI...</>
            : `Analyze ${lang === 'eng' ? 'Essay' : 'Karangan'}`}
        </button>
      )}

      {analyzeError && (
        <div
          role="status"
          className="rounded-xl p-3 text-sm flex items-start gap-2"
          style={{ background: 'rgba(255,145,0,0.08)', border: '1px solid rgba(255,145,0,0.25)', color: 'var(--color-orange)' }}
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{analyzeError}</span>
        </div>
      )}

      {aiGradeUnavailable && <AddKeyNudge surface="writing" />}

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
                Writing quality · {results.words} words{results.isMalay ? ` · Paper ${results.paper}` : ''}
              </p>
            </div>
          </div>

          {/* Content / task-fulfilment — a SEPARATE axis from the Writing-quality
              band above. Renders null when no task was picked / AI is unavailable,
              so no Content number is ever fabricated (the AddKeyNudge covers AI-down). */}
          <ContentTraitPanel aiGrade={results.aiGrade} requirements={selectedTask?.requirements} />

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

          {/* Honest scope note: the automatic check is a spelling/word-choice +
              common-grammar checker, not a full grammar tutor — say so, so a clean
              pass is not read as "your grammar is fine" (metacognitive calibration). */}
          {!results.aiGrade && !isAIGrading && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--color-card2)', color: 'var(--color-dim)', border: '1px solid var(--color-border)' }}>
              {results.isMalay
                ? <>Semakan automatik ini mengesan ejaan, pilihan kata dan kesilapan tatabahasa biasa — tetapi ia mungkin terlepas kesalahan tatabahasa/imbuhan yang lebih mendalam. {(isGeminiAvailable() || isOpenRouterAvailable()) ? 'Tekan “Get AI Feedback” untuk semakan yang lebih mendalam.' : 'Tambah kunci AI dalam Tetapan untuk maklum balas tatabahasa yang mendalam.'}</>
                : <>This automatic check catches spelling, word choice and common grammar slips — but it can miss deeper grammar errors. {(isGeminiAvailable() || isOpenRouterAvailable()) ? 'Tap “Get AI Feedback” for an in-depth review.' : 'Add an AI key in Settings for in-depth grammar feedback.'}</>}
            </div>
          )}

          {(isGeminiAvailable() || isOpenRouterAvailable()) && (
            <Suspense fallback={null}><WritingTutor text={text} results={results} /></Suspense>
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

          {v2ParseRejected && !aiFeedbackV2 && (
            <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
              style={{ background: 'var(--color-card2)', color: 'var(--color-dim)', border: '1px solid var(--color-border)' }}
              title={typeof v2ParseRejected === 'string' ? `Reason: ${v2ParseRejected}` : undefined}>
              <AlertCircle size={12} /> Annotated feedback unavailable for this essay — showing the standard view below.
            </div>
          )}

          {aiFeedbackV2 && (
            <Suspense fallback={
              <div className="rounded-2xl p-4 text-xs flex items-center gap-2"
                style={{ background: 'var(--color-card)', color: 'var(--color-dim)', border: '1px solid var(--color-border)' }}>
                <Loader2 size={12} className="animate-spin" /> Loading annotated feedback...
              </div>
            }>
              <AnnotatedWritingFeedback
                data={aiFeedbackV2}
                lang={lang === 'eng' ? 'en' : 'ms'}
                onRetry={getAIFeedback}
              />
            </Suspense>
          )}

          {aiFeedback && !aiFeedbackV2 && <AIFeedbackPanel feedback={aiFeedback} addCard={addCard} />}
        </div>
      )}
    </div>
  )
}
