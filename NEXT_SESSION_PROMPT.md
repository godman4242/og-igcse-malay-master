# Next session — paste-ready prompt

Open a fresh Claude Code session in this project and paste the block below verbatim.

---

```
Execute the plan at docs/2026-05-27-first-run-tour-plan.md using
superpowers:subagent-driven-development. Read the spec at
docs/2026-05-27-first-run-tour-design.md (v3) first.

Pre-flight before Task 1: verify every file path and line-number
reference in the plan against the current codebase. Specifically
check Dashboard.jsx line 240 still gates the guest banner, the
addCard / reviewCardAction signatures in useStore.js, Rating.Good
in ts-fsrs (should be 3), and TELEMETRY_KEY in src/lib/telemetry.js
(should be 'igcse-malay-telemetry'). Flag any drift. If the plan
has stale refs, fix the plan first and commit the doc fix as its
own commit, then proceed.

Between Task 3 (telemetry done, 5/5 e2e pass) and Task 4
(verification + docs), dispatch a code-reviewer subagent for an
independent pass on the full diff vs origin/main. Address any
high-confidence findings before running the gates in Task 4.

Before Task 4's final commits, manually run `npm run dev`, open
http://localhost:5173 in a real browser at iPhone-ish viewport
(390x844 via devtools), and visually confirm:
  - Empty-deck variant: 'Welcome — let's build your deck',
    'Add words →' button, single accent border on the left,
    sits above the guest banner.
  - Populated-deck variant: clear localStorage, addCard via the
    /import or /word-families UI, return to /, confirm the
    'Your first session is ready' headline + 'Start studying →'
    CTA renders.
  - Rate a card via /study → return to / → card is gone.
Screenshot any failure cases for the session doc.

Strict TDD red-then-green: observe every Playwright case fail
in Task 1 before any implementation lands. Do not skip
'see it fail first'.

Operational reminders (still in force per memory):
  - VS Code session → autonomous git/npm/playwright execution OK.
  - .githooks/pre-commit runs `git add -A`. Always `git status`
    first to confirm no junk is staged; stage explicit files by
    name (not `git add -A` / `git add .` directly).
  - .githooks/post-commit auto-pushes. `git push` returning
    'Everything up-to-date' right after a commit is normal.
  - Destructive ops still need confirmation.

When all four verification gates pass (lint, vitest, e2e, build)
and the docs (session note + RESUME_HERE refresh) are committed,
report back with the commit hashes and the actual final bundle
delta.

HEAD as of this handoff: 228dde1 (plan committed). Prior commits
on main: 087a82d (spec v3), 2ec998a (spec v2), 1398844 (spec v1),
7d719b6 (e2e harness), 88ed252 (MistakeToast centring fix).
```

---

## Why this prompt is structured this way

1. **Pre-flight verification** — catches drift between the plan and the codebase before any code lands. Cheap and catches bugs early.
2. **Subagent-driven execution** — fresh agent per task, two-stage review.
3. **code-reviewer subagent before verification gates** — third independent pass on the full diff. Catches what both subagent and I miss.
4. **Manual browser smoke** — automated e2e doesn't catch visual issues (alignment, contrast, real feel). 5 minutes of human eyes.
5. **Strict TDD discipline** — agents sometimes skip "see it fail" because they're confident. Forcing it catches false-positive tests.
6. **Operational reminders inline** — even with memory loaded, having these in the prompt makes them unmissable.
7. **HEAD pointer** — fresh session can `git log` to verify it's at the expected starting state.

## After execution succeeds

This file (`NEXT_SESSION_PROMPT.md`) can be deleted — it's a one-shot handoff, not a permanent doc.
