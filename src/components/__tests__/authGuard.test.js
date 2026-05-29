// Regression test: AuthGuard pulls the cloud state blob on EVERY sign-in,
// including cold-load session restore (2026-05-29).
//
// Background: pre-fix, handleSignIn short-circuited with
// `if (!isNewLogin) return` before pullStateBlob, so a second device on
// session restore never pulled the blob — streak / XP / settings / identity /
// dailyChallenge were stuck at whatever the local (often empty) state had.
// The Round-3 fix (e9b205a) added unconditional hydrateCloudData for per-table
// data but deliberately left the blob gated. Diagnosis on 2026-05-29 confirmed
// the blob in Supabase was fresh and populated (264 cards, streak, XP) while
// incognito tabs kept showing zero data because the gate prevented the pull.
//
// Contract pinned: handleSignIn must NOT short-circuit on `isNewLogin` before
// calling pullStateBlob. Equally, pullStateBlob must remain part of every
// sign-in flow — silently removing it would also reintroduce the cross-device
// gap, just via a different shape.
//
// Structural assertion only — vitest runs in `node` (no jsdom). A full mount
// test would need @testing-library/react + jsdom; out of scope.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const AUTH_GUARD_SRC = readFileSync(resolve(here, '../AuthGuard.jsx'), 'utf8')

// Strip line comments so the historical write-up in the file header and the
// docstring's `if (!isNewLogin) return` reference can't satisfy the check
// trivially. JSDoc lines start with ` *` — strip those too.
const CODE = AUTH_GUARD_SRC
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '')

describe('AuthGuard — cloud state blob pull runs on every sign-in', () => {
  it('does NOT short-circuit handleSignIn on !isNewLogin', () => {
    // Any shape of `if (!isNewLogin) return` (with or without braces, spacing,
    // or a strict-equality variant) reintroduces the gate.
    expect(CODE).not.toMatch(/if\s*\(\s*!\s*isNewLogin\s*\)\s*return/)
    expect(CODE).not.toMatch(/if\s*\(\s*isNewLogin\s*===\s*false\s*\)\s*return/)
    expect(CODE).not.toMatch(/if\s*\(\s*isNewLogin\s*==\s*false\s*\)\s*return/)
  })

  it('still calls pullStateBlob — removing it also breaks cross-device sync', () => {
    expect(CODE).toMatch(/pullStateBlob\s*\(/)
  })

  it('still calls hydrateCloudData on every sign-in (Round 3 contract)', () => {
    // Per-table data path. Independent of the blob path but equally load-bearing.
    expect(CODE).toMatch(/hydrateCloudData\s*\(/)
  })
})

// Regression: restoreFromCloud must not drop the local sync queue or race
// hydrateCloudData on `cards` (2026-05-29).
//
// Pre-fix, restoreFromCloud did `setState({ ...cloud.state, ... })`. Two
// silent bugs:
//  1. cloud.state.sync is sanitized to `queue: []` by pushStateBlob, so the
//     shallow setState overwrote the live queue — un-flushed sync events
//     (mistakes / grammar / streak / study_minutes / writing+speaking
//     increments) were dropped on any cloud-wins sign-in.
//  2. cloud.state.cards was written here WHILE the concurrent
//     hydrateCloudData also wrote `cards` (key-based union) — a
//     nondeterministic race that could undo the union.
//
// Fix: restore only the blob-only fields; let hydrateCloudData own
// cards/writing/speaking via union, and preserve the device-local sync slice.

describe('AuthGuard — restoreFromCloud preserves local queue + avoids the card race', () => {
  it('preserves the device-local sync slice (not the blob\'s sanitized queue:[])', () => {
    expect(CODE).toMatch(/sync\s*:\s*live\.sync/)
  })

  it('destructures cards/writingHistory/speakingHistory OUT of cloud.state so setState never writes them', () => {
    expect(CODE).toMatch(/const\s*\{[^}]*\bcards\b[^}]*\bwritingHistory\b[^}]*\bspeakingHistory\b[^}]*\}\s*=\s*cloud\.state/)
  })

  it('no longer spreads the whole cloud.state blob into setState (the source of both bugs)', () => {
    expect(CODE).not.toMatch(/setState\s*\(\s*\{\s*\.\.\.cloud\.state\b/)
    expect(CODE).not.toMatch(/const\s+merged\s*=\s*\{\s*\.\.\.cloud\.state\b/)
  })
})
