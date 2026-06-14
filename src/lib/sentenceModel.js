// Pure sentence grouper for the sentence-level reveal feature.
// Spec:  docs/superpowers/specs/2026-06-08-sentence-reveal-design.md (S5, S6)
// Plan:  docs/superpowers/plans/2026-06-08-sentence-reveal.md (Step 1)
import { normalizeWord } from './translateDocument.js'
//
// Groups a reflow paragraph's `parts` (the {kind:'token'|'space'|'punct', text, i}
// items from PDFReader.splitParagraph) into PUNCTUATION sentences. The load-bearing
// honesty bar (S5): a coherent unit only — translate a whole sentence, never a line
// fragment. A paragraph with no internal sentence punctuation is ONE sentence
// (paragraph-fallback), so a heading or wrapped line is never split mid-meaning.
//
// No DOM, no network — PDFReader feeds plain part objects in and renders from the
// returned ranges. Punctuation boundary detection is deliberately simple: decimals
// (3.14) and abbreviations (Dr.) are documented limits, not bugs — paragraph-
// fallback keeps every piece readable even when a boundary lands a little off.

// A punct part closes a sentence when it carries a terminator (. ! ? … or "...")
// optionally followed by closing quotes/brackets — e.g. `.`  `?"`  `…`  `.)`.
// Internal terminators (decimals like 3.14) don't match: the terminator must sit
// at the end of the punct run, before only closing marks.
const SENTENCE_END = /[.!?…](?:\.{0,2})['"”’»)\]]*$/u

/**
 * Group a paragraph's parts into punctuation-sentences.
 * @param {Array<{kind:string,text:string,i?:number}>} parts  from splitParagraph
 * @param {{pageNum?:number,pi?:number}} [loc]  for the stable sentenceId
 * @returns {Array<{sentenceId:string, partStart:number, partEnd:number,
 *   firstTokenI:number, tokenIndices:number[], text:string}>}
 */
export function groupSentences(parts, { pageNum = 0, pi = 0 } = {}) {
  const sentences = []
  let cur = null

  const finalize = (c) => {
    sentences.push({
      sentenceId: `${pageNum}:${pi}:${c.firstTokenI}`,
      partStart: c.partStart,
      partEnd: c.partEnd,
      firstTokenI: c.firstTokenI,
      tokenIndices: c.tokenIndices,
      text: c.pieces.join('').trim(),
    })
  }

  const list = parts || []
  for (let idx = 0; idx < list.length; idx += 1) {
    const p = list[idx]
    if (!cur) {
      // Skip leading whitespace so a sentence starts at its first real part.
      if (p.kind === 'space') continue
      cur = { partStart: idx, partEnd: idx, firstTokenI: null, tokenIndices: [], pieces: [] }
    }
    // Anchor the block on the last MEANINGFUL part — never a trailing space.
    if (p.kind !== 'space') cur.partEnd = idx
    cur.pieces.push(p.text)
    if (p.kind === 'token') {
      cur.tokenIndices.push(p.i)
      if (cur.firstTokenI === null) cur.firstTokenI = p.i
    } else if (p.kind === 'punct' && SENTENCE_END.test(p.text)) {
      finalize(cur)
      cur = null
    }
  }
  if (cur) finalize(cur)

  // Drop any sentence with no real tokens (punctuation-/whitespace-only): there's
  // nothing to translate or reveal, and the id would be unstable.
  return sentences.filter((s) => s.tokenIndices.length > 0)
}

// High-frequency Malay grammatical words that are NOT English words — their presence
// is a strong, low-false-positive signal that the text is Malay. Exported so
// simplifyModel.js can reuse the same signal for its is-this-still-Malay guard.
export const MALAY_MARKERS = new Set([
  'dan', 'yang', 'di', 'ke', 'dari', 'dengan', 'untuk', 'pada', 'ini', 'itu',
  'saya', 'awak', 'dia', 'kita', 'kami', 'mereka', 'adalah', 'ialah', 'tidak',
  'akan', 'sudah', 'telah', 'sedang', 'kerana', 'atau', 'juga', 'boleh', 'hendak',
  'mahu', 'kepada', 'dalam', 'oleh', 'bukan', 'apa', 'bagaimana', 'sangat', 'lebih',
  'sebuah', 'seorang', 'kepada', 'tetapi', 'supaya', 'kalau', 'jika',
])

/**
 * Decide whether to OFFER sentence translation, honestly and conservatively.
 * Deliberately biased toward enabling: only a substantial document with ZERO Malay
 * marker words is called 'en' (the no-op case, source≈target). Anything with even a
 * little Malay — or too short to judge — returns 'unknown'/'ms' so the primary Malay
 * path is never wrongly disabled. Accepts `{word}` objects or plain strings.
 * @returns {'ms'|'en'|'unknown'}
 */
export function detectDocLanguage(tokens) {
  const list = tokens || []
  let total = 0
  let markers = 0
  for (const t of list) {
    const raw = typeof t === 'string' ? t : (t && t.word)
    if (typeof raw !== 'string') continue
    const w = raw.toLowerCase()
    if (!/[a-zÀ-ɏ]/i.test(w)) continue // skip pure numbers/punct
    total += 1
    if (MALAY_MARKERS.has(w)) markers += 1
  }
  if (total < 12) return 'unknown'         // too little signal
  if (markers === 0) return 'en'           // a real doc with no Malay markers ≈ English
  if (markers / total >= 0.03) return 'ms' // clearly Malay
  return 'unknown'                         // some Malay present — keep it enabled
}

/**
 * Map each sentence to the distinct UNKNOWN running words inside it (the FSRS
 * "add unknowns from this sentence" candidates + the dotted-cue source). Pure +
 * predicate-driven so both syllabuses share one implementation: the Malay reader
 * injects a dictionary-membership test, the English reader injects the blended
 * known-English set (makeIsKnownEnglish). A word counts as unknown when `isKnown`
 * returns false for its normalised form. Deduped per sentence by normalised form
 * (first surface kept); sentences with no unknowns are omitted (no empty entries).
 * @param {Array<{sentenceId:string, tokenIndices:number[]}>} sentences
 * @param {Map<number,string>} wordByIndex  token global-index → surface word
 * @param {(norm:string)=>boolean} [isKnown]  omitted ⇒ nothing known (all unknown)
 * @returns {Map<string,string[]>}
 */
export function sentenceUnknowns(sentences, wordByIndex, isKnown) {
  const out = new Map()
  const known = typeof isKnown === 'function' ? isKnown : () => false
  const byIndex = wordByIndex instanceof Map ? wordByIndex : new Map()
  for (const s of sentences || []) {
    const words = []
    const seen = new Set()
    for (const i of s?.tokenIndices || []) {
      const word = byIndex.get(i)
      const norm = normalizeWord(word || '')
      if (!norm || known(norm) || seen.has(norm)) continue
      seen.add(norm)
      words.push(word)
    }
    if (words.length) out.set(s.sentenceId, words)
  }
  return out
}
