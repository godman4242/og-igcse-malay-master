# Resume here

If a Claude session ran out of context or hit usage limits, paste this
into a fresh Claude Code session in the same repo to continue.

## Current state (2026-05-04)

- **Branch:** `feat/pdf-translator-writing-upgrade`
- **Build:** clean. `npm run build` passes after every commit.
- **Phase A:** SHIPPED. PDF Reader, translator router, writing grader,
  Gemini tutor, Settings & AI section.
  See `docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md`.
- **Speaking grader:** SHIPPED. New `/speaking` page with Web Speech
  API recording, heuristic + Gemini AI grading, session history.
- **Cikgu Maya:** now tries Gemini Flash first when configured.
- **Two earlier bug fixes:** Study flashcard skip; Word Families plus
  button feedback (commits `f5b90ad`).

## What still hasn't been done

1. **Phase B Supabase fork** — separate `upg-igcse-malay-master` repo.
   Cloud translation cache (`translations` table), cloud writing /
   speaking history, cloud card sync. Detailed plan at the bottom of
   `docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md`.

2. **Lint cleanup.** `npm run lint` shows ~150 pre-existing errors —
   most in `src/data/dictionary.js` (duplicate keys), `Comprehension.jsx`,
   `fsrs.js`, `Writing.jsx`. None block the build, none introduced by
   recent work.

3. **Telemetry / analytics integration** (PRD Phase 2 item).

## What you might ask Claude to do next

```
Please continue work on the IGCSE Malay app on branch
feat/pdf-translator-writing-upgrade.

Read RESUME_HERE.md and
docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md
to get up to speed.

Pick whichever I ask for:

1. End-to-end smoke test. Spin up `npm run dev`, walk through every
   route, report bugs as a numbered list with file:line refs.

2. Phase B kickoff. Create the upg-igcse-malay-master fork (see plan
   doc bottom). Add Supabase auth, cloud translation cache, cloud
   speaking/writing history.

3. Lint sweep. Fix dictionary duplicates and pre-existing unused-var
   errors.

4. Topic expansion. Add more IGCSE Paper 3 speaking topics in
   src/data/speakingTopics.js (currently 10).

5. PR for Phase A. Merge feat/pdf-translator-writing-upgrade into
   main when ready.
```

## API keys to set in `.env.local` before testing

- `VITE_GOOGLE_TRANSLATE_KEY` — Google Cloud Translation v2.
  **Restrict to Cloud Translation API + your domain.**
- `VITE_DEEPL_KEY` — optional. (DeepL doesn't support Malay, so the
  router falls through to Google for `ms`.)
- `VITE_GEMINI_KEY` — Gemini 2.0 Flash. Powers the writing tutor,
  speaking AI grader, and Cikgu Maya AI mode.
  **Restrict to Generative Language API.**
- `VITE_OPENROUTER_KEY` — optional fallback for Cikgu Maya.

## Notes the next agent should know

- Store version is **v8**. Migration preserves all v7 data.
- New v8 slices: `translation`, `writingTutor`, `writingHistory`,
  `speakingHistory`, `pdfRecents`.
- Never call store getters inside Zustand selectors (per CLAUDE.md).
- Always verify with `npm run build` after each meaningful edit.
- Always use `var(--color-*)` for colors — never raw hex.
- New page routes: `/pdf-reader`, `/speaking`. Both wired into the
  More menu on `Layout.jsx`.
