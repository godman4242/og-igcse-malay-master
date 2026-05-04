# Resume here — Static (og) repo

Paste this into a fresh Claude Code session in this repo to continue.

## Repository topology

There are **two parallel repos** in this workspace:

| Repo                                                            | Purpose                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `/Users/kheshav/Kheshav/kheshav code/og igcse malay master/`    | **THIS repo.** Static, free, client-only. No Supabase dependency.    |
| `/Users/kheshav/Kheshav/kheshav code/upg-igcse-malay-master/`   | **Phase B fork.** Adds Supabase cloud sync, has its own git history. |

The two repos share Phase A history up to commit `4526886`, then diverge.
Don't try to merge them — they're maintained separately.

## State of THIS repo (og — static) as of 2026-05-04

- **Branch:** `feat/pdf-translator-writing-upgrade` (14 commits ahead of `main`)
- **Build:** clean. `npm run build` passes.
- **Lint:** 1 architectural error + 2 dep warnings remain. Down from 157.

### Shipped on this branch

- ✅ **Bug fixes:** Study flashcard skip; Word Families plus-button feedback.
- ✅ **PDF Reader** at `/pdf-reader`: drop a PDF, click words to translate,
   right-drag for phrase, Select mode for deck building.
- ✅ **Import page**: PDF upload tab; sticky result panels.
- ✅ **Translation router**: DeepL → Google Cloud → free `gtx` fallback,
   IndexedDB cache, comparison links.
- ✅ **Writing grader**: 21 IGCSE formats (English + Malay), auto-detect,
   "general" mode, format-fidelity panel.
- ✅ **Writing Tutor**: Gemini Flash with format-aware system prompt,
   follow-up Q&A.
- ✅ **Speaking page** at `/speaking`: 10 IGCSE Paper 3 topics, live
   transcript, heuristic + Gemini AI grading, persisted session history.
- ✅ **Cikgu Maya** prefers Gemini over OpenRouter when key is set.
- ✅ **Settings**: translator picker, tutor picker, cache size + clear.
- ✅ **PWA**: pre-existing manifest + service worker still works.
- ✅ **Lint sweep**: 157 → 3 errors (the rest were pre-existing).

### Genuinely unfinished

| Item                              | Where                                                |
| --------------------------------- | ---------------------------------------------------- |
| Telemetry / analytics integration | PRD Phase 2 — never started.                         |
| Merge Phase A → main + open PR    | Branch is shippable; user just hasn't merged it.     |
| Decide upg-fork merge strategy    | upg has its own speaking grader; resolve divergence. |

The setState-in-effect lint error in `RoleplaySession.jsx:26` is real but
architectural — fixing it requires moving the opening-message setup out of
useEffect, which changes timing semantics. Left as-is intentionally.

## API keys to set in `.env.local`

```
VITE_GOOGLE_TRANSLATE_KEY=...   # Restrict to Cloud Translation API + your domain
VITE_DEEPL_KEY=...              # Optional. DeepL doesn't support Malay; falls through to Google.
VITE_GEMINI_KEY=...             # Powers writing tutor, speaking AI grader, Cikgu Maya.
VITE_OPENROUTER_KEY=...         # Optional fallback for Cikgu Maya.
```

⚠️ All `VITE_*` keys are inlined into the production bundle. Restrict each
one in its provider's console.

## Conventions a new agent must know

- Store version is **v8**. Migration in `src/store/useStore.js` preserves
  all v7 data. New v8 slices: `translation`, `writingTutor`,
  `writingHistory`, `speakingHistory`, `pdfRecents`.
- Never call store getters inside Zustand selectors (per CLAUDE.md):
  ```js
  // WRONG — infinite loop
  const streak = useStore(s => s.getStreak())
  // CORRECT
  const getStreak = useStore(s => s.getStreak)
  const streak = getStreak()
  ```
- Always verify with `npm run build` after each meaningful edit.
- Always use `var(--color-*)` for colors — never raw hex.
- New page routes: `/pdf-reader`, `/speaking`. Both wired into the More
  menu in `src/components/Layout.jsx`.
- ESLint ignores `igcse-malay-master/` (old nested clone) and `scripts/`.

## What you might ask Claude to do next

```
Pick whichever I ask for:

1. End-to-end smoke test. Spin up `npm run dev`, walk through every
   route, report bugs as a numbered list with file:line refs.

2. Open the PR for Phase A. Branch is feat/pdf-translator-writing-upgrade,
   14 commits, clean build. PR title suggestion: "Phase A: PDF Reader,
   pluggable translators, writing grader, Speaking grader, Gemini tutor".

3. Resolve the og <-> upg divergence. Decide whether og is now obsolete
   and the upg fork is the canonical version, or whether og should pull
   in the Supabase scaffolding behind a feature flag.

4. Add more IGCSE Paper 3 speaking topics in src/data/speakingTopics.js
   (currently 10).

5. Telemetry kickoff. PRD Phase 2 item — wire PostHog or Plausible.

6. Address the one remaining setState-in-effect lint error in
   RoleplaySession.jsx:26 by moving the opening message into useState
   initializer.
```

## Plan archive

Architectural notes for the work shipped on this branch:
`docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md`
