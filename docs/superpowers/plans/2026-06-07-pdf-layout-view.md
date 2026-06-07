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
Self-contained recipe (a throwaway Node script in `scripts/`, run once, then delete or keep):
```js
// gen-fixtures.mjs — run: node scripts/gen-fixtures.mjs
import { chromium } from 'playwright'
const b = await chromium.launch(); const p = await b.newPage()
// layout-2col.pdf: two columns + a black-ink SVG diagram + known tokens
await p.setContent(`<div style="column-count:2;font:16px serif;padding:24px">
  <p>Lihat <b>rajah</b> di bawah. Saya suka <b>jam tangan</b> baru itu.</p>
  <svg width="120" height="80"><rect x="2" y="2" width="116" height="76" fill="none" stroke="#000" stroke-width="2"/><line x1="2" y1="2" x2="118" y2="78" stroke="#000"/></svg>
  <p style="break-before:column">Adik saya <b>membaca buku</b> di <b>rumah</b>.</p>
  <p>Halaman dua: <b>air</b> itu sejuk.</p></div>`)
await p.pdf({ path: 'tests/e2e/fixtures/layout-2col.pdf', format: 'A4' })
// scanned.pdf: an <img> only → no text layer → degrade path
await p.setContent(`<img src="data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560"><rect width="400" height="560" fill="#fff"/><text x="40" y="80" font-size="28">kertas imbasan</text></svg>').toString('base64')}" style="width:100%"/>`)
await p.pdf({ path: 'tests/e2e/fixtures/scanned.pdf', format: 'A4' })
await b.close()
```
Then **verify each parses** — in Node you MUST use the legacy build (the main build warns/breaks
in Node): `import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'` with
`GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')`; assert
`layout-2col` yields tokens (rajah/jam/tangan/membaca/buku/rumah/air) and `scanned` yields **zero**
`getTextContent` items. (Existing `sample-malay.pdf` covers the single-page text case.)

## Step 1 — pure layout geometry (`src/lib/pdfLayout.js`, TDD)
No DOM, no pdf.js objects — operate on plain numbers/shapes so it's unit-testable. The component
passes `page.getViewport({ scale, rotation }).transform` (a 6-elem array — rotation already folded in)
+ each item's `transform`/`width`/`height` into these pure fns.
- `itemRect(viewportTransform, itemTransform, width, height)` → `{ left, top, width, height }` in CSS px.
  Do the 2×3 matrix compose IN-FN (don't depend on pdf.js internals — though `Util.transform` IS
  exported in pdfjs 4.10.38 if you prefer): for `V=[a,b,c,d,e,f]`, `I=[a',b',c',d',e',f']`,
  `tx = [a*a'+c*b', b*a'+d*b', a*c'+c*d', b*c'+d*d', a*e'+c*f'+e, b*e'+d*f'+f]`; then
  `left = tx[4]`, `top = tx[5] - ascent` (ascent ≈ `Math.hypot(tx[2],tx[3])`), `width = scaledItemWidth`.
- `splitItemIntoWordRects(rect, str)` → `[{ word, left, top, width, height }]` (proportional char-width
  split; collapse runs of spaces; drop empties).
- `fitToWidthScale(pageWidthPx, containerWidthPx)` → number.
- `clampScale(scale, { min, max })` and `doubleTapNextScale(current, fit)` (toggle fit ⟷ ~2×fit).
- `visiblePageRange(scrollTop, viewportH, pageOffsets)` → `[firstIdx, lastIdx]` (+overscan) for lazy render.
- Tests `__tests__/pdfLayout.test.js`: RED→GREEN for each (identity transform, scaled, rotated-ish,
  multi-word split, fit calc, clamp bounds, double-tap toggle, visible range incl. overscan + edges).

## Step 2 — page loader + lazy canvas render (`LayoutView` component, no overlay yet)
- **Load the PDF ONCE, share the doc between BOTH views** (don't parse twice). Refactor `src/lib/pdf.js`:
  `export async function loadPdf(file)` → `{ doc, meta }`; split the text path into
  `export async function extractTextFromDoc(doc)` → `{ pages }` (reflow uses this). Keep `extractPdfText`
  as a thin wrapper (`loadPdf` → `extractTextFromDoc`) so no caller breaks. PDFReader holds the live
  `doc` in a ref/state and feeds reflow (text) AND layout (render) from it. **Lifecycle:** call
  `doc.destroy()` when the PDF is cleared/replaced (not just `page.cleanup()`), to free the worker doc.
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
  one-finger pan/scroll working (don't hijack).
- **Pointer arbitration (the real conflict — pin it):** Select v2's `useSelectionMode` starts a selection
  on the FIRST `pointerdown`. When a SECOND pointer goes down, that gesture is a PINCH, not a selection →
  **abort the in-flight selection** (invoke the hook's `onPointerCancel`) and enter pinch mode; while ≥2
  pointers are active, swallow pointer events from the selection hook; on pinch end, ignore the trailing
  `pointerup`s so they don't commit a stray selection. Net rule: **1 pointer on a token = select; 2
  pointers = zoom.** Track active pointers by `pointerId` in the layout wrapper, above the hook.
- Re-render is debounced to gesture-end so it never renders mid-pinch (perf); `renderTask.cancel()` any
  in-flight render when a newer scale supersedes it.

## Step 5 — view toggle + remember-last + degrade polish
- Toolbar Reflow ⟷ Layout toggle (only when a PDF is loaded). Persist last view (store pref, e.g.
  `pdfReader.layoutView`; **bump STORE_VERSION 23 → 24** — verified live value is 23 — with a migration
  that adds the field defaulting to `false`, preserving all existing user data). First-ever open = Reflow.
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
- **Versions (verified 2026-06-07):** pdfjs-dist **4.10.38** (`Util` IS exported from the main build;
  Node scripts must use `pdfjs-dist/legacy/build/`). STORE_VERSION live = **23** → bump to 24.
- **Load once:** share one `PDFDocumentProxy` between reflow + layout; `doc.destroy()` on clear/replace.
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
