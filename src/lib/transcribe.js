// Pure transcript orchestration + helpers — NO DOM, NO network, NO WASM (mirrors
// src/lib/ocr.js). runTranscribe takes an INJECTED `transcribe`, so chunking,
// progress, abort, and the shape transform are fully unit-testable; the lazy
// transformers.js worker lives in ./transcribeEngine.js and is the only impure part.
//
// Spec: docs/superpowers/specs/2026-06-13-multimodal-audio-transcribe-design.md

// A pause longer than this (seconds) between Whisper segments starts a new paragraph.
export const PARA_GAP_S = 1.2
// Audio is linear: paginate by paragraph count so a long recording isn't one giant page.
export const PARAS_PER_PAGE = 8
// Phase-1 length cap (seconds) + size cap (MB) — bounds mobile latency/memory (D12).
export const MAX_AUDIO_SECONDS = 5 * 60
export const MAX_AUDIO_MB = 10

/** Group Whisper segments into paragraphs (long pause = break). */
export function paragraphsFromSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return []
  const paras = []
  let cur = []
  let prevEnd = null
  for (const s of segments) {
    const text = (s && typeof s.text === 'string' ? s.text : '').trim()
    if (!text) continue
    const start = s && typeof s.start === 'number' ? s.start : null
    if (prevEnd !== null && start !== null && start - prevEnd > PARA_GAP_S && cur.length) {
      paras.push(cur.join(' ').replace(/\s+/g, ' ').trim())
      cur = []
    }
    cur.push(text)
    prevEnd = s && typeof s.end === 'number' ? s.end : prevEnd
  }
  if (cur.length) paras.push(cur.join(' ').replace(/\s+/g, ' ').trim())
  return paras.filter(Boolean)
}

/** Transcript → the EXACT shape of extractTextFromDoc(), paginated. */
export function pagesFromTranscript(result, { perPage = PARAS_PER_PAGE } = {}) {
  let paras = paragraphsFromSegments(result && result.segments)
  if (!paras.length) {
    const text = (result && typeof result.text === 'string' ? result.text : '').replace(/\s+/g, ' ').trim()
    paras = text ? [text] : []
  }
  const pages = []
  for (let i = 0; i < paras.length; i += perPage) {
    const paragraphs = paras.slice(i, i + perPage)
    pages.push({ pageNum: pages.length + 1, text: paragraphs.join('\n\n'), paragraphs })
  }
  return { pages }
}

/** True when the transcript has essentially no speech (show a friendly empty state). */
export function emptyTranscriptNotice(result) {
  const text = (result && typeof result.text === 'string' ? result.text : '')
  return text.replace(/\s+/g, '').length === 0
}

/**
 * Transcribe one audio source via an INJECTED engine.
 * `transcribe` is INJECTED: ({ onProgress, signal }) => Promise<{text, segments?}>.
 * - progress via onProgress({ phase, ratio })
 * - AbortSignal: aborted-before-start → empty; engine should observe the signal mid-run
 * - engine error → empty pages, never rejects (mirrors runOcr)
 * @returns {Promise<{pages, segments}>}
 */
export async function runTranscribe(audio, { transcribe, onProgress, signal } = {}) {
  if (typeof transcribe !== 'function' || (signal && signal.aborted)) {
    return { pages: [], segments: [] }
  }
  let result
  try {
    result = await transcribe({ audio, onProgress, signal })
  } catch {
    return { pages: [], segments: [] }
  }
  if (signal && signal.aborted) return { pages: [], segments: [] }
  const { pages } = pagesFromTranscript(result || {})
  return { pages, segments: (result && result.segments) || [] }
}
