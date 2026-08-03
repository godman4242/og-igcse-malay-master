import { describe, it, expect } from 'vitest'
import EXEMPLARS from '../exemplars.js'

// Content-truth (axis-1): the ms-directed (directed-writing) band-6 exemplar opened with
// "Dasar perdana," — a NOUN PHRASE meaning "dasar/prinsip utama" ("principal/foremost
// policy"), NOT a discourse marker — yet was tagged category:'cohesion' and rendered by
// ExemplarPanel as a highlighted model connector. The correct, web-verified penanda wacana
// is "Pada dasarnya," ("Fundamentally/Basically,").
// Verified vs Malay penanda-wacana authorities (ms.wikipedia "Penanda wacana",
// studentportal.my, ecentral.my) 2026-06-21: "pada dasarnya" is a recognised opening
// marker; "dasar perdana" is not — it is a frasa nama (noun phrase), grammatically broken
// as a sentence-opening connector.
describe('exemplars content-truth — ms-directed opening connector', () => {
  const msDirected = EXEMPLARS['ms-directed']

  it('opens with the valid penanda wacana "Pada dasarnya," not the noun phrase "Dasar perdana,"', () => {
    expect(msDirected.opening).toMatch(/^Pada dasarnya,/)
    expect(msDirected.opening).not.toContain('Dasar perdana')
  })

  it('annotates "Pada dasarnya," as the cohesion marker (coordinated with the opening text)', () => {
    const cohesion = msDirected.annotations.filter(a => a.category === 'cohesion').map(a => a.phrase)
    expect(cohesion).toContain('Pada dasarnya,')
    expect(msDirected.annotations.map(a => a.phrase)).not.toContain('Dasar perdana,')
  })
})

// Structural guard (the bug class): every annotation phrase MUST appear verbatim in the
// opening/closing or ExemplarPanel's highlighter silently drops it (exemplars.js header
// invariant). This locks the coordination between a fixed text and its annotation.
describe('exemplars — every annotation phrase appears verbatim in its text', () => {
  it('finds each annotation phrase in opening+closing for all formats', () => {
    const misses = []
    for (const [id, e] of Object.entries(EXEMPLARS)) {
      const hay = `${e.opening || ''}\n${e.closing || ''}`
      for (const a of e.annotations || []) {
        if (!hay.includes(a.phrase)) misses.push(`${id} :: ${a.phrase}`)
      }
    }
    expect(misses).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Kata sendi nama `dari` vs `daripada` in the band-6 MODELS.
//
// DBP's rule (ATM/OBHK): `dari` is for Arah / Tempat / Masa; `daripada` is for
// Orang, Bahan asal, Hal/perbandingan, Keanggotaan. A letter sign-off names a
// PERSON as the source, so "Salam sayang dari sahabat," is the exact error the
// app's own Malay grader flags HIGH and Cikgu Maya teaches against — inside a
// text the student is shown as the thing to imitate, and registered at
// exemplars.js:286 as a model structural element.
//
// Layer 1 is a SELF-CONSISTENCY invariant: the app must never flag its own
// band-6 exemplar. It is scoped to the dari/daripada rule on purpose — a blanket
// "zero HIGH findings" assertion would fail on ms-email for an unrelated
// punctuation defect (email addresses tripping the "space after full stop"
// rule), which is a different, still-open finding.
//
// Layer 2 covers the two sites the GRADER CANNOT SEE, because `pihak` and
// `arwah` are absent from the writingErrorsMalay whitelist — so the grader
// passing is not evidence those are correct.
//
// Layer 3 is the anti-over-reach control. A blanket dari->daripada sweep would
// INTRODUCE errors: `dari sudut/segi/aspek` is sanctioned by Tatabahasa Dewan
// (aspek/sudut/segi are treated as ARAH), and `dari sebalik …` / `dari Sekolah
// Menengah …` are ordinary PLACE uses. Those must survive untouched.
describe('exemplars — `dari` vs `daripada` (DBP kata sendi nama)', () => {
  it('no Malay exemplar trips the app\'s OWN dari/daripada rule', async () => {
    const { findIssuesMalay } = await import('../../lib/writingErrorsMalay.js')
    const offenders = []
    for (const [id, e] of Object.entries(EXEMPLARS)) {
      if (!id.startsWith('ms-')) continue
      for (const part of ['opening', 'closing']) {
        if (!e[part]) continue
        for (const f of findIssuesMalay(e[part], { formatId: id })) {
          if (f.severity === 'high' && /\bdari\b/i.test(f.excerpt || '')) {
            offenders.push(`${id}/${part}: "${f.excerpt}"`)
          }
        }
      }
    }
    expect(offenders, 'the app flags its own band-6 model as an error').toEqual([])
  })

  it('names a PERSON as a source with `daripada`, including where the grader is blind', () => {
    const informal = EXEMPLARS['ms-surat-tidak-rasmi']
    expect(informal.closing).toContain('Salam sayang daripada sahabat,')
    expect(informal.closing).not.toMatch(/\bdari sahabat\b/)
    // The annotation is index-aligned and matched verbatim, so it must move too
    // (the existing annotation guard above would otherwise fail).
    expect(informal.annotations.some(a => a.phrase === 'Salam sayang daripada sahabat,')).toBe(true)

    // Grader-blind: `pihak` is not in the whitelist, so nothing else catches this.
    expect(EXEMPLARS['ms-surat-rasmi'].closing).toMatch(/\bdaripada pihak tuan\b/)
    expect(EXEMPLARS['ms-surat-rasmi'].closing).not.toMatch(/\bdari pihak tuan\b/)
  })

  it('leaves the legitimate ARAH / TEMPAT uses of `dari` alone', () => {
    // Tatabahasa Dewan sanctions dari + segi/sudut/aspek (treated as ARAH).
    expect(EXEMPLARS['ms-fakta'].opening).toMatch(/\bdari pelbagai sudut\b/)
    expect(EXEMPLARS['ms-fakta'].annotations.some(a => a.phrase.includes('dari pelbagai sudut'))).toBe(true)
    // Ordinary PLACE uses.
    expect(EXEMPLARS['ms-keperihalan'].opening).toMatch(/\bdari sebalik\b/)
    expect(EXEMPLARS['ms-laporan'].opening).toMatch(/\bdari Sekolah Menengah\b/)
  })
})
