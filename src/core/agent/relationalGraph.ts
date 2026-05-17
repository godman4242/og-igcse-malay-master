import { ConceptSchema } from './types';

/**
 * Hardcoded initial knowledge graph for IGCSE Malay Master.
 * This represents the "Top-Down Systemic Logic" (Dr. Jiang's model).
 * It maps out the exact relationships between grammar concepts so Cikgu Maya can hook new concepts onto mastered ones.
 */
export const RELATIONAL_KNOWLEDGE_GRAPH: ConceptSchema[] = [
  {
    id: 'prefix_meN',
    name: 'The meN- Prefix (Active Agency)',
    type: 'grammar',
    description: 'Denotes the subject actively performing an action. It represents outward flow of energy.',
    relatedConceptIds: ['prefix_beR', 'prefix_di']
  },
  {
    id: 'prefix_beR',
    name: 'The beR- Prefix (Reflexive/State)',
    type: 'grammar',
    description: 'Denotes an action the subject does to itself, or a state of being. Energy stays with the subject.',
    relatedConceptIds: ['prefix_meN']
  },
  {
    id: 'prefix_di',
    name: 'The di- Prefix (Passive Reception)',
    type: 'grammar',
    description: 'Denotes the subject receiving the action. Energy flows into the subject.',
    relatedConceptIds: ['prefix_meN']
  },
  {
    id: 'suffix_kan',
    name: 'The -kan Suffix (Causative/Benefactive)',
    type: 'grammar',
    description: 'Causes something to happen, or does an action for someone else.',
    relatedConceptIds: ['prefix_meN', 'suffix_i']
  },
  {
    id: 'suffix_i',
    name: 'The -i Suffix (Locative/Directional)',
    type: 'grammar',
    description: 'Applies the action to a specific location or target.',
    relatedConceptIds: ['prefix_meN', 'suffix_kan']
  }
];

/**
 * Retrieves the full map for the FeedbackGenerator to use.
 */
export const getSystemicLogicMap = (): ConceptSchema[] => {
  return RELATIONAL_KNOWLEDGE_GRAPH;
};
