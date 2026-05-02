# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IGCSE Malay Master** ("ooga da boogadamalay") — a React SPA for IGCSE Malay language learning. Features: FSRS-4.5 spaced repetition, 6 study modes, AI roleplay with scoring, expert-system grammar tutor (Cikgu Maya), reading comprehension, interactive grammar drills, writing analysis, pronunciation practice via Web Speech API, word family explorer, mistake journal, and exam countdown planner. All state persists locally via Zustand + localStorage.

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

Single Zustand store at `src/store/useStore.js` (STORE_VERSION = 7). Persisted to localStorage under key `igcse-malay-store`. Contains:
- Cards deck with FSRS scheduling fields (`due`, `stability`, `difficulty`, `state`, `lapses`)
- Grammar SRS state (`grammarCards` — keyed by drill ID)
- AI state (`ai.dailyCalls`, `ai.roleplayHistory`, `ai.cikguHistory`)
- Engagement layer (streaks, freezes, XP, daily challenges)
- Metacognitive tracking (`confidenceLog`, `mistakeReasons`, `sessionFeedback`, `reflections`)
- Identity & motivation (`identity.label`, `identity.idealSelf`, `identity.cue`, `lastSessionAt`)
- Offline sync queue (`sync.queue`, `sync.syncStatus`)

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

12 routes defined in `src/App.jsx`, all wrapped in `<Layout>` (header + bottom nav) and `<ErrorBoundary>`:
`/` `/study` `/roleplay` `/grammar` `/writing` `/import` `/settings` `/mistakes` `/word-families` `/cikgu` `/comprehension`

Bottom nav shows 4 primary items + "More" drawer (defined in `src/components/Layout.jsx`).

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
1. `npm run build` — zero errors
2. All 12 routes render without console errors
3. Dark and light themes both work
4. Zustand persistence survives page reload
5. No infinite re-render loops (check browser console for "Maximum update depth exceeded")
