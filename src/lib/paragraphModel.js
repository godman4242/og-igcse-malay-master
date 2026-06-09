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
