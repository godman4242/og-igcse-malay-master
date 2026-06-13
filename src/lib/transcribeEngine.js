// Lazy WASM + Web Audio boundary for transcription — the ONLY impure part of the
// feature. Never imported eagerly (dynamic import keeps transformers.js + ORT out
// of the eager bundle, like tesseract.js/pdf). Self-hosted assets under /public/asr
// (offline + the audio never reaches any third-party CDN).
//
// Spec D7/D11/D13. ASR pipeline signature, dtype/device options, env.localModelPath/
// allowRemoteModels/wasmPaths, and the `chunks` (timestamps) output field confirmed
// against context7 (/huggingface/transformers.js). The API is stable across v3/v4.
//
// ⚠️ PINNED TO @huggingface/transformers v3 (^3.8.1) ON PURPOSE — DO NOT upgrade to v4.
// v4.2.0 pulls a NIGHTLY onnxruntime-web (1.26.0-dev) whose pipeline()/session-create
// DEADLOCKS in the browser (hangs at "Setting up the speech model 100%", never fetches
// the wasm, no error — though it loads fine in Node). v3.8.1 pulls ORT-web 1.22 and works
// in-browser. Re-verify in a real browser before any transformers bump. (2026-06-14)
//
// PHASE-1 DECISION (flagged): inference runs on the MAIN THREAD behind this lazy import
// (the plan's permitted fallback) — de-risks Vite + transformers.js worker bundling for
// the first ship. The injected-contract shape below is identical to a worker's, so the
// #1 follow-up (move createTranscriber into a module Worker → zero UI-freeze) is drop-in.

const ASSET_BASE = '/asr'
// The converted mesolitica/malaysian-whisper-base ONNX lives in public/asr/model/
// (config + tokenizer + onnx/ subfolder). dtype:'q8' resolves the `_quantized` onnx
// files (CONVERSION.md / Task-0 spike). env.localModelPath=/asr → loads from /asr/model.
const MODEL_DIR = 'model'

/** Pure: transformers.js ASR output (chunks w/ timestamps) → runTranscribe's segment shape. */
export function segmentsFromAsrOutput(out) {
  const chunks = out && Array.isArray(out.chunks) ? out.chunks : []
  return chunks
    .filter(c => c && typeof c.text === 'string')
    .map(c => ({
      text: c.text,
      start: Array.isArray(c.timestamp) ? c.timestamp[0] : undefined,
      end: Array.isArray(c.timestamp) ? c.timestamp[1] : undefined,
    }))
}

/** Decode any audio File/Blob → mono 16 kHz Float32Array (what Whisper needs). */
export async function decodeAudioTo16k(fileOrBlob) {
  const arrayBuf = await fileOrBlob.arrayBuffer()
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ac = new Ctx()
  try {
    const decoded = await ac.decodeAudioData(arrayBuf)
    const TARGET = 16000
    // Downmix to mono, then resample to 16 kHz via an OfflineAudioContext.
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * TARGET)), TARGET)
    const src = offline.createBufferSource()
    src.buffer = decoded
    src.connect(offline.destination)
    src.start()
    const rendered = await offline.startRendering()
    return rendered.getChannelData(0)
  } finally {
    try { await ac.close() } catch { /* ignore */ }
  }
}

/** Cheap WebGPU probe: an adapter request, not a pipeline build (avoids a costly double-construct). */
async function pickDevice() {
  try {
    if (typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
      const adapter = await navigator.gpu.requestAdapter()
      if (adapter) return 'webgpu'
    }
  } catch { /* fall through to wasm */ }
  return 'wasm'
}

const pipeCache = new Map() // `${model}:${dtype}` → pipeline

/**
 * Create (or reuse) a transformers.js ASR pipeline and return a transcriber
 * matching runTranscribe's injected contract.
 * @param {{lang?: 'ms'|'en', onProgress?: (p:{phase:string,ratio:number})=>void}} opts
 */
export async function createTranscriber({ lang = 'ms', onProgress } = {}) {
  const { pipeline, env } = await import('@huggingface/transformers')
  // Self-hosted only: enable LOCAL models (the browser build defaults this to false,
  // unlike Node) and disable REMOTE — the model is served from /asr, never a CDN.
  env.allowLocalModels = true
  env.allowRemoteModels = false
  env.localModelPath = ASSET_BASE
  // Don't round-trip the ~76 MB model through transformers.js's Cache API / the HTTP
  // cache — large-file cache writes FAIL on constrained storage (ERR_CACHE_WRITE_FAILURE
  // in headless; also low-end mobile). The service worker owns offline caching of /asr.
  env.useBrowserCache = false
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmPaths = `${ASSET_BASE}/`
    env.backends.onnx.wasm.numThreads = 1
  }
  const dtype = 'q8'
  const key = `${MODEL_DIR}:${dtype}`
  let pipe = pipeCache.get(key)
  if (!pipe) {
    const device = await pickDevice()
    const progress_callback = (p) => {
      if (onProgress && typeof p?.progress === 'number') onProgress({ phase: 'download', ratio: p.progress / 100 })
    }
    pipe = await pipeline('automatic-speech-recognition', MODEL_DIR, { dtype, device, progress_callback })
    pipeCache.set(key, pipe)
  }
  return {
    async transcribe({ audio, signal } = {}) {
      onProgress?.({ phase: 'decode', ratio: 0 })
      const samples = await decodeAudioTo16k(audio)
      if (signal && signal.aborted) return { text: '', segments: [] }
      onProgress?.({ phase: 'transcribe', ratio: 0 })
      const out = await pipe(samples, {
        language: lang === 'en' ? 'english' : 'malay',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      })
      onProgress?.({ phase: 'transcribe', ratio: 1 })
      return { text: out?.text || '', segments: segmentsFromAsrOutput(out) }
    },
    async terminate() {
      try { await pipe?.dispose?.() } catch { /* already gone */ }
      pipeCache.delete(key)
    },
  }
}
