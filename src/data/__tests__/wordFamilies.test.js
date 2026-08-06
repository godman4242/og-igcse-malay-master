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

  it('does NOT teach "kediaman" as the ke-…-an form of tinggal (it is ke- + DIAM + -an)', () => {
    // A root has one ke-…-an form, and this family claimed TWO — `kediaman`
    // AND `ketinggalan`. PRPM / Kamus Dewan Edisi Keempat settles it:
    //   kediaman   → syllabified "[ke.dia.man]", i.e. ke- + diam + -an. Its
    //                definition is "tempat ~ tempat tinggal (duduk dll), rumah
    //                … yg diduduki" — `tinggal` appears only INSIDE the gloss
    //                as a synonym, which is how the false root crept in.
    //   ketinggalan→ root `tinggal`: "tertinggal (dgn tidak sengaja)",
    //                "terbelakang (dlm pelajaran, kemajuan, dll)".
    // The repo already knew: grammar.test.js pins `transform-noun-tinggal` to
    // prompt the root `diam`, and grammar.js:138 was corrected — wordFamilies
    // was missed, so /word-families and its detail modal ("ke-…-an · from
    // tinggal") taught the derivation the Grammar drill marks wrong.
    expect(words).not.toContain('kediaman')
    const keAn = tinggal.forms.filter((f) => f.type === 'ke-...-an')
    expect(keAn.map((f) => f.word)).toEqual(['ketinggalan'])
  })
})

// Regression net for the bug CLASS above: a derived form filed under a root it
// does not come from shows up as one root claiming two words for one affix
// pattern. Malay does allow this legitimately (peN- has allomorphs), so the
// known-good cases are allow-listed BY NAME rather than the rule being dropped
// — a new collision must be justified here before it can ship.
describe('wordFamilies — one root, one form per affix pattern (allow-listed exceptions)', () => {
  // `ajar` genuinely yields both: pelajar = one who learns (student),
  // pengajar = one who teaches. Same for pelajaran / pengajaran. Both pairs are
  // attested in DBP's Kata Terbitan for `ajar`.
  const ALLOWED = new Set(['ajar|peN-', 'ajar|peN-...-an'])

  it('has no unexplained duplicate-affix collisions', () => {
    const collisions = []
    for (const [root, family] of Object.entries(WORD_FAMILIES)) {
      const byType = {}
      for (const form of family.forms) (byType[form.type] ||= []).push(form.word)
      for (const [type, words] of Object.entries(byType)) {
        if (words.length > 1 && !ALLOWED.has(`${root}|${type}`)) {
          collisions.push(`${root} | ${type} -> ${words.join(', ')}`)
        }
      }
    }
    expect(collisions).toEqual([])
  })

  it('still sees the allow-listed collisions (non-vacuity — the sweep is really running)', () => {
    const ajar = WORD_FAMILIES['ajar'].forms.filter((f) => f.type === 'peN-')
    expect(ajar.map((f) => f.word).sort()).toEqual(['pelajar', 'pengajar'])
  })
})

describe('wordFamilies — aman family content truth', () => {
  const aman = WORD_FAMILIES['aman']
  const pengaman = aman.forms.find((f) => f.word === 'pengaman')

  it('keeps the real, DBP-attested peN- agent noun "pengaman"', () => {
    // pengaman IS a real word (Kamus Dewan Edisi Keempat + Kamus Pelajar) — the
    // peN- agentive of aman (peaceful/safe). Keep it; only the gloss was wrong.
    expect(pengaman).toBeDefined()
    expect(pengaman.type).toBe('peN-')
    expect(pengaman.pos).toBe('noun')
  })

  it('does NOT gloss "pengaman" as the occupational "security guard"', () => {
    // DBP: pengaman = "orang (pihak) yg mengamankan" (one who pacifies/secures;
    // e.g. "tentera pengaman" = peacekeeping force) — NOT an occupational
    // security guard, which is "pengawal keselamatan" / "pengawal".
    expect(pengaman.meaning.toLowerCase()).not.toContain('security guard')
  })

  it('glosses "pengaman" in the peacekeeper/securer sense (DBP)', () => {
    expect(pengaman.meaning.toLowerCase()).toContain('peacekeeper')
  })

  it('keeps the genuine aman derivations (non-vacuity)', () => {
    const words = aman.forms.map((f) => f.word)
    expect(words).toEqual(expect.arrayContaining(['mengamankan', 'keamanan']))
  })
})
