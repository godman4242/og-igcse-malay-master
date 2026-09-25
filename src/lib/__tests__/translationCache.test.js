// Namespaced cache keys: the "higher quality" (OpenRouter) glosses must cache
// SEPARATELY from the free MT glosses, or a word already gtx-cached would shadow
// a later quality request (and vice-versa). The namespace is the isolation.

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../config/supabase', () => ({
  readCloudTranslation: vi.fn(async () => null),
  writeCloudTranslation: vi.fn(async () => true),
}))

import { readCloudTranslation, writeCloudTranslation } from '../../config/supabase'
import {
  makeKey, readCache, readCacheSync, writeCache, clearCache,
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

// The cloud cache table is readable by anyone and survives account deletion, and
// /privacy promises it holds "just word pairs … nothing personal". A sentence from
// a learner's own photo, recording or essay must therefore stay on the device.
describe('cloud cache holds single words only', () => {
  beforeEach(async () => { await clearCache(); vi.clearAllMocks() })

  it('a single word goes to the cloud cache when opted in', async () => {
    await writeCache('makan', 'ms', 'en', { text: 'eat', source: 'gtx' }, { cacheToCloud: true })
    expect(writeCloudTranslation).toHaveBeenCalledTimes(1)
  })

  it('a sentence is cached locally but NEVER written to or looked up in the cloud', async () => {
    const sentence = 'Nama saya Aisyah dan saya tinggal di Ipoh.'
    await writeCache(sentence, 'ms', 'en', { text: 'My name is Aisyah…', source: 'gtx' }, { cacheToCloud: true })
    expect(writeCloudTranslation).not.toHaveBeenCalled()
    expect(readCacheSync(sentence, 'ms', 'en')).toEqual({ text: 'My name is Aisyah…', source: 'gtx' })

    await readCache('Saya suka membaca buku.', 'ms', 'en', { cacheToCloud: true })
    expect(readCloudTranslation).not.toHaveBeenCalled()
  })
})
