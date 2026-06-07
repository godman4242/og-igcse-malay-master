# PDF Layout View — Design & Research (2026-06-07)

Delivers website-plan **(a): the PDF keeps its layout** in the translator/reader.
Today `src/lib/pdf.js` flattens every page to reflowed plain-text paragraphs and
`PDFReader.jsx` renders one clickable text column — so two-column past papers,
tables, and **images/diagrams are lost**. Many IGCSE Malay past papers are
image-heavy (line-drawing diagrams), so fidelity matters.

Researched against the LIVE code + pdf.js v4 API (context7 `/mozilla/pdf.js`)
2026-06-07. Companion plan: `docs/superpowers/plans/2026-06-07-pdf-layout-view.md`.

---

## Problem + who it's for
IGCSE Malay/English self-study teens on **mobile-first** web, studying real past
papers. They need to see the paper **as it actually is** (columns, tables,
diagrams) while keeping the app's tap-to-translate and the Select v2 word/phrase
gestures. The reflow view stays for dyslexia-friendly / small-screen reading (UDL:
multiple means of representation) — Layout view is added alongside, not instead.

## Options considered
- **A — Canvas image + invisible word-token overlay (CHOSEN).** Render each page to
  `<canvas>` via pdf.js `page.render({canvasContext, viewport, transform})`; overlay
  absolutely-positioned, **transparent** `data-token-i` word spans built from text-item
  transforms. Visuals (figures/tables/columns) are faithful because they're part of the
  rendered image; selection/translation reuse the Select v2 token model.
- **B — CSS-reconstructed text only (rejected).** Position real text without a canvas.
  *Loses all figures/table borders/graphics* → fails the faithful-past-paper goal.
- **C — embed pdf.js prebuilt viewer (rejected).** Complete but we cannot cleanly inject
  our tap-to-translate + Select v2 gestures into its item-level text layer / native
  selection — that integration is our whole value-add.

## Chosen design (Option A) + WHY
1. **Faithful render.** Per page: `getViewport({ scale })`, size the canvas by
   `viewport.width/height × devicePixelRatio` (HiDPI crispness), `page.render(...)`.
   Validated against Mozilla's `helloworld` example — same `pdfjs-dist/build/pdf.mjs`
   build we already import, **no new dependency**.
2. **White page surface (Kheshav's requirement).** Fill the canvas **white before
   rendering** the page, so black-ink diagrams are visible **regardless of the app's
   dark/light Settings theme**. The page sits on its own white surface; the app chrome
   stays themed around it. (Without this, ink on a transparent page disappears in dark
   mode.) This is image-level, costs no extra stored data.
3. **Invisible word-token overlay.** For each text item, map it to screen space with the
   viewport transform (`Util.transform(viewport.transform, item.transform)` — pdf.js's
   TextLayer does exactly this), split `item.str` into words, and emit a transparent,
   absolutely-positioned `<span data-token-i={globalIndex}>` per word (approx x by
   proportional char width across `item.width`). **Key de-risker:** because the overlay
   is transparent OVER the canvas image, hitboxes only need to *roughly* cover each word
   — the pixel-perfect-alignment pain of real pdf.js text layers does **not** apply.
4. **Full Select v2 reuse.** The overlay carries the same `data-token-i` contract, so
   `useSelectionMode` + `gestureModel.classifyGesture` + `handleCommit` + the `selIdx`
   inline-highlight + the compositional teaching moment all work unchanged. Inline
   highlight = a translucent background on the (otherwise transparent) selected token
   spans, which reads as a highlight box over the page image — desirable.
5. **Zoom = pinch + double-tap (Kheshav's product call: best quality).** Live pinch via a
   CSS transform on the page wrapper (smooth), then **re-render the canvas crisp at the
   settled scale on gesture end** (never blurry). Double-tap toggles ~2× as a shortcut.
   Fit-to-width is the base scale. Overlay re-derives positions from the new viewport.
6. **Lazy per-page render + cleanup (memory).** A 30–50pp past paper would exhaust canvas
   memory if all pages rendered at once. Render only pages near the viewport
   (IntersectionObserver); `page.cleanup()` + drop the canvas bitmap for offscreen pages.
7. **Graceful degrade.** Scanned/image-only pages return no `getTextContent` items → empty
   overlay → show the page image + "No selectable text on this page" (translate/select
   disabled there). Rotated pages: honour `viewport.rotation`.
8. **View toggle + remember-last.** A Reflow ⟷ Layout toggle in the toolbar; persist the
   last-used view so reopening a PDF lands in your preference (first-ever = Reflow,
   mobile-first default).

## Safety / quality bars
- **Don't regress the reflow reader**, translate mode, the selection bucket,
  `addSelectionToDeck`, or Select v2 (highlight/group/touch).
- `var(--color-*)` only for app chrome; the page surface white-fill is the one deliberate
  exception (it's the document, not the UI). React-19 purity; bilingual-safe.
- No new dependency (pdfjs already bundled, its own ~330 KB chunk). Lazy-render so memory
  stays bounded on long PDFs. Keep PDFReader its own lazy route chunk.
- Touch-first: pinch + double-tap + Select v2 touch must all work on 390×844.

## Decision log
| # | Decision | Evidence / source (grade) | Confidence |
|---|---|---|---|
| D1 | Canvas + word-token overlay (Option A) | pdf.js `helloworld`/docs render examples (high) | High |
| D2 | Approximate overlay alignment (transparent over canvas) | overlay is invisible; canvas carries visuals (reasoned, high) | High |
| D3 | White page fill before render; theme-independent | Kheshav requirement + dark-mode-transparent-ink failure mode | High |
| D4 | Zoom = pinch + double-tap, CSS-live then crisp re-render | Kheshav product call (quality); standard pinch pattern | Med (perf tuning) |
| D5 | Default view = remember-last (first = Reflow) | Kheshav + mobile-first | High |
| D6 | Full Select v2 in Layout view | shared `data-token-i` contract → near-free reuse | High |
| D7 | Keep reflow view as a toggle (don't replace) | UDL multiple-means-of-representation; dyslexia/small-screen | High |
| D8 | Lazy per-page render + `page.cleanup()` | pdf.js `page.cleanup()` example; canvas memory on long PDFs | Med-High |
| D9 | Scanned/no-text pages degrade gracefully | `getTextContent` empty on image-only PDFs (high) | High |

## Open questions for Kheshav (defaults in brackets)
- **Q1 — Document-translation feature sequencing.** [Default: spec it as the NEXT design
  pass, after Layout view.] See "Next feature" below. Pull forward only if you say so.
- **Q2 — Images in the REFLOW view too?** [Default: defer.] Layout view already shows all
  images; also extracting+inlining images into reflow is a separate, harder task (pdf.js
  image ops). Park unless you want it.
- **Q3 — Max render scale cap** [Default: `min(devicePixelRatio, 2)`] to bound memory on
  retina phones. Veto if you want unlimited crispness.

## Test plan
- **Pure units (TDD first):** transform math (item transform → screen rect), word-split +
  per-word rect derivation, fit-to-width scale calc, double-tap/pinch scale clamping,
  visible-page set from scroll. No DOM.
- **e2e + GO WILD** ([[feedback_go_wild_smoke_test]]): a multi-page fixture + an
  image/diagram fixture + a scanned (image-only) fixture. Switch Reflow⟷Layout; tap a
  word → translate; left-drag → individual highlight; right-drag/Group → phrase + teaching
  moment; pinch + double-tap re-render crisp; lazy render of page N on scroll; scanned page
  shows the degrade message; theme swap (page stays white, chrome themes); rotated page.
  Light + dark.

---

## Next feature (captured, NOT this session) — "Translate the whole document, free"
Kheshav's DeepL-style idea: translate an entire PDF/document at once, free, with accuracy
from our built-in dictionary + the user's own API key (BYOK).
- **Why it's cheap AFTER Layout view:** the layout overlay already tokenizes every visible
  word with positions, so a "Translate everything" pass is the same `translateBatch` over
  those tokens, rendered as an in-place bilingual overlay — reuses `translate.js`,
  `dictionaryGrounding`/`verifyPair`, and the Settings OpenRouter BYOK key already shipped.
- **Honest caveat (learning-quality invariant):** whole-document auto-translation can
  *undercut* retrieval/“desirable difficulty” — if everything is pre-translated the learner
  stops working out meaning. Design it as an **on-demand aid with a guardrail** (e.g.
  per-paragraph reveal, or a "study mode" that hides translations until tapped), not a
  default crutch. UDL says offer it; SLA says don't force it.
- **Open design questions for its own session:** in-place bilingual vs side pane; word vs
  sentence granularity; free-provider rate limits at whole-document volume (batch + cache +
  resumable, like the deck generator); how grounding flags low-confidence machine output.
- **Recommendation:** dedicated Design & Research pass right after Layout view ships.
