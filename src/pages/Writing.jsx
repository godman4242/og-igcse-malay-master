import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { DISC_EN, FORM_EN, SIM_RE, MET_RE, PW_ML, FORM_ML, KARANGAN_TEMPLATES } from '../data/writing'

export default function Writing() {
  const [lang, setLang] = useState('eng')
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [mlPaper, setMlPaper] = useState(2)

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
