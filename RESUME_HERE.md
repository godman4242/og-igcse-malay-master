# RESUME HERE — read this first

You are a fresh Claude Code session continuing work on the IGCSE Malay
Master app. Read this doc end-to-end **before** opening any other file.

---

## 🔧 Tooling change — 2026-06-09 (read this)

**Commits are now quality-gated.** `.githooks/pre-commit` runs `build → test:run → lint`
and **aborts the commit (and the auto-push/prod deploy) if any fail** — so a broken build
can no longer reach users. Adds ~30s to each commit. Emergency bypass: `git commit --no-verify`.
**Docs-only fast-path:** commits where every staged file is `*.md` skip the gate (instant) —
safe because nothing in src/tests imports markdown.

**CLAUDE.md was slimmed:** the "Zero-Waste Cognitive Engine" master plan + full agent
guidelines moved to **`docs/PROJECT_VISION.md`** (read it when planning features). Stale facts
fixed (test count ~630, correct lint-warning file names). Rationale: a leaner always-loaded
CLAUDE.md = better rule adherence (Anthropic best-practice).

---

## ▶ START THE NEXT SESSION HERE  (for Kheshav)

**Your steps (~30 seconds, nothing technical):**
1. Open a **fresh** Claude Code session in this project folder (fresh = clean context = cheaper).
2. *(optional)* Type `/fast` for quicker replies.
3. Copy the **whole** prompt in the box below and paste it as your first message. (✅ PDF Layout View
   **shipped + live**; ✅ "Translate the whole document" **MVP Scope A shipped + live 2026-06-08**;
   ✅ **Sentence-level reveal SHIPPED + live 2026-06-09**; ✅ **BYOK "higher quality" translation
   SHIPPED + live 2026-06-09**; ✅ **Option G — the reveal-gated "Full translation" page SHIPPED +
   live 2026-06-09** — paragraph→whole-document English, Malay always visible, reveal-gated, "Reveal
   all" cancellable, BYOK-shared, machine-framed, EN-doc gated, its own lazy chunk.
   Next session = **DESIGN & RESEARCH Option F: L2 (Malay) sentence simplification/paraphrase** —
   vocab-superior per Rassaei & Folse 2024; reuses the shipped BYOK key + the `callOpenRouter` instruct
   primitive (a NEW paraphrase call — NOT the ms→en translate pipeline). A **Design & Research** session:
   write the spec + TDD plan and hand it back for sign-off — do NOT build yet.)

**↓ Copy everything inside this box ↓**

```text
Continue the IGCSE Malay Master app (React/Vite SPA, https://upg-igcse-malay-master.vercel.app).
This is a DESIGN & RESEARCH session — produce a signed-off spec + TDD plan; do NOT build yet.
Plain language, evaluate my choices, give a short time estimate before each chunk. Make the clear
calls yourself (state choice + why for veto) and only ask genuine product/taste forks.

READ + FOLLOW (in order):
- auto-memory MEMORY.md — esp. [[project_sentence_reveal_research]] (Option F = L2 Malay
  simplification/paraphrase; it is vocab-SUPERIOR to the L1 reveals because L2 processing preserves
  Involvement Load — Rassaei & Folse 2024; this is the load-bearing finding), [[feedback_make_clear_calls]],
  [[feedback_feature_dev_methodology]] (Design & Research mode; plan→research→implement order;
  adversarial decision-linked research; templates in docs/process/), [[feedback_perfect_next_session_prep]],
  [[project_skills_triage]];
- RESUME_HERE.md (top blocks);
- the shipped layers to reuse/extend: spec docs/superpowers/specs/2026-06-09-full-translation-page-design.md
  + sentence-reveal spec docs/superpowers/specs/2026-06-08-sentence-reveal-design.md;
- project CLAUDE.md — "Critical Conventions", "AI / Cikgu Maya Architecture" (BYOK/OpenRouter path), "E2E tests".

SKILLS to invoke (consult [[project_skills_triage]] first; don't invoke anything red-lit):
- superpowers:brainstorming — explore intent + options BEFORE fixing any design.
- superpowers:writing-plans — once the design is signed off, write the TDD plan.
- deep-research — ONLY if a genuine load-bearing question needs external evidence the sentence-reveal
  research didn't already settle (it likely did — log the call either way, budget-aware).

MCP servers: context7 ONLY if a chosen design touches React 19 / Tailwind 4 / Vite specifics (unlikely
in a design session). Supabase + Vercel NOT needed (no schema change, no deploy — docs only). Optional:
graphify the two source specs if a visual map helps reason about the translation ladder.

WHAT OPTION F IS: a Malay→SIMPLER-Malay (L2) paraphrase of a hard sentence — NOT an English
translation. The learner stays in the target language, which preserves Involvement Load and is better
for vocabulary than the L1 (English) reveals already shipped. Paraphrase is an INSTRUCT task, NOT
translation, so it does NOT reuse the gtx/translate pipeline — it needs a NEW instruct call (reusing
the shipped BYOK key + the reveal/gating discipline). NO-PAYWALL invariant: degrade gracefully
(hide/explain) when there's no key. Decide: which surface (a mode on the existing sentence reveal? a
separate toggle?), how L2-simplify coexists with the shipped L1 sentence reveal, reveal-gating, and how
to frame "simplified Malay, not authoritative."

VERIFIED HOOK POINTS (confirmed live 2026-06-09 — re-confirm against the code, then design around them;
don't blind-trust this list):
- Surface to extend: src/components/SentenceReveal.jsx + src/lib/sentenceModel.js (groupSentences,
  detectDocLanguage) + the reveal reducer src/lib/revealState.js (consumed via the sentenceRevealState
  shim) + the reveal handler and the `quality` state in src/pages/PDFReader.jsx.
- Instruct primitive (NOT translation): src/lib/openrouter.js exposes
  callOpenRouter({systemPrompt, messages, maxTokens, signal}) and chatWithFreeModel(messages,
  contextNote, signal); hasUserOpenRouterKey() / isOpenRouterAvailable() are the key gates;
  src/lib/ai.js callAI() is the Supabase/Claude proxy (Cikgu). The gtx/translate pipeline
  (translate.js / translateDocument.js) is ms→en ONLY and cannot paraphrase — Option F adds a new PURE
  prompt-builder (TDD-able) + an instruct call; it does NOT thread through translateBatch.
- GENUINE FORK to settle with me (no-paywall): does paraphrase REQUIRE the user's own BYOK key
  (hasUserOpenRouterKey), or may it use the free shared OpenRouter models like Cikgu's chatWithFreeModel
  (isOpenRouterAvailable)? This decides whether non-key users get the feature at all — bring me options.

DELIVERABLES (Design & Research — do NOT build):
- docs/superpowers/specs/<date>-option-f-l2-simplification-design.md — problem + who it's for, options
  with rejections, chosen design + WHY, hook points VERIFIED against live code first, safety/quality bars,
  decision log, open questions for me, test plan, and a paste-ready implementation kickoff.
- docs/superpowers/plans/<date>-option-f-l2-simplification.md — TDD task breakdown (pure logic first).
- Refresh RESUME_HERE.md top block + paste-ready box to point at the Option F IMPLEMENTATION session.
Commit the docs (the *.md-only fast-path skips the build/test/lint gate). Then hand me the assembled
design for ONE sign-off before any code.

FIRST ACTION: read [[project_sentence_reveal_research]] + the two specs above (the sentence-reveal one
already did the adversarial L1-vs-L2 research Option F rests on), confirm git is clean, then invoke
superpowers:brainstorming and walk me through Option F's surface + BYOK-gate options — don't write the
spec until we've settled the genuine forks.

BACKLOG after Option F (don't lose): Layout-view sentence reveal (fast-follow to the reflow sentence
reveal) → optional two-column parallel desktop-width enhancement for the Full-translation page. See
[[project_sentence_reveal_research]].
```

*(This box is the only thing you need to paste for the next session — it WILL ask you to sign off on
genuine product forks, so use it when you're around.)*

### 💤 Overnight / away variant (question-free — paste this if you're asleep)

**Quality-safe by design.** ONE focused Option F design pass, run to completion **without asking
anything**: makes every clear call, and parks genuine forks (recommendation + alternatives) in a
"⚠ DECISIONS FOR KHESHAV" block instead of blocking. Docs only — no feature code, no deploy. You wake to
a finished, reviewable spec + plan + a short decision list. For your workflow this is ~equal to doing it
live (you just veto the parked forks in the morning instead of in real time).

> **Do NOT cram all three backlog designs into one overnight run.** Chaining Option F + Layout-view
> reveal + two-column in a single session measurably degrades the 2nd/3rd designs (context summarizes as
> it fills, thinning the nuance design needs). The fast-follows are cheap — give each its own focused
> pass. Breadth-over-depth is the wrong trade for design quality.

```text
Continue the IGCSE Malay Master app (React/Vite SPA, https://upg-igcse-malay-master.vercel.app).
This is an OVERNIGHT, QUESTION-FREE DESIGN & RESEARCH session for Option F (L2 Malay sentence
simplification/paraphrase). I am away — run to completion WITHOUT asking me anything. Make every clear
call yourself; for genuine product/taste forks DO NOT block — choose a recommended option, design
around it, and record each fork + your recommendation + the alternative in a "⚠ DECISIONS FOR KHESHAV
(sign off before implementing)" section at the TOP of the spec. Deliver DOCS ONLY — no feature code.

READ + FOLLOW (in order):
- auto-memory MEMORY.md — esp. [[project_sentence_reveal_research]] (Option F = L2 Malay paraphrase;
  vocab-SUPERIOR to the L1 reveals because L2 processing preserves Involvement Load — Rassaei & Folse
  2024; load-bearing finding), [[feedback_make_clear_calls]], [[feedback_feature_dev_methodology]],
  [[feedback_perfect_next_session_prep]], [[feedback_automation_quality_gate]] (recommend + flag forks;
  never silently commit a product decision in code), [[project_skills_triage]];
- RESUME_HERE.md (top blocks);
- specs docs/superpowers/specs/2026-06-09-full-translation-page-design.md +
  docs/superpowers/specs/2026-06-08-sentence-reveal-design.md;
- project CLAUDE.md — "Critical Conventions", "AI / Cikgu Maya Architecture" (BYOK/OpenRouter), "E2E tests".

SKILLS: superpowers:brainstorming (use it to structure the options — but ANSWER the prompts yourself,
don't ask me), then superpowers:writing-plans for the TDD plan. deep-research ONLY if a genuine
load-bearing question isn't already settled by the sentence-reveal research (it likely is — log the call).

WHAT OPTION F IS: a Malay→SIMPLER-Malay (L2) paraphrase of a hard sentence — NOT an English translation;
keeps the learner in the target language (better for vocab than the shipped L1 reveals). Paraphrase is an
INSTRUCT task, NOT translation — it does NOT reuse the gtx/translate pipeline; it needs a NEW instruct
call (reusing the shipped BYOK key + reveal/gating discipline). NO-PAYWALL invariant: degrade gracefully
with no key. Forks to resolve-with-a-recommendation (NOT ask): which surface (a mode on the shipped
sentence reveal vs a separate toggle), coexistence with the L1 sentence reveal, reveal-gating, "simplified,
not authoritative" framing, AND whether paraphrase requires the user's own BYOK key
(hasUserOpenRouterKey) or may use the free shared OpenRouter models (isOpenRouterAvailable, like Cikgu's
chatWithFreeModel) — decides whether non-key users get it at all.

VERIFIED HOOK POINTS (confirmed live 2026-06-09 — re-confirm, then design around them): surface =
src/components/SentenceReveal.jsx + src/lib/sentenceModel.js (groupSentences, detectDocLanguage) + the
reveal reducer src/lib/revealState.js (via the sentenceRevealState shim) + the reveal handler & `quality`
state in src/pages/PDFReader.jsx. Instruct primitive (NOT translation) = src/lib/openrouter.js
callOpenRouter({systemPrompt, messages, maxTokens, signal}) / chatWithFreeModel(messages, contextNote,
signal); gates hasUserOpenRouterKey()/isOpenRouterAvailable(); src/lib/ai.js callAI() = Supabase/Claude
proxy. Add a NEW pure prompt-builder (TDD-able) + an instruct call — do NOT thread through translateBatch.

DELIVERABLES (docs only — verify hook points against LIVE code first):
- docs/superpowers/specs/<today's date>-option-f-l2-simplification-design.md — "⚠ DECISIONS FOR KHESHAV"
  block at the TOP, then problem + who it's for, options w/ rejections, chosen design + WHY, verified
  hook points, safety/quality bars, decision log, test plan, paste-ready implementation kickoff.
- docs/superpowers/plans/<today's date>-option-f-l2-simplification.md — TDD task breakdown (pure logic first).
- REQUIRED so the chain continues: refresh RESUME_HERE.md top block + paste-ready box so the NEXT session
  is the Option F IMPLEMENTATION session (mirror the design's kickoff), and update the status note.
Commit the docs (the *.md-only fast-path skips the build/test/lint gate; repo auto-pushes). Do NOT deploy
or confirm Vercel (docs only). END with a concise list of the decisions you parked for me.

BACKLOG after Option F: Layout-view sentence reveal → optional two-column parallel desktop layout for the
Full-translation page. See [[project_sentence_reveal_research]].
```

---

> ✅ **OPTION G — "FULL TRANSLATION" PAGE — SHIPPED + LIVE (2026-06-09).** A dedicated, reveal-gated,
> full-screen page in the PDF reader for **paragraph→whole-document English**, framed as a post-reading
> **comprehension check** (not vocab). Opens all-Malay, nothing revealed; tap a paragraph → its English
> slides in **inline beneath** (Malay stays visible) with a persistent **machine-translated** marker;
> **"Reveal all"** is the opt-in, cancellable, cache-resumable bulk hatch; **paragraph-pure** (no
> word/sentence tapping — back arrow returns to the reader for vocab/FSRS work); the BYOK **"Higher
> quality"** pill is shared with the reader and key-gated; **English documents hide the entry**; offline
> degrades gracefully. Built TDD per `plans/2026-06-09-full-translation-page.md` (Tasks 1–9).
> - **Pure logic (TDD):** `src/lib/revealState.js` — the generic id-keyed reveal reducer
>   (`createRevealState/isRevealed/reveal/hide/setShowAll/hideAll`) extracted from
>   `sentenceRevealState.js`, which is now a thin re-export shim (sentence tests stay green, +8 unit).
>   `src/lib/paragraphModel.js` — `buildParagraphs` (flatten pages → stable `pageNum:pi` paraIds),
>   `splitForTranslation` (over-long ¶ → ≤maxChars sentence sub-chunks, never mid-word, gtx cap-safe),
>   `planParagraphTranslation` (skip-translated + dedupe + per-¶ ordered chunk map),
>   `assembleParagraphGloss` (rejoin sub-chunks; `source='error'` only if EVERY chunk errored) (+14 unit).
> - **Component:** `src/components/FullTranslationView.jsx` — lazy-loaded (its **own ~7.6 kB chunk**;
>   PDFReader stays ~47 kB), reuses `translateDocument` + the per-text IndexedDB cache; lazy per-¶ reveal
>   mirrors the reader's sentence handler; failed paragraphs are **not cached** (so a later reveal retries,
>   no error-stickiness). `var(--color-*)` only; React-19-pure (`navigator.onLine` read lazily).
> - **Wiring (surgical, 5 edits):** `PDFReader.jsx` — lazy import + `showFullTranslation` state + reset in
>   `resetGloss` + a `Suspense`-wrapped early-return takeover + a `data-testid="full-translation-open"`
>   toolbar button gated on `!sentenceDisabled`. **No rewrite.**
> - **Tests:** +22 unit (now **679 green / 51 files**); `tests/e2e/full-translation.spec.js` (**9 GO-WILD
>   cases**: reveal-gated open, reveal-all/hide-all, cache-resume = zero new calls, EN-doc gate, back-intact,
>   offline-no-crash, **successful reveal in light AND dark**, **over-long ¶ split→rejoin** (new
>   `long-paragraph-malay.pdf` fixture, 6111 chars), cancel-mid-bulk + spam entry/back + light/dark screenshots).
>
> ✅ **BYOK "HIGHER QUALITY" TRANSLATION — SHIPPED + LIVE (2026-06-09).** A key-gated **"Higher
> quality"** pill in the PDF reader routes the SAME document-translate pipeline (word glosses **and**
> sentence reveals) through the user's own OpenRouter free instruct models — more idiomatic Malay→English
> than free gtx — and **degrades to gtx** if the quality call fails. Built TDD per
> `plans/2026-06-08-byok-quality-translation.md` (Steps 1–6). Free gtx stays the default; **non-key users
> never see the toggle** (no paywall).
> - **Pure logic (TDD):** `src/lib/translationCache.js` — `makeKey/readCache/readCacheSync/writeCache`
>   gain a trailing `ns` arg; quality glosses cache under `ns='q'`, free under `ns=''` → **no collision**
>   (gotcha #1, +4 unit). `src/lib/translate/providers/openrouter.js` — `openrouterTranslate{Batch,One}`
>   + `parseNumberedList`: ONE numbered-list completion → N glosses, **per-word fallback** on count
>   mismatch, **throws** on real failure so the router falls through to gtx, and names languages in full
>   ("Malay→English", not "ms→en") for free-model reliability (gotcha #2, +12 unit).
> - **Router (surgical):** `translate.js` — `openrouter` added to `PROVIDERS`; `providerOrder` leads
>   with openrouter for `pref==='quality'` when `isOpenRouterAvailable()`, ALWAYS keeps gtx after it;
>   read/write cache namespaces threaded into both call sites (see split below; +6 unit).
>   `translateDocument` threads `provider` (+2 unit).
> - **UI:** `PDFReader.jsx` — `const [quality]` + a `data-testid="quality-toggle"` pill rendered ONLY
>   when `hasUserOpenRouterKey()`; `provider: quality ? 'quality' : undefined` threaded into all 3
>   `translateDocument` calls (page / sentence-batch / single-sentence reveal). `var(--color-*)` only.
> - **Cache namespace — READ vs WRITE split (improves on the plan):** the READ namespace follows the
>   *preference* (`pref==='quality'` → look only in `'q'`, so a free gtx gloss can never shadow the
>   premium one); the WRITE namespace follows the *result's actual provider* (`writeNsFor`). So a quality
>   call that degrades to gtx writes the gtx gloss to the FREE namespace, never poisoning `'q'` — the next
>   quality retry re-attempts OpenRouter instead of being stuck on the cached fallback, AND the degraded
>   gtx gloss is reused by free requests. (The plan's simpler "ns from pref" cut would have left a 429'd
>   word stuck on gtx-quality until cache-clear; this eliminates that.) Unit-pinned.
> - **Proof:** **657 vitest (+24)** · 0 lint err (3 pre-existing warns) · build clean (PDFReader 47.9 KB,
>   openrouter split to its own 4.8 KB chunk) · new e2e `tests/e2e/byok-quality-translate.spec.js`
>   (7 cases incl. GO WILD: toggle absent w/o key, quality Q-glosses, **quality→gtx soft-degrade**,
>   numbered-list **per-word fallback**, offline no-crash, spam-toggle + light/dark) all pass SOLO.
>   Eyeballed light+dark on 390×844 (toggle pill purple when ON, themed when off).
> Spec/plan: `docs/superpowers/plans/2026-06-08-byok-quality-translation.md` (READ/WRITE-ns split is the
> one deliberate deviation from the plan's "ns from pref", made to remove the rate-limit stickiness).

---

> ✅ **SENTENCE-LEVEL REVEAL — SHIPPED + LIVE (2026-06-09).** Tap a ¶ cue in the PDF reader's
> **reflow** view → the whole-sentence English slides in under the line (a **COMPREHENSION** aid,
> secondary to word-level reveal). Built TDD per `plans/2026-06-08-sentence-reveal.md` (Steps 1–6).
> - **Pure logic:** `src/lib/sentenceModel.js` — `groupSentences(parts,{pageNum,pi})` groups reflow
>   tokens into punctuation-sentences (`. ! ? …`, paragraph-fallback; never a line fragment) +
>   `detectDocLanguage` (conservative EN-doc no-op gate). `src/lib/sentenceRevealState.js` — reveal
>   reducer keyed by sentenceId, separate from the word `docGlossState`. +34 unit tests.
> - **UI:** `src/components/SentenceReveal.jsx` — cue / inline slide-down block, stopPropagation()s
>   exactly like DocGloss (zero Select-v2/pinch regression). Inline `<span display:block>` (valid in `<p>`).
> - **PDFReader.jsx (surgical):** off-by-default **"Sentences"** toggle, **"Translate sentences"** +
>   **"Show all sentences"** (the only bulk reveal), per-sentence lazy translate via the proven
>   `translateDocument` runner, **machine-translated** marker, word-cue dimming inside a revealed
>   sentence, and **"add unknown words → FSRS"** (addCards). EN doc → toggle disabled with a reason.
> - **Settings + store (v24→v25):** `pdfReader.sentenceRender: 'inline'|'sheet'` (default inline;
>   sheet = a fixed bottom panel) + `setPdfSentenceRender` + migration.
> - **Proof:** 633 vitest (+34) · 0 lint err · build clean (PDFReader chunk 47 KB) · new e2e
>   `tests/e2e/sentence-reveal.spec.js` (12 cases incl. GO WILD: wrapped-sentence-whole-reveal,
>   tap-cue-never-selects, show/hide-all, resume-from-cache, add-to-FSRS, EN-doc no-op, bottom-panel,
>   offline, layout-hides-controls, spam-toggle, navigate-mid-job, light+dark) all pass SOLO; the 46
>   sibling PDF e2e (translate-document/pdf-layout/select-v2/select-to-card/saved-word) still green.
>   New fixtures `sentences-malay.pdf` (incl. a long wrapping sentence) + `english-doc.pdf` (in
>   `scripts/gen-fixtures.mjs`). Eyeballed light+dark on 390×844.
> Spec/plan: `docs/superpowers/specs/2026-06-08-sentence-reveal-design.md` + companion plan.
> Backlog: BYOK quality (NEXT) → Option G full-translation page → Option F L2 paraphrase. See
> [[project_sentence_reveal_research]].

---

> ✅ **"TRANSLATE THE WHOLE DOCUMENT, FREE" — MVP Scope A SHIPPED + LIVE (2026-06-08).**
> Reveal-gated, in-place, word-level English glosses over dictionary-**unknown** words in the PDF
> reader (reflow **and** Layout), free gtx (no key), grounding-flagged, routed into FSRS. What shipped:
> - **UI** `src/components/DocGloss.jsx` — one shared reveal-gated affordance (tiny 🌐 cue → tap →
>   English in place + one-tap ＋ add-to-deck). Used by BOTH PDF views.
> - **PDFReader.jsx** — `docGloss`/`glossState` state, `glossByIndex` (mirrors `selIdx`), a
>   **"Translate page"** toolbar action (volume-safe: dedupe+chunk+throttle+backoff+cache+**Cancel**),
>   a **"Show all / Hide all"** escape hatch, and add-to-deck. Old list mode kept as **"List unknowns"**.
> - **LayoutView.jsx** — renders the same gloss anchored under each word's overlay rect.
> - **Grounding (D9):** unknown machine output → subtle dotted "unverified"; a dictionary **mismatch**
>   shows the **canonical** English + an orange flag (never silent-ships a wrong meaning).
> - **Tests:** +1 unit (buildGlossIndex skips `source:'error'` → no bogus self-gloss) = **599 green**;
>   new e2e `tests/e2e/translate-document.spec.js` (11 cases incl. GO WILD: reveal-gate, show/hide-all,
>   resume-from-cache, unverified+mismatch, add-to-FSRS, offline, cancel, spam-toggle, navigate-mid-job,
>   light+dark screenshots — all pass solo; parallel flakiness = dev-server contention, the documented
>   `[[project_e2e_config_invocation]]` pattern). Build clean (PDFReader chunk 35.8 KB), 0 lint errors.
> **Honest MVP cuts (see the next-session box):** (a) BYOK "higher quality" is deferred — OpenRouter
> isn't a provider inside `translate.js` yet (free-gtx is the honest first slice). (b) Cancel aborts
> **between chunks** (gtx sequences within a chunk) — fine for real multi-page docs; on a tiny
> single-chunk page Cancel just hides the bar. (c) Sentence-level reveal is Q5 **v2**. (d) Whole-doc
> background prefetch is **Step 7 / Scope D** (next).
> Spec + plan: `docs/superpowers/specs/2026-06-08-translate-document-design.md` + the companion plan.
>
> 🧭 **WORKFLOW (read this) → `docs/process/feature-development-methodology.md`.**
> Two session modes (Design&Research → Implementation), the **plan→research→implement**
> order (diverge first so research doesn't anchor your thinking), the research-quality
> rules, and **two paste-ready prompt templates (A = Design&Research, B = Implementation).**
>
> ✅ **OPENROUTER FREE-MODEL 404 FIXED + SELF-HEALING (2026-06-07).** All three
> hardcoded free slugs (`deepseek-r1-0528`, `llama-4-scout`, `gemma-3-1b`) were
> retired by OpenRouter at once → every AI feature (incl. "Make me a deck") 404'd
> with "No endpoints found". Root cause was stale hardcoded model ids, NOT the key
> (the deck generator already shares the Settings BYOK key via `resolveKey()` — no
> second key needed). Fix in `src/lib/openrouter.js`: `getFreeModels()` now
> discovers the current free chat models from `/api/v1/models` at runtime (cached
> 24h in `localStorage['igcse-openrouter-models']`, never in the sync blob), ranks
> the strongest general-instruct families first via `pickFreeModels()` (pure,
> tested), and falls back to a curated valid list (`FALLBACK_FREE_MODELS`) when
> offline. `callOpenRouter` consumes the live list. TDD: 13 new tests in
> `src/lib/__tests__/openrouterModels.test.js` (504 total). **Lesson: never
> hardcode OpenRouter `:free` slugs — they rotate every few months.**
>
> 🧭 **DESIGN & RESEARCH session DONE (2026-06-03).** The learning-science/UDL pass is
> complete and committed. Outputs, all Kheshav-approved:
> - **Tappable saved-word highlights — v2 spec** upgraded
>   (`docs/superpowers/specs/2026-06-02-tappable-highlights-design.md` + plan): now
>   evidence-backed, with a **staged MVP→Tier-2** build (MVP = instant gloss + example
>   + a11y; Tier-2 = recall-first reveal for due words + a soft "I forgot this" signal
>   that must NEVER reschedule FSRS), a **mandatory accessibility bar (WCAG 1.4.13)**,
>   and a decision log. The §3 safety bars (don't break selection/copy/links) still hold.
> - **Learning roadmap + Track-B deep-specs** (NEW:
>   `docs/superpowers/specs/2026-06-03-learning-roadmap-and-trackb.md`): a ranked
>   roadmap, plus build-ready specs+plans for the top two — **(1) mistake-journal
>   micro-drills** (`plans/2026-06-03-mistake-micro-drills.md`, highest score, infra
>   exists) and **(2) generative cloze from saved words**
>   (`plans/2026-06-03-generative-cloze.md`). Key nuance found in code: a `cloze`
>   variant already exists in `drillVariants.js`, so #2 is an enhancement, not net-new.
>
> ✅ **TAPPABLE HIGHLIGHTS — MVP + TIER-2 BOTH SHIPPED + DEPLOYED (2026-06-04).**
> Tap (or keyboard-select via Shift+Arrow) an already-highlighted saved word while
> reading → a read-only REVIEW popover. Built TDD per
> `plans/2026-06-02-tappable-highlights.md` Steps 1–7 (the WHOLE plan).
> - **MVP (Steps 1–5):** popover = meaning + 🔊 + example + a "Review in Study" link.
>   Pure `wordAtOffset`/`matchAtOffset` (`lib/savedWordHighlight.js`), `hooks/
>   useSavedWordTap.js` (drag-guard click hit-test + `selectionchange` keyboard
>   trigger), `components/SavedWordPopover.jsx` (`role="dialog"` + Esc + focus
>   move-in/restore + tab-away/outside/scroll dismiss — WCAG 1.4.13/2.1.1).
> - **Tier-2 (Steps 6–7):** ADAPTIVE recall-first. Pure `isDueForRecall(card)` in
>   `lib/fsrs.js` (+5 tests; due OR New/Learning/Relearning OR lapses≥3 → recall
>   mode; strong/settled → instant gloss). Recall mode hides the meaning behind a
>   one-tap "Show meaning" (retrieval→reveal), then offers a SOFT "I forgot this" →
>   `addMistake({type:'review',category:'vocab',source:'tappable-review',
>   language:'ms',severity:'low'})`. **GUARDRAIL (proven by e2e, byte-identical):**
>   the forgot-tap NEVER reschedules FSRS — and `severity:'low'` means addMistake
>   skips card auto-promotion entirely (store ~L1316), so it can't touch the card.
> - **Proof:** `tests/e2e/saved-word-tap.spec.js` = **9 tests** (click-review
>   light+dark, drag-selection-not-broken, non-saved no-op, **link-safety**,
>   **a11y/Esc/focus**, outside/scroll dismiss, **Tier-2 recall-hidden-until-show**,
>   **Tier-2 strong-instant**, **Tier-2 guardrail**). 394 vitest (+10) · 0 lint err ·
>   build clean · sibling e2e (highlight + select-to-card) green · eyeballed light+dark.
>
> 🔎 **SEO / metadata pass (2026-06-04):** `index.html` head hardened for public
> discoverability + a11y — keyword-rich title/description (no puffery), `rel=canonical`
> + `robots` meta → `https://upg-igcse-malay-master.vercel.app/` (the PUBLIC project;
> see [[project_two_vercel_projects]]), `WebApplication`/`EducationalApplication`
> JSON-LD, `og:locale` en_MY+ms_MY, and **removed `user-scalable=no`** (was failing
> WCAG 1.4.4 zoom). Added `public/robots.txt` (→ sitemap) + 2 routes to `sitemap.xml`.
> Custom **1200×630 (rendered @2x → 2400×1260) `og-image.png`** now shipped (built
> with the frontend-design skill: glowing gradient wordmark + hibiscus icon on
> near-black, rendered via headless chromium from `public/_og-template.html`, which
> is NOT committed). `twitter:card` back to `summary_large_image`. To regenerate:
> recreate the template + `node` Playwright screenshot (see the chore(seo) commits).
>
> ✅ **MISTAKE MICRO-DRILLS — SHIPPED + DEPLOYED (2026-06-05).** A focused recall +
> correction pass over `getFixUpQueue` on `/mistakes`. Built TDD per
> `plans/2026-06-03-mistake-micro-drills.md` (the whole plan).
> - **Pure logic:** `src/lib/mistakeDrill.js` `buildDrillPrompt(mistake)` returns a
>   DISCRIMINATED result — `{kind:'answer', question, answer, yourError}` for
>   vocab/imbuhan/spelling/comprehension (have `correct`/`correction`) vs.
>   `{kind:'reflect', surface, note, practiseTarget}` for fluency/cohesion/register/
>   pronunciation (advisory tips, no answer). **Key real-data nuance:** Roleplay logs
>   imbuhan/tense as `surface`+`note` ONLY → the "answerable category with no answer →
>   DOWNGRADE to reflect" path is common, not edge. Garbage → null. +17 unit tests.
> - **UI:** `?drill=1` mode inside `MistakeJournal.jsx` (no new route; `useSearchParams`).
>   Entry CTA "Fix your mistakes (N)". Co-located `MistakeDrill` snapshots
>   `getFixUpQueue(12)` ONCE (live re-run would reshuffle as items get reviewed),
>   steps per kind: answer → recall→reveal (contrastive "you wrote X" vs green answer)
>   → **Got it / Still shaky**; reflect → surface+note → **Practise in {target} / Noted**.
>   Got it/Noted → `markMistakeReviewed`. **GUARDRAILS:** never imports FSRS (the
>   `reviewed` flag IS the state for these non-promotable cats); viewing never re-logs.
> - **Proof:** `tests/e2e/mistake-micro-drills.spec.js` = 4 tests (full-clear drops
>   total to 0 AND card count unchanged = FSRS untouched · Still shaky keeps 1 ·
>   contrastive reveal light+dark · no-relog-on-view). 411 vitest · 0 lint err · build
>   clean · full e2e green · eyeballed light+dark.
>
> ✅ **GENERATIVE CLOZE — "Practise saved words" — SHIPPED + DEPLOYED (2026-06-06).**
> A productive-retrieval session over the 'Saved' deck. Built TDD per
> `plans/2026-06-03-generative-cloze.md` (the whole plan).
> - **Pure logic:** `src/lib/clozeBuilder.js` `makeClozeItem(card)` → `{kind:'cloze',
>   sentence, blankStart, blankEnd, answer, clue}` when the saved word occurs (whole-word,
>   phrase-aware, case-insensitive — reuses `findSavedWordMatches`) inside `card.ex`, ELSE
>   `{kind:'produce', answer, clue}` fallback (missing `ex` / `ex`==word / no match), ELSE
>   `null` (no word). Blanks only the FIRST occurrence, deterministic. +8 unit tests.
> - **UI:** new lazy route `/saved-cloze` → `src/pages/SavedWordCloze.jsx` (self-contained,
>   NOT on `useStudySession` — so it CANNOT regress Study's `ClozeMode`). Snapshots the
>   Saved deck ONCE at mount (`useStore.getState().cards`, no reactive sub). Type → Check
>   (auto-grades) or Show answer → **Got it / Needed the answer**. Entry CTA: a "Saved Words"
>   tile on the Practice hub (Grammar & Vocab group) with a `N saved` status cue.
> - **FSRS (verified via context7 + store L1036):** these ARE real cards → `reviewCardAction`.
>   Got it → `Rating.Good`, Needed → `Rating.Hard` (NOT `Again` — `Again` auto-logs a vocab
>   mistake; a reveal must not). At session END calls `updateStreak()` + `addStudyMinutes()`
>   so it counts toward streak/daily-goal, same as Study (spec §3.6 D4 = yes).
> - **Proof:** `tests/e2e/generative-cloze.spec.js` = 3 tests (cloze→produce→Got it advances
>   FSRS `due` + reviewedToday=2 + mistakeTotal stays 0 = Hard-not-Again guardrail · empty
>   state · light+dark). 419 vitest (+8) · 0 lint err · build clean · full e2e green ·
>   eyeballed light+dark. Practice-hub guard test updated (new path + `saved` status).
>
> ✅ **"FOR YOU" PERSONALIZED HOME — PHASE 1 (no AI) — SHIPPED + DEPLOYED (2026-06-06).**
> A new `/for-you` tab with smart shelves built entirely from existing signals. Built
> TDD per `plans/2026-06-06-personalized-for-you.md` (Phase 1, Steps 1–5).
> - **Pure logic (TDD):** `src/lib/forYouShelves.js` `buildForYouShelves(snapshot, now)`
>   composes 5 self-hiding, fixed-order shelves: **Keep going** (`buildDailyPlan` undone
>   tasks) → **Picked for you** (launches the now-surfaced `SmartSession` at `/smart-study`;
>   `buildLearnerProfile().focusTopics` shown as weak-spot chips) → **Still remember these?**
>   → **From your saved words** (`/saved-cloze`) → **Toward your goal** (`goalToFocus` →
>   surface). `src/lib/fsrs.js` `stillRememberCards(cards, config, now)` = the INVERSE of
>   the recall queue (settled+idle+not-due; checks due-ness vs the INJECTED `now`, not
>   `isDue`'s wall clock) + `resolveRecallProbe`/`RECALL_PROBE_DEFAULT`. `src/lib/goals.js`
>   `GOAL_PRESETS` + `goalToFocus(preset, sentence)` (preset wins; else bilingual sentence scan).
> - **Weak-topic note (course-correction):** `selectFocalCards` (interleavedQueue) ALREADY
>   biases the Smart Session by recent-mistakes → due → lowest-stability, so "Picked for you"
>   is weak-biased WITHOUT a new card-filter prop. focusTopics are mistake CATEGORIES (don't
>   map cleanly to vocab cards), so they're surfaced as descriptive chips, not a filter. No
>   change to the session engine — lower risk, higher correctness.
> - **Store (v22→23):** `identity.goalPreset` (null) + `recallProbe` `{enabled, mode:
>   'default'|'strict'|'custom', stabilityDays, idleDays}` + migration + `setGoalPreset`/
>   `setRecallProbe` actions. **Settings UI:** a goal-preset chooser above the one-sentence
>   field + a compact, customizable "Still remember these?" control (On/Off · Default 21/14 ·
>   Strict 30/21 · Custom day inputs) — Kheshav asked for it user-tunable.
> - **UI:** `src/pages/ForYou.jsx` (lazy `/for-you`), snapshots store ONCE per visit
>   (AnimatedRoutes remounts on nav), horizontal-scroll rails, first-run "get-started" state,
>   inline recall-reveal that NEVER writes FSRS. New bottom-nav tab "For You" (Sparkles);
>   **Dashboard stays at `/` — additive, NOT a landing swap** (§8.1 revised, Kheshav confirmed).
> - **Proof:** `tests/e2e/for-you.spec.js` = 6 tests (nav reaches it · shelves render +
>   Picked launches /smart-study · recall hides meaning until tapped + goal links out ·
>   disable-probe/clear-goal hides those shelves · new-learner get-started · light+dark).
>   453 vitest (+34) · 0 lint err · build clean · full e2e green (mistake-micro-drills
>   under-load flake passes solo, see [[project_e2e_config_invocation]]) · eyeballed light+dark.
>
> 🔄 **"FOR YOU" — PHASE 2 (AI custom decks, KEY-GATED) — IN PROGRESS (2026-06-06).**
> Spec `specs/2026-06-06-personalized-for-you-design.md` (§5.3/§5.4), plan
> `plans/2026-06-06-personalized-for-you.md` (PHASE 2). DONE this session:
> - ✅ **Licensing RESOLVED** (web-researched) → `specs/2026-06-06-for-you-phase2-dictionary-licensing.md`.
>   Decisive framing: **license (may we ship it?) vs trust (is it correct?) are SEPARATE**;
>   a grounding gate needs both. Decision = a **layered, all-permissive, mostly client-side
>   gate** (higher quality AND simpler than server-side Wiktionary):
>   - **Tier 1 (DONE):** owned `dictionary.js` (804 pairs) + learner cards → exact = auto-verify.
>   - **Tier 2 (next):** bundle `iannho/Malay-Dataset` `dictionary/Malays.dic.txt` (24.5k real
>     Malay words, **CC-BY-4.0/Apache — permissive, bundle-safe + attribution**) = "real Malay
>     word?" validity signal. (Its 200k bilingual set is MT-NOISY — do NOT trust as translations.)
>   - **Tier 3 (next, KHESHAV WANTS — bigger=better, zero risk):** **CC0 Wikidata** lexemes for
>     trusted MS↔EN translations. CC0 = public domain, NO strings → just pull + bundle, even if
>     coverage is partial it's free upside. (Query the Wikidata SPARQL endpoint / lexeme dump.)
>   - **Tier 4:** unknown → learner-in-the-loop confirm. NEVER auto-accept a noisy MT pair.
>   - **AVOID:** copy-pasting Wikipedia/Wiktionary (**CC-BY-SA share-alike**) into this PUBLIC repo
>     — it's infringement regardless of detection + would relicense our file. If max coverage is
>     ever wanted, do Wiktionary **server-side only** (data never shipped → license doesn't trigger).
> - ✅ **Increment A SHIPPED (TDD, commit fbcbecd):** `src/lib/dictionaryGrounding.js`
>   `buildGroundingIndex(dictionaryPairs, cards)` + `verifyPair(malay, english, index)` →
>   `{verified, confidence, canonicalEn?, suggestion?}`. Tier-1 owned-data lookup; handles
>   real `dictionary.js` shape (multi-sense `/`, parenthetical stripping `you (formal)`→`you`),
>   case/space-insensitive; source-agnostic so Tiers 2/3 layer in without re-architecting.
>   +9 tests · **462 vitest** · 0 lint err. NOT wired to any UI yet (live site unchanged).
> - ✅ **Increment C SHIPPED (TDD, 2026-06-07):** **Tier-3 CC0 Wikidata MS↔EN** folded in.
>   Pulled Malay (Q9237) lexemes with English sense-glosses from the Wikidata SPARQL endpoint
>   (4,901 rows, paginated), distilled to `src/data/wikidataMalayEn.js` = **4,287 clean
>   `{m,e}` pairs** (Latin-script only; Jawi/affixes/single-letters/classifier+>4-word
>   definitions dropped; diacritic variants folded; senses merged with `;`). **3,768 are NEW
>   lemmas** the owned 804-dictionary lacks → ~5.7× grounding coverage. `buildGroundingIndex`
>   gained an optional **3rd arg `extraPairs`** + **per-sense confidence tiers** (owned=high,
>   Wikidata=medium; owned ingested first so it sets display + never downgrades). `verifyPair`
>   now returns `confidence:'medium'` for a Wikidata-only match (still `verified:true` — trusted
>   CC0, no nag); unknown/mismatch unchanged (never silent-ship). +6 tests · **468 vitest** · 0
>   lint err · build clean. Asset is **lazy-only** (155 KB; not in main bundle — D dynamic-imports
>   it). Regenerate via the SPARQL pull (query in git history of this commit). CC0 = no
>   attribution required; credited in the asset header as courtesy.
>
> - ✅ **Increment D SHIPPED (TDD, 2026-06-07) — THE HEADLINE: "Make me a deck".** A key-gated AI
>   custom-deck generator on `/for-you`, grounded so it **never silent-ships** a made-up/mistranslated
>   word. `src/lib/deckGenerator.js`: pure `buildDeckPrompt(goal, focusTopics, interests)` →
>   `{system,user}`; tolerant `parseDeckCandidates(text)` (handles ```json fences + prose, trims,
>   dedupes, caps 40); `groundCandidates(cands, index)` → `{accepted, review}` (verified auto-accept
>   w/ confidence; unknown+mismatch → learner-confirm w/ canonical suggestion); `deckNameForGoal`;
>   plus orchestration `generateDeckText` (VITE_AI_MOCK → OpenRouter `callOpenRouter` → edge `callAI`
>   chat), `buildDeckGroundingIndex(cards)` (lazy-imports dictionary + Wikidata, Tier1+Tier3), and
>   `generateGroundedDeck`. UI `src/components/MakeDeckPanel.jsx` on ForYou: key-gated (OpenRouter
>   key/env or mock; else "add a key to unlock"→Settings), goal input (prefilled from identity),
>   generate → **Verified / Check-these** review (provenance badges: dictionary=high, reference=medium;
>   verified pre-checked, unverified opt-in) → `addCards` into deck `"AI · {goal}"` (stores the
>   AUTHORITATIVE `canonicalEn` when grounding has one, correcting AI mismatches). Mock `MOCK_DECK_RESPONSE`
>   + `getMockResponse('deck')`. **+18 vitest (486 total)** · 0 lint err · build clean (Wikidata is its
>   own lazy 120 KB/38 KB-gz chunk, NOT main bundle) · **e2e `tests/e2e/make-deck.spec.js` (3 tests:
>   generate→ground→add · never-silent-ship · light+dark) — full suite 58 green** · eyeballed both themes.
>   Locked-state branch is code-verified only (dev build bakes a VITE_OPENROUTER_KEY so it can't be
>   exercised hermetically).
>
> 🧭 **NEXT SESSION → PHASE 2 remaining (optional polish) or PHASE 3.** Increments left:
> - **E** — AI roleplay seed (scenario from goal+interests → existing Roleplay AI evaluator). The
>   natural next "ONE feature": reuse `buildDeckPrompt`-style prompting + the Roleplay AI path.
> - **B** — bundle the CC-BY Malay validity list (Tier 2) + an attribution/credits line.
>   (LOW priority now — Tier-3 Wikidata already gives strong bilingual coverage.)
> - **CHECK at kickoff:** is the Supabase **edge function deployed**? (the Claude-proxy tier needs
>   it; OpenRouter free models + `VITE_AI_MOCK` are fallbacks.) Verify before relying on it.
>
> 🔎 **WEBSITE-PLANS AUDIT (2026-06-07, researched live).** Kheshav's 3 reading/select ideas →
> spec `docs/superpowers/specs/2026-06-07-reading-and-select-experience-audit-and-design.md`:
> - **(a) PDF keeps its layout — ❌ NOT built.** `lib/pdf.js` flattens to reflowed plain-text
>   paragraphs; no positions/columns/tables. Needs canvas-render + positioned text overlay (big).
> - **(b) Selected words highlighted — ⚠️ effectively NO.** PDFReader tints *vocab status*
>   (green/cyan), not selection; committed picks show as chips in a bucket, never inline. App-wide
>   `SelectionToCard` uses native selection only.
> - **(c) left-drag individual / right-click phrase — ✅ MAPPING FIXED 2026-06-07.** Was built but
>   INVERTED in `lib/useSelectionMode.js`; Kheshav confirmed the flip and it shipped: pure
>   `lib/gestureModel.js` `classifyGesture` (+5 tests) = left-drag→individual, right-drag→phrase,
>   single→word; hook + PDFReader `handleCommit` + Tips text updated. 491 vitest · 0 lint · build ok.
> - **🔴 go-wild finding: PDF select is MOUSE-ONLY** (`useSelectionMode` binds no touch/pointer) →
>   unusable on phones (primary device). Touch must be first-class in Select v2 (plan Step 2.5).
> - **✅ SELECT V2 SHIPPED 2026-06-07 (Steps 2–4 + touch).** All of website-plans (b)+(c):
>   - **Step 2** `src/lib/selectionGroup.js` (pure, +17 tests): `groupSelection`/`ungroupSelection`/
>     `explainCompound`. Wired the compositional teaching moment (`showCompoundFor` →
>     translateBatch(parts)+translateWord(whole) → "jam=o'clock · tangan=hand → jam tangan=watch")
>     + bucket chip Link/Unlink (group/ungroup) affordances.
>   - **Step 2.5 TOUCH** `useSelectionMode` rewritten on **Pointer Events** + a toolbar
>     **Individual⟷Group toggle** (`classifyGesture` gained `groupIntent`, +5 tests). **Key bug the
>     go-wild e2e caught: touch IMPLICITLY captures the pointer to the pointerdown target, so
>     `e.target` reports the start token for the whole drag → every drag collapsed to one word. Fix:
>     hit-test by COORDINATES (`document.elementFromPoint`), not `e.target`.** Drag root uses
>     `touch-action:pan-y` so vertical scroll still scrolls.
>   - **Step 3** inline highlight: `handleCommit` attaches token indices to bucket entries; a
>     `selIdx` map backgrounds selected tokens (word=accent-subtle, phrase=purple tint + a non-colour
>     `borderBottom` bracket + title/aria for a11y).
>   - **Step 4** `tests/e2e/select-v2.spec.js` (7 tests incl. go-wild: backwards drag, single-token
>     no-op, ungroup, chip-group, mode/theme swap, touch drag, non-token pointer-down).
>   Totals: **526 vitest · 0 lint err · build ok · full e2e green.** Next = **PDF layout view**
>   (§3, bigger) then **AI roleplay seed (E)**.
>
> ✅ **PDF LAYOUT VIEW — SHIPPED 2026-06-07 (all Steps 0–6 done, deployed).** Website-plan **(a)**
> delivered. The PDF reader now has a Reflow⟷Layout toggle; **Layout** renders each page faithfully
> (columns, tables, black-ink diagrams) on a **white page surface** (visible in dark mode), with an
> invisible word-token overlay so tap-translate + Select v2 (word/phrase/group/highlight/bucket) work
> right on the page image, **pinch + double-tap to zoom** (crisp re-render on settle, 1-finger-select
> vs 2-finger-pinch arbitrated), lazy per-page render (memory-bounded), scanned-page degrade note, and
> **remember-last** (STORE_VERSION 24, first open = Reflow). Files: `src/lib/pdfLayout.js` (pure geom,
> 28 tests), `src/lib/usePinchZoom.js`, `src/pages/pdfreader/LayoutView.jsx`, `src/lib/pdf.js`
> (loadPdf/extractTextFromDoc), `PDFReader.jsx`. Gates: 554 unit + 75 e2e (`tests/e2e/pdf-layout.spec.js`,
> incl. GO WILD) green; build/lint clean; eyeballed dark+light. Fixtures + `scripts/gen-fixtures.mjs`.
> **NEXT recommended = the "Translate the whole document, free" Design & Research pass** (its own
> session; scope + learning-quality guardrail captured in the spec's "Next feature" §). Use methodology
> Template A (Design&Research). The Layout overlay already tokenizes every word with positions, so a
> "translate everything" pass is the same `translateBatch` over those tokens — cheap to build after this.
> - **Step 4** — zoom: `src/lib/usePinchZoom.js` arbitrates 1-finger-select vs 2-finger-pinch (2nd
>   pointerdown aborts the in-flight selection via `sel.onPointerCancel`, swallows pointer events while
>   ≥2 down, ignores trailing ups) + double-tap toggle (fit⟷2×). Live CSS `scale()` during the pinch;
>   LayoutView re-renders crisp at the settled `zoom` (fit×zoom, clamp 1–4). Eyeballed: double-tap
>   366→732px, pinch-out→1464px (4× clamp), 1-finger drag still selects after zoom (no state leak).
> - **Step 3** — word-token overlay + Select v2: `buildPageTokenModel` (pure, ONE global index across
>   pages, +5 tests) feeds transparent `data-token-i` spans positioned by `itemRect`/`splitItemIntoWordRects`
>   over each canvas; PDFReader switches `activeTokens` reflow⟷layout so tap-translate / drag-select /
>   group / inline highlight / bucket all reuse unchanged; scanned page (0 words) → "No selectable text" note.
>   Eyeballed: 22 spans, tap "rajah"→diagram, left-drag→bucket, highlight aligns on the page image. 554 tests.
> - **Step 0** — fixtures `tests/e2e/fixtures/{layout-2col,scanned}.pdf` + `scripts/gen-fixtures.mjs`
>   (scanned = a RASTER canvas→PNG so it has zero text layer; SVG `<text>` would render as real text).
> - **Step 1** — `src/lib/pdfLayout.js` pure geometry (transform compose, itemRect, word-split, fit/clamp/
>   double-tap scale, visiblePageRange) + 23 unit tests.
> - **Step 2** — `src/lib/pdf.js` split into `loadPdf` + `extractTextFromDoc` (load ONCE, `extractPdfText`
>   kept as wrapper for Import); `src/pages/pdfreader/LayoutView.jsx` lazy canvas render (white-fill →
>   render, dpr≤2, placeholder boxes, `page.cleanup()` offscreen, `renderTask.cancel()`); PDFReader holds
>   the live `doc` (destroy on replace/clear/unmount) + a Reflow⟷Layout toolbar toggle (local state — Step 5
>   makes it persisted/remember-last). Eyeballed dark+light: white page, both columns + black-ink diagram
>   visible in dark mode. `scripts/eyeball-layout.mjs` screenshots the layout view.
> - **NEXT = Step 3** (word-token overlay + Select v2 wiring) → 4 (pinch/double-tap zoom + pointer
>   arbitration) → 5 (persist view, STORE_VERSION **23→24**) → 6 (e2e + GO WILD + gates). 549 tests green.
>
> 🧭 **PDF LAYOUT VIEW — DESIGN DONE 2026-06-07 (RECOMMENDED next build).** Spec
> `docs/superpowers/specs/2026-06-07-pdf-layout-view-design.md` + plan
> `docs/superpowers/plans/2026-06-07-pdf-layout-view.md`. Delivers website-plan **(a)**: render
> each PDF page as a faithful image (columns/tables/black-ink diagrams kept) on a **white page
> surface** (so diagrams show even in dark mode, theme-independent) with an **invisible word-token
> overlay** that reuses Select v2. Researched vs pdf.js v4 (context7): canvas `page.render` + viewport
> transform, no new dep; the de-risker = overlay is transparent over the canvas so hitboxes only need
> ROUGH alignment. Kheshav decisions baked in: **pinch-zoom + double-tap** (crisp re-render on settle) ·
> **full Select v2** in layout view · default view = **remember-last** (first = Reflow, keep both = UDL).
> **Document-translation ("translate the whole doc, free, BYOK+grounded") = its OWN next design pass**
> (captured in the spec's "Next feature" § — has a learning-quality guardrail caveat).
>
> 📋 **Kickoff prompt + Kheshav's step-by-step = the `▶ START THE NEXT SESSION HERE` box at the very
> top of this file** (kept in ONE place so it can't drift from the plan). Every verified fact and
> heads-up now lives in the plan's **Gotchas** — the single source of truth the kickoff points to.
>
> 📋 **PASTE-READY KICKOFF — increment E, AI Roleplay Seed (ALSO QUEUED, alt to Select v2):**
> > Fresh Claude Code session on IGCSE Malay Master ("ooga da boogadamalay"), React/Vite SPA,
> > live at https://upg-igcse-malay-master.vercel.app. READ FIRST: auto-memory MEMORY.md
> > (esp. [[feedback_layman_explanations]], [[feedback_max_effort_always]],
> > [[feedback_standing_commit_permission]], [[feedback_time_estimates_add]],
> > [[feedback_feature_dev_methodology]]), `RESUME_HERE.md` (top), then the build-ready
> > **spec `docs/superpowers/specs/2026-06-07-ai-roleplay-seed-design.md`** (verified reuse-map +
> > Decisions 1–5) + **plan `docs/superpowers/plans/2026-06-07-ai-roleplay-seed.md`** (Steps 1–4).
> > TASK: PHASE 2 increment **E — AI Roleplay Seed**, the LAST For-You AI piece. Generate a
> > custom AI roleplay **scenario** from the learner's goal + interests and drop it into the
> > EXISTING `RoleplaySession` (zero turn-engine changes). REUSE (don't rebuild): the increment-D
> > AI chain pattern (`generateDeckText`: VITE_AI_MOCK → OpenRouter → edge), `buildDeckGroundingIndex`
> > + `verifyPair` (here as a Malay-word VALIDITY filter on `keyVocab` — advisory, NOT a hard gate),
> > and the live Roleplay evaluator. KEY FINDING (already researched): the AI session reads only a
> > MINIMAL scenario slice — `context`/`contextEn`, `turns[].examiner`/`hint`, `keyVocab`,
> > `keyImbuhan`, `lang`, `title` — NOT `modelAnswers`/`rubric` → generation is small + robust.
> > Follow TDD: Step 1 pure `roleplayGenerator.js` (`buildScenarioPrompt`, `parseScenario`,
> > `isKnownMalay`, `groundScenario`, `seedScenarioMeta`) → Step 2 orchestration + `getMockResponse('scenario')`
> > → Step 3 key-gated `SeedScenarioCard.jsx` on the Roleplay page (+ history-title fix) → Step 4
> > mock-AI e2e `seed-scenario.spec.js`. HOW I WORK: plain layman terms, evaluate my choices &
> > recommend better, short time estimate before non-trivial steps, max-effort/no-shortcuts.
> > Standing permission to stage/commit/sync atomic verified units; main auto-deploys, confirm
> > READY after; refresh RESUME_HERE same commit. ONE feature this session.
> > START: baseline (git clean · test:run [was 486] · lint · prod READY) → **confirm Decision 1
> > (surface = Roleplay page vs ForYou; my default = Roleplay)** with me → verify `ai-proxy` edge
> > fn still ACTIVE → Step 1 (TDD). (B = bundle CC-BY validity list is now LOW priority — Wikidata
> > Tier-3 already covers it.)
>
> 2. *(done)* ~~Generative cloze~~ — shipped 2026-06-06 (see ✅ block above).
> 3. *(done)* ~~Mistake micro-drills~~ — shipped 2026-06-05 (see ✅ block above).
> Each kickoff is self-contained (points at MEMORY, this doc, the spec + plan).
> **Codebase-quality refactors are a SEPARATE later track** — NOT a prerequisite; the
> files these features touch are already healthy (Study.jsx is 180 lines). Strategy is
> now specced: `specs/2026-06-03-codebase-quality-strategy.md` — refactor-LAST (after
> features), test-coverage-FIRST (the store is barely tested directly), targets ranked
> (useStore.js slices #1, big page-components→hooks #2), behaviour-preserving + one
> slice per commit. Its cheapest standalone win = writing store characterization +
> migration tests (Step 2a) — high value, low risk, protects the features too. Detailed
> line-level store plan to be written just-before-execution (avoids staleness). Budget
> not a constraint — quality first.
>
> 🧭 **START HERE → `docs/sessions/2026-06-01-mid-select-to-card-shipped.md`** —
> the latest handoff (§6 has the paste-ready next-session prompt; §3 = what's next:
> verify "Saved" cards surface in Study, then pick ms↔en auto-direction (A) vs
> select-to-card Tier 2 highlights (B)). Speaking A+D 4/4 + select-to-card MVP both
> shipped + deployed (prod `main` @ `192326a`, Vercel READY). Older context below.
>
> 🧭 Prior arc → `docs/sessions/2026-05-31-friction-polish.md` — the
> 2026-05-31 friction-polish arc handoff (paste-ready next-session prompt in §6,
> queued work in §3). This arc is now **MERGED to `main` + DEPLOYED** (prod
> `main` @ `8064ba4`, Vercel READY, verified live): BYOK key-test fix, writing
> `alert()`→inline, #2 add-key nudge, #1 Practice hub, Speaking "stopped
> listening"+Resume+mic pre-prompt, abandoned-session duration cap
> (`lib/duration.capDuration`), a **systemic light-mode contrast fix**
> (re-anchored `color` on the App.jsx theme wrapper — bare headings were
> near-invisible on light cards), and a **SPA deep-link rewrite** (`vercel.json`
> — sub-routes like `/practice` `/speaking` used to 404 on hard-load/bookmark).
> Both fixes were found via the deploy smoke test and verified on prod.
>
> **2026-06-01 UPDATE:** friction #5 is **BUILT + DEPLOYED** (prod `main` @
> `a500007`, Vercel READY) and the **Speaking silent-failure** Kheshav hit on prod
> is **FIXED** (also deployed). See the 2026-06-01 session block immediately below. The deeper Speaking *direction* (real Malay pronunciation scoring) is
> specced and awaiting Kheshav's pick:
> `docs/superpowers/specs/2026-06-01-speaking-reliability-and-direction.md` §6.
>
> **2026-06-01 (late) UPDATE:** **Speaking A+D is now 4/4 COMPLETE + DEPLOYED.**
> Step 4 — **record + playback** (`9b2b8a4`) — shipped: `MediaRecorder` captures
> the spoken answer in parallel with STT, and RESULTS gains a "Listen back" card
> (replay yourself + "Play model" TTS, model = AI improvedTranscript when present
> else the topic prompt). Works with zero transcription — the real free
> pronunciation-practice value on the ms-MY backend that returns nothing. All A+D
> states eyeballed light+dark via `tests/e2e/speaking-eyeball.spec.js` — no visual
> bugs. **357 vitest (+5) · 0 lint · build clean.** Deployed (prod `main`, Vercel
> READY).
>
> **2026-06-01 (latest) UPDATE:** **select→translate→add-to-cards (Tier-1 MVP)
> BUILT + SELF-TESTED + DEPLOYED.** Select any word/short phrase on a reading
> surface → a transient popover translates it (reusing `translate.js`, ms→en) +
> 🔊 + **Save** → adds a `{ m, e, ex, t:'Saved' }` card to the FSRS deck (deduped).
> New `src/lib/selectionToCard.js` (pure `normalizeSelection`/`isCardWorthy`, +9
> tests) + `src/components/SelectionToCard.jsx` (mounted once in `Layout`,
> `document`-level selection listener, bails inside inputs/editables and any
> `[data-no-select-card]` — header + bottom nav are opted out). `translate.js` is
> **lazy-imported** on first selection so it stays out of the eager Layout bundle
> (index back to ~426 KB). **Proven end-to-end in Playwright**
> (`tests/e2e/select-to-card.spec.js`, 4 tests): select→translate→Save lands a
> real card in the store + dupe path + light-mode eyeball + opt-out guard.
> **366 vitest (+9) · 0 lint · build clean.** Deployed (prod `main`, Vercel READY).
> Tier 2 (persistent cross-site highlight via CSS Custom Highlight API) is a
> **separate later plan** — see the design spec §8.
>
> **2026-06-02 UPDATE:** **select-to-card direction (A) + show-example (#2) DONE
> (not yet committed/deployed — awaiting Kheshav's go).** De-risk check first:
> confirmed `t:'Saved'` cards DO surface for review everywhere — the deck picker
> is built dynamically from `cards.map(c => c.t)` (`useStudySession.js:64`), Study's
> "All"/Saved queues + Dashboard "Due Now" both run `getDueCards`, and new cards
> are due immediately (`createEmptyCard` due=now). **No bug.** Then built:
> (A) **ms↔en auto-direction** — new pure `detectLanguage(text, {context,pageLang})`
> in `selectionToCard.js` (+6 TDD tests). Malay-first: DEFAULTS to `ms`, only flips
> to `en` on real English signal (suffix `-ing/-tion/-ly/...` or a function-word, or
> a decisive English **context sentence** — richer than a lone word, and needs no
> per-surface lang wiring). `SelectionToCard.jsx` now detects source at selection,
> translates the right way, pronounces the **Malay** side in `ms-MY`, dedupes by the
> Malay word, and files cards Malay-front (`m`/`e` correct) regardless of which
> language was selected. (#2) the **example sentence now shows in the popover** with
> the selected term underlined (encoding-in-context at capture time). E2E: new
> English-direction test added → **5 select-to-card tests pass**; eyeballed light+dark
> (`saved-dark`, `translated-light`, `english-direction-dark`). **372 vitest (+6) · 0
> lint errors (3 pre-existing warnings) · build clean.**
>
> **2026-06-02 (Tier 2) UPDATE:** **select-to-card Tier 2 persistent highlights
> BUILT + DEPLOYED.** Kheshav used the corrected MVP, found it useful → greenlit Tier
> 2. Saved words (the `'Saved'` deck, Malay side only) are now subtly underlined +
> tinted wherever they appear in page prose, on every reading surface. Built with the
> **CSS Custom Highlight API** (`CSS.highlights` + `::highlight(saved-words)` in
> `index.css`) — paints ranges WITHOUT adding DOM nodes, so it never fights React or
> breaks text selection / the select-to-card popover. New pure `findSavedWordMatches`
> in `src/lib/savedWordHighlight.js` (+8 TDD tests: whole-word boundaries, multi-word
> phrases, longest-match-wins, reduplication, regex-safety). New
> `src/hooks/useSavedWordHighlights.js` (mounted once in `Layout`): re-highlights on
> route change + saved-set change, and a debounced `MutationObserver` on `<main>`
> catches lazy/async content (e.g. AI comprehension questions). Feature-detects +
> degrades to a no-op where the API is absent; skips inputs/buttons/`[data-no-highlight]`;
> 2000-range safety cap. E2E `tests/e2e/saved-word-highlight.spec.js` (3 tests): paints
> ranges in dark + light (eyeballed — clean underline, readable both themes) + proves
> the popover still opens on a highlighted word. **380 vitest (+8) · 0 lint errors (3
> pre-existing warnings) · build clean.**
>
> **2026-06-02 (Tier 2 setting) UPDATE:** **highlight Off/Saved/All setting SHIPPED.**
> New `highlightMode: 'off' | 'saved' | 'all'` store field (STORE_VERSION **22**,
> migration defaults existing users to `'saved'` = no behaviour change) + `setHighlightMode`.
> Pure tested `savedWordsForMode(cards, mode)` in `savedWordHighlight.js` (+4 tests).
> `useSavedWordHighlights` reads the mode; Settings.jsx gains a 3-way segmented control
> ("Highlight saved words: Off / Saved / All") by the other accessibility toggles. E2E
> extended (+1): Off clears, All catches non-`Saved`-deck words. **384 vitest (+4) · 0
> lint errors · build clean.** STILL OPEN (lower value / higher cost — flagged to
> Kheshav): **tappable highlights** (tap a highlighted word → pronounce + meaning;
> overlaps select-to-card, needs click hit-testing) — first PARKED, then **REVISITED
> 2026-06-02 and APPROVED** once reframed as tap-to-*review* (not another save path)
> + budget de-prioritised for quality. Now **specced + planned** — see the banner at
> the top of this file and `docs/superpowers/{specs,plans}/2026-06-02-tappable-highlights*`.
>
> **2026-06-02 (dedupe fix) UPDATE:** Kheshav (on `all` highlight mode) noticed the
> popover still offered "Save" for already-highlighted/saved words. Root cause: the
> existence check looked only at the `'Saved'` deck and only fired *after* clicking
> Save. Fixed in `SelectionToCard.jsx`: now recognises a word that's already a card in
> **any** deck (case-insensitive) and shows **"Already in your flashcards"** up-front
> (no Save offered, no cross-deck duplicate). E2E updated. **384 vitest · 0 lint errors
> · build clean.**

> ## 📌 LATEST SESSION (2026-06-01) — friction #5 (empty-state CTAs) built + Speaking silent-failure fixed
>
> Branch `feat/friction-polish`, **MERGED to `main` + DEPLOYED** (prod `main` @
> `a500007`, Vercel deployment `dpl_2cpjk5…` state READY, target production —
> verified via Vercel API). **347 vitest pass (+7) · 0 lint errors (3 pre-existing
> warnings) · build clean (index 420.6 KB / 135.4 KB gz).** 10 commits total.
>
> **Friction #5 — empty-state CTAs (3 commits, `f9e4908` → `f5eea06` → `31636d8`):**
> Spec `docs/superpowers/specs/2026-05-31-empty-state-ctas-design.md`. KEY FINDING:
> the spec's §1 audit was **stale** — 4 of the 5 "consistency-pass" surfaces
> (Comprehension, Listening, Word Families, Exam Rehearsal) had ALREADY grown
> intro lines since the audit, so adding `SurfaceIntro` everywhere would have
> *duplicated* copy. Real remaining gaps were just **Writing** + **Grammar**.
> Shipped:
> - `src/components/EmptyState.jsx` — reusable `{icon,title,body,cta}` extracted
>   from the MistakeJournal gold-standard empty state (MistakeJournal refactored
>   to use it, byte-identical output). Study's empty deck now uses it + gained the
>   missing "Import words" → `/import` CTA.
> - **Writing** (the one real gap): first-visit "what this does" intro under the
>   `<h2>` + **"New here? Try a sample."** which drops a deliberately mid-band
>   draft (`src/data/writingSamples.js`, EN + MS — learner errors so the fixes
>   panel actually fires, NOT the band-6 exemplars) into the composer.
> - **Grammar**: added the framing line every other list surface already had.
> - `SurfaceIntro` component was **deliberately NOT built** — codebase convention
>   is inline `<p>` intros; a 1-use component would've diverged. Voice: English-only
>   (matches all existing surface intros). Did NOT touch the 4 already-framed surfaces.
>
> **Speaking silent-failure FIX (`45828b5`):** Kheshav's live report — mic "kept
> recording", no "stopped listening", no Resume, "always thought I said nothing".
> Root cause: Web Speech `ms-MY` can RUN but transcribe nothing (no results, no
> error), and the existing Resume state only fired when `onend`'s restart *threw*.
> Fixed with: (1) **no-capture watchdog** (mic on + 0 words after 6s →
> honest "Not hearing you"), (2) **`describeSpeechError()`** pure helper (TDD +7)
> mapping not-allowed/audio-capture/language-not-supported/network/unknown to
> actionable copy; `onerror` now stops+explains+opens fallback, (3) **type-what-
> you-said fallback** textarea (auto-opens on no-capture/error, always reachable)
> that still produces the full band + fixes (grading is text-based). Spec +
> research + the bigger-direction decisions:
> `docs/superpowers/specs/2026-06-01-speaking-reliability-and-direction.md`.
>
> **LATER 2026-06-01 (post-eyeball, +3 commits → 8 total on branch):**
> - **Eyeballed** friction #5 in light AND dark via Playwright screenshots — no
>   visual bugs (Writing intro + sample-loads, Grammar intro, Study "Import words"
>   CTA, MistakeJournal empty unchanged). Speaking RECORD fallback couldn't render
>   headless (no SpeechRecognition) — needs live re-test.
> - **CI fixed (`5009630`):** removed the broken+redundant `amondnet/vercel-action`
>   deploy jobs (failed every run for a missing `VERCEL_TOKEN`; Vercel's native Git
>   integration is the real deployer). CI = lint+build+test now.
> - **Bilingual intros (`f34de50`):** Writing + Grammar intros follow the language
>   toggle (Kheshav's §4 voice decision). His copy notes finally seen + matched.
> - **Speaking direction DECIDED:** no budget / no monetization → paid STT (Azure
>   ms-MY, Whisper) is OUT. Path = **A+D ($0)**, built properly later. Recorded in
>   the speaking spec §5a + [[project_invariants]] memory.
> - **NEW spec — universal select→translate→add-to-cards** (UDL-grounded research +
>   design): `docs/superpowers/specs/2026-06-01-universal-select-to-card-design.md`.
>   Kheshav to pick MVP scope (§9); recommended Tier-1 popover first (~45–60 min).
>
> **⬅️ OPEN — Kheshav's calls (NOT to build without a pick):**
> - ✅ **Deployed** 2026-06-01 (prod `main` @ `a500007`, Vercel READY).
> - ✅ **Speaking re-tested live by Kheshav:** type fallback + AI grade work; spoken
>   Malay still captures nothing (Chrome record dot **flickers** = `ms-MY` backend
>   returns nothing + auto-restart loop; mic is fine). Heuristic grade felt
>   inaccurate (pace metrics are meaningless for typed answers). See speaking spec §4a.
> - **Speaking A+D (spec §4b) — 3 of 4 DONE on branch, NOT deployed/eyeballed:**
>   ✅ typed-aware grading + auto-AI-when-keyed (`319f4bd`); ✅ first-class "Type my
>   answer" PREP choice + ✅ mic-flicker loop-break (`18660ae`). **351 vitest · 0
>   lint · build clean.** **REMAINING = Step 4: record + playback** (MediaRecorder
>   → replay yourself vs the model TTS; ~30–45 min) — the marquee, works without STT.
>   **TODO before deploy:** eyeball Speaking light+dark (PREP Speak/Type buttons;
>   pure-type RECORD has no transcript card; flicker stops after ~3 empty cycles;
>   typed band shows "N words · typed" + "· quick estimate" + auto AI for key-holders),
>   then deploy. NOTE: usage ran out mid-session — Step 4 not started.
> - **OR select→translate→add-to-cards** — executable plan ready (defaults resolved):
>   `docs/superpowers/plans/2026-06-01-universal-select-to-card.md` (§6 paste-ready
>   kickoff). MVP ~45–60 min.
>
> ## 📌 LATEST SESSION (2026-05-31) — BYOK key-test false-negative fix + writing alert→inline (#3)
>
> Branch `feat/friction-polish`. **324 vitest pass · 0 lint errors · build clean.**
> - **Fixed (BYOK key test):** the Settings "Test key" button reported "Invalid
>   or unreachable" for valid keys. Root cause: it proxied a *chat completion*
>   through the flaky `:free` models (5-token budget; `deepseek-r1` is a
>   reasoning model that can return empty `content`), so a valid key failed
>   whenever those models were rate-limited/down. Now uses new
>   `verifyOpenRouterKey()` → `GET /api/v1/key` (auth only, 200=valid /
>   401=invalid), independent of model availability. +4 tests in `byok.test.js`.
> - **Fixed (#3, from prior session's WIP):** writing-grade `alert()` → inline
>   `role="status"` notice (`useWritingEvaluator.js` `analyzeError` state +
>   `Writing.jsx` render). Both `alert()`s gone; verified complete this session.
> - **Shipped (#2, AI-quota → BYOK nudge):** new `AddKeyNudge` component
>   (`src/components/AddKeyNudge.jsx`) + TDD'd pure helper
>   `shouldShowAddKeyNudge` (`src/lib/addKeyNudge.js`, +5 tests). Self-hides for
>   key-holders; placed on **Roleplay** (quota banner), **CikguBot** (above
>   composer when `getRemainingCalls()===0`), **Writing** (under `analyzeError`
>   when a new `aiGradeUnavailable` flag is set). Deep-links `/settings#byok`,
>   which now scrolls to + focuses the key input (reduced-motion aware).
>   Telemetry: `add_key_nudge_shown`/`_clicked` `{ surface }`. Design +
>   research basis (UDL 3.0 / ADHD-UX / NN-g): `docs/superpowers/specs/2026-05-31-add-key-nudge-design.md`.
>   **329 vitest pass · 0 lint errors · build clean.**
> - **PENDING human eyeball (#2):** with NO key, force AI-unavailable (use up the
>   50/day, or an EN roleplay) → nudge appears; tap → lands focused on the key
>   field; add a key → nudge disappears; check dark + light.
> - **Shipped (#1, Practice hub):** the 5th nav slot is now **Practice** →
>   a real `/practice` page (`src/pages/Practice.jsx`, lazy) that replaces the
>   old "More" drawer. Surfaces grouped by exam skill from a pure config
>   (`src/lib/practiceSurfaces.js`) with a "nothing-gets-lost" guard test
>   (`practiceSurfaces.test.js`, +4) + e2e smoke (`tests/e2e/practice-hub.spec.js`).
>   A few cheap status cues (Study "N due", Mistakes "N to fix", Exam "N% ready").
>   `Layout.jsx`: More drawer + `MORE_ITEMS` removed; mistake badge moved to the
>   Practice tab. Design: `docs/superpowers/specs/2026-05-31-practice-hub-design.md`.
>   **333 vitest pass · 0 lint errors · build clean · e2e green.**
> - **Next (this arc, each atomic):** Speaking "stopped listening" visible state +
>   mic pre-prompt (improvements.md C / friction #6); then abandoned-session
>   `durationSec` cap (improvements.md B). DEFER friction **#5** (per-surface
>   empty-state CTAs) to its own session — multi-surface, too big to rush.

> ## 📌 LATEST SESSION (2026-05-30, +review) — BYOK review pass + honest routing decision
>
> Full review of the day's work. **320 vitest pass · 0 lint errors · build
> clean.** Outcome:
> - **Fixed (committed `0521704` / WritingTutor):** the coach output now strips
>   reasoning `<think>` blocks/fences (`cleanCoachText`, +4 tests); and the
>   **Writing tutor's default Gemini chat is now routed through `callTextAI`**
>   — a key-holder who left the tutor on its default provider previously still
>   hit the server. Closed.
> - **DELIBERATELY NOT routed — `fetchAIGrade` (English auto writing band score,
>   `src/lib/gemini.js`):** it uses Gemini's strict-JSON mode
>   (`responseMimeType`), which OpenRouter lacks, and `gemini.js` importing
>   `aiText.js` would be a **circular import** (`aiText` already imports
>   `gemini`). Routing it would trade reliable JSON grading for flakier
>   free-model text grading (the caller even `alert()`s on parse failure) and
>   need a module refactor. Principled exception: it stays on the server. If
>   ever wanted: extract the prompt-building into a `writingGrader.js` that
>   imports `callTextAI` (breaks the cycle) + robust JSON extraction + pick a
>   non-reasoning free model. The user-facing claim is still true — the writing
>   *tutor* is routed; only the silent auto band-score isn't.
> - Minor known trade-offs (not bugs, logged for honesty): `speaking_progress_shown`
>   telemetry won't fire if a user crosses the ≥2 threshold mid-session (fires
>   next load); `callTextAI` falls back to server Gemini on a key-holder's
>   transient OpenRouter error (tiny owner-cost leak, deliberate); Settings
>   "Test" persists the key as a side effect.
> - Pre-existing UX wart (separate follow-up): `useWritingEvaluator.js` uses a
>   browser `alert()` on AI-grade failure — worth replacing with the inline
>   error path.
>
> ## 📌 LATEST SESSION (2026-05-30, +byok) — Bring-Your-Own-Key v1 SHIPPED (on branch)
>
> **0 lint errors / 3 pre-existing warnings (none added) · 316 vitest pass
> (+9) · build clean (index 423.5 KB / 135.9 KB gz — UNCHANGED from the
> speaking merge; all AI plumbing rides lazy chunks).** Built TDD on branch
> **`feat/byok`**. Spec: `docs/superpowers/specs/2026-05-30-byok-design.md`.
>
> **What it does:** a user pastes their own **OpenRouter** key in Settings →
> ALL client AI (Cikgu, Writing tutor, speaking grade, comprehension, + the new
> Speaking AI-coach summary) runs on THEIR key, billed to them. Free for the
> owner. Also unlocked the previously-inert AI-coach button in the Speaking
> Progress widget.
>
> **Why OpenRouter only (decided WITH the user):** Gemini here is server-proxied
> (`/api/gemini`), so a user can't BYO a Gemini key without re-exposing a secret.
> OpenRouter is browser-direct → clean BYOK. So instead, when a user sets their
> OpenRouter key we ROUTE the two Gemini-only features through it too.
>
> **Architecture (store untouched, no migration, no schema change):**
> - `src/lib/openrouter.js` — user-key layer in its OWN localStorage entry
>   (`igcse-openrouter-key`), NEVER in the store ⇒ never in the cloud blob.
>   `resolveKey()` = user key → env fallback; `hasUserOpenRouterKey()` is the
>   strict opt-in gate.
> - `src/lib/aiText.js` (NEW) — `callTextAI`: routes to OpenRouter ONLY when a
>   user key is set (else server Gemini, unchanged), falls back to Gemini on any
>   OpenRouter error. No-regression by construction.
> - `src/lib/speakingGrader.js` `aiGrade` + `src/pages/Comprehension.jsx`:
>   `callGemini` → `callTextAI`.
> - `src/lib/speakingCoach.js` (NEW) — `buildCoachPrompt` (pure) +
>   `speakingCoachSummary`.
> - `src/pages/Settings.jsx` — `OpenRouterKeyField`: password input + Save /
>   **Test key** (✓/✗) / Clear + "stored only in this browser" copy.
> - `src/components/dashboard/SpeakingProgress.jsx` — `aiCoachAvailable()` now =
>   `hasUserOpenRouterKey()`; live coach button (loading/done/error states).
> - Tests: `byok.test.js` (key layer + buildCoachPrompt) + `aiText.test.js`
>   (routing + fallback), +9.
>
> **NOT done / next:**
> - **Manual browser check** — paste a real OpenRouter key in Settings, hit
>   Test (✓), then on the Speaking Progress card tap "Get an AI coaching
>   summary". Couldn't run a live key from here.
> - Free models can return messy JSON; speaking grade & comprehension already
>   fall back gracefully (heuristic / error msg), but watch quality on a user
>   key vs Gemini.
> - Deferred: BYO Gemini key (rejected — server-proxied), multi-provider matrix.
> - **TODO for you:** drop your real Vercel URL into README.md + USER_GUIDE.md
>   (placeholders left), and run the self-guarding `user_profiles` drop
>   migration in Supabase.
>
> ## 📌 LATEST SESSION (2026-05-30) — Speaking Progression v1 SHIPPED (on branch)
>
> **0 lint errors / 3 pre-existing warnings (none added) · 307 vitest pass
> (+23) · build clean (index 423.5 KB / 135.9 KB gz; SpeakingProgress own lazy
> chunk 7.6 KB / 3.0 KB gz).** Brainstormed → specced → planned → built inline
> with TDD on branch **`feat/speaking-progression`** (NOT yet merged — see
> finishing options at end of session).
>
> **What shipped (the "I'm getting better" speaking loop):** a Dashboard
> **SpeakingProgress** widget — band-trend headline (recent avg + ↑/→/↓ from
> first + best) with an inline-SVG sparkline at ≥5 attempts, a 3-state
> recurring-weakness readout (transitional / balanced-positive / top-gap), and
> 2–3 tappable "due for another go" chips (weak band≤3 OR stale ≥3 days,
> excluding today) that deep-link into `/speaking` via `location.state.topicId`.
> Bilingual + per-language scoped (MS/EN toggle only when both have ≥2 attempts).
>
> **Architecture (deliberately $0 / low-risk):**
> - `src/lib/speakingGrader.js` — NEW pure `weaknessFlags(h, topic)` (single
>   source of truth for "what was weak"; reads only metrics the heuristic
>   already computed).
> - `src/pages/Speaking.jsx` — logs exact `weak: [...]` flags per attempt
>   (additive JSONB on the speaking record — safe, no schema change).
> - `src/lib/patterns.js` — 3 NEW pure helpers: `speakingBandSeries`,
>   `recurringSpeakingWeakness` (reads stored `weak`; old records w/o it just
>   don't count), `topicsDueForReattempt`. Stays dependency-light — does NOT
>   import grader/gemini (keeps the eager Dashboard bundle clean).
> - `src/components/dashboard/SpeakingProgress.jsx` — NEW self-contained widget.
> - `src/pages/Dashboard.jsx` — lazy import + mount after WorstTurnWidget.
> - `src/lib/__tests__/speakingProgress.test.js` — 23 unit tests (4 functions).
>
> **NO STORE_VERSION bump, no migration, no schema change, no new dependency,
> no new Gemini calls.** Spec: `docs/superpowers/specs/2026-05-30-speaking-progression-design.md`.
> Plan: `docs/superpowers/plans/2026-05-30-speaking-progression.md`.
>
> **Code-review catch (fixed):** default language scope now prefers the
> most-recent language only if it has ≥2 attempts, else falls back to whichever
> qualifies — so a student with rich MS history + one recent EN dabble isn't
> shown a hidden/empty widget.
>
> **NOT done / next candidates:**
> - **Manual browser eyeball** — automated gates green; worth a look on an
>   account with ≥2 speaking attempts (trend at ≥3, sparkline at ≥5, 3 weakness
>   states, dark+light). Could not run a real browser from this session.
> - **Feature B — BYOK** (own next spec): one optional OpenRouter key in
>   Settings → unlocks the inert `aiCoachAvailable()` AI-coach button already
>   stubbed in the widget. Then the **AI coach summary** lands.
> - Deferred by design: full per-topic mastery model, timed Paper-3 oral mock,
>   dailyPlan deep-link of the exact due-topic.
> - User action still open from prior session: run the self-guarding
>   `user_profiles` drop migration in Supabase when ready.
>
> ## 📌 HANDOFF (2026-05-30 11:13) — clean checkpoint, Speaking is next
>
> Nothing in flight; everything committed + verified green (HEAD `9a7ccc8`,
> 284 vitest pass, lint 0 errors, tree clean). Snapshot taken to resume cheaply
> and tee up the **Speaking pillar brainstorm**. Full handoff + paste-ready
> next-session prompt: **`docs/sessions/2026-05-30-mid-clean-checkpoint-speaking-next.md`**
> (§6 is the kickoff prompt). Next work starts from
> `docs/superpowers/specs/2026-05-29-speaking-pillar-opportunity-brief.md` §3.
> User action item still open: run the self-guarding `user_profiles` drop
> migration in Supabase when ready (committing it did NOT execute it).
>
> ## 📌 LATEST SESSION (2026-05-29, +backlog2) — PWA auto-update, Row 7 hint, user_profiles drop prepared
>
> **0 lint errors / 3 pre-existing warnings (none added) · 284 vitest pass ·
> 17 Playwright pass · build clean (index 421.6 KB / 135.2 KB gz, sw.js
> regenerated).** User picked these three (skipped Speaking + /understand).
>
> 1. **PWA auto-update — DONE.** `vite.config.js` `registerType: 'prompt' →
>    'autoUpdate'` + `skipWaiting: false → true` (autoUpdate forces
>    clientsClaim+skipWaiting anyway; set explicitly for clarity; verified via
>    Context7). New deploys now activate + reload automatically — PWA users no
>    longer swipe-kill + reopen. `PWAUpdateToast.jsx` simplified: in autoUpdate
>    mode `needRefresh` never fires, so the "New version available — Reload"
>    branch was removed; it now only registers the SW, keeps the hourly
>    `registration.update()` check, and shows the one-time offline-ready toast.
>    **TRADEOFF to know:** an auto-reload can interrupt a student mid-essay
>    (textarea text isn't persisted until submit). Deploys are infrequent so
>    low-probability, but if it ever bites, the refinement is "reload on next
>    navigation instead of immediately" (needs custom SW-controllerchange code).
> 2. **Row 7 EN-roleplay hint — DONE.** `Roleplay.jsx` EN-scenario,
>    AI-quota-exhausted fallback was a dead-end message; now adds a
>    "Drill grammar instead →" link (added `useNavigate`, routes to `/grammar`).
>    Near-zero value (invite-only users rarely hit EN quota) but no longer a
>    dead end.
> 3. **user_profiles cleanup — INVESTIGATED + migration PREPARED, NOT RUN.**
>    Confirmed `user_profiles` is referenced nowhere in `src/` or
>    `supabase/*.sql` (app uses `profiles` exclusively); it survives only in
>    historical design docs. Wrote `supabase/migrations/20260529_drop_vestigial_user_profiles.sql`
>    — a SELF-GUARDING drop that only removes the table IF EMPTY (raises a notice
>    and refuses if it has rows), so it can never silently destroy data.
>    **ACTION FOR YOU:** run it manually in the Supabase SQL editor when ready
>    (committing it does NOT execute it). Could not verify the live row count
>    from here (no DB creds in session) — the guard handles that safely.
>
> **Still parked (need input / design):** AuthGuard `cardDelta` tiebreaker
> (needs brainstorm), `/understand` re-run (token-heavy, deferred), Speaking
> pillar (brainstorm together — see the opportunity brief).
>
> **Verify PWA after this deploys:** hard-refresh once to pick up the new SW;
> thereafter new deploys should apply WITHOUT a manual swipe-kill.
>
> ## 📌 LATEST SESSION (2026-05-29, +backlog) — cleared the safe no-input backlog
>
> **0 lint / 3 pre-existing warnings · 284 vitest pass · 17 Playwright pass ·
> build clean.** Follow-on to +dailyplan; knocked out the parked items that
> needed neither brainstorming nor user input.
>
> 1. **Telemetry Option A — DONE.** `trackEvent` now enriches CLOUD events
>    (not the local copy) with `session_id` (one UUID per page load, via
>    `crypto.randomUUID` + fallback) and `user_id`. `enableCloudTelemetry(userId)`
>    gained the id param; `AuthGuard` passes `user.id`; `disableCloudTelemetry`
>    clears it. `telemetry_events.payload` is JSONB ⇒ additive, **no schema
>    change**. The First-Run / Daily-Plan funnels are now queryable by session
>    and attributable to a user.
> 2. **Dead-code cleanup — DONE (partial, deliberately).** Removed the inert
>    `isHydratingCloud` field (set in 3 places in `hydrateCloudData`, read
>    nowhere since the Layout spinner branch was deleted in Round 3): dropped
>    the init, the two `set()`s, the success-object key, and its `SYNC_OMIT`
>    entry. Behaviour-preserving (nothing branched on it). The Layout
>    "Syncing your progress" spinner branch was already gone — nothing to do.
> 3. **Doc drift — DONE.** CLAUDE.md verification note bumped ~128 → ~135 KB gz
>    to match reality.
>
> **Deliberately NOT done (need input / carry risk — left for you):**
> - PWA `registerType:'autoUpdate'` — deferred-by-choice ("only if cache
>   friction recurs"); changes update UX, your call.
> - `user_profiles` vestigial-table cleanup — touches PROD DB, needs confirm.
> - Row 7 EN-roleplay quota-fallback hint line — near-zero value (invite-only
>   users never hit the EN quota), borderline copy judgment.
> - AuthGuard `cardDelta` tiebreaker redesign — needs design/brainstorm.
> - `/understand` re-run — token-heavy, you opted to defer.
>
> ## 📌 LATEST SESSION (2026-05-29, +dailyplan) — Daily Plan spine ("what should I do today?") shipped
>
> **0 lint errors / 3 pre-existing warnings · 24 files / 284 vitest pass (+22) ·
> 17 Playwright pass (+3) · build clean (index 422 KB / 135 KB gz).**
>
> First product/learning feature after the cloud-sync war. Brainstormed +
> specced + built autonomously (user asleep). Spec:
> `docs/superpowers/specs/2026-05-29-daily-plan-spine-design.md`.
>
> **Problem it solves:** the Dashboard already renders eight independent signals
> (streak, getStudyPlan, getChallengeStats, getFixUpQueue, due-now,
> getExamReadiness, getNextExamDue, recent-performance) — but the student has to
> scan all eight and self-prioritise. The app had the intelligence, not the
> direction. This adds ONE ordered, time-budgeted "do these 3 things next" queue
> at the top of the Dashboard that routes into the existing pages.
>
> **Architecture (deliberately low-risk):**
> - `src/lib/dailyPlan.js` — NEW pure engine. `buildDailyPlan(inputs, now)` →
>   ordered task list; `deriveTaskDone`, `deriveReadiness`, `isSameLocalDay`
>   exported. Reads already-computed getters; **no store import, no React, no
>   module-scope Date.now()**. Priority: overdue review → top fix-ups → exam
>   rehearsal (if due) → ONE rotating skill (speaking/writing/grammar by weakest
>   band, novelty-aware) → foundation. Phase-aware (build/strengthen/review/final
>   mirrors getStudyPlan), comeback-aware, time-budgeted by dailyGoalLevel.
> - `src/components/dashboard/DailyPlan.jsx` — NEW. Self-contained (reads own
>   slices; getters called in body per the documented pattern; `now` via
>   `useMemo(()=>Date.now(),[])` for React-19 purity). Readiness bar with
>   graceful degradation (band → card-maturity → "do a rehearsal" prompt).
>   Telemetry Enhanced-only (`daily_plan_shown/_task_clicked/_completed`).
> - `Dashboard.jsx` — one import + `<DailyPlan />` mounted right after
>   `<FirstRunCard />`.
>
> **KEY DESIGN DECISIONS (all deliberate — revisit if you disagree):**
> 1. **Zero new persisted state, NO STORE_VERSION bump.** "Done today" is
>    *derived* from existing history timestamps (challenge counters / card
>    `last_review` / mistakes `lastReviewedAt` / speaking·writing·exam `ts`).
>    Avoids touching useStore.js, the most regression-prone file.
> 2. **Synthesis, not a competing daily counter.** Does NOT duplicate
>    `dailyChallenge`; it presents + routes, the challenge keeps owning XP.
> 3. **Tier-safe.** Works for Static-tier users (no dailyChallenge / no exam
>    attempts / no exam date) — degrades gracefully, never throws.
> 4. **Gate = "has reviewed at least once"** (not just deck>0), so it hands off
>    cleanly from FirstRunCard with no double-CTA. (Refinement over the spec's
>    literal `cards.length>0` gate — discovered during integration.)
> 5. **Review routes to `/smart-study`** (interleaved) when ≥4 due, else
>    `/study`. One skill/day, today-only (no calendar). YAGNI.
>
> **NOT YET DONE / next-session candidates:**
> - **Manual browser verification** — automated gates are green but I could not
>   eyeball it (user asleep). Worth a quick look: review some cards → reload
>   Dashboard → the review row should show ✓; check dark+light.
> - **Speaking pillar spec** — user wants to brainstorm this together (better
>   with their input; not built solo). Recommended next.
> - CLAUDE.md size note says ~128 KB gz; reality ~135 KB gz (additive). Minor
>   doc drift, not worth a turn.
>
> ## 📌 LATEST SESSION (2026-05-29, +netstatus) — heal stale 'offline' flag that blocked queue drain
>
> **0 lint / 3 pre-existing warnings · 22 files / 262 vitest pass (+4) ·
> build clean.**
>
> Found during live verification of the deadlock fix. The 'syncing'
> deadlock heal WORKED (flush resumed 11:16 vs frozen 03:50), but the
> queue still wasn't draining: telemetry showed an 11:16 flush returning
> `{error:null, processed:0, remaining:143}` — the signature of
> processSyncQueue's OFFLINE early-return — while hydrate + blob push
> (both network-dependent) succeeded at 13:19. Diagnosis: `sync.networkStatus`
> was stuck 'offline' (stale persisted flag); the flush `isOnline` check and
> the Layout trigger both gate on `networkStatus === 'online'`, so the queue
> couldn't drain despite real connectivity. Same stale-persisted-flag class
> as the 'syncing' deadlock — the other flag.
>
> **Fix:** extended `reconcileSyncStatusOnLoad(sync, isOnline)` — when the
> caller is online (navigator.onLine), heal a stale `networkStatus:'offline'`
> → 'online'. `reconcileSyncOnHydrate` now passes `navigator.onLine`. Same
> rehydration hook, +4 tests. Self-heals on the next reload.
>
> ✅ **VERIFIED 2026-05-29 14:10:** after the user reloaded the new build,
> `sync_flush_succeeded` resumed (latest 14:10, payload `{processed:2,
> remaining:0}`) — queue drains to empty, no new failures since 11:16,
> sync_events climbing. The whole sync subsystem is confirmed working
> end-to-end (review → enqueue → flush → table). No known open sync items.
>
> ## 📌 LATEST SESSION (2026-05-29, +tiebreak) — reliable lastMutationAt sync tie-break (defect 3 done)
>
> **0 lint errors / 3 pre-existing warnings · 22 files / 258 vitest pass
> (+5) · build clean. STORE_VERSION 20 → 21.**
>
> Closed the deferred AuthGuard defect 3. The newer-wins tie-break used
> `cloud.updated_at` (blob write time) vs `localState.lastStudyDate` (a
> coarse day-string) — apples-to-oranges, so cloud could wrongly overwrite
> newer local blob-only fields (streak / XP / settings / identity).
>
> **Fix:** new `lastMutationAt` field bumped on every mutation in
> `enqueueSyncEventAction` (the funnel every sync-relevant mutation passes
> through). AuthGuard tie-break now compares `localState.lastMutationAt`
> vs `cloud.updated_at` — both "last changed" wall-clocks. STORE_VERSION
> 20→21; migration defaults `lastMutationAt` to `now()` so returning users
> push-not-restore on their first post-migration sign-in (no clobber of
> existing local fields). Auto-rides the cloud blob (whole-state push);
> exportData left alone (sync-internal timestamp).
>
> Tests: +5 — enqueue stamps lastMutationAt, v21 migration adds it +
> bumps version (`store/__tests__/syncEnqueue.test.js`), tie-break uses
> lastMutationAt not lastStudyDate (`components/__tests__/authGuard.test.js`).
>
> **The sync subsystem is now fully hardened — no known open sync items.**
>
> ## 📌 LATEST SESSION (2026-05-29, +authguard) — stop restoreFromCloud dropping the queue / racing on cards
>
> **0 lint errors / 3 pre-existing warnings · 22 files / 253 vitest pass
> (+3) · build clean.**
>
> Hardened `AuthGuard.handleSignIn`'s `restoreFromCloud`. Two silent
> data-loss bugs, both from `setState({ ...cloud.state, ... })`:
> 1. **Queue-drop:** `cloud.state.sync` is sanitized to `queue: []` by
>    `pushStateBlob`, so the shallow setState overwrote the live queue —
>    un-flushed events (mistakes / grammar / streak / study_minutes /
>    writing+speaking increments) were dropped on any cloud-wins sign-in.
> 2. **Card race:** it wrote `cards` while the concurrent fire-and-forget
>    `hydrateCloudData` ALSO wrote `cards` (key-based union) — a
>    nondeterministic winner that could undo the union.
>
> **Fix:** `restoreFromCloud` now destructures `cards / writingHistory /
> speakingHistory / sync` OUT of `cloud.state` and restores only the
> blob-only fields; `hydrateCloudData` is the sole writer of the
> per-table collections (union, never removes), and the device-local
> `sync` slice (queue) is preserved. No store-shape change, cardDelta
> heuristic untouched. +3 structural pins in
> `components/__tests__/authGuard.test.js`.
>
> **✅ DONE — defect 3 (fragile tie-break):** completed in the +tiebreak
> block above (lastMutationAt, STORE_VERSION 21). Original note kept for
> context: the equal-cards
> tie-break compares `cloud.updated_at` (blob write time, bumps every 5s)
> vs `localState.lastStudyDate` (a coarse date) — apples to oranges, can
> restore cloud blob-only fields over newer local ones. Lower severity
> (no card/queue loss). Proper fix: add `lastMutationAt` (bump in
> `enqueueSyncEventAction`, STORE_VERSION 20→21, migration default to
> `now()` so existing users push-not-restore on first sign-in) and
> tie-break on that vs `cloud.updated_at`. Held back from this commit to
> avoid a store migration in the most regression-prone file — its own
> surgical change.
>
> ## 📌 LATEST SESSION (2026-05-29, +deadlock) — heal stale 'syncing' that froze the queue
>
> **0 lint errors / 3 pre-existing warnings · 22 files / 250 vitest pass
> (+8) · build clean.**
>
> Found by a prod telemetry sweep (looking for OTHER silent failures
> after the user_cards fix): `sync_queue_enqueued` latest **08:39** but
> `sync_flush_started/_succeeded/_failed` all **frozen at 03:50** — the
> queue flush hadn't even been ATTEMPTED in ~5h while events kept piling
> up. Cards were masked (hydrate bulk-uploads the deck), but queue-only
> data (mistakes / grammar_reviewed / streak / study_minutes / writing &
> speaking increments) silently stopped reaching their tables.
>
> **Root cause:** the store persists the whole `sync` slice (no
> `partialize`), incl. `syncStatus`. A flush sets `syncStatus:'syncing'`
> (the concurrency guard); if the tab closes during the `await` before the
> reset, `'syncing'` gets persisted. On reload nothing can clear it —
> Layout's flush trigger and the store's retry both guard on
> `syncStatus !== 'syncing'`, and the manual Retry button is `disabled`
> while 'syncing'. Permanent deadlock from a single interrupted flush.
>
> **Fix:** new pure leaf module `src/lib/syncStatus.js` →
> `reconcileSyncStatusOnLoad(sync)` coerces a stale 'syncing' to 'pending'
> (queued work) / 'synced' (empty) — a flush can't survive a reload, so
> 'syncing' at load time is always stale. Wired via a `reconcileSyncOnHydrate`
> store action called from a NEW `persist.onRehydrateStorage` (runs before
> React mounts, so Layout's mount-flush sees the healed status and drains
> the queue). Leaf module is statically importable (syncEngine can't be —
> INEFFECTIVE_DYNAMIC_IMPORT).
>
> Tests: +5 unit (`lib/__tests__/syncStatus.test.js`) + 3 structural
> wiring pins (`store/__tests__/syncRehydrateGuard.test.js`, node-env
> source assertions like syncEnqueue.test.js). No STORE_VERSION bump
> (onRehydrateStorage runs regardless of version), no routes/Layout logic
> change.
>
> **Self-heals on deploy:** the user's live localStorage still holds
> 'syncing' until they reload the new build; then the queue backlog
> flushes. VERIFY post-deploy: reload → telemetry `sync_flush_started`
> resumes + writing_history/speaking_history counts climb.
>
> ## 📌 LATEST SESSION (2026-05-29, +hardening) — fail-fast on fatal sync errors (silent-failure guard)
>
> **0 lint errors / 3 pre-existing warnings · 20 files / 242 vitest pass
> (+9) · build clean (index 411.85 KB / 132 KB gz).**
>
> Direct follow-up to the user_cards fix. The incident's real lesson was
> not "sync failed" but "sync failed SILENTLY for 9+ days." Two surgical,
> TDD'd changes close that failure-mode class:
> - **`classifySyncError(err) → 'fatal' | 'transient'`** (new, in
>   `src/lib/syncEngine.js`): fatal = schema drift / RLS / integrity
>   (Postgres SQLSTATE class 42 + 23, alphanumeric-aware so `42P01`
>   matches; PGRST204/205; message patterns). Conservative — unknown ⇒
>   transient, so a network blip is never fast-dropped.
> - **`processSyncQueue` fail-fast**: a fatal error now dead-letters on
>   attempt 1 instead of burning all 5 backoff retries — the 28c8f49
>   dead-letter signal (console.warn + telemetry + `sync_events` archive)
>   now fires within seconds of the next drift, not minutes. Transient
>   errors keep the existing backoff. Dead-letter records gained a `fatal`
>   flag.
> - **`hydrateCloudData` catch**: fatal failures now `console.error`
>   loudly (operator sees it in DevTools immediately) and telemetry gains
>   `fatal: true`; transient ones stay quiet. (Lazy-imports the classifier
>   so cold-load is untouched.)
>
> Tests: +9 in `src/lib/__tests__/syncEngine.test.js` (6 classifier cases
> incl. the 42P01 alphanumeric trap + the conservative-default; 3 queue
> fast-path: fatal⇒attempt-1 dead-letter, transient⇒still re-queue,
> exhausted-transient⇒`fatal:false`). No store-shape change (no
> STORE_VERSION bump), no routes/Layout touched — e2e not needed.
>
> NOTE: the original "#1 fail-fast" framing (stop a hydrate retry loop)
> was imprecise — hydrate never self-retried; the 24k loop was external
> and fixed 05-28. This is the corrected, on-point version: fail-fast in
> the QUEUE + loud surfacing in hydrate.
>
> ## 📌 LATEST SESSION (2026-05-29, latest) — user_cards ROOT CAUSE found + fixed (prod schema drift)
>
> **`user_cards` now syncs. Verified: 0 → 264 cards, PC↔phone identical.**
>
> The per-table `user_cards` transport was failing because the **LIVE
> table was missing the `deleted` column** — it was provisioned from an
> older schema and never migrated, even though the committed SQL
> (`phase-b-cloud-sync.sql` / `setup_all_tables.sql`) has always declared
> it. Both `fetchCloudCards` (`.eq('deleted', false)`) and
> `upsertCloudCards` (writes `deleted: false`) reference the column, so
> every card read/write threw `column user_cards.deleted does not exist`.
>
> **How it was diagnosed (Supabase Management API, read-only first):**
> - dead-letter trail EMPTY (the dead-letter code only deployed today in
>   28c8f49; the failing card upserts were dropped *before* that, which is
>   exactly why the trail looked empty — a clue, not a dead end);
> - `sync_events` held only `streak_updated` + `study_minutes_logged`
>   (the event types that default-archive) → proved the session/auth and
>   per-table transport work;
> - `telemetry_events` had **24,238 `cloud_data_hydrate_failed`** rows,
>   every one `{"error":"column user_cards.deleted does not exist"}`;
> - confirmed against `information_schema.columns`: column absent.
>
> **Fix (applied to prod 2026-05-29, recorded in
> `supabase/migrations/20260529_user_cards_add_deleted.sql`):**
> ```sql
> ALTER TABLE public.user_cards ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
> ```
> Idempotent, reversible. After it landed: `cloud_data_hydrated` fired,
> `cloud_data_hydrate_failed` dropped to 0, `user_cards` = 264.
>
> No app-code change was needed — the committed SQL was already correct;
> only prod had drifted. There is no vitest guard for a prod-only schema
> drift (the committed SQL *is* the guard); a live-vs-committed schema
> diff is the right follow-up (see below).
>
> **Follow-ups surfaced (separate tickets, NOT done here):**
> - ~~**Retry storm**~~ — INVESTIGATED, no action needed. The 24,238
>   `cloud_data_hydrate_failed` rows were 98% (23,822) from the
>   2026-05-25 settings-sync loop already fixed 05-28 (`8381ceb`); the
>   remainder was normal-frequency sign-ins hitting the missing
>   `user_cards.deleted` column (fixed today). Peak rate after the 05-28
>   fix is 5/min, not 300+/min — no live loop. Optional future hardening:
>   make `hydrateCloudData` fail-fast on non-retryable (`42703`-class)
>   errors instead of swallowing them, but there's no active bug.
> - **Schema parity audit — DONE this session.** Diffed all 10 live
>   public tables vs committed `setup_all_tables.sql`. 7 tables match;
>   `user_cards` fixed (above); **`profiles` was missing 4 columns**
>   (`identity`, `exam_date`, `theme`, `daily_goal`) — a LATENT landmine,
>   not an active bug (only-userInterests payloads succeeded; the
>   all-column `fetchUserProfile` is uncalled). Added them anyway to keep
>   prod aligned — see
>   `supabase/migrations/20260529_profiles_add_missing_udl_columns.sql`.
>   `user_profiles` (vestigial: id/display_name only) and `user_state`
>   exist live but aren't in `setup_all_tables.sql`; `user_profiles` looks
>   unused — candidate for a later cleanup/confirm pass.
> - Still queued from prior sessions: PWA `registerType`, `isHydratingCloud`
>   dead-code, Telemetry Option A, AuthGuard cardDelta tiebreaker redesign,
>   `/understand` re-run.
>
> ## 📌 LATEST SESSION (2026-05-29, late) — sync dead-letter visibility (no more silent drops)
>
> **0 lint errors / 3 pre-existing warnings · 20 files / 233 vitest pass ·
> build clean.**
>
> Follow-up to today's earlier read-side fix. Diagnosed why `user_cards`
> is empty even though queue flushes report success: `syncEngine.js`
> `processSyncQueue` silently dropped events after `MAX_ATTEMPTS = 5`
> retries — no log, no archive, no telemetry. Queue went from N → 0 with
> no data landing anywhere. Classic silent-failure anti-pattern.
>
> **Fix:** events that exhaust retries now land in a new `deadLetter`
> array on the result. `flushSyncQueue` in `useStore.js` handles them:
> (a) `console.warn` with type + error + attempts, (b) telemetry event
> `sync_event_dead_lettered` per event with the failure reason,
> (c) best-effort `archiveCloudSyncEvent` into `sync_events` table with
> `payload._deadLetter: true`, `_lastError`, `_attempts` so future
> debugging can SQL-query the dead-letter trail. Archive failure is
> non-fatal — logged separately, doesn't escalate.
>
> Also added `deadLettered: N` to the existing `sync_flush_succeeded` /
> `sync_flush_failed` telemetry events so flush metrics include the
> count without needing a separate aggregation.
>
> **Regression pin:** extended `src/lib/__tests__/syncEngine.test.js`
> with 5 new tests for `processSyncQueue` (it previously only covered
> `nextScheduledRetryMs`):
> - successful events out of remainingQueue and deadLetter
> - failing events under MAX_ATTEMPTS go to remainingQueue
> - failing events at MAX_ATTEMPTS go to deadLetter with `lastError` +
>   `deadLetteredAt`
> - mixed queue (success + retry + dead-letter) routes correctly
> - offline path returns empty deadLetter (no work attempted)
>
> **This does NOT fix the underlying upsert failure.** It surfaces it.
> Next time you review a card on the live deploy:
> 1. If user_cards lands a row → the historical retries were burning
>    out before auth was fully established (legacy artifact, now self-
>    heals).
> 2. If user_cards stays empty AND console shows
>    `[sync] dead-lettered N event(s) after max retries: [...]` →
>    the error message tells us the root cause (likely RLS INSERT
>    `WITH CHECK` mismatch, schema column drift, or FK on user_id).
>
> Diagnostic SQL to run AFTER reviewing 1-2 cards on the new deploy:
> ```sql
> SELECT event_type, payload->>'_lastError' as error, payload->>'_attempts' as attempts, created_at
> FROM sync_events
> WHERE (payload->>'_deadLetter')::boolean = true
> ORDER BY created_at DESC LIMIT 20;
> ```
>
> **Still queued (separate tickets):**
> - `user_cards` ROOT cause — pending the diagnostic above. Once we see
>   the actual error, the fix is likely a 1-5 line schema or RLS change.
> - PWA `registerType: 'autoUpdate'` — only if PWA cache friction recurs.
> - Dead-code cleanup — `isHydratingCloud` field.
> - Telemetry Option A — inject `user_id` + `session_id` into the
>   First-Run Tour funnel payload.
> - `/understand-anything:understand` — partial run from yesterday left
>   incomplete batches; delete `.understand-anything/` and re-run fresh
>   when ready.
>
> ## 📌 LATEST SESSION (2026-05-29) — cloud blob now pulls on every sign-in (cross-device sync actually works)
>
> **0 lint errors / 3 pre-existing warnings · 20 files / 228 vitest pass ·
> build clean.**
>
> Yesterday's `triggerCloudSync` wire-up (ff72bfe) made the blob WRITE path
> fresh — confirmed via direct Supabase query: `user_state` row for the
> primary account holds `state_version: 20`, today's streak, and 264 cards.
> But sync still didn't work because the READ path was gated:
> `AuthGuard.handleSignIn` short-circuited with `if (!isNewLogin) return`
> before `pullStateBlob` could run. So a second device on session restore
> (the normal "open the site, you're already logged in" path) NEVER pulled
> the blob. The Round-3 fix made `hydrateCloudData` run every sign-in for
> per-table data, but the blob carries streak / XP / settings / identity /
> dailyChallenge / engagementXP / userInterests — none of which live in the
> per-table tables — so those stayed empty on the second device.
>
> **Fix:** dropped the `isNewLogin` short-circuit in `AuthGuard.jsx`. The
> existing newer-wins logic (`cardDelta` threshold + `updated_at`
> tie-break) already runs below the gate and is the safety net: incognito
> tab with 0 local cards + cloud 264 cards → `cardDelta = +264` →
> `restoreFromCloud()` fires → second device gets everything.
>
> Renamed the unused param to `_isNewLogin` to keep lint clean. Doc
> comment updated.
>
> **Regression pin:** new `src/components/__tests__/authGuard.test.js`
> reads `AuthGuard.jsx`, strips line comments + JSDoc lines, asserts none
> of the gate shapes can return (`if (!isNewLogin) return`,
> `if (isNewLogin === false) return`, etc.) and that both `pullStateBlob`
> and `hydrateCloudData` remain in the file. Same pattern as
> `authUnlock.test.js` and `syncEnqueue.test.js`.
>
> **Separate latent bug surfaced**: `user_cards` table is EMPTY despite
> the queue flushing successfully. The blob carries cards so cross-device
> sync isn't blocked, but the per-table write path has a silent failure
> mode worth investigating in a follow-up. Possible causes: schema
> mismatch in the insert payload, RLS policy mismatch on INSERT (qual is
> `NULL` on the insert policy — relies on WITH CHECK which we didn't query
> for), or the cloudSync.js mutator never being called. Not a P0 because
> the blob is the source of truth.
>
> **User verification (after Vercel deploys this commit):**
> 1. Hard-refresh PC (PWA users: swipe-kill + reopen).
> 2. Open incognito tab → sign in with same email.
> 3. Streak / XP / cards / identity should all appear immediately. Cloud
>    pull happens once per sign-in.
>
> **Still queued (separate tickets):**
> - `user_cards` per-table sync investigation (new — see above).
> - PWA `registerType: 'autoUpdate'` — only if PWA cache friction recurs.
> - Dead-code cleanup — `isHydratingCloud` field.
> - Telemetry Option A — inject `user_id` + `session_id` into the
>   First-Run Tour funnel payload.
> - `/understand-anything:understand` — partial run from yesterday left
>   `.understand-anything/intermediate/` with batches 2/4/5 only (1+3
>   missing, no final `knowledge-graph.json`). Cleanest is to delete
>   `.understand-anything/` and re-run fresh after this lands. Heavy
>   (~30-60 min); user has opted in for the dashboard use case.
>
> ## 📌 LATEST SESSION (2026-05-28, late) — triggerCloudSync wired into enqueueSyncEventAction
>
> **0 lint errors / 3 pre-existing warnings · 19 files / 225 vitest pass ·
> build clean (~411 KB / ~132 KB gzip).**
>
> Closes the last cross-device sync gap from today's three-round
> settings-sync chain (`8381ceb` → `e9b205a`). Per-table data (cards /
> writing / speaking) already rehydrated on every sign-in via
> `hydrateCloudData`; the `user_state` blob (streak / XP / settings /
> identity / dailyChallenge / engagementXP / userInterests / theme)
> was only pushed ONCE at first sign-in and went stale forever after.
>
> **Fix:** `enqueueSyncEventAction` in `src/store/useStore.js` (~line
> 218) now does `set(...); get().triggerCloudSync();` instead of the
> bare `set(...)`. Two-step shape required — `triggerCloudSync` needs
> committed state. ~20 call sites enqueue events on every mutation
> (card reviewed, streak updated, writing logged, profile edited,
> etc.), so the blob refreshes within 5s of the last action via the
> existing debounce.
>
> **Regression pin:** new `src/store/__tests__/syncEnqueue.test.js`
> reads `useStore.js`, balanced-brace-walks the action body, asserts
> `triggerCloudSync(` is invoked and `set(` + `queue` still drive the
> per-table flush path. Line comments stripped first so a historical
> reference in a comment can't satisfy the check trivially. Same
> pattern as `src/components/__tests__/authUnlock.test.js`.
>
> **User verification (do after deploy hits Vercel):**
> 1. Hard-refresh PC.
> 2. Make a small mutation — review a card, change a setting, etc.
> 3. Wait 5+ seconds for the debounced push.
> 4. Sign in on a second device (incognito tab works) — streak / XP /
>    identity should now match. Cards already synced from Round 3.
>
> **Bandwidth note:** ~50-100 KB per push, ~12/min worst case during
> heavy study → ~70 MB/hour for a power user. Acceptable but watch the
> Supabase egress dashboard for a week.
>
> **Still queued (separate tickets):**
> - PWA `registerType: 'autoUpdate'` — only if PWA cache friction
>   becomes a recurring user complaint.
> - Dead-code cleanup — `isHydratingCloud` field, stale state-blob
>   restore branch in `AuthGuard.handleSignIn`. Not urgent.
> - Telemetry Option A — inject `user_id` + `session_id` into the
>   First-Run Tour funnel payload.
> - AuthGuard simplification — now that the blob is fresh, the
>   `cardDelta` / timestamp tiebreaker logic could collapse to
>   always-restore-from-cloud-when-newer. Needs design thought.
>
> **Secondary task still queued:** run
> `/understand-anything:understand` to produce a knowledge-graph
> dashboard the user can share with non-coders. Heavy (~30-60 min);
> deferred this session because user is out of weekly usage. RED in
> triage but user has opted in — see
> `docs/sessions/2026-05-28-mid-wire-triggercloudsync.md` § "Secondary
> task".
>
> ## 📌 LATEST SESSION (2026-05-28) — P1 Settings sync loop fixed (3 rounds)
>
> **0 lint errors · 18 files / 223 vitest pass · 14/14 Playwright pass ·
> build clean.**
>
> ### Round 1 — desktop loop (commit `8381ceb`)
>
> Logged-in users on `/settings` saw "Syncing your progress..." fire
> repeatedly. Root cause: `<AuthUnlock/>` ran its own mount-effect
> calling `hydrateCloudData()` → `isHydratingCloud: true` → `<Layout/>`
> swapped children for a spinner → `<Settings/>` (containing
> `<AuthUnlock/>`) unmounted → hydration resolved → children remounted →
> effect re-fired. Infinite mount loop.
>
> Fixed by consolidating all sign-in side effects into `<AuthGuard/>`
> (App-root, never unmounts). `<AuthUnlock/>` rewritten as purely
> presentational. Desktop verified clean by user.
>
> ### Round 2 — mobile loop (commit `63eaab5`)
>
> Mobile still cycling after Round 1. Diagnosed a SECOND loop at
> `Layout.jsx:118-122`: `sync.syncStatus` was in the useEffect deps. On
> flaky mobile networks, `flushSyncQueue` resolves with `status: 'error'`
> → effect re-fires → calls `flushSyncQueue` immediately again → no
> backoff. Desktop never saw it because desktop requests succeed first
> try, queue drains, effect doesn't re-fire (queue.length === 0).
>
> Fixed by (a) dropping `sync.syncStatus` from Layout's deps and (b)
> adding self-scheduling retry inside `flushSyncQueue` via setTimeout +
> `nextScheduledRetryMs` (new pure helper in `src/lib/syncEngine.js`,
> with 5 vitest cases). `nextRetryAt` is now load-bearing, not
> documentation. Floors retry delay at 1s to prevent a past-due queue
> from causing a tight-loop one layer down.
>
> ### Round 3 — cross-device sync was broken (commit follows this update)
>
> User verified: incognito loaded clean → code fix is real. But PC's
> 20 reviewed cards didn't show on phone or in a fresh incognito.
> Found that `triggerCloudSync` (the debounced full-blob push) has
> ZERO callers anywhere in the codebase — the `user_state` cloud blob
> only ever gets pushed once at first sign-in. Per-table data was
> writing to `user_cards` correctly via the queue, but the only code
> that ever READ `user_cards` on sign-in was AuthUnlock's mount-effect
> — which Round 1 killed. So Round 1 silently broke cross-device sync
> for cards / writing / speaking.
>
> Fixed in this round by (a) calling `hydrateCloudData()` from
> AuthGuard's `handleSignIn` (fires on both fresh login and session
> restore — safe because the merge is key-based, never destructive),
> and (b) deleting the `{isHydratingCloud ? <Spinner/> : children}`
> swap in Layout. The swap was the structural smell that started the
> whole bug class; killing it for good prevents future tripwires.
>
> **Still NOT fixed:** the `user_state` blob is still stale because
> `triggerCloudSync` still has no callers. Per-table data (cards,
> writing, speaking) now syncs both ways. Streak / XP / settings /
> identity do not yet — separate ticket queued for when needed.
>
> ### What changed
>
> 1. **`src/components/AuthGuard.jsx`** — now owns ALL sign-in side
>    effects: `setAuthUser`, `checkUserRole` → `setUserRole` (admin/
>    owner promotion), `enableCloudTelemetry`. On sign-out:
>    `clearAuthUser` + `disableCloudTelemetry`. AuthGuard sits at the
>    App root and never unmounts, so the loop trigger is structurally
>    impossible from here.
> 2. **`src/components/AuthUnlock.jsx`** — purely presentational.
>    Reads `auth.user` from the store, renders the magic-link form OR
>    the signed-in card. No `useEffect`, no auth listener, no
>    hydration.
> 3. **`src/components/__tests__/authUnlock.test.js`** (new) —
>    structural regression test (4 cases). Pins that AuthUnlock never
>    re-acquires `hydrateCloudData` / `flushSyncQueue` /
>    `getCurrentUser` / `onAuthStateChange`. If a future change
>    re-wires those calls into AuthUnlock, the test fails.
>
> ### Dead code surfaced — NOT deleted in this commit
>
> - `hydrateCloudData` (`useStore.js:636-694`) — zero callers now.
> - `isHydratingCloud` field + setters (`useStore.js:189, 638, 672,
>   690`) — only ever read by Layout's spinner branch, which is now
>   unreachable.
> - "Syncing your progress..." spinner branch in `Layout.jsx:239-247`
>   — unreachable since nothing flips `isHydratingCloud` true anymore.
>
> All three flagged for a small follow-up cleanup; left alive in this
> commit to keep the diff focused on the bug fix.
>
> ### Read order for next session
>
> `docs/sessions/2026-05-28-settings-sync-loop-fix.md` (this) →
> `docs/sessions/2026-05-28-mid-settings-sync-loop.md` (the prior
> session's handoff that surfaced the bug) →
> `docs/sessions/2026-05-27-first-run-tour-session.md` →
> rest of this file (historical archive).
>
> ### Queued (carrying over from prior handoff)
>
> - **Telemetry Option A** — inject `user_id` + `session_id` into
>   payload (~10 lines). With AuthGuard now firing
>   `enableCloudTelemetry()` on sign-in, this is a natural next step.
> - **Nav restructure** — More-drawer → primary surfaces. Own
>   brainstorm.
> - **Full Walkthrough** — re-callable spotlight tour, Settings entry
>   point. Own brainstorm.
> - **Dead-code cleanup** — delete `hydrateCloudData`,
>   `isHydratingCloud`, the Layout spinner branch.

> ## 📌 LATEST SESSION (2026-05-27, First-Run Tour) — Activation card shipped
>
> **0 lint errors · 214/214 vitest pass · 14/14 Playwright pass ·
> build clean · `index-*.js` 410.65 KB / gz 131.74 KB (Δ +1.52 KB
> raw / +0.38 KB gz vs prior `228dde1`).**
>
> ### Shipped
>
> 1. **`src/components/FirstRunCard.jsx`** — single inline activation
>    card on Dashboard. Two variants: populated-deck →
>    `Start studying →` → `/study`; empty-deck → `Add words →` →
>    `/word-families`. Gate is a pure Zustand selector on
>    `cards.some(c => c.last_review != null)` — no store API change,
>    no `STORE_VERSION` bump, no new persisted field, no new
>    dependency.
> 2. **`Dashboard.jsx`** — card mounted above the existing guest
>    "Save Progress" banner. Activation precedes conversion; once
>    the user rates their first card, FirstRunCard unmounts and the
>    guest banner naturally becomes the next focal point.
> 3. **Telemetry** — `first_run_card_shown` (once per mount, guarded
>    against post-activation fires) + `first_run_cta_clicked` (on
>    click, before navigate). Variant payload (`'empty' | 'populated'`)
>    lets us measure both branches of the funnel.
> 4. **`tests/e2e/first-run-tour.spec.js`** (5 cases) — both variants
>    visible + navigate, rate-card unmount, persistence after
>    refresh, telemetry events fire. Full suite now 14/14.
> 5. **Manual visual verification** at iPhone viewport — screenshots
>    under `docs/sessions/screenshots/2026-05-27-first-run-tour/`
>    confirm both variants, the accent border on the left, the
>    above-banner positioning, and the unmount-on-rating behaviour.
>
> ### Plan divergences (both documented in commits + session doc)
>
> - `--color-dim` not `--color-text-muted` — the latter doesn't
>   exist in `src/index.css`. Fix landed as `e006d6f`.
> - `useEffect` placed BEFORE the `if (hasReviewed) return null`
>   early-return with an internal `hasReviewed` guard, so we don't
>   need to disable `react-hooks/rules-of-hooks`. Landed in `7555dde`.
>
> ### What to look at next (user picks — don't pick autonomously)
>
> - **Nav restructure** — More-drawer → primary surfaces. Has its
>   own parked task. Needs brainstorm + IA work.
> - **Full Walkthrough** — Settings button, re-callable spotlight
>   tour. Own brainstorm.
> - **P1 — Settings sync loop** — `/settings` re-fires "syncing"
>   indefinitely on logged-in users; mobile gets stuck. Logged in
>   memory (`project_bug_settings_sync_loop`).
> - **Telemetry audit follow-up** — independent reviewer flagged a
>   pre-existing `event` (localStorage) vs `event_type` (Supabase
>   insert column) divergence in `src/lib/telemetry.js`. FirstRunCard
>   is the first feature to make queryability load-bearing. Worth a
>   schema audit before claiming the funnel metric is reliable.
>
> ### Read order for next session
>
> `docs/sessions/2026-05-27-first-run-tour-session.md` (this) →
> `docs/2026-05-27-first-run-tour-design.md` (v3 spec) →
> `docs/sessions/2026-05-27-e2e-harness-session.md` (prior) →
> rest of this file (historical archive).

> ## 📌 LATEST SESSION (2026-05-27, e2e) — Playwright harness for Phase 4 + Phase 5
>
> **0 lint errors · 214/214 vitest pass · 9/9 Playwright pass (22.6s) ·
> build clean · `index-*.js` 409.13 KB / gz 131.37 KB (essentially
> unchanged from prior `88ed252` — e2e deps are dev-only).**
>
> ### Shipped
>
> 1. **`@playwright/test` 1.60.0** added as devDep. Browsers already
>    cached at `~/Library/Caches/ms-playwright/chromium*1223/`;
>    `npx playwright install chromium` was a no-op.
> 2. **`tests/e2e/playwright.config.js`** — chromium-only, 390×844,
>    `workers: 1`, `fullyParallel: false`. `webServer` auto-spawns
>    `npm run dev` and `reuseExistingServer: !process.env.CI`.
>    `trace: 'retain-on-failure'` for future flakes.
> 3. **`tests/e2e/page-transitions.spec.js`** (3 cases) — `.page-
>    transition` wrapper + `fadeUp` `0.22s` keyframe, re-mounts across
>    cold and warm lazy chunks, `prefers-reduced-motion: reduce` flips
>    `animationName` to `none`.
> 4. **`tests/e2e/mistake-promotion.spec.js`** (6 cases) — Malay vocab
>    med-severity promotion + both toasts coexisting, "Open deck" CTA
>    nav to `/study`, dismiss `X`, 24h dedupe, low-severity skip,
>    English skip (Malay-only rule).
> 5. **npm scripts** — `test:e2e` and `test:e2e:ui` (uses
>    `--config tests/e2e/playwright.config.js` because the config is
>    co-located with specs, not at the project root).
> 6. **CLAUDE.md** — new `## E2E tests` subsection documents the run
>    command, browser cache location, and the **Vite `?t=…` module-URL
>    trap**: in dev, `page.evaluate(() => import('/src/store/useStore.js'))`
>    gets a DIFFERENT module instance than React's (Vite appends a
>    `?t=<timestamp>` HMR cache-buster). Workaround in `bindStore()` —
>    pull the live URL from `performance.getEntriesByType('resource')`
>    and dynamic-import THAT URL. Must re-run after every
>    `page.goto` / `page.reload`.
>
> ### Why a `--config` flag in the npm script
>
> User spec called for `"test:e2e": "playwright test"` and config at
> `tests/e2e/playwright.config.js`. Playwright auto-discovers config
> from cwd → running `playwright test` from the project root would
> miss the co-located config. The script adds
> `--config tests/e2e/playwright.config.js` — smallest change that
> respects both intents.
>
> ### What to look at next (user picks — don't pick autonomously)
>
> - **First-Run Tour** — onboarding/activation for new invitees.
>   Highest product impact.
> - **Phase 2 Content Expansion** — more vocab packs, more roleplay
>   scenarios, more reading passages.
> - **B (Row 7 cosmetic gap)** — unchanged; punted. Invite-only users
>   essentially never hit the EN quota cap.
>
> ### Read order for next session
>
> `docs/sessions/2026-05-27-e2e-harness-session.md` (this) →
> `docs/sessions/2026-05-27-phase4-page-transitions.md` →
> `docs/sessions/2026-05-27-phase5-promotion-toast.md` →
> rest of this file (historical archive).

> ## 📌 LATEST SESSION (2026-05-27, Phase 4) — Page transitions shipped → Zero-Waste plan 5/5 ✅
>
> **0 lint errors · 214/214 vitest pass · build clean ·
> `index-*.js` 409.15 KB / gz 131.36 KB (+0.13 KB raw / +0.02 KB gz
> vs prior `d2091c2`).**
>
> ### Shipped — closes Phase 4 of the Zero-Waste plan
>
> 1. **`.page-transition` CSS class** (`src/index.css`) — reuses the
>    existing `fadeUp` keyframe (8 px translate + opacity), 220 ms
>    `cubic-bezier(0.16,1,0.3,1)` easing. Has a
>    `@media (prefers-reduced-motion: reduce)` override that kills the
>    animation entirely.
> 2. **`AnimatedRoutes` wrapper** (`src/App.jsx`) — factored the 17
>    route definitions into a small component, wrapped them in a
>    `<div key={location.pathname} className="page-transition">` that
>    sits *inside* `<Suspense>` so the loading spinner doesn't animate
>    (only the resolved route content does). React unmount/remount on
>    path change → CSS keyframe re-fires.
>
> ### Why CSS-only (deviation from literal spec)
>
> Spec said `framer-motion` + `<AnimatePresence>`. `framer-motion` is
> already installed and used by Study/Roleplay/SmartSession — each in
> its own lazy chunk (~300 KB raw / ~87 KB gz total, only billed when
> those routes load). Importing `AnimatePresence` from `framer-motion`
> into `App.jsx` (eager) would hoist `motion-dom` into `index-*.js` —
> **the exact regression the 2026-05-25 MistakeToast rewrite removed**
> (see its top-of-file comment). CSS keyframes deliver an identical
> visual for a single fade+slide-in at **+0.13 KB instead of +190 KB**.
>
> Full write-up: `docs/sessions/2026-05-27-phase4-page-transitions.md`.
> Upgrade path documented if true crossfade is ever wanted
> (`LazyMotion` + `domAnimation` + `m` from `motion/react`, lazy).
>
> ### Master-plan status — ALL FIVE PHASES SHIPPED 🎉
>
> 1. Architectural Detox ✅
> 2. Interleaved Practice ✅
> 3. Adaptive Scaffolding ✅
> 4. **Frictionless UX & Deep Work ✅ — Theater Mode (already shipped in
>    `useTheaterMode`/`Writing`/`Speaking`) + page transitions
>    (this session)**
> 5. Tight Feedback Loops ✅ (prior commit `d2091c2`)
>
> ### What to look at next
>
> - **B (Row 7 cosmetic gap)** — unchanged; punted. EN roleplay heavy-
>   scaffold AI-quota-exhausted fallback doesn't add the grammar-drill
>   suggestion line. Invite-only users essentially never hit EN quota.
> - **D (Playwright auto-tester)** — unchanged; punted. ~1 hr build.
> - Doc drift: CLAUDE.md says `STORE_VERSION = 12`; reality is `20`.
>   Known. Don't burn a turn investigating.
> - Real verification of both phase 4 + phase 5 deserves a manual
>   browser pass: navigate between routes, watch transition; log a
>   mistake in Writing/Roleplay/Comprehension, watch the emerald
>   promotion toast appear bottom-right.
>
> ### Read order for next session
>
> `docs/sessions/2026-05-27-phase4-page-transitions.md` (this) →
> `docs/sessions/2026-05-27-phase5-promotion-toast.md` →
> `docs/sessions/2026-05-27-cwe94-deno-types-session.md` →
> rest of this file (historical archive).
>
> ### Fast-follow patch (after the post-ship Playwright verify)
>
> An e2e verify pass against the running app caught a pre-existing
> `MistakeToast` centering bug (rendered at viewport `x=-1` instead of
> `x=97` on a 390 px viewport since the 2026-05-25 rewrite). Root
> cause: Tailwind v4 emits `-translate-x-1/2` as the CSS `translate`
> property (separate from `transform`), so it stacked with the
> component's inline `transform: translateX(-50%) translateY(…)` and
> shifted the toast -100 % of its own width. Fix: dropped the
> Tailwind class, kept the inline transform (needed for the Y entry
> animation). Verified post-fix → toast measured at `x=97, w=196`
> (centered). Comment in the file warns against re-adding the class.
> Tier-2 follow-up parked: codify the verify driver as a permanent
> `tests/e2e/` Playwright suite — see the handoff prompt the agent
> emitted at end of session.

> ## 📌 LATEST SESSION (2026-05-27, Phase 5) — Visible mistake → FSRS promotion shipped
>
> **0 lint errors · 214/214 vitest pass · build clean ·
> `index-*.js` 409.02 KB / gz 131.34 KB (+3.66 KB raw / +0.86 KB gz vs
> `12e9a84` — eager Layout addition).**
>
> ### Shipped — closes Phase 5 of the Zero-Waste plan in CLAUDE.md
>
> 1. **`addMistake` now returns `{ added, bumped, promotedCard }`**
>    (`src/store/useStore.js`). `promotedCard` is the full FSRS card
>    object resolved from `state.cards` after `promoteMistakeToCard`
>    flushes synchronously, or `null` when no promotion happened. All
>    six existing callers (RoleplayScorecard, useInterleavedSession,
>    Comprehension, Listening, Speaking, logMistakeBatch) ignored the
>    previous undefined return — back-compat is safe.
> 2. **`<MistakePromotedToast />`** (`src/components/MistakePromotedToast.jsx`)
>    — emerald gradient floating pill, bottom-right, `Layers` + `Sparkles`
>    icon, "Added to your review deck" copy, bold word + italic gloss,
>    `+N` aggregation badge for batches, "Open deck" CTA → `/study`.
>    3.2 s auto-dismiss, 220 ms exit, honours `prefers-reduced-motion` +
>    `theaterMode`, `role="status"` + `aria-live="polite"`. No
>    framer-motion (CSS transitions, mirrors `MistakeToast`'s pattern).
> 3. **Mounted globally in `Layout.jsx`** beside the existing
>    `MistakeToast`. Fires for ALL `addMistake` call sites — DRY across
>    the six existing surfaces + any future caller. Detection via
>    Set-diff on `mistakes.filter(m => m.promotedCardId).map(m => m.id)`,
>    which exact-identifies the just-promoted mistake regardless of when
>    it was originally logged (so manual promotion via the Dashboard /
>    MistakeJournal buttons also surfaces the toast).
>
> ### Why a global toast vs. per-caller wiring
>
> Spec called for wiring into three surfaces. `addMistake` is actually
> called from six places. Mounting one `Layout`-level subscriber covers
> all six + protects against forgetting a new surface later. The new
> return value is still useful for explicit-trigger / test scenarios.
>
> ### Hydration & re-render safety
>
> - First `useEffect` run initialises `prevIds` from persisted state →
>   does NOT pop a toast for previously-promoted mistakes on app load.
> - Zustand selector returns `s.mistakes` (stable ref); `useMemo`
>   rebuilds the {ids, byId} snapshot only on store change.
> - `prevIds.current` updates BEFORE the early return so the `mounted`
>   dep re-run is a no-op (no infinite loop).
> - No allocation inside the Zustand selector (CLAUDE.md perf §1).
>
> ### Master-plan status (CLAUDE.md "Zero-Waste Cognitive Engine")
>
> 1. Architectural Detox — ✅
> 2. Interleaved Practice — ✅
> 3. Adaptive Scaffolding — ✅
> 4. Frictionless UX & Deep Work — partial (Theater Mode shipped;
>    `framer-motion` page transitions still open)
> 5. **Tight Feedback Loops — ✅ this session**
>
> ### What to look at next
>
> - **Phase 4 page transitions** — install `framer-motion`, wrap routes
>   in `<AnimatePresence>`, subtle fade/slide. 2-4 hrs.
> - **B (Row 7 cosmetic gap)** — unchanged; punted.
> - **D (Playwright auto-tester)** — unchanged; punted.
> - Doc drift: CLAUDE.md still says `STORE_VERSION = 12`; reality is
>   `20`. Known. Don't burn a turn investigating.
>
> ### Read order for next session
>
> `docs/sessions/2026-05-27-phase5-promotion-toast.md` (this session) →
> `docs/sessions/2026-05-27-cwe94-deno-types-session.md` (prior) →
> rest of this file (historical archive).

> ## 📌 LATEST SESSION (2026-05-27, late) — All threads closed: Gemini 3.5-flash + Thread A confirmed deployed
>
> **HEAD: `12e9a84` · 0 lint errors · 214/214 vitest pass · ai-proxy
> deploy verified in sync with main (`No change found` on
> `supabase functions deploy ai-proxy`).**
>
> ### Closed in this session
>
> 1. **Thread A — ai-proxy deploy.** Agent ran
>    `supabase functions deploy ai-proxy` directly; CLI returned
>    `No change found in Function: ai-proxy` against project
>    `sfrpbnmhvhtsgzqwnent`, meaning the deployed code already
>    matches the committed `7d430a9` + `b28892e` versions. CWE-94 fix
>    and Thread C guardrail are LIVE in prod. ✅
> 2. **Thread C — writing-feedback-v2 hallucination guardrail.** User
>    tested with `"Saya akan membeli buku itu kerena ia sangat
>    menarik"` (misspelt "kerena"). Site flagged the misspelling.
>    Guardrail held in both directions — no `fix.fix === surface`
>    entries, AND real misspellings ARE caught. ✅
> 3. **Gemini 404 on Writing Tutor.** `api/gemini.js:40` was pinned
>    to `gemini-2.0-flash`; Google retired it in the 2025-12
>    deprecation wave. Bumped to `gemini-3.5-flash`, committed as
>    `12e9a84`, Vercel auto-deployed on push. ✅
>
> ### Operational state changes
>
> - Auto-commit policy refined: user is now on **VS Code** (not
>   Antigravity). The previous "never auto-commit, 8 GB RAM crashes
>   the Mac" rule was actually Antigravity-specific. With VS Code,
>   the post-commit auto-push + npm postinstall combo doesn't blow
>   memory. Memory note `[[feedback_no_auto_commit]]` updated to
>   reflect this. Default still cautious when editor is unknown.
>
> ### Threads still on the punted list (not blockers)
>
> - **B (Row 7 cosmetic gap):** EN roleplay AI-quota-exhausted
>   fallback at `Roleplay.jsx:183` doesn't add a grammar-drill hint
>   on heavy scaffold. Invite-only users essentially never hit the
>   EN quota cap. Skip unless explicitly requested.
> - **C-followup (Playwright auto-tester):** ~1 hr build; defer.
>
> ### What to look at next
>
> The Zero-Waste Cognitive Engine master plan in `CLAUDE.md` still
> has phases 4 and 5 open:
> - **Phase 4 — Frictionless UX & Deep Work.** `framer-motion`
>   transitions, "Theater Mode" for heavy tasks.
> - **Phase 5 — Tight Feedback Loops.** Mistake-to-FSRS pipeline is
>   wired (`mistakes` store) but the visual "you just got promoted
>   to a flashcard" moment isn't loud enough — that's the dopamine
>   loop the plan calls for.
>
> Phases 1-3 already shipped (Architectural Detox, Interleaved
> Practice, Adaptive Scaffolding).
>
> ### Read order for next session
>
> `docs/sessions/2026-05-27-cwe94-deno-types-session.md` (incl.
> "Late addition — Gemini 3.5-flash" section) →
> `docs/sessions/2026-05-27-401-fix-session.md` →
> `docs/sessions/2026-05-26-adaptive-scaffolding-session.md` → rest
> of this file (historical archive).

> ## 📌 LATEST SESSION (2026-05-27) — Edge function 401 fix
>
> **0 lint errors · build clean · `index-*.js` 405.36 KB / gz 130.48 KB
> (unchanged from 2026-05-26).**
>
> **Fixed P1 bug:** `src/lib/ai.js:151` fell back to the publishable
> key for guests; ai-proxy's gateway runs with `verify_jwt = true` and
> rejected `sb_publishable_*` tokens with
> `UNAUTHORIZED_INVALID_JWT_FORMAT`. Also a cold-load race for
> logged-in users (sync `getSupabase()` returned null before AuthGuard
> finished initialising).
>
> **Shipped:**
> 1. `src/lib/ai.js` — await `initSupabase()` instead of sync getter;
>    drop the publishable-key fallback entirely; throw
>    `AIError('Sign in…', 'unauthenticated')` for guests.
> 2. `src/lib/gemini.js` — same race fix (was sending no Auth header
>    on cold load instead of a bad one).
> 3. `src/config/supabase.js` — delete dead `callEdgeFunction` helper
>    (also hardcoded the publishable key, would have 401'd if revived).
> 4. `src/components/RoleplaySession.jsx` — dedicated "Sign in to use
>    AI roleplay" error message for the `unauthenticated` code.
> 5. `.gitignore` — add `supabase/.temp/` (Supabase CLI working dir
>    was being auto-staged by `.githooks/pre-commit`).
>
> **No edge function redeploy needed** — `verify_jwt = true` stays.
> Function is still gated by real Supabase JWT auth.
>
> **Threads still open:**
> - B. Adaptive Scaffolding QA matrix follow-ups (P2) — superseded by
>   static code review (12 rows, 11 pass; Row 7 is a cosmetic gap on
>   the EN roleplay AI-quota-exhausted fallback message — heavy
>   scaffold doesn't add a grammar-drill suggestion line). Not worth
>   shipping; invite-only users essentially never hit the quota cap
>   on EN roleplay specifically.
> - C. writing-feedback-v2 hallucinated-spelling guardrail —
>   **SHIPPED in this session.** Prompt now refuses to emit
>   `fix.fix === surface` corrections. **Needs redeploy:**
>   `supabase functions deploy ai-proxy` (user action — no local
>   supabase CLI from agent side).
>
> **Also this session — Antigravity cleanup:**
> Deleted 6 abandoned test-automation scratch files
> (`import-map.json`, `mock-vitest.js`, `run-tests.js`,
> `scratch-loader.js`, `tests/example_google.test.js`, `test-results/`)
> + reverted Antigravity's stale `package.json` / `package-lock.json`
> additions (`playwright ^1.60.0` + `chrome-devtools-mcp`). The
> custom mock-vitest reinvented our working vitest setup poorly;
> the Playwright scaffold tested google.com, not the app. Gitignored
> `test-results/`, `playwright-report/`, `playwright/.cache/`
> preemptively. If real auto-testing of the QA matrix is wanted,
> install Playwright cleanly (`npm i -D @playwright/test`) + write
> tests pointed at our dev server with `page.evaluate()` localStorage
> priming — ~1 hr of work, not done.
>
> **Read order:**
> `docs/sessions/2026-05-27-401-fix-session.md` (latest) →
> `docs/sessions/2026-05-26-adaptive-scaffolding-session.md` →
> `docs/2026-05-26-adaptive-scaffolding-design.md` (spec) →
> rest of this file (historical archive).

> ## 📌 LATEST SESSION (2026-05-26) — Adaptive Scaffolding (Master Plan #3)
>
> **HEAD = `8d96c05` (no commits yet — user runs the copy-paste block) ·
> 0 lint errors · 214/214 vitest pass (168 baseline + 46 new) ·
> `index-*.js` 405.36 KB / gz 130.48 KB (+0.14 KB gz · within the 3 KB
> budget) · new `AnnotatedWritingFeedback-*.js` lazy chunk 7.25 KB /
> gz 2.28 KB.** Implementation of the spec at
> `docs/2026-05-26-adaptive-scaffolding-design.md`. All 16 ship-checklist
> items done except the edge-function deploy (user action — no local
> `supabase` CLI).
>
> **Shipped:**
> 1. `writing-feedback-v2` action in `supabase/functions/ai-proxy/index.ts`
>    with bilingual scaffold-aware prompts; roleplay + roleplay-score
>    adapt when learnerProfile present (legacy clients unchanged).
> 2. `src/lib/learnerProfile.js` — deterministic profile derivation
>    from mistakes/confidence/writing/study history.
> 3. `src/lib/writingFeedbackV2Parser.js` — strict schema validator
>    with whitespace-tolerant span-coverage check (loosened from spec
>    §4.4 byte-exact per silent-failure-hunter review).
> 4. `AnnotatedWritingFeedback.jsx` (lazy) + `RoleplayTurnFeedback.jsx`
>    + scaffold-aware tweaks to `RoleplayScorecard.jsx` + `RoleplaySession`
>    header chip.
> 5. STORE_VERSION 19→20: additive `ui.useAdaptiveScaffolding: true`
>    migration. Settings toggle gates BOTH writing and roleplay surfaces.
> 6. 5 new annotation CSS custom properties on all 4 theme variants
>    (dark / light / contrast-high / light.contrast-high). WCAG AA verified.
>
> **User actions still needed:**
> 1. Run the copy-paste git block in
>    `docs/sessions/2026-05-26-adaptive-scaffolding-session.md` §10.
> 2. `supabase functions deploy ai-proxy`.
> 3. Run the three curl smoke tests from spec §12.
> 4. Walk the 12-row manual QA matrix from spec §10.2 in light + dark.
>
> **Deferred (next session):** component tests via @testing-library/react
> (blocked on npm install + postinstall hook on 8 GB Mac); RoleplaySession
> Zustand hydration race (P2 — edge case on cold-load instant-click);
> per-format v2 prompts (spec §13 open question).
>
> **Read order:**
> `docs/sessions/2026-05-26-adaptive-scaffolding-session.md` (latest) →
> `docs/2026-05-26-adaptive-scaffolding-design.md` (the spec) →
> `docs/sessions/2026-05-25-perf-cleanup-session.md` (prior) →
> this file (historical archive).
>
> **Hard rule (still in force):** Default to NOT auto-committing on
> this machine — hand the user a copy-paste block. The user can
> override per-session if they say so explicitly.

> # 🏁 ENGINEERING & UDL ARC — OFFICIALLY CLOSED (2026-05-15)
>
> Every box on the engineering and pedagogy ledger is now ticked:
>
> - **UDL roadmap: 9/9** — Principles 1 + 2 + 3 all complete
>   (`c2b8a5a`, `422b0c8`, `c714406`, `2932629`, `54eef3e`)
> - **PWA: production-grade** — `vite-plugin-pwa` `generateSW`,
>   60 precached assets covering every JS chunk (dictionary, scenarios,
>   passages, connectors, word families, grammar drills), Workbox
>   StaleWhileRevalidate for fonts + same-origin static assets,
>   `useRegisterSW` update toast, install button in Settings, custom
>   icon set (this commit)
> - **Tests: 168/168 passing.** Build clean. Lint 0 errors.
>
> The next session opens **Phase 2 — The Content Expansion Era**.
> See §A near the end of this file for the playbook.
>
> ---
>
> ## Latest commit (this turn): PWA polish
>
> 1. **`vite-plugin-pwa` configured in `vite.config.js`** with
>    `registerType: 'prompt'` and `injectRegister: false` — we own the
>    register lifecycle from React so the update toast can drive
>    `updateServiceWorker(true)`. Workbox globs every `{js,css,html,
>    svg,png,ico,woff,woff2}` Vite emits (60 entries, 1.88 MiB), bumps
>    `maximumFileSizeToCacheInBytes` to 5 MiB so the 330 kB PDF.js
>    chunk clears the cap with room to spare, and adds runtime caches
>    for Google Fonts CSS (`StaleWhileRevalidate`), Google Fonts files
>    (`CacheFirst`, 1-year max-age), and same-origin static assets
>    (`StaleWhileRevalidate`). `clientsClaim: true` + `skipWaiting:
>    false` so the new SW waits until the student taps Reload in the
>    update toast — no surprise mid-session reloads.
> 2. **Manifest** — `name: "IGCSE Malay Master"`, `short_name:
>    "Malay Master"`, `theme_color: "#0f172a"`, `background_color:
>    "#0f172a"`, `start_url: "/"`, `display: "standalone"`,
>    `categories: ["education"]`. Four icon entries: 192-PNG, 512-PNG,
>    512-PNG-maskable (with 80% safe area for Android adaptive masks),
>    SVG (`sizes: any`, scales infinitely). Generated to
>    `dist/manifest.webmanifest` by the plugin.
> 3. **Custom icon set** — new `public/icon.svg` is the vector source
>    (deep-slate background, saffron-gold Georgia "M", Bunga Raya
>    hibiscus crest, discreet "IGCSE" wordmark). `scripts/build-icons.
>    mjs` uses `sharp` to rasterise into `public/icon-192.png`,
>    `public/icon-512.png`, and `public/icon-512-maskable.png` (with
>    the maskable variant composited onto a full-bleed slate background
>    so Android adaptive-icon cropping never clips the glyph). Run
>    `node scripts/build-icons.mjs` after any SVG edit.
> 4. **`useRegisterSW` update toast** — new
>    `src/components/PWAUpdateToast.jsx` uses
>    `virtual:pwa-register/react`. Two distinct toast modes:
>    - **needRefresh** (purple, "New version available — Reload"):
>      taps `updateServiceWorker(true)` to swap to the waiting SW.
>    - **offlineReady** (card, "Ready for offline study"): one-time
>      confirmation on first install. Both are dismissible via X.
>    The hook re-checks for updates every 60 minutes so a student
>    leaving the PWA open across a school day picks up changes
>    deterministically.
> 5. **Install App button in Settings** — new
>    `src/lib/installPrompt.js` captures the `beforeinstallprompt`
>    event at module load, exposes a `useInstallPrompt()` hook with
>    `{ canInstall, isInstalled, promptInstall }`. Settings renders a
>    high-contrast purple "Install App" pill at the top of Preferences
>    when the event is available, and a green "Installed as an app"
>    confirmation row when running standalone. Hidden on iOS Safari
>    (where the install path is Share → Add to Home Screen — a button
>    couldn't trigger it anyway).
> 6. **Cleanup** — legacy `public/sw.js` (65-line cache-first SW) and
>    `public/manifest.json` deleted (replaced by plugin output). Manual
>    `navigator.serviceWorker.register('/sw.js')` removed from
>    `main.jsx` and `index.html`. `index.html` now points its
>    favicon at `/icon.svg`, adds `apple-touch-icon`, and sets the
>    proper `theme-color`, `apple-mobile-web-app-title`, and document
>    title.
>
> **Earlier (still load-bearing): UDL Round 3 Part 5 — Personal
> Interests (Star Topics).** Closes the final UDL box. **The UDL
> roadmap is officially 9/9 — every Principle 1, 2, and 3 box
> ticked.** HEAD moves forward by one commit on top of Round 3 Part 4
> (`2932629`).
>
> 1. **Star-topic taxonomy in `src/lib/interests.js`** — 10 curated
>    IGCSE interests (Environment, Travel, Technology, Health, Sports,
>    Food, Education, Community, Family, Work & Jobs) each with id,
>    label, emoji, and a small `matchers[]` bag of lowercase substring
>    hits. Substring-case-insensitive matching means the same
>    `environment` interest fires on both the passage tagged
>    `alam sekitar` AND the scenario titled `Alam Sekitar` without
>    touching the source data files. Pure leaf module — `INTERESTS`,
>    `matchInterests(tokens, starredIds)`, and `prioritiseByInterests
>    (items, starredIds, getTopicTokens)` are all React-free, vitest-
>    pinned without JSDOM.
> 2. **`prioritiseByInterests`** — stable sort that pulls matching
>    items to the front while preserving original order WITHIN the
>    "matched" and "unmatched" groups (no surprise reshuffles for a
>    student who starred two interests). Returns enriched rows
>    `{ item, matchedInterests: Set<string> }` so the caller renders
>    the ⭐ badge from the SAME computation that drives the sort —
>    no risk of "badge shown but item not prioritised" drift.
> 3. **STORE_VERSION 16 → 17** — new `userInterests: []` array,
>    `toggleUserInterest(id)` + `clearUserInterests()` actions.
>    Migration is defaults-empty so returning users see zero change
>    in Comprehension / Roleplay ordering until they opt in. No
>    validation against the catalog at write time so the interest
>    list can grow without a new migration.
> 4. **Settings → "Your Interests" section** — 10 emoji chips between
>    Preferences and Translation & AI. Click toggles; on-state uses
>    the orange palette with a filled Star icon for clear "on"
>    affordance. Counter pill + "Clear all" button appear once any
>    interest is starred. Empty state copy ("Star nothing and
>    ordering stays the same") makes the opt-in semantics explicit.
> 5. **Comprehension + Roleplay list prioritisation** — both pages
>    pull the active list through `prioritiseByInterests`. Matched
>    cards get an orange border + 1px shadow ring, a Star icon next
>    to the title, and a "Your interest" pill in the metadata row.
>    Roleplay's English + Malay scenario tabs both flow through the
>    same helper (English scenarios match by `id` + `title` +
>    `titleEn` since `scenarios.js` doesn't carry a `topic` field).
> 6. **Vitest pin** — new `src/lib/__tests__/interests.test.js`
>    (11 cases): catalog completeness (id uniqueness, named brief
>    interests present, every entry well-formed), `matchInterests`
>    contract (empty/null guards, substring + case-insensitive
>    matching, English-title fallback, full intersection across
>    multiple starred interests, no-star = no-match), and
>    `prioritiseByInterests` contract (identity when no stars,
>    stable sort with star-first ordering, defensive empty/null
>    handling, input non-mutation). Total suite **168/168** (was 157;
>    net +11, no flips).
>
> Earlier Round-3 Part-4 work (still load-bearing):
>
> 1. **Radial SVG tree on `/word-families`** — new
>
> 1. **Radial SVG tree on `/word-families`** — new
>    `src/components/WordFamilyTree.jsx` replaces the static
>    `WordFamilyCard` per-POS list with a 500×500 viewBox SVG. The
>    root sits dead-centre with its `<DictionaryIcon>` embedded via
>    `<foreignObject>`; N derived forms branch out on a deterministic
>    circle (radius 175, first node at -π/2, sweeping clockwise so the
>    layout is identical every render). Forms are POS-grouped (verbs
>    → nouns → adjectives, contiguous arc per group). Cubic-Bezier
>    paths whose control points sit ON the same radial vector keep
>    the curves sweeping outward instead of zig-zagging.
> 2. **Pure layout math, `src/lib/wordFamilyLayout.js`** — `layoutTree`,
>    `sortFormsByPOS`, `bezierPath`, and a `POS_STYLE` palette
>    centralised so the legend + path stroke + node border + + button
>    all read from one source of truth. Leaf module on purpose —
>    vitest pins it without spinning up JSDOM (same pattern as
>    `parseRatingKeyword`, `parseStopKeyword`, `plainifyForSpeech`).
> 3. **Sync-highlight on click** — each node is its own clickable
>    `<g>` that routes through `speakWithBoundaries` (not the
>    fire-and-forget `speak()`). Active node pulses a thicker ring +
>    `animate-pulse` class while TTS is mid-flight; `onEnd`/`onError`
>    flip it off. Speaker ref is cancelled on unmount and on the next
>    click, matching the Roleplay / CikguBot lifecycle pattern. The
>    detail strip below the SVG also tints the active row in the
>    POS soft colour so the link between heard-word and printed-word
>    is unambiguous.
> 4. **Per-node "+ Add to deck"** — small overlay circle at top-left
>    of every node, `<Plus>` icon for new forms, `<Check>` (filled
>    green) for ones already in the deck. Click stops propagation so
>    you don't accidentally also speak the word. Same `addCard`
>    contract the old `WordFamilyCard` had — zero store changes.
> 5. **ADHD-safe styling** — no idle animations anywhere; the only
>    motion is the user-triggered pulse during TTS playback. POS legend
>    strip above the SVG names the colour code in plain language
>    (Kata Kerja / Kata Nama / Kata Sifat) so the colour-to-meaning
>    mapping is explicit, not inferred. All colours through
>    `var(--color-*)` so `.contrast-high` (WCAG-AAA) and
>    `.font-dyslexic` (Lexend) reskin it without touching the SVG.
> 6. **Dead-code cleanup** — `src/components/WordFamilyCard.jsx`
>    deleted (no other call site after the swap; CLAUDE.md says
>    delete confidently rather than keep stubs).
> 7. **Vitest pin** — new `src/lib/__tests__/wordFamilyLayout.test.js`
>    (9 cases): empty/null guard, single-node centred-above contract,
>    radial-circle-and-evenly-spaced contract, Bezier-control-points-
>    on-radial-vector contract, 9-form no-overlap contract (every
>    pairwise distance > 2× node radius — guarantees zero collisions
>    even for the densest root in the corpus), POS bucketing order,
>    unknown-POS defaults to verb, bezierPath SVG-string format,
>    palette completeness. Total suite **157/157** (was 148; net +9,
>    no flips).
>
> Earlier Round-3 Part-3 work (still load-bearing):
>
> 1. **Voice-mode toggle on `/cikgu`** — new "Voice" Headphones button
>
> 1. **Voice-mode toggle on `/cikgu`** — new "Voice" Headphones button
>    in the header (next to the Expert/AI mode toggle). When on, the
>    mic button in the input row stops being a one-shot dictation
>    helper and becomes a full conversation driver: a state machine
>    (`idle → listening → thinking → speaking → idle`) with a status
>    banner above the input that pulses the current phase
>    (red=listening, orange=thinking, purple=speaking).
> 2. **Imperative flow, not setState-in-effect** — the read-aloud
>    pipeline is kicked off directly from the `handleSpeech` event
>    handler after `sendMessage` resolves, NOT from a `useEffect`
>    watching `messages`. Same pattern Roleplay uses. `sendMessage`
>    now returns the assistant content string (all four branches:
>    expert, Gemini, OpenRouter, Supabase, fallback) so the caller
>    can hand it straight to `readResponse(idx, content)`. The only
>    `useEffect` is an unmount cleanup that cancels imperative refs
>    with no setState — passes the `react-hooks/set-state-in-effect`
>    lint that v19's eslint-plugin-react-hooks enforces.
> 3. **Per-word highlight on the spoken bubble** — new
>    `<SpokenMessage>` renderer tokenises the same plainified text
>    that feeds `speakWithBoundaries`, so the visible highlight stays
>    locked to the TTS boundary stream. Bubble swaps `<FormattedText>`
>    → `<SpokenMessage>` only while `speakingMsgIdx === i`; markdown
>    formatting returns after TTS ends. Highlight uses purple
>    (`rgba(124,58,237,0.45)`) consistent with the existing Roleplay /
>    Comprehension Read-Along styling.
> 4. **"Say stop" interrupt** — `startKeywordSpotter` is generalised
>    with an optional `parser` arg (defaults to `parseRatingKeyword`
>    so the flashcard call site is unchanged) and reused with the new
>    `parseStopKeyword` to listen for `stop`/`cancel`/`halt`/`quiet`/
>    `berhenti`/`diam` while the synthesiser is talking. Chromium
>    tolerates concurrent SR + TTS on desktop; on Safari we degrade
>    gracefully — the manual Stop button in the status banner stays
>    available.
> 5. **`plainifyForSpeech` markdown stripper** (also in
>    `src/lib/speech.js`) — covers bold / italic / underline / inline
>    code / links / leading list markers / headings / horizontal
>    rules / table syntax (separator rows dropped, pipes → spaces).
>    Pure leaf so vitest pins it without a JSDOM dance.
> 6. **Vitest pin** — `src/lib/__tests__/speech.test.js` grows from
>    11 → 21 cases: 4 cases for `parseStopKeyword` (registered words,
>    Malay equivalents, substring guard), 6 cases for
>    `plainifyForSpeech` (bold/italic, code/link/headings, lists +
>    HR, table flattening, round-trip-with-tokeniser). Total suite
>    now **148/148** (was 138; net +10 with no flips).
>
> Earlier Round-3 Part-2 work (still load-bearing):
>
> 1. **Speak-to-rate keyword spotter** — `FlashcardMode.jsx` standard
>
> 1. **Speak-to-rate keyword spotter** — `FlashcardMode.jsx` standard
>    & hint variants now ship a Mic toggle next to the front-face
>    Volume2. When on AND the card is flipped AND TTS is not actively
>    reading, a continuous `webkitSpeechRecognition` instance
>    (`en-US`, `continuous=true`, `interimResults=true`) listens for
>    `Again / Hard / Good / Easy` and calls `rate(matched)` the
>    instant a partial transcript contains a keyword. Pulsing
>    `animate-pulse` mic + colour-coded keyword hint show the
>    affordance. New `parseRatingKeyword(transcript)` in
>    `src/lib/speech.js` is the pure leaf — whole-word, case-
>    insensitive, conflict priority `again > hard > good > easy`
>    (conservative grade on self-correction). `startKeywordSpotter()`
>    is the controller (auto-restarts on benign `onend`, swallows
>    `no-speech`/`aborted`, returns `{stop}`).
> 2. **TTS↔ASR gating** — `speak()` extended with a backward-compat
>    4th-arg `options = { onStart, onEnd, onError }` so the
>    flashcard's `isSpeaking` flag flips true while it reads the
>    Malay word aloud and the spotter `useEffect` un-mounts the
>    recogniser (then re-mounts on `onEnd`). Stops the
>    self-recognition loop where the mic would hear "saya" and
>    misfire.
> 3. **Per-card state reset** — `flipped`, `showHint`, `lastMatch`
>    now reset on `card.m` change via the React 19 "adjust state on
>    prop change" pattern (synchronous `if (card?.m !== prev)
>    setState` during render, not a `setState`-in-effect — passes the
>    `react-hooks/set-state-in-effect` lint that the v19 toolchain
>    enforces).
> 4. **Vitest pin** — `src/lib/__tests__/speech.test.js` grows from 5
>    → 11 cases pinning `parseRatingKeyword`: empty/null guard,
>    one-keyword happy path, case-insensitivity + punctuation,
>    substring guard (`hardest`/`goodness`/`uneasy`/`regain` must
>    NOT match), conflict priority, natural-speech phrasings ("try
>    again please", "too easy"). Total suite now **138/138** (was
>    132; net +6 with no flips).
>
> Earlier Round-3 Part-1 work (still load-bearing):
>
> 1. **Connective Checklist (Penanda Wacana sidebar)** — new
>
> 1. **Connective Checklist (Penanda Wacana sidebar)** — new
>    `src/components/writing/ConnectorChecklist.jsx` plus
>    `src/data/connectors.js`. Appears on `/writing` whenever the
>    Bahasa Melayu tab is active, above the textarea. 28 high-yield
>    connectors grouped into 5 buckets: Tambahan (addition),
>    Pertentangan (contrast), Urutan (sequence), Sebab & Akibat
>    (cause/effect), Contoh (example). Each chip lights up in its
>    group colour the instant the student types the phrase — soft
>    word-boundary regex, case-insensitive, accepts variants like
>    `walaubagaimanapun ↔ walau bagaimanapun`, and tolerates extra
>    whitespace between multi-word tokens. Header pill shows total
>    coverage `N/28 used`; each group header shows per-group `n/k`.
>    All colours flow through `var(--color-*)` so the existing
>    `.contrast-high` overlay and `.font-dyslexic` Lexend body font
>    reskin it with zero extra CSS. Collapsible: panel-level + per
>    group, defaults to open so first-time users see the affordance.
> 2. **Vitest pin** — `src/data/__tests__/connectors.test.js` (7
>    cases) locks the detector contract: substring guard (`tetapinya`
>    must NOT match `tetapi`), flexible whitespace between multi-word
>    tokens, registered variants, case insensitivity, coverage stats
>    shape, and the zero-usage path. Total suite now **132/132** (was
>    125; net +7 with no flips).
>
> Earlier Round-2 work (still load-bearing):
>
> 1. **Theme Choice — Dyslexic font + High Contrast** (`7778132`) —
>    UDL Principle 1 closed. New `dyslexicFont` + `highContrast` prefs
>    (both default OFF, opt-in from Settings). `.font-dyslexic` swaps
>    body type to Lexend with +0.02em tracking and 1.6 line-height
>    (research-backed reading-proficiency font; loaded via the existing
>    Google Fonts `<link>` so zero extra preconnects). `.contrast-high`
>    overlays WCAG-AAA tokens on top of dark OR light + auto-bumps every
>    inline 1px-solid border to 2px so card edges read clearly. Composes
>    cleanly with `.light` via specificity (`light.contrast-high` wins).
>    STORE_VERSION bumped 15 → 16 with a defaults-off migration.
>
> 1. **Theme Choice — Dyslexic font + High Contrast** (`7778132`) —
>    UDL Principle 1 closed. New `dyslexicFont` + `highContrast` prefs
>    (both default OFF, opt-in from Settings). `.font-dyslexic` swaps
>    body type to Lexend with +0.02em tracking and 1.6 line-height
>    (research-backed reading-proficiency font; loaded via the existing
>    Google Fonts `<link>` so zero extra preconnects). `.contrast-high`
>    overlays WCAG-AAA tokens on top of dark OR light + auto-bumps every
>    inline 1px-solid border to 2px so card edges read clearly. Composes
>    cleanly with `.light` via specificity (`light.contrast-high` wins).
>    STORE_VERSION bumped 15 → 16 with a defaults-off migration.
> 2. **+20 verb emojis** (`48c211e`, Round 2) — Visual Dictionary map grew
>    50 → 70 entries with the high-yield verb roots called out in §4
>    Item 24: tulis ✍️, ajar 🧑‍🏫, kerja 💼, main 🎮, masak 🍳,
>    jual 💰, beli 🛒, jalan 🚶, cari 🔍, dengar 👂, tanya ❓,
>    fikir 💭, tahu 💡, guna 🔧, ubah 🔄, nyanyi 🎤, lukis 🎨,
>    latih 🏋️, hantar 📤, potong ✂️. Each root blooms 5–7 forms
>    through imbuhan so Roleplay vocab-chip reach ≈ +130 hits.
> 3. **Roleplay Read-Along (the killer feature)** (`9598d16`, Round 2) — §4
>    Item 25(c) lands. AI mode + Static mode examiner bubbles now read
>    aloud with the same ADHD-safe purple word-by-word highlight
>    Comprehension uses. Per-bubble token render, one in-flight
>    speaker shared across the chat, cleanup wired at every state
>    transition (turn advance, Try Again, scenario exit, route change,
>    component unmount). Listen button replaced with a localised
>    `Read along ↔ Stop` toggle. No setState-in-effect anti-pattern.
>
> Build / lint / **168/168 vitest** all green locally. STORE_VERSION = 17.
> **🎉 UDL roadmap is officially 9/9 — every Principle 1, 2, and 3
> box ticked.** With the pedagogical scaffolding closed, the natural
> next axis is content depth, not more UDL plumbing:
> §4 Item 25(a) PDFReader full-page read-along (the third Audio-Visual
> Sync surface), §4 Item 25(b) Flashcard back-face example read-along,
> more dictionary entries (especially derived imbuhan forms — every
> new root unlocks ≥5 word-family nodes), more roleplay scenarios
> (especially for English Paper 0500), more reading passages, more
> grammar drills, or shipping the production polish chapter (PWA
> install banner, analytics, beta-tester telemetry).

---

## 1. Where you are

```
/Users/kheshav/Kheshav/kheshav code/
├── og igcse malay master/        ← DEPRECATED. Slated for archival to avoid maintenance hell.
└── upg-igcse-malay-master/        ← THIS repo. Active. Single Codebase (Free/Pro Toggle).
```

Both clones share the **same GitHub remote** (`godman4242/og-igcse-malay-master.git`).
The "fork" is just two local checkouts on different branches.

**STRATEGIC DIRECTIVE: Single Codebase with Feature Gate**
All future work happens in the **upg** version. Instead of maintaining two codebases, we are using a "Free/Pro Toggle":
- **Free Tier (Guest Mode)**: Full access to learning pedagogy, stored in `localStorage`.
- **Pro Tier (Authenticated)**: Supabase cloud sync + premium AI features, unlocked via Auth.

## 2. Current branch & status (upg repo)

- **Branch:** `main`. PR #2 merged 2026-05-13 19:22 UTC at `7d1c2bb`;
  Round 1 added 9 commits (`1c72eeb` → `2b0aeab`); Round 2 added 3
  more (`7778132`, `48c211e`, `9598d16`). HEAD = `9598d16`. The
  feature branch `feat/phase-a-into-upg` still exists on origin —
  delete it once you're confident no follow-ups need it.
- **Build:** clean. `npm run build` passes locally (Vite 8, requires Node 20+).
- **Lint:** `npm run lint` — 0 errors, 1 pre-existing warning (`MixedSession.jsx:30`
  exhaustive-deps).
- **Tests:** `npm run test:run` — **168/168** pass (120 baseline + 21
  cases in `src/lib/__tests__/speech.test.js` pinning the Read-Along
  tokeniser, the speak-to-rate `parseRatingKeyword`, the Cikgu-voice
  `parseStopKeyword`, and the `plainifyForSpeech` markdown stripper
  + 7 cases in `src/data/__tests__/connectors.test.js` pinning the
  Penanda-Wacana detector + 9 cases in
  `src/lib/__tests__/wordFamilyLayout.test.js` pinning the radial
  layout math + 11 cases in
  `src/lib/__tests__/interests.test.js` pinning the personal-interest
  catalog, matcher, and prioritisation sort).
- **CI on `main`:** all jobs green (Node bumped 18 → 20 in commit
  `8f4668e`; Vercel deploy action swapped from removed
  `vercel/vercel-action@v23` to `amondnet/vercel-action@v25` on
  2026-05-14, commit `1c72eeb`).
- **Store schema:** STORE_VERSION = 17 (v17 migration adds
  `userInterests: []`, defaults-empty so the Comprehension + Roleplay
  ordering stays untouched until a student stars something). v16 still
  adds `dyslexicFont` + `highContrast` (both default off). v15 still
  defaults `showDictionaryImages: true`.
- **PWA:** `vite-plugin-pwa` v1.3+, `generateSW` strategy. 60 precache
  entries totalling 1.88 MiB. Service worker emitted at `dist/sw.js`,
  manifest at `dist/manifest.webmanifest`. Icons in `public/icon-{192,
  512,512-maskable}.png` + `public/icon.svg` (vector source). To
  re-rasterize after editing the SVG: `node scripts/build-icons.mjs`.
- **Working tree:** clean.

## 3. What is DONE — do NOT redo

### From og's Phase A (just merged in)
- ✅ **Translation router** (`src/lib/translate.js`) — DeepL → Google → free `gtx`
- ✅ **PDF Reader** at `/pdf-reader` — drop, click=word, drag=phrase, Select mode
- ✅ **Import page tabs** — paste / PDF upload, sticky result panels
- ✅ **Writing grader** (`src/lib/writingGrader.js`) — 21 IGCSE formats, EN+MY, auto-detect
- ✅ **Writing Tutor** (`src/components/WritingTutor.jsx`) — Gemini Flash, follow-up Q&A
- ✅ **Speaking page** at `/speaking` — IGCSE Paper 3 grader (heuristic + Gemini AI),
  filler-word detection, discourse-marker checking, type-token ratio, words-per-second
- ✅ **Cikgu Maya** — prefers Gemini over OpenRouter
- ✅ **Settings → Translation & AI** — provider radios, cache controls
- ✅ **Roleplay lint fix** — opening message in `useState` initializer
- ✅ **Lint sweep** — 154 pre-existing errors fixed; eslint ignores nested clone + scripts

### From upg's prior work (preserved)
- ✅ **Supabase cloud sync** — `src/lib/cloudSync.js`, `src/lib/syncEngine.js`, queue + retry
- ✅ **Telemetry** — `src/lib/telemetry.js`, dual-write localStorage + Supabase
- ✅ **AuthUnlock** — `src/components/AuthUnlock.jsx` for enhanced/admin/owner tiers
- ✅ **Service worker** — `public/sw.js`
- ✅ **Network/sync UI** — header pill in `Layout.jsx`

### Conflict resolutions (during the merge)
- **`src/lib/speakingGrader.js`** — kept og's version. Reason: IGCSE-rubric-aligned,
  filler-word detection, fluency by duration, evidence-based AI feedback. upg's
  scenario-based grader was better suited for roleplay (which has its own grader).
- **`src/pages/Speaking.jsx`** — kept og's version (paired with the grader above).
- **`src/store/useStore.js`** — kept STORE_VERSION = 9 (upg's), v8 migration adds
  og's fields (translation, writingTutor, writingHistory, speakingHistory,
  pdfRecents), v9 migration is redundant-but-harmless.
- **`src/components/Layout.jsx`** — auto-merged; deduped a duplicate `/speaking`
  MORE_ITEM that both branches added.

### English writing analyzer accuracy overhaul (2026-05-05)
- ✅ **`src/lib/writingErrors.js`** (NEW, ~700 lines) — rule-based English
  grammar/style engine. Returns `{type, severity, start, end, excerpt,
  message, suggestion}` per finding. Detects: 200+ misspellings,
  apostrophe-missing contractions (dont/didnt/etc.), confusables
  (their/there/they're, its/it's, then/than, affect/effect, lose/loose,
  accept/except, advice/advise, less/fewer, would-of, …), a/an articles,
  repeated words, capitalization, SVA patterns, double negatives,
  comma splice / run-on / fragment with conservative guards (skip
  letter greetings, transitional phrases, intro phrases ≤4 words),
  weak/filler words, cliches, wordy phrases, contractions in formal
  formats. **Tense-shift detection is intentionally disabled** — needs
  clause-level parsing to avoid false positives on grammatical
  generic-present clauses inside past-tense narration; LLM tutor
  handles it.
- ✅ **`src/lib/writingGrader.js`** — added real metrics: TTR (with
  100-word MSTTR window for length bias), sentence-length σ, complex
  ratio, opener variety, long-word ratio, avg syllables/word, unique
  discourse markers, error density per 100w. Replaced single-band
  English scoring with **multi-criterion sub-bands**: Content (25%),
  Accuracy (25%), Vocabulary (20%), Sentence Variety (15%), Cohesion
  (10%), Format (5%). Hard cap: overall ≤ accuracy + 1, so a
  high-error essay cannot reach band 6.
- ✅ **`src/pages/Writing.jsx`** — `SubBandsPanel` (band-breakdown grid
  with the 10 metric lines exposed) + `IssuesPanel` (severity filters,
  inline highlighted essay with wavy underlines, click-to-expand
  findings list).
- ✅ **`src/components/WritingTutor.jsx`** — Gemini system prompt now
  pre-loaded with sub-bands, metrics, and top 25 rule-engine findings
  as ground-truth evidence. LLM is told to "agree or disagree, do not
  invent new ones" — fixes the prior hallucinated-issue problem.
- **Calibration:** error-laden essay → 24 real findings; clean formal
  letter → 0 false positives; narrative w/ dialogue + past narration
  → 0 false positives.
- **Future-work pointer:** if accuracy still falls short, the next
  natural step is to layer `retext-spell` + `dictionary-en` (true
  spell check) and/or `harper-wasm` for parser-grade grammar checks.
  Bundle cost ~300–500 KB; acceptable on a desktop revision tool.
  Malay analyzer is unchanged — it still uses the same count-based
  metrics; mirroring this rule engine for Malay (imbuhan, register
  errors) is a future task.

### Learning-quality pass (added on top of the merge)
- ✅ **Bug fix:** speaking sessions weren't syncing to Supabase. The merge had
  left two log actions; `logSpeakingSession` (used by the page) didn't enqueue
  cloud sync. Fixed in `8a83348` — now generates a UUID, calls `trackEvent`,
  and enqueues a sync event.
- ✅ **Telemetry wiring** — added `speaking_attempt`, `writing_analyzed`,
  `pdf_opened`, `roleplay_completed` events at the store-action level so they
  fire regardless of caller. Card-review telemetry deliberately skipped (would
  saturate the 500-event localStorage cap).
- ✅ **English Comprehension** — three IGCSE 0500/0510-style passages added
  (narrative "The Empty Seat", argumentative "Are Phones Really the Problem?",
  environmental informative "The Cities Beneath the Waves"). Added `lang`
  field to all passages. Page now shows EN/MY pill, gates dictionary lookup
  to Malay, switches TTS voice, localises feedback text.
- ✅ **AI question generation in Comprehension** — was stubbed; now wired.
  "Get fresh AI questions" button calls Gemini with a prompt for 5 fresh
  IGCSE-style MCQs in the passage's language. Gracefully hidden when no key.
- ✅ **AI prompt tightening** (Speaking, Writing tutor, Cikgu) — replaced
  abstract criteria with band descriptors, language-specific focus blocks
  (Malay = imbuhan/tense/connectors/penanda wacana/register; English =
  tense consistency/SVA/comma splices/sentence variety/vocab precision),
  evidence-anchored output, anti-grade-inflation guards, and concrete-drill
  "next step" requirements.
- ✅ **5 new speaking topics** — `cita-cita` (career), `cabaran` (challenge
  overcome), `perayaan` (festival), `buku` (book that changed me),
  `bandar-kampung` (city vs village). Now 15 topics rotating through
  narrative / opinion / cultural / reflection / comparative genres.

### Malay analyzer + analyzer-driven banding (2026-05-06, commit 7481b75)
- ✅ **`src/lib/writingErrorsMalay.js`** (NEW, ~830 lines) — mirror of
  the English engine for Bahasa Melayu. Detects MS misspellings
  (kerena/masaalah/ibubapa…), imbuhan errors (mempukul→memukul,
  mengkira→mengira, mensapu→menyapu, mentulis→menulis,
  merubah→mengubah, mempertingkatkan→meningkatkan), preposition fixes
  (dari pada→daripada, kerumah→ke rumah, walaubagaimanapun, terdiri
  dari→terdiri daripada), slang in formal contexts (tak/nak/dah/
  macam/lah/je/sgt…), repeated words, capitalization, run-ons, closing
  markers placed too early, tense conflicts (sudah/sedang/akan +
  conflicting markers), style nudges. Reduplication-safe (kanak-kanak
  treated as a single token). Calibrated against clean rencana,
  noisy tak/nak text, and quoted-dialog narratives.
- ✅ **`src/lib/writingGrader.js`** — Malay branch now runs through
  `bandMalayCriteria` mirroring the English sub-band engine: Content
  (25%), Accuracy (25%), Vocabulary (20%), Variety (15%), Cohesion
  (10%), Format (5%), with the same hard caps (overall ≤ accuracy + 1,
  capped to content if word-count < minW × 0.6). MS-specific
  sophisticated-vocab list (segolongan/sebaliknya/ironinya/kompleks/
  signifikan/lazim/tradisional/…), MS stop-word list, MS syllable
  estimator. WritingTutor evidence block now active for both languages.
- ✅ **AI hybrid evaluator (Phase C, commits 4778edb → cbaee66)**:
  Gemini-based `fetchAIGrade` runs alongside the local analyzer, fed
  the local metrics + top findings + format markers as evidence.
  System prompt includes chain-of-thought ("step_by_step_reasoning"),
  explicit anti-central-tendency calibration ("you MUST use the full
  1-6 range"), hard thresholds tied to local evidence, and band
  descriptors. Structured JSON output. UI surfaces AI band, marker
  checklist, positives, improvements; falls back to local heuristic
  band when the API errors (no silent failures — error surfaces in
  UI).
- ✅ **Pronunciation diff feedback on Speaking (commit 37ded14)** —
  `src/lib/diff.js` (LCS word diff). `Speaking.jsx` renders a coloured
  diff between student transcript and Gemini's `improvedTranscript`:
  green pills for additions, red strikethrough for removals,
  unchanged in body colour.

### Insights pass (2026-05-09)
- ✅ **`src/lib/patterns.js`** — added `weakestWritingFormats(history,
  limit)` and `weakestSpeakingTopics(history, limit)` helpers built on
  a generic `aggregateByKey`.
- ✅ **`src/pages/MistakeJournal.jsx`** — new "Performance Trends"
  section between filter tabs and pattern clusters. Shows weakest
  writing formats and speaking topics with avg/last/total stats and
  a "Practice" jump button. Empty-state guard updated to consider
  these signals.
- ✅ **`src/pages/Dashboard.jsx`** — `<RecentPerformance>` card surfaces
  last band + weakest formats and topics for both Writing and
  Speaking, gated on having any history; navigates to /writing or
  /speaking on click.

### Format coverage round-out (2026-05-09)
- ✅ **English: Review, Interview Transcript, Diary** — added to
  `FORMATS` in `writingGrader.js`. Review is the most common Paper 2
  Section 1 directed-writing task that wasn't covered.
- ✅ **Malay: Wawancara, Berita, Autobiografi** — added to `FORMATS`.
  Wawancara is a key 0546 Paper 2 task; Berita and Autobiografi round
  out long-form factual coverage. New formal formats (`ms-berita`,
  `ms-autobiografi`) flag slang/contractions. `eng-speech` added to
  English formal-format set.
- ✅ **Lint clean** — no errors after the format pass.

### Learning-content lifts (2026-05-09, commits da9ac57 → f8675c2)

- ✅ **Band-6 exemplars per format** (`src/data/exemplars.js`,
  `Writing.jsx#ExemplarPanel`, commit da9ac57) — annotated opening +
  closing paragraphs for 14 IGCSE formats (7 EN, 7 MS). Each
  annotation highlights a vocab / cohesion / format / craft technique
  that earns marks. Surfaced as a collapsible panel above the
  textarea once a specific format is selected (or auto-detected),
  so students see what the top band looks like *before* they draft.
  Renderer uses non-overlapping range walk + paragraph-aware splitter;
  all 14 exemplars × annotations verified to exist verbatim.

- ✅ **254 curated vocab example sentences**
  (`src/data/dictionaryExamples.js`, commit da9ac57) — full coverage
  of the 254 unique seed words across the 13 topic packs. Replaces
  the old `'kerja (work).'` placeholder pattern with real,
  IGCSE-register Malay sentences (7-15 words, headword used in
  natural context, concrete situational framing). `loadTopicPack`
  reads from EXAMPLES first; STORE_VERSION bumped to 10 with a
  migration that detects the placeholder pattern and upgrades existing
  cards in place. The cloze study mode (`Study.jsx`) automatically
  benefits — it now shows real sentences with the headword blanked.

- ✅ **English grammar drills + language toggle**
  (`src/data/grammarEng.js`, `Grammar.jsx`, commit 1df4618) — the
  Grammar page was Malay-only. Now a top-level lang toggle swaps the
  whole experience: Bahasa Melayu (5 tabs: Imbuhan / Tense / Find
  Error / Transform / Rules) vs English (7 tabs: Confusables / Tense
  / SVA / Articles / Find Error / Transform / Rules). 60+ English
  drills covering 15 mixed tenses, 12 SVA traps, 12 article patterns,
  15 high-yield confusables (their/there/they're, its/it's, fewer/
  less, would-of, …), 10 sentence-level error-spotters, 9 transforms
  (active↔passive, direct→reported, second conditional, so→too,
  relative clauses). Shared `<McqDrillCard>` component matches
  Tense-card styling for visual parity.

- ✅ **English speaking practice** (`src/data/speakingTopics.js
  TOPICS_EN`, `src/lib/speakingGrader.js`, `src/pages/Speaking.jsx`,
  commit f8675c2) — Speaking page was Malay-only. Now language-aware:
  10 English topics (family, school, hobby, technology, environment,
  future, book/film, challenge, city/village, friendship), each
  written for 0500/0510 register and pushing argument + concrete
  example over generic listing. Grader is fully parametrised:
  PW_EN (30 discourse markers), FORM_EN (40 sophisticated lexicon
  items), language-specific filler list (drops Malay particles in
  English mode and adds English-specific fillers like / you know /
  basically). `aiGrade` selects SYS_PROMPT_EN vs SYS_PROMPT_MS
  with rubric-correct band descriptors and pitfall lists. Speech
  recognition + TTS switch between en-GB and ms-MY. Recent-sessions
  recents look up from both topic arrays so a learner can switch
  languages without losing prior bands.

### Coverage round-out (2026-05-10)

- ✅ **English roleplay scenarios** (`src/data/scenarios.js#SCENARIOS_EN`,
  `src/pages/Roleplay.jsx`) — 7 IGCSE 0500/0510 scenarios (lost luggage,
  faulty product return, hotel booking, asking directions, café job
  interview, hospital visit, noisy neighbour). Lang toggle on Roleplay
  swaps the scenario list. Static-mode evaluator stays Malay-only;
  English scenarios are AI-only with a friendly fallback when the
  daily quota is exhausted. RoleplaySession now picks SR/TTS locale
  from `scenario.lang`.
- ✅ **Listening (Paper 4)** (`src/data/listeningPassages.js`,
  `src/pages/Listening.jsx`, route `/listening`) — TTS-rendered passages
  with replay limit (max 2, second play slower). Questions stay locked
  until at least one play completes. 6 starter passages (3 EN, 3 MS)
  covering announcements, voicemails, briefings, news. Wrong answers
  feed the unified mistake pipeline as `type='comprehension'` with a
  `[Listening]` prefix. Lazy-loaded route + Layout drawer entry.
- ✅ **Mistakes-deck shortcut** (`src/pages/MistakeJournal.jsx`,
  `src/pages/Dashboard.jsx`) — auto-promoted mistakes already land in a
  deck tagged 'Mistakes'. The Mistake Journal grows a 2-up CTA
  ("Practice all" + "Mistakes deck (N)") and the Dashboard's first
  Quick Action swaps to a red→orange "Mistakes deck (N)" gradient
  when the deck is non-empty.

### Pillar 4 — Performance + bundle split (2026-05-10)

- ✅ **Route-level code splitting** (`src/App.jsx`) — every page except
  Dashboard is `React.lazy()`-imported and wrapped in `<Suspense>`.
  Initial JS bundle dropped from **1,323 KB / 390 KB gzipped** to
  **421 KB / 128 KB gzipped** (~3x reduction). pdfjs is its own
  330 KB chunk that only loads when `/pdf-reader` is opened. Each route
  is its own chunk under 70 KB.
- ✅ **Memoized Dashboard widgets** — `ProgressSparkline` and
  `WorstTurnWidget` wrapped in `React.memo`; `worstSpeak` and `rolling`
  computed with `useMemo` so they don't re-run when unrelated store state
  changes.
- ✅ **Stable empty-array refs** — Speaking page no longer uses
  `?? []` inside the selector (which would allocate a new array every
  render and bust shallow equality); switched to a module-level
  `EMPTY_ARR` plus `useMemo` for the recents slice.

### Pillar 2 — Spaced exam rehearsal (2026-05-10)

- ✅ **New `/exam-rehearsal` route** (`src/pages/ExamRehearsal.jsx`) —
  30-minute IGCSE simulation: comprehension passage (8 min) → directed
  writing prompt auto-derived from the passage (12 min) → 90-second
  spoken defense (10 min). Soft per-stage timers; reuses existing
  `gradeWriting` and `heuristicGrade` libraries; no new AI calls.
- ✅ **Composite Exam Readiness %** — `getExamReadiness()` blends
  comprehension (30%), writing band (35%), speaking band (35%) into a
  0-100 score, then smooths the latest attempt (70%) against the
  previous three (30%). Surfaced as a prominent CTA card on the
  Dashboard with "due now" highlight when the FSRS-style schedule says
  it's time.
- ✅ **FSRS-style scheduling** — `getNextExamDue()` clamps the next
  rehearsal to 3-30 days based on smoothed readiness.
- ✅ **Store version 11 → 12** — `examAttempts` array (capped at 50),
  migration adds the array. `logExamAttempt` writes per-attempt records
  and enqueues a sync event.
- ✅ **Routes wired** — `/exam-rehearsal` added to `App.jsx`, surfaced in
  the Layout "More" drawer with the Trophy icon at the top of the list.

### Pillar 1 — Universal mistake pipeline (2026-05-10, commit d01fc6b)

- ✅ **Mistakes flow through one stream** — Writing sentence-level errors,
  roleplay key-phrase misses + per-turn grammar notes, comprehension wrong
  answers, and low-band speaking sessions all call `addMistake` with rich
  context (`type`, `category`, `severity`, `surface`, `correction`,
  `language`). Existing `mistakeReasons` and existing call sites stay
  working.
- ✅ **Auto-promotion to FSRS cards** — vocab/imbuhan mistakes with a
  Malay headword + English correction become cards in a `Mistakes` deck
  (elevated initial difficulty). Manual promotion via `+ Card` button on
  each row in the journal and Dashboard widget.
- ✅ **Dedup + escalation** — `addMistake` dedupes by content hash within
  24h and bumps an attempts counter; severity escalates (low→med→high)
  as a mistake recurs.
- ✅ **Fix-Up queue** — `getFixUpQueue(limit)` returns top mistakes ranked
  by severity × recency, deduped per word. Surfaced as a 3-row card on
  the Dashboard with inline promote/fix actions, and as the canonical
  feed in the Mistake Journal.
- ✅ **Rich Journal UI** — category pills (Vocab / Imbuhan / Tense /
  Spelling / Cohesion / Register / Pronunciation / Comprehension /
  Fluency / Other), source icons (writing / roleplay / speaking / comp),
  severity dots, attempts counter, given→correct diff, language tag.
  Filter chips become category-driven.
- ✅ **STORE_VERSION 10 → 11** — migration backfills new fields on
  legacy mistake records without losing data.

## 4. What is NOT done — open work

| #   | Task                                       | Where to start                                         |
| --- | ------------------------------------------ | ------------------------------------------------------ |
| 1   | ✅ Open the PR for the merge               | DONE. PR #2 **MERGED** to `main` 2026-05-13 19:22 UTC (commit `7d1c2bb`). |
| 2   | ✅ Smoke-test in browser before merging PR #2 | DONE. Antigravity browser-agent ran the full per-route checklist; all 10 points passed including the new UDL goal toggle and the `/speaking` timeout warning. |
| 3   | ✅ Pronunciation diff feedback on Speaking | DONE (commit 37ded14). |
| 4   | ✅ Mistake review surfacing                | DONE. |
| 5   | ✅ Dashboard insights                      | DONE. |
| 6   | More dictionary entries                    | `src/data/dictionary.js` has 804 headwords. The 254 used by topic packs now have `dictionaryExamples.js` coverage. Adding more requires (a) a new headword in `dictionary.js`, (b) a topic pack assignment, and (c) an example sentence. Quality > quantity. |
| 7   | ✅ English writing format examples         | DONE. |
| 8   | ✅ Mirror writingErrors.js for Malay       | DONE. |
| 9   | Optional: layered spell check              | If misspellings still slip through, add `retext-spell` + `dictionary-en` lazy-loaded behind the existing rule engine (~300–500 KB). |
| 10  | ✅ Per-format band-5/6 exemplar essays | DONE — **27 of 27** coverage. Round 1 (7) + Round 2 (7) + Round 3 (6: `eng-directed`, `ms-directed`, `ms-email`, `eng-diary`, `ms-autobiografi`, `eng-interview`). Cross-checked: every `id:` in `src/lib/writingGrader.js` has a matching key in `src/data/exemplars.js`; zero orphans. Per-entry shape: `{ opening, closing, annotations: [{ phrase, category: 'vocab'\|'cohesion'\|'format'\|'craft' }] }`. Adding new formats in the future = add to grader AND drop a matching exemplar key. |
| 11  | ✅ English roleplay scenarios              | DONE — 7 scenarios + lang toggle. |
| 12  | ✅ IGCSE Listening (Paper 4)               | DONE — `/listening` MVP with 6 passages (3 EN, 3 MS), TTS replay, locked questions, mistake-pipeline integration. Adding more passages is purely additive content. |
| 13  | More comprehension passages                | `src/data/comprehensionPassages.js` has 8 passages (5 ms + 3 en). Both syllabuses benefit from more practice across genres. |
| 14  | Decide og branch fate (now actionable)     | PR #2 is merged. Safe to delete `feat/pdf-translator-writing-upgrade-og` from origin, plus the now-merged `feat/phase-a-into-upg` if no follow-ups need it. |
| 22  | ✅ Fix Vercel deploy workflow rot           | DONE 2026-05-14. Both `deploy-preview` and `deploy-production` jobs now use `amondnet/vercel-action@v25` (with `github-token` for PR comments and `vercel-args: '--prod'` on production). Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` are still required in repo settings. |
| 15  | ✅ Mistakes pipeline + auto-promotion      | DONE — Pillar 1. Universal mistake stream from Writing/Roleplay/Comprehension/Speaking → MistakeJournal → auto-FSRS card promotion → Mistakes deck shortcut from Dashboard + Journal. |
| 16  | ✅ Spaced exam rehearsal                   | DONE — Pillar 2. `/exam-rehearsal` 30-min IGCSE simulation. Composite Exam Readiness % on Dashboard. |
| 17  | ✅ Worst-turn widget + 30-day chart        | DONE — Pillar 3. |
| 18  | ✅ Code-splitting + memoization            | DONE — Pillar 4. Initial JS dropped 1.3 MB → 421 KB. |
| 19  | ✅ Vitest pin on graders + FSRS            | DONE. 79 tests across `fsrs`, `writingErrors`, `writingErrorsMalay`, `writingGrader`, `speakingGrader`, `writingMistakeHarvest`. Run with `npm test` (watch) or `npm run test:run` (CI). |
| 20  | ✅ Writing.jsx atomic refactor             | DONE. Page 1042 → 367 lines. Logic split into `useWritingEvaluator` hook + 6 components in `src/components/writing/` + `lib/writingMistakeHarvest.js` + `lib/json.js`. ZERO behaviour change — same render tree, same store interactions. |
| 21  | ✅ Study.jsx atomic refactor               | DONE. Page 1016 → 149 lines. Logic split into `useStudySession` hook + 6 mode components + 2 shared sub-components + SessionSummary in `src/components/study/` + `lib/study/quizOptions.js`. 10 new Vitest cases pin the seeded RNG and quiz-option generator. ZERO behaviour change. Mode components remount per-card via React `key` so per-mode local state resets cleanly without the old global `nextCard()` state-clear sweep. |
| 23  | Tier-1 AI dictionary icons (BLOCKED on provider) | Infrastructure shipped 2026-05-14 (`2b0aeab`): `scripts/generate-dict-icons.mjs` + manifest + resolver upgrade. **Blocked**: Gemini free tier has `limit: 0` for `gemini-2.5-flash-image`. Provider options (user picked "defer" 2026-05-14): (a) Gemini billing — ~$3.85 for 50 icons at $0.077/image, script works unchanged; (b) Replicate Flux Schnell — ~$0.15 for 50, needs ~30-line adapter in the script + `REPLICATE_API_TOKEN`; (c) OpenAI DALL-E 3 — ~$2 for 50, needs OpenAI adapter + `OPENAI_API_KEY`. When ready: pick provider, set env var, `npm run gen:dict-icons -- --only=rumah,nasi,ayam,buku,kereta` first (5-word style check), review, then drop `--only` to do the rest. Resolver auto-prefers manifest hits — no call-site changes required. |
| 24  | ✅ Expand Tier-0 emoji map (+20 verbs)     | DONE 2026-05-14 night, commit `48c211e`. `src/data/dictionaryIcons.js` now 50 → 70 entries; the 20 verb roots from the original brief (tulis, ajar, kerja, main, masak, jual, beli, jalan, cari, dengar, tanya, fikir, tahu, guna, ubah, nyanyi, lukis, latih, hantar, potong) all landed. Skips honoured: pandu / tinggal / bangun. |
| 25  | Extend Read-Along to other surfaces        | (c) ✅ **DONE 2026-05-14 night, commit `9598d16`** — Roleplay AI mode + Static mode examiner turns now read aloud with the same purple word-highlight Comprehension uses. Per-bubble tokenised render, single in-flight speaker shared across the chat, cleanup at turn-advance / retry / scenario-exit / unmount. Still open: (a) PDFReader full-page read-along — layer on top of existing tap-translate without breaking it; (b) Flashcard example sentence read-along on the back face with intra-sentence highlight. |
| 26  | ✅ UDL Principle 1 — Theme Choice          | DONE 2026-05-14 night, commit `7778132`. Dyslexic-friendly Lexend font + WCAG-AAA high-contrast overlay. Both opt-in from Settings (defaults off so returning users see no change). STORE_VERSION 15 → 16. Closes the last two unchecked boxes on UDL Principle 1 (the Goal-level box was already ticked). |

### Testing layer (2026-05-10)

- ✅ **Vitest 4 added** (`vite.config.js` test block, `node` env, no jsdom — pure-fn libs only).
- ✅ **`src/lib/__tests__/fsrs.test.js`** — pins createNewCardState shape, migrateFromSM2 box mapping, getSchedulingOptions returns 4 ratings with valid card+interval, reviewCard advances reps, Again on a mature card bumps lapses, isDue/getDueCards/sortByPriority correctness, buildComebackQueue ordering.
- ✅ **`src/lib/__tests__/writingErrors.test.js`** — pins specific confusable IDs (`would-of-error`, `then-comparative-error`, `between-you-and-i`, `their-be-verb`), finding shape invariants, sort order, summariseIssues math, AND the calibration negatives (clean formal letter → 0 high-severity; dialogue narrative ≤ 1 high).
- ✅ **`src/lib/__tests__/writingErrorsMalay.test.js`** — pins all 6 imbuhan rewrites (mempukul→memukul etc.), 5 preposition fixes (dari pada, kerumah, walaubagaimanapun, …), slang-gating-by-format (only fires inside formal contexts), reduplication-safe tokenisation (kanak-kanak), clean rencana → 0 high-severity.
- ✅ **`src/lib/__tests__/writingGrader.test.js`** — pins listFormats partition, autoDetectFormat picks the right format from markers, both hard caps (overall ≤ accuracy + 1; overall ≤ content when wlen < minW × 0.6), full result shape EN+MS, Malay too-short message in Malay.
- ✅ **`src/lib/__tests__/speakingGrader.test.js`** — pins return shape, all-7-gates-met → band 6, degraded path → ≤ band 3, lang-specific filler list swap (Malay particles count in MS mode but not EN; English fillers like/you-know count in EN mode), cue coverage arithmetic, wps math.

This is the safety net that future Architectural Detox work (extracting hooks out of `Writing.jsx` / `Study.jsx`) will depend on — refactor with confidence that the calibrated thresholds didn't drift.

### Writing.jsx atomic refactor (2026-05-10)

Phase 1 of the Architectural Detox plan. `Writing.jsx` shrank from
**1042 → 367 lines** with **zero behaviour change** — identical render
tree, identical store wiring, identical AI-grade flow.

New layout:

```
src/
  hooks/
    useWritingEvaluator.js     ← owns text/results/aiFeedback/isAIGrading
                                  state + analyze() (local + Gemini hybrid)
                                  + getAIFeedback() (Claude path) + reset()
  components/writing/
    Stat.jsx                   ← 10-line label/value row
    TemplatesView.jsx          ← Paper 4 Q3 karangan templates accordion
    SubBandsPanel.jsx          ← band breakdown grid + 10 metric lines
    IssuesPanel.jsx            ← severity filter + inline highlighted essay
                                  + click-to-expand finding list
    ExemplarPanel.jsx          ← annotated band-6 opening/closing exemplar
    AIFeedbackPanel.jsx        ← Claude AI sentence-level feedback render
  lib/
    writingMistakeHarvest.js   ← pure mapper: grader-result → mistake batch
                                  (also handles AI improvements branch).
                                  Pinned by 17 Vitest cases.
    json.js                    ← shared tryParseJSON (LLM JSON unwrap)
  pages/
    Writing.jsx                ← orchestration: lang/format/paper state +
                                  layout shell that composes the above
```

The hook owns the entire evaluator state machine and exposes the
minimum surface the page needs: `{ text, setText, results, aiFeedback,
isAIGrading, analyze, getAIFeedback, ai, reset }`. Two AI paths run
independently inside it:

- **English Gemini hybrid grader** (`fetchAIGrade`) fires automatically
  inside `analyze()` when `lang === 'eng'` and a Gemini key is
  configured. AI band overrides local band; on failure, local band is
  preserved and the failure surfaces in a toast (no silent fallback).
- **Claude-via-Edge-Function** (`useAI`) is opt-in — the user clicks
  "Get AI Feedback" and uses one of their daily quota calls. JSON
  output goes through `tryParseJSON` (now in `lib/json.js`).

The harvest module is the field-mapping that used to be inlined as
`harvestMistakesFromGrade`. Its 17 test cases pin the routing of
sentence-level errors (`type === 'imbuhan' | 'tense' | 'spelling' |
'register' | 'cohesion' | 'other'`), severity mapping (`'high'` stays
`'high'`, everything else becomes `'med'`), the Malay-only
`imbuhanAnalysis.incorrect[]` branch (with the `correct || suggested`
fallback), and the AI-improvements branch (severity escalates to
`'high'` when `band ≤ 3`, surface clipped to 140 chars).

Smoke-test plan after pulling this branch:

1. `npm run dev`, open `/writing`.
2. Toggle EN ↔ MS ↔ Templates — all three render and clear on switch.
3. Pick a specific format (e.g. Formal Letter) — exemplar panel
   appears above the textarea.
4. Paste an essay, click Analyze — band score, sub-bands, issues panel
   (with wavy underlines), tips render.
5. With a Gemini key set: AI grade overrides band, marker_check chips
   appear, justification line appears.
6. Templates tab → karangan accordion expands.

### Study.jsx atomic refactor (2026-05-10)

Phase 1 of the Zero-Waste Cognitive Engine, second slice. `Study.jsx`
shrank from **1016 → 149 lines** with **zero behaviour change** —
same FSRS scheduling, same comeback warm-up, same end-of-session
summary, same keyboard shortcuts, same five flashcard variants.

New layout:

```
src/
  hooks/
    useStudySession.js                 ← owns the entire session state
                                          machine: queue, mode, cardIdx,
                                          sessionStats, comeback, confidence,
                                          pendingWrongWord, vocabTip + the
                                          central rate() / nextCard() actions
  components/study/
    FlashcardMode.jsx                  ← 5 sub-variants (standard, hint,
                                          reverse, cloze, audio, produce);
                                          owns flipped/showHint/per-input
                                          state; mounts the FC keyboard
                                          handler lifecycle-correctly
    QuizMode.jsx                       ← 4 MCQ buttons via generateQuizOptions
    TypeMode.jsx, ListenMode.jsx,
    ClozeMode.jsx                      ← single-input modes
    SpeakMode.jsx                      ← speech-recognition + pronunciation diff
    ConfidenceSlot.jsx                 ← shared metacognitive prompt
    WrongExtras.jsx                    ← shared "why wrong?" reason chips +
                                          hypercorrect callout
    SessionSummary.jsx                 ← end-of-session screen with optimal-
                                          challenge prompt + reflection prompt
  lib/study/
    quizOptions.js                     ← seededRandom + generateQuizOptions
                                          (pinned by 10 Vitest cases —
                                          determinism, uniqueness, includes
                                          correct answer, infinite-loop guard)
  pages/
    Study.jsx                          ← shell: deck picker, progress bar,
                                          comeback banner, mode picker, stats
                                          row, mounts the right Mode by
                                          card key, bottom Skip button
```

The hook surface is intentionally wide (one orchestrator, not five
nested hooks) because every mode component needs to read the same
session-shared state (confidence, pendingWrongWord, scheduling preview)
and the same actions (rate, nextCard, tagReason, setMode). Splitting
it would force prop-drilling without semantic gain.

The key architectural shift for the upcoming Phase 4 work (framer-motion
transitions): mode components are **remounted per card** via
`<XMode key={cardKey} ... />`. The previous approach was one persistent
mount that the global `nextCard()` swept by manually clearing 19
useState pairs — an `<AnimatePresence>` wrapper would have been
impossible to add safely on that surface. Now each card's mode mount
is a clean unmount → enter, which AnimatePresence will pick up
naturally.

Smoke-test plan after pulling:

1. `npm run dev`, open `/study`.
2. Cycle through all 6 modes (FC, Quiz, Type, Listen, Cloze, Speak) on
   the same deck — each renders, accepts input, advances on rate.
3. Flashcard adaptive variants — let FSRS surface a `reverse` / `cloze`
   / `audio` / `produce` variant (or pick a card with stability ≥ 7d
   to trigger one) and confirm the variant block renders correctly.
4. Wrong answer in Quiz / Type → "Why?" reason chips appear; tagging
   one persists to the mistake journal.
5. Confidence prompt appears once per non-flashcard card; logging it
   then answering "wrong" while confidence == 3 surfaces the
   hypercorrect callout.
6. Comeback warm-up (set `lastSessionAt` to >7 days ago in dev tools
   localStorage to trigger) shows the purple banner + 5-dot progress.
7. Finish all due cards → Session Summary with stats + optional
   challenge / reflection prompts.
8. Keyboard: in FC mode, Space flips, 1/2/3/4 rate, S speaks, N/→ skips.


### UDL Round 1 — Visual Dictionary + Read-Along (2026-05-14 evening)

A Universal Design for Learning sprint on top of the merged PR #2
work. 9 commits, all on `main`, three coherent feature families.

**Visual Dictionary** — Tier-0 emoji + dormant Tier-1 image pipeline:
- `src/data/dictionaryIcons.js` — 50 hand-curated Malay→emoji
  mappings, IGCSE-frequency weighted (people / food / body /
  transport / places / nature / colours / time).
- `src/lib/dictionaryIcon.js` — single resolver `getDictionaryIcon(word)`.
  Returns `{ kind: 'image' | 'emoji' | 'none', src }`. Tier order:
  AI image (manifest hit) → emoji → none. Future Tier-1 slots in
  above the emoji lookup without touching call sites.
- `src/components/DictionaryIcon.jsx` — presentational. Reads
  `showDictionaryImages` from the store internally so consumers
  don't re-implement the toggle gating.
- Wired into 5 surfaces (size px chosen for context density):
  - `FlashcardMode.jsx` standard + hint variants (56px) — front
    face only. Deliberately NOT on reverse / cloze / audio /
    produce variants — would leak the answer in retrieval tasks.
  - `WordFamilyCard.jsx` root header (48px).
  - `Comprehension.jsx` word popover (28px, gated to ms passages
    to dodge cross-language confusables like `jam`).
  - `PDFReader.jsx` translation-panel rows (22px).
  - `RoleplaySession.jsx` "Good vocab" + per-turn-analysis chips
    (14px, `inline-flex` inside the `px-1.5 py-0.5` pill).
- `useStore.js`: new `showDictionaryImages: true` flag + setter;
  STORE_VERSION 14 → 15 with v15 migration that defaults the field
  on for returning users.
- `Settings.jsx`: "Word Pictures 🖼️" toggle in the Preferences
  card, directly under Theater Mode. Copy calls out the UDL
  rationale ("visual support for ADHD & dyslexia").
- **Tier-1 AI image pipeline (dormant)**:
  - `scripts/generate-dict-icons.mjs` — Gemini 2.5 Flash Image →
    `cwebp` WebP at 256px / q=85. Cached via manifest; idempotent.
    Flags: `--only=a,b,c`, `--force`, `--dry-run`, `--quality=N`,
    `--size=N`. Per-key `ENGLISH_OVERRIDES` table tunes the prompt
    subject per word so the model gets the IGCSE-syllabus sense.
    Throttled 4s/req (≈15 RPM) for free-tier safety.
  - `npm run gen:dict-icons` — wired with `--env-file=.env.local`
    so `VITE_GEMINI_KEY` loads automatically.
  - `src/data/dictionaryIconsManifest.json` — schema stub + empty
    `icons: {}`. Auto-sorted on each write so diffs stay clean.
  - **Status: blocked.** `VITE_GEMINI_KEY` has `limit: 0` on every
    image-gen model (free-tier-locked across `gemini-2.5-flash-image`,
    `gemini-2.5-flash-preview-image`, `gemini-3.1-flash-image-preview`).
    Text endpoints (writing tutor, Cikgu Maya, etc.) unaffected.
    The moment billing is enabled or a different provider is
    wired, `npm run gen:dict-icons` produces all 50 icons without
    code changes; the resolver auto-prefers the manifest hits.
    See §4 Item 23 for the provider options + costs.

**Read-Along audio-visual sync** — UDL Principle 2 (dual-coding):
- `src/lib/speech.js` extensions (backwards-compatible — existing
  `speak()` and recognition functions unchanged):
  - `tokenizeWithOffsets(text)` — pure. Returns
    `[{ word, start, end, index }]` for every non-whitespace run.
    Same tokenisation in render AND boundary-mapping so the
    highlight cursor stays locked to the visible word grid.
  - `speakWithBoundaries({ text, lang, rate, onWordChange, onStart,
    onEnd, onError, wordsPerMinute })` — 3-tier fidelity ladder
    auto-selected per platform: real `word` boundary events
    (Chromium / good voices) → `sentence` boundary events (Safari)
    → time-estimated `setTimeout` ticks at `60000 / (wpm × rate)`
    (no-boundary engines, including iOS Safari for ms-MY).
    Watchdog at 600ms after `onstart` decides tier 3. Returns
    `{ cancel }`; `cancel()` is idempotent and clears every
    internal timer.
- `src/pages/Comprehension.jsx` — old "Listen (first paragraph)"
  replaced with a "Read along / Stop" toggle that reads the FULL
  passage. Active word highlighted via
  `rgba(124,58,237,0.22)` (low-saturation 22%-opacity tint of
  `--color-accent2` purple — deliberately NOT yellow, which strobes
  for sensory-sensitive readers on rapid word changes). 120ms
  background-color transition; no border or padding change, so no
  reflow mid-playback. Cleanup `useEffect` tied to `passage?.id`
  cancels in-flight playback on passage switch / component unmount.
- 5 new vitest cases in `src/lib/__tests__/speech.test.js` pin the
  tokeniser (empty input, basic offsets, multi-whitespace collapse,
  newline/tab handling, slice-by-offset round-trip property).

**Vercel CI rescue** (`1c72eeb`):
- Both `deploy-preview` and `deploy-production` jobs swapped from
  removed `vercel/vercel-action@v23` to `amondnet/vercel-action@v25`.
  Preview now passes `github-token` for PR comments; production
  uses `vercel-args: '--prod'` instead of the old `VERCEL_ENV=production`
  env hack. Same `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`
  secrets work unchanged.

**Commit ledger (chronological, all on `main`):**
- `1c72eeb` ci(vercel): swap action@v23 → amondnet@v25
- `8dd560b` feat(visual-dict): emoji map + resolver + component
- `552be00` feat(visual-dict): Settings toggle + STORE_VERSION 14→15
- `c05b64d` feat(visual-dict): Flashcard front face
- `b07f8b4` feat(visual-dict): WordFamilies tree root
- `b4e35e8` feat(visual-dict): Comprehension popover
- `50f749d` feat(visual-dict): PDFReader translation panel
- `fa13005` feat(visual-dict): Roleplay vocab chips
- `4397891` feat(speech): boundary tracking + 3-tier fallback + 5 tests
- `049a180` feat(comprehension): Read Along — word-sync highlight
- `2b0aeab` feat(visual-dict): Tier-1 AI-image pipeline (dormant)

### UDL Round 2 — Theme Choice + verb-emoji expansion + Roleplay Read-Along (2026-05-14 night)

Three commits on top of Round 1. Closes UDL Principle 1 entirely
(only the Goal-level box was previously ticked); pushes Principle 2
further by extending Read-Along from Comprehension into Roleplay
(the §4 Item 25(c) killer surface); multiplies the just-shipped
Visual Dictionary by adding 20 verb roots.

**Theme Choice — Dyslexic font + High Contrast** (`7778132`):
- `index.html`: Lexend added to the existing Google Fonts `<link>`
  alongside DM Sans / DM Serif Display. Same `preconnect`, same
  `display=swap`, no perf penalty until the font is actually
  enabled.
- `src/index.css`: new `.font-dyslexic` class (Lexend +0.02em
  letter-spacing +1.6 line-height); new `.contrast-high` overlay
  with WCAG-AAA tokens for dark; `.light.contrast-high` for light.
  Auto-bumps every inline `1px solid` border to 2px under
  `.contrast-high` via attribute selector, plus a fallback for
  `.border / .border-{t,b,l,r}` utility classes.
- `src/store/useStore.js`: STORE_VERSION 15 → 16. New `dyslexicFont`
  + `highContrast` booleans (defaults false), `setDyslexicFont` /
  `setHighContrast` setters, v16 migration that preserves any
  existing value via `?? false`.
- `src/App.jsx`: root className composes `light` + `font-dyslexic`
  + `contrast-high` from store, joined with a single
  `.filter(Boolean).join(' ')`.
- `src/pages/Settings.jsx`: two new toggle rows directly under
  "Word Pictures" in the Preferences card, matching the existing
  On/Off pill recipe.

**+20 verb emojis** (`48c211e`):
- `src/data/dictionaryIcons.js`: 50 → 70 entries (sorted A–Z, all
  keys lowercase). Added: ajar, beli, cari, dengar, fikir, guna,
  hantar, jalan, jual, kerja, latih, lukis, main, masak, nyanyi,
  potong, tahu, tanya, tulis, ubah. Skipped per the §4 Item 24
  rationale: pandu (kereta collision), tinggal (polysemous —
  "live in" / "remaining"), bangun (rise / wake / build).
- Reach amplifier: each verb root expands into 5-7 forms via
  imbuhan (meN-, ber-, di-, -kan, -an), so the visible icon
  surface in the Word-Family tree + Roleplay vocab chips grows
  ~130 chip-render hits in Roleplay alone.

**Roleplay Read-Along — the killer feature** (`9598d16`):
- `src/components/RoleplaySession.jsx` (AI mode): per-bubble
  `ExaminerText` renderer. Inactive bubbles render plain `<p>`
  text (zero render churn). Active bubble tokenises via the same
  `tokenizeWithOffsets` the boundary-mapper uses and tints the
  active word with the Comprehension Read-Along recipe —
  `rgba(124,58,237,0.22)` purple, 120 ms ease, 3 px padding,
  zero reflow.
- One `speakerRef` shared across the whole chat. Tapping
  Read-Along on a new bubble auto-cancels any in-flight playback
  before starting fresh. On-unmount cleanup `useEffect` catches
  the case where `phase === 'done'` swaps the scorecard in, plus
  any navigation away from `/roleplay`.
- onRetry path explicitly calls `stopReadAlong()` before
  resetting messages so a retry never inherits a stale highlight.
- Listen button replaced with toggle: `Volume2 Read along ↔ Pause
  Stop`, localised per `scenario.lang` to `Baca bersama ↔
  Berhenti` on Malay scenarios.
- `src/pages/Roleplay.jsx` `StaticRoleplay`: same tokenised render
  + toggle applied only to the active examiner turn bubble.
  Historical examiner bubbles above stay plain (already past —
  no need to revisit). Cleanup hooks at the two call sites that
  change `turn` (the 2.5 s setTimeout in `submitResponse` and
  the scorecard "Try Again" handler), keeping the React 19
  `react-hooks/set-state-in-effect` rule happy.

**Commit ledger (Round 2):**
- `7778132` feat(udl): dyslexic font + high-contrast theme (Principle 1)
- `48c211e` feat(visual-dict): +20 verb emojis (50 → 70 entries)
- `9598d16` feat(roleplay): Read-Along on examiner turns (UDL killer feature)

### Perfection Pass — Zero-Waste Engine v1.1 (2026-05-11)

Ten-item polish pass over the Phase 2-5 surface area. All edits are
small, ZERO behaviour change to the happy path. Verified with
`npm run lint` (0 errors), `npm run test:run` (120/120 pass),
`npm run build` (clean), and `npm run dev` boots HTTP 200.

1. ✅ **`SmartSession.jsx` empty state** — when `tasks.length === 0`
   (deck empty / no FSRS-due cards), the `status==='done' && !summary`
   branch now renders a friendly empty state (📚 "Your deck is empty"
   + explanatory copy + "Back to Dashboard" CTA). Text colour bumped
   from `--color-dim` to `--color-text` for the primary button so the
   CTA reads clearly.
2. ✅ **`MistakeToast.jsx` hydration guard** — added an
   `isHydrated` `useRef(false)` that's flipped on the first effect
   run. The first run is treated as a baseline (records
   `prevLen.current = mistakesLen`) so a non-zero
   `mistakes.length` re-hydrated from localStorage never fires a
   spurious "Saved to Mistakes · +12" toast on page load. Subsequent
   deltas behave exactly as before.
3. ✅ **`Writing.jsx` theater re-engage** — `isDrafting` trigger
   changed from `!results && (textareaFocused || text.length > 0)` to
   `textareaFocused && text.length > 0`. Both conditions matter:
   focus alone shouldn't hide chrome before any writing begins, and
   stale text in a blurred textarea shouldn't keep chrome hidden
   after analysis. Dropping `!results` lets Theater Mode re-engage
   cleanly when the user clicks back in to edit after an analysis.
4. ✅ **`interleavedQueue.js` `enforceNoBB3` safety counter** —
   already in place (`passes < 50` on the rebalance while-loop).
   Verified.
5. ✅ **`SessionProgress.jsx` a11y** — root container now has
   `role="progressbar"` + `aria-valuemin/max/now` + descriptive
   `aria-label`. Each dot has `role="img"` and a per-state
   `aria-label` (`"Task 3 of 10, completed"` /
   `"…, in progress"` / `"…, upcoming"`).
6. ✅ **Adapter consolidation** —
   `AdapterFlashcard.jsx` / `AdapterQuiz.jsx` / `AdapterCloze.jsx`
   (three near-identical files) deleted; replaced by a single
   `TaskAdapter.jsx` that dispatches on `task.type` via a switch.
   `SmartSession.jsx` now imports one component and renders it
   when `currentTask.type` is `'fc' | 'quiz' | 'cloze'`.
   `WritingMicroPrompt` / `SpeakingMicroTurn` still dispatched
   separately (they own their own grader flow, not a study-mode
   shim).
7. ✅ **Mistake pruning into `mistakeHistory` (STORE_VERSION 13→14)**
   — when `state.mistakes.length` crosses `MISTAKE_PRUNE_THRESHOLD`
   (500), the oldest `MISTAKE_PRUNE_BATCH` (100) **reviewed**
   (resolved) mistakes are moved to a new `mistakeHistory` array.
   `MISTAKE_HISTORY_CAP` (2000) trims the archive itself.
   Unresolved mistakes never get pruned — the journal/Smart Session
   still surface them. v14 migration adds
   `mistakeHistory: state.mistakeHistory || []`. `exportData` /
   `importData` round-trip the new field.
8. ✅ **Smart Session telemetry guard** — `useInterleavedSession.js`
   now holds a `hasTracked` `useRef(false)` that gates the two
   `addStudyMinutes` call sites (natural completion in
   `completeTask`, and `endSessionEarly`). Reset on `startSession`
   and `discardAndRestart`. Defends against any race / re-render
   path that could double-credit study minutes.
9. ✅ **Z-index audit** — added a `:root` block to `index.css`
   defining `--z-pill: 999` (Theater Mode exit pill) and
   `--z-toast: 1000` (MistakeToast). Both surfaces updated to use
   `z-[var(--z-pill)]` / `z-[var(--z-toast)]` instead of bare
   `z-50` / `z-[60]`, so the layering is now a single
   source-of-truth.
10. ✅ **Smart Session 2-hour TTL** — already in place
    (`useInterleavedSession.js` lines 21-25:
    `if (Date.now() - parsed.startTime > 2 * 60 * 60 * 1000)`
    → discard + clear localStorage). Verified.

**Smoke-test walkthrough (manual — Item 2 of §4):**
```bash
npm run dev   # serve at :5173/:5174
```
Walk these flows in a browser:
1. `/` Dashboard — confirm "Today's Loop" widget hides when caught & drilled are both 0; visit `/comprehension`, fail one passage, return → widget appears.
2. `/study` — start a session. Chrome hides (header + bottom nav slide away). Mode-swap fades in 220 ms. "Lights On" pill visible top-right, opacity 50% → 100% on hover; Esc exits Theater Mode.
3. `/smart-study` — start a session. Task swap animates with no 600 ms pause. Empty-deck case shows the new 📚 empty state.
4. `/writing` — focus an EN/MS textarea + type → Theater Mode kicks in. Click Analyze → chrome returns. Re-focus textarea (text still present) → Theater Mode RE-ENGAGES. IssuesPanel auto-Focus mode + "Show all" toggle + re-analyze → focus mode resyncs (key-prop remount).
5. `/roleplay` — start an AI scenario. Each turn animates in, chrome hides. Scorecard returns chrome.
6. `/speaking` — pick a topic; prep/record phase hides chrome; Results phase brings it back.
7. `/settings` — toggle Theater Mode off → all of the above keeps chrome visible everywhere.
8. Quick mistake stack → make 3 wrong answers on `/comprehension` in <3 s → toast says "Saved to Mistakes · +3"; inside a Smart Session, toast omits the "Practice" chip.
9. Reload the app with non-empty Mistakes — toast does NOT pop on hydrate.

If anything regresses, the Perfection Pass diff is single-file localised — easy to revert per item.

### Phase 5 — Tight Feedback Loops: visible mistake-to-knowledge layer (2026-05-11)

Pillar 1 already ships the *plumbing* — every module funnels mistakes
into the store, FSRS auto-promotes eligible categories, the Mistake
Journal renders the feed. Phase 5 adds the **visible feedback layer**
on top: students now see, at the moment of error, that their mistake
was caught — and on the Dashboard, how many of today's mistakes
they've already turned into knowledge.

- ✅ **`src/components/MistakeToast.jsx` (NEW)** — single global toast
  mounted in `Layout.jsx`. Subscribes to `mistakes.length` via a
  Zustand selector + `prevLen` ref to detect deltas; fires once per
  delta. **Stacking counter:** within the 3-second auto-dismiss
  window, additional mistakes increment the toast text to
  `"Saved to Mistakes · +N"` and reset the timer. Counter resets
  ~300 ms after the toast hides so isolated mistakes start fresh.
  framer-motion `Motion.div` slide+fade (220 ms ease-out-quart, same
  recipe as Phase 4); `useReducedMotion()` honoured.
  **Theater-Mode-aware:** during a session the "Practice" chip is
  suppressed so the toast is a quiet zen confirmation, not a CTA that
  pulls the student out of focus. Outside Theater Mode the chip
  navigates to `/mistakes`. Manual dismiss via tap on the X button.
  Position adapts: `bottom: 16` in Theater Mode (no nav), `bottom: 80`
  otherwise (clears the bottom nav).
- ✅ **`Dashboard.jsx` "Today's Loop" widget** — single horizontal
  strip card placed directly above the Smart Session CTA. Two
  metrics derived inline with `useMemo` (no new store getters):
  - **Caught**: `mistakes.filter(m => m.timestamp >= startOfToday).length`
  - **Drilled**: cards in the `Mistakes` deck whose `last_review` is
    today (FSRS-managed timestamp).
  Loop closure = `min(100, drilled / caught)`. Shows
  `"All caught up"` when `drilled >= caught > 0`. Auto-hides when
  both are 0. Thin gradient progress bar (purple → green) underneath
  the icon-number pairs. Whole strip taps through to `/mistakes`.
- **Side-effect-only architecture.** Zero new store actions, zero
  new schema fields, zero per-surface code in any of the 6+ pages
  that call `addMistake`/`logMistakeBatch`. Comprehension, Speaking,
  Roleplay, Writing, Listening and Smart Session all trigger the
  toast (and feed today's loop) for free because they were already
  wired into the unified mistake pipeline in Pillar 1.

This closes the master-plan §4a 5-phase "Zero-Waste Cognitive
Engine" sequence. The architecture is now: detoxified pages (Phase
1 / Architectural Detox), interleaved practice (Phase 2 / Smart
Sessions), adaptive scaffolding (Phase 3 / Cognitive Budget),
frictionless transitions + Theater Mode (Phase 4), and the visible
loop closure that makes mistake-to-knowledge feel like progress
(Phase 5).

### Phase 4 — Frictionless UX: framer-motion + Theater Mode (2026-05-11)

Functional micro-animations on the three high-focus task surfaces, plus
a context-driven Theater Mode that auto-hides chrome during active
tasks. Single shared transition recipe for predictability;
`prefers-reduced-motion` honoured everywhere.

- ✅ **`framer-motion` installed**, lazy-chunked into a shared 120.66 kB
  / 39.16 kB gzipped bundle that only loads when one of `/study`,
  `/smart-study`, `/roleplay`, `/writing`, `/speaking` opens. Initial
  index bundle moved from 423.66 kB → 425.64 kB (+2 kB, mostly Theater
  Mode wiring).
- ✅ **Animation recipe** (one shared definition across three surfaces
  for ADHD-calm consistency):
  `initial { opacity:0, y:8 } → animate { opacity:1, y:0 } → exit { opacity:0, y:-8 }`,
  `duration: 0.22s`, `ease-out-quart [0.16, 1, 0.3, 1]`. `useReducedMotion()`
  collapses the recipe to instant swap.
- ✅ **Surfaces wired:**
  - `src/pages/Study.jsx` — `<AnimatePresence mode="wait">` on the
    mode mount, keyed by `${mode}-${cardKey}` so card and mode swaps
    both trigger enter/exit.
  - `src/components/interleaved/SmartSession.jsx` — `<AnimatePresence
    mode="wait">` on the active task mount, keyed by cursor.
    `useInterleavedSession.js`'s `'transition'` status + 600 ms
    `setTimeout` removed; `TaskTransition.jsx` deleted. Hook status
    collapsed to `idle | active | done | resume-prompt`.
  - `src/components/RoleplaySession.jsx` — per-message
    `<motion.div initial animate>` (no exit; turns are append-only).
- ✅ **`TheaterModeContext` + `TheaterModeProvider` + `useTheaterMode`**
  (`src/contexts/TheaterModeContext.js`,
  `src/contexts/TheaterModeProvider.jsx`,
  `src/hooks/useTheaterMode.js`). React context, NOT Zustand store —
  Theater Mode is ephemeral session UI, not user data.
  - **Route-change reset** via the key-prop pattern (provider remounts
    on `useLocation().pathname` change), so the on-mount `useState(false)`
    is the source of truth — no setState-in-effect anti-pattern.
  - **Esc key escape hatch** at the provider level (skipped while a
    text input is focused).
  - **Pref gating:** `prefs.theaterModeEnabled` (new in store v13,
    default `true`) short-circuits the whole feature when off.
- ✅ **`Layout.jsx`** — header and bottom nav use plain Tailwind/CSS
  transitions (`-translate-y-full opacity-0 pointer-events-none` /
  `translate-y-full opacity-0 pointer-events-none`,
  `transition-transform duration-200 ease-out motion-reduce:transition-none`).
  framer-motion is intentionally NOT used here so the chrome animations
  don't pull the lib into the initial bundle. `aria-hidden={theaterMode}`
  on both. **"Lights On" Exit pill** (Lucide `Sun`, fixed top-right,
  ~32×32 px, `opacity-50` → hover `opacity-100`) renders only when
  Theater Mode is on.
- ✅ **Per-route triggers** — single `useEffect` per page, dependency
  is the "active" boolean. Cleanup runs `setTheaterMode(false)` on flip
  or unmount:
  - **Study:** `!showSummary && card != null`
  - **SmartSession:** `status === 'active'`
  - **Roleplay AI:** `phase !== 'done'`
  - **Roleplay Static:** `!complete`
  - **Speaking:** `stage === PREP || stage === RECORD`
  - **Writing:** `(textareaFocused || text.length > 0) && !results`
    — special case: also hides the `ExemplarPanel` during drafting,
    leaving only the textarea + Analyze button. Theater Mode auto-disengages
    once results land so all feedback panels (sub-bands, IssuesPanel,
    AI feedback) appear with full chrome.
- ✅ **Settings toggle** — *"Theater Mode (auto-hide chrome during
  active tasks)"* row in `pages/Settings.jsx`, wired to
  `theaterModeEnabled` / `setTheaterModeEnabled`. Default on. Off
  short-circuits all triggers.
- ✅ **Store v12 → v13** — adds `theaterModeEnabled: true` field with
  trivial migration.

#### IssuesPanel polish (folded into the same lint sweep)

The Phase 3 polish commit's `useEffect`-driven Focus Mode resync hit
the new React 19 `react-hooks/set-state-in-effect` rule. Refactored to
use the same key-prop pattern as TheaterMode: parent (`Writing.jsx`)
keys IssuesPanel as `key={`${results.band}-${results.findings.length}`}`,
so the `useState(band <= 4 || findings.length > 8)` initialiser
re-evaluates fresh whenever the analysis output changes. Manual
override stays sticky within a single analysis, resets cleanly on
the next one. Behaviour identical, no anti-pattern.

#### Lint cleanup along the way

- Pre-existing unused `completedCount` destructure in
  `SmartSessionSummary` removed.
- Pre-existing unused `eslint-disable react-hooks/exhaustive-deps`
  directive on the on-mount `useEffect` in `useInterleavedSession.js`
  removed.
- Pre-existing in-render ref-mutation pattern in `useInterleavedSession.js`
  (`cursorRef.current = cursor` etc) wrapped in
  `eslint-disable react-hooks/refs`. The pattern is a documented React
  idiom; refactoring to functional setState across three pieces of
  state would be invasive and is out of scope.
- `framer-motion`'s `motion` import is renamed to `Motion` in all three
  consumers (`Study.jsx`, `SmartSession.jsx`, `RoleplaySession.jsx`) so
  the `varsIgnorePattern: '^[A-Z_]'` config keeps it as legitimately
  used. The repo's eslint config doesn't include
  `eslint-plugin-react`'s `jsx-uses-vars` rule, so JSX-only usage of a
  lowercase identifier looks unused to the linter.

### Phase 3 — Adaptive Scaffolding / Desirable Difficulty (2026-05-10)

Hybrid trigger: AI-side cognitive budget (per-attempt) + UI-side
Focus Mode (auto + manual override).

- ✅ **`src/components/WritingTutor.jsx`** — Gemini system prompt
  rewritten as a coaching prompt with an explicit `COGNITIVE BUDGET`
  ceiling derived from the local heuristic band: band ≤ 2 → 1 fix,
  band ≤ 4 → 2 fixes, else → 3 fixes. Tone shifts too: band ≤ 3 gets
  `EXTREMELY ENCOURAGING & SIMPLE`, else `DIRECT & PROFESSIONAL`.
  Output structure: Status → One Thing You Nailed → Focus Area
  (budgeted, each with Hint / Issue / Solution) → Model Fragment →
  1-Minute Drill. Same evidence block (sub-bands, metrics, top
  rule-engine findings) — the LLM still anchors on local truth, just
  picks fewer threads to elaborate on.
- ✅ **`src/components/writing/IssuesPanel.jsx`** — Focus Mode caps
  the inline-issues list to the top 5 (high → medium → low) when
  `band ≤ 4 || findings.length > 8` and the severity filter is
  `'all'`. Banner explains the truncation; `Show all N` button
  flips to full list; `Switch back to Focus Mode` re-enables when
  more than 5 findings exist. Receives the new `band` prop from
  `Writing.jsx`. Wavy underlines on the inline essay still come
  from the visible subset, so the highlighted essay matches the
  shown list.
- ✅ **Polish (same day):** IssuesPanel auto-Focus now resyncs on each
  fresh analysis via `useEffect([findings, band])` — a worse second
  attempt re-engages Focus Mode. Sort path uses `[...list].sort(...)`
  so the prop array is no longer mutated in place. Manual override
  via "Show all" is intentionally reset on each new analysis (fresh
  decision per attempt).

### Phase 2 — Smart Sessions / Interleaved Practice (2026-05-10)

- ✅ **Thematic micro-cycle queue** (`src/lib/study/interleavedQueue.js`,
  pinned by 25 Vitest cases in `interleavedQueue.test.js`) — one focal
  card per cycle, escalates recognition (FC) → contextual recall
  (cloze if `ex` contains the headword, else MCQ) → production
  (micro-write), with a speaking graduation every 3rd cycle. Focal
  selection priority: recent vocab mistakes (≤7d) → FSRS-due →
  lowest-stability backfill. Queue post-processors `enforceNoBB3`
  (no two back-to-back load-3 production tasks) and
  `enforceSoftLanding` (last task is recognition, not production).
  Session size scales with `targetMinutes` (1–8 cycles).
- ✅ **`useInterleavedSession` hook** (`src/hooks/useInterleavedSession.js`)
  — owns status / cursor / results state, persists snapshot to
  `localStorage['smart-session-state']` after every task for resumability
  (TTL 2h), hooks FSRS `reviewCardAction` for fc/quiz/cloze tasks,
  enqueues `addMistake` for wrong answers, builds an end-of-session
  summary via `lib/study/sessionResult.js`.
- ✅ **`/smart-study` route** (`src/pages/SmartStudy.jsx`,
  `src/components/interleaved/SmartSession.jsx`) — top-level dispatcher
  picks the right component by `task.type`: `Adapter{Flashcard,Quiz,Cloze}`
  reuse the existing study mode components (zero duplication),
  `WritingMicroPrompt` and `SpeakingMicroTurn` are new minimal task
  surfaces. `TaskTransition` provides a 600ms breathing pause between
  tasks. `SessionProgress` shows cycle X of N + the focal word.
- ✅ **Dashboard CTA** (`src/pages/Dashboard.jsx`) — primary blue→purple
  gradient "Smart Session" button above the Quick Actions grid.
- ✅ **Templated micro-prompts** (`src/data/microPrompts.js`) —
  4 writing + 3 speaking IGCSE-register templates, all interpolate the
  focal headword.

## 4a. The "Zero-Waste Cognitive Engine" Master Plan

To take the architecture from a "feature-complete MVP" to an Enterprise-Grade, World-Class Application, future AI sessions must focus on maximizing learning efficiency using elite cognitive science. We are NOT chasing cheap novelty or extrinsic gamification (XP/leaderboards). We are using neuro-inclusive, friction-reducing UX to ensure 100% of the student's energy goes into learning. Focus on this 5-Phase Plan (execute one at a time with ZERO regressions):

1. **Architectural Detox:** Extract logic from massive files (`Study.jsx`, `Writing.jsx`) into clean custom hooks and atomic components. This provides a stable, performant foundation for functional animations.
2. **Interleaved Practice (Anti-Boredom):** Replace isolated study sessions with dynamic interleaving. Build a "Smart Session" engine that mixes flashcards, short writing prompts, and speaking turns to build stronger neural pathways and maintain novelty.
3. **Adaptive Scaffolding (Desirable Difficulty):** Refine the AI evaluators. If a student fails a task, the AI should dynamically lower the cognitive load (e.g., "Just fix your tense this time") rather than overwhelming them with 10 corrections.
4. **Frictionless UX & Deep Work:** Integrate `framer-motion` purely for functional, tactile micro-animations that prevent jarring context switches. Implement a visual "Theater Mode" to eliminate peripheral distractions during high-focus tasks.
5. **Tight Feedback Loops:** Ensure every mistake across all modules (Writing, Speaking, Comprehension) instantly and visually flows into the Mistake Journal and FSRS pipeline, creating an intrinsic dopamine loop of visible progress.

## 4c. Road to Perfection — Phases 6–12 (2026-05-11)

The Zero-Waste Cognitive Engine (§4a) is complete. The following phases
take the app from "feature-complete" to "nothing left to improve."
Execute in priority order. Each phase has ready-to-use prompts in the
full plan artifact (saved externally). Summary below:

### Phase 6 — Content Expansion (P0, Highest Impact)
- **6.1** More comprehension passages: 8 → 20 (add 12 new: 6 MS + 6 EN).
  File: `src/data/comprehensionPassages.js`. Shape: `{ id, title, titleEn,
  topic, difficulty, lang, text, questions: [5 MCQs] }`.
- **6.2** More dictionary examples: 254 → 500+.
  File: `src/data/dictionaryExamples.js`.
- **6.3** More listening passages: 6 → 12.
  File: `src/data/listeningPassages.js`.
- **6.4** More grammar drills: expand EN confusables/SVA/punctuation,
  expand MS imbuhan/kata hubung/ayat majmuk.
  Files: `src/data/grammarEng.js`, `src/data/grammar.js`.

### Phase 7 — Student Mastery Dashboard (P1, High Impact)
§4b says deep progress tracking FOR THE STUDENT is "highly desired."
- **7.1** GitHub-style study heatmap (SVG, 90-day view, derive from
  existing `studyMinutes`). New component in `src/components/dashboard/`.
- **7.2** Per-skill radar chart (6 axes: Vocab / Grammar / Writing /
  Speaking / Comprehension / Listening). SVG polygon, no chart library.
- **7.3** Daily goal system: `dailyGoalMinutes` pref (default 15),
  circular progress ring on streak card, confetti on completion.
- **7.4** Weekly progress summary card (this week vs last week).

### Phase 8 — UX & Accessibility Polish (P2)
- **8.1** First-time onboarding flow (4-step guided walkthrough for
  users with zero study data).
- **8.2** Keyboard shortcuts help modal (press `?` anywhere).
- **8.3** Dark/light theme audit (WCAG AA contrast on all routes).
- **8.4** PWA install prompt banner on Dashboard.
- **8.5** Offline indicator pill in header when `navigator.onLine === false`.

### Phase 9 — AI Intelligence Upgrades (P3)
- **9.1** Speaking grader scaffolding (same cognitive budget pattern
  as Writing Tutor Phase 3).
- **9.2** Cikgu Maya scaffolding (patience mode for struggling students).
- **9.3** AI-generated vocab example sentences (Gemini batch generation).

### Phase 10 — Architecture & Performance (P4)
- **10.1** Dashboard.jsx refactor: 47 KB → ~200 lines shell + atomic
  components in `src/components/dashboard/`.
- **10.2** CikguBot.jsx refactor (same atomic pattern).
- **10.3** Bundle size audit with `rollup-plugin-visualizer`.

### Phase 11 — Content Quality Assurance (P5)
- **11.1** Spell check integration evaluation (§4 Item 9).
- **11.2** Exemplar quality review (all 27 entries).

### Phase 12 — Final Polish (P6)
- **12.1** SEO & meta tags in `index.html`.
- **12.2** Error boundary polish.
- **12.3** Branch cleanup (§4 Item 14 — delete og branch after PR merge).

### Phase 13 — Completeness Gaps (P6, identified 2026-05-11)
- **13.1** Bookmark/Favorites system: let students star vocab words,
  passages, or drills for quick revisit. Store as `bookmarks: []` array
  in the Zustand store. Surface a "Starred" filter on relevant pages.
- **13.2** Print/Export Revision Sheet: a "Print my revision sheet"
  button on the Dashboard that generates a single-page PDF (or printable
  HTML) of the student's weakest areas + key vocab + upcoming due cards.
- **13.3** Spaced repetition reminders: Dashboard urgency indicator
  showing "N cards due today" prominently. If PWA notifications are
  available, send a daily morning reminder.
- **13.4** Global search (`Cmd+K` / `Ctrl+K`): search across dictionary
  (804 words), passages, grammar drills, and exemplars. Render as a
  modal with categorized results. Reuse `SearchModal.jsx` or replace it.
- **13.5** More roleplay scenarios: add 5+ EN and 5+ MS scenarios
  covering IGCSE-specific situations (doctor visit, lost item at school,
  booking a hotel, returning a faulty product, asking a teacher for help).

## 4b. Product invariants — DO NOT VIOLATE

The user has set these durably. Future sessions must not propose work
that contradicts them without explicit re-approval.

- **No paywall.** Ever. The site stays free for invited users.
- **Invite-only access.** The user personally approves who gets in.
  Implementation hook: the existing `userRole: 'static' | 'enhanced' |
  'admin' | 'owner'` system + Supabase auth in upg. `static` is
  guest/local-only; the upgraded tiers gate cloud sync and AI quota.
  Do not build self-serve sign-up flows.
- **Individual revision only — not a teacher tool.** No homework
  assignment, no class dashboards, no progress reports for teachers.
  Out of scope until the user reverses this. **HOWEVER, deep progress reports, dashboards, and mastery tracking specifically OPTIMIZED FOR THE STUDENT to check their own progress are highly desired and should be built.**
- **No native apps.** PWA is sufficient. Don't propose iOS/Android
  builds, Capacitor, React Native, etc.
- **Focus on learning quality for Malay AND English.** When choosing
  between two improvements, prefer the one that materially raises
  feedback quality, content quality, or practice variety for the
  IGCSE 0546 (Malay) or 0500/0510 (English) syllabus over engagement
  mechanics or polish.

## 5. Conventions you MUST follow

From `CLAUDE.md`:

1. **Never call store getters inside Zustand selectors:**
   ```js
   // WRONG — infinite loop
   const streak = useStore(s => s.getStreak())
   // CORRECT
   const getStreak = useStore(s => s.getStreak)
   const streak = getStreak()
   ```
2. **Always use `var(--color-*)` for colors** — never raw hex.
3. **Verify with `npm run build`** after every meaningful edit. Zero errors required.
4. **Read full files before editing** — pages like `Study.jsx`, `Dashboard.jsx`,
   `CikguBot.jsx` are complex state machines with many modes.
5. **No `Date.now()` in render or useState initializers** — wrap in arrow functions.
6. **Commit frequently** — small commits so a follow-up session can pick up cleanly.

## 6. Env keys (for `.env.local` — already in `.gitignore`)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_TRANSLATE_KEY=...   # Restrict to Cloud Translation API + your domain
VITE_DEEPL_KEY=...              # Optional. DeepL doesn't support Malay.
VITE_GEMINI_KEY=...             # Powers writing tutor, speaking AI, Cikgu.
VITE_OPENROUTER_KEY=...         # Optional fallback for Cikgu.
```

⚠️ All `VITE_*` are inlined into the bundle. Restrict each key in its
provider's console.

## A. Phase 2 — The Content Expansion Era

The Engineering & UDL Arc is closed. Every UDL principle is ticked,
the PWA is shipping, the test suite stands at 168/168, the bundle
is offline-capable, and the install path works on Android + desktop
Chromium. What's left is **content depth** — the only axis that
will move the needle for real students from here on out.

The premise: the *framework* can deliver any IGCSE Malay content
beautifully. Now we feed it more material so a student who opens
the app on day 1 still finds fresh content on day 90.

### A.1 Priority order (highest leverage first)

1. **Dictionary expansion** — the spine of the app
   - Target: 495 entries → 1,000+. Currently 495 in `src/data/dictionary.js`.
   - **Highest yield**: derived imbuhan forms of the existing 70 verb
     roots. Each new root unlocks ≥5 word-family tree nodes, ≥5
     flashcards, and ≥3 grammar-drill candidates simultaneously.
   - Source: official IGCSE 0546 / 0538 vocab lists + the Dewan Bahasa
     dan Pustaka tier-1 frequency list.
   - **Don't forget:** every new entry needs `m`, `e`, `ex` (example
     sentence in Malay), and ideally a `t` topic tag for the
     interests-prioritisation engine to bite on.

2. **Word family corpus growth** — `src/data/wordFamilies.js`
   - Target: 41 roots → 100+. Each root with `forms[]` covering all
     productive imbuhan (meN-, ber-, di-, ter-, peN-, -kan, -an,
     ke-...-an, se-, mempeR-).
   - The radial SVG tree handles up to ~10 forms per root cleanly
     (the 9-form no-overlap pin in `wordFamilyLayout.test.js` is the
     contract — don't exceed without re-verifying).

3. **Roleplay scenarios** — `src/data/scenarios.js`
   - Currently 20 scenarios (≈15 Malay + 5 English). Target: 30
     Malay + 15 English.
   - English Paper 0500 is the underserved syllabus right now.
   - Each scenario needs `id`, `title`, `titleEn`, `context`,
     `contextEn`, `keyVocab`, `keyImbuhan` (Malay only),
     `modelAnswers`, `turns[]`. Don't skip `modelAnswers` — the
     static evaluator needs them.

4. **Comprehension passages** — `src/data/comprehensionPassages.js`
   - Currently 8 passages across `alam sekitar / argumentative /
     environment / keluarga / kesihatan / komuniti / narrative /
     pendidikan`. Target: 30+ with broader topic spread.
   - Tag every passage with `topic` — the interests-prioritisation
     engine in `src/lib/interests.js` substring-matches against
     `[p.topic]`, so a passage tagged `sukan` will float for
     students who starred Sports.

5. **Grammar drills** — `src/data/grammar.js`
   - Imbuhan + tense markers are the bedrock. Each drill ID format
     is `{type}-{index}` and gets its own FSRS state in the store
     (`grammarCards`). Adding drills is additive — no migration.

6. **Listening practice clips** — `src/pages/Listening.jsx`
   - Underused page. Needs more transcribed clips with comprehension
     questions, ideally with native-speaker MP3s if you can source
     them (CC-BY material from Wikimedia/OpenStreetMap-style projects).

7. **Static dictionary icons** — `public/dict-icons/` is empty
   - The Visual Dictionary currently runs on 70 emoji entries from
     `src/lib/dictionaryIcon.js`. If you want to bump fidelity for
     specific words (`pohon`, `sekolah`, `keluarga`, etc.), drop
     hand-curated PNGs here and extend the lookup.

### A.2 Workflow tips for content sessions

- **Run the test suite after every batch.** Some additions need a
  vitest update — e.g., a new `wordFamilies` root might violate the
  9-form no-overlap pin if you add a 10-form root without bumping
  the SVG layout. The pin catches it; just re-run.
- **The interests prioritiser auto-picks up new content.** Add a
  passage with `topic: "sukan"` and it floats to the top for any
  student who starred Sports — no code changes.
- **The PWA precaches all of `src/data/*` automatically** via the
  bundled chunks. New content → re-build → SW update → toast →
  student reloads → content is offline. The whole loop is wired.
- **STORE_VERSION is at 17.** Don't bump it for content additions
  (data isn't persisted to the store; only progress is). Only bump
  if you add a new persisted *user* field.
- **Atomic commits, docs in the same commit.** This is the rhythm
  that has worked across the whole arc; don't break it now.

### A.3 What is NOT in Phase 2

These are deliberately out of scope until content depth catches up:

- Native iOS/Android (PWA is the native shipping path)
- Teacher / classroom features (the user has decided this is
  individual-revision only — see auto-memory `project_invariants.md`)
- A paywall or premium tier (project is invite-only, no monetisation)
- More UDL plumbing (the framework is closed; if a future student
  needs a new accessibility lever, add it; otherwise leave alone)
- More engineering for engineering's sake — defer to the next arc

---

## 7. Suggested first prompt for the new chat

> Read `RESUME_HERE.md` end-to-end. The Engineering & UDL Arc is
> closed (UDL 9/9, PWA shipping, 168/168 tests). Phase 2 — Content
> Expansion — is open. Run `git status`, `git log --oneline -12`,
> and `npm run build` to confirm green, then wait for me to pick a
> content target from §A.1:
> (a) dictionary expansion (highest leverage — every new verb root
>     unlocks ≥5 tree nodes + ≥5 flashcards),
> (b) more word families,
> (c) more roleplay scenarios (English Paper 0500 is underserved),
> (d) more comprehension passages (tag with `topic` so the
>     interests prioritiser picks them up),
> (e) more grammar drills, or
> (f) listening practice clips.
