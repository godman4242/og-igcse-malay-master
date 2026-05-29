// Regression test: enqueueSyncEventAction must trigger the debounced cloud
// blob push (2026-05-28).
//
// Background: the `user_state` blob in Supabase holds streak / XP / settings /
// identity / dailyChallenge / etc. — anything not split into the per-table
// tables (user_cards, writing_history, speaking_history). Before this fix the
// blob was only ever pushed ONCE at first sign-in, so a second device would
// see stale streak / XP indefinitely. Wiring `triggerCloudSync()` into
// `enqueueSyncEventAction` keeps the blob fresh after every mutation.
//
// Contract pinned here: every code path that enqueues a sync event must also
// kick off the debounced state-blob push. If anyone reverts the call site
// back to `set(...)` only, the cross-device gap returns silently.
//
// Structural assertion only — vitest runs in `node` (no jsdom). A full unit
// test would need to mock `pushStateBlob` and exercise the 5s debounce; out
// of scope for the regression pin.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const STORE_SRC = readFileSync(resolve(here, '../useStore.js'), 'utf8')

// Strip line comments so a historical reference to `triggerCloudSync()` in a
// comment can't pass the check trivially.
const CODE = STORE_SRC.replace(/^\s*\/\/.*$/gm, '')

// Extract the body of `enqueueSyncEventAction` by balanced-brace walk from the
// declaration. Resilient to whitespace and line drift; doesn't assume the
// arrow body is `set(...)` vs `{ ... }`.
function extractActionBody(source, actionName) {
  const declRe = new RegExp(`${actionName}\\s*:\\s*\\(`)
  const declMatch = declRe.exec(source)
  if (!declMatch) throw new Error(`${actionName} declaration not found`)

  // Walk past the parameter list `(...)`.
  let i = declMatch.index + declMatch[0].length - 1
  let depth = 0
  do {
    if (source[i] === '(') depth++
    else if (source[i] === ')') depth--
    i++
  } while (depth > 0 && i < source.length)

  // Skip whitespace and `=>`.
  while (i < source.length && /\s/.test(source[i])) i++
  if (source.slice(i, i + 2) !== '=>') throw new Error(`expected => after ${actionName} params`)
  i += 2
  while (i < source.length && /\s/.test(source[i])) i++

  // Capture from the body start to the matching close — either a balanced
  // `{ ... }` block or a single `set(...)` expression.
  const bodyStart = i
  if (source[i] === '{') {
    depth = 0
    do {
      if (source[i] === '{') depth++
      else if (source[i] === '}') depth--
      i++
    } while (depth > 0 && i < source.length)
    return source.slice(bodyStart, i)
  }
  // Expression body: walk until the comma/closing brace at depth 0.
  depth = 0
  while (i < source.length) {
    const ch = source[i]
    if (ch === '(' || ch === '{' || ch === '[') depth++
    else if (ch === ')' || ch === '}' || ch === ']') {
      if (depth === 0) break
      depth--
    } else if (ch === ',' && depth === 0) break
    i++
  }
  return source.slice(bodyStart, i)
}

describe('enqueueSyncEventAction — keeps the user_state cloud blob fresh', () => {
  const body = extractActionBody(CODE, 'enqueueSyncEventAction')

  it('invokes triggerCloudSync() so streak / XP / settings cross-device sync', () => {
    expect(body).toMatch(/triggerCloudSync\s*\(/)
  })

  it('still mutates the sync queue via set()', () => {
    // Belt-and-braces — if someone refactors the wiring and accidentally
    // removes the queue update, the per-table flush path also breaks.
    expect(body).toMatch(/\bset\s*\(/)
    expect(body).toMatch(/queue/)
  })

  it('stamps lastMutationAt so the cloud-sync tie-break has a reliable signal', () => {
    // The AuthGuard newer-wins tie-break reads lastMutationAt vs the blob's
    // updated_at. If this stops being bumped on every mutation, the tie-break
    // silently degrades back to the coarse lastStudyDate-class staleness.
    expect(body).toMatch(/lastMutationAt\s*:\s*new Date\(\)\.toISOString\(\)/)
  })
})

describe('store migration — lastMutationAt (v21)', () => {
  it('adds lastMutationAt for returning users, defaulting to now (push-not-restore)', () => {
    expect(CODE).toMatch(/if\s*\(\s*version\s*<\s*21\s*\)/)
    expect(CODE).toMatch(/lastMutationAt\s*:\s*state\.lastMutationAt\s*\|\|\s*new Date\(\)\.toISOString\(\)/)
  })

  it('bumps STORE_VERSION to at least 21', () => {
    const m = CODE.match(/STORE_VERSION\s*=\s*(\d+)/)
    expect(m).not.toBeNull()
    expect(Number(m[1])).toBeGreaterThanOrEqual(21)
  })
})
