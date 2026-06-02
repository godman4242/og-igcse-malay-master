# Tappable saved-word highlights — design spec (2026-06-02)

## 1. One-liner
Tap an already-highlighted (already-saved) word while reading → a small,
read-only popover gives instant **review**: the meaning + a 🔊 pronounce button.
A *review* gesture, distinct from select-to-card's *save* gesture.

## 2. Why (the honest verdict)
- **Distinct intent, not duplication.** Select-to-card = "save a NEW word."
  Tap-a-highlight = "remind me about a word I ALREADY saved." Different jobs.
- **Mission-aligned.** In-context retrieval (see saved word in real prose → tap →
  hear + recall meaning) is the retrieval-in-context combo backed by the vocab
  learning-science research (see the 2026-06-02 UDL brief in chat history).
- **Mobile ergonomics.** One tap ≫ the fiddly long-press-and-drag that selecting
  a word requires on a phone.
- **Caveat:** this is *quality polish*, not core. Real learning is in Study/FSRS.
  Build it well or not at all.

## 3. The non-negotiable quality bars (this is why we reframed)
The feature MUST NOT, under any circumstance:
1. Break normal text **selection / copy** on any surface.
2. Break or confuse **screen readers** / keyboard users (stay additive).
3. **Hijack** taps meant for links, buttons, or inputs.
4. Introduce tap **lag** on big pages or low-end phones.
If any bar can't be met, stop and re-scope.

## 4. The design that satisfies the bars *by construction*
- **Trigger on a true click, never a drag.** Track pointer down→up; if the
  pointer moved more than ~6px between down and up, it's a selection — bail.
  A no-drag click never fights selection (selection needs the drag).
- **Hit-test, don't intercept.** On a qualifying click, use
  `document.caretRangeFromPoint(x, y)` (Chromium/WebKit) /
  `caretPositionFromPoint` (Firefox) to find the text node + offset under the
  finger. Re-run `findSavedWordMatches` on that node's text; if the offset falls
  inside a match, that's the tapped word. Otherwise do nothing.
- **Only highlighted words act.** Reuse `savedWordsForMode(cards, highlightMode)`
  so the tap target is exactly the highlighted set. Words inside
  `[data-no-highlight] / input / textarea / button / a` are already excluded from
  highlighting — re-check the click's `target.closest(...)` and bail if so.
- **Additive popover.** Reuse the `SelectionToCard` popover *look* (a tiny new
  `SavedWordPopover` or a shared presentational sub-component) anchored to the
  tapped word's rect. Read-only: shows `{ malay (bold) · english · 🔊 }`. NO save
  button (it's already saved). Optional secondary action: a "Review in Study"
  link. Dismiss on Escape / outside-tap / scroll, same as SelectionToCard.
- **Pull meaning from the card,** not a re-translation: find the card whose
  `m` matches (case-insensitive) and show its `e` (+ `ex` if useful). Zero
  network, instant.
- **Degrade:** if the Custom Highlight API is unsupported there are no highlights,
  so there's nothing to tap — the click handler simply never finds a match.

## 5. Reuse map (don't reinvent)
- `src/lib/savedWordHighlight.js` — `findSavedWordMatches`, `savedWordsForMode`
  (both already TDD'd). The tap hit-test reuses `findSavedWordMatches`.
- `src/components/SelectionToCard.jsx` — popover styling, dismiss-on-escape/scroll
  logic, the `highlightTerm` underline helper, `speak(word, 'ms-MY')`. Extract the
  shared popover chrome if it keeps things DRY; otherwise a small sibling
  component is fine.
- `src/hooks/useSavedWordHighlights.js` — already owns the highlightMode + cards
  read; the tap hook is its sibling (or folded in).

## 6. Suggested architecture
- New pure helper (TDD): `wordAtOffset(text, offset, words) → word | null` in
  `savedWordHighlight.js` — given a clicked text + char offset + the active word
  list, return the saved word under that offset (or null). Pure, unit-testable;
  isolates the "did the tap land on a saved word" logic from the DOM.
- New hook `useSavedWordTap()` (mounted in Layout next to highlights): document
  `pointerdown`/`pointerup` (or `click` + a drag guard) → caret hit-test →
  `wordAtOffset` → set popover state. Returns the popover state/props.
- New component `SavedWordPopover` (rendered in Layout): the read-only review
  card. Or reuse a shared `<WordPopover>` extracted from SelectionToCard.

## 7. Open decisions for Kheshav (confirm at session start — defaults in **bold**)
1. **Popover contents:** **meaning + 🔊** only (clean), or also a "Review in
   Study" link / a "Remove from saved" action? → default: meaning + 🔊, plus a
   subtle "Review in Study" link.
2. **Which highlights are tappable:** **whatever is currently highlighted**
   (respects the Off/Saved/All setting) — so 'All' mode makes every study word
   tappable. Confirm that's wanted, or restrict taps to the 'Saved' deck only.
3. **Affordance:** do highlighted words need a "you can tap me" cue (e.g. a subtle
   cursor change / dotted underline on hover)? → default: cursor: pointer on
   highlighted ranges via `::highlight()` can't set cursor, so a light hover
   treatment is a stretch goal; ship without and evaluate.
4. **Desktop too, or mobile-first?** → default: both (a click is a click).

## 8. Test plan
- **Unit (TDD first):** `wordAtOffset(text, offset, words)` — offset inside a
  match → that word; offset on a boundary/space → null; offset inside a non-saved
  word → null; multi-word phrase; empty inputs.
- **E2E (`tests/e2e/saved-word-tap.spec.js`):**
  1. Seed a saved word + prose; click on the highlighted word → review popover
     shows the meaning + speaker. Light + dark screenshots.
  2. **Selection not broken:** simulate a press-drag across text → NO popover,
     selection intact.
  3. **Non-saved word:** click an un-highlighted word → no popover.
  4. **Link safety:** a highlighted word inside an `<a>` → click does NOT open the
     popover (and the link still works).
  5. Dismiss on Escape / outside-click.

## 9. Verification gates (same discipline as prior features)
`npm run build` (clean) · `npm run lint` (0 errors) · `npm run test:run` (all
pass) · the new e2e green · eyeball light AND dark · then commit + (auto)deploy +
confirm Vercel READY + refresh RESUME_HERE in the same commit.

## 10. Estimate
~1–1.5 focused hours. Risk: medium (DOM hit-testing + cross-browser caret APIs +
mobile). The drag-guard + additive design is what keeps it from touching the
dangerous failure modes.
