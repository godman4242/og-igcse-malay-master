// Content-truth pins for the Malay grammar drills. A learning tool ships the
// answer key itself, so a mislabeled morphology rule teaches the wrong thing —
// the worst failure for this app. These guard the `menge-` allomorph, which is
// the most error-prone meN- rule because it applies ONLY to one-syllable
// (ekasuku) roots (cat→mengecat, lap→mengelap, bom→mengebom). Two-syllable
// k-initial roots like "kejar" instead use the k-drop rule (meng- + kejar →
// mengejar), exactly like karang→mengarang.
//
// Web-verified: menge- = one-syllable roots only — kuihbahasa.com/imbuhan-men,
// cikgutancl.blogspot.com/2016/02/informasi-bahasa-imbuhan-menge-dan.html.
import { describe, it, expect } from 'vitest'
import { IMBUHAN_DRILLS, GRAMMAR_RULES } from '../grammar'

// Count Malay syllables ≈ number of vowel groups (runs of a/e/i/o/u). "kejar"
// → e,a → 2; "cat"/"lap"/"bom" → 1. Good enough to assert the ekasuku invariant.
const syllableCount = (word) => (word.toLowerCase().match(/[aeiou]+/g) || []).length

describe('grammar.js — meN- menge- allomorph content truth', () => {
  it('only ever labels a ONE-syllable root with the "menge- + 1-syllable" rule', () => {
    const mengeRoots = IMBUHAN_DRILLS.filter(
      (d) => d.type === 'prefix' && d.rule === 'menge- + 1-syllable',
    )
    expect(mengeRoots.length).toBeGreaterThan(0) // cat, lap — guard against vacuity
    for (const d of mengeRoots) {
      expect(syllableCount(d.root), `${d.root} → ${d.answer} mislabeled menge-`).toBe(1)
    }
  })

  it('teaches "kejar → mengejar" via the k-drop rule, not menge- (kejar is 2 syllables)', () => {
    const kejar = IMBUHAN_DRILLS.find((d) => d.id === 'prefix-meN-kejar')
    expect(kejar).toBeDefined()
    expect(kejar.answer).toBe('mengejar')
    expect(syllableCount(kejar.root)).toBe(2)
    expect(kejar.rule).toBe('meng- + k → k drops')
  })

  it('GRAMMAR_RULES meN- menge- example lists only true monosyllabic forms', () => {
    const menge = GRAMMAR_RULES['meN-'].rules.find((r) => r.pattern.startsWith('menge-'))
    expect(menge).toBeDefined()
    // mengejar is a k-drop form (kejar = 2 syllables) — it must NOT appear here.
    expect(menge.example).not.toMatch(/mengejar/)
    expect(menge.example).toMatch(/mengecat/)
    expect(menge.example).toMatch(/mengelap/)
  })
})
