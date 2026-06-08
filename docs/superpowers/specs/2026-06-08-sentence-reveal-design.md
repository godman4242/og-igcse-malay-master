# Sentence-level on-demand reveal — Design & Research (2026-06-08)

Extends the shipped **"Translate the whole document, free"** MVP
(`docs/superpowers/specs/2026-06-08-translate-document-design.md`, Scope A). That MVP
glosses unknown **words** in place, reveal-gated. This adds the parked **Option C / Q5
"v2"**: tap a line/sentence → reveal its **full English translation in place** —
*comprehension*, not just vocab. It is also the deliberate predecessor to the BYOK
"higher quality" follow-up: instruct models earn their keep on **sentences** (context
disambiguation); on lone words free gtx is already ~as good — so we ship sentence-reveal
**before** BYOK.

Researched **plan→research→implement** per `docs/process/feature-development-methodology.md`:
options drafted from first principles FIRST, THEN validated *adversarially*, THEN
converged. Companion plan: `docs/superpowers/plans/2026-06-08-sentence-reveal.md`.

---

## Problem + who it's for
IGCSE Malay/English self-study teens, mobile-first, reading real past-paper passages in
the PDF reader. Word-glosses answer *"what does this word mean?"*. They do **not** answer
*"what is this whole sentence saying?"* — the failure is often **structure** (word order,
imbuhan-stacked verbs, idiom), not a single missing word. IGCSE **reading papers literally
assess passage comprehension**, so comprehension help has direct exam value. A learner
truly stuck on a sentence gets nothing from staring at an opaque line; the affective cost
(frustration, disengagement) is real.

But a full-sentence English reveal is the **strongest form of the "translation crutch"** —
the learner can read English and skip the Malay entirely. So the design question is **not**
"can we render sentence translations" (the reflow token model already exposes paragraph +
punctuation structure — nearly free). It is:

## The load-bearing question (researched first, adversarially)
> *Does in-context full-**sentence** L1 (English) translation HELP or HARM comprehension +
> incidental vocab for self-study IGCSE teens — and does a revealed sentence KILL the
> per-word retrieval that the shipped word-glosses preserve?*

### What the evidence says (triangulated, graded)

1. **Providing meaning aids comprehension — robustly; this is uncontested.** Across the
   gloss literature, glossed reading improves comprehension and word gain over non-glossed
   (Chen 2025 45.3%/33.4% vs 26.6%/19.8%; multimedia-gloss meta g≈0.73). For *comprehension*
   specifically, all gloss formats helped and none was worse (Alharbi/multimedia-gloss study:
   "all multimedia glossing… led to better reading comprehension, no differences among
   groups"). An L1 translation is the **most direct** comprehension aid. Direction: **positive
   for comprehension.** Confidence: **High.**

2. **THE REVERSAL — and its critical caveat.** The parent spec graded sentence-level *lexical*
   gain as "elusive" (Med). The very paper it cited, **Rassaei & Folse (2024, *System*)**, in
   fact found **sentence-level glosses significantly OUTPERFORMED word-level glosses for
   vocabulary**, on **both immediate and delayed** post-tests (90 Korean university students;
   all conditions beat control). **BUT** — load-bearing transfer-check — those were **L2
   (target-language) sentence glosses**: a *Malay* sentence elaborating the target word. The
   win comes from the **Involvement Load Hypothesis** (processing a full L2 sentence = deeper
   elaborative processing = better retention). An **L1 (English) translation removes exactly
   that L2 processing.** So this evidence does **NOT** transfer to our English sentence-reveal
   as a *vocab* booster — it actually warns that L1 sentence translation is the *wrong tool for
   vocab*. Confidence in the reversal: **High**; confidence it transfers to L1 reveal: it
   **doesn't** — that's the point.

3. **"Desirable difficulty" is real but NOT unlimited — removing reconstruction effort is
   unlikely to actively *damage* retention, the risk is *substitution*.** A 2025 replication
   (MDPI *Behavioral Sciences*, PMC12108878) found harder vocab-learning conditions "provided a
   disadvantage during learning… but made no difference or an advantage during relearning and
   delayed testing" — i.e. **"not all manipulations that introduce difficulty produce
   long-lasting benefits."** Combined with van den Broek 2022 (retrieval > inference) and Bjork:
   the danger of sentence-reveal is **not** that one reveal nukes memory — it's that *habitually
   reading the English instead of the Malay* displaces the word-level retrieval that does the
   vocab work. Direction: gate it + keep word-level as the **default path**. Confidence: **High.**

4. **In-place beats separated for sentences too.** Cognitive-load / split-attention (Marefat &
   Rezaee; parent D4) → render the translation **at the sentence**, not in a far panel.
   Confidence: **Med-High** (transfers from the word case; a full sentence is more text, so the
   in-place form is a slide-down *right under the line*, not a margin).

5. **Sentence is the right MT unit — and the reason BYOK comes next.** NMT/LLM translation is
   trained and evaluated **at the sentence level**; whole-sentence attention **resolves lexical
   ambiguity, idioms and grammar that isolated words cannot** (WSD/context-in-NMT survey;
   document-level MT studies). So (a) sentence-as-unit gives a *coherent* translation where a
   line-fragment would mistranslate, and (b) **instruct models add real value on sentences,
   ~none on lone words** — which validates sequencing sentence-reveal **before** BYOK.
   Confidence: **High.**

6. **Scaffold for *required* hard text, not licence to read above-level.** "Frustration-level"
   reading research says the fix for too-hard text is usually *easier text* — but IGCSE past
   papers are **fixed**: the learner must read this exact passage. So sentence-reveal is a
   legitimate **scaffold into the zone of proximal development** for mandated text, not an
   excuse. This is why it must stay **on-demand**, not default. Confidence: **Med.**

### The synthesis
Offering sentence meaning **helps comprehension** (1) and unblocks stuck learners (6); it is
**not** a vocab tool for our case (2) and, used as the habitual path, would **erode** the
word-level retrieval that is (3). The resolution that satisfies all of it:

> **Reveal-gated, in-place, L1, sentence-level — explicitly positioned as a COMPREHENSION
> aid, kept SECONDARY to word-level reveal, and routing any still-unknown words from a
> revealed sentence into the word-gloss → FSRS path.** The learner reads the Malay first; a
> deliberate, opt-in action reveals the English sentence under the line; word-level retrieval
> remains the default, primary path; a "show all sentences" escape hatch exists for timed
> comprehension cram (UDL: offer ≠ force).

This is an **extension** of the shipped layer: a parallel **sentence-keyed** path
(grouping + sentence translation + sentence reveal-state + a slide-down renderer) alongside
the existing **word-keyed** one — reusing the same volume-safe runner, cache, and
reveal-gate discipline.

---

## Options considered (drafted from first principles BEFORE research)
- **A — Reveal-gated sentence reveal, dedicated per-sentence affordance, gated behind a
  "Sentences" toggle, punctuation-sentence unit, in-place slide-down, reflow-first (CHOSEN,
  v1).** A subtle per-sentence cue (only visible when the learner turns on Sentence mode →
  keeps default reading clean and word-level primary); tap → the full English slides down
  under that sentence; word-glosses unaffected; "show all sentences" escape hatch. *Assumption
  (validated):* providing sentence meaning helps comprehension (1,4); gating + keeping it
  secondary protects the word-level retrieval (3); punctuation-sentence gives a coherent
  translation (5).
- **B — Line-based unit instead of punctuation-sentence (REJECTED as primary; kept as Layout
  fallback).** Anchor to each visual line/run. *Assumption (refuted):* a line is a meaning
  unit. It isn't — sentences wrap across lines, so a line-reveal often translates a *fragment*
  → incoherent/misleading English (finding 5). Survives only where punctuation-grouping is
  unavailable (Layout view's run model) — and that's exactly why Layout is a fast-follow, not v1.
- **C — Granularity sub-toggle "Word | Sentence" on the existing tap (REJECTED).** Tapping a
  word reveals its sentence when in Sentence granularity. *Assumption (refuted):* reuse the tap,
  zero new affordance. But it **silently re-purposes tap-to-translate** (a surprising mode you
  forget you're in) and risks regressing the core word gesture / Select v2 arbitration. The
  dedicated cue in A is more discoverable and gesture-isolated (it `stopPropagation`s like
  DocGloss). Rejected on regression risk.
- **D — Long-press a word → its sentence (REJECTED).** Elegant dual-granularity. *Assumption
  (refuted):* long-press is free. It **collides with Select v2 long-press** and is
  low-discoverability on mobile. Rejected.
- **E — Default-on parallel sentence translation (REJECTED as default → folded into "show all
  sentences" escape hatch).** Evidence (3) + the whole learning-quality invariant: a permanent
  English-over-everything layer erodes acquisition. Survives only as the opt-in escape hatch.
- **F — L2 (Malay) sentence *simplification/paraphrase* instead of English translation (PARKED
  → future, BYOK-era).** This is the genuinely vocab-superior intervention per finding 2
  (Rassaei & Folse). But it needs **generative L2 paraphrase** (quality risk, an instruct model,
  grounding is harder), is a *different feature* from translation, and our hook points are built
  for translate. Park as a strong future candidate once BYOK lands an instruct model — note it
  loudly so it isn't lost.

### Scope scoring (Impact × Confidence ÷ Effort, per methodology)
| Scope | Impact | Confidence | Effort | Score | Verdict |
|---|---|---|---|---|---|
| **A** reveal-gated sentence reveal, reflow-first | 4 | 4 | 2.5 | **6.4** | **Build (v1)** |
| A+Layout (punctuation grouping over run model) | 4 | 3 | 4 | 3.0 | **Fast-follow** |
| F L2 paraphrase (vocab-superior) | 4.5 | 3.5 | 4.5 | 3.5 | Park → BYOK-era |
| E default-on parallel | 2 | 2 | 3 | 1.3 | Reject as default → escape hatch |

Winner: **A (reflow-first v1)**; Layout sentence-reveal as a fast-follow; F parked as the
evidence-backed long game; E demoted to the escape hatch.

---

## Chosen design (Scope A) + WHY
1. **A new sentence-keyed path, parallel to the word path — not a rewrite.** Group reflow tokens
   into **punctuation-sentences** (split on `.` `!` `?` `…`, from the `punct` parts already in
   `tokenized.pages[].paragraphs`; a paragraph with no internal sentence punctuation = one
   sentence). Each sentence gets a stable `sentenceId` + its token-index range. *Why:* the
   reflow `parts` model already carries punctuation, and a coherent unit needs the full sentence
   (finding 5).
2. **Reveal-gated, in-place, behind a "Sentences" toggle.** A subtle per-sentence cue
   (`Languages`/¶ icon at the sentence start) appears **only when the learner enables Sentence
   mode** — so default reading stays clean and **word-level stays the primary path** (finding 3).
   Tap the cue → the full English **slides down inline under that sentence** (finding 4). Reuse
   the shipped reveal-gate discipline (`docGlossState`-style reducer, extended for sentence ids)
   and `stopPropagation` so it never starts a Select v2 gesture. *Why:* gating + secondary
   positioning is the guardrail that keeps comprehension help from becoming a vocab crutch (3).
3. **"Show all sentences on this page" escape hatch.** One toggle reveals every sentence
   translation on the visible page (Option E, opt-in). *Why:* UDL offer-don't-force; timed
   comprehension cram legitimately wants it.
4. **Word-level stays default + primary; the two coexist cleanly.** Sentence mode is a separate,
   off-by-default toggle from "Translate page" word-glosses. When a sentence IS revealed, dim/hide
   the per-word cues *within that sentence* (the sentence already supplies meaning — avoids
   double-hand-over + clutter); word cues elsewhere are untouched. *Why:* finding 3 — protect the
   retrieval path; findings on split-attention/clutter.
5. **Route the comprehension moment back into retrieval (vocab still routes to FSRS).** On a
   revealed sentence, offer **"add unknown words from this sentence to deck"** (reuse `addCards` /
   the word-gloss add path). *Why:* finding 2+3 — an English sentence won't build vocab by itself;
   the durable vocab learning still happens in FSRS, so the sentence reveal should *feed* it.
6. **Free gtx by default; sentence translation is where BYOK will shine.** v1 ships **free-gtx
   only** (no key). The full-sentence strings flow through the **same** `translateDocument`
   runner + `translateBatch` (IndexedDB-cached by sentence string). BYOK "higher quality" is the
   **next** feature (`plans/2026-06-08-byok-quality-translation.md`) and finding 5 is the reason
   it comes after this. *Why:* no-paywall invariant; sequencing premise validated.
7. **Grounding stays honest.** A full-sentence machine translation can't be dictionary-verified
   the way a word can, so render it with the **subtle "machine-translated" marker** by default
   (never presented as authoritative); per-word grounding still applies to any word-glosses.
   *Why:* honesty bar (parent D9) — don't silent-ship a sentence as ground truth.
8. **Volume-safe + cancellable + resumable, reusing the proven runner.** Sentences are short, so
   `chunkTexts` packs several per gtx call (≤~4000 chars); `translateDocument` already gives
   throttle + backoff + `AbortSignal` + progress; the cache makes re-runs cheap. *Why:* reuse,
   not reinvent.

## Safety / quality bars
- **Reveal-gated is the default. Default-on parallel sentence translation is NEVER the default**
  — only the explicit "show all sentences" opt-in. (The learning-quality case rests on this.)
- **Word-level reveal stays the primary path**; sentence mode is off by default and visually
  secondary. Sentence reveal must **route unknown words into the FSRS path**, not replace it.
- **Don't regress** reflow reading, Layout view, tap-to-translate, Select v2 (highlight/group/
  touch + pinch arbitration), `addSelectionToDeck`, the shipped word-gloss layer, or "List
  unknowns". The sentence cue + slide-down must `stopPropagation` (no accidental selection).
- **Coherent unit only:** never translate a line-fragment as if it were a sentence (finding 5).
  Paragraph-fallback when a paragraph has no internal sentence punctuation.
- **Honesty:** sentence translations carry the "machine-translated" marker; never authoritative.
- **Free path needs no key.** No paywall (invariant). BYOK is the *next* feature, strictly additive.
- `var(--color-*)` only; React-19 purity; **bilingual-safe** (works on MS *and* EN docs — on an
  English doc the "sentence → English" reveal is a no-op/skip, since source≈target; decide in plan);
  touch-first 390×844; slide-down must not break selection/copy/links.
- **Volume:** bounded memory + network; cancellable; resumable via cache; no UI freeze on 30–50pp.
- **Accessibility:** cue keyboard-operable; revealed block `aria-live`; WCAG 1.4.13 dismissible/
  persistent — inherited from the shipped popover/gloss pattern.

## Decision log
| # | Decision | Evidence / source (grade) | Effect / direction | Confidence |
|---|---|---|---|---|
| S1 | **Offer sentence reveal at all** — it aids comprehension | gloss lit aids comprehension; L1 = most direct (Chen 2025; multimedia-gloss meta; Alharbi) (high) | +comprehension, +affective unblock | **High** |
| S2 | **Position it as COMPREHENSION, not vocab** | Rassaei & Folse 2024: sentence glosses beat word — **but only L2 ones** (Involvement Load); L1 reveal removes that processing (high) | L1 sentence ≠ vocab tool | **High** |
| S3 | **Reveal-gated default; word-level stays primary** | van den Broek 2022 retrieval>inference; Bjork; MDPI 2025 "not all difficulty helps" → risk is *substitution* (high) | gate protects retrieval | **High** |
| S4 | **In-place slide-down, not a far panel** | Marefat & Rezaee cognitive-load / split-attention (parent D4) (med-high) | lowers load, aids comprehension | **Med-High** |
| S5 | **Punctuation-sentence unit, not line** | context-in-NMT / WSD: fragments mistranslate; sentence resolves ambiguity (high) | coherent translation | **High** |
| S6 | **Reflow-first v1; Layout sentence-reveal = fast-follow** | reflow `parts` carry punctuation; Layout run model has no clean sentence grouping (high, code-grounded) | ship the clean case first | **High** |
| S7 | **Dedicated cue gated by a toggle (not re-purposed tap, not long-press)** | Select v2 long-press collision; tap-repurpose surprises (med, code-grounded) | zero gesture regression | **Med-High** |
| S8 | **Route revealed-sentence unknowns into word-gloss → FSRS** | retrieval>glance (van den Broek; Bjork) (high) | vocab still consolidates in FSRS | **High** |
| S9 | **Free gtx default; sentence is where BYOK shines (next)** | context-in-NMT: instruct models disambiguate sentences, ~no gain on lone words (high) + no-paywall invariant | sequence sentence-reveal before BYOK | **High** |
| S10 | **Machine-translated marker on sentence output** | parent D9 honesty backbone (high) | never silent-ship as authoritative | **High** |
| S11 | **Inline default + Settings toggle for bottom-sheet render** | S4 (inline = best) + UDL/a11y preference (med-high) | evidence-backed default, choice for preference/a11y | **Med-High** |
| S12 | **Full-translation page (Option G) parked, must stay reveal-gated** | finding 3/E: English-only default-on = crutch; physical separation preserves read-Malay-first (high) | safe only as gated/parallel/check surface | **High** |

## Open questions for Kheshav — RESOLVED (Kheshav sign-off 2026-06-08)
- **Q1 — Gesture.** ✅ **Dedicated per-sentence cue gated behind a "Sentences" toggle** (not tap
  re-purpose, not long-press). Off by default → word-level stays primary; zero gesture clash.
- **Q2 — Sentence unit.** ✅ **Punctuation-sentence** (`. ! ? …`), paragraph-fallback. Kheshav
  also raised **paragraph / whole-document** translation → captured as **Option G** below
  (parked follow-up on a dedicated reveal-gated reading page; sentences stay inline).
- **Q3 — v1 scope.** ✅ **Reflow view only**; Layout sentence-reveal is a fast-follow.
- **Q4 — Render location.** ✅ **Inline slide-down under the sentence is the default**, **plus a
  Settings toggle** to switch to a **fixed bottom sheet** (preference + accessibility). See §4-bis.
- **Q5 — Default reveal posture.** ✅ **Reveal-gated** (cues only when Sentence mode is on; "show
  all sentences" is the opt-in escape hatch). Consistent with the shipped word-gloss D1.

### §4-bis — Render-location Setting (Q4)
A new pref (e.g. `pdfReader.sentenceRender: 'inline' | 'sheet'`, default `'inline'`) read in
`PDFReader.jsx`; `SentenceReveal` renders inline (default) or routes the revealed text to a fixed
bottom panel when `'sheet'`. Cheap, additive; `var(--color-*)` only; both themed. Default inline
is the evidence-backed choice (S4 split-attention); the sheet exists for preference/a11y.

### Option G — Full-translation reading page (PARKED follow-up; Kheshav idea 2026-06-08)
A dedicated, full-screen **"Full translation"** page (reached by an explicit button, with a back
arrow to the default reader) for **paragraph → whole-document** translation — the right home for
large units (inline is unusable past a sentence) and the natural home for **BYOK "higher quality"
whole-document** translation.
- **Why it's learning-SAFE despite being "full translation":** physically leaving the Malay
  reading view to get English **preserves read-Malay-first better** than any always-on overlay
  (the harm in finding 3/E is reading English *while* reading Malay). To stay safe it must be:
  (a) **still reveal-gated** on the page (Malay shown; reveal per paragraph, or "reveal all" for
  exam cram) — i.e. the "show all" escape hatch relocated to a clean surface, NOT English-only by
  default; (b) framed as **"check your understanding / model translation"** (post-reading), not
  "read in English"; (c) ideally **parallel Malay↔English** so eyes still anchor on the Malay.
- **Ranking:** Impact 3.5 × Confidence 3.5 ÷ Effort 3 ≈ **4.1** → **after** sentence-reveal,
  pairs with BYOK. Sentences themselves stay **inline** (do not route to this page).
- **Reject the unsafe form:** a one-tap English-only whole-document dump as the default reading
  surface = Option E maximal crutch. Only the reveal-gated/parallel/check-framed form survives.

## Test plan
- **Pure units (TDD first, no DOM):** sentence grouper (split on `. ! ? …`; paragraph-fallback;
  no empty/punct-only sentences; correct token-index range per sentence; reduplication/hyphen
  tokens stay intact); sentence reveal-state reducer (reveal one / hide one / show-all override /
  collapse — mirroring `docGlossState`); sentence-string collection for the runner (skip
  English-source no-ops on EN docs; dedupe identical sentences); "dim word cues inside a revealed
  sentence" selector; add-unknowns-from-sentence → card payload.
- **e2e + GO WILD** ([[feedback_go_wild_smoke_test]]): enable Sentence mode on a multi-page MS
  fixture → cue appears, read Malay first → tap → English slides in under the sentence; "show all
  sentences" then collapse; cancel mid-translation; re-run resumes from cache (few/no new calls);
  a sentence that wraps two lines still reveals the WHOLE sentence (not a fragment); word-gloss
  cues inside a revealed sentence are dimmed but elsewhere intact; add-unknowns-from-sentence lands
  FSRS cards; tap on the cue/slide-down never starts a Select v2 selection; pinch-zoom while a
  sentence is shown (Layout untouched in v1); spam the Sentences toggle / navigate mid-job; offline
  → graceful; works on an **English** doc (reveal is a no-op/skip); theme swap (block themed, page
  surface stays). Light + dark screenshots.

---

## Paste-ready Implementation kickoff (next session)
> Continue the IGCSE Malay Master app (React/Vite SPA, https://upg-igcse-malay-master.vercel.app).
> This is an **IMPLEMENTATION session** — build an already-approved spec.
>
> Read + FOLLOW: auto-memory MEMORY.md, `RESUME_HERE.md` (top blocks), the spec
> `docs/superpowers/specs/2026-06-08-sentence-reveal-design.md` + plan
> `docs/superpowers/plans/2026-06-08-sentence-reveal.md`, and the "Implementation session"
> expectations in `docs/process/feature-development-methodology.md`.
>
> Build it in the plan's TDD order; respect the spec's quality/safety bars (reveal-gated default;
> word-level stays primary; punctuation-sentence unit; reflow-first; sentence reveal routes unknown
> words into FSRS; machine-translated marker; don't regress reflow/Layout/tap-translate/Select v2/
> word-glosses). Verify build + lint + test:run; eyeball light AND dark via a Playwright screenshot
> spec; commit atomically + refresh RESUME_HERE in the same commit; confirm Vercel READY after
> deploy. Plain language, evaluate my choices, short time estimates first. You may stage/commit/sync.
>
> First action: verify the baseline (git clean, test:run, lint, prod READY), then begin Step 1.
> Quality over speed.
>
> AFTER this ships, the implementation-ready follow-up is BYOK "higher quality" translation —
> full mechanical plan at `docs/superpowers/plans/2026-06-08-byok-quality-translation.md`
> (sentence-reveal is the validated reason it comes after; don't lose it). Also parked, evidence-
> backed: **Option F** — L2 (Malay) sentence *simplification* (vocab-superior per Rassaei & Folse).

## Sources (graded in the decision log)
- Rassaei & Folse (2024), *Effects of L1 and L2 word-level vs. L2 sentence-level glosses on vocabulary learning*, **System** — https://www.sciencedirect.com/science/article/abs/pii/S0346251X24000551 (doi:10.1016/j.system.2024.103273)
- Chen (2025), *The Effects of Gloss Language on L2 Vocabulary Learning from Reading*, TESOL Quarterly — https://onlinelibrary.wiley.com/doi/10.1002/tesq.3394
- Multimedia-gloss & EFL reading comprehension (all formats aided comprehension equally) — https://pmc.ncbi.nlm.nih.gov/articles/PMC7891738/
- Multimedia gloss meta-analysis (g≈0.73) — https://www.researchgate.net/publication/386126638
- Marefat & Rezaee, gloss presentation & cognitive load — https://www.jite.org/documents/Vol15/JITEv15ResearchP478-501Marefat2692.pdf
- van den Broek et al. (2022), retrieval vs inference, Cognitive Science — https://onlinelibrary.wiley.com/doi/10.1111/cogs.13135
- Bjork & Bjork, desirable difficulties — https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf
- "Does making L2 vocabulary difficult enhance retention/transfer?" (not all difficulty helps), Behavioral Sciences 2025 — https://pmc.ncbi.nlm.nih.gov/articles/PMC12108878/
- Context in neural machine translation (sentence-level disambiguation; WSD) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11465115/ ; https://arxiv.org/pdf/2311.15507
</content>
</invoke>
