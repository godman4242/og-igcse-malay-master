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
3. **Band 6 is still never awarded** in Malay.
4. **English was verified next** — see round 3 below.
