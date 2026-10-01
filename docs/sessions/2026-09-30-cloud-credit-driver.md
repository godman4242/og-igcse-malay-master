# $250 cloud credit → the Malay app — the DRIVER session (Kheshav, 2026-09-30; rebuilt 2026-10-01)

**What this is:** the software factory. One local session on Kheshav's Mac (the **driver**) launches Claude Code
**cloud workers**, re-checks every piece here, and is the ONLY thing that moves work to `main` (= the live site).
It never edits `src/` or `tests/` itself. Worker rules: `docs/LOCAL_BUILD_LOOP.md` → "In a cloud session".

**Cost (Kheshav, 2026-10-01):** *"i am ok with the increase in cost … do it if quality or speed increases"* — so the
models below are picked for quality, then speed; the credit pays first, then plan usage.
**Deadlines:** claim by **Oct 7, 11:59 pm PT** · the credit only works while the Claude subscription is live — it
ends **Oct 9** → last piece **Oct 8** (unless Kheshav says the subscription continues).

**Safety, built + tested:** in the cloud `.githooks/pre-push` refuses any push but `claude/…` (and the old
`cloud-code`/`cloud-content`); `.githooks/post-commit` doesn't auto-push (`cloudGuard.test.js`, 15 tests, 2 chaos
plants). `scripts/cloud/setup.sh` (SessionStart, a no-op on the Mac) turns the commit gate on and installs deps
(one retry; names npm's error). `.claude/settings.json` `modelSettings` gives workers Kheshav's own effort levels.

## Three slots — at most ONE worker per slot at a time; every piece pushes its OWN branch `claude/<piece>`

A piece that builds on another launches only after that one is on `main`.

**FEATURES** — `claude-fable-5-1` (most capable; new UI and design). Each piece waits for Kheshav's "ok" on its
Vercel preview before `main`; while one waits, the slot takes the next piece that doesn't depend on it.
1. **A6 Phase 1**, steps 1 → 2 → 3 (header with ← → and the page name · one search box · hubs). Spec: the
   "SPEC — A6 Phase 1" block near the top of `RESUME_HERE.md`.
2. GOAL #61 (word → family lookup + affix meanings — pure lib, no UI, no "ok" needed). Can run while step 1 waits.
3. **A6 Phase 2**, after #61: (a) combo A, the one word panel — meaning (read-only: editing is Phase 3, local +
   gauntlet), family + what the affix does (#61), example, 🔊, add-to-deck — replacing the separate popovers;
   (b) the family chip on the flashcard's BACK (hidden for root words; tap → the panel; "Open the family tree").
   Plan: `docs/plans/2026-09-29-connected-app.md`.
4. Combos B → D → H → G (their rows in the plan, incl. G's guard).

**BUGS** — `claude-opus-5-5` (surgical, precision fixes — Kheshav's routing rule; Anthropic also notes Fable 5.1 is
likelier to rewrite a whole file, so every worker prompt carries Anthropic's one-line fix for that):
✅ #55 (pilot, `d4665bd`) · #50 · #51 · #52 · #53 (after #50 + #51 are on `main`; it's an e2e spec — the cloud has no
browser, so the driver runs it: `npm run test:e2e -- <spec>`) · #54 · #56 · #57 · #58 · #62.

**CONTENT** — `claude-fable-5-1` (Malay truth). GOAL #59 (5 cycles × 25 example sentences, one after another — they
share a file) → #60 (7 cycles, one file each). Touches only `src/data/**`, its tests and `docs/`.

**Stays LOCAL, never cloud:** A1 shared-device fix (needs two real sign-ins), Phase 3 edit-meanings (store/sync →
4-reviewer gauntlet), A2 Supabase, anything with `STORE_VERSION`, auth or sync.

## Paste this

**Before (once):** claim the credit — `/claim-credit` in Claude Code, or claude.ai/code · no `build-loop.sh`
running (either repo).
**Activate first:** Claude Code CLI in `og igcse malay master` · fresh session · `/model claude-fable-5-1` (effort
`high` comes from your settings) · Vercel MCP on.

```
'''
You are the driver of the Malay app's software factory. Read docs/sessions/2026-09-30-cloud-credit-driver.md (slots, models, queues), docs/LOCAL_BUILD_LOOP.md ("In a cloud session") and docs/loop/GOAL.md. Cloud workers build; you never edit src/ or tests/; you alone move pieces to main.
Setup once: [ -d "../og malay cloud-driver" ] || git worktree add --detach "../og malay cloud-driver" origin/main; then in it: git fetch && git checkout --detach origin/main && npm ci. Re-check ONLY in that folder — I may be working in this one.
Keep all three slots busy (FEATURES, BUGS, CONTENT; one worker each). Per piece:
 1. Launch: load RemoteTrigger (ToolSearch). `update` routine trig_012VqVoWzhD3sZZc4sregdmB with the WHOLE job_config — environment_id env_015U6H4XaPkWd56vvWb3K8zC; session_context {model: the slot's model, sources: [the repo], allowed_tools: Bash/Read/Write/Edit/Glob/Grep/WebSearch/WebFetch}; one user event, fresh uuid — then `run` it (fires now; the routine stays disabled, so it never fires by itself). All slots share this ONE routine — launch them one after another (update → run → next), never two updates before a run. Keep mcp_connections empty. Note the session_id. Never `claude --cloud` (it needs a terminal). The event's prompt: "You are a cloud worker for the IGCSE Malay app. A driver session on Kheshav's Mac re-checks your work and is the ONLY one who moves anything to main (= the live site). Read docs/loop/GOAL.md FIRST, then docs/LOCAL_BUILD_LOOP.md including its 'In a cloud session' section. Do EXACTLY ONE cycle on: ITEM: <the queue line + its spec pointer> LANE: <code|content>. The number of tokens used to edit files is best minimized, all else being equal. Therefore, when it will not affect the end result, try to surgically edit a file rather than rewrite the entire thing. Commit once, then git push -f origin HEAD:refs/heads/claude/<piece>. Never push main. Then stop. Your final message must end with exactly one line: RESULT item=<ITEM> branch=claude/<piece> sha=<commit sha> tests=<passed>/<failed> look=<on|off> — or, with no commit: RESULT item=<ITEM> NO-COMMIT reason=<one line>".
 2. Wait for `git ls-remote origin refs/heads/claude/<piece>` (poll 60 s; 90-min cap). get_run_log reads the RESULT line; NO-COMMIT → read why, fix the cause, relaunch once.
 3. Check: exactly ONE new commit whose parent is in origin/main · NOT already in origin/main (if it is, the guard is off: STOP, tell me) · nothing under supabase/, no STORE_VERSION / AuthGuard.jsx / syncEngine.js / cloudSync.js change (high-risk → STOP) · a CONTENT piece touches only src/data/**, its tests, docs/. Read the whole diff yourself — the worker's report is a claim, not evidence.
 4. Re-check in the driver folder: git checkout --detach origin/claude/<piece> · git rebase origin/main (a conflict ONLY in docs/loop/GOAL.md → keep every ✅ from both sides and continue; ONLY in chaos.config.json expectedTotal → set it to the real plant count, which chaos:check proves, and say so in the commit; any other conflict → abort and relaunch the piece on fresh main) · npm run build && npm run test:run && npm run lint && node scripts/lint-content.mjs && npm run chaos:check — paste the totals; for a file a chaos plant targets, node scripts/chaos/chaos.mjs <file> must go red. Anything that renders: npx vite preview --port 4299 --strictPort + node scripts/ui-smoke.mjs --base http://localhost:4299 --routes <touched> --out <your scratchpad>, then FORCE the changed state (an error, an empty list, a long word) with Playwright and open every screenshot. CONTENT: read every changed Malay line against a real source; anything you doubt is fixed or dropped, never shipped.
 5. FEATURES pieces: send me the Vercel preview link for claude/<piece> (Vercel MCP list_deployments) and wait for my "ok"; keep the other slots going meanwhile.
 6. Promote: git push origin HEAD:main (rejected → fetch, rebase, re-check once) · Vercel READY (MCP) · node scripts/ui-smoke.mjs --routes <touched> against production · git push origin --delete claude/<piece>.
When I ask for something new ("do X"): add it to docs/loop/GOAL.md with a measurable Done (a docs-only commit from fresh origin/main in the driver folder, pushed to main), then queue it in the right slot. Anything you find while checking goes in GOAL.md the same way.
Stop when: all three queues are done · Oct 8, 22:30 KL (unless I say the subscription continues) · a red that one re-run doesn't clear · the same failure twice. Then: one docs-only commit with a ≤5-line summary at the top of RESUME_HERE.md's context blocks, and git worktree remove "../og malay cloud-driver".
Done = every promoted piece listed: item · main sha · tests passed/failed · Vercel READY · live smoke ✓ — and what's left in each queue.
'''
```

**VERIFY (plain English):** within ~10 minutes you see three cloud session links (one per slot). Later, every
new commit on `main` came from a worker, was re-checked here (test totals with 0 failed), and the live site still
loads; each A6 piece reached `main` only after your "ok" on its preview link.

## Measured (2026-09-30 → 10-01)
- **Driver run 2026-10-01:** two parallel pieces that each add a chaos plant both raise `expectedTotal` from the same number —
  git merges the identical edit silently (one plant short) or conflicts on it; set it to the real count (rule above). Chain
  `git rebase … &&` before the gate: a conflicted rebase must stop it. PRPM (`prpm.dbp.gov.my`) is blocked from the cloud
  workers but reachable from the Mac — the driver settles their "unverified" Malay doubts there. Workers DO have a subagent
  tool (the content ones used a fresh reviewer).
- `claude --cloud` refuses a non-terminal shell → the routine. RemoteTrigger `run` fires at once, even while the
  routine is disabled; a `run_once_at` fire disables it again by itself. Env vars in `job_config` are dropped →
  effort comes from `.claude/settings.json` `modelSettings`.
- Cloud VM: Node v22, npm 10.9.7, `CLAUDE_CODE_REMOTE=true`, the SessionStart hook runs. `claude-opus-5-5` and
  `claude-fable-5-1` both run as workers. No browser (`look=off`) → the driver's LOOK is the only one; force the
  changed state, not just the page (that's how #62 was found).
- A routine `create` attaches EVERY claude.ai connector (Drive, Calendar, Supabase…) — keep them cleared.
- Pilot #55: worker 4 min (red tests → fix → gate 2798/0 → pushed) → driver re-check + LOOK + live smoke → `d4665bd`.
  **Still unmeasured:** what one piece costs.
