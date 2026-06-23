// The PDF reader's pure "which view is SAFE to render" guard.
//
// The reader has two views: 'reflow' (simple text, always renderable) and
// 'layout' (faithful page canvas, rendered from a live pdf.js doc). A DOC-LESS
// source — a text sample, an OCR'd image, or an audio transcript — has no
// pdfDoc, so the Layout view would sit on its "Rendering pages…" loader forever
// (Bug A: a blank, stuck Layout).
//
// Three doc-less producers (loadSample / runImageOcr / runAudioTranscribe) each
// already setView('reflow') defensively, but that is fragile — a future doc-less
// producer can forget (that IS how Bug A first happened). This single render-time
// guard makes Layout STRUCTURALLY unreachable without a live doc: the reader asks
// effectiveReaderView what to actually render, so even a forgetful producer can
// never surface a blank Layout. Pinned by readerView.test.js so it can't invert.
//
// Pure (mirrors readerKeymap.js / gestureModel.js): no React, no side effects.
export function effectiveReaderView(view, hasDoc) {
  return view === 'layout' && hasDoc ? 'layout' : 'reflow'
}
