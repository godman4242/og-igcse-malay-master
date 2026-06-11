# Research: prompting / mindset strategies for our kickoff + routine prompts

**Date:** 2026-06-11 (autonomous 5-hourly cloud run, Box B item 1)
**Status:** RECOMMENDATIONS ONLY — no app code, store, schema, or behaviour changed.
**Web probe:** ✅ WebSearch + WebFetch work in this env (anthropic.com blocks direct
WebFetch with 403, but code.claude.com docs fetch fine and WebSearch returns content
summaries — noted per-source below).

---

## 1. What this brief compares

| Ours | Where it lives | Role |
|---|---|---|
| LEAN kickoff Templates A (Design) + B (Implementation) | `docs/process/feature-development-methodology.md` §Prompt templates | Pasted by Kheshav to start interactive sessions |
| Inlined box kickoffs (F-1/F-2/F-3, D-1, archived A-3/A-4/R-1) | `RESUME_HERE.md` | Pre-filled, task-specific session prompts |
| Legacy "Baby Steps" kickoff guide | `docs/AI_SESSION_KICKOFF.md` | The original copy-paste kickoff (2025-era) |
| 5-hourly builder routine prompt | **NOT in the repo** — lives only in the claude.ai routine config | Drives this autonomous run |
| Nightly quality-watch routine prompt | **NOT in the repo** — routine config only | Read-only regression watch, files issues |

## 2. Sources (graded)

| # | Source | Grade | How read |
|---|---|---|---|
| S1 | [Claude Code docs — Automate work with routines](https://code.claude.com/docs/en/routines) | **A** (official, current) | Full fetch |
| S2 | [Claude Code docs — Run prompts on a schedule](https://code.claude.com/docs/en/scheduled-tasks) | **A** (official, current) | Full fetch |
| S3 | [Claude API docs — Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) | **A** (official) | Search-summary excerpts (direct fetch 403) — core claims corroborated across ≥3 result snippets |
| S4 | [Anthropic engineering — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | **A−** (official; summary-only here) | Search summary only (403 on fetch) — specifics marked [VERIFY] |
| S5 | Practitioner write-ups on scheduled/autonomous Claude Code agents ([daily-brief lessons post](https://www.anothercodingblog.com/p/i-built-a-daily-brief-with-claude), [agent factory cron guide](https://agentfactory.panaversity.org/docs/General-Agents-Foundations/general-agents/scheduled-tasks-cron), [dev.to cron agent](https://dev.to/boucle2026/how-to-run-claude-code-as-an-autonomous-agent-with-a-cron-job-hec)) | **B/C** (hands-on but individual experience; the daily-brief post 403'd on fetch → its "6 lessons" come from search summaries only) | Search summaries |

Per the queue's standing instruction, practitioner experience (S5) was weighted, not just
official docs — but every S5 claim that survived into §4 is also consistent with S1/S2.

## 3. Best-practice findings (each adversarially checked)

**F1 — A routine prompt must be self-contained and define success explicitly.** S1 says it
outright: "the routine runs autonomously, so the prompt must be self-contained and explicit
about what to do and what success looks like." S5 echoes it: instructions for an autonomous
agent are "executed literally with no fallback," unlike interactive prompts where the human
catches drift. *Counter-check:* none found — this is uncontested. Our builder prompt already
complies (explicit guards, end-of-message contract). Confidence: **high**.

**F2 — Positive, explicit instruction beats prohibition.** S3: "tell Claude what to do
instead of what not to do"; explicit direction ("make these edits") beats implication ("can
you suggest"). *Counter-check:* hard limits/invariants are legitimately negative — Anthropic's
own built-in `/loop` maintenance prompt (S2) uses scope prohibitions ("does not start new
initiatives outside that scope"). So the rule is: positive framing for the *task*, negative
framing reserved for *guardrails*. Our prompts mostly comply; a few task lines are
prohibition-shaped where an action-shaped line would do. Confidence: **high**.

**F3 — A green run status is not task success; verify outcomes, not exits.** S1: "A green
status… does not mean the task in your prompt succeeded. Open the run to read the transcript."
This validates our quality-watch as a separate verification layer and our "show the gate
output" habit. *Counter-check:* none. Confidence: **high**.

**F4 — Idempotency + run-more-than-once safety is the #1 practitioner failure mode.** S5
(triangulated across 3 write-ups): scheduled agents will eventually double-fire or run against
half-done state; any non-idempotent write duplicates. Our five skip guards (unmerged-branch /
recent-main / queue / review-cap / open-regressions) are precisely this defence and are *ahead*
of most published practice. *Counter-check:* the guards depend on remote state reads that can
transiently fail — today guard (e) needed a fallback because `gh` doesn't exist in cloud runs
(see P1 below). Confidence: **high** for the principle.

**F5 — Watch the first 3–5 runs of any new/edited scheduled prompt before trusting it.**
S5 (multiple posts). Cheap insurance; we have no written rule for it. *Counter-check:* our
guards bound the blast radius anyway (docs-only queue, review cap), so this is belt-and-braces,
not critical. Confidence: **medium** (practitioner-only).

**F6 — Keep always-loaded instruction files lean; one source of truth; right "altitude".**
S4 [VERIFY — summary only]: system-prompt guidance should sit at the right level of
specificity; context pollution degrades long-horizon work; prefer just-in-time context over
restating. S2 concretely: keep `loop.md`-style prompts concise. This is exactly the design of
our LEAN templates ("it points to this doc instead of restating it") and the 2026-06-09
CLAUDE.md slimming — both already aligned. Confidence: **medium-high** (principle corroborated
by S2/S3 even where S4's full text wasn't readable).

**F7 — Separate durable knowledge from per-run journal.** S5: facts the agent learns go in
knowledge files; what happened each run goes in a journal; don't mix. We already do this
(CLAUDE.md/methodology = knowledge; `docs/overnight/*-report.md` = journal; RESUME_HERE = queue
state). Confidence: **medium** (practitioner-only, but matches our lived structure).

**F8 — Anthropic's own built-in maintenance prompt is a useful reference shape.** S2 documents
it: an ordered worklist (continue unfinished → tend PR → cleanup), an explicit scope fence
("does not start new initiatives"), and an authorization rule for irreversible actions ("only
proceed when they continue something the transcript already authorized"). Our builder prompt
has all three equivalents (queue order, Box A fence, hard limits). Confidence: **high**.

## 4. Comparison verdicts

**The LEAN templates (methodology doc): GOOD — keep.** They embody F1/F2/F6 (pointer to one
source of truth, explicit first action, explicit done bar, "no production code" scope fence).
One stale detail: Template B pins Vercel project `prj_WuRvwtonuh4XvdG42dIlTVLnd4Nn`, while the
builder routine targets `prj_yQt1WImzPvpkOQYdj2XHqxqnIwqC` (upg-, the PUBLIC prod project per
RESUME_HERE). One of these is outdated **[VERIFY — Kheshav: which project is canonical prod?]**.

**The RESUME_HERE box kickoffs: GOOD — keep the pattern.** Explicit invariants, model choice,
read-first list, measurable done bar — they match or exceed everything in S1–S3. Their length
is justified spend (task-specific context, loaded once).

**`docs/AI_SESSION_KICKOFF.md`: STALE — the one clearly bad artifact.** Verified concretely:
it tells the AI to read `docs/PLANS_STATUS.md` (**file does not exist** — checked this run);
it names `view_file` / `multi_replace_file_content` / `run_command` (not Claude Code tools —
another assistant's toolset); "You are the Director. The AI is your Typist" contradicts the
current decide-and-flag working agreement and the methodology doc's session modes; it predates
the pre-commit gate, the methodology doc, and RESUME_HERE's box system. Anyone pasting it today
gets a *worse* session than pasting Template A/B. (F2/F6 violations throughout.)

**The builder routine prompt (this run's): STRONG, three fixable gaps.**
- **P1 — wrong tool named in guard (e):** it instructs `gh issue list …`, but `gh` is never
  available in cloud routine sessions (the env preamble says so; this run fell back to the
  GitHub MCP `list_issues` unprompted). The prompt's own escape hatch ("if gh is unavailable…
  continue") means a *broken guard silently degrades to best-effort* every single run. Name the
  MCP tool instead so the guard always actually runs. (F1, F4.)
- **P2 — not versioned:** neither the builder nor the quality-watch prompt text lives in the
  repo. Prompt edits are invisible to review, can't be diffed, and the repo can't be the single
  source of truth the LEAN templates aim for (F6). The interactive prompts are versioned; the
  *autonomous* ones — where wording errors bite hardest (F1, S5) — are not.
- **P3 — partial-web rule missing:** the self-probe rule is binary (web works / web blocked),
  but this run hit the real third state: WebSearch fine, several domains 403 on direct fetch.
  The right behaviour (fall back to search summaries, grade those sources lower, mark [VERIFY])
  had to be improvised; one sentence in the prompt would make it deterministic.

**The quality-watch prompt:** can't be audited from here (not in the repo — P2 again). Its
*observed* outputs (issues #3/#4, since closed) were well-formed. F3 says its existence is
best practice; keep it.

## 5. Proposed changes (recommendations only — nothing applied)

Ordered by impact ÷ effort; items 1–3 are docs-only and tiny.

1. **Retire `docs/AI_SESSION_KICKOFF.md`.** Replace its body with a 3-line pointer to
   `docs/process/feature-development-methodology.md` Templates A/B + RESUME_HERE (or delete it
   and let the methodology doc be the only kickoff source). *Why:* it actively misleads
   (nonexistent file, foreign toolset, obsolete mindset). *Veto note:* if Kheshav values it as
   a beginner-friendly explainer, rewrite the explainer voice around the CURRENT templates
   instead of deleting.
2. **Version the routine prompts: add `docs/process/routine-prompts.md`** holding the verbatim
   builder + quality-watch prompt texts, with a header rule: "the claude.ai routine config and
   this file must change together." *Why:* F1/F6/P2 — the highest-stakes prompts are currently
   the only unversioned ones. *Veto note:* costs a manual sync step on every prompt edit;
   acceptable because edits are rare and currently un-reviewable.
3. **Patch the builder prompt's guard (e)** to name the GitHub MCP tool (`list_issues` /
   `search_issues` on `godman4242/og-igcse-malay-master`) instead of `gh`, keeping `gh` as the
   stated fallback for non-cloud contexts; **add one partial-web sentence** to the self-probe
   rule: "If search works but a domain blocks fetching, use search summaries, grade those
   sources lower, and mark claims [VERIFY] — that is not 'web blocked'." *Why:* P1+P3, makes
   two improvised behaviours deterministic.
4. **Reconcile the Vercel project ID** in methodology Template B vs the routine prompt
   [VERIFY — needs Kheshav or a session with Vercel MCP access to confirm which project serves
   https://upg-igcse-malay-master.vercel.app].
5. **Add one line to the methodology doc's "Keep this doc alive" section:** "New or edited
   routine prompts: watch the first 3–5 runs (Run now) before trusting them unattended" (F5).
6. **Optional, low priority — positive-framing pass** over the builder prompt's task lines
   (keep guardrails prohibition-shaped; F2). Marginal: the prompt already performs well.

**What was deliberately NOT proposed:** shortening the RESUME_HERE box kickoffs (their length
is task-specific context, not pollution — F6 distinguishes altitude from volume); restructuring
the five skip guards (they exceed published practice — F4); any change to app code or the
interactive workflow.

## 6. Decision log

| Decision | Why | How to veto |
|---|---|---|
| Graded S4 down and tagged its specifics [VERIFY] | Full text unreachable (403); summaries only | A web session fetches the full article and upgrades/edits F6 |
| Called AI_SESSION_KICKOFF.md stale rather than "alternative style" | Concrete falsifiable checks: references a nonexistent file + a non-Claude-Code toolset | Keep the file; rewrite around current templates (see veto note in §5.1) |
| Recommended versioning routine prompts despite the manual-sync cost | Unversioned high-stakes prompts violate the project's own one-source-of-truth rule | Reject §5.2; accept that prompt edits stay un-reviewable |
| Did not run a deep-research fan-out (single-session search/fetch only) | Stop rule: 5 sources in, findings stable, all load-bearing claims triangulated; this is a process brief, not a science claim | Re-queue with the deep-research skill if Kheshav wants broader practitioner sentiment |
