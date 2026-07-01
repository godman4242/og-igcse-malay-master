# src/lib/ — map & local rules for the logic layer

Folder-local supplement to the root `CLAUDE.md`. Auto-loaded when you edit under `src/lib/`. ~90 `.js` modules + subfolders `guide/`, `study/`, `translate/providers/`, `instructProviders/`. This is a **navigable map, not a per-file catalog** — find the right module by domain, then read it.

## The dominant pattern: pure module + thin impure "engine"
Most side-effecting features split into a **pure orchestrator** (no DOM / no network / no WASM — takes the effect as an **injected** function, fully unit-testable) and a **`*Engine.js` sibling** that is the *only* impure part and is **only ever dynamic-imported** (kept out of the eager bundle). Preserve this split when adding features. Verified pairs:
- `ocr.js` (pure) / `ocrEngine.js` (impure Tesseract WASM)
- `transcribe.js` / `transcribeEngine.js` (impure transformers.js Whisper)
- `ocrVision.js` / `ocrVisionEngine.js` (impure BYOK vision call)
- `guide/dragDock.js` (pure geometry) / `guide/guideController.js` (impure DOM glue)
- `gestureModel.js` (pure `classifyGesture`) / `useSelectionMode.js` (impure pointer hook)

## Single-source-of-truth modules — don't fork these
Each is deliberately THE one place its logic lives. Import it; don't re-implement:
| Module | SSOT for | Entry |
|---|---|---|
| `examReadiness.js` | exam composite readiness % | `composeReadiness` / `READINESS_WEIGHTS` |
| `glossPlan.js` | gloss direction from studyLang | `glossPlanFor(studyLang)` |
| `langLocale.js` | TTS/STT locale (`ms-MY`/`en-GB`) | `localeFor(lang)` — never hardcode a locale |
| `cardLang.js` | card language partition | `cardLang`, `cardsForLang`, `LANGS` |
| `gestureModel.js` | mouse-gesture meaning | `classifyGesture` |
| `readerView.js` / `dragDock.js` | which reader view is safe / dock zone | view guard / snap fns |
| `topicLabels.js` / `whyReason.js` | mistake-category labels / For-You "why" copy | `categoryLabel` / builder |
| `practiceSurfaces.js` | what the practice hub shows | `PRACTICE_GROUPS` |
| `aiText.js` / `instruct.js` | text-AI backend router / BYOK generative availability | routers |
| `writingFormats.js` | IGCSE format catalogue | `FORMATS` |
| `malayValidity.js` | Tier-2 Malay word validity (NOT translation correctness) | validity check |

## "Never edit X for Y" landmines
- **Keyboard work goes in `readerKeymap.js`** (pure key→action dispatcher that wraps the existing mode-aware fns). Do **not** add keyboard handling to `useSelectionMode.js` / `gestureModel.js` — those are the *pointer* path (the gesture logic once shipped inverted precisely because it lived inline in the DOM hook with no test).
- **SECURITY BAR: instruct provider adapters must not import the store.** `instructProviders/{openrouter,ollama,gemini}.js` keep BYOK keys in their own localStorage slot, never the Zustand store (so keys can't reach the cloud blob).
- **Gemini BYOK: native endpoint only** — the `/v1beta/openai/…` compatibility endpoint CORS-fails client-side; the key never goes in the URL and never touches our proxy.
- **`patterns.js` is imported by the eager Dashboard** → it must NOT import `speakingGrader`/`gemini` (bundle-weight coupling).
- **Env key ≠ user key (F3 invariant):** `VITE_OPENROUTER_KEY` must never make `hasKey()` true (no-paywall ≠ spend the owner's key). The *server fallback* in `aiText.js` is different — it's contractually there so keyless users never dead-end.

## Fragility / pinned-dependency gotchas
- **`transcribeEngine.js` — `@huggingface/transformers` is PINNED to v3 (^3.8.1). DO NOT upgrade to v4.** v4's nightly onnxruntime-web deadlocks `pipeline()` in-browser (hangs at 100%, no error; works in Node so tests lie). Re-verify in a real browser before any bump.
- OCR/ASR WASM assets are **self-hosted** under `public/ocr` + `public/asr` (copied by `scripts/copy-*-assets.mjs` in `prebuild`) — offline, no CDN.
- `openrouter.js` free model slugs get retired en masse (404s every AI feature) → it discovers at runtime and degrades to a known-good list. **Never hardcode a model slug.**

## Domain map (where to look)
1. **FSRS / scheduling / study-session** — `fsrs.js`, `interleave.js`, `studyMix.js`, `skillBalance.js`, `mistakeDrill.js`, `dailyPlan.js`; `study/` (`interleavedQueue.js`, `quizOptions.js`, `sessionResult.js`).
2. **Reader / PDF / selection / gestures** — `pdf.js`, `pdfLayout.js`, `readerView.js`, `readerKeymap.js`, `gestureModel.js`, `useSelectionMode.js`, `selection*.js`, `paragraphModel.js`, `sentenceModel.js`, `*RevealState.js`, `docGlossState.js`, `wbwChips.js`.
3. **OCR + audio multimodal** — `ocr*.js`, `transcribe*.js`, `audioRecorder.js`, `dictation.js`, `clozeListening.js`, `listeningMistakes.js`.
4. **Translation** — `translate.js`, `translateDocument.js`, `translationCache.js`, `simplifyModel.js`; `translate/providers/` (`gtx.js`, `google.js`, `deepl.js`, `instructTranslate.js`).
5. **AI / instruct providers** — `ai.js`, `aiText.js`, `gemini.js`, `openrouter.js`, `instruct.js`, `cikguBot.js`, `scenarioGenerator.js`, `deckGenerator.js`; `instructProviders/`.
6. **English-mode / bilingual** — `cardLang.js`, `langLocale.js`, `glossPlan.js`, `forYouLangScope.js`, `enDictionary.js`, `english*.js`, `reverseDictionary.js`, `unknownDensity.js`.
7. **Grounding / dictionary accuracy** — `dictionaryGrounding.js` (Tier 1), `malayValidity.js` (Tier 2), `wholeWordMatch.js`, `blankWord.js`, `clozeBuilder.js`.
8. **Writing grading** — `writingGrader.js`, `writingErrors.js`, `writingErrorsMalay.js`, `writingFormats.js`, `writingGradePrompt.js`, `writingFeedbackV2Parser.js`, `writingMistakeHarvest.js`, `patterns.js`, `diff.js`.
9. **Speaking / TTS-STT** — `speech.js`, `speakingGrader.js`, `speakingCoach.js`, `speakTarget.js`, `pronunciation.js`.
10. **Sync / persistence / telemetry** — `cloudSync.js`, `syncEngine.js`, `syncStatus.js`, `telemetry.js`, `export.js`, `importBackup.js`.
11. **For-You / readiness / progress** — `forYouShelves.js`, `whyReason.js`, `topicLabels.js`, `examReadiness.js`, `examPassages.js`, `competenceSnapshot.js`, `learnerProfile.js`, `weakSpotSeed.js`, `practiceSurfaces.js`.
- **Guide / tour** (`guide/`) — `guideController.js` (route-aware, everything injected), `dragDock.js`, `tourSteps.js`, `pageGuides.js`, `waitForElement.js`.

## Purity rule for this layer
Pure + deterministic. **Do not call `Date.now()` / `Math.random()` in render or module scope** (React 19 purity) — inject `now` and use a seeded PRNG (`study/quizOptions.js` `seededRandom` is the sanctioned pattern). Modules that state this explicitly: `clozeListening.js`, `dictation.js`, `dailyPlan.js`, `forYouShelves.js`, `fsrs.js`. Cross-cutting rule inlined in `interleave.js`: **Malay & English decks never mix in one session** (grammar/imbuhan drills are Malay-only).

## Testing lib
Colocated `__tests__/` per folder (~100 files in `src/lib/__tests__/` + subfolder test dirs). Vitest, configured in `vite.config.js`.
```bash
npm run test:run                                       # full unit suite
npx vitest run src/lib/__tests__/examReadiness.test.js # single file
```
