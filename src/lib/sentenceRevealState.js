// Pure reveal-state reducer for the sentence-level reveal layer.
// Spec:  docs/superpowers/specs/2026-06-08-sentence-reveal-design.md (S3, §4)
// Plan:  docs/superpowers/plans/2026-06-08-sentence-reveal.md (Step 2)
//
// A SEPARATE state object from the word-gloss `docGlossState` (independent toggles —
// Sentence mode is off by default and word-level reveal stays the primary path).
// Same reveal-gated discipline: sentences are HIDDEN UNTIL TAPPED; "show all
// sentences" is the opt-in escape hatch for timed comprehension cram. Keyed by the
// stable `sentenceId` from sentenceModel. No DOM here.

/** Initial state: reveal-gated (nothing revealed, showAll off). */
export function createSentenceState() {
  return { showAll: false, revealed: {} }
}

/** Is a sentence's translation currently visible? showAll overrides per-id reveals. */
export function isSentenceRevealed(state, id) {
  return Boolean(state.showAll || (state.revealed && state.revealed[id]))
}

/** Reveal one sentence (immutable). */
export function revealSentence(state, id) {
  return { ...state, revealed: { ...state.revealed, [id]: true } }
}

/** Hide one previously-revealed sentence (immutable; no-op if not revealed). */
export function hideSentence(state, id) {
  const revealed = { ...state.revealed }
  delete revealed[id]
  return { ...state, revealed }
}

/** Toggle the "show all sentences on this page" escape hatch (immutable). */
export function setShowAllSentences(state, value) {
  return { ...state, showAll: Boolean(value) }
}

/** Collapse everything back to the gated default. */
export function hideAllSentences() {
  return createSentenceState()
}
