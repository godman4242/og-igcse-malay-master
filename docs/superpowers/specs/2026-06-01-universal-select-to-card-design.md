# Universal "select → translate → add to cards" (design + learning-science research)

**Status:** SPEC / research. Needs Kheshav's sign-off on §8 scope + §9 decisions
before any build. (Per project rule: spec features needing product input.)
**Asked by Kheshav (2026-06-01):** let students select, translate, and add **any
word anywhere on the site** to their flashcards — not just on the PDF/Import page —
with selected words **highlighted** for convenience. Plus: does this actually help
(UDL + learning science), and suggest more ideas.

---

## 1. One-liner

Anywhere a student reads Malay/English on the site, they can select a word or
phrase → see a translation → save it to their FSRS deck in one tap, with light
visual confirmation. Today this only works on the PDF reader (`PDFReader.jsx`, which
pre-tokenises its text into indexed spans). We generalise it site-wide.

## 2. Does it actually help? (the honest verdict)

**Yes — it's well-supported by UDL and L2-vocabulary research — *if* designed to
control cognitive load and funnel saved words into review.** Not a blank cheque.

**Supports:**
- **UDL — Representation.** On-demand definitions/glossaries are an explicit UDL
  vocabulary support (Guidelines 2.2, "clarify vocabulary and symbols"): provide
  just-in-time meaning so vocabulary never blocks comprehension.
  ([UDL Guidelines 2.2](https://udlguidelines.cast.org/static/udlg2.2-text-a11y.pdf))
- **UDL — Engagement.** Learner-*chosen* card creation = autonomy/agency (optimise
  individual choice). The student curates their own deck from authentic material.
- **Glossing research.** Just-in-time glosses during reading produce **both**
  vocabulary gains **and** better reading comprehension; multimodal glosses (text +
  picture/audio) beat text-only.
  ([Multimedia gloss study, NCBI](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7891738/))
- **Spaced repetition + active recall.** Routing saved words into the existing
  FSRS deck is exactly the evidence-based path — *but only if the words get
  reviewed*. Recognition without productive recall leaves learners unable to
  produce the word later.
  ([AJESS: self-regulation + spaced repetition + cognitive load](https://journalajess.com/index.php/AJESS/article/view/1762))

**Caveats / failure modes the design MUST avoid:**
1. **Cognitive-load / split-attention.** A popover that interrupts reading flow can
   *reduce* comprehension. Keep it unobtrusive, dismissible, never modal.
2. **Collector's fallacy.** Saving words ≠ learning them. Mass-saving creates a
   graveyard deck. Mitigate: a deliberate save step + surfacing the saved-word
   review (FSRS already does this) + showing deck growth honestly, not as a score.
3. **Killing productive struggle.** Looking a word up the instant it's unfamiliar
   weakens retention vs. inferring from context (desirable difficulty). Mitigate:
   optional "guess first / reveal" and don't auto-translate — require the tap.

**Design principle that falls out of this:** *capture is cheap; learning is the
review.* The feature's job is frictionless capture **into a loop that already
exists**, with guardrails against hoarding — not a new dopamine surface.

## 3. UX design

**The trigger.** A student selects text (mouse drag / double-tap / long-press) on
any learning surface. A small **floating popover** appears anchored to the
selection with:
- the selected term,
- its translation (fetched on demand via `translateWord`/`translateSentence`),
- a 🔊 speak button (TTS — multimodal, UDL),
- **Save to deck** (the deliberate second action — translation shows first, save is
  a choice),
- dismiss (tap-away / Esc).

**Highlight (the "convenience" Kheshav asked for) — two tiers:**
- **Tier 1 (MVP): transient.** The native selection highlight + a brief "saved ✓"
  flash on the word when added. Zero persistence cost.
- **Tier 2 (later): persistent.** Saved words stay subtly underlined/highlighted
  wherever they appear, so the student sees what they've already captured. This is
  the expensive part (see §5).

**Where it works.** Reading-heavy surfaces first: Comprehension passages, Listening
transcripts, Roleplay/Speaking transcripts, Writing feedback, Word Families, Cikgu
answers. Explicitly **excluded:** form inputs, buttons, nav, the textarea you're
writing in (selecting your own draft shouldn't offer to "translate" it).

**Direction & language.** Detect source language (the surface usually knows
MS vs EN) so the translation goes the right way and the card's `{m,e}` is correct.

**Accessibility (real UDL).** Keyboard-selectable + the popover reachable by
keyboard and announced to screen readers; honour `prefers-reduced-motion` for the
flash.

## 4. Architecture (reuse, don't reinvent)

- **Reuse:** `src/lib/translate.js` (`translateWord` / `translateSentence`, already
  cached + provider-routed) and the store's `addCard`/`addCards` (already dedupe by
  `{m,t}`). Cards land in a dedicated deck, e.g. `t: 'Saved'` (or per-source tag).
- **New, global:** one component mounted once in `Layout.jsx` — `SelectionToCard`
  — that listens for `selectionchange` / `mouseup` / `touchend`, reads
  `window.getSelection()`, filters out excluded containers (inputs, `[data-no-select-card]`),
  debounces, positions the popover at the selection's bounding rect, and wires
  Save → `addCard`. No per-page changes needed (surfaces opt **out** via a
  `data-no-select-card` attribute, not in).
- **Card shape:** `{ m: <source term>, e: <translation>, ex: <sentence it came
  from>, t: 'Saved' }` → context capture (the surrounding sentence) aids recall and
  matches the mistake pipeline's `surface` idea.
- **PDFReader:** keep its richer per-token UI; optionally retire its bespoke path
  later once the global one is proven. Not required for MVP.

## 5. The hard part: persistent highlighting (Tier 2)

Arbitrary site text is React-rendered DOM, not pre-tokenised spans, so we can't
index it like PDFReader does. Options:
- **A. CSS Custom Highlight API** (`Highlight` + `::highlight()`): highlight ranges
  **without mutating the DOM** — ideal with React (no wrapper-span hydration
  fights). Needs ranges re-resolved per page (find-occurrences pass). Good browser
  support in current Chrome/Edge/Safari; degrade gracefully where absent.
  **Recommended for Tier 2.**
- **B. Wrapping `<mark>` spans:** fights React's virtual DOM, risks breaking
  hydration/re-renders. **Avoid.**
- **C. None (Tier 1 only):** native selection + save-flash. **Recommended for MVP.**

Recommendation: ship Tier 1 (no persistence) first; add Tier 2 (Custom Highlight
API, scoped to the current page's saved words) only if Kheshav wants the persistent
"what I've saved" cue after living with the MVP.

## 6. More ideas (Kheshav asked for these)

1. **Define → Save two-step** (in §3) — avoids hoarding, preserves agency.
2. **Context sentence on the card** (`ex`) — better recall; cheap.
3. **"Guess first" toggle** — blur the translation for a beat; preserves productive
   struggle for students who want it.
4. **Dedupe + "already in your deck" state** — `addCard` dedupes; surface it so a
   re-tap says "already saved" instead of silently no-op.
5. **TTS on tap everywhere** — pronunciation is a multimodal representation (UDL)
   and directly serves the Speaking pillar.
6. **Source tag** — tag saved cards with where they came from (Comprehension /
   Roleplay / …) for richer review filters; ties into the Mistake Journal.
7. **Weekly "review your saved words" nudge** — the anti-collector's-fallacy
   counterweight; routes saved words into a Study session.
8. **Phrase support** — selecting 2–4 words saves a chunk (collocations matter for
   IGCSE writing/speaking), via `translateSentence`.

## 7. Risk / guardrails
Presentational + capture only — **no FSRS/schema change** (cards already exist;
`addCard` already syncs). Main risks: (a) the global selection listener interfering
with normal text selection / copy — mitigate with an explicit opt-out attribute and
a "only show on ≥1 real word, not on UI chrome" guard; (b) cognitive-load creep —
keep the popover tiny, dismissible, non-modal; (c) translation cost — already cached
+ BYOK-aware, and free-tier `gtx` exists.

## 8. Scope & build estimate (⬅️ pick one)
- **MVP (Tier 1):** global `SelectionToCard` popover (translate + speak + save +
  context capture + dedupe state) on reading surfaces, transient highlight only.
  **~45–60 min focused session.**
- **+ Tier 2 persistent highlight** (CSS Custom Highlight API + saved-words store):
  **another ~45–60 min**, higher risk.
- **+ "guess first" / weekly nudge / phrase polish:** small add-ons, ~15–20 min each.

## 9. ⬅️ Decisions for Kheshav
1. **MVP scope:** Tier 1 only first (recommended), or go straight for persistent
   highlighting (Tier 2)?
2. **Which surfaces for v1?** All reading surfaces, or start with Comprehension +
   transcripts and expand?
3. **Saved deck:** one `Saved` deck, or tag by source surface?
4. **Guardrails on by default?** (two-step save = yes; "guess first" = opt-in?)
