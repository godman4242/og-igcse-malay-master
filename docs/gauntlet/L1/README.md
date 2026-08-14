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

## Next

**L1 round 2**, both targets now precise: (a) weak Malay work is over-marked by ~23 pp — `content`
is still a pure word-count proxy with no measure of whether the student answered the question, which
is exactly what the examiner's Communication criterion (10 of 30 marks) rewards; (b) band 6 is
unreachable. Check the English formats against the **0510** syllabus the same way before assuming
they are right — this lane only verified Malay.
