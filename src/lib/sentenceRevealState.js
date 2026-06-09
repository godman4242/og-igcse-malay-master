// The sentence-reveal layer's reducer IS the generic id-keyed reveal reducer in
// ./revealState.js. This module stays as an alias so existing imports (PDFReader.jsx)
// and tests (sentenceRevealState.test.js) keep working unchanged. See revealState.js.
export {
  createRevealState as createSentenceState,
  isRevealed as isSentenceRevealed,
  reveal as revealSentence,
  hide as hideSentence,
  setShowAll as setShowAllSentences,
  hideAll as hideAllSentences,
} from './revealState.js'
