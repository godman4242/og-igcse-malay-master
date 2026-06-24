# Task-aware writing assessment — design spec (2026-06-24)

Learning-science aspect deep-dive (the 2nd, after personalization Direction B) under the planning
framework. Research + decision: [`../../research/2026-06-24-writing-content-gap-research.md`](../../research/2026-06-24-writing-content-gap-research.md).

The bet, in one line: **the writing grader is blind to ~40% of IGCSE marks (Content / task-fulfilment)
because the app presents a *format*, not a *task* — so give students real IGCSE-style tasks and assess
whether they fulfilled them, eval-pinned so it can never over-praise an off-topic answer.**

---

## 1. Compass anchor (why)

IGCSE 0510 ESL writing marks = **6 Content + 9 Language** (Content = relevance/task-fulfilment +
development of ideas). The app assesses ~only Language: `writingGrader.js` bands word count, errors,
vocab, cohesion, format markers; the AI grader (`gemini.js` `fetchAIGrade`) is given the essay but **not
the task**, so its descriptors are all form. **Result: a flawless, perfectly-formatted essay about the
wrong topic scores Band 6.** Closing this is the most Compass-direct quality fix available (it is the
*precondition* for any later act-on-feedback loop — a loop that spaces wrong feedback teaches the wrong
thing), and it is the app's moat (generic apps don't do IGCSE task-fulfilment marking).

The load-bearing risk from research: AI essay feedback's #1 documented failure is **over-praise** —
positive feedback misaligned with performance, which *harms* learning. So the whole feature is built
around a guardrail and an eval that target exactly that failure.

---

## 2. Scope

**v1 (this spec):**
- Present **original, copyright-safe IGCSE-format writing tasks** (a task = a prompt + the bullet-point
  requirements an examiner marks against). **Minimal first** (Kheshav-approved): ~2–3 tasks per language.
- Add a **Content / task-fulfilment trait** to the **English (0510)** AI grader — where the examiner
  prompt already exists — fed the task, returning a Content band + which requirements were addressed.
- A **load-bearing eval** (`scripts/ai-tier-eval`): a gold set of off-topic / partial / on-task essays
  paired with tasks; the pinned assertion is **off-topic-but-fluent → Content scored down**.
- **Honest degrade:** no task selected → byte-identical to today; AI unavailable / low-confidence →
  Content shows "not assessed", never a guess.

**Fast-follow (NOT v1, named so it isn't "discovered" mid-build):** the Malay (0546) AI Content trait —
`fetchAIGrade` is English-only, so Malay needs its own examiner prompt + Malay gold set. Malay **tasks**
can be authored in v1 and used by the heuristic/format layer immediately; Malay AI Content grading is the
clearly-scoped next increment, same pattern.

**Out of scope (YAGNI):** the act-on-feedback / band-climb / spaced-re-practice loop (the *next* bet,
deliberately sequenced after the feedback is trustworthy); real Cambridge past-paper tasks (copyright
invariant — original only); auto-generating tasks with AI (authored + web-verified, like the reading
samples); changing the existing Language band / error detection.

---

## 3. Architecture — units, interfaces, data flow

### 3.1 `src/data/writingTasks.js` (new, pure data)
- **Does:** the catalogue of original IGCSE-format tasks. Each task names the format it belongs to and
  the marked requirements.
- **Shape:** `{ id, lang: 'eng'|'malay', formatId, prompt, requirements: string[], audience?, purpose? }`
  where `formatId` matches a `writingFormats.js` `FORMATS[].id`, `prompt` is the question shown to the
  student, and `requirements` are the bullets the Content trait checks coverage of (the examiner's
  "addresses all points" axis).
- **v1 content:** ~2–3 tasks for the highest-frequency English formats (e.g. formal letter, article),
  ~2–3 Malay tasks for 0546 — **original, web-verified to IGCSE format**, no copyrighted prompts.
- **Why a unit:** tasks are data, authored + verified independently of grader logic; canonical-list test
  pins them (mirrors `readingSamples.js` / `academicEn.js`).

### 3.2 Grader contract — thread the task + add a Content trait (`src/lib/gemini.js`)
- **Change:** `fetchAIGrade(content, formatHints, localMetrics, errorSummary, findings, signal, task)` —
  `task` is **optional**; when absent the prompt + output are **byte-identical to today** (no
  regression).
- When `task` is present, extend the system prompt with a **Content section** that:
  - states the task `prompt` + `requirements`;
  - instructs the model to judge **only task-fulfilment + purpose/audience** for the Content band,
    *separately* from the existing Language band;
  - carries the **anti-over-praise rule** in the existing "OVERCOMING AI BIAS" calibration block:
    *"If the response is off-topic, ignores the task, or addresses none/most-of-the requirements, Content
    MUST be ≤ 2 regardless of how fluent or well-written it is. Fluency never rescues an off-task answer."*
- **Return shape adds** (only when `task` present): `content_band` (1–6), `content_justification`
  (1–2 sentences referencing which requirements were/weren't met), `task_coverage` (`{ [requirement]:
  boolean }`). The existing keys (`band`, `justification`, `positives`, `improvements`, `marker_check`)
  are unchanged.
- **Why here:** one prompt, one place; the existing JSON-schema + `responseMimeType:'application/json'`
  machinery is reused.

### 3.3 Wiring (`src/hooks/useWritingEvaluator.js`, `src/pages/Writing.jsx`)
- A selected task flows from the Writing page (new task picker, scoped to the chosen format/lang) into
  `useWritingEvaluator` → `fetchAIGrade(..., task)`. No task selected → today's flow.
- `Writing.jsx` renders the Content trait **as a second, distinct axis** alongside the existing band,
  plus `content_justification` and a simple requirement-coverage checklist. **Honesty note:** the
  existing `band` is *holistic-form* (vocab/cohesion/errors/length), NOT a pure Language mark, so we do
  **not** display a fake "Content + Language = N/15" summed score (that would imply mark-scheme precision
  we don't have). Label them plainly — e.g. "Did you answer the task?" (Content) and "Writing quality"
  (the existing band). When the tier can't judge → "Content: not assessed" with the BYOK nudge, never a
  fabricated number.

### 3.4 Honest-degrade gate
- **No task** → no Content trait (current behavior, byte-identical).
- **AI unavailable / parse fail / `aiGradeUnavailable`** → Content omitted + existing BYOK nudge
  (`AddKeyNudge`), never a guessed Content band. Reuses the existing confidence/availability discipline
  (`getExpertResponse` `MIN_CONFIDENCE`, instruct cooldown) — the app's "confident-wrong is the worst
  failure" rule.

### 3.5 Eval (`scripts/ai-tier-eval/` — the load-bearing unit)
- **New gold set** `goldWritingTasksEn.mjs`: synthetic English essays, each paired with a v1 task and a
  **ground-truth label** `onTask | partial | offTopicFluent` + an `expectedContentMax` (e.g.
  `offTopicFluent` → 2, `partial` → 4). The set must be **weighted toward SUBTLE cases**, because the
  blatant ones (a fluent essay about the wrong topic entirely) pass trivially and give false confidence —
  **real over-praise happens on the subtle ones**: addresses some-but-not-all of the task's
  `requirements`, on-topic-but-wrong-register/audience, or drifts off-task halfway. Those are the rows
  this eval exists to stress.
- **Run-to-run robustness:** LLM scores are non-deterministic, so the harness **samples each essay N
  times** (e.g. 3) at **low temperature** and the floor must hold across the samples — a one-shot pass
  does not prove the trait is trustworthy.
- **Harness** runs `fetchAIGrade` with the task and records the Content band; **`score.mjs`** reports:
  (a) the over-praise rate (off-topic/partial essays awarded Content above their `expectedContentMax`),
  (b) agreement on on-task Content, (c) variance across the N samples.
- This is the spec's load-bearing test; it gates whether the AI Content trait ships on the free tier.

---

## 4. The load-bearing invariant — no over-praise

> **An off-topic or task-ignoring response can never earn a passing Content band, no matter how fluent.**
> Pinned by the `offTopicFluent` gold cases: Content ≤ 2. If the free tier can't satisfy this, the AI
> Content trait does **not** ship free — it BYOK-gates or degrades to "not assessed". We never ship a
> Content score the eval shows the tier can't back. (This is the feature's reason-for-being; failing it
> means replan, not ship.)

---

## 5. Measurable Done (binary, eval-pinned)

1. A task can be selected and is shown to the student; `fetchAIGrade` receives it and returns a
   `content_band` + `task_coverage`. — *unit test on the request/response shape.*
2. **Over-praise floor:** in `goldWritingTasksEn.mjs` (weighted toward subtle/partial cases), across
   **N samples per essay** at low temperature, **off-topic and partial essays score Content at or below
   their `expectedContentMax`** (off-topic ≤ 2) in **≥ 9/10 cases**, and on-task essays are not
   spuriously scored down (pinned in `score.mjs`). — *the eval.*
3. **No-task path is byte-identical** to pre-change behavior (regression guard). — *unit test: same essay,
   no task → identical request + parsed result.*
4. **Honest degrade:** AI-unavailable → Content omitted + BYOK nudge, never a guessed band. — *unit/render
   test.*
5. ~2–3 original English + ~2–3 Malay tasks authored, web-verified to IGCSE format, pinned by a
   canonical-list test. (Malay AI Content grading is the fast-follow, not gated here.)
6. Gate green (build + ~1970 tests + lint); README + driver.js guide + RESUME_HERE updated (standing
   rule); GOAL.md directed-epic slot points here.

---

## 6. Test / eval plan (TDD)

- `writingTasks.test.js` — canonical list: every task's `formatId` resolves in `FORMATS`, lang valid,
  `requirements` non-empty.
- `gemini` request-builder test — with `task`: prompt includes the task + the anti-over-praise rule +
  the Content keys; **without `task`: prompt string is byte-identical to today** (the regression pin).
- `useWritingEvaluator` test — threads `task` into `fetchAIGrade`; no task → unchanged call.
- Writing render test — Content trait + coverage shown when present; "not assessed" + nudge when absent.
- `scripts/ai-tier-eval/goldWritingTasksEn.mjs` + `score.mjs` — the over-praise floor (§5.2). Run via the
  existing harness; this is a script eval (not in the unit gate), reported like the other tier evals.

---

## 7. Open risks / watch-items

- **Free-tier reliability** — AES agreement is variable (QWK 0.45–0.99); the eval is the gate. If free
  can't clear the over-praise floor, BYOK-gate the Content trait (the feature still ships, honestly
  degraded) rather than ship a number that over-praises.
- **Malay AI grader is a separate prompt** — v1 does not fake Malay AI Content grading; Malay tasks +
  heuristic/format layer ship, Malay AI Content is the fast-follow (own prompt + own gold set).
- **Task authoring volume** — minimal-first by decision (prove the mechanism before authoring a full
  bank); the canonical-list test makes adding more tasks low-risk later.
- **Display clutter (ADD-first)** — Content + Language as two clear axes, not a wall of numbers; the
  coverage checklist is the actionable part. Keep it scannable.

---

## 8. Decision log (decide-and-flag)

- **Quality first, sequenced before the act-on-feedback loop** — research-forced (a loop amplifies the
  feedback it spaces; quality is the precondition). *Veto:* none — established with Kheshav this session.
- **English 0510 AI Content trait in v1; Malay 0546 = tasks now + AI Content fast-follow** — honest scope:
  `fetchAIGrade` is English-only; faking Malay AI content grading would ship an unevaluated number.
  *Veto:* author the Malay examiner prompt + gold set in v1 too (more upfront, same pattern).
- **Minimal task bank first (~2–3/language)** — prove the grader + over-praise eval before authoring a
  full bank (Kheshav-approved). *Veto:* author more upfront.
- **Over-praise eval is the ship gate, not a nicety** — the feature's whole value is *not* over-praising
  off-task work; if the eval fails, we degrade/BYOK-gate or replan, never ship.
- **No real past papers; original tasks only** — copyright invariant (settled).
