import { useState, useRef, useMemo } from 'react'
import { Plus, Search, Volume2, FileText, Languages, Undo2, Upload, Loader2 } from 'lucide-react'
import useStore from '../store/useStore'
import DICTIONARY from '../data/dictionary'
import { getExample } from '../data/dictionaryExamples'
import { translateWord } from '../lib/translate'
import { extractPdfText } from '../lib/pdf'
import { pdfOpenErrorMessage } from '../lib/pdfOpenError'
import { speak } from '../lib/speech'
import { buildWbwChips } from '../lib/wbwChips'
import { glossPlanFor } from '../lib/glossPlan'
import { loadEnDictionary } from '../lib/enDictionary'
import Meta from '../components/Meta'

// Word-by-word source → dot colour + legend label (Issue 1 chip grid).
const WBW_SOURCE_META = {
  dict: { color: 'var(--color-green)', label: 'Dictionary' },
  stem: { color: 'var(--color-cyan)', label: 'Stemmed' },
  google: { color: 'var(--color-orange)', label: 'Google Translate' },
  unknown: { color: 'var(--color-dim)', label: 'Not found' },
}

// Phrases (multi-word / hyphenated dictionary keys) sorted longest-first for detection.
const phrasesFrom = (dict) => Object.keys(dict).filter(k => k.includes(' ') || k.includes('-')).sort((a, b) => b.length - a.length)
const PHRASES = phrasesFrom(DICTIONARY)

// Simple stemming for Malay — strip common prefixes/suffixes to find root
function stem(word) {
  let w = word.toLowerCase()
  // Strip prefixes
  for (const p of ['memper','menge','meny','meng','mem','men','me','ber','di','ter','pe','se','ke']) {
    if (w.startsWith(p) && w.length > p.length + 2) {
      const root = w.slice(p.length)
      if (DICTIONARY[root]) return root
      // Try restoring dropped consonants (meN- rules)
      if (p === 'men' && DICTIONARY['t' + root]) return 't' + root
      if (p === 'meny' && DICTIONARY['s' + root]) return 's' + root
      if (p === 'mem' && DICTIONARY['p' + root]) return 'p' + root
      if (p === 'meng' && DICTIONARY['k' + root]) return 'k' + root
    }
  }
  // Strip suffixes
  for (const s of ['kan','an','i']) {
    if (w.endsWith(s) && w.length > s.length + 2) {
      const root = w.slice(0, -s.length)
      if (DICTIONARY[root]) return root
    }
  }
  return null
}

const LOOKUP_PENDING = 'loading...'

export default function Import() {
  const [text, setText] = useState('')
  const [words, setWords] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [translations, setTranslations] = useState({})
  const [deck, setDeck] = useState('Imported')
  const [wordByWord, setWordByWord] = useState(null)
  const wbw = useMemo(() => buildWbwChips(wordByWord), [wordByWord])
  const [wbwLoading, setWbwLoading] = useState(false)
  const [lastAdded, setLastAdded] = useState(null)
  const [inputTab, setInputTab] = useState('paste') // 'paste' | 'pdf'
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)
  const [pdfMeta, setPdfMeta] = useState(null) // { name, pages }
  const fileRef = useRef(null)
  const pickSeqRef = useRef(0) // only the latest PDF pick may write its result
  const addCards = useStore(s => s.addCards)
  const addPdfRecent = useStore(s => s.addPdfRecent)
  // The active study language signals the SOURCE language of the pasted text,
  // which fixes the gloss direction + which deck the new cards join (F5).
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const plan = glossPlanFor(studyLang)
  const isEn = plan.lang === 'en'
  const srcLabel = isEn ? 'English' : 'Malay'

  const handlePdfFile = async (file) => {
    if (!file) return
    const seq = ++pickSeqRef.current
    setPdfError(null)
    setPdfLoading(true)
    try {
      const data = await extractPdfText(file)
      if (seq !== pickSeqRef.current) return
      const joined = data.pages.map(p => p.text).join('\n\n')
      setText(joined)
      setPdfMeta({ name: file.name, pages: data.pages.length })
      addPdfRecent({ name: file.name, sizeKB: Math.round(file.size / 1024), pages: data.pages.length })
    } catch (e) {
      if (seq === pickSeqRef.current) setPdfError(pdfOpenErrorMessage(e))
    } finally {
      if (seq === pickSeqRef.current) setPdfLoading(false)
    }
  }

  // The dictionary for the active source language. Malay is the eager built-in;
  // the English seed is lazy-loaded (N4). Memoised in loadEnDict.
  const activeDict = async () => (isEn ? await loadEnDictionary() : DICTIONARY)

  const processWordByWord = async () => {
    if (!text.trim()) return
    setWbwLoading(true)
    const dict = await activeDict()
    const rawWords = text.split(/\s+/).filter(w => w.length > 0)
    const result = []
    for (const raw of rawWords) {
      const clean = raw.replace(/[^a-zA-Z-]/g, '').toLowerCase()
      if (!clean) { result.push({ word: raw, meaning: null, source: 'skip' }); continue }
      // 1. Direct dictionary lookup (source-language headword → gloss)
      if (dict[clean]) {
        result.push({ word: raw, meaning: dict[clean], source: 'dict' })
        continue
      }
      // 2. Stemming — Malay-only (imbuhan); English has no Malay affixes
      if (plan.useStemmer) {
        const stemmed = stem(clean)
        if (stemmed) {
          // Name the ROOT in the gloss itself, not just via the cyan dot. The
          // chip only renders {word, meaning} (lib/wbwChips.js), so a bare
          // `DICTIONARY[stemmed]` read exactly like a real dictionary hit and
          // taught the ROOT's meaning as the WORD's: sebuah→"fruit",
          // pesakit→"sick", menarik→"pull", seorang→"person", ketua→"old (age)".
          result.push({ word: raw, meaning: `${stemmed}: ${DICTIONARY[stemmed]} (root)`, source: 'stem' })
          continue
        }
      }
      // 3. Machine-translation fallback in the source→gloss direction
      try {
        const t = await translateWord(clean, plan.from, plan.to)
        result.push({ word: raw, meaning: t.text, source: 'google' })
      } catch {
        result.push({ word: raw, meaning: '?', source: 'unknown' })
      }
    }
    setWordByWord(result)
    setWbwLoading(false)
  }

  const processText = async () => {
    if (!text.trim()) return
    const dict = await activeDict()
    const phrases = isEn ? phrasesFrom(dict) : PHRASES
    const lower = text.toLowerCase()
    const found = []
    let processed = lower

    // Find phrases first
    for (const phrase of phrases) {
      if (processed.includes(phrase)) {
        found.push({ word: phrase, type: 'phrase', meaning: dict[phrase] })
        processed = processed.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '___')
      }
    }

    // Then individual words
    const remaining = processed.split(/\s+/).filter(w => w !== '___' && w.length > 1)
    const seen = new Set(found.map(f => f.word))
    for (const raw of remaining) {
      const clean = raw.replace(/[^a-zA-Z-]/g, '').toLowerCase()
      if (!clean || clean.length < 2 || seen.has(clean)) continue
      seen.add(clean)
      if (dict[clean]) {
        found.push({ word: clean, type: 'dict', meaning: dict[clean] })
      } else {
        found.push({ word: clean, type: 'unknown', meaning: null })
      }
    }

    setWords(found)
    setSelected(new Set())
    setTranslations({})
  }

  // `translations` holds only REAL glosses (+ the in-flight marker). A failed
  // lookup echoes the word back ({source:'error'}) — never keep that as a
  // meaning; drop it so re-selecting the word retries.
  const translateUnknown = async (word) => {
    if (translations[word]) return
    setTranslations(t => ({ ...t, [word]: LOOKUP_PENDING }))
    const result = await translateWord(word, plan.from, plan.to)
    setTranslations(t => {
      const next = { ...t }
      if (result.source === 'error') delete next[word]
      else next[word] = result.text
      return next
    })
  }

  // A word may join the deck only with a real meaning (2026-09-28 bug hunt R4
  // #3 — the PDF reader's B4 fix, never swept here): "Add" used to mint
  // "belajar = loading..." on slow data and "belajar = belajar" offline.
  const glossFor = (w) => {
    const t = translations[w.word]
    return w.meaning || (t && t !== LOOKUP_PENDING ? t : null)
  }
  const readyCount = words.filter(w => selected.has(w.word) && glossFor(w)).length

  const toggleWord = (word) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  const addSelected = () => {
    const chosen = words.filter(w => selected.has(w.word))
    const ready = chosen.filter(glossFor)
    if (!ready.length) return
    const newCards = ready
      .map(w => ({
        m: w.word,
        e: glossFor(w),
        lang: plan.lang, // source language = active studyLang: 'ms' (Malay→English) or 'en' (English→Malay) (F5)
        t: deck,
        p: 'n',
        ex: getExample(w.word) || `${w.word} (${glossFor(w)}).`,
        mn: '',
      }))
    addCards(newCards)
    setLastAdded({ cards: newCards, time: Date.now() })
    // Words still without a meaning stay selected; retry any lookup that failed.
    const waiting = chosen.filter(w => !glossFor(w))
    waiting.filter(w => !translations[w.word]).forEach(w => translateUnknown(w.word))
    setSelected(new Set(waiting.map(w => w.word)))
    // Auto-clear undo after 10 seconds
    setTimeout(() => setLastAdded(prev => prev && Date.now() - prev.time >= 9500 ? null : prev), 10000)
  }

  const undoLastAdd = () => {
    if (!lastAdded) return
    const store = useStore.getState()
    const keysToRemove = new Set(lastAdded.cards.map(c => `${c.m}::${c.t}`))
    const filtered = store.cards.filter(c => !keysToRemove.has(`${c.m}::${c.t}`))
    useStore.setState({ cards: filtered })
    setLastAdded(null)
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      <Meta title="Import Words | IGCSE Malay Master" description="Paste text or upload a PDF and turn unknown words into spaced-repetition flashcards for IGCSE Malay or English." />
      <h2 className="text-lg font-bold">Import Text</h2>
      <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
        Paste any {srcLabel} text. Known words are highlighted — click to add to your deck.
      </p>

      {/* Input source tabs */}
      <div data-guide="import-tabs" className="flex rounded-lg overflow-hidden w-fit" style={{ border: '1px solid var(--color-border)' }}>
        <button onClick={() => setInputTab('paste')}
          className="px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          style={{ background: inputTab === 'paste' ? 'var(--color-accent)' : 'transparent', color: inputTab === 'paste' ? 'var(--color-on-bright)' : 'var(--color-text)' }}>
          <FileText size={12} /> Paste text
        </button>
        <button onClick={() => setInputTab('pdf')}
          className="px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          style={{ background: inputTab === 'pdf' ? 'var(--color-accent)' : 'transparent', color: inputTab === 'pdf' ? 'var(--color-on-bright)' : 'var(--color-text)' }}>
          <Upload size={12} /> Upload PDF
        </button>
      </div>

      {inputTab === 'paste' ? (
        <textarea data-guide="import-text" value={text} onChange={e => setText(e.target.value)}
          className="w-full p-4 rounded-2xl text-sm outline-none resize-y"
          style={{
            background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
            color: 'var(--color-text)', minHeight: 140,
          }}
          placeholder={`Paste ${srcLabel} text here...`} />
      ) : (
        <div>
          <div onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handlePdfFile(e.dataTransfer.files?.[0]) }}>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl p-6 text-center cursor-pointer"
              style={{ background: 'var(--color-card)', border: '2px dashed var(--color-border)' }}>
              {pdfLoading ? (
                <>
                  <Loader2 size={24} className="mx-auto mb-2 animate-spin" style={{ color: 'var(--color-accent)' }} />
                  <span className="block text-sm font-bold">Reading PDF…</span>
                </>
              ) : pdfMeta ? (
                <>
                  <FileText size={24} className="mx-auto mb-2" style={{ color: 'var(--color-green)' }} />
                  <span className="block text-sm font-bold">{pdfMeta.name}</span>
                  <span className="block text-[11px]" style={{ color: 'var(--color-dim)' }}>{pdfMeta.pages} page{pdfMeta.pages === 1 ? '' : 's'} extracted — click below to process</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--color-accent)' }} />
                  <span className="block text-sm font-bold">Drop a PDF or click to choose</span>
                  <span className="block text-[11px]" style={{ color: 'var(--color-dim)' }}>For richer interaction, try the PDF Reader.</span>
                </>
              )}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
            onChange={(e) => handlePdfFile(e.target.files?.[0])} />
          {pdfError && (
            <div role="alert" className="mt-2 rounded-xl p-3 text-sm" style={{ background: 'color-mix(in srgb, var(--color-red) 10%, transparent)', color: 'var(--color-red)' }}>
              {pdfError}{text && ' Your text below is unchanged.'}
            </div>
          )}
          {text && (
            <textarea value={text} onChange={e => setText(e.target.value)}
              className="w-full mt-3 p-4 rounded-2xl text-sm outline-none resize-y"
              style={{
                background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)', minHeight: 140,
              }} />
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input data-guide="import-deck" type="text" value={deck} onChange={e => setDeck(e.target.value)}
          className="flex-1 p-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
          placeholder="Deck name..." />
        <button data-guide="import-process" onClick={processText} className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
          style={{ color: 'var(--color-on-bright)', background: 'var(--color-accent)' }}>
          <Search size={14} /> Process
        </button>
      </div>

      {/* Word-by-word button */}
      <button data-guide="import-wordbyword" onClick={processWordByWord} disabled={!text.trim() || wbwLoading}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-cyan)',
          opacity: !text.trim() || wbwLoading ? 0.5 : 1,
        }}>
        <Languages size={14} /> {wbwLoading ? 'Translating...' : 'Word-by-Word Translation'}
      </button>

      {/* Word-by-word display — a scannable vocab chip grid (Issue 1). Each
          chip: Malay word on top, gloss beneath, a source dot. Sticky so long
          pastes don't bury results. */}
      {wordByWord && (
        <div className="sticky top-2 z-10 rounded-2xl p-4 max-h-[55vh] overflow-y-auto" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Languages size={14} style={{ color: 'var(--color-cyan)' }} /> Word-by-Word
            </h3>
            <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
              {wbw.chips.length} {wbw.chips.length === 1 ? 'word' : 'words'}
            </span>
          </div>
          {wbw.chips.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>No translatable words found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {wbw.chips.map((c, i) => {
                const meta = WBW_SOURCE_META[c.source] || WBW_SOURCE_META.unknown
                return (
                  <div key={i} data-testid="wbw-chip" className="rounded-xl p-2.5 flex items-start gap-1.5"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: meta.color }} title={meta.label} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold break-words" style={{ color: 'var(--color-text)' }}>{c.word}</p>
                      <p className="text-[11px] leading-snug break-words" style={{ color: 'var(--color-dim)' }}>{c.meaning}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
            <span style={{ color: 'var(--color-green)' }}>● Dictionary</span>
            <span style={{ color: 'var(--color-cyan)' }}>● Stemmed</span>
            <span style={{ color: 'var(--color-orange)' }}>● Google Translate</span>
            {wbw.counts.unknown > 0 && (
              <span style={{ color: 'var(--color-dim)' }}>● Not found</span>
            )}
          </div>
        </div>
      )}

      {/* Undo toast */}
      {lastAdded && (
        <button onClick={undoLastAdd}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ background: 'color-mix(in srgb, var(--color-orange) 12%, transparent)', border: '1px solid var(--color-orange)', color: 'var(--color-orange)' }}>
          <Undo2 size={14} /> Undo — remove {lastAdded.cards.length} {lastAdded.cards.length === 1 ? 'card' : 'cards'}
        </button>
      )}

      {/* Processed words — sticky so long pastes don't bury results */}
      {words.length > 0 && (
        <div className="sticky top-2 z-10 rounded-2xl p-4 max-h-[60vh] overflow-y-auto" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">{words.length} {words.length === 1 ? 'word' : 'words'} found</h3>
            <div className="flex gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-green) 12%, transparent)', color: 'var(--color-green)' }}>
                Dict: {words.filter(w => w.type === 'dict').length}
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-gold) 12%, transparent)', color: 'var(--color-gold)' }}>
                Phrase: {words.filter(w => w.type === 'phrase').length}
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--color-dim) 12%, transparent)', color: 'var(--color-dim)' }}>
                Unknown: {words.filter(w => w.type === 'unknown').length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {words.map((w, i) => {
              const isSelected = selected.has(w.word)
              const colors = {
                dict: 'var(--color-green)',
                phrase: 'var(--color-gold)',
                unknown: 'var(--color-dim)',
              }
              return (
                <button key={i} onClick={() => {
                  toggleWord(w.word)
                  if (w.type === 'unknown') translateUnknown(w.word)
                }}
                  className="px-2 py-1 rounded-lg text-sm transition-all max-w-full break-words"
                  style={{
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                    color: isSelected ? 'var(--color-on-bright)' : colors[w.type],
                    border: '1px solid ' + (isSelected ? 'var(--color-accent)' : 'var(--color-border)'),
                    cursor: 'pointer',
                  }}>
                  {w.word}
                </button>
              )
            })}
          </div>

          {/* Selected word details */}
          {Array.from(selected).map(word => {
            const w = words.find(x => x.word === word)
            if (!w) return null
            const meaning = glossFor(w) || '...'
            return (
              <div key={word} className="flex items-center gap-3 py-2 border-b last:border-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="font-bold text-sm min-w-0 break-words" style={{ color: 'var(--color-cyan)' }}>{w.word}</span>
                <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{meaning}</span>
                <button onClick={() => speak(w.word)} className="ml-auto" style={{ color: 'var(--color-cyan)' }}>
                  <Volume2 size={14} />
                </button>
              </div>
            )
          })}

          {selected.size > 0 && (
            <>
              <button onClick={addSelected} disabled={readyCount === 0}
                className="w-full mt-3 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--color-green)', color: 'var(--color-on-bright)' }}>
                <Plus size={14} /> Add {readyCount} {readyCount === 1 ? 'card' : 'cards'} to &quot;{deck}&quot;
              </button>
              {selected.size > readyCount && (
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-dim)' }}>
                  {selected.size - readyCount} still translating — they stay selected until their meaning arrives.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
