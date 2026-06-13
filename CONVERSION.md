# ASR model conversion recipe (Task-0 spike output)

How the self-hosted Whisper ONNX under `public/asr/model/` is produced. Recorded by the
Task-0 model de-risk spike (2026-06-13). The model binaries are **gitignored** (~340 MB raw)
and regenerated from this recipe — only this doc + `scripts/asr-accuracy-harness.mjs` are
committed. Spec/plan: `docs/superpowers/{specs,plans}/2026-06-13-multimodal-audio-transcribe*`.

## Decision: ship `mesolitica/malaysian-whisper-base`, quantized to q8, on-device for MS + EN.

Measured word-accuracy / WER on **FLEURS** test clips (5× `ms_my`, 5× `en_us`, 16 kHz mono),
via `node scripts/asr-accuracy-harness.mjs`:

| Model (dtype)                                       | Malay WER | English WER |
|-----------------------------------------------------|-----------|-------------|
| generic `onnx-community/whisper-base` (q8)          | **50.1%** ❌ | 27.1% ✅ |
| mesolitica `malaysian-whisper-base` → ONNX (fp32)   | **18.4%** ✅ | 19.0% ✅ |
| mesolitica `malaysian-whisper-base` → ONNX (q8)     | **18.6%** ✅ | 17.1% ✅ |

Gate (spec Q-WER): Malay must be ≤ 40% WER to ship on-device-primary. mesolitica clears it by
a wide margin and ~halves generic's Malay error; the D1 "flip Malay to BYOK" veto did NOT fire.

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

# 3. Arrange into the HF-style layout transformers.js loads (note the onnx/ SUBFOLDER):
#    public/asr/model/{config,generation_config,preprocessor_config,tokenizer,tokenizer_config,
#                      vocab,merges,normalizer,added_tokens,special_tokens_map}
#    public/asr/model/onnx/{encoder_model,decoder_model_merged}.onnx          (fp32, no suffix)

# 4. Quantize to q8. transformers.js dtype:'q8' resolves the `_quantized` SUFFIX (NOT `_q8` —
#    verified in @huggingface/transformers/src/utils/dtypes.js):
python - <<'PY'
from onnxruntime.quantization import quantize_dynamic, QuantType
b = 'public/asr/model/onnx'
for n in ['encoder_model', 'decoder_model_merged']:
    quantize_dynamic(f'{b}/{n}.onnx', f'{b}/{n}_quantized.onnx', weight_type=QuantType.QUInt8)
PY
```

## Known gotchas for the build session (Task 4)

1. **The merged decoder does not shrink under `quantize_dynamic`.** It quantizes the encoder
   (82→23 MB) but leaves `decoder_model_merged.onnx` at 314 MB — `quantize_dynamic` skips
   weights inside the decoder's `If` control-flow subgraph. So the measured q8 is effectively
   *encoder-int8 + decoder-fp32* (the WER is therefore a conservative, near-fp32 figure; the
   ship decision is safe either way). For a genuinely small shippable decoder, quantize the
   **un-merged** `decoder_model.onnx` + `decoder_with_past_model.onnx`, or adopt the
   onnx-community whisper quantization (their `_quantized` decoders are properly small).
2. **Asset size + delivery.** Raw export ≈ 340 MB (≈100 MB once the decoder quantizes
   properly). Per spec §4.4: **gitignore** the binaries; have `scripts/copy-asr-assets.mjs`
   **fetch** a pre-converted q8 model from a HF repo (owner's account) rather than run the
   torch/optimum conversion in CI or `postinstall` (too heavy).

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
