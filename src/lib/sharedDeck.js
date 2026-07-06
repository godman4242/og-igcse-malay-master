// Shared-deck transport + TRUST BOUNDARY (review #15). A `?deck=` link or a
// `.deck.json` file is UNTRUSTED input from another person — sanitiseDeck is the
// single gate that decides what it may inject into the store. It whitelists
// exactly {m,e,t,lang} (never FSRS scheduling fields, never arbitrary keys),
// caps size, and normalises language, so a malicious or corrupt payload can't
// corrupt scheduling, pollute prototypes, or jank the app. Pure: no DOM, no store.

export const MAX_SHARED_CARDS = 200
export const MAX_FIELD_LEN = 200
export const SAFE_URL_LEN = 1800 // cross-browser-safe query length
const ENVELOPE_VERSION = 1

function clampStr(v) {
  if (v == null) return ''
  const s = typeof v === 'string' ? v : String(v)
  return s.trim().slice(0, MAX_FIELD_LEN)
}

function normLang(v) {
  return String(v ?? '').toLowerCase().trim() === 'en' ? 'en' : 'ms'
}

/** Sanitise an untrusted payload (envelope `{v,cards}` OR a bare array) → `{cards}`. */
export function sanitiseDeck(raw) {
  const list = Array.isArray(raw)
    ? raw
    : (raw && Array.isArray(raw.cards) ? raw.cards : [])
  const cards = []
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    const m = clampStr(c.m)
    const e = clampStr(c.e)
    if (!m || !e) continue // a card with no word or no gloss is meaningless
    cards.push({ m, e, t: clampStr(c.t), lang: normLang(c.lang) })
    if (cards.length >= MAX_SHARED_CARDS) break
  }
  return { cards }
}

// UTF-8-safe base64url (the `encodeURIComponent`/`escape` bridge handles
// non-ASCII; base64url keeps the payload intact inside a query string, unlike
// the old raw-base64 button whose +//= corrupted on paste).
function toB64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  return decodeURIComponent(escape(atob(padded)))
}

/** cards → URL-safe base64 of `{v,cards}` (for a `?deck=` link). */
export function encodeDeckParam(cards) {
  const env = { v: ENVELOPE_VERSION, cards: sanitiseDeck({ cards }).cards }
  return toB64url(JSON.stringify(env))
}

/** `?deck=` value → sanitised `{cards}`, or null when malformed. */
export function decodeDeckParam(b64) {
  if (typeof b64 !== 'string' || !b64) return null
  try {
    return sanitiseDeck(JSON.parse(fromB64url(b64)))
  } catch {
    return null
  }
}

/** cards → a human-portable `.deck.json` string (for large decks). */
export function deckFileContent(cards) {
  return JSON.stringify({ v: ENVELOPE_VERSION, cards: sanitiseDeck({ cards }).cards }, null, 2)
}

/** `.deck.json` text → sanitised `{cards}`, or null when malformed. */
export function parseDeckFile(text) {
  if (typeof text !== 'string' || !text.trim()) return null
  try {
    return sanitiseDeck(JSON.parse(text))
  } catch {
    return null
  }
}

/**
 * Pick the transport by size: a link when it stays under the safe URL length,
 * else a downloadable file (so any deck size shares).
 * @returns {{mode:'link', url:string} | {mode:'file', filename:string, content:string}}
 */
export function shareTargetFor(cards, baseUrl) {
  const sane = sanitiseDeck({ cards }).cards
  const url = `${baseUrl}?deck=${encodeDeckParam(sane)}`
  if (url.length <= SAFE_URL_LEN) return { mode: 'link', url }
  return {
    mode: 'file',
    filename: `shared-deck-${sane.length}-words.deck.json`,
    content: deckFileContent(sane),
  }
}
