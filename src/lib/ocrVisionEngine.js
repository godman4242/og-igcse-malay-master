// Lazy impure boundary for the VISION OCR rung (Phase 2 "Sharper read") —
// mirrors ocrEngine.js: only ever dynamically imported (inside PDFReader's
// runImageOcr), so nothing here reaches the eager bundle. No worker, no WASM —
// the impurity is DOM image decoding + the network call via callInstructVision.
//
// The recognizer satisfies runOcr's INJECTED contract
// (image) => Promise<{text, words}> — vision returns words: [] by design, so
// meanConfidence is 0 and lowConfidenceWords is empty (the Tesseract blurry
// note / dotted cue are suppressed for vision reads; a doc-level provenance
// banner replaces them).
// Spec: docs/superpowers/specs/2026-06-11-past-paper-ocr-vision-rung-design.md (§4.3)

import { callInstructVision } from './instruct'
import { buildVisionMessages, cleanVisionText } from './ocrVision'

// Downscale cap (R7): phone photos are 4000px+; ≤1600px on the long edge is
// plenty for print-size text and shrinks the base64 body (= fewer tokens).
const MAX_EDGE = 1600
const JPEG_QUALITY = 0.9
// A dense past-paper page can exceed 1k words — give the transcription room.
const VISION_MAX_TOKENS = 4096

function dataUrlToInline(dataUrl) {
  const m = String(dataUrl).match(/^data:([^;,]+);base64,(.*)$/)
  if (!m) throw new Error('Unsupported image encoding for vision OCR')
  return { mimeType: m[1], data: m[2] }
}

function scaledDims(width, height, maxEdge) {
  const edge = Math.max(width, height)
  if (!edge || edge <= maxEdge) return { width, height }
  const f = maxEdge / edge
  return { width: Math.round(width * f), height: Math.round(height * f) }
}

function drawToInline(source, width, height, maxEdge) {
  const dims = scaledDims(width, height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = dims.width
  canvas.height = dims.height
  canvas.getContext('2d').drawImage(source, 0, 0, dims.width, dims.height)
  return dataUrlToInline(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
}

/**
 * DOM: one OCR input (File/Blob from the picker, or the canvas a scanned PDF
 * page was rasterised onto) → {mimeType, data} inline base64, downscaled to
 * maxEdge. The bytes leave the device ONLY via callInstructVision afterwards.
 */
export async function imageToInlineData(image, { maxEdge = MAX_EDGE } = {}) {
  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
    if (Math.max(image.width, image.height) <= maxEdge) {
      return dataUrlToInline(image.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    return drawToInline(image, image.width, image.height, maxEdge)
  }
  if (typeof Blob !== 'undefined' && image instanceof Blob) {
    const bitmap = await createImageBitmap(image)
    try {
      return drawToInline(bitmap, bitmap.width, bitmap.height, maxEdge)
    } finally {
      if (typeof bitmap.close === 'function') bitmap.close()
    }
  }
  throw new Error('Unsupported image source for vision OCR')
}

/**
 * Vision counterpart of createOcrRecognizer: returns a recognizer matching
 * runOcr's injected contract. `toInlineData` is injectable for tests (the
 * default is the DOM converter above). No terminate() — there is no worker.
 * @param {{lang?: string, signal?: AbortSignal, toInlineData?: Function}} opts
 */
export function createVisionRecognizer({ lang, signal, toInlineData = imageToInlineData } = {}) {
  return {
    recognize: async (image) => {
      const inline = await toInlineData(image)
      const { systemPrompt, messages } = buildVisionMessages({ lang })
      const text = await callInstructVision({
        systemPrompt,
        messages,
        images: [inline],
        maxTokens: VISION_MAX_TOKENS,
        signal,
      })
      return { text: cleanVisionText(text), words: [] }
    },
  }
}
