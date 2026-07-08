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
// Peak sample amplitude (−1..1) below which audio is treated as silence. Whisper
// HALLUCINATES on silence (e.g. "Terima kasih kerana menonton!" / "Thank you for
// watching" subtitle credits from its training data), so we detect no-speech from
// the decoded audio and skip transcription → friendly empty state instead.
export const SILENCE_PEAK = 0.01

// Distinct, surfaced failure for an over-length clip (#16). The MB cap
// (checked pre-decode in PDFReader) can't bound duration — a 10 MB compressed
// clip can be 20+ min, which would peg main-thread Whisper for minutes. We
// enforce the real bound AFTER decode, from the sample count, and let this
// error propagate so the user gets a friendly, actionable message.
export const AUDIO_TOO_LONG = 'audio_too_long'
export const TOO_LONG_NOTICE = `That recording is longer than ${Math.round(MAX_AUDIO_SECONDS / 60)} min — please trim it to a shorter clip for now.`

/** Decoded audio duration in seconds (samples / sampleRate; 0 when unknown). */
export function audioDurationSeconds(samples, sampleRate) {
  if (!samples || !samples.length || !sampleRate) return 0
  return samples.length / sampleRate
}

/** True when the decoded audio is longer than the length cap. */
export function exceedsMaxAudio(samples, sampleRate, maxSeconds = MAX_AUDIO_SECONDS) {
  return audioDurationSeconds(samples, sampleRate) > maxSeconds
}

/** A tagged, surface-able error for an over-length clip. */
export function audioTooLongError() {
  const err = new Error(TOO_LONG_NOTICE)
  err.code = AUDIO_TOO_LONG
  return err
}

/** True when the decoded samples carry essentially no signal (silence / no speech). */
export function isSilentSamples(samples, peakThreshold = SILENCE_PEAK) {
  if (!samples || !samples.length) return true
  for (let i = 0; i < samples.length; i += 1) {
    if (Math.abs(samples[i]) >= peakThreshold) return false
  }
  return true
}

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
 * - engine error → empty pages + `failed:true`, never rejects (mirrors runOcr)
 * @returns {Promise<{pages, segments, failed?}>}
 */
export async function runTranscribe(audio, { transcribe, onProgress, signal } = {}) {
  if (typeof transcribe !== 'function' || (signal && signal.aborted)) {
    return { pages: [], segments: [] }
  }
  let result
  try {
    result = await transcribe({ audio, onProgress, signal })
  } catch (e) {
    // A too-long clip is a friendly, actionable failure → surface it so the UI
    // can tell the user to trim. Every OTHER engine error degrades to empty
    // pages (mirrors runOcr — a broken decode shouldn't hard-crash the reader),
    // but flags `failed` so the caller can say "couldn't read that recording"
    // instead of falsely blaming the audio as silent. True silence resolves an
    // empty transcript WITHOUT throwing, so it never reaches here (no flag).
    if (e && e.code === AUDIO_TOO_LONG) throw e
    return { pages: [], segments: [], failed: true }
  }
  if (signal && signal.aborted) return { pages: [], segments: [] }
  const { pages } = pagesFromTranscript(result || {})
  return { pages, segments: (result && result.segments) || [] }
}
