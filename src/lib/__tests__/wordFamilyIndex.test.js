import { describe, it, expect } from 'vitest'
import WORD_FAMILIES from '../../data/wordFamilies.js'
import { getEntryById } from '../../data/cikguKnowledge.js'
import {
  AFFIX_MEANINGS,
  affixMeaning,
  affixTypesInData,
  familyOf,
  normalizeWord,
} from '../wordFamilyIndex.js'

// GOAL #61 — word → family lookup + what each affix does (A6 Phase 2 foundation).
// Measured at HEAD 2026-10-01: 41 roots / 205 forms / 22 type labels. The pins
// below force a re-measure (and a new AFFIX_MEANINGS line) when the data grows.
const ROOTS = Object.keys(WORD_FAMILIES)
const ALL_FORMS = ROOTS.flatMap((r) => WORD_FAMILIES[r].forms.map((f) => ({ root: r, ...f })))

describe('wordFamilyIndex — data shape pins (re-measure when these move)', () => {
  it('41 roots / 205 forms / 22 affix types at HEAD', () => {
    expect(ROOTS).toHaveLength(41)
    expect(ALL_FORMS).toHaveLength(205)
    expect(affixTypesInData()).toHaveLength(22)
  })

  it('no form belongs to two roots, and no form is also a root (lookups stay deterministic)', () => {
    const seen = new Map()
    for (const f of ALL_FORMS) {
      const key = normalizeWord(f.word)
      expect(seen.get(key), `"${f.word}" listed under both ${seen.get(key)} and ${f.root}`).toBeUndefined()
      seen.set(key, f.root)
      expect(WORD_FAMILIES[key], `"${f.word}" is both a form and a root`).toBeUndefined()
    }
  })
})

describe('AFFIX_MEANINGS — one learner line per type label', () => {
  it('every type used in the data has a meaning, and no meaning is for an unused type', () => {
    const used = affixTypesInData().sort()
    const explained = Object.keys(AFFIX_MEANINGS).sort()
    expect(explained).toEqual(used) // a new `type` in wordFamilies.js fails here until it gets a line
  })

  it('each line is short (≤14 words), non-empty and ends with a full stop', () => {
    for (const [type, line] of Object.entries(AFFIX_MEANINGS)) {
      expect(typeof line, type).toBe('string')
      expect(line.trim().split(/\s+/).length, `${type}: "${line}"`).toBeLessThanOrEqual(14)
      expect(line.endsWith('.'), `${type}: "${line}"`).toBe(true)
    }
  })

  // Each row ties a line to the REAL Cikgu Maya entry (imported, not hand-copied): the
  // entry must exist, its answer must still teach the idea, and the line must say it.
  it.each([
    ['meN-', 'imbuhan-men', /active verb/i, /^Active verb/],
    ['di-', 'imbuhan-di', /passive/i, /^Passive/],
    ['ter-', 'imbuhan-ter', /superlative[\s\S]*accidental/i, /^Most[\s\S]*accident/],
    ['peN-', 'imbuhan-pen', /person who does/i, /person or tool/],
    ['ber-', 'imbuhan-ber', /state[\s\S]*intransitive/i, /state[\s\S]*no object/],
    ['meN-...-kan', 'imbuhan-kan', /cause\/make[\s\S]*for someone/i, /make it happen[\s\S]*for someone/],
    ['meN-...-i', 'imbuhan-i', /location/i, /place or person/],
    ['-an', 'imbuhan-an', /result of action/i, /result/],
    ['per-...-an', 'imbuhan-an', /noun of a ber- verb/i, /ber- verb/],
    ['ke-...-an', 'imbuhan-ke-an', /abstract nouns/i, /^Abstract noun/],
    ['se-', 'imbuhan-se', /as\.\.\.as/i, /as \.\.\. as/],
  ])('%s matches cikguKnowledge entry %s', (type, id, answerRe, lineRe) => {
    const entry = getEntryById(id)
    expect(entry, id).toBeTruthy()
    expect(entry.answer, `${id} answer`).toMatch(answerRe)
    expect(AFFIX_MEANINGS[type], type).toMatch(lineRe)
  })

  it('ter- covers the superlative forms the data holds (terbaik/tertinggi/terindah are "most")', () => {
    for (const w of ['terbaik', 'tertinggi', 'terindah']) {
      expect(familyOf(w).form.type, w).toBe('ter-')
    }
    expect(AFFIX_MEANINGS['ter-']).toMatch(/^Most/)
  })

  it('ke-...-an names the VERB use the data holds (kedengaran, ketinggalan) — GOAL #66', () => {
    // Kamus Dewan Edisi Keempat: kedengaran = "(dapat) didengar, terdengar" —
    // a ke-...-an passive verb (Tatabahasa Dewan: "can be" / "suffer"), not an adjective.
    for (const w of ['kedengaran', 'ketinggalan']) expect(familyOf(w).form.pos, w).toBe('verb')
    expect(AFFIX_MEANINGS['ke-...-an']).toMatch(/verbs: can be heard \(kedengaran\)/)
    expect(AFFIX_MEANINGS['ke-...-an']).not.toMatch(/adjective/)
  })

  it('affixMeaning() returns the line, or null for an unknown label', () => {
    expect(affixMeaning('meN-')).toBe(AFFIX_MEANINGS['meN-'])
    expect(affixMeaning('xx-')).toBeNull()
    expect(affixMeaning(undefined)).toBeNull()
  })

  it('is frozen — a consumer cannot edit a meaning at runtime', () => {
    expect(Object.isFrozen(AFFIX_MEANINGS)).toBe(true)
  })
})

describe('familyOf — every derived form of every root', () => {
  it.each(ALL_FORMS.map((f) => [f.word, f.root]))('%s → root %s', (word, root) => {
    const fam = WORD_FAMILIES[root]
    const res = familyOf(word)
    expect(res).not.toBeNull()
    expect(res.root).toBe(root)
    expect(res.rootMeaning).toBe(fam.meaning)
    expect(res.form.word).toBe(word)
    expect(AFFIX_MEANINGS[res.form.type], `type ${res.form.type}`).toBeTruthy()
    // siblings = the root's other forms, in data order, never the word itself
    expect(res.siblings).toHaveLength(fam.forms.length - 1)
    expect(res.siblings.map((s) => s.word)).not.toContain(word)
    expect(res.siblings.map((s) => s.word)).toEqual(fam.forms.map((s) => s.word).filter((w) => w !== word))
  })

  it('returns exactly the four documented keys', () => {
    expect(Object.keys(familyOf('menulis')).sort()).toEqual(['form', 'root', 'rootMeaning', 'siblings'])
  })

  it('a worked example the word panel will render', () => {
    expect(familyOf('bekerja')).toMatchObject({
      root: 'kerja',
      rootMeaning: 'work',
      form: { word: 'bekerja', type: 'ber-', pos: 'verb' },
    })
    expect(familyOf('bekerja').siblings.map((s) => s.word)).toEqual([
      'mengerjakan', 'pekerja', 'pekerjaan', 'sekerja',
    ])
  })
})

describe('familyOf — null for every root and for unknown input (the chip never shows on a root)', () => {
  it.each(ROOTS)('root "%s" → null', (root) => {
    expect(familyOf(root)).toBeNull()
  })

  it('unknown words and non-words → null', () => {
    for (const w of ['kelapa', 'xyzzy', 'penjadi', '', '   ', 'the', 'menulis-menulis']) {
      expect(familyOf(w), JSON.stringify(w)).toBeNull()
    }
    for (const v of [null, undefined, 42, {}, [], true]) expect(familyOf(v)).toBeNull()
  })

})

describe('familyOf — input normalisation', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(familyOf('  Menulis ')).toMatchObject({ root: 'tulis' })
    expect(familyOf('MENULIS')).toMatchObject({ root: 'tulis' })
    expect(familyOf('\tditulis\n')).toMatchObject({ root: 'tulis' })
    expect(familyOf('TULIS ')).toBeNull() // still a root after normalising
  })

  it('collapses inner whitespace for a two-word form', () => {
    expect(familyOf('pejalan   kaki')).toMatchObject({ root: 'jalan', form: { word: 'pejalan kaki' } })
    expect(familyOf('Pejalan Kaki')).toMatchObject({ root: 'jalan' })
  })

  it('does not strip punctuation — a headword is matched by its own spelling', () => {
    expect(familyOf('menulis.')).toBeNull()
    expect(familyOf('(menulis)')).toBeNull()
  })

  it('normalizeWord: non-strings and blanks → null', () => {
    expect(normalizeWord(null)).toBeNull()
    expect(normalizeWord(7)).toBeNull()
    expect(normalizeWord('  ')).toBeNull()
    expect(normalizeWord(' A  B ')).toBe('a b')
  })
})

describe('familyOf — does not leak mutable state', () => {
  it('siblings is a fresh array per call (editing it cannot corrupt the next lookup)', () => {
    const a = familyOf('menulis')
    a.siblings.length = 0
    expect(familyOf('menulis').siblings.length).toBe(WORD_FAMILIES.tulis.forms.length - 1)
  })
})
