# Learning Outcomes — Pass 1: Ideation

**Project:** IGCSE Malay Master
**Goal of this pass:** generate raw ideas (not framing, not execution) anchored in named pedagogical mechanisms. Pass 2 will rank and shape; Pass 3 will build.
**Method:** each entry names the *mechanism* (so it's defensible), the *outcome* it moves, and a codebase *attachment point* (so Pass 2 can score feasibility quickly).
**Status:** in progress, saved incrementally so progress survives interruption.

**Reference frameworks pulled from:**
- Retrieval Practice / Testing Effect (Roediger & Karpicke, 2006)
- Spacing Effect (Cepeda et al., 2008) — already partly covered by FSRS
- Bjork's Desirable Difficulties (generation, interleaving, varied practice, spacing)
- ICAP Framework (Chi & Wylie, 2014): Passive < Active < Constructive < Interactive
- Bloom's Revised Taxonomy (Anderson, 2001): Remember → Understand → Apply → Analyze → Evaluate → Create
- Paul Nation's 4 Strands for L2 learning: meaning-focused input, meaning-focused output, language-focused learning, fluency development
- Cognitive Load Theory (Sweller): intrinsic / extraneous / germane
- Dual Coding Theory (Paivio): verbal + visual encoding
- Levels of Processing (Craik & Lockhart): elaborative > shallow
- Self-Explanation Effect (Chi)
- Generation Effect (Slamecka & Graf)
- Krashen's Input + 1 (i+1) and Affective Filter
- Swain's Output Hypothesis + Long's Negotiation of Meaning
- Self-Regulated Learning (Zimmerman): forethought, performance, self-reflection
- Metacognitive Calibration / Judgments of Learning (Dunlosky)
- Hattie & Timperley feedback model: Feed-Up, Feed-Back, Feed-Forward
- Productive Failure (Kapur)
- Worked Example Effect / Expertise Reversal (Sweller, Kalyuga)
- Variability of Practice (Schmidt)
- Mnemonic Strategies (Atkinson keyword method)
- IGCSE 0546 Malay Foreign Language band descriptors (vocab range, accuracy, communication, pronunciation)

---

## Batch 1 — Retrieval, Generation & Elaboration

### Idea 1.1 — End-of-session free-recall sweep
**Mechanism:** Retrieval Practice (Roediger & Karpicke). Free recall is harder than cued recall and produces stronger long-term retention precisely because of that desirable difficulty.
**Outcome:** Long-term retention of vocabulary just studied; metacognitive accuracy ("did I really learn it?").
**Codebase attachment:** `Study.jsx` session-end (lines 260–303), after stats grid. New component `<FreeRecallSweep />` that asks: "Without looking, list as many words as you remember from this session."
**Sketch:** 60-second timer, free text input, scored by fuzzy match against the session's reviewed cards. Cards recalled freely get a small FSRS bonus (treated as a bonus successful retrieval). Cards NOT recalled get demoted in difficulty so they reappear sooner.

### Idea 1.2 — Pretesting before introducing new cards
**Mechanism:** Productive Failure (Kapur) + Pretesting Effect (Richland, Kornell, Kao). Trying to recall something you don't know primes encoding — even when you fail.
**Outcome:** Faster acquisition of new vocab; deeper encoding of the answer when revealed.
**Codebase attachment:** `Study.jsx` — when a New-state card appears (FSRS state = New), prepend a 5-second "guess" prompt before showing the answer.
**Sketch:** "Take a guess: what does *menjelajahi* mean?" → user types or skips → reveal answer with "✨ now you'll remember it better" framing. No penalty for wrong guesses.

### Idea 1.3 — "Why?" self-explanation prompt after grammar drill
**Mechanism:** Self-Explanation Effect (Chi). Forcing learners to explain *why* an answer is correct in their own words deepens schema construction and exposes shallow rule-matching.
**Outcome:** Transfer of grammar rules to novel contexts (the Paper 3 problem area).
**Codebase attachment:** `Grammar.jsx` drill answer feedback; `patterns.js` cluster names.
**Sketch:** After every 3rd correct grammar drill, optional prompt: "In one sentence, explain why *menulis* drops the T but *membaca* keeps the B." Answer is logged to `mistakes` journal as a metacognitive note (no AI grading required for v1; just the act of generating helps).

### Idea 1.4 — Reverse direction drill (recognition ↔ production asymmetry)
**Mechanism:** Generation Effect + Bjork's Desirable Difficulties. Learners who can recognize *menjelajahi → to explore* often cannot produce *to explore → menjelajahi*. The harder direction is the one that matters for IGCSE writing/speaking.
**Outcome:** Productive vocabulary (the kind needed for Papers 2 and 3), not just receptive.
**Codebase attachment:** `Study.jsx` — promote E→M direction over M→E once a card hits FSRS Review state.
**Sketch:** New mode `reverse-type`: shown English, must type Malay. Lock behind FSRS stability ≥ 7 days (i+1: Krashen — only when comfortable). Failed reverse attempts trigger one easy M→E review next session as scaffolding.

### Idea 1.5 — Image → Malay word (dual coding)
**Mechanism:** Dual Coding Theory (Paivio). Words encoded with both verbal and visual channels are retrieved via either route, doubling cue paths.
**Outcome:** Faster recall under exam pressure (when one cue path is blocked, the other still works).
**Codebase attachment:** `Study.jsx` new mode `image-cue`. `dictionary.js` could have an optional `img` field.
**Sketch:** Use emoji or Unicode pictographs initially (free, no asset pipeline) — 🍚 → nasi, 🚗 → kereta, 🏥 → hospital. For abstract words use icon glyphs from a free set. Even rough imagery beats text-only on retention curves.

### Idea 1.6 — Mnemonic keyword bridges for irregular vocab
**Mechanism:** Atkinson's Keyword Method. Linking a new L2 word to a phonetically similar L1 word + vivid mental image creates a strong dual-route cue.
**Outcome:** Acquisition of low-frequency, hard-to-stick words (the long tail that drops out of FSRS).
**Codebase attachment:** `dictionary.js` optional `mn` field; rendered as a "memory hook" tip on first 2 reviews of any New-state card.
**Sketch:** *menjelajahi* (to explore) → "men-jelly-a-hi" → picture a man eating jelly while waving hi from a mountain peak. Cikgu Maya can generate these on demand for cards the user has lapsed on 3+ times.

### Idea 1.7 — Cumulative review at session start (warm-up = retrieval primer)
**Mechanism:** Retrieval Practice + Spacing. The audit's "warm-up" idea is good but better-justified if the warm-up cards are *spaced retrievals from previous sessions* rather than just easy mature cards.
**Outcome:** Reduces session-start anxiety AND reactivates older traces (combats forgetting curve at low cost).
**Codebase attachment:** `fsrs.js` `sortWithWarmup` — modify Improvement #2 in the existing plan to draw warm-up from cards last reviewed 3–7 days ago, not just any high-stability card.
**Sketch:** First 3 cards = highest-stability cards whose last review was ≥ 3 days ago. Combines comfort (they'll get them right) with desirable retrieval (the trace had time to weaken).

### Idea 1.8 — Elaborative encoding hint on first encounter
**Mechanism:** Levels of Processing (Craik & Lockhart). Semantic processing > phonemic > orthographic for retention.
**Outcome:** Stronger initial encoding so first-week lapse rate drops.
**Codebase attachment:** `Study.jsx` first-time-seen branch (when `card.reps === 0`).
**Sketch:** Before showing the answer, force a 3-second semantic decision: "Is this word about [people / objects / actions / feelings]?" Any answer is fine — the act of categorizing forces semantic processing. Choices appear as four large buttons; no right/wrong feedback.

---

## Batch 2 — Output, Fluency, ICAP Upgrades

### Idea 2.1 — 4/3/2 Fluency Drill (Nation)
**Mechanism:** Paul Nation's 4th strand: *fluency development* — speaking already-known content under decreasing time pressure. Not new learning; automatization.
**Outcome:** Speech rate, lexical access speed, reduced false starts in Paper 3 oral.
**Codebase attachment:** `Roleplay.jsx` or new `Fluency.jsx` route. Web Speech API for capture.
**Sketch:** User picks a topic they've already covered (e.g., "describe your school day"). Speaks for 4 minutes → app transcribes and times → speaks the same content in 3 minutes → then 2 minutes. App shows words-per-minute trend across the three rounds. Pure automatization, no grading.

### Idea 2.2 — Constrained-output sentence-builder
**Mechanism:** Output Hypothesis (Swain) + Bjork's Variability of Practice. Forced production with a *grammatical constraint* surfaces gaps that comprehension hides.
**Outcome:** Grammatical accuracy in writing (Paper 2 band descriptor: "uses a range of structures with high accuracy").
**Codebase attachment:** New mode in `Writing.jsx`, or post-Study challenge popup. Uses `recommendations.js` from Improvement 1 plan.
**Sketch:** "Write a sentence about your weekend that uses *sudah* AND a meN-prefix verb." App highlights the required tokens. Fail-soft: hint reveals example after 30s. Cikgu Maya checks the constraint without grading the whole sentence (cheap rule check, not LLM).

### Idea 2.3 — Two-way roleplay with branching examiner reactions
**Mechanism:** Long's Negotiation of Meaning. Real conversation requires repair, clarification, expansion — not just turn-taking. ICAP "Interactive" tier.
**Outcome:** Pragmatic competence; handling unexpected examiner follow-ups in Paper 3.
**Codebase attachment:** `Roleplay.jsx` scenario engine + `cikguKnowledge.js` knowledge base for examiner persona.
**Sketch:** Examiner's next prompt depends on what the user just said. If user is vague → "Boleh huraikan lebih lanjut?" If user used a word incorrectly → "Maksud awak X atau Y?" Cheap with rule-based triggers; richer with LLM. Existing scenarios stay; one new "challenge" branch added per scenario.

### Idea 2.4 — Shadowing drill (audio repetition with pacing)
**Mechanism:** Phonological loop strengthening + Krashen i+1. Hearing then immediately reproducing speech builds the prosody and pronunciation patterns that flashcards never touch.
**Outcome:** Pronunciation, intonation, and natural rhythm — all explicit IGCSE Paper 3 criteria.
**Codebase attachment:** New `Shadow.jsx` mode or extension of pronunciation practice. TTS for source audio, Web Speech STT for capture.
**Sketch:** App plays a sentence at 0.75× speed → user repeats → app plays at 1.0× → user repeats → 1.25× → repeats. Diff display catches dropped syllables. Records best take per sentence so user can hear improvement.

### Idea 2.5 — "Teach back" mode — explain the rule to Cikgu
**Mechanism:** Self-Explanation + Protégé Effect (learners who teach learn more deeply). ICAP "Constructive" → "Interactive" jump.
**Outcome:** Schematic understanding of grammar rules (transfer to novel cases).
**Codebase attachment:** `CikguBot.jsx` — new mode where Cikgu Maya plays a confused student.
**Sketch:** "Cikgu pretends not to understand meN- prefix. Explain it to her with examples." User types/speaks explanation; Cikgu asks clarifying questions ("but why does *tulis* become *menulis* not *mentulis*?"). Logs the user's explanation as study history.

### Idea 2.6 — Comprehensible input ladder (Krashen i+1)
**Mechanism:** Krashen's Input Hypothesis. Reading material *just above* current level produces acquisition; way-above produces frustration; at-level produces nothing.
**Outcome:** Reading speed and incidental vocabulary acquisition.
**Codebase attachment:** `Comprehension.jsx` — leverage existing `confidenceLog` and FSRS stability to estimate level.
**Sketch:** Sort comprehension passages by lexical difficulty (% of words user has Review-state cards for). Always serve a passage at 90–95% known. As user advances, harder passages unlock. Show "ladder progress" visual.

### Idea 2.7 — Sentence-mining from Comprehension page
**Mechanism:** Meaning-focused input → language-focused learning bridge (Nation strand crossover). Words encountered in context stick better than isolated lists.
**Outcome:** Vocabulary growth that's also exam-relevant (since passages mirror exam genres).
**Codebase attachment:** `Comprehension.jsx` reading view + `useStore` `addCard` action.
**Sketch:** Tap any word in a passage → see translation → "+ Add to deck" — but auto-fill the example sentence with the actual passage sentence. Cards born in context retain that context as their `ex` field, which Study.jsx then displays.

### Idea 2.8 — Daily IGCSE-format micro-task
**Mechanism:** Goal Setting (Locke & Latham): specific, measurable, exam-aligned. Hattie's Feed-Up: "where am I going?"
**Outcome:** Direct exam preparation; reduces "I studied a lot but don't know if I'm ready" anxiety.
**Codebase attachment:** `Dashboard.jsx` daily plan card; `useStore` new `dailyTask` field.
**Sketch:** Each day picks ONE format from Papers 1–4: e.g. "Today: read this 80-word notice and answer 3 questions" / "Today: write a 50-word reply to this email" / "Today: 2-minute roleplay on Topik 3". Five-minute commitment. Streak counter for tasks completed (separate from main streak so it gamifies *exam-format* practice specifically).

---

## Batch 3 — Metacognition, Feedback Architecture, Error-Driven Learning

### Idea 3.1 — Pre-answer confidence wager
**Mechanism:** Metacognitive Calibration (Dunlosky & Metcalfe). Learners habitually overrate their knowledge. Forcing a confidence rating *before* the answer is checked builds calibration.
**Outcome:** Better self-regulated study (students actually re-study what they don't know vs what they *think* they don't know).
**Codebase attachment:** `Study.jsx` quiz/type/cloze modes; `useStore` `confidenceLog`.
**Sketch:** Before clicking "Show answer", a 3-button row: "🤔 Guessing / 😐 Maybe / 💪 Sure". Result is logged with answer correctness. Over time, user sees a "calibration score" (% Sure→Correct, % Guessing→Wrong is good; the inverse is bad).

### Idea 3.2 — Hypercorrection feedback loop
**Mechanism:** Hypercorrection Effect (Butterfield & Metcalfe): errors made with HIGH confidence are corrected MORE durably than low-confidence errors when feedback is provided.
**Outcome:** Specifically targets the most damaging exam errors (the confident-wrong ones).
**Codebase attachment:** Combined with Idea 3.1. `mistakes` journal gets a `confidenceAtError` field.
**Sketch:** When user rates "Sure" but answers wrong, the post-answer screen flags it: "⚠️ You were sure but it was wrong — these stick best when corrected. Here's why..." with extra context. These cards get aggressive FSRS demotion.

### Idea 3.3 — Three-line feedback (Hattie & Timperley)
**Mechanism:** Hattie's feedback model: effective feedback always answers Feed-Up (where going), Feed-Back (how going), Feed-Forward (next step). Most app feedback only does one.
**Outcome:** Conversion of feedback into action; closes the loop the existing `RoleplayScorecard` half-opens.
**Codebase attachment:** `RoleplayScorecard.jsx`, `Writing.jsx` analyzer output, Grammar drill feedback.
**Sketch:** Standard feedback footer everywhere: "🎯 Goal: [specific band/skill] | 📊 Now: [where you scored] | ➡️ Next: [single action]". "Next" links to the right drill/scenario/page.

### Idea 3.4 — Error journal with pattern surfacing
**Mechanism:** Self-Regulated Learning (Zimmerman, self-reflection phase) + retrieval from error history > forgetting.
**Outcome:** Learners recognize their *own patterns* of error (e.g., "I keep dropping the K in *meN- + kembali*").
**Codebase attachment:** Existing `Mistakes.jsx` page + `patterns.js` clustering. Already partly built; needs surfacing.
**Sketch:** Weekly "Your error report" notification: top 3 personal error patterns with one-line rule reminders. Generated from `mistakes` array + `clusterMistakes()`. No new infrastructure — just expose existing data.

### Idea 3.5 — Pre-exam diagnostic mock
**Mechanism:** Goal-Setting + Feed-Up + spaced refresher anchor.
**Outcome:** Realistic readiness signal vs the abstract "readinessPct" in the exam plan.
**Codebase attachment:** `Dashboard.jsx` exam-countdown UI; new `Diagnostic.jsx` route.
**Sketch:** Once per fortnight (or on demand), 25-minute mixed task: 10 vocab, 5 grammar drills, 1 short comprehension, 1 50-word writing prompt, 1 1-min roleplay turn. Returns a pseudo-band per skill mapped to IGCSE 0546 descriptors. Stored in `studyHistory` so the dashboard can show trend.

### Idea 3.6 — "Why I got it wrong" tagging
**Mechanism:** Productive Failure refinement: not all errors are equal. Tagging error *type* (didn't know / confused with similar word / typo / misread question) routes the right remediation.
**Outcome:** Better-targeted FSRS adjustments and recommendations.
**Codebase attachment:** `Study.jsx` wrong-answer flow; `mistakes` journal.
**Sketch:** After a wrong answer, optional 1-tap chip row: [Didn't know] [Confused with X] [Typo] [Misread]. "Confused with X" auto-creates a contrastive review pair. "Typo" doesn't penalize FSRS as hard. "Misread" suggests slowing down.

### Idea 3.7 — Daily reflection in 30 seconds
**Mechanism:** Self-Regulated Learning self-reflection phase. Most apps end the loop at performance; the loop only closes with explicit reflection.
**Outcome:** Strategy improvement (the user starts choosing study modes that worked, abandoning ones that didn't).
**Codebase attachment:** End of daily-goal completion in `Study.jsx` / `Dashboard.jsx`.
**Sketch:** When user hits daily goal, single-screen prompt: "What clicked today?" with 4 chips [Vocab / Grammar / Speaking / Reading] + a one-line text field. Logged to `studyHistory`. After 7 entries, dashboard shows "your best mode this week was X".

### Idea 3.8 — Forgetting-curve visualization
**Mechanism:** Storage Strength vs Retrieval Strength (Bjork). Showing the curve makes the abstract "due in 4 days" concrete and motivates the user to review *before* the line crashes.
**Outcome:** Increased on-time review rate (the single biggest lever in any SRS).
**Codebase attachment:** `Dashboard.jsx` heatmap area; `Study.jsx` per-card detail.
**Sketch:** Per-deck mini-chart of memory retention over the next 14 days under two scenarios: "if you review on time" (flat line at ~90%) vs "if you skip" (decay curve). Direct visual loss-aversion lever.

---

## Batch 4 — Cognitive Load, Motivation, Gamification (SDT-grounded)

### Idea 4.1 — One-thing-at-a-time card (extraneous load reduction)
**Mechanism:** Cognitive Load Theory (Sweller). Extraneous load = anything on screen that isn't the learning content. Cards crowded with controls compete for working memory.
**Outcome:** Higher accuracy and faster response times during initial encoding (esp. for new cards).
**Codebase attachment:** `Study.jsx` card UI.
**Sketch:** "Focus mode" toggle: hides progress bar, mode-switcher, hints, footer. Just word + answer + Right/Wrong buttons. Auto-engaged for the first 2 reviews of any New-state card. Restored after card hits Review state.

### Idea 4.2 — Worked example → faded → solo (expertise reversal)
**Mechanism:** Worked Example Effect + Expertise Reversal (Sweller, Kalyuga). Novices benefit from full examples; experts from problem-solving. Same content, different scaffold per FSRS state.
**Outcome:** Novices don't drown; experts don't get bored.
**Codebase attachment:** `Grammar.jsx` drill rendering; FSRS `state` already tracked per drill.
**Sketch:** State `New` → show worked example before drill ("Here's how *menulis* works: tulis → menulis"). State `Learning` → show first 2 letters of answer. State `Review` → solo, no scaffold. Already-known mechanism, just systematized.

### Idea 4.3 — Choice architecture for daily plan (autonomy from SDT)
**Mechanism:** Self-Determination Theory (Ryan & Deci) — autonomy is one of the 3 psychological needs. Choice itself increases motivation, even when options are equivalent.
**Outcome:** Higher daily-goal completion rate; lower app-abandonment.
**Codebase attachment:** `Dashboard.jsx` daily plan card.
**Sketch:** Instead of "Today: 20 vocab + 5 grammar + 1 roleplay" → "Today, pick 3 of 5: [Vocab 20] [Grammar 5] [Roleplay 1] [Comprehension 1] [Writing 50]". User chooses path. Tracked so the system can offer the unchosen ones tomorrow.

### Idea 4.4 — Streak-freeze framed as kindness, not weakness
**Mechanism:** Affective Filter (Krashen) + Self-Determination relatedness. Loss-averse streak mechanics produce anxiety; reframing protects motivation without softening the gameloop.
**Outcome:** Lower churn after a missed day.
**Codebase attachment:** `useStore.js` existing freeze logic + `Dashboard.jsx` streak UI.
**Sketch:** Already have freezes. New copy: "Cikgu Maya put a freeze on for you 💙 — life happens, your streak is safe." Rather than "Streak frozen". Tiny change, large affective impact based on framing research (Tversky & Kahneman applied to gamification).

### Idea 4.5 — Competence visibility, not just numbers (SDT competence)
**Mechanism:** SDT: competence need is met when learners *see* their growth, not when they merely accumulate points.
**Outcome:** Sustained intrinsic motivation; reduced reliance on external streaks.
**Codebase attachment:** `Dashboard.jsx`; `useStore.js` `studyHistory`.
**Sketch:** "You can now read this paragraph that 30 days ago had 18 unknown words" — show before/after % unknown for a sample passage. Direct evidence of growth. Generated weekly from `confidenceLog` + dictionary state.

### Idea 4.6 — Optimal challenge (Csikszentmihalyi Flow)
**Mechanism:** Flow Theory: skill ≈ challenge. Existing adaptive variants (Phase 6) do this; missing piece is *measuring* whether sessions hit flow and adjusting.
**Outcome:** Sessions feel "right" — neither boring nor crushing — increasing voluntary session length.
**Codebase attachment:** Post-session prompt + `useStore.js` analytics.
**Sketch:** Optional 5-second post-session question: "Was that 🥱 too easy / ✅ just right / 😰 too hard?" Adjusts the variant-selection bias for next session. Three sessions of 😰 → drop variant difficulty for that user; three 🥱 → raise it.

### Idea 4.7 — Effort over outcome rewards
**Mechanism:** Carol Dweck's Growth Mindset; intrinsic motivation > extrinsic for long-term retention.
**Outcome:** Resilience after failure; willingness to attempt harder content.
**Codebase attachment:** XP awarding logic in `useStore.js`.
**Sketch:** XP for "tried a hard variant" = same as XP for "got an easy variant right". XP for "answered something wrong, then re-attempted" = bonus. Praise specifically: "You stayed on that one for 3 minutes — that's the work."

### Idea 4.8 — Cikgu's daily one-liner (relatedness)
**Mechanism:** SDT relatedness need. A persistent character who notices your effort makes the app feel less like a tool, more like a coach.
**Outcome:** Engagement; emotional reason to return.
**Codebase attachment:** `Dashboard.jsx` greeting; `cikguKnowledge.js`.
**Sketch:** Each visit, Cikgu Maya offers one specific observation: "Your *meN-* drills jumped 12% this week — bagus!" / "You haven't done a roleplay in 5 days — try a short one?" Pulls from existing analytics; templated language so no AI cost.

---

## Batch 5 — IGCSE-Specific Exam Alignment, Transfer, Schemata

### Idea 5.1 — Genre-aware writing scaffolds
**Mechanism:** Schema Theory (Anderson) — each IGCSE writing genre (notice, email, blog post, story) has a fixed schema. Teaching the schema separates structure from content load.
**Outcome:** Higher Communication band score on Paper 2 (genre conventions are explicitly assessed).
**Codebase attachment:** `Writing.jsx` — new "structured prompt" mode.
**Sketch:** Pick genre → app shows a labeled skeleton ("Notis: tajuk → tarikh → kandungan → tandatangan"). User fills each block. Word counter per block. Cikgu Maya checks that the genre-specific markers exist (e.g., notice has a date and signature). Pure structure check, no LLM.

### Idea 5.2 — Examiner sentence stems library
**Mechanism:** Formulaic Sequences (Wray) — proficient L2 users rely on prefab chunks. Memorizing high-utility stems frees working memory for content.
**Outcome:** Fluency in Paper 3 oral; sophistication in Paper 2 writing.
**Codebase attachment:** New `data/stems.js` + integration into `Roleplay.jsx` and `Writing.jsx`.
**Sketch:** Curated list of ~80 high-frequency exam stems by function: opening ("Pada pendapat saya..."), agreeing ("Saya bersetuju kerana..."), contrasting ("Walaupun begitu..."), concluding ("Kesimpulannya..."). Tagged by IGCSE level. Studied as their own deck. Roleplay and Writing show a "Stems available" hint button.

### Idea 5.3 — Topic-schema vocab clustering
**Mechanism:** Schema Theory + Spreading Activation (Collins & Loftus). Words clustered by topic activate together, so retrieval of one cues the rest — exactly what's needed in a topic-bound exam answer.
**Outcome:** Vocabulary range *within* an IGCSE topic (where it counts).
**Codebase attachment:** Existing `topics.js` + `dictionary.js` `t` field; new "topic study" mode in `Study.jsx`.
**Sketch:** Topic-mode session: pulls all due cards for one topic ("Sekolah"). Shows mini concept-map: central word + connected words user knows. After session, fills in 1–2 missing high-utility words for that topic.

### Idea 5.4 — Near-transfer drill (same rule, new vocab)
**Mechanism:** Variability of Practice — varying surface features while preserving the underlying rule promotes transfer beyond the trained items.
**Outcome:** Generalization (the actual exam test): can student apply meN-PTKS rule to a word they've never drilled?
**Codebase attachment:** `Grammar.jsx` drill engine; new "novel-item drill" mode.
**Sketch:** After user masters the trained meN-PTKS items, present a *new* PTKS-root verb they haven't drilled. Score is whether transfer happened. Results stored separately ("trained accuracy" vs "transfer accuracy").

### Idea 5.5 — Far-transfer prompt (rule applied in production)
**Mechanism:** Transfer-Appropriate Processing (Morris, Bransford, Franks). Practice in the format closest to test format generalizes best. Producing a sentence using a rule transfers more than fill-in drills.
**Outcome:** The leap from "knows the rule" to "uses the rule unprompted in writing".
**Codebase attachment:** Constrained-output sentence builder (Idea 2.2) parameterized by rule.
**Sketch:** "Write a 2-sentence story using at least one word with meN- + P/T/K/S root." Drill-reward bridge: completing 5 of these unlocks a "rule mastery" badge (per SDT competence visibility, Idea 4.5).

### Idea 5.6 — Common-error heat-map per drill
**Mechanism:** Error Analysis (Corder) — typed L2 errors cluster in predictable ways. Showing learners *where* errors concentrate helps them focus repair.
**Outcome:** Faster error reduction in personal weak spots.
**Codebase attachment:** `Mistakes.jsx` page expansion; uses existing `clusterMistakes`.
**Sketch:** Visual matrix: rows = grammar patterns, cols = drill items. Cells colored by user's error rate. User can tap a hot cell to drill that specific item. Already have the data — just needs the visualization.

### Idea 5.7 — Examiner-style holistic feedback simulator
**Mechanism:** Feedback model (Hattie) + IGCSE band descriptors. Simulating real examiner remarks calibrates self-assessment.
**Outcome:** Realistic readiness perception; lowered exam anxiety.
**Codebase attachment:** `Writing.jsx` analyzer + `Roleplay.jsx` scorecard. Cikgu Maya as examiner persona.
**Sketch:** After a writing or roleplay attempt, optionally request "Examiner mode" — which produces feedback in IGCSE band-descriptor language: "Vocabulary: limited range (Band 3) — you used 14 unique content words. To reach Band 5 try X." Pulls from `data/igcseBands.js`.

### Idea 5.8 — Mastery-locked sequential progression for grammar
**Mechanism:** Mastery Learning (Bloom) + scaffolded difficulty. Some grammar rules depend on others (peN- rules use meN- PTKS pattern). Forcing pre-req mastery prevents brittle learning.
**Outcome:** Solid grammar foundation; fewer "I knew this last week" lapses.
**Codebase attachment:** `Grammar.jsx` topic gating + new `data/grammarPrereqs.js`.
**Sketch:** peN- drills locked until meN-PTKS at Review state with stability ≥ 7 days. Lock UI shows: "Master meN- + PTKS first (3/5 drills there)". Hard gates feel restrictive, so gate is *recommendation* (orange) not block — user can override but is warned.

---

## Batch 6 — Affect, Identity, Long-Game Motivation

### Idea 6.1 — Ideal-L2-Self visualization (Dörnyei)
**Mechanism:** Dörnyei's L2 Motivational Self System: learners persist when they vividly imagine their *future self* using the language. Ideal-self imagery directly predicts long-term effort.
**Outcome:** Months-long study consistency, especially during the demoralizing intermediate plateau.
**Codebase attachment:** First-run onboarding + occasional Dashboard reminders.
**Sketch:** Onboarding asks: "Imagine yourself one year from now using Malay confidently. Where are you? Who are you talking to? What about?" → 60-word free response. Saved. Quoted back to the user every 30 days as a self-authored motivator. Zero ML, just pure psychology.

### Idea 6.2 — Cultural authenticity moments
**Mechanism:** Integrative motivation (Gardner) — interest in the target culture predicts persistence. Real cultural content beats generic vocab on intrinsic motivation.
**Outcome:** Deeper engagement; words remembered because they matter culturally.
**Codebase attachment:** `Comprehension.jsx` corpus + Cikgu daily one-liners.
**Sketch:** Once a week: a 60-word "Tahukah anda?" passage about Malaysian culture, food, history, or current affairs at user's reading level. Vocabulary drawn from it auto-suggested as cards. Builds the cultural schema that makes new words memorable.

### Idea 6.3 — Implementation intentions (Gollwitzer)
**Mechanism:** Implementation intentions ("when X, I will Y") triple goal-completion rates by automating the cue→action loop.
**Outcome:** Habit formation; consistent daily study without willpower.
**Codebase attachment:** Settings + post-onboarding screen.
**Sketch:** "When will you study? Pick a cue: ☕ After breakfast / 🚌 On the bus / 🌙 Before bed". Stores cue. Push notification fires at user's typical cue-time (inferred from session start times) with a one-tap "Start" button.

### Idea 6.4 — Tiny-habits-style minimum viable session
**Mechanism:** BJ Fogg Behavior Model: B = MAT (motivation, ability, trigger). Reduce ability load (start tiny) when motivation dips.
**Outcome:** Restart-after-break rate; protects long-running streaks during stressful periods.
**Codebase attachment:** `Study.jsx` session-start UI; new "1-card mode".
**Sketch:** "Just one card?" CTA on dashboard alongside the full session button. Designed to take 15 seconds. Often becomes a longer session, but the bar to start is near zero. Recognized in BJ Fogg's research as the most reliable habit anchor.

### Idea 6.5 — Distant-goal anchor: countdown to exam
**Mechanism:** Goal proximity theory: distant goals motivate weakly without proximal subgoals. Already partly built (countdown), but the *connection* to today's task is missing.
**Outcome:** Each session feels exam-relevant.
**Codebase attachment:** `Dashboard.jsx` exam countdown + daily plan card.
**Sketch:** Daily plan headline reads: "📅 47 days to exam → today moves you 1.4% closer to your target band." Translates abstract countdown into proximal effect. Math: target_band_gap / days_remaining.

### Idea 6.6 — Peer-presence fiction (Vygotsky's ZPD without real peers)
**Mechanism:** Vygotsky's Zone of Proximal Development typically requires a more-knowledgeable other. Cikgu Maya as a "near-peer" persona fills that role for solo learners.
**Outcome:** Effort levels typical of social learning, in a single-player app.
**Codebase attachment:** `CikguBot.jsx` persona; consistent voice across surfaces.
**Sketch:** Cikgu remembers mistakes ("you've struggled with peN- twice — let's nail it today"), references prior wins ("good — last week you didn't know *menyiasat* and just used it correctly"). Pulls from existing `mistakes` and `studyHistory`. No new infra, just persona.

### Idea 6.7 — Identity reinforcement: "what kind of student am I?"
**Mechanism:** Identity-Based Motivation (Oyserman). Self-labels guide behavior more reliably than performance feedback.
**Outcome:** Behavioral consistency; users who self-identify as "the kind who reviews daily" actually do.
**Codebase attachment:** Onboarding + occasional reflection prompts.
**Sketch:** After completing 7 daily goals, prompt: "You've shown up 7 days running. What kind of language learner are you becoming?" → user picks from chips: [Consistent / Curious / Brave / Detailed / Determined]. Self-chosen label appears on the dashboard. Small but identity-stabilizing.

### Idea 6.8 — Comeback-after-break warm welcome
**Mechanism:** Affective Filter (Krashen) — anxiety on return is the single biggest predictor of full app abandonment. Returning users need an easier landing, not a punishing "you have 142 cards due!"
**Outcome:** Reactivation rate; lower full-quit rate after a 2-week break.
**Codebase attachment:** `Study.jsx` session generation logic; gap detection in `useStore.js`.
**Sketch:** Detect break ≥ 7 days. First post-break session = 5 mature cards (warm-up only) + Cikgu message: "Selamat datang kembali! Let's ease in — these are old friends." Real review queue resumes session 2. Loss-protection design.

---

## Pass 1 — Synthesis: Cross-Cutting Themes

Forty-eight ideas, six batches. Stepping back, the ideas cluster around five strategic levers (a learning-outcome lens, not a feature lens):

### Lever A — *Forced production* (currently underdeveloped)
The app is excellent at recognition (flashcards, quiz, cloze, listen) and respectable at structured production (writing analyzer, roleplay). But Paul Nation's analysis of L2 acquisition keeps surfacing the gap: the app needs more **constrained, scaffolded output** at all levels.
Anchor ideas: 1.4 (reverse direction), 2.1 (4/3/2 fluency), 2.2 (constrained sentence), 2.4 (shadowing), 2.5 (teach-back), 5.5 (far-transfer write).

### Lever B — *Metacognitive closure* (the loop that never quite closes)
Sessions end with statistics, not strategy. The user finishes and doesn't know what to *do* differently next time. Hattie's Feed-Forward is the missing column.
Anchor ideas: 1.1 (free-recall sweep), 3.1 (confidence wager), 3.3 (three-line feedback), 3.6 (error-type tagging), 3.7 (daily reflection).

### Lever C — *Exam-format explicitness* (under-leveraged given IGCSE positioning)
Existing roleplays and writing modes are mostly format-agnostic. The IGCSE 0546 papers have specific genres, sentence stems, and band descriptors — making these explicit converts general practice into targeted preparation.
Anchor ideas: 2.8 (daily IGCSE micro-task), 5.1 (genre scaffolds), 5.2 (stem library), 5.7 (examiner-mode feedback), 3.5 (diagnostic mock).

### Lever D — *Schema construction* (vocab is well-served, structure isn't)
The dictionary, FSRS, and word families build a strong vocabulary network. Less developed: topic schemata for retrieval clustering, grammar prerequisites, transfer between trained and novel items.
Anchor ideas: 5.3 (topic clustering), 5.4 (near transfer), 5.6 (error heatmap), 5.8 (mastery-locked sequences), 3.8 (forgetting curve).

### Lever E — *Affect & identity* (the long-game retention engine)
Streak mechanics handle short-run motivation. Long-run persistence — across the months it actually takes — needs identity-based reasons to return.
Anchor ideas: 4.4 (kind streak-freeze), 4.5 (visible competence), 4.8 (Cikgu one-liner), 6.1 (Ideal-L2-Self), 6.3 (implementation intentions), 6.4 (1-card mode), 6.7 (identity label), 6.8 (comeback welcome).

---

### Codebase touch-point heatmap (concentration of ideas per file)

| File / Surface | Ideas count | Notes |
|---|---|---|
| `Study.jsx` | 13 | The session loop is the highest-leverage surface — most ideas live here |
| `Dashboard.jsx` | 10 | Daily plan, motivation, identity, comeback |
| `useStore.js` | 9 | New state fields needed (confidence log, identity label, ideal-L2-self, comeback gap, calibration history) |
| `Roleplay.jsx` | 5 | Fluency, branching, examiner mode |
| `Grammar.jsx` | 5 | Worked-example fading, near-transfer, mastery gating, why-prompt |
| `Writing.jsx` | 4 | Genre scaffolds, constrained output, far transfer, examiner feedback |
| `CikguBot.jsx` | 4 | Teach-back, persona, daily one-liner |
| `Comprehension.jsx` | 3 | Sentence-mining, i+1 ladder, cultural moments |
| `Mistakes.jsx` | 2 | Pattern surfacing, error heatmap |
| New routes / files | 8 | `Fluency.jsx`, `Diagnostic.jsx`, `Shadow.jsx`, `data/stems.js`, `data/igcseBands.js`, `data/grammarPrereqs.js`, mnemonic field, image-cue field |

### Cost vibe-check (rough order)

**Cheap (no AI cost, mostly UI + existing data):** 1.4, 1.7, 1.8, 3.1, 3.4, 3.7, 3.8, 4.1, 4.3, 4.4, 4.5, 4.7, 4.8, 5.1, 5.6, 6.3, 6.4, 6.7, 6.8 — these are the Pass 2 priority candidates because impact × low cost = best first-build leverage.

**Medium (needs new content but no LLM):** 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.4, 2.6, 2.7, 2.8, 3.5, 3.6, 4.2, 4.6, 5.2, 5.3, 5.4, 5.5, 5.8, 6.1, 6.2, 6.5, 6.6 — most of these have a free-tier path (templated language, Web Speech, simple rules).

**Higher cost (LLM or significant content authoring):** 1.6 (mnemonic generation), 2.3 (branching examiner reactions if richer than rule-based), 2.5 (teach-back evaluation), 5.7 (examiner-style holistic feedback) — these benefit most from the existing OpenRouter free-tier fallback chain.

---

### Pass 1 — Status: COMPLETE

48 framework-anchored ideas, 5 strategic levers, codebase heatmap, cost cluster. Ready for Pass 2 framing.

**Saved at:** `/Users/kheshav/.claude/plans/learning-outcomes-ideation.md`
**Next file:** `/Users/kheshav/.claude/plans/learning-outcomes-pass2-framing.md` — will rank, sequence, and produce buildable specs that other builder agents can execute without follow-up questions.






