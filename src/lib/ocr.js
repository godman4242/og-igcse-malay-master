// Pure OCR orchestration + helpers — NO DOM, NO network, NO WASM (mirrors
// translateDocument.js). The runner takes an INJECTED `recognize`, so chunking,
// progress, abort, and the shape transform are fully unit-testable; the lazy
// Tesseract.js worker lives in ./ocrEngine.js and is the only impure part.
//
// Spec: docs/superpowers/specs/2026-06-11-past-paper-photo-ocr-design.md

// Below this much non-space text across all pages, a PDF is treated as
// "image-only" (no real text layer) and OCR is offered.
export const OCR_PDF_TEXT_FLOOR = 16
// Per-word confidence (0..100) below which a word gets the existing 'unverified' cue.
export const LOW_CONFIDENCE = 70

/** Split a Tesseract text blob into paragraphs (blank line = break). */
export function paragraphsFromOcrText(text) {
  if (typeof text !== 'string') return []
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(block => block.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** One OCR result per image/page → the EXACT shape of extractTextFromDoc(). */
export function pagesFromOcrResults(results) {
  const pages = (results || []).map((r, idx) => {
    const paragraphs = paragraphsFromOcrText(r && r.text)
    return { pageNum: idx + 1, text: paragraphs.join('\n\n'), paragraphs }
  })
  return { pages }
}

/** Mean word confidence (0..100), NaN-safe; empty → 0. */
export function meanConfidence(words) {
  const vals = (words || [])
    .map(w => (w && typeof w.confidence === 'number' ? w.confidence : NaN))
    .filter(n => !Number.isNaN(n))
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** True when extracted pages carry essentially no text layer (scanned PDF). */
export function isImageOnlyPdf(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return false
  let chars = 0
  for (const p of pages) {
    const t = (p && p.text) || (p && Array.isArray(p.paragraphs) ? p.paragraphs.join(' ') : '')
    chars += String(t).replace(/\s+/g, '').length
    if (chars >= OCR_PDF_TEXT_FLOOR) return false
  }
  return true
}

/** Set of normalized words whose OCR confidence is below `threshold`. */
export function lowConfidenceWords(words, threshold = LOW_CONFIDENCE) {
  const set = new Set()
  for (const w of words || []) {
    if (w && typeof w.confidence === 'number' && w.confidence < threshold && w.text) {
      set.add(String(w.text).toLowerCase().trim())
    }
  }
  return set
}

/**
 * OCR a list of images sequentially (one WASM worker; OCR is memory-heavy).
 * `recognize` is INJECTED: (image) => Promise<{text, words:[{text,confidence}]}>.
 * - page-level progress via onProgress({done,total})
 * - AbortSignal stops between images; partial pages are returned (cancelled ≠ errored)
 * - a thrown image yields an empty page, never rejects the whole run
 * @returns {Promise<{pages, meanConfidence:number, lowConfidenceWords:Set<string>}>}
 */
export async function runOcr(images, { recognize, onProgress, signal } = {}) {
  const results = []
  const allWords = []
  if (typeof recognize !== 'function' || !Array.isArray(images)) {
    return { pages: [], meanConfidence: 0, lowConfidenceWords: new Set() }
  }
  const total = images.length
  for (let idx = 0; idx < images.length; idx += 1) {
    if (signal && signal.aborted) break
    try {
      const r = await recognize(images[idx])
      results.push({ text: (r && r.text) || '' })
      if (r && Array.isArray(r.words)) allWords.push(...r.words)
    } catch {
      results.push({ text: '' })
    }
    if (onProgress) onProgress({ done: idx + 1, total })
  }
  const { pages } = pagesFromOcrResults(results)
  return { pages, meanConfidence: meanConfidence(allWords), lowConfidenceWords: lowConfidenceWords(allWords) }
}
