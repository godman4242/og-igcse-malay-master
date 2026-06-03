# Build plan — Generative cloze from saved words (2026-06-03)

Spec: `docs/superpowers/specs/2026-06-03-learning-roadmap-and-trackb.md` §3.
Read §3 first. Rank #2. NOTE: a `cloze` variant ALREADY exists in
`src/data/drillVariants.js` + `ClozeMode` in `Study.jsx` — this feature is an
*enhancement + dedicated entry point*, not net-new. Reuse, don't reinvent.

## Pre-flight
1. Baseline: `git status` clean · `npm run test:run` (note count) · lint 0 · prod READY.
2. Spec §3.6 decisions pre-defaulted: Saved deck only (v1); card `ex` first with a
   produce-prompt fallback (AI sentences parked); YES it feeds FSRS (real cards).
   Re-confirm with Kheshav only if deviating.

## Build order (TDD — pure logic first)
### Step 1 — pure `makeClozeItem(card)` (TDD)
- New `src/lib/clozeBuilder.js`: `makeClozeItem(card) →
  { kind:'cloze', sentence, blankStart, blankEnd, answer, clue }` OR
  `{ kind:'produce', answer, clue }` fallback.
  - Locate `card.m` inside `card.ex` via `findSavedWordMatches(card.ex, [card.m])`
    (reuse `savedWordHighlight.js` — case-insensitive, phrase-aware).
  - Found → cloze with that span blanked, `clue = card.e`.
  - `ex` missing / equals the word / no match → `produce` fallback (clue = `card.e`).
- Tests `src/lib/__tests__/clozeBuilder.test.js`: word present → blanked sentence;
  absent → produce; `ex===m` → produce; multi-word phrase; case-insensitive.
  RED→GREEN.

### Step 2 — the produce session (UI; verify via e2e)
- New session surface (reuse Study's shell rhythm + `ClozeMode` rendering): pull
  `cards.filter(c => c.t === 'Saved')`, build items with `makeClozeItem`, learner
  types/recalls the Malay word → reveal (underline answer in sentence via
  `highlightTerm`) → **Got it / Reveal-needed**.
  - These ARE real FSRS cards → rate via `reviewCardAction(card.m, rating)`:
    Got it → `Rating.Good`, Reveal-needed → `Rating.Hard` (NOT `Again` — `Again`
    auto-logs a vocab mistake in the store, line 1036; a reveal shouldn't). Do NOT
    hand-roll scheduling.
  - `reviewCardAction` does NOT bump streak/minutes/XP itself. To make the session
    count toward the streak/daily-goal (spec §3.6 D4, default yes), call
    `updateStreak()` + `addStudyMinutes(n)` at session END, like Study does.
- Entry CTA: "Practise saved words" on the Practice hub / Dashboard / Saved deck,
  shown when the Saved deck is non-empty.

### Step 3 — eyeball + e2e + ship
- `tests/e2e/generative-cloze.spec.js`: seed 2 Saved cards (one with `ex`, one
  without) → cloze for the first, produce for the second → answer/reveal → "Got it"
  advances the card's FSRS `due`. `bindStore` (Vite `?t=` trap). Light + dark.
- Gates: build clean · lint 0 · test:run all · e2e green · eyeball both themes.
- Commit atomic + refresh `RESUME_HERE.md` same commit → auto-deploy → confirm
  Vercel READY (project `prj_WuRvwtonuh4XvdG42dIlTVLnd4Nn`, team
  `team_nmTUChWxLgUOQBpoiRKx0hZy`).

## Gotchas
- **This DOES feed FSRS** (opposite of the mistake micro-drills, which must not).
  Reuse the SAME review action Study uses so scheduling stays consistent — don't
  write a second rating path.
- Blank the RIGHT occurrence: a word can appear twice in `ex`; blank only the first
  match (the builder returns one span — keep it deterministic).
- Don't regress the existing `ClozeMode` in normal Study — reuse it read-only or
  factor a shared renderer surgically; eyeball Study cloze still works.

## Paste-ready kickoff
> Fresh Claude Code session on IGCSE Malay Master ("ooga da boogadamalay"),
> React/Vite SPA, live at https://upg-igcse-malay-master.vercel.app.
> READ FIRST: auto-memory MEMORY.md (esp. [[feedback_layman_explanations]],
> [[feedback_standing_commit_permission]], [[feedback_time_estimates_add]]),
> `RESUME_HERE.md` (top), then spec
> `docs/superpowers/specs/2026-06-03-learning-roadmap-and-trackb.md` §3 + this plan.
> TASK: build a "practise saved words" produce/cloze session — blank the saved word
> inside its own example sentence, learner produces it, rate via the EXISTING FSRS
> review action. A cloze variant already exists in drillVariants.js/ClozeMode —
> reuse it. Follow the TDD order.
> HOW I WORK: plain layman terms, assume I forget context, evaluate my choices &
> recommend better, short time estimate before non-trivial steps. Standing
> permission to stage/commit/sync atomic verified units; main auto-deploys, confirm
> READY after; refresh RESUME_HERE same commit.
> START: verify baseline → confirm spec §3.6 defaults with me (one AskUserQuestion,
> recommend them) → Step 1 (TDD `makeClozeItem`). Quality over speed.

## Plain-language version (for Kheshav)
1. New session, paste the prompt.
2. It checks everything still works.
3. It builds the "blank out the saved word in its sentence" logic first, with tests.
4. It adds a "Practise saved words" button + a little game: it shows the sentence
   with the word missing (and the English clue), you type the Malay word, it checks.
5. Because these are real flashcards, getting them right pushes them further out in
   your spaced-repetition schedule automatically.
6. Screenshots (light + dark), then commits + deploys + confirms live.
