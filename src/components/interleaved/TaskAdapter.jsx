import FlashcardMode from '../study/FlashcardMode'
import QuizMode from '../study/QuizMode'
import ClozeMode from '../study/ClozeMode'
import { Rating } from '../../lib/fsrs'

/**
 * TaskAdapter — single dispatcher for SmartSession's FSRS-card task types.
 *
 * Consolidates the three previous one-file-per-mode adapters (AdapterFlashcard,
 * AdapterQuiz, AdapterCloze) behind a switch keyed on `task.type`. Each study
 * mode expects a `session` shim with `rate(rating)` / `nextCard()`; we map those
 * back to SmartSession's uniform `onComplete({ correct, rating, type })` /
 * `onComplete({ skipped, type })` contract here in one place.
 *
 * Adding a new card-driven task type (e.g., 'listen') means: pick a Mode
 * component, add a case below, done.
 */
export default function TaskAdapter({ task, cardIdx, onComplete }) {
  if (!task || !task.card) return null

  const sessionShim = {
    confidence: 0,
    cardVariant: { variant: 'standard', label: 'Smart Session' },
    scheduling: null,
    vocabTip: null,
    setConfidence: () => {},
    pendingWrongWord: null,
    hypercorrect: false,
    reasonTagged: null,
    tagReason: () => {},
    rate: (rating) =>
      onComplete({
        correct: rating >= Rating.Good,
        rating,
        type: task.type,
      }),
    nextCard: () => onComplete({ skipped: true, type: task.type }),
  }

  switch (task.type) {
    case 'fc':
      return <FlashcardMode card={task.card} session={sessionShim} />
    case 'quiz':
      return <QuizMode card={task.card} cardIdx={cardIdx} session={sessionShim} />
    case 'cloze':
      return <ClozeMode card={task.card} session={sessionShim} />
    default:
      return null
  }
}
