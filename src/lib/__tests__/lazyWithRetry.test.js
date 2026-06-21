import { describe, it, expect, vi } from 'vitest'
import { isChunkLoadError, retryImport } from '../lazyWithRetry'

// A fake sessionStorage so the reload-guard is testable in the `node` env
// (no real window/sessionStorage). Mirrors how the real helper injects deps.
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map,
  }
}

const CHUNK_ERR = () =>
  new TypeError('Failed to fetch dynamically imported module: https://x/assets/Study-abc123.js')

describe('isChunkLoadError — recognises the stale/missing-chunk failure class', () => {
  it('matches the Chromium "Failed to fetch dynamically imported module" message', () => {
    expect(isChunkLoadError(CHUNK_ERR())).toBe(true)
  })
  it('matches the Firefox "error loading dynamically imported module" message', () => {
    expect(isChunkLoadError(new Error('error loading dynamically imported module: /assets/x.js'))).toBe(true)
  })
  it('matches the Safari "Importing a module script failed" message', () => {
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
  })
  it('does NOT match an ordinary in-component runtime error (must not trigger a reload)', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false)
  })
  it('is null/undefined-safe', () => {
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})

describe('retryImport — recover a stale chunk by reloading ONCE (deploy-hash safety)', () => {
  it('resolves to the module on success and leaves no reload flag', async () => {
    const storage = fakeStorage()
    const reload = vi.fn()
    const mod = { default: () => 'ok' }
    const out = await retryImport(() => Promise.resolve(mod), 'Study', { storage, reload })
    expect(out).toBe(mod)
    expect(reload).not.toHaveBeenCalled()
    expect(storage.getItem('chunk-reload:Study')).toBeNull()
  })

  it('on a chunk-load error (first time) sets the guard flag and triggers exactly one reload', () => {
    const storage = fakeStorage()
    const reload = vi.fn()
    // never resolves while the page reloads — assert the side effects synchronously
    retryImport(() => Promise.reject(CHUNK_ERR()), 'Study', { storage, reload })
    return Promise.resolve().then(() => {
      expect(reload).toHaveBeenCalledTimes(1)
      expect(storage.getItem('chunk-reload:Study')).toBe('1')
    })
  })

  it('if it ALREADY reloaded once and the chunk still fails, it rethrows (→ ErrorBoundary, no reload loop)', async () => {
    const storage = fakeStorage({ 'chunk-reload:Study': '1' })
    const reload = vi.fn()
    await expect(
      retryImport(() => Promise.reject(CHUNK_ERR()), 'Study', { storage, reload }),
    ).rejects.toThrow(/dynamically imported module/)
    expect(reload).not.toHaveBeenCalled()
  })

  it('clears a stale guard flag on a later success (so a future blip can reload again)', async () => {
    const storage = fakeStorage({ 'chunk-reload:Study': '1' })
    const reload = vi.fn()
    const mod = { default: () => 'ok' }
    await retryImport(() => Promise.resolve(mod), 'Study', { storage, reload })
    expect(storage.getItem('chunk-reload:Study')).toBeNull()
  })

  it('does NOT reload on a non-chunk runtime error — it rethrows so the real bug surfaces', async () => {
    const storage = fakeStorage()
    const reload = vi.fn()
    const bug = new TypeError('boom from inside the component')
    await expect(
      retryImport(() => Promise.reject(bug), 'Study', { storage, reload }),
    ).rejects.toThrow('boom from inside the component')
    expect(reload).not.toHaveBeenCalled()
    expect(storage.getItem('chunk-reload:Study')).toBeNull()
  })

  it('keys the guard flag per-route so two different routes reload independently', () => {
    const storage = fakeStorage()
    const reload = vi.fn()
    retryImport(() => Promise.reject(CHUNK_ERR()), 'Grammar', { storage, reload })
    return Promise.resolve().then(() => {
      expect(storage.getItem('chunk-reload:Grammar')).toBe('1')
      expect(storage.getItem('chunk-reload:Study')).toBeNull()
    })
  })

  it('without storage available, does NOT reload (cannot guard a loop) — rethrows safely', async () => {
    const reload = vi.fn()
    await expect(
      retryImport(() => Promise.reject(CHUNK_ERR()), 'Study', { storage: null, reload }),
    ).rejects.toThrow(/dynamically imported module/)
    expect(reload).not.toHaveBeenCalled()
  })
})
