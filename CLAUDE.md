# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IGCSE Malay Master** ("ooga da boogadamalay") — a React SPA for IGCSE Malay AND English language learning (0546 / 0500 / 0510). Features: FSRS-6 spaced repetition, 6 study modes, AI roleplay with scoring (bilingual), expert-system grammar tutor (Cikgu Maya), reading comprehension, IGCSE Paper 4 listening practice, interactive bilingual grammar drills, writing analysis (21 IGCSE formats with band-6 exemplars), pronunciation practice via Web Speech API, word family explorer, universal mistake journal with auto-promotion to FSRS cards, exam countdown planner, a 30-min spaced exam rehearsal mode with composite Readiness %, and **past-paper photo/scan study via free on-device OCR** (Tesseract.js — photograph a printed page and study it in the same reveal-gated reader; an optional consent-gated BYOK-vision "Sharper read" re-reads messy photos/handwriting on the user's own AI key). The reflow reader is fully **keyboard/switch-operable** (roving tabindex + pure `readerKeymap.js` dispatcher), every drill announces correct/incorrect via a polite live region (`FeedbackLive`), and header/toolbar/SearchModal targets meet ≥44px (WCAG 2.1.1 / 4.1.3 / 2.5.5 — shipped 2026-06-12, P1-5). All state persists locally via Zustand + localStorage with optional Supabase cloud sync.

## Learning science foundation

This is a learning tool, not a content reader — every feature should serve at least one validated principle. Use this as a design check, not dogma.

| Principle | How it shows up here |
|---|---|
| **Active recall > passive review** | FSRS-6 scheduling; 6 study modes; type-answer, cloze, speaking force production |
| **Test effect / retrieval** | Quiz, cloze, saved-word cloze, roleplay scoring — retrieval beats re-reading |
| **Spaced / distributed practice** | FSRS for vocab AND grammar drills; mistake re-drills; "Still remember these?" idle-card shelf; exam rehearsal on a readiness schedule |
| **Interleaving** | Smart Study mixes vocab/grammar/speaking; topic rotation |
| **Elaborative encoding** | Word families; contextual examples; bidirectional MS↔EN |
| **Immediate, specific feedback** | Cikgu Maya error explanations; mistake journal with categories |
| **Metacognitive calibration** | Confidence log (1–3); "certain but wrong" → hypercorrection priority |
| **Cognitive-load management** | Reveal-gated translation; progressive disclosure; offline-first (no spinner anxiety) |
| **Identity & motivation** | Streaks + freeze (grace + loss aversion); identity/ideal-self prompts |

**Reveal-gated translation (load-bearing for the PDF reader):** default is Malay-only; English is revealed only on a deliberate tap and always machine-marked — a *try-first-then-reveal* comprehension aid (revealing is never "failure"). Reveal-gating is a *desirable difficulty* only when the text is **within reach** (Bjork/Sweller): for a demonstrably too-hard page it **eases**, not blocks, a floundering beginner. **Shipped 2026-06-11** (Claim 6, spec `docs/superpowers/specs/2026-06-11-learning-science-actions-design.md`): `src/lib/unknownDensity.js` measures the unknown-word density of the loaded PDF (known = built-in dictionary **or** grounding-verified; `DENSE_THRESHOLD = 0.4` over `MIN_DENSE_TOKENS = 20` content words); at/above it `PDFReader.jsx` shows a **non-punitive, dismissible** banner offering to reveal the English as you read (Malay still first) — never auto-applied unless the **beginner pref** opts in (`pdfReader.autoHelpDensePages`; Settings → reading; default OFF; STORE_VERSION 28). EN docs never nudge. So don't frame "always-visible translation" as an absolute crutch — the gate is *try first, reveal freely; revealing is not failure*, and it eases on demonstrably too-hard pages. The app's PRIMARY vocab path — L1 (English) **word** glosses → FSRS — is evidence-backed for our beginner IGCSE audience (Kim/Lee/Lee 2024: L1 glosses beat L2 for vocab, strongest for beginners) and stays primary. **Option F** (Malay→simpler-Malay paraphrase, shipped 2026-06-10 behind the BYOK `instruct.js` gate) is an *optional involvement-load aid* (Rassaei & Folse 2024) — strongest for **intermediate+** learners, **NOT a beginner vocab win** (re-framed 2026-06-11). Don't sell the L2 rung as vocab-superior — see `[[project_sentence_reveal_research]]` for the hedged findings before designing on top of it.

## Commands

```bash
npm run dev       # Vite dev server on :5173
npm run build     # Production build → /dist
npm run preview   # Preview production build
npm run lint      # ESLint
npm run test:run  # Vitest unit suite, one-shot (~1030 tests)
npm run test:e2e  # Playwright e2e (chromium, 390x844)
```

**Commits are gated automatically.** `.githooks/pre-commit` runs `build → test:run → lint` and aborts the commit (and the auto-push/prod deploy) on any failure. So "done = green" is enforced — you don't have to remember to run them, but running them locally first gives faster feedback. Emergency bypass: `git commit --no-verify` (use sparingly; it ships unverified to prod). Lint passes with 3 pre-existing exhaustive-deps warnings (0 errors). **Docs-only fast-path:** commits where every staged file is markdown (`*.md`) skip the gate (markdown can't affect build/test/lint — verified no `.md` imports in src/tests).

## Architecture

**Stack:** React 19, React Router v7, Zustand 5 (persisted), Tailwind CSS 4 (via `@tailwindcss/vite` plugin), Vite 8, ts-fsrs (spaced repetition), Supabase 2 (optional cloud sync), Web Speech API.

### State Management

Single Zustand store at `src/store/useStore.js` (STORE_VERSION = 30 — recent bumps: v27 Exam Rehearsal subject toggle, v28 PDF beginner auto-help on dense pages `pdfReader.autoHelpDensePages`, v29 PDF OCR language pref `pdfReader.ocrLang`, v30 Sharper-read upload consent `pdfReader.visionConsent`). Persisted to localStorage under key `igcse-malay-store`. Contains:
- Cards deck with FSRS scheduling fields (`due`, `stability`, `difficulty`, `state`, `lapses`)
- Grammar SRS state (`grammarCards` — keyed by drill ID)
- AI state (`ai.dailyCalls`, `ai.roleplayHistory`, `ai.cikguHistory`)
- Engagement layer (streaks, freezes, XP, daily challenges)
- Metacognitive tracking (`confidenceLog`, `mistakeReasons`, `sessionFeedback`, `reflections`)
- Identity & motivation (`identity.label`, `identity.idealSelf`, `identity.cue`, `lastSessionAt`)
- Offline sync queue (`sync.queue`, `sync.syncStatus`, `sync.networkStatus`) + `lastMutationAt` (cloud-sync tie-break) — see **Cloud sync** below
- **Mistake pipeline (v11)** — `mistakes` array with rich records: `{ id, ts, type, source, language, category, severity, word, given, correct, surface, correction, note, promotedCardId, attempts, reviewed, lastReviewedAt, _k }`. Categories: vocab / imbuhan / tense / spelling / cohesion / register / pronunciation / comprehension / fluency / other. `addMistake` dedupes by content hash within 24h, escalates severity on repeat hits, and auto-promotes vocab/imbuhan mistakes (Malay-language only) to FSRS cards in a 'Mistakes' deck. `promoteMistakeToCard` is also exposed for manual promotion. `getFixUpQueue(limit)` returns the highest-priority unfixed mistakes.
- **Exam rehearsal (v12)** — `examAttempts` array (capped at 50) of `{ id, ts, passageId, lang, comprehensionPct, writingBand, speakingBand, listeningPct?, readinessScore, durationSec }`. The rehearsal runs 4 stages (Comprehension → **Listening (Paper 4)** → Writing → Speaking); the listening stage is **TTS-gated** — skipped when `hasSpeechSynthesis()` is false, in which case `listeningPct` is absent. The composite **readiness scorer lives in ONE place**, `src/lib/examReadiness.js` (`composeReadiness`), shared by `getExamReadiness()` and `ExamRehearsal.finishRehearsal` (no longer duplicated): comp 0.30 / writing 0.35 / speaking 0.35, + listening 0.30 **only when present**, re-normalised over present components — so attempts logged before the listening stage compute **byte-identical** (no STORE_VERSION bump). `getExamReadiness()` returns smoothed readiness %; `getNextExamDue()` returns FSRS-shaped 3-30 day schedule.
- **Speaking history** — bilingual; entries include `{ topicId, band, durationSec, wordCount, transcript, lang }`.

**Critical Zustand pattern**: Store getter functions (`getStreak`, `getStudyPlan`, `getChallengeStats`, `shouldShowInstallPrompt`) return new objects on every call. Never call them inside a Zustand selector — this causes infinite re-render loops:
```jsx
// WRONG — infinite loop:
const streak = useStore(s => s.getStreak())

// CORRECT — extract ref, call in component body:
const getStreak = useStore(s => s.getStreak)
const streak = getStreak()
```

Store migration happens in the `persist.migrate` callback. When bumping `STORE_VERSION`, add a migration case that preserves all existing data and adds new fields with defaults.

### Cloud sync (Supabase, optional)

Two complementary channels, both gated on an authenticated session + `SUPABASE_CONFIG.enabled`:
- **Per-table** (`src/lib/cloudSync.js`): `user_cards`, `writing_history`, `speaking_history`, plus a `sync_events` archive. Driven by an offline-first **event queue** — `enqueueSyncEventAction` appends events (`card_added`, `cards_added`, `card_removed`, `card_reviewed`, `writing_feedback_logged`, `speaking_attempt_logged`, `profile_updated`, …) to `sync.queue` and stamps `lastMutationAt`.
- **State blob** (`user_state` table; `pushStateBlob`/`pullStateBlob` in `src/config/supabase.js`): the whole store as one JSONB row (minus `SYNC_OMIT` transient fields; `sync.queue` sanitized to `[]`). Carries everything NOT in the per-table tables — streak, XP, mistakes, settings, identity, dailyChallenge, examAttempts. Pushed debounced (5s) via `triggerCloudSync` on every mutation.

**Queue engine** (`src/lib/syncEngine.js`): `processSyncQueue` drains the queue, re-queuing transient failures with exponential backoff (`nextScheduledRetryMs`) to `MAX_ATTEMPTS = 5`, then **dead-letters** them — surfaced via `console.warn` + telemetry + `sync_events` archive, never silently dropped. `classifySyncError(err)` marks schema/RLS/integrity errors (SQLSTATE `42xxx`/`23xxx`, `PGRST204/205`, "does not exist", RLS messages) as **fatal** → dead-lettered on attempt 1 instead of burning retries. Conservative: unknown ⇒ transient.

**Flush** (`useStore.flushSyncQueue`): triggered by `Layout`'s effect on `[networkStatus, queue.length]` + a single `setTimeout` retry. Guards on `networkStatus === 'online'` && `syncStatus !== 'syncing'`.

**Rehydration heal** (`src/lib/syncStatus.js` `reconcileSyncStatusOnLoad`, wired via `persist.onRehydrateStorage`): the whole `sync` slice is persisted, so a flush interrupted by a tab close can persist `syncStatus: 'syncing'` (deadlocks the flush) and a stale `networkStatus: 'offline'` can block it too. Both are healed at load (`syncing`→`pending`/`synced`; `offline`→`online` when `navigator.onLine`). **Lesson: don't gate a flush on a persisted ephemeral flag without reconciling it on load.**

**Sign-in merge** (`AuthGuard.handleSignIn`): on every sign-in, `hydrateCloudData` key-**unions** per-table data (adds missing, never removes — the sole writer of `cards`/`writingHistory`/`speakingHistory`), then the blob is pulled. Cards converge via the union; **blob-only** fields use last-write-wins by `lastMutationAt` vs `cloud.updated_at`. `restoreFromCloud` restores blob-only fields ONLY (excludes `cards`/`writingHistory`/`speakingHistory`/`sync` — so it never drops the live queue or races the union).

**Integration safety net (Q-1, 2026-06-12):** the real two-device sign-in merge is covered by a cross-device integration suite — `src/test-utils/fakeSupabase.js` (in-memory backend faked at the `@supabase/supabase-js` `createClient` seam, so real cloudSync/blob/syncEngine/store-merge code executes in tests) + `src/test-utils/twoDeviceSync.js` (two fresh store instances via `vi.resetModules` sharing one backend). All four shipped sync bugs (P1-1/P1-2/P2-C1/P2-C2) are locked in `src/store/__tests__/syncTwoDeviceIntegration.test.js` and `src/components/__tests__/authGuardSignInMergeIntegration.test.js` (jsdom; mounts the REAL AuthGuard tie-break). **Any sync behaviour change should add/extend a cross-device test here.** Vitest gotchas (the `import`-then-`export` re-export trap, doMock priming) are documented in the harness comments.

**Prod schema-drift gotcha:** the live DB can lag the committed SQL — `CREATE TABLE IF NOT EXISTS` never adds columns to an existing table, so new columns in `supabase/setup_all_tables.sql` don't reach prod automatically (apply them via `supabase/migrations/`). When sync silently fails, diff `information_schema.columns` against the committed SQL, and query the `telemetry_events` table (a server-side mirror of client `trackEvent`) for the actual error. See the 2026-05-29 entries in `docs/archive/RESUME_ARCHIVE-2026-06.md`.

### Spaced Repetition

The app uses **FSRS-6** (via the `ts-fsrs` library) in `src/lib/fsrs.js` — not SM-2. `fsrs.js` never pins a weight array; it uses `generatorParameters()` defaults, so the app runs whatever algorithm version ts-fsrs ships — currently **FSRS-6.0 (21-weight set)** in ts-fsrs 5.3.2. (A guard in `fsrs.test.js` pins this so the label can't drift from the library again.) `fsrs.js` is the active algorithm. Cards are rated with `Rating.Again/Hard/Good/Easy`. FSRS manages `stability`, `difficulty`, `state` (New/Learning/Review/Relearning), and `due` dates.

### Past-paper OCR (free, on-device)

Photograph or upload a printed past-paper page (an image, or an image-only/scanned PDF) and study it in the **same** reveal-gated reader — the **gloss→FSRS core is untouched**. Two layers mirror `translateDocument.js`'s testable pattern: **`src/lib/ocr.js`** is pure (no DOM/network/WASM) — `runOcr(images, {recognize})` takes an **injected** engine and emits the reader's exact `{pages:[{pageNum,text,paragraphs}]}` shape (so OCR is just an alternative producer of `{pages}`); **`src/lib/ocrEngine.js`** is the only impure boundary — a **lazy** `await import('tesseract.js')` (Tesseract.js 7, `oem:1` LSTM-only, `createWorker(langs, oem, options)` confirmed v7) behind `createOcrRecognizer()`. Assets are **self-hosted** under `public/ocr/` (image NEVER leaves the device): `scripts/copy-ocr-assets.mjs` (prebuild+postinstall) ships only the 6 LSTM WASM core variants (~20 MB, gitignored, regenerated from the dep) + worker; the `tessdata_fast` `msa`/`eng` models are committed gzipped (~3 MB, no CI fetch). PWA: `/ocr/**` is excluded from precache (`globIgnores`) and runtime-`CacheFirst`-cached (offline after one run). `PDFReader.handleFile` branches on `file.type`: an image → `runImageOcr` (forces reflow — image sources have no `pdfDoc`, so the Layout toggle is gated on `pdfDoc`); an `isImageOnlyPdf(pages)` PDF → a **non-punitive OCR offer** (rasterise via `renderPdfPageToCanvas`, capped at 10 pages). OCR is a **draft the learner verifies**: low mean word-confidence (`<70`) shows a dismissible blurry note, and per-word low-confidence carries a dotted-underline cue (by surface string — no edit to the grounding/gloss core). Spec/plan: `docs/superpowers/{specs,plans}/2026-06-11-past-paper-photo-ocr*`.

**Phase 2 — the optional BYOK-vision "Sharper read"** (spec/plan `2026-06-11-past-paper-ocr-vision-rung*`): when the free read comes out rough, a **manual, consent-gated** button re-reads the SAME retained image(s) via the user's OWN vision-capable provider (Gemini primary / OpenRouter secondary; Ollama excluded) — it **uploads the page**, so it is disclosed three ways (button label "Sharper read — uploads to {provider}", a one-time consent dialog with "Don't ask again" = `pdfReader.visionConsent`, and a provenance banner on the result). Seam: **`callInstructVision`** in `instruct.js` routes ONLY to adapters with the additive `supportsVision`/`callVision` capability (an image can never land on a blind text model) and reuses the cooldown/auto-switch engine via the shared `runOnAdapters` loop — **`callInstruct` and every text caller are behaviour-frozen** (pinned by the untouched suites). `src/lib/ocrVision.js` (pure prompt) + lazy `src/lib/ocrVisionEngine.js` — `createVisionRecognizer()` is just a **second producer of `runOcr`'s injected `recognize` contract**, returning `words: []` so `meanConfidence===0` auto-suppresses the Tesseract blurry note/dotted cue (the banner replaces them). A failed sharper read NEVER blanks the free read. Vision free-model discovery: `pickVisionModels` filters `architecture.input_modalities ⊇ 'image'` and excludes reasoning models + the `openrouter/free` meta-router. Accuracy is a MANUAL harness (`scripts/ocr-accuracy-harness.mjs`, needs `GEMINI_KEY`), never a CI gate.

### AI / Cikgu Maya Architecture

Three-tier fallback chain (cost-optimized):
1. **Expert system** (default, free): Rule-based knowledge in `src/data/cikguKnowledge.js` with fuzzy keyword search. Covers 20+ IGCSE grammar/vocabulary/exam topics.
2. **OpenRouter free models** (`src/lib/openrouter.js`): DeepSeek R1, Llama 4 Scout, Gemma 3. Requires `VITE_OPENROUTER_KEY`.
3. **Supabase Edge Function** (`src/lib/ai.js`): Claude API proxy with SSE streaming, circuit breaker (3 failures → 120s cooldown), 50 calls/day client-side rate limit.

Mock mode: `VITE_AI_MOCK=true` returns canned responses from `src/data/aiMocks.js`.

**Instruct seam (BYOK-only, separate from the chain above):** `src/lib/instruct.js` is a
multi-provider router over `src/lib/instructProviders/{openrouter,gemini,ollama}.js` (adapter
contract `{id, label, hasKey, call, verify}`). Public API is frozen: `hasInstructProvider()` /
`callInstruct(args)` — callers never import an adapter directly. Keys live in per-provider
localStorage slots (`igcse-openrouter-key`, `igcse-gemini-key`, `igcse-ollama-url/-model`) —
NEVER the Zustand store, so they can't reach the cloud blob. Env keys never count. Gemini BYOK
calls the NATIVE `generateContent` endpoint with the `x-goog-api-key` header (the OpenAI-compat
endpoint CORS-fails client-side) and never touches `/api/gemini`. Quota 429 → exponential
cooldown (120s ×2, cap 30 min) + auto-switch to the next configured provider + a throttled
Layout toast (`InstructSwitchToast`). Spec:
`docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md`.

### Routing

20 routes defined in `src/App.jsx` (+ a `*` catch-all), all wrapped in `<Layout>` (header + bottom nav), `<ErrorBoundary>`, and `<Suspense>` (every page except Dashboard is `React.lazy()`-imported, splitting the bundle):
`/` `/study` `/roleplay` `/grammar` `/writing` `/import` `/settings` `/mistakes` `/word-families` `/cikgu` `/comprehension` `/pdf-reader` `/speaking` `/exam-rehearsal` `/listening` `/dictation` `/smart-study` `/practice` `/saved-cloze` `/for-you`

Bottom nav shows 4 primary items + "More" drawer (defined in `src/components/Layout.jsx`).

### Bilingual surfaces

Most learning surfaces are now bilingual with rubric-correct grading for both syllabuses:
- **Roleplay**: lang toggle on `Roleplay.jsx` swaps `SCENARIOS` (15 MS) ↔ `SCENARIOS_EN` (7 EN). Static-mode evaluator is Malay-only, so English scenarios surface AI-only with a friendly "AI quota exhausted" fallback.
- **Speaking**: lang toggle swaps Malay (`TOPICS`) ↔ English (`TOPICS_EN`) topic lists. Grader uses language-specific filler/marker/sophisticated-lexicon sets and separate AI system prompts.
- **Grammar**: 5 Malay tabs ↔ 7 English tabs. English tabs include Confusables, SVA, Articles drills not present in Malay.
- **Writing**: 21 IGCSE formats covered (10 EN + 11 MS) with hand-curated band-6 exemplar paragraphs in `src/data/exemplars.js`.
- **Comprehension**: passages and AI-generated questions both work in Malay and English.
- **Listening (Paper 4)**: 8 starter passages (4 EN, 4 MS), TTS-played with replay limit.

### Styling

- **Tailwind CSS 4** for layout/spacing — configured via `@tailwindcss/vite` plugin (no `tailwind.config.js`).
- **CSS custom properties** in `src/index.css` via `@theme` block for all colors (`--color-bg`, `--color-accent`, `--color-card`, etc.).
- **Always use** `var(--color-*)` for colors via inline `style` props. Never hardcode hex values.
- **Labels on colored fills use `var(--color-on-bright)`** — never `text-black`/`'#000'` on a `--color-*` background (P2-U1, 2026-06-13). It's black in dark mode, white in light mode, where the accent palette darkens to meet WCAG 4.5:1 (the `.light` block carries its own tuned values with ratio comments).
- Light mode: `.light` class on root div toggles CSS overrides — it re-tunes the WHOLE accent palette, not just surfaces; new colors must get a light-mode value that passes 4.5:1 as text on `--color-card2`.
- 3D flashcard flip: CSS `perspective`, `preserve-3d`, `backface-hidden`, `rotate-y-180`.

## Critical Conventions

- **Feature preservation**: Each page file (especially `Study.jsx`, `Dashboard.jsx`, `CikguBot.jsx`) contains complex state machines with many modes. Always read the full file before editing. Partial rewrites cause regressions.
- **React 19 purity**: Don't call `Date.now()` directly in render or useState initializers — wrap in arrow functions. React 19 strict mode flags impure components.
- **Speech API**: Always check `hasSpeechRecognition()` / `hasSpeechSynthesis()` before use. Use `ms-MY` locale for Malay TTS/STT.
- **Dictionary format**: Entries in `src/data/dictionary.js` are `{ m, e, ex, box }` (Malay, English, example, SRS box).
- **Card format**: Cards in the store have dictionary fields plus FSRS fields (`due`, `stability`, `difficulty`, `state`, `lapses`, `reps`, etc.) and a topic tag `t`.
- **Grammar drill IDs**: Format is `{type}-{index}` (e.g., `imbuhan-3`, `tense-7`). Used as keys in `grammarCards` store object.
- **PDF touch selection — hit-test, don't trust `e.target`**: pointer events implicitly capture to the `pointerdown` target, so a drag reports the wrong token. `src/lib/useSelectionMode.js` resolves the real token under the finger via `document.elementFromPoint(x, y)`. Preserve that pattern for any new PDF selection work.
- **OpenRouter models rotate — discover, never hardcode slugs**: free model IDs are retired every few months. `src/lib/openrouter.js` discovers them at runtime (`getFreeModels`, 24h cache) with `FALLBACK_FREE_MODELS` as a backstop. Never bake a model slug into a feature.
- **Reader keyboard layer is a pure dispatcher + thin glue**: the reflow reader's key map lives in `src/lib/readerKeymap.js` (`resolveReaderKey`, mirrors `gestureModel.js` — unit-tested so it can't silently invert); `PDFReader.jsx` has ONE delegated `onKeyDown` whose handlers only CALL `handleCommit`/`revealGloss`/`addGloss`. Never edit `useSelectionMode.js`/`gestureModel.js` for keyboard work, and never auto-reveal on focus (reveal-gate: Enter is the deliberate press). Gotcha: `splitParagraph` content tokens have `kind: 'token'` (NOT `'word'`).
- **Drill feedback must announce**: any new study mode / drill surface renders a `<FeedbackLive text={...}>` (polite live region, `src/components/FeedbackLive.jsx`) carrying the same correct/incorrect text the eye sees — mounted unconditionally (empty until feedback), or SRs hear nothing. Interactive controls in header/toolbars/modals: ≥44×44px (pinned by `tests/e2e/a11y-tap-targets.spec.js`).

## Verification

After any significant edit:
1. `npm run build` — zero errors. **Per-route PAGE chunks** (the cost paid on navigation) should each be <70 KB raw (known exception: `PDFReader` ~71 KB since the 2026-06-12 keyboard a11y layer, +3.4 KB raw / +1.2 KB gz — re-recorded deliberately); `index-*.js` should be ~467 KB / ~149 KB gzipped. **Shared / on-demand helper chunks are exempt** from the 70 KB rule — they load once and are cached, not per-navigation: `pdf` ~330 KB, `writingGrader` ~77 KB (the regex grading lexicons, loaded only when an essay is analyzed), the `wikidata`/dictionary data chunk ~120 KB, the `use-reduced-motion` chunk ~120 KB (framer-motion, loaded once for page transitions), and the `dist` chunk ~184 KB (`@supabase/supabase-js`, loaded once when auth initialises). Heavy on-demand subtrees are deliberately lazy: `RoleplaySession` (AI session, off the Roleplay picker), `ExemplarPanel` + `exemplars.js` and `WritingTutor` (off the Writing route) — keep them lazy.
2. All 19 routes render without console errors
3. Dark and light themes both work
4. Zustand persistence survives page reload (latest `STORE_VERSION`)
5. No infinite re-render loops (check browser console for "Maximum update depth exceeded")
6. `npm run lint` — 0 errors. The 3 pre-existing exhaustive-deps warnings (in `RoleplayScorecard.jsx`, `Comprehension.jsx`, `Roleplay.jsx`) are tracked; don't introduce new ones.

The pre-commit quality gate runs items 1, 5, and 6 (build/lint/test) automatically on every commit — items 2-4 (visual/theme/persistence checks) still need a human eye for UI-affecting changes.

## E2E tests

Playwright suite under `tests/e2e/` (config: `tests/e2e/playwright.config.js`). Pins Phase 4 page transitions and the Phase 5 mistake → FSRS promotion pipeline. `past-paper-ocr.spec.js` covers the OCR feature (cold Tesseract WASM is slow → those tests raise the per-test timeout to 120 s; fixtures are generated + OCR-validated by `scripts/gen-ocr-fixtures.mjs`). `reader-keyboard.spec.js` pins the reader's keyboard loop (F1–F7: roving focus, Enter-reveal, Shift+Arrow select-to-deck) and `a11y-tap-targets.spec.js` sweeps ≥44px targets via real Chromium `getBoundingClientRect` (jsdom has no layout). Two pre-existing flaky specs (`full-translation.spec.js:153`, `instruct-router.spec.js:156` — AI-mock/timing) fail under full-suite load independent of OCR.

```bash
npm run test:e2e        # headless run (chromium only, viewport 390x844)
npm run test:e2e:ui     # interactive runner
```

The config's `webServer` auto-spawns `npm run dev` on `:5173` and reuses an existing one outside CI. Browsers resolve from `~/Library/Caches/ms-playwright/` (currently `chromium_headless_shell-1223/` + `chromium-1223/`); `npx playwright install chromium` is a no-op after the first install.

**Vite `?t=…` module-URL trap (READ BEFORE TOUCHING THESE TESTS):** in dev, `page.evaluate(() => import('/src/store/useStore.js'))` gets a DIFFERENT module instance than the one React subscribed to — Vite tags the React-side import with a `?t=<timestamp>` cache-buster. Mutating the detached instance updates store state but never triggers a React re-render, so toasts silently fail to appear and assertions read as code bugs. Work around by pulling the live URL from `performance.getEntriesByType('resource')` and dynamic-importing THAT URL (see `bindStore()` in `tests/e2e/mistake-promotion.spec.js`). The `bindStore` step is required after every `page.goto` / `page.reload` because navigation clears `window.__STORE`.

Artifacts (`test-results/`, `playwright-report/`, `playwright/.cache/`) are gitignored.

## Performance pitfalls to avoid

- **Don't allocate inside selectors**: `useStore(s => s.someArr ?? [])` allocates a new array every render and busts shallow equality. Use a module-level `const EMPTY_ARR = []` and a separate `useMemo` if you need a derived view.
- **Memo prop boundaries**: `React.memo(Component)` only helps if the props are referentially stable. If you pass an arrow callback (`onRetry={() => ...}`), the closure changes every render. Either use `useCallback` or pass primitives + a stable `navigate` so the component constructs the closure internally.
- **Code splitting is in App.jsx**: don't add eager imports for new pages. Wrap them in `lazy(() => import('./pages/X'))` and the existing `<Suspense>` will handle the fallback.

## Working agreement (short)

- **Surgical diffs, not rewrites.** Read the full file first; preserve existing code, comments, and modes. Partial rewrites of the big page files cause regressions (see Critical Conventions).
- **Context discipline.** For read-heavy investigation (tracing how a feature flows across many files), delegate to a subagent / Explore agent and have it report back a summary — keep the main session's context clean for implementation.
- **The lint/test/build gate is automated** (pre-commit) — fix failures at the root, don't bypass with `--no-verify` except in a real emergency.
- **Bilingual awareness.** Don't break MS/EN toggles or leak layout classes across languages.

## Strategic roadmap

Product direction (the "Zero-Waste Cognitive Engine" 5-phase plan) and the full agent-execution guidelines now live in **`docs/PROJECT_VISION.md`** — read it when planning features, not on every edit.
