// Pure vision-OCR prompt + post-clean — NO DOM, NO network (mirrors ocr.js).
// The Phase 2 "Sharper read" sends a page image to the user's OWN vision
// provider via callInstructVision; this module owns the transcription prompt
// (verbatim text only — the {pages} mapping relies on preserved line breaks)
// and the defensive fence-strip for models that wrap output anyway.
//
// Spec: docs/superpowers/specs/2026-06-11-past-paper-ocr-vision-rung-design.md (Fork 5)

export const VISION_SYSTEM_PROMPT =
  'You are a precise OCR transcriber. You output only the exact text visible in the image — nothing else.'

// ocrLang pref ('ms' | 'en') → a one-line hint. Unknown lang ⇒ no hint
// (language-agnostic transcription beats a wrong guess).
const LANG_LABELS = { ms: 'Malay', en: 'English' }

/**
 * Build the instruct-seam args for one page transcription.
 * @param {{lang?: string}} [opts]
 * @returns {{systemPrompt: string, messages: Array<{role:string,content:string}>}}
 */
export function buildVisionMessages({ lang } = {}) {
  const label = LANG_LABELS[lang]
  const hint = label ? ` The page is in ${label}.` : ''
  const content =
    'Transcribe ALL text on this page verbatim, preserving reading order and line/paragraph breaks. ' +
    'Output only the transcribed text — no commentary, no translation, no markdown fences.' +
    hint
  return { systemPrompt: VISION_SYSTEM_PROMPT, messages: [{ role: 'user', content }] }
}

/**
 * Defensive clean of a vision model's transcription: trim, and unwrap a
 * single ```-fence (optionally language-tagged) if the model added one
 * despite the prompt. Inner text — including the blank lines the {pages}
 * paragraph split depends on — is preserved.
 * @param {unknown} s
 * @returns {string}
 */
export function cleanVisionText(s) {
  if (typeof s !== 'string') return ''
  let text = s.trim()
  const fenced = text.match(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/)
  if (fenced) text = fenced[1].trim()
  return text
}
