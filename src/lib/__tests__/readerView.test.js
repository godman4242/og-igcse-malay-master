// readerView — the PDF reader's pure "which view is SAFE to render" guard.
//
// Mirrors readerKeymap.js / gestureModel.js: a single tested pure function so
// the rule can never silently invert. The Layout view canvas-renders pages from
// a live pdf.js doc; a DOC-LESS source (text sample / OCR image / audio
// transcript) has pdfDoc === null, so LayoutView would sit on its
// "Rendering pages…" loader forever (Bug A — a blank, stuck Layout). The reader
// component asks this function which view to actually render so Layout is
// STRUCTURALLY unreachable without a live doc — even if a future doc-less
// producer forgets to setView('reflow') (that is exactly how Bug A happened).
//
// GOAL loop-safe #4 (axis-1 robustness). Pinning it here means the guard cannot
// regress to "trust the `view` state" without turning this red.

import { describe, it, expect } from 'vitest'
import { effectiveReaderView } from '../readerView'

describe('effectiveReaderView — Layout is unreachable without a live doc', () => {
  it('renders Layout only when Layout is selected AND a live doc exists', () => {
    expect(effectiveReaderView('layout', true)).toBe('layout')
  })

  it('FORCES reflow when Layout is selected but there is no doc (Bug A guard)', () => {
    // The load-bearing case: a doc-less source whose remembered view is Layout
    // must NOT render the (forever-loading) Layout view.
    expect(effectiveReaderView('layout', false)).toBe('reflow')
  })

  it('stays reflow when reflow is selected, doc or not', () => {
    expect(effectiveReaderView('reflow', true)).toBe('reflow')
    expect(effectiveReaderView('reflow', false)).toBe('reflow')
  })

  it('treats any non-layout view value as reflow (no third view exists)', () => {
    expect(effectiveReaderView(undefined, true)).toBe('reflow')
    expect(effectiveReaderView(null, false)).toBe('reflow')
  })
})
