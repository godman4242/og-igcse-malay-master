# Build plan — Mistake-journal micro-drills (2026-06-03)

Spec: `docs/superpowers/specs/2026-06-03-learning-roadmap-and-trackb.md` §2.
Read §2 first. This is rank #1 on the roadmap (highest Impact×Conf÷Effort).

## Pre-flight
1. Baseline: `git status` clean · `npm run test:run` (note the count) ·
   `npm run lint` (0 err) · prod READY.
2. Spec §2.6 decisions pre-defaulted: in-page `?drill` mode on `/mistakes`;
   recall-then-reveal with contrastive "your answer vs fix"; session size 12.
   Re-confirm with Kheshav only if deviating.

## Build order (TDD — pure logic first)
### Step 1 — pure `buildDrillPrompt(mistake)` (TDD)
- New `src/lib/mistakeDrill.js`: `buildDrillPrompt(mistake) →
  { question, answer, yourError }`.
  - vocab → `{ question: 'What does "{word}" mean?', answer: correct, yourError: given }`
  - imbuhan/tense/spelling/register/cohesion → `{ question: surface + ' — what's the
    fix?', answer: correction, yourError: given }`
  - missing-field fallbacks (no `correct`/`correction` → use `note` or skip).
- Tests `src/lib/__tests__/mistakeDrill.test.js`: one per category + fallback. RED→GREEN.

### Step 2 — the drill loop (UI; verify via e2e)
- Extend `src/pages/MistakeJournal.jsx` with a `?drill=1` mode (read via
  `useSearchParams`): `const queue = getFixUpQueue(12)`, step through with
  `buildDrillPrompt`, recall → reveal (show `answer` + contrastive `yourError`) →
  **Got it / Still shaky**.
  - Got it → `markMistakeReviewed(id)`. Still shaky → leave unreviewed (no re-log).
  - End card: "Fixed X of Y" + back link.
- Entry CTA: "Fix your mistakes (N)" on the journal (and optionally Dashboard) when
  `getMistakeStats().total > 0`.
- Mirror Study's reveal-rhythm UI feel + `var(--color-*)`; do NOT import FSRS — the
  `reviewed` flag is the state for these (non-promotable) categories.

### Step 3 — eyeball + e2e + ship
- `tests/e2e/mistake-micro-drills.spec.js`: seed 3 mistakes → drill → Got it drops
  `getMistakeStats().total`; Still shaky keeps it. Reuse `bindStore` (Vite `?t=`
  trap — rebind after each goto). Light + dark screenshots.
- Gates: build clean · lint 0 · test:run all · e2e green · eyeball both themes.
- Commit atomic + refresh `RESUME_HERE.md` same commit → auto-deploy → confirm
  Vercel READY (project `prj_WuRvwtonuh4XvdG42dIlTVLnd4Nn`, team
  `team_nmTUChWxLgUOQBpoiRKx0hZy`).

## Gotchas
- `getFixUpQueue` dedupes by `type::word` and filters `reviewed` — so a "Got it"
  naturally removes the item next render. Don't also splice it client-side (double
  removal bugs).
- Don't double-log: viewing a mistake in the drill must NOT `addMistake` again
  (dedupe would bump `attempts` and skew the queue ranking).

## Paste-ready kickoff
> Fresh Claude Code session on IGCSE Malay Master ("ooga da boogadamalay"),
> React/Vite SPA, live at https://upg-igcse-malay-master.vercel.app.
> READ FIRST: auto-memory MEMORY.md (esp. [[feedback_layman_explanations]],
> [[feedback_standing_commit_permission]], [[feedback_time_estimates_add]]),
> `RESUME_HERE.md` (top), then spec
> `docs/superpowers/specs/2026-06-03-learning-roadmap-and-trackb.md` §2 + this plan.
> TASK: build mistake-journal micro-drills — a focused recall+correction pass over
> `getFixUpQueue`, marking items reviewed. Follow the TDD order. It must NOT touch
> FSRS for these categories, and must NOT re-log mistakes on view.
> HOW I WORK: plain layman terms, assume I forget context, evaluate my choices &
> recommend better, short time estimate before non-trivial steps. Standing
> permission to stage/commit/sync atomic verified units; main auto-deploys, confirm
> READY after; refresh RESUME_HERE same commit.
> START: verify baseline → confirm spec §2.6 defaults with me (one AskUserQuestion,
> recommend them) → Step 1 (TDD `buildDrillPrompt`). Quality over speed.

## Plain-language version (for Kheshav)
1. New session, paste the prompt.
2. It checks everything still works.
3. It builds the "turn a logged mistake into a question" logic first, with tests.
4. It adds a "Fix your mistakes" button + a little drill: it asks you about each
   thing you got wrong, you try to answer, it shows the fix (and what you'd written).
5. "Got it" clears it; "still shaky" keeps it for next time.
6. Screenshots (light + dark), then commits + deploys + confirms live.
