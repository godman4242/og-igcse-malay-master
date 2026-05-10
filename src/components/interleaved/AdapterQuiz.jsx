import QuizMode from '../study/QuizMode';
import { Rating } from '../../lib/fsrs';

/**
 * Adapter for QuizMode to work inside SmartSession.
 */
export default function AdapterQuiz({ card, cardIdx, onComplete }) {
  const sessionShim = {
    confidence: 0,
    setConfidence: () => {},
    pendingWrongWord: null,
    hypercorrect: false,
    reasonTagged: null,
    tagReason: (reason) => {
      console.log('Reason tagged:', reason);
    },
    rate: (rating) => {
      onComplete({ 
        correct: rating >= Rating.Good, 
        rating,
        type: 'quiz'
      });
    },
    nextCard: () => onComplete({ skipped: true, type: 'quiz' })
  };

  return <QuizMode card={card} cardIdx={cardIdx} session={sessionShim} />;
}
