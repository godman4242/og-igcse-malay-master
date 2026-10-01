# $250 cloud credit → the Malay app — the DRIVER session (Kheshav, 2026-09-30)

**What this is:** one local session on Kheshav's Mac that launches Claude Code **cloud** sessions (paid by the
$250 credit), re-checks every piece here, and is the ONLY thing that moves work to `main` (= the live site).
It never builds anything itself. Cloud rules: `docs/LOCAL_BUILD_LOOP.md` → "In a cloud session".

**Deadlines:** claim by **Oct 7, 11:59 pm PT** · the credit only works while the Claude subscription is live —
it ends **Oct 9** → last piece **Oct 8**. Unused credit is lost.

**Safety, already built + tested (2026-09-30):** in a cloud session `.githooks/pre-push` refuses any push but
`cloud-code` / `cloud-content` / `claude/…`, and `.githooks/post-commit` doesn't auto-push
(`src/config/__tests__/cloudGuard.test.js`, 13 tests, 2 chaos plants). `scripts/cloud/setup.sh` (SessionStart,
does nothing on the Mac) turns the commit gate on, installs deps, tries to install Chromium for the LOOK.

## The two lanes (at most ONE cloud session per lane at a time)

**CODE** — in this order:
1. ✅ **Pilot:** GOAL 🐛 #55 — promoted `d4665bd` 2026-09-30 (worker 4 min · 2798/0 · driver re-gate + LOOK + live smoke ✓).
2. **A6 Phase 1**, steps 1 → 2 → 3 (header with ← → and the page name · one search box · hubs). Spec: the
   "SPEC — A6 Phase 1" block near the top of `RESUME_HERE.md`. **Each step waits for Kheshav's "ok" on its
   Vercel preview before `main`.**
3. GOAL 🐛 #50, #51, #52, #53, #54, #56, #57, #58, #62.
4. GOAL #61 (word → family lookup + affix meanings — pure lib, no UI).
5. **A6 Phase 2**, two pieces, each waits for Kheshav's "ok": (a) combo A, the one word panel — meaning
   (read-only for now: editing meanings is Phase 3, local + gauntlet), family + what the affix does (#61),
   example, 🔊, add-to-deck — replacing the separate popovers; (b) the family chip on the flashcard's BACK
   (hidden for root words; tap → the panel; "Open the family tree"). Plan: `docs/plans/2026-09-29-connected-app.md`.
6. Credit left: combos B → D → H → G (their rows in the plan, incl. G's guard), each waits for "ok".

**Model A/B (decided 2026-10-01):** #50 and #51 run on `claude-sonnet-5-5` (half Opus 5.5's per-token price). If both pass
the driver's re-gate + review with no rework, the remaining small 🐛 items (#52–#54, #56, #57, #62) move to Sonnet 5.5;
A6 feature pieces, #58, #61, the CONTENT lane (Malay truth) and every review stay on `claude-opus-5-5`.

**CONTENT** — starts once the pilot passes: GOAL #59 (5 cycles × 25 example sentences) → #60 (7 cycles, one
file each). Touches only `src/data/**`, its tests and `docs/`.

**Stays LOCAL, never cloud:** A1 shared-device fix (needs two real sign-ins), Phase 3 edit-meanings (store/sync
→ 4-reviewer gauntlet), A2 Supabase, anything with `STORE_VERSION`, auth or sync.

## What $250 should buy (estimates — the pilot measures the real rate)
| | ≈ Cost | Anchor |
|---|---|---|
| Pilot | $3–5 | a loop fix cycle ≈ $2.20 at API prices (measured 2026-09-28) |
| Phase 1 (3 pieces) | $45–75 | an attended-size session ≈ $32 (measured 2026-09-29) |
| 🐛 #50–58 (8) | $25–40 | loop fix cycles |
| #61 | $5–10 | |
| Phase 2 (2 pieces) | $40–60 | |
| Content #59 + #60 (12) | $60–110 | web look-ups per word |
| Combos B/D/H/G | whatever is left | stop at < $15 |

## Paste this

**Before (once):** claim the credit — `/claim-credit` in Claude Code, or claude.ai/code · give the Claude GitHub
App access to `godman4242/og-igcse-malay-master` · no `build-loop.sh` running (either repo).
**Activate first:** Claude Code CLI in `og igcse malay master` · fresh session · `/model opus`, effort `medium`
(it orchestrates + re-checks) · `/fast` OFF · Vercel MCP on.

```
'''
You drive the Malay app's $250 cloud lanes. Read docs/sessions/2026-09-30-cloud-credit-driver.md, docs/LOCAL_BUILD_LOOP.md ("In a cloud session") and docs/loop/GOAL.md. You never edit src/ or tests/; cloud sessions build, you alone move pieces to main.
Setup once: git fetch && git worktree add --detach "../og malay cloud-driver" origin/main && (cd "../og malay cloud-driver" && npm ci). Re-gate ONLY in that folder — Kheshav may be working in this one.
Run the CODE and CONTENT queues from the driver doc, one cloud session per lane at a time. Per piece:
 1. Launch through the routine trig_012VqVoWzhD3sZZc4sregdmB ("Malay app — cloud worker") — NOT `claude --cloud`, which refuses to start without a terminal. RemoteTrigger `update` with the WHOLE job_config (environment_id env_015U6H4XaPkWd56vvWb3K8zC; session_context: model claude-opus-5-5, the repo as source, allowed_tools Bash/Read/Write/Edit/Glob/Grep/WebSearch/WebFetch; one user event with a fresh uuid) and run_once_at = now + 2 min UTC; keep mcp_connections empty. The event's prompt: "You are a cloud worker for the IGCSE Malay app. A driver session on Kheshav's Mac re-checks your work and is the ONLY one who moves anything to main (= the live site). Read docs/loop/GOAL.md FIRST, then docs/LOCAL_BUILD_LOOP.md including its 'In a cloud session' section. Do EXACTLY ONE cycle on: ITEM: <ITEM> LANE: <code|content>. Commit once. Then push: git push -f origin HEAD:refs/heads/cloud-<lane> — if that push is refused, push to refs/heads/claude/cloud-<lane> instead. Never push main. Then stop. Your final message must end with exactly one line: RESULT item=<ITEM> branch=<branch you pushed> sha=<commit sha> tests=<passed>/<failed> look=<on|off> — or, if you made no commit: RESULT item=<ITEM> NO-COMMIT reason=<one line>". Then list_runs → the session link; get_run_log reads its RESULT line.
 2. Wait for `git ls-remote origin refs/heads/cloud-<lane> refs/heads/claude/cloud-<lane>` to move (poll 60 s, 90-min cap; nothing after 45 min → get_run_log; a NO-COMMIT RESULT → read why, fix, relaunch once).
 3. Check: exactly ONE new commit whose parent is in origin/main · that commit is NOT already in origin/main (if it is, the push guard is off: STOP and tell me) · nothing under supabase/, no STORE_VERSION / AuthGuard.jsx / syncEngine.js / cloudSync.js change (high-risk → STOP) · a CONTENT piece touches only src/data/**, its tests, docs/.
 4. Re-gate in the driver folder: git checkout --detach origin/cloud-<lane> (or origin/claude/cloud-<lane>) · git rebase origin/main (conflict → abort, relaunch later) · npm run build && npm run test:run && npm run lint && node scripts/lint-content.mjs && npm run chaos:check — paste the totals. Anything that renders: npx vite preview --port 4299 --strictPort + node scripts/ui-smoke.mjs --base http://localhost:4299 --routes <touched> --out <your scratchpad>; open the screenshots. CONTENT: read every changed Malay line; tell me any you doubt.
 5. A6 pieces: send me the Vercel preview link (Vercel MCP list_deployments, branch cloud-code) and wait for my "ok"; keep the CONTENT lane going meanwhile.
 6. Promote: git push origin HEAD:main (rejected → fetch, rebase, re-gate once) · Vercel READY (MCP) · node scripts/ui-smoke.mjs --routes <touched> against production.
Stop when: I say the credit is under $15 · Oct 8, 22:30 KL · both queues are done · a red that one re-run doesn't clear · the same failure twice. Then: one docs-only commit (in this folder) with a ≤5-line summary at the top of RESUME_HERE.md's context blocks, and git worktree remove "../og malay cloud-driver".
Done = every promoted piece listed: item · main sha · tests passed/failed · Vercel READY · live smoke ✓ — and what's left in each queue.
'''
```

**VERIFY (plain English):** open the pilot's session URL once — its first lines say "cloud setup: commit gate + push
guard on …". Then `main` gets a new commit about the PDF error message ONLY after the driver's re-check, the session
printed its test totals with 0 failed, and the live site still loads.

**Measured 2026-09-30 (pilot, two runs):** `claude --cloud` refuses a non-terminal shell → the routine above.
The cloud VM: Node v22.22.2 · npm 10.9.7 · `CLAUDE_CODE_REMOTE=true` · the SessionStart hook ran (`core.hooksPath` =
`.githooks`). Run 1's `npm ci` failed and the worker correctly stopped with NO-COMMIT; run 2 installed 635 packages in
23 s → `setup.sh` now retries once and names npm's error. A routine `create` attaches EVERY claude.ai connector
(Drive, Calendar, Supabase…) — clear them. Run 3 did #55 in 4 min (red tests → fix → gate 2798/0 → pushed `cloud-code`,
which the cloud may push). The cloud has NO browser (`look=off`) → the driver's LOOK is the only one; force the error
state, not just the page (it caught GOAL #62). **Still unmeasured:** what one piece costs.
