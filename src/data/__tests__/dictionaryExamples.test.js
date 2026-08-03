import { describe, it, expect } from 'vitest'
import EXAMPLES, { getExample } from '../dictionaryExamples.js'

// getExample is the accessor the card-creation paths (SearchModal / PDFReader /
// Import) consult before falling back to a synthetic placeholder ex.
describe('getExample', () => {
  it('returns the curated example (a string) for a covered word', () => {
    expect(getExample('makanan')).toBe(EXAMPLES['makanan'])
    expect(typeof getExample('makanan')).toBe('string')
  })
  it('returns null for an uncovered word, so callers use their placeholder', () => {
    expect(getExample('zxqwv')).toBeNull()
  })

  // EXAMPLES is a plain object, so a bare `EXAMPLES[word]` inherits
  // Object.prototype: getExample('constructor') handed back a FUNCTION instead of
  // null, which then became a card's `ex`. Reachable — the reader and Import call
  // this with arbitrary words lifted from the user's own document.
  it('returns null for inherited Object properties, never a function', () => {
    for (const word of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__']) {
      expect(getExample(word), `getExample(${word})`).toBeNull()
    }
  })
})

// V10 (2026-08-03) — register truth in a MODEL sentence. Per Tatabahasa Dewan
// Edisi Ketiga (the rule this file's own Batch-1 header already states), the
// kata pemeri `adalah` may only precede a frasa ADJEKTIF or a frasa SENDI NAMA;
// a frasa NAMA predicate takes `ialah` or `merupakan`. PRPM lists `saat` as a
// kata nama, so 'berkongsi' — "…adalah saat yang tidak ternilai" — modelled one
// of the most-corrected register slips in IGCSE Malay writing, in a sentence the
// learner is shown as correct.
//
// The allowlist is the review gate: an example may contain `adalah` only if it
// has been checked to precede an adjective or a preposition. Adding a word here
// is a deliberate act, not an accident.
const ADALAH_ALLOWED = new Map([
  // "adalah baik" — `baik` is a kata adjektif, so this one is correct.
  ['adalah', /\badalah\s+baik\b/],
])

describe('dictionaryExamples — kata pemeri `adalah` (DBP register rule)', () => {
  it('no example uses `adalah` outside the reviewed allowlist', () => {
    for (const [word, sentence] of Object.entries(EXAMPLES)) {
      if (!/\badalah\b/.test(sentence)) continue
      expect(ADALAH_ALLOWED.has(word), `unreviewed \`adalah\` in "${word}": ${sentence}`).toBe(true)
      expect(sentence, `${word} no longer matches its reviewed pattern`).toMatch(ADALAH_ALLOWED.get(word))
    }
  })

  it('the berkongsi example takes a frasa nama predicate correctly', () => {
    const s = getExample('berkongsi')
    expect(s).toBeTruthy()
    expect(s, '`saat` is a kata nama — `adalah` cannot precede it').not.toMatch(/\badalah\b/)
    expect(s).toMatch(/\b(merupakan|ialah)\b/)
    // Still usable as a cloze/Produce prompt for its own headword.
    expect(s.toLowerCase()).toContain('berkongsi')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Kata sendi nama `di` vs `pada` — DBP Khidmat Nasihat, quoted verbatim:
//   "Frasa yang betul ialah pada waktu malam kerana perkataan 'pada' sesuai
//    merujuk pada waktu dan 'di' merujuk pada tempat."
//   (https://prpm.dbp.gov.my/Cari1?keyword=di%20waktu&d=175768)
// `di` marks PLACE, `pada` marks TIME. Two examples used `di` before a time
// noun — `di waktu petang` ('teh') and `di kala …` ('wajah') — while eleven
// others in the same file already wrote `pada waktu …` correctly, so this was
// an internal inconsistency as well as a DBP error.
//
// These sentences are not merely displayed: loadTopicPack writes them onto the
// card as `ex`, and blankInExample turns them into the cloze/Produce stem, so
// the learner RETRIEVES against the wrong preposition under FSRS.
//
// Kamus Dewan's `kala` entry lists only `pd ~` (pada kala) and never `di ~`.
// `ketika` is used instead of `pada kala` because what follows here is a CLAUSE
// ("saya jauh dari rumah"), not a frasa nama — `ketika` is a temporal
// conjunction that takes a clause natively (Kamus Dewan glosses `tatkala` as
// "ketika (itu), pd masa (itu)"), so it avoids trading one preposition slip
// for another.
const TIME_NOUNS = ['waktu', 'kala', 'masa', 'ketika', 'saat']

describe('dictionaryExamples — kata sendi `di` never marks TIME (DBP)', () => {
  it('no example writes `di` before a time noun', () => {
    const offenders = []
    for (const [word, sentence] of Object.entries(EXAMPLES)) {
      const re = new RegExp(`\\bdi\\s+(?:${TIME_NOUNS.join('|')})\\b`, 'i')
      if (re.test(sentence)) offenders.push(`${word}: ${sentence}`)
    }
    expect(offenders, '`di` marks place, `pada` marks time (DBP Khidmat Nasihat)').toEqual([])
  })

  it('the teh example marks its time phrase with `pada`', () => {
    const s = getExample('teh')
    expect(s).toMatch(/\bpada waktu petang\b/)
    expect(s).not.toMatch(/\bdi waktu\b/)
    expect(s.toLowerCase()).toContain('teh')
  })

  it('the wajah example uses a clause-taking temporal conjunction, not `di kala`', () => {
    const s = getExample('wajah')
    expect(s).not.toMatch(/\bdi kala\b/)
    expect(s).toMatch(/\b(ketika|tatkala|semasa|sewaktu)\b/)
    expect(s.toLowerCase()).toContain('wajah')
  })
})
