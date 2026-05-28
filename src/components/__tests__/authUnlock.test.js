// Regression test for the P1 settings sync loop (2026-05-28).
//
// Root cause: AuthUnlock's mount effect called `hydrateCloudData()`, which
// flipped `isHydratingCloud: true`. Layout swapped its children for a spinner,
// unmounting Settings (and AuthUnlock). When hydration resolved and the
// children remounted, AuthUnlock's effect re-fired — infinite loop.
//
// Contract pinned here: cloud-hydration / queue-flush side effects belong in
// AuthGuard (the app-root listener), not in a settings-page component. If
// anyone re-wires those calls back into AuthUnlock the loop returns.
//
// Structural assertion only — vitest runs in `node` (no jsdom). A full mount
// test would require adding @testing-library/react + jsdom; out of scope for
// this fix.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const AUTH_UNLOCK_SRC = readFileSync(resolve(here, '../AuthUnlock.jsx'), 'utf8')

// Strip line comments so the historical write-up in the file header can name
// the symbols this test forbids without tripping itself.
const CODE = AUTH_UNLOCK_SRC.replace(/^\s*\/\/.*$/gm, '')

describe('AuthUnlock — cloud side effects live in AuthGuard, not here', () => {
  it('does not invoke hydrateCloudData', () => {
    expect(CODE).not.toMatch(/hydrateCloudData\s*\(/)
    expect(CODE).not.toMatch(/\.hydrateCloudData\b/)
  })

  it('does not flush the sync queue', () => {
    expect(CODE).not.toMatch(/flushSyncQueue\s*\(/)
    expect(CODE).not.toMatch(/\.flushSyncQueue\b/)
  })

  it('does not run its own cold-load session restore', () => {
    // AuthGuard owns the session restore. AuthUnlock must read auth.user from
    // the store, not call getCurrentUser / client.auth.getUser itself.
    expect(CODE).not.toMatch(/getCurrentUser\s*\(/)
    expect(CODE).not.toMatch(/\bauth\.getUser\s*\(/)
  })

  it('does not subscribe to onAuthStateChange (AuthGuard owns the listener)', () => {
    expect(CODE).not.toMatch(/onAuthStateChange\s*\(/)
  })
})
