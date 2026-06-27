# Act-on-feedback loop for writing — design spec (2026-06-27)

Third learning-science deep-dive under the planning framework. Research + decision:
[`../../research/2026-06-27-act-on-feedback-loop-research.md`](../../research/2026-06-27-act-on-feedback-loop-research.md).
Builds directly on the task-aware Content grading shipped 2026-06-25
([spec](2026-06-24-task-aware-writing-assessment-design.md) §2 names this loop as the out-of-scope next
bet).

**The bet, in one line:** the task-aware grader already produces *focused, actionable* feedback (a
Content band + a per-requirement ✗) and then **drops it on the floor** — so close the loop: durably
capture the gap and give the student a structured, where-to-next **"Improve your answer"** re-attempt
targeting the specific missed requirements, with the *improvement* claim itself eval-pinned so the loop
can never become an over-praise machine.

---

## 1. Compass anchor (why)

The strongest, most replicated finding in feedback research is that **acting on feedback — not receiving
it — is the mechanism** (Sadler 1989; Wisniewski 2020 high-info d=0.99 vs reinforcement d=0.24), and the
single most design-relevant study is a **real, computer-delivered resubmission loop**: Brooks et al.
2021 (3,204 students, resubmit ~19 days later, **d=0.70**, "where-to-next" the top predictor, **students
improved equally from a computer tool as from a teacher**). The bottleneck is **uptake** — most students
don't act on feedback unless a mechanism makes them (Carless & Boud 2018; ~half of read feedback is
ignored). Our app generates exactly the actionable signal the evidence calls for and then discards it.
Closing this loop is the most Compass-direct way to convert the now-trustworthy Content feedback into the
documented learning gain.

**The load-bearing risk (same family as the precursor's):** a revise→regrade loop can be **gamed by
cosmetic edits** and re-introduce **over-praise** ("you improved!" when nothing real changed) — the exact
failure the quality-first sequencing existed to prevent. So the whole feature is built around an
improvement-detection guardrail and an eval that targets that failure.

---

## 2. Scope

**Stage 1 (this spec, build now) — English 0510, the cheap high-evidence core + instrumentation:**
- **Durable gap capture.** When a *task* is graded, enrich the existing `logWritingFeedback` entry with
  `taskId`, `contentBand`, and `coverage` (the `task_coverage` map). The no-task path is unchanged.
- **"Improve your answer" re-attempt.** When a graded task returned a `content_band` **and ≥1 requirement
  is ✗**, surface a single prominent action that: keeps the task selected + the student's draft in the
  box; foregrounds the **specific missed requirements**, each with an **authored how-to-fix hint** (teach
  strategy, not just flag); **leads with where-to-next, shows NO praise** in the revise phase. The student
  rewrites it themselves (no "apply AI fix" button).
- **Before→after comparison.** On resubmit of the same task, show the Content band **before → after** and
  **which ✗ flipped to ✓**, computed by a pure diff against the prior `writingHistory` entry for that
  task. This is the gap-closure the evidence requires — and it states "improved" **only on a real band
  rise / real ✗→✓ flip**, never on encouragement.
- **The improvement-detection eval (load-bearing).** Extend `scripts/ai-tier-eval` with **cosmetic-edit
  gold pairs**: an essay + a trivially-edited version that does NOT genuinely satisfy a missed
  requirement. Pinned assertion: the cosmetic edit must **not** flip a real ✗→✓ or raise `content_band`
  above its true ceiling. This gates whether the comparison ships as a confident claim on the free tier.
- **Honest degrade.** AI down / parse fail / no task / `aiGradeUnavailable` → no comparison, no guessed
  improvement; reuse the existing `AddKeyNudge` / "not assessed" discipline.

**Stage 2 (GATED — do NOT build until Stage-1 signal justifies it):** spaced **feed-forward** re-attempt.
Harvest the Content gap into the existing **/mistakes Fix-up queue** (reuse `getFixUpQueue` /
`markMistakeReviewed`) as a `type:'writing'` reflect item whose action is **"Re-attempt in Writing"**,
deep-linking `/writing` with the task pre-selected (ideally a *sibling* task — feed-forward). No new
scheduler. **Gate:** Stage-1 data shows students (a) reach tasks and (b) re-attempt; AND the task bank
has grown enough for sibling tasks. If not, the higher-value next slot is **more tasks / Malay content
grading**, not Stage 2.

**Out of scope (YAGNI):**
- Any AI that *writes the fix for the student* (passive acceptance harms the writer — research §backfire).
- A dedicated FSRS scheduler for writing re-attempts (the mistake queue is the spacing substrate).
- Malay 0546 loop — gated behind Malay Content grading (the named fast-follow of the precursor spec); the
  loop mechanism is language-agnostic and ports once Malay tasks+grading exist.
- "15–30% uplift" or any unsupported number in copy (research correction).
- Changing the existing Language band / error detection / the no-task flow.

---

## 3. Architecture — units, interfaces, data flow

### 3.1 Durable gap capture (`src/hooks/useWritingEvaluator.js:72-77`, `src/store/useStore.js:984`)
- **Change:** route the existing `logWritingFeedback?.({ lang, format, band, words })` calls through a
  pure `buildAttemptEntry({ lang, format, band, words, task, aiResponse })` (in `writingReattempt.js`,
  §3.2) that adds `taskId`, `contentBand`, `coverage` **only when a task was graded** (`task?.id`
  present). The no-task / Malay / AI-down entry stays **exactly** `{ lang, format, band, words }` —
  truly byte-identical to today, not "plus null fields".
- **No store migration.** `logWritingFeedback` spreads `entry` (`useStore.js:988`), caps at 100, and
  sync uses key-union merge — the extra fields are additive and safe; old records simply lack them.
- **Why a unit:** this is the *only* fundamentally-new persistence; everything else reuses existing flow.

### 3.2 The re-attempt affordance (`src/pages/Writing.jsx` + a small `src/lib/writingReattempt.js`, pure)
- **`writingReattempt.js` (new, pure, tested):**
  - `missedRequirements(task, coverage) → { index, text, hint }[]` — the ✗ requirements (where
    `coverage['req_'+i] !== true`), each paired with its authored hint (§3.4). Empty → no re-attempt CTA.
  - `compareAttempts(prevEntry, currEntry, task) → { bandBefore, bandAfter, delta, flipsToMet: number[],
    flipsToMissed: number[], improved: boolean }` — pure diff over two `writingHistory` entries for the
    same `taskId`. `improved` is true ONLY if `bandAfter > bandBefore` OR `flipsToMet.length > 0` (a real,
    earned change — never set from positive language).
- **`Writing.jsx`:** when `results.aiGrade?.content_band` is numeric AND `missedRequirements(...)` is
  non-empty, render an **"Improve your answer"** panel (below `ContentTraitPanel`) listing each missed
  requirement + its how-to-fix hint, with one button that re-focuses the textarea (draft + task retained;
  the page is already in this state — the button is a scroll/focus + a "revise mode" flag, not a state
  rebuild). On the next `analyze()` for the same task, if a prior entry exists, render the
  `compareAttempts` result (band before→after + which requirement flipped) — where-to-next framing, no
  praise copy.

### 3.3 De-emphasize the band, foreground the checklist (`ContentTraitPanel.jsx` / surrounding layout)
- Research: a grade shown alone suppresses engagement with the comments. The requirement coverage list is
  already the actionable part; ensure the **checklist reads before/above the band ring** in the revise
  context and the re-attempt panel does not repeat the number as the headline. (Low-risk layout tweak;
  ContentTraitPanel already renders the checklist — this is ordering/emphasis, not new logic.)

### 3.4 Authored how-to-fix hints (`src/data/writingTasks.js`)
- **Change:** add an optional `hints?: string[]` to each task, **index-aligned to `requirements`** — one
  short, concrete "how to satisfy this" line per requirement (e.g. for "Suggests a fair rule": *"Name one
  specific rule and say when it would and wouldn't apply."*). Authored + web-verified to IGCSE
  expectations, like the prompts themselves; **no AI dependency** (teaching the fix can't itself
  over-praise). Honest fallback: requirement with no hint → show the requirement text alone.
- **Why authored, not AI:** Graham & Sandmel — the gain is the *taught strategy*; an authored hint is
  reliable and offline. The canonical-list test extends to assert `hints` (when present) is index-aligned.

### 3.5 Stage 2 (GATED, documented for completeness, NOT built in Stage 1)
- **Harvest the Content gap:** a new `harvestContentGap(aiResponse, task, { lang })` in
  `writingMistakeHarvest.js` → one `type:'writing'`, `category:'cohesion'` (reuse; a new `'content'`
  category would need the `MISTAKE_CATEGORIES` list + auto-promote gate audited — defer), `source:
  task.id`, `surface`/`note` = the missed requirements, `word:''` (so it stays a *reflect* item, never an
  FSRS card via the `canAutoPromoteMistake` gate). Flows through `logMistakeBatch` like today's harvests.
- **"Re-attempt in Writing" reflect target** in `MistakeJournal.jsx`: for `type:'writing'` mistakes with a
  task `source`, the reflect-mode CTA deep-links `/writing` with the task pre-selected (a query param or a
  one-shot store hint read by `Writing.jsx` on mount). Reuses `getFixUpQueue` + `markMistakeReviewed`.

### 3.6 The improvement-detection eval (`scripts/ai-tier-eval/`)
- **New gold set** `goldWritingReattemptEn.mjs`: pairs of `{ task, before, after, label }` where `label ∈
  { realImprovement, cosmeticEdit }`. `cosmeticEdit` = the `before` essay with trivial word-swaps that do
  **not** newly satisfy a previously-missed requirement. Weighted toward subtle cosmetic edits (the ones
  that fool a lenient grader).
- **Pinned assertion (the ship gate):** across **N samples** at low temperature, a `cosmeticEdit` must
  **not** flip a genuinely-missed requirement ✗→✓ and must **not** raise `content_band`; a
  `realImprovement` should be detected (band up or ✗→✓). Uses the **same shipped `buildWritingGradePrompt`
  builder** (parity rule, mirrors the 2026-06-25 Content eval).

---

## 4. The load-bearing invariant — no over-praise on improvement

> **The loop may report "improved" ONLY on a real, earned change** (a higher `content_band` or a genuine
> ✗→✓ requirement flip the grader can defend). A cosmetic edit must never earn an improvement claim.
> Pinned by `goldWritingReattemptEn.mjs` cosmetic-edit cases. If the free tier can't satisfy this, the
> *comparison* degrades to "re-graded — review your requirements" (no improvement verdict) or BYOK-gates;
> we never ship an improvement claim the eval shows the tier can't back. (This is the feature's
> reason-for-being restated; failing it means replan, not ship.)

---

## 5. Measurable Done (binary, eval-pinned)

**This design session (done when):** this spec + the TDD plan + the cited research doc exist, every code
reference grounded against the live files, and the spec honestly states what would make the bet not worth
building (§7). ✅ delivered this session.

**The Stage-1 build (binary targets for the implementation session):**
1. **Durable capture:** a graded task logs `taskId` + `contentBand` + `coverage` into `writingHistory`;
   the no-task path logs identically to today. — *unit test on the entry shape + a no-task regression pin.*
2. **`writingReattempt.js` pure functions:** `missedRequirements` returns exactly the ✗ requirements with
   hints; `compareAttempts.improved` is true **iff** band rose or a ✗ flipped to ✓ (false on equal/lower /
   cosmetic). — *unit tests, including the "no false improvement" case.*
3. **Re-attempt panel:** renders only when `content_band` numeric AND ≥1 ✗; lists missed requirements +
   hints; **contains no praise string**; the button retains task + draft. — *render test (assert absence
   of praise copy + presence of the missed-requirement hints).*
4. **Improvement eval (ship gate):** in `goldWritingReattemptEn.mjs`, across N samples, **cosmetic edits
   do not flip ✗→✓ or raise `content_band`** in ≥9/10 cases; real improvements are detected. — *the eval,
   reported like the 2026-06-25 Content eval; gates the improvement claim.*
5. **Honest degrade:** AI-unavailable → no comparison/improvement verdict, existing nudge, never a guess.
   — *unit/render test.*
6. **Hints authored** for the 3 existing English tasks, index-aligned, web-verified; canonical-list test
   asserts alignment. — *unit test.*
7. Gate green (build + the full unit suite all green + lint; paste the actual count as evidence, don't
   pre-assert it); README + driver.js guide + RESUME_HERE updated (standing
   rule); GOAL.md directed-epic slot points here.

**Stage 2 is explicitly NOT in the Done set** — it is gated on Stage-1 data (§2, §7).

---

## 6. Test / eval plan (TDD) — see the plan doc for task-by-task

- `writingReattempt.test.js` — `missedRequirements` (✗ only, hint pairing, empty when all met);
  `compareAttempts` (improved iff real change; equal/lower/cosmetic → not improved; ✗→✓ flip detection).
- `useWritingEvaluator` test — enriched `logWritingFeedback` entry carries `taskId`/`contentBand`/
  `coverage` on the task path; **no-task path entry is unchanged** (regression pin).
- `writingTasks.test.js` — extend: `hints` (when present) index-aligned to `requirements`.
- `Writing` render test — re-attempt panel present (missed reqs + hints, no praise) when ✗ present;
  absent when all ✓ or AI down; comparison shown on re-grade.
- `scripts/ai-tier-eval/goldWritingReattemptEn.mjs` + `score.mjs` — the cosmetic-edit over-praise floor
  (§5.4), via the shipped `buildWritingGradePrompt`.

---

## 7. Red-team of the bet — what would make this NOT worth building

(Full version in the research doc §red-team; the load-bearing ones:)
- **Task adoption unproven** (3 English tasks, opt-in, 2 days old). Stage 1 is the cheapest probe — it
  logs `taskId`, so it reveals whether tasks are used at all. If usage ≈0 → build more tasks / drive
  adoption, **not** Stage 2.
- **Uptake might not happen** (the field's central finding). Stage 1 measures the re-attempt rate; near
  zero → the premise failed, replan toward more-structured/required uptake, not more loop.
- **Cosmetic-edit over-praise** re-introduces the precursor's failure at the improvement layer → §4
  invariant + the eval is the ship gate; fail → degrade, don't ship.
- **Feed-forward needs sibling tasks** → Stage 2 gated; growing the bank competes with it for the slot.
- **Evidence honesty:** no isolated "revise-after-feedback" effect size; "feed-forward > same-task" is
  unstudied. The bet rests on resubmission/uptake evidence (Brooks d=0.70, Sadler, Carless) + focused-WCF
  (g=0.54), not an invented revision number.

**When to NOT build / build smaller:** if you'd rather make *both* languages' content feedback
trustworthy before any loop, the **Malay-0546 content-grading increment is the shovel-ready swap** (mirror
the proven English structure: Malay tasks + a Malay examiner Content prompt + a Malay gold set + the
over-praise eval). That is a legitimate alternative to Stage 1 and is flagged as the veto in the kickoff.

---

## 8. Decision log (decide-and-flag)

- **Build Stage 1 (immediate targeted revision) now; Stage 2 (spaced feed-forward) GATED on Stage-1
  signal + task-bank growth.** Stage 1 is cheap, highest-evidence, and doubles as the instrumentation that
  prevents over-investing in an amplifier for an unused feature (the "amplifier before the amplified" trap,
  [[feedback_red_team_own_decisions]]). *Veto:* build both now (more upfront, weaker learning-before-spend).
- **Loop on English first; Malay loop after Malay Content grading.** Mechanism is language-agnostic;
  mirrors the precursor's English-first de-risking. *Veto:* **swap Stage 1 for the Malay-0546 content
  increment entirely** (broadens the precondition to both audiences before any loop — shovel-ready, lower
  novelty risk). This is the explicit kickoff veto.
- **Reuse the mistake Fix-up queue for spacing (Stage 2), not a new FSRS scheduler.** It already is the
  app's "come back to what you got wrong" surface (`getFixUpQueue` ranks severity×recency, `markReviewed`
  clears). *Veto:* dedicated scheduler if true increasing intervals prove necessary.
- **Durable capture = enrich the existing `logWritingFeedback` entry; no STORE_VERSION bump.** The entry
  is spread; extra fields are additive + sync-safe. *Veto:* a dedicated `writingAttempts` slice (needs a
  migration) if attempt history outgrows the 100-cap log.
- **Authored per-requirement how-to-fix hints in `writingTasks.js`; no AI for the fix guidance.** Teaches
  strategy (Graham & Sandmel), offline, can't over-praise. *Veto:* derive hints from
  `content_justification` (adds AI dependency + an over-praise surface).
- **Lead with where-to-next; NO praise in the revise phase; foreground the checklist over the band.**
  Research-forced (Brooks −0.15 praise; grades suppress engagement). *Veto:* none — evidence-backed.
- **Student does the rewrite; NO "apply AI fix" button.** Guards passive acceptance (~45% over-reliance).
  *Veto:* none — evidence-backed.
- **The improvement claim is eval-pinned (cosmetic edit must not flip ✗→✓); the eval is the ship gate.**
  *Veto:* none — it is the feature's reason-for-being.
- **Drop the "15–30% IGCSE uplift" claim** (folklore, not found); cite d≈0.5 honestly. *Veto:* none —
  correctness.
