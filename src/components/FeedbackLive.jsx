// Shared polite live region for drill / flashcard / reader feedback (WCAG
// 4.1.3 Status Messages). Announces the SAME text the eye sees — spec D8.
//
// Render it UNCONDITIONALLY (empty until feedback exists): screen readers
// only announce changes inside an already-mounted live region, so mounting
// it together with the feedback would be silent on most SR/browser pairs.
// `sr-only` is Tailwind's built-in visually-hidden utility.
export default function FeedbackLive({ text }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {text || ''}
    </div>
  )
}
