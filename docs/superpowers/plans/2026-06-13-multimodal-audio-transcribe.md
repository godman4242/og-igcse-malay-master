# Study from a Recording — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner upload or record a clip (a teacher's voice note, a listening track) and study the transcript in the existing reader — free, on-device Whisper feeding the unchanged reveal-gated gloss → FSRS pipeline.

**Architecture:** A pure orchestration module (`src/lib/transcribe.js`, injected engine — mirrors `src/lib/ocr.js`) emits the **exact `{pages:[{pageNum,text,paragraphs}]}` shape** the reader already consumes; a lazy WASM boundary (`src/lib/transcribeEngine.js`, transformers.js + ONNX Runtime Web, self-hosted) is the only impure part; `PDFReader.handleFile` branches on `audio/*`. **The word-gloss→FSRS reader core is never touched.**

**Tech Stack:** `@huggingface/transformers` v3 (transformers.js, Apache-2.0) + ONNX Runtime Web, Whisper ONNX (MIT) self-hosted under `public/asr/`, Web Audio API (decode→16 kHz), MediaRecorder (record mode), Vitest, Playwright, Zustand.

**Spec:** `docs/superpowers/specs/2026-06-13-multimodal-audio-transcribe-design.md` (read it for WHY / decision log / acceptance criteria F1–F3, Q-ACC/Q-WER/Q-EMPTY, N1–N7).

---

## ▶️ NEXT SESSION = TASK-0 SPIKE ONLY (recommended — paste this box)

> The recommended next step is **Task 0 alone**, not the full build. It measures the one fact that decides the whole feature (real Malay WER) and uses a Python/ONNX toolchain separate from the React build. No app code, no UI this session.

```
Run Task 0 of docs/superpowers/plans/2026-06-13-multimodal-audio-transcribe.md — the
on-device Whisper model spike. GOAL: a measured, real Malay (+English) word-error-rate
and a model decision, BEFORE any reader code.

Read first: the plan's "Task 0" section (steps 0a→0d) + spec §3a/§5-D1/D3. Don't
re-derive — follow the steps.

DO exactly Task 0, in order:
  0a  pull ~5 FLEURS ms_my + ~5 en_us clips (+transcripts) to ./tmp-asr-fixtures/;
      prove the plumbing with the PRE-CONVERTED onnx-community/whisper-base (zero
      conversion); build scripts/asr-accuracy-harness.mjs; record the GENERIC Malay+EN WER.
  0b  convert mesolitica/malaysian-whisper-base → ONNX q8 via the transformers.js
      scripts/convert.py (NOT raw optimum-cli); self-host under public/asr/model/onnx/;
      smoke-load + record the MESOLITICA Malay+EN WER.
  0c  DECIDE (decide-and-flag): mesolitica loads & Malay ≤40% WER → ship mesolitica;
      else generic ≤40% → ship generic, defer mesolitica to 1.5; else BOTH >40% → fire
      D1's veto (Malay = BYOK-primary, English stays on-device). Write the chosen model,
      the working convert command, the onnx file suffix, and BOTH WER numbers into the
      copy-asr-assets.mjs header + spec §3a + RESUME_HERE.
  0d  commit the harness + recipe (no model binaries).

OBSERVABLE DONE: a console.table of word-accuracy for generic vs mesolitica on FLEURS
Malay + English; a one-line model decision recorded in RESUME_HERE; scripts/asr-accuracy-
harness.mjs committed. NO reader/UI/store code changed.

CONSTRAINTS: free + on-device only; this is a measurement spike — remote model load is
fine HERE (it's not the app). Re-confirm the @huggingface/transformers v3 ASR API via
context7 if anything errors. Questions only for destructive/money/invariant.

REPORT BACK: the two Malay WER numbers + which branch of 0c fired, then STOP — the Phase-1
build is a separate session (its kickoff is at the bottom of this plan).
```

VERIFY (you): the session prints a word-accuracy table and records the Malay WER in `RESUME_HERE.md`; no files under `src/` change.

---

## File structure (decomposition locked here)

- **Create** `src/lib/transcribe.js` — pure helpers + `runTranscribe` orchestration (no DOM/network/WASM).
- **Create** `src/lib/transcribe.test.js` — unit tests for the above.
- **Create** `src/lib/transcribeEngine.js` — lazy transformers.js boundary + audio decode (self-hosted paths).
- **Create** `src/lib/transcribeEngine.test.js` — unit tests for the pure helper(s) only (WASM/audio via e2e).
- **Modify** `package.json` — add `@huggingface/transformers`; add the asr asset-copy to `prebuild`/`postinstall`; add `asr:assets`, `asr:fixtures` scripts.
- **Create** `scripts/copy-asr-assets.mjs` — copy ORT-Web WASM from node_modules + place the converted Whisper ONNX into `public/asr/`.
- **Create** `CONVERSION.md` (or a short note in `copy-asr-assets.mjs`'s header) — Task-0 output: the exact transformers.js `scripts/convert.py` command + quantization that produced the shipped ONNX (so it's reproducible).
- **Create** `scripts/gen-asr-fixtures.mjs` — render known Malay/English TTS clips + ground truth.
- **Create** `scripts/asr-accuracy-harness.mjs` — manual WER harness (reuses OCR harness's `wordAccuracy`).
- **Modify** `vite.config.js` — PWA runtime-cache + `globIgnores` for `/asr/**`.
- **Modify** `src/store/useStore.js` — `pdfReader.asrLang` pref + STORE_VERSION 32→33 migration.
- **Modify** `src/pages/PDFReader.jsx` — accept widening + record affordance + entry copy; `handleFile` audio branch; progress + cancel; `<audio>` replay + "auto-transcript" note; empty-state.
- **Create** `tests/e2e/audio-transcribe.spec.js` — happy path, record, blank, go-wild.
- **Modify** `RESUME_HERE.md` + `CLAUDE.md` — feature note + recorded WER + lazy chunk size (final commit).

**Build order:** 0 spike (go/no-go on the model) → 1–2 pure logic → 3 engine → 4 deps/assets → 5 fixtures → 6 e2e-first happy path → 7–8 wiring → 9 store pref → 10 harness → 11 go-wild e2e → 12 docs/verify/deploy.

---

## Task 0: Model de-risk spike — BLOCKING go/no-go (NOT TDD)

> **This decides spec D3.** Until it passes, do not wire the reader. Output: a self-hostable Whisper ONNX that loads in transformers.js **and** a measured **real** Malay WER (on FLEURS `ms_my`, the same test set mesolitica benchmarks on → directly comparable). The whole point is to learn the real Malay number BEFORE building UI on top of it.
>
> **Order matters — isolate the two unknowns.** 0a proves the *plumbing* (transformers.js + self-host + WER harness) with a **pre-converted** model (zero conversion risk) AND gives the *generic* Malay baseline. 0b then attempts the *mesolitica conversion* (the higher-quality but riskier model). 0c decides.

- [ ] **Step 0a-i: Grab real WER fixtures (FLEURS — no recording needed)**

In a one-off Python venv, pull ~5 Malay + ~5 English FLEURS test clips with their transcripts to `./tmp-asr-fixtures/` (each `<name>.wav` 16 kHz mono beside a same-name `<name>.txt`):
```bash
python -m venv .venv-asr && source .venv-asr/bin/activate
pip install "datasets[audio]" soundfile librosa
python - <<'PY'
import os, soundfile as sf, librosa
from datasets import load_dataset
os.makedirs('tmp-asr-fixtures', exist_ok=True)
for cfg, lang in [('ms_my','ms'), ('en_us','en')]:
    ds = load_dataset('google/fleurs', cfg, split='test', streaming=True)
    for i, ex in zip(range(5), ds):
        a = ex['audio']; y = librosa.resample(a['array'], orig_sr=a['sampling_rate'], target_sr=16000)
        sf.write(f'tmp-asr-fixtures/{lang}-{i}.wav', y, 16000)
        open(f'tmp-asr-fixtures/{lang}-{i}.txt','w').write(ex['transcription'])
print('FLEURS fixtures ready in tmp-asr-fixtures/')
PY
```
Expected: 10 `.wav` + 10 `.txt` pairs. (`tmp-asr-fixtures/` is throwaway — gitignore it; the committed e2e fixtures are the separate TTS clips from Task 5.)

- [ ] **Step 0a-ii: Prove the plumbing with a PRE-CONVERTED generic model (zero conversion)**

`onnx-community/whisper-base` is already ONNX for transformers.js. Smoke-load it from the Hub (remote allowed here — this is a spike, not the app) and transcribe one Malay clip:
```bash
node --input-type=module -e "
import { pipeline } from '@huggingface/transformers';
const t = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', { dtype: 'q8' });
const out = await t('./tmp-asr-fixtures/ms-0.wav', { language: 'malay', task: 'transcribe', chunk_length_s: 30, return_timestamps: true });
console.log(out.text);
"
```
Expected: it prints Malay text (proves the pipeline + the `{language:'malay'}` hint work). If THIS fails, the problem is the toolchain, not the model — fix that before 0b.

- [ ] **Step 0a-iii: Measure the GENERIC baseline WER (build the harness first — Task 10)**

Build `scripts/asr-accuracy-harness.mjs` now (jump to Task 10; it's needed here), then point it at the generic model + FLEURS fixtures:
```bash
node scripts/asr-accuracy-harness.mjs --model onnx-community/whisper-base --remote --dir ./tmp-asr-fixtures --lang ms
node scripts/asr-accuracy-harness.mjs --model onnx-community/whisper-base --remote --dir ./tmp-asr-fixtures --lang en
```
Record the generic Malay + English word-accuracy. (Add `--model`/`--remote` flags to the Task-10 harness so it can target a Hub id, not only the self-hosted dir.)

- [ ] **Step 0b: Convert mesolitica → ONNX with the transformers.js script (the Malay quality lever)**

Use the **transformers.js conversion script** (wraps Optimum, but is the path Xenova tests — generic `optimum-cli` is what hits issues #1118/#1040). Clone transformers.js for the script, convert + quantize into the HF-style dir (note the **`onnx/` subfolder** transformers.js requires):
```bash
pip install "optimum[onnxruntime]" onnx onnxruntime
git clone --depth 1 https://github.com/huggingface/transformers.js && cd transformers.js
python -m scripts.convert --model_id mesolitica/malaysian-whisper-base --quantize --task automatic-speech-recognition
# → ./models/mesolitica/malaysian-whisper-base/ with config.json, tokenizer.json,
#   tokenizer_config.json, generation_config.json, preprocessor_config.json, and
#   onnx/{encoder_model,decoder_model_merged}{,_quantized}.onnx
```
Fallback if the script chokes on the custom checkpoint:
```bash
optimum-cli export onnx --model mesolitica/malaysian-whisper-base ./mesolitica-onnx \
  --task automatic-speech-recognition-with-past --opset 14
# then move the .onnx files under a public/asr/model/onnx/ subfolder + copy the JSON configs
```
Place the result at `public/asr/model/` (so `public/asr/model/onnx/*.onnx` + the JSON sit together). **dtype/suffix gotcha:** transformers.js v3 picks the file by `dtype` — `dtype:'q8'` looks for `*_q8.onnx` (the script may emit `*_quantized.onnx`); either rename to the `_q8` suffix or pass the matching dtype string. Confirm the exact suffix the script produced and record it.

- [ ] **Step 0b-ii: Smoke-load the SELF-HOSTED mesolitica model + measure its WER**

```bash
node --input-type=module -e "
import { pipeline, env } from '@huggingface/transformers';
env.allowRemoteModels = false; env.localModelPath = './public/asr';
const t = await pipeline('automatic-speech-recognition', 'model', { dtype: 'q8' });
const out = await t('./tmp-asr-fixtures/ms-0.wav', { language: 'malay', task: 'transcribe', chunk_length_s: 30, return_timestamps: true });
console.log(out.text);
"
node scripts/asr-accuracy-harness.mjs --dir ./tmp-asr-fixtures --lang ms
node scripts/asr-accuracy-harness.mjs --dir ./tmp-asr-fixtures --lang en
```
Expected: loads from the local path (not a load error) and prints a mesolitica Malay + English word-accuracy. **Known risk:** custom-Whisper conversion has tfjs issues (#1118/#1040) — a load/generate throw here is the no-go signal for mesolitica.

- [ ] **Step 0c: DECIDE (decide-and-flag) and write it down**

Compare the two Malay numbers (generic vs mesolitica) from 0a-iii and 0b-ii:
- **mesolitica loads AND Malay WER ≤ 40% (accuracy ≥ 60%)** → ship **mesolitica-base** on-device for both MS+EN (it should clearly beat generic on Malay — that's its whole point). Proceed.
- **mesolitica won't convert/load** but **generic Malay WER ≤ 40%** → ship **onnx-community/whisper-base** (self-host it via `scripts/copy-asr-assets.mjs` — no conversion), queue mesolitica for Phase 1.5. Proceed.
- **both Malay WER > 40%** → **fire D1's veto**: Malay becomes **BYOK-primary** (pull Phase 2's "Sharper listen" forward for Malay), English stays on-device generic-base. Re-scope the plan's reader tasks accordingly. Proceed with the resolved shape.
- Write the chosen model id, the conversion commands that worked, the exact ONNX file names/suffix, and **both** Malay + English WER numbers into the header of `scripts/copy-asr-assets.mjs` + spec §3a + RESUME_HERE.

- [ ] **Step 0d: Commit the conversion recipe (not the model binaries yet)**

```bash
git add scripts/asr-accuracy-harness.mjs .gitignore   # + a CONVERSION.md recipe if you wrote one
git commit -m "spike(asr): WER harness + measured generic/mesolitica Malay WER, model decision (Task 0)"
```

---

## Task 1: Pure transcript helpers (`src/lib/transcribe.js`)

**Files:**
- Create: `src/lib/transcribe.js`
- Test: `src/lib/transcribe.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/transcribe.test.js
import { describe, it, expect } from 'vitest'
import {
  paragraphsFromSegments, pagesFromTranscript, emptyTranscriptNotice,
  PARA_GAP_S, PARAS_PER_PAGE,
} from './transcribe'

describe('paragraphsFromSegments', () => {
  it('breaks a paragraph on a long pause between segments', () => {
    const segs = [
      { text: 'Saya suka makan nasi lemak.', start: 0, end: 2 },
      { text: 'Ia sedap pada waktu pagi.', start: 2.3, end: 4 },        // small gap → same para
      { text: 'Hari ini cuaca panas.', start: 4 + PARA_GAP_S + 1, end: 7 }, // big gap → new para
    ]
    expect(paragraphsFromSegments(segs)).toEqual([
      'Saya suka makan nasi lemak. Ia sedap pada waktu pagi.',
      'Hari ini cuaca panas.',
    ])
  })
  it('no timestamps → one joined paragraph', () => {
    expect(paragraphsFromSegments([{ text: 'A' }, { text: 'B' }])).toEqual(['A B'])
  })
  it('non-array / empty → []', () => {
    expect(paragraphsFromSegments(null)).toEqual([])
    expect(paragraphsFromSegments([])).toEqual([])
  })
})

describe('pagesFromTranscript', () => {
  it('produces the extractTextFromDoc shape, paginating by PARAS_PER_PAGE', () => {
    const paras = Array.from({ length: PARAS_PER_PAGE + 1 }, (_, i) => `P${i}.`)
    const segs = paras.map((t, i) => ({ text: t, start: i * (PARA_GAP_S + 2), end: i * (PARA_GAP_S + 2) + 1 }))
    const { pages } = pagesFromTranscript({ segments: segs })
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ pageNum: 1 })
    expect(pages[0].paragraphs).toHaveLength(PARAS_PER_PAGE)
    expect(pages[1].paragraphs).toEqual(['P' + PARAS_PER_PAGE + '.'])
    expect(pages[0].text).toBe(pages[0].paragraphs.join('\n\n'))
  })
  it('falls back to text when there are no segments', () => {
    const { pages } = pagesFromTranscript({ text: 'Satu dua tiga.' })
    expect(pages[0].paragraphs).toEqual(['Satu dua tiga.'])
  })
  it('empty → no pages', () => {
    expect(pagesFromTranscript({ text: '' }).pages).toEqual([])
  })
})

describe('emptyTranscriptNotice', () => {
  it('true for blank / whitespace transcripts', () => {
    expect(emptyTranscriptNotice({ text: '   ' })).toBe(true)
    expect(emptyTranscriptNotice({ text: '' })).toBe(true)
  })
  it('false when there is real text', () => {
    expect(emptyTranscriptNotice({ text: 'Saya suka makan.' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/transcribe.test.js`
Expected: FAIL — `Failed to resolve import "./transcribe"`.

- [ ] **Step 3: Write the implementation**

```js
// src/lib/transcribe.js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/transcribe.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcribe.js src/lib/transcribe.test.js
git commit -m "feat(asr): pure transcript→pages helpers (Task 1)"
```

---

## Task 2: `runTranscribe` orchestration (injected engine)

**Files:**
- Modify: `src/lib/transcribe.js`
- Test: `src/lib/transcribe.test.js`

- [ ] **Step 1: Add the failing tests**

```js
// append to src/lib/transcribe.test.js
import { runTranscribe } from './transcribe'

describe('runTranscribe', () => {
  it('returns the pages shape from the injected engine', async () => {
    const transcribe = async () => ({ text: 'Satu.', segments: [{ text: 'Satu.', start: 0, end: 1 }] })
    const { pages } = await runTranscribe('audio', { transcribe })
    expect(pages[0].paragraphs).toEqual(['Satu.'])
  })

  it('threads progress phases', async () => {
    const seen = []
    const transcribe = async ({ onProgress } = {}) => { onProgress?.({ phase: 'transcribe', ratio: 1 }); return { text: 'A' } }
    await runTranscribe('audio', { transcribe, onProgress: p => seen.push(p) })
    expect(seen.at(-1)).toMatchObject({ phase: 'transcribe', ratio: 1 })
  })

  it('engine throw → empty pages, never rejects', async () => {
    const transcribe = async () => { throw new Error('boom') }
    const { pages } = await runTranscribe('audio', { transcribe })
    expect(pages).toEqual([])
  })

  it('abort before start → empty pages (cancelled !== errored)', async () => {
    const ctrl = new AbortController(); ctrl.abort()
    let called = false
    const transcribe = async () => { called = true; return { text: 'x' } }
    const { pages } = await runTranscribe('audio', { transcribe, signal: ctrl.signal })
    expect(called).toBe(false)
    expect(pages).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/transcribe.test.js`
Expected: FAIL — `runTranscribe is not a function`.

- [ ] **Step 3: Implement `runTranscribe`**

```js
// append to src/lib/transcribe.js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/transcribe.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcribe.js src/lib/transcribe.test.js
git commit -m "feat(asr): runTranscribe orchestration with progress + abort (Task 2)"
```

---

## Task 3: Lazy transformers.js engine boundary (`src/lib/transcribeEngine.js`)

**Files:**
- Create: `src/lib/transcribeEngine.js`
- Test: `src/lib/transcribeEngine.test.js`

> WASM/audio can't run in Vitest; test only a **pure helper** here (`segmentsFromAsrOutput` — normalises transformers.js's `chunks` into the `{text,start,end}` shape `runTranscribe` expects). The worker/pipeline is exercised by e2e (Tasks 6/11). **Before writing, re-confirm the `@huggingface/transformers` v3 ASR pipeline signature, `dtype`/`device` options, `env.localModelPath`/`allowRemoteModels`, and whether the output field is `chunks` or `segments` via context7** (`/huggingface/transformers.js`).

- [ ] **Step 1: Write the failing test (pure helper only)**

```js
// src/lib/transcribeEngine.test.js
import { describe, it, expect } from 'vitest'
import { segmentsFromAsrOutput } from './transcribeEngine'

describe('segmentsFromAsrOutput', () => {
  it('maps Whisper chunks [{text,timestamp:[s,e]}] → [{text,start,end}]', () => {
    const out = { text: 'Satu dua.', chunks: [
      { text: 'Satu', timestamp: [0, 0.5] }, { text: 'dua.', timestamp: [0.5, 1] },
    ] }
    expect(segmentsFromAsrOutput(out)).toEqual([
      { text: 'Satu', start: 0, end: 0.5 },
      { text: 'dua.', start: 0.5, end: 1 },
    ])
  })
  it('missing chunks → []', () => {
    expect(segmentsFromAsrOutput({ text: 'x' })).toEqual([])
    expect(segmentsFromAsrOutput(null)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:run -- src/lib/transcribeEngine.test.js`
Expected: FAIL — `Failed to resolve import "./transcribeEngine"`.

- [ ] **Step 3: Implement the engine**

```js
// src/lib/transcribeEngine.js
// Lazy WASM + Web Audio boundary for transcription — the ONLY impure part of the
// feature. Never imported eagerly (dynamic import keeps transformers.js + ORT out
// of the eager bundle, like tesseract.js/pdf). Self-hosted assets under /public/asr
// (offline + the audio never reaches any third-party CDN).
//
// Spec D7/D11/D13. VERIFY the @huggingface/transformers v3 ASR pipeline signature,
// dtype/device options, env.localModelPath, and the chunks/segments field name via
// context7 (/huggingface/transformers.js) before edit.

const ASSET_BASE = '/asr'
// Filled in by Task 0's conversion output (the local model dir under public/asr).
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
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET), TARGET)
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

const pipeCache = new Map() // `${model}:${dtype}` → pipeline

/**
 * Create (or reuse) a transformers.js ASR pipeline and return a transcriber
 * matching runTranscribe's injected contract.
 * @param {{lang?: 'ms'|'en', onProgress?: (p:{phase:string,ratio:number})=>void}} opts
 */
export async function createTranscriber({ lang = 'ms', onProgress } = {}) {
  const { pipeline, env } = await import('@huggingface/transformers')
  env.allowRemoteModels = false
  env.localModelPath = ASSET_BASE
  if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.wasmPaths = `${ASSET_BASE}/`
  const dtype = 'q8'
  const key = `${MODEL_DIR}:${dtype}`
  let pipe = pipeCache.get(key)
  if (!pipe) {
    // Auto-detect device: try webgpu, fall back to wasm (practitioner consensus —
    // WebGPU is inconsistent across browsers). transformers.js falls back internally
    // when device:'webgpu' is unsupported; if construction throws, retry on wasm.
    try {
      pipe = await pipeline('automatic-speech-recognition', MODEL_DIR, {
        dtype, device: 'webgpu',
        progress_callback: (p) => { if (onProgress && typeof p?.progress === 'number') onProgress({ phase: 'download', ratio: p.progress / 100 }) },
      })
    } catch {
      pipe = await pipeline('automatic-speech-recognition', MODEL_DIR, {
        dtype, device: 'wasm',
        progress_callback: (p) => { if (onProgress && typeof p?.progress === 'number') onProgress({ phase: 'download', ratio: p.progress / 100 }) },
      })
    }
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
```
> **Worker note:** for Phase 1, run the pipeline on the main thread behind the lazy import if a Web Worker proves fiddly with Vite + transformers.js; the spec wants a Worker (N4). Confirm whisper-web's worker setup and, if straightforward, move `createTranscriber` into a worker (`new Worker(new URL('./transcribeWorker.js', import.meta.url), { type: 'module' })`). Keep the injected-contract shape identical so `runTranscribe` is unchanged either way. Decide at impl; default to a Worker — fall back to main-thread only if Vite worker bundling of transformers.js blocks the ship (log the decision).

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:run -- src/lib/transcribeEngine.test.js`
Expected: PASS (segmentsFromAsrOutput cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transcribeEngine.js src/lib/transcribeEngine.test.js
git commit -m "feat(asr): lazy transformers.js engine + audio decode + segment map (Task 3)"
```

---

## Task 4: Dependency + self-hosted assets + PWA cache

**Files:**
- Modify: `package.json`
- Create: `scripts/copy-asr-assets.mjs`
- Modify: `vite.config.js`

- [ ] **Step 1: Add the dependency**

Run: `npm install @huggingface/transformers`
Expected: `@huggingface/transformers` in `dependencies`; ORT-Web pulled in transitively.

- [ ] **Step 2: Write the asset-copy script (mirrors `scripts/copy-ocr-assets.mjs`)**

```js
// scripts/copy-asr-assets.mjs
// Copies the ONNX Runtime Web WASM out of node_modules and ensures the converted
// Whisper model (from Task 0) is in place under public/asr/ so transcription is
// self-hosted (offline + privacy: the audio never reaches a third-party CDN).
// Idempotent; safe to re-run.
//
// Task-0 record (FILL IN): chosen model = <id>; conversion = `python -m scripts.convert
// --model_id <id> --quantize --task automatic-speech-recognition` (transformers.js script);
// onnx file names/suffix = <encoder>, <decoder> (e.g. *_q8.onnx); measured Malay WER = <n>%,
// English WER = <n>%.
//
// Model dir layout transformers.js expects (HF-style): public/asr/model/config.json,
// tokenizer.json, tokenizer_config.json, generation_config.json, preprocessor_config.json,
// AND an onnx/ SUBFOLDER with the (quantized) encoder + decoder_merged .onnx files.
//
// Spec: docs/superpowers/specs/2026-06-13-multimodal-audio-transcribe-design.md (§4.4, D7)
import { mkdir, cp, access, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const root = process.cwd()
const out = join(root, 'public', 'asr')
await mkdir(out, { recursive: true })

// 1) ONNX Runtime Web WASM binaries (transformers.js depends on onnxruntime-web).
const ortDir = join(dirname(require.resolve('onnxruntime-web/package.json')), 'dist')
const wasmFiles = (await readdir(ortDir)).filter((f) => /\.(wasm|mjs)$/.test(f) && /ort-wasm/.test(f))
for (const f of wasmFiles) await cp(join(ortDir, f), join(out, f))
console.log(`copied ${wasmFiles.length} ORT wasm files → public/asr/`)

// 2) Model dir — produced by Task 0's conversion into public/asr/model/ (with an onnx/
//    subfolder). Verify both the config and the onnx/ subfolder are present.
try {
  await access(join(out, 'model', 'config.json'))
  await access(join(out, 'model', 'onnx'))
  console.log('asr model present in public/asr/model/ (config + onnx/)')
} catch {
  console.warn('⚠ public/asr/model/{config.json,onnx/} not found — run the Task-0 conversion (see header) first.')
}
console.log('ASR assets ready in public/asr/')
```
> **Decision to confirm at impl (spec §4.4):** commit the q8 model (~40–90 MB) vs gitignore + fetch/convert on build. Default: **gitignore `public/asr/model/*.onnx` + the WASM**, commit the small JSON config + tokenizer; document the one-time conversion in the script header. Confirm the exact ORT-Web dist filenames against the installed version.

- [ ] **Step 3: Wire the script into build**

In `package.json` `scripts`, add `"asr:assets": "node scripts/copy-asr-assets.mjs"`, append it to `prebuild` and `postinstall` (alongside the OCR copy):
```json
"prebuild": "node scripts/copy-ocr-assets.mjs && node scripts/copy-asr-assets.mjs",
"postinstall": "if [ -z \"$CI\" ]; then npm run install-githooks; fi && node scripts/copy-ocr-assets.mjs && node scripts/copy-asr-assets.mjs"
```

- [ ] **Step 4: Run it once + verify**

Run: `npm run asr:assets`
Expected: `public/asr/ort-wasm*.wasm` exist; the model-dir presence note prints.

- [ ] **Step 5: PWA runtime-cache for /asr (offline transcription)**

In `vite.config.js`, add a `runtimeCaching` rule beside the `/ocr/` one and extend `globIgnores`:
```js
// globIgnores: ['**/ocr/**', '**/og-image.png']  →  add '**/asr/**'
globIgnores: ['**/ocr/**', '**/asr/**', '**/og-image.png'],
// runtimeCaching: prepend
{
  urlPattern: ({ url }) => url.pathname.startsWith('/asr/'),
  handler: 'CacheFirst',
  options: {
    cacheName: 'asr-assets',
    expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
    cacheableResponse: { statuses: [0, 200] },
  },
},
```

- [ ] **Step 6: Verify build still green + bundle unchanged**

Run: `npm run build`
Expected: build succeeds; **eager `index-*.js` unchanged (±0)**; no transformers.js/ORT in the eager bundle (dynamically imported). Note the new lazy chunk.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/copy-asr-assets.mjs vite.config.js .gitignore
git commit -m "build(asr): add transformers.js dep, self-hosted ORT/model copy, PWA cache (Task 4)"
```

---

## Task 5: Test fixtures (known-text audio)

**Files:**
- Create: `scripts/gen-asr-fixtures.mjs`
- Create (generated/committed): `tests/e2e/fixtures/asr-clean-malay.wav`, `asr-clean-english.wav`, `asr-ground-truth.json`

- [ ] **Step 1: Write the fixture generator**

```js
// scripts/gen-asr-fixtures.mjs
// Produces a known Malay + English audio clip + ground-truth text so the e2e can
// assert transcription word-accuracy (Q-ACC) deterministically. Uses a TTS source
// (espeak-ng / say on macOS / a committed WAV) → 16 kHz mono WAV.
// CAVEAT (spec Q-ACC): TTS audio is crisp/synthetic → this is a pipeline-correctness
// floor, NOT a real-world accuracy number (that's the manual harness, Task 10).
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const dir = join(process.cwd(), 'tests', 'e2e', 'fixtures')
await mkdir(dir, { recursive: true })

const MS = 'Saya suka makan nasi lemak pada waktu pagi.'
const EN = 'The weather today is very hot and sunny.'

// macOS `say` → aiff → ffmpeg 16k mono wav; on Linux use espeak-ng. Adjust to the
// dev machine; commit the resulting WAVs so CI needs no TTS binary.
function tts(text, voice, outWav) {
  const aiff = outWav.replace(/\.wav$/, '.aiff')
  execFileSync('say', ['-v', voice, '-o', aiff, text])
  execFileSync('ffmpeg', ['-y', '-i', aiff, '-ar', '16000', '-ac', '1', outWav])
}
try {
  tts(MS, 'Amira', join(dir, 'asr-clean-malay.wav'))   // a Malay-capable macOS voice if present
  tts(EN, 'Samantha', join(dir, 'asr-clean-english.wav'))
} catch (e) {
  console.warn('TTS unavailable — commit asr-clean-*.wav manually:', e.message)
}
await writeFile(join(dir, 'asr-ground-truth.json'), JSON.stringify({ ms: MS, en: EN }, null, 2))
console.log('ASR fixtures written to', dir)
```

- [ ] **Step 2: Add a script entry + run**

In `package.json` `scripts`: `"asr:fixtures": "node scripts/gen-asr-fixtures.mjs"`.
Run: `npm run asr:fixtures` (or hand-commit the WAVs).
Expected: `asr-clean-malay.wav`, `asr-clean-english.wav`, `asr-ground-truth.json` exist under `tests/e2e/fixtures/`.

- [ ] **Step 3: Commit**

```bash
git add scripts/gen-asr-fixtures.mjs package.json tests/e2e/fixtures/asr-*
git commit -m "test(asr): known-text Malay+English audio fixtures + ground truth (Task 5)"
```

---

## Task 6: e2e happy-path FIRST (drives the wiring), then the entry/accept wiring

**Files:**
- Create: `tests/e2e/audio-transcribe.spec.js`
- Modify: `src/pages/PDFReader.jsx` (entry card + `accept` + record affordance)

- [ ] **Step 1: Write the failing happy-path e2e**

```js
// tests/e2e/audio-transcribe.spec.js
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const fx = (n) => join(process.cwd(), 'tests', 'e2e', 'fixtures', n)
const groundTruth = JSON.parse(readFileSync(fx('asr-ground-truth.json'), 'utf8'))

// Cold model download + WASM inference is slow → raise the per-test timeout (mirrors OCR).
test('recording of clear Malay → readable, tappable transcript (F1, Q-ACC)', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('asr-clean-malay.wav'))
  await expect(page.getByText(/transcrib|speech model/i)).toBeVisible()
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 150_000 })

  const rendered = (await page.getByTestId('reader-reflow').innerText()).toLowerCase()
  const words = groundTruth.ms.toLowerCase().replace(/[.,]/g, '').split(/\s+/)
  const hit = words.filter(w => rendered.includes(w)).length
  expect(hit / words.length).toBeGreaterThanOrEqual(0.85)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:e2e -- audio-transcribe`
Expected: FAIL — the file input rejects the WAV (accept) / no audio path yet.

- [ ] **Step 3: Widen accept + add record affordance + entry copy**

In `src/pages/PDFReader.jsx`, both file inputs:
```jsx
<input ref={fileInputRef} type="file" accept="application/pdf,image/*,audio/*" className="hidden"
  onChange={(e) => handleFile(e.target.files?.[0])} />
```
Empty-state card copy + record button (mobile-friendly; mirrors the OCR camera affordance):
```jsx
<p className="text-sm font-bold mb-1">Drop a PDF, photo, or recording — or record now</p>
<p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
  🎙️ Quiet room · clear speech · record only what you're allowed to — transcribed on your device, never uploaded.
</p>
<button type="button" onClick={(e) => { e.stopPropagation(); toggleRecord() }}
  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold"
  style={{ background: 'var(--color-accent)', color: 'var(--color-on-bright)' }}>
  {recording ? 'Stop recording' : 'Record'}
</button>
```
Add the record state/refs near the others: `const [recording, setRecording] = useState(false)`, `const mediaRecRef = useRef(null)`, `const recChunksRef = useRef([])`. `toggleRecord` uses `navigator.mediaDevices.getUserMedia({audio:true})` → `MediaRecorder` → on stop, build a `Blob` → `handleFile(blob)`.

- [ ] **Step 4: Re-run e2e (still fails at transcription — that's Task 7)**

Run: `npm run test:e2e -- audio-transcribe`
Expected: input now accepts the WAV; FAIL at "transcribing"/`nasi` (no audio branch yet). Proceed to Task 7.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/audio-transcribe.spec.js src/pages/PDFReader.jsx
git commit -m "feat(asr): widen reader to audio + record affordance; happy-path e2e (Task 6)"
```

---

## Task 7: `handleFile` audio branch + progress + cancel + replay

**Files:**
- Modify: `src/pages/PDFReader.jsx`

- [ ] **Step 1: Add ASR state + the audio branch**

Near the other `useState`:
```jsx
const [asrProgress, setAsrProgress] = useState(null) // null | {phase, ratio}
const [audioUrl, setAudioUrl] = useState(null)       // object URL for replay
const asrAbortRef = useRef(null)
const asrEngineRef = useRef(null)
const asrLang = useStore(s => s.pdfReader?.asrLang) || 'ms' // Task 9
```
In `handleFile`, add an audio branch (parse-first guard mirrors the shipped C7 PDF safety — don't reset the open doc until the new source is in hand):
```jsx
const isAudio = file.type?.startsWith('audio/')
if (isAudio) return runAudioTranscribe(file)
```
Add the runner (uses `runTranscribe` + the lazy engine; forces reflow):
```jsx
const runAudioTranscribe = useCallback(async (file) => {
  if (file.size > MAX_AUDIO_MB * 1024 * 1024) { setError(`Audio is too large (max ${MAX_AUDIO_MB} MB for now).`); return }
  const { runTranscribe, emptyTranscriptNotice } = await import('../lib/transcribe')
  const { createTranscriber } = await import('../lib/transcribeEngine')
  resetGloss(); destroyDoc()
  setView('reflow'); setPdfDoc(null)
  setError(null); setAsrProgress({ phase: 'download', ratio: 0 })
  if (audioUrl) URL.revokeObjectURL(audioUrl)
  setAudioUrl(URL.createObjectURL(file))
  const ctrl = new AbortController(); asrAbortRef.current = ctrl
  try {
    const eng = await createTranscriber({ lang: asrLang, onProgress: setAsrProgress })
    asrEngineRef.current = eng
    const { pages, segments } = await runTranscribe(file, { transcribe: eng.transcribe, signal: ctrl.signal, onProgress: setAsrProgress })
    if (ctrl.signal.aborted) return
    if (emptyTranscriptNotice({ text: pages.map(p => p.text).join(' ') })) { setError('We couldn’t find clear speech in that recording. Try a quieter clip.'); return }
    setPdfData({ pages })
    addPdfRecent({ name: file.name || 'recording', sizeKB: Math.round(file.size / 1024), pages: pages.length, kind: 'audio' })
    logSkillActivity?.('reading')
  } catch (e) {
    if (e?.name !== 'AbortError') setError(e?.message || 'Could not transcribe the recording')
  } finally {
    setAsrProgress(null); asrAbortRef.current = null
  }
}, [asrLang, audioUrl])
```
Import the cap constants eagerly (pure): `import { MAX_AUDIO_MB } from '../lib/transcribe'`.
Cancel + cleanup: extend the unmount effect + `clearPdf` to abort + terminate + revoke:
```jsx
asrAbortRef.current?.abort()
asrEngineRef.current?.terminate?.(); asrEngineRef.current = null
if (audioUrl) { URL.revokeObjectURL(audioUrl); }
```

- [ ] **Step 2: Render the progress + cancel UI (aria-live), and the replay + note**

Progress (extend the OCR-style early return):
```jsx
if (asrProgress !== null) {
  const label = asrProgress.phase === 'download' ? 'Setting up the speech model (one-time)…'
    : asrProgress.phase === 'decode' ? 'Reading your audio…' : 'Transcribing…'
  return (
    <div className="text-center py-16 animate-fadeUp" aria-live="polite">
      <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
      <p className="text-sm font-bold">{label} {Math.round((asrProgress.ratio || 0) * 100)}%</p>
      <p className="text-[11px] mb-3" style={{ color: 'var(--color-dim)' }}>Stays on your device — nothing is uploaded.</p>
      <button onClick={() => asrAbortRef.current?.abort()} className="px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>Cancel</button>
    </div>
  )
}
```
Replay + "auto-transcript" note — render when `audioUrl` is set and the reader is showing (near the toolbar, `aria-live`):
```jsx
{audioUrl && pdfData && (
  <div className="rounded-xl p-2.5 text-xs flex flex-col gap-2" aria-live="polite"
    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
    <span>This is an auto-transcript — replay the audio to check anything that looks off.</span>
    <audio controls src={audioUrl} className="w-full" />
  </div>
)}
```
**Testability hook:** ensure the reflow container has `data-testid="reader-reflow"` (already added for OCR — reuse it).

- [ ] **Step 3: Run the happy-path e2e**

Run: `npm run test:e2e -- audio-transcribe`
Expected: PASS — progress shows, transcription resolves, `nasi` visible, ≥85% words present (Q-ACC).

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: build green (eager index unchanged), 0 lint errors (no new exhaustive-deps warnings).

- [ ] **Step 5: Commit**

```bash
git add src/pages/PDFReader.jsx
git commit -m "feat(asr): audio transcription branch with progress, cancel, replay (Task 7)"
```

---

## Task 8: Blank-clip empty state + length cap e2e

**Files:**
- Modify: `tests/e2e/audio-transcribe.spec.js`
- (No new code — the empty-state + cap are handled in Task 7; this task pins them.)

- [ ] **Step 1: Add a silent fixture + the empty-state e2e**

Add `asr-silent.wav` (1–2 s of silence) to `gen-asr-fixtures.mjs`; then:
```js
test('a silent clip surfaces the friendly empty state, not a crash (Q-EMPTY)', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('asr-silent.wav'))
  await expect(page.getByText(/couldn.t find clear speech/i)).toBeVisible({ timeout: 150_000 })
  await expect(page.locator('body')).not.toContainText('Maximum update depth')
})
```

- [ ] **Step 2: Run + commit**

Run: `npm run test:e2e -- audio-transcribe`
Expected: PASS.
```bash
git add tests/e2e/audio-transcribe.spec.js scripts/gen-asr-fixtures.mjs tests/e2e/fixtures/asr-silent.wav
git commit -m "test(asr): blank-clip empty state (Q-EMPTY) (Task 8)"
```

---

## Task 9: ASR language preference (store) + STORE_VERSION 32→33

**Files:**
- Modify: `src/store/useStore.js`
- Modify: `src/pages/PDFReader.jsx` (MS/EN toggle on the entry card)

> Mirrors the shipped `ocrLang` pref exactly (v29).

- [ ] **Step 1: Add the pref + migration**

1. Initial-state `pdfReader` object: add `asrLang: 'ms',` (beside `ocrLang`).
2. Add a setter next to `setOcrLang`: `setAsrLang: (lang) => set((s) => ({ pdfReader: { ...s.pdfReader, asrLang: lang === 'en' ? 'en' : 'ms' } })),`.
3. Bump `export const STORE_VERSION = 32` → `33` + update its comment.
4. Add the migration block alongside the others:
```js
// Migrate to v33: audio transcription language pref. Default Malay (primary syllabus).
if (version < 33) {
  state = { ...state, pdfReader: { asrLang: 'ms', ...(state.pdfReader || {}) } };
}
```

- [ ] **Step 2: Add the MS/EN toggle to the entry card (reuse the ocrLang toggle styling)**

```jsx
const setAsrLang = useStore(s => s.setAsrLang)
const asrLangSel = useStore(s => s.pdfReader?.asrLang) || 'ms'
// near the record button (shown for audio):
<div className="flex rounded-lg overflow-hidden mx-auto w-fit" style={{ border: '1px solid var(--color-border)' }}>
  {['ms', 'en'].map(l => (
    <button key={l} onClick={() => setAsrLang(l)} className="px-3 py-1 text-xs font-bold"
      style={{ background: asrLangSel === l ? 'var(--color-accent)' : 'transparent', color: asrLangSel === l ? 'var(--color-on-bright)' : 'var(--color-text)' }}>
      {l === 'ms' ? 'Malay' : 'English'}
    </button>
  ))}
</div>
```
(`runAudioTranscribe` already reads `asrLang` → `'ms'`/`'en'`.)

- [ ] **Step 3: Verify persistence + build/lint/test**

Run: `npm run build && npm run lint && npm run test:run`
Expected: all green; reload keeps the language (manual); STORE_VERSION reads 33.

- [ ] **Step 4: Commit**

```bash
git add src/store/useStore.js src/pages/PDFReader.jsx
git commit -m "feat(asr): persisted MS/EN transcription language pref, STORE_VERSION 32→33 (Task 9)"
```

---

## Task 10: Manual accuracy harness (`scripts/asr-accuracy-harness.mjs`)

**Files:**
- Create: `scripts/asr-accuracy-harness.mjs`

> Mirrors `scripts/ocr-accuracy-harness.mjs`. MANUAL, never CI (spec D10). Reuse its `wordAccuracy` (extract to a shared `scripts/lib/wer.mjs`, or copy with a comment). Optional BYOK column wired for the Phase-2 comparison.

- [ ] **Step 1: Write the harness**

```js
// scripts/asr-accuracy-harness.mjs — measure on-device Whisper word accuracy (1 − WER)
// on real {audio, ground-truth} fixtures. MANUAL, not CI.
//   --dir <folder>  every .wav/.mp3/.m4a with a same-name .txt ground truth beside it.
//                   Without --dir, falls back to the committed e2e fixtures.
//   --lang ms|en    Whisper language hint (default ms).
//   --model <id>    model to load (default 'model' = the self-hosted public/asr dir).
//   --remote        allow loading <id> from the HF Hub (Task-0 generic baseline);
//                   omit for the self-hosted local model.
// Records the numbers in RESUME_HERE.md (spec Q-WER, the on-device-primary gate).
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pipeline, env } from '@huggingface/transformers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.resolve(__dirname, '../tests/e2e/fixtures')
const arg = (f) => { const i = process.argv.indexOf(f); return i !== -1 ? process.argv[i + 1] : null }
const modelId = arg('--model') || 'model'
const remote = process.argv.includes('--remote')
env.allowRemoteModels = remote
env.localModelPath = path.resolve(__dirname, '../public/asr')

function wordAccuracy(ref, hyp) {
  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean)
  const r = norm(ref), h = norm(hyp)
  if (!r.length) return 0
  const dp = Array.from({ length: r.length + 1 }, (_, i) => { const row = new Array(h.length + 1).fill(0); row[0] = i; return row })
  for (let j = 0; j <= h.length; j += 1) dp[0][j] = j
  for (let i = 1; i <= r.length; i += 1) for (let j = 1; j <= h.length; j += 1)
    dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1] + (r[i-1]===h[j-1]?0:1))
  return Math.max(0, 1 - dp[r.length][h.length] / r.length)
}

const lang = arg('--lang') || 'ms'
const dirFlag = process.argv.indexOf('--dir')
let pairs
if (dirFlag !== -1 && process.argv[dirFlag+1]) {
  const dir = path.resolve(process.argv[dirFlag+1])
  pairs = readdirSync(dir).filter(f => /\.(wav|mp3|m4a|ogg)$/i.test(f))
    .map(f => ({ name: f, audio: path.join(dir, f), truthFile: path.join(dir, f.replace(/\.[^.]+$/, '.txt')) }))
    .filter(p => existsSync(p.truthFile)).map(p => ({ ...p, truth: readFileSync(p.truthFile, 'utf8') }))
} else {
  const gt = JSON.parse(readFileSync(path.join(FIXTURES, 'asr-ground-truth.json'), 'utf8'))
  pairs = [{ name: `asr-clean-${lang === 'en' ? 'english' : 'malay'}.wav`, audio: path.join(FIXTURES, `asr-clean-${lang === 'en' ? 'english' : 'malay'}.wav`), truth: gt[lang] }]
    .filter(p => existsSync(p.audio))
}
if (!pairs.length) { console.error('No {audio, ground-truth} pairs found.'); process.exit(1) }

const t = await pipeline('automatic-speech-recognition', modelId, { dtype: 'q8' })
const rows = []
for (const p of pairs) {
  const out = await t(p.audio, { language: lang === 'en' ? 'english' : 'malay', task: 'transcribe', chunk_length_s: 30, return_timestamps: true })
  rows.push({ fixture: p.name, accuracy: `${(wordAccuracy(p.truth, out.text) * 100).toFixed(1)}%` })
}
console.table(rows)
console.log('Q-WER gate: Malay must be ≥ 60% accuracy (≤ 40% WER) to ship on-device-primary.')
console.log('Record the numbers in RESUME_HERE.md (manual gate, spec D10 — never CI).')
```

- [ ] **Step 2: Run it + record numbers**

Run: `node scripts/asr-accuracy-harness.mjs --lang ms` and `--lang en`.
Expected: a table of word-accuracy; write the numbers into RESUME_HERE in Task 12.

- [ ] **Step 3: Commit**

```bash
git add scripts/asr-accuracy-harness.mjs
git commit -m "test(asr): manual WER accuracy harness (Task 10)"
```

---

## Task 11: Go-wild e2e hardening

**Files:**
- Modify: `tests/e2e/audio-transcribe.spec.js`

- [ ] **Step 1: Add abuse-case tests (per [[feedback_go_wild_smoke_test]])**

```js
test('cancel mid-transcribe returns to the empty state cleanly', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('asr-clean-malay.wav'))
  await page.getByRole('button', { name: /Cancel/i }).click()
  await expect(page.getByText(/Drop a PDF, photo, or recording/i)).toBeVisible()
})

test('a non-audio file errors gracefully (no crash)', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('asr-ground-truth.json'))
  await expect(page.locator('body')).not.toContainText('Maximum update depth')
})

test('theme swap mid-read keeps the reader intact', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('asr-clean-malay.wav'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 150_000 })
  await page.evaluate(() => document.documentElement.classList.toggle('light'))
  await expect(page.getByText(/nasi/i)).toBeVisible()
})

test('offline second run works after the model is cached (N5)', async ({ page, context }) => {
  test.setTimeout(240_000)
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('asr-clean-malay.wav'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 150_000 })
  await context.setOffline(true)
  await page.reload()
  await page.setInputFiles('input[type=file]', fx('asr-clean-malay.wav'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 150_000 })
  await context.setOffline(false)
})
```

- [ ] **Step 2: Run the full ASR e2e + the existing PDF/OCR suites (F3 — no regression)**

Run: `npm run test:e2e`
Expected: new ASR specs PASS; existing PDF + OCR e2e still PASS (digital PDFs + photos unchanged).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/audio-transcribe.spec.js
git commit -m "test(asr): go-wild — cancel, bad file, theme swap, offline (Task 11)"
```

---

## Task 12: Docs, full verification, deploy

**Files:**
- Modify: `RESUME_HERE.md`, `CLAUDE.md`

- [ ] **Step 1: Full gate**

Run: `npm run build && npm run test:run && npm run lint && npm run test:e2e`
Expected: build green (record the new lazy ASR chunk size + confirm eager `index` unchanged); all unit tests green incl. new `transcribe`/`transcribeEngine`; 0 lint errors; e2e green incl. existing PDF + OCR suites (F3).

- [ ] **Step 2: Eyeball light + dark** (manual): empty-state card, record button + MS/EN toggle, model-download progress + cancel, transcript + `<audio>` replay, blank-clip empty state. Mobile 390×844. Real mic record + replay on a phone. First-run model download on throttled network.

- [ ] **Step 3: Update docs**

`CLAUDE.md`: add audio transcription to the feature list + a one-liner under Architecture ("Audio: `src/lib/transcribe.js` pure + `transcribeEngine.js` lazy transformers.js/ORT, self-hosted under `public/asr/`, emits the `{pages}` shape — reader core untouched; on-device free, BYOK 'Sharper listen' = Phase 2"). `RESUME_HERE.md`: a SHIPPED block (chosen model + **measured Malay/EN WER**, STORE_VERSION 33, new lazy chunk size, the Phase-2 BYOK-audio + video follow-ups). Note the spec/plan paths.

- [ ] **Step 4: Commit (gate runs automatically) + confirm prod**

```bash
git add CLAUDE.md RESUME_HERE.md
git commit -m "docs(asr): study-from-a-recording shipped — feature notes + measured WER (Task 12)"
```
Then confirm the PUBLIC Vercel deploy reaches READY (upg- project) per [[project_two_vercel_projects]].

---

## ▶️ BOUNDED PHASE-1 BUILD KICKOFF (paste to start the build session)

> Smallest shippable slice. **Run AFTER the Task-0 spike** (top of this plan) so the model is already decided + the WER recorded — the box below still lists Task 0 so it's self-contained, but if the spike already ran, start at Task 1 with the chosen model. Approve with **"build phase 1"**, or veto any single decision in one line.

```
Build Phase 1 of "Study from a recording" — free on-device audio → transcript → the
existing reveal-gated reader. Spec + plan are committed:
  docs/superpowers/specs/2026-06-13-multimodal-audio-transcribe-design.md
  docs/superpowers/plans/2026-06-13-multimodal-audio-transcribe.md

WHY: photo study already ships free + on-device (OCR → reader). Audio is the biggest
unbuilt multimodal want, and free + on-device is the only version the owner (no billed
key) can actually use. Mirror the OCR feature's shape exactly.

DO, in plan order, TDD (red watched before green), gate green per commit:
  Task 0  (BLOCKING spike) — convert mesolitica-malaysian-whisper-base → ONNX q8, load
          it in transformers.js (Node), MEASURE real Malay + English WER on a few real
          clips. Decide the shipped model + write the numbers down BEFORE any UI:
            • mesolitica runs + Malay ≤40% WER → ship mesolitica-base (MS+EN).
            • mesolitica won't convert → fall back to onnx-community/whisper-base; if its
              Malay ≤40% ship it (queue mesolitica for 1.5); if >40% fire the D1 veto →
              Malay = BYOK-primary (English stays on-device). Log whichever happens.
  Tasks 1–2  pure src/lib/transcribe.js ({pages} producer + runTranscribe, injected engine)
  Task 3     lazy src/lib/transcribeEngine.js (transformers.js + Web Audio decode, self-hosted)
  Task 4     dep @huggingface/transformers + scripts/copy-asr-assets.mjs + PWA /asr/** cache
  Task 5     known-text Malay+EN audio fixtures
  Task 6–8   e2e-first happy path → handleFile audio branch + progress/cancel + <audio> replay
             + blank-clip empty state + length cap
  Task 9     pdfReader.asrLang MS/EN pref, STORE_VERSION 32→33
  Task 10    manual WER harness (never CI)
  Task 11    go-wild e2e (cancel, bad file, theme swap, offline)
  Task 12    docs + full gate + record measured WER + confirm Vercel READY

OBSERVABLE DONE: upload/record a clip → progress (one-time model download labelled) →
a transcript in the reader → tap a word → FSRS card added; MS/EN toggle works; second
run works OFFLINE; eager index bundle unchanged (±0 KB); measured Malay+EN WER recorded
in RESUME_HERE; existing PDF + OCR e2e still green.

DON'T BREAK / CONSTRAINTS: free + offline-first; the audio NEVER leaves the device
(no upload in the free path); lazy + self-hosted (eager bundle untouched); REUSE the
reveal-gated reader via the {pages} seam — do NOT fork it or touch fsrs.js / the
dictionary / the gloss-core. Re-confirm the @huggingface/transformers v3 ASR pipeline
API via context7 before writing the engine. BYOK "Sharper listen" + video = Phase 2.

DECIDE & FLAG every fork (veto note each). Questions only for destructive/money/invariant.
VERIFY: the session opens by reading the spec + plan, then runs Task 0 and reports the
measured Malay WER before writing any reader code.
```

---

## Self-review (plan ↔ spec)

**Spec coverage:** §2 in-scope → Tasks 6 (audio ingest + record), 1–3+7 (free on-device → `{pages}`), 7 (replay + "auto-transcript" note = honest quality), 8 (empty state + cap), 6 (capture/privacy copy), 7 (reflow path). Acceptance: F1→T6, F2→T6/record, F3→T11/T12, Q-ACC→T6, Q-WER→T0/T10, Q-EMPTY→T8, N1→T11 (empty-key implicit), N2→self-host + no-upload (T11 offline proves it), N3→T4/T12, N4→T7 (+ worker note in T3), N5→T11, N6→T7/T9/T12, N7→{pages} seam (no core edits). Open Qs: Q1 read-only→honoured (no editor task), Q2→T9, Q3→T7 (one-time labelled download; an explicit confirm dialog is a small add in T7 if Kheshav wants it — flagged), Q4→T7/T8 cap, Q5→T0 decision, Q6→T6 record.

**Placeholder scan:** the "verify at impl" notes (transformers.js v3 API in T3; ORT dist filenames + commit-vs-gitignore in T4; worker vs main-thread in T3) are explicit decisions with defaults, not blanks. Task 0's conversion file names and the chosen model are intentionally resolved BY Task 0 (its whole purpose) and recorded in the asset-script header — the one thing the implementer produces, called out.

**Type consistency:** `runTranscribe` returns `{pages, segments}` (T2) — consumed in T7. `createTranscriber().transcribe({audio,signal,onProgress})` returns `{text, segments}` (T3) — matches `runTranscribe`'s injected contract (T2). `segmentsFromAsrOutput` maps `chunks`→`{text,start,end}` (T3) → fed to `paragraphsFromSegments` (T1). `pagesFromTranscript` shape `{pageNum,text,paragraphs}` (T1) == `extractTextFromDoc` (pdf.js). `pdfReader.asrLang` (T9) read in `runAudioTranscribe` (T7). Consistent.

**Honest divergences from OCR (flagged, not hidden):** (1) no per-word confidence cue — Whisper lacks it → always-on "replay to check" note + `<audio>` (D8). (2) Task 0 is a blocking spike before any UI — OCR could trust Tesseract's known accuracy; Malay ASR must be measured first. (3) bigger first-run download (model tens of MB) → a one-time labelled progress, not OCR's smaller traineddata.
</content>
