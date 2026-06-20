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
