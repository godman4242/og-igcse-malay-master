# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Kept lean on purpose — it loads into every session and every subagent.** It holds only what a session needs before it opens a file. Everything else loads on demand:
- **Folder rules** — `src/lib/`, `src/pages/`, `src/store/`, `tests/e2e/` each have a `CLAUDE.md`, and `.claude/rules/*.md` holds `paths:`-scoped rules (e.g. `pdf-reader.md`). Claude Code auto-loads them when a matching file is read.
- **Deep dives + history** — `docs/reference/*.md`. Read the one for the area you touch.
- New area detail goes THERE, not here.

## Project Overview

**IGCSE Malay Master** ("ooga da boogadamalay") — a React SPA for IGCSE Malay AND English (0546 / 0500 / 0510): FSRS-6 flashcards in 7 study modes, AI roleplay, the Cikgu Maya grammar tutor, reading/listening/writing/speaking practice, a reveal-gated reader for PDFs, photos (on-device OCR) and recordings (on-device speech-to-text), a mistake journal that feeds FSRS, and a spaced exam rehearsal. Local-first (Zustand + localStorage), optional Supabase sync. Full feature list, routes, SEO: `docs/reference/app-overview.md`.

**This is a learning tool, not a content reader — every feature should serve at least one validated principle.** The principle → feature table: `docs/reference/learning-science.md`.

**Reveal-gated translation (load-bearing invariant):** default is Malay-only; English is revealed only on a deliberate tap and always machine-marked — try first, reveal freely, revealing is never "failure". On a demonstrably too-hard page (`src/lib/unknownDensity.js`, `DENSE_THRESHOLD = 0.4` over `MIN_DENSE_TOKENS = 20`) the reader *offers* a non-punitive, dismissible ease — never auto-applied unless the beginner pref `pdfReader.autoHelpDensePages` is on (default OFF); EN docs never nudge. L1 (English) **word** glosses → FSRS stays the primary vocab path; the Malay→simpler-Malay rung (Option F) is NOT a beginner vocab win — don't sell it as one.

## Commands

```bash
npm run dev       # Vite dev server on :5173
npm run build     # Production build → /dist
npm run preview   # Preview production build
npm run lint      # ESLint
npm run test:run  # Vitest unit suite, one-shot (240 files / 2330 tests, measured 2026-08-05)
npm run test:e2e  # Playwright e2e (chromium, 390x844)
```

**Commits are gated automatically.** `.githooks/pre-commit` runs `build → test:run → lint` and aborts the commit (and the auto-push/prod deploy) on any failure. So "done = green" is enforced — you don't have to remember to run them, but running them locally first gives faster feedback. Emergency bypass: `git commit --no-verify` (use sparingly; it ships unverified to prod). Lint passes with 3 pre-existing exhaustive-deps warnings (0 errors); `--max-warnings 3` fails a 4th. **Docs-only fast-path:** commits where every staged file is markdown (`*.md`) skip the gate (markdown can't affect build/test/lint — verified no `.md` imports in src/tests).

## Architecture

**Stack:** React 19, React Router v7, Zustand 5 (persisted), Tailwind CSS 4 (via `@tailwindcss/vite` plugin), Vite 8, ts-fsrs (spaced repetition), Supabase 2 (optional cloud sync), Web Speech API.

### State Management

Single Zustand store at `src/store/useStore.js` (STORE_VERSION = 35 — **the constant in the file always wins over this prose**). Persisted to localStorage under key `igcse-malay-store`. What each slice holds + the version-bump history: `src/store/CLAUDE.md`.

Store migration happens in the `persist.migrate` callback. When bumping `STORE_VERSION`, add a migration case that preserves all existing data and adds new fields with defaults.

**Critical Zustand pattern**: Store getter functions (`getStreak`, `getStudyPlan`, `getChallengeStats`, `shouldShowInstallPrompt`) return new objects on every call. Never call them inside a Zustand selector — this causes infinite re-render loops:
```jsx
// WRONG — infinite loop:
const streak = useStore(s => s.getStreak())

// CORRECT — extract ref, call in component body:
const getStreak = useStore(s => s.getStreak)
const streak = getStreak()
```

- **Don't allocate inside selectors**: `useStore(s => s.someArr ?? [])` allocates a new array every render and busts shallow equality. Use a module-level `const EMPTY_ARR = []` and a separate `useMemo` if you need a derived view.

### Areas — one line each; read the pointer before changing one

- **Spaced repetition:** **FSRS-6** via `ts-fsrs` in `src/lib/fsrs.js` — not SM-2 (library-default weights, pinned by `fsrs.test.js`).
- **Cloud sync (Supabase, optional):** offline-first queue + whole-store blob; sign-in merge adds, never removes. **Invariant: any sync behaviour change must add/extend a cross-device test** (`src/store/__tests__/syncTwoDeviceIntegration.test.js`). **Prod gotcha: the live DB can lag committed SQL.** → `docs/reference/cloud-sync.md`
- **AI / Cikgu Maya:** confidence-gated expert system (free default) → OpenRouter free models → Supabase Edge proxy. BYOK instruct seam `src/lib/instruct.js`: **keys live in per-provider localStorage, NEVER the Zustand store** (so they can't reach the cloud blob). → `docs/reference/ai-cikgu-architecture.md`
- **OCR + audio transcription (free, on-device):** Tesseract.js / Whisper produce the reader's `{pages}` shape; the image/audio NEVER leaves the device — except the opt-in, consent-gated BYOK-vision "Sharper read", which uploads the page to the user's own key. **⚠️ `@huggingface/transformers` is PINNED to v3 (^3.8.1)** — v4 deadlocks in-browser. → `docs/reference/multimodal-ocr-audio.md`
- **True English study mode (v34):** **`card.m` = target word being learned, `card.e` = L1 gloss**, per-card `lang` `'ms'｜'en'`. **Malay & English decks NEVER mix in one session** (`cardsForLang`); `localeFor(lang)` is the single TTS/STT locale source; card-creation gloss direction follows `glossPlanFor(studyLang)`. → `docs/reference/english-study-mode.md`
- **Routing:** 21 routes in `src/App.jsx`; every page except Dashboard is `lazyWithRetry()`-imported — NOT bare `React.lazy` — never add an eager page import. Per-route SEO `<head>`, `robots.txt` and `sitemap.xml` are generated at build — **not committed; don't re-add static ones to `public/`**. → `docs/reference/app-overview.md`

### Styling

- **Tailwind CSS 4** for layout/spacing — configured via `@tailwindcss/vite` plugin (no `tailwind.config.js`).
- **CSS custom properties** in `src/index.css` via `@theme` block for all colors (`--color-bg`, `--color-accent`, `--color-card`, etc.).
- **Always use** `var(--color-*)` for colors via inline `style` props. Never hardcode hex values. **Tints** are `color-mix(in srgb, var(--color-X) N%, transparent)`, never an `rgba()` literal (a literal can't follow the light/high-contrast themes) — pinned with gradient-text + white-label bans by `src/lib/__tests__/designTells.test.js`. Palette rationale (teal accent kept off the feedback hues; no violet): `PRODUCT.md` + the comment above `@theme` in `src/index.css`.
- **Labels on colored fills use `var(--color-on-bright)`** — never `text-black`/`'#000'` on a `--color-*` background (P2-U1, 2026-06-13). It's black in dark mode, white in light mode, where the accent palette darkens to meet WCAG 4.5:1 (the `.light` block carries its own tuned values with ratio comments).
- Light mode: `.light` class on root div toggles CSS overrides — it re-tunes the WHOLE accent palette, not just surfaces; new colors must get a light-mode value that passes 4.5:1 as text on `--color-card2`.

## Critical Conventions

- **Feature preservation**: Each page file (especially `Study.jsx`, `Dashboard.jsx`, `CikguBot.jsx`) contains complex state machines with many modes. Always read the full file before editing. Partial rewrites cause regressions.
- **React 19 purity**: Don't call `Date.now()` directly in render or useState initializers — wrap in arrow functions. React 19 strict mode flags impure components.
- **Speech API**: Always check `hasSpeechRecognition()` / `hasSpeechSynthesis()` before use. Use `ms-MY` locale for Malay TTS/STT.
- **Dictionary format — a flat STRING map, not objects**: `src/data/dictionary.js` is `{ 'abad': 'century', … }` (825 entries; `d['abad']` is the gloss string itself — `d['abad'].e` is `undefined`). **Values staying strings is a load-bearing invariant**, pinned by `dictionary.test.js` / `contentLint.test.js` / `listeningMistakes.test.js`. Example sentences live in the **parallel** map `src/data/dictionaryExamples.js` (`getExample(word) => string|null`), never inline — that split is what lets examples grow without touching the shape. Two derived files must be regenerated in lock-step when `dictionary.js` changes: `dictionaryEn.js` (`npm run build:en-dict`, generated — never hand-edit) and, for a new headword, `dictionaryIcons.js`. Fixing a wrong *gloss* is allowed and expected — pin it with a content-truth test (see the `ijazah` / `mi` / `masak` precedents in `dictionary.test.js`); changing the *shape* is not.
- **Grammar drill IDs**: Format is `{type}-{index}` (e.g., `imbuhan-3`, `tense-7`). Used as keys in `grammarCards` store object.
- **OpenRouter models rotate — discover, never hardcode slugs**: free model IDs are retired every few months. `src/lib/openrouter.js` discovers them at runtime (`getFreeModels`, 24h cache) with `FALLBACK_FREE_MODELS` as a backstop. Never bake a model slug into a feature.
- **Drill feedback must announce**: any new study mode / drill surface renders a `<FeedbackLive text={...}>` (polite live region, `src/components/FeedbackLive.jsx`) carrying the same correct/incorrect text the eye sees — mounted unconditionally (empty until feedback), or SRs hear nothing. Interactive controls in header/toolbars/modals: ≥44×44px (pinned by `tests/e2e/a11y-tap-targets.spec.js`).
- **PDF reader** touch selection (hit-test, don't trust `e.target`) and keyboard layer (pure `readerKeymap.js` dispatcher): `.claude/rules/pdf-reader.md` — auto-loads with the reader files.

## Verification

After any significant edit:
1. `npm run build` — zero errors. **Per-route PAGE chunks** (the cost paid on navigation) should each be <70 KB raw — known exceptions `PDFReader` and `CikguBot`; shared/on-demand helper chunks are exempt. **Before adding anything to the eager `index-*.js` path, re-measure and say what moved it** (`ANALYZE=true npm run build` → `dist/stats.json`). Current sizes, exceptions, keep-lazy list and history: `docs/reference/bundle-budget.md`.
2. All 21 routes render without console errors
3. Dark and light themes both work
4. Zustand persistence survives page reload (latest `STORE_VERSION`)
5. No infinite re-render loops (check browser console for "Maximum update depth exceeded")
6. `npm run lint` — 0 errors. The 3 pre-existing exhaustive-deps warnings (in `RoleplayScorecard.jsx`, `Comprehension.jsx`, `Roleplay.jsx`) are tracked; don't introduce new ones. **jsx-a11y runs at `error`** (since 2026-09-25): fix the root (a clickable `div` → a real `<button>`); an exception is an `eslint-disable-next-line <rule> -- <reason>`, and `a11yExceptions.test.js` fails a disable with no reason.

The pre-commit quality gate runs items 1, 5, and 6 (build/lint/test) automatically on every commit — items 2-4 (visual/theme/persistence checks) still need a human eye for UI-affecting changes.

## E2E tests

Run with `npm run test:e2e` — never bare `npx playwright test` (the config lives in `tests/e2e/`, so a bare run misses its `baseURL` + `webServer` → "invalid URL"). Spec map, OCR timeouts, known-flaky specs: `tests/e2e/CLAUDE.md`.

**Port-squat trap:** the config reuses any server already on `:5173` (dev) or `:4173` (preview specs) outside CI — and other local projects often hold those ports. A blank app, or every store-binding spec failing identically, means Playwright is testing the WRONG app. `lsof -i :5173 -sTCP:LISTEN` (or `:4173`) first; run on a spare port instead of killing his server (the `:4173` squatter respawns anyway).

**Vite `?t=…` module-URL trap (READ BEFORE TOUCHING THESE TESTS):** in dev, `page.evaluate(() => import('/src/store/useStore.js'))` gets a DIFFERENT module instance than the one React subscribed to — Vite tags the React-side import with a `?t=<timestamp>` cache-buster. Mutating the detached instance updates store state but never triggers a React re-render, so toasts silently fail to appear and assertions read as code bugs. Work around by pulling the live URL from `performance.getEntriesByType('resource')` and dynamic-importing THAT URL (see `bindStore()` in `tests/e2e/mistake-promotion.spec.js`). The `bindStore` step is required after every `page.goto` / `page.reload` because navigation clears `window.__STORE`.

## Working agreement (short)

- **Surgical diffs, not rewrites.** Read the full file first; preserve existing code, comments, and modes. Partial rewrites of the big page files cause regressions (see Critical Conventions).
- **Context discipline.** For read-heavy investigation (tracing how a feature flows across many files), delegate to a subagent / Explore agent and have it report back a summary — keep the main session's context clean for implementation.
- **The lint/test/build gate is automated** (pre-commit) — fix failures at the root, don't bypass with `--no-verify` except in a real emergency.
- **Bilingual awareness.** Don't break MS/EN toggles or leak layout classes across languages.
- **Token-efficient output.** Keep working output lean to save cost: terse code comments, no redundant preamble or re-explanation, don't echo large file bodies (prefer diffs / `file:line` refs), and summarise subagent findings instead of pasting raw transcripts. This trims tokens but does NOT override the reply-quality rules — lead-with-outcome, numbered next steps with VERIFY, and jargon-defined-inline still stand.

## Strategic roadmap

Product direction (the "Zero-Waste Cognitive Engine" 5-phase plan) and the full agent-execution guidelines now live in **`docs/PROJECT_VISION.md`** — read it when planning features, not on every edit.
