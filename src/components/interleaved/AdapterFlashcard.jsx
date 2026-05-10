import FlashcardMode from '../study/FlashcardMode';
import { Rating } from '../../lib/fsrs';

/**
 * Adapter for FlashcardMode to work inside SmartSession.
 * Shims the useStudySession interface to a uniform onComplete callback.
 */
export default function AdapterFlashcard({ card, onComplete }) {
  const sessionShim = {
    confidence: 0,
    setConfidence: () => {},
    pendingWrongWord: null,
    hypercorrect: false,
    reasonTagged: null,
    tagReason: () => {},
    rate: (rating) => {
      onComplete({ 
        correct: rating >= Rating.Good, 
        rating,
        type: 'fc'
      });
    },
    nextCard: () => onComplete({ skipped: true, type: 'fc' })
  };

  return <FlashcardMode card={card} session={sessionShim} />;
}
