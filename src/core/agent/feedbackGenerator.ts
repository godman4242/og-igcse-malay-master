import { AgentResponse, CognitiveProfile, ConceptSchema, StudentMistake } from './types';
import { getMetacognitivePrompt, getRelationalHookPrompt } from './promptLibrary';

/**
 * The Brain of Cikgu Maya's Feedback Engine.
 * Determines the optimal pedagogical intervention based on the student's cognitive profile.
 */
export class FeedbackGenerator {
  private schemaGraph: Map<string, ConceptSchema>;

  constructor(schemas: ConceptSchema[]) {
    this.schemaGraph = new Map(schemas.map((s) => [s.id, s]));
  }

  /**
   * Generates the next agent intervention when a mistake occurs.
   * Prioritizes Metacognitive Loops over immediate correction.
   */
  public generateIntervention(mistake: StudentMistake, profile: CognitiveProfile): AgentResponse {
    // 1. Is this the first time they made this specific mistake today?
    const recentSimilarMistakes = profile.recentMistakes.filter(
      (m) => m.conceptId === mistake.conceptId
    );

    // If it's a fresh mistake, trigger Metacognitive Loop (Review My Thinking)
    if (recentSimilarMistakes.length === 0) {
      return {
        type: 'metacognitive_prompt',
        message: getMetacognitivePrompt(mistake),
        metadata: { conceptId: mistake.conceptId }
      };
    }

    // 2. If they have already been prompted and we need to correct them, use Relational Hook
    const targetConcept = this.schemaGraph.get(mistake.conceptId);
    
    // Find a mastered concept that is related to the target concept
    const hookedConceptId = targetConcept?.relatedConceptIds.find(
      (id) => profile.masteredConcepts.includes(id)
    );

    if (hookedConceptId) {
      const hookedConcept = this.schemaGraph.get(hookedConceptId);
      if (hookedConcept) {
        return {
          type: 'socratic_hook',
          message: getRelationalHookPrompt(mistake, hookedConcept),
          metadata: { 
            conceptId: mistake.conceptId,
            hookedConceptId: hookedConcept.id 
          }
        };
      }
    }

    // 3. Fallback: Standard correction if no hooks are available
    return {
      type: 'correction',
      message: `You answered "${mistake.userInput}", but the correct answer is "${mistake.correctAnswer}". Let's review the logic for this rule.`,
      metadata: { conceptId: mistake.conceptId }
    };
  }
}
