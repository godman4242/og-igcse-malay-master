// Pins the evidence floor on the "Range / sentence variety" sub-band.
//
// Authority — Cambridge IGCSE Malay 0546 Paper 4 specimen mark scheme (from 2028),
// "Range" criterion:
//   7–9 "Uses extended, well-linked sentences FREQUENTLY and appropriately. Uses a
//        WIDE RANGE of simple and complex structures to produce sentences of varying
//        length."
//   4–6 "Uses SOME extended sentences, with SOME evidence of linkage. Uses simple
//        structures and ATTEMPTS to use some complex structures."
//   https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf
//
// "Frequently" and "a wide range" are quantity-of-evidence words: they cannot be
// demonstrated in a handful of sentences. The underlying signals (sentence-length
// standard deviation, opener variety) are also statistical noise at tiny counts —
// three erratic run-on sentences yield a HIGH standard deviation and read as
// "varied writing".
//
// MEASURED (Gauntlet lane L1, docs/gauntlet/L1/): a 69-word, 4-sentence script the
// examiner marked 11/30 scored variety 5, while a 225-word, 22-sentence script the
// examiner marked 30/30 scored variety 3. The metric was inverted against the real
// examiner on real scripts.
import { describe, it, expect } from 'vitest'
import { score, MIN_SENTS_FOR_RANGE } from '../writingGrader'

// Authored for this test — NOT candidate exam material. Four sentences, deliberately
// erratic in length, using complex connectors (kerana / walaupun). This is exactly
// the shape that used to earn the second-highest variety band.
const FEW_ERRATIC_SENTENCES = [
  'Saya suka membaca buku.',
  'Pada hujung minggu yang lalu, saya dan keluarga saya pergi ke pantai untuk berkelah bersama-sama kerana cuaca pada hari itu sangat cerah dan menyenangkan.',
  'Kami gembira.',
  'Walaupun perjalanan itu jauh, kami tetap berasa seronok kerana dapat menikmati pemandangan yang indah sepanjang jalan.',
].join(' ')

// The same writer, sustained across enough sentences to actually evidence a range.
const MANY_VARIED_SENTENCES = [
  FEW_ERRATIC_SENTENCES,
  'Kami tiba di sana pada waktu pagi.',
  'Ayah saya memandu kereta dengan berhati-hati kerana jalan itu agak sempit dan berliku.',
  'Adik saya bermain pasir.',
  'Selain itu, kami sempat menikmati makanan tengah hari yang telah disediakan oleh ibu saya sebelum kami pulang.',
  'Sungguh menyeronokkan.',
  'Saya berharap kami dapat mengulangi perjalanan seperti itu pada masa hadapan kerana ia mengeratkan hubungan keluarga.',
].join(' ')

describe('Range sub-band requires enough sentences to evidence a range', () => {
  it('caps variety at the mark scheme\'s middle band when there are too few sentences', () => {
    const r = score(FEW_ERRATIC_SENTENCES, { lang: 'malay', format: 'auto' })
    expect(r.error).toBeUndefined()
    expect(r.sents).toBeLessThan(MIN_SENTS_FOR_RANGE)
    // "some extended sentences… attempts to use some complex structures" is the most
    // that can honestly be claimed on this much evidence.
    expect(r.subBands.variety).toBeLessThanOrEqual(4)
  })

  it('does NOT cap once there are enough sentences to demonstrate a range', () => {
    const r = score(MANY_VARIED_SENTENCES, { lang: 'malay', format: 'auto' })
    expect(r.error).toBeUndefined()
    expect(r.sents).toBeGreaterThanOrEqual(MIN_SENTS_FOR_RANGE)
    // The floor must not be a blanket penalty — sustained varied writing still scores.
    expect(r.subBands.variety).toBeGreaterThan(4)
  })

  it('the floor sits below a syllabus-length answer, so compliant work is never capped', () => {
    // 0546 Q3 asks for about 130–140 words; at a typical 15–20 words per sentence
    // that is roughly 7–9 sentences, comfortably above the floor.
    expect(MIN_SENTS_FOR_RANGE).toBeLessThan(7)
  })
})
