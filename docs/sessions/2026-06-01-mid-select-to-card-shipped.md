# Session handoff — 2026-06-01 (late): Speaking A+D + select-to-card shipped

Mid-session snapshot for a cold resume. **Nothing is half-built** — the working
tree is clean and everything below is committed + deployed. This doc is mostly
"what's next", not "what was done" (git log covers that).

## 1. Where we are

- **Branch:** `main` (and `feat/friction-polish` is fast-forwarded to match — both at HEAD).
- **HEAD:** `192326a` `feat(vocab): universal select→translate→add-to-cards (Tier-1 MVP)`
- **Working tree:** clean (all committed + auto-pushed).
- **Prod:** `main` @ `192326a`, Vercel deployment `dpl_DtfN6shUjrSPQAmTWru1Myg9BRvW`
  state **READY**, target production, live at https://upg-igcse-malay-master.vercel.app
- **Baseline at handoff:** 366 vitest pass (31 files) · 0 lint errors · 3 pre-existing
  warnings (Comprehension.jsx:44, Roleplay.jsx:24 exhaustive-deps + one more). Build clean (~426 KB index).

## 2. What shipped this session (all deployed)

1. **Speaking eyeball harness** (`86838b3`) — `tests/e2e/speaking-eyeball.spec.js`.
2. **Speaking record + playback** (Step 4 / A+D complete) (`9b2b8a4`) — `MediaRecorder`
   captures the spoken answer in parallel with STT; RESULTS gains a "Listen back" card
   (replay yourself + "Play model" TTS). Works with zero transcription. New
   `src/lib/audioRecorder.js` (pure `pickRecorderMimeType`, +5 tests).
3. **select→translate→add-to-cards (Tier-1 MVP)** (`192326a`) — select any word/phrase
   on a reading surface → popover translates (ms→en) + 🔊 + Save → `{m,e,ex,t:'Saved'}`
   card into the FSRS deck (deduped). `src/lib/selectionToCard.js` (pure, +9 tests) +
   `src/components/SelectionToCard.jsx` (mounted once in `Layout`). `translate.js`
   lazy-loaded on first selection. Proven end-to-end via `tests/e2e/select-to-card.spec.js` (4 tests).

**Speaking A+D is 4/4 COMPLETE.** Paid STT (Azure/Whisper) stays OUT (no budget) —
see `docs/superpowers/specs/2026-06-01-speaking-reliability-and-direction.md` §5a.

## 3. What's open / blocked (needs a decision or a check)

**Nothing is blocking.** These are the candidate next builds, prioritised:

- **(A) — RECOMMENDED, small) Verify "Saved" cards actually surface in Study, then add
  ms↔en auto-direction to the popover.** Two parts:
  - *Check first:* the popover saves cards under deck `t:'Saved'`. Confirm those cards
    appear in the Study queue / deck picker / Dashboard "due" counts. They're normal FSRS
    cards so they *should*, but the deck-filter UI may not list a new deck name — verify
    before assuming. If they don't surface, that's a real bug to fix (the feature is
    pointless if saved words never get reviewed).
  - *Then:* the popover currently always translates **ms→en** (`SelectionToCard.jsx`,
    the `loadTranslate().then(t => t('ms','en'))` call). On English surfaces a selected
    English word translates nonsensically. Add light language detection (or use the host
    page's lang toggle / a heuristic) to pick ms→en vs en→ms and set `m`/`e` accordingly.
- **(B) — bigger) select-to-card Tier 2: persistent cross-page highlights** via the CSS
  Custom Highlight API (design spec §8 of `2026-06-01-universal-select-to-card-design.md`).
  Own plan; ~bigger build.
- **(C) — user task, not Claude's)** Kheshav to test record+playback **with a different
  speaker** on a real device (his note). No code action unless it surfaces a bug.

**Open question for the user:** which of A / B do you want next? (A is the safer, higher-
ROI follow-up; do the "Saved surfaces in Study" check regardless — it's quick and
de-risks the feature just shipped.)

## 4. Verify before resuming

```bash
git log --oneline -5      # expect 192326a at HEAD (or newer if a commit landed)
git status --short        # expect clean
npm run test:run          # expect ~366 pass; compare to baseline in §1
npm run lint              # expect 0 errors, 3 warnings
```

If counts differ from §1, a commit landed in between — read `git log` to understand,
then proceed. Don't treat a single new commit as a stop-and-ask trigger.

## 5. Hard rules still in force (auto-memory)

- `[[feedback_no_auto_commit]]` — VS Code editor: run git/deploy/npm directly;
  Antigravity: paste-block only. Destructive ops still need confirmation.
- `[[project_git_autopush]]` — a postinstall hook auto-pushes; `git push` saying
  "Everything up-to-date" right after a fresh commit is NORMAL, not an error.
- `[[project_git_precommit_addall]]` — pre-commit runs `git add -A`; partial commits
  need `--no-verify`.
- `[[project_invariants]]` — no paywall, invite-only, individual-revision only, no
  native apps, Malay+English learning quality first.
- `[[feedback_time_estimates_add]]` — lead with a per-chunk time estimate; Kheshav has
  ADD + limited usage. Tell him token/time cost so he can budget.
- `[[feedback_handoff_docs]]` — refresh `RESUME_HERE.md` in the same commit as behaviour changes.
- `[[project_skills_triage]]` — consult before invoking any skill/agent.

## 6. Next-session prompt

```
You are a fresh Claude Code session continuing the IGCSE Malay Master app
("ooga da boogadamalay") — a React/Vite SPA for IGCSE Malay + English revision
(FSRS spaced repetition, AI roleplay, speaking, writing, grammar, reading).
Live: https://upg-igcse-malay-master.vercel.app. The last session shipped
Speaking record+playback and the universal select→translate→add-to-cards MVP —
both deployed. This session continues from there.

FIRST, audit your capabilities (don't skip):
1. Read project_skills_triage.md from auto-memory — green skills are your
   toolset, red are off-limits for this project. Read project_skills_inventory.md
   ONLY if the triage doesn't cover a capability you need.
2. Run `claude mcp list 2>&1 | head -20` once to confirm active MCPs match what
   the triage assumes (Vercel + context7 are the ones that matter here).

HARD RULES (auto-memory loads these via MEMORY.md — follow them):
- [[feedback_no_auto_commit]] — in VS Code run git/deploy/npm directly; commit
  ONLY when asked; destructive ops need confirmation.
- [[project_git_autopush]] — "Everything up-to-date" after a fresh commit is
  normal (a postinstall hook auto-pushes).
- [[project_git_precommit_addall]] — pre-commit does `git add -A`.
- [[project_invariants]] — no paywall, invite-only, individual revision only,
  Malay+English quality first.
- [[feedback_time_estimates_add]] — I have ADD + limited usage: lead with a
  time + token estimate before any non-trivial step so I can decide whether to
  run it. Keep responses concise + structured.

READ THESE, in order:
1. docs/sessions/2026-06-01-mid-select-to-card-shipped.md  (this handoff — §2 what
   shipped, §3 what's next + the open question)
2. docs/superpowers/specs/2026-06-01-universal-select-to-card-design.md  (§8 Tier 2)
   and docs/superpowers/plans/2026-06-01-universal-select-to-card.md
3. RESUME_HERE.md  (historical context; latest blocks are most relevant)

VERIFY state hasn't drifted (establish baseline, don't assert exact values):
  git log --oneline -5     # HEAD was 192326a at handoff
  git status --short        # was clean
  npm run test:run          # was 366 pass
  npm run lint              # was 0 errors, 3 warnings
At handoff: HEAD=192326a, 366 tests pass, 0 lint errors + 3 warnings, tree clean,
prod READY. If counts differ, a commit landed in between — read git log, then proceed.

THE WORK — do this in order:
1. Quick de-risk check (≈10 min): the select-to-card popover saves cards under
   deck t:'Saved' (see src/components/SelectionToCard.jsx `save()` + the
   addCard call). CONFIRM those cards actually surface for review — check the
   Study page deck/queue, the deck picker, and the Dashboard "due" counts.
   They're normal FSRS cards so they should appear, but a deck-filter UI may not
   list a brand-new deck name. If Saved words never reach the review queue, that's
   a real bug — fix it (the whole feature depends on it). Report what you find
   before building anything else.
2. THEN ask me which to build next (give a time + token estimate for each):
   (A) ms↔en auto-direction for the popover — right now SelectionToCard.jsx
       always translates ms→en, so selecting an English word on an English
       surface is nonsensical. Add language detection / use the page lang and set
       m/e accordingly. Small, TDD the detection in selectionToCard.js.
   (B) select-to-card Tier 2 — persistent cross-page highlights of saved words
       via the CSS Custom Highlight API (design spec §8). Bigger.
   Do NOT start B without my go (it's app-wide). A is safe to recommend.
3. Whatever we build: TDD pure logic first, surgical diffs, verify
   build+lint+test, eyeball light AND dark via a Playwright screenshot spec
   (pattern: tests/e2e/select-to-card.spec.js and speaking-eyeball.spec.js),
   atomic commits, refresh RESUME_HERE.md in the same commit. Deploy ONLY when I
   say so (merge to main → Vercel auto-deploys; verify READY via the Vercel MCP
   like prior sessions: project prj_WuRvwtonuh4XvdG42dIlTVLnd4Nn, team
   team_nmTUChWxLgUOQBpoiRKx0hZy).

Mindset: quality over speed, surgical diffs only, verify before claiming done,
and give me cost estimates so I can budget my usage.
```
