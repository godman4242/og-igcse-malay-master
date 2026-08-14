# THE GAUNTLET — the standing engine for making this the best IGCSE Malay + English tool

> **What this is.** A permanent, self-re-arming gauntlet-loop that grinds the app toward
> one measurable outcome — **a student learns more per minute here than anywhere else** —
> one **lane** per run, each lane gated binary, each run resumable after a crash.
> It is not a session kickoff. Sessions come and go; this file is the engine they run.
> `RESUME_HERE.md` owns *current state*; this file owns *the method*.
>
> **Provenance.** Adapted from the **gauntlet-loop** prompting technique (Jay E /
> RoboNuggets, 2026-08-05) via `SSHD 1-1/docs/GAUNTLET.md`: three parts — TASK,
> BUILD METHOD (fan out sub-agents, each paired with a blind critic), QUALITY BAR
> (loop until every critic passes against the real thing). §0 explains the one change
> this repo needs, which is **not** the change SSHD needed.
>
> **Owner rulings baked in (2026-08-13):** outcome-first lane board (3–5 lanes, not 12) ·
> ground truth = real CIE mark schemes + candidate responses · Opus 5 @ `xhigh` default,
> Fable 5 @ `high` bounded on genuinely from-scratch lanes (§2).

---

## §0 THE ONE ADAPTATION — WHY THE VANILLA GAUNTLET-LOOP WOULD FAIL HERE

The technique's quality bar is *"do not stop until each sub-agent is utterly wowed with the
quality when compared with the actual thing."*

**SSHD's problem was that the real thing was DEAD** — no critic could go look at it, so every
critic voted from memory.

**This repo's problem is the opposite and more dangerous: the real thing is ALIVE, public, and
one fetch away — so a critic can *claim* it checked and never have looked.** There is no dead
build to make the lie obvious. A critic that says *"verified against Kamus Dewan"* with nothing
quoted is indistinguishable from one that actually looked, and Kheshav is **not Malay-fluent**
(`~/.claude` memory: `user_not_malay_fluent_claude_is_gate`), so a wrong Malay verdict ships.

**This is not hypothetical — it is the measured base rate.** Batch 7 of the dictionary-example
grind put 45 already-worker-approved sentences through three independent PRPM/Kamus-Dewan
verification passes and found **8 defects** (`docs/loop/GOAL.md`, epic #2) — clustered on
transitivity traps (`membazir` intransitive vs `membazirkan` transitive). Two `dictionary.js`
headword/gloss defects survived to production and were only fixed 2026-07-29 (`mee` → `mi`;
`masak` *cook* → *cooked/ripe* — the app was teaching a headword its own 24,439-word
spell-checker rejects).

### The rule that replaces it

> **EVERY CRITIC IS AN ARTIFACT CRITIC, AND EVERY ARTIFACT MUST BE QUOTED.
> A verdict that does not paste the source text it relied on is VOID, and the finding it
> judged returns to the pool unjudged.**

An artifact is exactly one of:

| # | Artifact | What citing it looks like |
|---|---|---|
| **A1** | An **external authority** — PRPM / Kamus Dewan (DBP), the CIE 0546 / 0500 / 0510 syllabus, a published mark scheme or Example Candidate Response | **the quoted line AND its URL.** "PRPM confirms it" is VOID. Paste the entry. |
| **A2** | A **repo data row** — a `dictionary.js` entry, a `malayValidityList.js` membership (24,439 words), a `writingErrors*.js` rule, a passage/drill as written | file + the line, quoted |
| **A3** | A **test in the suite** | the test name + **pasted** output |
| **A4** | A **measured number** — grader-vs-examiner agreement, bundle bytes, coverage count — carrying its own A1/A3 cite | the number + how it was measured + the cite |
| **A5** | **Kheshav's own USE verdict**, logged verbatim | the log line |

Not artifacts, and auto-void if cited: the model's memory of Malay or of a syllabus · another
agent's summary · "it reads naturally" · an unquoted claim of having web-verified · plausibility ·
**our own authored content graded against itself** (see §1).

**Standing invariant, outranking everything:** when an external authority (A1) and our own repo
content (A2) disagree, **the authority wins** — fix the repo and pin the fix with a test, and
**say so out loud**. This is already precedent, not new policy: `dictionary.test.js` carries the
`ijazah` / `mi` / `masak` content-truth pins.

---

## §1 THE FINDING THAT RE-SCORES THE BOARD (2026-08-13)

**The writing grader — the app's flagship experimentation surface and Kheshav's stated #1 defect
("needs to be more accurate") — has never been measured against a real examiner.** Verified
first-hand, this date:

| What exists | What it actually is |
|---|---|
| `src/lib/writingGrader.js` (553 lines) | Marker-phrase format detection + sub-band scoring. Rule-based. |
| `src/lib/writingErrors.js` (~102 KB) + `writingErrorsMalay.js` (~45 KB) | Regex error lexicons. Per CLAUDE.md: Malay 15/24, English 22/29 semantic-grammar rules. |
| `writingGrader.test.js:63` — `accuracy: expect.any(Number)` | **The grader's own output sub-band name.** Not measured accuracy. Asserts a number exists. |
| `writingGrader.test.js:77` — *"hard cap holds: overall ≤ accuracy + 1"* | An **internal-consistency** invariant. Says nothing about whether the band is right. |
| `writingErrors.test.js:70` — *"calibration negatives (no false positives)"* | **Precision-on-negatives only** — the detector must not fire on correct text. No recall, no band agreement. |
| `src/data/exemplars.js` (451 lines) | Band-5/6 paragraphs **we authored**. Grading these is **circular** — auto-void as a calibration set under §0. |

**No test, script, or doc anywhere in the repo compares a grader band to a band a real examiner
awarded.** Consequence: *"more accurate"* has no before-number, so **no lane can gate on it**, and
any agent that "improves" the grader is improving an unmeasured thing — the exact shape of
confident-wrong this engine exists to stop.

**Consequence for the engine: L0 measures before any grader lane is planned.** A lane that claims
an accuracy improvement without an L0 number has failed its own gate.

### §1.1 Why this outranks everything else Kheshav asked for

He asked for: (a) a more accurate grader, (b) more AI providers, (c) a built-in translator,
(d) more experimentation surfaces. **(b) makes (a) worse until L0 exists** — adding providers to
an unmeasured grader multiplies the ways to be confidently wrong and gives you no way to tell
which provider is better. And the product thesis makes accuracy load-bearing, not optional:

> *"instead of a straight-forward curriculum … students can play around with the writing grader
> and test the waters themselves"* — Kheshav, 2026-08-13

An experimentation-first tool has **no teacher in the loop to catch a wrong verdict.** A grader
that is confidently wrong while a student "tests the waters" teaches errors at scale, to exactly
the users with no way to detect it — the foreigner with no curriculum, the adult not in school.
**Grader accuracy is not in tension with experimentation. It is its precondition.**

---

## §2 THE LANE BOARD — model, scale, and the gate

**The done-anchor is two-tier** (owner answers 2026-08-13 reconciled — see R1):

- **Tier A — the hard gate.** Any surface that **judges** the student (writing grader, speaking
  band, comprehension marking) must agree with a **real mark scheme**, measured, with the number
  pasted. Ground truth is external and citable (A1).
- **Tier B — the measurable soft gate.** Any surface that lets a student **experiment** must take a
  user with **zero curriculum knowledge** from *their own input* → *a specific correct diagnosis* →
  *a known next action*, proven by a **scripted walkthrough with a step count**, never by vibes.
  This is the gate for the no-curriculum audience (IB / SPM / foreigners learning to speak for
  work / adults not in school).

**Routing.** **Opus 5 @ `xhigh`** is the default: this is a mature codebase (21 routes, 240 test
files) where the dominant work is **content-truth verification and surgical edits**, and being
confidently wrong is expensive. **Fable 5 @ `high`, bounded 12–16, lean prompts** only for a lane
that is genuinely **from-scratch subsystem construction**. See R5 — this is an *application* of the
standing routing rule, not an exception to it.

### ⚠ THE RULE THAT OUTRANKS BOTH: MATCH THE TOOL TO THE WORK — AND IT CUTS BOTH WAYS

SSHD's rule was *a script beats a swarm*, because its bulk work was deterministic transforms.
**Here the split is different and must be stated in both directions:**

- **A transform gets a script + a byte-check, NEVER a fan-out.** Regenerating `dictionaryEn.js`
  (`npm run build:en-dict`), icon manifests, fixtures. Agents copying rows introduce errors a
  script cannot make.
- **A truth-judgement gets an agent + a QUOTED citation, NEVER a script and NEVER a lone worker.**
  Whether `membazir` takes an object, whether a band-4 script is really band-4 — no regex decides
  that. This is where the agents go, and every one of them pairs with a blind critic (§3).
- **Never invert it.** A script cannot rule on Malay. An agent must not hand-copy 825 rows.

**Sonnet 5 `medium` / Haiku 4.5 `low`** — only for genuinely per-row *classification* (bucketing an
ambiguous field), never for a truth verdict and never for copying.

| # | Lane | Model · scale | The lane is done when |
|---|---|---|---|
| **L0** | **MEASURE THE GRADER** — the scripts are **located** (§2.1); transcribe them into **gitignored** fixtures with their awarded per-criterion marks, then build `scripts/grader-accuracy-harness.mjs` alongside the existing `ocr-`/`asr-accuracy-harness.mjs` and record the **baseline agreement** for EN and MS separately | **Opus · small (~4–6)** — sourcing is done; the work is transcription + harness | every located script transcribed with its awarded marks and an **A1 cite**; harness runs locally (**not** in CI — fixtures are gitignored, R8); **per-script deltas + rank-order agreement recorded for both languages** with pasted output; **no correlation coefficient and no "% agreement" headline at n≈18/13** (§2.1); `RESUME_HERE.md` carries the numbers |
| **L1** | **GRADER ACCURACY** — improve on L0's baseline. Rule fixes, sub-band re-weighting, prompt work for the AI tier | **Opus · heavy** (adversarial; a wrong band is the expensive failure) | per-script deltas shrink against the L0 baseline, pasted before *and* after; no regression in `writingErrors` false-positive negatives (A3); **and the anti-overfit gate — at n≈18/13 a held-out split is not viable, so EVERY rule change must carry an A1 cite for why the rule is LINGUISTICALLY right, not merely that it moved the number.** A change that improves the score with no authority behind it is refused |
| **L2** | **MORE AI PROVIDERS** — Groq + Cerebras (+ any live free-tier winner) as **BYOK** adapters behind the frozen `instruct.js` seam | **Opus · small** — it re-seams a public API and touches key handling | providers selectable; keys in **per-provider `localStorage`, never the Zustand store** (A3); 429 → cooldown → auto-switch (A3); **each provider scored on L0's harness and the per-provider numbers published** — "more providers" must mean *measurably better*, or the provider is labelled worse and kept anyway with the number shown; model slugs **discovered at runtime, never hardcoded** |
| **L3** | **TRANSLATOR** — a real MT surface (Google-Translate/DeepL class) as a **deliberate tool page**, not an auto-overlay | **Fable · bounded** if a new engine is built from scratch; **Opus · small** if it's an adapter over an existing provider | a user can paste MS↔EN text and get a translation; **the reveal-gate is provably untouched** — an A3 test asserts study surfaces still default Malay-only and reveal only on deliberate press; a cost/privacy path is stated (on-device vs BYOK vs proxy) with the choice's evidence |
| **L4** | **ZERO-CURRICULUM ON-RAMP** — the foreigner / adult / IB / SPM user who does not know where to start and needs to produce language now | **Fable · bounded** (from-scratch flow) · **Opus critic** on every walkthrough | a **scripted walkthrough** proves a first-time user with no curriculum selected reaches *their own input → a specific correct diagnosis → a named next action* in **≤ N taps** (N fixed by the lane before it starts, in the plan, not after); Tier-B gate; Kheshav's A5 verdict logged |

### 🚫 NOT LANES — the engine must not drift into these

`PROBLEMS.md` items 1–5 (the `::highlight` lightningcss warning, the transformers.js chunk-size
warning, the 3 tracked exhaustive-deps warnings) are **known, benign, and tracked**. They move no
axis in §2 and get **no lane**. Same for generic "add tests to pure-lib X" — `docs/loop/GOAL.md`
already names that as busywork, not a gap. If a run's best idea is one of these, the run makes
**no commit** and says so.

### ✅ L0 IS DONE — 2026-08-14. The board's next lane is L1.

Ran on Opus 5 @ `xhigh`. 22 examiner-marked scripts (13 Malay 0546 P4 + 9 English 0510 P2) each
transcribed **twice independently** from the page images, adjudicated where the two passes disagreed,
and measured. **11 of 13 gradeable bands were identical across the two passes**, so transcription
noise does not explain the results. Journal + full numbers: **`docs/gauntlet/L0/README.md`**.

**The before-number L1 must beat:** Malay `12 of 17` non-tied pairs ordered correctly (n=7);
English `10 of 13` (n=6). **Four** measured defects, **F1 first** (two scripts awarded the *same*
11/30 come back as bands 2 and 4 — inconsistency, which no single constant can fix). Harness:
`npx vite-node scripts/grader-accuracy-harness.mjs` (local only — fixtures are gitignored UCLES
material, R8).

⚠ **A fifth "finding" (F2) was published and then REFUTED by this lane's own follow-up.** It claimed
English format detection was completely dead; the real cause was the *harness* passing `lang:'english'`
where the app passes `lang:'eng'`, so `listFormats` matched zero formats and every script reported
`(none)`. **§0 cuts both ways: it caught my own confident-wrong finding, not just an agent's.** The
generalisable rule now added to the engine: **a measurement harness must speak the application's own
vocabulary, or it measures a configuration no user ever runs** — and a near-miss enum value can fail
silently while every other number still looks plausible. Pinned by
`src/lib/__tests__/writingGraderLangContract.test.js`.

**Two things this lane learned that every future lane inherits:** (a) a usage limit killed 5 of 6
agents mid-run and **no content was lost**, because workers write each unit to disk immediately —
so always write-per-unit, tell workers to skip existing files, and reconcile against the filesystem,
not the workflow's return value (it understated real progress by 4×); (b) §2.1's English sets had no
pasted URL and the obvious path 404s — the working one is now recorded in the L0 journal.

**Ordering rule:** **L0 first, always** — it is the only lane that unblocks the others. Then
**L1 → L2** (L2 is worthless before L0 and actively harmful before L1: more providers on an
unmeasured grader = more ways to be wrong). **L3 and L4 may run in parallel with L1** — they touch
different files — but never in the same run. One run = one lane.

### §2.1 THE CALIBRATION SET — ✅ RESOLVED 2026-08-13, and the 3 constraints that replace the risk

This section previously warned that Malay 0546 might have **no** published marked scripts, and that
the whole board was gated on finding out. **It does have them.** Resolved by a 26-agent sweep
(5 finders → a blind refuter per claim, each required to re-fetch and quote) plus a first-hand
verification pass. **The prediction was wrong in the good direction — recorded here rather than
quietly overwritten.**

| Language | Set | n | Marks carried |
|---|---|---|---|
| **English** | 0500/0990 Paper 2 ECR (from 2020) | 9 scripts | reading /15 + writing /25; content-and-structure /16 + style-and-accuracy /24; totals 35/40 → 16/40 |
| **English** | 0510/0511/0991/0993 Paper 2 ECR (from 2019) — one booklet covers all four codes | 9 writing scripts | Content /8 + Language /8 |
| **Malay** | **0546 Paper 4 (Writing) ECR (from 2017)** | **13 scripts** | Communication /10 + Accuracy /10 + Range-Variety-Appropriateness /10 |

**Verified first-hand, not taken from an agent** (§0 applies to my own claims too): the 0546 booklet
returns `HTTP/2 200`, `application/pdf`, `1,945,767` bytes; its text layer contains **13**
`Total mark awarded` lines (`30 out of 30` … `7 out of 30`, plus /5 and /15 short tasks) and
per-criterion lines (`Communication = 10 / 7 / 2 / 0`, `Accuracy = 10 / 4 / 2 / 5`).
`papers.xtremepape.rs/CAIE/IGCSE/Malay - Foreign Language (0546)/0546_Example_Candidate_Responses_Paper_4_(for_examination_from_2017).pdf`

**The three constraints that now replace the sourcing risk — a lane that ignores any of them fails:**

1. **⚠ RUBRIC DRIFT (Malay).** The 2017 booklet marks Paper 4 out of **50**; the live 2025–27
   syllabus is out of **45**, and 2028 is out of **40** with reworked descriptors. **So the Malay
   number is RANK-ORDER agreement, never absolute band agreement** — and any lane reporting an
   absolute Malay band-match % has failed its own gate.
2. **⚠ THE SCRIPTS ARE SCANNED HANDWRITING.** The text layer carries the marks and the examiner
   comments but **not the candidate's prose**. Transcription is by hand. **Do NOT run OCR on these**
   — an OCR error is indistinguishable from a candidate spelling error, which is precisely what the
   Accuracy criterion scores, so OCR would corrupt the very signal being measured. (This is the one
   place the repo's own OCR pipeline must not be reused.)
3. **⚠ SMALL n (≈18 EN / 13 MS).** This is a **sanity check, not an agreement study.** Report
   per-script deltas and rank order. **Never a correlation coefficient, never a headline "% agreement"** —
   both imply a precision n cannot support, and overstating a measurement is the same defect class
   this engine exists to stop.

**Rejected with evidence — SPM `Kupasan Mutu Jawapan` (Lembaga Peperiksaan) as the Malay fallback.**
It publishes real scripts but labels them only *"Prestasi Tinggi"* / *"Sederhana"* — **no numeric
marks and no low band at all** — and it is a **native-speaker** paper, so its standard would
systematically under-mark a competent 0546 *foreign-language* learner. Construct mismatch, not just
a scale mismatch. (a) a native-speaker panel scoring against the **live** 0546 mark scheme remains
the fallback **if constraint 1 proves fatal**; **never (d): grade Malay against our own
`exemplars.js`** — circular and auto-void under §0.

**Honest gaps in this resolution — stated, not buried (§3 no-silent-caps):**
- **23 lower-ranked resources went unverified.** The sweep capped verification at the top 4 per
  finder. What survived is a floor on what exists, not a ceiling.
- **Newer booklets are login-gated** behind Cambridge's School Support Hub: 0500 ECRs after 2021,
  0510 Paper 1 ECRs (2019 and 2024), and a **2022 0546 Paper 4 ECR** whose title is known but whose
  interior nobody here has seen. **A human with a Centre login would materially enlarge n** — the
  single highest-value manual action available on this lane.
- The 0510 2027–2029 specimen mark scheme is unpublished, so post-2026 0510 descriptors are unverified.

---

## §3 THE ENGINE — how one run works

**One run = one lane. Never two.**

1. **ARM.** Read `RESUME_HERE.md` + this file. Pick the lane by §2's ordering rule. State the lane,
   the model, the scale, and the gate **before** any agent spawns. If the running model does not
   match §2's routing for that lane, **stop and say so** — never run a heavy judgement lane on a
   bounded budget.
2. **CHECK THE LOOP IS PARKED.** `scripts/build-loop.sh` and this engine both pick "the next gap"
   and both hit a pre-commit `git add -A`. **They must never run together.** Confirm
   `docs/loop/PAUSE` exists (or the loop is not running) before spawning. See R2.
3. **FAN OUT.** Decompose the lane into independent sub-tasks. Every worker gets **one blind
   critic** — blind meaning it sees only the output and the artifacts, never the worker's
   reasoning, and is prompted to **REFUTE**, defaulting to *refuted* when uncertain.
4. **JUDGE.** A finding survives only on a **quoted-artifact** verdict (§0). Heavy lanes use
   **3–5 critics with distinct lenses** (does it match the authority · does it match the mark
   scheme · does it break an invariant · does it survive the suite · would a beginner be misled);
   bounded lanes use **1–2**. Majority refute kills it.
5. **JOURNAL AS YOU GO.** Every stage writes to disk **immediately**, never held in context, under
   `docs/gauntlet/<lane>/`. A run that dies mid-flight is then salvageable — only the dead agents
   re-run, on a cheaper model.
6. **LOOP UNTIL DRY.** Keep spawning finders until **two consecutive rounds surface nothing new**.
   Dedup against everything **seen**, not everything **confirmed** — otherwise critic-rejected
   findings reappear every round and the loop never converges.
7. **GATE.** Binary. Every item green with **pasted** output, or the lane stays open.
   **Never soften a gate to fit a result** — re-author, or bring Kheshav the ruling.
8. **RE-ARM.** Update `RESUME_HERE.md` + `docs/loop/GOAL.md` **in the same commit as the change
   they describe**, tick the lane in §2, and name the next lane. The engine is not done until it
   has pointed at its own next run.

**No silent caps.** If a run bounds coverage — top-N, sampling, skipped rows — it must say what was
dropped. Silent truncation reads as "covered everything."

### §3.1 RUN THE FAN-OUT AS A WORKFLOW — hybrid, never fire-and-forget

**Use the `Workflow` tool for step 3's fan-out.** Its documented patterns already *are* this
engine — adversarial verify (N skeptics per finding, prompted to refute, majority-refute kills
it), perspective-diverse verify (one lens per critic), loop-until-dry (**dedup against everything
seen, not everything confirmed** — step 6's convergence rule), and no-silent-caps.

**The reason that outranks convenience: it makes §0 CODE-ENFORCED, not requested.** Schema-force
every critic to return `{ verdict, sourceQuote, sourceUrl }` and **drop any result whose
`sourceQuote` is empty.** A prompt *asks* a critic to quote its authority; a schema *refuses a
verdict that doesn't*. Given that this repo's failure mode is a critic **claiming** it checked
(§0), this is the single highest-leverage mechanical defence available.

**Two limits the lane must design around:**

- **The script has no filesystem.** It cannot write step 5's journal itself. Crash-survival comes
  instead from the harness's auto-persisted `journal.jsonl` (every agent's return value) plus
  resume-from-runId, which replays the unchanged prefix from cache. **Durable lane notes under
  `docs/gauntlet/<lane>/` are written by the SUBAGENTS**, which do have tools — never by the script.
- **A workflow cannot stop and ask.** It runs to completion and returns. So **any lane carrying an
  open fork must scout inline FIRST.** This binds hardest on **L0**: §2.1 says that if the Malay
  0546 exemplars don't exist, the run **brings Kheshav the fork rather than picking one** — and the
  forbidden branch (grading Malay against our own `exemplars.js`) is the convenient one a
  fire-and-forget script would take.

**Therefore: HYBRID.** Scout inline → resolve any §2.1-class fork with Kheshav → **then** one
workflow per fan-out stage. **Never one workflow for a whole lane.**

**Do NOT enable ultracode as a standing session mode.** It would turn *every* substantive task into
a workflow — including step 1's ARM, which must stay conversational because §5's prompt requires
Kheshav's OK **before** anything spawns. Standing ultracode fans out before the shape is approved.
Use the per-prompt keyword on a specific lane instead.

**Size:** the session default keeps a workflow under ~15 agents. L0 (~6–8) fits comfortably. A
heavy **L1** wants more than that — **it needs Kheshav to raise the cap explicitly**, and the run
must say so at ARM rather than silently sampling (step 7's no-silent-caps).

---

## §4 THE NO-TOUCH LIST — a lane that touches these without the protocol has failed

- **`dictionary.js` values stay STRINGS.** A **shape** invariant (pinned by `dictionary.test.js` /
  `contentLint.test.js` / `listeningMistakes.test.js`), **not a content freeze** — fixing a wrong
  gloss is allowed, expected, and must be pinned with a content-truth test. Regenerate
  `dictionaryEn.js` in **lock-step** (`npm run build:en-dict`; never hand-edit).
- **Reveal-gated translation.** Default Malay-only; English revealed only on a deliberate press.
  **L3 must not weaken this** — a translator is a destination you go to, never an overlay that
  removes the gate.
- **The `instruct.js` seam is frozen** (`hasInstructProvider()` / `callInstruct()`), and **BYOK keys
  live in per-provider `localStorage`, NEVER the Zustand store** — that is what keeps them out of
  the cloud sync blob. L2 owns this and only L2.
- **`STORE_VERSION`** (currently 35) — any shape change adds a migration case that preserves all
  existing data. **Any sync behaviour change must extend**
  `src/store/__tests__/syncTwoDeviceIntegration.test.js`.
- **Malay and English decks never mix in one session** (`cardsForLang`); `card.m` = target word,
  `card.e` = L1 gloss.
- **The eager-bundle pins** (`src/store/__tests__/eagerDataGraph.test.js`) — before adding anything
  to the eager path, **re-measure and say what moved it**.
- **`@huggingface/transformers` is PINNED to v3** (v4's nightly ORT-web deadlocks in-browser).
  **OpenRouter model slugs are discovered at runtime, never hardcoded.**
- **Every new drill surface renders `<FeedbackLive>`**; interactive header/toolbar/modal targets
  stay ≥44×44px.
- **The pre-commit gate is not bypassed.** `--no-verify` ships unverified straight to prod.

---

## §5 THE GAUNTLET PROMPT — paste-ready

Copy everything **between** the `'''` markers (the markers are not part of it).

```
'''
You're the lead engineer on IGCSE Malay Master. Follow the repo's CLAUDE.md and my ship-bar.

READ FIRST, then tell me the lane you're taking and why before you spawn anything:
- RESUME_HERE.md
- docs/GAUNTLET.md   <- the standing engine; §2 is the lane board, §0 is the law

THE TASK: run ONE gauntlet lane to its binary gate. Pick it by §2's ordering rule (L0 first
if it hasn't run). One lane per run — never two.

THE BUILD METHOD: fan out sub-agents across the lane's independent sub-tasks. Pair every
worker with a BLIND CRITIC that sees only the output and the artifacts, and is prompted to
REFUTE — default to refuted when uncertain. Heavy lanes: 3-5 critics with distinct lenses.
Bounded lanes: 1-2. Have the subagents journal to docs/gauntlet/<lane>/ the moment a stage
lands, so a dead run is salvageable. Loop until two consecutive rounds surface nothing new,
deduping against everything SEEN, not everything confirmed.

RUN THE FAN-OUT AS A WORKFLOW (§3.1), and use it to make §0 mechanical: schema-force every
critic to return { verdict, sourceQuote, sourceUrl } and DROP any result whose sourceQuote is
empty. A prompt asks a critic to quote its authority; a schema refuses a verdict that doesn't.
But SCOUT INLINE FIRST — a workflow cannot stop and ask me anything, so any fork only I can
settle must be settled BEFORE you spawn. Hybrid: scout inline -> bring me any fork -> then one
workflow per fan-out stage. Never one workflow for a whole lane.

L0's sourcing fork is already CLOSED — §2.1 has the located sets and their URLs, including 13
examiner-marked Malay 0546 scripts. Do NOT re-run that search. Do obey the three constraints
that replaced it: Malay is RANK-ORDER agreement only (the 2017 rubric is /50, live is /45),
the scripts are scanned handwriting so they are HAND-transcribed and never OCR'd, and at
n≈18/13 you report per-script deltas — never a correlation coefficient or a "% agreement"
headline. Transcriptions are UCLES copyright: gitignored, never committed, never shipped (R8).

THE BAR — §0 is absolute: EVERY CRITIC IS AN ARTIFACT CRITIC, AND EVERY ARTIFACT IS QUOTED.
The authorities here are ALIVE and one fetch away — PRPM/Kamus Dewan, the CIE 0546/0500/0510
syllabus and mark schemes — so the failure mode is an agent CLAIMING it checked. A verdict
that does not PASTE the source line and its URL is VOID and its finding goes back in the pool
unjudged. Never grade our own authored content against itself (exemplars.js is circular).
When an external authority and our repo content disagree, THE AUTHORITY WINS — fix the repo,
pin it with a test, and say so out loud.

Do not stop until every gate item in §2 for that lane is green with PASTED output. Never
soften a gate to fit a result: re-author, or come to me for a ruling. If the only work left
is a PROBLEMS.md warning or "add tests to pure-lib X", make NO commit and say so.

WHAT NOT TO BREAK: §4's no-touch list. dictionary.js values stay strings (content fixes are
allowed and get pinned). The reveal-gate stays — a translator is a destination, not an
overlay. BYOK keys stay in per-provider localStorage, never the Zustand store. STORE_VERSION
changes carry a migration. Re-measure the eager bundle before adding to it. Never --no-verify.

BEFORE YOU FAN OUT, THREE CHECKS:
(a) IS THE BUILD LOOP PARKED? scripts/build-loop.sh and this engine both pick "the next gap"
    and both hit the pre-commit `git add -A`. Confirm docs/loop/PAUSE exists or the loop is
    not running. Do not spawn into a race.
(b) TOOL MATCHES WORK, BOTH WAYS. A deterministic transform gets a SCRIPT + a byte-check,
    never a fan-out. A truth-judgement (is this Malay right? is this really band 4?) gets an
    AGENT + a quoted citation, never a regex and never a lone worker. Do not invert it.
(c) ROUTING: Opus 5 @ xhigh is the default — this codebase is mature and the work is
    verification and surgical edits. Fable 5 @ high, bounded 12-16, lean prompts, ONLY for a
    genuinely from-scratch subsystem. If I've started you on the wrong model for your lane,
    say so and stop.

FIRST, DO THIS: confirm the baseline (git log -1 + npm run test:run -> 249 files / 2385 tests
green, measured 2026-08-13), name your lane + model + scale + the exact gate you're driving
to, and show me the fan-out shape. Don't spawn until I ok it.
'''
```

**Start command** (from the repo root):

```bash
cd "/Users/kheshav/kheshav-code/og igcse malay master" && touch docs/loop/PAUSE && git log --oneline -1 && npm run test:run 2>&1 | tail -6
```

---

## §6 RULINGS MADE FOR YOU — each with a one-line veto

**R1 — The done-anchor is TWO-TIER, because your two answers pulled apart.** You picked *"exam
outcome vs real papers"* as the anchor, then described an audience that includes *"foreigners
learning who do not know which curriculum to start with and need to immediately start speaking so
they can start work"* and *"adults who do not go to school."* **A CIE past paper is not those
users' ground truth**, so a single exam-only anchor would leave your fastest-growing audience with
no gate at all. Resolved in §2: **the mark scheme is the *calibration instrument*, not the *goal*.**
Tier A measures anything that judges a student against a real mark scheme; Tier B measures the
experimentation loop by a scripted, counted walkthrough. §1.1 is why these reinforce rather than
compete — an experimentation-first tool has no teacher in the loop, so a wrong verdict ships
straight into a beginner with no way to detect it.
> **Veto:** anchor on the exam alone — cleaner board, but L4 and every no-curriculum user become
> ungated, which is the audience you said you're building for.

**R2 — The gauntlet SUPERSEDES `build-loop.sh`'s self-sourcing mode; they never run together.**
Both pick "the next gap" and both hit the pre-commit `git add -A`, so a concurrent run is the
working-tree race that has already burned this repo (`~/.claude` memory:
`project_build_loop_forever`). `docs/loop/PAUSE` is the existing, gitignored switch and costs
nothing. The loop stays useful for unattended grind *between* gauntlet runs.
> **Veto:** keep both live — you'll get two agents committing over each other's uncommitted work.

**R3 — L0 runs before ANY grader lane, including the provider work you asked for first.** You
named accuracy as the defect; §1 shows accuracy has never been measured, so there is no
before-number for a lane to beat. Adding providers (L2) to an unmeasured grader multiplies the
ways to be wrong *and* leaves you unable to tell which provider is better.
> **Veto:** ship Groq + Cerebras first — fast and visible, but you'd be adding untested judges to
> an untested court, and you'd still not know if the grader got better.

**R4 — The translator (L3) is a DESTINATION, never an overlay.** Reveal-gated translation is
load-bearing pedagogy in this app (CLAUDE.md, and the 2026-06-11 dense-page easing work). A
Google-Translate-class surface you deliberately visit adds capability; an always-on overlay on
study content deletes the app's core learning mechanic.
> **Veto:** auto-translate study content — instantly more convenient, and it turns a retrieval
> tool into a reading tool.

**R5 — MODEL: Opus 5 @ `xhigh`. This is an APPLICATION of your standing routing rule, not an
exception.** Your rule sends multi-agent work to Fable 5 @ `high` — correct when the lanes are
from-scratch construction, which is what SSHD's are. **This app is mature** (21 routes, 240 test
files, every major system shipped), so the dominant lane work is **content-truth verification and
surgical edits in a large existing codebase** — the "interactive/surgical, being confidently wrong
is expensive" category your rule already assigns to Opus. Fable's long-horizon strength has little
to bite on here and its 12–16 cap would buy you nothing. **Switch to Fable @ `high` for L3 and L4
if they turn out to be genuine from-scratch builds** — a new translation engine, a new on-ramp
flow — with **lean prompts** (Fable degrades on step-by-step scaffolding).
> **Veto:** run L0/L1 on Fable — it would work, but you'd pay for long-horizon strength on a
> short judgement task and take a bounded agent ceiling you have no use for.

**R6 — `/fast` OFF for gauntlet runs.** Same model, faster output, **2× token price** ($10/$50 vs
$5/$25 on Opus 5). Worth it when a spinner costs your attention; wasteful on a long lane you are
not watching every second.
> **Veto:** `/fast` ON — snappier to sit with, roughly double the bill for identical output.

**R7 — Use `Workflow` PER LANE-STAGE; do NOT enable ultracode as a standing session mode**
(§3.1). Per-stage workflows buy the thing this repo most needs: **§0 enforced by schema rather
than by prompt** — a critic that returns no `sourceQuote` is dropped in code. Standing ultracode
buys the opposite: it fans out on *every* substantive task, including the ARM step, which must
stay conversational because §5 requires your OK before anything spawns — and because a workflow
**cannot stop and ask you** the §2.1 fork that L0 may hit.
> **Veto:** switch ultracode fully on — more autonomous, and L0 would silently pick the one
> branch §2.1 forbids (grading Malay against our own exemplars) instead of bringing it to you.

**R8 — The calibration scripts are UCLES copyright → transcriptions are GITIGNORED, never committed,
never shipped.** Verified verbatim from the booklet itself: *"Cambridge International Examinations
retains the copyright on all its publications. Registered Centres are permitted to copy material
from this booklet…"* **This repo is public**, so committing candidate scripts or their
transcriptions would publish third-party exam material from a public repo. Decided: fixtures live at
a **gitignored** path, the harness runs **locally** (so L0's gate says *locally*, not *in CI*), and
**no candidate text ever reaches `src/` or a build output.** No ruling needed for the safe path —
the unsafe one simply isn't available here.
> **Veto:** commit the fixtures for CI convenience — you'd be republishing UCLES material from a
> public repo to save one local command.

**R9 — `PROBLEMS.md` warnings get NO lane.** All 5 active items are benign and tracked; none moves
a §2 gate. Listed as non-lanes in §2 so no run "discovers" them and calls it progress.
> **Veto:** clear them for tidiness — real work, zero learning-outcome movement.

---

## §7 BAR SELF-REPORT

**Does this reach the "cannot be improved further" bar? ⚠️ Yes for the method; the board carries
one open risk that only L0 can close.**

- The technique's fatal assumption **for this repo** is identified and it is **not SSHD's**: the
  authority here is alive, so the failure is a critic *claiming* it checked. §0's quoted-artifact
  rule has teeth, and it is grounded in the measured base rate (8 defects / 45 in Batch 7) and two
  defects that reached production.
- The board is **outcome-first (5 lanes)** as ruled, each with a **binary** gate — no lane is
  "improve X" — and it carries an explicit **NOT-lanes** list so the engine can't drift into
  tidying warnings.
- Model routing is decided once, **by which model is better at the work**, and shown to be an
  application of the standing rule rather than a contradiction of it, so no session re-litigates it.
- The **tool-matching rule is stated in both directions** — the failure here is not only
  agents-doing-transforms but scripts-ruling-on-truth.
- The engine is **crash-survivable** (journal-first) and **self-re-arming**, and it explicitly
  parks the existing build loop rather than racing it.
- **§0 is mechanically enforceable, not merely requested** (§3.1): a schema-forced
  `{ verdict, sourceQuote, sourceUrl }` drops an uncited verdict in code. Against a failure mode
  that is *a critic claiming it checked*, a rule the runtime enforces beats a rule the prompt asks
  for — and the hybrid keeps the one decision a script must not make (§2.1's fork) with Kheshav.
- **The original open risk is CLOSED (§2.1), and the doc records that its own prediction was wrong.**
  Malay 0546 *does* publish 13 examiner-marked scripts. Three sharper constraints replace it — rubric
  drift (rank-order only), scanned handwriting (hand-transcribe, never OCR), and small n (no
  correlation coefficient) — and the gate was **re-authored, not softened**: L0's original
  "≥30 EN + ≥30 MS" was written before anyone knew what existed and is not achievable, so it now
  gates on *every located script* plus an explicit ban on overstating the statistics. L1 gained an
  **anti-overfit gate** because n is too small for a held-out split: a rule change must be
  linguistically justified, not merely score-improving.
- **What is still genuinely open:** 23 lower-ranked resources went unverified, and the newest
  booklets sit behind a Centre login — so **n is a floor, not a ceiling**, and the highest-value
  manual action on this lane is a human signing in to enlarge it.
- **What it deliberately does not promise:** it does not make the app "best" in one run, it does
  not claim a number for the grader before L0 measures one, and it does not pretend the IB / SPM /
  no-curriculum expansion is scoped — L4 gates the on-ramp, not a curriculum build.
