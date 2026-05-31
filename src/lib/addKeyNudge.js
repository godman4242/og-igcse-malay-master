/**
 * Decide whether to show the BYOK "add your own key" nudge.
 *
 * Shown only at an AI dead-end AND only to users without their own key — a
 * key-holder is never told to add a key they already have. Kept as a pure
 * function so the one meaningful branch is unit-tested without a DOM.
 * Design: docs/superpowers/specs/2026-05-31-add-key-nudge-design.md
 *
 * @param {boolean} aiUnavailable - AI is rate-limited/unavailable on this surface.
 * @param {boolean} hasKey - The user has supplied their own OpenRouter key.
 * @returns {boolean}
 */
export function shouldShowAddKeyNudge(aiUnavailable, hasKey) {
  return Boolean(aiUnavailable) && !hasKey
}
