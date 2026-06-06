// Pure builder for the "Practise saved words" produce/cloze session.
// Given a saved card, blank the Malay word inside its own example sentence so
// the learner PRODUCES it (generation effect, d≈0.40) rather than recognises it.
// No DOM, no React — fully unit-tested. The session UI consumes the result.

import { findSavedWordMatches } from './savedWordHighlight'

// makeClozeItem(card) →
//   { kind:'cloze', sentence, blankStart, blankEnd, answer, clue }  when the word
//     occurs as a whole word inside a real example sentence, OR
//   { kind:'produce', answer, clue }  fallback when there's no usable sentence
//     (missing `ex`, `ex` is just the word, or no whole-word match), OR
//   null  for garbage input (no Malay word to ask for).
//
// Reuses findSavedWordMatches so "where is the word" shares the exact same
// whole-word / phrase / case-insensitive notion as the reading-view highlighter.
// Only the FIRST occurrence is blanked, deterministically.
export function makeClozeItem(card) {
  const answer = card?.m?.trim()
  if (!answer) return null

  const clue = card.e ?? ''
  const ex = typeof card.ex === 'string' ? card.ex : ''

  // No real sentence to blank into → plain produce prompt.
  if (!ex || ex.trim().toLowerCase() === answer.toLowerCase()) {
    return { kind: 'produce', answer, clue }
  }

  const match = findSavedWordMatches(ex, [answer])[0]
  if (!match) return { kind: 'produce', answer, clue }

  return {
    kind: 'cloze',
    sentence: ex,
    blankStart: match.start,
    blankEnd: match.end,
    answer,
    clue,
  }
}
