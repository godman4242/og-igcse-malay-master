# Past-paper OCR Phase 2 — BYOK-vision quality rung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** add an **optional, opt-in BYOK-vision "Sharper read"** that gives a much better transcription of messy phone photos / handwriting / tables, **reusing** Phase 1's `runOcr` orchestration and the shipped instruct router — resolving Phase 1 risk R1. The free on-device Tesseract path stays the **default, byte-identical, zero-key** path.

**Architecture (additive, nothing rewritten):**
1. **Seam (`src/lib/instruct.js`):** a parallel `callInstructVision({systemPrompt, messages, images, maxTokens?, signal?})` that routes **only to `supportsVision` adapters** — `callInstruct` is byte-identical.
2. **Adapters:** Gemini (primary, native `inlineData`, free-tier vision) + OpenRouter (secondary, `image_url`, live vision-model discovery) gain additive `supportsVision`/`callVision`. Ollama excluded.
3. **OCR producer:** `createVisionRecognizer()` satisfies the **same injected `recognize` contract `runOcr` already takes** (`(image)=>{text,words}`), so progress/abort/`{pages}` are reused unchanged.
4. **PDFReader:** retain the source image, a recognizer switch, a manual "Sharper read" button (consent-gated), a provenance banner.

**Spec:** `docs/superpowers/specs/2026-06-11-past-paper-ocr-vision-rung-design.md` (read it for WHY / forks / decision log / acceptance F1–F4, S1–S4, Q-VIS, N1–N7, and **the flagged fork Q4**).

**Verified anchors (live source, 2026-06-11):** `callInstruct` (`instruct.js:125`), `orderedAdapters`/cooldown (`instruct.js:64`), `__resetInstructRouter` (`instruct.js:159`); `buildGeminiRequest` (`gemini.js:62`), native endpoint + `x-goog-api-key` (`gemini.js:170`), `geminiAdapter` (`gemini.js:219`); `pickFreeModels` (`openrouter.js:69`), `getFreeModels` (`openrouter.js:103`), `callOpenRouter` (`openrouter.js:217`), openrouter adapter 429→`quota` (`instructProviders/openrouter.js:22`); `runOcr` injected `recognize` (`ocr.js:73`), `createOcrRecognizer` (`ocrEngine.js:29`); `runImageOcr` (`PDFReader.jsx:268`), blurry note (`PDFReader.jsx:1178`), dotted cue (`PDFReader.jsx:1449`), `switchView` gate (`PDFReader.jsx:159`); `STORE_VERSION = 29` (`useStore.js:36`), `setOcrLang` (`useStore.js:756`), v29 migration (`useStore.js:2071`). Tests live in `src/lib/__tests__/` + `src/lib/instructProviders/__tests__/`; e2e mock via `page.route(...)` + `page.addInitScript(...)` (pattern in `tests/e2e/option-f-simplify.spec.js:48`).

> **⚠️ BEFORE STARTING:** get Kheshav's sign-off on **spec §6 Q4** (consent UX default 4A). It's the one product-shaped fork.

---

## File structure (decomposition locked here)

- **Create** `src/lib/ocrVision.js` — pure: `VISION_SYSTEM_PROMPT`, `buildVisionMessages({lang})`, `cleanVisionText(s)`.
- **Create** `src/lib/ocrVision.test.js`.
- **Modify** `src/lib/instructProviders/gemini.js` — pure `buildGeminiVisionRequest`, `callGeminiVisionByok`, adapter `supportsVision:true` + `callVision`.
- **Modify** `src/lib/instructProviders/__tests__/gemini.test.js` — vision-request shape.
- **Modify** `src/lib/openrouter.js` — pure `pickVisionModels`, `getVisionModels`, `buildVisionContent`, `callOpenRouterVision`.
- **Modify** `src/lib/instructProviders/openrouter.js` (adapter) — `supportsVision:true` + `callVision` (429→`quota`).
- **Modify** `src/lib/instructProviders/__tests__/openrouter.test.js` + `src/lib/__tests__/openrouterModels.test.js` — `pickVisionModels`.
- **Modify** `src/lib/instruct.js` — `callInstructVision`, `hasVisionProvider`, `getConfiguredVisionProviders`; factor the call-ordering loop into a shared internal helper. **`callInstruct` byte-identical.**
- **Modify** `src/lib/__tests__/instruct.test.js` — vision routing + a guard that `callInstruct` is unchanged.
- **Create** `src/lib/ocrVisionEngine.js` — lazy `createVisionRecognizer` + `imageToInlineData` (DOM).
- **Create** `src/lib/ocrVisionEngine.test.js` — `recognize`→`{text,words:[]}`→ real `runOcr` →`{pages}`.
- **Modify** `src/store/useStore.js` — `pdfReader.visionConsent` + STORE_VERSION 29→30 migration.
- **Modify** `src/pages/PDFReader.jsx` — retain source; recognizer switch; "Sharper read" button; consent dialog; provenance banner; suppress Tesseract cues for vision.
- **Create** `tests/e2e/past-paper-ocr-vision.spec.js` — mocked-provider happy path, no-key, provenance, consent persistence, go-wild.
- **Create** `scripts/ocr-accuracy-harness.mjs` — manual Q-VIS Tesseract-vs-vision WER harness.
- **Modify** `RESUME_HERE.md` + `CLAUDE.md` — feature note (final commit).

**Build order:** 1 pure prompt → 2 Gemini vision → 3 OpenRouter vision → 4 seam `callInstructVision` → 5 lazy vision recognizer (proves `{pages}` via real `runOcr`) → 6 store consent pref → 7 PDFReader wiring + e2e (mocked) → 8 go-wild + harness + docs/verify/deploy.

---

## Task 1: Pure vision prompt + message builder (`src/lib/ocrVision.js`)

- [ ] **Step 1: Failing tests** (`src/lib/ocrVision.test.js`)
```js
import { describe, it, expect } from 'vitest'
import { buildVisionMessages, cleanVisionText, VISION_SYSTEM_PROMPT } from './ocrVision'

describe('buildVisionMessages', () => {
  it('returns a single user message whose text asks for verbatim transcription', () => {
    const { systemPrompt, messages } = buildVisionMessages({ lang: 'ms' })
    expect(systemPrompt).toBe(VISION_SYSTEM_PROMPT)
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content.toLowerCase()).toMatch(/verbatim|transcribe/)
  })
  it('adds a Malay/English language hint from lang', () => {
    expect(buildVisionMessages({ lang: 'ms' }).messages[0].content).toMatch(/Malay/i)
    expect(buildVisionMessages({ lang: 'en' }).messages[0].content).toMatch(/English/i)
  })
})

describe('cleanVisionText', () => {
  it('strips wrapping markdown code fences but keeps inner text', () => {
    expect(cleanVisionText('```\nSaya suka.\n```')).toBe('Saya suka.')
  })
  it('non-string → empty string', () => {
    expect(cleanVisionText(null)).toBe('')
  })
})
```
- [ ] **Step 2:** `npm run test:run -- src/lib/ocrVision.test.js` → FAIL (unresolved import).
- [ ] **Step 3: Implement** — `VISION_SYSTEM_PROMPT` (terse transcriber persona), `buildVisionMessages({lang})` returning `{systemPrompt, messages:[{role:'user', content}]}` with the verbatim instruction + a one-line "The page is in Malay/English." hint, `cleanVisionText` (strip ``` fences, trim).
- [ ] **Step 4:** test passes.
- [ ] **Step 5: Commit** — `feat(ocr-vision): pure transcription prompt + message builder (Task 1)`

---

## Task 2: Gemini vision adapter (`src/lib/instructProviders/gemini.js`)

> Reuses the **native endpoint already proven CORS-safe** (`gemini.js:170`). Pure builder verified vs context7 (`/websites/ai_google_dev_gemini-api`): `parts:[{inlineData:{mimeType,data}}, {text}]` — camelCase (the file already posts camelCase `generationConfig`/`maxOutputTokens` here, so proto-JSON camelCase is confirmed-working).

- [ ] **Step 1: Failing tests** (extend `src/lib/instructProviders/__tests__/gemini.test.js`)
```js
import { buildGeminiVisionRequest } from '../gemini'

describe('buildGeminiVisionRequest', () => {
  it('appends an inlineData image part plus the text part to one user content', () => {
    const body = buildGeminiVisionRequest({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'transcribe' }],
      images: [{ mimeType: 'image/png', data: 'BASE64' }],
    })
    const parts = body.contents[0].parts
    expect(parts).toEqual(expect.arrayContaining([
      { inlineData: { mimeType: 'image/png', data: 'BASE64' } },
      { text: 'transcribe' },
    ]))
    expect(body.systemInstruction.parts[0].text).toBe('sys')
  })
})
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implement**
  - `buildGeminiVisionRequest({systemPrompt, messages, images, maxTokens})` — start from `buildGeminiRequest`, then push `{inlineData:{mimeType,data}}` parts into the **last user** content (image parts first, then text, per Google's ordering tolerance).
  - `callGeminiVisionByok({systemPrompt, messages, images, maxTokens, signal})` — clone of `callGeminiByok` (`gemini.js:161`) but using `buildGeminiVisionRequest`; same `x-goog-api-key` header, same 429→`quota`/http/empty typed errors, AbortError raw.
  - Extend `geminiAdapter` (`gemini.js:219`): `supportsVision: true`, `callVision: callGeminiVisionByok`.
- [ ] **Step 4:** tests pass.
- [ ] **Step 5: Commit** — `feat(ocr-vision): Gemini inlineData vision adapter capability (Task 2)`

---

## Task 3: OpenRouter vision (`src/lib/openrouter.js` + adapter)

> Verified vs context7 (`/websites/openrouter_ai`): `content:[{type:'text',text},{type:'image_url',image_url:{url:'data:...;base64,...'}}]`, **text before image**. Vision models discovered live via `architecture.input_modalities ⊇ 'image'` (never hardcoded — the "slugs rotate" lesson).

- [ ] **Step 1: Failing tests** (`src/lib/__tests__/openrouterModels.test.js` + adapter `__tests__/openrouter.test.js`)
```js
import { pickVisionModels, buildVisionContent } from '../openrouter'

describe('pickVisionModels', () => {
  it('keeps only image-input free models, dedupes, caps, never throws', () => {
    const json = { data: [
      { id: 'a/text:free', pricing: { prompt: '0', completion: '0' }, architecture: { input_modalities: ['text'] } },
      { id: 'b/vision:free', pricing: { prompt: '0', completion: '0' }, architecture: { input_modalities: ['text','image'] } },
    ] }
    expect(pickVisionModels(json)).toEqual(['b/vision:free'])
    expect(pickVisionModels(null)).toEqual([])
  })
})

describe('buildVisionContent', () => {
  it('emits a text part before an image_url data-URL part', () => {
    const content = buildVisionContent('transcribe', [{ mimeType: 'image/jpeg', data: 'B64' }])
    expect(content[0]).toEqual({ type: 'text', text: 'transcribe' })
    expect(content[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,B64' } })
  })
})
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implement**
  - `pickVisionModels(json, {limit})` — mirror `pickFreeModels` (`openrouter.js:69`) but filter to free **vision** models (`architecture.input_modalities` includes `'image'`); reuse EXCLUDE patterns; never throw.
  - `getVisionModels({signal, now})` — cache (own key `igcse-openrouter-vision-models`) + live `/models` fetch + a `FALLBACK_VISION_MODELS` backstop (e.g. `google/gemma-4-26b-a4b:free`, `meta-llama/llama-4-maverick:free`, `qwen/qwen2.5-vl-72b-instruct:free` — verify live at impl).
  - `buildVisionContent(text, images)` — the content array above.
  - `callOpenRouterVision({systemPrompt, messages, images, maxTokens, signal})` — clone `callOpenRouter` (`openrouter.js:217`) but model list = `getVisionModels`, and the user message `content` = `buildVisionContent`.
  - Adapter (`instructProviders/openrouter.js`): add `supportsVision: true`, `callVision` wrapping `callOpenRouterVision` with the **same** 429→`quota` mapping (`:22`).
- [ ] **Step 4:** tests pass.
- [ ] **Step 5: Commit** — `feat(ocr-vision): OpenRouter image_url vision discovery + adapter (Task 3)`

---

## Task 4: Seam — `callInstructVision` (`src/lib/instruct.js`, additive)

> **`callInstruct` MUST stay byte-identical.** Factor the adapter-iteration loop into a shared internal `runOnAdapters(list, args, {now})` and have BOTH `callInstruct` and `callInstructVision` use it — verify the refactor leaves `callInstruct` behaviour unchanged (its tests stay green).

- [ ] **Step 1: Failing tests** (extend `src/lib/__tests__/instruct.test.js`; reuse `__resetInstructRouter`)
```js
import { callInstructVision, hasVisionProvider } from '../instruct'
// (mock the adapters / their hasKey+callVision as the existing instruct tests mock call)

it('throws no_vision_provider when no vision-capable adapter is configured', async () => {
  // no keys set
  await expect(callInstructVision({ systemPrompt: 's', messages: [], images: [] }))
    .rejects.toMatchObject({ cause: 'no_vision_provider' })
})

it('routes to a vision adapter and auto-switches on quota', async () => {
  // adapter A supportsVision, callVision throws cause:'quota'; adapter B supportsVision, callVision resolves 'TEXT'
  // assert result === 'TEXT' and a switch event fired (subscribeInstructSwitch)
})

it('callInstruct is unchanged: a text-only provider still serves callInstruct', async () => {
  // guard: a non-vision adapter still routes via callInstruct exactly as before
})
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implement** — `hasVisionProvider()` (any configured `supportsVision`), `getConfiguredVisionProviders()`, `callInstructVision(args, {now})` ordering only `supportsVision` adapters and invoking `adapter.callVision(args)`; `no_vision_provider` throw when none; reuse `isCooling`/`noteFailure`/`emitSwitch`. **Do not touch** `callInstruct`'s signature/semantics.
- [ ] **Step 4:** full `instruct` suite green (old + new).
- [ ] **Step 5: Commit** — `feat(ocr-vision): callInstructVision seam (vision-only routing, frozen callInstruct) (Task 4)`

---

## Task 5: Lazy vision recognizer (`src/lib/ocrVisionEngine.js`)

> The payoff: this recognizer satisfies `runOcr`'s **existing** injected contract, so it's validated by feeding the **real** `runOcr` (`ocr.js:73`).

- [ ] **Step 1: Failing test** (`src/lib/ocrVisionEngine.test.js`)
```js
import { describe, it, expect, vi } from 'vitest'
import { runOcr } from './ocr'

it('vision recognizer output flows through the REAL runOcr into the {pages} shape', async () => {
  // inject a fake recognize that mimics createVisionRecognizer's return
  const recognize = async () => ({ text: 'Saya suka.\n\nNasi lemak.', words: [] })
  const { pages, meanConfidence, lowConfidenceWords } = await runOcr(['img'], { recognize })
  expect(pages).toEqual([{ pageNum: 1, text: 'Saya suka.\n\nNasi lemak.', paragraphs: ['Saya suka.', 'Nasi lemak.'] }])
  expect(meanConfidence).toBe(0)          // no per-word confidence → suppress blurry note
  expect(lowConfidenceWords.size).toBe(0) // → suppress dotted cue
})
```
- [ ] **Step 2:** FAIL (until the engine helper exists; the runOcr-contract assertion itself passes — it documents the contract).
- [ ] **Step 3: Implement**
  - `imageToInlineData(image)` (DOM): a `File` → `FileReader` base64 + `file.type`; a `canvas` → `canvas.toDataURL('image/jpeg', q)` split to `{mimeType,data}`; **downscale to ≤1600px max edge** before encoding (R7 — cheaper tokens).
  - `createVisionRecognizer({ lang, signal })` → `{ async recognize(image) { const inline = await imageToInlineData(image); const { systemPrompt, messages } = buildVisionMessages({ lang }); const text = await callInstructVision({ systemPrompt, messages, images:[inline], signal }); return { text: cleanVisionText(text), words: [] } } }`. No `terminate` (no worker).
  - Dynamically imported only inside `runImageOcr` (lazy).
- [ ] **Step 4:** test green.
- [ ] **Step 5: Commit** — `feat(ocr-vision): lazy vision recognizer (runOcr-contract drop-in) (Task 5)`

---

## Task 6: Consent pref in the store + STORE_VERSION 29→30

> Mirrors the v28/v29 `pdfReader` migrations (`useStore.js:2062/2071`).

- [ ] **Step 1:** add `visionConsent: false` to the initial `pdfReader` object (~`useStore.js:192`); a setter `setVisionConsent: (on) => set(state => ({ pdfReader: { ...state.pdfReader, visionConsent: !!on } }))` next to `setOcrLang` (`:756`); bump `STORE_VERSION = 29` → `30` (`:36`) + comment; add a v30 migration block mirroring v29:
```js
if (version < 30) {
  state = { ...state, pdfReader: { visionConsent: false, ...(state.pdfReader || {}) } }
}
```
- [ ] **Step 2:** `npm run test:run` → green; reload keeps the flag (manual); STORE_VERSION reads 30.
- [ ] **Step 3: Commit** — `feat(ocr-vision): persisted Sharper-read consent pref, STORE_VERSION 29→30 (Task 6)`

---

## Task 7: PDFReader wiring + e2e (mocked provider)

**Files:** `src/pages/PDFReader.jsx`, `tests/e2e/past-paper-ocr-vision.spec.js`

- [ ] **Step 1: Failing happy-path e2e** (mock Gemini; set the BYOK key via `addInitScript`)
```js
import { test, expect } from '@playwright/test'
import { join } from 'node:path'
const fx = (n) => join(process.cwd(), 'tests', 'e2e', 'fixtures', n)

function mockGeminiVision(page, { text = 'Nasi lemak sedap.' } = {}) {
  page.route('https://generativelanguage.googleapis.com/**', async (r) => {
    const url = r.request().url()
    if (url.includes(':generateContent')) {
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({
        candidates: [{ content: { parts: [{ text }] } }] }) })
    }
    // ListModels
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({
      models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] }) })
  })
}

test('Sharper read: key → consent → vision text, tappable (F1)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('igcse-gemini-key', 'TEST'))
  mockGeminiVision(page, { text: 'Nasi lemak sedap.' })
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })       // free Tesseract read first
  await page.getByRole('button', { name: /Sharper read/i }).click()
  await page.getByRole('button', { name: /Continue/i }).click()                // consent (first time)
  await expect(page.getByText(/Sharper read by/i)).toBeVisible({ timeout: 30_000 }) // provenance banner
  await expect(page.getByText(/sedap/i)).toBeVisible()
})

test('no key → no Sharper read button (N1, F2)', async ({ page }) => {
  await page.goto('/pdf-reader')
  await page.setInputFiles('input[type=file]', fx('ocr-clean-malay.png'))
  await expect(page.getByText(/nasi/i)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: /Sharper read/i })).toHaveCount(0)
})
```
- [ ] **Step 2:** FAIL (no button / no vision path yet).
- [ ] **Step 3: Implement the wiring** (surgical, read the file first)
  - **Retain source:** in `runImageOcr` (`:268`) store `{ images, fromPdf, name }` in a `lastOcrSourceRef`; add `engine = 'tesseract'` param. When `engine==='vision'`, `await import('../lib/ocrVisionEngine')` and `createVisionRecognizer({ lang })` instead of `createOcrRecognizer`; set `source` state (`'tesseract'|'vision'`) + `visionProvider` label. For vision: after `runOcr`, **force** `setLowConfTokens(new Set())` and leave `ocrConfidence` null (suppress Tesseract cues).
  - **Sharper-read button** (in the toolbar / under the reader, visible when `hasVisionProvider()` && a doc loaded from image/scanned source): `onClick` → if `!visionConsent` open the consent dialog, else `runSharperRead()`. `runSharperRead()` = `runImageOcr(lastOcrSourceRef.current.images, { engine:'vision', fromPdf, name })`.
  - **Consent dialog** (Fork 4A): copy from spec §3 Fork 4; `[Continue]` → `setVisionConsent(true if "don't ask again")` + `runSharperRead()`; `[Not now]` closes. `aria` + light/dark.
  - **Provenance banner** (when `source==='vision'`): *"Sharper read by {visionProvider} — still a draft. Tap any word to check."* Gate the existing blurry note (`:1178`) on `source!=='vision'`.
  - `hasVisionProvider` imported from `instruct.js` (sync, module-read — NOT a Zustand selector).
- [ ] **Step 4:** happy-path + no-key e2e green.
- [ ] **Step 5:** `npm run build && npm run lint` — eager `index` unchanged; new `ocrVision*` chunks lazy; 0 lint errors (no new exhaustive-deps).
- [ ] **Step 6: Commit** — `feat(ocr-vision): Sharper-read button, consent, provenance banner (Task 7)`

---

## Task 8: Go-wild e2e + accuracy harness + docs/verify/deploy

- [ ] **Step 1: Go-wild e2e** (append to `past-paper-ocr-vision.spec.js`)
  - "Don't ask again" persists across reload (F4).
  - Provider 429 → auto-switch toast (mock Gemini 429 + an OpenRouter vision 200) ; or graceful error if only one provider.
  - Provider returns empty/garbage → friendly error, free read still on screen (never crash/`Maximum update depth`).
  - Cancel mid-vision-read → back to the free read cleanly.
  - Theme-swap mid-read; offline tap → friendly error.
- [ ] **Step 2: Accuracy harness** `scripts/ocr-accuracy-harness.mjs` (Q-VIS, manual) — given a folder of `{image, ground-truth.txt}` pairs and a `GEMINI_KEY` env, run Tesseract (Phase-1 path) **and** the vision path, print per-engine word-accuracy (1−WER). Document: "run once with a free Gemini key; record numbers in RESUME_HERE." **Not** a CI gate (D12).
- [ ] **Step 3: Full gate** — `npm run build && npm run test:run && npm run lint && npm run test:e2e`. Record the new lazy `ocrVision`/`ocrVisionEngine` chunk sizes; confirm eager `index` unchanged; Phase-1 OCR e2e + instruct-router suites stay green (N2).
- [ ] **Step 4: Eyeball** light+dark, 390×844: Sharper-read button, consent dialog, provenance banner, auto-switch toast.
- [ ] **Step 5: Docs** — `CLAUDE.md` (extend the "Past-paper OCR" section with the vision rung + the seam note "`callInstructVision` routes vision-only; `createVisionRecognizer` is a second `runOcr` producer — `callInstruct` frozen"); `RESUME_HERE.md` SHIPPED block (STORE_VERSION 30, lazy chunk sizes, Q-VIS numbers, Phase-3 follow-ups).
- [ ] **Step 6: Commit** (gate auto-runs) + confirm PUBLIC Vercel READY (upg-) per `[[project_two_vercel_projects]]`.
  - `docs(ocr-vision): BYOK-vision Sharper read shipped — harness, notes, handoff (Task 8)`

---

## Self-review (plan ↔ spec)

**Spec coverage:** Fork 1B → Task 4; Fork 1b (runOcr producer) → Task 5; Fork 2 (Gemini/OpenRouter, Ollama excluded) → Tasks 2/3; Fork 3 (manual button) → Task 7; **Fork 4 (consent) → Task 6+7 (flagged Q4 — get sign-off first)**; Fork 5 (provenance, suppress cues) → Tasks 5+7. Acceptance: F1→T7, F2→T7, F3→T7, F4→T8, S1→T2/T3, S2→T4, S3→T3, S4→T5, Q-VIS→T8 harness, Q-MOCK→T7, N1→T7, N2→T4 guard + T8 suites, N3→key-security (no `useStore` import — grep at T2/T3), N4→T7 (free path posts no image), N5→T7/T8, N6→T7, N7→diff check at T8.

**Type consistency:** `callInstructVision(args)→Promise<string>` (T4) consumed by `createVisionRecognizer` (T5) → `{text, words:[]}` == `runOcr`'s injected contract (T5, verified vs `ocr.js:73`). `buildGeminiVisionRequest`→`contents[].parts[{inlineData},{text}]` (T2, context7-verified). `buildVisionContent`→`[{type:'text'},{type:'image_url'}]` (T3, context7-verified). `source:'vision'` suppresses the `ocrConfidence<70` note + `lowConfTokens` cue (T7) because vision `meanConfidence===0`/empty set (T5). Consistent.

**Placeholder scan:** two "verify live at impl" items — the `FALLBACK_VISION_MODELS` slugs (T3, discovered-live anyway) and the camelCase-`inlineData` acceptance (T2, spec D8 fallback to snake_case is one line). Both are explicit decisions with defaults, not blanks. The fixtures reuse Phase 1's `ocr-clean-malay.png`; the harness's messy/handwriting fixtures are the one new asset Kheshav supplies (or the implementer generates a degraded variant).

**Blocking gate:** spec §6 Q4 (consent UX) needs Kheshav's sign-off before Task 6/7.
