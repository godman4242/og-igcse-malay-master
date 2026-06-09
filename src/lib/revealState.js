// Generic id-keyed reveal-state reducer for any "reveal-gated" layer. The word-gloss
// layer has its own docGlossState; THIS reducer backs the sentence reveal (via the
// sentenceRevealState re-export) AND the Full-translation page (paragraph reveal).
// Reveal-gated default: nothing revealed, showAll off. No DOM. Ids are arbitrary
// stable strings (sentenceId, paraId).

/** Initial state: reveal-gated (nothing revealed, showAll off). */
export function createRevealState() {
  return { showAll: false, revealed: {} }
}

/** Is this id currently revealed? showAll overrides per-id reveals. */
export function isRevealed(state, id) {
  return Boolean(state.showAll || (state.revealed && state.revealed[id]))
}

/** Reveal one id (immutable). */
export function reveal(state, id) {
  return { ...state, revealed: { ...state.revealed, [id]: true } }
}

/** Hide one previously-revealed id (immutable; no-op if not revealed). */
export function hide(state, id) {
  const revealed = { ...state.revealed }
  delete revealed[id]
  return { ...state, revealed }
}

/** Toggle the "show all" escape hatch (immutable). */
export function setShowAll(state, value) {
  return { ...state, showAll: Boolean(value) }
}

/** Collapse everything back to the gated default. */
export function hideAll() {
  return createRevealState()
}
