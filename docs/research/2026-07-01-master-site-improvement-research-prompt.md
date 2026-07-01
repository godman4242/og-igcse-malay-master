# MASTER RESEARCH PROMPT — Make "IGCSE Malay/English Master" the best learning app it can be

**What this is:** a single, self-contained, paste-ready research brief. Give it to a capable research AI (Claude, GPT, Gemini — ideally one with web browsing / deep-research mode). It will run a rigorous, evidence-graded, multi-perspective investigation and return an implementation-ready improvement plan grounded in learning science, Universal Design for Learning (UDL 3.0), ADHD/attention research, visual-design & HCI science, accessibility (WCAG 2.2), assessment validity, and this app's own verified current-state findings.

**How it was built:** the appendix of verified findings (Appendix A) was produced by a code audit that read the live repository across 8 lenses and *adversarially verified every finding against the actual source* (47 confirmed, 3 false claims discarded). So the research does not start from guesses — it starts from real, cited defects and gaps.

**The one instruction that matters most:** every recommendation you return must be (a) grounded in a citable external source *and* (b) tied to something specific in this app. Generic best-practice lists are a failure. "Here is the evidence, here is the exact surface it applies to, here is what to change, here is the expected effect, here is who it helps and who it might harm" is success.

---

## 0. Meta-instructions to the researching AI (read first)

- **Your deliverable is a written research report**, not code and not a chat reply. Follow the STORM method in §3 and the output contract in §7 exactly.
- **Do not trust this brief blindly.** Where a claim here is checkable, check it. If evidence contradicts a direction suggested in Appendix A, say so — a well-argued "the app is right, don't change this" is a valuable result.
- **Grade every claim's evidence** (§8). Distinguish "multiple RCTs / meta-analyses say X" from "a design blog recommends X." Name effect sizes and boundary conditions when known.
- **Respect the constraints in §2.** A recommendation that violates offline-first, the free/on-device rule, the bilingual invariants, the bundle budgets, or the no-dark-patterns rule is out of scope no matter how good it sounds — unless you explicitly argue the constraint itself should change and cost it out.
- **Prioritize.** The end product must let a solo developer act tomorrow: quick wins vs strategic bets, each with effort and impact.
- **Say what you're unsure about.** An honest "open question / needs a user study" beats false confidence — this app's own culture treats *confident-but-wrong as the worst failure mode*, and so should your research.

---

## 1. The mission

Produce the definitive, evidence-graded plan to improve this app across **every** dimension that matters for a learning tool:

1. **Learning efficacy** — does it actually make people learn faster and remember longer?
2. **Universal Design for Learning (UDL 3.0)** — does it remove barriers and offer real options for *every* learner?
3. **ADHD/ADD effectiveness** — does it work for learners with attention and executive-function differences, who are a large share of any student population?
4. **Visual appeal & usability** — is it beautiful, legible, and calm, using the science of visual perception and the aesthetic-usability effect?
5. **Accessibility (WCAG 2.2)** — can it be used by people with disabilities, on assistive tech, by keyboard and switch?
6. **User convenience & retention** — is it frictionless, trustworthy with the learner's data, and motivating *without* dark patterns?
7. **Assessment validity** — do its scores and "readiness" signals mean what they claim to mean?
8. **Code correctness & performance** — is it free of the regressions and bottlenecks that quietly degrade all of the above?

The output is a research report that a maintainer can turn into a backlog. Aim to *exhaust the space of high-value improvements*, then rank them.

---

## 2. The product you are researching (grounded context — read carefully)

**What it is.** A React single-page web app (also a mobile PWA) for **IGCSE language exam preparation**, serving two distinct learners:
- a **Malay** learner (Cambridge IGCSE Malay 0546), and
- an **English-as-a-second-language** learner (IGCSE English 0500 / 0510 ESL).

It is built around **spaced repetition** (the FSRS-6 algorithm) and treats itself as a *learning engine*, not a content reader: **every feature is supposed to serve a validated learning-science principle** (active recall, the testing effect, spaced/distributed practice, interleaving, elaboration, immediate specific feedback, metacognitive calibration, desirable difficulty, cognitive-load management, identity/motivation).

**Core surfaces (21 routes).** A dashboard; a vocabulary Study loop with **7 modes** (flashcard, quiz/MCQ, type-answer, listen-and-type, cloze/fill-blank, speak-to-rate, and a "Produce" gloss→type mode); a mixed/interleaved "Smart Study"; a personalized "For You" hub; an AI roleplay examiner with scoring; an expert-system grammar tutor ("Cikgu Maya"); reading comprehension; IGCSE listening + dictation + cloze-listening; a writing analyzer covering 21 exam formats with band-6 exemplars; pronunciation practice; an interactive word-family explorer; a universal **mistake journal** that auto-promotes errors into spaced-repetition cards; an **exam-rehearsal** mode with a composite "Readiness %"; a saved-word cloze; a grammar-drill trainer; and a **reveal-gated reader** that can ingest a **photographed past paper (on-device OCR)** or a **recorded audio clip (on-device speech-to-text)** and study it word-by-word.

**Design philosophy already in place (do not "discover" these as if new — build on them):**
- **Reveal-gated translation.** Text shows in the target language first; the English gloss is revealed only on a deliberate tap ("try first, then reveal; revealing is *not* failure"). It *eases* on demonstrably too-hard pages rather than blocking a beginner.
- **Offline-first.** Everything works with no network; all state persists locally (with optional cloud sync). Multimodal inputs (OCR, speech-to-text) run **on-device** — the photo/audio never leaves the phone.
- **Honesty over flattery.** The AI tutor is confidence-gated so a weak match hedges instead of bluffing; feedback prompts say "Be honest — soft-grading helps no one."
- **Bilingual invariants.** Malay and English decks never mix in one session; each card carries a language flag that drives the correct text-to-speech / speech-to-text locale (ms-MY vs en-GB).
- **Some UDL & a11y already shipped:** dark/light themes, an opt-in high-contrast (WCAG-AAA) mode, an opt-in dyslexia-friendly font, personal-interest topic prioritization, text-highlight-synced audio, a keyboard/switch-operable reader, and a polite screen-reader live region on drills.

**Hard constraints that bound every recommendation (violating these = out of scope unless you argue the constraint should change):**
- **Free & on-device by default.** No feature may *require* a paid API. Optional "bring-your-own-key" AI is allowed but must degrade gracefully to a free/offline path.
- **Mobile-first, 390×844.** The primary device is a phone, often a low-end school device. Performance and touch ergonomics dominate.
- **Tech shape:** React 19 (strict-mode purity rules — no `Date.now()`/`Math.random()` in render), a single persisted state store (Zustand + localStorage), Tailwind CSS 4 with **theme colors as CSS custom properties** (`var(--color-*)`; never hardcoded hex — a documented rule), lazy-loaded routes, PWA with a service worker, per-route JavaScript-chunk **size budgets**.
- **No dark patterns.** Streaks and rewards exist, but the app deliberately avoids manipulative/addictive engagement loops. Motivation must be *intrinsic and ethical* (loss-aversion framing for a streak freeze is acceptable; guilt-tripping and infinite pull-to-refresh dopamine loops are not).
- **Two-cohort equity.** Any recommendation must be checked against *both* the Malay learner and the English/ESL learner. Several current defects are exactly a feature that works for one language and is silently switched off for the other.

**Verified current strengths (so you do not recommend building what exists):** disciplined FSRS-6 usage; a genuinely-implemented hypercorrection loop (certain-but-wrong errors get priority); systematic per-drill screen-reader live regions; a rigorous contrast-token system with measured WCAG ratios; reduced-motion support in both CSS and JS; four composable theme axes; strong offline-sync failure handling; and an unusually honest self-audit culture (the team has previously hunted and corrected its *own* learning-science overclaims). Appendix B lists more.

---

## 3. The research method you must follow — STORM

Use the **STORM** approach (Synthesis of Topic Outlines through Retrieval and Multi-perspective Question-asking — the technique of researching a topic by simulating expert perspectives who each ask and answer grounded questions, then synthesizing). Execute these stages **in order** and show your work for each:

**Stage 1 — Perspective discovery.** Adopt the expert perspectives in §4 (add more if a gap demands it). For each, write a one-line mandate: what does *this* expert uniquely care about here?

**Stage 2 — Multi-perspective question-asking.** From each perspective, generate the sharp questions that expert would ask of *this specific app* — seeded by the themed questions in §5 and the verified findings in Appendix A, but going beyond them. Aim for questions whose answers would change what the developer builds.

**Stage 3 — Grounded retrieval.** Answer those questions from **authoritative external sources**: peer-reviewed learning science and cognitive psychology, the CAST **UDL 3.0** guidelines and their research base, ADHD/executive-function clinical and educational research, WCAG 2.2 and inclusive-design guidance, HCI/visual-perception literature (typography, colour, visual hierarchy, aesthetic-usability effect, Gestalt, Hick's/Fitts's laws), assessment & psychometrics literature, and credible design systems / product case studies (Anki, Duolingo, and the SRS/edtech research base) — *as evidence, not as things to copy*. Prefer primary sources and meta-analyses; note recency and replication status. **Adversarially verify** surprising or load-bearing claims against a second source before you rely on them.

**Stage 4 — Outline synthesis.** Organize the answers into the themed structure of §5 (merge/split themes as the evidence dictates). Resolve conflicts between perspectives explicitly (e.g., "an engagement mechanic the retention strategist wants may harm the ADHD learner — here's the reconciliation").

**Stage 5 — Report writing.** Write the report per the output contract in §7, every non-obvious claim cited.

**Stage 6 — Completeness self-critique.** Before finishing, run the self-evaluation in §10. Explicitly ask: *what modality did I not search, what claim did I leave uncited, what perspective did I under-serve, what recommendation did I fail to cost or prioritize?* Fix what you find. State what remains uncertain.

---

## 4. The expert perspectives (adopt all; each owns specific findings)

For each perspective: a **mandate**, and the **verified findings it owns** (see Appendix A codes F1–F47). Every finding must be picked up by at least one perspective; every perspective must go *beyond* its findings to the general question.

1. **Cognitive scientist / learning-science researcher.** Mandate: does each surface produce durable learning, and does the scheduler see the truth about what the learner knows? Owns: F4, F5, F6, F7, F8, F9. General Q: where is retrieval too easy, feedback too vague, spacing too shallow, or a "learning" feature actually passive review?
2. **UDL 3.0 specialist (CAST framework).** Mandate: for each of the three principles — Engagement, Representation, Action & Expression — where does the app fail to offer the learner a genuine *option*? Owns: F17, F18, F19, F20, F21, F22. General Q: map every surface to UDL checkpoints and find the single-path bottlenecks.
3. **ADHD / executive-function & cognitive-accessibility specialist.** Mandate: does the app support attention, working memory, task-initiation, time-perception, and self-regulation — without becoming an addictive dark-pattern machine? Owns: F23, F24, F25, F26, F27, F28. General Q: where is the "what do I do now" unclear, the finish line invisible, the feedback too quiet, or the screen too busy?
4. **Visual-design & HCI researcher (aesthetic-usability, typography, colour, motion).** Mandate: is it beautiful, legible, hierarchical, and calm on a 390px screen — and does the visual system scale without drift? Owns: F29, F30, F31, F32, F33, F34. General Q: type scale, colour tokens, spacing rhythm, visual hierarchy, microinteraction coherence, empty-state polish.
5. **Accessibility / WCAG 2.2 & inclusive-design auditor.** Mandate: can a keyboard, switch, or screen-reader user complete every core task, and does the app meet WCAG 2.2 AA? Owns: F10, F11, F12, F13, F14, F15, F16. General Q: focus management, focus visibility, names/roles/state, target size, non-colour signaling, across all 21 routes.
6. **Assessment & psychometric-validity expert.** Mandate: do the bands, scores, and "Readiness %" measure what they claim; is the feedback trustworthy enough to act on? Owns: F7, F9. General Q: construct validity of the heuristic graders, guessing/gaming, false confidence, and how uncertainty should be communicated.
7. **Product / retention / ethical-behavioral-design strategist.** Mandate: what makes a learner come back for months before an exam, framed by self-determination theory and habit science — *without* manipulation? Owns: F36, F38, F40, F41. General Q: onboarding activation, habit loops, notifications, streak psychology done ethically, the three overlapping "home" surfaces, deck-building friction.
8. **Mobile / PWA performance & reliability engineer.** Mandate: is it fast and reliable on a cheap phone; does it protect the learner's data? Owns: F42, F43, F44, F45, F46, F47. General Q: main-thread cost on the hot path, bundle discipline, service-worker/staleness, storage limits and data-loss risk.
9. **Second-language-acquisition (SLA) / ESL specialist.** Mandate: is the pedagogy sound *for language learning specifically*, and is the English/ESL cohort a first-class citizen? Owns: F1, F2, F21, F35. General Q: comprehensible input, output/production balance, L1-vs-L2 glossing evidence, and every place the English cohort gets a degraded experience.
10. **Front-end architecture & code-quality reviewer.** Mandate: find the regressions and correctness bugs that silently corrupt learning data or break invariants. Owns: F1, F2, F3, F35. General Q: state-mutation correctness, React-19 purity, bilingual-invariant leaks, error handling.
11. **Motivation & self-regulated-learning specialist.** Mandate: does the app build learner identity, autonomy, competence, and metacognition — and help learners *stop* healthily as well as start? Owns: F8, F28. General Q: goal-setting, reflection, calibration surfacing, healthy stopping points.
12. **Data-safety & trust specialist.** Mandate: can a learner lose months of work, and does the app earn trust about where data lives? Owns: F36, F37, F39, F40. General Q: backup findability, non-destructive restore/merge, sync transparency, offline-first durability.

---

## 5. Themed research questions (the substance — answer all, go beyond)

Each theme lists the questions to answer, the perspectives that lead, and the seed findings. **Do not merely restate the findings — use them as evidence that a deeper question is live, then answer that deeper question with external research and app-specific recommendations.**

**Theme A — Retrieval integrity & scheduling truth.** (Perspectives 1, 10.) Seeds: F4, F5, F6, F9.
- When a learner fails or gives up on a card, should the scheduler always see it, and how strong a signal should "give up / reveal" be? What does the desirable-difficulty and errorful-generation literature say about penalizing vs. not penalizing reveals?
- Should confidence (metacognition) modulate scheduling, and how? What is the evidence for hypercorrection-priority and for confidence-weighted spacing?
- MCQ vs production: when in a card's life should the app push from recognition to recall/production (generation effect), and how should mode be chosen per item rather than per session?

**Theme B — Assessment validity & honest feedback.** (Perspectives 6, 1.) Seeds: F7, F9.
- How valid are surface-feature heuristic graders (discourse-marker counts, type-token ratio, sentence-length variance, "sophisticated word" lists) as proxies for writing/speaking quality? How gameable are they, and how should a composite "readiness" score communicate its own uncertainty?
- What is best practice for score/feedback that a learner will act on — calibration, error bars, "estimated vs. verified," avoiding false confidence?

**Theme C — UDL: options for representation, action & expression, engagement.** (Perspective 2, with 5, 9.) Seeds: F17–F22.
- Which UDL 3.0 checkpoints does the app currently fail, surface by surface? Prioritize by learner impact.
- Display customization (text size / spacing / contrast as independent dimensions), multiple response modalities (word-bank/tap vs. type vs. speak vs. evidence-select), learner-controlled pacing (replay caps, playback speed), and just-in-time vocabulary scaffolds — what does the evidence say about each, and where should each go?
- Where does a feature exist for one language/cohort but is switched off for the other (equity)?

**Theme D — ADHD / attention / executive function.** (Perspective 3, with 11.) Seeds: F23–F28.
- Which executive-function scaffolds have the strongest evidence for attention and completion: visible finish lines, externalized time, reduced choice, immediate salient feedback, single clear next action, healthy stopping cues? Rank them.
- How do you design motivating feedback and progress for ADHD learners *without* crossing into addictive dark patterns? Where is the ethical line, and how do streaks/rewards stay on the right side of it?
- What is the ideal information density and choice architecture for the dashboard and the study entry point?

**Theme E — Visual design, aesthetics & the design system.** (Perspective 4.) Seeds: F29–F34.
- What does the science of visual perception (Gestalt grouping, visual hierarchy, contrast, whitespace, the aesthetic-usability effect) prescribe for a calm, scannable, exam-prep UI on a small screen?
- Typographic scale, spacing/radius/elevation tokens, colour harmony and theme-token discipline, motion/microinteraction consistency, and empty-state craft — what should the design system codify, and how does that map onto this app's existing `var(--color-*)` token approach?
- What specifically makes an educational interface *feel* trustworthy and premium vs. cluttered and amateur?

**Theme F — Accessibility (WCAG 2.2 AA and beyond).** (Perspective 5.) Seeds: F10–F16.
- Route-change focus and announcement in an SPA; global focus-visible strategy; dialog focus-trap/restore; accessible names on inputs and custom controls; target size; non-colour state signaling. Give concrete, tested patterns for React SPAs.
- Beyond AA: what would make this genuinely excellent for screen-reader, switch, low-vision, and cognitive-accessibility users?

**Theme G — Convenience, trust & data safety.** (Perspectives 7, 12.) Seeds: F35, F36, F37, F39, F40, F41.
- Data durability for an offline-first tool: backup findability, proactive backup nudges, non-destructive merge-on-restore, sync transparency. What do best-in-class tools (e.g., Anki) do, and what's the evidence that data-loss risk drives churn?
- Discoverability of 21 features behind a 4-item nav + drawer + three "home" surfaces — what navigation/IA patterns reduce this without cramming?
- Global search that respects the learner's current language.

**Theme H — Feature gaps & roadmap vs. best-in-class.** (Perspectives 7, 1, 9.) Seeds: cross-cutting.
- Given the constraints (free, on-device, offline, mobile, bilingual, no dark patterns), what *high-value features are missing* vs. leading SRS/edtech tools? (e.g., auto-generated comprehension questions from an imported passage; adaptive difficulty; richer elaborative-encoding/concept-mapping; a genuine "explain why you got this wrong" loop.) Rank by evidence + effort + fit.
- Which existing surfaces are thinnest and would benefit most from depth vs. which should be merged or cut to reduce sprawl?

**Theme I — Code correctness, regressions & performance.** (Perspectives 10, 8.) Seeds: F1, F2, F3, F42–F47.
- The verified regressions (bilingual-invariant leaks in the mistake pipeline, render-time impurity, no-partialize persistence cost, eager heavy-chunk imports, un-memoized shell/derivation work). For each: confirm severity, propose the fix pattern, and note the test that should pin it.
- What *class* of bug does each represent, and what guardrail (lint rule, test, type, CI budget check) would prevent the whole class recurring?

**Theme J — Motivation, retention & habit (ethical).** (Perspectives 11, 7, 3.) Seeds: F8, F28, F36, F38.
- Self-determination theory (autonomy, competence, relatedness) and habit-formation research applied to a solo-study exam-prep tool: what actually sustains months-long engagement, ethically?
- How should the app surface competence and calibration to build a learner's sense of progress without inducing anxiety?

**Theme K — Bilingual / ESL equity.** (Perspectives 9, 2, 10.) Seeds: F1, F2, F21, F35.
- Enumerate every place the two cohorts get unequal experiences and the SLA evidence for closing each gap.
- L1 vs. L2 glossing for beginners; comprehensible-input vs. forced-output balance; and whether the "reveal-gate" philosophy is right for each cohort and level.

---

## 6. Appendix A — Verified current-state findings (grounded starting points)

These 47 findings were each **read in the live code and adversarially re-verified against the exact file and line** (severity: HIGH = fix soon / MEDIUM = real gap / LOW = polish; "plausible" = concern real, one cited detail imprecise). They are *starting points and evidence that a deeper question is live* — not the full scope, and not beyond challenge. Treat file:line references as anchors; the researcher/developer should confirm current line numbers before editing. Each ends with a **research direction**, phrased as a direction to investigate — not a settled fix.

### Code correctness / regressions (3)

**F1 · [HIGH] reviewCardAction hardcodes language:'ms' — English card lapses are logged and auto-promoted as Malay**  
`src/store/useStore.js:1422` — **Impact:** This is the PRIMARY study loop. For an English (0510) learner, every lapsed English word is journaled as language:'ms'. Worse, addMistake's promotion gate canAutoPromoteMistake('ms','vocab') passes, so promoteMistakeToCard builds a NEW card with lang: mistake.language === 'en' ? 'en' : 'ms' → 'ms'. An English vocabulary word thus gets promoted into a Malay-tagged Mistakes card, which then studies in the wrong session (cardsForLang/studyLang scoping) with the wrong TTS/STT locale — directly violating the load-bearing v34 invariant that Malay & English decks never mix. Every other surface (RoleplayScorecard, Comprehension, Dictation) correctly passes the card/passage lang; only the core loop is wrong. **Research direction:** Derive language from the card: pass `language: cardLang(cardToLog)` (cardLang is already imported in this file) instead of the hardcoded 'ms', mirroring RoleplayScorecard.jsx and Comprehension.jsx.

**F2 · [HIGH] useInterleavedSession.completeTask omits language on Smart-Session micro-write/micro-speak mistakes**  
`src/hooks/useInterleavedSession.js:226` — **Impact:** addMistake defaults an absent language to 'ms' (useStore.js line 1609). In a v34 English Smart Session, a missed micro-write/micro-speak on an English card is journaled as Malay and auto-promotes (ms+vocab passes canAutoPromoteMistake) into a Malay-tagged 'Mistakes' card — same cross-language corruption as the reviewCardAction bug, in the Smart Study path. **Research direction:** Pass `language: cardLang(task.card)` (import cardLang, already used in this file for cardsForLang) so English Smart-Session misses journal and promote as lang:'en'.

**F3 · [LOW] shuffle() (Math.random) runs inside useMemo during render in Grammar cram mode**  
`src/pages/Grammar.jsx:129` — **Impact:** CLAUDE.md's React 19 purity rule forbids Math.random()/Date.now() in render. The useState initializers (lines 114-119) are correctly lazy, but the useMemo fallbacks are not — if cramMode becomes true before the seeding effect (line 182) commits cramImbuhan, render calls Math.random(), which React 19 strict mode flags as an impure component and can produce a double-shuffle/mismatched order between the two strict-mode renders. **Research direction:** Drop the `|| shuffle(...)` render-time fallbacks and rely solely on the lazy useState seed + the cramMode effect, or memoize the shuffled deck in a ref computed in an effect, so no Math.random() runs during render.


### Learning-science fidelity (6)

**F4 · [HIGH] ListenMode records a wrong/revealed answer to the UI but never to FSRS — failed retrievals leak out of the scheduler**  
`src/components/study/ListenMode.jsx:13` — **Impact:** CLAUDE.md's principle table claims 'Spaced / distributed practice — FSRS for vocab' and 'Test effect / retrieval'. In ListenMode a retrieval FAILURE is invisible to FSRS: the card keeps whatever (often long) interval it had, so the item the learner just proved they've forgotten is scheduled as if remembered. This is precisely the silent-forgetting failure the whole SR engine exists to prevent, and reveal (a give-up) should be the strongest Again signal of all. **Research direction:** On an incorrect check() call `session.rate(Rating.Again)`; on reveal() also rate Again before advancing (revealing here is give-up, not the reveal-gate's non-punitive comprehension aid). Mirror the correct/incorrect branch used by TypeMode.

**F5 · [HIGH] SpeakMode never records a failed pronunciation attempt to FSRS (only rates on score ≥50)**  
`src/components/study/SpeakMode.jsx:59` — **Impact:** Same spacing-integrity leak as ListenMode: the pronunciation modes claim to be part of 'active recall' and 'spaced practice for vocab', but a demonstrably-failed attempt leaves the card's schedule untouched. Over repeated sessions the weakest items accumulate the longest intervals — the inverse of what FSRS should do — and the learner can silently pass a card they cannot pronounce. **Research direction:** Add `else session.rate(Rating.Again)` for score <50, and treat an empty/garbage STT result as a neutral no-op (don't credit it). Keep the ms-MY STT-unreliability caveat, but a low-confidence result that IS returned should still be able to signal a lapse.

**F6 · [MEDIUM] Confidence (metacognitive calibration) is logged but never feeds FSRS scheduling in the main Study session**  
`src/hooks/useStudySession.js:140` — **Impact:** CLAUDE.md claims 'Metacognitive calibration — confidence log (1–3); certain but wrong → hypercorrection priority.' In the primary Study mode there is no hypercorrection PRIORITY: a card the learner was certain about and got wrong is scheduled identically to a low-confidence miss and is not resurfaced. The calibration data is collected but doesn't close the loop the table advertises for this surface. **Research direction:** Feed hypercorrection targets into useStudySession's queue the way useInterleavedSession does, or bias the FSRS rating/priority for certain-but-wrong items (e.g. force a shorter relearning step) so miscalibrated cards actually resurface sooner in the default Study loop.

**F7 · [MEDIUM] Heuristic writing/speaking bands (surface-feature proxies) flow straight into the composite Exam Readiness % with no validity caveat**  
`src/lib/examReadiness.js:16` — **Impact:** Exam-readiness validity: the Readiness % is presented as a competence signal driving the rehearsal schedule (getNextExamDue), but 70% of it rests on gameable surface metrics that don't measure comprehension or argument quality. A learner can inflate Readiness by writing marker-dense filler, producing false confidence — the opposite of the honest calibration the app elsewhere insists on ('Be HONEST. Soft-grading helps no one.'). **Research direction:** Down-weight heuristic-only bands in composeReadiness (or flag Readiness as 'estimated' until an AI/human grade is available), and cap the heuristic writing/speaking band contribution when only proxy signals fired (e.g. high marker count but low error-checked accuracy).

**F8 · [LOW] getConfidenceCalibration and getHypercorrectionTargets require a minimum history and can silently return nothing, so early metacognitive feedback never appears**  
`src/store/useStore.js:810` — **Impact:** 'Metacognitive calibration' and 'certain but wrong → hypercorrection priority' are headline principles, but the gating means a learner can study for many sessions and never see calibration feedback or a hypercorrection resurface — the loop exists in code but is effectively dormant for the typical usage pattern, weakening the claimed principle in practice. **Research direction:** Consider prompting for confidence more deliberately (or defaulting it) so the log fills, and show partial calibration guidance below the 5-entry threshold, or surface a 'not enough data yet' nudge so the feature is discoverable.

**F9 · [LOW] QuizMode distractors are drawn from the whole dictionary without excluding synonyms of the correct gloss, risking a genuinely-correct distractor marked wrong**  
`src/lib/study/quizOptions.js:34` — **Impact:** Immediate, specific feedback and the test effect both depend on the verdict being trustworthy. A learner who picks a semantically-correct option and is told '❌' receives confident-wrong feedback — exactly the 'confident-wrong is the worst failure for a learning tool' anti-pattern CLAUDE.md calls out for the Cikgu confidence gate, and it also mis-fires an Again into FSRS. **Research direction:** When building distractors, exclude any candidate whose gloss string equals card.e or is a known synonym; or accept any option whose meaning matches card.e in check() (reuse the whole-word/alternative matching TypeMode already uses).


### Accessibility (WCAG 2.1/2.2) (7)

**F10 · [HIGH] No route-change focus management on any of the 21 routes**  
`src/App.jsx:54` — **Impact:** WCAG 2.4.3 (Focus Order) and 4.1.3 (Status Messages): on an SPA every navigation silently drops the user's place. For a mobile-first learning tool used with switch access or a screen reader, this makes moving between the 21 study surfaces disorienting on every single transition — the highest-frequency interaction in the app. **Research direction:** Add a visually-hidden skip link and, in AnimatedRoutes, move focus to a focusable route heading (or the <main> given tabIndex={-1}) on pathname change, plus a polite live region announcing the new page title. Respect prefers-reduced-motion (already keyed here).

**F11 · [HIGH] Global focus-visible ring only exists for reflow tokens; outline-none strips it app-wide**  
`src/index.css:116` — **Impact:** WCAG 2.4.7 (Focus Visible) and 2.4.11 (Focus Not Obscured, 2.2): a keyboard/switch user cannot tell which control is focused across most of the app. The reader was explicitly hardened for keyboard use, but the rest of the SPA has no equivalent focus indicator. **Research direction:** Add a global `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` (with a border-radius-friendly box-shadow variant for pill buttons), and never pair `outline-none` without a replacement focus style.

**F12 · [HIGH] WordFamilyTree FormDetailModal is a dialog with no focus trap or focus restore**  
`src/components/WordFamilyTree.jsx:362` — **Impact:** WCAG 2.4.3 (Focus Order) and 2.1.2 (No Keyboard Trap, inverse): aria-modal="true" promises the rest of the page is inert, but keyboard focus can escape behind the overlay and is lost on close. A keyboard user opening a word-form detail is stranded. **Research direction:** Reuse useFocusTrap(dialogRef, { active: true, onClose }) exactly as SearchModal does; it already handles focus-in, Tab wrap, Escape, and focus restore. GuideOffer.jsx (role=dialog, line 47) has the same missing-trap gap.

**F13 · [MEDIUM] Import text inputs have no accessible label — placeholder only**  
`src/pages/Import.jsx:229` — **Impact:** WCAG 1.3.1 (Info and Relationships), 3.3.2 (Labels or Instructions), and 4.1.2 (Name, Role, Value): a screen-reader user tabbing to these fields hears only "edit text", and once typing begins the visual hint is gone for everyone. Import is the primary way to build a deck. **Research direction:** Add visible <label> elements (or at minimum aria-label) tied to each field; keep the placeholder as a supplementary hint, not the sole label.

**F14 · [MEDIUM] PDF dropzone is a div with onClick — not keyboard focusable or operable**  
`src/pages/Import.jsx:238` — **Impact:** WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value): the entire PDF-upload path is unreachable without a pointer, blocking keyboard/switch users from one of the two import methods. **Research direction:** Make the dropzone a real <button> (or add role="button" tabIndex={0} plus onKeyDown for Enter/Space), or visually style the actual file input as the target rather than hiding it.

**F15 · [MEDIUM] Bottom-nav active state is signaled by color/subtle-fill only, with no aria-current**  
`src/components/Layout.jsx:313` — **Impact:** WCAG 1.4.1 (Use of Color) and 4.1.2 (Name, Role, Value): the current-location information is conveyed by color alone. Combined with the missing route-focus finding, SR users have no signal of where they are. **Research direction:** Add aria-current="page" to the active nav button (and the Practice button when active), so the state is programmatically exposed regardless of color.

**F16 · [LOW] GuideOffer dismiss button is 28px — below the 44px minimum target**  
`src/components/GuideOffer.jsx:62` — **Impact:** WCAG 2.5.8 (Target Size Minimum, 2.2) / project 44px rule: the first-run tour offer's only dismiss control is a small tap target on a 390px mobile viewport, easy to miss and inconsistent with every other modal close in the app. **Research direction:** Bump to min-w-[44px] min-h-[44px] with the icon centered (keep the visual circle small via an inner span if desired, mirroring SearchModal's add-button pattern).


### Universal Design for Learning (UDL 3.0) (6)

**F17 · [HIGH] No text-size, line-spacing, or letter-spacing control — display customization stops at a single fixed dyslexic-font toggle**  
`src/pages/Settings.jsx:337` — **Impact:** UDL 3.0 Checkpoint 1.1 ('Customize the display of information') is the foundational Representation guideline — it explicitly names font size AND spacing as things the learner must be able to vary, because the same size/spacing that suits one reader creates a barrier for another. For a text-dense IGCSE language app read on a 390px phone by learners who may have low vision, dyslexia, or ADHD, a fixed 14px/text-sm body with no zoom-independent scaling is a hard access barrier, not a nicety. Bundling spacing into a single font toggle removes the learner's ability to choose which dimension they need. **Research direction:** Add a text-size control (e.g. 3-4 steps: Normal / Large / XL) and an independent line-spacing control to Settings, persisted in the store and applied as a root-level CSS custom property (e.g. --reader-font-scale, --reader-line-height) that body and prose surfaces multiply against — mirroring how highContrast/dyslexicFont already compose via root classes. Keep them independent of the dyslexic-font toggle so learners can mix (large text without Lexend, or Lexend with extra spacing).

**F18 · [HIGH] Comprehension and Listening offer only one way to demonstrate knowledge — multiple-choice, with no alternative response format**  
`src/pages/Comprehension.jsx:420` — **Impact:** UDL 3.0 Checkpoint 5.1 ('Use multiple media for communication') and the whole Action & Expression principle require more than one means for learners to show what they know; a learner who comprehends the passage but has receptive-language-strong / MCQ-anxiety profiles, or who processes better verbally, is assessed only through recognition. MCQ also lets guessing mask real comprehension, weakening the retrieval-practice benefit the app is built on. This is the app's core reading-skill surface for IGCSE, so the single-modality assessment caps its validity. **Research direction:** Offer at least one alternative response mode per passage — e.g. a 'type/say your answer' short-response variant graded with the existing lenient matcher + STT, or an 'evidence-select' mode that reuses referenceText (tap the sentence that proves the answer). Let the learner pick the response mode the way Speaking already lets them pick speak-vs-type.

**F19 · [HIGH] All typed study modes (Type / Cloze / Produce / Listen) require free-text keyboard production with no tap-to-select word-bank alternative**  
`src/components/study/ClozeMode.jsx:29` — **Impact:** UDL 3.0 Checkpoint 4.1 ('Vary the methods for response and navigation') calls out that some learners work well with a keyboard and others do not — motor-impairment, tremor, and dysgraphia/dyslexic spelling all make exact free-text entry on a phone a physical + orthographic barrier. Exact-match grading conflates spelling ability with vocabulary knowledge, so a dyslexic learner's correct recall is scored as a failure and drives the FSRS card the wrong way, corrupting the spaced-repetition signal for the very learners UDL is meant to include. **Research direction:** Add a word-bank / tap-to-select response option for at least Cloze and Produce (assemble the answer from tiles rather than type it), and/or a fuzzy-tolerant grade for these production modes (accept near-miss spellings, mark 'almost' rather than Again) so orthography doesn't masquerade as recall failure. Surface it as a per-learner preference, not a forced replacement.

**F20 · [MEDIUM] Listening and Dictation hard-cap playback at 2 plays with no accommodation for learners who need more repetition**  
`src/pages/Listening.jsx:15` — **Impact:** UDL 3.0 Checkpoint 6.x (self-regulation / manage information) and the pacing dimension of Action & Expression are undermined by a fixed, non-negotiable cap. A learner with an auditory-processing difference or who is early in the skill cannot succeed within 2 plays and simply fails the item with no scaffold — turning a practice surface into a gate. Replicating exam constraints is defensible for a rehearsal mode, but as the ONLY mode it removes the learner's ability to regulate their own pacing while learning. **Research direction:** Add a 'Practice (unlimited replays)' vs 'Exam (2 plays)' toggle, and a playback-speed control (e.g. 0.7x–1.0x). Default to exam constraints in ExamRehearsal only; in the standalone Listening/Dictation practice surfaces let the learner lift the cap and slow the audio.

**F21 · [MEDIUM] English comprehension passages provide no word-lookup scaffold, while Malay passages do — comprehension support is asymmetric by language**  
`src/pages/Comprehension.jsx:297` — **Impact:** UDL 3.0 Checkpoint 2.1 ('Clarify vocabulary and symbols') requires just-in-time vocabulary support embedded in the text. The English-study cohort (0510 ESL) is explicitly a first-class audience per CLAUDE.md, yet the exact learners most likely to hit an unknown English word — ESL beginners — are the ones denied the lookup scaffold that Malay learners receive. This is a representation-equity gap: the same feature exists but is switched off for one language group. **Research direction:** Extend the tap-to-define scaffold to English passages using the app's existing en-dictionary (loadEnDictionary is already used in Dictation.jsx) — reverse-gloss to Malay for the ms-first learner, or provide a simple definition. Add an optional, toggleable 'show key vocabulary' pre-reading scaffold so the support is learner-controlled (revealing is not failure), consistent with the reader's reveal-gate philosophy.

**F22 · [LOW] Study text inputs omit spellCheck / autoCapitalize / lang hints, so browser spell-correction fights Malay answers and misleads dyslexic learners**  
`src/components/study/TypeMode.jsx:31` — **Impact:** UDL 3.0 Checkpoint 1.1 (customize display) and reducing extraneous cognitive load (Checkpoint 6.x) both apply: for a dyslexic learner, a red squiggle under a correctly-typed Malay word is a false 'you spelled this wrong' signal that adds anxiety and self-doubt during retrieval, and autocorrect silently rewriting a Malay answer to an English word can convert a correct recall into a wrong grade. The interference specifically penalizes the learners UDL aims to support. **Research direction:** On the study inputs set spellCheck={false} and autoCapitalize='none' (and autoCorrect='off'), and set lang to the card's target language (ms-MY / en-GB) so the browser stops flagging correct target-language spelling and doesn't silently rewrite answers.


### Effectiveness for ADHD/ADD learners (6)

**F23 · [HIGH] Study session has no visible finish line — the progress bar shows deck mastery %, not cards-remaining**  
`src/pages/Study.jsx:61` — **Impact:** ADHD learners are especially vulnerable to time-blindness and effort-estimation failure. Without a concrete, monotonically-shrinking 'X cards left' the task feels open-ended, which spikes task-initiation dread and makes it far harder to sustain effort to completion. A visible, per-card-moving finish line is one of the highest-leverage executive-function scaffolds and it is currently absent from the core loop. **Research direction:** Add a session-scoped 'card N of M' counter (or 'M left') driven off the queue length captured at session start, shown next to or replacing the mastery bar during an active session. Keep the mastery bar as a secondary signal. This is the single most impactful ADHD fix on the study path.

**F24 · [HIGH] Quick Review gives no correct/incorrect feedback — rating a card is a silent dead-end**  
`src/components/QuickReview.jsx:26` — **Impact:** For ADHD learners, immediacy and salience of feedback is what sustains a reward loop; a silent rating button provides no dopaminergic 'hit' and the action feels inconsequential, which erodes the very micro-engagement Quick Review exists to create. It also violates the app's own announce-every-drill accessibility convention (screen-reader users hear nothing). **Research direction:** Add an immediate, salient response to each Quick Review rating: a brief color/scale pulse plus a FeedbackLive polite announcement, and consider a tiny streak-of-5 progress affordance. Reuse the existing FeedbackLive component to satisfy both the ADHD-salience and the a11y convention at once.

**F25 · [MEDIUM] No elapsed-time indicator during a study session — time only appears after the fact in the summary**  
`src/components/study/SessionSummary.jsx:31` — **Impact:** Time-blindness is a hallmark ADHD executive-function deficit: learners routinely lose track of how long they have been on-task (hyperfocus) or under-estimate time to give a session a fair try. A lightweight visible elapsed indicator externalizes time, supporting both 'I have done enough, I can stop' and 'only 4 min in, keep going' metacognition. Showing it only retroactively provides no in-the-moment support. **Research direction:** Surface a subtle live elapsed timer (or a filling ring toward the daily-goal minutes) in the study header/theater chrome. Pair with the daily minutes target so the learner sees progress toward a stop point, not an open-ended grind.

**F26 · [MEDIUM] Dashboard is a ~15-widget vertical scroll — high working-memory load and choice overload before the one actionable next step**  
`src/pages/Dashboard.jsx:248` — **Impact:** ADHD executive function is easily swamped by dense, undifferentiated choice: too many equally-weighted panels and CTAs raise choice-overload and increase task-initiation friction ('where do I even start?'), the opposite of the DailyPlan's intent. Analytics widgets (heatmap, sparkline, forecast, calibration) are valuable but should not out-compete the single 'do this now' action for attention on the primary landing screen. **Research direction:** Establish a clear visual hierarchy: keep DailyPlan (the ordered 'what next') as the unmistakable primary above the fold, and collapse the analytics/history widgets behind a 'Progress' disclosure or move them to a stats tab. Reduce competing top-level CTAs to one primary + one secondary.

**F27 · [MEDIUM] Starting a study session takes multiple taps and offers no default one-tap 'start due review'**  
`src/pages/Study.jsx:72` — **Impact:** Task-initiation friction is a core ADHD barrier: every extra decision or tap between intent and the first card is a point where the learner can bounce. Front-loading deck + mode selection turns 'study' into 'configure a study session', raising activation energy. The recognition→production ordering already exists in Smart Study, so the plain Study default could just start. **Research direction:** Make the default study entry land directly on the first due card with sensible deck+mode (as it largely does), and demote the deck/mode selectors to a collapsible 'options' affordance so the first thing a returning learner sees is a card, not a control panel. Ensure at least one dashboard path is a genuine single-tap 'Start review'.

**F28 · [LOW] No stopping-point or break nudge — the session-end summary's only forward action is 'Keep Studying'**  
`src/components/study/SessionSummary.jsx:176` — **Impact:** ADHD learners are prone to hyperfocus and to guilt-driven over-study or, conversely, to bouncing off an infinitely-open loop. A well-timed stopping point and break acknowledgement supports self-regulation and protects the streak-as-motivator from becoming a loss-aversion stressor. Offering only 'Keep Studying' at the natural stop point subtly pushes continuation rather than closure. **Research direction:** In the session summary, pair 'Keep Studying' with an equally legible 'Done for now / take a break' affordance and a brief 'you did N min today' acknowledgement. Consider an optional gentle break nudge after a configurable elapsed threshold within long sessions.


### Visual design & aesthetics (6)

**F29 · [HIGH] Hardcoded white-alpha divider borders go invisible in light mode**  
`src/pages/Dashboard.jsx:646` — **Impact:** In light mode the surrounding surfaces are near-white (--color-card2 #e8e8f0 / #f0f0f5), so a 5% white overlay divider is effectively invisible — list rows, feedback items, and scorecard sections lose their separators and the layout reads as an undifferentiated wall of text. The app ships a fully-tuned light palette (index.css .light block) and a --color-border token that already handles both themes, so these dividers silently opt out of the theme they were most needed in. It's a systemic, copy-pasted regression that undermines the visual hierarchy across 8+ high-traffic surfaces. **Research direction:** Replace the literal rgba(255,255,255,0.05|0.03) border/background values with var(--color-border) (or a new dedicated --color-divider token tuned per theme if a fainter line than the card border is wanted). A single find-and-replace across the ~21 sites fixes both themes; add the token to the @theme + .light blocks so it stays theme-aware.

**F30 · [MEDIUM] text-white on accent fills bypasses the documented --color-on-bright convention**  
`src/components/EmptyState.jsx:24` — **Impact:** This is a documented convention with a live inconsistency: --color-on-bright is #fff in light mode but #000 in dark, tuned so labels stay legible as the accent palette shifts. text-white happens to match in light mode but is a coin-flip whenever a fill is later darkened or a lighter accent (green/cyan) is used — and it means the same button styled two different ways in two files. For an aesthetic-usability audit, 71 hardcoded label colors is the single biggest source of styling drift and a maintenance trap that will eventually produce a contrast failure. **Research direction:** Codemod text-white → style color: var(--color-on-bright) (or a `.on-bright` utility class) on every button/pill whose background is a --color-* fill. EmptyState.jsx is the canonical component to fix first since the comment calls it the 'gold-standard' others copy.

**F31 · [MEDIUM] No type scale — 40 files hand-pick sub-11px arbitrary font sizes**  
`src/components/Layout.jsx:340` — **Impact:** 7–9px text is below the ~11px practical floor for mobile legibility (the driver.js popover CSS in index.css:196 even documents a 'UXPin body floor' of 14px for descriptions, a standard the app itself violates in-app). On a 390px learning tool used for exam prep, sub-legible labels weaken hierarchy and hurt scannability, and the absence of a named scale means every new component reinvents sizing, guaranteeing continued drift. The 7px badge is effectively unreadable and fails the app's own accessibility posture. **Research direction:** Define a small type scale as @theme tokens or a handful of semantic classes (e.g. --text-caption 11px / --text-label 12px / --text-body 14px / --text-title) and map the arbitrary text-[Npx] usages onto it, raising the 7–9px cases to an 11px minimum. Document the ramp in STYLE_GUIDE.md so new surfaces pull from it.

**F32 · [LOW] Hover-scale microinteraction direction is inconsistent (grow vs shrink)**  
`src/pages/Dashboard.jsx:459` — **Impact:** Microinteraction consistency is a core part of perceived polish (aesthetic-usability effect). A press-in (scale<1) reads as 'button depress' while scale>1 reads as 'lift/select'; mixing them on one page for equivalent tap targets makes the motion language feel arbitrary rather than intentional. It's low-severity because both are subtle, but it's a cheap coherence win and the inconsistency recurs across many pages that copied these class strings. **Research direction:** Pick one convention — recommend active:scale-[0.98] press-feedback for all tappable cards/CTAs (better on touch where hover doesn't exist) and drop the hover:scale grow on stat tiles, or standardize both on a single lift value. Encode it as a shared class so surfaces stop hand-tuning the number.

**F33 · [LOW] Heatmap label uses literal #000, contradicting the on-bright branch beside it** _(plausible)_  
`src/pages/Dashboard.jsx:552` — **Impact:** The two adjacent branches disagree on convention within a single ternary, which is exactly the drift CLAUDE.md's P2-U1 rule was written to stop ('never text-black/#000 on a --color-* background'). While black on a 55%-opacity green over a light card is probably still legible, hardcoding defeats the whole point of --color-on-bright and sets a copy-paste precedent; the #fff badge label on --color-red is the same anti-pattern. **Research direction:** Use var(--color-on-bright) for both the level-2 heat cell and the red count badge label, so the heatmap follows one rule end-to-end. If level-2's tint genuinely needs a different value than level-3, make that an explicit tokened decision rather than a raw hex.

**F34 · [LOW] Empty-state polish is uneven — one warm shared component vs ad-hoc inline empties**  
`src/pages/Dashboard.jsx:273` — **Impact:** Empty states are high-signal moments (first impression, aesthetic-usability effect) and a learning app hits them often — new deck, no mistakes, no history. Having a canonical warm component but three visually distinct treatments for genuinely-empty states dilutes brand coherence and means voice/spacing/CTA styling drift per surface. It's low-severity since each looks fine alone, but consolidating raises perceived quality cheaply. **Research direction:** Route the fully-empty cases (English-deck-empty, cards.length===0 onboarding) through EmptyState (or a small variant that accepts a secondary action), reserving bespoke layouts only where a genuinely different affordance is needed. Keeps voice, spacing, and CTA styling identical across every empty surface.


### User convenience, friction & feature gaps (7)

**F35 · [HIGH] Global search ignores study language and never surfaces the user's English deck**  
`src/components/SearchModal.jsx:22` — **Impact:** Search is the app's primary recall-over-recognition escape hatch (bound to '/' globally and a header button on every page). For half the audience (the v34 English cohort the whole store was re-architected for) it returns the wrong language entirely and can't add a correctly-tagged card. This silently breaks the bilingual invariant that the rest of the app enforces. **Research direction:** Make SearchModal read `studyLang`: when 'en', search the lazy English seed dictionary + `cardsForLang(cards,'en')` and stamp added cards with `lang:'en'` via `glossPlanFor`. Raise or remove the 5-card cap on user-card matches, and let the user's own cards rank above dictionary suggestions.

**F36 · [HIGH] No local backup reminder — a guest who declines sign-in can lose everything on a cache clear with zero warning**  
`src/pages/Dashboard.jsx:304` — **Impact:** This is a study tool students rely on for months before an exam. localStorage is routinely evicted by iOS under storage pressure and by privacy modes. Losing an FSRS deck is unrecoverable and catastrophic to the learning value; the app currently offers backup only to users who dig into Settings and know to look. **Research direction:** For guests, after N sessions or a card-count threshold, surface a lightweight 'Download a backup' CTA (reusing `handleExportJSON`) alongside the sign-in banner, and track `lastBackupAt` to re-nudge after significant new activity. Frame it as loss-aversion, not a gate.

**F37 · [HIGH] JSON restore is destructive-only: no merge option, so importing a friend's deck or a second device wipes local progress**  
`src/pages/Settings.jsx:129` — **Impact:** Best-in-class tools (Anki) merge on import. Here, a learner who wants to pull in a classmate's shared deck, or restore a backup onto a device that already has cards, must choose between their existing progress and the incoming deck. The all-or-nothing model turns a routine action into a data-loss trap and discourages backup/restore entirely. **Research direction:** Offer a 'Merge' vs 'Replace' choice on restore (key-union add like the cloud sign-in merge already does), reusing the existing `addCards` dedupe. At minimum, show a preview of counts (X new, Y overlapping) before committing.

**F38 · [MEDIUM] Onboarding funnels new users to an empty Study surface: first-run card and Dashboard step 2 both link to /study before any deck exists**  
`src/pages/Dashboard.jsx:886` — **Impact:** First-run clarity is the highest-leverage moment for a learning tool. Competing CTAs that disagree on where to start — one of which dead-ends on an empty deck — create decision friction and a likely bounce before the learner ever rates a card (the activation event FirstRunCard itself gates on). **Research direction:** Pick one canonical 'add your first words' destination and make every first-run affordance agree with it. Gray out / relabel the /study tile and step 2 until the deck is non-empty, or have them route to topic selection first.

**F39 · [MEDIUM] Backup/export and restore are buried near the bottom of a ~1400-line Settings page with no anchor or search**  
`src/pages/Settings.jsx:719` — **Impact:** Backup is the single most safety-critical action in an offline-first app, yet it's the hardest to find — a learner worried about losing data must scroll past a dozen sections. Findability of a rarely-used-but-critical control is a classic convenience gap; recognition-over-recall (a principle the codebase cites for #byok/#topics) isn't applied here. **Research direction:** Add a #data anchor + scroll-into-view (mirror the existing #topics/#byok pattern) and link to it from the guest/durability banner. Consider hoisting a compact 'Backup now' button into the account menu.

**F40 · [LOW] Offline/sync pill is the only network feedback and offers no way to inspect or clear a stuck queue**  
`src/components/Layout.jsx:219` — **Impact:** Cross-device sync friction is where trust is won or lost. A perpetually-'N queued' or 'Sync error' pill with no recovery path or explanation reads as a broken app and no clear next step, and 'Synced' shown to a signed-out user is misleading about where their data actually lives. **Research direction:** Make the pill open a small popover with queue size, last error, a 'Retry' and a 'Clear stuck items' action, and show a distinct 'Not signed in — local only' state for guests instead of 'Synced'.

**F41 · [LOW] Import 'Add cards' undo is time-boxed to 10s and single-shot; no import history or dedupe warning for re-adds**  
`src/pages/Import.jsx:179` — **Impact:** Learners commonly re-import the same passage or paste overlapping texts. Without an 'already added' cue on the word chips, they can't tell what's new, leading to accidental duplicates or wasted selection effort — friction that compounds on the app's core deck-building loop. **Research direction:** Mirror SearchModal's `isInDeck` badge on the word chips (dim/disable words already in the target deck), and surface a small 'X already in deck, Y new' summary before Add. Consider a persistent per-source 'imported' memory instead of a 10s undo only.


### Performance & bundle (6)

**F42 · [HIGH] Zustand persist has no partialize — entire store JSON-serialized to localStorage on every mutation**  
`src/store/useStore.js:1994` — **Impact:** This is the single most-mutated store in the app (every card review calls set). As the deck and history arrays grow (mastered words, months of studyHistory, 50 examAttempts, cikguHistory transcripts), the per-mutation JSON.stringify cost grows unbounded and runs on the main thread during the interaction, causing input latency on the exact hot path (rating a card) on low-end school devices — the mobile-first target. It also persists ephemeral/derived fields that never needed to be in storage. **Research direction:** Add a `partialize` that whitelists only durable slices (cards, grammarCards, histories, mistakes, examAttempts, identity, settings, sync.queue) and excludes transient UI/derived flags. Consider also that even whitelisted, the full-deck re-serialize on every rating is costly — a debounced/throttled storage write (custom storage wrapper) would cut main-thread work on rapid review sessions. Verify with a large synthetic deck (1000+ cards) and DevTools performance profile of a rating tap before/after.

**F43 · [MEDIUM] Writing route eagerly imports the ~88KB writingGrader lexicon tree at mount**  
`src/pages/Writing.jsx:6` — **Impact:** listFormats/autoDetectFormat only need writingFormats (tiny); the heavy scoring lexicons (score()) are only needed on submit. The documented intent — keep the 88KB grader off the mount path — is silently not implemented, so the /writing route pays the full grader parse cost on every visit even for users who just browse formats or read exemplars. **Research direction:** Split the light metadata (listFormats/autoDetectFormat/writingFormats) from the heavy scorer. Load score() via dynamic `await import('../lib/writingGrader')` inside useWritingEvaluator's analyze handler (mirror the ocrEngine/transcribeEngine lazy-boundary pattern already used in the reader), so the grader chunk downloads on first analyze, not on route mount. Re-check the Writing page chunk size after.

**F44 · [MEDIUM] Layout (app shell) subscribes to the whole mistakes array and re-filters it every render**  
`src/components/Layout.jsx:32` — **Impact:** The app shell is the most expensive component to re-render (header, bottom nav, drawers, sync status). Tying it to a broad array subscription + inline filter means routine study activity (which adds mistakes) repaints chrome and does O(n) work on the shell on every catch. As mistakes accumulate over a study term this compounds. **Research direction:** Move the active-mistake count into a derived store getter memoized on the mistakes reference, or subscribe to a narrow primitive selector (e.g. a stored/maintained unreviewedCount) rather than the whole array. At minimum wrap the filter in useMemo keyed on the mistakes reference so it doesn't re-scan on unrelated shell re-renders.

**F45 · [MEDIUM] ForYou rebuilds all shelves + competence snapshot in the render body with no memoization**  
`src/pages/ForYou.jsx:92` — **Impact:** buildForYouShelves and buildCompetenceSnapshot fold together the deck plus every history slice — non-trivial pure work. Because 'now' is captured once, correctness is fine, but the derivation re-executes on every store mutation while the page is mounted (e.g. a background sync flush touching sync state, or a mistake add), doing full-deck work with no input-stable caching. The comment on line 22 claims 'Pure builder = no per-shelf store subs' but the builder still re-runs on every one of the 15 subscriptions. **Research direction:** Wrap langCards, shelves, and competence in useMemo keyed on their actual inputs (the specific slices they read), matching how Dashboard memoizes cardsForLang. This bounds the heavy builders to actually-relevant changes instead of any store write.

**F46 · [LOW] No manualChunks / chunk strategy in vite.config — documented per-route budgets are unenforced and shared data isn't grouped**  
`vite.config.js:29` — **Impact:** Every finding above (writingGrader creeping onto the mount path, data modules) can silently regress the documented budgets with no config-level backstop; the only enforcement is a human re-recording sizes in CLAUDE.md after builds. Rollup default heuristics can also duplicate a shared helper into multiple route chunks when only one dynamic edge exists, quietly inflating per-route bytes. **Research direction:** Add a build.rollupOptions.output.manualChunks to deliberately group the big shared data/vendor chunks (pdf, transformers, supabase, the dictionary/wikidata data) so route chunks stay lean and predictable, and/or wire a size-limit / rollup-plugin-visualizer threshold check into the pre-commit gate so a budget regression fails CI instead of relying on manual re-measurement.

**F47 · [LOW] CikguBot recomputes topic groups and suggested prompts on every render (per token during streaming)**  
`src/pages/CikguBot.jsx:360` — **Impact:** During an AI streaming response the component re-renders per token, and each render rebuilds the topic-group object and re-scans mistakes — allocation churn and wasted work on the interactive chat path. The KB has only a few dozen entries so it's not catastrophic, but it's needless per-token work in the streaming loop. **Research direction:** topicGroups depends on nothing reactive — hoist getAllTopics() to a module-level const or useMemo([]). Wrap getSuggestedPrompts in useMemo keyed on the mistakes reference so it only recomputes when mistakes change, not on every stream tick.


### Already-handled — do NOT re-propose (verified false during the audit)

- **No in-flow self-regulation or reflection scaffold in the study loop beyond a 1-3 confidence tap** — refuted: The finding's central claim — that "the loop offers no learner-facing self-assessment or coping/strategy scaffold" beyond a 1-3 confidence tap — is directly contradicted by the exact cited file, src/components/study/SessionSummary.jsx.
- **Wrong-answer path locks the learner into a fixed 5000ms wait with no way to advance** — refuted: The literal delay code is real: `src/hooks/useStudySession.js:159` reads `const delay = rating === Rating.Again ? 5000 : 300`, and `advancingRef` (set true at line 135, cleared only inside the 5000ms `setTimeout` at line 161) does latch `rate()` so re-RATING is ignored during the window (line 134).
- **'Save progress' banner and Freezes/Mastered tiles are shown to signed-in enhanced users, wasting prime dashboard space** — refuted: The finding's individual line citations are accurate — the Freezes/Words tile at src/pages/Dashboard.jsx:454 gates on `isEnhanced` (`userRole !== 'static'`, line 76), while the "Your progress isn't saved yet" guest banner at line 304 gates on `!authUser` (`auth?.user`, line 71).
---

## 7. Output contract (what your report must contain, in this order)

1. **Executive summary (≤1 page).** The 8–12 highest-leverage moves, each one line: *what → why (evidence grade) → who it helps → effort*. A reader should be able to act from this alone.
2. **Per-theme sections (A–K).** For each theme: the questions, the evidence (cited, graded), and the recommendations tied to specific app surfaces/findings. Show conflicts between perspectives and how you resolved them.
3. **Prioritized recommendation backlog (the centerpiece — a table).** One row per recommendation, columns:
   - `ID` · `Recommendation` · `Theme` · `Addresses finding(s)` (F#, or "new") · `Evidence grade` (A/B/C, §8) · `Learner impact` (High/Med/Low + one-line why) · `Effort` (S/M/L) · `UDL / ADHD / WCAG mapping` · `Risk / who it might harm` · `How to validate` (the metric or test that proves it worked).
   - Sort by impact-per-effort. Mark the **top 10 "do first" quick wins** and the **top 5 "strategic bets."**
4. **Design-principles synthesis (½–1 page).** The handful of durable principles that should govern *future* design decisions here (e.g., "every retrieval failure must reach the scheduler"; "every content modality needs one alternative"; "one primary action per screen"). This is how the research keeps paying off after the backlog is done.
5. **What NOT to do.** Recommendations you considered and rejected (with reasons), plus the Appendix-A items that are already handled (do not re-propose the three "already-handled" items at the end of Appendix A).
6. **Open questions & proposed validations.** What needs a user study, an A/B test, or a data pull before committing. Propose the cheapest experiment for each.
7. **Sources.** A graded bibliography (see §8). Group by theme. Flag any claim you could not source.

Keep prose tight and skimmable: lead with the conclusion, use tables and bullets, define jargon inline.

---

## 8. Evidence-grading rubric (apply to every claim and recommendation)

Tag each substantive claim and recommendation:

- **Grade A — Strong.** Multiple randomized trials and/or a meta-analysis converge; effect sizes and boundary conditions known. (Most core memory principles — spacing, testing effect — sit here.)
- **Grade B — Moderate.** Some empirical support, but limited, mixed, context-bound, or not yet replicated at scale. State the caveat. (Much of interleaving-across-skills, some UDL specifics, and many design-psychology effects sit here.)
- **Grade C — Heuristic.** Expert consensus / best-practice / design heuristic with little direct experimental backing. Legitimate to use — but *label it*, and don't let a C-grade recommendation outrank an A-grade one.

For each recommendation also note: **who it helps most, who it could harm** (e.g., an "undesirable difficulty" can help strong learners and hurt struggling ones), and the **boundary condition** (novice vs. advanced, ms vs. en cohort, ADHD vs. neurotypical). The app's own audits already model this humility — match it.

---

## 9. Guardrails & anti-patterns (do not recommend these unless you explicitly argue the constraint should change and cost it)

- **No dark patterns / no addiction mechanics.** No manipulative streak guilt, no variable-reward slot-machine loops, no engagement-for-engagement's-sake. Motivation must be autonomy-supportive and honest.
- **Don't break offline-first or the free/on-device default.** No recommendation may *require* a paid API or a network round-trip on the core loop.
- **Don't violate the bilingual invariants.** Malay and English decks never mix in a session; language drives locale. Several current bugs are exactly a broken version of this — fixes must restore it, not add new leaks.
- **Respect the reveal-gate philosophy.** "Try first, reveal freely; revealing is not failure; ease on too-hard content." Don't recommend always-on translation crutches, and don't recommend punishing reveals *except* where reveal genuinely means "give up on a retrieval" (a scheduling question, Theme A).
- **Honour the token/theme system and bundle budgets.** Visual recommendations must express as `var(--color-*)` tokens and a type/space scale, not new hardcoded values; feature recommendations must respect per-route JS size budgets and the mobile/low-end-device target.
- **App-specific or it doesn't count.** No generic "add gamification" / "improve onboarding" bullets. Tie every recommendation to a named surface, finding, or user journey.
- **Don't re-propose refuted items.** The three "already-handled" items at the end of Appendix A were verified false; skip them.
- **Cite or flag.** Every non-obvious empirical claim is cited or explicitly marked as unsourced opinion.

---

## 10. Self-evaluation checklist (clear this before you finish — Stage 6)

- [ ] Every one of the 12 perspectives contributed distinct findings (not just echoing each other).
- [ ] Every theme A–K is answered with **external, graded evidence**, not just app observation.
- [ ] Every recommendation is **tied to a specific surface/finding** and carries evidence grade + impact + effort + who-it-helps/harms + how-to-validate.
- [ ] Conflicts between perspectives are surfaced and resolved, not averaged away.
- [ ] All hard constraints in §2/§9 are respected (or a constraint-change is explicitly argued and costed).
- [ ] The backlog is sorted by impact-per-effort with quick wins and strategic bets marked.
- [ ] The three already-handled items are not re-proposed; challenges to Appendix-A directions are argued, not asserted.
- [ ] Uncertainties, boundary conditions, and needed validations are stated plainly.
- [ ] A solo developer could start building from the executive summary and backlog tomorrow.
- [ ] Completeness critique done: *what modality did I not search, what claim is uncited, what perspective is thin, what recommendation is unpriced?* — fixed or flagged.

---

## Appendix B — Verified current strengths (build on these; do not reinvent them)

The audit also confirmed real strengths. Recommendations should *extend* these, not duplicate them:

- **Spaced repetition done right:** FSRS-6 used with library-default weights (tracks the current algorithm), no overselling of FSRS-vs-older-algorithms, a test guard against version drift.
- **A genuinely sophisticated metacognition feature:** confidence capture → certain-but-wrong ("hypercorrection") detection → a salient correction UI that prioritizes those items in the next mixed session. (The gap is that the *main* Study loop doesn't yet feed this — see F6 — but the mechanism exists and is well-built.)
- **Accessibility foundations:** a polite screen-reader live region mounted on every drill; a keyboard/switch-operable reader with a unit-tested key map; reduced-motion support in CSS *and* JS; four composable theme axes (dark / light / high-contrast-AAA / dyslexia-font) that reskin the whole palette; a rigorous contrast-token system where every colour carries its measured WCAG ratio.
- **In-flow reflection already exists** at session end (a "how did that feel?" self-assessment, a goal-hit reflection prompt, and the hypercorrection coping message) — so Theme D/J should *strengthen and surface* self-regulation, not add it from scratch.
- **Honest engineering culture:** offline-first with a robust sync-failure/dead-letter design; guests never download the cloud SDK; a content-lint CI guard; and a documented history of the team hunting and correcting its *own* learning-science overclaims. Match this humility.
- **Learning-science honesty:** the code comments distinguish strong-evidence interleaving (within-skill, confusable items) from weak-evidence interleaving (cross-skill) and label the latter "spacing + variety" rather than overclaiming.

Two documentation caveats worth noting as *their own* small improvements: `STYLE_GUIDE.md` is stale (it still documents the old SM-2 algorithm, "7 routes," and old storage keys) and `docs/PEDAGOGICAL_SYSTEMS.md` describes an aspirational agent architecture that isn't built — both risk misleading a contributor and should be labelled current-vs-aspirational.

---

*End of master research prompt. The researcher should now execute Stages 1–6 (§3) and return the report per §7.*
