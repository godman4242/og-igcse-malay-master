# Translate the whole document, free — Design & Research (2026-06-08)

Kheshav's DeepL-style idea: translate an entire PDF/document at once, **free by
default** (gtx, no key), grounded in the built-in dictionary, with the user's own
OpenRouter key (BYOK) as an optional higher-quality path. Captured in the PDF
Layout View spec's "Next feature" §; this is its dedicated Design & Research pass.

Researched **plan→research→implement** per `docs/process/feature-development-methodology.md`:
options drafted from first principles FIRST (below), THEN validated *adversarially*
against the learning-science literature, THEN converged. Companion plan:
`docs/superpowers/plans/2026-06-08-translate-document.md`.

---

## Problem + who it's for
IGCSE Malay/English self-study teens on **mobile-first** web, reading real past
papers in the PDF reader. They hit unknown words constantly and want to *understand
the whole page now* — not tap one word at a time. The pull is real (it's why DeepL
exists). The tension is equally real: this app's first invariant is **learning
quality**, and a permanent English-over-everything layer is the classic
"translation crutch" — it can let the learner read English and never engage the
Malay, depressing the very vocabulary acquisition the app exists to build.

So the design question was never "can we render translations in-place" (the Layout
overlay already tokenizes every word with positions — that part is nearly free).
It was: **what presentation actually helps a self-directed teen learn, rather than
just feel helped?**

## The load-bearing question (researched first, adversarially)
> *Does in-context full-document L1 (English) translation HELP or HARM vocabulary
> acquisition / reading for self-study IGCSE teens on mobile — and under what
> guardrail does it stop harming?*

This decides **default-on bilingual vs reveal-gated**, and it turned out to also
settle **in-place vs side-pane** and **word vs sentence** as a bonus.

### What the evidence says (triangulated, graded)
1. **Glosses HELP vocabulary — robustly. Withholding all help is worse.**
   Glossed reading beat non-glossed reading **45.3% vs 26.6%** immediate and
   **33.4% vs 19.8%** delayed word gain (Chen 2025, *TESOL Quarterly*; consistent
   with Yanagisawa & Webb meta-analyses and a multimedia-gloss meta of **g≈0.73**).
   *Direction:* providing meaning is **positive**, not negative. The naive worry
   ("any translation = bad") is **disconfirmed**. Effect: medium–large. Confidence: **High** (multiple meta-analyses).

2. **L1 (English) glosses beat L2 glosses for our learners.** Hedge's **g≈.33**
   favouring L1 (Chen 2025; Yanagisawa & Webb). L1 is easier to bind to the new
   form. *Transfer check:* our learners' L1 is English → English glosses are right.
   Confidence: **High.**

3. **In-place beats separated (side-pane / marginal).** In-text glosses produce
   **lower cognitive load** (no split-attention) **and better reading
   comprehension** than spatially separated glosses (Marefat & Rezaee, cognitive-load
   study; cognitive-load theory split-attention effect). *This resolves "in-place vs
   side pane" on evidence, not just taste.* Confidence: **High.**

4. **The guardrail is real — retrieval effort must be preserved.** Bjork's
   *desirable difficulties*: removing the **retrieval/reconstruction** effort
   improves momentary fluency but **harms long-term retention**. van den Broek et al.
   (2022, *Cognitive Science*): words learners had to **retrieve** were recalled and
   transferred **better than** words whose meaning was handed to them by context —
   *retrieval beats even inference*. Bilingual-processing work shows L1 translations
   are **auto-activated and capture attention**, so a permanent parallel English
   layer pulls attention off the Malay form. *Direction:* default-on full bilingual
   **harms** the core goal. Confidence: **High** (foundational + replicated).

5. **Word-level is the safe granularity for vocab; sentence-level is for
   comprehension and its lexical payoff is "elusive."** Word/phrase glosses are the
   well-supported form for vocabulary; sentence-level glosses aid comprehension but
   the evidence for *lexical* gain is thin/contested (Sato/Suzuki-style word-vs-
   sentence work; meta reviews). Confidence: **Med.**

6. **Technical — free gtx survives whole-document volume only with care.** gtx caps
   at **~5000 chars/call**, rate-limits the single endpoint quickly (429/503), and
   the batch endpoint is looser but less accurate. Mitigations: **dedupe + chunk +
   throttle + exponential backoff + the existing IndexedDB cache (= resumability)**.
   Confidence: **Med-High** (provider behaviour well-documented; exact ceiling varies).

### The synthesis (how the two literatures reconcile)
Offering meaning is good (1,2,3); handing over *all* meaning by default is bad (4).
The resolution that satisfies **both**:

> **Reveal-gated, in-place, L1, word-level, unknown-words-first, routed into FSRS.**
> The learner reads the Malay first; a tap reveals the English gloss in place (the
> tap is a light decision/retrieval moment); known dictionary words are never
> glossed; revealed/forgotten words flow into the FSRS deck where real retrieval
> happens later. A "show all on this page" escape hatch exists (UDL: offer multiple
> means of representation — but **offer ≠ force**).

This is exactly what the live `translateAllUnknowns` already *computes* (it filters
to dictionary-unknown tokens) — today it only renders them in a **list panel**. The
feature is therefore an **extension**: render those glosses **in-place + reveal-
gated**, plus a volume-safe document pass and a grounding flag.

---

## Options considered (drafted from first principles BEFORE research)
- **A — Reveal-gated in-place gloss of unknown words (CHOSEN, MVP).** "Translate
  page" reveals English **in place over each unknown word, hidden until tapped**,
  with a per-page "show all" escape hatch. Word-level; free gtx default; BYOK opt-in
  for quality; dedupe+chunk+throttle+cache for volume; grounding flags low-confidence
  machine output; reveals/forgets feed FSRS. *Assumption (now validated):* offering
  meaning helps, but preserving the read-Malay-first + tap-to-reveal retrieval moment
  is what keeps it from becoming a crutch.
- **B — Default-on full bilingual overlay (REJECTED as default; kept as the "show
  all" escape hatch).** Every word's English shown by default. *Assumption (refuted):*
  convenience > learning cost. Evidence (finding 4) says default-on parallel L1
  depresses acquisition and fights the "learning quality first" invariant. Survives
  only as an *opt-in* escape hatch, never the default.
- **C — Sentence-level side-pane parallel translation (PARKED → folded in as
  on-demand).** Full sentence translations in a side panel. *Assumption (refuted):*
  separation is cleaner. Evidence (finding 3) says side-pane = split-attention =
  higher load + worse comprehension; sentence-level lexical gain is elusive (5). The
  genuine comprehension need it serves is met instead by **tap-a-sentence → reveal
  its translation in place**, inside A.
- **D — Whole-doc background pre-translate + cache, still reveal-gated (TIER-2 of A).**
  A's gating, but prefetch the whole document in the background so reveals are
  instant. *Assumption:* instant reveal > lazy. Good UX, but heavier volume/cancel/
  resume; ship as a Tier-2 enhancement once A's per-page path is proven.

### Scope scoring (Impact × Confidence ÷ Effort, per methodology)
| Scope | Impact | Confidence | Effort | Score | Verdict |
|---|---|---|---|---|---|
| **A** reveal-gated in-place, unknowns-first | 4 | 4.5 | 2.5 | **7.2** | **Build (MVP)** |
| D whole-doc prefetch (A + background) | 4 | 4 | 3.5 | 4.6 | **Tier-2 of A** |
| C sentence side-pane | 3 | 2.5 | 3.5 | 2.1 | Park → on-demand tap inside A |
| B default-on bilingual | 2.5 | 2 | 3 | 1.7 | Reject as default → escape hatch only |

Winner: **A (MVP)**, with **D** as the staged Tier-2, **B** demoted to the opt-in
"show all", **C**'s value delivered as on-demand sentence reveal.

---

## Chosen design (Scope A) + WHY
1. **New action, replacing the list-panel dump.** In the PDF reader toolbar, a
   **"Translate page"** action (and a **"Translate whole document"** for the keen).
   Instead of `setTranslation({...list...})`, it triggers the in-place gloss layer.
   *Why:* the in-place evidence (finding 3) + the overlay rects already exist.
2. **In-place, reveal-gated glosses over unknown words.** For each
   dictionary-**unknown** token (reuse `translateAllUnknowns`'s filter), render a
   small English gloss anchored to that token's existing overlay rect
   (`LayoutView.overlayFor` rects / reflow token spans), **hidden until tapped**
   (reuse the shipped tappable-highlight reveal pattern + `SavedWordPopover`
   affordances: a11y, Esc, focus, dismiss). *Why:* read-Malay-first + tap-to-reveal
   preserves the retrieval moment (finding 4) while keeping help in place (3).
3. **"Show all on this page" escape hatch.** One toggle reveals every gloss on the
   visible page at once (Option B, opt-in). *Why:* UDL offer-don't-force; some tasks
   (timed comprehension cram) legitimately want it.
4. **Word-level default; tap-a-sentence for comprehension.** Default gloss unit is
   the word (finding 5 + the overlay is word-keyed). Tapping a sentence/line offers
   its full translation in place for comprehension. *Why:* vocab payoff is word-
   level; comprehension need handled without a side-pane.
5. **Free gtx by default; BYOK = optional "higher quality".** No key needed to use
   it (keeps it free + invite-only-friendly). If the user has an OpenRouter key
   (`hasUserOpenRouterKey()`), offer a "higher quality" toggle. *Why:* finding 6 +
   project invariant (no paywall) + the BYOK plumbing already ships. **MVP cut:** ship
   **free-gtx only**; the BYOK-quality path is a fast-follow because OpenRouter is not
   yet a provider inside `translate.js` (adding it is its own small task) — see the plan
   Step 5 + risks. D7 stands; free-first is just the honest first slice.
6. **Volume-safe document pass.** A `translateDocument`-style helper: **dedupe**
   tokens, **skip dictionary-known + cache hits**, **chunk** to ≤~4000 chars/≤N
   words, **throttle + exponential backoff** on 429/503, **AbortSignal** cancel,
   **progress** UI — leaning on the IndexedDB cache so a half-done doc resumes cheap.
   Copy the cancellable-long-job shape from `deckGenerator.generateDeckText`. *Why:*
   finding 6 — naive `translateBatch(allTokens)` would 429 and blow the 5000-char cap.
7. **Grounding flag (never silent-ship wrong Malay).** Run each machine gloss
   through `verifyPair(malay, english, buildGroundingIndex(...))`. Owned/Wikidata-
   verified glosses render plainly; **low-confidence machine output renders with a
   subtle "machine-translated, unverified" marker** (and the dictionary's canonical
   English shown when there's a mismatch). *Why:* existing accuracy backbone; honesty.
8. **Reveals/forgets feed FSRS (where retrieval actually happens).** Revealing a
   gloss is the doorway; the durable learning is the FSRS card. Offer a one-tap
   "add to deck" on a revealed gloss (reuse `addCards` / the mistakes→FSRS pipeline).
   *Why:* finding 4 — glance < retrieval; the gloss should *route into* spaced recall,
   not substitute for it.

## Safety / quality bars
- **Reveal-gated is the default. Default-on bilingual is never the default** — only
  the explicit "show all" opt-in. (The whole learning-quality case rests on this.)
- **Don't regress** the reflow reader, Layout view, tap-to-translate, Select v2
  (highlight/group/touch), `addSelectionToDeck`, or the existing `translateAllUnknowns`
  list mode (keep it reachable, or cleanly supersede it — decide in plan).
- **Free path needs no key**; BYOK is strictly additive. No paywall (invariant).
- **Grounding:** never present low-confidence machine output as authoritative.
- `var(--color-*)` only; React-19 purity; bilingual-safe (works MS *and* EN docs);
  touch-first on 390×844; gloss layer must not break selection/copy/links (the §3
  bars from the tappable-highlights spec still hold).
- **Volume:** bounded memory + network; cancellable; resumable via cache; no UI
  freeze on a 30–50pp document.
- **Accessibility:** reveal affordance keyboard-operable + WCAG 1.4.13 (hover/focus
  content dismissible/persistent), inherited from the shipped popover.

## Decision log
| # | Decision | Evidence / source (grade) | Effect / direction | Confidence |
|---|---|---|---|---|
| D1 | **Reveal-gated, not default-on bilingual** | Bjork desirable difficulties; van den Broek 2022 retrieval>inference; bilingual auto-activation attention capture (high) | default-on harms acquisition | **High** |
| D2 | **Offer it at all (don't withhold)** — glosses help | Chen 2025 45% vs 27%; multimedia-gloss meta g≈0.73; Yanagisawa & Webb (high) | providing meaning helps vocab | **High** |
| D3 | **English (L1) glosses, not Malay-definition** | Yanagisawa & Webb / Chen 2025 g≈.33 favouring L1 (high) | L1 > L2 gloss | **High** |
| D4 | **In-place, not side-pane** | Marefat & Rezaee cognitive-load; split-attention effect (high) | in-place lowers load + aids comprehension | **High** |
| D5 | **Word-level default; sentence on demand** | word-vs-sentence gloss literature (thin on lexical gain) (med) | word for vocab, sentence for comprehension | **Med** |
| D6 | **Unknown-words-first (skip dictionary-known)** | reuse `translateAllUnknowns` filter; gloss-the-unknown norm (high) | focuses effort, cuts volume | **High** |
| D7 | **Free gtx default; BYOK opt-in quality** | Kheshav + no-paywall invariant; BYOK already ships (high) | free for all; quality optional | **High** |
| D8 | **Dedupe+chunk+throttle+backoff+cache** for volume | gtx 5000-char cap + single-endpoint rate-limit; cache=resumable (med-high) | survives 30–50pp | **Med-High** |
| D9 | **Grounding flag low-confidence machine output** | `dictionaryGrounding.verifyPair` already owned (high) | never silent-ship wrong Malay | **High** |
| D10 | **Reveals/forgets route into FSRS** | retrieval>glance (van den Broek; Bjork) (high) | gloss is the doorway, FSRS the consolidation | **High** |

## Open questions for Kheshav — RESOLVED (Kheshav sign-off 2026-06-08)
- **Q1 — Reveal-gated default.** ✅ **Reveal-gated** (read Malay → tap to reveal);
  "show all" is the opt-in escape hatch. (Default accepted.)
- **Q2 — Scope of the first ship.** ✅ **A (MVP) = current page first**, then D
  (whole-doc background prefetch) as a fast follow-up Tier-2. (Default accepted.)
- **Q3 — Keep the old list-panel `translateAllUnknowns`?** ✅ **Keep it** as a
  secondary "list view" of the same unknown-word data. (Default accepted.)
- **Q4 — Add-to-deck on reveal.** ✅ **One-tap add**, grounding decides verified vs
  learner-confirm. (Default — not separately asked; flag in implementation if it
  feels too eager.)
- **Q5 — Sentence reveal.** ✅ **v2** — v1 ships **word-level only**. (Default accepted.)

## Test plan
- **Pure units (TDD first, no DOM):** document token pipeline (dedupe + skip-known +
  skip-cached), chunker (≤char/≤word limits, no mid-word split), throttle/backoff
  schedule, grounding-flag decision (verified vs low-confidence vs mismatch→canonical),
  "show all" reveal-state reducer, abort/resume accounting (cache → resumable).
- **e2e + GO WILD** ([[feedback_go_wild_smoke_test]]): translate a multi-page fixture;
  reveal a single gloss (read-Malay-first → tap → English in place); "show all" then
  collapse; cancel mid-translation; re-run resumes from cache (few/no new calls);
  dictionary-known words never get a gloss; a deliberately-wrong machine gloss shows
  the unverified marker + canonical; one-tap add-to-deck lands an FSRS card; offline →
  graceful (cache-only + disabled-with-reason); BYOK toggle path when a key exists;
  theme swap (gloss layer themed, page surface stays); works on an **English** doc too;
  spam the toggle / navigate mid-job / pinch-zoom while glosses are shown. Light + dark.

---

## Paste-ready Implementation kickoff (next session)
> Continue the IGCSE Malay Master app (React/Vite SPA,
> https://upg-igcse-malay-master.vercel.app). This is an **IMPLEMENTATION session** —
> build an already-approved spec.
>
> Read + FOLLOW: auto-memory MEMORY.md, `RESUME_HERE.md` (top blocks), the spec
> `docs/superpowers/specs/2026-06-08-translate-document-design.md` + plan
> `docs/superpowers/plans/2026-06-08-translate-document.md`, and the "Implementation
> session" expectations in `docs/process/feature-development-methodology.md`.
>
> Build it in the plan's TDD order; respect the spec's quality/safety bars (reveal-
> gated is the default; free gtx needs no key; grounding flags low-confidence output;
> don't regress reflow/Layout/Select v2). Verify build + lint + test:run; eyeball
> light AND dark via a Playwright screenshot spec; commit atomically + refresh
> RESUME_HERE in the same commit; confirm Vercel READY after deploy. Plain language,
> evaluate my choices, short time estimates first. You may stage/commit/sync.
>
> First action: verify the baseline (git clean, test:run, lint, prod READY), then
> begin Step 1 of the plan. Quality over speed.

## Sources (graded in the decision log)
- Chen (2025), *The Effects of Gloss Language on L2 Vocabulary Learning from Reading*, TESOL Quarterly — https://onlinelibrary.wiley.com/doi/10.1002/tesq.3394
- Yanagisawa & Webb, glosses & L2 vocabulary meta-analyses; L1 vs L2 gloss meta — https://www.frontiersin.org/journals/language-sciences/articles/10.3389/flang.2026.1815571/full ; https://www.researchgate.net/publication/347660326_The_relative_effects_of_L1_and_L2_glosses_on_L2_learning_A_meta-analysis
- Multimedia gloss meta-analysis (g≈0.73) — https://www.researchgate.net/publication/386126638_The_effects_of_multimedia_gloss_on_incidental_vocabulary_learning_A_meta-analysis
- Marefat & Rezaee, *Effect of Computerized Gloss Presentation Format on Reading Comprehension: A Cognitive Load Perspective* — https://www.jite.org/documents/Vol15/JITEv15ResearchP478-501Marefat2692.pdf
- van den Broek et al. (2022), *Vocabulary Learning During Reading: Benefits of Contextual Inferences Versus Retrieval Opportunities*, Cognitive Science — https://onlinelibrary.wiley.com/doi/10.1111/cogs.13135
- E. Bjork & R. Bjork, *Making Things Hard on Yourself, But in a Good Way: Creating Desirable Difficulties to Enhance Learning* — https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf
- Lexical inferencing vs dictionary consultation (comparable gains; depends on prior vocab/skill) — https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0236798
- Word- vs sentence-level glosses — https://www.sciencedirect.com/science/article/abs/pii/S0346251X24000551
- gtx free-endpoint limits (5000-char cap, rate limits, batch vs single) — https://www.npmjs.com/package/google-translate-api-x ; https://docs.cloud.google.com/translate/quotas
