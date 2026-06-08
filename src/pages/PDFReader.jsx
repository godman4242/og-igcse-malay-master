import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  FileSearch, Upload, Languages, MousePointerClick, Plus, X, Volume2,
  Loader2, ExternalLink, Trash2, Link, Unlink, FileText, LayoutTemplate,
  Eye, EyeOff,
} from 'lucide-react'
import useStore from '../store/useStore'
import { loadPdf, extractTextFromDoc } from '../lib/pdf'
import LayoutView from './pdfreader/LayoutView'
import {
  translateWord, translateBatch, getFromCache,
  getDeepLCompareUrl, getGoogleCompareUrl, getProviderHealth,
} from '../lib/translate'
import { speak } from '../lib/speech'
import DICTIONARY from '../data/dictionary'
import useSelectionMode from '../lib/useSelectionMode'
import usePinchZoom from '../lib/usePinchZoom'
import { groupSelection, ungroupSelection, explainCompound } from '../lib/selectionGroup'
import DictionaryIcon from '../components/DictionaryIcon'
import DocGloss from '../components/DocGloss'
import {
  buildGlossIndex, collectDocTokens, normalizeWord, translateDocument,
} from '../lib/translateDocument'
import { createGlossState, isRevealed, revealToken, setShowAll } from '../lib/docGlossState'
import { buildGroundingIndex } from '../lib/dictionaryGrounding'

// DICTIONARY is static { malayWord: englishString }; build the grounding pairs once.
const DICT_PAIRS = Object.entries(DICTIONARY).map(([m, e]) => ({ m, e }))

// Split a paragraph into clickable token + non-token parts.
function splitParagraph(text, startIndex) {
  const out = []
  const re = /([\p{L}\p{M}'-]+)|(\s+)|([^\s\p{L}\p{M}]+)/gu
  let m
  let i = startIndex
  while ((m = re.exec(text)) !== null) {
    if (m[1]) {
      out.push({ kind: 'token', text: m[1], i })
      i++
    } else if (m[2]) {
      out.push({ kind: 'space', text: m[2] })
    } else {
      out.push({ kind: 'punct', text: m[3] })
    }
  }
  return { parts: out, nextIndex: i }
}

function tokenColor(word) {
  const w = word.toLowerCase()
  if (DICTIONARY[w]) return 'var(--color-green)'
  // hyphenated reduplications like anak-anak
  if (w.includes('-') && DICTIONARY[w.split('-')[0]]) return 'var(--color-cyan)'
  return null // unknown — default text color
}

export default function PDFReader() {
  const [pdfData, setPdfData] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null) // live PDFDocumentProxy (shared by both views)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('translate') // 'translate' | 'select'
  const [groupMode, setGroupMode] = useState(false) // touch group toggle: false=individual words, true=phrase
  const [translation, setTranslation] = useState(null) // { items: [{src, text, source}], heading }
  const [compound, setCompound] = useState(null) // { parts:[{w,gloss}], phrase:{w,gloss} } — teaching moment
  const [selection, setSelection] = useState([]) // [{ word, en?, type, index | startIndex/endIndex }]
  const [layoutTokens, setLayoutTokens] = useState([]) // flat {word,i} from LayoutView's overlay (global index)
  const [deckName, setDeckName] = useState('PDF Import')
  const [batchProgress, setBatchProgress] = useState(null) // { current, total }
  // In-place document gloss layer (reveal-gated; spec D1). docGloss accumulates
  // normalizedWord → {text, source} across "Translate page" passes and survives
  // view switches; glossState is the reveal state; translating drives the bar.
  const [docGloss, setDocGloss] = useState({})
  const [glossState, setGlossState] = useState(createGlossState)
  const [translating, setTranslating] = useState(null) // { done, total } | null
  const [addedGloss, setAddedGloss] = useState(() => new Set()) // malay words already added to a deck
  const translateAbortRef = useRef(null)
  const fileInputRef = useRef(null)
  const docRef = useRef(null) // lifecycle source of truth for the live doc (destroy on replace/clear)

  const addCards = useStore(s => s.addCards)
  const cards = useStore(s => s.cards)
  const addPdfRecent = useStore(s => s.addPdfRecent)
  const showCompare = useStore(s => s.translation?.showComparisonLink ?? true)
  const preferredProvider = useStore(s => s.translation?.preferredProvider ?? 'auto')
  const layoutPref = useStore(s => s.pdfReader?.layoutView ?? false)
  const setPdfLayoutView = useStore(s => s.setPdfLayoutView)
  const health = getProviderHealth()

  // 'reflow' | 'layout' — faithful page render. Remember-last: init from the
  // persisted pref (first-ever open = Reflow), and write it back on switch.
  const [view, setView] = useState(() => (layoutPref ? 'layout' : 'reflow'))
  const switchView = useCallback((v) => {
    setView(v)
    setPdfLayoutView(v === 'layout')
  }, [setPdfLayoutView])

  // Free the live worker doc (more than page.cleanup()) before replacing/clearing.
  const destroyDoc = useCallback(() => {
    if (docRef.current) {
      try { docRef.current.destroy() } catch { /* already gone */ }
      docRef.current = null
    }
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    setLoading(true)
    resetGloss() // a new document starts with a clean gloss layer
    destroyDoc() // release any previously loaded PDF first
    try {
      // Load the PDF ONCE; feed BOTH the reflow text and the layout render from it.
      const { doc } = await loadPdf(file)
      docRef.current = doc
      setPdfDoc(doc)
      const { pages } = await extractTextFromDoc(doc)
      setPdfData({ pages })
      addPdfRecent({
        name: file.name,
        sizeKB: Math.round(file.size / 1024),
        pages: pages.length,
      })
    } catch (e) {
      setError(e?.message || 'Failed to read PDF')
    } finally {
      setLoading(false)
    }
  }

  const resetGloss = useCallback(() => {
    setDocGloss({})
    setGlossState(createGlossState())
    setAddedGloss(new Set())
    setTranslating(null)
    translateAbortRef.current?.abort()
    translateAbortRef.current = null
  }, [])

  const clearPdf = useCallback(() => {
    destroyDoc()
    setPdfDoc(null)
    setPdfData(null)
    setLayoutTokens([])
    resetGloss()
  }, [destroyDoc, resetGloss])

  // Release the worker doc + cancel any in-flight translation if the page unmounts.
  useEffect(() => () => {
    destroyDoc()
    translateAbortRef.current?.abort()
  }, [destroyDoc])

  // Flatten the document into per-paragraph token parts plus a token map
  // so the selection hook can range over the whole document by index.
  const tokenized = useMemo(() => {
    if (!pdfData) return { tokens: [], pages: [] }
    const tokens = []
    const pages = []
    let i = 0
    for (const page of pdfData.pages) {
      const paragraphs = []
      for (const para of page.paragraphs) {
        const { parts, nextIndex } = splitParagraph(para, i)
        for (const p of parts) if (p.kind === 'token') tokens.push({ word: p.text, i: p.i })
        i = nextIndex
        paragraphs.push(parts)
      }
      pages.push({ pageNum: page.pageNum, paragraphs })
    }
    return { tokens, pages }
  }, [pdfData])

  // The active token list depends on the view: the Layout overlay has its OWN
  // global index space (from getTextContent), distinct from the reflow tokenizer,
  // so selection/slice/highlight all operate over whichever view is showing.
  const activeTokens = useMemo(
    () => (view === 'layout' ? layoutTokens : tokenized.tokens),
    [view, layoutTokens, tokenized],
  )

  // Grounding index (owned dictionary + the learner's cards) — flags low-confidence
  // machine glosses + supplies the canonical English on a mismatch (spec D9).
  const groundingIndex = useMemo(() => buildGroundingIndex(DICT_PAIRS, cards), [cards])

  // token global-index → gloss decision, for UNKNOWN words that have a translation.
  // Same Map shape as selIdx, so it renders identically in reflow + layout.
  const glossByIndex = useMemo(
    () => buildGlossIndex(activeTokens, DICTIONARY, docGloss, groundingIndex),
    [activeTokens, docGloss, groundingIndex],
  )
  const hasGloss = glossByIndex.size > 0

  const tokensSlice = useCallback((a, b) => {
    return activeTokens.filter(t => t.i >= a && t.i <= b).map(t => t.word)
  }, [activeTokens])

  // Same slice but keeping each token's document index, so selection entries can
  // carry the index range needed to highlight them inline.
  const tokensSliceWithIndex = useCallback((a, b) => {
    return activeTokens.filter(t => t.i >= a && t.i <= b).map(t => ({ word: t.word, i: t.i }))
  }, [activeTokens])

  const showSelection = mode === 'select'

  const translateOne = useCallback(async (word) => {
    setTranslation({ items: [{ src: word, text: '…', source: 'loading' }] })
    const r = await translateWord(word)
    setTranslation({ items: [{ src: word, text: r.text, source: r.source }] })
  }, [])

  const translateMany = useCallback(async (words) => {
    setTranslation({ items: words.map(w => ({ src: w, text: '…', source: 'loading' })) })
    const results = await translateBatch(words)
    setTranslation({
      items: words.map((w, idx) => ({
        src: w,
        text: results[idx]?.text || w,
        source: results[idx]?.source || 'error',
      })),
    })
  }, [])

  // The compositional teaching moment: when words are grouped, show BOTH the
  // word-by-word glosses AND the phrase meaning side by side, so the learner sees
  // how the meaning changes (jam = o'clock · tangan = hand → jam tangan = watch).
  const showCompoundFor = useCallback(async (words) => {
    if (!Array.isArray(words) || words.length < 2) return
    setCompound({ parts: words.map(w => ({ w, gloss: '…' })), phrase: { w: words.join(' '), gloss: '…' } })
    const [partRes, whole] = await Promise.all([
      translateBatch(words),
      translateWord(words.join(' ')),
    ])
    setCompound(explainCompound(words, partRes.map(r => r?.text || ''), whole?.text || ''))
  }, [])

  const addToSelection = useCallback((entries) => {
    setSelection(prev => {
      const existing = new Set(prev.map(p => `${p.type}:${p.word}`))
      const merged = [...prev]
      for (const e of entries) {
        const key = `${e.type}:${e.word}`
        if (!existing.has(key)) {
          existing.add(key)
          merged.push(e)
        }
      }
      return merged
    })
  }, [])

  const handleCommit = useCallback(({ startIndex, endIndex, kind }) => {
    const words = tokensSlice(startIndex, endIndex)
    if (!words.length) return

    // kind (from gestureModel.classifyGesture): Kheshav's mapping —
    //   'words'  = left-drag  → individual words
    //   'phrase' = right-drag → one grouped phrase (compositional meaning)
    //   'word'   = single click → one word
    if (showSelection) {
      // Select mode — push to the selection bucket, carrying token indices so the
      // entry can be highlighted inline (Step 3) and grouped/ungrouped (Step 2).
      if (kind === 'phrase') {
        addToSelection([{ word: words.join(' '), type: 'phrase', startIndex, endIndex }])
        showCompoundFor(words)
      } else if (kind === 'words') {
        addToSelection(tokensSliceWithIndex(startIndex, endIndex).map(t => ({ word: t.word, type: 'word', index: t.i })))
      } else {
        addToSelection([{ word: words[0], type: 'word', index: startIndex }])
      }
      return
    }

    // Translate mode
    if (kind === 'phrase') {
      showCompoundFor(words)
    } else if (kind === 'words') {
      translateMany(words)
    } else {
      translateOne(words[0])
    }
  }, [tokensSlice, tokensSliceWithIndex, showSelection, addToSelection, showCompoundFor, translateMany, translateOne])

  const sel = useSelectionMode(handleCommit, groupMode ? 'phrase' : 'words')
  // Layout view: arbitrate 1-finger select vs 2-finger pinch + double-tap zoom.
  const pinch = usePinchZoom(sel)

  // Map of token-index → selection type ('word' | 'phrase') for inline highlight.
  // Entries without indices (e.g. added from the translate panel) are skipped.
  const selIdx = useMemo(() => {
    const m = new Map()
    for (const e of selection) {
      const a = e.startIndex ?? e.index
      const b = e.endIndex ?? e.index
      if (a == null || b == null) continue
      for (let i = a; i <= b; i++) m.set(i, e.type)
    }
    return m
  }, [selection])

  const removeFromSelection = (idx) => {
    setSelection(prev => prev.filter((_, i) => i !== idx))
  }

  // Glue a word chip with the next adjacent word chip into one phrase (the touch-
  // friendly way to group, since phones have no right-button), then teach it.
  const groupChips = (idx) => {
    const grouped = groupSelection(selection, idx, idx + 1)
    if (grouped === selection) return // non-contiguous / not two words — no-op
    setSelection(grouped)
    const phrase = grouped[idx]
    if (phrase?.type === 'phrase') showCompoundFor(phrase.word.split(/\s+/).filter(Boolean))
  }

  const ungroupChip = (idx) => {
    setSelection(prev => ungroupSelection(prev, idx))
  }

  const addSelectionToDeck = async () => {
    if (!selection.length) return
    // Translate any entries that don't yet have an `en` field
    const pending = selection.filter(s => !s.en).map(s => s.word)
    let translations = []
    if (pending.length) {
      setBatchProgress({ current: 0, total: pending.length })
      translations = await translateBatch(pending)
      setBatchProgress(null)
    }
    let pi = 0
    const enriched = selection.map(s => s.en ? s : ({
      ...s, en: translations[pi++]?.text || s.word,
    }))
    const cards = enriched.map(s => ({
      m: s.word,
      e: s.en,
      t: deckName,
      p: s.type === 'phrase' ? 'phrase' : 'n',
      ex: `${s.word} — ${s.en}`,
      mn: '',
    }))
    addCards(cards)
    setSelection([])
  }

  const translateAllUnknowns = async () => {
    const unknowns = []
    const seen = new Set()
    for (const t of activeTokens) {
      const w = t.word.toLowerCase()
      if (DICTIONARY[w]) continue
      if (seen.has(w)) continue
      seen.add(w)
      unknowns.push(t.word)
    }
    if (!unknowns.length) {
      setTranslation({ items: [{ src: '', text: 'All words already in dictionary.', source: 'info' }] })
      return
    }
    setBatchProgress({ current: 0, total: unknowns.length })
    const results = await translateBatch(unknowns)
    setBatchProgress(null)
    setTranslation({
      heading: `Translated ${unknowns.length} unknown words`,
      items: unknowns.map((w, i) => ({
        src: w, text: results[i]?.text || w, source: results[i]?.source || 'error',
      })),
    })
  }

  // --- In-place gloss layer handlers (Step 4) ---
  const revealGloss = useCallback((i) => {
    setGlossState(s => revealToken(s, i))
  }, [])

  // One-tap add a revealed gloss into the deck (routes into FSRS — spec D10). Uses
  // the grounded `display` (canonical English on a mismatch), so the card is correct.
  const addGloss = useCallback((g) => {
    if (!g || addedGloss.has(g.malay)) return
    addCards([{ m: g.malay, e: g.display, t: deckName, p: 'n', ex: `${g.malay} — ${g.display}`, mn: '' }])
    setAddedGloss(prev => new Set(prev).add(g.malay))
  }, [addCards, deckName, addedGloss])

  const toggleShowAll = useCallback(() => {
    setGlossState(s => setShowAll(s, !s.showAll))
  }, [])

  // Step 5 — translate every still-unknown, uncached word on the document with the
  // volume-safe pipeline (dedupe + chunk + throttle + backoff + cache + abort).
  const translatePage = useCallback(async () => {
    const { toTranslate } = collectDocTokens(activeTokens, DICTIONARY, {
      cacheLookup: w => !!getFromCache(w),
    })
    if (!toTranslate.length) {
      // Everything is either known, cached, or already glossed — surface what we have.
      const cachedGloss = {}
      for (const t of activeTokens) {
        const norm = normalizeWord(t.word)
        if (!norm || DICTIONARY[norm] || docGloss[norm]) continue
        const c = getFromCache(norm)
        if (c) cachedGloss[norm] = { text: c.text, source: c.source }
      }
      if (Object.keys(cachedGloss).length) {
        setDocGloss(prev => ({ ...prev, ...cachedGloss }))
      } else {
        setTranslation({ items: [{ src: '', text: 'Nothing new to translate on this document.', source: 'info' }] })
      }
      return
    }
    const ac = new AbortController()
    translateAbortRef.current = ac
    setTranslating({ done: 0, total: toTranslate.length })
    const results = await translateDocument(toTranslate, {
      translateBatch,
      signal: ac.signal,
      onProgress: setTranslating,
    })
    setDocGloss(prev => ({ ...prev, ...results }))
    setTranslating(null)
    translateAbortRef.current = null
  }, [activeTokens, docGloss])

  const cancelTranslate = useCallback(() => {
    translateAbortRef.current?.abort()
    setTranslating(null)
  }, [])

  const sourceColor = (s) => ({
    deepl: 'var(--color-blue)',
    google: 'var(--color-orange)',
    gtx: 'var(--color-dim)',
    loading: 'var(--color-dim)',
    info: 'var(--color-dim)',
    error: 'var(--color-red)',
    empty: 'var(--color-dim)',
  })[s] || 'var(--color-text)'

  // Empty state: just the upload button
  if (!pdfData && !loading) {
    return (
      <div className="space-y-4 animate-fadeUp">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileSearch size={18} style={{ color: 'var(--color-accent)' }} /> PDF Reader
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
          Upload a Malay PDF to read interactively. Click words to translate, or switch to Select mode to build flashcards.
        </p>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
          className="rounded-2xl p-10 text-center cursor-pointer"
          style={{ background: 'var(--color-card)', border: '2px dashed var(--color-border)' }}
        >
          <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm font-bold mb-1">Drop a PDF or click to choose</p>
          <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
            Stays in your browser — nothing is uploaded.
          </p>
        </div>
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
        {error && (
          <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--color-red)' }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-16 animate-fadeUp">
        <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-sm font-bold">Reading PDF…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 py-2 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Upload size={12} /> Replace
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />

          {/* Reflow ⟷ Layout: simple reading text vs a faithful picture of the page
              (columns, tables, diagrams kept). */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}
            title="Reflow = simple text · Layout = the page as it really looks">
            <button onClick={() => switchView('reflow')} className="px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
              style={{ background: view === 'reflow' ? 'var(--color-accent)' : 'transparent', color: view === 'reflow' ? '#fff' : 'var(--color-text)' }}>
              <FileText size={12} /> Reflow
            </button>
            <button onClick={() => switchView('layout')} className="px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
              style={{ background: view === 'layout' ? 'var(--color-accent)' : 'transparent', color: view === 'layout' ? '#fff' : 'var(--color-text)' }}>
              <LayoutTemplate size={12} /> Layout
            </button>
          </div>

          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <button onClick={() => setMode('translate')} className="px-3 py-1.5 text-xs font-bold flex items-center gap-1"
              style={{ background: mode === 'translate' ? 'var(--color-accent)' : 'transparent', color: mode === 'translate' ? '#fff' : 'var(--color-text)' }}>
              <Languages size={12} /> Translate
            </button>
            <button onClick={() => setMode('select')} className="px-3 py-1.5 text-xs font-bold flex items-center gap-1"
              style={{ background: mode === 'select' ? 'var(--color-accent)' : 'transparent', color: mode === 'select' ? '#fff' : 'var(--color-text)' }}>
              <MousePointerClick size={12} /> Select
            </button>
          </div>

          {/* Group toggle — the touch-friendly way to choose individual-words vs
              one-phrase, since phones have no right-click. Drag intent follows it. */}
          {mode === 'select' && (
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}
              title="Drag selects individual words, or — with Group on — one phrase">
              <button onClick={() => setGroupMode(false)} className="px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
                style={{ background: !groupMode ? 'var(--color-green)' : 'transparent', color: !groupMode ? '#000' : 'var(--color-text)' }}>
                <Unlink size={12} /> Individual
              </button>
              <button onClick={() => setGroupMode(true)} className="px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
                style={{ background: groupMode ? 'var(--color-purple)' : 'transparent', color: groupMode ? '#fff' : 'var(--color-text)' }}>
                <Link size={12} /> Group
              </button>
            </div>
          )}

          {/* Reveal-gated in-place translation: glosses unknown words on the page,
              hidden until tapped (read Malay first). Free gtx — no key needed. */}
          <button onClick={translatePage} disabled={!!translating}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"
            style={{ background: 'var(--color-accent)', color: '#fff' }}>
            <Languages size={12} /> {translating ? 'Translating…' : 'Translate page'}
          </button>

          {hasGloss && (
            <button onClick={toggleShowAll}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                       color: glossState.showAll ? 'var(--color-accent)' : 'var(--color-text)' }}
              title="Reveal or hide every gloss on the page at once">
              {glossState.showAll ? <><EyeOff size={12} /> Hide all</> : <><Eye size={12} /> Show all</>}
            </button>
          )}

          <button onClick={translateAllUnknowns}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Languages size={12} /> List unknowns
          </button>

          <span className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--color-dim)', background: 'var(--color-card)' }}>
            {pdfData.pages.length} pages · provider: {preferredProvider}
          </span>
        </div>

        {batchProgress && (
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div className="h-full transition-all" style={{ background: 'var(--color-accent)', width: '60%' }} />
          </div>
        )}

        {translating && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div className="h-full transition-all" style={{
                background: 'var(--color-accent)',
                width: translating.total ? `${Math.round((translating.done / translating.total) * 100)}%` : '10%',
              }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-dim)' }}>
              {translating.done}/{translating.total}
            </span>
            <button onClick={cancelTranslate} className="text-[10px] font-bold underline" style={{ color: 'var(--color-red)' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Translation panel */}
      {translation && (
        <div className="sticky top-[58px] z-20 rounded-xl p-3 animate-fadeUp"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
              {translation.heading || 'Translation'}
            </div>
            <button onClick={() => setTranslation(null)} style={{ color: 'var(--color-dim)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {translation.items.map((it, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                {it.src && (
                  <DictionaryIcon word={it.src} meaning={it.text} size={22} className="flex-shrink-0 mt-0.5" />
                )}
                {it.src && (
                  <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>{it.src}</span>
                )}
                {it.src && <span style={{ color: 'var(--color-dim)' }}>→</span>}
                <span style={{ color: sourceColor(it.source) }}>{it.text}</span>
                {it.src && it.source !== 'loading' && it.source !== 'info' && (
                  <button onClick={() => addToSelection([{ word: it.src, en: it.text, type: 'word' }])}
                    className="ml-auto" style={{ color: 'var(--color-green)' }} title="Add to selection">
                    <Plus size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {showCompare && translation.items.length === 1 && translation.items[0].src && (
            <div className="mt-2 flex gap-3 text-[10px]">
              {translation.items[0].source !== 'deepl' && health.deepl && (
                <a href={getDeepLCompareUrl(translation.items[0].src)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1" style={{ color: 'var(--color-blue)' }}>
                  Compare on DeepL <ExternalLink size={10} />
                </a>
              )}
              {translation.items[0].source !== 'google' && (
                <a href={getGoogleCompareUrl(translation.items[0].src)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1" style={{ color: 'var(--color-orange)' }}>
                  Compare on Google <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compositional teaching moment — how the grouped words combine */}
      {compound && (
        <div className="rounded-xl p-3 animate-fadeUp"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-purple)' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
              How the words combine
            </div>
            <button onClick={() => setCompound(null)} style={{ color: 'var(--color-dim)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {compound.parts.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>{p.w}</span>
                <span style={{ color: 'var(--color-dim)' }}>=</span>
                <span>{p.gloss}</span>
                {i < compound.parts.length - 1 && <span style={{ color: 'var(--color-dim)' }}>·</span>}
              </span>
            ))}
            <span style={{ color: 'var(--color-dim)' }}>→</span>
            <span className="inline-flex items-center gap-1">
              <span className="font-bold" style={{ color: 'var(--color-purple)' }}>{compound.phrase.w}</span>
              <span style={{ color: 'var(--color-dim)' }}>=</span>
              <span className="font-bold">{compound.phrase.gloss}</span>
            </span>
          </div>
        </div>
      )}

      {/* Selection bucket (Select mode) */}
      {selection.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)' }}>
          <div className="flex items-center gap-2 mb-2">
            <input value={deckName} onChange={(e) => setDeckName(e.target.value)}
              className="flex-1 px-2 py-1 rounded text-sm outline-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <button onClick={addSelectionToDeck}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-black flex items-center gap-1"
              style={{ background: 'var(--color-green)' }}>
              <Plus size={12} /> Add {selection.length}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selection.map((s, idx) => {
              const next = selection[idx + 1]
              const canGroup = s.type === 'word' && next?.type === 'word'
                && Number.isFinite(s.index) && Number.isFinite(next.index)
                && Math.abs(s.index - next.index) === 1
              return (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px]"
                  style={{ background: s.type === 'phrase' ? 'color-mix(in srgb, var(--color-purple) 15%, transparent)' : 'rgba(0,230,118,0.15)',
                           color: s.type === 'phrase' ? 'var(--color-purple)' : 'var(--color-green)' }}>
                  {s.word}
                  {s.type === 'phrase' && (
                    <button onClick={() => ungroupChip(idx)} title="Ungroup into separate words" style={{ color: 'currentColor' }}>
                      <Unlink size={10} />
                    </button>
                  )}
                  {canGroup && (
                    <button onClick={() => groupChips(idx)} title="Group with next word into a phrase" style={{ color: 'currentColor' }}>
                      <Link size={10} />
                    </button>
                  )}
                  <button onClick={() => removeFromSelection(idx)} style={{ color: 'currentColor' }}>
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Pages — Layout view (faithful render) or Reflow view (simple text) */}
      {view === 'layout' ? (
        <div {...pinch.handlers} className="select-none" style={{ touchAction: 'pan-y' }}>
          {/* Live CSS scale during a pinch (smooth); LayoutView re-renders crisp on settle. */}
          <div style={pinch.liveStyle}>
            <LayoutView doc={pdfDoc} onTokens={setLayoutTokens} selIdx={selIdx} zoom={pinch.zoom}
              glossByIndex={glossByIndex} glossState={glossState} addedGloss={addedGloss}
              onRevealGloss={revealGloss} onAddGloss={addGloss} />
          </div>
        </div>
      ) : (
      <div
        onPointerDown={sel.onPointerDown}
        onPointerMove={sel.onPointerMove}
        onPointerUp={sel.onPointerUp}
        onPointerCancel={sel.onPointerCancel}
        onContextMenu={sel.onContextMenu}
        className="space-y-4 select-none"
        style={{ touchAction: 'pan-y' }}
      >
        {tokenized.pages.map((page) => (
          <div key={page.pageNum} className="rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-[10px] font-bold mb-2" style={{ color: 'var(--color-dim)' }}>
              Page {page.pageNum}
            </div>
            {page.paragraphs.map((parts, pi) => (
              <p key={pi} className="text-sm leading-relaxed mb-3 last:mb-0">
                {parts.map((p, pix) => {
                  if (p.kind === 'space') return <span key={pix}>{p.text}</span>
                  if (p.kind === 'punct') return <span key={pix}>{p.text}</span>
                  const c = tokenColor(p.text)
                  const selType = selIdx.get(p.i)
                  const isPhrase = selType === 'phrase'
                  const gloss = glossByIndex.get(p.i)
                  return (
                    <span key={pix} className="inline">
                      <span data-token-i={p.i}
                        title={isPhrase ? 'grouped phrase' : selType ? 'selected' : undefined}
                        aria-label={isPhrase ? 'grouped phrase' : selType ? 'selected word' : undefined}
                        className="cursor-pointer rounded px-0.5 hover:bg-white/10"
                        style={{
                          color: c || undefined,
                          // selection background is a separate layer from the vocab text colour
                          background: selType
                            ? (isPhrase ? 'color-mix(in srgb, var(--color-purple) 24%, transparent)' : 'var(--color-accent-subtle)')
                            : undefined,
                          // non-colour cue so a grouped unit reads as one even without colour (a11y)
                          borderBottom: isPhrase ? '2px solid var(--color-purple)' : undefined,
                        }}>
                        {p.text}
                      </span>
                      {gloss && (
                        <DocGloss
                          gloss={gloss}
                          revealed={isRevealed(glossState, p.i)}
                          added={addedGloss.has(gloss.malay)}
                          onReveal={() => revealGloss(p.i)}
                          onAdd={() => addGloss(gloss)}
                        />
                      )}
                    </span>
                  )
                })}
              </p>
            ))}
          </div>
        ))}
      </div>
      )}

      {/* Tip footer */}
      <div className="text-[11px] py-3" style={{ color: 'var(--color-dim)' }}>
        <span className="font-bold">Tips:</span>{' '}
        Tap a word for a single translation · drag to select each word individually ·
        right-click + drag (or flip the Group toggle, then drag) groups them into one phrase
        (e.g. jam tangan = watch) · on phone, use the Group toggle or the link button on a chip ·
        hyphenated words (e.g. jam-tangan) count as one · use Volume on the translation panel to hear it
        {view === 'layout'
          ? ' · Layout shows the page exactly as it looks (columns, tables, diagrams) — pinch or double-tap to zoom'
          : ' · switch to Layout to see the page exactly as it looks (columns, tables, diagrams)'}
        <button onClick={clearPdf} className="ml-3 inline-flex items-center gap-1 underline" style={{ color: 'var(--color-red)' }}>
          <Trash2 size={11} /> Clear PDF
        </button>
        {translation && translation.items[0]?.src && (
          <button onClick={() => speak(translation.items[0].src)} className="ml-3 inline-flex items-center gap-1 underline">
            <Volume2 size={11} /> Speak last word
          </button>
        )}
      </div>
    </div>
  )
}
