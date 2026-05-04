# RESUME HERE — read this first

You are a fresh Claude Code session continuing prior work on the IGCSE
Malay Master app. The previous session ran out of context. Read this
doc end-to-end **before** opening any other file.

---

## 1. Where you are

```
/Users/kheshav/Kheshav/kheshav code/
├── og igcse malay master/        ← THIS repo. Static, free, client-only.
└── upg-igcse-malay-master/        ← Phase B fork. Adds Supabase cloud sync.
```

Both are git repos. **They share history up to commit `4526886`, then
diverge.** Do not auto-merge them. The user maintains both.

You are most likely in the **og** repo. Confirm with:
```bash
pwd && git remote -v
```

## 2. Current branch & status (og repo)

- **Branch:** `feat/pdf-translator-writing-upgrade` (local) — pushed to
  `origin/feat/pdf-translator-writing-upgrade-og` (suffix `-og` to avoid
  clobbering the upg-flavored remote branch). PR #1 is open against main.
- **Build:** clean. `npm run build` passes.
- **Lint:** `npm run lint` shows 0 errors + 2 pre-existing dep warnings.
  Down from 157.
- **Working tree:** should be clean. `git status` to confirm.

## 3. What is DONE — do NOT redo

Bug fixes:
- ✅ Study flashcard skip (queue snapshot in `src/pages/Study.jsx:148-160`)
- ✅ Word Families plus button now flips to checkmark when added
   (`src/components/WordFamilyCard.jsx`)

Phase A features (all wired, all building):
- ✅ Translation router — `src/lib/translate.js` chooses DeepL → Google
   Cloud → free `gtx`. Provider files in `src/lib/translate/providers/`.
   IndexedDB cache in `src/lib/translationCache.js`.
- ✅ PDF Reader at `/pdf-reader` — drop PDF, click=translate word,
   right-drag=phrase, Select mode for deck building. PDF extraction in
   `src/lib/pdf.js` (pdfjs-dist v4 with paragraph clustering).
- ✅ Import page tabs — paste / PDF upload, sticky result panels.
- ✅ Writing grader — `src/lib/writingGrader.js`. 21 IGCSE formats
   (English + Malay). Auto-detect + general mode.
- ✅ Writing Tutor — `src/components/WritingTutor.jsx`, Gemini Flash with
   format-aware system prompt, follow-up Q&A.
- ✅ Speaking page at `/speaking` — `src/pages/Speaking.jsx`,
   `src/lib/speakingGrader.js`, `src/data/speakingTopics.js`. 10 topics,
   Web Speech API recording, heuristic + Gemini AI grading, persisted
   session history with last-band pills.
- ✅ Cikgu Maya prefers Gemini over OpenRouter (`src/pages/CikguBot.jsx`).
- ✅ Settings → "Translation & AI" section: provider radio, comparison
   link toggle, cache size + clear, tutor model picker, auto-detect toggle.
- ✅ Store v8 migration. New slices: `translation`, `writingTutor`,
   `writingHistory`, `speakingHistory`, `pdfRecents`. v7 → v8 migration
   preserves existing data.
- ✅ Lint sweep — 14 dictionary duplicate keys removed, unused vars
   dropped across 7 files, eslint config now ignores `igcse-malay-master/`
   (old nested clone) and `scripts/`.

Phase A plan: `docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md`

## 4. What is NOT done — open work

| #   | Task                                  | Where to start                                             |
| --- | ------------------------------------- | ---------------------------------------------------------- |
| 1   | ✅ Open the PR for Phase A            | DONE. PR #1 open against main from `feat/pdf-translator-writing-upgrade-og`. |
| 2   | Reconcile og ↔ upg divergence         | upg has its own speaking grader + Supabase. See §6 below.  |
| 3   | Telemetry / analytics integration     | PRD Phase 2 item. PostHog or Plausible. Never started.     |
| 4   | ✅ Fix `RoleplaySession.jsx:26` setState | DONE. Opening message now in `useState` initializer.    |
| 5   | Add more IGCSE speaking topics        | `src/data/speakingTopics.js` currently has 10.             |

**There is no PRD item left unaddressed except telemetry.** Everything
the user asked for in earlier prompts (PDF, translators, DeepL compare,
auto-format, Gemini tutor, speaking grader) ships on this branch.

## 5. Conventions you MUST follow

From `CLAUDE.md`:

1. **Never call store getters inside Zustand selectors:**
   ```js
   // WRONG — infinite loop
   const streak = useStore(s => s.getStreak())
   // CORRECT
   const getStreak = useStore(s => s.getStreak)
   const streak = getStreak()
   ```
2. **Always use `var(--color-*)` for colors** — never raw hex.
3. **Verify with `npm run build`** after every meaningful edit. Zero
   errors required.
4. **Read full files before editing** — pages like `Study.jsx`,
   `Dashboard.jsx`, `CikguBot.jsx` are complex state machines with many
   modes. Partial rewrites cause regressions.
5. **No `Date.now()` in render or useState initializers** — wrap in arrow
   functions for React 19 strict mode.
6. **Commit frequently** — the user has hit usage limits. Save progress
   in small commits so a follow-up session can pick up cleanly.

## 6. The og ↔ upg divergence

The `upg-igcse-malay-master/` fork has these commits *not* in og:
- `5cd7e5c feat: add Supabase cloud sync foundation`
- `57a213f feat: add speaking grader and completion handoff`

The og repo has these commits *not* in upg (everything after `4526886`):
- `f5b90ad fix(study, word-families)` — bug fixes
- `5f5a4c5 feat(speaking): IGCSE Paper 3 speaking grader with Gemini AI`
- `4917a74 feat(cikgu): try Gemini Flash first in Cikgu Maya AI mode`
- `4129728 feat(speaking): persist session history + show last-band per topic`
- `ab60624 docs: refresh RESUME_HERE`
- `4de2b88 chore(lint): fix 154 pre-existing errors`
- (and this commit you are reading)

**They have two different speaking grader implementations.** Don't merge
blindly. When the user asks about reconciliation, ask:
- Should og become read-only "static demo" and upg be the active dev branch?
- Or should the Supabase work get pulled into og behind a feature flag
  (`if (VITE_SUPABASE_URL) ...`) so there's one codebase?

## 7. Env keys (for `.env.local` — already in `.gitignore`)

```
VITE_GOOGLE_TRANSLATE_KEY=...   # Restrict to Cloud Translation API + your domain
VITE_DEEPL_KEY=...              # Optional. DeepL doesn't support Malay.
VITE_GEMINI_KEY=...             # Powers writing tutor, speaking AI, Cikgu.
VITE_OPENROUTER_KEY=...         # Optional fallback for Cikgu.
```

⚠️ All `VITE_*` are inlined into the bundle. Restrict each key in its
provider's console.

## 8. Suggested first prompt for the new chat

Paste this verbatim:

> Read `RESUME_HERE.md` end-to-end before doing anything else. Then run
> `git status`, `git log --oneline main..HEAD`, and `npm run build` so
> you confirm the working state matches what the doc says. Wait for me
> to tell you which of the §4 open items to tackle. Do not start work
> until I pick one.

## 9. If the user is unsure what to do next

Recommend in this order:
1. **Smoke-test on the live dev server** — `npm run dev`, walk through
   `/pdf-reader`, `/speaking`, `/writing` with auto-detect, `/import`
   with a long paste, `/cikgu` AI mode. Report any visible bugs as a
   numbered list with `file:line` refs.
2. **Open the Phase A PR.** Branch is shippable.
3. **Decide og ↔ upg reconciliation** before doing more feature work,
   so the next agent isn't building into a fork that's about to be
   archived.
