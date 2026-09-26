# Learning science foundation — design check

Moved out of the root `CLAUDE.md` on 2026-09-26 so it loads on demand instead of into every session. Read it when designing or re-shaping a feature. Root `CLAUDE.md` keeps the reveal-gate invariant in short form; this is the full rationale and evidence.

This is a learning tool, not a content reader — every feature should serve at least one validated principle. Use this as a design check, not dogma.

| Principle | How it shows up here |
|---|---|
| **Active recall > passive review** | FSRS-6 scheduling; 7 study modes; type-answer, cloze, speaking, and the selectable **Produce** mode (gloss→type the word) force production |
| **Test effect / retrieval** | Quiz, cloze, saved-word cloze, roleplay scoring — retrieval beats re-reading |
| **Spaced / distributed practice** | FSRS for vocab AND grammar drills; mistake re-drills; "Still remember these?" idle-card shelf; exam rehearsal on a readiness schedule |
| **Interleaving** | Smart Study mixes vocab/grammar/speaking; topic rotation |
| **Elaborative encoding** | Word families; contextual examples; bidirectional MS↔EN |
| **Immediate, specific feedback** | Cikgu Maya error explanations; mistake journal with categories |
| **Metacognitive calibration** | Confidence log (1–3); "certain but wrong" → hypercorrection priority |
| **Cognitive-load management** | Reveal-gated translation; progressive disclosure; offline-first (no spinner anxiety) |
| **Identity & motivation** | Streaks + freeze (grace + loss aversion); identity/ideal-self prompts |

**Reveal-gated translation (load-bearing for the PDF reader):** default is Malay-only; English is revealed only on a deliberate tap and always machine-marked — a *try-first-then-reveal* comprehension aid (revealing is never "failure"). Reveal-gating is a *desirable difficulty* only when the text is **within reach** (Bjork/Sweller): for a demonstrably too-hard page it **eases**, not blocks, a floundering beginner. **Shipped 2026-06-11** (Claim 6, spec `docs/superpowers/specs/2026-06-11-learning-science-actions-design.md`): `src/lib/unknownDensity.js` measures the unknown-word density of the loaded PDF (known = built-in dictionary **or** grounding-verified; `DENSE_THRESHOLD = 0.4` over `MIN_DENSE_TOKENS = 20` content words); at/above it `PDFReader.jsx` shows a **non-punitive, dismissible** banner offering to reveal the English as you read (Malay still first) — never auto-applied unless the **beginner pref** opts in (`pdfReader.autoHelpDensePages`; Settings → reading; default OFF; STORE_VERSION 28). EN docs never nudge. So don't frame "always-visible translation" as an absolute crutch — the gate is *try first, reveal freely; revealing is not failure*, and it eases on demonstrably too-hard pages. The app's PRIMARY vocab path — L1 (English) **word** glosses → FSRS — is evidence-backed for our beginner IGCSE audience (Kim/Lee/Lee 2024: L1 glosses beat L2 for vocab, strongest for beginners) and stays primary. **Option F** (Malay→simpler-Malay paraphrase, shipped 2026-06-10 behind the BYOK `instruct.js` gate) is an *optional involvement-load aid* (Rassaei & Folse 2024) — strongest for **intermediate+** learners, **NOT a beginner vocab win** (re-framed 2026-06-11). Don't sell the L2 rung as vocab-superior — see `[[project_sentence_reveal_research]]` for the hedged findings before designing on top of it.
