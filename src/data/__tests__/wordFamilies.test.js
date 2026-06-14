import { describe, it, expect } from 'vitest'
import WORD_FAMILIES from '../wordFamilies.js'

// Content-truth guard for the word-family explorer (WordFamilies.jsx renders
// every `forms[].word` to the student as a legitimate derivation of the root).
// A fabricated / non-DBP word taught here is the same confident-wrong failure
// class as the prior `penjadi` non-word fix.
describe('wordFamilies — didik family content truth', () => {
  const didik = WORD_FAMILIES['didik']
  const words = didik.forms.map((f) => f.word)

  it('does NOT teach the non-word "berdidik"', () => {
    // DBP (prpm.dbp.gov.my) returns no entry for "berdidik" — it is not a
    // standard Malay word. The attested ber- "educated" forms are
    // "berpendidikan"/"berpelajaran"; the direct ter- derivation is "terdidik".
    expect(words).not.toContain('berdidik')
  })

  it('teaches the attested ter- form "terdidik" (DBP: educated/well-trained)', () => {
    const terdidik = didik.forms.find((f) => f.word === 'terdidik')
    expect(terdidik).toBeDefined()
    expect(terdidik.type).toBe('ter-')
    expect(terdidik.pos).toBe('adj')
  })

  it('keeps the genuine didik derivations (non-vacuity)', () => {
    expect(words).toEqual(
      expect.arrayContaining(['mendidik', 'dididik', 'pendidik', 'pendidikan']),
    )
  })
})

describe('wordFamilies — sihat family content truth', () => {
  const sihat = WORD_FAMILIES['sihat']
  const words = sihat.forms.map((f) => f.word)

  it('does NOT teach the non-word "penyihat"', () => {
    // DBP (prpm.dbp.gov.my) returns no entry for the bare peN- agent noun
    // "penyihat". DBP's official "Kata Terbitan" (derived-words) list for the
    // root sihat is menyihatkan / kesihatan / penyihatan — penyihat is absent.
    // The real "healer" is "penyembuh" (root sembuh), not a sihat derivation.
    expect(words).not.toContain('penyihat')
  })

  it('teaches the attested peN-...-an form "penyihatan" (DBP: act of making healthy)', () => {
    // DBP Kamus Dewan: penyihatan = "perbuatan atau perihal menyihatkan"
    // (the act of making healthy), e.g. "Vitamin membantu penyihatan badan".
    const penyihatan = sihat.forms.find((f) => f.word === 'penyihatan')
    expect(penyihatan).toBeDefined()
    expect(penyihatan.type).toBe('peN-...-an')
    expect(penyihatan.pos).toBe('noun')
  })

  it('keeps the genuine sihat derivations (non-vacuity)', () => {
    expect(words).toEqual(expect.arrayContaining(['menyihatkan', 'kesihatan']))
  })
})

describe('wordFamilies — tinggal family content truth', () => {
  const tinggal = WORD_FAMILIES['tinggal']
  const words = tinggal.forms.map((f) => f.word)

  it('does NOT teach "bertinggal" with the fabricated meaning "to reside"', () => {
    // DBP (prpm.dbp.gov.my) DOES list "bertinggal", but it means
    // "~ kata = berpesan (sebelum berangkat)" (to leave parting words before
    // departing) — NOT "to reside (formal)". The fabricated gloss mis-teaches a
    // real word; "to reside" is "menetap"/"bermastautin". bertinggal is also
    // absent from DBP's official "Kata Terbitan" list for the root tinggal.
    expect(words).not.toContain('bertinggal')
  })

  it('teaches the attested meN- form "meninggal" (DBP: to pass away/die)', () => {
    // DBP lists "meninggal" in the Kata Terbitan for tinggal:
    // meninggal (dunia) = "kembali ke rahmatullah, mati" (to pass away).
    // meN- + tinggal → t-drop → meninggal, mirroring meninggalkan already here.
    const meninggal = tinggal.forms.find((f) => f.word === 'meninggal')
    expect(meninggal).toBeDefined()
    expect(meninggal.type).toBe('meN-')
    expect(meninggal.pos).toBe('verb')
  })

  it('keeps the genuine tinggal derivations (non-vacuity)', () => {
    expect(words).toEqual(
      expect.arrayContaining(['meninggalkan', 'ditinggalkan', 'peninggalan']),
    )
  })
})
