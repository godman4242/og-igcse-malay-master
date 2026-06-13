# Study from a recording — Phase 1 (free on-device audio → transcript → reader)

**Status:** Design approved (diverge + adversarial research done) — ready for an Implementation session, **gated on the Task-0 model spike** (§3a / Plan Task 0).
**Date:** 2026-06-13
**Session type:** Design & Research (no production code).
**Plan:** `docs/superpowers/plans/2026-06-13-multimodal-audio-transcribe.md`
**Mirrors (do NOT redesign — copy the proven shape):** `src/lib/ocr.js` (pure `{pages}` producer + injected engine), `src/lib/ocrEngine.js` (lazy WASM boundary), `scripts/copy-ocr-assets.mjs` (self-hosted assets), `scripts/ocr-accuracy-harness.mjs` (manual WER harness), `vite.config.js` PWA `/ocr/**` runtime-cache, `src/pages/PDFReader.jsx` `handleFile` type-branch.
**Builds on (do NOT redesign):** the reveal-gated reader pipeline (`PDFReader.jsx` → tokenise → gloss → density nudge → FSRS), `src/lib/unknownDensity.js`, the FSRS card-add path.
**Invariants honoured:** NO paywall (the free audio path needs zero keys); individual-revision only; no native apps (web/WASM only); Malay AND English. See `[[project_invariants]]`, `[[project_multimodal_direction]]`.

---

## 1. Problem & who it's for

The app already turns a **photographed page** into studyable text (free on-device OCR → the reveal-gated reader). The next-biggest unbuilt multimodal want (`[[project_multimodal_direction]]`) is **audio**: a teacher's voice note, a recorded answer, an IGCSE listening track — none of which the app can study today. `src/lib/speech.js` proves Web Speech is **live-mic only** (`startRecognition` streams the *current* mic to a remote Google backend); it **cannot transcribe a file**, and it isn't on-device. So a real on-device speech model is required.

**User:** an IGCSE Malay (0546) or English (0500/0510) student who has a **recording** — a clip a teacher sent, audio they recorded in class, a practice listening track — and wants to *study it the same way they study a PDF or a photo*: read a transcript, tap unknown words, build FSRS cards, run comprehension, get the density nudge if it's too hard.

**Job-to-be-done:** "Turn this recording into tappable, studyable text inside the reader I already use — for free, privately, even offline."

**Why free + on-device is non-negotiable here:** the owner cannot obtain a billed transcription key (confirmed 2026-06-13). A paid-only audio feature is one neither the owner nor a no-paywall student base can use. The OCR precedent ("the file NEVER leaves the device") is the bar.

---

## 2. Scope

### In scope (Phase 1 — smallest shippable slice)
1. **Ingest an audio file** (`audio/*` — m4a/mp3/wav/ogg/webm/aac) from file pick or drag-drop.
2. **Record in-browser** (MediaRecorder) — a "Record" affordance beside upload, so a student can capture a teacher speaking, then study it.
3. **Free, on-device transcription** (Whisper via transformers.js, ONNX Runtime Web) → produce the **exact `{pages:[{pageNum,text,paragraphs}]}` shape** the reader already consumes, so the whole downstream pipeline (tokenise → gloss → density nudge → FSRS) runs **untouched**.
4. **Honest quality handling:** the transcript is a *draft the learner verifies against the audio they can replay* — a non-punitive, always-shown "auto-transcript, replay to check" note (Whisper gives no reliable per-word confidence — see §3h / D8). A built-in `<audio controls>` replay sits with the transcript.
5. **MS/EN language hint** on the entry card (mirrors OCR's toggle) → Whisper's `language` decode hint.
6. **Capture guidance + privacy reassurance** on the entry card.
7. **Audio length cap** (Phase 1) with a *logged, non-silent* note — bounds worst-case mobile latency/memory.

### Explicitly parked (with one-line "why later")
- **Video → transcript** — needs an audio-track extract step (decode/demux) on top of this; trivially additive once audio ships. Phase 2.
- **BYOK cloud transcription** (Gemini / OpenAI audio via the instruct router) — the optional **quality rung** for noisy/accented/long audio, mirroring OCR's "Sharper read." Needs an **audio-parts extension** to the instruct seam (today text + the OCR vision capability). It **uploads the audio**, so it must disclose + stay opt-in. Phase 2.
- **mesolitica fine-tune as the shipped model** — the Malay quality lever, but it ships PyTorch-only and needs an ONNX conversion that must be **de-risked first** (Task 0). If the spike passes it lands in Phase 1; if not, it's Phase 1.5. See §3a.
- **Per-word low-confidence cue** (the OCR dotted underline) — Whisper exposes no clean per-word confidence; replaced by the always-on "replay to check" note + audio replay (D8). A segment-level cue is Phase 1.5 *if* the output cleanly exposes `no_speech_prob`/`avg_logprob`.
- **Speaker diarisation, timestamps-in-UI, inline transcript editor, long-lecture chaptering** — each its own follow-up; Phase 1 is read-only transcript + retake.
- **Live streaming transcription** — `/speaking` already owns live mic; this feature is about *recordings*.

---

## 3. Options considered → chosen, per load-bearing decision

### (a) Which free on-device model — THE decision (and the Task-0 spike)
Malay ASR quality is the project risk. Generic Whisper degrades fast for low-resource languages at small sizes (tiny/base WER can *exceed 100%* on hard languages; SE-Asian sits Tier-2/3, ~15–30%+ even on bigger models — novascribe/lexawrite). Malay has **no Rumi/Latin "free transfer"** the way OCR did (OCR's Malay rode the English LSTM because the *script* is shared; ASR accuracy is bounded by *audio training data*, and Malay is mid-resource). So the model choice is the whole ballgame.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. mesolitica Malaysian-Whisper (base→small-v3), converted to ONNX, self-hosted** | Fine-tuned on Malay + **Manglish** + Singlish; malaya-speech claims it **beats Google ASR** on Malay/FLEURS/Singlish — the only option that makes *Malay* genuinely good; one multilingual model also covers EN | Ships **PyTorch only** → convert via the **transformers.js `scripts/convert.py`** (`--quantize`; the Xenova-tested path — raw `optimum-cli` is what hits the **known custom-Whisper issues** #1118/#1040) → must spike; ~80–180 MB self-hosted | **CHOSEN as the target — pending the Task-0 spike** |
| **B. Generic onnx-community/whisper-base (or small)** | **Proven ONNX** for transformers.js (zero conversion risk), ships today, strong EN | Generic **Malay** likely draft-rough at base size (Tier-2/3); not Malaysian-aware (no Manglish) | **FALLBACK if the spike fails** + the free floor for EN |
| C. vosk-browser (Kaldi WASM) | Tiny models, fast | **No Malay model exists** (Malayalam ≠ Malay) | **Rejected** — can't do Malay |
| D. whisper.cpp WASM | Mature C++ port | Heavier integration than transformers.js; same model-quality ceiling; no Malay fine-tune advantage | Rejected for Phase 1 (transformers.js is the path of least resistance + the canonical whisper-web precedent) |
| E. BYOK cloud (Gemini/OpenAI audio) | ~98% even on mess | Needs a key (can't be the *only* path — no-paywall), uploads audio | **Phase 2 quality rung** |

**Decision (decide-and-flag):** **on-device free is the PRIMARY rung — NOT "too poor → pivot to BYOK".** English is Whisper's strongest language out of the box; Malay has a real quality path (mesolitica). The verify-the-draft framing (D8, OCR precedent) means even a draft-quality Malay transcript is *useful* — the student replays the audio, reads, corrects, and glosses unknown words. **BYOK stays the Phase-2 escape hatch, not the primary.**
**Veto trigger (the honest gate the kickoff demanded):** if **Task 0** shows mesolitica won't convert/run in transformers.js *and* generic whisper-base/small Malay WER on real fixtures is unusably high (**>40% WER** = worse than every other word wrong), then **flip Malay to BYOK-primary** (English stays on-device), and log it in the plan + RESUME_HERE. Until measured, the default above stands.

#### ✅ Task-0 result (2026-06-13, measured — branch 1 fired: SHIP mesolitica)
Measured word-accuracy / WER on **FLEURS** test clips (5× `ms_my`, 5× `en_us`, 16 kHz), via `scripts/asr-accuracy-harness.mjs`:

| Model (dtype) | Malay WER | English WER |
|---|---|---|
| generic `onnx-community/whisper-base` (q8) | **50.1%** ❌ (fails the gate) | 27.1% ✅ |
| **mesolitica `malaysian-whisper-base` → ONNX (fp32)** | **18.4%** ✅ | 19.0% ✅ |
| **mesolitica `malaysian-whisper-base` → ONNX (q8, ships)** | **18.6%** ✅ | 17.1% ✅ |

**Decision:** ship **mesolitica-base** on-device for **both MS + EN** (it ~halves generic's Malay error AND beats it on English; quantization to q8 costs ~0). The D1 veto did **not** fire. `base` size is sufficient for Phase 1 (no need to escalate to `small`).

**Conversion recipe (the working path — `scripts/convert.py` is GONE from transformers.js' current monorepo, so the plan's primary command no longer exists; the fallback is now the path):**
```bash
optimum-cli export onnx --model mesolitica/malaysian-whisper-base ./mesolitica-onnx \
  --task automatic-speech-recognition-with-past --opset 14   # opset<18 warns but exports fine
# transformers.js layout: configs/tokenizer in public/asr/model/, ONNX in public/asr/model/onnx/
#   onnx/encoder_model.onnx + onnx/decoder_model_merged.onnx  (fp32, no suffix)
```
**dtype→suffix gotcha (CONFIRMED, corrects the plan):** transformers.js v3 `dtype:'q8'` resolves the **`_quantized`** suffix (`encoder_model_quantized.onnx`), **NOT** `_q8`. (Verified in `node_modules/@huggingface/transformers/src/utils/dtypes.js`.)

**⚠ Two findings the build session (Task 4) must handle — flagged, not solved here:**
1. **Quantization of the merged decoder.** `onnxruntime quantize_dynamic` shrank the encoder (82→23 MB) but **left `decoder_model_merged` at 314 MB** — it skips weights inside the decoder's `If` control-flow subgraph. So the measured "q8" is really *encoder-int8 + decoder-fp32* (still ≪ 40%, so the decision is safe and conservative). Task 4 needs a real quantization (quantize the **un-merged** `decoder_model` + `decoder_with_past` before/instead of the merged graph, or use onnx-community's whisper quantization — their `_quantized` decoders are genuinely small).
2. **Asset size + delivery.** Raw export is **~340 MB** (≈100 MB if the decoder quantizes properly). Confirms §4.4: **gitignore the binaries** + produce them at build time. Recommend uploading the converted q8 model to a HF repo (owner's account) so `copy-asr-assets.mjs` **fetches** it — running the Python/torch conversion in CI/`postinstall` is too heavy.

### (b) Phase-1 model SIZE
**Chosen:** **base-class (~74M params, ~40–90 MB q8)** for Phase 1 — mobile-first (our audience is phones; base ~20s per minute of audio on M3/WASM, ~3–5× that on a mid phone but tolerable with progress + the length cap). **small (~244M, ~180 MB)** is the named quality-upgrade rung. Veto: ship small in Phase 1 if the spike shows base Malay WER is too rough *and* the size/latency is acceptable on a test phone.

### (c) Engine + library
**Chosen:** **transformers.js (`@huggingface/transformers` v3) + ONNX Runtime Web**, lazy-imported. It's the canonical in-browser Whisper stack (Xenova/whisper-web), supports file + record, WebGPU with WASM fallback, and self-hosted models. `@huggingface/inference` (already in `package.json`) is **remote/token-gated — NOT on-device**; it is *not* used here. Add `@huggingface/transformers` as a new dep. Veto: whisper.cpp WASM only if transformers.js custom-model loading proves unworkable in the spike.

### (d) How the transcript feeds the reader — *core untouched* (mirrors OCR D5)
| Option | Verdict |
|---|---|
| **D1. New `src/lib/transcribe.js` emits the identical `{pages}` shape; `PDFReader.handleFile` branches on `audio/*` → same `setPdfData({pages})`** | **CHOSEN** — surgical; the reader never learns audio exists |
| D2. A separate "Listen & read" route | Rejected — duplicates the reader; the kickoff says reuse it |
| D3. Feed into `/dictation` or `/listening` | Rejected — those are *generate-from-curated-corpus* drills; this is *bring-your-own recording* → reader |

Audio is linear (no page geometry) → `pdfDoc` stays `null` → **force the reflow view + gate the Layout toggle on `pdfDoc`** (identical to image-sourced OCR docs, already shipped). Whisper timestamped chunks are grouped into paragraphs (sentence/pause boundaries) so the reader's paragraph tokeniser has natural units.

### (e) Self-hosting / privacy (mirrors OCR D6/D8)
- **Self-host** ORT-Web WASM + the model ONNX + tokenizer/config under `public/asr/` — image/audio never reaches a third-party CDN, and it works offline after the first run.
- **Never persist or sync the raw audio** — transcript text only (matches the no-media-in-cloud-blob posture). The in-session `<audio>` replay uses an object URL, revoked on clear/unmount (same pattern as SpeakMode's record-and-compare, shipped 2026-06-13).
- **License:** Whisper weights = **MIT** (OpenAI); onnx-community re-exports = same; transformers.js = Apache-2.0; ORT-Web = MIT. mesolitica fine-tunes inherit Whisper's MIT (verify the exact card license at Task 0 before shipping its weights). All safe to self-host.
- **Copyright/consent:** the learner supplies their own recording for personal revision (same posture as user-supplied PDFs/photos). For **record mode**, mic permission is the OS gate; add a one-line "record only what you're allowed to" reassurance, not a legal wall.

### (f) Asset delivery (mirrors `copy-ocr-assets.mjs`)
**Chosen:** a `scripts/copy-asr-assets.mjs` (`prebuild` + `postinstall`) that copies ORT-Web WASM out of node_modules and places the (pre-converted/quantized) model files under `public/asr/model/`. Big binaries **gitignored** + regenerated from the dep / a committed conversion step (the tiny tokenizer/config JSON may be committed). PWA: `/asr/**` excluded from precache (`globIgnores`) + **runtime `CacheFirst`** (offline after one run) — a second `runtimeCaching` rule beside the existing `/ocr/**` one. Veto: commit the q8 model (~40–90 MB) if CI can't fetch/convert reliably.

### (g) Manual accuracy harness (mirrors `ocr-accuracy-harness.mjs`)
**Chosen:** `scripts/asr-accuracy-harness.mjs` — measures **word accuracy (1 − WER)** of the on-device model on `{audio, ground-truth}` fixtures, with an optional **BYOK column** (set a key) for the Phase-2 comparison. **MANUAL, never CI** (a real model + audio decode + non-determinism don't belong in the commit gate — same rule as OCR's D12). Records the real Malay/English WER in RESUME_HERE. Reuse the OCR harness's `wordAccuracy` (WER via word-Levenshtein). Veto: none.

### (h) Confidence / quality signal — **honest divergence from OCR**
OCR had per-word `confidence` → a dotted "check me" underline. **Whisper does not expose reliable per-word confidence** in the transformers.js pipeline output (`{ text, chunks:[{text,timestamp}] }`). **Chosen:** drop the per-word cue; instead **always** show a non-punitive "This is an auto-transcript — replay the audio to check anything that looks off" note for audio sources, paired with the `<audio>` replay. This is *more* honest than a fake confidence number. **Flag:** if the pipeline cleanly surfaces segment `no_speech_prob`/`avg_logprob`, add a segment-level (not word-level) low-confidence note in Phase 1.5. Veto: implement the segment cue in Phase 1 if it's free in the output.

### (i) Whisper hallucination handling
Whisper is known to **hallucinate on silence/music/non-speech** (repeated phrases). **Chosen mitigations:** pass `chunk_length_s` (30) + `stride_length_s`, don't condition on previous text across chunks where the API allows, and lean on the verify-the-draft framing + replay. A blank/garbage clip → graceful "we couldn't find clear speech" empty state, never a crash. Veto: none.

---

## 4. Architecture

Mirror the **proven OCR testability pattern**: pure orchestration with an **injected** engine, so all logic is unit-tested without WASM/audio.

### 4.1 New pure module — `src/lib/transcribe.js` (no DOM, no network, no WASM)
```
paragraphsFromSegments(segments) -> string[]
    segments: Array<{ text, start?, end? }> (Whisper chunks)
    Group consecutive chunks into paragraphs: break on a long pause (gap >
    PARA_GAP_S, default ~1.2s) OR on sentence-final punctuation past a min
    length; collapse whitespace; trim; drop empties. Falls back to a single
    paragraph when there are no timestamps.

pagesFromTranscript(result, { perPage = PARAS_PER_PAGE }) -> { pages: [{ pageNum, text, paragraphs }] }
    result: { text, segments? }. Produces the EXACT shape of extractTextFromDoc()
    in src/lib/pdf.js. Audio is linear → paginate by paragraph count so a long
    recording isn't one giant page (reader perf + density nudge work per page).

runTranscribe(audio, { transcribe, onProgress, signal }) -> { pages, segments }
    Orchestration ONLY. `transcribe` is INJECTED (unit tests pass a fake).
    - awaits the injected engine; threads progress 0..1 (model-load + decode +
      inference phases) through onProgress({ phase, ratio })
    - AbortSignal cancels; a cancelled run resolves with whatever is ready
      (cancelled !== errored), mirroring runOcr
    - engine error → empty pages + flag, never throws the whole run

emptyTranscriptNotice(result) -> boolean
    True when the transcript is essentially empty/blank (no clear speech) so the
    page shows a friendly empty state instead of a blank reader.
```
Constants exported (testable, tunable): `PARA_GAP_S`, `PARAS_PER_PAGE`, `MAX_AUDIO_SECONDS` (Phase-1 length cap), `MAX_AUDIO_MB`.

### 4.2 New impure boundary — `src/lib/transcribeEngine.js` (lazy, WASM + Web Audio)
```
decodeAudioTo16k(fileOrBlob) -> Float32Array     // AudioContext.decodeAudioData → mono → resample 16 kHz
createTranscriber({ model, lang, device, onProgress }) -> {
    transcribe(float32_16k) -> { text, segments:[{text,start,end}] },
    terminate()
}
```
- **Lazy:** `await import('@huggingface/transformers')` inside this module → **never in the eager bundle** (like `driver.js`/`pdf`/`tesseract.js`).
- **Self-hosted:** `env.allowRemoteModels = false`; `env.localModelPath = '/asr'`; ORT-Web `env.backends.onnx.wasm.wasmPaths = '/asr/'`. The pipeline loads `'model'` from `public/asr/model/`, which **must** be the HF-style layout: the JSON configs + an **`onnx/` subfolder** holding the (quantized) encoder + `decoder_model_merged` `.onnx` (dtype suffix must match — `dtype:'q8'` ⇒ `*_q8.onnx`). Convert via the **transformers.js `scripts/convert.py`** (Task 0), not raw `optimum-cli`.
- **Pipeline:** `pipeline('automatic-speech-recognition', model, { device, dtype })`; device tries `'webgpu'` then falls back to `'wasm'` (auto-detect, per practitioner reports of inconsistent WebGPU); `dtype: 'q8'` (q4 for the bigger model). Call with `{ language: lang==='en' ? 'english' : 'malay', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, return_timestamps: true }`.
- **Worker:** run inference in a Web Worker (heavy compute must not block the UI — practitioner consensus). transformers.js ships worker-friendly; mirror whisper-web's worker. The decode (AudioContext) happens on the main thread (cheap), the Float32Array is transferred to the worker.
- Cache the pipeline per (model, lang) like the OCR worker cache; `terminate()` on reader clear/unmount to free memory.
- **VERIFY at implementation (context7-confirmed shape, re-confirm versions):** `@huggingface/transformers` v3 ASR pipeline signature, `dtype`/`device` options, `env.localModelPath`/`allowRemoteModels`, and the exact `chunks` vs `segments` field name in the output.

### 4.3 PDFReader wiring (surgical — read the whole file first; mirrors the OCR branch)
- **Entry card + `accept`:** widen to `application/pdf,image/*,audio/*`; add a **"Record"** affordance (MediaRecorder → Blob → `runTranscribe`). Update copy: *"Drop a PDF, photo, or recording — or record now."*
- **Capture/privacy copy:** *"🎙️ Quiet room · clear speech · record only what you're allowed to"* and *"Transcribed on your device — your recording is never uploaded."*
- **`handleFile(file)` branch:** `audio/*` → `runTranscribe([file])` → `setPdfData({pages})`; `pdfDoc` stays `null` → `setView('reflow')`. (PDF + image branches unchanged.)
- **Progress + cancel:** an `aria-live` progress UI with the three phases (downloading model the first time / decoding / transcribing) + a **Cancel** button (abort). The first-run **model download is large** — show "Setting up the speech model (one-time, ~N MB)…" so it isn't mistaken for a hang. Reuse the OCR progress styling.
- **Transcript + replay:** render the always-on "auto-transcript, replay to check" note + an `<audio controls src={objectURL}>` above/with the reader. Object URL revoked on clear/unmount (SpeakMode pattern).
- **Layout toggle gate:** already gated on `pdfDoc` (shipped for images) — audio inherits it for free.
- **MS/EN toggle:** a `pdfReader.asrLang` pref (own toggle, mirrors `ocrLang`).
- **Skill-balance log:** a successful transcription logs `logSkillActivity('reading')` (it lands a reading doc) — confirm it doesn't double-log on the audio replay.

### 4.4 Assets / build
- `public/asr/`: ORT-Web WASM (`ort-wasm-simd-threaded*.wasm` etc.) + `model/` (the q8 Whisper ONNX encoder/decoder + `tokenizer.json` + `config.json` + `generation_config.json` + `preprocessor_config.json`).
- `scripts/copy-asr-assets.mjs` (prebuild + postinstall): copy ORT WASM from node_modules; place the converted/quantized model (from Task 0's conversion output, committed-gzipped or fetched-once). Gitignore the large binaries; commit the small JSON.
- `vite.config.js`: add the `/asr/**` runtime-`CacheFirst` rule + `globIgnores` exclusion (beside `/ocr/**`).

---

## 5. Decision log

| # | Decision | Evidence (source · grade) | Confidence | Changes my mind |
|---|---|---|---|---|
| D1 | Free on-device (transformers.js + Whisper) is the **PRIMARY** rung; BYOK audio is Phase 2 | No-paywall invariant + owner has no billed key; whisper-web on-device precedent; EN is Whisper's strongest · High | High | Task-0 spike shows on-device Malay unusable (>40% WER) AND mesolitica won't convert → flip Malay to BYOK-primary |
| D2 | **ONE multilingual model** serves MS + EN; toggle → Whisper `language` hint | Whisper is multilingual; mesolitica adds Manglish; context7 `{language}` param · High | High | — |
| D3 | Target model = **mesolitica Malaysian-Whisper (base→small-v3) → ONNX q8**, self-hosted; **generic onnx-community/whisper-base = the fallback + EN floor** | mesolitica beats Google ASR on Malay/FLEURS (malaya-speech) · High; convert via transformers.js `scripts/convert.py` · High but **carries tfjs issues #1118/#1040** → Task-0 proves plumbing on the pre-converted generic FIRST, then attempts mesolitica | **Med (pending Task 0)** | Spike: if mesolitica won't run, ship generic-base, defer mesolitica to 1.5 |
| D4 | Phase-1 size = **base-class**; small = named upgrade | Mobile-first; M3/WASM base ~20s/min audio · High | Med | base Malay WER too rough + small size acceptable on a test phone → ship small |
| D5 | **`{pages}` seam** (`src/lib/transcribe.js`), `handleFile` branches — reader core untouched | OCR D5 proved it; `extractTextFromDoc` shape read from `pdf.js` · High | High | — |
| D6 | Audio source = **file + in-browser record**; **video parked** | Scope-bound smallest slice; video needs audio-extract · High | High | — |
| D7 | **Self-host** ORT WASM + model under `public/asr/`; PWA `CacheFirst`; gitignore binaries | OCR D6 precedent; offline/privacy invariant · High | High | self-host size unacceptable → CDN with an offline caveat |
| D8 | **No per-word confidence cue**; always-on "auto-transcript, replay to check" note + `<audio>` replay | Whisper exposes no reliable per-word confidence in tfjs output · High | High | output cleanly exposes segment `no_speech_prob`/`avg_logprob` → add a segment-level note (1.5) |
| D9 | **Never persist/sync the raw audio** (transcript text only); object-URL replay revoked on unmount | Privacy invariant; SpeakMode record pattern (shipped) · High | High | — |
| D10 | **Manual** WER harness (`asr-accuracy-harness.mjs`), never CI | OCR D12; non-deterministic model + audio · High | High | — |
| D11 | Lazy-import the engine; eager `index` bundle unchanged | Code-splitting convention (CLAUDE.md) · High | High | — |
| D12 | Audio **length cap** in Phase 1 (default ~5 min / ~10 MB) with a logged note | Bounds mobile latency/memory; OCR page-cap precedent (Q6) · High | High | tune the cap after a phone test |
| D13 | Decode via **Web Audio `decodeAudioData` → 16 kHz mono Float32Array** in the impure boundary | whisper-web + DEV practitioner (16 kHz mono required) · High | High | — |

---

## 6. Open questions for Kheshav (product calls — defaults chosen, veto any)

| # | Question | Default (decide-and-flag) | Why |
|---|---|---|---|
| Q1 | Phase 1 = **read-only transcript** (replay + re-record) or include an **inline transcript editor**? | **Read-only + re-record**; editor = Phase 1.5 | Keeps scope tight; replay + reveal-gating already let the learner verify |
| Q2 | Audio language: **MS/EN toggle (default Malay)** or auto-detect? | **Toggle, default Malay** (mirrors OCR/Roleplay/Speaking) | Whisper auto-detect is unreliable for short Malay clips; app is Malay-first |
| Q3 | First-run model download (~40–90 MB): **silent with progress**, or a **one-time confirm** ("download the speech model?") | **One-time confirm**, then cached forever | A surprise tens-of-MB download on school data deserves a heads-up (offline-first ethos) |
| Q4 | Phase-1 length cap | **~5 min / ~10 MB**, logged note (no silent truncation) | Bounds worst-case mobile latency/memory; raise once measured on a phone |
| Q5 | Ship **mesolitica (Malay-fine-tuned)** in Phase 1 (pending Task 0) or **generic whisper-base** first + mesolitica in 1.5? | **mesolitica if Task 0 passes; else generic-base now, mesolitica 1.5** | mesolitica is the Malay quality win, but the conversion must de-risk before it blocks a ship |
| Q6 | Record mode in Phase 1, or upload-only first? | **Both** (record is a thin MediaRecorder layer + the same pipeline) | A teacher-speaking capture is a core use case; low marginal cost |

---

## 7. Measurable acceptance criteria (the "done" bar)

**Functional**
- F1. An audio clip of **clear printed/spoken Malay** produces reader text where the **expected content words tokenise and are tappable**, and **add-to-FSRS works unchanged** (e2e: fixture clip → transcript → tap word → assert card added).
- F2. **Record mode** captures mic audio → transcribes → reader (e2e with a stubbed/loaded MediaRecorder).
- F3. A **PDF / image** still uses its existing path — **zero behaviour change** (existing PDF + OCR e2e stay green).

**Quality (measurable on controlled fixtures)**
- Q-ACC. On a **clean TTS-rendered fixture** with known ground-truth text, on-device **word accuracy ≥ 85%** (1 − WER, computed in-test). **Scope honesty:** TTS audio is crisp/synthetic → this is a **pipeline-correctness floor** (decode → Whisper → `{pages}` → tappable works end-to-end), *not* a real-world Malay-accuracy number — that is the **manual `asr-accuracy-harness.mjs`** job on real recordings, recorded in RESUME_HERE post-ship.
- Q-WER (manual, Task 0 + post-ship). The harness records real **Malay** and **English** WER for the shipped model on real fixtures — **FLEURS `ms_my` / `en_us` test clips** (the same set mesolitica benchmarks on → directly comparable). **Gate:** Malay must be **≤ 40% WER** to ship on-device-primary (else D1's veto fires → BYOK-primary for Malay).
- Q-EMPTY. A **blank/non-speech clip** yields the friendly empty state (not a crash, not a hallucinated wall of text).

**Non-functional**
- N1. **No-paywall:** the full audio path works with **zero keys configured** (assert in e2e with an empty key state).
- N2. **Privacy:** in the free path, **the audio is never sent over the network** (assert no upload POST; only `public/asr/**` asset fetches).
- N3. **Bundle:** eager `index-*.js` **unchanged (±0 KB)**; transformers.js + ORT + the model load lazily; the new lazy chunk size recorded in RESUME_HERE.
- N4. **Performance/UX:** progress UI appears <1 s after start; the first-run model download shows a one-time, labelled progress; **Cancel** aborts cleanly; inference runs in a **Web Worker** (UI stays responsive).
- N5. **Offline:** after one online run, a second run **works offline** (model + WASM SW-cached).
- N6. **A11y + theme:** progress + transcript note are `aria-live`; `<audio>` controls keyboard-reachable; controls ≥44px; **light + dark** both correct.
- N7. **Core untouched:** the diff shows **no edits** to `fsrs.js`, the dictionary, or the gloss-core grounding logic.

---

## 8. Test plan (TDD: pure logic first)

**Unit (no WASM/audio) — `src/lib/transcribe.test.js`:**
- `paragraphsFromSegments`: pause-gap split, sentence-punctuation split, no-timestamp single-paragraph fallback, whitespace/empty handling.
- `pagesFromTranscript`: shape equals `extractTextFromDoc`; pagination by `PARAS_PER_PAGE`; empty result → no pages.
- `runTranscribe` (injected fake `transcribe`): progress phases, abort returns partial, engine-throw → empty pages (never rejects).
- `emptyTranscriptNotice`: blank/whitespace/non-speech → true.

**Fixtures — `scripts/gen-asr-fixtures.mjs`:** render known Malay + English text to a **clean WAV** via on-device/Node TTS (or commit two tiny real clips) with the ground-truth text recorded alongside. (TTS-clean caveat noted in Q-ACC.)

**e2e — `tests/e2e/audio-transcribe.spec.js`:**
- Happy path: upload clean fixture → progress → transcript contains expected words → tap word → FSRS add (F1, Q-ACC).
- Record mode (stubbed MediaRecorder) → transcript (F2).
- PDF/image unchanged (F3 — existing suites stay green).
- Blank clip → empty state (Q-EMPTY).
- **Go-wild:** non-audio file, oversized file (>cap), cancel mid-transcribe, theme-swap mid-run, offline second run, rapid replace, garbage/silent clip → graceful (never a crash/silent hang).

**Eyeball:** light + dark, mobile viewport (390×844), real mic record + replay on a phone, the first-run model-download UX on throttled network.

---

## 9. Risks & mitigations
- **R1 — Malay on-device accuracy underwhelms.** *The* risk. Mitigation: Task-0 spike measures it BEFORE wiring; mesolitica fine-tune is the quality lever; verify-the-draft framing + replay make a draft useful; the D1 veto pivots Malay to BYOK if measured >40% WER. Q-WER makes the number visible, not assumed.
- **R2 — mesolitica won't convert/run in transformers.js** (issues #1118/#1040). Mitigation: Task 0 is a blocking spike; generic onnx-community/whisper-base is the proven fallback.
- **R3 — First-run model download is big on school data** (~40–90 MB). Mitigation: one-time confirm (Q3) + labelled progress + SW cache (offline after once) + base-class size (D4).
- **R4 — Mobile latency** (base ~20s/min on M3/WASM → more on a phone). Mitigation: Web Worker (non-blocking) + progress + cancel + length cap (D12) + q8/q4 + WebGPU when present.
- **R5 — Whisper hallucination on silence/music.** Mitigation: chunking/stride, empty-speech detection → empty state, verify-the-draft framing (§3i).
- **R6 — Asset size bloats the served app.** Mitigation: lazy + self-host + SW runtime-cache (not precache) + gitignore binaries; eager bundle unchanged (N3). CDN fallback if unacceptable (D7).
- **R7 — WebGPU inconsistency across browsers.** Mitigation: auto-detect device with WASM fallback (practitioner consensus), never hardcode.

---

## 10. Phase 2 preview (framed, NOT designed here)
- **BYOK audio rung ("Sharper listen"):** extend the instruct seam with an **audio-parts capability** (`callInstructAudio({ audio, prompt })`) — Gemini native `inlineData` audio / OpenAI audio transcription — mirroring the OCR `callInstructVision` capability that already exists. Opt-in, discloses the upload, provenance banner. The accuracy escape hatch for noisy/accented/long audio.
- **Video → transcript** (audio-track extract), **inline transcript editor**, **timestamps/chaptering for long lectures**, **speaker diarisation** — each its own scoped follow-up.
- **mesolitica small-v3 / distil-large** as a higher-accuracy on-device tier for users who accept the bigger download.

---

## 11. Sources (graded in §5)
- In-browser Whisper + transformers.js — Xenova/whisper-web (GitHub + HF Space), HF Transformers.js docs, whisperstt.com, DEV "private audio transcription tool" (perf: tiny/base/small s/min, 16 kHz, 30 s chunks, Web Worker, WebGPU auto-detect).
- Whisper WER by size/language — novascribe "How Accurate Is Whisper 2026" (EN size table; SE-Asian Tier-2/3), lexawrite model comparison.
- Malay quality / mesolitica — mesolitica Malaysian-Whisper collection (tiny→distil-large; small-v3 0.2B; trained on Malaysian-STT-Whisper), mesolitica/malaya-speech (beats Google ASR on Malay/FLEURS/Singlish), mesolitica/Speech-Benchmark.
- ONNX conversion for tfjs — HF Optimum export docs (`optimum-cli export onnx`), transformers.js issues #1118/#1040 (custom Whisper), onnx-community/whisper-small(-ONNX).
- vosk-browser (no Malay) — alphacephei/vosk models, vosk-browser npm/demo.
- API — context7 `/huggingface/transformers.js` (ASR pipeline `{language,task,chunk_length_s,stride_length_s,return_timestamps}`, `dtype` q4/q8, `device: 'webgpu'`, `env.allowRemoteModels`/`localModelPath`).
</content>
</invoke>
