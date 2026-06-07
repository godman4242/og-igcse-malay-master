# Build plan — PDF Layout View (faithful render + token overlay + Select v2 + zoom) — 2026-06-07

Spec: `docs/superpowers/specs/2026-06-07-pdf-layout-view-design.md` (read it + the
decision log FIRST). Delivers website-plan (a). ONE feature. All TDD.

> Approved decisions (Kheshav, 2026-06-07): faithful canvas render with a **white page
> fill** (diagrams visible, theme-independent) · **full Select v2** in layout view ·
> **pinch-zoom + double-tap** (crisp re-render on settle) · default view = **remember-last**
> (first open = Reflow). Document-translation = its own NEXT design pass (captured in spec).

## Live-code map (re-grep before editing — anchors drift)
- `src/lib/pdf.js` — `extractPdfText(file)` returns `{ pages:[{pageNum,text,paragraphs}], meta }`;
  imports `getDocument, GlobalWorkerOptions` from `pdfjs-dist/build/pdf.mjs` + `pdf.worker.mjs?url`.
  **Layout view needs the live `PDFDocumentProxy` (per-page `getViewport`/`render`/`getTextContent`),
  not just text** → either return the `doc` from a new `loadPdf(file)` or add a layout-specific loader.
- `src/pages/PDFReader.jsx` — `mode` ('translate'|'select'), `groupMode`, `selection` (+indices from
  Select v2), `handleCommit`, `selIdx` highlight map, `useSelectionMode(handleCommit, groupIntent)`,
  the reflow render (`tokenized.pages` → token spans ~L440), toolbar (~L300), tips footer.
- `src/lib/useSelectionMode.js` — pointer hook; hit-tests by **coordinates** (`elementFromPoint`),
  so it works over an absolutely-positioned overlay unchanged. `data-token-i` is the only contract.
- `src/lib/gestureModel.js` / `src/lib/selectionGroup.js` — pure; reuse as-is.
- Store: re-check `STORE_VERSION` live (was 23) before bumping for the remembered-view pref.

## Pre-flight (every session)
1. Baseline: `git status` clean · `npm run test:run` · `npm run lint` (0 err) · prod READY.
2. Re-grep the anchors above.
3. Build fixtures (Step 0).

---

## Step 0 — fixtures (committed test PDFs)
Generate via the documented chromium recipe (`page.setContent(html)` → `page.pdf()`), verify they
parse through `extractPdfText`/pdf.js:
- `tests/e2e/fixtures/layout-2col.pdf` — 2-page, two-column-ish, with an `<svg>`/CSS black-ink
  **diagram** + known tokens (e.g. `rajah`, `jam`, `tangan`).
- `tests/e2e/fixtures/scanned.pdf` — a page that is an **image only** (no text layer) → degrade path.
(Existing `sample-malay.pdf` covers the single-page text case.)

## Step 1 — pure layout geometry (`src/lib/pdfLayout.js`, TDD)
No DOM, no pdf.js objects — operate on plain numbers/shapes so it's unit-testable.
- `itemRect(viewportTransform, itemTransform, width, height)` → `{ left, top, width, height }` in CSS px
  (apply the 2×3 matrix multiply; top adjusted by font ascent like pdf.js TextLayer).
- `splitItemIntoWordRects(rect, str)` → `[{ word, left, top, width, height }]` (proportional char-width
  split; collapse runs of spaces; drop empties).
- `fitToWidthScale(pageWidthPx, containerWidthPx)` → number.
- `clampScale(scale, { min, max })` and `doubleTapNextScale(current, fit)` (toggle fit ⟷ ~2×fit).
- `visiblePageRange(scrollTop, viewportH, pageOffsets)` → `[firstIdx, lastIdx]` (+overscan) for lazy render.
- Tests `__tests__/pdfLayout.test.js`: RED→GREEN for each (identity transform, scaled, rotated-ish,
  multi-word split, fit calc, clamp bounds, double-tap toggle, visible range incl. overscan + edges).

## Step 2 — page loader + lazy canvas render (`LayoutView` component, no overlay yet)
- `src/lib/pdf.js`: add `export async function loadPdf(file)` → `{ doc, numPages, meta }` (keep
  `extractPdfText` for reflow). Don't break callers.
- New `src/pages/pdfreader/LayoutView.jsx` (or co-located): given `doc` + `scale`, render the visible
  pages to `<canvas>` (white-fill THEN `page.render`), size by `viewport × min(dpr,2)`; placeholder
  boxes (correct height) for not-yet-rendered pages so scroll position is stable; `page.cleanup()` +
  release canvas for pages that scroll far away. IntersectionObserver/scroll → visible set from
  `visiblePageRange`. Eyeball: a multi-page PDF renders crisply, diagrams visible in DARK mode.

## Step 3 — word-token overlay + Select v2 wiring
- For each rendered page, `getTextContent()` → per item `itemRect` → `splitItemIntoWordRects` →
  transparent `<span data-token-i={globalIdx}>` absolutely positioned over the canvas. Maintain ONE
  global token index space across pages (so `selection`/`selIdx`/`tokensSliceWithIndex` semantics match
  reflow). Wrap the page stack with the SAME `useSelectionMode` handlers + `touch-action:pan-y`.
- Reuse `handleCommit` (translate/select/phrase), `selIdx` highlight (translucent bg on selected token
  spans), the compositional teaching moment, the selection bucket. Verify left-drag/right-drag/Group
  toggle/tap all behave as in reflow. Scanned page (no items) → render the "No selectable text" note.

## Step 4 — zoom (pinch + double-tap, crisp re-render)
- Pinch: track 2 pointers, apply a live CSS `transform: scale()` to the page wrapper during the gesture;
  on gesture end set `scale = clampScale(fit × pinchFactor)` and **re-render canvases** at the new scale
  (overlay rects re-derive from the new viewport). Double-tap a page → `doubleTapNextScale`. Keep plain
  one-finger pan/scroll working (don't hijack). Don't fight Select v2's single-pointer drag (a 2-pointer
  gesture = zoom, 1-pointer-on-token = select).
- Re-render is debounced to gesture-end so it never renders mid-pinch (perf).

## Step 5 — view toggle + remember-last + degrade polish
- Toolbar Reflow ⟷ Layout toggle (only when a PDF is loaded). Persist last view (store pref; bump
  STORE_VERSION + migration, defaults preserve existing users). First-ever open = Reflow.
- Tips footer notes the two views + pinch/double-tap. Loading/empty states per view.

## Step 6 — gates + GO WILD ([[feedback_go_wild_smoke_test]])
- `tests/e2e/pdf-layout.spec.js`: setInputFiles each fixture → toggle to Layout → assert canvas(es)
  present + page count; tap a token → translation; left-drag → 2 highlighted tokens; right-drag/Group →
  phrase chip + "How the words combine"; add → `p:'phrase'`. **GO WILD:** scroll to page 2 (lazy render
  fires), scanned fixture shows degrade note, double-tap re-renders (canvas width changes), synthetic
  pinch, Reflow⟷Layout swap mid-selection, theme swap (page stays white), rapid toggle, a 1-pointer drag
  still selects while a 2-pointer gesture zooms.
- `npm run build` (no new dep; PDFReader stays its own chunk; watch the lazy-render keeps memory bounded)
  · lint 0 · `test:run` all · full e2e green · eyeball light AND dark (Playwright screenshot).
- Commit atomically per step + refresh `RESUME_HERE.md` same commit → push (auto) → confirm upg- READY.

## Gotchas
- **Memory:** never hold all page canvases; cleanup offscreen. Test with a 30pp+ PDF mentally.
- **One global token index** across pages, or Select v2's index math (group/highlight) breaks.
- **White fill must precede render** each time (and after every re-render at a new scale).
- pdf.js render is async + cancellable — guard against overlapping renders on fast scroll/zoom
  (`renderTask.cancel()` the stale one).
- Don't regress reflow view / translate-all-unknowns / the bucket / Select v2.
- Keep `classifyGesture` + `useSelectionMode` the single gesture source of truth (overlay just adds
  positioned tokens; no second selection code path).

## Plain-language version (for Kheshav)
This makes the PDF show **as a real picture of the page** — columns, tables, and the black-ink diagrams
in Malay past papers all kept exactly, on a white page so they're always visible even in dark mode — with
your tap-to-translate and word/phrase selecting working right on top. You'll be able to **pinch to zoom**
and double-tap to zoom, and flip between the picture view and the simple text view (it remembers which you
prefer). Built in small pieces so a basic version shows up first, then zoom and polish. After this:
the "translate the whole document for free" idea gets its own design.
