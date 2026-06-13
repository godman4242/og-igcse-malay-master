// src/lib/speakTarget.js
//
// What should the learner SAY (and hear the model say) in Study → Speak mode?
// Record-and-compare (#9) is SENTENCE-level when the card carries a real example
// — sentence prosody/rhythm is the IGCSE-Paper-3-relevant skill, and saying the
// word in context also reinforces the vocab (elaborative encoding). It falls back
// to the bare word otherwise.
//
// Critical: `card.ex` is NOT always a sentence. When no curated example exists the
// store stores a PLACEHOLDER `"word (gloss)."` (see useStore seed + the v10
// migration's placeholderRe). Feeding that English gloss to ms-MY TTS would
// mispronounce it, so placeholders fall back to the word.

// The placeholder example shape `word (english).` — mirrors the store's v10
// placeholderRe, with the trailing period optional for safety. Multi-word Malay
// entries (e.g. "alat komunikasi (communication tool).") are covered by [^(]+.
const PLACEHOLDER_EX = /^[^(]+\([^)]*\)\.?\s*$/

/**
 * The Malay text to speak / record / compare for a card in Speak mode.
 * @param {{m?:string, ex?:string}} card
 * @returns {string} the example sentence, or the word, or '' for a junk card.
 */
export function speakTargetFor(card) {
  const word = card && typeof card.m === 'string' ? card.m.trim() : ''
  const ex = card && typeof card.ex === 'string' ? card.ex.trim() : ''
  if (ex && !PLACEHOLDER_EX.test(ex)) return ex
  return word
}
