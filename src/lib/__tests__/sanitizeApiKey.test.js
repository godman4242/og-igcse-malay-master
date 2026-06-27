// Pins the API-key sanitiser (geminiClient.mjs sanitizeApiKey). Copy-pasted keys
// sometimes carry invisible characters — U+2028 line separator, U+2029 paragraph
// separator, zero-width spaces, a BOM, or a trailing newline — that are code-point
// > 255 and crash fetch() with a cryptic "Cannot convert argument to a ByteString"
// BEFORE any network call (so 0 quota is spent, but every call fails). The
// sanitiser strips them so a clean key is recovered automatically.
// geminiClient.mjs has no module-level imports, so it loads cleanly under vitest.
//
// The invisible chars are built with String.fromCharCode so the source stays pure
// ASCII (no fragile literal escapes that an editor/tool might normalise away).
import { describe, it, expect } from 'vitest'
import { sanitizeApiKey } from '../../../scripts/ai-tier-eval/geminiClient.mjs'

const LS = String.fromCharCode(0x2028)   // U+2028 LINE SEPARATOR — the exact char that broke the eval
const PS = String.fromCharCode(0x2029)   // U+2029 PARAGRAPH SEPARATOR
const ZWSP = String.fromCharCode(0x200B) // zero-width space
const BOM = String.fromCharCode(0xFEFF)  // byte-order mark

describe('sanitizeApiKey', () => {
  it('leaves a clean ASCII key untouched', () => {
    expect(sanitizeApiKey('AIzaSyCLEANkey')).toBe('AIzaSyCLEANkey')
  })
  it('strips a trailing U+2028 line separator (the exact eval-failure char)', () => {
    expect(sanitizeApiKey('AIzaSyCLEANkey' + LS)).toBe('AIzaSyCLEANkey')
  })
  it('strips an embedded U+2028 (paste artifact mid-key), recovering the key', () => {
    expect(sanitizeApiKey('AIzaSy' + LS + 'CLEANkey')).toBe('AIzaSyCLEANkey')
  })
  it('strips surrounding whitespace and a trailing newline', () => {
    expect(sanitizeApiKey('  AIzaSyCLEANkey\n')).toBe('AIzaSyCLEANkey')
  })
  it('strips zero-width spaces and a BOM', () => {
    expect(sanitizeApiKey(BOM + 'AIza' + ZWSP + 'SyCLEANkey')).toBe('AIzaSyCLEANkey')
  })
  it('returns an empty string for non-string input', () => {
    expect(sanitizeApiKey(undefined)).toBe('')
    expect(sanitizeApiKey(null)).toBe('')
  })
  it('its result is header-safe (no character above code 255)', () => {
    const out = sanitizeApiKey('AIza' + LS + 'Sy' + PS + 'CLEANkey')
    expect([...out].every((c) => c.charCodeAt(0) <= 255)).toBe(true)
  })
})
