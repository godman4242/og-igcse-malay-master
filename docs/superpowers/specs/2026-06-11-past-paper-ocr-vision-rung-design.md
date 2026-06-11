# Past-paper OCR Phase 2 — the optional BYOK-vision quality rung

**Status:** Design **APPROVED** (2026-06-11) — the one flagged fork (§6 Q4, upload-consent UX) is **resolved: Kheshav chose 4A** (one-time consent + standing disclosure). Ready for an Implementation session.
**Date:** 2026-06-11
**Session type:** Design & Research (no production code).
**Builds on (do NOT redesign — extend additively):** Phase 1 OCR (`src/lib/ocr.js`, `src/lib/ocrEngine.js`, `runImageOcr` in `src/pages/PDFReader.jsx`); the FROZEN instruct seam (`src/lib/instruct.js`) + adapters (`src/lib/instructProviders/{gemini,openrouter,ollama}.js`); `src/lib/openrouter.js`.
**Plan:** `docs/superpowers/plans/2026-06-11-past-paper-ocr-vision-rung.md`
**Resolves:** Phase 1 spec **risk R1** ("Malay-printed accuracy underwhelms on real photos"; Tesseract ~80–90% on phone photos, weak on handwriting/tables) — Phase 1 §3a/§5 D1/§9 R1/§10.
**Invariants honoured (hard):**
- The **free Tesseract path stays the DEFAULT, byte-identical**, working with **ZERO keys** — no-paywall. The vision rung is strictly **additive + opt-in**.
- The vision rung **uploads the image to the user's OWN provider**, so it **MUST disclose that prominently** (Phase 1's standing promise is "never uploaded"). Privacy regression is only acceptable *with explicit, per-action consent*.
- `instruct.js`'s public API stays **frozen-compatible** — `callInstruct` and every shipped text caller are byte-identical; we extend **additively**.
- **BYOK keys stay in per-provider localStorage**, never the Zustand store / cloud blob.
- The reader's `{pages}` shape + the **gloss→FSRS core stay untouched**.
See `[[project_invariants]]`, `[[project_multimodal_direction]]`, `[[feedback_make_clear_calls]]`, `[[feedback_research_practitioner_reviews]]`.

---

## 1. Problem & who it's for

Phase 1 shipped free on-device OCR (Tesseract.js) — a student can photograph a printed past paper and study it in the reveal-gated reader. But Phase 1 was honest about its ceiling (**R1**): Tesseract is **~80–90% on real phone photos** and **weak by design on handwriting and tables**. For our **primary audience — IGCSE Malay 0546 students** — the dominant real input is a *crumpled, badly-lit phone photo of a printed page*, plus the occasional handwritten model answer or a tabular worksheet. On those, a 1-in-8-words-wrong draft is usable (tap-to-check catches it) but not great, and handwriting/tables effectively don't work.

**Job-to-be-done:** "When the free read comes out rough, let me get a *sharper* read of this same page — at no cost to me — and keep studying it in the exact same reader."

**Who it's for:** the subset of students whose photos are messy or handwritten/tabular, **who choose** to use their own free AI key for a better read. Everyone else is untouched: the free on-device path remains the default and the only path that needs no setup.

**Why now (fit, not novelty):** the multi-provider **instruct router shipped 2026-06-10** already holds the user's BYOK keys, cooldown/auto-switch logic, and Settings cards. Phase 2 is mostly *wiring an image capability onto that existing seam* — high leverage, low new surface.

---

## 2. Scope

### In scope (Phase 2)
1. **An additive vision capability on the instruct seam:** a `callInstructVision({systemPrompt, messages, images, maxTokens?, signal?})` that routes **only to vision-capable providers**, leaving `callInstruct` byte-identical.
2. **A vision OCR producer that reuses Phase 1's orchestration:** a `createVisionRecognizer()` whose `recognize(image)` returns the **same `{text, words}` contract `runOcr` already injects** — so progress, abort, sequential paging, per-image error isolation, and the `{pages}` transform are **reused unchanged**.
3. **Trigger UX:** a manual **"Sharper read"** affordance (never auto-runs — it uploads), surfaced prominently when the free read is low-confidence *and* a vision provider is configured. Re-runs vision on the **same already-loaded image(s)** (no re-pick).
4. **Upload disclosure + consent:** a prominent, honest disclosure on the button and a one-time consent step before the first upload (the flagged fork — §6 Q4).
5. **Provenance-correct "verify-don't-trust" framing** for a vision read (no per-word confidence exists; a doc-level "AI-read draft — tap to check" banner replaces the Tesseract blurry note; reveal-gating + tap-to-check stay fully active).
6. **Providers:** **Gemini** (native vision, **free tier includes vision**) as the primary; **OpenRouter** (free vision models exist but rotate + are rate-limited) as the secondary. **Ollama excluded** this phase (vision needs a vision-model + desktop-only + weak Malay).
7. **Page types:** printed-but-photographed prose/questions (the R1 win) **plus** light handwriting and simple tables (vision's strength; output kept as linear text — table *structure reconstruction* is parked).

### Explicitly parked (with one-line "why later" → Phase 3)
- **Table/2-column *structure* reconstruction** (markdown tables, column order) — vision can do it, but the gloss→FSRS path wants linear text; structure is its own epic.
- **Inline correction editor** — still tap-to-check + re-read; an editable transcript is a separate follow-up.
- **Answer-key extraction / auto-grading from a marked script** — separate epic.
- **Ollama / local vision models** — desktop-only, weak Malay; revisit if asked.
- **A "compare free vs sharper side-by-side" view** — nice, not load-bearing.
- **Auto-upload-on-low-confidence preference** — a power-user opt-in only after the manual flow proves itself (privacy-sensitive).

---

## 3. Options considered → chosen, per load-bearing fork

### Fork 1 — Seam shape: how the image capability attaches to `instruct.js`

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **1A. Additive `images:[{mimeType,data}]` field on the *existing* `callInstruct` args** | Smallest surface; one entry point | The router would fall back a vision request onto a **text-only provider that silently ignores the image and hallucinates** — a correctness + "verify-don't-trust" violation; every text caller's arg type widens | Rejected |
| **1B. A parallel `callInstructVision(args)` + an additive adapter capability (`supportsVision` flag + `callVision` method); `callInstruct` literally untouched** | Frozen API byte-identical; **capability is explicit** so the router never sends an image to a blind provider; same cooldown/auto-switch reused; vision-only ordering | One more public function + two optional adapter fields | **CHOSEN** |
| 1C. A brand-new top-level `src/lib/vision.js` seam, separate from instruct | Clean separation | Duplicates the router's cooldown/preference/auto-switch machinery; two registries to keep in sync | Rejected |

**Why 1B:** the frozen-compatibility invariant is *"extend additively, never break `callInstruct`."* 1B does exactly that and adds the one thing a router needs to be safe — an explicit *capability* — so a vision call can never silently degrade to a blind text model. It reuses the shipped cooldown/preference/switch-toast logic verbatim. Verified anchors: `callInstruct` signature (`instruct.js:125`), `orderedAdapters()` (`instruct.js:64`), adapter contract `{id,label,hasKey,call,verify}` (each adapter export).

### Fork 1b — The OCR-side consumer: how vision text becomes `{pages}`

| Option | Verdict |
|---|---|
| **A new `createVisionRecognizer()` that adapts `callInstructVision` to `runOcr`'s injected `recognize` contract → feeds the EXISTING `runOcr` → `pagesFromOcrResults` → `setPdfData({pages})`** | **CHOSEN** — the vision rung is *just a second producer of the same injected contract* `createOcrRecognizer` already satisfies (`ocrEngine.js:29`, `ocr.js:73`). Progress, abort, per-image isolation, `{pages}` transform: **all reused, zero new orchestration.** |
| A separate vision pipeline that builds `{pages}` itself | Rejected — duplicates `runOcr`; risks shape drift from `extractTextFromDoc`. |

**This is the load-bearing elegance:** Phase 1 designed `runOcr` to take an **injected** `recognize`. The vision recognizer satisfies the identical `(image) => Promise<{text, words}>` contract (vision returns `words: []` → `meanConfidence` 0, `lowConfidenceWords` empty — which we *want*, see Fork 5). So `runImageOcr` in `PDFReader.jsx:268` only chooses *which recognizer to create*; everything downstream is unchanged.

### Fork 2 — Which providers/models can "see", and how the router picks/falls-back

| Provider | Vision? | Cost to the student | Malay/handwriting quality (graded §5) | Verdict |
|---|---|---|---|---|
| **Gemini** (native `generateContent`, `inlineData`) | Yes | **$0 on the free tier — vision included**, 1,500 req/day; paid Flash <$0.001/img | Best of the three; Flash-Lite "clearly outperformed" on diverse handwriting in a 2026 benchmark; ~84% clean / ~70% messy handwriting; ~95%+ printed | **PRIMARY** |
| **OpenRouter** (`image_url`, vision-capable free models) | Yes, *model-dependent* | $0 on free vision models (Gemma 4, Llama 4 Maverick, Qwen-VL, Llama-3.2-Vision) but **rate-limited ~200/day + slugs rotate** | Good (Llama 4 / Qwen-VL competitive); varies by which free model is up | **SECONDARY** |
| **Ollama** (local vision model) | Only if the user runs llava / llama3.2-vision | $0 but desktop-only, slow, weak Malay | Weakest for Malay; R2/R9 from the router spec | **EXCLUDED this phase** (`supportsVision: false`) |

**Router behaviour (reuses the shipped engine):** `callInstructVision` orders only `supportsVision` adapters (preferred-first, same as `orderedAdapters`), skips cooled providers, **auto-switches on quota with the existing toast**, and **throws a typed `no_vision_provider`** when none is configured — callers show an "add a free key" CTA, **never a paywall block**. OpenRouter vision needs a **vision-model filter** (its model metadata exposes `architecture.input_modalities` including `'image'`) — discovered live + cached like `getFreeModels`, never hardcoded (the "slugs rotate" lesson, `openrouter.js` header).

### Fork 3 — Trigger UX: when does the rung appear / run?

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **3A. Manual "Sharper read" button — shown whenever a vision provider is configured; *highlighted* inside the low-confidence note** | Honest (the upload is a deliberate act, post-result); zero surprise network/cost; the nudge appears exactly when the free read was rough | One extra tap | **CHOSEN** |
| 3B. Auto-run vision whenever a key exists | Fewer taps | **Auto-uploads** every photo — violates the consent spirit; spends quota silently | Rejected |
| 3C. Auto-run only when free confidence < threshold | "Smart" | Still auto-uploads without consent; surprising | Rejected (revisit as an explicit opt-in pref in Phase 3) |

**Why 3A:** uploading is the privacy regression Phase 1 promised against — it must be a *deliberate, informed* action, and the most useful moment to offer it is *after* the learner sees a rough free read. Requires **retaining the source image(s)** in a ref so the button re-runs on the same input (today `runImageOcr` discards them — a small additive wiring change, §4.3).

### Fork 4 — Upload disclosure / consent UX  ⚠️ **FLAGGED to Kheshav (§6 Q4)**

| Option | Pros | Cons | Verdict (default) |
|---|---|---|---|
| **4A. One-time consent dialog on the first "Sharper read" + persistent inline disclosure on the button** | Clear informed consent once; honest standing label after; "Don't ask again" respects ADD/low-friction | One modal the first time | **DEFAULT (flagged)** |
| 4B. Persistent inline disclosure only (no modal), every tap uploads | Lowest friction | A privacy-changing action with no explicit moment of consent | Backup if Kheshav wants zero modals |
| 4C. Consent dialog **every** time | Maximally cautious | Nagging; ADD-hostile | Rejected |

**Default (4A):** the button reads **"Sharper read — uploads to {provider}"**; the **first** tap opens a short dialog: *"This sends your photo to {provider} using your own key. It leaves your device (the free read never does). Continue? [Continue] [Not now] ☐ Don't ask again."* The reader then shows a **provenance banner** (Fork 5). This is the one fork whose default is genuinely product-shaped (it intentionally *relaxes* a shipped promise), so it's surfaced for explicit sign-off.

### Fork 5 — Vision text → `{pages}` mapping + "verify-don't-trust" without per-word confidence

| Concern | Decision |
|---|---|
| **Shape** | Vision `recognize` returns `{text, words: []}` → the **unchanged** `runOcr`/`pagesFromOcrResults` produces the identical `{pages}`. No core change. |
| **The transcription prompt** | A pure, tested prompt: *"Transcribe ALL text on this page **verbatim**, preserving reading order and line/paragraph breaks. Output **only** the transcribed text — no commentary, no translation, no markdown fences."* (Malay/English-agnostic; the same `ocrLang` toggle can add a one-line hint.) Lives in a pure `buildVisionMessages()` so it's unit-tested. |
| **No per-word confidence** | LLMs don't return it → `meanConfidence` is 0 and `lowConfidenceWords` is empty by construction. So we **suppress** the Tesseract blurry note + dotted underline for vision reads (they'd misfire: `0 < 70`), and instead show a **doc-level provenance banner**: *"Sharper read by {provider} — still a draft. Tap any word to check."* |
| **Verification path** | Unchanged: **reveal-gating + tap-to-check are the verification.** Vision is *more* accurate but still framed as a draft the learner confirms — consistent with the app's grounding ethos. |
| **Provenance flag** | `runImageOcr` threads a `source: 'tesseract' | 'vision'` (+ provider id) so the UI shows the right banner and the recents chip can mark a sharper read. |

---

## 4. Architecture

Three additive layers; **nothing existing is rewritten**. Mirrors Phase 1's "pure logic + injected impure boundary" split and the instruct router's "pure `buildRequest`/`parseResponse` + thin adapter" split.

### 4.1 Seam extension — `src/lib/instruct.js` (additive only)
```
callInstructVision({ systemPrompt, messages, images, maxTokens?, signal? }, opts?) -> Promise<string>
    - images: Array<{ mimeType: string, data: string /* base64, no data: prefix */ }>
    - orders ONLY adapters where supportsVision is truthy (orderedAdapters, vision-filtered)
    - reuses isCooling / noteFailure / emitSwitch / cooldown map verbatim
    - none configured  -> throws Error(cause: 'no_vision_provider')
    - AbortError propagates raw (same as callInstruct)
hasVisionProvider() -> boolean   // any configured adapter with supportsVision
getConfiguredVisionProviders() -> [{id,label}]   // for the consent copy + Settings
```
`callInstruct`, `hasInstructProvider`, the REGISTRY, and the cooldown internals are **unchanged**. (Refactor note: the call-ordering loop in `callInstruct` can be factored into a shared `runOnAdapters(list, invoke)` so `callInstructVision` reuses it — internal only, no API change.)

### 4.2 Adapter capability (additive fields; absent ⇒ no vision)
Contract becomes `{ id, label, hasKey, call, verify, supportsVision?, callVision? }`.
- **Gemini** (`gemini.js`): `supportsVision: true`; `callVision` posts to the **same native `…:generateContent` endpoint already proven CORS-safe client-side** (`gemini.js:170`) with a pure `buildGeminiVisionRequest({systemPrompt, messages, images})` that appends image parts. **Verified shape (context7 /websites/ai_google_dev_gemini-api):**
  ```js
  contents: [{ role:'user', parts: [
    { inlineData: { mimeType:'image/jpeg', data:'<base64>' } },   // camelCase; proto-JSON accepts it (the file already uses camelCase generationConfig/maxOutputTokens against this exact endpoint)
    { text: '<transcription prompt>' },
  ] }]
  ```
- **OpenRouter** (`openrouter.js` + adapter): `supportsVision: true`; a new `callOpenRouterVision({systemPrompt, messages, images, signal})` that (a) discovers **vision-capable** free models via a pure `pickVisionModels(json)` (filter `architecture.input_modalities` ⊇ `'image'`; cache 24h, fallback list), (b) builds the **verified content-array** message **(context7 /websites/openrouter_ai)**:
  ```js
  messages: [{ role:'user', content: [
    { type:'text', text:'<transcription prompt>' },               // text BEFORE image (OpenRouter guidance)
    { type:'image_url', image_url:{ url:'data:image/jpeg;base64,<base64>' } },
  ] }]
  ```
  The adapter's `callVision` maps the HTTP-429 message to `cause:'quota'` exactly like the shipped text path (`instructProviders/openrouter.js:22`).
- **Ollama**: no `supportsVision` (excluded). SECURITY BAR preserved: these modules still must not import `useStore`.

### 4.3 OCR vision producer — pure prompt + lazy recognizer
- **`src/lib/ocrVision.js` (pure — no DOM/network):** `buildVisionMessages({ lang })` (the transcription prompt + `messages` array), `VISION_SYSTEM_PROMPT`, and any text post-clean. Fully unit-tested.
- **`src/lib/ocrVisionEngine.js` (impure boundary, lazy):** `createVisionRecognizer({ lang, signal })` → `{ recognize(image) }` where `recognize` (i) converts the image (File **or** canvas) to base64 + mimeType via a small DOM helper `imageToInlineData(image)` (canvas `toDataURL` / `FileReader`), (ii) calls `callInstructVision`, (iii) returns `{ text, words: [] }`. **No `terminate()` needed** (no worker). Dynamically imported inside `runImageOcr` so it stays out of the eager bundle.

### 4.4 PDFReader wiring (surgical, additive — read the whole file first)
- **Retain the source** in `runImageOcr` (`PDFReader.jsx:268`): keep `images` + `source`/`fromPdf`/`name` in a `lastOcrSourceRef` so "Sharper read" can re-run without a re-pick.
- **A recognizer switch:** `runImageOcr(images, { engine = 'tesseract' })` creates `createOcrRecognizer` (default) **or** `createVisionRecognizer` (when invoked by "Sharper read"). The `runOcr(...)` call and everything after are unchanged; thread `source: engine==='vision' ? 'vision' : 'tesseract'` + `provider` into state.
- **"Sharper read" button:** visible when `hasVisionProvider()` **and** a doc is loaded from an image/scanned-PDF source. Highlighted inside the low-confidence note. `onClick` → consent gate (Fork 4) → `runImageOcr(lastOcrSourceRef.current.images, { engine:'vision' })`.
- **Provenance banner** (Fork 5): when `source==='vision'`, render *"Sharper read by {provider} — still a draft. Tap any word to check."* and **suppress** the `ocrConfidence < 70` blurry note + the `lowConfTokens` dotted cue (set `lowConfTokens` to empty for vision; gate the note on `source==='tesseract'`).
- **Consent dialog** + a persisted `pdfReader.visionConsent` flag ("Don't ask again") — store pref (STORE_VERSION bump).
- **Settings:** the existing provider cards already manage the keys; add one line — a "used for Sharper read (vision OCR)" note next to vision-capable providers. No new key UI.
- **Layout toggle** stays gated on `pdfDoc` (vision sources have none — same as Phase 1, `switchView` `PDFReader.jsx:159`).

### 4.5 No assets, no bundle cost
Vision adds **no WASM, no models, no `public/` assets** — it's HTTP to the user's provider. The eager bundle is unchanged; `ocrVision`/`ocrVisionEngine` are lazy chunks loaded only on "Sharper read."

---

## 5. Decision log

| # | Decision | Evidence (source · grade) | Confidence | What changes my mind |
|---|---|---|---|---|
| D1 | **Parallel `callInstructVision` + adapter `supportsVision` capability**; `callInstruct` untouched (Fork 1B) | Frozen-API invariant + read of `instruct.js:64/125` + router cooldown design · **High** | **High** | If a clean way existed to mark capability *without* a second entry point and still prevent blind-provider fallback |
| D2 | Vision rung is **a second `runOcr` recognizer** (`createVisionRecognizer` ⇒ injected `recognize`) — orchestration reused | Code: `runOcr` injected contract (`ocr.js:73`), `createOcrRecognizer` (`ocrEngine.js:29`) · **High** | **High** | — (this is the seam Phase 1 deliberately built) |
| D3 | **Gemini = primary vision provider**; free tier **includes vision** (1,500 req/day) | Google AI rate-limits/pricing + 3 practitioner pricing guides (2026): free tier = Flash/Flash-Lite, all modalities · **High** | **High** | If Google drops vision from the free tier, or a benchmark shows a free OpenRouter model beats Flash on Malay |
| D4 | **OpenRouter = secondary**; discover **vision-capable** free models live (`input_modalities ⊇ image`), never hardcode | OpenRouter vision/free-model collections + multimodal docs (context7) + the app's own "slugs rotate" lesson (`openrouter.js`) · **High** | **High** | — |
| D5 | **Ollama excluded** from the vision rung this phase | Router spec R2/R9 (desktop-only, weak Malay) + local-vision-model burden · **Med-High** | **Med-High** | A user explicitly asking for local vision OCR |
| D6 | **Manual "Sharper read"**, never auto-upload (Fork 3A) | Privacy invariant + Phase 1's "never uploaded" promise; consent-spirit · **High** | **High** | Strong user demand for a power-user "always sharper" pref (then add it as an explicit opt-in, Phase 3) |
| D7 | **One-time consent + persistent inline disclosure** before the first upload (Fork 4A) — ✅ **Kheshav confirmed 2026-06-11** | Privacy invariant (this *relaxes* a shipped promise) + ADD-low-friction (`[[feedback_make_clear_calls]]`) · **High** (product call, signed off) | **High** | — (resolved) |
| D8 | Verified request shapes: **Gemini `inlineData{mimeType,data}` camelCase** on the native endpoint; **OpenRouter `image_url{url:data:…}` content-array, text-before-image** | context7 `/websites/ai_google_dev_gemini-api` + `/websites/openrouter_ai` + the adapter's existing camelCase use against the native endpoint · **High** | **High** | If a live 400 shows the native endpoint rejects camelCase `inlineData` → switch to `inline_data` snake_case (proto-JSON accepts both; trivial) |
| D9 | **Browser-CORS is already solved** for both providers | The shipped text adapters call the *same* Gemini-native + OpenRouter endpoints client-side today (`gemini.js:170`, `openrouter.js:234`); an image just enlarges the JSON body · **High** | **High** | — |
| D10 | **No per-word confidence** for vision → doc-level provenance banner, suppress Tesseract blurry note + dotted cue for vision reads | LLM OCR returns plain text (no per-token conf) + Fork-5 reasoning · **High** | **High** | If a provider starts returning per-token logprob-confidence we could map it |
| D11 | **Retain source image(s)** so "Sharper read" re-runs without re-pick | Read of `runImageOcr` (`PDFReader.jsx:268`, discards input today) · **High** | **High** | — |
| D12 | **Real-world accuracy is a manual harness gate, not CI**; e2e mocks the vision provider | Phase 1 Q-ACC honesty precedent (§7) + non-determinism/cost/network of a real key in CI · **High** | **High** | — |

---

## 6. Open questions for Kheshav (defaults chosen; veto any — Q4 needs your call)

| # | Question | Default (decide-and-flag) | Why |
|---|---|---|---|
| **Q4** ✅ | **Upload consent UX** — one-time dialog + standing disclosure (4A), inline-disclosure-only (4B), or every-time dialog (4C)? | **4A — RESOLVED 2026-06-11 (Kheshav confirmed):** one-time consent dialog ("☐ Don't ask again") + persistent button label "Sharper read — uploads to {provider}" + provenance banner | Honest informed consent for a privacy-relaxing action, once; respects ADD low-friction. |
| Q1 | Trigger: manual button only, or also an explicit **"always sharper for photos"** opt-in pref? | **Manual only** in Phase 2; the pref is Phase 3 | Keeps the privacy story simple; proves the manual flow first |
| Q2 | Default vision provider order when several keys exist | **Gemini → OpenRouter** (quality + free-tier-vision first) | Matches the router's quality-first auto-order + the §5 D3 evidence |
| Q3 | Page cap for a vision "Sharper read" of a multi-page scanned PDF | **Cap at 10** (same as Phase 1 Q6), logged, never silent | Bounds quota/latency; consistent with Phase 1 |
| Q5 | Show an estimated cost/quota hint in the consent dialog? | **A reassurance line, not a number** ("uses your provider's free tier — typically no cost") | Real $ is ~$0 on free tiers; a per-image figure would be noise |
| Q6 | English-page vision: same single prompt, or a language hint from the `ocrLang` toggle? | **Reuse `ocrLang`** as a one-line hint; one prompt otherwise | Language-agnostic transcription; minimal surface |

---

## 7. Measurable acceptance criteria (the "done" bar)

**Functional**
- F1. With a vision provider configured, a **"Sharper read"** button appears on an image/scanned-PDF read; tapping it (through consent) replaces the reader text with the vision transcription, and **tap-to-translate + add-to-FSRS work unchanged** (e2e with a **mocked** vision provider).
- F2. With **no** vision provider configured, **no** "Sharper read" button appears and the free Tesseract path is **byte-identical** to Phase 1 (the Phase 1 OCR e2e suite stays green).
- F3. A vision read shows the **provenance banner** and **suppresses** the Tesseract blurry note + dotted low-confidence cue.
- F4. Consent: the **first** "Sharper read" shows the consent dialog; "Don't ask again" persists; subsequent reads skip it.

**Seam correctness (unit, no network)**
- S1. `buildGeminiVisionRequest` emits `contents[0].parts` with an `inlineData{mimeType,data}` part **and** the text part; `buildVisionMessages` (OpenRouter) emits a `content` array with `type:'text'` **before** `type:'image_url'` whose `url` is a `data:…;base64,…` string.
- S2. `callInstructVision` with **no vision provider** throws `cause:'no_vision_provider'`; with one configured it routes there; a quota failure **auto-switches** to the next vision provider and emits the switch event (reuses the shipped cooldown test seam `__resetInstructRouter`).
- S3. `pickVisionModels` keeps only image-input models, dedupes, caps, and **never throws** on a malformed payload (mirrors `pickFreeModels` tests).
- S4. A `createVisionRecognizer().recognize(fakeImage)` (with `callInstructVision` injected/mocked) returns `{text, words: []}`; fed to the **real** `runOcr` it yields the Phase-1 `{pages}` shape with `meanConfidence === 0`.

**Quality (the R1 resolution — measured, honestly)**
- **Q-VIS (manual harness, not CI).** A `scripts/ocr-accuracy-harness.mjs` runs **both** Tesseract and a real BYOK vision key over a **small fixture set of genuinely messy inputs** — (a) a blurred/low-light printed Malay page, (b) a light-handwriting Malay sample — and prints **word-accuracy (1 − WER) for each engine**. **Target: vision ≥ 90% on the messy-printed fixture and strictly **> Tesseract** on both fixtures**, demonstrating R1 is resolved. Run once by Kheshav with a free Gemini key; the number is recorded in `RESUME_HERE`, **not** gated in CI (D12; mirrors Phase 1 Q-ACC honesty).
- Q-MOCK (CI). The e2e mock returns a known transcription so the wiring (button → consent → vision text → tappable → FSRS) is deterministically green.

**Non-functional**
- N1. **No-paywall:** zero keys ⇒ full free OCR works, no "Sharper read" shown, no nag (assert with empty key state).
- N2. **Frozen API:** `callInstruct` and every shipped text caller are unchanged (the instruct-router unit + e2e suites stay green; a guard test asserts `callInstruct`'s arity/behaviour is untouched).
- N3. **Key security:** no vision code imports `useStore`; keys never enter the store/blob (lint/grep guard, as the router spec already enforces).
- N4. **Privacy honesty:** the only network upload of image bytes happens **after** consent, to the configured provider's endpoint, on the user's key; the free path posts **no** image (assert: free read makes no provider POST).
- N5. **Bundle:** eager `index-*.js` **unchanged (±0 KB)**; `ocrVision`/`ocrVisionEngine` are lazy; record their chunk sizes in `RESUME_HERE`.
- N6. **A11y + theme:** consent dialog + banner + button are keyboard-reachable, `aria-live` where dynamic, correct in **light + dark**.
- N7. **Core untouched:** the diff shows **no edits** to `fsrs.js`, the dictionary, the gloss-core, **or** `callInstruct`/the text adapters' `call` path.

---

## 8. Test plan (TDD: pure logic first)

**Unit (no network):**
- `src/lib/ocrVision.test.js` — `buildVisionMessages` (text-before-image; lang hint), prompt invariants.
- `src/lib/instructProviders/gemini.test.js` (extend) — `buildGeminiVisionRequest` shape (S1).
- `src/lib/openrouter.test.js` (extend) — `pickVisionModels` (S3), `buildOpenRouterVisionMessages` (S1).
- `src/lib/instruct.test.js` (extend) — `callInstructVision` routing, `no_vision_provider` throw, quota auto-switch, **and a guard that `callInstruct` is unchanged** (S2, N2).
- `src/lib/ocrVisionEngine.test.js` — `recognize` returns `{text, words:[]}` with `callInstructVision` mocked; **fed to the real `runOcr`** → `{pages}` + `meanConfidence 0` (S4).

**e2e — `tests/e2e/past-paper-ocr-vision.spec.js`** (vision provider **mocked**, à la `VITE_AI_MOCK`):
- No key → no "Sharper read" button; free path identical (F2, N1).
- Key set → button appears; first tap → consent dialog → vision text → `nasi` tappable → FSRS add (F1, Q-MOCK).
- Provenance banner shown; blurry note + dotted cue suppressed for vision (F3).
- "Don't ask again" persists across a reload (F4).
- **Go-wild:** cancel mid-vision-read, quota-error → auto-switch toast, provider returns garbage/empty → graceful (never crash/hang), theme-swap mid-read, offline tap → friendly error (no consent if it can't run), rapid free→sharper→replace.

**Manual harness:** `scripts/ocr-accuracy-harness.mjs` (Q-VIS) + eyeball light/dark on a real phone with a free Gemini key.

---

## 9. Privacy / cost / disclosure (load-bearing)

- **Privacy.** The free Tesseract path is **byte-identical** and posts **no** image. The vision rung uploads **one rasterised image per page** to the **user's own provider** on **their own key**, over TLS, **only after explicit consent**, and **never persists or syncs** the image (text only — same no-image-in-blob posture as Phase 1). Keys stay in per-provider localStorage, never the store/cloud blob.
- **Cost.** **$0 for the student on the free tier** — Gemini's free tier *includes* vision (1,500 req/day; ~258 tokens/image input). Paid Flash is **<$0.001/image**. OpenRouter free vision models are $0 (rate-limited ~200/day). **The deployment owner pays nothing** (BYOK) — fully honours no-paywall + no-backend-spend.
- **Disclosure.** Three honest touchpoints: the **button label** ("Sharper read — uploads to {provider}"), the **one-time consent dialog** (what's sent, where, that the free path doesn't upload), and the **provenance banner** on the result. Settings notes which providers power "Sharper read."

---

## 10. Risks & mitigations
- **R1 (resolved-target).** The whole point: vision lifts messy-photo/handwriting accuracy. Q-VIS makes the lift *measured*, not assumed.
- **R2 — A vision call routes to a blind text model and hallucinates.** Mitigated by the explicit `supportsVision` capability (D1) — the router never sends an image to a non-vision adapter.
- **R3 — Free-tier rate limits hit mid-session.** The shipped cooldown/auto-switch handles it (Gemini→OpenRouter); a friendly toast, free Tesseract read still present.
- **R4 — Privacy perception ("the app uploads my photos").** Default-off, manual, consented, disclosed three ways; the free path's "never uploaded" promise is untouched.
- **R5 — Gemini camelCase `inlineData` rejected by the native endpoint.** Low (the adapter already uses camelCase there); D8 fallback to snake_case is a one-line change.
- **R6 — OpenRouter free vision slugs rotate / disappear.** Live discovery + cached fallback list (D4), same as the text path.
- **R7 — Large image body / base64 cost on mobile.** Downscale to a sane max edge (e.g. ≤1600px) before encoding — also lowers tokens/cost; canvas already in hand for scanned PDFs.

---

## 11. Phase 3 preview (framed, NOT designed here)
- **Table/column structure** reconstruction (vision → markdown tables) for worksheet layouts.
- **Inline correction editor** (editable transcript) — the natural follow-on to tap-to-check.
- **Answer-key extraction / auto-grade** from a marked script (separate epic).
- **"Always sharper for photos"** explicit opt-in pref + an optional **side-by-side free-vs-sharper** compare.
- **Ollama / local vision** for offline power users.

---

## 12. Sources (graded in §5)
- **Request shapes (context7):** `/websites/ai_google_dev_gemini-api` (generateContent inline image `inlineData{mimeType,data}`, 258 tokens/image, 768² tiling, 3,600-image limit); `/websites/openrouter_ai` (chat/completions `ImageContentPart` `image_url{url,detail}`, base64 data-URL, text-before-image guidance, vision/free-model collections).
- **Gemini free tier includes vision (2026):** Google AI rate-limits + pricing docs; pecollective / tokenmix / aifreeapi free-tier guides (Flash + Flash-Lite free, all modalities, 1,500 req/day) — *High* on the modality fact, *grain-of-salt* on exact numbers (region/account-dependent).
- **Vision OCR accuracy on messy/handwriting (practitioner, grain-of-salt):** Businessware handwritten-form benchmark (Gemini 2.5 Flash-Lite "clearly outperformed"; ~84% clean / ~70% messy handwriting), Suparse handwriting-OCR 2026, AIMultiple OCR benchmark, Reducto VLM-OCR (Gemini Flash vs Mistral), Roboflow GPT-4o-mini vs Gemini-2.5-Flash vision compare, LinkedIn/Tyler-Maran "Llama 4 beats GPT/Gemini OCR."
- **OpenRouter free vision models (2026):** OpenRouter free-models + vision-models collections, costgoat/buldrr free-model lists (Gemma 4, Llama 4 Maverick, Qwen-VL, Llama-3.2-Vision; ~20 RPM / ~200 day).
- **Browser-CORS already solved:** live code — the shipped text adapters call the same endpoints client-side (`src/lib/instructProviders/gemini.js`, `src/lib/openrouter.js`).
