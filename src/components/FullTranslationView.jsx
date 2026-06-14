// The Full-translation page (Option G): a dedicated, reveal-gated, full-screen surface
// for paragraph→whole-document English. Spec:
// docs/superpowers/specs/2026-06-09-full-translation-page-design.md
//
// COMPREHENSION check, not vocab (read the Malay first). Reveal-gated: opens with all
// Malay, nothing revealed; tap a paragraph to reveal its English inline beneath (Malay
// stays visible); "Reveal all" is the opt-in exam-cram escape hatch. Free gtx by
// default; the BYOK "Higher quality" pill shows only with a key. Paragraph-pure — no
// word/sentence tapping here (back arrow returns to the reader for vocab work).
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { ArrowLeft, Languages, Eye, EyeOff, ChevronUp, Sparkles } from 'lucide-react'
import { translateBatch } from '../lib/translate'
import { translateDocument } from '../lib/translateDocument'
import {
  buildParagraphs, splitForTranslation, planParagraphTranslation, assembleParagraphGloss,
} from '../lib/paragraphModel'
import { createRevealState, isRevealed, reveal, hide, setShowAll, hideAll } from '../lib/revealState'

export default function FullTranslationView({
  pages, quality = false, onToggleQuality, hasKey = false, onBack,
  // Translation direction + the revealed language's label. Default ms→en / 'English'
  // keeps the shipped Malay-reader behaviour byte-identical; an English (0510 ESL)
  // learner gets en→ms / 'Malay' (PDFReader passes plan.from/plan.to + revealLabel).
  from = 'ms', to = 'en', revealLabel = 'English',
}) {
  const readLabel = revealLabel === 'Malay' ? 'English' : 'Malay' // the source you read first
  const paras = useMemo(() => buildParagraphs(pages), [pages])
  const [glossById, setGlossById] = useState({})          // paraId -> { text, source }
  const [revealState, setRevealState] = useState(createRevealState)
  const [pending, setPending] = useState(() => new Set()) // paraIds being lazily fetched
  const [bulk, setBulk] = useState(null)                  // { done, total } | null
  const abortRef = useRef(null)
  // navigator.onLine read lazily (React-19 purity: no impure call in useState init body).
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const goOn = () => setOnline(true)
    const goOff = () => setOnline(false)
    window.addEventListener('online', goOn)
    window.addEventListener('offline', goOff)
    return () => { window.removeEventListener('online', goOn); window.removeEventListener('offline', goOff) }
  }, [])
  // Cancel any in-flight bulk job if the page unmounts (back / navigate away).
  useEffect(() => () => abortRef.current?.abort(), [])

  const provider = quality ? 'quality' : undefined

  // Lazily translate + reveal ONE paragraph (mirrors the reader's revealSentenceHandler).
  const revealOne = useCallback((p) => {
    setRevealState(s => reveal(s, p.paraId))
    if (glossById[p.paraId]) return
    const chunks = splitForTranslation(p.text)
    setPending(prev => new Set(prev).add(p.paraId))
    translateDocument(chunks, { translateBatch, from, to, provider }).then(results => {
      const g = assembleParagraphGloss(chunks, results)
      // Don't cache a failed paragraph as its gloss (text falls back to Malay on error)
      // — leaving it unstored lets a later reveal/reveal-all retry it (no error-stickiness).
      if (g.text && g.source !== 'error') setGlossById(prev => ({ ...prev, [p.paraId]: g }))
      setPending(prev => { const n = new Set(prev); n.delete(p.paraId); return n })
    })
  }, [glossById, provider, from, to])

  const collapseOne = useCallback((p) => {
    setRevealState(s => hide(s, p.paraId))
  }, [])

  // Bulk "Reveal all" — translate every not-yet-done paragraph (deduped sub-chunks),
  // cancellable + resumable from the per-text cache.
  const revealAll = useCallback(async () => {
    setRevealState(s => setShowAll(s, true))
    const { chunks, perPara } = planParagraphTranslation(paras, { have: glossById })
    if (!chunks.length) return
    const ac = new AbortController()
    abortRef.current = ac
    setBulk({ done: 0, total: chunks.length })
    const results = await translateDocument(chunks, {
      translateBatch, from, to, signal: ac.signal, onProgress: setBulk, provider,
    })
    setGlossById(prev => {
      const next = { ...prev }
      for (const [paraId, cks] of Object.entries(perPara)) {
        if (next[paraId]) continue
        const g = assembleParagraphGloss(cks, results)
        if (g.text && g.source !== 'error') next[paraId] = g // skip failed paras → retried later
      }
      return next
    })
    setBulk(null)
    abortRef.current = null
  }, [paras, glossById, provider, from, to])

  const cancelBulk = useCallback(() => { abortRef.current?.abort(); setBulk(null) }, [])
  const hideAllParas = useCallback(() => setRevealState(hideAll()), [])

  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 -mx-3 px-3 py-2 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onBack} aria-label="Back to reader"
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <ArrowLeft size={12} /> Reader
          </button>
          <h2 className="text-sm font-bold flex items-center gap-1">
            <Languages size={14} style={{ color: 'var(--color-accent)' }} /> Full translation
          </h2>

          {hasKey && (
            <button onClick={onToggleQuality} data-testid="quality-toggle-fulltx" aria-pressed={quality}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: quality ? 'var(--color-purple)' : 'var(--color-card)',
                       color: quality ? '#fff' : 'var(--color-text)', border: '1px solid var(--color-border)' }}
              title="Higher-quality translation using your own OpenRouter key (falls back to free if it's busy)">
              <Sparkles size={12} /> Higher quality
            </button>
          )}

          <button onClick={revealState.showAll ? hideAllParas : revealAll}
            disabled={!!bulk || (!online && !revealState.showAll)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                     color: revealState.showAll ? 'var(--color-accent)' : 'var(--color-text)' }}
            title="Reveal or hide the English for every paragraph (for timed comprehension cram)">
            {revealState.showAll ? <><EyeOff size={12} /> Hide all</> : <><Eye size={12} /> Reveal all</>}
          </button>

          <span className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--color-dim)', background: 'var(--color-card)' }}>
            {paras.length} paragraphs
          </span>
        </div>

        {bulk && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div className="h-full transition-all" style={{ background: 'var(--color-accent)',
                width: bulk.total ? `${Math.round((bulk.done / bulk.total) * 100)}%` : '10%' }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-dim)' }}>{bulk.done}/{bulk.total}</span>
            <button onClick={cancelBulk} className="text-[10px] font-bold underline" style={{ color: 'var(--color-red)' }}>Cancel</button>
          </div>
        )}

        <div className="mt-1 text-[10px] flex items-start gap-1" style={{ color: 'var(--color-dim)' }}>
          <Languages size={10} className="mt-0.5 flex-shrink-0" />
          <span>Machine translation — a guide to the meaning, not an authoritative answer. Read the {readLabel} first; reveal the {revealLabel} to check your understanding.</span>
        </div>
        {!online && (
          <div className="mt-1 text-[10px]" style={{ color: 'var(--color-orange)' }}>
            Offline — new translations are paused; already-translated paragraphs still reveal.
          </div>
        )}
      </div>

      {/* Paragraphs */}
      <div className="space-y-3">
        {paras.map((p) => {
          const shown = isRevealed(revealState, p.paraId)
          const g = glossById[p.paraId]
          const isPending = pending.has(p.paraId)
          return (
            <div key={p.paraId} className="rounded-2xl p-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{p.text}</p>
              {!shown ? (
                <button onClick={() => revealOne(p)} disabled={!online && !g}
                  aria-label={`Reveal ${revealLabel} for this paragraph`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold rounded-lg px-2.5 py-1 disabled:opacity-50"
                  style={{ color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}>
                  <Languages size={12} /> Show {revealLabel}
                </button>
              ) : (
                <div aria-live="polite" className="animate-fadeUp mt-2 rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'color-mix(in srgb, var(--color-accent) 9%, transparent)',
                           borderLeft: '2px solid var(--color-accent)' }}>
                  <span style={{ color: 'var(--color-text)' }}>
                    {isPending ? '…' : (g?.text || (online ? '…' : '— offline —'))}
                  </span>
                  <span className="inline-flex items-center gap-2 ml-2 align-middle">
                    <span className="inline-flex items-center gap-0.5 text-[0.72em] uppercase tracking-wide"
                      style={{ color: 'var(--color-dim)' }} title="Machine-translated — a guide, not authoritative">
                      <Languages size={9} /> machine
                    </span>
                    <button onClick={() => collapseOne(p)} aria-label={`Hide ${revealLabel} for this paragraph`}
                      style={{ color: 'var(--color-dim)' }} title="Hide"><ChevronUp size={13} /></button>
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FSRS path hint — vocab work stays in the reader (paragraph-pure page). */}
      <div className="text-[11px] py-3" style={{ color: 'var(--color-dim)' }}>
        <span className="font-bold">Tip:</span> Found an unknown word? Tap{' '}
        <span className="inline-flex items-center gap-0.5"><ArrowLeft size={11} /> Reader</span>{' '}
        to look it up and add it to your deck.
      </div>
    </div>
  )
}
