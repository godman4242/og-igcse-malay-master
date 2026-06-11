// Lazy WASM boundary for OCR — the ONLY impure part of the feature. Never
// imported eagerly (dynamic import keeps Tesseract.js out of the eager bundle,
// like driver.js/pdf). Self-hosted assets under /public/ocr (offline + the
// image never reaches any third-party CDN).
//
// Spec D6/D9/D10. v7 createWorker(langs, oem, options) + recognize(image, {}, {output})
// signature confirmed against context7 (/naptha/tesseract.js) 2026-06-11.

const ASSET_BASE = '/ocr'

/** Pure: Tesseract `data` → flat [{text,confidence}] (blocks→para→lines→words). */
export function flattenWords(data) {
  const words = []
  for (const b of data?.blocks || [])
    for (const p of b?.paragraphs || [])
      for (const l of p?.lines || [])
        for (const w of l?.words || [])
          if (w && typeof w.text === 'string') words.push({ text: w.text, confidence: w.confidence })
  return words
}

const workerCache = new Map() // langKey → worker

/**
 * Create (or reuse) a Tesseract worker for the language set and return a
 * recognizer matching runOcr's injected contract.
 * @param {{langs?: string[], onProgress?: (p:{status:string,progress:number})=>void}} opts
 */
export async function createOcrRecognizer({ langs = ['msa'], onProgress } = {}) {
  const { createWorker } = await import('tesseract.js')
  const langKey = (Array.isArray(langs) ? langs : [langs]).join('+')
  let worker = workerCache.get(langKey)
  if (!worker) {
    worker = await createWorker(langKey, 1 /* OEM.LSTM_ONLY — smaller, no legacy data */, {
      corePath: `${ASSET_BASE}/core`,
      workerPath: `${ASSET_BASE}/worker.min.js`,
      langPath: `${ASSET_BASE}/lang`,
      cacheMethod: 'write', // IndexedDB cache → offline after first run
      gzip: true,
      logger: (m) => { if (onProgress && m && typeof m.progress === 'number') onProgress(m) },
    })
    workerCache.set(langKey, worker)
  }
  return {
    async recognize(image) {
      const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
      return { text: data?.text || '', words: flattenWords(data) }
    },
    async terminate() {
      try { await worker.terminate() } catch { /* already gone */ }
      workerCache.delete(langKey)
    },
  }
}
