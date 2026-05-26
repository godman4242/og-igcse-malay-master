---
description: Snapshot the in-flight session state so the next session can resume cleanly. Use whenever usage is running low or before a long break.
---

# /handoff — mid-session resume snapshot

The user typed `/handoff $ARGUMENTS`. Treat the rest of this file as your
instruction set. Argument (optional) is a short slug describing what's
in flight (e.g. `adaptive-scaffolding-deploy`, `bug-tracing-roleplay`).

## Why this exists

Usage limits hit mid-task. When that happens we lose conversation
context but keep the file system. A clean handoff doc + a self-contained
next-session prompt = no restart cost.

## What to do, in order

### 1. Capture state fast — run these in parallel

```bash
git status --short
git log --oneline -5
npm run lint 2>&1 | tail -8
npm run test:run 2>&1 | tail -6
date "+%Y-%m-%d %H:%M"
# Inventory-drift check — see step 1b
claude mcp list 2>&1 | head -20
ls ~/.claude/plugins/cache/ 2>/dev/null
```

Don't run `npm run build` unless build state is genuinely uncertain — it
costs 5+ seconds and the test/lint pair is usually enough signal.

### 1b. Inventory-drift check

Compare the `claude mcp list` + `ls ~/.claude/plugins/cache/` output
against the "MCPs currently connected" + namespace headers in
`~/.claude/projects/-Users-kheshav-Kheshav-kheshav-code-og-igcse-malay-master/memory/project_skills_inventory.md`.

If a connected MCP or installed plugin is missing from the inventory,
add a `⚠ Inventory mismatch` block to the session doc listing the diff.
If the inventory references a plugin that no longer exists in the
cache dir, add it to the mismatch block too. Don't auto-correct the
inventory — surface the drift so the user decides whether to update it
(some plugins legitimately come and go).

### 2. Write the session doc

Path: `docs/sessions/{YYYY-MM-DD}-mid-{slug-or-task}.md`
(use the `$ARGUMENTS` slug, else infer from in-flight task list).

**Length budget: under 400 lines total, allocated per section.** When you
hit a budget, cut from the LOWEST section first, never from
"Next-session prompt" (section 6) or "What's in flight" (section 2).

| Section | Max lines | Notes |
|---|---|---|
| 1. Where we are | 20 | HEAD sha, branch, working-tree summary |
| 2. What's in flight | 100 | Task list with status, mid-air files with line numbers, decisions made this session |
| 3. What's blocked / open questions | 40 | What the next session needs to resolve or ask the user |
| 4. Verify before resuming | 30 | The exact commands to confirm state hasn't drifted since this snapshot |
| 5. Hard rules still in force | 20 | Link to relevant memory entries by name |
| 6. Next-session prompt | up to 180 | The fenced kickoff block the user pastes — protected; never cut |
| (Mismatch block, only if step 1b found drift) | 10 | Surface, don't fix |

### 3. WRITE the fenced next-session prompt INTO the session doc FIRST

This is the single most important deliverable. If your response gets
cut by a usage limit mid-output, the conversation copy of the prompt
never appears — exactly the failure mode this command exists to
survive. The disk copy is the resilient artifact. Write it as the LAST
section of the session doc on disk before you do anything else.

See "What the next-session prompt must contain" below for the structure.

### 4. Update RESUME_HERE.md banner

Replace the "LATEST SESSION" block with a pointer to this mid-session
doc. Use the same blockquote format as prior sessions in the file.

### 5. Echo the next-session prompt to the user

Print the same fenced block you wrote to disk in step 3 as the very
last thing in your response. Frame it: "**PASTE THIS to start next
session** — also saved to `docs/sessions/{...}.md` §6 in case the
response gets cut."

The disk copy is the truth; the conversation echo is a convenience.

## What the "next-session prompt" must contain

The next session starts cold. The prompt must include, in this order:

1. **One-paragraph context.** Project name, what's being worked on, why,
   the live URL (https://upg-igcse-malay-master.vercel.app).

2. **Capability self-audit instructions.** Tell future Claude to:
   - Read `project_skills_triage.md` from auto-memory FIRST — green
     skills are the toolset; red skills are off-limits for this
     project.
   - Read `project_skills_inventory.md` ONLY if the triage doesn't
     cover a capability you need to evaluate. The triage is the
     decision tool; the inventory is the fallback lookup.
   - Run `claude mcp list 2>&1 | head -20` once to confirm active MCPs
     match what the triage assumes.

3. **Hard project rules from auto-memory.** Link by name:
   `[[feedback_no_auto_commit]]`, `[[project_git_autopush]]`,
   `[[project_invariants]]`. Future Claude loads these automatically
   via MEMORY.md; listing them ensures the rules aren't overlooked.

4. **Read order for state files.**
   - The spec doc, if work was spec-driven (give the path)
   - This mid-session handoff doc (give the path)
   - `RESUME_HERE.md` for historical context

5. **Verification commands — establish baseline, don't assert exact values.**
   Format:
   ```bash
   git log --oneline -5      # confirm recent commits look familiar
   npm run test:run          # baseline pass count; compare to step-1 capture in this doc
   npm run lint              # 0 errors expected; warnings count noted below
   ```
   Then in prose: *"At handoff time the test count was N and lint had
   E errors + W warnings. If counts differ now, a commit landed
   in-between — review `git log` to understand, then proceed."*
   Don't hardcode the SHA or test count as an assertion — print them
   as captured snapshots so a single new commit doesn't trigger a
   false-alarm "stop and ask" cycle.

6. **The specific resume request.** Not "continue the work" — say
   "Continue from step 4 of the ship checklist. Files mid-air are
   `src/X.js:120` (added the function, need to wire it) and `Y.jsx:80`
   (TODO comment). Blocker is Z."

7. **Mindset reminder.** One sentence: "Quality over speed. The user is
   on Opus 4.7 for max judgment. Surgical diffs only. Verify before
   claiming done."

Model the prompt's structure on the kickoff prompt the user gave at
start of the 2026-05-26 adaptive-scaffolding session — capability
self-audit, mindset, step-by-step, hard rules, working style. Don't
reinvent the structure each time.

## What NOT to do

- Don't run `npm run build` unless necessary (slow, rarely changes signal).
- Don't write a comprehensive recap of WHAT was done. The git log +
  commit messages cover that. Focus on WHAT'S NEXT.
- Don't write a brand-new commit. The handoff doc + RESUME_HERE update
  should land in the SAME commit as in-flight work when it's eventually
  committed — or hand the user a copy-paste git block per the
  no-auto-commit rule.
- Don't update CLAUDE.md from `/handoff` — that's a separate decision
  the user should make explicitly.
- Don't auto-correct inventory mismatches. Surface them; let the user
  decide.

## Sanity check before returning

- Did you write the fenced next-session prompt to disk in step 3
  BEFORE echoing it? (The whole point.)
- Did the session doc include line numbers for in-flight files?
  (Otherwise the next session has to re-derive context.)
- Did the next-session prompt use printed baselines, not hardcoded
  assertions, for state values? (Otherwise every post-commit session
  starts with a false-alarm stop-and-ask.)
- Did you run the inventory-drift check in step 1b? (Skipping this
  compounds silent staleness over time.)
- Did you link to relevant auto-memory entries by name? (So next
  session loads them and follows the rules.)

If yes to all five, end your response with the fenced next-session
prompt — nothing else after.
