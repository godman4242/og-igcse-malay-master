# Kickoff — Cikgu (free tier) honest-uncertainty confidence gate

Paste the fenced block below as the FIRST message in a new attended session. This is
an eval-driven quality fix on the FREE Cikgu Maya grammar tutor — the path used by
every learner WITHOUT an AI key (the majority). Pivots off the English-parity epic
(done 2026-06-14).

> Builds on (live): the AI-tier eval harness (`scripts/ai-tier-eval/`) with a
> `CIKGU_GOLD` gold set (12 questions × `keyFacts[]`) already in place — the
> measurement is built; this fixes what it measures.

---

```text
You are continuing the IGCSE Malay Master app. Read RESUME_HERE.md and CLAUDE.md first
(esp. the "AI / Cikgu Maya Architecture" tier chain). Follow the working agreement:
TDD (red-proof first), surgical diffs, the pre-commit gate stays green, RESUME_HERE.md
updated in the same commit, decide-and-flag every call (decision + why + one-line veto
note) — questions only for destructive ops / money / invariants.

GOAL: stop the FREE Cikgu tutor from answering confidently when it doesn't actually
know. Add a calibrated CONFIDENCE GATE to the free expert path.

WHY: a learning tool giving a confident WRONG grammar answer is the worst failure mode
— a student trusts it. Today the free expert system never says "I'm not sure":
`searchKnowledge` (src/data/cikguKnowledge.js:1130) scores entries by keyword/answer-word
overlap (`scoreMatch`:1089) and `scoreMatch` hands out points for almost any overlap, so
nearly every query scores >0 on SOMETHING. `CikguBot.getExpertResponse` (CikguBot.jsx:70)
already has an honest "I don't have a specific answer… here's what I can help with"
fallback — BUT it only fires when results.length === 0 (EVERY entry scores 0, which is
rare). A weak/off-topic top match (score 1–4) skips that branch and is presented as
authoritative via formatKnowledgeResponse(results[0]). The eval already records this:
harness.freeCikgu captures `topScore = results[0]?.score ?? 0` per gold question.

DESIGN — resolve + log these forks before coding:
1. Threshold — CALIBRATE it from the data, don't guess. Run the gold set through
   searchKnowledge (deterministic, NO key needed) and look at the topScore distribution
   for in-coverage vs out-of-coverage questions (CIKGU_GOLD entries carry a
   `coverageHint`); pick a MIN_CONFIDENCE that separates "real match" from "scraping".
   Log the distribution + the chosen number + a one-line veto note.
2. Below-threshold behaviour — extend the EXISTING results.length===0 honest fallback
   (CikguBot.jsx:73-84) to also fire when results[0].score < MIN_CONFIDENCE: admit
   uncertainty, name the closest topic it DID find (so it's still helpful), and offer to
   switch on the AI tutor for a precise answer. Reuse the existing copy; don't invent a
   new component. Decide the exact wording + veto note.
3. Scope — gate the FREE expert path ONLY (getExpertResponse + the harness's freeCikgu so
   the eval measures the gated behaviour). Do NOT touch the AI tier, formatKnowledgeResponse,
   the "Related" entry logic, or searchKnowledge's return shape. Decide-and-flag whether to
   also WIDEN free-tier coverage (add KB entries) — that's a separate, bigger task; flag it.

READ FIRST: src/data/cikguKnowledge.js (scoreMatch:1089, searchKnowledge:1130,
formatKnowledgeResponse); src/pages/CikguBot.jsx (getExpertResponse:70, the AI chain
below it); scripts/ai-tier-eval/{harness,goldCikgu,judge,score}.mjs; run the eval with
`npm run eval:ai-tier` (the LLM-judge fact-recall pass needs GEMINI_KEY; the topScore
calibration is keyless).

DON'T BREAK: in-coverage answers (a strong top match must still answer fully — no
regression in fact-recall); the AI-tier path + its expert-fallback; formatKnowledgeResponse;
the "Related" suggestion; the existing empty-results fallback; the no-paywall invariant
(the AI offer is a suggestion, never a gate).

DONE (measurable, via CIKGU_GOLD):
- Out-of-coverage gold questions stop producing confident answers — the harness's
  confident-wrong / false-confident count for low-topScore questions drops to ~0 (they
  now route to honest-uncertainty); in-coverage fact-recall is UNCHANGED (no regression).
  Paste the before/after numbers.
- The chosen MIN_CONFIDENCE is justified by the logged topScore distribution.
- A red-proofed unit test: a known off-topic query → uncertainty + AI-tier offer; a known
  in-coverage query (e.g. "Explain the meN- prefix") → the full canned answer (watched
  failing first — pre-fix, the off-topic query returns a confident canned answer).
- Gate green (build + test:run + lint). RESUME_HERE + CLAUDE.md updated.

Start by stating what RESUME_HERE.md says is current, then your decisions on the 3 forks
above with veto notes, before writing code.
```
