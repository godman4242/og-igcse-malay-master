# Tappable saved-word highlights — design spec (v2, learning-science + UDL upgrade)

> **v2 (2026-06-03)** — upgraded through the learning-science / UDL lens in a
> Design & Research session. The v1 engineering design (drag-guard, caret
> hit-test, additive popover) was sound and is **preserved**; v2 adds the
> *learning* rationale, a **mandatory accessibility bar (WCAG 1.4.13)**, a staged
> **MVP → Tier-2** build, an evidence-graded decision log, and resolves the v1 open
> decisions. Research + decisions are Kheshav-approved (2026-06-03).

## 1. One-liner
Tap an already-highlighted (already-saved) word while reading → a small,
read-only popover gives instant **review**: the meaning + a 🔊 pronounce button +
the example sentence. A *review* gesture, distinct from select-to-card's *save*
gesture. Tier-2 adds an optional **recall-first** reveal for words that are due
for practice, turning a passive glance into a retrieval rep.

## 2. Why (the honest verdict, now evidence-backed)
- **Distinct intent, not duplication.** Select-to-card = "save a NEW word."
  Tap-a-highlight = "remind me about a word I ALREADY saved." Different jobs.
- **In-context review is real learning, not just polish.** Seeing a saved word in
  authentic prose and recalling its meaning is *glossing* + *retrieval*, both
  evidence-backed for L2 vocabulary (see Decision Log §7, rows R1–R3).
- **Mobile ergonomics.** One tap ≫ the fiddly long-press-and-drag selection needs
  on a phone.
- **Honest scope caveat.** A reading-context tap naturally trains **receptive**
  knowledge (see word → recall meaning). IGCSE writing/speaking need
  **productive** knowledge — that's Study/FSRS + the Track-B cloze feature's job.
  We do NOT overclaim this builds production. It's a high-quality *receptive +
  consolidation* surface, built well.

## 3. The non-negotiable quality bars
The feature MUST NOT, under any circumstance:
1. Break normal text **selection / copy** on any surface.
2. Break or confuse **screen readers** / keyboard users (stay additive).
3. **Hijack** taps meant for links, buttons, or inputs.
4. Introduce tap **lag** on big pages or low-end phones.
5. **(v2, NEW — accessibility)** Be keyboard-hostile. Precisely (so the builder
   isn't handed a contradiction):
   - **WCAG 2.1.1 (Keyboard):** a keyboard/AT user must have *a* path to the same
     meaning. Today the existing **select-to-card** popover provides that on
     selection; a dedicated focus-trigger over the highlighted ranges is Tier-2
     (see §4a/D4). The MVP must not *remove* or regress that path.
   - **WCAG 1.4.13 (Content on Hover or Focus):** the review popover, once shown,
     MUST be **dismissible with Esc** without moving focus away first, and must not
     obscure/trap. Give it `role="dialog"` + an accessible name.
   - A tap-only popover with **no Esc handling / no focus management** *fails* this.
   **This is a bar, not a stretch goal.** (NOTE: `::highlight()` ranges are not
   focusable DOM nodes, so "make every highlight a tab stop" is explicitly a Tier-2
   option, not an MVP requirement — that's why the MVP keyboard path leans on
   select-to-card + an Esc-able, focus-managed popover.)

If any bar can't be met, stop and re-scope.

## 4. The design that satisfies the bars *by construction*
### 4a. MVP — instant review popover (build this first)
- **Trigger on a true click, never a drag.** Track pointer down→up; if the pointer
  moved more than ~6px between down and up, it's a selection — bail. A no-drag
  click never fights selection (selection needs the drag). Also bail if
  `window.getSelection()` is non-collapsed.
- **Hit-test, don't intercept.** On a qualifying click, use
  `document.caretRangeFromPoint(x, y)` (Chromium/WebKit) / `caretPositionFromPoint`
  (Firefox) to find the text node + offset under the finger. Run the new pure
  `wordAtOffset(node.textContent, offset, words)`; if the offset falls inside a
  saved-word match, that's the tapped word. Otherwise do nothing.
- **Only highlighted words act.** Reuse `savedWordsForMode(cards, highlightMode)`
  so the tap target is exactly the currently-highlighted set. Re-check the click's
  `target.closest('[data-no-highlight], input, textarea, button, a')` and bail if
  inside one (mirrors the highlight hook's own exclusions — link-safety bar #3).
- **Additive popover.** Reuse the `SelectionToCard` popover *chrome* (anchored
  `role="dialog"`, `var(--color-*)` theming, `animate-fadeUp`, dismiss-on-
  Escape/scroll/outside-click, `onMouseDown preventDefault` to keep selection
  alive). Read-only contents: **bold Malay word · 🔊 (`speak(word,'ms-MY')`) ·
  English meaning · example sentence (`ex`, dual-coding win)**. NO save button
  (it's already saved). A subtle **"Review in Study"** link (`navigate('/study')`).
- **Keyboard path (bar #5).** Because `::highlight()` ranges aren't focusable DOM
  nodes, the keyboard affordance can't live on the highlight itself. MVP keyboard
  story = the existing **select-to-card** flow already gives keyboard/AT users a
  meaning popover on selection; PLUS the popover, once opened, is fully keyboard-
  operable (focus moves into it, Esc closes, focus returns). Document this
  explicitly; if a richer keyboard trigger is needed, it's the first Tier-2 item.
  *(Decision D4 — confirm the MVP keyboard story is acceptable.)*
- **Pull meaning from the card,** not a re-translation: `cards.find(c =>
  c.m.toLowerCase() === word)` → show `e` (+ `ex`). Zero network, instant.
- **Degrade:** if the Custom Highlight API is unsupported there are no highlights,
  so there's nothing to tap — the handler simply never finds a match (no-op).

### 4b. Tier-2 — recall-first reveal for due words (spec it, build later)
The learning ceiling. Evidence (§7 R1/R4): retrieval practice beats lookup for
durable memory **but only when the answer is then revealed (feedback)**, and
forcing effort can **backfire on motivation** for self-directed teens. So Tier-2
is *adaptive and never forced*:
- When the tapped word's card is **due / weak** (reuse FSRS: `state <= Learning`
  OR `due <= now` OR `lapses >= 3` — mirror `drillVariants.js`'s tiering, which
  already adapts presentation by FSRS state), the popover opens in **recall mode**:
  shows the Malay word + 🔊 + a single obvious **"Show meaning"** button, meaning
  hidden. One tap reveals it = retrieval attempt + immediate feedback.
- Otherwise (word is strong / not a current target), open in **instant mode** (the
  MVP gloss) — preserves reading flow, honors the load-reduction/motivation
  evidence.
- **Never blocks:** "Show meaning" is always one tap; no quiz gating, no scoring.
- **Forgot-signal (Tier-2, Kheshav-approved with guardrail).** In recall mode,
  after reveal, offer a subtle **"I forgot this"** tap. It routes to the Mistake
  journal as a **soft** signal: `addMistake({ type:'review', category:'vocab',
  source:'tappable-review', language:'ms', word, correct:e, severity:'low' })` and
  touches `lastReviewedAt`. **GUARDRAIL (non-negotiable):** it MUST NOT call any
  FSRS `Rating` / reschedule the card — a casual tap can't be allowed to corrupt
  spaced-repetition timing. It is a journal/awareness signal only. (See §7 D-A4.)
  - **Subtlety to verify (don't assume):** `addMistake` *auto-promotes* Malay
    vocab/imbuhan mistakes to FSRS cards. But the tapped word is, by definition,
    ALREADY a saved card — so `promoteMistakeToCard` should dedupe to the existing
    card and (per the store code) NOT touch its FSRS fields. The Tier-2 e2e
    (§8) asserts the card's `due`/`stability` are byte-identical before/after the
    forgot-tap — that test is what guarantees the guardrail actually holds.

## 5. Reuse map (verified against the live code, 2026-06-03)
- `src/lib/savedWordHighlight.js` — `findSavedWordMatches(text, words)` (returns
  `[{start,end,word}]`, lowercased) + `savedWordsForMode(cards, mode)`. Both
  TDD'd. **Add** the pure `wordAtOffset` here.
- `src/hooks/useSavedWordHighlights.js` — owns the `highlightMode` + `cards` read,
  the `<main>` tree-walk, the `[data-no-highlight]/input/textarea/button` skip
  list, and the `supportsHighlightApi()` guard. The tap hook is its sibling and
  mirrors its state-read pattern (read live via `useStore.getState()` in the
  handler; key only for re-subscribe — do NOT churn Layout on every `cards` diff).
- `src/components/SelectionToCard.jsx` — popover chrome to reuse: anchored-rect
  positioning math (`POPOVER_W`, above/below flip), `role="dialog"`,
  `animate-fadeUp`, `var(--color-*)`, the 🔊 button (`speak`,
  `hasSpeechSynthesis()`), `highlightTerm(sentence, term)` underline helper, and
  the Escape/scroll/outside-click dismiss effects. Extract a shared
  `<WordPopover>` presentational shell ONLY if it stays surgical (don't regress the
  save popover); otherwise a sibling `SavedWordPopover` is fine.
- `src/store/useStore.js` — Tier-2 forgot-signal: `addMistake(...)` (line ~1233;
  dedupes within 24h, escalates severity) + the card-shape FSRS fields
  (`state`, `due`, `lapses`) for the due-check. `drillVariants.js`'s `selectVariant`
  is the precedent for FSRS-state-driven presentation.

## 6. Suggested architecture
- **New pure helper (TDD):** `wordAtOffset(text, offset, words) → word | null` in
  `savedWordHighlight.js` — `findSavedWordMatches(text, words)`, return the match
  whose `start <= offset < end`, else null. Pure, unit-testable; isolates "did the
  tap land on a saved word" from the DOM.
- **New hook `useSavedWordTap()`** (mounted in Layout next to highlights):
  `pointerdown`/`pointerup` + drag-guard → caret hit-test → `wordAtOffset` →
  card lookup → popover state. No-op when `highlightMode==='off'` / no words / API
  absent.
- **New component `SavedWordPopover`** (rendered in Layout): the read-only review
  card (MVP), with the Tier-2 recall-mode branch behind a small internal flag.

## 7. Decision log + open decisions for Kheshav

### Decision log (decision · evidence + grade · confidence)
| # | Decision | Evidence (source · grade) | Confidence |
|---|----------|---------------------------|-----------|
| R1 | Recall-first beats instant lookup **for durable memory** | Retrieval-practice / testing effect ranked #1 study technique; recall > look-up ([Dunlosky 2013]; [Frontiers 2025 primary]) · **high** | High |
| R2 | …**but only with feedback** — a recall attempt with no reveal does nothing | Prequestioning-without-feedback null result ([Frontiers 2025]) · **med-high** | High |
| R3 | Instant gloss is still valuable for reading flow + light pickup | Glossing meta-analysis: glosses aid incidental vocab + comprehension by cutting lookup load ([Frontiers glossing meta 2026]) · **med-high** | Med-high |
| R4 | Forcing effort can **backfire on motivation** for self-directed teens | Desirable-difficulty backfire; learners rate effortful methods as worse & quit when not fun ([PMC 10858853]) · **med-high** | Med-high |
| R5 | Pointer-only **fails accessibility law**; keyboard+Esc required | WCAG 2.1 SC 1.4.13 + WAI-ARIA tooltip pattern ([W3C 1.4.13]; [W3C APG tooltip]) · **high (normative)** | High |
| → | **Net design:** instant-by-default (R3), recall option one easy tap away & only for due words (R1+R2+R4), keyboard+Esc mandatory (R5) | synthesis | High |

### Open decisions (defaults in **bold**; all resolved with Kheshav 2026-06-03)
1. **Staging — D-STAGE:** **Ship the MVP (instant gloss + example + a11y) clean;
   fully spec recall-first + forgot-signal as Tier-2.** *(Approved — Option 1.)*
2. **Popover contents:** **meaning + 🔊 + example sentence**, plus a subtle "Review
   in Study" link. *(Default; confirm the "Review in Study" link is wanted.)*
3. **Which highlights are tappable:** **whatever is currently highlighted** (respects
   the Off/Saved/All setting) — in 'All' mode every study word is tappable.
   *(Default; confirm vs. restricting to the 'Saved' deck only.)*
4. **D4 — MVP keyboard story:** since `::highlight()` ranges aren't focusable, the
   MVP keyboard path = select-to-card's existing popover + a fully keyboard-
   operable review popover once open. **Default: accept for MVP**; a dedicated
   keyboard trigger (e.g. a roving-tabindex over highlighted words) is the first
   Tier-2 task if wanted. *(Confirm acceptable.)*
5. **D-A4 — forgot-signal:** **design it in as Tier-2, soft-signal only (journal +
   `lastReviewedAt`, NEVER an FSRS Rating).** *(Approved; Kheshav asked to double-
   check — it survives: high-value loop-closing signal, guardrailed against
   corrupting scheduling.)*

## 8. Test plan
- **Unit (TDD first):** `wordAtOffset(text, offset, words)` — offset inside a match
  → that word; offset on a boundary/space → null; offset inside a non-saved word →
  null; multi-word phrase mid-phrase → the phrase; offset past end / empty inputs →
  null.
- **E2E (`tests/e2e/saved-word-tap.spec.js`):**
  1. Seed a saved word + prose; click the highlighted word → review popover shows
     meaning + 🔊 + example. Light + dark screenshots.
  2. **Selection not broken:** press-drag across text → NO popover, selection intact.
  3. **Non-saved word:** click an un-highlighted word → no popover.
  4. **Link safety:** highlighted word inside an `<a>` → click does NOT open the
     popover (and the link still works).
  5. **Keyboard/a11y (bar #5):** Esc dismisses; popover has `role="dialog"` +
     accessible name; focus returns to a sane anchor on close.
  6. Dismiss on outside-click / scroll.
- **Tier-2 (when built):** due word → recall mode (meaning hidden until "Show
  meaning"); strong word → instant mode; "I forgot this" adds exactly one
  `mistakes` entry and does **not** change the card's `due`/`stability`.

## 9. Verification gates
`npm run build` (clean) · `npm run lint` (0 errors) · `npm run test:run` (all
pass) · the new e2e green · eyeball light AND dark · then commit + (auto)deploy +
confirm Vercel READY + refresh `RESUME_HERE.md` in the same commit.

## 10. Estimate
- **MVP** (§4a + a11y): ~1–1.5 focused hours. Risk: medium (DOM hit-testing +
  cross-browser caret APIs + mobile).
- **Tier-2** (§4b recall-first + forgot-signal): ~1 hour on top. Risk: low-medium
  (reuses FSRS state + `addMistake`; the guardrail is a one-line "no Rating").

## 11. Sources
- Dunlosky et al. (2013), *Improving Students' Learning With Effective Learning
  Techniques* (meta-review).
- Retrieval practice in real settings (primary): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1632206/full
- Glossing & L2 incidental vocab (meta-analysis): https://www.frontiersin.org/journals/language-sciences/articles/10.3389/flang.2026.1815571/full
- Desirable-difficulty backfire / motivation: https://pmc.ncbi.nlm.nih.gov/articles/PMC10858853/
- WCAG 2.1 SC 1.4.13 Content on Hover or Focus: https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html
- WAI-ARIA Tooltip pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
