# Reader + drill keyboard / screen-reader accessibility — Design

**Date:** 2026-06-12
**Status:** spec — design-only (no production code this session)
**Backlog ref:** P1-5 (DEMONSTRATED) + the a11y band of `docs/reviews/2026-06-12-full-codebase-review.md` (Top-10 fix #10)
**Plan:** `docs/superpowers/plans/2026-06-12-reader-drill-a11y.md`

---

## 1. Why (the problem, in one breath)

The PDF reader's core loop and every drill/flashcard feedback are **pointer-only**, so
keyboard and switch-access users are locked out of the app's primary function, and screen
readers get no announcement when an answer is marked right/wrong. This violates the
ADD-first / curb-cut north star and WCAG 2.1.1 (Keyboard) / 4.1.3 (Status Messages) /
2.5.5 (Target Size). DEMONSTRATED at source:

- `src/pages/PDFReader.jsx:1615` — content tokens `<span data-token-i={p.i}>` carry **no
  `tabIndex` / `role` / `onKeyDown`**. Tab skips every word; tap-to-translate and
  select-to-deck are unreachable without a pointer.
- `src/pages/PDFReader.jsx:1529-1535` — the `data-testid="reader-reflow"` container has only
  pointer handlers.
- Study modes (`src/components/study/*.jsx`) + `src/pages/Grammar.jsx` show correct/incorrect
  **visually only** (colour + ✅/❌), no live region.
- `src/components/SearchModal.jsx` — a plain `<div>` overlay: no dialog role, no focus trap,
  no Esc-to-close, no focus return.
- Header / toolbar / chip controls fall below the PRD's ≥44 px (e.g. SearchModal add button
  is `w-6 h-6` = 24 px).

**The one real design fork is #1 (the reader keyboard model).** #2–#4 are pre-decided
standard patterns and are fully specified below so the build session has zero open choices.

---

## 2. Non-negotiable invariants (what must NOT change)

1. **Pointer/touch selection is byte-for-byte untouched.** The app's primary device is a
   phone. Keyboard support is **purely additive**. `src/lib/useSelectionMode.js` and
   `src/lib/gestureModel.js` are **not edited** — the keyboard layer *calls* the existing
   `handleCommit` / `classifyGesture` / `revealGloss` / `addGloss`, nothing more. The
   `elementFromPoint` hit-test pattern (CLAUDE.md Critical Conventions) stays exactly as-is.
2. **Reveal-gated, Malay-first.** A keyboard reveal must be **as deliberate as the tap is**:
   moving focus onto a token reveals nothing; only an explicit Enter reveals. Never auto-reveal.
3. **MS/EN toggles** and the **gloss→FSRS core** are unchanged.
4. **Existing focusable affordances stay focusable** — `DocGloss`'s reveal/add buttons are
   already `<button>`s; we don't regress them.

---

## 3. Design #1 — Reader keyboard model (the fork)

### 3.1 The reuse seam (why this is small)

The reflow reader already routes ALL interaction through mode-aware functions. The keyboard
layer adds focus + a key→action mapping and then calls these unchanged:

| Existing fn | Anchor | What it does |
|---|---|---|
| `handleCommit({startIndex,endIndex,kind})` | `PDFReader.jsx:519` | Mode-aware: Translate→`translateOne`/`translateMany`/`showCompoundFor`; Select→`addToSelection`. Branches on `showSelection` (`mode==='select'`, :471). |
| `classifyGesture({button,startIndex,endIndex,groupIntent})` | `gestureModel.js:23` | Pure word/words/phrase classifier. Reused to label a keyboard range identically to a drag. |
| `revealGloss(i)` | `PDFReader.jsx:638` | Reveal a token's in-place gloss (`revealToken`). |
| `addGloss(g)` | `PDFReader.jsx:644` | Add a revealed gloss to FSRS. |
| `groupMode` | `PDFReader.jsx:101` | Toolbar Group toggle → `groupIntent` `'phrase'|'words'`. |

### 3.2 Focus model (Decision D1 + D2)

- **Roving tabindex.** Exactly one content token is in the tab order (`tabIndex={0}`); all
  others are `tabIndex={-1}` (script/arrow-focusable, not Tab-focusable). Tab enters the
  token group at the active token; Arrow keys move the active token (rolling the `0`).
  Rationale: matches the Done ("tokens Tab-focusable") and gives **switch access** real DOM
  focus targets. (Alternative `aria-activedescendant` rejected — switch scanners walk the
  real focus order.)
- **No `role="button"` on tokens (D2).** Tokens stay focusable **plain-text spans** so a
  screen reader's browse-mode keeps reading the Malay prose naturally (the page's entire
  purpose; a paragraph of "button, button, button" would destroy reading). State is conveyed
  via `aria-label` **only when a token carries state** (selected / grouped phrase /
  low-confidence scan / a revealed meaning); otherwise the element content (the word) is the
  announcement. **Escalation path (flagged):** if a real screen-reader audit shows bare
  focusable spans aren't announced as actionable on a target AT (VoiceOver/NVDA), escalate
  to `role="button"` and accept the browse-mode verbosity — but default to clean reading.
- **Container** `data-testid="reader-reflow"` gains `role="group"`, an `aria-label`
  ("Document reader — arrow keys move between words, Enter reveals the meaning"), and
  `aria-keyshortcuts`. Its existing pointer handlers are unchanged; we add **one** delegated
  `onKeyDown` (reads `document.activeElement.closest('[data-token-i]')`).
- A **visible focus ring** on the active token (`:focus-visible` outline via `--color-accent`)
  — non-colour-dependent, ≥2 px.

### 3.3 Key map (Decision D4–D6) — the canonical mapping

When a content token has roving focus inside the reflow reader:

| Key | Action | Reuses |
|---|---|---|
| `Tab` / `Shift+Tab` | Enter / leave the token group (single roving stop) | native |
| `←` / `↑` | Move focus to **previous** content token (document order) | new (pure `readerKeymap`) |
| `→` / `↓` | Move focus to **next** content token | new |
| `Home` / `End` | First / last content token of the document | new |
| `Enter` | **Reveal the meaning of this token.** If it has an unrevealed gloss → `revealGloss(i)`. Else → `handleCommit({startIndex:i,endIndex:i,kind:'word'})` (tap-to-translate in Translate mode; add-to-selection in Select mode). | `revealGloss` + `handleCommit` |
| `Shift` + `←`/`→`/`↑`/`↓` | **Extend** an anchored multi-token range (visual highlight; sets `anchor` on first Shift-press) | new |
| `Enter` *(with an active multi-token range)* | **Commit the range** via `handleCommit` with `kind` from `classifyGesture({button:0, startIndex:anchor, endIndex:focus, groupIntent: groupMode?'phrase':'words'})`. Translate mode → `translateMany`/`showCompoundFor`; Select mode → bucket. Then clear range. | `classifyGesture` + `handleCommit` |
| `a` | **Add** the focused token's **revealed** gloss to the deck → `addGloss(gloss)`. If no meaning is revealed yet, do nothing + announce "Press Enter to reveal the meaning first." | `addGloss` |
| `Esc` | Clear the in-progress keyboard range | new |

- **Space is deliberately NOT hijacked (D5)** — it keeps native page-scroll, which keyboard
  users expect on a long reading surface. Enter is the sole activate key.
- **Reveal-gate compliance (D4):** Enter is the deliberate press; Arrowing onto a token
  reveals nothing. Malay-first is preserved.
- **select-to-deck end-to-end from the keyboard:** Select mode (existing toolbar toggle,
  `:1138`) → Enter/Shift+Arrow build the bucket → the **existing "Add to deck" button**
  (`addSelectionToDeck`, `:586`, already a focusable `<button>`) commits to FSRS. No new add
  path needed for ranges.

### 3.4 Pure dispatcher (Decision D3)

New `src/lib/readerKeymap.js` — a pure function mirroring `gestureModel.js`, so the map is
unit-tested and can't silently invert:

```
resolveReaderKey({ key, shiftKey }, ctx) -> action | null
  ctx = { activeIndex, order, anchorIndex, mode, groupOn, hasGloss, glossRevealed }
  // order = ordered array of content-token global indices (document order)
  action ∈
    { type:'move',        to }                         // Arrow / Home / End
    { type:'extend',      to }                         // Shift+Arrow
    { type:'activate',    index }                      // Enter, no range
    { type:'commitRange', startIndex, endIndex, kind } // Enter, range (kind via classifyGesture)
    { type:'addDeck',     index }                      // 'a'
    { type:'clearRange' }                              // Esc
    null                                               // unhandled → let the browser act
```

The component's single `onKeyDown` calls `resolveReaderKey`, then performs the side effect
by calling the existing functions + moving DOM focus. `commitRange`'s `kind` is computed by
`resolveReaderKey` calling `classifyGesture` internally, guaranteeing keyboard ranges and
drags classify identically.

### 3.5 Live region

A `<FeedbackLive>` polite region (shared with #2, §4) announces each action's *result*:
the revealed meaning text ("telinga — ear"), "Added telinga to deck", "Selecting 3 words".
This gives non-visual users feedback without relying on the colour cue.

### 3.6 Out of scope for this pass (logged follow-ups)

- **Layout (overlay) view keyboard support** — reflow only this pass (D7).
- **Grammar auto-advance pause** (WCAG 2.2.1; separate P3).
- **`lang="ms"` on Malay content** (P3; adjacent but separate).

---

## 4. Design #2 — aria-live on drill / flashcard feedback (pre-decided)

Correct/incorrect is shown visually only across:
- `src/components/study/`: `ClozeMode.jsx` (:40), `ListenMode.jsx` (:43), `TypeMode.jsx`
  (:32), `QuizMode.jsx` (fb at :15), `FlashcardMode.jsx` (reverse/cloze/audio/produce
  sub-modes, fb setters :51/:57/:63/:69).
- `src/pages/Grammar.jsx`: `fb`/`drillFeedback`/`svaFb`/`artFb`/`tenseFb` (:201,:254,:275,:284,:293).

**Decision D8 — one shared component.** Create `src/components/FeedbackLive.jsx`:

```jsx
// Polite, atomic status line — announces the SAME text the eye sees.
export default function FeedbackLive({ text }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{text || ''}</div>
}
```

Mirrors DocGloss's `aria-live="polite"` (`DocGloss.jsx:54`). Each surface renders one
`<FeedbackLive text={...}>` whose text updates when feedback state changes, e.g.
`fb.correct ? 'Correct' : \`Not quite — the answer is ${fb.answer}\``. `sr-only` =
visually hidden, announced (add the standard utility to `src/index.css` if absent). No
change to existing visual feedback or to Grammar's auto-advance timers.

---

## 5. Design #3 — 44 px minimum target size (pre-decided)

**Decision: bump every below-44 px interactive control in the header / PDFReader toolbar /
SearchModal chips to a ≥44×44 px hit target without changing visual density elsewhere.**

Known offenders (from grounding):
- `SearchModal.jsx`: add button `w-6 h-6` (24 px, :77); Volume2 (:71,:95) & X (:47) icon
  buttons — bare icons, no padding.
- `Layout.jsx`: header Search (`size={14}`, :188), theme toggle Sun (:259), account chevron
  (:145) — small icon hit areas.
- `PDFReader.jsx` toolbar: Translate/Select + Group toggle buttons (`px-2.5 py-1.5`,
  :1147/:1151) — verify rendered height.

**Fix idiom (density-preserving):** add `min-w-[44px] min-h-[44px]` + `inline-flex
items-center justify-center` so the icon stays its current visual size but the *tap target*
reaches 44 px. Where a row's layout would grow, expand the hit area with a transparent
overlay (`position:relative` + an absolutely-positioned `inset-[-N]` pseudo / span) instead
of growing the visible chip. The **audit pass produces the authoritative offender list**
(measure `getBoundingClientRect` in Chromium); each is brought to ≥44 px.

> jsdom has no layout engine, so target size is **verified in the Chromium e2e**, not unit
> tests (see §7).

---

## 6. Design #4 — SearchModal dialog semantics (pre-decided)

**Decision D9 — reusable hook.** Create `src/lib/useFocusTrap.js`:
`useFocusTrap(ref, { active, onClose })` →
1. On `active`, record `document.activeElement` as the trigger and move focus into the
   dialog (the input already has `autoFocus`).
2. `Tab`/`Shift+Tab` cycle within the dialog's focusable elements (wrap first↔last).
3. `Esc` → `onClose()`.
4. On deactivate/unmount, **return focus to the trigger**.

`SearchModal.jsx` becomes the first consumer:
- Outer div → `role="dialog"`, `aria-modal="true"`, `aria-label="Search dictionary"`,
  `ref={dialogRef}`, plus `useFocusTrap(dialogRef, { active: open, onClose })`.
- Backdrop click-to-close is preserved.

Keep the hook ~40 lines (YAGNI on edge cases); future modals reuse it.

---

## 7. Acceptance criteria (measurable Done — each red-proofable)

**Reader keyboard (#1):**
- **F1** In the reflow reader, `Tab` moves focus into the token group and a visible focus
  ring appears on a token. *(red now: no tabIndex)*
- **F2** With a token focused, `←/→/↑/↓/Home/End` move focus across content tokens in
  document order. *(red now)*
- **F3** `Enter` on a token with a gloss reveals it **in place** (Malay still shown first);
  `Enter` on a token without a precomputed gloss triggers tap-to-translate (meaning appears).
  Moving focus alone reveals **nothing**. *(red now)*
- **F4** In Select mode, `Enter` adds the focused token to the selection bucket; `Shift+Arrow`
  extends a multi-word range; `Enter` commits it (words, or phrase when Group is on); the
  existing "Add to deck" commits to FSRS — all from the keyboard. *(red now)*
- **F5** `a` on a token with a **revealed** gloss adds it to the deck; with no revealed
  meaning it announces a polite hint and adds nothing. *(red now)*
- **F6** `Esc` clears an in-progress keyboard range. *(red now)*
- **F7** A polite live region announces each action's result (meaning text / "Added X to
  deck" / "Selecting N words"). *(red now)*
- **F8 (guard)** Pointer behaviour is byte-for-byte unchanged: all existing PDFReader
  pointer/touch e2e + `gestureModel`/`useSelectionMode` unit tests pass unmodified, and
  those two files are **not edited**.

**Drill/flashcard live region (#2):**
- **F9** Every study mode (Cloze, Listen, Flashcard reverse/cloze/audio/produce, Quiz, Type)
  and each Grammar drill renders a polite live region announcing the **same** correct/incorrect
  text shown visually, on each answer. *(red now)*

**Target size (#3):**
- **F10** Every interactive control in the header, the PDFReader toolbar, and SearchModal
  chips has a rendered hit target ≥44×44 px (measured in Chromium); density elsewhere
  unchanged. *(red now)*

**SearchModal dialog (#4):**
- **F11** SearchModal has `role="dialog"` + `aria-modal="true"`; `Tab`/`Shift+Tab` trap focus
  inside; `Esc` closes; on close focus returns to the trigger. *(red now)*

## 8. Test plan (red-proofed)

- **e2e** `tests/e2e/reader-keyboard.spec.js` — F1–F7 against an OCR/text fixture; deck
  assertions via the `bindStore` live-URL pattern (`tests/e2e/mistake-promotion.spec.js`,
  per the Vite `?t=` module-URL trap in CLAUDE.md). F8 = existing pointer specs stay green.
- **e2e** target-size sweep (`tests/e2e/a11y-tap-targets.spec.js` or folded into the above) —
  F10 via `boundingBox()` ≥44 over the enumerated controls (real Chromium layout).
- **unit** `src/lib/readerKeymap.test.js` — the pure dispatcher: every key, both modes, range
  logic, `kind` parity with `classifyGesture`. *(red-proofed: write before the impl)*
- **unit** `src/lib/__tests__/useFocusTrap.test.js` (jsdom) — Tab cycle, Esc→onClose, focus
  return to trigger.
- **unit** `src/components/__tests__/searchModalA11y.test.jsx` — role/aria-modal present, Esc
  closes, focus returns. *(F11)*
- **unit** `src/components/__tests__/feedbackLive.test.jsx` + per-surface smoke — a
  `role="status"` node carries the feedback text on answer. *(F9)*

Every new unit test is **watched failing first** (red), then made green. The pre-commit gate
(build → test:run → lint → content-lint) must pass; baseline chunk sizes re-recorded.

## 9. Risks

- **R1 — SR verbosity vs reading flow (D2).** Mitigated by no token role + label-on-state;
  escalation path documented if an AT audit disagrees.
- **R2 — roving-focus jank on 1000-token docs.** Mitigated by a single delegated `onKeyDown`
  (event delegation, not 1000 handlers) and `order` memoized from `tokenized.pages`.
- **R3 — `a` single-letter shortcut colliding with AT pass-through.** Low: only fires when a
  reader token has focus; documented in the container `aria-keyshortcuts`.
