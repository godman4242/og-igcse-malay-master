import { describe, it, expect } from 'vitest'
import {
  getEntryById,
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

// CONTENT-TRUTH (2026-06-14): the imbuhan-men `answer` is rendered VERBATIM to the
// student (formatKnowledgeResponse returns entry.answer). Its p-drop rule bullet was
// garbled — instead of cleanly teaching "pukul → memukul" it injected "menulis" (a
// t-drop word that belongs to the NEXT bullet) and the nonsense token "mempulis":
//   - **mem- (p drops)** before p → menulis ❌ mempulis → **memukul** ...
// meN- + a p-initial root drops the p (the KPST/luluh rule): pukul → memukul, and the
// genuine wrong form is "mempukul" (corroborated by the app's own writingErrorsMalay.js
// + goldWriting.mjs). Web-verified: Kompas "Peluluhan Kata Dasar Berawalan KPST";
// BahasaMelayuOnline. Same confident-wrong bug class as the kejar/penulis/berasa fixes.
describe('Cikgu imbuhan-men answer — p-drop rule taught correctly (content-truth)', () => {
  const answer = getEntryById('imbuhan-men').answer
  const pDropLine = answer.split('\n').find((l) => l.includes('(p drops)'))

  it('has a single p-drop rule line', () => {
    expect(pDropLine).toBeTruthy()
  })

  it('illustrates the p-drop rule with the correct example pukul → memukul', () => {
    expect(pDropLine).toContain('memukul')
    expect(pDropLine.toLowerCase()).toContain('pukul')
  })

  it('does NOT misfile "menulis" (a t-drop word) under the p-drop rule', () => {
    expect(pDropLine).not.toContain('menulis')
  })

  it('contains no nonsense "mempulis" token anywhere in the answer', () => {
    expect(answer).not.toContain('mempulis')
  })
})

// CONTENT-TRUTH (2026-06-14): the imbuhan-ber `answer` is rendered VERBATIM to the
// student. Its be- variation line conflated TWO distinct allomorph rules under one
// inaccurate label — "before r + consonant: bekerja (NOT berkerja), berenang":
//   * bekerja  = ber- + kerja,  whose first syllable "ker" ends in -er → be-
//   * berenang = ber- + renang, whose root STARTS with r               → be-
// "before r + consonant" describes neither cleanly (renang is r + vowel, not r +
// consonant; kerja's case is the -er- first syllable). Web-verified canonical rule
// (Bobo.grid.id; corroborated by the app's own grammar.js berasa ruling): ber- → be-
// when the root starts with r OR its first syllable ends in -er. Same conflation the
// grammar.js berasa fix already grounded.
describe('Cikgu imbuhan-ber answer — be- allomorph rule taught accurately (content-truth)', () => {
  const answer = getEntryById('imbuhan-ber').answer
  const beLine = answer.split('\n').find((l) => l.includes('berenang'))

  it('has a single be- variation line carrying both examples + the wrong form', () => {
    expect(beLine).toBeTruthy()
    expect(beLine).toContain('bekerja')
    expect(beLine).toContain('berenang')
    expect(beLine).toContain('berkerja') // the wrong form it warns against
  })

  it('does NOT use the inaccurate "r + consonant" label', () => {
    expect(beLine).not.toMatch(/r \+ consonant/i)
  })

  it('names the r-initial-root condition (renang → berenang starts with r)', () => {
    expect(beLine.toLowerCase()).toContain('start')
  })

  it('names the -er- first-syllable condition (kerja → bekerja)', () => {
    expect(beLine.toLowerCase()).toContain('-er')
  })
})

// CONTENT-TRUTH (2026-06-15): the imbuhan-pen `answer` is rendered VERBATIM to the
// student (formatKnowledgeResponse returns entry.answer). Its "pen- before d, c, j"
// rule line illustrated the j-initial case with "penjadi" — a fabricated word (no DBP
// / dictionary entry). The canonical peN- + j-initial root forms are penjual (pen- +
// jual, "seller") and penjaga (pen- + jaga, "guard"). Web-verified (SlideShare
// "Imbuhan PEN~"; sites.google.com/site/bmalaysiatatabahasa/imbuhan/pe). Same
// confident-wrong-example bug class as the kejar/penulis/berasa/imbuhan-men fixes —
// the d (pendapat) and c (pencari) examples on the same line were already correct;
// only the j example was a non-word.
describe('Cikgu imbuhan-pen answer — j-initial peN- example is a real word (content-truth)', () => {
  const answer = getEntryById('imbuhan-pen').answer
  const pencLine = answer.split('\n').find((l) => l.includes('pen- before d, c, j'))

  it('has a single "pen- before d, c, j" rule line with the correct d + c examples', () => {
    expect(pencLine).toBeTruthy()
    expect(pencLine).toContain('pendapat') // d: pen- + dapat
    expect(pencLine).toContain('pencari') // c: pen- + cari
  })

  it('illustrates the j-initial case with a real word (penjual), not the non-word "penjadi"', () => {
    expect(pencLine).toContain('penjual')
  })

  it('contains no fabricated "penjadi" token anywhere in the answer', () => {
    expect(answer).not.toContain('penjadi')
  })
})

// CONTENT-TRUTH (2026-06-15): the imbuhan-an `answer` is rendered VERBATIM to the
// student. Its "Combined with peN-" block (header literally claims "peN- + root + -an
// = abstract noun") listed perjalanan / permainan / pertandingan — but those are
// peR-...-an (per-...-an) nouns of ber- verbs (berjalan/bermain/bertanding), NOT
// peN-...-an. So three exam-relevant words sat under the wrong affix header, mis-
// teaching affix classification (which IGCSE imbuhan questions directly test). Web-
// verified (the per-...-an circumfix forms perjalanan/permainan/pertandingan). Same
// wrong-affix-classification bug class as the penulis/kejar grammar.js fixes. The fix
// regroups the genuine peN-...-an words (pendidikan/penerbangan/pembelajaran) under
// peN- and moves the three per-...-an words to a correctly-labelled peR- section.
describe('Cikgu imbuhan-an answer — peN-...-an vs peR-...-an classified correctly (content-truth)', () => {
  const answer = getEntryById('imbuhan-an').answer
  const peNIdx = answer.indexOf('Combined with peN-')
  const peRIdx = answer.indexOf('Combined with peR-')
  // The peN- block is the text from its header up to the peR- header (or end if absent).
  const peNBlock = peNIdx < 0 ? '' : answer.slice(peNIdx, peRIdx < 0 ? undefined : peRIdx)
  const peRBlock = peRIdx < 0 ? '' : answer.slice(peRIdx)
  const perAnWords = ['perjalanan', 'permainan', 'pertandingan']

  it('has a distinct peR-...-an (per-...-an) section', () => {
    expect(peRIdx).toBeGreaterThanOrEqual(0)
  })

  it('does NOT list any per-...-an word under the peN- header', () => {
    expect(peNIdx).toBeGreaterThanOrEqual(0) // non-vacuity: the peN- block exists
    for (const w of perAnWords) expect(peNBlock).not.toContain(w)
  })

  it('lists perjalanan / permainan / pertandingan under the peR- section', () => {
    for (const w of perAnWords) expect(peRBlock).toContain(w)
  })

  it('keeps the genuine peN-...-an abstract nouns under the peN- header', () => {
    expect(peNBlock).toContain('pendidikan') // peN- + didik + an
    expect(peNBlock).toContain('penerbangan') // peN- + (t)erbang + an
  })
})
