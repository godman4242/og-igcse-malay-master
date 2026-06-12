# Prompting standard + AI-developer skill map — research brief (2026-06-12)

**Why this exists.** Kheshav asked me to research prompting *once*, bake it into how I work, and apply it
by default — so he never has to keep hunting for "better ways to prompt," and learns passively by reading
the kickoffs I write. He also asked me to map where he's strong/weak as a developer and to carry the
AI-developer competencies he hasn't learned yet, so he isn't forced to rush. This brief is the grounded
basis; the durable rules live in private memory (`reference_prompting_standard`, `user_vibe_coding_profile`,
`feedback_prompt_standards_and_coaching`). **Recommendations only — nothing here changed app code.**

**Method.** Triangulated per the standing research rule (official docs + practitioner write-ups + the
field's own hiring signal; benchmarks taken with a grain of salt; no fabricated sentiment).

## Sources (graded)
| Source | Type | Weight | Note |
|---|---|---|---|
| [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Official (model-maker) | **High** | Primary source on context/altitude/JIT/compaction/sub-agents |
| [dbreunig — 10 Lessons for Agentic Coding (2026-05)](https://www.dbreunig.com/2026/05/04/10-lessons-for-agentic-coding.html) | Practitioner | Medium-High | Hands-on workflow lessons (specs, tests, taste, hidden cost) |
| [digitalapplied — AI Developer Hiring 2026: Skills That Matter](https://www.digitalapplied.com/blog/ai-developer-hiring-skills-that-matter-2026) | Practitioner/industry | Medium | Ranked skill map + strong-vs-weak tells + gap stats |
| [VentureBeat — Agentic coding demands spec-driven development](https://venturebeat.com/orchestration/agentic-coding-at-enterprise-scale-demands-spec-driven-development) | Industry press | Medium | Spec-first as the enterprise default |
| [Addy Osmani — How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/) | Practitioner | Medium | Spec structure |
| [arXiv 2512.14012 — Professional Developers Don't Vibe, They Control](https://arxiv.org/pdf/2512.14012) | Academic | Medium | The control-vs-vibe spectrum |

## Findings — prompting / directing agents
1. **Self-verification is the single highest-leverage practice.** Give the agent a way to check itself
   (run tests after each change → its own feedback loop); convert each requirement into a yes/no checklist.
2. **Spec-first, spec-as-living-artifact.** Write the contract (output + constraints + patterns +
   verification) before code; keep it in sync as you learn. Human-refined specs cut error rates materially
   (controlled studies cite up to ~50%).
3. **"Right altitude."** Specific enough to guide, flexible enough to leave heuristics. Don't hardcode
   brittle edge-case logic; don't be vaguely high-level. Start minimal, add instruction per observed failure.
4. **Document intent (the "why"), separate from the "what."** The model generalizes from the reason.
5. **Context is a finite resource** — "smallest set of high-signal tokens." Prefer just-in-time retrieval
   (glob/grep/read on demand) over pre-loading; use structured notes (a NOTES.md / our RESUME_HERE),
   compaction, and sub-agents with clean context for read-heavy fan-out.
6. **Few-shot = diverse canonical examples**, not exhaustive edge cases.
7. **Constraints + out-of-scope matter as much as goals** — most agent failures are *collateral damage*,
   not missed targets.
8. **The human's job is taste + the hard parts**; agents amplify expertise. Mind hidden costs (generation
   is cheap; maintenance/security/cost are not). Control the agent; don't "vibe" at it.

→ **My standard (auto-applied from now):** every kickoff = **Why → What-I'll-see (user-observable, not a
proxy) → What-not-to-break → Prove-it**, plus where-to-look (grounding) and who-decides. Narrated so it
teaches by example. (See `reference_prompting_standard` in memory.)

## Findings — AI-application-developer skill map (2026)
Ranked industry signal (digitalapplied), most-predictive first:
1. **Eval design** — "the single biggest signal someone actually built with LLMs."
2. **Cost/latency optimization** — separates production from lab.
3. **Agent orchestration** (supervisor patterns, failure recovery, state).
4. **MCP / primary-doc-reading habit.**
5. **Safety / guardrails** (excessive agency).
6. **Frontier-model fluency** (citing a non-existent model = instant fail).
7. **RAG / vector DBs.**  8. **Prompt engineering.**  9. **Observability.**  10. **Computer-use deployment.**

**Strong vs weak tells.** Strong: measurable eval frameworks + failure-mode analysis, cost awareness,
reads primary docs weekly, ships under perf *and* cost bars. Weak: "100% accuracy" with no metric,
framework-only fluency, toy projects with no recall numbers, fabricating model names.
**Field-wide gap:** 84% of devs use AI tools; **only 29% can verify the outputs.**

## What this means for Kheshav (recommendations)
- **Confirmed:** verification literacy is the field's #1 gap, not just his — and his instinct (demand
  output/screenshots/READY) is already the right reflex. Closing the "I read the result myself" loop is the
  leap. Coach the "make it perfect" → measured-bar redirect (it's the weak-dev "100% accuracy" tell).
- **Reframe of his biggest opportunity:** he's *closer to evals than assumed* — `scripts/ocr-accuracy-harness.mjs`
  (OCR Q-VIS) is a real eval. **Highest-leverage next skill = generalize it:** point his strength (measurable
  goals) at AI *output* via a small eval harness over the app's ungraded AI surfaces (roleplay scoring,
  Cikgu, Make-a-deck, translation, OCR-vision). This merges his two gaps (verification + code literacy) with
  the #1 industry skill, on the repo he already owns. Candidate future BOX.
- **Carry-for-him:** I bring evals/cost-awareness/evidence to AI features proactively and narrate, so he
  absorbs the competencies without a forced study sprint.
