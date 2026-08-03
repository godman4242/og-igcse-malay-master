# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IGCSE Malay Master** ("ooga da boogadamalay") — a React SPA for IGCSE Malay AND English language learning (0546 / 0500 / 0510). Features: FSRS-6 spaced repetition, 7 study modes (incl. a selectable Produce/productive-recall mode), AI roleplay with scoring (bilingual), expert-system grammar tutor (Cikgu Maya), reading comprehension, IGCSE Paper 4 listening practice, interactive bilingual grammar drills, writing analysis (21 IGCSE formats with band-6 exemplars), pronunciation practice via Web Speech API, word family explorer, universal mistake journal with auto-promotion to FSRS cards, exam countdown planner, a 30-min spaced exam rehearsal mode with composite Readiness %, and **past-paper photo/scan study via free on-device OCR** (Tesseract.js — photograph a printed page and study it in the same reveal-gated reader; an optional consent-gated BYOK-vision "Sharper read" re-reads messy photos/handwriting on the user's own AI key), and **"study from a recording" via free on-device speech-to-text** (transformers.js + Whisper ONNX — upload or record an audio clip and study its transcript in the same reader; the audio never leaves the device). The reflow reader is fully **keyboard/switch-operable** (roving tabindex + pure `readerKeymap.js` dispatcher), every drill announces correct/incorrect via a polite live region (`FeedbackLive`), and header/toolbar/SearchModal targets meet ≥44px (WCAG 2.1.1 / 4.1.3 / 2.5.5 — shipped 2026-06-12, P1-5). All state persists locally via Zustand + localStorage with optional Supabase cloud sync.

## Learning science foundation

This is a learning tool, not a content reader — every feature should serve at least one validated principle. Use this as a design check, not dogma.

| Principle | How it shows up here |
|---|---|
| **Active recall > passive review** | FSRS-6 scheduling; 7 study modes; type-answer, cloze, speaking, and the selectable **Produce** mode (gloss→type the word) force production |
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
npm run test:run  # Vitest unit suite, one-shot (~2250 tests, measured 2026-08-03)
npm run test:e2e  # Playwright e2e (chromium, 390x844)
```

**Commits are gated automatically.** `.githooks/pre-commit` runs `build → test:run → lint` and aborts the commit (and the auto-push/prod deploy) on any failure. So "done = green" is enforced — you don't have to remember to run them, but running them locally first gives faster feedback. Emergency bypass: `git commit --no-verify` (use sparingly; it ships unverified to prod). Lint passes with 3 pre-existing exhaustive-deps warnings (0 errors). **Docs-only fast-path:** commits where every staged file is markdown (`*.md`) skip the gate (markdown can't affect build/test/lint — verified no `.md` imports in src/tests).

## Architecture

**Stack:** React 19, React Router v7, Zustand 5 (persisted), Tailwind CSS 4 (via `@tailwindcss/vite` plugin), Vite 8, ts-fsrs (spaced repetition), Supabase 2 (optional cloud sync), Web Speech API.

### State Management

Single Zustand store at `src/store/useStore.js` (STORE_VERSION = 35 — **the constant in the file always wins over this prose**; recent bumps: v31 per-paper balance meter `skillActivity` log, v32 XP retired — Dashboard tile is now Mastered words via `countMastered`, v33 audio transcription language pref `pdfReader.asrLang`, v34 **True English study mode**: per-card `lang` `'ms'｜'en'` backfilled to `'ms'` + global `studyLang` pref — exported `applyV34Migration`, v35 per-language study-mix focus preset `studyMix {ms,en}` — exported `applyV35Migration`). Persisted to localStorage under key `igcse-malay-store`. Contains:
- Cards deck with FSRS scheduling fields (`due`, `stability`, `difficulty`, `state`, `lapses`)
- Grammar SRS state (`grammarCards` — keyed by drill ID)
- AI state (`ai.dailyCalls`, `ai.roleplayHistory`, `ai.cikguHistory`)
- Engagement layer (streaks, freezes, daily challenges — XP retired in v32, feature #6)
- Metacognitive tracking (`confidenceLog`, `mistakeReasons`, `sessionFeedback`, `reflections`)
- Identity & motivation (`identity.label`, `identity.idealSelf`, `identity.cue`, `lastSessionAt`)
- Offline sync queue (`sync.queue`, `sync.syncStatus`, `sync.networkStatus`) + `lastMutationAt` (cloud-sync tie-break) — see **Cloud sync** below
- **Mistake pipeline (v11)** — `mistakes` array with rich records: `{ id, ts, type, source, language, category, severity, word, given, correct, surface, correction, note, promotedCardId, attempts, reviewed, lastReviewedAt, _k }`. Categories: vocab / imbuhan / tense / spelling / cohesion / register / pronunciation / comprehension / fluency / other. `addMistake` dedupes by content hash within 24h, escalates severity on repeat hits, and auto-promotes mistakes to FSRS cards in a 'Mistakes' deck — gated by `canAutoPromoteMistake(language, category)` (Malay: vocab+imbuhan; English: vocab only, as English has no imbuhan; any other/untagged language never promotes, preserving the pre-v34 strict ms-only gate). The promoted card's gloss direction follows the mistake's `language` (English miss → `lang:'en'` card). `promoteMistakeToCard` is also exposed for manual promotion. `getFixUpQueue(limit)` returns the highest-priority unfixed mistakes.
- **Exam rehearsal (v12)** — `examAttempts` array (capped at 50) of `{ id, ts, passageId, lang, comprehensionPct, writingBand, speakingBand, listeningPct?, readinessScore, durationSec }`. The rehearsal runs 4 stages (Comprehension → **Listening (Paper 4)** → Writing → Speaking); the listening stage is **TTS-gated** — skipped when `hasSpeechSynthesis()` is false, in which case `listeningPct` is absent. The composite **readiness scorer lives in ONE place**, `src/lib/examReadiness.js` (`composeReadiness`), shared by `getExamReadiness()` and `ExamRehearsal.finishRehearsal` (no longer duplicated): comp 0.30 / writing 0.35 / speaking 0.35, + listening 0.30 **only when present**, re-normalised over present components — so attempts logged before the listening stage compute **byte-identical** (no STORE_VERSION bump). `getExamReadiness()` returns smoothed readiness %; `getNextExamDue()` returns FSRS-shaped 3-30 day schedule.
- **Speaking history** — bilingual; entries include `{ topicId, band, durationSec, wordCount, transcript, lang }`.
- **Skill activity log (v31)** — `skillActivity` `{ 'YYYY-MM-DD': { reading, listening, grammar } }`, LOCAL-day keyed, pruned to 30 days on write. `logSkillActivity(skill)` accepts only those 3 skills (the ones with no history array); Writing/Speaking/Exam/Vocab derive from their existing slices. Pure 7-day aggregator: `src/lib/skillBalance.js` (`skillBalance`), rendered by the lazy Dashboard `PaperBalance` widget.

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

Two channels (per-table event queue + whole-store JSONB blob), both gated on an authed session + `SUPABASE_CONFIG.enabled`. Offline-first queue with exponential-backoff + dead-lettering; sign-in does a key-union merge (adds, never removes) with last-write-wins on blob-only fields. **Invariant: any sync behaviour change must add/extend a cross-device test** (`src/store/__tests__/syncTwoDeviceIntegration.test.js`). **Prod gotcha: the live DB can lag committed SQL** — `CREATE TABLE IF NOT EXISTS` never adds columns; when sync silently fails, diff `information_schema.columns` and check the `telemetry_events` table.

→ **Full detail (queue engine, flush, rehydration heal, merge, schema-drift debugging): `docs/reference/cloud-sync.md`.**

### Spaced Repetition

The app uses **FSRS-6** (via the `ts-fsrs` library) in `src/lib/fsrs.js` — not SM-2. `fsrs.js` never pins a weight array; it uses `generatorParameters()` defaults, so the app runs whatever algorithm version ts-fsrs ships — currently **FSRS-6.0 (21-weight set)** in ts-fsrs 5.3.2. (A guard in `fsrs.test.js` pins this so the label can't drift from the library again.) `fsrs.js` is the active algorithm. Cards are rated with `Rating.Again/Hard/Good/Easy`. FSRS manages `stability`, `difficulty`, `state` (New/Learning/Review/Relearning), and `due` dates.

### Multimodal study inputs — OCR + audio transcription (free, on-device)

Photograph/scan a past-paper page (Tesseract.js OCR) OR upload/record audio (transformers.js + Whisper ONNX) and study it in the **same** reveal-gated reader. Both are alternative **producers of the reader's `{pages}` shape** — the **gloss→FSRS core is untouched**, and the source data (image/audio) NEVER leaves the device. Pure layer (`ocr.js`/`transcribe.js`, injected engine) + lazy impure boundary (`ocrEngine.js`/`transcribeEngine.js`); `PDFReader.handleFile` branches on `file.type`. **⚠️ `@huggingface/transformers` is PINNED to v3 (^3.8.1)** — v4's nightly ORT-web deadlocks `pipeline()` in-browser. An optional, consent-gated **BYOK-vision "Sharper read"** (`callInstructVision`) re-reads rough scans via the user's own vision key (it uploads the page — disclosed 3 ways).

→ **Full detail (asset self-hosting, PWA caching, confidence cues, the vision rung): `docs/reference/multimodal-ocr-audio.md`.**

### AI / Cikgu Maya Architecture

Three-tier fallback chain (cost-optimized): **(1) Expert system** (default, free) — rule-based KB in `src/data/cikguKnowledge.js` (33 entries) with fuzzy keyword search, **confidence-gated** (`getExpertResponse`, `MIN_CONFIDENCE = 40`) so a weak/off-topic match hedges honestly instead of bluffing (confident-wrong is the worst failure for a learning tool); **(2) OpenRouter free models** (`VITE_OPENROUTER_KEY`); **(3) Supabase Edge Function** Claude proxy (SSE, circuit breaker, 50 calls/day). Mock mode: `VITE_AI_MOCK=true`. **Separate BYOK instruct seam** (`src/lib/instruct.js`, frozen `hasInstructProvider()`/`callInstruct()`): multi-provider router; **keys live in per-provider localStorage, NEVER the Zustand store** (so they can't reach the cloud blob); 429 → cooldown + auto-switch.

→ **Full detail (confidence-gate calibration, KB widening, shared `CIKGU_SYSTEM_PROMPT` parity rule, instruct adapters): `docs/reference/ai-cikgu-architecture.md`.**

### Routing

21 routes defined in `src/App.jsx` (+ a `*` catch-all), all wrapped in `<Layout>` (header + bottom nav), `<ErrorBoundary>`, and `<Suspense>` (every page except Dashboard is `lazyWithRetry()`-imported — NOT bare `React.lazy`; it reloads once on a stale-chunk error instead of dropping to the ErrorBoundary — splitting the bundle):
`/` `/study` `/roleplay` `/grammar` `/writing` `/import` `/settings` `/mistakes` `/word-families` `/cikgu` `/comprehension` `/pdf-reader` `/speaking` `/exam-rehearsal` `/listening` `/dictation` `/cloze-listening` `/smart-study` `/practice` `/saved-cloze` `/for-you`

Bottom nav shows 4 primary items + "More" drawer (defined in `src/components/Layout.jsx`).

**Crawler SEO — build-time per-route `<head>` (shipped 2026-07-15).** `src/lib/routeMeta.js` is the single source of truth mapping each route → `{ name, title, description, index }`. The `seoPrerender` Vite plugin (`vite.config.js`, `apply:'build'`+`enforce:'post'`) reads the built `index.html` and `emitFile`s a static `dist/<route>/index.html` per route with its own title/description/canonical/OG (pure logic in `src/lib/seoHead.js`), plus generated `robots.txt`+`sitemap.xml` — so a no-JS crawler sees per-route meta (Vercel serves the file; filesystem beats the SPA catch-all rewrite). Per-deployment `VITE_BASE_URL`/`VITE_NOINDEX` (build-time env) set the host + noindex the `og-` mirror. `public/robots.txt`/`sitemap.xml` are **generated, not committed** — don't re-add static ones. The Layout H1 is a route-derived `sr-only` page name (`metaForPath(location.pathname).name`); the client `<Meta>` keeps canonical/OG in sync on navigation. Pure logic is unit-tested (`routeMeta.test.js`/`seoHead.test.js`); `scripts/verify-seo.mjs` + `tests/e2e/seo-h1.spec.js` verify the built output.

### True English study mode (v34) + bilingual surfaces

The core vocab→FSRS loop is first-class for BOTH a Malay learner (0546) and an English learner (0510 ESL). English is a per-card `lang` flag + a TTS/STT locale switch, NOT a study-loop rewrite. **Load-bearing invariants:**
- **`card.m` = target word being learned, `card.e` = L1 gloss.** `card.lang` `'ms'｜'en'` (default `'ms'`, backfilled via `applyV34Migration`).
- **Malay & English decks NEVER mix in one session** — global `studyLang` + `cardsForLang(cards, lang)` (`src/lib/cardLang.js`) scope Study/Smart-Study/Dashboard/ForYou. `localeFor(lang)` (`src/lib/langLocale.js`) is the single TTS/STT locale source (`ms-MY`｜`en-GB`).
- **Card-creation gloss direction follows `studyLang`** via `glossPlanFor(studyLang)` (`src/lib/glossPlan.js`, pure) — the one source-language signal so Import + the reader can't diverge. `'ms'` paths are byte-identical to pre-v34.
- **The word-level gloss/grounding layer (`buildGlossIndex`/`groundingIndex`) stays Malay-based by design** — English word-tap = Select-mode. The rest of the reader (dense-page easing, sentence-reveal, full-doc translation) IS bilingual.
- Bilingual surfaces: the 4 binary-toggle surfaces (Roleplay/Speaking/Grammar/Writing) **seed their initial toggle from `studyLang`**; Comprehension/Listening are passage pickers that **lead with `studyLang`** (`leadByLang`, stable reorder-don't-filter). Writing covers 21 IGCSE formats (10 EN + 11 MS) with band-6 exemplars.

→ **Full detail (every shipped increment, reader parity, mistake→FSRS promotion, Produce mode, variant badges, AI deck generators, academic-English seed, per-surface notes): `docs/reference/english-study-mode.md`.**

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
- **Dictionary format — a flat STRING map, not objects**: `src/data/dictionary.js` is `{ 'abad': 'century', … }` (825 entries; `d['abad']` is the gloss string itself — `d['abad'].e` is `undefined`). **Values staying strings is a load-bearing invariant**, pinned by `dictionary.test.js` / `contentLint.test.js` / `listeningMistakes.test.js`. Example sentences live in the **parallel** map `src/data/dictionaryExamples.js` (`getExample(word) => string|null`), never inline — that split is what lets examples grow without touching the shape. Two derived files must be regenerated in lock-step when `dictionary.js` changes: `dictionaryEn.js` (`npm run build:en-dict`, generated — never hand-edit) and, for a new headword, `dictionaryIcons.js`. Fixing a wrong *gloss* is allowed and expected — pin it with a content-truth test (see the `ijazah` / `mi` / `masak` precedents in `dictionary.test.js`); changing the *shape* is not.
- **Card format**: Cards in the store have dictionary fields plus FSRS fields (`due`, `stability`, `difficulty`, `state`, `lapses`, `reps`, etc.) and a topic tag `t`.
- **Grammar drill IDs**: Format is `{type}-{index}` (e.g., `imbuhan-3`, `tense-7`). Used as keys in `grammarCards` store object.
- **PDF touch selection — hit-test, don't trust `e.target`**: pointer events implicitly capture to the `pointerdown` target, so a drag reports the wrong token. `src/lib/useSelectionMode.js` resolves the real token under the finger via `document.elementFromPoint(x, y)`. Preserve that pattern for any new PDF selection work.
- **OpenRouter models rotate — discover, never hardcode slugs**: free model IDs are retired every few months. `src/lib/openrouter.js` discovers them at runtime (`getFreeModels`, 24h cache) with `FALLBACK_FREE_MODELS` as a backstop. Never bake a model slug into a feature.
- **Reader keyboard layer is a pure dispatcher + thin glue**: the reflow reader's key map lives in `src/lib/readerKeymap.js` (`resolveReaderKey`, mirrors `gestureModel.js` — unit-tested so it can't silently invert); `PDFReader.jsx` has ONE delegated `onKeyDown` whose handlers only CALL `handleCommit`/`revealGloss`/`addGloss`. Never edit `useSelectionMode.js`/`gestureModel.js` for keyboard work, and never auto-reveal on focus (reveal-gate: Enter is the deliberate press). Gotcha: `splitParagraph` content tokens have `kind: 'token'` (NOT `'word'`).
- **Drill feedback must announce**: any new study mode / drill surface renders a `<FeedbackLive text={...}>` (polite live region, `src/components/FeedbackLive.jsx`) carrying the same correct/incorrect text the eye sees — mounted unconditionally (empty until feedback), or SRs hear nothing. Interactive controls in header/toolbars/modals: ≥44×44px (pinned by `tests/e2e/a11y-tap-targets.spec.js`).

## Verification

After any significant edit:
1. `npm run build` — zero errors. **Per-route PAGE chunks** (the cost paid on navigation) should each be <70 KB raw (known exception: `PDFReader` **~72.3 KB / ~20.9 KB gz** (re-measured 2026-08-03) — first recorded 2026-06-29 after lazy-loading the non-default `LayoutView` page-render mode into its own ~5 KB chunk, which trimmed PDFReader from 79.1 KB and **resolved quality-watch bundle regression #6**; history: ~71 KB after the 2026-06-12 keyboard a11y layer → ~76.7 KB with the audio-transcribe `handleFile` branch → +0.56 KB F5 English-source gloss → crept to 79.1 KB before the LayoutView split); **`CikguBot` ~76 KB / ~26 KB gz** — assessed 2026-06-15 (local loop) as an **accepted exception, not a fixable gap**: its bulk is the ~70 KB `cikguKnowledge.js` expert-tutor KB (the FREE default Cikgu tier), which `searchKnowledge`/`scoreMatch` must hold in memory to rank a match (it scores query words against every entry's `answer` body) AND which renders the topic-suggestion browser at mount — so the data is needed up front and can't be lazy-split without moving bytes into a second chunk the page still requires (metric-gaming churn, no real navigation-byte win). It grew over budget during the 2026-06-14 KB widening (peribahasa bank + rencana/laporan/syarahan + formal-vocab). Don't gut it for the number. **`index-*.js` (the eager entry chunk) is ~479.4 KB / ~151.6 KB gzipped as of 2026-08-03 (C8).** It had drifted to ~527.5 KB / ~168.0 KB, ~12% over the ~471.7 KB / ~150.8 KB recorded 2026-06-29; the measured cause was **`dictionaryExamples.js`, which roughly tripled (254 → 704 sentences) over July** and sat in the eager graph because `useStore`, `SearchModal` and `SharedDeckImport` all imported it statically. All three now dynamic-import it at the point of use (topic-pack load / add-a-word / accept-a-shared-deck), so it rides its own ~48.5 KB / ~16.6 KB gz on-demand chunk — **−48 KB raw / −16 KB gz, back to within ~1.6% of the June baseline.** Pinned by `src/store/__tests__/eagerDataGraph.test.js`. **`dictionary.js` (~19 KB) deliberately stays eager**: `selectionToCard.js` derives a module-scope word set from it and `SelectionToCard` mounts unconditionally in `Layout`, so lazying it would just re-fetch the same bytes in a second request on every load — metric-gaming, not a cut. Before adding anything to the eager path, re-measure and say what moved it. **Cheap way to find out what's in there:** `ANALYZE=true npm run build` emits `dist/stats.json` (raw-data visualizer); group its `nodeParts` by chunk to get a per-module table. **Shared / on-demand helper chunks are exempt** from the 70 KB rule — they load once and are cached, not per-navigation: `pdf` ~330 KB, `writingGrader` ~88 KB (the regex grading lexicons, loaded only when an essay is analyzed; grew from ~80 KB across 2026-06-13 as the semantic-grammar floor was raised for both languages — Malay 0→15/24, English 0→12/20→16/23→22/29 incl. double-comparative / much-countable / do-support-past curated-list rules), the `wikidata`/dictionary data chunk ~120 KB, the `use-reduced-motion` chunk ~120 KB (framer-motion, loaded once for page transitions), and the `dist` chunk ~184 KB (`@supabase/supabase-js`, loaded once when auth initialises). Heavy on-demand subtrees are deliberately lazy: `RoleplaySession` (AI session, off the Roleplay picker), `ExemplarPanel` + `exemplars.js` and `WritingTutor` (off the Writing route), and the PDF reader's non-default views `FullTranslationView` + `LayoutView` (the latter split out 2026-06-29) — keep them lazy.
2. All 21 routes render without console errors
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
- **Token-efficient output.** Keep working output lean to save cost: terse code comments, no redundant preamble or re-explanation, don't echo large file bodies (prefer diffs / `file:line` refs), and summarise subagent findings instead of pasting raw transcripts. This trims tokens but does NOT override the reply-quality rules — lead-with-outcome, numbered next steps with VERIFY, and jargon-defined-inline still stand.

## Strategic roadmap

Product direction (the "Zero-Waste Cognitive Engine" 5-phase plan) and the full agent-execution guidelines now live in **`docs/PROJECT_VISION.md`** — read it when planning features, not on every edit.
