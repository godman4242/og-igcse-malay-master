# ASR model conversion recipe (Task-0 spike output)

How the self-hosted Whisper ONNX under `public/asr/model/` is produced. Recorded by the
Task-0 model de-risk spike (2026-06-13). The model binaries are **gitignored** (~340 MB raw)
and regenerated from this recipe — only this doc + `scripts/asr-accuracy-harness.mjs` are
committed. Spec/plan: `docs/superpowers/{specs,plans}/2026-06-13-multimodal-audio-transcribe*`.

## Decision: ship `mesolitica/malaysian-whisper-base`, quantized to q8, on-device for MS + EN.

Measured word-accuracy / WER on **FLEURS** test clips (5× `ms_my`, 5× `en_us`, 16 kHz mono),
via `node scripts/asr-accuracy-harness.mjs`:

| Model (dtype)                                                 | Malay WER | English WER | Size |
|---------------------------------------------------------------|-----------|-------------|------|
| generic `onnx-community/whisper-base` (q8)                     | **50.1%** ❌ | 27.1% ✅ | — |
| mesolitica `malaysian-whisper-base` → ONNX (fp32)             | **18.4%** ✅ | 19.0% ✅ | ~670 MB |
| mesolitica q8, encoder-int8 + **fp32 merged decoder**         | **18.6%** ✅ | 17.1% ✅ | ~322 MB |
| mesolitica q8, **fully int8** (un-merged quantize → re-merge) | **20.1%** ✅ | 14.6% ✅ | **~103 MB** ← SHIPPED |

Gate (spec Q-WER): Malay must be ≤ 40% WER to ship on-device-primary. mesolitica clears it by
a wide margin and ~halves generic's Malay error; the D1 "flip Malay to BYOK" veto did NOT fire.

**Why fully-int8 is the shipped one (2026-06-13, build session):** the encoder-int8 + fp32-merged-decoder
q8 (322 MB) **transcribes fine in Node but HANGS in browser WASM** — ORT never finishes building the
InferenceSession for the 300 MB decoder (no error; just stuck). The fully-int8 build (genuinely quantized
decoder, 76 MB) loads in-browser in seconds. The +1.5 pp Malay WER is a worthwhile trade for a model that
*actually runs on the device*. Re-measured on the same FLEURS clips.

## Reproduce the conversion

> ⚠️ The plan's primary command — transformers.js `python -m scripts.convert` — **no longer
> exists**: the Python conversion tooling was removed from the transformers.js monorepo. Use
> `optimum-cli` (the plan's documented fallback, now the path).

```bash
# 1. One-off Python env (Python 3.10 — librosa/numba lag brand-new Pythons; 3.14 was avoided)
python3.10 -m venv .venv-asr && . .venv-asr/bin/activate
pip install "optimum[onnxruntime]" onnx onnxruntime torch transformers

# 2. Export PyTorch → ONNX (fp32). opset 14 warns "recommend >=18" but exports cleanly;
#    the validation "values not close enough" lines are ~5e-5 fp noise, not a failure.
optimum-cli export onnx --model mesolitica/malaysian-whisper-base ./mesolitica-onnx \
  --task automatic-speech-recognition-with-past --opset 14

# 3. The optimum export (step 2) writes BOTH the un-merged decoders AND the merged one:
#    mesolitica-onnx/{encoder_model, decoder_model, decoder_with_past_model, decoder_model_merged}.onnx
#    + the JSON configs (config, generation_config, preprocessor_config, tokenizer,
#    tokenizer_config, vocab, merges, normalizer, added_tokens, special_tokens_map).

# 4. Quantize to int8 the RIGHT way, then re-merge (the build-session fix — see gotcha 1).
#    quantize_dynamic skips weights inside the merged decoder's `If` subgraph, so quantize the
#    UN-MERGED decoders (which shrink), then merge the quantized pair back into the
#    decoder_model_merged_quantized.onnx that transformers.js requires. transformers.js
#    dtype:'q8' resolves the `_quantized` SUFFIX (NOT `_q8`).
python - <<'PY'
from onnxruntime.quantization import quantize_dynamic, QuantType
from optimum.onnx import merge_decoders
import os
src = 'mesolitica-onnx'
out = 'public/asr/model/onnx'; os.makedirs(out, exist_ok=True)
# 4a. Quantize encoder + both un-merged decoders (no If-subgraph → these actually shrink).
for n in ['encoder_model', 'decoder_model', 'decoder_with_past_model']:
    quantize_dynamic(f'{src}/{n}.onnx', f'{out}/{n}_quantized.onnx', weight_type=QuantType.QUInt8)
# 4b. Re-merge the quantized pair (strict=False — the no-past decoder emits extra encoder-KV
#     outputs). Weight-sharing across the If-branches keeps the result ~one-decoder-sized.
merge_decoders(f'{out}/decoder_model_quantized.onnx', f'{out}/decoder_with_past_model_quantized.onnx',
               save_path=f'{out}/decoder_model_merged_quantized.onnx', strict=False)
PY
# 5. Ship only encoder_model_quantized.onnx + decoder_model_merged_quantized.onnx (≈103 MB total)
#    in public/asr/model/onnx/ — transformers.js with dtype:'q8' loads exactly those two. The
#    un-merged + fp32 onnx are intermediates; delete them from the shipped dir.
```

## Known gotchas for the build session (Task 4)

1. **The merged decoder does not shrink under `quantize_dynamic` — but you can re-merge a
   quantized pair (RESOLVED).** `quantize_dynamic` skips weights inside the merged decoder's
   `If` control-flow subgraph, leaving `decoder_model_merged_quantized.onnx` at ~300 MB
   (effectively fp32). **That fp32-sized decoder loads in Node but HANGS in browser WASM** (ORT
   never finishes building the session). Fix (step 4 above): quantize the **un-merged**
   `decoder_model` + `decoder_with_past_model` (these shrink to ~75 MB each), then
   `optimum.onnx.merge_decoders(..., strict=False)` them back into a 76 MB
   `decoder_model_merged_quantized.onnx`. transformers.js loads it + transcribes correctly,
   and it loads in-browser in seconds.
2. **Asset size + delivery.** Shipped model ≈ **103 MB** (76 MB merged decoder + 22 MB encoder +
   tiny JSONs). Per spec §4.4: **gitignore** the binaries; `scripts/copy-asr-assets.mjs`
   **fetches** them from a GitHub Release of this repo (`asr-model-mesolitica-base-q8`) at build
   time (git rejects >100 MB files; a Release allows 2 GB each, and `copy-asr-assets` runs in
   `prebuild` on Vercel). Re-run this recipe to regenerate; `gh release upload` to host.

## Harness (Node audio note)

`scripts/asr-accuracy-harness.mjs` decodes WAV → 16 kHz mono `Float32Array` via `wavefile`
before calling the pipeline: transformers.js `read_audio()` needs a browser `AudioContext`,
so a file path can't be passed directly in Node (HF "node-audio-processing" guide).

```bash
# generic baseline (remote Hub) vs the self-hosted converted model:
node scripts/asr-accuracy-harness.mjs --model onnx-community/whisper-base --remote --dir ./tmp-asr-fixtures --lang ms
node scripts/asr-accuracy-harness.mjs --dir ./tmp-asr-fixtures --lang ms --dtype q8   # self-hosted public/asr/model
```
FLEURS fixtures (throwaway, gitignored) are pulled by a tiny `datasets`/`soundfile` script —
see the plan's Task-0 step 0a-i.
