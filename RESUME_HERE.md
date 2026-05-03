# Resume here

If a Claude session ran out of context or hit usage limits, paste this
into a fresh Claude Code session in the same repo to continue.

## Current state

- **Branch:** `feat/pdf-translator-writing-upgrade`
- **Phase A (PDF Reader / translator router / writing grader / Gemini
  tutor):** SHIPPED on this branch. See
  `docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md`.
- **Phase B local implementation:** DONE in this upgraded fork. Includes
  Supabase cloud translation cache, cloud card sync, cloud writing history,
  cloud speaking history, and the new Speaking Grader route.
- **Two recent bug fixes:** Study flashcard skip; Word Families plus
  button feedback.
- **Latest local verification:** `npm run build` passes. Focused ESLint on
  touched files passes. Full `npm run lint` still fails on pre-existing
  generated/nested dist output, duplicate dictionary keys, and older lint debt.

## What you might ask Claude to do next

```
Please continue work on the IGCSE Malay app on branch
feat/pdf-translator-writing-upgrade.

Phase A is shipped — read
docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md to
get up to speed.

Next available tasks (pick whichever I ask for):

1. Live Phase B smoke test. Run `supabase/phase-b-cloud-sync.sql` in the
   live Supabase SQL editor, set `.env.local`, then test magic-link auth,
   cloud translation cache, cloud cards, cloud writing history, and cloud
   speaking history.

2. End-to-end app test. Spin up `npm run dev`, walk through Import,
   PDF Reader, Writing, Speaking Grader, Settings, and cloud sync surfaces.
   Report bugs as a numbered list and fix high-confidence regressions.

3. Learning improvement backlog. Start with a Dashboard widget for weakest
   speaking turn, per-scenario mastery bars, or an exam rehearsal mode that
   rotates reading + writing + speaking.

4. Lint cleanup. `npm run lint` shows pre-existing errors, including the
   nested `igcse-malay-master/dist`, duplicate keys in dictionary.js,
   Comprehension.jsx, fsrs.js, Writing.jsx, and older React 19 purity issues.
   None block the build. Sweep and fix in a separate commit.
```

## API keys to set in `.env.local` before testing

- `VITE_GOOGLE_TRANSLATE_KEY` — Google Cloud Translation v2.
  **Restrict to Cloud Translation API + your domain.**
- `VITE_DEEPL_KEY` — DeepL Free or Pro. (DeepL doesn't support Malay,
  so the router falls through to Google for `ms`.)
- `VITE_GEMINI_KEY` — Gemini 2.0 Flash, free tier.
  **Restrict to Generative Language API.**
- `VITE_OPENROUTER_KEY` — optional, for free Llama / DeepSeek.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` — required for live cloud sync.

## Notes the next agent should know

- Store version bumped to **v9**. Migration preserves all v7/v8 data.
- New route: `/speaking`. New files:
  `src/pages/Speaking.jsx`, `src/lib/speakingGrader.js`.
- New cloud file: `src/lib/cloudSync.js`.
- New SQL file: `supabase/phase-b-cloud-sync.sql`.
- PWA registration is production-only in `src/main.jsx`; localhost unregisters
  stale service workers via `index.html`.
- Never call store getters inside Zustand selectors (per CLAUDE.md).
- Always verify with `npm run build` after each meaningful edit.
- Always use `var(--color-*)` for colors — never raw hex.
