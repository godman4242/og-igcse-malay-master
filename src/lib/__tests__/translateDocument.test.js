import { describe, it, expect, vi } from 'vitest'
import {
  normalizeWord,
  collectDocTokens,
  chunkTexts,
  backoffDelay,
  groundGloss,
  translateDocument,
} from '../translateDocument.js'
import { buildGroundingIndex } from '../dictionaryGrounding.js'

// RED handoff for "Translate the whole document, free" — Step 1/2 of
// docs/superpowers/plans/2026-06-08-translate-document.md.
// The implementation module `../translateDocument.js` does NOT exist yet on
// purpose: these tests are the agreed contract. Pure logic only, no DOM/network
// (the runner takes an injected `translateBatch` so it stays unit-testable).

describe('normalizeWord — lowercase + strip surrounding punctuation, keep internals', () => {
  it('lowercases', () => {
    expect(normalizeWord('SAYA')).toBe('saya')
  })
  it('strips leading/trailing punctuation', () => {
    expect(normalizeWord('air,')).toBe('air')
    expect(normalizeWord('"Selamat"')).toBe('selamat')
    expect(normalizeWord('(makan).')).toBe('makan')
  })
  it('keeps internal hyphens and apostrophes', () => {
    expect(normalizeWord('alat-alat')).toBe('alat-alat')
    expect(normalizeWord("don't")).toBe("don't")
  })
  it('returns empty string for punctuation-only / blank input', () => {
    expect(normalizeWord('...')).toBe('')
    expect(normalizeWord('   ')).toBe('')
    expect(normalizeWord('')).toBe('')
  })
})

describe('collectDocTokens — dedupe, skip dictionary-known, skip cache hits', () => {
  const dict = { air: 'water', saya: 'I/me' }

  it('returns empty result for no tokens', () => {
    expect(collectDocTokens([], dict)).toEqual({ toTranslate: [], knownCount: 0, cachedCount: 0 })
  })

  it('keeps only unknown words and normalizes them', () => {
    const tokens = [{ word: 'Rumah' }, { word: 'besar,' }]
    const r = collectDocTokens(tokens, dict)
    expect(r.toTranslate).toEqual(['rumah', 'besar'])
    expect(r.knownCount).toBe(0)
  })

  it('skips dictionary-known words (counted, not translated) — punctuation-insensitive', () => {
    const tokens = [{ word: 'air,' }, { word: 'Saya' }, { word: 'pokok' }]
    const r = collectDocTokens(tokens, dict)
    expect(r.toTranslate).toEqual(['pokok'])
    expect(r.knownCount).toBe(2)
  })

  it('dedupes case- and punctuation-insensitively, preserving first-seen order', () => {
    const tokens = [{ word: 'Pokok' }, { word: 'pokok.' }, { word: 'besar' }, { word: 'POKOK' }]
    const r = collectDocTokens(tokens, dict)
    expect(r.toTranslate).toEqual(['pokok', 'besar'])
  })

  it('skips words already in the translation cache via cacheLookup', () => {
    const cacheLookup = vi.fn((w) => w === 'pokok')
    const tokens = [{ word: 'pokok' }, { word: 'tinggi' }]
    const r = collectDocTokens(tokens, dict, { cacheLookup })
    expect(r.toTranslate).toEqual(['tinggi'])
    expect(r.cachedCount).toBe(1)
    expect(cacheLookup).toHaveBeenCalledWith('pokok')
  })

  it('ignores punctuation-only tokens entirely (not counted)', () => {
    const tokens = [{ word: '—' }, { word: '...' }, { word: 'rumah' }]
    const r = collectDocTokens(tokens, dict)
    expect(r.toTranslate).toEqual(['rumah'])
    expect(r.knownCount).toBe(0)
    expect(r.cachedCount).toBe(0)
  })

  it('also accepts plain-string tokens (not just {word} objects)', () => {
    const r = collectDocTokens(['rumah', 'air'], dict)
    expect(r.toTranslate).toEqual(['rumah'])
    expect(r.knownCount).toBe(1)
  })
})

describe('chunkTexts — never exceed char/item caps, never split a word', () => {
  it('returns [] for empty input', () => {
    expect(chunkTexts([])).toEqual([])
  })

  it('groups small words into one chunk under the limits', () => {
    expect(chunkTexts(['aaa', 'bbb'], { maxChars: 100, maxItems: 100 })).toEqual([['aaa', 'bbb']])
  })

  it('starts a new chunk when the char budget would be exceeded', () => {
    expect(chunkTexts(['aaa', 'bbb', 'ccc'], { maxChars: 7, maxItems: 100 }))
      .toEqual([['aaa', 'bbb'], ['ccc']])
  })

  it('starts a new chunk when the item count would be exceeded', () => {
    expect(chunkTexts(['a', 'b', 'c', 'd', 'e'], { maxChars: 1000, maxItems: 2 }))
      .toEqual([['a', 'b'], ['c', 'd'], ['e']])
  })

  it('never splits a word — an over-long word gets its own chunk', () => {
    expect(chunkTexts(['x', 'aaaaaa', 'y'], { maxChars: 3, maxItems: 100 }))
      .toEqual([['x'], ['aaaaaa'], ['y']])
  })

  it('flattening the chunks preserves the original order', () => {
    const words = ['satu', 'dua', 'tiga', 'empat', 'lima']
    const flat = chunkTexts(words, { maxChars: 9, maxItems: 100 }).flat()
    expect(flat).toEqual(words)
  })
})

describe('backoffDelay — deterministic exponential schedule, capped', () => {
  it('uses the default base/factor/max', () => {
    expect(backoffDelay(0)).toBe(500)
    expect(backoffDelay(1)).toBe(1000)
    expect(backoffDelay(2)).toBe(2000)
    expect(backoffDelay(3)).toBe(4000)
    expect(backoffDelay(4)).toBe(8000)
  })
  it('caps at max', () => {
    expect(backoffDelay(5)).toBe(8000)
    expect(backoffDelay(99)).toBe(8000)
  })
  it('honours custom params', () => {
    expect(backoffDelay(0, { base: 100, factor: 3, max: 5000 })).toBe(100)
    expect(backoffDelay(2, { base: 100, factor: 3, max: 5000 })).toBe(900)
    expect(backoffDelay(10, { base: 100, factor: 3, max: 5000 })).toBe(5000)
  })
})

describe('groundGloss — render-ready decision wrapping verifyPair', () => {
  // owned (high) + a Wikidata-tier (medium) entry
  const index = buildGroundingIndex(
    [{ m: 'air', e: 'water' }, { m: 'anda', e: 'you (formal)' }],
    [],
    [{ m: 'pokok', e: 'tree' }],
  )

  it('owned-verified gloss: verified high, no marker, displays the canonical', () => {
    expect(groundGloss('air', 'water', index)).toMatchObject({
      display: 'water', verified: true, confidence: 'high', canonicalEn: 'water', marker: null,
    })
  })

  it('Wikidata-tier gloss verifies at medium with no marker', () => {
    expect(groundGloss('pokok', 'tree', index)).toMatchObject({
      verified: true, confidence: 'medium', marker: null,
    })
  })

  it('matches a single sense split out of a multi-sense entry', () => {
    // entry is "you (formal)"; the bare "you" sense must still verify, and we
    // prefer the canonical display string.
    expect(groundGloss('anda', 'you', index)).toMatchObject({
      verified: true, display: 'you (formal)', marker: null,
    })
  })

  it('known word but wrong meaning → mismatch marker + canonical shown instead', () => {
    expect(groundGloss('air', 'liquid', index)).toMatchObject({
      verified: false, marker: 'mismatch', canonicalEn: 'water', display: 'water',
    })
  })

  it('unknown word → unverified marker, machine output is all we have', () => {
    const r = groundGloss('blahblah', 'gibberish', index)
    expect(r).toMatchObject({ verified: false, marker: 'unverified', display: 'gibberish' })
    expect(r.canonicalEn).toBeUndefined()
  })
})

describe('translateDocument — chunked, progress-reporting, retrying, abortable runner', () => {
  const okBatch = (chunk) => Promise.resolve(chunk.map((w) => ({ text: `${w}-en`, source: 'gtx' })))

  it('translates every word across chunks and maps results by word', async () => {
    const translateBatch = vi.fn(okBatch)
    const out = await translateDocument(['satu', 'dua', 'tiga'], { translateBatch, maxItems: 2 })
    expect(out).toEqual({
      satu: { text: 'satu-en', source: 'gtx' },
      dua: { text: 'dua-en', source: 'gtx' },
      tiga: { text: 'tiga-en', source: 'gtx' },
    })
    expect(translateBatch).toHaveBeenCalledTimes(2) // [satu,dua] then [tiga]
  })

  it('reports cumulative progress after each chunk', async () => {
    const onProgress = vi.fn()
    await translateDocument(['a', 'b', 'c', 'd', 'e'], {
      translateBatch: vi.fn(okBatch), onProgress, maxItems: 2,
    })
    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([
      { done: 2, total: 5 }, { done: 4, total: 5 }, { done: 5, total: 5 },
    ])
  })

  it('retries a failing chunk with backoff, then succeeds', async () => {
    let calls = 0
    const translateBatch = vi.fn((chunk) => {
      calls += 1
      if (calls === 1) return Promise.reject(new Error('429'))
      return okBatch(chunk)
    })
    const delay = vi.fn(() => Promise.resolve())
    const out = await translateDocument(['kucing'], { translateBatch, delay })
    expect(translateBatch).toHaveBeenCalledTimes(2)
    expect(delay).toHaveBeenCalledTimes(1)
    expect(delay).toHaveBeenCalledWith(500) // backoffDelay(0)
    expect(out.kucing).toEqual({ text: 'kucing-en', source: 'gtx' })
  })

  it('marks words as errored after exhausting retries', async () => {
    const translateBatch = vi.fn(() => Promise.reject(new Error('boom')))
    const delay = vi.fn(() => Promise.resolve())
    const out = await translateDocument(['x'], { translateBatch, delay, maxRetries: 2 })
    expect(translateBatch).toHaveBeenCalledTimes(3) // attempts 0,1,2
    expect(delay).toHaveBeenCalledTimes(2)
    expect(out.x).toMatchObject({ source: 'error' })
  })

  it('does nothing when the signal is already aborted', async () => {
    const translateBatch = vi.fn(okBatch)
    const controller = new AbortController()
    controller.abort()
    const out = await translateDocument(['a', 'b'], { translateBatch, signal: controller.signal })
    expect(out).toEqual({})
    expect(translateBatch).not.toHaveBeenCalled()
  })

  it('stops at the next chunk boundary when aborted mid-run (returns partial)', async () => {
    const controller = new AbortController()
    const translateBatch = vi.fn((chunk) => {
      controller.abort() // abort during the first chunk
      return okBatch(chunk)
    })
    const out = await translateDocument(['a', 'b', 'c', 'd'], {
      translateBatch, signal: controller.signal, maxItems: 2,
    })
    expect(translateBatch).toHaveBeenCalledTimes(1) // second chunk skipped
    expect(out).toEqual({ a: { text: 'a-en', source: 'gtx' }, b: { text: 'b-en', source: 'gtx' } })
  })
})
