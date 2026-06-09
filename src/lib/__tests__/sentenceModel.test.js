import { describe, it, expect } from 'vitest'
import { groupSentences, detectDocLanguage } from '../sentenceModel.js'

// RED handoff for the sentence-level reveal feature — Step 1 of
// docs/superpowers/plans/2026-06-08-sentence-reveal.md.
//
// `groupSentences(parts, { pageNum, pi })` groups a reflow paragraph's `parts`
// (the {kind,text,i} items from PDFReader's splitParagraph) into PUNCTUATION
// sentences (. ! ? …), with a paragraph-fallback when there's no internal
// sentence punctuation. Coherent unit only — never a line fragment (spec S5).
// The module `../sentenceModel.js` does NOT exist yet.

// Mirror PDFReader.jsx's splitParagraph tokenizer EXACTLY so the tests feed the
// real part shape the model will see in production.
function toParts(text, startIndex = 0) {
  const out = []
  const re = /([\p{L}\p{M}'-]+)|(\s+)|([^\s\p{L}\p{M}]+)/gu
  let m
  let i = startIndex
  while ((m = re.exec(text)) !== null) {
    if (m[1]) { out.push({ kind: 'token', text: m[1], i }); i++ }
    else if (m[2]) out.push({ kind: 'space', text: m[2] })
    else out.push({ kind: 'punct', text: m[3] })
  }
  return out
}

describe('groupSentences — single sentence', () => {
  it('a paragraph with one terminator is one sentence carrying every token index', () => {
    const parts = toParts('Saya suka nasi goreng.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s).toHaveLength(1)
    expect(s[0].tokenIndices).toEqual([0, 1, 2, 3])
    expect(s[0].text).toBe('Saya suka nasi goreng.')
  })
})

describe('groupSentences — multi-sentence paragraph', () => {
  it('splits on a full stop AND an exclamation mark into separate sentences', () => {
    const parts = toParts('Saya makan. Dia minum!', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s).toHaveLength(2)
    expect(s[0].text).toBe('Saya makan.')
    expect(s[0].tokenIndices).toEqual([0, 1])
    expect(s[1].text).toBe('Dia minum!')
    expect(s[1].tokenIndices).toEqual([2, 3])
  })

  it('splits on a question mark', () => {
    const parts = toParts('Apa khabar? Baik.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s.map(x => x.text)).toEqual(['Apa khabar?', 'Baik.'])
  })
})

describe('groupSentences — paragraph fallback (no internal sentence punctuation)', () => {
  it('a heading / fragment with no terminator is ONE sentence (never split mid-line)', () => {
    const parts = toParts('Bahagian A Karangan', 0)
    const s = groupSentences(parts, { pageNum: 2, pi: 3 })
    expect(s).toHaveLength(1)
    expect(s[0].text).toBe('Bahagian A Karangan')
    expect(s[0].tokenIndices).toEqual([0, 1, 2])
  })

  it('a comma or semicolon does NOT close a sentence', () => {
    const parts = toParts('Pertama, kedua; ketiga', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s).toHaveLength(1)
    expect(s[0].text).toBe('Pertama, kedua; ketiga')
  })
})

describe('groupSentences — ellipsis and trailing/leading punctuation', () => {
  it('an ellipsis character … closes a sentence', () => {
    const parts = toParts('Tunggu sebentar… Sudah siap.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s.map(x => x.text)).toEqual(['Tunggu sebentar…', 'Sudah siap.'])
  })

  it('three dots ... also close a sentence', () => {
    const parts = toParts('Hmm... ya.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s.map(x => x.text)).toEqual(['Hmm...', 'ya.'])
  })

  it('a closing quote after the terminator still closes (."  →  end of sentence)', () => {
    const parts = toParts('Dia berkata "pergi." Saya pergi.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s).toHaveLength(2)
    expect(s[1].text).toBe('Saya pergi.')
  })

  it('leading punctuation/space is trimmed from the sentence text', () => {
    const parts = toParts('  Mula di sini.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s).toHaveLength(1)
    expect(s[0].text).toBe('Mula di sini.')
    expect(s[0].tokenIndices).toEqual([0, 1, 2])
  })
})

describe('groupSentences — decimals and abbreviations (documented limits)', () => {
  it('a decimal number does NOT split (3.14 stays inside the sentence)', () => {
    const parts = toParts('Nilai pi ialah 3.14 sahaja.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s).toHaveLength(1)
    expect(s[0].text).toBe('Nilai pi ialah 3.14 sahaja.')
  })

  it('an abbreviation over-splits — accepted limit (Dr. → boundary)', () => {
    const parts = toParts('Dr. Ahmad hadir.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    // Documented false-positive: "Dr." reads as a sentence end. Paragraph-fallback
    // keeps each piece coherent, so this is acceptable for v1.
    expect(s).toHaveLength(2)
    expect(s[0].text).toBe('Dr.')
    expect(s[1].text).toBe('Ahmad hadir.')
  })
})

describe('groupSentences — empty / whitespace / punct-only', () => {
  it('an empty paragraph yields no sentences', () => {
    expect(groupSentences(toParts('', 0), { pageNum: 1, pi: 0 })).toEqual([])
  })

  it('a whitespace-only paragraph yields no sentences', () => {
    expect(groupSentences(toParts('   ', 0), { pageNum: 1, pi: 0 })).toEqual([])
  })

  it('a punctuation-only paragraph (no tokens) yields no sentences', () => {
    expect(groupSentences(toParts('— … !', 0), { pageNum: 1, pi: 0 })).toEqual([])
  })

  it('tolerates null / undefined parts', () => {
    expect(groupSentences(null, { pageNum: 1, pi: 0 })).toEqual([])
    expect(groupSentences(undefined, { pageNum: 1, pi: 0 })).toEqual([])
  })
})

describe('groupSentences — token integrity', () => {
  it('a hyphenated reduplication (anak-anak) stays one token with one index', () => {
    const parts = toParts('Anak-anak bermain.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s).toHaveLength(1)
    expect(s[0].tokenIndices).toEqual([0, 1])
    expect(s[0].text).toBe('Anak-anak bermain.')
  })

  it('preserves the GLOBAL token index space (startIndex offset)', () => {
    const parts = toParts('Kedua ayat.', 17)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    expect(s[0].tokenIndices).toEqual([17, 18])
  })
})

describe('groupSentences — stable sentenceId + part range', () => {
  it('sentenceId is `${pageNum}:${pi}:${firstTokenI}` and is unique per sentence', () => {
    const parts = toParts('Satu dua. Tiga empat.', 0)
    const s = groupSentences(parts, { pageNum: 3, pi: 2 })
    expect(s[0].sentenceId).toBe('3:2:0')
    expect(s[1].sentenceId).toBe('3:2:2')
    expect(s[0].sentenceId).not.toBe(s[1].sentenceId)
  })

  it('exposes partStart/partEnd indices into the parts array (cue + block anchors)', () => {
    const parts = toParts('Satu. Dua.', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    // parts: [tok"Satu"(0), punct"."(1), space(2), tok"Dua"(3), punct"."(4)]
    expect(s[0].partStart).toBe(0)
    expect(s[0].partEnd).toBe(1)
    expect(s[1].partStart).toBe(3)
    expect(s[1].partEnd).toBe(4)
  })

  it('partEnd never lands on a trailing space (so the inline block anchors on real text)', () => {
    const parts = toParts('Satu dua ', 0)
    const s = groupSentences(parts, { pageNum: 1, pi: 0 })
    // parts: [tok"Satu"(0), space(1), tok"dua"(2), space(3)] — partEnd must be 2, not 3
    expect(s).toHaveLength(1)
    expect(s[0].partEnd).toBe(2)
    expect(parts[s[0].partEnd].kind).toBe('token')
  })
})

describe('detectDocLanguage — gate the EN-doc no-op (spec safety bar)', () => {
  const words = (str) => str.split(/\s+/).filter(Boolean).map((word, i) => ({ word, i }))

  it('flags a substantial Malay passage as "ms" (function words present)', () => {
    const lang = detectDocLanguage(words(
      'Pada suatu hari yang cerah saya dan adik pergi ke pasar dengan ibu untuk membeli ikan dan sayur',
    ))
    expect(lang).toBe('ms')
  })

  it('flags a substantial English-only passage with ZERO Malay markers as "en"', () => {
    const lang = detectDocLanguage(words(
      'The quick brown fox jumped over the lazy dog while the cat watched silently from the warm windowsill nearby',
    ))
    expect(lang).toBe('en')
  })

  it('returns "unknown" for a short passage (too little signal to decide)', () => {
    expect(detectDocLanguage(words('Read the passage below'))).toBe('unknown')
    expect(detectDocLanguage([])).toBe('unknown')
    expect(detectDocLanguage(null)).toBe('unknown')
  })

  it('returns "unknown" (never "en") for a mixed doc that still has some Malay', () => {
    // A bilingual instruction sheet: one Malay marker keeps it out of the EN no-op,
    // protecting the primary Malay path from being wrongly disabled.
    const lang = detectDocLanguage(words(
      'Answer all questions in the spaces provided below dan write neatly using a dark pen only please',
    ))
    expect(lang).not.toBe('en')
  })

  it('accepts plain strings as well as {word} objects', () => {
    expect(detectDocLanguage('saya suka makan nasi yang sangat sedap di rumah dengan keluarga pada hari ini'.split(' '))).toBe('ms')
  })
})
