# Option F — L2 (Malay) sentence simplification — Design & Research (2026-06-10)

The **vocab-superior** rung of the translation ladder, parked since 2026-06-08 as
**Option F** in `docs/superpowers/specs/2026-06-08-sentence-reveal-design.md` (option F,
decision **S2**) and re-flagged in `docs/superpowers/specs/2026-06-09-full-translation-page-design.md`.
It completes the ladder the PDF reader already ships:

| Rung | Unit | What the learner gets | Language | Builds vocab? | Status |
|---|---|---|---|---|---|
| Word glosses ("Translate page") | word | "what does *this word* mean?" | → English | yes (routes to FSRS) | shipped |
| **Simpler Malay (Option F)** | **sentence** | **"say this hard sentence in *easier Malay*"** | **stays in Malay (L2)** | **yes — Involvement Load** | **this spec** |
| Sentence reveal ("Sentences") | sentence | "what is *this sentence* saying?" | → English | no (comprehension only) | shipped 2026-06-09 |
| Full translation (Option G) | paragraph → doc | "did I understand the *whole passage*?" | → English | no (comprehension only) | shipped 2026-06-09 |

The load-bearing insight (Rassaei & Folse 2024): **staying in the target language preserves the
deep "Involvement Load" processing that actually builds vocabulary** — an *L2* sentence elaboration
beats a word gloss, whereas an *L1* (English) reveal removes that processing and is only a
comprehension aid. Option F is therefore the **smallest, learning-richest crutch**: it unblocks a
stuck reader *without* leaving Malay. See `[[project_sentence_reveal_research]]`.

Researched **plan→research→implement** per `docs/process/feature-development-methodology.md`. The
adversarial L1-vs-L2 research this rests on was already done for the sentence-reveal spec (no fresh
deep-research pass — see "Research" below). Hook points were **verified against live code** (read
2026-06-10) before any design was fixed. Companion plan:
`docs/superpowers/plans/2026-06-10-option-f-l2-simplification.md`.

---

## Problem + who it's for

Same learner as the shipped layers: IGCSE Malay self-study teens, mobile-first, reading real
past-paper passages in the PDF reader. When a learner hits a hard Malay sentence today, their only
"meaning" help is the **English** reveal. That unblocks comprehension — but it pulls the learner
*out of Malay*, so it does nothing for vocabulary (S2). The learner who wants to *stay in Malay and
still get unstuck* has no rung between "opaque sentence" and "give up / read the English."

**Option F fills that gap:** tap a hard sentence → a **simpler Malay rewrite** of the same meaning
(easier words, simpler grammar, no English). The learner keeps doing L2 processing — the thing that
builds vocabulary — and only falls back to English if the simpler Malay *still* doesn't land.

But simplification is **not** translation: it's a generative *instruct* task (rewrite-in-easier-L2),
which the free gtx pipeline (ms→en only) cannot do. It needs an instruct model. That creates the one
genuine tension — the **no-paywall invariant**: the feature must never block a non-paying user, only
*degrade gracefully* (here: fall back to the shipped English reveal, feature simply hidden).

## The load-bearing question (already answered — no fresh research)

> *Does an L2 (Malay) sentence simplification add vocab value over the shipped L1 English reveal,
> and can it be offered without becoming a crutch?*

This is the exact question the sentence-reveal spec researched adversarially (findings 1–6, decision
log S1–S12). The answer is settled and **favours building Option F**:

1. **L2 sentence elaboration is vocab-superior (High).** Rassaei & Folse (2024, *System*): L2
   sentence-level glosses beat word-level for vocabulary on immediate *and* delayed post-tests — the
   gain is Involvement Load (deeper L2 processing). Option F *is* that intervention. This is the whole
   reason it ranks above the English reveal for vocabulary.
2. **The crutch risk is *substitution*, not damage (High).** van den Broek 2022 / Bjork / MDPI 2025:
   one reveal doesn't nuke memory; the danger is *habitually* leaning on help instead of retrieving.
   → keep it reveal-gated, on-demand, word-level still primary. (Simpler Malay is a *milder* crutch
   than English: the learner still reads only Malay.)
3. **Sentence is the right unit for an instruct model (High).** Context-in-NMT/LLM: instruct models
   disambiguate *sentences*; ~no gain on lone words. Simplification is inherently sentence-level.
4. **Honesty (High).** A generative rewrite can't be dictionary-verified → mark it "simplified Malay,
   a study aid, not authoritative," exactly like the machine-translated marker (S10).

**Why no fresh deep-research pass:** the build decision and the safety design are fully determined by
the inherited findings; a new study would refine prompt wording, not flip the design. Logged as a
deliberate, budget-aware call (open to a pass if Kheshav later wants prompt-level evidence).

## The synthesis

> **A "Ladder" extension of the shipped sentence reveal: tapping a sentence reveals *simpler Malay
> first* (the vocab-building rung), with a secondary "Show English" control inside the block that
> escalates to the existing English reveal only if the learner is still stuck. Reveal-gated, reflow-
> only, word-level still primary, behind a provider-agnostic BYOK gate (own instruct key required;
> no key → the feature is hidden and the shipped English reveal behaves exactly as today). Simpler
> Malay carries an honest "simplified" marker and still routes the original sentence's unknown words
> into FSRS.**

It is an **extension, not a rewrite**: the same sentence unit (`groupSentences`), the same reveal
reducer (`revealState`), the same gesture-isolation, the same per-sentence cue — plus a new pure
prompt-builder + parser, a thin provider-agnostic instruct seam, and a small cache. The big
`PDFReader` state machine is barely touched (retarget one handler, add parallel state).

---

## Options considered

### Surface — how simpler-Malay relates to the shipped English reveal → **CHOSEN: A (Ladder)**
- **A — Ladder: simpler Malay first, "Show English" escalation inside the block (CHOSEN).** One cue,
  smallest-crutch-first. Realizes the Involvement-Load finding directly: the learner is offered the
  *vocab-building* rung first and only escalates to the comprehension crutch if needed. *Assumption
  (validated):* findings 1–2 — L2 first builds vocab; English as the fallback rung keeps it a milder
  crutch. Kheshav sign-off 2026-06-10 ("pick the highest-quality per research").
- **B — Mode toggle "Reveal as: Simpler Malay | English" (REJECTED).** A header switch; the cue
  reveals whichever mode is selected. Simpler to build, but it makes the two rungs *mutually
  exclusive per global mode* — the learner can't escalate from Malay→English on a single stuck
  sentence without flipping a global switch and re-tapping. Loses the ladder's smallest-step-first
  pedagogy. Rejected.
- **C — Separate second cue per sentence (REJECTED).** Keep the English cue, add a distinct "Simplify"
  cue. Most explicit, but doubles the per-sentence affordances → clutter + more gesture surface to
  keep isolated from Select v2, for no pedagogical gain over A. Rejected.

### AI gate — who gets the feature (the no-paywall fork) → **CHOSEN: BYOK, provider-agnostic**
- **A — BYOK, provider-agnostic (CHOSEN).** Show the simpler-Malay rung only when the learner has
  **their own** instruct key, behind a single capability check `hasInstructProvider()` (v1 =
  `hasUserOpenRouterKey()`; trivially extends to Gemini/Ollama/etc. when the multi-provider router
  lands). No key → the rung is hidden and the shipped English reveal is unchanged (no paywall, just
  graceful degradation). *Why:* the shared `VITE_OPENROUTER_KEY` is **Kheshav's own deployment key** —
  routing every user's per-sentence rewrite through it would spend *his* account's shared rate limit
  (verified: `resolveKey()` = `userKey || VITE_OPENROUTER_KEY`). Kheshav sign-off 2026-06-10: "I don't
  want them using my key → BYOK." The capability seam (not a hardcoded `hasUserOpenRouterKey()` call)
  is the future-proofing for his multi-provider goal.
- **B — Everyone via the shared free model (REJECTED).** Use `isOpenRouterAvailable()` (env key too),
  like Cikgu's `chatWithFreeModel`. Maximizes reach, $0 model cost — but spends Kheshav's shared
  rate limit on potentially dozens of per-sentence taps per user. Rejected per his explicit "don't
  use my key." (Cikgu's free use is bounded chat; per-sentence PDF simplification is far higher
  volume.)

### "Show all sentences" in ladder mode → **CHOSEN: stays English-only (gtx), not bulk-simplify**
"Show all sentences" remains the cheap English comprehension-cram path (free gtx, unchanged). Simpler
Malay stays **per-sentence, on-demand** (one tap = one instruct call). *Why:* bulk-simplifying a whole
page = dozens of instruct calls = rate-limit hammering, for a use-case ("help me read THIS sentence in
easier Malay") that is inherently local. Bounds cost and matches intent.

### Scope scoring (Impact × Confidence ÷ Effort, per methodology)
| Scope | Impact | Confidence | Effort | Score | Verdict |
|---|---|---|---|---|---|
| **F (Ladder, BYOK provider-agnostic, reflow-only)** | 4.5 | 4 | 2.5 | **7.2** | **Build (v1)** |
| Bulk simplify on "show all" | 2 | 3 | 3 | 2.0 | Reject (rate-limit) |
| Sheet-render simplify | 1.5 | 3 | 2 | 2.25 | Defer (inline only v1) |

---

## Chosen design (v1) + WHY + verified hook points

1. **Pure simplify model — `src/lib/simplifyModel.js` (new, TDD-first).**
   - `buildSimplifyPrompt(sentenceText)` → `{ systemPrompt, messages }` for `callInstruct`. Instructs:
     rewrite this *one* Malay sentence in **simpler Malay** — easier/more common words, simpler
     grammar, same meaning, **stay in Malay (no English)**, return **only** the rewritten sentence, no
     preamble/quotes/labels. Pure → unit-testable.
   - `parseSimplifyResponse(raw, originalText)` → `{ text, status }`: trims, strips wrapping quotes/
     leading labels ("Simpler:", "Jawapan:"), and **guards honesty**: returns `status:'empty'` on
     blank, `status:'english'` if the output is dominated by non-Malay/English words (reuse a
     `MALAY_MARKERS`-style heuristic from `sentenceModel.js`), `status:'echo'` if it just returned the
     input unchanged, else `status:'ok'`. The component degrades to English on any non-`ok`.
   *Why:* the prompt + the response cleanup/guards are the load-bearing logic and must be tested
   without a network (TDD). Mirrors the pure-first discipline of `sentenceModel.js`.

2. **Provider-agnostic instruct seam — `src/lib/instruct.js` (new, thin).**
   - `hasInstructProvider()` → boolean. v1: `return hasUserOpenRouterKey()`. The single place the
     multi-provider router will extend (Gemini-BYOK / Ollama / …) — no caller hardcodes a provider.
   - `callInstruct({ systemPrompt, messages, maxTokens, signal })` → `Promise<string>`. v1: delegates
     to `callOpenRouter(...)` (verified signature, `openrouter.js:217`). Future: routes by available
     provider. *Why:* the brief's flagged fork — keep Option F from baking in `hasUserOpenRouterKey()`
     so Kheshav's "more keys than OpenRouter" goal plugs in with zero rework here.

3. **Extend `SentenceReveal.jsx` for the ladder (verified surface, `PDFReader.jsx:1054-1067`).** New
   props: `simplified` (`{text}|null`), `simplifyPending`, `simplifyFailed`, `englishShown`,
   `onShowEnglish` — plus the existing `translation`/`onAddUnknowns`/`onCollapse`. Behaviour:
   - **Provider available (ladder on):** the inline block leads with **simpler Malay** (or `…` while
     `simplifyPending`); a `"simplified Malay · a study aid, not the exam answer"` marker; the existing
     **"Add words"** button (unchanged); a secondary **"Show English ▾"** control. Tapping it reveals
     the English (the existing `translation`) nested beneath, with its own machine marker; "Hide
     English ▴" collapses just that rung. If `simplifyFailed`, show a one-line "couldn't simplify —
     showing English" and render the English rung directly.
   - **Provider unavailable (ladder off):** props `simplified`/etc. are absent → the component renders
     **exactly as today** (English directly). Backward-compatible; existing sentence-reveal tests stay
     green. *Why:* one component, surgical extension; every interactive element keeps the
     `stopPropagation` discipline (zero Select v2 regression).

4. **Wire `PDFReader.jsx` — retarget one handler, add parallel state (surgical).**
   - New state mirroring the English path: `sentenceSimplify` (`sentenceId → {text}`),
     `pendingSimplify` (Set), `englishShownSentences` (Set — which revealed sentences have escalated to
     English).
   - `ladder = hasInstructProvider()` (computed once; the rung only appears when true).
   - **Retarget `revealSentenceHandler` (`:580`):** on reveal, if `ladder` → fetch **simpler Malay**
     (`callInstruct` via `buildSimplifyPrompt`/`parseSimplifyResponse`, cached in `sentenceSimplify`,
     cancellable). If **not** `ladder` → unchanged (lazy gtx English, today's behaviour).
   - New `showEnglishHandler(s)` → adds to `englishShownSentences` and lazily fetches the gtx English
     via the **existing** `translateDocument([s.text], …)` path (reuses `sentenceGloss`/
     `pendingSentences`). The escalation rung literally reuses the shipped English machinery.
   - `collapseSentence` also clears `englishShownSentences` for that id. *Why:* simplify-first is a
     change to *what we fetch on reveal*, not new plumbing; the English rung is the shipped path.

5. **Caching & cost.** `sentenceSimplify` is an in-memory cache keyed by `sentenceId` (instruct output
   is **not** in the gtx IndexedDB cache). One reveal = at most one instruct call; re-reveal is free.
   `callInstruct` takes the `signal` so navigation/cancel aborts it. Persistence of simplifications is
   **out of scope v1** (note in open questions).

6. **EN-document gate (reuse, verified).** `sentenceDisabled = docLang === 'en'` (`:475`) already
   disables Sentence mode on English docs, so simplify never runs there (we simplify Malay→Malay
   only). "Simpler English" on EN docs is explicitly out of scope (backlog note).

7. **Render location.** v1 simplify renders **inline only**. The shipped `sentenceRender:'sheet'` pref
   continues to govern the *English* rung if escalated; the simpler-Malay primary stays inline (it's
   short). *Why:* avoids scope creep; inline is the evidence-backed default (S4/S11).

## Safety / quality bars
- **No paywall.** No instruct provider → the rung is **hidden**, never a locked/teaser CTA; the
  shipped English reveal is byte-for-byte unchanged for non-key users. The capability gate is the only
  thing that turns the rung on.
- **Reveal-gated, word-level primary.** Sentence mode stays off by default; simpler Malay is the
  *content* of an already-gated reveal, not a new always-on layer. Still routes unknown words → FSRS.
- **Smallest crutch first.** Simpler Malay (L2, vocab-building) is the default rung; English is a
  deliberate second tap. The ladder never *starts* in English when a provider is present.
- **Honesty.** Simpler Malay carries a "simplified — study aid, not authoritative" marker; the
  English rung keeps its machine-translated marker. Never presented as exam-correct wording.
- **Don't regress** the shipped sentence reveal (English path, "show all", add-unknowns, sheet pref),
  word glosses, Reflow/Layout, tap-to-translate, Select v2 (highlight/group/touch + pinch),
  `addSelectionToDeck`, "List unknowns", the quality pill, or Option G. The cue + every control
  `stopPropagation()`s.
- **Bounded cost.** Per-sentence on-demand only; "show all" stays gtx English (no bulk simplify);
  `callInstruct` is cancellable. Graceful degrade to English on model failure/garbage/timeout.
- **Provider-agnostic seam.** No caller hardcodes `hasUserOpenRouterKey()`/`callOpenRouter` — both go
  through `instruct.js`, the future router's single hook.
- `var(--color-*)` only; **React-19 purity** (no `Date.now()`/`new Date()` in render/useState init);
  **no array/object allocation inside Zustand selectors** (module-level `EMPTY_*` + `useMemo`);
  reflow-only v1; touch-first 390×844; both themes.
- **Accessibility:** the "Show English" control is keyboard-operable; revealed blocks `aria-live`;
  WCAG 1.4.13 dismissible/persistent inherited from the shipped pattern.

## Decision log
| # | Decision | Evidence / source (grade) | Effect | Confidence |
|---|---|---|---|---|
| F1 | **Build Option F — L2 simpler-Malay sentence rewrite** | Rassaei & Folse 2024: L2 sentence elaboration is vocab-superior to word/L1 (high) | +vocab, milder crutch | **High** |
| F2 | **Ladder surface: simpler Malay first, "Show English" escalation** | findings 1–2 — smallest-crutch-first realizes Involvement Load (high) + Kheshav sign-off | one cue, vocab-first | **High** |
| F3 | **BYOK, provider-agnostic gate (`hasInstructProvider`)** | shared key = Kheshav's own deployment key → his rate limit (high, code-grounded); his "don't use my key" sign-off; no-paywall invariant | reach vs cost resolved; future router plugs in | **High** |
| F4 | **Instruct task, NOT translation** | gtx/translate is ms→en only and can't paraphrase (high, code-grounded); instruct models disambiguate sentences (context-in-NMT, high) | new prompt-builder + `callInstruct`, not `translateBatch` | **High** |
| F5 | **Pure prompt-builder + parser with honesty guards (TDD)** | a generative rewrite needs echo/English/empty guards; honesty backbone S10 (high) | testable without network; degrades safely | **High** |
| F6 | **"Show all" stays English-only (no bulk simplify)** | bulk = rate-limit hammering for a local use-case (med-high, code-grounded) | bounded cost | **Med-High** |
| F7 | **Inline render only; sheet pref governs only the English rung** | inline is the evidence-backed default S4/S11; avoid scope creep (med) | simpler v1 | **Med** |
| F8 | **EN docs out of scope (Malay→Malay only)** | `sentenceDisabled` already gates EN docs (high, code-grounded) | clean boundary | **High** |
| F9 | **No fresh deep-research pass** | build + safety determined by inherited findings; a study refines prompt wording, not design (med-high) | budget-aware; offer stands | **Med-High** |

## Open questions for Kheshav
- **Q1 — Persistence.** v1 keeps simplifications in-memory only (lost on reload/navigation). Cheap to
  add IndexedDB caching later (keyed by sentence text). **Proposed: ship in-memory v1, defer
  persistence.** OK?
- **Q2 — English-doc "simpler English".** Out of scope v1 (the gate disables Sentence mode on EN
  docs). A future "simpler English" rung is symmetric but separate. **Proposed: backlog.** OK?
- **Q3 — Marker wording.** Proposed: *"Simplified Malay — a study aid, not the exam wording."* Any
  preferred phrasing?

*(These are low-stakes; if no objection, the proposed answers stand and the plan proceeds.)*

## Test plan
- **Pure units (TDD first, no DOM) — `simplifyModel.js`:**
  - `buildSimplifyPrompt`: returns a `{systemPrompt, messages}` whose system text demands simpler
    Malay / no English / sentence-only output; the user message carries the exact sentence.
  - `parseSimplifyResponse`: trims + strips wrapping quotes and leading labels; `status:'empty'` on
    blank; `status:'english'` when output is English-dominated; `status:'echo'` when unchanged from
    input; `status:'ok'` + cleaned text otherwise; never throws on junk input.
- **Seam unit — `instruct.js`:** `hasInstructProvider()` true iff a user instruct key is present
  (stub `hasUserOpenRouterKey`); `callInstruct` forwards args to the underlying call (mock).
- **e2e + GO WILD** (`[[feedback_go_wild_smoke_test]]`): with a stubbed instruct provider, enable
  Sentence mode on a multi-page MS fixture → cue appears, read Malay first → tap → **simpler Malay**
  slides in (not English), marker present; tap **"Show English"** → English rung appears beneath,
  Malay still visible; "Hide English" collapses only that rung; collapse hides the whole block; **no
  provider** → reveal shows English directly (today's behaviour, unchanged); model returns
  English/garbage/empty → **graceful degrade to English**; cancel mid-fetch (navigate away) — no
  crash; re-reveal is instant (cached); add-unknowns still lands FSRS cards; tap on cue/controls never
  starts a Select v2 selection; spam the Sentences toggle + Show/Hide English; offline → graceful;
  EN doc → Sentence mode disabled (no simplify); theme swap. Light + dark screenshots.
- **Verification gate:** `npm run build` (zero errors; PDFReader chunk stays lean), `npm run lint`
  (0 errors, no new warnings), `npm run test:run` (all green incl. new units), `npm run test:e2e`
  (SOLO per `[[project_e2e_config_invocation]]`; bindStore + live-`?t=`-URL for store mutations).

---

## Paste-ready Implementation kickoff (next session)
*(Canonical copy — keep in sync with the box in `RESUME_HERE.md`.)*

> Continue the IGCSE Malay Master app (React/Vite SPA, https://upg-igcse-malay-master.vercel.app).
> This is an **IMPLEMENTATION session** — build an already-approved spec. Plain language, evaluate my
> choices, give a short time estimate before each chunk; quality over speed. Make it the best possible —
> push until it can't be improved, then tell me honestly whether it hit that bar.
>
> **READ + FOLLOW (in order):**
> - auto-memory MEMORY.md — esp. `[[project_sentence_reveal_research]]` (Option F = L2 simpler-Malay,
>   vocab-superior; ladder = smallest crutch first), `[[feedback_make_clear_calls]]`,
>   `[[project_e2e_config_invocation]]` (e2e invocation + Vite `?t=` trap), `[[project_git_precommit_addall]]`
>   (pre-commit runs `git add -A` + a build/test/lint gate that ABORTS on failure; `*.md`-only commits skip it),
>   `[[project_two_vercel_projects]]` (confirm READY on PUBLIC upg-), `[[feedback_go_wild_smoke_test]]`,
>   `[[project_skills_triage]]`;
> - `RESUME_HERE.md` (top blocks);
> - spec `docs/superpowers/specs/2026-06-10-option-f-l2-simplification-design.md`;
> - plan `docs/superpowers/plans/2026-06-10-option-f-l2-simplification.md`;
> - the "Implementation session" expectations in `docs/process/feature-development-methodology.md`;
> - project CLAUDE.md — "Critical Conventions", "AI / Cikgu Maya Architecture", "Performance pitfalls", "Verification", "E2E tests".
>
> **SKILLS to invoke** (consult `[[project_skills_triage]]` first; don't invoke anything red-lit):
> - `superpowers:executing-plans` — you're executing a written plan with review checkpoints.
> - `superpowers:test-driven-development` — Tasks 1–2 (`simplifyModel`, `instruct` seam) are pure logic:
>   write the FAILING unit tests first, then implement to green.
> - `superpowers:verification-before-completion` — before ANY "done"/"passing" claim, run the command and show output.
> - `superpowers:requesting-code-review` — a bounded self-review of the `PDFReader.jsx` + `SentenceReveal.jsx` diff before commit.
> - `/verify` (or `/run`) — launch the app and eyeball light AND dark on 390×844.
>
> **MCP servers:** context7 ONLY if you touch React 19 / Tailwind 4 / Vite specifics; Vercel MCP after deploy to
> confirm the PUBLIC project (upg-…vercel.app) reaches READY. (Supabase NOT needed — no table/store-blob/schema change.)
>
> **BUILD** in the plan's TDD order. SURGICAL DIFFS ONLY — add `src/lib/simplifyModel.js` + `src/lib/instruct.js`,
> extend `src/components/SentenceReveal.jsx` for the ladder, and wire `PDFReader.jsx` with the MINIMAL diff (retarget
> `revealSentenceHandler`, add `sentenceSimplify`/`pendingSimplify`/`englishShownSentences` state + a `showEnglishHandler`).
> DO NOT rewrite `PDFReader.jsx`.
>
> **RESPECT the spec's quality/safety bars:** no-paywall (no provider → rung hidden, English reveal unchanged);
> ladder = simpler Malay first, "Show English" escalation; reveal-gated, word-level primary; provider-agnostic gate
> via `hasInstructProvider()`/`callInstruct` (NEVER hardcode `hasUserOpenRouterKey`/`callOpenRouter` at call sites);
> honest "simplified" marker; graceful degrade to English on model failure/echo/English/empty; "show all" stays gtx
> English (no bulk simplify); inline render only v1; EN docs disabled; `stopPropagation` on every control;
> `var(--color-*)` only; React-19 purity; no allocation in Zustand selectors.
>
> **VERIFY (show output, don't assert):** `npm run build` · `npm run lint` (0 errors, no new warns) ·
> `npm run test:run` (all green incl. new units) · `npm run test:e2e` (SOLO). GO WILD in the new e2e:
> simplify-first reveal, Show/Hide English escalation, no-provider fallback, model-returns-English/garbage degrade,
> cancel mid-fetch, re-reveal cached, spam toggles, offline, EN doc, theme swap.
>
> **SHIP:** commit atomically (pre-commit runs `git add -A`); refresh `RESUME_HERE.md` in the SAME final commit;
> repo auto-pushes; confirm the PUBLIC Vercel site reaches READY. End with a bounded self-review and an honest verdict
> on whether it hit the "can't get better" bar.
>
> **FIRST ACTION:** verify the baseline (git clean; `npm run test:run` green; `npm run lint` 0 errors; prod READY),
> then begin Task 1 (`simplifyModel.js`, tests-first).
>
> **BACKLOG after this ships (don't lose):** **Multi-provider key router** (Gemini / Ollama / OpenRouter / others —
> users reuse existing keys; `instruct.js`'s `hasInstructProvider`/`callInstruct` is its hook) → **Multimodal**
> (image recognition for past-paper images, more file formats, audio/video → Malay transcripts) → **Layout-view
> sentence reveal** (fast-follow) → optional **two-column parallel** desktop width for the Full-translation page.
> See `[[project_sentence_reveal_research]]`.

## Sources (graded; inherited from the sentence-reveal research)
- Rassaei & Folse (2024), L1/L2 word- vs L2 sentence-level glosses, **System** — https://www.sciencedirect.com/science/article/abs/pii/S0346251X24000551
- Chen (2025), Gloss Language and L2 Vocabulary Learning, **TESOL Quarterly** — https://onlinelibrary.wiley.com/doi/10.1002/tesq.3394
- van den Broek et al. (2022), retrieval vs inference, **Cognitive Science** — https://onlinelibrary.wiley.com/doi/10.1111/cogs.13135
- Bjork & Bjork, desirable difficulties — https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf
- "Not all difficulty helps" (L2 vocab retention/transfer), **Behavioral Sciences 2025** — https://pmc.ncbi.nlm.nih.gov/articles/PMC12108878/
- Context in neural machine translation (sentence-level disambiguation; WSD) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11465115/
