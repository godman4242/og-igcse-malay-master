// Reveal-gated per-sentence affordance for the sentence-level reveal feature.
// Spec:  docs/superpowers/specs/2026-06-08-sentence-reveal-design.md (S2, S3, S4, S10)
// Plan:  docs/superpowers/plans/2026-06-08-sentence-reveal.md (Step 3)
//
// COMPREHENSION aid, not a vocab tool (spec S2): the learner reads the Malay first,
// then a deliberate tap reveals the whole-sentence English. Word-level reveal stays
// the primary path; this is secondary and off by default. Every interactive element
// stopPropagation()s pointer + click so a tap never starts a Select v2 selection —
// mirrors DocGloss.jsx exactly (zero gesture regression).
//
// Two faces × two render modes:
//   • not revealed            → a subtle ¶/Languages cue (read the Malay first).
//   • revealed + 'inline'     → an in-place slide-down block under the sentence: the
//                               English with the honest "machine-translated" marker
//                               (S10, never authoritative), a collapse control, and
//                               "add unknown words" (routes vocab into FSRS — S8).
//   • revealed + 'sheet'      → just an active cue inline; the text is rendered by
//                               PDFReader's fixed bottom panel (Settings pref, S11).
//
// Ladder mode (Option F, spec 2026-06-10): when the learner has their own instruct
// provider, PDFReader passes the simplify props (`simplified` !== undefined) and the
// revealed block leads with SIMPLER MALAY — the vocab-building L2 rung — plus a
// "Show English" escalation that reveals the machine English beneath only on a
// second, deliberate tap (smallest crutch first). With no provider the props are
// absent and the block renders exactly as before (English directly) — byte-for-byte
// the shipped behaviour. Simplify failure/garbage and "show all" (which never bulk-
// simplifies, F6) degrade to the English face, with a one-line notice on failure.

import { Languages, ChevronUp, ChevronDown, Plus, Check, Sparkles } from 'lucide-react'

// Swallow the gesture so the parent's selection/translate handlers never fire.
function stop(e) { e.stopPropagation() }

export default function SentenceReveal({
  revealed,
  render = 'inline',
  translation,        // { text, source } | null  (null = not translated yet)
  pending = false,    // a translation request is in flight for this sentence
  hasUnknowns = false,
  addedUnknowns = false,
  onReveal,
  onCollapse,
  onAddUnknowns,
  // Ladder (Option F) — PDFReader passes these ONLY when an instruct provider
  // exists. All absent (simplified === undefined) ⇒ the shipped English-first
  // behaviour, byte-for-byte.
  simplified,                // { text } | null  (null = no simpler Malay yet)
  simplifyPending = false,   // a simplify request is in flight
  simplifyFailed = false,    // simplify degraded (model failure/echo/English/empty)
  englishShown = false,      // the learner escalated this sentence to English
  onShowEnglish,
  onHideEnglish,
}) {
  // The simpler-Malay rung has content only while fetching or after a clean parse;
  // otherwise (failure, or "show all" which never bulk-simplifies — F6) the block
  // degrades to the English face below.
  const ladder = simplified !== undefined
  const malayRung = ladder && (simplifyPending || !!simplified?.text)
  // --- Not revealed: the subtle cue (own button, gesture-isolated) ---
  if (!revealed) {
    return (
      <button
        type="button"
        aria-label={ladder ? 'Get help with this sentence' : 'Reveal English for this sentence'}
        onClick={(e) => { stop(e); onReveal?.() }}
        onPointerDown={stop}
        onPointerUp={stop}
        className="inline-flex items-center align-middle ml-0.5 rounded px-0.5 hover:opacity-80"
        style={{ color: 'var(--color-cyan)', verticalAlign: 'baseline', lineHeight: 1 }}
        title={ladder
          ? 'Stuck? See this sentence in simpler Malay'
          : 'Reveal the English for this whole sentence'}
      >
        <Languages size={12} />
      </button>
    )
  }

  // --- Revealed in 'sheet' mode: keep an active inline cue; text lives in the
  // bottom panel that PDFReader renders. Tapping the cue collapses again.
  // In ladder mode the simpler-Malay rung stays INLINE (F7) — only when the rung
  // has no content (degraded to English) does the sheet pref take over. ---
  if (render === 'sheet' && !malayRung) {
    return (
      <button
        type="button"
        aria-label="Hide English for this sentence"
        onClick={(e) => { stop(e); onCollapse?.() }}
        onPointerDown={stop}
        onPointerUp={stop}
        className="inline-flex items-center align-middle ml-0.5 rounded px-0.5"
        style={{ color: 'var(--color-cyan)', verticalAlign: 'baseline', lineHeight: 1,
                 background: 'color-mix(in srgb, var(--color-cyan) 18%, transparent)' }}
        title="Showing in the panel below — tap to hide"
      >
        <Languages size={12} />
      </button>
    )
  }

  // --- Revealed in 'inline' mode: the slide-down block under the sentence ---
  // A <span style={display:block}> (not a <div>) so it stays valid phrasing content
  // inside the reflow <p>, while visually dropping onto its own line.
  const machineMarker = (
    <span
      className="inline-flex items-center gap-0.5 text-[0.72em] uppercase tracking-wide"
      style={{ color: 'var(--color-dim)' }}
      title="Machine-translated — a guide to the meaning, not an authoritative answer"
    >
      <Languages size={9} /> machine
    </span>
  )
  const addWordsBtn = hasUnknowns && (
    <button
      type="button"
      aria-label={addedUnknowns ? 'Unknown words added to deck' : 'Add unknown words from this sentence to deck'}
      onClick={(e) => { stop(e); if (!addedUnknowns) onAddUnknowns?.() }}
      onPointerDown={stop}
      onPointerUp={stop}
      disabled={addedUnknowns}
      className="inline-flex items-center gap-0.5 text-[0.78em] font-bold rounded px-1 py-0.5"
      style={{ color: addedUnknowns ? 'var(--color-green)' : 'var(--color-accent)',
               border: '1px solid currentColor' }}
      title={addedUnknowns ? 'Added to deck' : 'Add the unknown words from this sentence to your deck'}
    >
      {addedUnknowns ? <><Check size={11} /> Added</> : <><Plus size={11} /> Add words</>}
    </button>
  )
  const collapseBtn = (
    <button
      type="button"
      aria-label={ladder ? 'Hide the help for this sentence' : 'Hide English for this sentence'}
      onClick={(e) => { stop(e); onCollapse?.() }}
      onPointerDown={stop}
      onPointerUp={stop}
      className="inline-flex items-center"
      style={{ color: 'var(--color-dim)' }}
      title="Hide"
    >
      <ChevronUp size={13} />
    </button>
  )

  return (
    <span
      aria-live="polite"
      onPointerDown={stop}
      onPointerUp={stop}
      className="animate-fadeUp rounded-lg px-2.5 py-1.5 my-1 text-[0.92em]"
      style={{
        display: 'block',
        background: 'color-mix(in srgb, var(--color-cyan) 9%, transparent)',
        borderLeft: '2px solid var(--color-cyan)',
      }}
    >
      {malayRung ? (
        <>
          {/* Rung 1 — simpler Malay (L2, the vocab-building rung) */}
          <span style={{ color: 'var(--color-text)' }}>
            {simplifyPending ? '…' : simplified.text}
          </span>
          <span className="inline-flex items-center gap-2 ml-2 align-middle">
            {addWordsBtn}
            {collapseBtn}
          </span>
          <span className="flex items-center justify-between gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 text-[0.72em]"
              style={{ color: 'var(--color-dim)' }}
              title="A simpler Malay rewrite, generated as a study aid — the original sentence above is the exam wording"
            >
              <Sparkles size={9} className="flex-shrink-0" /> Simplified Malay — a study aid, not the exam wording
            </span>
            <button
              type="button"
              aria-label={englishShown ? 'Hide the English translation' : 'Show the English translation'}
              aria-expanded={englishShown}
              onClick={(e) => { stop(e); (englishShown ? onHideEnglish : onShowEnglish)?.() }}
              onPointerDown={stop}
              onPointerUp={stop}
              className="inline-flex items-center gap-0.5 text-[0.78em] font-bold rounded px-1 py-0.5 flex-shrink-0"
              style={{ color: 'var(--color-cyan)', border: '1px solid currentColor' }}
              title={englishShown ? 'Hide the English' : 'Still stuck? Show the English'}
            >
              {englishShown
                ? <>Hide English <ChevronUp size={11} /></>
                : <>Show English <ChevronDown size={11} /></>}
            </button>
          </span>
          {/* Rung 2 — English (comprehension fallback), only after a deliberate
              escalation tap; in 'sheet' pref the text lives in the bottom panel. */}
          {englishShown && render === 'inline' && (
            <span
              className="block mt-1.5 pt-1.5"
              style={{ borderTop: '1px dashed color-mix(in srgb, var(--color-dim) 35%, transparent)' }}
            >
              <span style={{ color: 'var(--color-text)' }}>
                {pending ? '…' : (translation?.text || '…')}
              </span>
              <span className="inline-flex items-center gap-2 ml-2 align-middle">
                {machineMarker}
              </span>
            </span>
          )}
        </>
      ) : (
        <>
          {/* English face — the shipped behaviour (no provider), also the graceful
              degrade when simplify failed or "show all" revealed without simplifying. */}
          {ladder && simplifyFailed && (
            <span className="block text-[0.72em] mb-0.5" style={{ color: 'var(--color-dim)' }}>
              Couldn’t simplify — showing English
            </span>
          )}
          <span style={{ color: 'var(--color-text)' }}>
            {pending ? '…' : (translation?.text || '…')}
          </span>
          <span className="inline-flex items-center gap-2 ml-2 align-middle">
            {machineMarker}
            {addWordsBtn}
            {collapseBtn}
          </span>
        </>
      )}
    </span>
  )
}
