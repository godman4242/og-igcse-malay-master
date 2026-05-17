export interface FSRSCard {
  id: string;
  due: number;           // Timestamp when the card is due for review
  stability: number;     // S value in FSRS (Memory stability in days)
  difficulty: number;    // D value in FSRS (1-10)
  reps: number;          // Total number of reviews
  lapses: number;        // Total number of times forgotten
  lastReview: number;    // Timestamp of last review
}

/**
 * Basic implementation of the Free Spaced Repetition Scheduler (FSRS) principles.
 * Replaces the legacy SM-2 Leitner system to prevent "Learning Debt".
 */
export class FSRSEngine {
  // FSRS default parameters (simplified for web implementation)
  private readonly requestRetention = 0.9;
  private readonly maximumInterval = 36500; // 100 years

  /**
   * Initializes a new card for the FSRS system.
   */
  public initCard(id: string): FSRSCard {
    return {
      id,
      due: Date.now(),
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      lastReview: 0
    };
  }

  /**
   * Calculates the next review state based on the grade given (1=Again, 2=Hard, 3=Good, 4=Easy).
   * This is a simplified mathematical model inspired by FSRS to adjust memory stability.
   */
  public processReview(card: FSRSCard, grade: 1 | 2 | 3 | 4): FSRSCard {
    const now = Date.now();
    let newStability = card.stability;
    let newDifficulty = card.difficulty;

    if (card.reps === 0) {
      // First review
      newStability = [0, 1, 3, 5][grade - 1]; // Initial stability in days
      newDifficulty = [7, 6, 5, 4][grade - 1]; // Initial difficulty (1-10 scale)
    } else {
      // Subsequent reviews
      if (grade === 1) { // Lapse (Again)
        newStability = Math.max(0.1, card.stability * 0.2); // Huge drop in stability
        newDifficulty = Math.min(10, card.difficulty + 2);  // Increase difficulty
      } else {
        // Success (Hard, Good, Easy)
        const difficultyFactor = 11 - card.difficulty; // Higher factor for easier cards
        const gradeFactor = [0, 0.5, 1, 2][grade - 1]; // Multiplier based on grade
        
        newStability = card.stability * (1 + (difficultyFactor * gradeFactor * 0.1));
        newDifficulty = Math.max(1, card.difficulty - [0, 0.1, 0.2, 0.3][grade - 1]);
      }
    }

    // Calculate next interval in milliseconds
    // I = S * (1/R - 1) / ln(0.9) - FSRS interval formula approximation
    const intervalDays = Math.min(
      this.maximumInterval,
      newStability * 9 * (1 / this.requestRetention - 1)
    );
    
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    return {
      ...card,
      stability: newStability,
      difficulty: newDifficulty,
      reps: card.reps + 1,
      lapses: grade === 1 ? card.lapses + 1 : card.lapses,
      lastReview: now,
      due: now + intervalMs
    };
  }
}
