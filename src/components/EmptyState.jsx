// Centered "this surface is empty (on purpose) — here's what it does, start here"
// panel. Extracted verbatim from the MistakeJournal "No Mistakes!" pattern (the
// project's gold-standard empty state) so every genuinely-empty surface speaks in
// the same warm, non-gamified voice.
//
// Use this ONLY for surfaces that are fully empty (no content to show yet). For
// surfaces that already have a list/grid + just need a framing line, add an inline
// intro <p> instead — that's the established convention on Comprehension, Listening,
// Word Families and Exam Rehearsal.
//
// Token-safe: every colour comes from var(--color-*) so light + dark both inherit.
export default function EmptyState({ icon, title, body, cta }) {
  return (
    <div className="text-center py-16 animate-fadeUp">
      {icon && <p className="text-5xl mb-4">{icon}</p>}
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      {body && (
        <p className={`text-sm ${cta ? 'mb-6' : ''}`} style={{ color: 'var(--color-dim)' }}>
          {body}
        </p>
      )}
      {cta && (
        <button onClick={cta.onClick}
          className="px-6 py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: 'var(--color-accent)' }}>
          {cta.label}
        </button>
      )}
    </div>
  )
}
