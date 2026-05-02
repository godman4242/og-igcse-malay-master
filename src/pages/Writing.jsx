import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, Sparkles, Loader2, AlertCircle, Plus, Volume2 } from 'lucide-react'
import { DISC_EN, FORM_EN, SIM_RE, MET_RE, PW_ML, FORM_ML, KARANGAN_TEMPLATES } from '../data/writing'
import { useAI, getRemainingCalls } from '../lib/ai'
import { speak } from '../lib/speech'
import useStore from '../store/useStore'
import ThreeLineFeedback from '../components/ThreeLineFeedback'
import { buildSessionFeedback } from '../lib/feedback'
import { useNavigate } from 'react-router-dom'

export default function Writing() {
  const [lang, setLang] = useState('eng')
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [mlPaper, setMlPaper] = useState(2)
  const [aiFeedback, setAiFeedback] = useState(null)
  const ai = useAI()
  const addCard = useStore(s => s.addCard)
  const navigate = useNavigate()

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

  const analyzeEnglish = () => {
    if (!text || text.length < 30) return alert('Write more text (at least 30 characters)!')
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const paras = text.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
    const sims = (text.match(SIM_RE) || []).length
    const mets = (text.match(MET_RE) || []).length
    const disc = DISC_EN.filter(w => new RegExp('\\b' + w.replace(/ /g, '\\s+') + '\\b', 'i').test(text))
    const vocab = FORM_EN.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(text))
    const complex = sents.filter(s => /(,.*,|although|despite|whereas|whilst|which\s|who\s|;)/i.test(s)).length
    const avgLen = sents.length > 0 ? Math.round(words.length / sents.length) : 0

    let band = 3
    if (words.length >= 250 && disc.length >= 3 && vocab.length >= 3 && complex >= sents.length * 0.3 && (sims + mets) > 0 && avgLen > 15) band = 6
    else if (words.length >= 200 && disc.length >= 2 && vocab.length >= 2) band = 5
    else if (words.length >= 200 && disc.length >= 1) band = 4

    const tips = []
    if (disc.length < 3) tips.push('Add more discourse markers (furthermore, however, etc.)')
    if (vocab.length < 3) tips.push('Use more formal vocabulary')
    if (sims + mets === 0) tips.push('Add figurative language (similes, metaphors)')
    if (words.length < 250) tips.push('Expand to 250+ words')
    if (tips.length === 0) tips.push('Excellent writing! Proofread for final polish.')

    setResults({
      band, words: words.length, sents: sents.length, paras: paras.length,
      sims, mets, disc, vocab, complex, avgLen, tips,
    })
  }

  const analyzeMalay = () => {
    if (!text || text.length < 30) return alert('Tulis lebih (sekurang-kurangnya 30 aksara)!')
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const paras = text.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
    const pw = PW_ML.filter(w => new RegExp(w.replace(/ /g, '\\s+'), 'i').test(text))
    const formal = FORM_ML.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(text))
    const avgLen = sents.length > 0 ? Math.round(words.length / sents.length) : 0
    const minW = mlPaper === 2 ? 200 : 300

    let band = 3
    if (words.length >= minW && pw.length >= 4 && formal.length >= 3) band = 6
    else if (words.length >= minW * 0.8 && pw.length >= 3) band = 5
    else if (words.length >= minW * 0.7 && pw.length >= 2) band = 4

    const tips = []
    if (pw.length < 4) tips.push('Tambah penanda wacana (selain itu, walau bagaimanapun, dll.)')
    if (formal.length < 3) tips.push('Guna kosa kata formal')
    if (words.length < minW) tips.push(`Kembangkan ${minW}+ perkataan`)
    if (tips.length === 0) tips.push('Bagus! Semak ejaan.')

    setResults({
      band, words: words.length, sents: sents.length, paras: paras.length,
      pw, formal, avgLen, tips, isMalay: true, paper: mlPaper,
    })
  }

  const bandColors = { 3: 'var(--color-orange)', 4: 'var(--color-orange)', 5: '#69f0ae', 6: 'var(--color-green)' }

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

      {/* Text area — hidden when templates tab active */}
      {lang !== 'templates' && <textarea value={text} onChange={e => setText(e.target.value)}
        className="w-full p-4 rounded-2xl text-sm outline-none resize-y"
        style={{
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          color: 'var(--color-text)', minHeight: 200,
        }}
        placeholder={lang === 'eng' ? 'Paste or write your English essay here...' : 'Tulis karangan Bahasa Melayu anda di sini...'} />}

      {lang !== 'templates' && <button onClick={lang === 'eng' ? analyzeEnglish : analyzeMalay}
        className="w-full py-3 rounded-xl font-bold text-sm text-white"
        style={{ background: 'var(--color-accent)' }}>
        Analyze {lang === 'eng' ? 'Essay' : 'Karangan'}
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

          {/* Techniques */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-3">
              {results.isMalay ? 'Penanda Wacana' : 'Techniques'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {results.isMalay ? (
                results.pw.length > 0
                  ? results.pw.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--color-green)' }}>{p}</span>
                  ))
                  : <span className="text-xs" style={{ color: 'var(--color-dim)' }}>No discourse markers found</span>
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

          {/* Tips */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-2">{results.isMalay ? 'Penambahbaikan' : 'Improve'}</h3>
            {results.tips.map((t, i) => (
              <p key={i} className="text-sm py-1" style={{ color: 'var(--color-dim)' }}>• {t}</p>
            ))}
          </div>

          {/* AI Feedback Button */}
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
          {aiFeedback && <AIFeedbackPanel feedback={aiFeedback} addCard={addCard} scenario={results.isMalay ? 'malay' : 'english'} />}
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

function AIFeedbackPanel({ feedback, addCard, scenario }) {
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
