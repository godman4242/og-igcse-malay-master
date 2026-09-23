# Lane L1 — GRADER ACCURACY (round 1)

> Journal for Gauntlet lane L1. Baseline it must beat: **`docs/gauntlet/L0/README.md` §7**.
> No candidate prose here — the calibration set stays under the gitignored `calibration/`.

**Run date:** 2026-08-14 · **Model:** Opus 5 @ `xhigh` · **Baseline commit:** `a77147f`

## The defect, and how it was found

L0 left four measured defects. This round targeted **F1** (two scripts awarded the *same* 11/30 came
back as bands **2** and **4**) and **F5** (the examiner put 11/30 above 7/30; the grader reversed
them).

Rather than guess at weightings, the grader's internal sub-scores were dumped for all 13 gradeable
scripts. The pattern was immediate:

| script | examiner | words | content sub-band |
|---|---|---|---|
| `MS-Q3b-low` | 11/30 | **69** | 2 |
| `MS-Q3c-low` | 11/30 | **144** | 4 |
| `MS-Q3b-high` | **30/30** | 133 | 4 |
| `MS-Q3a-low` | **7/30** | 174 | **6** |

**`content` is computed purely from word count** (`writingGrader.js:362-366`), so a long, off-topic
script the examiner scored **7/30** received the **top** content band, while a **30/30** script
scored lower for being shorter. Length was then applied a *second* time as a hard cap
(`if (wlen < minW * 0.6) overall = Math.min(overall, content)`), which is what forced the 69-word
script down to band 2 while its 144-word twin escaped.

## The root cause — and the authority that settles it

The real error was not the weighting. **`minWords` itself was wrong.**

**Cambridge IGCSE Malay 0546 syllabus for 2025–2027, Paper 4 (Writing), p.24** —
`https://www.cambridgeinternational.org/Images/664637-2025-2027-syllabus.pdf`:

> **Question 2** · Task: *"Candidates complete a directed writing task in about **80–90 words** on a
> familiar, everyday topic."* · Total marks 12
>
> **Question 3** · Task: *"Candidates choose between two tasks (an email/letter and an article/blog)
> and complete one of these in about **130–140 words**."* · Total marks 28

The app demanded **150–250** words for a directed task and **250–350** for an article — *above
Cambridge's maximum for the longest Malay task*, roughly **double** the real ask.

**This is worse than a scoring bug.** `minWords` also drives the on-screen advice
*"Kembangkan kepada N+ perkataan"* (`writingGrader.js:488`), so the app was **coaching students to
write about twice the length their exam asks for** — and marking them down when they got it right.
Corroborating artifact: the `MS-Q3c-high` script, awarded **30/30**, carries the candidate's own
count *"(149 patah perkataan)"*, and `MS-Q3b-high`, also **30/30**, is **133 words**.

## The change

Five formats — the ones that map to real 0546 Paper 4 tasks — recalibrated to the syllabus:

| format | before | after |
|---|---|---|
| `ms-directed` (Karangan Berpandu → Q2) | 150–250 | **80–90** |
| `ms-surat-rasmi` (→ Q3 letter) | 200–300 | **130–140** |
| `ms-surat-tidak-rasmi` (→ Q3 letter) | 150–250 | **130–140** |
| `ms-email` (→ Q3 email) | 120–250 | **130–140** |
| `ms-rencana` (→ Q3 article/blog) | 250–350 | **130–140** |

**The other nine Malay formats were deliberately NOT changed** — they are general/SPM composition
genres, not 0546 Paper 4 task types, so no syllabus authority covers them. Per L1's anti-overfit
gate, a change with no authority behind it is refused even if it would move the number.

## Result — before and after, pasted

```
BEFORE (commit a77147f)                      AFTER
MS-Q3a-high  30/30  band 5  -20.0pp          MS-Q3a-high  30/30  band 5  -20.0pp
MS-Q3a-low    7/30  band 3  +16.7pp          MS-Q3a-low    7/30  band 3  +16.7pp
MS-Q3b-high  30/30  band 4  -40.0pp          MS-Q3b-high  30/30  band 5  -20.0pp  ← fixed
MS-Q3b-low   11/30  band 2  -16.7pp          MS-Q3b-low   11/30  band 4  +23.3pp  ← see below
MS-Q3c-high  30/30  band 5  -20.0pp          MS-Q3c-high  30/30  band 5  -20.0pp
MS-Q3c-mid   27/30  band 5  -10.0pp          MS-Q3c-mid   27/30  band 5  -10.0pp
MS-Q3c-low   11/30  band 4  +23.3pp          MS-Q3c-low   11/30  band 4  +23.3pp

12 of 17 non-tied pairs ordered correctly    14 of 17 non-tied pairs ordered correctly
total absolute error 146.7pp                 total absolute error 133.3pp
```

English is unchanged (`10 of 13`) — only Malay formats were touched.

**F1 FIXED.** Both 11/30 scripts now return **band 4**. Identical examiner mark, identical grade.

**F5 FIXED.** 7/30 → band 3, 11/30 → band 4. The ordering is now the right way round.

**F4 improved but not solved.** All three 30/30 scripts now agree at **band 5** (was 5, 4, 5), so the
top of the range is at least *consistent* — but **band 6 is still never awarded**.

### ⚠ The honest cost — one script's delta got worse

`MS-Q3b-low` moved from −16.7 pp to **+23.3 pp**. Its *magnitude* of error grew. This is reported,
not buried.

It is judged a good trade because the error changed **kind**: before, two essays of identical
examiner-judged quality got different grades (unpredictable, so no student could trust any of it);
now they get the same grade, and that grade is *consistently* too generous. A consistent bias is a
tractable next problem; inconsistency is not.

**The remaining Malay defect is therefore now clearly stated: weak work (11/30) is over-marked by
about 23 pp.** That is the target for L1 round 2, alongside the unreachable band 6.

## Verification

- Full suite green with the change: **`Test Files 250 passed (250)` / `Tests 2390 passed (2390)`**.
- No regression in `writingErrors` false-positive negatives (whole suite green, A3).
- New guard `src/lib/__tests__/writingFormatsSyllabus.test.js` (7 tests) pins the syllabus values and
  asserts a compliant answer can never trip the under-length hard cap.
  **Red-proofed** — restoring the old 150-word target fails it:
  ```
  AssertionError: expected 150 to be 80
  AssertionError: expected 150 to be less than or equal to 140
  AssertionError: expected 80 to be greater than or equal to 90
        Tests  3 failed | 4 passed (7)
  ```

---

# Round 2 — the sentence-variety metric was inverted

## The defect

Dumping sub-scores again after round 1 showed a metric scoring **backwards** against the examiner:

| script | examiner | sentences | `variety` sub-band |
|---|---|---|---|
| `MS-Q3b-low` | **11/30** (weakest) | **4** | **5** |
| `MS-Q3c-low` | 11/30 | 15 | 5 |
| `MS-Q3b-high` | **30/30** | 8 | 4 |
| `MS-Q3a-high` | **30/30** | **22** | **3** |

The app rated sentence variety **higher on the worst script than on a full-marks one**. The cause:
`variety` keys off sentence-length *standard deviation* and *opener variety*, both of which are
statistical noise at tiny counts. Three erratic run-on sentences produce a high standard deviation
and read as "varied writing", while genuinely controlled prose has *consistent* sentence lengths and
scores low.

## The authority

**Cambridge IGCSE Malay 0546 Paper 4 specimen mark scheme (from 2028), "Range"** —
`https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf`:

> **7–9** · *"Uses extended, well-linked sentences **frequently** and appropriately. Uses a **wide
> range** of simple and complex structures to produce sentences of varying length."*
> **4–6** · *"Uses **some** extended sentences, with **some** evidence of linkage. Uses simple
> structures and **attempts** to use some complex structures."*

*"Frequently"* and *"a wide range"* are **quantity-of-evidence** words. Neither can be demonstrated
in four sentences.

## The change

`MIN_SENTS_FOR_RANGE = 6`. Below it, `variety` is capped at **4** — the mark scheme's own middle band
(*"some… attempts"*), which is the most that can honestly be claimed on that much evidence. The floor
sits below the sentence count of a syllabus-length answer (130–140 words ≈ 7–9 sentences), so a
compliant answer is never capped by it.

## Result — and the metric that moved the wrong way

```
                                  round 1        round 2
MS-Q3a-high  30/30   band 5      -20.0pp        -20.0pp
MS-Q3a-low    7/30   band 3      +16.7pp        +16.7pp
MS-Q3b-high  30/30   band 5      -20.0pp        -20.0pp
MS-Q3b-low   11/30   band 3      +23.3pp        +3.3pp   ← fixed
MS-Q3c-high  30/30   band 5      -20.0pp        -20.0pp
MS-Q3c-mid   27/30   band 5      -10.0pp        -10.0pp
MS-Q3c-low   11/30   band 4      +23.3pp        +23.3pp

total absolute error              133.3pp        113.3pp   ← 15% better
non-tied pairs ordered correctly   14 of 17       13 of 17  ← one worse
```

**One per-script delta improved by 20 pp; none got worse.** L1's gate is *"per-script deltas shrink
against the L0 baseline"* — met.

**The ordering count dropped by one, and that is stated rather than hidden.** The reason is
mechanical: `MS-Q3b-low` (11/30) moved to band 3, which now ties it with `MS-Q3a-low` (7/30), and a
tie counts as discordant. At n=7 with 4 already-tied pairs, that single tie is worth ~6% of the
count — the metric is too coarse at this sample size to arbitrate against a 20 pp accuracy gain.

**Judged worth keeping**, because the change is justified by the mark scheme independently of what it
did to any number (the anti-overfit gate's actual requirement), the metric it fixes was demonstrably
*inverted* against real examiner marks, and **a student sees their own band, not a ranking** — so
absolute accuracy is the more student-relevant measure of the two.

## Verification

- Full suite green: **`Test Files 251 passed (251)` / `Tests 2397 passed (2397)`** before adding the
  new guard.
- New guard `src/lib/__tests__/writingGraderRangeFloor.test.js` (3 tests), including an explicit
  check that the floor is *not* a blanket penalty — sustained varied writing still scores above 4.
  **Red-proofed** — removing the floor line fails it:
  ```
  AssertionError: expected 6 to be less than or equal to 4
  ```
  (Without the floor, a four-sentence sample scores the **maximum** variety band.)

## What is still open

1. **`MS-Q3c-low` remains over-marked by 23.3 pp** (11/30 → band 4). Its 15 sentences clear the
   evidence floor legitimately, so no authority-backed rule reached in this round. Needs a real
   measure of *task completion*, not another length proxy.
2. **`content` is still pure word count.** The mark scheme's matching criterion is **Task
   completion** — *"Completes most or all tasks"* — which says nothing about length. A 174-word
   off-topic script the examiner gave **Communication 0/10** still shows `content 6/6` in the
   sub-band panel a student sees. Fixing it honestly needs the task's `requirements` (already present
   in `src/data/writingTasks.js`) to reach `score()`, which today it never does — and judging
   coverage is a semantic call, not a regex one, so it belongs on the AI tier, not the rule tier.
3. ~~**Band 6 is still never awarded** in Malay.~~ **Awardable since round 5** (below): one of the
   three 30/30 scripts and both spec-perfect answers now get band 6.
4. **English was verified next** — see round 3 below.

---

# Round 3 — English checked against the syllabus. A worse defect, and a fork only the owner can settle.

## Both English syllabuses, verified first-hand

| Exam | Official requirement | Source |
|---|---|---|
| **0510** (English as a Second Language) | *"The two writing exercises both require candidates to write **120–160 words** of continuous prose."* | [`637160-2024-2026-syllabus.pdf`](https://www.cambridgeinternational.org/Images/637160-2024-2026-syllabus.pdf) |
| **0500** (First Language English) | *"Write about **250 to 350 words**."* (Directed Writing) · *"Write about **350 to 450 words**…"* (Composition) | [`718843-2027-specimen-paper-2.pdf`](https://www.cambridgeinternational.org/Images/718843-2027-specimen-paper-2.pdf) |

**The two requirements do not overlap**, and this repo's `eng-*` formats are shared between them.
Current values (`eng-article` 250–400, `eng-letter-formal` 200–350, `eng-directed` 150–250) are
calibrated for **0500**, not 0510.

## The defect this creates — measured, not argued

A well-written, correctly-paragraphed **126-word** English article — precisely what the 0510 syllabus
asks for — with **zero grammar errors (`accuracy` 6/6)**:

```
format=eng-article   words=126   BAND=3   content=3   acc=6
```

**Band 3 of 6.** `eng-article` demands 250 words, so 126 trips the under-length hard cap
(`wlen < minW * 0.6`) and the whole band is forced down to `content`. A 0510 student who does
*exactly* what Cambridge asks, flawlessly, is told they are below average.

This is worse than the Malay defect fixed in round 1: there, a good script lost a band or two; here,
a **perfect** script is capped at half marks.

## Why round 1's fix was NOT simply repeated

Lowering the English minimums to 0510 values was tried as an experiment against the calibration set.
**It changed nothing** — same bands, same deltas, still `10 of 13`:

```
EN-Ex5-high  14/16  band 5   -7.5pp    EN-Ex6-high  14/16  band 4  -27.5pp
EN-Ex5-mid   12/16  band 4  -15.0pp    EN-Ex6-mid   12/16  band 4  -15.0pp
EN-Ex5-low   10/16  band 3  -22.5pp    EN-Ex6-low    7/16  band 3   -3.8pp
```

Reason: these six candidates wrote 131–218 words, already above the hard-cap threshold, and their
`content` is limited by **paragraph count**, not length. Four of the six have **no paragraph breaks
at all** — and *both independent transcription passes agree on that*, so it is a genuine feature of
the scripts, not a transcription artifact.

**So the calibration set cannot see this defect.** It was found by testing a syllabus-compliant
answer directly. Worth recording as a method lesson: *a fixture set proves what it contains; it does
not prove the absence of a defect its samples happen to avoid.*

## The fork — deliberately NOT decided here

A single `minWords` per format cannot serve a 120–160-word exam and a 250–450-word exam.

- **Lower to 0510 (120–160):** removes the false penalty. Costs 0500 students the *warning* that
  their 140-word answer is far too short for their exam (nothing penalises longer writing — there is
  no upper bound in the grader, and `maxWords` is unused).
- **Keep 0500 values:** every 0510 student writing correctly is hard-capped at band 3.
- **Make the target depend on the exam:** correct for both, but needs an English syllabus selector —
  a feature, not a calibration change.

Both single-value options harm one group, and which group this app optimises for is product scope
(`CLAUDE.md` names 0546 / 0500 / 0510, and the True English study mode targets **0510 ESL**).
**Escalated to the owner rather than decided unilaterally.**

## ✅ OWNER RULING 2026-08-14 — optimise for 0510 ESL

Applied to the **six** formats 0510 actually uses — the five task types the syllabus names
(`eng-email`, `eng-article`, `eng-report`, `eng-review`, `eng-discursive`) plus
`eng-letter-informal`, because auto-detect resolves a real Exercise-5 *informal email* to it
(emails and informal letters share markers — `EN-Ex5-high` in the calibration set detects exactly
that way).

| format | before | after |
|---|---|---|
| `eng-email` | 100–250 | **120–160** |
| `eng-letter-informal` | 150–300 | **120–160** |
| `eng-article` | 250–400 | **120–160** |
| `eng-report` | 200–350 | **120–160** |
| `eng-review` | 200–350 | **120–160** |
| `eng-discursive` | 250–400 | **120–160** |

**The seven 0500-only genres are deliberately unchanged** — `eng-letter-formal`, `eng-speech`,
`eng-narrative`, `eng-descriptive`, `eng-directed`, `eng-interview`, `eng-diary`. No 0510 authority
covers them, and the anti-overfit gate refuses a change with no authority behind it.

**Result:** the flawless 126-word article goes from **band 3 → band 4** (`content` 3 → 5). The
calibration set is unchanged at `10 of 13`, exactly as the experiment predicted — those six
candidates were already above the cap, so the set cannot see this fix either.

**Why this is safe for 0500 grades:** nothing in the grader penalises writing *more* — `maxWords` is
unused and there is no upper-bound rule, so a 350-word 0500 essay clears a 120-word minimum easily.
**The accepted cost, logged rather than glossed:** a 0500 student who writes a far-too-short 140-word
answer no longer gets a "too short" warning. The owner accepted this trade; the clean fix for it is
an English syllabus selector, which is a feature, not a calibration change.

### Verification

- Full suite green: **`Test Files 252 passed (252)` / `Tests 2409 passed (2409)`**.
- `writingFormatsSyllabus.test.js` extended to 16 tests — pins the six 0510 formats, asserts a
  compliant answer never trips the hard cap, asserts the flawless 126-word article scores **above**
  band 3, and asserts the 0500-only genres **keep** their longer targets.
  **Red-proofed** — restoring `eng-article` to 250 words fails it:
  ```
  AssertionError: expected 250 to be 120
  AssertionError: expected 120 to be greater than or equal to 150
  AssertionError: expected 3 to be greater than 3
  ```
  That last line is the behavioural proof: with the old minimum the article scored *exactly* band 3.

---

# Round 4 — "did they answer the question?" reaches the free tier

## The defect

`content` was pure word count. The measured consequence, from the calibration set:
`MS-Q3a-low` — **174 words**, examiner **Communication 0/10**, examiner comment
*"This paragraph is not relevant to the question. It demonstrates that candidate does not
understand the tasks required."* — scored `content` **6/6, the top band**, because it was long.

**Length is evidence of effort, never of answering.** The criterion this feeds is *Task completion*,
and the mark scheme describes it only in those terms —
[0546 P4 specimen mark scheme](https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf):

> *"All tasks must be completed for full marks to be awarded in 'task completion'."*
> **1–3** *"Attempts some tasks with some success. Ambiguity or irrelevance compromises meaning."*

## What already existed, and what was actually missing

Task-fulfilment scoring **already ships on the AI tier**: `buildWritingGradePrompt` emits
`task_coverage` / `req_i`, and `ContentTraitPanel` renders it. The gap was narrower than it looked —
**the free, rule-based tier had no task at all.** `score()` contained zero references to `task`, so a
learner without an AI key got a content band derived entirely from word count.

## What was built — and the scope it deliberately does NOT claim

`src/lib/taskCoverage.js` (pure), wired through `score(text, { …, task })` and from
`useWritingEvaluator`.

**A first attempt scored each requirement individually and was abandoned**, because two of the four
requirements on a typical task are *rhetorical* — *"Gives at least two developed reasons or
examples"*, *"Engages a student-magazine audience"* — and no keyword check can judge those. It
produced false "missing" verdicts on a genuinely on-topic essay. Since this guard may only ever
**lower** a band, a false negative is an unfair penalty on a student who did the work.

So the question was narrowed to the one thing keywords can actually answer: **is this essay even
about the task?** Measured against the task's pooled topic vocabulary (prompt + requirements), with a
light Malay stemmer so `permainan` matches `bermain`.

| | topic overlap | verdict |
|---|---|---|
| on-topic answer | **31.3%** | on-topic |
| long, well-written, entirely off-topic answer | **0.0%** | off-topic |

`ON_TOPIC_THRESHOLD = 0.12` sits in the middle of that gap — chosen for separation, not tuned
between two close values. Per-requirement hints are still produced but are **advisory only**, never
scored; fulfilment grading remains the AI tier's job.

## Result

```
                                   content   band
off-topic, no task (old behaviour)    6        4
off-topic, with task                  3        3     ← guard bites
on-topic,  no task                    5        4
on-topic,  with task                  5        4     ← untouched, no false penalty
```

The overall band is capped at the content band when off-topic, mirroring the file's existing
under-length cap (`overall = Math.min(overall, content)`) — same idiom, same reason.

**The calibration set is unchanged** (`13 of 17` Malay, `10 of 13` English): it carries no tasks, so
the no-task path is byte-identical, and a test pins that (`expect(b).toEqual(a)`).

## Verification

- Build clean. `writingGrader` chunk **91.20 kB** (+~3 kB, a shared on-demand chunk — exempt from the
  70 kB per-route rule). Eager `index-` **479.93 kB / 151.90 kB gz**, unchanged from the recorded
  479.4 kB, so nothing leaked into the eager path.
- Suite: **`Test Files 253 passed (253)` / `Tests 2418 passed (2418)`**. Lint 0 errors.
- `taskCoverage.test.js` (9 tests) pins both directions in both languages, the never-over-strip
  stemmer case (`makan` must not become `mak`), and the no-task byte-identity.
  **Red-proofed** — removing the guard fails it in both languages:
  ```
  AssertionError: expected 6 to be 3          (English)
  AssertionError: expected 5 to be less than 5 (Malay)
  ```

## What this still does not do

It detects **off-topic**, not **incomplete**. A student who writes fluently about the right subject
but answers only two of four bullet points is still not caught by the free tier — that is a semantic
judgement and correctly belongs to the AI tier, which already does it. The honest framing for the
free tier is a floor against confident-wrong scoring, not a replacement for a marker.

### Method note worth keeping

**A fixture set proves what it contains; it does not prove the absence of a defect its samples happen
to avoid.** Neither this defect nor its fix is visible in the 22-script calibration set. Both were
found by constructing a syllabus-compliant answer and grading it. Future lanes should pair
"measure against real scripts" with "grade a deliberately spec-perfect answer and check it scores
well" — they catch different bugs.

---

# Round 5 — band 6 was unreachable in both languages. One mechanism, measured.

## Step 1 — the evidence, before anything changed

Band 6 needs a weighted score ≥ 5.5. The three Malay 30/30 scripts sat at 5.05 / 4.60 / 4.90 with
`content` and `accuracy` already at 6 — so the cap lived in the range sub-bands. Across **7 top-band
texts** (the 5 scripts an examiner put in the top band, plus a spec-perfect answer per language, below),
the top-level threshold each one missed:

| threshold | missed by |
|---|---|
| **formal-vocab list** (`FORM_*` hits ≥ 4, gates `vocab`) | **7 / 7** |
| **discourse-marker list** (`DISC_EN` / `PW_ML` ≥ 5, gates `cohesion`) | **7 / 7** |
| complex-connective list (`complexRatio` ≥ .35, gates `variety`) | 4 / 7 |
| long-word ratio | 4 / 7 |
| sentence-length spread (≥ 6) | 3 / 7 |
| opener variety (≥ .7) | 1 / 7 |
| **TTR ≥ .55** — the list-free range signal | **0 / 7** |

**The one thing: range was scored by membership in short lists of formal-essay words.** Both
top-scoring spec answers used **0** formal-list words and scored `vocab` **3** — the *"only common
vocabulary / small range, repeated"* band — at a TTR of **0.95** (MS) and **0.86** (EN). The mark scheme
asks for range and *appropriateness*, never formal register (A1, fetched first-hand 2026-09-24):

- **0546** [2028 specimen mark scheme, Paper 4](https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf), Q3 **Range 7–9**: *"Uses extended, well-linked sentences frequently and appropriately."* · *"Uses a wide range of simple and complex structures to produce sentences of varying length."* · *"Uses a wide range of vocabulary appropriate to the task(s)."* Q2 guidance: *"Examples of linking words and phrases: and, or, but, because, then"*.
- **0510** [2024 specimen mark scheme, Paper 1](https://www.cambridgeinternational.org/Images/637270-2024-specimen-paper-1-mark-scheme.pdf), **Table B Language 7–9**: *"Uses a wide range of common and less common vocabulary appropriately."* · *"Uses a wide range of simple and complex structures."* · *"Uses a wide range of linking words and/or other cohesive devices appropriately."*

The 2028 specimen's own Q3(a) is an **email to a friend**; formal-essay vocabulary would be the
*in*appropriate choice there.

**Found on the way — three more top-band caps:**
1. **Arithmetic.** `Math.round(content*0.25 + … + cohesion*0.1 + format*0.05)`: 0.15 and 0.1 are inexact
   in binary, so an exact 5.5 summed to `5.499999999999999` → band 5. **85 of the 782** reachable
   exact-half sub-band sets (each sub-band 2–6) rounded the wrong way.
2. **Content 6 was unreachable at the syllabus length in Malay.** It needed `minWords × 1.1` = **143**
   words for every 0546 Q3 format; the syllabus asks for **130–140**. Exam Rehearsal grades its Malay
   stage as `ms-rencana`, so this capped every rehearsal. The calibration harness can't see it — it
   auto-detects `ms-directed` (80 words).
3. The subordinator list for `variety` lacked *when, if, after, before, until* and *sebelum, selepas,
   ketika, semasa* — the commonest ones.

## Step 2 — spec-perfect answers (authored; in `writingGraderTopBand.test.js` with a line → descriptor map)

- **Malay:** the 2028 specimen's own Q3(a) *Pindah rumah* email, 132 words, all five bullets, DBP
  spelling, 0 formal-list words. **Band 5 before.**
- **English:** an article for the app's `eng-article-phone-free-lessons` task, 151 words, all four
  requirements, 0 formal-list words. **Band 5 before.**

## Step 3 — the fix (`writingGrader.js`, `data/writing.js`), each with its A1 line above

| change | why |
|---|---|
| `vocab` no longer needs formal-list words for 5–6: TTR (range) + long-word ratio ("less common"). Level 4 still needs SOME less-common word — one formal word, or level 5's long-word share | 0510 "common **and** less common"; 0546 "appropriate to the task(s)"; 0510 4–6 "attempts to use some less common vocabulary" vs 1–3 "Uses only common vocabulary" |
| `cohesion` = distinct linking devices: essay markers ∪ clause-linking subordinators, **+ one** for any "simple connector" (and/but/or/so/then/because · dan/atau/tetapi/kerana…) | 0510 "linking words and/or other cohesive devices"; 0546 names *"and, or, but, because, then"* as the **simple connectors** of its short task — so they count as one type, never as a "wide range" |
| complex sentence = a subordinator introducing a clause. *after/before/since/until/once* count only before a pronoun / "there" / an -ing verb; *sebelum/selepas/semasa/sejak/ketika…* never before *itu/ini*; hyphenated forms (*bila-bila*) never match | "wide range of simple and complex structures" — "after school" and "selepas itu" are not clauses |
| content 6 at `minWords` when the 10% cushion exceeds `maxWords`; every length threshold compared in whole percent | 0546 "antara 130–140 patah perkataan"; 200 × 1.1 = `220.00000000000003` |
| `overallBand()` sums in whole hundredths | the existing rule, computed right |
| essay-marker phrases ("in addition", "on the other hand") match at all | they never had: `wordRe` escaped the `\s+` its caller inserted |

Tips and chips now say the same thing as the grade: the Malay vocab tip no longer says *"gunakan istilah
formal"*; the Writing page's "Discourse" chip is "Linking words", green exactly when `cohesion` ≥ 5; the
"Formal" chip / stat is neutral, not a target.

## The fresh-context review changed the fix — the first version over-marked weak writing

The first version counted *and/but/or/so* as four linking types, "after school" as a clause, and dropped
every floor on vocabulary. The reviewer's weak common-words email rose **4 → 5**; every low calibration
script's `vocab` rose 3 → 4. **Fixed** (rows above) — and 5 negative-control tests now pin it, each
**watched failing on that first version** (`expected 4 to be less than or equal to 3` ×2, `expected 1 to be
+0` ×2, `expected [] to include 'in addition'`). **Cost, stated:** `MS-Q3c-high` fell back from 6 to 5 —
its "…dan **Selepas itu** makan" is an adverb, not a clause, so it is the more honest measurement.

## Result — harness re-run (counts, n = 7 / 6)

```
Malay 0546   before 13 of 17  →  after 15 of 17   (all 13 previously-right pairs kept; +2)
  MS-Q3a-high 30/30  5 → 6     MS-Q3b-high 30/30  5 → 5     MS-Q3c-high 30/30  5 → 5
  MS-Q3c-mid  27/30  5 → 5     MS-Q3b-low  11/30  3 → 4     MS-Q3c-low  11/30  4 → 4   MS-Q3a-low 7/30 3 → 3
English 0510 before 10 of 13  →  after 10 of 13
  EN-Ex5-high 14/16  5 → 5     EN-Ex6-high 14/16  4 → 5     EN-Ex5-mid  12/16  4 → 5
  EN-Ex6-mid  12/16  4 → 4     EN-Ex5-low  10/16  3 → 3     EN-Ex6-low   7/16  3 → 3
Under-marked English scripts: 6 of 6 → 5 of 6 (EN-Ex5-mid now +5.0 pp, was −15.0)
Spec-perfect answers: Malay 5 → 6 (picked format AND auto-detect) · English 5 → 6 (graded with its task)
```

## What was NOT met — stated, not smoothed over

1. **One previously-right English pair is now a tie.** `EN-Ex5-high` (14/16) and `EN-Ex5-mid` (12/16)
   both get band 5; the count stays 10 of 13 only because `EN-Ex6-high` vs `EN-Ex6-mid` became right.
   The weighted scores still order them (**5.00 vs 4.90**) — integer bands can't separate them. The pair
   was "right" before only because 5-mid was under-marked by 15 pp. **Every honest lift of 5-mid ties it**
   (vocab alone, or cohesion alone, each takes it to 5 — measured). Separating them needs 5-high at 6,
   blocked by the *long-word ratio*, which ranks them **backwards** (.13 vs .17) — while the examiner
   praised 5-high's *"less common vocabulary like 'tight and strict requirement'"* and told 5-mid to use
   *"a wider range of more complex vocabulary"*. **The real fix is a frequency-based "less common
   vocabulary" measure** (a lexical frequency profile against a high-frequency word list), queued.
2. **Two of the three 30/30 Malay scripts stay band 5** — a measurement limit, not a verdict:
   - `MS-Q3c-high` (weighted 5.35): a story with dialogue. The sentence splitter ends a sentence at every
     "!" / "?" inside quotes, so "Jom!", "Jom!" count as sentences and dilute its complex-sentence share.
   - `MS-Q3b-high` (4.80): reaching 6 would need three thresholds moved for this one script (long-word
     ratio .17 vs .18, opener variety .38 vs .6 — 5 of 8 sentences open with *Saya* — and one more linking
     type), with no mark-scheme line behind any of them, which the anti-overfit gate forbids. Marked under
     the 2017 rubric (*Range, Variety and Appropriateness* /10) — the reason Malay is rank-order only.
3. **The reviewer's weak English email still rises 4 → 5.** Its range sub-bands are now defensible
   (vocab 3, cohesion 4, variety 4 — it really has *when / if / because* clauses); the band comes from
   **accuracy 6** on a text with *"Last week I go"*, *"If it rain"* — the English error detector's gap.
   Pinned at the sub-band level only; the text is in the test file as the reproducer.
4. **Malay conjunction spam rises 4 → 5** (English 4 → 4). It lists subordinators too, and already scored 4
   because `content` is length and no errors are detected. Real weak scripts graded with an explicitly
   picked format are all unchanged (EN-Ex6-low as Article 4 → 4, EN-Ex5-low as Email 3 → 3, MS-Q3a/b/c-low
   as E-mel/Rencana 3/3/4 → 3/3/4).
5. **`MS-Q3b-low` (11/30) is now +23.3 pp** (band 3 → 4), matching `MS-Q3c-low`; the two 11/30 scripts are
   now consistent (L0's F1 was a two-band spread between them). Absolute Malay deltas are not the metric.
6. Prepositional *semasa / sejak* + noun ("semasa cuti", "sejak kecil") still read as clauses; English
   0510 answers of 120–131 words still get `content` 5 (the cushion fits inside 120–160).

## Verification

- `writingGraderTopBand.test.js` — **43 tests**. The first 14 watched failing on the original code
  (`TypeError: overallBand is not a function`, `expected 3 to be greater than or equal to 5`, `expected 5
  to be 6` …); the 5 negative controls watched failing on the first-pass fix; the 220-word float test
  watched failing on the original (`expected 5 to be 6`). All green now.
- Suite **254 files / 2,461 tests** green; lint **0 errors** (62 pre-existing `jsx-a11y` warnings, same as
  HEAD); content-lint ✓; launch-gate static ✓; eager `index-` **480.93 kB, the same size as HEAD**;
  `writingGrader` chunk 91.20 → 91.94 kB (shared on-demand, exempt).
