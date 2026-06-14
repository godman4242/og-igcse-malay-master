import { describe, it, expect } from 'vitest'
import {
  getExpertResponse,
  isConfidentMatch,
  MIN_CONFIDENCE,
  searchKnowledge,
} from '../cikguKnowledge.js'

// The free Cikgu expert system must NOT bluff. searchKnowledge() almost never
// returns zero results (its keyword scorer scrapes a point off almost anything),
// so a weak/off-topic top match used to be presented as authoritative. The
// confidence gate (MIN_CONFIDENCE) makes it admit uncertainty instead — a
// confident WRONG grammar answer is the worst failure mode for a learning tool.
//
// Calibrated keyless from scripts/ai-tier-eval/goldCikgu.mjs: every genuinely
// strong match scores ≥49, the whole ambiguous floor ≤31 (empty gap 32–48).

describe('Cikgu free expert confidence gate', () => {
  it('MIN_CONFIDENCE sits inside the empty 32–48 gap from the gold calibration', () => {
    expect(MIN_CONFIDENCE).toBeGreaterThanOrEqual(32)
    expect(MIN_CONFIDENCE).toBeLessThanOrEqual(48)
  })

  it('answers a strong in-coverage query with the full canned answer', () => {
    const r = getExpertResponse('Explain the meN- prefix')
    expect(r.confident).toBe(true)
    // The real canned answer, not the uncertainty hedge.
    expect(r.text).not.toMatch(/not sure|not confident|don't have a specific/i)
    expect(r.text.length).toBeGreaterThan(100)
  })

  it('admits uncertainty and offers the free AI tutor on an off-topic query', () => {
    // The peribahasa BANK now covers ~15 common proverbs (incl. "bagai aur dengan
    // tebing"), so the still-uncovered example moved to a rarer proverb the bank
    // deliberately omits — it scrapes only a low-score topic match (peribahasa
    // keyword + pattern, ≈28) below MIN_CONFIDENCE, so the gate still hedges.
    const q = 'What does the peribahasa "harapkan pagar, pagar makan padi" mean?'
    const r = getExpertResponse(q)
    expect(r.confident).toBe(false)
    expect(r.text).toMatch(/not sure|not confident/i)
    expect(r.text).toMatch(/\bAI\b/) // points the student to the free AI tutor
  })

  it('names the closest topic it DID find so the hedge is still helpful', () => {
    const q = 'What does the peribahasa "harapkan pagar, pagar makan padi" mean?'
    const closest = searchKnowledge(q, 1)[0].entry.title
    const r = getExpertResponse(q)
    expect(r.text).toContain(closest)
  })

  it('routes pure nonsense (a low scrape, never zero results) to uncertainty', () => {
    const r = getExpertResponse('asdfqwer zxcv nonsense')
    expect(r.confident).toBe(false)
    expect(r.text).toMatch(/not sure|not confident|don't have a specific/i)
  })

  it('isConfidentMatch is false for empty results and below-threshold scores', () => {
    expect(isConfidentMatch([])).toBe(false)
    expect(isConfidentMatch([{ score: MIN_CONFIDENCE - 1, entry: {} }])).toBe(false)
    expect(isConfidentMatch([{ score: MIN_CONFIDENCE, entry: {} }])).toBe(true)
  })
})

// KB-WIDENING (2026-06-14): the confidence gate stopped the bluff but exposed thin
// coverage — common IGCSE questions (peribahasa MEANINGS, rencana/article structure,
// formal vocab upgrades) hedged, and two weak-but-correct entries (penjodoh bilangan,
// dari/daripada) scored below MIN_CONFIDENCE. This suite pins the recovery: each newly
// covered area now answers CONFIDENTLY with the real concept, while a genuinely
// out-of-scope query still hedges (no over-broadening). These were red-proofed against
// the pre-widening KB (each confident-area query returned confident:false first).
describe('Cikgu KB widening — common IGCSE areas now answered, not hedged', () => {
  it('answers a peribahasa MEANING query confidently with the real concept', () => {
    const r = getExpertResponse('What does the peribahasa "bagai aur dengan tebing" mean, and which essay theme does it fit?')
    expect(r.confident).toBe(true)
    expect(r.text).not.toMatch(/not sure|not confident/i)
    // aur (bamboo) + tebing (riverbank) supporting each other → mutual cooperation.
    expect(r.text.toLowerCase()).toMatch(/cooperat|interdepend|mutual|help each other|saling/)
  })

  it('answers a rencana (article) structure query paragraph-by-paragraph', () => {
    const r = getExpertResponse('How should I structure an IGCSE Malay rencana (article) for Paper 2, paragraph by paragraph?')
    expect(r.confident).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/pendahuluan/)
    expect(r.text.toLowerCase()).toMatch(/kesimpulan|penutup/)
  })

  it('answers a formal-synonym upgrade query with a real, register-correct alternative', () => {
    const r = getExpertResponse('Give me three more formal alternatives to the common word "banyak" for an IGCSE essay.')
    expect(r.confident).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/pelbagai|sebilangan besar|berbagai/)
  })

  it('recovers the weak in-coverage penjodoh bilangan question (now clears the gate)', () => {
    const r = getExpertResponse('What are penjodoh bilangan, and which one do I use for people, for animals, and for flat objects?')
    expect(r.confident).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/orang/)
    expect(r.text.toLowerCase()).toMatch(/ekor/)
  })

  it('recovers the weak in-coverage dari vs daripada question (now clears the gate)', () => {
    const r = getExpertResponse('What is the difference between "dari" and "daripada", and when do I use each?')
    expect(r.confident).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/daripada/)
  })

  it('recovers the ke-…-an circumfix question (the last in/partial hedge)', () => {
    const r = getExpertResponse('What does the circumfix ke-…-an do to a word? Give two examples.')
    expect(r.confident).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/abstract noun/)
  })

  it('answers a kata ganda (reduplication) question with the real concept', () => {
    const r = getExpertResponse('Explain kata ganda (reduplication) in Malay and give examples.')
    expect(r.confident).toBe(true)
    // the three reduplication types: penuh / separa / berentak
    expect(r.text.toLowerCase()).toMatch(/penggandaan penuh|kata ganda penuh|full reduplication/)
    expect(r.text.toLowerCase()).toMatch(/berentak|rhythmic/)
  })

  it('answers a golongan kata (word classes) question incl. kata nama am vs khas', () => {
    const r = getExpertResponse('What is the difference between kata nama am and kata nama khas? Give an example of each.')
    expect(r.confident).toBe(true)
    expect(r.text.toLowerCase()).toMatch(/proper noun|kata nama khas/)
    expect(r.text.toLowerCase()).toMatch(/common noun|general noun|kata nama am/)
  })

  it('still hedges on a genuinely out-of-scope question (no over-broadening)', () => {
    // "e taling" vs "e pepet" (the two Malay 'e' vowel sounds) is a phonology topic
    // the KB does not cover — the gate must keep admitting uncertainty.
    const r = getExpertResponse('What is the difference between e taling and e pepet in Malay pronunciation?')
    expect(r.confident).toBe(false)
    expect(r.text).toMatch(/not sure|not confident|don't have a specific/i)
  })
})
