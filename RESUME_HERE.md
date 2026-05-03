# Resume here

If a Claude session ran out of context or hit usage limits, paste this
into a fresh Claude Code session in the same repo to continue.

## Current state

- **Branch:** `feat/pdf-translator-writing-upgrade`
- **Phase A (PDF Reader / translator router / writing grader / Gemini
  tutor):** SHIPPED on this branch. See
  `docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md`.
- **Two recent bug fixes:** Study flashcard skip; Word Families plus
  button feedback.

## What you might ask Claude to do next

```
Please continue work on the IGCSE Malay app on branch
feat/pdf-translator-writing-upgrade.

Phase A is shipped — read
docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md to
get up to speed.

Next available tasks (pick whichever I ask for):

1. Test Phase A end-to-end. Spin up `npm run dev`, walk through
   Import (paste + PDF), PDF Reader (translate / select / batch),
   Writing (auto-detect + general + every format), Settings pickers.
   Report bugs as a numbered list.

2. Phase B kickoff. Create the `upg-igcse-malay-master` fork:
   `cp -r . ../upg-igcse-malay-master && cd ../upg-igcse-malay-master`,
   then add the Supabase-backed cloud translation cache, cloud writing
   history, and cloud card sync. Plan saved at
   docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md
   bottom section.

3. PRD remainders not yet covered: PWA / service worker, telemetry, AI
   speaking grader. Triage which is most useful and start the smallest
   one first.

4. Lint cleanup. `npm run lint` shows ~150 pre-existing errors — most
   in dictionary.js (duplicate keys), Comprehension.jsx, fsrs.js,
   Writing.jsx. None block the build. Sweep and fix.
```

## API keys to set in `.env.local` before testing

- `VITE_GOOGLE_TRANSLATE_KEY` — Google Cloud Translation v2.
  **Restrict to Cloud Translation API + your domain.**
- `VITE_DEEPL_KEY` — DeepL Free or Pro. (DeepL doesn't support Malay,
  so the router falls through to Google for `ms`.)
- `VITE_GEMINI_KEY` — Gemini 2.0 Flash, free tier.
  **Restrict to Generative Language API.**
- `VITE_OPENROUTER_KEY` — optional, for free Llama / DeepSeek.

## Notes the next agent should know

- Store version bumped to **v8**. Migration preserves all v7 data.
- Never call store getters inside Zustand selectors (per CLAUDE.md).
- Always verify with `npm run build` after each meaningful edit.
- Always use `var(--color-*)` for colors — never raw hex.
