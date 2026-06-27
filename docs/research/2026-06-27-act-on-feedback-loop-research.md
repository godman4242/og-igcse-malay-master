# Act-on-feedback loop for writing — research & decision (2026-06-27)

Third learning-science deep-dive under the planning framework
([`../process/planning-and-thinking-framework.md`](../process/planning-and-thinking-framework.md)).
Follows the **task-aware Content grading** that shipped 2026-06-25
([spec](../superpowers/specs/2026-06-24-task-aware-writing-assessment-design.md) ·
[content-gap research](2026-06-24-writing-content-gap-research.md)). That feature made the writing
grader *trustworthy on content* (it can now tell a fluent-but-off-task essay from an on-task one,
eval-pinned at 0% over-praise). This doc asks the deliberately-sequenced **next** question:

> Once a student gets a low Content band + a per-requirement ✗, what is the shortest **validated**
> path to them **acting on it** and improving — and is it worth building?

Grounded in real sources + the live code, not memory (standing research rule). Every effect size is
Cohen's *d* / Hedges' *g* unless noted (d≈0.40 ≈ "a year's schooling"; d≈0.70 is large).

## Why now (the sequencing, restated)
The loop was **deliberately held back** until the feedback was trustworthy, because *a loop amplifies the
feedback it spaces* — closing a loop on a bad signal teaches the wrong thing (the self-red-team that
re-ordered this whole work-stream, [[feedback_red_team_own_decisions]]). The precondition is now met for
English 0510, so the loop is the immediate follow-up bet.

## The grounded finding (live code) — the gap the loop must close
The task-aware grader produces, per graded task: `content_band` (1–6), `content_justification`, and
`task_coverage` (`{ req_0: bool, … }`, keyed by requirement index — `ContentTraitPanel.jsx:63-64`).
**But this signal is ephemeral and acted on by no one:**
- `writingHistory` logs only `{ lang, format, band, words }` (`useStore.js:984-1003`) — **not** the
  task, the Content band, or which requirements failed. Close the Writing page and the per-requirement
  ✗ is gone.
- There is **no "re-attempt this task" affordance anywhere** (verified across `Writing.jsx`,
  `MistakeJournal.jsx`, the store).
- `harvestAIImprovements` (`writingMistakeHarvest.js:72-85`) turns the AI's free-text `improvements[]`
  into `cohesion`/`word:''` mistakes (which land in the Fix-up queue as *reflect* items, never FSRS
  cards) — but it **ignores `task_coverage` entirely**, so the specific missed requirement is never
  captured.

So today the app *generates* actionable, focused feedback and then **drops it on the floor.** The loop's
job is to make it get acted on.

## Evidence (cited, verified)

### Acting on feedback >> receiving it
- **Action is definitional to feedback.** Sadler (1989), *Instructional Science* 18:119–144
  ([ERIC EJ400981](https://eric.ed.gov/?id=EJ400981)): feedback closes a gap only when the learner holds
  the standard, compares performance to it, and **"engages in appropriate action which leads to closure
  of the gap."** *Strong (foundational).*
- **Feedback's effect is medium and wildly variable — information content is what matters.** Wisniewski,
  Zierer & Hattie (2020), *Frontiers in Psychology* 10:3087
  ([full text](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full)):
  435 studies, k=994, N>61k; overall **d=0.48** (not the older 0.79); **high-information feedback d=0.99
  vs reinforcement/praise d=0.24**; **17% of all feedback effects are negative.** *Strong.*
- **THE design-relevant study — a real resubmission loop, computer-delivered, works.** Brooks, Carroll,
  Gillies & Hattie (2021), *Frontiers in Education* 6:645758
  ([full text](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2021.645758/full)):
  3,204 students submitted → got feedback → **resubmitted ~19 days later**; overall improvement
  **d=0.70**; **"where-to-next" feedback was the strongest predictor of gains**; **praise correlated
  −0.15 with improvement during the formative phase**; and crucially **students improved equally whether
  feedback came from a teacher or a computer-based tool.** *Strong — this single study validates the
  automated loop and dictates its tone.*
- **Formative assessment (feedback that is USED) lifts 0.4–0.7, most for low achievers.** Black & Wiliam
  (1998), "Inside the Black Box" ([PDF](http://allianceforlearning.co.uk/wp-content/uploads/2017/03/William-and-Black-Inside-the-Black-Box.pdf)).
  *Strong.*

### Writing-specific & focused feedback
- **The gain comes from taught STRATEGY, not the redraft ritual.** Graham & Perin (2007), *Writing Next*
  ([PDF](https://media.carnegie.org/filer_public/3c/f5/3cf58727-34f4-4140-a014-723a00ac56f7/ccny_report_2007_writing.pdf)):
  strategy instruction (plan/revise/edit) **d=0.82**, product goals **0.70** — but the bare
  process-writing *approach* is only **d=0.32**. Graham & Sandmel (2011), *J. Educational Research*
  104(6) ([ERIC EJ947129](https://eric.ed.gov/?id=EJ947129)): process writing **d=0.34** overall, **and
  d=0.29, not significant, for struggling writers.** → *A "redraft" button alone is modest and may not
  help weak learners; the loop must teach HOW to fix the missed requirement, not just flag it.* *Strong.*
- **Targeting a FEW errors is defensible (focused WCF).** Kang & Han (2015), *Modern Language Journal*
  99(1) ([Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/modl.12189)): written corrective
  feedback **g=0.54**. Bitchener & Knoch (2010), *J. Second Language Writing*
  ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1060374310000421)): focused
  feedback raises accuracy on the targeted features. → *Re-targeting the specific ✗ requirements (not
  "fix everything") is evidence-aligned.* *Moderate–Strong.*

### Uptake is the bottleneck
- **Students routinely don't act unless uptake is designed for.** Carless & Boud (2018), *Assessment &
  Evaluation in Higher Education* 43(8)
  ([PDF](https://opus.lib.uts.edu.au/bitstream/10453/128791/4/CB%20Feedback%20literacy_AEHE_final%20accepted.pdf)):
  "taking action" is one of the four pillars of feedback literacy; uptake must be engineered.
  Triangulated uptake rates ~**37–88%**; roughly **half of read feedback produces no change**
  ([Frontiers 2025](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1567704/full)).
  *Strong (conceptual) + Moderate (the %).*
- **A grade shown alone suppresses engagement with the comments.** Guskey (2019), *Phi Delta Kappan*
  ([PDF](https://tguskey.com/wp-content/uploads/Kappan-2019-Grades-versus-Comments.pdf)) (Butler lineage).
  → *Foreground the requirement checklist; de-emphasize the band number.* *Moderate–Strong.*

### Spacing vs immediate revision (do not conflate)
- Cepeda et al. (2006), *Psychological Bulletin*
  ([PDF](https://augmentingcognition.com/assets/Cepeda2006.pdf)): 184 articles; spacing yields ~15%
  better **retention**, with little benefit when the test is soon. → **Immediate revision** improves
  *this essay + gives the uptake action*; a **spaced re-attempt on a NEW similar task** improves
  *durable skill / exam transfer*. They are **different mechanisms** — spacing does **not** make a single
  essay better. *Strong.*

### Backfire modes (design against these)
- **Passive acceptance of AI rewrites improves the text, not the writer** — ~**45.5% self-report
  over-reliance**, drift to surface fixes ([arXiv 2410.08581](https://arxiv.org/pdf/2410.08581)). →
  *The student must do the rewrite; NO "apply AI fix" button.* *Moderate.*
- **Praise during the revise phase depresses improvement** (Brooks −0.15; Wisniewski's negative cluster
  is reward/praise). → *Lead with where-to-next, withhold praise until genuine gains.* *Moderate–Strong.*

## Corrections to our own trail (honesty)
- **"Acting on exam-technique feedback lifts IGCSE scores 15–30%"** (asserted in
  [`2026-06-24-writing-content-gap-research.md`](2026-06-24-writing-content-gap-research.md) step 1) is
  **folklore — NOT FOUND** in any primary source. The nearest real anchor is the *generic* feedback
  effect size (Hattie's d≈0.73 → ~28 percentile points), itself **revised down to d=0.48** by Wisniewski
  2020. **Do not use "15–30%" in product copy or claims.** Cite d≈0.5, "moderate, highly variable, and
  conditional on the learner acting," and note it is not IGCSE-specific.

## Decision
**Build the loop — Stage 1 only now; Stage 2 gated.** The evidence supports it with a specific shape:

- **Stage 1 (core, cheap, highest-evidence): immediate, structured, targeted re-attempt.** After a
  graded task, durably capture the gap and offer **"Improve your answer"** that (a) keeps the task + the
  student's draft, (b) foregrounds the **specific missed requirements** with an authored **how-to-fix
  hint** each (teach strategy, not just flag), (c) **leads with where-to-next, no praise**, (d) on
  resubmit shows a **before→after comparison** (band climb + which ✗ flipped to ✓). The student rewrites
  it themselves. Reuses the entire existing Writing + task + grade + ContentTraitPanel flow; the only new
  persistence enriches the existing `logWritingFeedback` call (no store migration). **Stage 1 is also the
  instrumentation** that reveals whether students reach tasks at all and whether they re-attempt.
- **Stage 2 (loop-closer, GATED on Stage-1 signal): spaced feed-forward.** Surface the Content gap in the
  existing **/mistakes Fix-up queue** (reuse `getFixUpQueue`/`markMistakeReviewed`) with a "Re-attempt in
  Writing" deep-link — ideally to a *sibling* task (feed-forward, Cepeda/Carless). Reuses the mistake
  pipeline, no new scheduler.

**Form constraints (research-forced, load-bearing):** focused (a few ✗, not everything) · where-to-next
not praise · checklist over band number · student does the rewrite · teach how-to-fix · the
*improvement* claim must itself be eval-pinned against over-praise.

## Red-team of THIS decision (what would make it NOT worth building)
- **Adoption precondition is unproven.** Only **3 English tasks, opt-in (default = Free write), 2 days
  old.** A loop amplifies a feature that may be barely used. → Stage 1 is deliberately the **cheapest
  probe** (it logs `taskId`, so it answers "do people even pick tasks?" for free) *and* delivers real
  value to those who do. If task usage is ≈0, the right next move is **more tasks / drive adoption**, not
  Stage 2.
- **Uptake might not happen even with a one-tap CTA** (the field's central finding: ~half ignore
  feedback). → Stage 1 measures the re-attempt rate; if it's near-zero, the bet has failed its core
  premise and we replan toward *more structured/required* uptake (Carless), not more loop surface.
- **Over-praise re-enters at the improvement layer.** A revise→regrade loop can be **gamed by cosmetic
  edits** if the free tier can't tell real improvement from word-tweaks — making "you improved!" the
  exact over-praise failure this whole work-stream existed to prevent. → The over-praise eval **must
  extend to improvement-detection** (a cosmetic edit must NOT flip a real ✗→✓ or raise `content_band`);
  this is the **ship gate**, mirroring the 2026-06-25 Content eval. Fail → degrade/BYOK-gate, don't ship.
- **Spacing needs a bigger task bank.** True feed-forward (Stage 2) wants a *sibling* task, but there's 1
  task per format. Until the bank grows, Stage 2's transfer value is weak — another reason it's gated and
  **"grow the task bank (+ Malay content grading)" competes with Stage 2 for the next slot.**
- **Evidence honesty.** There is **no clean isolated effect size for "revise after feedback"** in writing
  (it's bundled in strategy instruction), and **"feed-forward to a new task beats re-polishing the same
  one" is essentially unstudied.** The bet rests on the *resubmission + uptake* evidence (Brooks d=0.70,
  Sadler, Carless, Black & Wiliam) plus focused-WCF (g=0.54) — which is strong — **not** on an invented
  revision number.

## Open questions handed to the spec
1. Exact durable-capture shape on `writingHistory` (taskId + contentBand + coverage) — confirm no
   migration (entry is spread at `useStore.js:988`).
2. Where the per-requirement **how-to-fix hints** live (authored `hints?: string[]` in `writingTasks.js`,
   parallel to `requirements`) and the honest fallback when absent.
3. The before→after **comparison** as a pure function over prior `writingHistory` for the same task.
4. The **improvement-detection eval** design (cosmetic-edit gold pairs) and its pinned floor.
5. Stage-2 gating threshold + whether to reuse `cohesion` or add a `content` mistake category.
