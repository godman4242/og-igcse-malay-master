// Reveal-gated in-place gloss affordance for "Translate the whole document, free".
// Spec:  docs/superpowers/specs/2026-06-08-translate-document-design.md (D1, D4, D9, D10)
// Plan:  docs/superpowers/plans/2026-06-08-translate-document.md (Step 4b)
//
// One presentational component, shared by BOTH PDF views (reflow inline + layout
// overlay) so the gloss looks/behaves identically in each. The load-bearing
// learning-science guardrail (D1) lives in the parent's reveal state — here we only
// render the right face of it:
//   • not revealed → a tiny own-button cue (read the Malay first; tap to reveal).
//   • revealed     → the English gloss in place, styled by its grounding marker,
//                    plus a one-tap "add to deck" that routes it into FSRS (D10).
//
// Every interactive element stopPropagation()s pointer + click events so a tap on
// the gloss never starts a Select v2 selection gesture in the host container.

import { Languages, Plus, Check, Flag } from 'lucide-react'

// Swallow the gesture so the parent's selection/translate handlers never fire.
function stop(e) { e.stopPropagation() }

export default function DocGloss({ gloss, revealed, added, onReveal, onAdd }) {
  if (!gloss) return null
  const word = gloss.malay

  if (!revealed) {
    return (
      <button
        type="button"
        aria-label={`Reveal meaning of ${word}`}
        onClick={(e) => { stop(e); onReveal?.() }}
        onPointerDown={stop}
        onPointerUp={stop}
        className="inline-flex items-center align-middle ml-0.5 rounded px-0.5 hover:opacity-80"
        style={{ color: 'var(--color-accent)', verticalAlign: 'baseline', lineHeight: 1 }}
        title={`Reveal meaning of ${word}`}
      >
        <Languages size={11} />
      </button>
    )
  }

  const { marker, display } = gloss
  const isUnverified = marker === 'unverified'
  const isMismatch = marker === 'mismatch'
  const color = isUnverified ? 'var(--color-dim)' : isMismatch ? 'var(--color-orange)' : 'var(--color-dim)'
  const title = isUnverified
    ? 'Machine-translated — unverified'
    : isMismatch
      ? `Machine guess differed; dictionary meaning shown`
      : undefined

  return (
    <span
      aria-live="polite"
      onPointerDown={stop}
      onPointerUp={stop}
      className="inline-flex items-center gap-0.5 ml-1 align-middle rounded px-1 text-[0.85em]"
      style={{
        verticalAlign: 'baseline',
        background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
      }}
      title={title}
    >
      {isMismatch && <Flag size={9} style={{ color: 'var(--color-orange)' }} />}
      <span
        style={{
          color,
          borderBottom: isUnverified ? '1px dotted var(--color-dim)' : undefined,
        }}
      >
        {display}
      </span>
      <button
        type="button"
        aria-label={added ? `${word} added to deck` : `Add ${word} to deck`}
        onClick={(e) => { stop(e); if (!added) onAdd?.() }}
        onPointerDown={stop}
        onPointerUp={stop}
        disabled={added}
        className="inline-flex items-center"
        style={{ color: added ? 'var(--color-green)' : 'var(--color-accent)' }}
        title={added ? 'Added to deck' : 'Add to deck'}
      >
        {added ? <Check size={11} /> : <Plus size={11} />}
      </button>
    </span>
  )
}
