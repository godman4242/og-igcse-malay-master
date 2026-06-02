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

**Handoff between them = the spec + plan docs.**

### Right-size it — does this even need a Design session?
Run a Design session ONLY if you answer "no" to either:
1. **Do I already know exactly what to build?** (design space is clear)
2. **Is the evidence it'll work uncontested?** (no real "will this actually help
   the learner?" question)
If both are "yes" → skip straight to Implementation. **Bias to action** — the
Design session is for genuinely uncertain / evidence-heavy features, not a tax on
every change. Kheshav has ADD: don't over-process small, obvious work.

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
9. **Stop rule.** Stop researching a question when (a) the load-bearing assumptions
   are triangulated, AND (b) more reading is no longer *changing the decision*. If
   you've read 3 sources and the answer is stable, stop — don't gold-plate.

**Tooling:** context7 MCP for any library/framework/API specifics (per global
rules). WebSearch for learning-science / UDL / SLA evidence (prefer the source
types in rule 3). Don't spawn subagents unless explicitly asked (skills triage).

### Trusted sources for THIS domain (start here, grade as you go)
- **UDL:** CAST — `udlguidelines.cast.org` (the authoritative framework + checkpoints).
- **Which study techniques actually work:** Dunlosky et al. (2013), *Improving
  Students' Learning With Effective Learning Techniques* (meta-review — ranks
  practice-testing + distributed practice highest); Roediger & Karpicke (retrieval
  practice); Cepeda et al. (spacing meta-analysis).
- **Vocabulary / second-language acquisition:** Paul Nation (vocab learning,
  "learning burden", incidental vs intentional), Norbert Schmitt.
- **Cognitive load / difficulty:** Sweller (cognitive load theory); Bjork
  ("desirable difficulties").
- **Exam fit (non-negotiable ground truth):** the Cambridge IGCSE syllabuses we
  target — 0546 (Malay – Foreign Language), 0500 / 0510 (English). A technique that
  doesn't serve the actual papers loses to one that does.
- **Caveat:** these are *starting points*, not gospel — still grade each claim
  (effect size + confidence) and transfer-check to our mobile self-study teens.

### Prioritising ideas (so the Design session outputs a ROADMAP, not a list)
Score each candidate feature, roughly:
**Impact** (does it move real learning outcomes / exam readiness? 1–5)
× **Confidence** (evidence + fit it'll actually work, 1–5)
÷ **Effort** (build + edge-case cost, 1–5).
Rank by the result. Deep-spec only the **top 1–2**; park the rest with a one-line
"why later". Always sanity-check the ranking against project invariants and "does
this serve the learner or just add surface area?"

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
*(Lean by design: it points to this doc instead of restating it, so there's one
source of truth. Fill in `<TOPIC>`.)*

> Continue the IGCSE Malay Master app (React/Vite SPA,
> https://upg-igcse-malay-master.vercel.app). This is a **DESIGN & RESEARCH session
> — NO production code**; output is a validated spec + decision log.
>
> Read + FOLLOW: auto-memory MEMORY.md, `RESUME_HERE.md` (top blocks), and
> `docs/process/feature-development-methodology.md` (the workflow, research rules,
> trusted sources, and prioritisation rubric all live there — obey them).
>
> TOPIC: `<TOPIC>`.
>
> Remember the load-bearing move: **DIVERGE from first principles BEFORE you
> research** (draft options + assumptions first), then research *adversarially*,
> then converge into a spec + plan in `docs/superpowers/{specs,plans}/` with a
> decision log and a paste-ready Implementation kickoff. Summarise in plain layman
> terms and ask me to approve the open decisions. Work the way I like (plain
> language, evaluate my choices, short time estimates first). You may commit docs.
>
> First action: skim the methodology doc, then give me a 1-line plan + estimate.

## Prompt template B — Implementation session
*(Fill in the spec/plan filename.)*

> Continue the IGCSE Malay Master app (React/Vite SPA,
> https://upg-igcse-malay-master.vercel.app). This is an **IMPLEMENTATION session**
> — build an already-approved spec.
>
> Read + FOLLOW: auto-memory MEMORY.md, `RESUME_HERE.md` (top blocks), the spec
> `docs/superpowers/specs/<FILE>.md` + plan `docs/superpowers/plans/<FILE>.md`, and
> the "Implementation session" expectations in
> `docs/process/feature-development-methodology.md`.
>
> Build it in the plan's TDD order; respect the spec's quality/safety bars. Verify
> build + lint + test:run; eyeball light AND dark via a Playwright screenshot spec;
> commit atomically + refresh RESUME_HERE in the same commit; confirm Vercel READY
> after deploy (project prj_WuRvwtonuh4XvdG42dIlTVLnd4Nn, team
> team_nmTUChWxLgUOQBpoiRKx0hZy). Plain language, evaluate my choices, short time
> estimates first. You may stage/commit/sync.
>
> First action: verify the baseline (git clean, test:run, lint, prod READY), then
> begin Step 1 of the plan. Quality over speed.

---

## Keep this doc alive
This is a living doc. When the workflow demonstrably improves (a research tactic
that paid off, a session mode that didn't fit, a better source), update it in the
same commit — and prune anything that stopped earning its place. A methodology
that can't change becomes cargo-cult.
