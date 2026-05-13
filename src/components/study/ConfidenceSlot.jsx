import ConfidencePrompt from '../ConfidencePrompt'

// Renders the metacognitive "how confident are you?" prompt used by every
// non-flashcard mode. Hidden once the student has answered or once they've
// already picked a confidence level for this card.
export default function ConfidenceSlot({ shouldShow, confidence, onSelect }) {
  if (!shouldShow || confidence !== null) return null
  return (
    <div className="mb-3">
      <ConfidencePrompt onSelect={onSelect} />
    </div>
  )
}
