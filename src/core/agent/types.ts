export type MasteryLevel = 'novice' | 'learning' | 'mastered';

export interface ConceptSchema {
  id: string;
  name: string;
  type: 'grammar' | 'vocabulary' | 'structure';
  description: string;
  relatedConceptIds: string[];
}

export interface StudentMistake {
  id: string;
  timestamp: number;
  userInput: string;
  correctAnswer: string;
  conceptId: string;
  context: string; // The sentence or drill where the mistake happened
}

export interface CognitiveProfile {
  studentId: string;
  masteredConcepts: string[]; // array of concept IDs
  learningConcepts: string[];
  recentMistakes: StudentMistake[];
}

export interface AgentResponse {
  type: 'correction' | 'socratic_hook' | 'metacognitive_prompt' | 'logic_map';
  message: string;
  metadata?: {
    conceptId?: string;
    hookedConceptId?: string;
  };
}
