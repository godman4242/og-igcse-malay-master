import { sortByPriority, buildComebackQueue } from './fsrs'

// A card's identity in the session queue. The queue holds keys, not objects, so
// rating a card (which replaces the object in the store) can't detach the index
// from what the learner is looking at.
export const cardKey = (c) => `${c.m}${c.t}`

/**
 * The order a study session serves cards in, as ONE list.
 *
 * A returning learner ("comeback") gets a warm-up prefix of high-stability
 * cards they already know well, then the normal priority queue with those
 * warm-up cards removed.
 *
 * Building it as a single list is the fix for census A3/A4: the session used to
 * hold TWO orderings behind ONE index and swap between them mid-session, which
 * skipped the most-overdue cards at the hand-off, re-served warm-up cards, and
 * — when no card qualified for a warm-up at all — served nothing while waiting
 * for a review count that could never arrive. With one list the index just walks
 * forward and every one of those failure modes is unrepresentable.
 *
 * @param cards  the session's cards, already scoped to deck + study language
 * @returns `{ keys, warmCount }` — `keys[0 .. warmCount-1]` is the warm-up.
 *          `warmCount` is what the deck could actually supply, which may be
 *          fewer than `warmupSize`, or 0.
 */
export function buildSessionQueue(cards, { comeback = false, warmupSize = 5 } = {}) {
  const priority = sortByPriority(cards)
  if (!comeback) return { keys: priority.map(cardKey), warmCount: 0 }

  const warm = buildComebackQueue(cards, warmupSize)
  const warmKeys = new Set(warm.map(cardKey))
  return {
    keys: [
      ...warm.map(cardKey),
      ...priority.filter((c) => !warmKeys.has(cardKey(c))).map(cardKey),
    ],
    warmCount: warm.length,
  }
}
