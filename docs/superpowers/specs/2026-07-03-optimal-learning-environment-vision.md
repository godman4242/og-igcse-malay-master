# Vision spec — the optimal learning environment (2026-07-03)

> **Status:** APPROVED-DIRECTION spec (critique + decisions + phased plan). Not a build order on its
> own — each phase gets its own spec/plan before code. Written to survive session loss (Kheshav's
> north-star for "future sessions keep context"). Companion session log:
> `docs/sessions/2026-07-03-vision-critique-adversarial-review-SESSION-LOG.md`.
>
> **How this relates to existing docs — EVOLVE, don't duplicate:** the app already has
> `docs/UDL_ROADMAP.md` (UDL feature ledger), `docs/PROJECT_VISION.md` (the Zero-Waste Cognitive
> Engine 5-phase plan), and `docs/loop/GOAL.md` (the 6-axis north-star). This spec sits ABOVE them:
> it sets the product philosophy and the multi-year architecture bet, and it feeds new epics INTO
> `GOAL.md`. Where it overlaps, GOAL.md's axes and HARD invariants win.

## 1. The north-star, restated (Kheshav, 2026-07-02/03)

Build the **best possible free, open-source, self-revision environment** for exam learners —
Malay (0546) first, English (0500/0510) second, more subjects eventually — that:

- **Teaches with verified methods** (learning science + UDL), not a passive knowledge base.
- **Reduces friction for self-study**, especially for ADD/ADHD learners (curb-cut: helps everyone).
- **Costs nobody anything** — zero money in (no paywall, invite, or ads), zero money out (on-device
  + BYOK AI). This is a HARD invariant, not a preference.
- **Maximizes freedom + personalization** ("like Zen browser" — shape your own study space), while
  never leaving the student staring at a blank canvas wondering what to do.

**One-line product identity:** *a calm, personalizable revision cockpit that always has a good answer
to "what should I do right now?" — and gets the answer from evidence, not vibes.*

## 2. Honest critique of each vision element (thinking-partner mode, not yes-man)

Each item below is graded, red-teamed, and grounded in research (verified sources in
`docs/research/2026-07-03-focus-audio-weak-model-grading.md`). Where I changed Kheshav's framing, I
say so and why.

### 2.1 "No lesson rails — pure self-revision" — ✅ SOUND, but sharpen to *guided freedom*
- **Strength:** genuinely differentiated. Brilliant/Khan/Cognito are *course-rail* products; a
  friction-free revision tool for self-directed study is underserved and matches Kheshav's own need.
- **Red-team:** "no structure at all" is a trap for ADHD specifically. Executive-function research is
  clear that ADHD learners struggle *most* with initiation, planning, and self-directed structure —
  pure freedom can cause paralysis ("what do I even study?"). Personalization can also become a
  procrastination/tweaking sink.
- **Resolution (the app already points the right way):** the answer is NOT course rails — it's
  **strong defaults + an always-available "next best action."** Smart Study, For You, the daily plan,
  and Exam Rehearsal already do this. Double down: "what should I do right now?" must be **one tap,
  always answerable, never a blank canvas** — but never a *locked sequence*. That is the curb-cut.
- **Verdict:** keep the philosophy; the sharpest version is **guided freedom**, not pure freedom.

### 2.2 "Malay → English → all subjects (free Brilliant)" — ⚠️ RIGHT direction, HIGH scope risk, must sequence
- **The single biggest strategic risk in the whole vision.** "All subjects" is a scope explosion.
  Brilliant employs a large paid team to author interactive content per subject. A solo, no-budget,
  non-coding builder cannot author *verified* math/physics/chemistry content — and **confident-wrong
  physics is exactly as damaging as confident-wrong Malay** (axis-1 invariant).
- **What actually transfers vs what doesn't:**
  - *Subject-agnostic engine (reusable):* FSRS spaced repetition on Q&A cards · the reveal-gated
    reader (any text) · the mistake journal → SRS promotion · BYOK AI grading/tutoring · the
    UDL/personalization shell · past-paper OCR/audio study · the exam-rehearsal readiness scorer.
  - *Language-specific (does NOT transfer):* vocab glossing, imbuhan grammar, bilingual toggles,
    pronunciation, word families, the Malay grounding index.
- **The path (don't start a 3rd subject yet):** extract a **`subject` abstraction** so "language" is
  ONE implementation of the engine, then a new subject reuses SRS + reader + mistakes + AI-tutor +
  past-paper study and supplies only its own content + graders. The permanent blocker is **content +
  verification**, not code. For non-language subjects the realistic content model is *past-paper-driven
  + AI-generated practice, everything framed "practice, not authority"* — minimal authored content.
- **Verdict:** make the app the **best language-revision tool in the world first** (it's close),
  extract the engine *as you build*, and treat multi-subject as an **architecture-readiness goal**,
  not a near-term feature. Honest timeline for "many subjects, solo, free": a multi-year arc. The
  failure mode to avoid is *many subjects done badly* instead of *language done brilliantly*.

### 2.3 Personalization "like an OS / Zen browser" — ✅ STRONGEST NEW IDEA (Kheshav already right-sized it)
- Kheshav self-corrected on 07-03: **not a literal agentic OS in the site** (free keys can't sustain
  it) — the OS is a *personalization metaphor*. That instinct is correct; validated.
- **What transfers from Zen browser:** workspaces/"spaces," a customizable home, pin/reorder/hide,
  theming, density. This is pure **UDL Principle 1 (engagement / autonomy)** and it's ADD-friendly
  (reduce to what YOU use). The app already has *knobs* (interests, effort, themes, dyslexic font,
  high contrast) — the gap is **organization**: 21 routes + a "More" drawer can feel like a maze.
- **The bounded win:** a **customizable home / "study spaces"** — pin your few real tools, hide the
  rest; optional named spaces ("Malay exam crunch" vs "casual English reading"). High value,
  on-brand, evidence-aligned, free/client-side.
- **Red-team my own pick:** guard against the tweaking-sink (ADHD procrastination trap) — ship
  sensible defaults, make customization discoverable-but-not-loud, cap the knobs. Don't add MORE
  settings; add *organization of what exists*.
- **Verdict:** YES to a customizable home + spaces; NO to a literal OS. This is the highest-value
  *new* feature in the list.

### 2.4 Focus audio (binaural / isochronic / brain.fm) — ✅ SHIP, small + honest + synthesized-only
- **Evidence (verified):** white/pink/brown **noise** has a *small real* benefit for ADHD (Nigg 2024
  meta, Hedges g=0.249) and a *small real harm* for non-ADHD (g=−0.212). **Binaural beats** help
  relaxation/anxiety but show minimal *sustained-attention* benefit. → noise is the evidence-backed
  focus aid; binaural is a relaxation option at best.
- **Licensing (verified):** **brain.fm CANNOT be embedded/streamed** — ToS: "private use only… posting
  on any other website, application… expressly prohibited." Ship **Web Audio API self-synthesized**
  noise (white/pink/brown — ~100 lines, zero files, zero license, works offline). Binaural/isochronic
  can be synthesized too, labeled honestly.
- **Honest, non-overclaiming copy (respects the confident-wrong invariant):** e.g. *"White/pink noise
  modestly helps focus for some people with ADHD — and may slightly hurt focus for others. Try it and
  see."* Never a blanket "this boosts focus" claim.
- **Red-team / scope guard:** bound HARD — **synthesized noise + a study timer only. No third-party
  tracks, ever** (that's licensing hell + a "music player" scope creep). Pomodoro-style timer pairs
  naturally and has its own ADHD support.
- **Verdict:** YES — low effort, on-brand, differentiated, honest. Ships as a small "Focus" toolkit.

### 2.5 Built-in past papers — ⚠️ reframe (real papers are legally impossible; the better version already half-exists)
- **Hard constraint (already decided in GOAL.md):** never embed real Cambridge papers — copyright,
  takedown/legal risk on a public app. This is a wall, not a preference.
- **The realistic + actually-better version:** (a) the OCR/audio reader already lets a student study
  ANY paper they legally hold ("bring your own paper"); (b) link **official free Cambridge specimen
  papers** with one-tap "open in reader"; (c) grow a bank of **original IGCSE-format** passages/
  questions (in our control, durable, web-verified); (d) **AI-generate** practice questions in
  past-paper format from any imported passage (already parked as the "auto-generate comprehension Qs"
  idea).
- **Verdict:** reframe from "embed real papers" (illegal) → **"make it trivial to study any paper you
  have, plus a growing bank of original + AI-generated practice."** Legal, durable, and better.

### 2.6 Agentic harness for weak BYOK grading + Cikgu Maya — ✅ HIGHEST-VALUE TECHNICAL BET, evidence-backed, reuses infra
- **Kheshav's "body to a brain" intuition is correct and published.** Prompt architecture can matter
  more than model scale for rubric grading:
  - **Rubric decomposition — one trait per independent call** is the single biggest win: Llama2-13b
    QWK 0.205→0.560 on ASAP, *beating ChatGPT's 0.430* (MTS, arXiv 2404.04941).
  - **Pairwise comparison (LCES, arXiv 2505.08498):** Llama-3.1-8B 0.194→0.670 QWK, and it *cuts
    model-sensitivity* (SD 0.021 vs 0.122 vanilla) — great for BYOK where the model varies. Caveat:
    pairwise can *overstate* differences (use for ranking, not as proof of a real gap).
  - **2-sample averaging** captures most of the multi-vote benefit (1→2 big, 2→3 negligible) — cheap.
  - **Evidence-quote-then-score** (retrieve support before grading) adds ~+0.07 QWK.
  - **Rubric self-refinement vs human samples** adds +0.19–0.47 QWK but needs labeled data → later.
- **Why it fits us:** the seams already exist — `instruct.js` (frozen BYOK router), `writingGrader.js`,
  and the `scripts/ai-tier-eval` harness with QWK/over-praise gates. This is an **evolution of
  existing infra**, not new architecture ("evolve, don't rebuild").
- **Red-team — the real constraint is CALL COUNT, not cleverness.** A free Gemini key caps ~9–10
  calls/day (project memory). Decomposing one essay into 5 traits × 2 samples = 10 calls = the entire
  daily budget on ONE essay. So the harness must be **budget-aware**: default to a cheap single/few-call
  mode, let paid-key power users opt into the thorough decomposed mode, degrade gracefully, and be
  honest about the tradeoff in the UI. The raw literature ignores this quota reality; our design can't.
- **Ceiling honesty:** even frontier LLMs grade *below* trained humans (AP Chinese G-coef 0.71 AI vs
  0.81 human; AES QWK ~0.68 vs human ~0.75+). Grades must always read as **"approximate practice
  feedback,"** never authoritative. This also protects the confident-wrong invariant.
- **Same thinking improves Cikgu Maya:** decompose-and-verify → the tutor checks its own answer before
  asserting (confidence-gate already exists; extend it) → fewer confident-wrong replies.
- **Built-in Done:** ship only if the harness beats the current single-call grader on the existing eval
  (QWK up, over-praise not worse). Measurable by construction.
- **Verdict:** YES — the flagship technical bet. Design **budget-aware**; gate on the eval.

## 3. Architecture principles for the whole vision

1. **Evolve, don't rebuild.** Every item above extends existing modules (reader, FSRS, instruct.js,
   ai-tier eval, UDL shell). No greenfield rewrite. (Matches `reference_planning_framework`.)
2. **Free/on-device/BYOK is a hard invariant.** Anything requiring a paid server or a mandatory key
   is out. AI features degrade to the free rule-based tier when no key is present.
3. **Confident-wrong is the worst defect.** Any AI-authored content (grades, tutor answers, generated
   questions) is framed as *practice/approximate*, is verified where it's authoritative, and hedges
   when unsure. (axis-1.)
4. **ADD-first curb-cut.** Every feature must *reduce* net attention cost. New surface area must be
   organizable/hideable. "One clear next action" is never more than a tap away.
5. **Subject-agnostic core, language-first implementation.** Build multi-subject *readiness* into the
   architecture (a `subject` seam) without paying for multi-subject *content* until language is
   world-class and the seam is proven.
6. **Measurable Done or it doesn't ship.** Especially for AI features: an eval gate, a passing test,
   a rendered element — never "make it nicer."

## 4. Phased plan (each phase → its own spec + plan before code)

Ordering rationale (per `reference_red_team_own_decisions` — dependency-first, not cheapest-first):
quality preconditions come before the loops that amplify them; the grading harness *raises feedback
quality*, so it precedes anything that spaces/repeats feedback.

- **Phase A — Weak-model grading harness (flagship, budget-aware).** Build the decomposition +
  JSON-constrained + 2-sample + evidence-quote harness behind `instruct.js`; make depth a setting;
  gate on `scripts/ai-tier-eval` beating the single-call baseline. *Done:* eval shows QWK↑, over-praise
  not worse, on both a weak and a strong BYOK model; a "thorough vs fast" toggle; honest "approximate"
  framing. **Best use of the Fable-5 window (long-horizon, well-specified).**
- **Phase B — Customizable home / "study spaces" (Zen-like personalization).** A pin/reorder/hide
  home + optional named spaces, sensible defaults, capped knobs. *Done:* a student can pin their tools,
  hide the rest, and the home persists (STORE_VERSION bump + migration); a11y + tap-target + guide
  coverage. Pure client-side.
- **Phase C — Focus toolkit (synthesized noise + study timer).** Web Audio white/pink/brown noise +
  a Pomodoro-style timer; honest hedged copy; fully offline. *Done:* toggle works offline, copy passes
  the confident-wrong bar, no third-party audio, no bundle regression.
- **Phase D — Past-paper study, reframed.** Link official specimen papers into the reader + AI-generate
  practice questions from any imported passage + grow the original-passage bank. *Done:* one-tap
  "open specimen in reader," generated-Qs path gated as practice, bank additions web-verified.
- **Phase E — Cikgu Maya verification upgrade.** Apply decompose-and-verify to the tutor; extend the
  confidence-gate to a self-check. *Done:* eval shows fewer confident-wrong tutor answers vs baseline.
- **Phase F (architecture-readiness, ongoing) — the `subject` seam.** Refactor language-specific
  assumptions behind a subject abstraction *as adjacent work touches them* — no big-bang. *Done:*
  "language" is one registered subject; the engine (SRS/reader/mistakes/AI-tutor) has no hard-coded
  language assumption. Gates the eventual 3rd subject; NOT a near-term content push.

## 5. Non-goals (explicit, to prevent scope drift)
- ❌ A literal agentic OS *inside the website* (free keys can't sustain it — Kheshav agreed).
- ❌ Embedding real copyrighted past papers.
- ❌ Streaming/embedding brain.fm or any third-party audio tracks.
- ❌ Course/lesson rails (locked sequences).
- ❌ Authoring a non-language subject's content before the `subject` seam + verification model exist.
- ❌ Any paid dependency, mandatory key, ad, or paywall.

## 6. Open decisions for Kheshav (not blocking Phase A)
1. **Phase order** — A→B→C is my recommendation (quality precondition first, then the two biggest
   student-visible wins). Veto/reorder freely.
2. **Focus audio scope** — confirm "synthesized-only + timer" (my strong recommendation) vs wanting
   curated tracks (which I'd push back on for licensing).
3. **Specimen-paper linking** — accept the link-rot maintenance of pointing at Cambridge specimens,
   or stay OCR-only + original bank? (GOAL.md already flags this.)
