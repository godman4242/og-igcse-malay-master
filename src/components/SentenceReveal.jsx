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

import { Languages, ChevronUp, Plus, Check } from 'lucide-react'

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
}) {
  // --- Not revealed: the subtle cue (own button, gesture-isolated) ---
  if (!revealed) {
    return (
      <button
        type="button"
        aria-label="Reveal English for this sentence"
        onClick={(e) => { stop(e); onReveal?.() }}
        onPointerDown={stop}
        onPointerUp={stop}
        className="inline-flex items-center align-middle ml-0.5 rounded px-0.5 hover:opacity-80"
        style={{ color: 'var(--color-cyan)', verticalAlign: 'baseline', lineHeight: 1 }}
        title="Reveal the English for this whole sentence"
      >
        <Languages size={12} />
      </button>
    )
  }

  // --- Revealed in 'sheet' mode: keep an active inline cue; text lives in the
  // bottom panel that PDFReader renders. Tapping the cue collapses again. ---
  if (render === 'sheet') {
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
      <span style={{ color: 'var(--color-text)' }}>
        {pending ? '…' : (translation?.text || '…')}
      </span>
      <span className="inline-flex items-center gap-2 ml-2 align-middle">
        <span
          className="inline-flex items-center gap-0.5 text-[0.72em] uppercase tracking-wide"
          style={{ color: 'var(--color-dim)' }}
          title="Machine-translated — a guide to the meaning, not an authoritative answer"
        >
          <Languages size={9} /> machine
        </span>
        {hasUnknowns && (
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
        )}
        <button
          type="button"
          aria-label="Hide English for this sentence"
          onClick={(e) => { stop(e); onCollapse?.() }}
          onPointerDown={stop}
          onPointerUp={stop}
          className="inline-flex items-center"
          style={{ color: 'var(--color-dim)' }}
          title="Hide"
        >
          <ChevronUp size={13} />
        </button>
      </span>
    </span>
  )
}
