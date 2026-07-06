// Trust boundary for deck sharing (review #15). A shared payload is UNTRUSTED
// input — sanitiseDeck is the one gate that decides what a link/file can inject.

import { describe, it, expect } from 'vitest'
import {
  sanitiseDeck, encodeDeckParam, decodeDeckParam,
  deckFileContent, parseDeckFile, shareTargetFor,
  MAX_SHARED_CARDS, MAX_FIELD_LEN, SAFE_URL_LEN,
} from '../sharedDeck'

const card = (m, e, t = 'Shared', lang = 'ms') => ({ m, e, t, lang })

describe('sanitiseDeck — whitelist only', () => {
  it('keeps exactly {m,e,t,lang} and drops everything else (FSRS, __proto__, junk)', () => {
    const raw = { v: 1, cards: [{
      m: 'rumah', e: 'house', t: 'Home', lang: 'ms',
      due: '2020-01-01', stability: 9, reps: 7, state: 2, // FSRS — must NOT survive
      foo: 'bar', '__proto__': { polluted: true },        // junk / pollution attempt
    }] }
    const { cards } = sanitiseDeck(raw)
    expect(cards).toHaveLength(1)
    expect(Object.keys(cards[0]).sort()).toEqual(['e', 'lang', 'm', 't'])
    expect(cards[0].due).toBeUndefined()
    expect(({}).polluted).toBeUndefined() // no prototype pollution
  })

  it('drops entries missing m or e', () => {
    const { cards } = sanitiseDeck({ cards: [card('rumah', 'house'), { m: '', e: 'x' }, { m: 'y', e: '' }, { t: 'nope' }] })
    expect(cards.map(c => c.m)).toEqual(['rumah'])
  })

  it('caps the card count', () => {
    const many = Array.from({ length: MAX_SHARED_CARDS + 50 }, (_, i) => card(`w${i}`, `g${i}`))
    expect(sanitiseDeck({ cards: many }).cards).toHaveLength(MAX_SHARED_CARDS)
  })

  it('caps field length', () => {
    const long = 'x'.repeat(MAX_FIELD_LEN + 100)
    const { cards } = sanitiseDeck({ cards: [card(long, long, long)] })
    expect(cards[0].m.length).toBe(MAX_FIELD_LEN)
    expect(cards[0].e.length).toBe(MAX_FIELD_LEN)
  })

  it('normalises lang to ms|en (unknown → ms)', () => {
    const { cards } = sanitiseDeck({ cards: [card('a', 'b', 'D', 'en'), card('c', 'd', 'D', 'EN'), card('e', 'f', 'D', 'fr'), { m: 'g', e: 'h' }] })
    expect(cards.map(c => c.lang)).toEqual(['en', 'en', 'ms', 'ms'])
  })

  it('accepts a bare array too, and returns empty for garbage', () => {
    expect(sanitiseDeck([card('a', 'b')]).cards).toHaveLength(1)
    expect(sanitiseDeck(null).cards).toEqual([])
    expect(sanitiseDeck({ cards: 'nope' }).cards).toEqual([])
  })
})

describe('encode/decode round-trip', () => {
  it('decodeDeckParam(encodeDeckParam(cards)) recovers the sanitised deck', () => {
    const cards = [card('rumah', 'house', 'Home'), card('kucing', 'cat', 'Home')]
    const b64 = encodeDeckParam(cards)
    expect(decodeDeckParam(b64).cards).toEqual(cards)
  })

  it('encodes URL-safe (no + / = that corrupt a query string)', () => {
    const b64 = encodeDeckParam(Array.from({ length: 40 }, (_, i) => card(`perkataan${i}`, `word${i}`)))
    expect(b64).not.toMatch(/[+/=]/)
  })

  it('round-trips non-ASCII (diacritics / emoji) intact', () => {
    const cards = [card('café', 'kedai kopi ☕'), card('naïve', 'naif')]
    expect(decodeDeckParam(encodeDeckParam(cards)).cards).toEqual(cards)
  })

  it('malformed base64 / JSON → null (no throw to the caller)', () => {
    expect(decodeDeckParam('!!!not base64!!!')).toBeNull()
    expect(decodeDeckParam(encodeDeckParam([]))?.cards).toEqual([]) // empty is valid, not null
    expect(decodeDeckParam('')).toBeNull()
  })
})

describe('file transport', () => {
  it('parseDeckFile round-trips deckFileContent', () => {
    const cards = [card('rumah', 'house')]
    expect(parseDeckFile(deckFileContent(cards)).cards).toEqual(cards)
  })
  it('parseDeckFile on non-JSON → null', () => {
    expect(parseDeckFile('not json at all')).toBeNull()
  })
})

describe('shareTargetFor — link vs file by size', () => {
  const base = 'https://app.test/settings'
  it('a small deck shares as a link', () => {
    const t = shareTargetFor([card('rumah', 'house')], base)
    expect(t.mode).toBe('link')
    expect(t.url).toContain('?deck=')
    expect(t.url.length).toBeLessThanOrEqual(SAFE_URL_LEN)
  })
  it('a large deck falls back to a downloadable file', () => {
    const many = Array.from({ length: 150 }, (_, i) => card(`perkataanpanjang${i}`, `a rather long english gloss number ${i}`))
    const t = shareTargetFor(many, base)
    expect(t.mode).toBe('file')
    expect(t.filename).toMatch(/\.deck\.json$/)
    expect(parseDeckFile(t.content).cards.length).toBe(150)
  })
})
