import ClozeMode from '../study/ClozeMode';
import { Rating } from '../../lib/fsrs';

/**
 * Adapter for ClozeMode to work inside SmartSession.
 */
export default function AdapterCloze({ card, onComplete }) {
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
        type: 'cloze'
      });
    },
    nextCard: () => onComplete({ skipped: true, type: 'cloze' })
  };

  return <ClozeMode card={card} session={sessionShim} />;
}
