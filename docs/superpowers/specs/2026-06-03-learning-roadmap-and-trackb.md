# Learning roadmap + Track-B feature specs (2026-06-03)

A Design & Research session output: a **research-backed, ranked roadmap** of
high-value learning features, plus **deep specs** for the top two so they're
build-ready. Build order is deliberately left open (Kheshav's call at
implementation time) — this doc gives the evidence + the recommendation.

Companion: the tappable saved-word highlights spec/plan
(`2026-06-02-tappable-highlights-*`) is the *currently queued* feature; this doc is
what comes after.

---

## 1. The ranking (Impact × Confidence ÷ Effort)
Scored 1–5 each; rank = Impact × Confidence ÷ Effort. Higher = do sooner. All
sanity-checked against project invariants (no paywall, invite-only, individual
revision, Malay+English quality first) and "does this serve the learner or just add
surface area?"

| Rank | Candidate | Impact | Conf | Effort | Score | One-line why / why-later |
|------|-----------|:------:|:----:|:------:|:-----:|--------------------------|
| **1** | **Mistake-journal micro-drills** | 4 | 4 | 2 | **8.0** | Pipeline already exists (`getFixUpQueue`); turns logged weaknesses into a focused retrieval+correction session. Genuinely additive. **Deep-specced below (§2).** |
| **2** | **Generative cloze from saved words** | 5 | 4 | 3 | **6.7** | Generation effect (d≈0.40) + productive retrieval. BUT `drillVariants.js` already has a `cloze` variant → this is an *enhancement + entry point*, not net-new. **Deep-specced below (§3).** |
| 3 | Recall-before-reveal as a cross-surface pattern | 4 | 4 | 3 | 5.3 | Largely realised by tappable Tier-2 + `drillVariants`. Park: revisit once both ship, then unify the pattern. |
| 4 | Imbuhan / word-family morphology deepening | 4 | 3 | 3 | 4.0 | Malay is morphology-rich; one root → many words lowers "learning burden" (Nation). Park: needs content design, not just code. |
| 5 | Confidence-calibration feedback | 3 | 3 | 3 | 3.0 | `confidenceLog` exists; "sure but wrong" is a known metacognition win. Park: medium evidence, medium lift. |
| — | Real Malay pronunciation scoring | — | — | — | — | Already specced (`2026-06-01-speaking-reliability-and-direction.md`). Not re-litigated here. |

**Recommendation:** build **#1 (mistake micro-drills)** first — highest score,
lowest effort, closes the CLAUDE.md Phase-5 feedback loop. Then **#2**. But order is
yours; both are build-ready below.

---

## 2. Deep spec — Mistake-journal micro-drills  *(rank #1)*

### 2.1 Problem + who
The app already *captures* mistakes richly (`mistakes` array, auto-promotion of
vocab/imbuhan to FSRS cards) and *ranks* them (`getFixUpQueue`). But there's no
tight **retrieval + correction loop**: a learner can't sit down and *drill their own
errors* in a focused 3-minute session. For our self-directed teen with no teacher,
"practise exactly the things you got wrong" is the highest-leverage, lowest-cost win.

### 2.2 Evidence (decision-linked)
- **Retrieval + corrective feedback** is the strongest combo for fixing errors
  (testing effect + feedback necessity — same R1/R2 as the tappable spec). · **high**
- **Error-focused (vs. blanket) practice** concentrates effort where the learning
  gap actually is — efficient for limited study time. · **med-high**
- Transfer check: works for our context because the mistakes are *already* the
  learner's own IGCSE Malay/English errors — maximally relevant, no content authoring.

### 2.3 Options considered
- **A — Dedicated "Fix-Up" drill session (CHOSEN).** A new study-style flow that
  pulls `getFixUpQueue(limit)` and drills each as a recall item (show the context /
  prompt, learner answers, reveal correct + their original error, mark
  reviewed/forgot). Reuses Study's card-flow UI.
- B — Just surface the queue as a list on the Mistake Journal page (no drilling).
  Rejected: that's already roughly what the journal shows; no retrieval rep.
- C — Auto-inject mistakes into normal FSRS Study. Rejected for now: vocab/imbuhan
  mistakes ALREADY auto-promote to FSRS cards, so this would double-handle; the
  unique gap is drilling the *non-promotable* categories (tense, cohesion, register,
  comprehension, pronunciation) + a focused entry point.

### 2.4 Chosen design
- **Entry point:** a "Fix your mistakes (N)" CTA on the Mistake Journal
  (`src/pages/MistakeJournal.jsx`) and/or the Dashboard, shown when
  `getMistakeStats().total > 0`. Route: reuse `/mistakes` with a `?drill=1` mode, or
  a small dedicated sub-view — keep it inside the journal page to avoid a new route.
- **Two prompt shapes — CRITICAL (verified against real call sites 2026-06-03).**
  Mistakes do NOT all have a crisp answer. Split by data shape, not just category:
  - **Answerable** (has `correct` or `correction`): vocab (`{word}`→`correct`),
    imbuhan/spelling, and **comprehension** (which logs `surface`=question,
    `given`=their wrong option, `correct`=right option, `note`=explanation). →
    *recall → reveal* the answer + contrastive `given` ("your answer vs. the fix").
  - **Advisory / reflective** (NO answer — only `surface` + a coaching `note`):
    **fluency, cohesion, register, pronunciation** (logged by Speaking/Roleplay as
    tips, e.g. "vary your discourse markers"). There is nothing to "reveal." →
    show the `surface` + the `note` as a *reflection card*: "Re-read your line;
    here's the coaching point," with a **"Practise this in {Speaking/Roleplay}"**
    deep-link instead of a fake quiz. Mark reviewed on acknowledge.
  - The `buildDrillPrompt` helper (§2.7) returns a `kind: 'answer' | 'reflect'`
    discriminator so the UI renders the right shape. This is the single most
    important thing to get right — a "What's the fix?" prompt with no answer is the
    failure mode this split prevents.
- **The drill loop** (reuse Study's presentational rhythm, NOT its FSRS scheduler):
  1. `const queue = getFixUpQueue(12)`.
  2. For each mistake: `buildDrillPrompt(mistake)` → render answer-shape or
     reflect-shape per above.
  3. Learner self-rates **Got it / Still shaky** (reflect-shape: **Noted / Practise**).
     - "Got it" → `markMistakeReviewed(id)` (sets `reviewed:true` +
       `lastReviewedAt`). Removes it from the active queue.
     - "Still shaky" → leave unreviewed (it stays in the queue, naturally
       re-surfacing) — optionally `addMistake` escalation is NOT needed (dedupe
       would just bump attempts; don't double-log a drill view).
  4. End card: "Fixed X of Y" + a link back.
- **No new scheduler.** This is a *review pass over the existing queue*, ordered by
  the existing `getFixUpQueue` ranking. Don't touch FSRS for the non-promotable
  categories; the journal's reviewed-flag IS the state.

### 2.5 Reuse map (verified)
- `src/store/useStore.js`: `getFixUpQueue(limit)` (ranked unfixed mistakes,
  deduped by word), `getMistakeStats()` (`{ total, byCategory, … }`),
  `markMistakeReviewed(id)` (sets `reviewed` + `lastReviewedAt`),
  `markMistakeFixed(id)` (alias). Mistake record fields:
  `{ id, timestamp, type, source, language, category, severity, word, given,
  correct, surface, correction, note, attempts, reviewed }`.
- `src/pages/MistakeJournal.jsx` — host page + existing list UI to extend.
- `src/pages/Study.jsx` — *pattern* reference for the answer-reveal-rate rhythm
  (don't import its FSRS logic; mirror the card/reveal UI feel + `var(--color-*)`).

### 2.6 Open decisions (defaults bold)
1. **Entry/route:** **in-page `?drill` mode on `/mistakes`** (no new route) vs. a
   new `/fix-up` route. Default: in-page (less surface, lazy-load already covers it).
2. **Prompt style per category:** **recall-then-reveal** (retrieval) for all, with
   contrastive "your answer vs. fix" on the reveal. Confirm vs. multiple-choice
   (rejected: MCQ is recognition, weaker than recall).
3. **Session size:** **12** (matches `getFixUpQueue` default). Confirm.

### 2.7 Test plan
- **Unit:** a pure `buildDrillPrompt(mistake)` helper (new, TDD) returning either
  `{ kind:'answer', question, answer, yourError }` (vocab/imbuhan/spelling/
  comprehension — has `correct`/`correction`) or `{ kind:'reflect', surface, note,
  practiseTarget }` (fluency/cohesion/register/pronunciation — no answer). Tests:
  one case per category mapping to the right `kind`; an answerable category missing
  its `correct` field falls back to `reflect` (never emit an answer-prompt with no
  answer); empty/garbage input → null (skipped).
- **E2E:** seed 3 mistakes → open drill → answer/reveal → "Got it" marks reviewed
  (`getMistakeStats().total` drops) → "Still shaky" keeps it. Light + dark eyeball.
- Gates: build clean · lint 0 · test:run all · e2e green.

### 2.8 Estimate
~1–1.5 hours (infra exists; mostly a focused UI loop + one pure helper).

---

## 3. Deep spec — Generative cloze from saved words  *(rank #2)*

### 3.1 Problem + who
"Generation" — producing a word rather than recognising it — is one of the most
robust memory boosts (d≈0.40; "remember vocab twice as well writing definitions than
copying"). The app HAS a `cloze` variant in `drillVariants.js`/Study, but: (a) it
only fires for FSRS-"Strong" cards, (b) it leans on each card's stored `ex` example,
and (c) there's no **dedicated "drill my saved words by producing them in context"**
entry. The gap is *sentence quality* + a *focused productive-practice surface* for
the words the learner personally saved.

### 3.2 Evidence (decision-linked)
- **Generation effect** for L2 vocab: generating > reading (d≈0.40). · **high**
- **Productive retrieval** practice most improves **productive** knowledge (which
  IGCSE writing/speaking demand) — receptive practice doesn't transfer up as well.
  · **med-high**
- Caveat / transfer: generation helps most when the learner can *almost* produce the
  word (not pure guessing). So gate it to cards with some stability, and always give
  the answer as feedback (R2).

### 3.3 Options considered
- **A — Dedicated "Produce" session over saved words (CHOSEN).** Pull the 'Saved'
  deck (+ optionally due cards), present each as a cloze: the card's example
  sentence with the Malay word blanked → learner types/recalls it → reveal +
  self-rate. Reuses the existing `cloze`/`produce` variant rendering.
- B — Just widen `drillVariants` so cloze fires earlier. Rejected alone: improves
  incidental exposure but gives no focused productive surface or entry point.
- C — AI-generate fresh sentences per word. Park as Tier-2 of this feature: nice but
  adds AI cost/latency + a quality-control burden; the card's own `ex` (captured in
  real context by select-to-card) is already a *good*, free sentence. Start with `ex`.

### 3.4 Chosen design
- **Source set:** the `'Saved'` deck (reuse `savedWordsForMode(cards,'saved')`
  mental model — these are the learner's own captured words, each with an `ex`
  example from where they saved it). Optionally include due non-Saved cards.
- **Cloze item:** take `card.ex`, blank the occurrence of `card.m`
  (case-insensitive; reuse the matching logic in `savedWordHighlight.js` /
  `highlightTerm`), show English `card.e` as the clue → learner produces the Malay
  word → reveal (R2 feedback) → self-rate **Got it / Reveal-needed**.
  - If `card.ex` is missing or equals the word (no real sentence), **skip to a plain
    produce prompt** ("English → type the Malay") rather than show an empty blank.
- **Scheduling (verified behaviour of `reviewCardAction(malay, rating)`):** DO feed
  the result into FSRS via this existing action (they ARE real cards). What it
  ACTUALLY does (checked in store, line 1023): updates the card's FSRS fields,
  increments `reviewedToday` + `studyHistory[today].reviews`, calls
  `updateChallengeProgress('review',1)`, and — **on `Rating.Again` only** —
  auto-logs a vocab mistake. It does **NOT** touch streak / study-minutes / XP
  (Study triggers those separately at session lifecycle).
  - "Got it" → `Rating.Good`. "Reveal-needed" → **`Rating.Hard`** (NOT `Again`) so a
    reveal doesn't spuriously spawn a mistake-journal entry; reserve `Again` for a
    genuine blank/no-attempt if you offer that. *(This is the key difference from §2
    micro-drills, where items aren't FSRS cards at all.)*
- **Entry point:** a "Practise saved words" CTA (Practice hub / Dashboard / the
  Saved deck). Reuse Study's session shell.

### 3.5 Reuse map (verified)
- `src/data/drillVariants.js` — `selectVariant(card)` already yields `cloze` /
  `produce` / `reverse`; reuse the variant *renderers* in `Study.jsx`
  (`ClozeMode` at `Study.jsx:160`).
- `src/lib/savedWordHighlight.js` — `findSavedWordMatches` to locate `card.m`
  inside `card.ex` for blanking.
- `src/components/SelectionToCard.jsx` — `highlightTerm(sentence, term)` for the
  "underline the answer within the sentence" reveal.
- `src/lib/fsrs.js` + store review action — these are real cards, so rate them.
- Card shape: `{ m, e, ex, t:'Saved', + FSRS fields }`.

### 3.6 Open decisions (defaults bold)
1. **Source:** **Saved deck only** for v1 (focused, the learner's own words) vs.
   all due cards. Default: Saved-only; expand later.
2. **Sentence source:** **card `ex` first; plain produce-prompt fallback** when no
   usable sentence. AI-generated sentences = parked Tier-2. Confirm.
3. **Does it feed FSRS?** **Yes** — they're real cards, so rate Got it→Good /
   Reveal→Hard. (Contrast §2, which must NOT.) Confirm.
4. **Does a cloze session count toward streak / daily goal?** `reviewCardAction`
   does NOT bump streak/study-minutes/XP by itself (verified) — Study calls
   `updateStreak()` + `addStudyMinutes()` at session end. **Default: yes, count it —
   so call `updateStreak()` + `addStudyMinutes()` at the cloze session's end**, the
   same way Study does (it IS real practice). Confirm; if NO, just omit those two
   calls and the cards still get scheduled + counted in `reviewedToday`.

### 3.7 Test plan
- **Unit (TDD):** `makeClozeItem(card) → { sentence, blankIndex, answer, clue } |
  producePrompt` — word present in `ex` → blanked sentence; word absent/`ex`==word →
  produce-prompt fallback; case-insensitive blank; multi-word phrase.
- **E2E:** seed 2 Saved cards (one with `ex`, one without) → cloze for the first,
  produce-prompt for the second → answer/reveal → "Got it" advances FSRS `due`. Light
  + dark eyeball.
- Gates: build clean · lint 0 · test:run all · e2e green.

### 3.8 Estimate
~1.5–2 hours (more than §2: real FSRS rating wiring + the cloze-builder edge cases).

---

## 4. Sources
- Generation effect / productive vocab: McCurdy et al. (2020) meta-analysis;
  Castledown VLI "Generation and L2 Vocabulary Learning"
  (https://www.castledown.com/journals/vli/article/download/vli.v14n1.102482/915).
- Retrieval direction (receptive vs productive): Cambridge SSLA "Effects of Learning
  Direction in Retrieval Practice on EFL Vocabulary"
  (https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/effects-of-learning-direction-in-retrieval-practice-on-efl-vocabulary-learning/159EE50F4B8835207764FB1B11077F29).
- Retrieval + feedback necessity: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1632206/full
- Desirable-difficulty / motivation caveat: https://pmc.ncbi.nlm.nih.gov/articles/PMC10858853/
