// Structural regression: the persist config MUST reconcile a stale 'syncing'
// status on rehydration, or a flush interrupted by a tab close/crash
// permanently deadlocks the sync queue (Layout's flush trigger and the store's
// retry both guard on `syncStatus !== 'syncing'`, and the manual Retry button
// is disabled while 'syncing'). Observed 2026-05-29: queue frozen ~5h.
//
// vitest runs in `node` (no jsdom), so — like syncEnqueue.test.js — this is a
// source-level assertion of the wiring. The pure coercion logic is unit-tested
// separately in src/lib/__tests__/syncStatus.test.js.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const STORE_SRC = readFileSync(resolve(here, '../useStore.js'), 'utf8')
// Strip line comments so a reference inside a comment can't satisfy a check.
const CODE = STORE_SRC.replace(/^\s*\/\/.*$/gm, '')

describe('useStore persist — stale-syncing rehydration guard', () => {
  it('statically imports the reconcile helper from lib/syncStatus', () => {
    expect(CODE).toMatch(/import\s*\{\s*reconcileSyncStatusOnLoad\s*\}\s*from\s*['"]\.\.\/lib\/syncStatus['"]/)
  })

  it('defines a reconcileSyncOnHydrate action that uses the helper', () => {
    expect(CODE).toMatch(/reconcileSyncOnHydrate\s*:\s*\(\)\s*=>/)
    // Passes state.sync (and now an isOnline arg too).
    expect(CODE).toMatch(/reconcileSyncStatusOnLoad\s*\(\s*state\.sync\b/)
  })

  it('wires onRehydrateStorage to invoke the reconcile action', () => {
    expect(CODE).toMatch(/onRehydrateStorage\s*:/)
    // onRehydrateStorage returns a post-hydration callback that invokes the
    // action (tolerates optional-chaining call form: reconcileSyncOnHydrate?.()).
    expect(CODE).toMatch(/onRehydrateStorage[\s\S]{0,160}reconcileSyncOnHydrate\s*\??\.?\s*\(\)/)
  })
})
