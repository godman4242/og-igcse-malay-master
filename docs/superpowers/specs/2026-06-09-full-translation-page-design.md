# Full-translation reading page (Option G) — Design & Research (2026-06-09)

The **whole-document, reveal-gated reading page** that was parked as **Option G** in
`docs/superpowers/specs/2026-06-08-sentence-reveal-design.md` (§"Option G", decision **S12**).
It completes the translation ladder already shipped in the PDF reader:

| Surface | Unit | Where | Answers | Status |
|---|---|---|---|---|
| Word glosses ("Translate page") | **word** | in the reader | "what does *this word* mean?" | shipped |
| Sentence reveal ("Sentences") | **sentence** | in the reader | "what is *this sentence* saying?" | shipped 2026-06-09 |
| **Full translation (Option G)** | **paragraph → whole doc** | **its own full-screen page** | "did I understand the *whole passage*? — check against a model translation" | **this spec** |

The three are separated by **both unit and location**: micro-help (word + sentence) lives *inside*
the Malay reading view; macro-help (paragraph/document) lives on a **separate page you deliberately
navigate to**. That physical separation is the core learning-safety argument (below).

Researched **plan→research→implement** per `docs/process/feature-development-methodology.md`. Hook
points were **verified against live code** (`PDFReader.jsx`, `translateDocument.js`, `translate.js`,
`sentenceModel.js`, `sentenceRevealState.js`) before any design was fixed. Companion plan:
`docs/superpowers/plans/2026-06-09-full-translation-page.md`.

---

## Problem + who it's for
Same learner as the sentence-reveal spec: IGCSE Malay self-study teens, mobile-first, reading real
past-paper passages in the PDF reader. The word- and sentence-level surfaces answer *local* questions
("this word", "this sentence"). They do **not** give the learner a clean way to:

1. **Check whole-passage comprehension after reading** — "I read the whole thing in Malay; did I
   actually get it?" A model English translation of the passage is the most direct check, and IGCSE
   reading papers *literally assess passage comprehension*, so this has direct exam value.
2. **Get a coherent long-form translation** — pronouns, discourse connectors and cohesion resolve
   *across* sentences; a string of independent sentence reveals reads choppier than a passage
   translated as a unit. This is also where **BYOK "higher quality" instruct models** earn their
   keep most (idiomatic, cohesive long-form > free gtx).
3. **Cram before a timed comprehension drill** — the "show all" escape hatch already exists inline,
   but at whole-page scale an inline wall of English under every sentence is unusable. A dedicated
   surface is the right home for bulk reveal.

But a full-document English view is the **strongest possible form of the "translation crutch"** — if
it became the default reading surface it would erode exactly the read-the-Malay-first behaviour the
whole product protects. So, as with sentence-reveal, the design question is **not** "can we render a
document translation" (the runner already does), it is **how to offer it without it becoming "just
read the English."**

## The load-bearing question (and why no new research was needed)
> *Does a paragraph→whole-document L1 (English) translation surface ADD learning value over the
> shipped sentence reveal — and can it be offered without becoming a passive-reading crutch?*

This is the **same** load-bearing question the sentence-reveal spec already researched and answered
adversarially; Option G rests on the identical findings, with one incremental point:

1. **Providing meaning aids comprehension — robustly (inherited, High).** Gloss literature: L1
   translation is the most direct comprehension aid (Chen 2025; multimedia-gloss meta g≈0.73;
   Alharbi — all gloss formats helped comprehension, none worse). A model passage translation is a
   legitimate **post-reading comprehension check**. Direction: **+comprehension.**
2. **It is NOT a vocab tool, and the crutch risk is *substitution* (inherited, High).** Rassaei &
   Folse (2024): only *L2* sentence glosses beat word glosses for vocab (Involvement Load); an *L1*
   translation removes that processing. van den Broek 2022 / Bjork / MDPI 2025: the danger isn't that
   one reveal nukes memory, it's *habitually reading English instead of Malay*. → keep it gated,
   on-demand, post-reading; vocab work stays in the reader/FSRS.
3. **Sentence/document is the right MT unit, and document context adds cohesion (inherited S5 + High).**
   NMT/LLM translation is trained and evaluated at sentence level; **document-level context resolves
   cross-sentence reference (pronouns, discourse) that isolated sentences cannot** (context-in-NMT /
   document-level MT survey). So translating at **paragraph** granularity (with sentence sub-chunks
   only when a paragraph is too long for the engine) yields a *more coherent* read than N independent
   sentence reveals — the incremental value over the sentence surface. This is also why **BYOK is
   this page's natural home** (instruct models add the most on longer, cohesive units).
4. **Scaffold for *required* hard text, not licence to read above-level (inherited, Med).** IGCSE past
   papers are fixed — the learner must read *this* passage — so a comprehension scaffold is
   legitimate, but only **on-demand**, never the default surface.
5. **Physical separation preserves read-Malay-first better than any overlay (S12, High).** The harm in
   finding 2 is reading English *while* reading Malay. **Leaving** the Malay reading view to a separate
   page, where Malay is still shown and English is revealed per-paragraph, is *safer* than an always-on
   inline overlay — provided it stays reveal-gated, parallel (Malay still visible), and framed as a
   *check*, not "read in English."

**Why no fresh deep-research pass:** the build decision and the safety design are fully determined by
the inherited findings (1–5) plus an architecture/product rationale (a separated bulk surface + BYOK
home) that external evidence would not flip. A new study on "paragraph-vs-sentence MT comprehension
delta" would *refine framing*, not *change the design* (we build G as a paragraph-unit page either
way). Logged as a deliberate, budget-aware call — open to a deep-research pass if Kheshav wants extra
confidence on the comprehension delta, but not required to proceed.

### The synthesis
> **A dedicated, full-screen "Full translation" page — reveal-gated, per-paragraph, with Malay always
> visible (parallel), a "Reveal all" escape hatch for exam cram, free gtx by default and the BYOK
> "Higher quality" path available, framed as a post-reading comprehension *check* and never the
> default reading surface — reusing the proven `translateDocument` runner, cache, reveal-state
> reducer and language-gate from the shipped layers.**

It is an **extension**, not a rewrite: a new paragraph-keyed surface parallel to the shipped word- and
sentence-keyed ones, reusing the same volume-safe runner + cache + reveal discipline.

---

## Options considered (drafted from first principles, then validated against the code)

### Architecture — where Option G lives  → **CHOSEN: A**
- **A — A full-screen view *inside* `PDFReader`, reusing the in-memory tokenized doc (CHOSEN).**
  An early return renders a new `FullTranslationView` component when a `showFullTranslation` flag is
  on; the reader's loaded PDF + parsed paragraphs are passed straight in. **Presents as** a separate
  page (full takeover + "← Reader" back arrow) but is technically a conditional render → **zero
  re-parse, zero second file-load.** *Assumption (validated against code):* `pdfData.pages` already
  holds clean paragraph strings in memory; a real React-Router route (B) would unmount `PDFReader`
  and force a re-parse.
- **B — A real React-Router route (`/pdf-reader/translation`) (REJECTED).** Cleanest URL story, but
  `PDFReader` holds the parsed doc in component state — a route change unmounts it and re-parses the
  PDF (or forces lifting the heavy doc into a store: scope creep). Rejected on re-parse cost +
  state-architecture churn.
- **C — A slide-over half-sheet over the reader (REJECTED).** Middle ground, but a half-sheet for
  *whole-document parallel text* on a 390 px phone is cramped — the worst fit for long-form. Rejected.

### Page layout — how Malay + English coexist  → **CHOSEN: A**
- **A — Stacked, per-paragraph, Malay always visible (CHOSEN).** Each paragraph shows the Malay
  (always), a "Show English ▾" control, and on reveal the English renders **inline directly beneath**
  the Malay, visually secondary, with a "machine-translated" marker. *Assumption (validated):* in-place
  beats separated (S4) and eyes must anchor on the Malay (finding 5/S12). Most readable on mobile.
- **B — Two-column parallel (Malay | English) (REJECTED for v1).** The textbook "parallel text" ideal,
  but narrow columns on a 390 px phone hurt readability for long passages. Kept as a possible future
  desktop-width enhancement, not v1.
- **C — Flip-in-place per paragraph (REJECTED).** Space-saving, but when English shows the Malay is
  *gone* — breaks the eye-anchoring that makes the page learning-safe. Rejected.

### Reveal unit  → **CHOSEN: paragraph** (sentence sub-chunks only for over-long paragraphs)
Paragraph is the distinct unit that keeps Option G from overlapping the sentence surface, and gives
the cross-sentence cohesion of finding 3. A paragraph longer than the engine's char cap (~5000 for
gtx) is **split into sentence-sized sub-chunks for *sending only*** (pure `splitForTranslation`), then
the translated chunks are **rejoined for display** — so the *display/reveal* unit stays the whole
paragraph while every network call stays within limits (and long-paragraph sub-chunks even share the
per-text cache with the sentence surface).

### Surface division — what the page does NOT do  → **CHOSEN: paragraph-pure (Option 1)**
- **Option 1 — Paragraph-pure (CHOSEN).** No word/sentence tapping on the page. If the learner hits an
  unknown word, the "← Reader" back arrow (one tap) returns them to the reader where word glosses +
  add-to-FSRS already live. Keeps the page dead simple, zero overlap, reinforces "G = comprehension
  *check*, reader = vocab *work*." Vocab still consolidates via retrieval in the reader/FSRS (finding 2).
- **Option 2 — page also supports tap-a-word → add to deck (REJECTED for v1).** Re-imports the
  word-gloss surface onto G, blurring the unit boundary and adding real build cost for a one-tap
  round-trip we already have. Deferrable.

### "Reveal all" escape hatch  → **CHOSEN: include, opt-in, no confirm**
The single feature closest to the "just read the English" crutch. Inherited evidence (sentence-reveal
E/S12): keep it, but **opt-in only**, for timed comprehension cram. Included as a header toggle that
triggers a **cancellable bulk run** with a progress bar; visually secondary; no confirm dialog
(reversible in one tap). Default page state is **nothing revealed** (all Malay).

### Scope scoring (Impact × Confidence ÷ Effort, per methodology)
| Scope | Impact | Confidence | Effort | Score | Verdict |
|---|---|---|---|---|---|
| **G v1** — stacked per-¶ reveal page, reflow-derived paragraphs, free gtx + BYOK, reveal-all hatch | 3.5 | 4 | 2.5 | **5.6** | **Build (v1)** |
| Two-column parallel (desktop width) | 3 | 3 | 4 | 2.25 | Future enhancement |
| Word-tapping on the G page (Option 2) | 2.5 | 3 | 3 | 2.5 | Defer |

---

## Chosen design (v1) + WHY + verified hook points

1. **A new `FullTranslationView` component, opened from the reader, reusing the in-memory doc.**
   `PDFReader.jsx` gains only: a `showFullTranslation` boolean, a toolbar button, and an **early
   return** that renders `<FullTranslationView … />` (after the loading/empty guards, before the main
   reader `return`). The heavy UI + translation state live in the new component, so the large
   `PDFReader` state machine is barely touched (surgical-diff rule). *Hook (verified):* `pdfData.pages`
   = `[{ pageNum, paragraphs: string[] }]` (set in `handleFile` → `extractTextFromDoc`); pass it
   straight in. *Why:* reuse + zero re-parse (Architecture A).

2. **Paragraph model (pure, TDD).** New `src/lib/paragraphModel.js` — four pure functions:
   - `buildParagraphs(pages)` → `[{ paraId: '${pageNum}:${pi}', pageNum, text }]`, skipping empty /
     whitespace-only paragraphs. Stable ids for the reveal reducer + cache.
   - `splitForTranslation(text, maxChars = 4000)` → `string[]`: returns `[text]` when within the cap,
     else splits on sentence terminators (`. ! ? …`, reusing the `SENTENCE_END` discipline from
     `sentenceModel.js`) into ≤`maxChars` sub-chunks, never mid-word. Handles the gtx ~5000-char cap.
   - `planParagraphTranslation(paras, { have = {}, maxChars = 4000 })` →
     `{ chunks: string[], perPara: Record<paraId, string[]> }`: skips paragraphs already in `have`,
     splits each remaining one via `splitForTranslation`, records its ordered sub-chunks in `perPara`,
     and returns the **deduped** flat `chunks` list to send. The volume-safe collection (skip
     already-translated + dedupe identical text), chunk-aware.
   - `assembleParagraphGloss(chunks, results)` → `{ text, source }`: rejoins a paragraph's translated
     sub-chunks for display (`results[chunk].text` joined), deriving `source` (`'error'` only if every
     chunk errored). *Why:* volume-safety + a coherent paragraph from sub-chunks, all unit-testable.

3. **Stacked, per-paragraph, Malay-always-visible render (Layout A).** For each page → each paragraph:
   the Malay text (always), a "Show English ▾" control; on reveal the English slides in **inline
   beneath** the Malay, visually secondary (distinct colour / dim), with the honest marker. Re-collapse
   hides the English but keeps it cached (instant re-reveal). `var(--color-*)` only; both themes.

4. **Reveal = gating + cost, unified (reuse the proven reducer).** On entry: **nothing translated, all
   Malay** (protects read-Malay-first *and* is the cheapest default). Tapping a paragraph translates
   **just that paragraph** lazily (mirrors `revealSentenceHandler`), caching the result.
   *Reuse (verified id-agnostic):* extract the reveal-state reducer from `sentenceRevealState.js` into a
   generic `src/lib/revealState.js` (`createRevealState / isRevealed / reveal / hide / setShowAll /
   hideAll`, keyed by arbitrary id) and make `sentenceRevealState.js` a **thin re-export** under its
   existing names — existing sentence imports/tests stay untouched. `FullTranslationView` uses the
   generic reducer keyed by `paraId`.

5. **"Reveal all / Hide all" escape hatch (opt-in, cancellable).** A header toggle. "Reveal all" runs
   the **bulk** translation over all paragraph texts via `translateDocument` with `AbortSignal` +
   progress + cancel; "Hide all" collapses to the gated default. *Hook (verified):*
   `translateDocument(texts, { translateBatch, signal, onProgress, provider })` already gives
   chunk + throttle + retry/backoff + abort + progress, and resumes cheap from the per-text cache.

6. **BYOK "Higher quality" is available on this page (its best home).** Free gtx is the default; when
   `hasUserOpenRouterKey()` is true, the same "Higher quality" pill appears in the page header and
   threads `provider: quality ? 'quality' : undefined` into every `translateDocument` call — identical
   to the reader. `quality` state is **lifted to / shared with `PDFReader`** (passed in as
   `quality` + `onToggleQuality`) so the preference is consistent across surfaces. Non-key users never
   see the pill (no paywall). *Why:* finding 3 — instruct models add the most on long, cohesive units;
   the cache READ/WRITE-namespace split (shipped) already prevents free/quality collision.

7. **Paragraph-pure (Option 1).** No word/sentence affordances on the page; "← Reader" returns to the
   reader for vocab work. A small persistent hint ("Found an unknown word? Tap ← to look it up and add
   it to your deck") keeps the FSRS path discoverable without re-importing the word surface.

8. **EN-document gate (reuse).** *Hook (verified):* `detectDocLanguage(tokenized.tokens)` →
   `docLang`; the entry button is **hidden/disabled when `docLang === 'en'`** (source≈target no-op),
   exactly like the Sentences button (`sentenceDisabled`).

9. **Honesty.** A single persistent header note ("Machine translation — a guide to the meaning, not an
   authoritative answer") plus a subtle per-paragraph marker. Framed throughout as *"check your
   understanding,"* never authoritative (inherited D9/S10).

10. **Volume-safe + cancellable + resumable, reusing the proven runner.** Paragraph texts flow through
    the **same** `translateDocument` + `translate.translateBatch` (IndexedDB-cached by text) +
    `chunkTexts` packing; `splitForTranslation` keeps any single call within the engine cap. Cancel
    mid-run leaves the rest unrecorded (cache makes resume cheap). **Offline:** translate disabled
    gracefully with a notice; already-cached paragraphs still reveal.

## Safety / quality bars
- **Reveal-gated is the default.** The page opens with **nothing revealed** (all Malay). "Reveal all"
  is the only bulk reveal and is opt-in. A default-on English-only document dump is NEVER built.
- **Malay stays visible (parallel).** English is always secondary and beneath the Malay; the page is a
  *check*, never an English-only reader. Word-level vocab work stays in the reader/FSRS.
- **Don't regress** the shipped reader: word glosses, sentence reveal, Reflow/Layout, tap-to-translate,
  Select v2 (highlight/group/touch + pinch), `addSelectionToDeck`, "List unknowns", the quality pill,
  or the sentence-render Settings pref. The entry is additive; the early return only fires when
  `showFullTranslation` is on.
- **Coherent unit only:** translate at paragraph granularity; split over-long paragraphs at sentence
  boundaries for sending, never mid-word; rejoin for display. Never send a line fragment.
- **Honesty:** persistent "machine-translated" framing; never authoritative.
- **Free path needs no key** (no-paywall invariant). BYOK is strictly additive and key-gated.
- `var(--color-*)` only; **React-19 purity** (no `Date.now()`/`new Date()` in render or useState init);
  **no array/object allocation inside Zustand selectors** (module-level `EMPTY_*` + `useMemo`);
  bilingual-safe (EN doc → entry hidden); touch-first 390×844; back arrow always returns cleanly.
- **Volume:** bounded memory + network; cancellable; resumable via cache; no UI freeze on a 30–50 pp
  document (lazy per-paragraph by default; bulk only on explicit "Reveal all").
- **Accessibility:** reveal controls keyboard-operable; revealed block `aria-live`; back arrow focus-
  ordered; WCAG 1.4.13 dismissible/persistent inherited from the shipped patterns.

## Decision log
| # | Decision | Evidence / source (grade) | Effect / direction | Confidence |
|---|---|---|---|---|
| G1 | **Build Option G at all** — a post-reading whole-passage comprehension check | gloss lit: L1 = most direct comprehension aid (Chen 2025; multimedia-gloss meta; Alharbi) (high) | +comprehension, +exam value | **High** |
| G2 | **Full-screen view inside `PDFReader`, reuse in-memory doc (not a router route)** | `pdfData.pages` holds parsed paragraphs in component state; a route unmounts + re-parses (high, code-grounded) | zero re-parse, surgical diff | **High** |
| G3 | **Stacked, per-¶, Malay always visible (layout A)** | in-place beats separated (S4); eyes must anchor on Malay (finding 5/S12) (med-high) | lowers load, stays safe | **Med-High** |
| G4 | **Reveal unit = paragraph; sentence sub-chunks only for over-long ¶** | document-level context resolves cross-sentence reference (context-in-NMT) (high) + gtx ~5000-char cap (high, code-grounded) | coherent + within engine limits | **High** |
| G5 | **Paragraph-pure (no word/sentence tapping on the page)** | retrieval>glance — vocab consolidates in reader/FSRS (van den Broek; Bjork) (high) | zero surface overlap | **High** |
| G6 | **Reveal-gated default; "Reveal all" opt-in, cancellable** | substitution risk: habitual English reading erodes acquisition (MDPI 2025; Bjork) (high) | gate protects read-Malay-first | **High** |
| G7 | **Physical separation is *safer* than an inline overlay** | the harm is reading English *while* reading Malay; leaving the view + parallel + check-framing avoids it (high) | learning-safe full translation | **High** |
| G8 | **BYOK "Higher quality" is this page's natural home** | instruct models disambiguate longer/cohesive units; ~no gain on lone words (context-in-NMT) (high) + no-paywall invariant | quality where it counts; free default | **High** |
| G9 | **Reuse the runner / cache / reveal reducer / language gate** | all id-/text-agnostic and already volume-safe + namespace-split (high, code-grounded) | minimal new code, proven safety | **High** |
| G10 | **Machine-translated framing, never authoritative** | honesty backbone (parent D9/S10) (high) | no silent-ship as ground truth | **High** |
| G11 | **No fresh deep-research pass for v1** | build + safety fully determined by inherited findings + architecture rationale; external evidence wouldn't flip the design (med-high) | budget-aware; offer stands | **Med-High** |

## Open questions for Kheshav — RESOLVED (Kheshav sign-off 2026-06-09)
- **Architecture.** ✅ **A** — full-screen view inside `PDFReader`, reusing the in-memory tokenized doc
  (no router route, no re-parse).
- **Layout.** ✅ **A** — stacked, per-paragraph, Malay always visible; English slides in inline beneath
  on reveal.
- **Surface division.** ✅ **Option 1 (paragraph-pure)** for v1 — no word/sentence tapping on the page;
  back arrow returns to the reader for vocab work.
- **"Reveal all" escape hatch.** ✅ **Include**, opt-in, cancellable, no confirm dialog; default page
  state is nothing revealed.
- **Entry-point label.** ✅ **"Full translation"** button in the reader toolbar (hidden on EN docs).
- **Research.** ✅ Proceed on inherited findings; **no fresh deep-research pass** (G11) — offer stands
  if Kheshav later wants the paragraph-vs-sentence comprehension delta verified externally.

## Test plan
- **Pure units (TDD first, no DOM)** — `paragraphModel.js`:
  - `buildParagraphs`: stable `paraId` per (pageNum, pi); skips empty/whitespace-only paragraphs;
    preserves document order; reduplication/hyphen text intact.
  - `splitForTranslation`: returns `[text]` under the cap; splits an over-long paragraph at sentence
    terminators into ≤maxChars sub-chunks; never splits mid-word; a single over-long sentence gets its
    own chunk.
  - `planParagraphTranslation`: skips already-translated ids; dedupes identical sub-chunks; `perPara`
    keeps each paragraph's ordered chunk list.
  - `assembleParagraphGloss`: rejoins sub-chunks into the readable paragraph; `source` is `'error'`
    only when every chunk errored.
  - `revealState.js` (extracted, generic): reveal one / hide one / show-all override / collapse; the
    `sentenceRevealState.js` re-export still satisfies the existing sentence tests unchanged.
- **e2e + GO WILD** (`[[feedback_go_wild_smoke_test]]`): open a multi-page MS fixture → tap "Full
  translation" → page opens with **all Malay, nothing revealed**; reveal one paragraph → English slides
  in beneath, Malay still visible, machine marker present; "Reveal all" → bulk progress + cancel
  mid-run (rest stays unrevealed, no crash) → re-run resumes from cache (few/no new calls); "Hide all"
  collapses; toggle "Higher quality" (with a key) → quality path, and **soft-degrade** when it fails;
  an **over-long paragraph** still translates (sentence-split path) and reads coherently; **offline** →
  translate disabled gracefully, cached paragraphs still reveal; **EN doc** → entry button hidden;
  back arrow returns to the reader with the word/sentence layers **intact** (no regression); spam the
  entry/back buttons + "Reveal all" toggle; theme swap (page + blocks themed). Light + dark screenshots.
- **Verification gate:** `npm run build` (zero errors; `PDFReader` chunk stays lean — heavy UI in the
  new `FullTranslationView` chunk), `npm run lint` (0 errors, no new warnings), `npm run test:run`
  (all green incl. new units), `npm run test:e2e` (run SOLO per `[[project_e2e_config_invocation]]`).

---

## Paste-ready Implementation kickoff (next session)
*(Canonical copy — keep in sync with the box in `RESUME_HERE.md`.)*

> Continue the IGCSE Malay Master app (React/Vite SPA, https://upg-igcse-malay-master.vercel.app).
> This is an **IMPLEMENTATION session** — build an already-approved spec. Plain language, evaluate my
> choices, give a short time estimate before each chunk; quality over speed. Make it the best possible
> — push until it can't be improved, then tell me honestly whether it hit that bar.
>
> **READ + FOLLOW (in order):**
> - auto-memory MEMORY.md — esp. `[[project_sentence_reveal_research]]` (Option G is a COMPREHENSION
>   check, not vocab — keep it gated), `[[feedback_make_clear_calls]]` (make the clear calls; only ask
>   genuine forks), `[[project_e2e_config_invocation]]` (e2e invocation + Vite `?t=` trap),
>   `[[project_git_precommit_addall]]` (pre-commit runs `git add -A`), `[[project_two_vercel_projects]]`
>   (confirm READY on the PUBLIC upg-), `[[feedback_go_wild_smoke_test]]`, `[[project_skills_triage]]`;
> - `RESUME_HERE.md` (top blocks);
> - spec `docs/superpowers/specs/2026-06-09-full-translation-page-design.md`;
> - plan `docs/superpowers/plans/2026-06-09-full-translation-page.md`;
> - the "Implementation session" expectations in `docs/process/feature-development-methodology.md`;
> - project CLAUDE.md — "Critical Conventions", "Performance pitfalls to avoid", "Verification", "E2E tests".
>
> **SKILLS to invoke** (consult `[[project_skills_triage]]` first; don't invoke anything red-lit):
> - `superpowers:executing-plans` — you're executing a written plan with review checkpoints.
> - `superpowers:test-driven-development` — Steps 1–2 (`paragraphModel`, the `revealState` extraction)
>   are pure logic: write the FAILING unit tests first, then implement to green.
> - `superpowers:verification-before-completion` — before ANY "done"/"passing" claim, run the command
>   and show its output.
> - `superpowers:requesting-code-review` — a bounded self-review of the `PDFReader.jsx` +
>   `FullTranslationView.jsx` diff before commit.
> - `/verify` (or `/run`) — launch the app and eyeball light AND dark on 390×844.
>
> **MCP servers:** context7 ONLY if you touch React 19 / Tailwind 4 / Vite specifics; Vercel MCP after
> deploy to confirm the PUBLIC project (upg-…vercel.app) reaches READY. (Supabase NOT needed — no
> table/store-blob/schema change.)
>
> **BUILD** in the plan's TDD order. SURGICAL DIFFS ONLY — add `src/lib/paragraphModel.js`, extract
> `src/lib/revealState.js` (with a `sentenceRevealState.js` re-export shim so the sentence tests stay
> green), add `src/components/FullTranslationView.jsx`, and wire `PDFReader.jsx` with the MINIMAL diff
> (a `showFullTranslation` flag + a toolbar button + an early return). DO NOT rewrite `PDFReader.jsx`.
>
> **RESPECT the spec's quality/safety bars:** reveal-gated default (page opens all-Malay, nothing
> revealed); Malay always visible (parallel); paragraph reveal unit, sentence sub-chunks only for
> over-long paragraphs (never mid-word); paragraph-pure (no word/sentence tapping — back arrow for
> vocab); "Reveal all" opt-in + cancellable; BYOK "Higher quality" key-gated + soft-degrades; EN doc →
> entry hidden; machine-translated framing; `var(--color-*)` only; React-19 purity; no allocation in
> Zustand selectors.
>
> **VERIFY (show output, don't assert):** `npm run build` (zero errors; PDFReader chunk lean,
> FullTranslationView its own chunk) · `npm run lint` (0 errors, no new warnings) · `npm run test:run`
> (all green incl. new units) · `npm run test:e2e` (SOLO; bindStore + live-`?t=`-URL pattern for any
> store mutation). GO WILD in the new e2e: bulk reveal + cancel mid-run, over-long paragraph, offline,
> EN doc, spam entry/back, theme swap, resume-from-cache.
>
> **SHIP:** commit atomically (pre-commit runs `git add -A`) + refresh `RESUME_HERE.md` in the SAME
> commit; repo auto-pushes; confirm the PUBLIC Vercel site reaches READY. End with a bounded self-review
> and an honest verdict on whether it hit the "can't get better" bar.
>
> **FIRST ACTION:** verify the baseline (git clean, `npm run test:run`, `npm run lint`, prod READY),
> then begin Step 1.
>
> **BACKLOG after this ships (don't lose):** **Option F** — L2 (Malay) sentence simplification/
> paraphrase (vocab-superior per Rassaei & Folse 2024; instruct model, which BYOK already lands) →
> **Layout-view sentence reveal** (fast-follow to the reflow sentence reveal) → optional **two-column
> parallel** desktop-width enhancement for this page. See `[[project_sentence_reveal_research]]`.

## Sources (graded; inherited from the sentence-reveal research)
- Rassaei & Folse (2024), L1/L2 word- vs L2 sentence-level glosses, **System** — https://www.sciencedirect.com/science/article/abs/pii/S0346251X24000551
- Chen (2025), Gloss Language and L2 Vocabulary Learning, **TESOL Quarterly** — https://onlinelibrary.wiley.com/doi/10.1002/tesq.3394
- Multimedia-gloss & EFL reading comprehension (all formats aided comprehension) — https://pmc.ncbi.nlm.nih.gov/articles/PMC7891738/
- Multimedia gloss meta-analysis (g≈0.73) — https://www.researchgate.net/publication/386126638
- van den Broek et al. (2022), retrieval vs inference, **Cognitive Science** — https://onlinelibrary.wiley.com/doi/10.1111/cogs.13135
- Bjork & Bjork, desirable difficulties — https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf
- "Not all difficulty helps" (L2 vocab retention/transfer), **Behavioral Sciences 2025** — https://pmc.ncbi.nlm.nih.gov/articles/PMC12108878/
- Context in neural machine translation (sentence/document-level disambiguation; WSD) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11465115/ ; https://arxiv.org/pdf/2311.15507
