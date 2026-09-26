---
paths:
  - "src/pages/PDFReader.jsx"
  - "src/pages/pdfreader/**"
  - "src/lib/useSelectionMode.js"
  - "src/lib/gestureModel.js"
  - "src/lib/readerKeymap.js"
  - "src/lib/sentenceModel.js"
  - "src/lib/paragraphModel.js"
  - "src/lib/selection*.js"
  - "tests/e2e/reader-keyboard.spec.js"
---

# PDF / reflow reader — selection & keyboard rules

Path-scoped rule: Claude Code loads this only when a reader file above is read. Moved out of the root `CLAUDE.md` on 2026-09-26 so it loads on demand instead of into every session. The reveal-gate invariant itself stays in root `CLAUDE.md`; its rationale is in `docs/reference/learning-science.md`.

- **PDF touch selection — hit-test, don't trust `e.target`**: pointer events implicitly capture to the `pointerdown` target, so a drag reports the wrong token. `src/lib/useSelectionMode.js` resolves the real token under the finger via `document.elementFromPoint(x, y)`. Preserve that pattern for any new PDF selection work.
- **Reader keyboard layer is a pure dispatcher + thin glue**: the reflow reader's key map lives in `src/lib/readerKeymap.js` (`resolveReaderKey`, mirrors `gestureModel.js` — unit-tested so it can't silently invert); `PDFReader.jsx` has ONE delegated `onKeyDown` whose handlers only CALL `handleCommit`/`revealGloss`/`addGloss`. Never edit `useSelectionMode.js`/`gestureModel.js` for keyboard work, and never auto-reveal on focus (reveal-gate: Enter is the deliberate press). Gotcha: `splitParagraph` content tokens have `kind: 'token'` (NOT `'word'`).
