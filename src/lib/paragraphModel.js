// Pure paragraph model for the Full-translation page (Option G).
// Spec: docs/superpowers/specs/2026-06-09-full-translation-page-design.md (design 2)
// No DOM, no network. Operates on the in-memory pdfData.pages
// ([{ pageNum, paragraphs: string[] }]) the PDF reader already holds.

/**
 * Flatten pages into stable paragraph units, skipping empty/whitespace-only ones.
 * @param {Array<{pageNum:number, paragraphs:string[]}>} pages
 * @returns {Array<{paraId:string, pageNum:number, text:string}>}
 */
export function buildParagraphs(pages) {
  const out = []
  for (const page of pages || []) {
    const paragraphs = page.paragraphs || []
    paragraphs.forEach((para, pi) => {
      const text = (para || '').trim()
      if (!text) return
      out.push({ paraId: `${page.pageNum}:${pi}`, pageNum: page.pageNum, text })
    })
  }
  return out
}

// Sentence boundary: a terminator (. ! ? …) followed by whitespace. The terminator
// stays attached to its sentence. Mirrors sentenceModel's SENTENCE_END discipline,
// applied to a raw string instead of `parts`.
const SENTENCE_SPLIT = /(?<=[.!?…])\s+/u

/**
 * Split text into sendable chunks no longer than maxChars, breaking only at sentence
 * boundaries (never mid-word). Returns [text] when it already fits; a single sentence
 * longer than maxChars becomes its own (over-long) chunk rather than being chopped.
 * Handles gtx's ~5000-char per-call cap.
 * @param {string} text
 * @param {number} [maxChars=4000]
 * @returns {string[]}
 */
export function splitForTranslation(text, maxChars = 4000) {
  const t = (text || '').trim()
  if (!t) return []
  if (t.length <= maxChars) return [t]
  const pieces = t.split(SENTENCE_SPLIT)
  const chunks = []
  let cur = ''
  for (const piece of pieces) {
    if (cur && cur.length + 1 + piece.length > maxChars) {
      chunks.push(cur)
      cur = ''
    }
    cur = cur ? `${cur} ${piece}` : piece
  }
  if (cur) chunks.push(cur)
  return chunks
}

/**
 * Build the volume-safe translation plan for a set of paragraphs: skip the ones
 * already translated (`have[paraId]`), split each remaining one into sub-chunks, record
 * its ordered chunk list in `perPara`, and return the DEDUPED flat list to actually send.
 * @param {Array<{paraId:string, text:string}>} paras
 * @param {{have?:Record<string,unknown>, maxChars?:number}} [opts]
 * @returns {{chunks:string[], perPara:Record<string,string[]>}}
 */
export function planParagraphTranslation(paras, { have = {}, maxChars = 4000 } = {}) {
  const perPara = {}
  const chunks = []
  const seen = new Set()
  for (const p of paras || []) {
    if (have[p.paraId]) continue
    const pieces = splitForTranslation(p.text, maxChars)
    perPara[p.paraId] = pieces
    for (const c of pieces) {
      if (seen.has(c)) continue
      seen.add(c)
      chunks.push(c)
    }
  }
  return { chunks, perPara }
}
