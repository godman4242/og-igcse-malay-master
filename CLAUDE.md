# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IGCSE Malay Master** ("ooga da boogadamalay") — a React SPA for IGCSE Malay AND English language learning (0546 / 0500 / 0510). Features: FSRS-4.5 spaced repetition, 6 study modes, AI roleplay with scoring (bilingual), expert-system grammar tutor (Cikgu Maya), reading comprehension, IGCSE Paper 4 listening practice, interactive bilingual grammar drills, writing analysis (21 IGCSE formats with band-6 exemplars), pronunciation practice via Web Speech API, word family explorer, universal mistake journal with auto-promotion to FSRS cards, exam countdown planner, and a 30-min spaced exam rehearsal mode with composite Readiness %. All state persists locally via Zustand + localStorage with optional Supabase cloud sync.

## Commands

```bash
npm run dev       # Vite dev server on :5173
npm run build     # Production build → /dist
npm run preview   # Preview production build
npm run lint      # ESLint
```

No test framework is configured. Verify changes with `npm run build` (zero errors required).

## Architecture

**Stack:** React 19, React Router v7, Zustand 5 (persisted), Tailwind CSS 4 (via `@tailwindcss/vite` plugin), Vite 8, ts-fsrs (spaced repetition), Supabase 2 (optional cloud sync), Web Speech API.

### State Management

Single Zustand store at `src/store/useStore.js` (STORE_VERSION = 12). Persisted to localStorage under key `igcse-malay-store`. Contains:
- Cards deck with FSRS scheduling fields (`due`, `stability`, `difficulty`, `state`, `lapses`)
- Grammar SRS state (`grammarCards` — keyed by drill ID)
- AI state (`ai.dailyCalls`, `ai.roleplayHistory`, `ai.cikguHistory`)
- Engagement layer (streaks, freezes, XP, daily challenges)
- Metacognitive tracking (`confidenceLog`, `mistakeReasons`, `sessionFeedback`, `reflections`)
- Identity & motivation (`identity.label`, `identity.idealSelf`, `identity.cue`, `lastSessionAt`)
- Offline sync queue (`sync.queue`, `sync.syncStatus`)
- **Mistake pipeline (v11)** — `mistakes` array with rich records: `{ id, ts, type, source, language, category, severity, word, given, correct, surface, correction, note, promotedCardId, attempts, reviewed, lastReviewedAt, _k }`. Categories: vocab / imbuhan / tense / spelling / cohesion / register / pronunciation / comprehension / fluency / other. `addMistake` dedupes by content hash within 24h, escalates severity on repeat hits, and auto-promotes vocab/imbuhan mistakes (Malay-language only) to FSRS cards in a 'Mistakes' deck. `promoteMistakeToCard` is also exposed for manual promotion. `getFixUpQueue(limit)` returns the highest-priority unfixed mistakes.
- **Exam rehearsal (v12)** — `examAttempts` array (capped at 50) of `{ id, ts, passageId, lang, comprehensionPct, writingBand, speakingBand, readinessScore, durationSec }`. `getExamReadiness()` returns smoothed readiness %; `getNextExamDue()` returns FSRS-shaped 3-30 day schedule.
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

### Spaced Repetition

The app uses **FSRS-4.5** (via `ts-fsrs` library) in `src/lib/fsrs.js` — not SM-2. The legacy `src/lib/sm2.js` exists for reference but `fsrs.js` is the active algorithm. Cards are rated with `Rating.Again/Hard/Good/Easy`. FSRS manages `stability`, `difficulty`, `state` (New/Learning/Review/Relearning), and `due` dates.

### AI / Cikgu Maya Architecture

Three-tier fallback chain (cost-optimized):
1. **Expert system** (default, free): Rule-based knowledge in `src/data/cikguKnowledge.js` with fuzzy keyword search. Covers 20+ IGCSE grammar/vocabulary/exam topics.
2. **OpenRouter free models** (`src/lib/openrouter.js`): DeepSeek R1, Llama 4 Scout, Gemma 3. Requires `VITE_OPENROUTER_KEY`.
3. **Supabase Edge Function** (`src/lib/ai.js`): Claude API proxy with SSE streaming, circuit breaker (3 failures → 120s cooldown), 50 calls/day client-side rate limit.

Mock mode: `VITE_AI_MOCK=true` returns canned responses from `src/data/aiMocks.js`.

### Routing

15 routes defined in `src/App.jsx`, all wrapped in `<Layout>` (header + bottom nav), `<ErrorBoundary>`, and `<Suspense>` (every page except Dashboard is `React.lazy()`-imported, splitting the bundle):
`/` `/study` `/roleplay` `/grammar` `/writing` `/import` `/settings` `/mistakes` `/word-families` `/cikgu` `/comprehension` `/pdf-reader` `/speaking` `/exam-rehearsal` `/listening`

Bottom nav shows 4 primary items + "More" drawer (defined in `src/components/Layout.jsx`).

### Bilingual surfaces

Most learning surfaces are now bilingual with rubric-correct grading for both syllabuses:
- **Roleplay**: lang toggle on `Roleplay.jsx` swaps `SCENARIOS` (15 MS) ↔ `SCENARIOS_EN` (7 EN). Static-mode evaluator is Malay-only, so English scenarios surface AI-only with a friendly "AI quota exhausted" fallback.
- **Speaking**: lang toggle swaps Malay (`TOPICS`) ↔ English (`TOPICS_EN`) topic lists. Grader uses language-specific filler/marker/sophisticated-lexicon sets and separate AI system prompts.
- **Grammar**: 5 Malay tabs ↔ 7 English tabs. English tabs include Confusables, SVA, Articles drills not present in Malay.
- **Writing**: 21 IGCSE formats covered (10 EN + 11 MS) with hand-curated band-6 exemplar paragraphs in `src/data/exemplars.js`.
- **Comprehension**: passages and AI-generated questions both work in Malay and English.
- **Listening (Paper 4)**: 6 starter passages (3 EN, 3 MS), TTS-played with replay limit.

### Styling

- **Tailwind CSS 4** for layout/spacing — configured via `@tailwindcss/vite` plugin (no `tailwind.config.js`).
- **CSS custom properties** in `src/index.css` via `@theme` block for all colors (`--color-bg`, `--color-accent`, `--color-card`, etc.).
- **Always use** `var(--color-*)` for colors via inline `style` props. Never hardcode hex values.
- Light mode: `.light` class on root div toggles CSS overrides.
- 3D flashcard flip: CSS `perspective`, `preserve-3d`, `backface-hidden`, `rotate-y-180`.

## Critical Conventions

- **Feature preservation**: Each page file (especially `Study.jsx`, `Dashboard.jsx`, `CikguBot.jsx`) contains complex state machines with many modes. Always read the full file before editing. Partial rewrites cause regressions.
- **React 19 purity**: Don't call `Date.now()` directly in render or useState initializers — wrap in arrow functions. React 19 strict mode flags impure components.
- **Speech API**: Always check `hasSpeechRecognition()` / `hasSpeechSynthesis()` before use. Use `ms-MY` locale for Malay TTS/STT.
- **Dictionary format**: Entries in `src/data/dictionary.js` are `{ m, e, ex, box }` (Malay, English, example, SRS box).
- **Card format**: Cards in the store have dictionary fields plus FSRS fields (`due`, `stability`, `difficulty`, `state`, `lapses`, `reps`, etc.) and a topic tag `t`.
- **Grammar drill IDs**: Format is `{type}-{index}` (e.g., `imbuhan-3`, `tense-7`). Used as keys in `grammarCards` store object.

## Verification

After any significant edit:
1. `npm run build` — zero errors. Per-route chunks should each be <70 KB; pdfjs is its own ~330 KB chunk; `index-*.js` should be ~420 KB / ~128 KB gzipped.
2. All 15 routes render without console errors
3. Dark and light themes both work
4. Zustand persistence survives page reload (latest `STORE_VERSION`)
5. No infinite re-render loops (check browser console for "Maximum update depth exceeded")
6. `npm run lint` — 0 errors. The 2 pre-existing warnings in `MixedSession.jsx` and `Study.jsx` are tracked (exhaustive-deps); don't introduce new ones.

## Performance pitfalls to avoid

- **Don't allocate inside selectors**: `useStore(s => s.someArr ?? [])` allocates a new array every render and busts shallow equality. Use a module-level `const EMPTY_ARR = []` and a separate `useMemo` if you need a derived view.
- **Memo prop boundaries**: `React.memo(Component)` only helps if the props are referentially stable. If you pass an arrow callback (`onRetry={() => ...}`), the closure changes every render. Either use `useCallback` or pass primitives + a stable `navigate` so the component constructs the closure internally.
- **Code splitting is in App.jsx**: don't add eager imports for new pages. Wrap them in `lazy(() => import('./pages/X'))` and the existing `<Suspense>` will handle the fallback.

## The "ADHD-Optimized" Master Plan

To elevate this codebase to an enterprise-grade standard, pivot the UI/UX architecture to be highly ADHD-optimized (hyper-focus, dopamine rewards, frictionless starts, micro-chunking). Follow this 5-Phase Plan strictly:
1. **Architectural Detox:** Extract logic from massive files (`Study.jsx`, `Writing.jsx`) into custom hooks to support heavy UI animations.
2. **The "One-Button" Engine:** Redesign the Dashboard to eliminate decision paralysis with a "Smart Study" button that curates a multi-modal playlist.
3. **Hyper-Focus & Dopamine:** Use `framer-motion` for tactile micro-animations. Build a distraction-free "Theater Mode" for deep-work tasks.
4. **Visual Gamification:** Replace numerical timers with visual progress bars (combat time-blindness) and gamify the Mistake Journal.
5. **Resilience:** Maintain Vitest/Playwright algorithmic and E2E testing.
