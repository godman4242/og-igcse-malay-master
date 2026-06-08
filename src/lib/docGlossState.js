// Pure reveal-state reducer for the reveal-gated document gloss layer.
// Spec: docs/superpowers/specs/2026-06-08-translate-document-design.md (decision D1)
//
// The load-bearing learning-science guardrail: glosses are HIDDEN UNTIL TAPPED by
// default (preserving the read-Malay-first retrieval moment); "show all" is the
// opt-in escape hatch (offer, don't force). No DOM here — the gloss UI renders
// from this state and dispatches these reducers.

/** Initial state: reveal-gated (nothing revealed, showAll off). */
export function createGlossState() {
  return { showAll: false, revealed: {} }
}

/** Is a token's gloss currently visible? showAll overrides per-token reveals. */
export function isRevealed(state, id) {
  return Boolean(state.showAll || (state.revealed && state.revealed[id]))
}

/** Reveal one token's gloss (immutable). */
export function revealToken(state, id) {
  return { ...state, revealed: { ...state.revealed, [id]: true } }
}

/** Hide one previously-revealed token (immutable; no-op if not revealed). */
export function hideToken(state, id) {
  const revealed = { ...state.revealed }
  delete revealed[id]
  return { ...state, revealed }
}

/** Toggle the "show all on this page" escape hatch (immutable). */
export function setShowAll(state, value) {
  return { ...state, showAll: Boolean(value) }
}

/** Collapse everything back to the gated default. */
export function hideAll() {
  return createGlossState()
}
