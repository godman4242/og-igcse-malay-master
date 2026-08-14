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

## 6. Results

*Pending — filled in when the transcription and adjudication stages land.*
