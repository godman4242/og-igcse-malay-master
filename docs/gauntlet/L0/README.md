# Lane L0 — MEASURE THE GRADER

> **Journal for the Gauntlet lane L0** (`docs/GAUNTLET.md` §2). Written *as the run goes*, per §3
> step 5, so a run that dies mid-flight is salvageable. **No candidate prose ever appears in this
> file** — transcriptions are UCLES copyright and live only under the gitignored `calibration/`
> (R8). What lives here is method, counts, decisions, and our own measurements.

**Run date:** 2026-08-14 · **Model:** Opus 5 @ `xhigh` · **Baseline commit:** `37eaac8`

## The gate this lane drives to (§2, verbatim)

> every located script transcribed with its awarded marks and an **A1 cite**; harness runs locally
> (**not** in CI — fixtures are gitignored, R8); **per-script deltas + rank-order agreement recorded
> for both languages** with pasted output; **no correlation coefficient and no "% agreement"
> headline at n≈18/13** (§2.1); `RESUME_HERE.md` carries the numbers

## Baseline (pasted)

```
 Test Files  249 passed (249)
      Tests  2385 passed (2385)
   Duration  28.89s
```

Build-loop parked: `pgrep -fl build-loop` → none running; `docs/loop/PAUSE` created (gitignored).

---

## 1. The calibration set — verified first-hand, not taken from the doc

§0 applies to our own claims, so both booklets were fetched and inspected rather than trusted.

| Set | Evidence |
|---|---|
| **Malay 0546 Paper 4 ECR (from 2017)** | `HTTP 200 · application/pdf · 1,945,767 bytes · 20 pages`. 13 `Total mark awarded` lines. |
| **English 0510 Paper 2 ECR (from 2019)** | `HTTP 200 · application/pdf · 4,836,468 bytes · 43 pages`. 9 script-pairs at `= X out of 8`. |

**Malay URL** — as pasted in §2.1:
`papers.xtremepape.rs/CAIE/IGCSE/Malay - Foreign Language (0546)/0546_Example_Candidate_Responses_Paper_4_(for_examination_from_2017).pdf`

**English URL** — ⚠ **not in §2.1.** §2.1 describes the English sets but pastes no URL for either.
The obvious xtremepapers path returned `HTTP 404`, and the host forbids directory listing (`HTTP 403`
even on the known-good Malay directory). Resolved by a bounded lookup, owner-authorised, to:
`eslmojo.com/wp-content/uploads/2020/05/0510_Example_Candidate_Responses_Paper_2_for_examination_from_2019.pdf`
Its PDF `Title` metadata reads *"AS & A Level Example Candidate Responses template"* — a stale
template title; the content is IGCSE 0510, confirmed by its exercise structure and mark scales.

**Constraint 2 confirmed by measurement.** Text-layer density per page runs ~500–1,300 characters —
examiner commentary only. The candidate's prose exists solely as a scanned image, so it must be read
visually. Verified by rendering page 13 and reading it.

---

## 2. Four structural findings the lane board did not have

**2.1 — The 13 Malay "scripts" are not 13 essays.** They split across three questions on three
scales: Q1 **/5** (×3, short answers), Q2 **/15** (×3, short guided), Q3(a/b/c) **/30** (×7,
extended writing, marked Communication /10 + Accuracy /10 + Range-Variety-Appropriateness /10).
`writingGrader.score()` rejects input under 30 characters outright, so Q1 cannot be graded at all.
**Gradeable Malay n = 7, not 13.**

**2.2 — The same inflation applies to English.** Of the 9 script-pairs at Content /8 + Language /8,
three are **Exercise 4, a summary task** — a different construct from free composition.
**Gradeable English n = 6** (Exercise 5 + Exercise 6).

**2.3 — The grader emits a BAND, the examiner awarded MARKS.** `score()` returns `{ band: 1–6,
subBands }`; the booklets award /30 (MS) and /16 (EN). **There is no shared scale**, so there is no
"absolute accuracy" to measure — only an ordering to agree or disagree with. This independently
confirms §2.1's rank-order ruling for Malay and **extends the same logic to English**, which §2.1
had scoped to Malay on rubric-drift grounds alone. L0's gate already required rank-order for both
languages, so no gate change was needed — the constraint is simply better-founded than the board knew.

**2.4 — Both mark distributions are heavily tied.**
- Malay gradeable totals: **30, 30, 30, 27, 11, 11, 7** — three at the ceiling, two tied at 11.
- English totals across all nine: **14, 12, 7, 14, 12, 10, 14, 12, 7** — only four distinct values.

Rank-order over so few distinct values is weak evidence. The harness therefore prints a **raw pair
count** and excludes examiner-tied pairs explicitly, and this warning is carried in the output itself
so no reader can mistake it for a clean agreement result.

---

## 3. Decisions made (each with a veto)

**D1 — the `.gitignore` rule shipped ALONE and FIRST** (commit `5def92e`), before any fixture existed.
The pre-commit hook runs `git add -A` and this repo is public, so a fixture landing before the ignore
rule would republish UCLES material irreversibly. Verified after staging: `git status --porcelain`
returns empty with 23 MB present under `calibration/`.
*Veto: a different fixture path.*

**D2 — transcribe all 22, grade the 13 that are free composition, print the 9 exclusions with
reasons.** Satisfies the gate's "every located script transcribed" without pretending a five-mark
word-list is essay evidence. The harness prints every exclusion (no silent caps).
*Veto: transcribe only the gradeable ones.*

**D3 — 0500 English First Language is DEFERRED, not dropped.** §2.1 lists a third set (0500/0990
Paper 2 ECR, ~9 scripts). It is set aside because **0500 is First Language (native speaker)** while
this app's English learner target is 0510 ESL — the *same construct mismatch* on which §2.1 rejected
the SPM set: *"it is a native-speaker paper, so its standard would systematically under-mark a
competent 0546 foreign-language learner. Construct mismatch, not just a scale mismatch."*
Recorded here and flagged to the owner rather than decided silently.
*Veto: include 0500 and accept the mismatch for the extra n.*

**D4 — "Unlimited-OCR" evaluated and rejected**, on the owner's prompt to consider it. Grounds:
(a) it is an OCR/document-parsing model, the exact tool class §2.1 constraint 2 bans, and the ban's
reason holds — an automated reader's error is indistinguishable from a candidate spelling error, and
Accuracy is the criterion under measurement; (b) its README documents **no** handwriting support and
**no** language list, so Malay is unevidenced; (c) it emits structured markdown, a *normalising*
transform, whereas we need verbatim text including strikethroughs and insertions. Separately, the
widely-repeated claims about it are inflated — a hands-on verification found *"Ollama support **Not
mentioned**"*, *"llama.cpp support **Not mentioned**"*, and a real model size of 6.67 GB.
*Veto: try it as an extra transcription pass anyway.*

---

## 4. Method — how transcription defends the Accuracy signal

Constraint 2 says the scripts are hand-transcribed and never OCR'd, *because* an automated reader's
errors masquerade as candidate errors. A vision model reading handwriting has that same property, so
the constraint's **intent** is re-implemented rather than assumed:

1. **Two fully independent transcription passes** per script (`passA`, `passB`), each reading the
   page image directly, instructed to preserve every error verbatim and to notate strikethroughs
   (`[struck: …]`), insertions (`[ins: …]`), and illegible spans.
2. **A deterministic diff** between the passes — a script with a byte-check, not an agent
   (§2's tool-matching rule: a transform never gets a fan-out).
3. **Adjudication of disagreements only**, by an agent re-reading the image.
4. **Blind fidelity critics** whose single lens is *"find a place this transcript is cleaner than the
   image"* — schema-forced to `{verdict, sourceQuote, sourceUrl}`, with any empty-quote verdict
   dropped in code (§3.1).

Transcribers were schema-forced to report `strikethroughCount`, `insertionCount`, `illegibleCount`
and a list of **suspected candidate errors they preserved**. Reporting zero preserved errors on a
low-scoring script is itself a detectable red flag.

## 5. The harness

`scripts/grader-accuracy-harness.mjs`, modelled on the existing `ocr-`/`asr-accuracy-harness.mjs`.

- **Runs locally only, never CI.** The fixtures do not exist on a clean clone.
- **Run with `npx vite-node`, not bare `node`** — `writingGrader.js` imports `'../data/writing'`
  without a file extension, which Vite resolves and Node does not (`ERR_MODULE_NOT_FOUND`). Running
  through vite-node also guarantees the grader resolves exactly as it does in the app, so the measured
  band is the band a student would really see.
- Prints **per-script deltas** and a **raw concordant-pair count**. It contains no correlation
  coefficient and no "% agreement" headline, by construction.
- Grades with `format: 'auto'` — what a real student experiences — and prints the detected format per
  script, so a format-detection error is visible rather than silently folded into the band.

---

## 6. Run 1 was cut by a usage limit — and lost no content

Stage 1 spawned 6 transcription agents. **5 of 6 died** on `You've hit your session limit`
(1,150,990 subagent tokens, 1,055 tool calls, ~28 min). The workflow's return value reported only
**6** completed scripts.

**But 24 of 44 transcription units were on disk**, because agents `Write` each transcript the moment
it is finished rather than returning them in one batch at the end. The dead agents' completed work
survived them. This is §3 step 5 working exactly as designed, and it is the single most important
operational lesson from this run.

**The resilience rule this adds, for every future stage:**

1. **Write each unit to disk the instant it is done** — never accumulate results in an agent's return
   value. A return value is lost when the agent dies; a file is not.
2. **Every worker prompt must say: skip any unit whose output file already exists and is non-empty.**
   Run 1 had no skip rule, so a naive re-run would re-read all 44 pages and re-spend the budget that
   just ran out. With the rule, a re-run resumes instead of restarting.
3. **Prefer more agents with fewer units each.** A killed agent loses only its in-flight unit.
4. **Reconcile against the filesystem, never against the workflow's return value.** Here the return
   value understated real progress by 4×.

### What is still missing (no silent caps)

| | passA | passB |
|---|---|---|
| **Missing** | `EN-Ex4-low`, `EN-Ex5-high/mid/low`, `EN-Ex6-high/mid/low`, `MS-Q3c-high/mid/low` | `EN-Ex5-mid/low`, `EN-Ex6-high/mid/low`, `MS-Q2-mid`, `MS-Q2-low`, `MS-Q3c-high/mid/low` |

- **Malay gradeable: 4 of 7** have both passes (`MS-Q3c-*` — all three — have neither).
- **English gradeable: 0 of 6** have both passes (only `EN-Ex5-high` has one).

---

## 7. PARTIAL BASELINE — Malay, n=4 of 7

⚠ **This is a partial result and L0's gate is NOT green.** It is recorded because it is the first
time `writingGrader.js` has ever been compared to a real examiner's marks, and because it already
shows a defect large enough to act on.

### Band stability across two independent transcriptions

The sharpest available check on transcription quality: grade **each pass separately** and see whether
the band moves. If it does not, residual transcription disagreement provably cannot affect the result.

| Script | Examiner | Band (passA) | Band (passB) | Stable? |
|---|---|---|---|---|
| `MS-Q3a-high` | 30/30 | 5 | 5 | ✅ |
| `MS-Q3a-low` | 7/30 | 4 | 3 | ❌ |
| `MS-Q3b-high` | 30/30 | 4 | 4 | ✅ |
| `MS-Q3b-low` | 11/30 | 2 | 2 | ✅ |

**3 of 4 bands are identical across independent readings**, so the measurement is largely robust to
transcription noise. `MS-Q3a-low` was the one sensitive script, and it was adjudicated (below).

### Adjudication of `MS-Q3a-low` — the authority wins, stated out loud

The page image (`ms0546/pg-14.png`) was read directly. Its address block reads
`[struck: Johor Bahru,] / No3, Taman Indah Height, / Jalan layang, 31100, / Johor Bahru.` —
**passA dropped two of those lines; passB captured them.** passB is therefore the faithful
transcript and is the one promoted to `final/`. `MS-Q3a-low`'s band is **3, not 4**.

⚠ **This CORRECTS an earlier claim in this journal and in commit `08922fb`**, which reported the
7/30 script as band 4 — *"the same band the grader gives a 30/30 script."* That was computed from
passA, the transcript adjudication has now shown to be the less faithful of the two. The defect is
real but **smaller than first stated**. Recording the correction rather than quietly overwriting it,
per §0.

**Marks confirmed first-hand from the same image (A1):**
> `Marks awarded for Communication = 0 out of 10` · `Marks awarded for Accuracy = 4 out of 10` ·
> `Marks awarded for Range, Variety and Appropriateness = 3 out of 10` ·
> `Total mark awarded = 7 out of 30`

**Transcription fidelity, independently corroborated:** the examiner's own comment on this script
reads *"the candidate uses some unsuitable words and phrases for the context, such as pedang nenek
(grandmother's sword)"* — the candidate meant *petang* (afternoon). **Both passes preserved
`pedang nenek` verbatim**, so the transcription kept the exact error the examiner penalised rather
than silently correcting it. That is the fidelity gate passing on a real, checkable case.

### Per-script deltas (adjudicated `final/` set), pasted

```
  PER-SCRIPT DELTAS  (n=4)
  script             examiner     =%  band     =%    delta  format       words
  MS-Q3a-high           30/30    100     5     80  -20.0pp  ms-directed    225
  MS-Q3a-low             7/30     23     3     40  +16.7pp  ms-directed    174
  MS-Q3b-high           30/30    100     4     60  -40.0pp  ms-directed    133
  MS-Q3b-low            11/30     37     2     20  -16.7pp  ms-directed     69

  RANK ORDER  (examiner's ordering, best first — does the grader agree?)
  MS-Q3a-high     examiner    30/30   grader band 5
  MS-Q3b-high     examiner    30/30   grader band 4
  MS-Q3b-low      examiner    11/30   grader band 2
  MS-Q3a-low      examiner     7/30   grader band 3

  4 of 5 non-tied pairs ordered correctly (1 pair tied by the examiner and excluded).
```

### What this says — the findings L1 must fix

**1. The grader inverts the two weakest scripts.** The examiner put `MS-Q3b-low` (**11/30**) *above*
`MS-Q3a-low` (**7/30**). The grader reverses them — band **2** vs band **3**. At the bottom of the
range, where a struggling learner most needs an honest signal, the ordering is backwards.

**2. It cannot reach the top — and that is the single largest error.** `MS-Q3b-high` scored **30/30**
from the examiner and **band 4** from the grader: a **−40 pp** gap, the biggest in the set. Two
full-marks scripts came back as bands 5 and 4. A student who has genuinely written a top answer is
told they are mid-range.

**3. Systematic regression toward the middle.** Both 30/30 scripts are *under*-marked (−20 pp,
−40 pp) while the 7/30 script is *over*-marked (+16.7 pp). The grader compresses the range at both
ends — the characteristic signature of a rule-based scorer whose sub-bands are averaged and then
capped (`overall > accuracy + 1` is one such cap, `writingGrader.js`).

**4. Format detection is not the cause.** All four scripts were detected as `ms-directed`, so the
band differences come from the criterion sub-scores, not from a misidentified format. Any L1 fix
must therefore target the sub-band weighting, not detection.

**5. What this does NOT yet say.** n=4 of 7 Malay, English unmeasured. This is a sanity check that
has found a real, specific, actionable defect — not an agreement study.

---

## 8. Gate status — L0 is OPEN

| Gate item | Status |
|---|---|
| Every located script transcribed, with awarded marks + A1 cite | ⬜ **24/44 units**; 3 MS + 6 EN gradeable scripts outstanding |
| Harness runs locally, not CI | ✅ `scripts/grader-accuracy-harness.mjs`, run via `npx vite-node` |
| Per-script deltas, both languages | ⚠ **Malay partial (n=4/7)**; English not yet measured |
| Rank-order agreement, both languages | ⚠ Malay partial; English outstanding |
| No correlation coefficient / no "% agreement" headline | ✅ enforced in code, not prose |
| `RESUME_HERE.md` carries the numbers | ✅ partial baseline recorded |

**The lane does not close until the remaining 20 transcription units land and English is measured.**
The gate was not softened to fit the interruption.
