import { createPortal } from 'react-dom'

// Lightweight, app-consistent toast — a fixed status message portalled to
// <body> so it shows regardless of which subtree mounts it. Presentational
// only: the caller owns the message state + auto-dismiss timer (mirrors
// Settings' inline `flash` pattern). Replaces jarring native alert() calls.
// role="status" + aria-live="polite" so screen readers announce it; the
// pointer-events:none means it never blocks a tap underneath.
export default function Toast({ text }) {
  if (!text) return null
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[70] max-w-[90vw] px-4 py-2.5 rounded-xl text-sm font-semibold text-center shadow-xl pointer-events-none animate-fadeUp"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}
    >
      {text}
    </div>,
    document.body,
  )
}
