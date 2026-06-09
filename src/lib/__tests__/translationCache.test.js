// Namespaced cache keys: the "higher quality" (OpenRouter) glosses must cache
// SEPARATELY from the free MT glosses, or a word already gtx-cached would shadow
// a later quality request (and vice-versa). The namespace is the isolation.

import { describe, it, expect, beforeEach } from 'vitest'
import {
  makeKey, readCacheSync, writeCache, clearCache,
} from '../translationCache.js'

describe('makeKey — namespaced cache keys', () => {
  it('default namespace matches the legacy key format exactly (no behaviour change)', () => {
    expect(makeKey('Makan', 'ms', 'en')).toBe('ms:en:makan')
    expect(makeKey('  Makan  ', 'ms', 'en')).toBe('ms:en:makan')
    expect(makeKey('Makan', 'ms', 'en', '')).toBe('ms:en:makan')
  })

  it('a non-empty namespace produces a DIFFERENT key for the same text', () => {
    const free = makeKey('makan', 'ms', 'en', '')
    const quality = makeKey('makan', 'ms', 'en', 'q')
    expect(quality).not.toBe(free)
  })
})

describe('cache read/write namespace isolation', () => {
  beforeEach(async () => { await clearCache() })

  it('a value written under ns="q" is NOT visible to a free (ns="") read', async () => {
    await writeCache('makan', 'ms', 'en', { text: 'to eat (formal)', source: 'openrouter' }, {}, 'q')
    expect(readCacheSync('makan', 'ms', 'en', 'q')).toEqual({ text: 'to eat (formal)', source: 'openrouter' })
    expect(readCacheSync('makan', 'ms', 'en', '')).toBeNull()
    expect(readCacheSync('makan', 'ms', 'en')).toBeNull()
  })

  it('a free value does NOT leak into the quality namespace', async () => {
    await writeCache('minum', 'ms', 'en', { text: 'drink', source: 'gtx' }, {}, '')
    expect(readCacheSync('minum', 'ms', 'en')).toEqual({ text: 'drink', source: 'gtx' })
    expect(readCacheSync('minum', 'ms', 'en', 'q')).toBeNull()
  })
})
