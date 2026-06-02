# Feature development methodology (IGCSE Malay Master)

How we take a feature from idea → shipped, optimised for **plan quality** (which
determines everything downstream). Two session modes, the plan→research→implement
order, and the research-quality rules. Reusable across all features.

---

## Two session modes

### 1. Design & Research session  — *diverge → validate → decide*
**Goal:** turn a fuzzy idea into a **validated, prioritised spec + decision log.**
**No production code.** Optimise for thinking quality.
**Output artifact:** a spec in `docs/superpowers/specs/` + a plan in
`docs/superpowers/plans/` (with a paste-ready Implementation kickoff).

### 2. Implementation session — *TDD → ship*
**Goal:** turn an **approved** spec into tested, deployed code.
Optimise for execution discipline (TDD, surgical diffs, verify, eyeball, deploy).

**Handoff between them = the spec + plan docs.** Not every feature needs a Design
session — only **ambiguous or evidence-heavy** ones. Small, clear tasks skip
straight to Implementation.

---

## The order: plan → research → implement  (NOT research → plan → implement)

Researching first **anchors** thinking to existing solutions — you design *within*
what you found and miss original/better-fitting options. Instead:

0. **Orient (light, optional).** A ~5-min scan *only* if the domain is unfamiliar
   — just enough to not plan in ignorance. Skip if you already know the space.
1. **Diverge / first-principles plan.** Generate options + a draft design from the
   *problem itself* + domain understanding, BEFORE deep reading. **Write down the
   assumptions** each option rests on.
2. **Research to validate, challenge & expand.** Now read — **adversarially.** For
   each key assumption, look for evidence it's WRONG and for alternatives you
   didn't think of.
3. **Converge.** Revise the plan; kill options the evidence kills; record decisions
   + confidence.
4. **(optional) Second targeted pass** on the single riskiest remaining assumption.
5. **Implement** (separate session).

---

## Research-quality rules (raise the signal)

1. **Decision-linked questions only.** Write each as *"Should we X or Y for <our
   learners / our context>?"* — never *"Tell me about Z."* If a finding wouldn't
   change a decision, don't research it.
2. **Adversarial / disconfirming.** Search for where the technique FAILS,
   contradicting studies, and the strongest case AGAINST your favoured option
   (steelman the alternative).
3. **Evidence grading.** Prefer meta-analyses / systematic reviews / primary
   studies / authoritative bodies (e.g. CAST for UDL) over blog summaries. Record
   **effect size + direction + confidence (high/med/low)**, not just "it helps."
4. **Triangulate.** ≥2 independent credible sources before adopting a claim. Flag
   thin or contested evidence explicitly.
5. **Transfer check.** Does the evidence apply to OUR context — IGCSE Malay/English,
   self-directed teen learners, mobile web, no teacher present? A classroom-L1
   result may not transfer.
6. **Separate truth from decision.** Research says what's likely *true*; product
   judgment + project invariants (no paywall, invite-only, individual revision,
   Malay+English quality first) decide what we *build*.
7. **Assumption & confidence log.** For each decision record: the assumption, the
   evidence strength, and what would change your mind.
8. **Time-box per question; output a decision record, not a literature dump.**

**Tooling:** context7 MCP for any library/framework/API specifics (per global
rules). WebSearch for learning-science / UDL / SLA evidence (prefer the source
types in rule 3). Don't spawn subagents unless explicitly asked (skills triage).

---

## A Design & Research session's spec should contain
- The problem + who it's for.
- **Options considered** (incl. the ones rejected) and why.
- The **chosen design + WHY**, with the safety/quality bars it must meet.
- A **decision log**: each row = decision · evidence (+source/grade) · confidence.
- **Open questions for Kheshav** (product calls only he can make) with defaults.
- A **test plan** (pure-logic units first, then e2e + eyeball).

---

## Prompt template A — Design & Research session

> You are a fresh Claude Code session on the IGCSE Malay Master app
> ("ooga da boogadamalay"), React/Vite SPA, live at
> https://upg-igcse-malay-master.vercel.app. This is a **DESIGN & RESEARCH
> session — NO production code.** Output is a validated spec + decision log.
>
> Read first: auto-memory MEMORY.md (esp. feedback_layman_explanations,
> feedback_time_estimates_add, project_invariants, project_skills_triage),
> `RESUME_HERE.md` (top blocks), and
> `docs/process/feature-development-methodology.md` (FOLLOW IT).
>
> TOPIC: <one-line feature / question>.
>
> Use the plan→research→implement order from the methodology:
> (0) light orient only if unfamiliar; (1) DIVERGE first — draft 2–4 options + a
> recommended design from first principles, and write down the assumptions each
> rests on, BEFORE deep reading; (2) RESEARCH adversarially — for each key
> assumption look for evidence it's wrong + alternatives I missed, grade the
> evidence, triangulate, and transfer-check to our learners; (3) CONVERGE — revise,
> record a decision log (decision · evidence · confidence), and list the open
> product decisions for me with recommended defaults.
>
> Deliver: a spec in docs/superpowers/specs/ + a plan in docs/superpowers/plans/
> (with a paste-ready Implementation kickoff). Then summarise for me in plain
> layman terms and ask me to approve/adjust the open decisions. Work the way I like
> (plain language, assume I forget context, evaluate my choices, short time
> estimates first). You may commit the docs.

## Prompt template B — Implementation session

> You are a fresh Claude Code session on the IGCSE Malay Master app, React/Vite SPA,
> live at https://upg-igcse-malay-master.vercel.app. This is an **IMPLEMENTATION
> session** — build an already-approved spec.
>
> Read first: auto-memory MEMORY.md (esp. feedback_layman_explanations,
> feedback_standing_commit_permission, feedback_time_estimates_add,
> project_skills_triage), `RESUME_HERE.md` (top blocks), then the spec + plan:
> `docs/superpowers/specs/<file>.md` and `docs/superpowers/plans/<file>.md`.
>
> Build it following the plan's TDD order. Respect the spec's quality/safety bars.
> Verify build + lint + test:run; eyeball light AND dark via a Playwright screenshot
> spec; commit atomically + refresh RESUME_HERE in the same commit; main
> auto-deploys, so confirm Vercel READY (project prj_WuRvwtonuh4XvdG42dIlTVLnd4Nn,
> team team_nmTUChWxLgUOQBpoiRKx0hZy). Work the way I like (plain language, evaluate
> my choices, short time estimates first). You may stage/commit/sync.
>
> Start by verifying the baseline (git clean, test:run, lint, prod READY), then
> begin Step 1 of the plan. Quality over speed.
