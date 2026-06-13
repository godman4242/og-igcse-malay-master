// Makes audio transcription self-hosted under public/asr/ (offline + privacy: the
// audio never reaches a third-party CDN). Two parts, both idempotent / safe to re-run:
//   1. Copy the ONNX Runtime Web WASM binaries out of node_modules (regenerated from
//      the @huggingface/transformers → onnxruntime-web dep, like the OCR cores).
//   2. Ensure the converted Whisper ONNX model is in public/asr/model/. If absent,
//      fetch it from the GitHub Release that hosts it (binaries are too big for git:
//      git rejects >100 MB files; a Release allows up to 2 GB each).
//
// Network is needed ONCE for the model (then it sits in public/asr/, gitignored, and
// the fetch is skipped). NON-FATAL by design: a missing/unreachable model only WARNS,
// so the build/commit gate stays green even before the Release exists (mirrors
// scripts/copy-ocr-assets.mjs). The app surfaces a friendly error if the model is
// truly absent at runtime.
//
// Shipped model (CONVERSION.md): mesolitica/malaysian-whisper-base → ONNX, fully int8 (q8).
// Measured on FLEURS: Malay 20.1% WER, English 14.6% (generic onnx-community/whisper-base was
// 50.1% Malay → rejected). transformers.js dtype:'q8' resolves the `_quantized` onnx SUFFIX
// (NOT `_q8`). ~103 MB total (76 MB merged decoder + 22 MB encoder): the merged decoder was
// quantized by quantizing the UN-MERGED decoders then re-merging (quantize_dynamic skips the
// merged decoder's If-subgraph; the fp32-sized 300 MB decoder HANGS in browser WASM).
//
// Spec: docs/superpowers/specs/2026-06-13-multimodal-audio-transcribe-design.md (§4.4, D7)
import { mkdir, cp, access, readdir, writeFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = process.cwd()
const out = join(root, 'public', 'asr')
const modelDir = join(out, 'model')
const onnxDir = join(modelDir, 'onnx')
await mkdir(onnxDir, { recursive: true })

// 1) ONNX Runtime Web WASM binaries. This ORT version's exports map blocks the
//    `onnxruntime-web/package.json` subpath, so resolve the main entry and take its
//    dir; fall back to the conventional node_modules path.
function findOrtDist() {
  try { return dirname(require.resolve('onnxruntime-web')) } catch { /* fall through */ }
  return join(root, 'node_modules', 'onnxruntime-web', 'dist')
}
const ortDir = findOrtDist()
let wasmCount = 0
try {
  const wasmFiles = (await readdir(ortDir)).filter((f) => /ort-wasm.*\.(wasm|mjs)$/.test(f))
  for (const f of wasmFiles) await cp(join(ortDir, f), join(out, f))
  wasmCount = wasmFiles.length
  console.log(`copied ${wasmCount} ORT wasm/mjs files → public/asr/ (from ${ortDir})`)
} catch (e) {
  console.warn(`⚠ could not copy ORT wasm from ${ortDir}: ${e.message}`)
}

// 2) Model — fetch from the GitHub Release if not already on disk.
//    Release asset names are flat (no folders); we map each to its local path.
//    Override the host with ASR_MODEL_BASE_URL (must end with '/').
const TAG = 'asr-model-mesolitica-base-q8'
const DEFAULT_BASE = `https://github.com/godman4242/og-igcse-malay-master/releases/download/${TAG}/`
const BASE = process.env.ASR_MODEL_BASE_URL || DEFAULT_BASE

// The q8 fileset transformers.js loads (dtype:'q8' → only the *_quantized onnx).
const MODEL_FILES = [
  'config.json', 'generation_config.json', 'preprocessor_config.json',
  'tokenizer.json', 'tokenizer_config.json', 'vocab.json', 'merges.txt',
  'normalizer.json', 'added_tokens.json', 'special_tokens_map.json',
  'onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx',
]

async function present(rel) {
  try { const s = await stat(join(modelDir, rel)); return s.size > 0 } catch { return false }
}

const missing = []
for (const rel of MODEL_FILES) if (!(await present(rel))) missing.push(rel)

if (missing.length === 0) {
  console.log('asr model present in public/asr/model/ (config + onnx q8) — skip fetch')
} else {
  console.log(`fetching ${missing.length} model file(s) from ${BASE} …`)
  let ok = 0
  for (const rel of missing) {
    const assetName = rel.split('/').pop() // release assets are flat; basenames are unique
    const dest = join(modelDir, rel)
    try {
      await mkdir(dirname(dest), { recursive: true })
      const res = await fetch(`${BASE}${assetName}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await writeFile(dest, Buffer.from(await res.arrayBuffer()))
      ok += 1
      console.log(`  ✓ ${rel}`)
    } catch (e) {
      console.warn(`  ⚠ ${rel}: ${e.message}`)
    }
  }
  if (ok < missing.length) {
    console.warn(
      `⚠ ASR model incomplete (${ok}/${missing.length} fetched). Audio transcription will\n` +
      `  show a friendly error until the model is hosted. Publish the Release (see CONVERSION.md):\n` +
      `    gh release create ${TAG} public/asr/model/onnx/*_quantized.onnx public/asr/model/*.json public/asr/model/merges.txt\n` +
      `  or set ASR_MODEL_BASE_URL to a host that serves the files in MODEL_FILES.`,
    )
  }
}

console.log('ASR assets step done (public/asr/)')
