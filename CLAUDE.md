# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IGCSE Malay Master** ("ooga da boogadamalay") — a web-based Malay language learning platform with spaced repetition (SM-2 algorithm), interactive study modes, pronunciation practice (Web Speech API), IGCSE roleplay scenarios, and grammar/writing exercises. All data is stored locally in localStorage via Zustand persistence.

## Commands

```bash
npm run dev       # Start dev server on :5173 (hot reload)
npm run build     # Production build → /dist
npm run preview   # Preview production build locally
npm run lint      # ESLint on all .js/.jsx files
```

There is no test framework configured.

## Architecture

**Stack:** React 19, React Router v7, Zustand 5 (localStorage persistence), Supabase 2, Tailwind CSS 4, Vite 8, Web Speech API (native browser).

**Structure:**
- `src/pages/` — One file per route/feature (Dashboard, Study, Roleplay, Grammar, Writing, Import, Settings). Each page is largely self-contained with internal React state for UI interactions.
- `src/store/useStore.js` — Single Zustand store (persisted to localStorage) holding card deck, user preferences, streak, and study session state. All cross-page state lives here.
- `src/lib/` — Pure utility functions: `sm2.js` (spaced repetition algorithm), `speech.js` (Web Speech API TTS/STT wrapper), `pronunciation.js` (scoring), `confetti.js`, `translate.js`.
- `src/data/` — Static JS objects: `dictionary.js` (495 Malay-English pairs), `topics.js`, `grammar.js`, `scenarios.js`, `writing.js`.
- `src/components/Layout.jsx` — Shared header + bottom nav wrapper.

**Styling:**
- Tailwind CSS 4 utility classes for layout/spacing.
- CSS custom properties defined in `src/index.css` via `@theme` for theming (`--color-bg`, `--color-accent`, etc.). Light mode overrides applied via `.light` class on root.
- Dynamic colors use inline `style={{ color: 'var(--color-accent)' }}` rather than Tailwind classes.
- 3D flashcard flip uses CSS `perspective`, `preserve-3d`, `backface-hidden`, `rotate-y-180` utilities.

**State flow:** User interaction → Zustand action → component re-renders via `useStore` hook. SM-2 review updates card intervals/ease factors in-place in the store.

**Study modes** (all in `Study.jsx`): flashcard, quiz, type-answer, listen, cloze, speak. Mode selection and session state managed via local component state; card progress persisted via store.

## Critical Conventions

- **Feature preservation**: When editing any page, always read the full file first. Never truncate or simplify existing features. Each page contains complex state machines — partial rewrites cause regressions.
- **Theme system**: Always use CSS custom properties (`var(--color-*)`) for colors, never hardcode hex values. Both dark and light modes must be supported.
- **No hardcoded text sizes**: Use Tailwind's responsive text utilities.
- **SM-2 integrity**: Never modify `src/lib/sm2.js` without understanding the full algorithm. Card intervals and ease factors are critical for learning effectiveness.
- **Dictionary format**: Each entry in `dictionary.js` is `{ m, e, ex, box }` where m=Malay, e=English, ex=example sentence, box=SRS box level.
- **Speech API**: Always check `hasSpeechRecognition()` / `hasSpeechSynthesis()` before using speech features. Use `ms-MY` locale for Malay.

## Verification Checklist

After any significant edit:
1. `npm run build` must pass with zero errors
2. Check that all 7 routes render (/, /study, /roleplay, /grammar, /writing, /import, /settings)
3. Verify dark and light themes both work
4. Test that Zustand persistence survives page reload
