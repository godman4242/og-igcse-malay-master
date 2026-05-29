# Speaking Pillar — State Map & Opportunity Brief

**Status:** PRE-SPEC / DISCOVERY — needs a brainstorm WITH Kheshav before any build
**Date:** 2026-05-29
**Why this is a brief, not a spec:** I (Claude) researched the speaking surfaces
expecting a thin pillar to flesh out. It is the opposite — **speaking is one of
the most complete parts of the app.** Writing a full implementation spec solo
would invent scope and risk rebuilding what already exists. So this documents
the real state and frames the genuine decisions for us to make together.

---

## 1. What already exists (do NOT rebuild)

| Capability | Where | Notes |
|---|---|---|
| **Turn-based AI roleplay** (the PRD's headline ask) | `src/pages/Roleplay.jsx` | Examiner prompt per turn with TTS read-along + word highlight; student responds by **text OR speech**; per-turn feedback; multi-turn; AI **and** offline static modes; bilingual (15 MS / 7 EN scenarios); history tab. |
| **Single-turn topic speaking** | `src/pages/Speaking.jsx` | PICK → RECORD → grade. Live transcript, duration tracking, Theater Mode. |
| **Sophisticated grader** | `src/lib/speakingGrader.js` | Two layers: offline **heuristic** band 1-6 (fluency wps, filler density, type-token ratio, discourse markers, formal lexicon, cue coverage) **+** Gemini **AI grade** with a calibrated IGCSE rubric returning `improvements[]` (issue/evidence/fix), `improvedTranscript`, `vocabUpgrades[]`, `nextStep`. Bilingual prompts. |
| **Pronunciation scoring** | `src/lib/pronunciation.js` + `src/components/PronunciationDrill.jsx` + `study/SpeakMode.jsx` | Word-level diff (correct / close / wrong) with Malay-specific phonetic tips (ny, ng, trilled r, kh, sy, gh). Used in Study "speak" mode, Roleplay, MistakeJournal. |
| **Exam-day speaking band** | `src/pages/ExamRehearsal.jsx` | Speaking band feeds the composite Readiness %. |
| **History + weakness signals** | store `speakingHistory` (`{ts, band, durationSec, wordCount, transcript, lang}`), `worstSpeakingSession`, `WorstTurnWidget` | Already surfaced on the Dashboard. |
| **NEW: routing into speaking** | `src/lib/dailyPlan.js` (shipped today) | The Daily Plan spine now routes to `/speaking` when the recent speaking band is the student's weakest skill. |

**Takeaway:** the *mechanics* (capture, grade, feedback, pronunciation, exam
simulation, bilingual) are all built and good. The gap is not a missing
mechanic.

## 2. Where the real opportunity probably is

Because the mechanics are done, the high-value work is about **the loop over
time** and **exam realism** — softer, product-judgment territory. Candidates,
roughly highest-leverage first:

1. **"Am I getting better?" progression.** Today each attempt is graded in
   isolation. There's no trend ("your speaking band: 3 → 4 → 4 over 5 attempts",
   per-topic mastery, recurring-weakness tracker). A fluency/band trend + a
   "your top recurring speaking weakness" readout could be the single most
   motivating addition — and it leans on data we already store.
2. **Spaced re-attempt of weak topics.** Speaking attempts aren't scheduled like
   FSRS cards. A light "these 3 topics are due for another go" (your weakest /
   oldest) would close the practice loop. The Daily Plan spine is the natural
   host.
3. **Full timed mock (Paper 3 shape).** ExamRehearsal has a speaking band, but a
   dedicated multi-part oral mock (warm-up → topic card → discussion, timed,
   examiner-driven) would be the most exam-real experience. Bigger build.
4. **Pronunciation weakness drilling fed from mistakes.** Pronunciation mistakes
   are scored but I haven't confirmed they flow into the mistake journal /
   fix-up queue the way vocab/imbuhan do. If they don't, wiring that closes a
   gap the Daily Plan "fix-ups" task would then surface automatically.
5. **Sentence Repetition Drill** (PRD item): app plays a model sentence (TTS),
   student repeats, scored on accuracy. Partially achievable with existing
   `scorePronunciation` + `speech.js`. Smallest of these.

## 3. Open decisions for us (bring your intent — "I want students to ___")

1. **Which outcome?** Motivation-through-visible-progress (#1/#2) vs.
   exam-realism (#3) vs. pronunciation precision (#4/#5). These pull in
   different directions; pick the student feeling you care about most.
2. **Progression depth:** a simple band-trend sparkline, or per-topic mastery +
   recurring-weakness clustering (more like the mistake pipeline)?
3. **Does pronunciation feed the mistake journal today?** (One thing to verify
   at the start of the build — it decides whether #4 is "wire existing" or
   "build new".)
4. **AI budget:** richer speaking AI = more Gemini calls. Acceptable for
   invite-only, but worth a conscious cap (mirrors the 50/day client limit).

## 4. Recommendation

Do **not** build speaking solo. The mechanics are mature; the remaining work is
a product call that's genuinely better with your direction and cheap to decide.
Next session: 10 minutes of brainstorming on §3, then I write a real
implementation spec for the ONE chosen opportunity and build it with you able to
glance at checkpoints. My gut pick if you want a lead: **#1 progression** — it's
the highest motivation-per-effort and reuses data we already have.
