import { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import {
  FileSearch, Upload, Languages, MousePointerClick, Plus, X, Volume2,
  Loader2, ExternalLink, Trash2, Link, Unlink, FileText, LayoutTemplate,
  Eye, EyeOff, Pilcrow, Check, Sparkles, Camera, Mic, Square,
} from 'lucide-react'
import useStore from '../store/useStore'
import { loadPdf, extractTextFromDoc, renderPdfPageToCanvas } from '../lib/pdf'
// Pure OCR helpers (image-only-PDF detection + the injected-engine runner). These
// are zero-dependency pure code; the HEAVY Tesseract WASM engine lives behind a
// dynamic import of ../lib/ocrEngine so it never touches the eager bundle.
import { isImageOnlyPdf, runOcr, rasterisePdfPages } from '../lib/ocr'
import LayoutView from './pdfreader/LayoutView'
import {
  translateWord, translateBatch, getFromCache,
  getDeepLCompareUrl, getGoogleCompareUrl, getProviderHealth,
  hasQualityTranslateKey,
} from '../lib/translate'
import { speak } from '../lib/speech'
import DICTIONARY from '../data/dictionary'
import { glossPlanFor } from '../lib/glossPlan'
import { loadEnDictionary } from '../lib/enDictionary'
import useSelectionMode from '../lib/useSelectionMode'
import usePinchZoom from '../lib/usePinchZoom'
// Keyboard reader layer (P1-5, reflow only — spec D7): the pure key → action
// dispatcher. The handlers below only CALL the existing mode-aware functions
// (handleCommit / revealGloss / addGloss) — the pointer path is untouched.
import { resolveReaderKey } from '../lib/readerKeymap'
import FeedbackLive from '../components/FeedbackLive'
import { groupSelection, ungroupSelection, explainCompound } from '../lib/selectionGroup'
import DictionaryIcon from '../components/DictionaryIcon'
import DocGloss from '../components/DocGloss'
import SentenceReveal from '../components/SentenceReveal'
// Lazy so the heavy Full-translation UI lands in its own chunk (PDFReader stays lean);
// only fetched when the reader opens the Full-translation page.
const FullTranslationView = lazy(() => import('../components/FullTranslationView'))
import {
  buildGlossIndex, collectDocTokens, normalizeWord, translateDocument,
} from '../lib/translateDocument'
import { createGlossState, isRevealed, revealToken, setShowAll } from '../lib/docGlossState'
import { groupSentences, detectDocLanguage, sentenceUnknowns } from '../lib/sentenceModel'
import {
  createSentenceState, isSentenceRevealed, revealSentence, hideSentence,
  setShowAllSentences, hideAllSentences,
} from '../lib/sentenceRevealState'
import { buildGroundingIndex } from '../lib/dictionaryGrounding'
// Claim 6: ease the reveal-gate when a page is demonstrably too hard. Offer
// (never force) the English layer above a conservative unknown-word density.
import { unknownDensity, isDense } from '../lib/unknownDensity'
import { buildKnownEnglish, makeIsKnownEnglish } from '../lib/englishKnownWords'
import { loadEnglishFrequency } from '../lib/englishFrequency'
// Option F ladder: simpler-Malay sentence rewrite behind the provider-agnostic
// instruct seam (BYOK only — never the shared env key). Spec 2026-06-10.
// Phase 2 vision rung: hasVisionProvider/getConfiguredVisionProviders gate the
// consent-gated "Sharper read" (BYOK vision OCR — uploads, so disclosed 3 ways).
import { hasInstructProvider, callInstruct, hasVisionProvider, getConfiguredVisionProviders } from '../lib/instruct'
import { buildSimplifyPrompt, parseSimplifyResponse } from '../lib/simplifyModel'

// DICTIONARY is static { malayWord: englishString }; build the grounding pairs once.
const DICT_PAIRS = Object.entries(DICTIONARY).map(([m, e]) => ({ m, e }))

// Module-level empties so Zustand selectors / memos never allocate a fresh
// collection per render (busts shallow-equality + re-renders). See CLAUDE.md.
const EMPTY_SET = new Set()
const EMPTY_ARR = []

// Split a paragraph into clickable token + non-token parts.
function splitParagraph(text, startIndex) {
  const out = []
  const re = /([\p{L}\p{M}'-]+)|(\s+)|([^\s\p{L}\p{M}]+)/gu
  let m
  let i = startIndex
  while ((m = re.exec(text)) !== null) {
    if (m[1]) {
      out.push({ kind: 'token', text: m[1], i })
      i++
    } else if (m[2]) {
      out.push({ kind: 'space', text: m[2] })
    } else {
      out.push({ kind: 'punct', text: m[3] })
    }
  }
  return { parts: out, nextIndex: i }
}

function tokenColor(word) {
  const w = word.toLowerCase()
  if (DICTIONARY[w]) return 'var(--color-green)'
  // hyphenated reduplications like anak-anak
  if (w.includes('-') && DICTIONARY[w.split('-')[0]]) return 'var(--color-cyan)'
  return null // unknown — default text color
}

// Friendly copy for a failed "Sharper read" — always reassures that the free
// on-device read is still on screen (a vision failure must never blank it).
function visionFailureMessage(err) {
  const cause = err?.cause
  if (cause === 'quota') return 'Your AI provider hit its free-tier limit — try again in a few minutes. Your free read is untouched.'
  if (cause === 'no_vision_provider') return 'Add a free AI key in Settings to use Sharper read.'
  if (cause === 'network') return 'Couldn’t reach your AI provider — check your connection. Your free read is untouched.'
  return 'The sharper read didn’t come back readable — keeping your free read.'
}

export default function PDFReader() {
  const [pdfData, setPdfData] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null) // live PDFDocumentProxy (shared by both views)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('translate') // 'translate' | 'select'
  const [groupMode, setGroupMode] = useState(false) // touch group toggle: false=individual words, true=phrase
  const [translation, setTranslation] = useState(null) // { items: [{src, text, source}], heading }
  const [compound, setCompound] = useState(null) // { parts:[{w,gloss}], phrase:{w,gloss} } — teaching moment
  const [selection, setSelection] = useState([]) // [{ word, en?, type, index | startIndex/endIndex }]
  const [layoutTokens, setLayoutTokens] = useState([]) // flat {word,i} from LayoutView's overlay (global index)
  const [deckName, setDeckName] = useState('PDF Import')
  const [batchProgress, setBatchProgress] = useState(null) // { current, total }
  // In-place document gloss layer (reveal-gated; spec D1). docGloss accumulates
  // normalizedWord → {text, source} across "Translate page" passes and survives
  // view switches; glossState is the reveal state; translating drives the bar.
  const [docGloss, setDocGloss] = useState({})
  const [glossState, setGlossState] = useState(createGlossState)
  // Claim 6: per-document dismissal of the dense-page English-help nudge (kept
  // light — component state, reset on a new document in resetGloss).
  const [denseNudgeDismissed, setDenseNudgeDismissed] = useState(false)
  const [translating, setTranslating] = useState(null) // { done, total } | null
  const [addedGloss, setAddedGloss] = useState(() => new Set()) // malay words already added to a deck
  // "Higher quality" (BYOK OpenRouter) translation — only ever offered when the
  // user supplied their own key; free gtx stays the default for everyone else.
  const [quality, setQuality] = useState(false)
  // Full-translation page (Option G) — a full-screen takeover rendered from this same
  // component (reuses the in-memory parsed doc; no re-parse). Off by default.
  const [showFullTranslation, setShowFullTranslation] = useState(false)
  // Keyboard reader layer (P1-5): roving-focus token, the in-progress
  // Shift+Arrow range, and the polite live-region announcement text.
  const [activeTokenIndex, setActiveTokenIndex] = useState(null)
  const [kbRange, setKbRange] = useState(null) // { anchor, focus } | null
  const [kbAnnounce, setKbAnnounce] = useState('')
  const translateAbortRef = useRef(null)
  // Sentence-level reveal (reflow only) — a SECONDARY, off-by-default comprehension
  // path parallel to the word glosses. Reveal-gated; word-level stays primary.
  const [sentenceMode, setSentenceMode] = useState(false)
  const [sentenceGloss, setSentenceGloss] = useState({}) // sentenceId -> { text, source }
  const [sentenceReveal, setSentenceReveal] = useState(createSentenceState)
  const [translatingSentences, setTranslatingSentences] = useState(null) // { done, total } | null
  const [pendingSentences, setPendingSentences] = useState(() => new Set()) // ids being fetched
  const [addedSentenceUnknowns, setAddedSentenceUnknowns] = useState(() => new Set())
  const sentenceAbortRef = useRef(null)
  // Option F ladder state (parallel to the English path; in-memory only, v1):
  // sentenceId -> { text } (clean simpler Malay) | { failed: true } (degrade to English)
  const [sentenceSimplify, setSentenceSimplify] = useState({})
  const [pendingSimplify, setPendingSimplify] = useState(() => new Set()) // ids being simplified
  const [englishShownSentences, setEnglishShownSentences] = useState(() => new Set()) // escalated to rung 2
  const simplifyAbortRef = useRef(null)
  // --- Past-paper OCR (image / scanned-PDF source) — Phase 1 -------------------
  const [ocrProgress, setOcrProgress] = useState(null)       // null | 0..1 while OCR runs
  const [ocrConfidence, setOcrConfidence] = useState(null)   // null | mean word-confidence 0..100
  const [lowConfTokens, setLowConfTokens] = useState(() => new Set()) // normalized low-confidence words
  const [pdfOcrOffer, setPdfOcrOffer] = useState(null)       // null | { doc, file } — image-only PDF offer
  // --- Past-paper OCR Phase 2 (BYOK vision "Sharper read") --------------------
  const [ocrRunEngine, setOcrRunEngine] = useState('tesseract') // engine of the IN-FLIGHT run — drives the progress copy
  const [ocrSource, setOcrSource] = useState(null)            // provenance of the CURRENT text: null | 'tesseract' | 'vision'
  const [visionProvider, setVisionProvider] = useState(null)  // provider label for the provenance banner
  const [showVisionConsent, setShowVisionConsent] = useState(false) // one-time consent dialog (Fork 4A)
  const [visionDontAsk, setVisionDontAsk] = useState(false)   // the dialog's "Don't ask again" checkbox
  const [visionError, setVisionError] = useState(null)        // friendly Sharper-read failure (free read kept)
  const lastOcrSourceRef = useRef(null) // { images, fromPdf, name } — Sharper read re-runs without a re-pick (D11)
  // --- Audio transcription ("study from a recording") — Phase 1 ----------------
  // Free, on-device Whisper → the SAME {pages} reader. The audio NEVER uploads.
  const [asrProgress, setAsrProgress] = useState(null) // null | { phase:'download'|'decode'|'transcribe', ratio }
  const [audioUrl, setAudioUrl] = useState(null)       // object URL for the <audio> replay
  const [recording, setRecording] = useState(false)    // mic capture in progress
  const asrAbortRef = useRef(null)
  const asrEngineRef = useRef(null)
  const audioUrlRef = useRef(null)   // stable handle so cleanup can revoke without stale closures
  const mediaRecRef = useRef(null)
  const recChunksRef = useRef([])
  const cameraInputRef = useRef(null)
  const ocrAbortRef = useRef(null)
  const ocrRecognizerRef = useRef(null)
  const fileInputRef = useRef(null)
  const docRef = useRef(null) // lifecycle source of truth for the live doc (destroy on replace/clear)

  const addCards = useStore(s => s.addCards)
  const cards = useStore(s => s.cards)
  const addPdfRecent = useStore(s => s.addPdfRecent)
  const logSkillActivity = useStore(s => s.logSkillActivity)
  const showCompare = useStore(s => s.translation?.showComparisonLink ?? true)
  const preferredProvider = useStore(s => s.translation?.preferredProvider ?? 'auto')
  const layoutPref = useStore(s => s.pdfReader?.layoutView ?? false)
  const setPdfLayoutView = useStore(s => s.setPdfLayoutView)
  const sentenceRenderPref = useStore(s => s.pdfReader?.sentenceRender ?? 'inline')
  const autoHelpDensePages = useStore(s => s.pdfReader?.autoHelpDensePages ?? false)
  // The active study language signals the SOURCE language of the loaded text,
  // fixing the card-creation gloss direction + which deck new cards join (F5,
  // Increment 2). useMemo → referentially stable so it's a safe useCallback dep.
  // NB (N1): this threads DIRECTION + a dict choice at the card-creation/translate
  // call sites only — the reveal-gated {pages} grounding engine (buildGlossIndex,
  // groundingIndex, collectDocTokens, unknownDensity, sentenceUnknownsById) stays
  // Malay-based. For an English doc those treat every word as unknown, routing the
  // learner through Select-mode/tap-translate (the working English path); full
  // English grounding/highlighting is the explicitly-deferred follow-up.
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const plan = useMemo(() => glossPlanFor(studyLang), [studyLang])
  const isEn = plan.lang === 'en'
  const ocrLang = useStore(s => s.pdfReader?.ocrLang ?? 'ms')
  const setOcrLang = useStore(s => s.setOcrLang)
  const asrLang = useStore(s => s.pdfReader?.asrLang ?? 'ms')
  const setAsrLang = useStore(s => s.setAsrLang)
  const visionConsent = useStore(s => s.pdfReader?.visionConsent ?? false)
  const setVisionConsent = useStore(s => s.setVisionConsent)
  const health = getProviderHealth()
  // Ladder on ⇔ the user has their OWN instruct provider (BYOK). Plain module
  // read, stable for the lifetime of this mount; NOT a Zustand selector. With no
  // provider every sentence-reveal path below is the shipped English behaviour.
  // The F7 ladder (simpler-MALAY rung) is Malay-source-specific — OFF for an
  // English doc (isEn), which reveals the direct Malay translation (no rung).
  const ladder = hasInstructProvider() && !isEn
  // Vision rung on ⇔ a VISION-capable BYOK provider (Gemini/OpenRouter; Ollama
  // never counts). Same plain-module-read pattern as `ladder`. Keyless users
  // never see "Sharper read" (no-paywall: no nag, no block).
  const visionReady = hasVisionProvider()
  const visionLabel = getConfiguredVisionProviders()[0]?.label || 'your AI provider'

  // 'reflow' | 'layout' — faithful page render. Remember-last: init from the
  // persisted pref (first-ever open = Reflow), and write it back on switch.
  const [view, setView] = useState(() => (layoutPref ? 'layout' : 'reflow'))
  const switchView = useCallback((v) => {
    // Layout view needs a live pdfDoc to render (image / OCR sources have none).
    if (v === 'layout' && !pdfDoc) return
    if (v !== view) {
      // P2-C8: Reflow and Layout tokenize into DIFFERENT global index spaces,
      // and selection/reveal/keyboard state is keyed by index — carrying it
      // across would highlight the WRONG words. Clear-on-switch (re-gate):
      // the word-keyed docGloss cache survives, so re-revealing is one tap.
      setSelection([])
      setGlossState(s => ({ ...createGlossState(), showAll: s.showAll }))
      setActiveTokenIndex(null)
      setKbRange(null)
    }
    setView(v)
    setPdfLayoutView(v === 'layout')
  }, [setPdfLayoutView, pdfDoc, view])

  // Free the live worker doc (more than page.cleanup()) before replacing/clearing.
  const destroyDoc = useCallback(() => {
    if (docRef.current) {
      try { docRef.current.destroy() } catch { /* already gone */ }
      docRef.current = null
    }
  }, [])

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    // A photo / image → on-device OCR (forces reflow; the image never uploads).
    if (file.type?.startsWith('image/')) {
      resetGloss() // a new document starts with a clean gloss layer
      destroyDoc() // release any previously loaded PDF first
      runImageOcr([file], { name: file.name || 'photo' })
      return
    }
    // A recording / audio file → on-device Whisper transcription (forces reflow;
    // the audio never uploads). Mirrors the image branch's clean-slate handling.
    if (file.type?.startsWith('audio/')) {
      runAudioTranscribe(file)
      return
    }
    setLoading(true)
    // P2-C7: parse the NEW file fully before touching the open one — a corrupt
    // "Replace" used to destroy the current doc first and fail into nothing.
    let newDoc = null
    try {
      // Load the PDF ONCE; feed BOTH the reflow text and the layout render from it.
      const { doc } = await loadPdf(file)
      newDoc = doc
      const { pages } = await extractTextFromDoc(doc)
      // The new file is readable — NOW swap: clean slate, release the old doc.
      resetGloss()
      destroyDoc()
      docRef.current = doc
      setPdfDoc(doc)
      // Image-only / scanned PDF (no real text layer) → offer OCR instead of a
      // blank reader (non-punitive; never auto-runs the slow compute).
      if (isImageOnlyPdf(pages)) { setLoading(false); offerPdfOcr(doc, file); return }
      setPdfData({ pages })
      addPdfRecent({
        name: file.name,
        sizeKB: Math.round(file.size / 1024),
        pages: pages.length,
        kind: 'pdf',
      })
      logSkillActivity('reading') // one loaded document = one Reading unit (paper-balance meter)
    } catch (e) {
      // The old document (if any) is untouched; free the half-loaded new one.
      if (newDoc && newDoc !== docRef.current) { try { newDoc.destroy() } catch { /* already gone */ } }
      setError(pdfData
        ? `Couldn’t open that file — your current document is unchanged. (${e?.message || 'unreadable PDF'})`
        : (e?.message || 'Failed to read PDF'))
    } finally {
      setLoading(false)
    }
  }

  const resetGloss = useCallback(() => {
    setDocGloss({})
    setGlossState(createGlossState())
    setDenseNudgeDismissed(false)
    setAddedGloss(new Set())
    setTranslating(null)
    translateAbortRef.current?.abort()
    translateAbortRef.current = null
    // Sentence-reveal layer resets alongside the word layer (new document = clean slate).
    setSentenceMode(false)
    setShowFullTranslation(false)
    setSentenceGloss({})
    setSentenceReveal(createSentenceState())
    setTranslatingSentences(null)
    setPendingSentences(new Set())
    setAddedSentenceUnknowns(new Set())
    sentenceAbortRef.current?.abort()
    sentenceAbortRef.current = null
    setSentenceSimplify({})
    setPendingSimplify(new Set())
    setEnglishShownSentences(new Set())
    simplifyAbortRef.current?.abort()
    simplifyAbortRef.current = null
    // OCR layer resets alongside (a new document = a clean OCR slate). Abort any
    // in-flight recognition; the cached worker is kept for reuse (terminated only
    // on clearPdf / unmount).
    setOcrProgress(null)
    setOcrConfidence(null)
    setLowConfTokens(new Set())
    setPdfOcrOffer(null)
    ocrAbortRef.current?.abort()
    ocrAbortRef.current = null
    // Vision rung resets with the rest (provenance, consent dialog, errors).
    setOcrSource(null)
    setVisionProvider(null)
    setVisionError(null)
    setShowVisionConsent(false)
    lastOcrSourceRef.current = null
    // Audio layer resets alongside (new document = clean slate). Abort any in-flight
    // transcription + revoke the replay URL; the lazy pipeline is cached (terminated
    // on clearPdf / unmount, like the OCR worker).
    setAsrProgress(null)
    asrAbortRef.current?.abort()
    asrAbortRef.current = null
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null }
    setAudioUrl(null)
  }, [])

  // First-visit "Try a sample" — load a built-in reveal-gated passage so a
  // blank-page student can explore the reader without finding their own file.
  // A text sample has no PDF source → reflow-only (no Layout view), exactly like
  // an OCR/audio import. Follows the empty-state material toggle (ocrLang). It's
  // a tutorial load, so it deliberately skips recents + skill-activity logging
  // (those are for real study material, not a sample). The sample data is
  // dynamic-imported so it never lands in the per-visit PDFReader chunk — it's
  // a first-visit-only affordance, fetched only when actually tapped.
  const loadSample = useCallback(async (lang) => {
    const { getReadingSample } = await import('../data/readingSamples')
    const sample = getReadingSample(lang)
    resetGloss()
    destroyDoc()
    setPdfDoc(null)
    setLayoutTokens([])
    setError(null)
    setPdfData({ pages: sample.pages })
  }, [resetGloss, destroyDoc])

  const clearPdf = useCallback(() => {
    destroyDoc()
    setPdfDoc(null)
    setPdfData(null)
    setLayoutTokens([])
    resetGloss() // aborts in-flight OCR/ASR + revokes the audio URL + resets state
    // Free the Tesseract worker's memory when the user leaves the document.
    ocrRecognizerRef.current?.terminate?.()
    ocrRecognizerRef.current = null
    // Free the Whisper pipeline's memory too.
    asrEngineRef.current?.terminate?.()
    asrEngineRef.current = null
  }, [destroyDoc, resetGloss])

  // Release the worker doc + cancel any in-flight translation if the page unmounts.
  useEffect(() => () => {
    destroyDoc()
    translateAbortRef.current?.abort()
    sentenceAbortRef.current?.abort()
    simplifyAbortRef.current?.abort()
    ocrAbortRef.current?.abort()
    ocrRecognizerRef.current?.terminate?.()
    asrAbortRef.current?.abort()
    asrEngineRef.current?.terminate?.()
    try { mediaRecRef.current?.stop() } catch { /* not recording */ }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [destroyDoc])

  // --- Past-paper OCR runner --------------------------------------------------
  // Drives a recognizer over one or more images (a photo, or the rasterised
  // pages of a scanned PDF). Two engines behind the SAME runOcr orchestration:
  //  - 'tesseract' (default): on-device WASM — the image NEVER leaves the device.
  //  - 'vision' (Sharper read): the user's OWN BYOK provider — UPLOADS the image,
  //    so it only ever runs consent-gated from requestSharperRead.
  // Forces the reflow view (image sources have no pdfDoc to canvas-render).
  const runImageOcr = useCallback(async (images, { fromPdf = false, name = 'photo', engine = 'tesseract' } = {}) => {
    const isVision = engine === 'vision'
    // Retain the source so "Sharper read" re-runs on the same input (D11).
    lastOcrSourceRef.current = { images, fromPdf, name }
    setError(null)
    setVisionError(null)
    setOcrRunEngine(engine)
    if (!isVision) {
      // A vision run REPLACES text in an already-reflowed reader — these only
      // apply when a fresh image/scan first enters the reader.
      setView('reflow')
      setPdfDoc(null)
      setOcrConfidence(null)
      setLowConfTokens(new Set())
    }
    setOcrProgress(0)
    const ctrl = new AbortController()
    ocrAbortRef.current = ctrl
    try {
      let recognize
      if (isVision) {
        const { createVisionRecognizer } = await import('../lib/ocrVisionEngine')
        recognize = createVisionRecognizer({ lang: ocrLang, signal: ctrl.signal }).recognize
      } else {
        const { createOcrRecognizer } = await import('../lib/ocrEngine')
        const langs = ocrLang === 'en' ? ['eng'] : ['msa']
        const rec = await createOcrRecognizer({ langs, onProgress: (m) => setOcrProgress(m.progress ?? 0) })
        ocrRecognizerRef.current = rec
        recognize = rec.recognize
      }
      // runOcr isolates per-image failures into empty pages (by design) — track
      // the underlying error so a fully-failed vision read can explain itself.
      let lastRecError = null
      const trackedRecognize = async (img) => {
        try { return await recognize(img) } catch (e) { lastRecError = e; throw e }
      }
      const { pages, meanConfidence, lowConfidenceWords } = await runOcr(images, {
        recognize: trackedRecognize,
        signal: ctrl.signal,
        onProgress: ({ done, total }) => setOcrProgress(total ? done / total : 1),
      })
      if (ctrl.signal.aborted) return // cancelled → keep whatever was on screen
      if (isVision) {
        if (!pages.some(p => p.text)) {
          // Sharper read failed — the free read stays on screen, never blanked.
          setVisionError(visionFailureMessage(lastRecError))
          return
        }
        // The text is being REPLACED: old reveals/glosses/sentences are stale.
        // (resetGloss clears the source ref + provenance — restore them after.)
        resetGloss()
        lastOcrSourceRef.current = { images, fromPdf, name }
        setPdfData({ pages })
        setOcrSource('vision')
        setVisionProvider(getConfiguredVisionProviders()[0]?.label || 'your AI provider')
        setOcrConfidence(null)      // no per-word confidence → no blurry note…
        setLowConfTokens(new Set()) // …and no dotted low-confidence cue (Fork 5)
        return
      }
      setPdfData({ pages })
      setOcrSource('tesseract')
      setVisionProvider(null)
      setOcrConfidence(meanConfidence)
      setLowConfTokens(lowConfidenceWords)
      addPdfRecent({ name, sizeKB: 0, pages: pages.length, kind: fromPdf ? 'pdf' : 'image' })
      logSkillActivity('reading') // fresh OCR'd document = one Reading unit (vision re-reads return above)
    } catch (e) {
      if (e?.name !== 'AbortError') {
        if (isVision) setVisionError(visionFailureMessage(e))
        else setError(e?.message || 'Could not read the photo. Try a clearer picture.')
      }
    } finally {
      setOcrProgress(null)
      ocrAbortRef.current = null
    }
  }, [ocrLang, addPdfRecent, logSkillActivity, resetGloss])

  // --- Audio transcription runner ("study from a recording") ------------------
  // Decodes + transcribes one audio File/Blob on-device (free Whisper) and feeds
  // the resulting {pages} into the SAME reveal-gated reader. Forces reflow (audio
  // has no pdfDoc to canvas-render). The audio NEVER leaves the device.
  const runAudioTranscribe = useCallback(async (file) => {
    const { runTranscribe, emptyTranscriptNotice, MAX_AUDIO_MB } = await import('../lib/transcribe')
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setError(`That recording is too large (max ${MAX_AUDIO_MB} MB for now). Try a shorter clip.`)
      return
    }
    const { createTranscriber } = await import('../lib/transcribeEngine')
    resetGloss()   // clean slate + aborts any prior run + revokes the old audio URL
    destroyDoc()
    setView('reflow')
    setPdfDoc(null)
    setOcrSource(null) // audio isn't OCR — no blurry/provenance/confidence cues
    setOcrConfidence(null)
    setLowConfTokens(new Set())
    setError(null)
    setAsrProgress({ phase: 'download', ratio: 0 })
    const url = URL.createObjectURL(file)
    audioUrlRef.current = url
    setAudioUrl(url)
    const ctrl = new AbortController()
    asrAbortRef.current = ctrl
    try {
      const eng = await createTranscriber({ lang: asrLang, onProgress: setAsrProgress })
      asrEngineRef.current = eng
      const { pages } = await runTranscribe(file, { transcribe: eng.transcribe, signal: ctrl.signal, onProgress: setAsrProgress })
      if (ctrl.signal.aborted) return // cancelled → keep the empty state
      if (!pages.length || emptyTranscriptNotice({ text: pages.map((p) => p.text).join(' ') })) {
        setError('We couldn’t find clear speech in that recording. Try a quieter clip, or check the language toggle.')
        return
      }
      setPdfData({ pages })
      addPdfRecent({ name: file.name || 'recording', sizeKB: Math.round(file.size / 1024), pages: pages.length, kind: 'audio' })
      logSkillActivity('reading') // a transcribed recording = one Reading unit (paper-balance meter)
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Could not transcribe that recording. Try another clip.')
    } finally {
      setAsrProgress(null)
      asrAbortRef.current = null
    }
  }, [asrLang, resetGloss, destroyDoc, addPdfRecent, logSkillActivity])

  // Mic capture (record mode). Stop → the recorded Blob flows through handleFile's
  // audio branch exactly like an uploaded clip. Mirrors the OCR camera affordance.
  const toggleRecord = useCallback(async () => {
    if (recording) { try { mediaRecRef.current?.stop() } catch { /* already stopped */ } return }
    if (!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')) {
      setError('Recording isn’t supported in this browser — upload an audio file instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      recChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size) recChunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const type = mr.mimeType || 'audio/webm'
        const blob = new Blob(recChunksRef.current, { type })
        recChunksRef.current = []
        if (blob.size) {
          const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'
          // A recorded clip is always audio → go straight to the transcriber (skips
          // handleFile's type sniffing; keeps this callback's deps stable).
          runAudioTranscribe(new File([blob], `recording.${ext}`, { type }))
        }
      }
      mediaRecRef.current = mr
      mr.start()
      setRecording(true)
    } catch {
      setError('Microphone access was blocked. Allow the mic, or upload an audio file instead.')
    }
  }, [recording, runAudioTranscribe])

  // --- "Sharper read" (Phase 2) — consent-gated BYOK vision re-read ----------
  const runSharperRead = useCallback(() => {
    const src = lastOcrSourceRef.current
    if (!src) return
    runImageOcr(src.images, { fromPdf: src.fromPdf, name: src.name, engine: 'vision' })
  }, [runImageOcr])

  const requestSharperRead = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      // Don't collect consent for something that can't run right now.
      setVisionError('You’re offline — Sharper read needs a connection. Your free on-device read still works.')
      return
    }
    if (!visionConsent) {
      setVisionDontAsk(false)
      setShowVisionConsent(true)
      return
    }
    runSharperRead()
  }, [visionConsent, runSharperRead])

  const confirmVisionConsent = useCallback(() => {
    if (visionDontAsk) setVisionConsent(true) // "Don't ask again" persists (F4)
    setShowVisionConsent(false)
    runSharperRead()
  }, [visionDontAsk, setVisionConsent, runSharperRead])

  // Image-only PDF → stash the doc/file and surface a non-punitive offer (Task 8).
  const offerPdfOcr = useCallback((doc, file) => { setPdfOcrOffer({ doc, file }) }, [])

  const acceptPdfOcr = useCallback(async () => {
    const offer = pdfOcrOffer
    setPdfOcrOffer(null)
    if (!offer?.doc) return
    setOcrProgress(0) // show progress immediately (rasterising can take a moment)
    // P2-C9: install the abort controller BEFORE rasterising so Cancel works the
    // whole way through; runImageOcr installs its own for the recognize phase.
    const ctrl = new AbortController()
    ocrAbortRef.current = ctrl
    if (offer.doc.numPages > 10) console.info(`[ocr] reading the first 10 of ${offer.doc.numPages} scanned pages`) // spec Q6 — cap; logged, never silent
    try {
      const canvases = await rasterisePdfPages(offer.doc, {
        maxPages: 10, signal: ctrl.signal, renderPage: renderPdfPageToCanvas,
      })
      await runImageOcr(canvases, { fromPdf: true, name: offer.file?.name || 'scan.pdf' })
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Could not read the scanned pages.')
    } finally {
      // Only clean up if OUR controller is still current (cancelled or failed
      // during rasterise) — on the happy path runImageOcr already replaced it.
      if (ocrAbortRef.current === ctrl) {
        ocrAbortRef.current = null
        setOcrProgress(null)
      }
    }
  }, [pdfOcrOffer, runImageOcr])

  // Flatten the document into per-paragraph token parts plus a token map
  // so the selection hook can range over the whole document by index.
  const tokenized = useMemo(() => {
    if (!pdfData) return { tokens: [], pages: [] }
    const tokens = []
    const pages = []
    let i = 0
    for (const page of pdfData.pages) {
      const paragraphs = []
      for (const para of page.paragraphs) {
        const { parts, nextIndex } = splitParagraph(para, i)
        for (const p of parts) if (p.kind === 'token') tokens.push({ word: p.text, i: p.i })
        i = nextIndex
        paragraphs.push(parts)
      }
      pages.push({ pageNum: page.pageNum, paragraphs })
    }
    return { tokens, pages }
  }, [pdfData])

  // The active token list depends on the view: the Layout overlay has its OWN
  // global index space (from getTextContent), distinct from the reflow tokenizer,
  // so selection/slice/highlight all operate over whichever view is showing.
  const activeTokens = useMemo(
    () => (view === 'layout' ? layoutTokens : tokenized.tokens),
    [view, layoutTokens, tokenized],
  )

  // Grounding index (owned dictionary + the learner's cards) — flags low-confidence
  // machine glosses + supplies the canonical English on a mismatch (spec D9).
  const groundingIndex = useMemo(() => buildGroundingIndex(DICT_PAIRS, cards), [cards])

  // token global-index → gloss decision, for UNKNOWN words that have a translation.
  // Same Map shape as selIdx, so it renders identically in reflow + layout.
  const glossByIndex = useMemo(
    () => buildGlossIndex(activeTokens, DICTIONARY, docGloss, groundingIndex),
    [activeTokens, docGloss, groundingIndex],
  )
  const hasGloss = glossByIndex.size > 0

  const tokensSlice = useCallback((a, b) => {
    return activeTokens.filter(t => t.i >= a && t.i <= b).map(t => t.word)
  }, [activeTokens])

  // Same slice but keeping each token's document index, so selection entries can
  // carry the index range needed to highlight them inline.
  const tokensSliceWithIndex = useCallback((a, b) => {
    return activeTokens.filter(t => t.i >= a && t.i <= b).map(t => ({ word: t.word, i: t.i }))
  }, [activeTokens])

  const showSelection = mode === 'select'

  // English-source card gloss (F5): the curated Malay gloss from the reversed seed
  // FIRST, then en→ms MT only for the misses ("never a Malay-dict miss"). Returns
  // translateBatch-shaped results aligned to `words`. EN path only — ms callers
  // keep calling translateBatch directly (byte-identical behaviour).
  const glossEnWords = useCallback(async (words) => {
    const dict = await loadEnDictionary()
    const out = new Array(words.length).fill(null)
    const missIdx = []
    words.forEach((w, i) => {
      const hit = dict[String(w).toLowerCase()]
      if (hit) out[i] = { text: hit, source: 'dict' }
      else missIdx.push(i)
    })
    if (missIdx.length) {
      const res = await translateBatch(missIdx.map(i => words[i]), plan.from, plan.to)
      missIdx.forEach((i, k) => { out[i] = res[k] || { text: words[i], source: 'error' } })
    }
    return out
  }, [plan])

  const translateOne = useCallback(async (word) => {
    setTranslation({ items: [{ src: word, text: '…', source: 'loading' }] })
    const r = await translateWord(word, plan.from, plan.to)
    setTranslation({ items: [{ src: word, text: r.text, source: r.source }] })
  }, [plan])

  const translateMany = useCallback(async (words) => {
    setTranslation({ items: words.map(w => ({ src: w, text: '…', source: 'loading' })) })
    const results = await translateBatch(words, plan.from, plan.to)
    setTranslation({
      items: words.map((w, idx) => ({
        src: w,
        text: results[idx]?.text || w,
        source: results[idx]?.source || 'error',
      })),
    })
  }, [plan])

  // The compositional teaching moment: when words are grouped, show BOTH the
  // word-by-word glosses AND the phrase meaning side by side, so the learner sees
  // how the meaning changes (jam = o'clock · tangan = hand → jam tangan = watch).
  const showCompoundFor = useCallback(async (words) => {
    if (!Array.isArray(words) || words.length < 2) return
    setCompound({ parts: words.map(w => ({ w, gloss: '…' })), phrase: { w: words.join(' '), gloss: '…' } })
    const [partRes, whole] = await Promise.all([
      translateBatch(words, plan.from, plan.to),
      translateWord(words.join(' '), plan.from, plan.to),
    ])
    setCompound(explainCompound(words, partRes.map(r => r?.text || ''), whole?.text || ''))
  }, [plan])

  const addToSelection = useCallback((entries) => {
    setSelection(prev => {
      const existing = new Set(prev.map(p => `${p.type}:${p.word}`))
      const merged = [...prev]
      for (const e of entries) {
        const key = `${e.type}:${e.word}`
        if (!existing.has(key)) {
          existing.add(key)
          merged.push(e)
        }
      }
      return merged
    })
  }, [])

  const handleCommit = useCallback(({ startIndex, endIndex, kind }) => {
    const words = tokensSlice(startIndex, endIndex)
    if (!words.length) return

    // kind (from gestureModel.classifyGesture): Kheshav's mapping —
    //   'words'  = left-drag  → individual words
    //   'phrase' = right-drag → one grouped phrase (compositional meaning)
    //   'word'   = single click → one word
    if (showSelection) {
      // Select mode — push to the selection bucket, carrying token indices so the
      // entry can be highlighted inline (Step 3) and grouped/ungrouped (Step 2).
      if (kind === 'phrase') {
        addToSelection([{ word: words.join(' '), type: 'phrase', startIndex, endIndex }])
        showCompoundFor(words)
      } else if (kind === 'words') {
        addToSelection(tokensSliceWithIndex(startIndex, endIndex).map(t => ({ word: t.word, type: 'word', index: t.i })))
      } else {
        addToSelection([{ word: words[0], type: 'word', index: startIndex }])
      }
      return
    }

    // Translate mode
    if (kind === 'phrase') {
      showCompoundFor(words)
    } else if (kind === 'words') {
      translateMany(words)
    } else {
      translateOne(words[0])
    }
  }, [tokensSlice, tokensSliceWithIndex, showSelection, addToSelection, showCompoundFor, translateMany, translateOne])

  const sel = useSelectionMode(handleCommit, groupMode ? 'phrase' : 'words')
  // Layout view: arbitrate 1-finger select vs 2-finger pinch + double-tap zoom.
  const pinch = usePinchZoom(sel)

  // Map of token-index → selection type ('word' | 'phrase') for inline highlight.
  // Entries without indices (e.g. added from the translate panel) are skipped.
  const selIdx = useMemo(() => {
    const m = new Map()
    for (const e of selection) {
      const a = e.startIndex ?? e.index
      const b = e.endIndex ?? e.index
      if (a == null || b == null) continue
      for (let i = a; i <= b; i++) m.set(i, e.type)
    }
    return m
  }, [selection])

  const removeFromSelection = (idx) => {
    setSelection(prev => prev.filter((_, i) => i !== idx))
  }

  // Glue a word chip with the next adjacent word chip into one phrase (the touch-
  // friendly way to group, since phones have no right-button), then teach it.
  const groupChips = (idx) => {
    const grouped = groupSelection(selection, idx, idx + 1)
    if (grouped === selection) return // non-contiguous / not two words — no-op
    setSelection(grouped)
    const phrase = grouped[idx]
    if (phrase?.type === 'phrase') showCompoundFor(phrase.word.split(/\s+/).filter(Boolean))
  }

  const ungroupChip = (idx) => {
    setSelection(prev => ungroupSelection(prev, idx))
  }

  const addSelectionToDeck = async () => {
    if (!selection.length) return
    // Translate any entries that don't yet have an `en` field
    const pending = selection.filter(s => !s.en).map(s => s.word)
    let translations = []
    if (pending.length) {
      setBatchProgress({ current: 0, total: pending.length })
      // EN source: reversed-seed gloss first, then en→ms MT. ms: unchanged.
      translations = isEn ? await glossEnWords(pending) : await translateBatch(pending)
      setBatchProgress(null)
    }
    let pi = 0
    const enriched = selection.map(s => s.en ? s : ({
      ...s, en: translations[pi++]?.text || s.word,
    }))
    const cards = enriched.map(s => ({
      m: s.word,
      e: s.en,
      lang: plan.lang, // source language = active studyLang: 'ms' (Malay→English) or 'en' (English→Malay) (F5)
      t: deckName,
      p: s.type === 'phrase' ? 'phrase' : 'n',
      ex: `${s.word} — ${s.en}`,
      mn: '',
    }))
    addCards(cards)
    setSelection([])
  }

  const translateAllUnknowns = async () => {
    const dict = isEn ? await loadEnDictionary() : DICTIONARY
    const unknowns = []
    const seen = new Set()
    for (const t of activeTokens) {
      const w = t.word.toLowerCase()
      if (dict[w]) continue
      if (seen.has(w)) continue
      seen.add(w)
      unknowns.push(t.word)
    }
    if (!unknowns.length) {
      setTranslation({ items: [{ src: '', text: 'All words already in dictionary.', source: 'info' }] })
      return
    }
    setBatchProgress({ current: 0, total: unknowns.length })
    const results = await translateBatch(unknowns, plan.from, plan.to)
    setBatchProgress(null)
    setTranslation({
      heading: `Translated ${unknowns.length} unknown words`,
      items: unknowns.map((w, i) => ({
        src: w, text: results[i]?.text || w, source: results[i]?.source || 'error',
      })),
    })
  }

  // --- In-place gloss layer handlers (Step 4) ---
  const revealGloss = useCallback((i) => {
    setGlossState(s => revealToken(s, i))
  }, [])

  // One-tap add a revealed gloss into the deck (routes into FSRS — spec D10). Uses
  // the grounded `display` (canonical English on a mismatch), so the card is correct.
  const addGloss = useCallback((g) => {
    if (!g || addedGloss.has(g.malay)) return
    addCards([{ m: g.malay, e: g.display, lang: plan.lang, t: deckName, p: 'n', ex: `${g.malay} — ${g.display}`, mn: '' }])
    setAddedGloss(prev => new Set(prev).add(g.malay))
  }, [addCards, deckName, addedGloss, plan])

  const toggleShowAll = useCallback(() => {
    setGlossState(s => setShowAll(s, !s.showAll))
  }, [])

  // Step 5 — translate every still-unknown, uncached word on the document with the
  // volume-safe pipeline (dedupe + chunk + throttle + backoff + cache + abort).
  const translatePage = useCallback(async () => {
    const { toTranslate } = collectDocTokens(activeTokens, DICTIONARY, {
      cacheLookup: w => !!getFromCache(w),
    })
    if (!toTranslate.length) {
      // Everything is either known, cached, or already glossed — surface what we have.
      const cachedGloss = {}
      for (const t of activeTokens) {
        const norm = normalizeWord(t.word)
        if (!norm || DICTIONARY[norm] || docGloss[norm]) continue
        const c = getFromCache(norm)
        if (c) cachedGloss[norm] = { text: c.text, source: c.source }
      }
      if (Object.keys(cachedGloss).length) {
        setDocGloss(prev => ({ ...prev, ...cachedGloss }))
      } else {
        setTranslation({ items: [{ src: '', text: 'Nothing new to translate on this document.', source: 'info' }] })
      }
      return
    }
    const ac = new AbortController()
    translateAbortRef.current = ac
    setTranslating({ done: 0, total: toTranslate.length })
    const results = await translateDocument(toTranslate, {
      translateBatch,
      from: plan.from,
      to: plan.to,
      signal: ac.signal,
      onProgress: setTranslating,
      provider: quality ? 'quality' : undefined,
    })
    setDocGloss(prev => ({ ...prev, ...results }))
    setTranslating(null)
    translateAbortRef.current = null
  }, [activeTokens, docGloss, quality, plan])

  const cancelTranslate = useCallback(() => {
    translateAbortRef.current?.abort()
    setTranslating(null)
  }, [])

  // --- Sentence-level reveal (reflow only) ---------------------------------
  // Whole-doc language guess (conservative): only a substantial all-English doc
  // disables Sentence mode (reveal would be a no-op, source≈target). Malay/unknown
  // stay enabled so the primary path is never wrongly blocked.
  const docLang = useMemo(() => detectDocLanguage(tokenized.tokens), [tokenized])
  // Sentence reveal is a no-op when source ≈ target, so disable it on the WRONG
  // language for this learner (symmetric with the dense-page guard): a Malay
  // learner can't usefully reveal an English doc; an English learner can't
  // usefully reveal a Malay doc (the reveal is en→ms). isEn=false → docLang==='en',
  // byte-identical to the shipped Malay behaviour.
  const sentenceDisabled = docLang === (isEn ? 'ms' : 'en')
  // The L1 language a sentence reveal shows (English learner reveals Malay).
  const revealLabel = isEn ? 'Malay' : 'English'
  // The whole-document "Translate page" surface (FullTranslationView) now threads
  // plan.from/plan.to, so it's symmetric like sentenceDisabled: a Malay learner gets
  // it on a Malay/unknown doc (hidden on English — byte-identical to the shipped
  // gate), an English learner gets it on an English/unknown doc (en→ms).
  const fullTranslationDisabled = docLang === (isEn ? 'ms' : 'en')

  // Claim 6 — dense-page help nudge. Over the whole loaded document (PDFReader is
  // a continuous scroll, so "page" = the document here), measure the unknown-word
  // density: words with no known gloss. The Malay path uses the built-in
  // dictionary + grounding index. An English (0510 ESL) learner reading an English
  // doc can't — English isn't in the Malay dictionary — so we inject a blended
  // "known English word?" predicate (high-frequency list + the dictionaryEn seed +
  // their own en cards). Lazy-built; until ready, English density is not-dense (so
  // we never nudge prematurely while the small frequency chunk loads).
  const [isKnownEnglish, setIsKnownEnglish] = useState(null)
  useEffect(() => {
    if (!isEn) { setIsKnownEnglish(null); return }
    let cancelled = false
    Promise.all([loadEnglishFrequency(), loadEnDictionary()]).then(([frequency, enDict]) => {
      if (cancelled) return
      const set = buildKnownEnglish({
        frequency,
        seed: Object.keys(enDict || {}),
        cards: cards.filter(c => c?.lang === 'en'),
      })
      setIsKnownEnglish(() => makeIsKnownEnglish(set))
    }).catch(() => { /* a load failure just leaves the English nudge off — never blocks reading */ })
    return () => { cancelled = true }
  }, [isEn, cards])

  const density = useMemo(() => {
    if (isEn) {
      // Not ready yet → report not-dense (avoids a premature nudge pre-load).
      if (!isKnownEnglish) return { unknown: 0, total: 0, ratio: 0 }
      return unknownDensity(activeTokens, {}, undefined, isKnownEnglish)
    }
    return unknownDensity(activeTokens, DICTIONARY, groundingIndex)
  }, [isEn, isKnownEnglish, activeTokens, groundingIndex])
  // A dense page is "eligible" for help when the text is demonstrably too hard AND
  // the learner isn't already revealing everything AND hasn't dismissed it here AND
  // the doc isn't in the WRONG language for this learner (revealing the L1 gloss is
  // a no-op when source ≈ target): Malay learner → suppress on an English doc;
  // English learner → suppress on a clearly-Malay doc.
  const wrongDocLang = isEn ? 'ms' : 'en'
  const denseEligible = docLang !== wrongDocLang && !glossState.showAll && !denseNudgeDismissed && isDense(density)
  // Beginner pref ON (Step 5) → auto-apply the softer mode silently; OFF → the
  // non-punitive one-tap offer (the default for everyone).
  const showDenseNudge = denseEligible && !autoHelpDensePages

  const acceptDenseHelp = useCallback(() => {
    setGlossState(s => setShowAll(s, true)) // reveal English glosses as they read
    translatePage()                          // populate glosses for the unknown words
    setDenseNudgeDismissed(true)             // acted on — don't re-offer this doc
  }, [translatePage])
  const dismissDenseNudge = useCallback(() => setDenseNudgeDismissed(true), [])

  // Beginner pref: on a dense page, auto-apply the softer mode instead of asking
  // (still Malay-first; still one-tap to Hide all). Runs once per document —
  // acceptDenseHelp flips showAll, which makes denseEligible false.
  useEffect(() => {
    if (autoHelpDensePages && denseEligible) acceptDenseHelp()
  }, [autoHelpDensePages, denseEligible, acceptDenseHelp])

  // Group each reflow paragraph into punctuation-sentences, plus the cue/block
  // anchor maps the render consumes. Depends only on the tokenized document.
  const sentenceData = useMemo(() => {
    const byPara = new Map()
    const all = []
    for (const page of tokenized.pages) {
      page.paragraphs.forEach((parts, pi) => {
        const sentences = groupSentences(parts, { pageNum: page.pageNum, pi })
        if (!sentences.length) return
        const cueByPart = new Map()
        const blockByPart = new Map()
        for (const s of sentences) {
          cueByPart.set(s.partStart, s)
          blockByPart.set(s.partEnd, s)
          all.push(s)
        }
        byPara.set(`${page.pageNum}:${pi}`, { cueByPart, blockByPart })
      })
    }
    return { byPara, all }
  }, [tokenized])

  // token global-index → word, for "add unknowns from this sentence".
  const wordByIndex = useMemo(() => {
    const m = new Map()
    for (const t of tokenized.tokens) m.set(t.i, t.word)
    return m
  }, [tokenized])

  // --- Keyboard reader layer (P1-5, reflow only — spec D7) ---
  // Content-token global indices in document order: the spine the roving
  // focus walks. Mirrors exactly what the render loop draws as word spans.
  const kbOrder = useMemo(() => {
    const o = []
    for (const page of tokenized.pages) {
      for (const parts of page.paragraphs) {
        // splitParagraph kinds: 'token' (content word) | 'space' | 'punct'.
        for (const p of parts) if (p.kind === 'token') o.push(p.i)
      }
    }
    return o
  }, [tokenized])
  const kbOrderSet = useMemo(() => new Set(kbOrder), [kbOrder])
  // Roving tabindex target — heals to the first content token when the stored
  // index no longer exists (new document), so no reset wiring is needed.
  const kbActiveIndex = activeTokenIndex != null && kbOrderSet.has(activeTokenIndex)
    ? activeTokenIndex
    : (kbOrder.length ? kbOrder[0] : null)
  const kbLo = kbRange ? Math.min(kbRange.anchor, kbRange.focus) : -1
  const kbHi = kbRange ? Math.max(kbRange.anchor, kbRange.focus) : -1

  const focusToken = (i) => document.getElementById(`tok-${i}`)?.focus()

  // Single delegated handler (R2: event delegation, not one handler per
  // token). Maps the key via the pure dispatcher, then performs the side
  // effect by calling the EXISTING functions — never duplicating their logic.
  const handleReaderKeyDown = (e) => {
    const tokEl = e.target?.closest?.('[data-token-i]')
    if (!tokEl) return // keys only act when a reader token has focus (R3)
    const focusedIndex = Number(tokEl.dataset.tokenI)
    const focusedGloss = glossByIndex.get(focusedIndex)
    const action = resolveReaderKey(e, {
      activeIndex: focusedIndex,
      order: kbOrder,
      anchorIndex: kbRange ? kbRange.anchor : null,
      mode,
      groupOn: groupMode,
      hasGloss: !!focusedGloss,
      glossRevealed: focusedGloss ? isRevealed(glossState, focusedIndex) : false,
    })
    if (!action) return // unhandled → the browser keeps the key (Space scroll, Tab out)
    e.preventDefault()

    switch (action.type) {
      case 'move': {
        setActiveTokenIndex(action.to)
        if (kbRange) setKbRange(null) // plain arrow collapses the range (text-selection convention)
        focusToken(action.to)
        break
      }
      case 'extend': {
        const anchor = kbRange ? kbRange.anchor : focusedIndex
        setKbRange({ anchor, focus: action.to })
        setActiveTokenIndex(action.to)
        focusToken(action.to)
        const lo = Math.min(anchor, action.to)
        const hi = Math.max(anchor, action.to)
        const n = kbOrder.filter(i => i >= lo && i <= hi).length
        setKbAnnounce(`Selecting ${n} ${n === 1 ? 'word' : 'words'}`)
        break
      }
      case 'activate': {
        // Reveal-gate (D4): Enter is the deliberate press — same gate as a tap.
        const g = glossByIndex.get(action.index)
        if (g && !isRevealed(glossState, action.index)) {
          revealGloss(action.index)
          setKbAnnounce(`${g.malay}: ${g.display}`)
        } else {
          handleCommit({ startIndex: action.index, endIndex: action.index, kind: 'word' })
          const w = wordByIndex.get(action.index) || ''
          setKbAnnounce(showSelection ? `Added ${w} to selection` : `Translating ${w}`)
        }
        break
      }
      case 'commitRange': {
        handleCommit({ startIndex: action.startIndex, endIndex: action.endIndex, kind: action.kind })
        setKbRange(null)
        const n = kbOrder.filter(i => i >= action.startIndex && i <= action.endIndex).length
        setKbAnnounce(showSelection
          ? (action.kind === 'phrase' ? `Added a ${n}-word phrase to selection` : `Added ${n} words to selection`)
          : (action.kind === 'phrase' ? `Translating a ${n}-word phrase` : `Translating ${n} words`))
        break
      }
      case 'addDeck': {
        const g = glossByIndex.get(action.index)
        if (!g || !isRevealed(glossState, action.index)) {
          setKbAnnounce('Press Enter to reveal the meaning first')
        } else if (addedGloss.has(g.malay)) {
          setKbAnnounce(`${g.malay} is already in your deck`)
        } else {
          addGloss(g)
          setKbAnnounce(`Added ${g.malay} to deck`)
        }
        break
      }
      case 'clearRange': {
        setKbRange(null)
        setKbAnnounce('Selection cleared')
        break
      }
    }
  }

  // sentenceId → the distinct unknown words inside it (FSRS candidates + dotted
  // cue). "Known" is the Malay dictionary for a Malay doc, or the blended
  // known-English set for an English learner (reusing the dense-page predicate).
  // Until the English set lazy-loads, treat all as known → no premature cue.
  const sentenceKnownFn = useMemo(
    () => (isEn ? (isKnownEnglish || (() => true)) : (norm => !!DICTIONARY[norm])),
    [isEn, isKnownEnglish],
  )
  const sentenceUnknownsById = useMemo(
    () => sentenceUnknowns(sentenceData.all, wordByIndex, sentenceKnownFn),
    [sentenceData, wordByIndex, sentenceKnownFn],
  )

  // Token indices inside a currently-revealed sentence — their per-word gloss cue is
  // suppressed (the sentence already supplies meaning; avoids double-hand-over, S4).
  const revealedSentenceTokens = useMemo(() => {
    if (!sentenceMode || sentenceDisabled) return EMPTY_SET
    const set = new Set()
    for (const s of sentenceData.all) {
      if (isSentenceRevealed(sentenceReveal, s.sentenceId)) {
        for (const i of s.tokenIndices) set.add(i)
      }
    }
    return set
  }, [sentenceMode, sentenceDisabled, sentenceData, sentenceReveal])

  // For the 'sheet' render pref: the revealed sentences, in document order.
  // Ladder mode (F7): the simpler-Malay rung always renders INLINE, so the panel
  // only carries sentences whose ENGLISH is showing — escalated (rung 2) or
  // degraded (no simplify content) ones. No provider → exactly the shipped list.
  const revealedSentencesList = useMemo(() => {
    if (!sentenceMode || sentenceDisabled || sentenceRenderPref !== 'sheet') return EMPTY_ARR
    return sentenceData.all.filter(s => {
      if (!isSentenceRevealed(sentenceReveal, s.sentenceId)) return false
      if (!ladder) return true
      const entry = sentenceSimplify[s.sentenceId]
      const malayRung = pendingSimplify.has(s.sentenceId) || !!entry?.text
      return !malayRung || englishShownSentences.has(s.sentenceId)
    })
  }, [sentenceMode, sentenceDisabled, sentenceRenderPref, sentenceData, sentenceReveal,
      ladder, sentenceSimplify, pendingSimplify, englishShownSentences])

  // Translate a set of sentences with the volume-safe runner (dedupe identical text;
  // skip already-translated; cancellable; resumable from the per-text cache).
  const runSentenceTranslation = useCallback(async (sentences) => {
    const texts = []
    const seen = new Set()
    for (const s of sentences) {
      if (sentenceGloss[s.sentenceId] || seen.has(s.text)) continue
      seen.add(s.text)
      texts.push(s.text)
    }
    if (!texts.length) return
    const ac = new AbortController()
    sentenceAbortRef.current = ac
    setTranslatingSentences({ done: 0, total: texts.length })
    const results = await translateDocument(texts, {
      translateBatch, from: plan.from, to: plan.to, signal: ac.signal,
      onProgress: setTranslatingSentences, provider: quality ? 'quality' : undefined,
    })
    setSentenceGloss(prev => {
      const next = { ...prev }
      for (const s of sentences) {
        const r = results[s.text]
        if (r && r.text && r.source !== 'error') next[s.sentenceId] = { text: r.text, source: r.source }
      }
      return next
    })
    setTranslatingSentences(null)
    sentenceAbortRef.current = null
  }, [sentenceGloss, quality, plan])

  const cancelSentenceTranslation = useCallback(() => {
    sentenceAbortRef.current?.abort()
    setTranslatingSentences(null)
  }, [])

  // Lazily fetch ONE sentence's English (the shipped reveal fetch, also the
  // ladder's rung-2 / degrade target). Idempotent per sentence: the gloss check
  // skips completed fetches, the pending check dedupes in-flight ones (the
  // Show/Hide English toggle would otherwise fire a request per spam-tap).
  const fetchSentenceEnglish = useCallback((s) => {
    if (sentenceGloss[s.sentenceId] || pendingSentences.has(s.sentenceId)) return
    setPendingSentences(prev => new Set(prev).add(s.sentenceId))
    translateDocument([s.text], { translateBatch, from: plan.from, to: plan.to, provider: quality ? 'quality' : undefined }).then(results => {
      const r = results[s.text]
      if (r && r.text && r.source !== 'error') {
        setSentenceGloss(prev => ({ ...prev, [s.sentenceId]: { text: r.text, source: r.source } }))
      }
      setPendingSentences(prev => { const n = new Set(prev); n.delete(s.sentenceId); return n })
    })
  }, [sentenceGloss, pendingSentences, quality, plan])

  // Reveal one sentence. No provider → today's behaviour (lazy gtx English).
  // Ladder on → fetch SIMPLER MALAY first (Option F, an optional involvement-load aid);
  // any non-ok parse (failure/echo/English/empty) degrades to the English fetch
  // so the block always lands on something readable. One instruct call per
  // sentence per document — the result (or the failure) is cached in memory.
  const revealSentenceHandler = useCallback((s) => {
    setSentenceReveal(st => revealSentence(st, s.sentenceId))
    if (!ladder) { fetchSentenceEnglish(s); return }
    const cached = sentenceSimplify[s.sentenceId]
    if (cached) {
      if (cached.failed) fetchSentenceEnglish(s) // degraded sentence still needs its English
      return
    }
    if (pendingSimplify.has(s.sentenceId)) return
    setPendingSimplify(prev => new Set(prev).add(s.sentenceId))
    // One shared controller covers every in-flight simplify; recreate after abort.
    if (!simplifyAbortRef.current || simplifyAbortRef.current.signal.aborted) {
      simplifyAbortRef.current = new AbortController()
    }
    callInstruct({ ...buildSimplifyPrompt(s.text), signal: simplifyAbortRef.current.signal })
      .then(raw => {
        const r = parseSimplifyResponse(raw, s.text)
        if (r.status === 'ok') {
          setSentenceSimplify(prev => ({ ...prev, [s.sentenceId]: { text: r.text } }))
        } else {
          setSentenceSimplify(prev => ({ ...prev, [s.sentenceId]: { failed: true } }))
          fetchSentenceEnglish(s)
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError') return // cancelled — uncached, a re-tap retries
        setSentenceSimplify(prev => ({ ...prev, [s.sentenceId]: { failed: true } }))
        fetchSentenceEnglish(s)
      })
      .finally(() => {
        setPendingSimplify(prev => { const n = new Set(prev); n.delete(s.sentenceId); return n })
      })
  }, [ladder, sentenceSimplify, pendingSimplify, fetchSentenceEnglish])

  // Rung 2 — a deliberate escalation tap reveals the English beneath the simpler
  // Malay (the existing gtx machinery; never an instruct call).
  const showEnglishHandler = useCallback((s) => {
    setEnglishShownSentences(prev => new Set(prev).add(s.sentenceId))
    fetchSentenceEnglish(s)
  }, [fetchSentenceEnglish])

  const hideEnglishHandler = useCallback((s) => {
    setEnglishShownSentences(prev => {
      if (!prev.has(s.sentenceId)) return prev
      const n = new Set(prev); n.delete(s.sentenceId); return n
    })
  }, [])

  const collapseSentence = useCallback((s) => {
    setSentenceReveal(st => hideSentence(st, s.sentenceId))
    // Collapsing resets the ladder for this sentence: a later re-reveal starts
    // back at rung 1 (simpler Malay), not pre-escalated to English.
    setEnglishShownSentences(prev => {
      if (!prev.has(s.sentenceId)) return prev
      const n = new Set(prev); n.delete(s.sentenceId); return n
    })
  }, [])

  const toggleShowAllSentences = useCallback(() => {
    setSentenceReveal(st => setShowAllSentences(st, !st.showAll))
    if (!sentenceReveal.showAll) runSentenceTranslation(sentenceData.all)
  }, [sentenceReveal.showAll, sentenceData, runSentenceTranslation])

  const hideAllSentencesHandler = useCallback(() => {
    setSentenceReveal(hideAllSentences())
    setEnglishShownSentences(prev => (prev.size ? new Set() : prev))
  }, [])

  // Route the unknown words from a revealed sentence into the FSRS deck (S8) — the
  // sentence supplies comprehension; durable vocab still consolidates in FSRS.
  const addUnknownsFromSentence = useCallback(async (s) => {
    const words = sentenceUnknownsById.get(s.sentenceId)
    if (!words || !words.length) return
    const results = isEn ? await glossEnWords(words) : await translateBatch(words)
    addCards(words.map((w, i) => ({
      m: w, e: results[i]?.text || w, lang: plan.lang, t: deckName, p: 'n',
      ex: `${w} — ${results[i]?.text || w}`, mn: '',
    })))
    // Mark added only after the cards land (mirrors addGloss ordering) so a failed
    // fetch never locks the button to "Added" with nothing actually added.
    setAddedSentenceUnknowns(prev => new Set(prev).add(s.sentenceId))
  }, [sentenceUnknownsById, addCards, deckName, isEn, glossEnWords, plan])

  const sourceColor = (s) => ({
    deepl: 'var(--color-blue)',
    google: 'var(--color-orange)',
    gtx: 'var(--color-dim)',
    loading: 'var(--color-dim)',
    info: 'var(--color-dim)',
    error: 'var(--color-red)',
    empty: 'var(--color-dim)',
  })[s] || 'var(--color-text)'

  // Audio transcription in progress — takes over the screen with a cancellable,
  // aria-live progress readout. Stays HONEST: on-device Whisper never uploads.
  if (asrProgress !== null) {
    const label = asrProgress.phase === 'download' ? 'Setting up the speech model (one-time)…'
      : asrProgress.phase === 'decode' ? 'Reading your audio…'
        : 'Transcribing…'
    return (
      <div className="text-center py-16 animate-fadeUp" aria-live="polite">
        <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-sm font-bold">{label} {Math.round((asrProgress.ratio || 0) * 100)}%</p>
        <p className="text-[11px] mb-4" style={{ color: 'var(--color-dim)' }}>
          Stays on your device — nothing is uploaded.
        </p>
        <button onClick={() => asrAbortRef.current?.abort()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          Cancel
        </button>
      </div>
    )
  }

  // OCR in progress (a photo or scanned PDF) — takes over the screen with a
  // cancellable, aria-live progress readout. The privacy line is per-engine and
  // must stay HONEST: free Tesseract never uploads; a vision run does.
  if (ocrProgress !== null) {
    const visionRun = ocrRunEngine === 'vision'
    return (
      <div className="text-center py-16 animate-fadeUp" aria-live="polite">
        <Loader2 size={32} className="mx-auto mb-3 animate-spin"
          style={{ color: visionRun ? 'var(--color-purple)' : 'var(--color-accent)' }} />
        <p className="text-sm font-bold">
          {visionRun
            ? `Getting a sharper read from ${visionLabel}…`
            : `Reading your page… ${Math.round((ocrProgress || 0) * 100)}%`}
        </p>
        <p className="text-[11px] mb-4" style={{ color: 'var(--color-dim)' }}>
          {visionRun
            ? 'This page is being sent to your AI provider, on your own key.'
            : 'Stays on your device — nothing is uploaded.'}
        </p>
        <button onClick={() => ocrAbortRef.current?.abort()}
          className="px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          Cancel
        </button>
      </div>
    )
  }

  // Image-only / scanned PDF detected — a non-punitive offer (never auto-runs OCR).
  if (pdfOcrOffer) {
    return (
      <div className="space-y-4 animate-fadeUp">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileSearch size={18} style={{ color: 'var(--color-accent)' }} /> PDF Reader
        </h2>
        <div className="rounded-2xl p-6 text-center" data-testid="pdf-ocr-offer"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-cyan)' }}>
          <Camera size={28} className="mx-auto mb-3" style={{ color: 'var(--color-cyan)' }} />
          <p className="text-sm font-bold mb-1">This PDF has no selectable text.</p>
          <p className="text-[11px] mb-4" style={{ color: 'var(--color-dim)' }}>
            It looks like a scan or photo. Read it with on-device OCR? Stays on your device — nothing is uploaded.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={acceptPdfOcr} data-testid="pdf-ocr-accept"
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'var(--color-cyan)', color: 'var(--color-on-bright)' }}>
              Read with OCR
            </button>
            <button onClick={clearPdf}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state: the upload / take-a-photo card
  if (!pdfData && !loading) {
    return (
      <div className="space-y-4 animate-fadeUp">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileSearch size={18} style={{ color: 'var(--color-accent)' }} /> PDF Reader
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
          Read a Malay PDF — or snap a photo of a past-paper page — interactively. Tap words to translate, or switch to Select mode to build flashcards.{' '}
          <button type="button" onClick={() => loadSample(ocrLang)} data-guide="pdf-sample"
            className="font-semibold underline underline-offset-2"
            style={{ color: 'var(--color-accent)' }}>
            New here? Try a sample.
          </button>
        </p>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
          className="rounded-2xl p-10 text-center cursor-pointer"
          style={{ background: 'var(--color-card)', border: '2px dashed var(--color-border)' }}
        >
          <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm font-bold mb-1">Drop a PDF, photo, or recording — or capture one</p>
          <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
            📸 Photos: fill the frame, good light · 🎙️ Recordings: quiet room, clear speech — all read on your device, never uploaded.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => cameraInputRef.current?.click()}
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-bright)' }}>
              <Camera size={13} /> Take a photo
            </button>
            <button type="button" onClick={toggleRecord} data-testid="asr-record"
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: recording ? 'var(--color-red)' : 'var(--color-accent)', color: 'var(--color-on-bright)' }}>
              {recording ? <><Square size={12} /> Stop recording</> : <><Mic size={13} /> Record</>}
            </button>
            {/* Material language — Malay-first; one toggle drives BOTH photo OCR and
                audio transcription (a learner studies one language's material at a
                time; two toggles would add attention cost). Persisted so it remembers. */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}
              title="Which language is the material in? (Malay or English)">
              {['ms', 'en'].map((l) => (
                <button key={l} type="button" onClick={() => { setOcrLang(l); setAsrLang(l) }}
                  className="min-h-[44px] px-2.5 py-1.5 text-xs font-bold"
                  style={{ background: ocrLang === l ? 'var(--color-accent)' : 'transparent',
                           color: ocrLang === l ? 'var(--color-on-bright)' : 'var(--color-text)' }}>
                  {l === 'ms' ? 'Malay' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="application/pdf,image/*,audio/*" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
        {error && (
          <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--color-red)' }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-16 animate-fadeUp">
        <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-sm font-bold">Reading PDF…</p>
      </div>
    )
  }

  // Full-translation takeover — presents as its own page (back arrow returns here),
  // reusing the already-parsed pages in memory.
  if (showFullTranslation && pdfData) {
    return (
      <Suspense fallback={
        <div className="text-center py-16 animate-fadeUp">
          <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--color-accent)' }} />
          <p className="text-sm font-bold">Loading…</p>
        </div>
      }>
        <FullTranslationView
          pages={pdfData.pages}
          quality={quality}
          onToggleQuality={() => setQuality(q => !q)}
          hasKey={hasQualityTranslateKey()}
          from={plan.from}
          to={plan.to}
          revealLabel={revealLabel}
          onBack={() => setShowFullTranslation(false)}
        />
      </Suspense>
    )
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-30 -mx-3 px-3 py-2 backdrop-blur"
        style={{ background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()} data-guide="pdf-replace"
            className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Upload size={12} /> Replace
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf,image/*,audio/*" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />

          {/* Reflow ⟷ Layout: simple reading text vs a faithful picture of the page
              (columns, tables, diagrams kept). Layout needs a live pdfDoc, so an
              image / OCR source (pdfDoc === null) shows Reflow only. */}
          <div className="flex rounded-lg overflow-hidden" data-guide="pdf-view" style={{ border: '1px solid var(--color-border)' }}
            title="Reflow = simple text · Layout = the page as it really looks">
            <button onClick={() => switchView('reflow')} className="min-h-[44px] px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
              style={{ background: view === 'reflow' ? 'var(--color-accent)' : 'transparent', color: view === 'reflow' ? '#fff' : 'var(--color-text)' }}>
              <FileText size={12} /> Reflow
            </button>
            {pdfDoc && (
              <button onClick={() => switchView('layout')} className="min-h-[44px] px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
                style={{ background: view === 'layout' ? 'var(--color-accent)' : 'transparent', color: view === 'layout' ? '#fff' : 'var(--color-text)' }}>
                <LayoutTemplate size={12} /> Layout
              </button>
            )}
          </div>

          <div className="flex rounded-lg overflow-hidden" data-guide="pdf-mode" style={{ border: '1px solid var(--color-border)' }}>
            <button onClick={() => setMode('translate')} className="min-h-[44px] px-3 py-1.5 text-xs font-bold flex items-center gap-1"
              style={{ background: mode === 'translate' ? 'var(--color-accent)' : 'transparent', color: mode === 'translate' ? '#fff' : 'var(--color-text)' }}>
              <Languages size={12} /> Translate
            </button>
            <button onClick={() => setMode('select')} className="min-h-[44px] px-3 py-1.5 text-xs font-bold flex items-center gap-1"
              style={{ background: mode === 'select' ? 'var(--color-accent)' : 'transparent', color: mode === 'select' ? '#fff' : 'var(--color-text)' }}>
              <MousePointerClick size={12} /> Select
            </button>
          </div>

          {/* Group toggle — the touch-friendly way to choose individual-words vs
              one-phrase, since phones have no right-click. Drag intent follows it. */}
          {mode === 'select' && (
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}
              title="Drag selects individual words, or — with Group on — one phrase">
              <button onClick={() => setGroupMode(false)} className="min-h-[44px] px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
                style={{ background: !groupMode ? 'var(--color-green)' : 'transparent', color: !groupMode ? 'var(--color-on-bright)' : 'var(--color-text)' }}>
                <Unlink size={12} /> Individual
              </button>
              <button onClick={() => setGroupMode(true)} className="min-h-[44px] px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
                style={{ background: groupMode ? 'var(--color-purple)' : 'transparent', color: groupMode ? '#fff' : 'var(--color-text)' }}>
                <Link size={12} /> Group
              </button>
            </div>
          )}

          {/* Reveal-gated in-place translation: glosses unknown words on the page,
              hidden until tapped (read Malay first). Free gtx — no key needed. */}
          <button onClick={translatePage} disabled={!!translating} data-guide="pdf-translate"
            className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"
            style={{ background: 'var(--color-accent)', color: '#fff' }}>
            <Languages size={12} /> {translating ? 'Translating…' : 'Translate page'}
          </button>

          {/* "Higher quality" — shown ONLY to users who supplied their own AI key
              (BYOK: OpenRouter or Gemini). Routes word + sentence glosses through
              their instruct models for more idiomatic English; degrades to free gtx
              if the quality call fails. Non-key users never see this — gtx stays
              the default. */}
          {hasQualityTranslateKey() && (
            <button onClick={() => setQuality(q => !q)}
              data-testid="quality-toggle" aria-pressed={quality}
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: quality ? 'var(--color-purple)' : 'var(--color-card)',
                       color: quality ? '#fff' : 'var(--color-text)',
                       border: '1px solid var(--color-border)' }}
              title="Higher-quality translation using your own AI key (falls back to free if it's busy)">
              <Sparkles size={12} /> Higher quality
            </button>
          )}

          {/* Phase 2 — BYOK vision "Sharper read". Manual + consent-gated (it
              UPLOADS this page to the user's own provider; the free on-device
              path never does — the label discloses that standing, Fork 4A).
              Only on a free OCR read with a vision key; retires after a vision
              read (same image, spent quota). Keyless users never see it. */}
          {visionReady && ocrSource === 'tesseract' && (
            <button onClick={requestSharperRead} data-testid="sharper-read"
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-purple)', color: 'var(--color-purple)' }}
              title="Re-read this page with your own AI for a cleaner transcription — uploads the image to your provider">
              <Sparkles size={12} /> Sharper read — uploads to {visionLabel}
            </button>
          )}

          {hasGloss && (
            <button onClick={toggleShowAll}
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                       color: glossState.showAll ? 'var(--color-accent)' : 'var(--color-text)' }}
              title="Reveal or hide every gloss on the page at once">
              {glossState.showAll ? <><EyeOff size={12} /> Hide all</> : <><Eye size={12} /> Show all</>}
            </button>
          )}

          <button onClick={translateAllUnknowns}
            className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Languages size={12} /> List unknowns
          </button>

          {/* Sentence-level reveal — comprehension aid (reflow only). Read the Malay
              sentence first, then tap its cue to reveal the whole-sentence English.
              Off by default so word-level reveal stays the primary path. */}
          {view === 'reflow' && (
            <button onClick={() => setSentenceMode(m => !m)} disabled={sentenceDisabled} data-guide="pdf-sentences"
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
              style={{ background: sentenceMode ? 'var(--color-cyan)' : 'var(--color-card)',
                       color: sentenceMode ? 'var(--color-on-bright)' : 'var(--color-text)',
                       border: '1px solid var(--color-border)' }}
              title={sentenceDisabled
                ? `This looks like ${isEn ? 'a Malay' : 'an English'} document — sentence translation reveals ${revealLabel} for ${isEn ? 'an English' : 'a Malay'} passage`
                : `Reveal whole-sentence ${revealLabel} on demand (read the ${isEn ? 'English' : 'Malay'} first)`}>
              <Pilcrow size={12} /> Sentences
            </button>
          )}

          {view === 'reflow' && sentenceMode && !sentenceDisabled && sentenceData.all.length > 0 && (
            <>
              <button onClick={() => runSentenceTranslation(sentenceData.all)} disabled={!!translatingSentences}
                className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-cyan)', color: 'var(--color-cyan)' }}>
                <Languages size={12} /> {translatingSentences ? 'Translating…' : 'Translate sentences'}
              </button>
              <button onClick={toggleShowAllSentences}
                className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                         color: sentenceReveal.showAll ? 'var(--color-cyan)' : 'var(--color-text)' }}
                title="Reveal or hide every sentence translation on the page at once">
                {sentenceReveal.showAll ? <><EyeOff size={12} /> Hide all sentences</> : <><Eye size={12} /> Show all sentences</>}
              </button>
            </>
          )}

          {/* Full-translation page entry — a dedicated reveal-gated surface for
              paragraph→whole-document English (the BYOK "Higher quality" home).
              Malay-only (ms→en); hidden on English docs + for English learners. */}
          {!fullTranslationDisabled && (
            <button onClick={() => setShowFullTranslation(true)} data-testid="full-translation-open" data-guide="pdf-fulltranslation"
              className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)' }}
              title="Open the full-document translation page (read the Malay first; reveal English to check)">
              <Languages size={12} /> Full translation
            </button>
          )}

          <span className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--color-dim)', background: 'var(--color-card)' }}>
            {pdfData.pages.length} pages · provider: {preferredProvider}
          </span>
        </div>

        {/* P2-C7: failures must be visible while a document is open (the empty-
            state banner can't render here). Dismissible; the doc stays usable. */}
        {error && (
          <div data-testid="pdf-error-banner" role="alert"
            className="mt-2 rounded-xl p-2 pl-3 text-xs flex items-center justify-between gap-2"
            style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--color-red)' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {batchProgress && (
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div className="h-full transition-all" style={{ background: 'var(--color-accent)', width: '60%' }} />
          </div>
        )}

        {translating && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div className="h-full transition-all" style={{
                background: 'var(--color-accent)',
                width: translating.total ? `${Math.round((translating.done / translating.total) * 100)}%` : '10%',
              }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-dim)' }}>
              {translating.done}/{translating.total}
            </span>
            <button onClick={cancelTranslate} className="text-[10px] font-bold underline" style={{ color: 'var(--color-red)' }}>
              Cancel
            </button>
          </div>
        )}

        {translatingSentences && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div className="h-full transition-all" style={{
                background: 'var(--color-cyan)',
                width: translatingSentences.total ? `${Math.round((translatingSentences.done / translatingSentences.total) * 100)}%` : '10%',
              }} />
            </div>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-dim)' }}>
              {translatingSentences.done}/{translatingSentences.total} sentences
            </span>
            <button onClick={cancelSentenceTranslation} className="text-[10px] font-bold underline" style={{ color: 'var(--color-red)' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Non-punitive OCR quality note. OCR output is a draft the learner verifies;
          a low mean word-confidence means the scan came out poorly. Never blames
          the learner; points at tap-to-check + retake — and, with a vision key,
          highlights "Sharper read" exactly when the free read was rough (Fork 3A). */}
      {ocrConfidence !== null && ocrConfidence < 70 && ocrSource !== 'vision' && (
        <div className="rounded-xl p-2.5 text-xs" aria-live="polite" data-testid="ocr-blurry-note"
          style={{ background: 'rgba(255,193,7,0.12)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
          This photo came out a bit blurry — some words may be wrong. Tap a word to check, or retake the photo for a cleaner read.
          {visionReady && (
            <button onClick={requestSharperRead} data-testid="sharper-read-nudge"
              className="mt-2 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-purple)', color: '#fff' }}>
              <Sparkles size={12} /> Try a sharper read — uploads to {visionLabel}
            </button>
          )}
        </div>
      )}

      {/* Provenance banner (Fork 5): a vision read has no per-word confidence —
          this doc-level draft framing replaces the Tesseract cues. Reveal-gating
          and tap-to-check stay the verification path. */}
      {ocrSource === 'vision' && (
        <div className="rounded-xl p-2.5 text-xs flex items-center gap-2" aria-live="polite" data-testid="vision-provenance"
          style={{ background: 'color-mix(in srgb, var(--color-purple) 12%, transparent)', color: 'var(--color-text)', border: '1px solid var(--color-purple)' }}>
          <Sparkles size={14} style={{ color: 'var(--color-purple)', flexShrink: 0 }} />
          <span>Sharper read by {visionProvider} — still a draft. Tap any word to check.</span>
        </div>
      )}

      {/* Sharper-read failure — friendly, dismissible, never blanks the free read. */}
      {visionError && (
        <div className="rounded-xl p-2.5 text-xs flex items-start gap-2" role="status" aria-live="polite" data-testid="vision-error"
          style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <span className="flex-1">{visionError}</span>
          <button onClick={() => setVisionError(null)} aria-label="Dismiss" className="flex-shrink-0" style={{ color: 'var(--color-dim)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Auto-transcript provenance + replay (audio source). Whisper has no per-word
          confidence, so the honest framing is "this is an auto-transcript — replay to
          check anything that looks off". The <audio> lets the learner verify by ear. */}
      {audioUrl && pdfData && (
        <div className="rounded-xl p-2.5 text-xs flex flex-col gap-2" aria-live="polite" data-testid="asr-replay"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <span className="flex items-center gap-2">
            <Mic size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            This is an auto-transcript — replay the audio to check anything that looks off.
          </span>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {/* Translation panel */}
      {translation && (
        <div className="sticky top-[58px] z-20 rounded-xl p-3 animate-fadeUp"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
              {translation.heading || 'Translation'}
            </div>
            <button onClick={() => setTranslation(null)} style={{ color: 'var(--color-dim)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {translation.items.map((it, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                {it.src && (
                  <DictionaryIcon word={it.src} meaning={it.text} size={22} className="flex-shrink-0 mt-0.5" />
                )}
                {it.src && (
                  <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>{it.src}</span>
                )}
                {it.src && <span style={{ color: 'var(--color-dim)' }}>→</span>}
                <span style={{ color: sourceColor(it.source) }}>{it.text}</span>
                {it.src && it.source !== 'loading' && it.source !== 'info' && (
                  <button onClick={() => addToSelection([{ word: it.src, en: it.text, type: 'word' }])}
                    className="ml-auto" style={{ color: 'var(--color-green)' }} title="Add to selection">
                    <Plus size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {showCompare && translation.items.length === 1 && translation.items[0].src && (
            <div className="mt-2 flex gap-3 text-[10px]">
              {translation.items[0].source !== 'deepl' && health.deepl && (
                <a href={getDeepLCompareUrl(translation.items[0].src)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1" style={{ color: 'var(--color-blue)' }}>
                  Compare on DeepL <ExternalLink size={10} />
                </a>
              )}
              {translation.items[0].source !== 'google' && (
                <a href={getGoogleCompareUrl(translation.items[0].src)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1" style={{ color: 'var(--color-orange)' }}>
                  Compare on Google <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compositional teaching moment — how the grouped words combine */}
      {compound && (
        <div className="rounded-xl p-3 animate-fadeUp"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-purple)' }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
              How the words combine
            </div>
            <button onClick={() => setCompound(null)} style={{ color: 'var(--color-dim)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {compound.parts.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="font-bold" style={{ color: 'var(--color-cyan)' }}>{p.w}</span>
                <span style={{ color: 'var(--color-dim)' }}>=</span>
                <span>{p.gloss}</span>
                {i < compound.parts.length - 1 && <span style={{ color: 'var(--color-dim)' }}>·</span>}
              </span>
            ))}
            <span style={{ color: 'var(--color-dim)' }}>→</span>
            <span className="inline-flex items-center gap-1">
              <span className="font-bold" style={{ color: 'var(--color-purple)' }}>{compound.phrase.w}</span>
              <span style={{ color: 'var(--color-dim)' }}>=</span>
              <span className="font-bold">{compound.phrase.gloss}</span>
            </span>
          </div>
        </div>
      )}

      {/* Selection bucket (Select mode) */}
      {selection.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)' }}>
          <div className="flex items-center gap-2 mb-2">
            <input value={deckName} onChange={(e) => setDeckName(e.target.value)}
              className="flex-1 px-2 py-1 rounded text-sm outline-none"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <button onClick={addSelectionToDeck}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
              style={{ background: 'var(--color-green)', color: 'var(--color-on-bright)' }}>
              <Plus size={12} /> Add {selection.length}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selection.map((s, idx) => {
              const next = selection[idx + 1]
              const canGroup = s.type === 'word' && next?.type === 'word'
                && Number.isFinite(s.index) && Number.isFinite(next.index)
                && Math.abs(s.index - next.index) === 1
              return (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px]"
                  style={{ background: s.type === 'phrase' ? 'color-mix(in srgb, var(--color-purple) 15%, transparent)' : 'rgba(0,230,118,0.15)',
                           color: s.type === 'phrase' ? 'var(--color-purple)' : 'var(--color-green)' }}>
                  {s.word}
                  {s.type === 'phrase' && (
                    <button onClick={() => ungroupChip(idx)} title="Ungroup into separate words" style={{ color: 'currentColor' }}>
                      <Unlink size={10} />
                    </button>
                  )}
                  {canGroup && (
                    <button onClick={() => groupChips(idx)} title="Group with next word into a phrase" style={{ color: 'currentColor' }}>
                      <Link size={10} />
                    </button>
                  )}
                  <button onClick={() => removeFromSelection(idx)} style={{ color: 'currentColor' }}>
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Claim 6 — dense-page nudge. The reveal-gate is a desirable difficulty
          only when the text is within reach; on a demonstrably too-hard page it
          should EASE, not block a floundering beginner. Non-punitive: try-first
          framing, one tap to reveal, dismissible (per-document). */}
      {showDenseNudge && (
        <div
          role="status"
          aria-live="polite"
          data-testid="dense-page-nudge"
          className="rounded-2xl p-4 mb-4 flex items-start gap-3 animate-fadeUp"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-cyan)' }}
        >
          <Languages size={18} style={{ color: 'var(--color-cyan)', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">This page has a lot of new words.</p>
            <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>
              Want the {isEn ? 'Malay' : 'English'} shown as you read? You&rsquo;ll still see the {isEn ? 'English' : 'Malay'} first — revealing is never failure.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={acceptDenseHelp}
                data-testid="dense-nudge-accept"
                className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                style={{ background: 'var(--color-cyan)', color: 'var(--color-on-bright)' }}
              >
                <Eye size={12} /> Show {isEn ? 'Malay' : 'English'} as I read
              </button>
              <button
                onClick={dismissDenseNudge}
                data-testid="dense-nudge-dismiss"
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                No, I&rsquo;ll try first
              </button>
            </div>
          </div>
          <button
            onClick={dismissDenseNudge}
            aria-label="Dismiss"
            className="flex-shrink-0"
            style={{ color: 'var(--color-dim)' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pages — Layout view (faithful render) or Reflow view (simple text) */}
      {view === 'layout' ? (
        <div {...pinch.handlers} className="select-none" style={{ touchAction: 'pan-y' }}>
          {/* Live CSS scale during a pinch (smooth); LayoutView re-renders crisp on settle. */}
          <div style={pinch.liveStyle}>
            <LayoutView doc={pdfDoc} onTokens={setLayoutTokens} selIdx={selIdx} zoom={pinch.zoom}
              glossByIndex={glossByIndex} glossState={glossState} addedGloss={addedGloss}
              onRevealGloss={revealGloss} onAddGloss={addGloss} />
          </div>
        </div>
      ) : (
      <div
        data-testid="reader-reflow"
        data-guide="pdf-reading"
        role="group"
        aria-label="Document reader — arrow keys move between words, Enter reveals the meaning"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Shift+ArrowLeft Shift+ArrowRight A Escape"
        onKeyDown={handleReaderKeyDown}
        onPointerDown={sel.onPointerDown}
        onPointerMove={sel.onPointerMove}
        onPointerUp={sel.onPointerUp}
        onPointerCancel={sel.onPointerCancel}
        onContextMenu={sel.onContextMenu}
        className="space-y-4 select-none"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Polite announcements for keyboard actions (F7): reveal text /
            "Added X to deck" / "Selecting N words". sr-only, zero layout. */}
        <FeedbackLive text={kbAnnounce} />
        {tokenized.pages.map((page) => (
          <div key={page.pageNum} className="rounded-2xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="text-[10px] font-bold mb-2" style={{ color: 'var(--color-dim)' }}>
              Page {page.pageNum}
            </div>
            {page.paragraphs.map((parts, pi) => {
              // Sentence cue/block anchors for this paragraph (only when Sentence
              // mode is on and the doc isn't English — otherwise the word path is untouched).
              const sd = sentenceMode && !sentenceDisabled
                ? sentenceData.byPara.get(`${page.pageNum}:${pi}`)
                : null
              return (
              <p key={pi} className="text-sm leading-relaxed mb-3 last:mb-0">
                {parts.map((p, pix) => {
                  if (p.kind === 'space') return <span key={pix}>{p.text}</span>
                  // Sentence cue at the sentence's start; inline slide-down block at its end.
                  const cueS = sd?.cueByPart.get(pix)
                  const blockS = sd?.blockByPart.get(pix)
                  const cueRevealed = cueS && isSentenceRevealed(sentenceReveal, cueS.sentenceId)
                  // Ladder (Option F): does this sentence's simpler-Malay rung have
                  // content (in flight or parsed ok)? Drives where the block renders —
                  // the Malay rung is always inline (F7); sheet pref governs English only.
                  const cueMalayRung = ladder && cueS
                    && (pendingSimplify.has(cueS.sentenceId) || !!sentenceSimplify[cueS.sentenceId]?.text)
                  const blockEntry = ladder && blockS ? sentenceSimplify[blockS.sentenceId] : undefined
                  const blockMalayRung = ladder && blockS
                    && (pendingSimplify.has(blockS.sentenceId) || !!blockEntry?.text)
                  const sentenceCue = cueS
                    ? (cueRevealed
                        ? (sentenceRenderPref === 'sheet' && !cueMalayRung
                            ? <SentenceReveal revealed render="sheet" revealLabel={revealLabel} onCollapse={() => collapseSentence(cueS)} />
                            : null)
                        : <SentenceReveal revealed={false} revealLabel={revealLabel} simplified={ladder ? null : undefined}
                            onReveal={() => revealSentenceHandler(cueS)} />)
                    : null
                  const sentenceBlock = (blockS
                    && (sentenceRenderPref === 'inline' || blockMalayRung)
                    && isSentenceRevealed(sentenceReveal, blockS.sentenceId))
                    ? (
                      <SentenceReveal
                        revealed render={sentenceRenderPref}
                        revealLabel={revealLabel}
                        translation={sentenceGloss[blockS.sentenceId] || null}
                        pending={pendingSentences.has(blockS.sentenceId)}
                        hasUnknowns={sentenceUnknownsById.has(blockS.sentenceId)}
                        addedUnknowns={addedSentenceUnknowns.has(blockS.sentenceId)}
                        onCollapse={() => collapseSentence(blockS)}
                        onAddUnknowns={() => addUnknownsFromSentence(blockS)}
                        {...(ladder ? {
                          simplified: blockEntry?.text ? blockEntry : null,
                          simplifyPending: pendingSimplify.has(blockS.sentenceId),
                          simplifyFailed: !!blockEntry?.failed,
                          englishShown: englishShownSentences.has(blockS.sentenceId),
                          onShowEnglish: () => showEnglishHandler(blockS),
                          onHideEnglish: () => hideEnglishHandler(blockS),
                        } : {})}
                      />
                    )
                    : null

                  if (p.kind === 'punct') {
                    return <span key={pix}>{sentenceCue}{p.text}{sentenceBlock}</span>
                  }
                  const c = tokenColor(p.text)
                  const selType = selIdx.get(p.i)
                  const isPhrase = selType === 'phrase'
                  const gloss = glossByIndex.get(p.i)
                  // Keyboard layer: roving focus + Shift+Arrow range highlight.
                  const inKbRange = kbRange && p.i >= kbLo && p.i <= kbHi
                  const revealedMeaning = gloss && isRevealed(glossState, p.i) ? gloss.display : null
                  // OCR low-confidence cue (core-safe, by surface string): a soft
                  // "check me" dotted underline on words the scan read uncertainly.
                  const lowConf = lowConfTokens.size > 0 && lowConfTokens.has(normalizeWord(p.text))
                  // Inside a revealed sentence the sentence supplies meaning → suppress
                  // the per-word gloss cue (avoids double-hand-over + clutter, S4).
                  const dimWordGloss = revealedSentenceTokens.has(p.i)
                  return (
                    <span key={pix} className="inline">
                      {sentenceCue}
                      <span data-token-i={p.i}
                        id={`tok-${p.i}`}
                        tabIndex={p.i === kbActiveIndex ? 0 : -1}
                        title={isPhrase ? 'grouped phrase' : selType ? 'selected' : lowConf ? 'Low-confidence scan — tap to check' : undefined}
                        // Label ONLY when the token carries state (D2) — otherwise the
                        // word itself is the announcement, keeping browse-mode reading clean.
                        aria-label={isPhrase ? `${p.text} — grouped phrase`
                          : selType ? `${p.text} — selected word`
                          : revealedMeaning ? `${p.text} — ${revealedMeaning}`
                          : lowConf ? `${p.text} — low-confidence scan, check this word`
                          : undefined}
                        className="cursor-pointer rounded px-0.5 hover:bg-white/10"
                        style={{
                          color: c || undefined,
                          // selection background is a separate layer from the vocab text colour
                          background: selType
                            ? (isPhrase ? 'color-mix(in srgb, var(--color-purple) 24%, transparent)' : 'var(--color-accent-subtle)')
                            : inKbRange ? 'var(--color-accent-subtle)' : undefined,
                          // non-colour cue so a grouped unit reads as one even without colour (a11y)
                          borderBottom: isPhrase ? '2px solid var(--color-purple)' : undefined,
                          // OCR low-confidence: a subtle dotted underline (independent of
                          // the phrase border above) marking a word the scan read uncertainly.
                          textDecoration: lowConf ? 'underline dotted' : undefined,
                          textDecorationColor: lowConf ? 'var(--color-dim)' : undefined,
                        }}>
                        {p.text}
                      </span>
                      {gloss && !dimWordGloss && (
                        <DocGloss
                          gloss={gloss}
                          revealed={isRevealed(glossState, p.i)}
                          added={addedGloss.has(gloss.malay)}
                          onReveal={() => revealGloss(p.i)}
                          onAdd={() => addGloss(gloss)}
                        />
                      )}
                      {sentenceBlock}
                    </span>
                  )
                })}
              </p>
              )
            })}
          </div>
        ))}
      </div>
      )}

      {/* Sentence translations panel (Settings → 'Bottom panel' render). Floats just
          above the bottom nav; shows every revealed sentence so you still anchor on
          the Malay. Machine-translated — a comprehension guide, not authoritative. */}
      {revealedSentencesList.length > 0 && (
        <div className="fixed left-0 right-0 z-40 max-h-[42vh] overflow-y-auto px-3 py-2 shadow-2xl"
          style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))',
                   background: 'var(--color-card)', borderTop: '2px solid var(--color-cyan)' }}>
          <div className="flex items-center justify-between mb-1 max-w-[880px] mx-auto">
            <span className="text-[10px] font-bold uppercase flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
              <Languages size={11} /> Sentence translations · machine
            </span>
            <button onClick={hideAllSentencesHandler} aria-label="Hide all sentence translations" style={{ color: 'var(--color-dim)' }}>
              <X size={14} />
            </button>
          </div>
          <div className="max-w-[880px] mx-auto space-y-1.5">
            {revealedSentencesList.map(s => (
              <div key={s.sentenceId} className="pb-1.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="text-xs" style={{ color: 'var(--color-dim)' }}>{s.text}</div>
                {ladder && sentenceSimplify[s.sentenceId]?.failed && (
                  <div className="text-[0.72em]" style={{ color: 'var(--color-dim)' }}>
                    Couldn’t simplify — showing English
                  </div>
                )}
                <div className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text)' }}>
                  <span className="flex-1">
                    {pendingSentences.has(s.sentenceId) ? '…' : (sentenceGloss[s.sentenceId]?.text || '…')}
                  </span>
                  {sentenceUnknownsById.has(s.sentenceId) && (
                    <button onClick={() => addUnknownsFromSentence(s)}
                      disabled={addedSentenceUnknowns.has(s.sentenceId)}
                      className="inline-flex items-center gap-0.5 text-[0.78em] font-bold rounded px-1 py-0.5 flex-shrink-0"
                      style={{ color: addedSentenceUnknowns.has(s.sentenceId) ? 'var(--color-green)' : 'var(--color-accent)', border: '1px solid currentColor' }}
                      title="Add the unknown words from this sentence to your deck">
                      {addedSentenceUnknowns.has(s.sentenceId) ? <><Check size={11} /> Added</> : <><Plus size={11} /> Add words</>}
                    </button>
                  )}
                  <button onClick={() => collapseSentence(s)} aria-label="Hide this sentence" className="flex-shrink-0" style={{ color: 'var(--color-dim)' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip footer */}
      <div className="text-[11px] py-3" style={{ color: 'var(--color-dim)' }}>
        <span className="font-bold">Tips:</span>{' '}
        Tap a word for a single translation · drag to select each word individually ·
        right-click + drag (or flip the Group toggle, then drag) groups them into one phrase
        (e.g. jam tangan = watch) · on phone, use the Group toggle or the link button on a chip ·
        hyphenated words (e.g. jam-tangan) count as one · use Volume on the translation panel to hear it
        {view === 'layout'
          ? ' · Layout shows the page exactly as it looks (columns, tables, diagrams) — pinch or double-tap to zoom'
          : ' · switch to Layout to see the page exactly as it looks (columns, tables, diagrams)'}
        <button onClick={clearPdf} className="ml-3 inline-flex items-center gap-1 underline" style={{ color: 'var(--color-red)' }}>
          <Trash2 size={11} /> Clear PDF
        </button>
        {translation && translation.items[0]?.src && (
          <button onClick={() => speak(translation.items[0].src)} className="ml-3 inline-flex items-center gap-1 underline">
            <Volume2 size={11} /> Speak last word
          </button>
        )}
      </div>

      {/* One-time upload consent (Fork 4A): the FIRST Sharper read asks plainly;
          "Don't ask again" persists (store v30). Honest about the one privacy
          difference from the free path — the page leaves the device. */}
      {showVisionConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-labelledby="vision-consent-title" data-testid="vision-consent"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowVisionConsent(false) }}>
          <div className="rounded-2xl p-5 w-full max-w-sm animate-fadeUp"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)',
                     boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <h3 id="vision-consent-title" className="text-sm font-bold mb-2 flex items-center gap-2">
              <Sparkles size={16} style={{ color: 'var(--color-purple)' }} /> Sharper read uploads this page
            </h3>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text)' }}>
              This sends your photo to <span className="font-bold">{visionLabel}</span> using your own key.
              It leaves your device — the free read never does.
            </p>
            <p className="text-[11px] mb-3" style={{ color: 'var(--color-dim)' }}>
              Uses your provider’s free tier — typically no cost.
            </p>
            <label className="flex items-center gap-2 text-xs mb-4 cursor-pointer select-none">
              <input type="checkbox" checked={visionDontAsk}
                onChange={(e) => setVisionDontAsk(e.target.checked)} />
              Don’t ask again
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowVisionConsent(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                Not now
              </button>
              <button autoFocus onClick={confirmVisionConsent}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'var(--color-purple)', color: '#fff' }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
