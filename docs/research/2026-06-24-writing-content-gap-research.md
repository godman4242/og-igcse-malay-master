# Writing assessment — the Content gap — research & decision (2026-06-24)

Second aspect deep-dive under the planning framework
([`../process/planning-and-thinking-framework.md`](../process/planning-and-thinking-framework.md)) —
the **learning-science** aspect. Follows the personalization deep-dive (Direction B, shipped same day).
Grounded in real sources + the live code, not memory (standing research rule).

## How we got here (the decision trail)
1. "What's the highest-leverage next build?" → research said the universal gap in study apps is
   **recognition → production**, and for IGCSE specifically **acting on exam-technique feedback lifts
   scores 15–30%**.
2. First instinct ("close the act-on-feedback loop") was **wrong** (Kheshav's challenge + self-red-team):
   a feedback loop *amplifies the feedback it spaces* — so feedback **quality is a precondition**, not a
   parallel option. Closing a loop on a word-count proxy would teach padding. → quality first.
3. Second red-team (verify before specifying): I had only checked the *offline heuristic* grader. Reading
   the **AI** path revealed the real, deeper gap below.

## The grounded finding (live code)
The writing flow is **format-based, not task-based**:
- The student picks a *format* (`src/lib/writingFormats.js` — Formal Letter, Article, Speech…) and writes
  free text. **There is no exam question / task** presented or captured.
- Both graders assess **form only**: `writingGrader.js` bands by word count, error density, vocab
  (type-token ratio), sentence variety, cohesion markers, format-marker hits. The "content" sub-band is
  literally driven by **word count + paragraph count** (`writingGrader.js:258`).
- The **AI** grader confirms it: `gemini.js:134` `fetchAIGrade(content, formatHints, localMetrics,
  errorSummary, findings)` has **no parameter for the task** the student was answering; its band
  descriptors are all form ("few to no errors", "wide vocabulary", *"Award Band 6 if metrics show very
  few errors and high word count"*).

**Consequence:** a flawless, perfectly-formatted essay about the **wrong topic** scores Band 6. The app
**structurally cannot assess task-fulfilment / relevance** — because there is no task to be relevant to.

## Evidence (cited)
- **Content is a large, currently-unassessed share of the marks.** Cambridge IGCSE **0510 ESL** writing
  (2024+): **6 marks Content + 9 marks Language**; Content = *relevance (fulfils the task; purpose/
  audience/register) + development of ideas*. So ~**40%** of writing marks are the part the app is blind
  to. (0500 First Language and 0546 Malay weight differently, but **all** have a substantial
  content/task-fulfilment axis — the principle generalises; the exact split is syllabus-specific.)
  ([Cambridge assessment criteria PDF](https://assets.cambridge.org/97810091/22733/excerpt/9781009122733_excerpt.pdf)
  · [0510 mark scheme](https://www.studocu.com/en-us/document/aspen-high-school/mathematics/mark-scheme-for-cambridge-igcse-0510-english-as-a-second-language-paper-2/136868934))
- **AI CAN score writing — but variably, and only with structure.** LLM↔human agreement ranges QWK
  ~0.63 (GPT-3.5) to ~0.99 (GPT-4, best case), with real studies as low as ICC 0.45. Higher agreement
  needs **advanced models + detailed prompting + multi-trait/analytic scoring with rationale**.
  ([AES research synthesis](https://arxiv.org/pdf/2512.14561) ·
  [LLM AES validity/reliability](https://www.researchgate.net/publication/380497027))
- **The #1 failure mode is over-praise / hallucination.** AI feedback documented to give "overly positive
  encouragement that does not align with actual performance" — which *harms* learning (false competence),
  plus hallucinated critiques and generic advice. ([AI feedback delivery study](https://www.tandfonline.com/doi/full/10.1080/02602938.2024.2415649)
  · [MIT Sloan on AI hallucinations](https://mitsloanedtech.mit.edu/ai/basics/addressing-ai-hallucinations-and-bias/))
  This is the app's existing **"confident-wrong is the worst failure"** principle, restated by the
  evidence.

## Decision
**Next bet = "Task-aware writing assessment."** Give students **original, copyright-safe IGCSE-format
writing tasks**, and add a **Content / task-fulfilment trait** to the grader (does the response *do what
the task asked* + suit purpose/audience), AI-scored with **multi-trait structured prompting + a required
rationale**, **eval-pinned against off-topic-but-fluent essays** so it can never over-praise. This
recovers the ~40% of marks the app currently can't see — the most Compass-direct quality fix available,
and the app's moat (generic apps don't do task-fulfilment IGCSE marking).

**Why this and not the act-on-feedback loop yet:** the loop (the originally-tempting bet) amplifies
feedback — so it must wait until the feedback is *trustworthy on content*. Quality is the precondition;
they are **sequenced**, not either/or. The loop becomes the immediate follow-up bet.

## Red-team of THIS decision (standing practice — critique my own pick)
- **AI variability on the free tier** → the Content trait must be **gated by the eval**: if the default
  free tier can't clear a Content-trait floor, BYOK-gate it or **degrade honestly** ("content not fully
  assessed") rather than guess — reuse the existing confidence-gating discipline. Never ship a confident
  Content score the model can't back.
- **Over-praise is the load-bearing risk** → the gold set's primary cases are **off-topic-but-fluent**
  and **partially-on-task** responses; the test is that Content is scored *down* appropriately. If that
  test can't pass, the bet fails and we replan — better to find out in the eval than in a student's hands.
- **Authoring tasks (copyright invariant)** → NO real Cambridge past-paper questions (takedown/legal risk
  on a public site — a settled invariant). Tasks are **original, in-our-control, web-verified IGCSE-style
  prompts**, like the original reading samples. This is a content + product-scope decision → **needs
  Kheshav** (how many, which formats/languages first).
- **Is it still "quality first"?** Yes — it fixes a grader that is currently *wrong about ~40% of the
  marks*; the small task-presentation feature is the delivery vehicle, not the point.

## Open questions for the spec
1. **Task source & scope:** how many original tasks, which formats/languages first (0510 EN + 0546 MS),
   and where they live (extend `writingFormats.js`? a new `writingTasks.js`?). (needs-Kheshav product call)
2. **Grader contract change:** thread the task into `fetchAIGrade` + add a Content/relevance trait to the
   multi-trait band; how it composes with the existing Language band (mirror the real 6+9 weighting?).
3. **Free-tier honesty gate:** the eval floor below which the Content score degrades to "not assessed"
   instead of guessing — reuse `getExpertResponse`/instruct confidence patterns.
4. **Eval design (load-bearing):** the off-topic / partial-task gold set in `scripts/ai-tier-eval`; the
   measurable floor (e.g. off-topic-but-fluent essays scored ≤ Content band 2, ≥X% of the time).
5. **Bilingual:** does the Content trait + tasks work for Malay 0546 as well as English 0510?

## Measurable Done (for the spec to sharpen)
Outcome-linked, binary, eval-pinned — e.g. "the writing grader receives the task and scores a Content /
task-fulfilment trait; an `ai-tier-eval` gold set of off-topic-but-fluent essays is scored DOWN on
Content (no over-praise) at a pinned floor; on-task essays are unaffected; honest degrade when the tier
can't judge."
