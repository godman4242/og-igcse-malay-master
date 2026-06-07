# Reading & Select experience — audit + design (2026-06-07)

Kheshav's three "website plans": (a) **PDF keeps its layout** in the translator,
(b) **selected words are highlighted** so you can see what's selected, (c) **left-drag =
individual words / right-click = group as a phrase** so a learner sees how meaning changes
when words connect (e.g. *jam tangan* = "watch", not "o'clock + hand"). **Researched
against the LIVE code 2026-06-07** — and the headline is: **(c) is ~80% already built, but
mapped the OPPOSITE way to what you described.**

---

## Implementation-status audit (what actually exists today)

### (a) PDF keeps its layout — ❌ NOT implemented
- `src/lib/pdf.js` `extractPdfText` runs pdf.js `getTextContent`, then `clusterParagraphs`
  collapses everything to **reflowed plain-text paragraphs** (`pages[].paragraphs`,
  joined). All positional info (`transform`/`width`/columns/tables/images) is discarded.
- `src/pages/PDFReader.jsx` renders those paragraphs as a single reflowed column of
  clickable token `<span data-token-i>`s. So the reader is **readable but visually
  un-faithful** — a two-column past paper becomes one stream; tables/figures vanish.
- **To preserve layout** you need a different pipeline: render each page to a canvas via
  pdf.js `page.render(viewport)` AND overlay an absolutely-positioned, selectable text
  layer (positions from each text item's `transform`+`width`). That's a real rebuild of
  the reader's render path — its own session (see Design §3).

### (b) Selected words highlighted — ⚠️ PARTIAL / effectively NO
- PDFReader's `tokenColor` tints **vocabulary status** (green = in our 804-dict, cyan =
  compound whose head is known) — NOT selection state.
- A committed selection shows as **chips in a bucket below the text** (PDFReader L380–405),
  phrase chips purple / word chips green — but the **in-text tokens are never highlighted**
  to show they're part of the current selection.
- The app-wide `SelectionToCard` (mounted in Layout, works on every reading surface) uses
  only the **native browser selection** highlight and is explicitly "transient — no
  persistent highlight in this tier."
- ⇒ "see what you've selected, inline" is **not** done in either place.

### (c) Left-drag individual / right-click phrase grouping — ✅ BUILT, but INVERTED + PDF-only
- `src/lib/useSelectionMode.js` already implements a **4-gesture model** over tokenized
  text and is wired into PDFReader (`handleCommit`). BUT the mapping is the **reverse of
  your description**:

  | Your words | `useSelectionMode.js` today |
  |---|---|
  | left-drag = **individual** words | left-drag → `isPhrase` (**grouped as one**) |
  | right-click = **group as phrase** | right-drag → `isMulti` (**individual** words) |
  | (single) | left/right click (no drag) → single word |

- The phrase path already does the compositional thing: `translatePhrase(words.join(' '))`
  → one translation (so *jam tangan* → "watch"), and phrase cards are tagged `p:'phrase'`
  (vs `p:'n'`) in `addSelectionToDeck`. **The capability you want exists — it's just on the
  opposite gesture, has no inline highlight, and lives only in the PDF reader.**

### 🔴 Cross-cutting finding (go-wild): PDF select is MOUSE-ONLY
`useSelectionMode.js` binds only mouse events; PDFReader wires no touch/pointer handlers. On a
PHONE (the app's primary device) the whole drag/right-click model is inert in select mode. This
outranks the desktop mapping in real impact — touch must be first-class in Select v2 (plan Step 2.5).

### ✅ UPDATE 2026-06-07 — the (c) mapping is now FIXED (shipped this session)
Kheshav confirmed the flip mid-session, so the gesture mapping was corrected immediately:
`src/lib/gestureModel.js` `classifyGesture` (pure, +5 unit tests) is now the single source of
truth — **left-drag = individual words, right-drag = grouped phrase, single = one word** — and
the hook + `handleCommit` + the on-screen Tips text were updated to match. This resolves **Q1**
(adopt Kheshav's mapping = yes) and **Q2** (group trigger = right-**drag**, using the existing
plumbing; a later "select-then-right-click-to-toggle-group" can still be added as the Step 2
teaching-moment enhancement). **Remaining Select v2 scope = inline highlight (b), the group
teaching-moment, and TOUCH support.**

**Net:** (c)'s base gesture mapping is DONE; (b) + touch + the compositional teaching moment are
the Select v2 remainder; (a) PDF layout is the big separate one.

---

## Design

### §1 — Select v2 (delivers (b) + (c)) — RECOMMENDED #1, lowest effort / highest daily value
Reconcile the existing gesture engine to YOUR mental model and make selection visible.

- **Decision C1 (PRODUCT — yours to confirm): the canonical gesture mapping.** Your stated
  model = left-drag selects individual words; right-click groups them into one phrase.
  Current code is the inverse. **Recommendation: adopt YOUR mapping** (you're the user) and
  make it concrete as:
  - **left-drag** → select the swept words as **individual** tokens (each highlighted, each
    becomes its own card),
  - **select, then right-click the selection** → **group into one phrase**: re-translate the
    joined span as a unit (compositional meaning) and replace the N word-entries with one
    `p:'phrase'` entry. A small "ungroup" affordance reverses it.
  - single click → one word (unchanged).
  - *Sub-question for you:* is "group" a **right-click on an existing selection** (my
    recommendation — clearest), or **right-click-drag** (matches the current right-drag
    plumbing, fewer steps but collides with the OS menu)? Default = right-click-on-selection.
- **Decision C2: inline selection highlight (delivers (b)).** Selected tokens get a
  persistent background (`var(--color-accent-subtle)`); a grouped phrase gets a distinct
  tint (purple, matching the existing phrase-chip colour) + an underline "bracket" so the
  unit reads as one thing. Keep `tokenColor`'s vocab tint as a separate layer (text colour
  vs background — they don't collide).
- **Decision C3: scope.** Ship in **PDFReader first** (the engine is already there), then
  port the model to the app-wide `SelectionToCard` as a fast-follow (bigger — native
  selection vs token spans differ; the universal surface has no `data-token-i` tokens, so a
  port means tokenizing arbitrary prose — non-trivial, separate session).
- **Pure, TDD-able core:** extract the gesture→intent decision out of the DOM hook into a
  pure `classifyGesture({ button, startIndex, endIndex, hadDrag })` →
  `{ kind:'word'|'words'|'phrase'|'group' }`. Unit-test every combination (this is where the
  invert-bug would have been caught). The DOM hook becomes a thin adapter.
- **Reuse:** `useSelectionMode.js`, `translatePhrase`/`translateMany`/`translateBatch`,
  `addCards` with `p:'phrase'`, `tokenColor`, the selection-bucket UI.

### §2 — Compositional-meaning teaching moment (small enrichment of §1)
When a group is formed, show BOTH the literal word-by-word glosses AND the phrase meaning,
side by side ("jam = o'clock · tangan = hand → **jam tangan = watch**"). This is the actual
pedagogical payload of your idea (ayat majmuk / kata majmuk). Cheap once §1 grouping exists;
reuses `translateMany` (parts) + `translatePhrase` (whole). Could fold into §1 or be a tiny
follow-up.

### §3 — PDF layout preservation (delivers (a)) — RECOMMENDED #2, its own session (bigger)
- **Approach:** add a **"Layout view"** toggle alongside the current reflow view. Layout view
  = pdf.js `page.render()` to a `<canvas>` per page at a fit-to-width scale, with an
  **absolutely-positioned selectable text overlay** built from text-item `transform`+`width`
  (the standard pdf.js text-layer technique). Translation/select operate on the overlay
  tokens (same `data-token-i` model → §1 gestures work there too).
- **Why a toggle, not a replacement:** reflow is better for small screens / dyslexia-friendly
  reading; layout is better for faithful past-paper study. Keep both (UDL — multiple means
  of representation). Don't regress the working reflow reader.
- **Risks:** canvas memory on long PDFs (render visible pages only / lazy by page), overlay
  alignment across zoom, and `pdfjs` is already a ~330 KB chunk (no new dep — good). Real
  work, real value; deserves a dedicated session + its own plan.

### §4 — AI roleplay seed (increment E) — already specced, still queued
`docs/superpowers/specs/2026-06-07-ai-roleplay-seed-design.md` + plan. Unaffected by the
above; sequence it whenever.

---

## Recommended sequence (one feature per session)
1. **Select v2** (§1 + §2) — highest value/effort ratio; mostly reconciling + polishing code
   that already exists; directly delivers (b) and (c) the way you described them.
2. **PDF layout view** (§3) — bigger, high value for past-paper study.
3. **AI roleplay seed** (E) — ready when you want it.
(You can reorder — these are independent.)

## Open PRODUCT questions for Kheshav (answer at kickoff — don't let me guess)
- **Q1.** Adopt your gesture mapping (left-drag = individual, right-click = group)? (rec: yes)
- **Q2.** "Group" = right-click **on a selection** (rec) or right-click-**drag**?
- **Q3.** Select v2 in the **PDF reader only** first (rec), or also the app-wide select now?
- **Q4.** Build order: **Select v2 → PDF layout → E** (rec), or different?

## Adversarial / edge cases to design for (and to "go wild" on in tests — [[feedback_go_wild_smoke_test]])
- right-click-drag **backwards** (end before start — already handled via min/max, keep it),
  across **paragraph/page** boundaries, selecting whitespace-only or a single punctuation
  token, a 200-token sweep (perf), rapid re-selection, group→ungroup→regroup, grouping a
  single word (no-op), grouping then editing the deck name, switching translate↔select mode
  mid-selection, OS context-menu leaking on right-click, touch devices (no right-click → need
  a long-press or an explicit "group" button as the touch equivalent — **Q5 for touch**),
  theme-swap mid-selection, reload mid-selection (selection is ephemeral — fine).
- For PDF layout: a 50-page PDF, a rotated page, a scanned (image-only, no text layer) PDF →
  must degrade gracefully ("no selectable text on this page").

## Build plan (for #1 Select v2) → see companion plan
`docs/superpowers/plans/2026-06-07-select-v2.md`.
