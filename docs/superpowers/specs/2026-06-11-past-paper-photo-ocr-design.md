# Study from a past-paper photo or scan — Phase 1 (free on-device OCR)

**Status:** Design approved (diverge + adversarial research done) — ready for an Implementation session.
**Date:** 2026-06-11
**Session type:** Design & Research (no production code).
**Plan:** `docs/superpowers/plans/2026-06-11-past-paper-photo-ocr.md`
**Builds on (do NOT redesign):** `src/pages/PDFReader.jsx`, `src/lib/pdf.js`, `src/lib/translateDocument.js`, `src/lib/docGlossState.js`, `src/lib/unknownDensity.js`, the FSRS card-add path.
**Invariants honoured:** NO paywall (the free OCR path needs zero keys); individual-revision only; no native apps (web/WASM OCR only); Malay AND English. See `[[project_invariants]]`, `[[project_multimodal_direction]]`.

---

## 1. Problem & who it's for

Past papers and worksheets are the **#1 IGCSE revision resource**, and most students have them as **photos or scans**, not clean digital PDFs. The app's reader pipeline (reveal-gated word glosses → FSRS cards, comprehension, density nudge) is the best surface we have for turning *any* Malay/English text into study material — but it can only ingest a PDF that already has a **selectable text layer**. A photographed page, or an image-only/scanned PDF, currently dead-ends: the reader shows nothing to tap.

**User:** an IGCSE Malay (0546) or English (0500/0510) student, on a phone, who snaps a picture of a past-paper reading passage or worksheet and wants to *study it the same way they study a PDF* — tap unknown words, build flashcards, run comprehension, get the density nudge if it's too hard.

**Job-to-be-done:** "Turn this photo of a page into tappable, studyable text inside the reader I already use — for free, privately, even offline."

---

## 2. Scope

### In scope (Phase 1)
1. **Ingest an image** (`image/*` — JPEG/PNG/WebP) from file pick, drag-drop, or **camera capture** on mobile.
2. **Ingest an image-only / scanned PDF** (a PDF whose text layer is empty) — detect it and offer OCR instead of a blank reader.
3. **Free, on-device OCR** (Tesseract.js, WASM) → produce the **exact `{pages:[{pageNum,text,paragraphs}]}` shape** the reader already consumes, so the whole downstream pipeline (tokenise → gloss → density nudge → FSRS) runs **untouched**.
4. **Honest quality handling:** OCR output is a *draft the learner verifies*. Show a non-punitive note when a scan came out poorly (mean word-confidence low); mark low-confidence words with the existing `unverified` cue; offer a one-tap "retake / choose another."
5. **Capture guidance + privacy reassurance** on the entry card.
6. **Page types:** **printed prose + linear printed questions** (typeset past-paper passages). The reflow view is the path (images have no `pdfDoc` to canvas-render, and reflow is the gloss/FSRS path anyway).

### Explicitly parked (with one-line "why later")
- **Handwriting** — Tesseract is trained on printed fonts; accuracy is poor by design. Belongs to the Phase 2 BYOK-vision rung.
- **Tables / multi-column layout reconstruction** — layout reconstruction is hard and low-value for the gloss→FSRS path; linear text is what we need.
- **BYOK vision OCR** (Gemini/GPT-4o-class via the instruct router) — the optional **quality rung** for messy photos/handwriting; needs an image-parts extension to the instruct seam (today text-only). Phase 2. (Cheap — Gemini Flash ≈ $0.0006/image — but it uploads the image, so it must disclose and stay opt-in.)
- **Inline OCR-text correction editor** — Phase 1 relies on tap-to-check + retake. A full editable-transcript step is Phase 1.5 if usage shows it's needed.
- **Answer-key extraction / auto-grading from a marked paper** — separate epic.

---

## 3. Options considered → chosen, per load-bearing decision

### (a) OCR engine — free on-device vs BYOK vision
| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Tesseract.js (WASM), on-device** | Free (no key), **offline after first load**, **image never leaves device** (privacy), no instruct-seam change, Apache-2.0 | 80–90% on phone photos, weak on handwriting/tables, 2–20 s/page on old phones | **CHOSEN for Phase 1** |
| B. BYOK vision LLM (Gemini/OpenRouter) | ~98% printed, robust on mess/handwriting/tables, cheap/call | Needs a key (can't be the *only* path — no-paywall), uploads the image, needs an **image-parts seam extension** | **Phase 2 quality rung** |
| C. Cloud OCR service (Google Vision etc.) | High accuracy | Server, cost on the owner, privacy, against invite-only/no-backend-spend posture | Rejected |

**Why A first:** no-paywall *requires* a free path to exist, so Tesseract.js is mandatory regardless; it ships value with zero new infra and the strongest privacy story; Malay's Latin (Rumi) script means its accuracy tracks the strong English LSTM model, not weak non-Latin low-resource languages. B is strictly additive later.

### (b) Page types first
**Chosen:** printed prose + linear printed questions. Park tables + handwriting (see §2). Matches (a) — Tesseract's sweet spot and the reader's gloss/FSRS need.

### (c) How extracted text feeds the reader — *core untouched*
| Option | Verdict |
|---|---|
| **C1. New `src/lib/ocr.js` emits the identical `{pages}` shape; `PDFReader.handleFile` branches on file type → same `setPdfData({pages})`** | **CHOSEN** — surgical, the core never learns OCR exists |
| C2. A separate "Scan" route/page | Rejected — duplicates the reader; redesigns a surface we were told to build on |
| C3. Feed OCR into Import (word list) | Rejected — loses reveal-gating + comprehension; the kickoff says feed the *reader* |

**Verified from code:** `PDFReader` consumes `pdfData.pages[].paragraphs`; `tokenized` → `glossByIndex` → density nudge → FSRS all key off that. So OCR is simply **an alternative producer of `{pages}`**. Image-sourced docs have **no `pdfDoc`** → force the **reflow** view and gate the Layout toggle on `pdfDoc` (Layout needs `getViewport/render`).

### (d) Licensing / privacy
- **License:** Tesseract engine + tessdata (`msa`, `eng`) = **Apache-2.0** → safe to self-host/ship.
- **Privacy:** on-device OCR ⇒ **the image is never sent over the network** in the free path. **Self-host** the WASM core + worker + `tessdata_fast` under our origin (no third-party CDN sees a request, and it works offline). **Never persist or sync the raw image** (text only — matches the no-image-in-cloud-blob posture). The BYOK-vision rung (Phase 2) uploads to the user's chosen provider and must say so.
- **Copyright:** the learner supplies their own page for personal revision — same posture as today's user-supplied PDF import. Add a light reassurance line, not a legal gate.

---

## 4. Architecture

Mirror the **proven testability pattern of `translateDocument.js`**: pure orchestration with an **injected** engine, so all logic is unit-tested without WASM.

### 4.1 New pure module — `src/lib/ocr.js` (no DOM, no network, no WASM)
```
paragraphsFromOcrText(text) -> string[]
    Split a Tesseract text blob into paragraphs: break on blank lines (2+ \n),
    collapse single \n to spaces, trim, drop empties. (Tesseract separates
    blocks with a blank line.)

pagesFromOcrResults(results) -> { pages: [{ pageNum, text, paragraphs }] }
    results: Array<{ text, meanConfidence? }>  (one per source image / PDF page)
    Produces the EXACT shape of extractTextFromDoc() in src/lib/pdf.js.

meanConfidence(blocks) -> number   // 0..100, NaN-safe; mean over words
isImageOnlyPdf(pages) -> boolean
    True when total non-space text across pages < OCR_PDF_TEXT_FLOOR (e.g. 16
    chars) while pages.length > 0  → a scanned PDF with no text layer.

runOcr(images, { recognize, onProgress, signal, ... }) -> { pages, meanConfidence }
    Orchestration ONLY. `recognize` is INJECTED (unit tests pass a fake).
    - sequential over images (one Tesseract worker; OCR is memory-heavy)
    - aggregate progress 0..1 across images; onProgress({ done, total, ratio })
    - AbortSignal cancels between/within images; partial result is returned
      (cancelled ≠ errored)
    - a failed image yields an empty page + flag, never throws the whole run
```
Constants exported (testable, tunable): `OCR_PDF_TEXT_FLOOR`, `LOW_CONFIDENCE = 70` (word-confidence below which a word gets the `unverified` cue).

### 4.2 New impure boundary — `src/lib/ocrEngine.js` (lazy, WASM)
```
createOcrRecognizer({ langs = ['msa'], onProgress }) -> {
    recognize(image) -> { text, meanConfidence, words?:[{text,bbox,confidence}] },
    terminate()
}
```
- **Lazy:** `await import('tesseract.js')` inside this module so it is **never in the eager bundle** (like `driver.js`/`pdf`).
- **Self-hosted paths:** `corePath`/`workerPath` → tesseract.js-core + worker under `public/ocr/`; `langPath` → `public/ocr/lang/` (`tessdata_fast` `msa`/`eng`, gzipped). `cacheMethod:'write'` (IndexedDB cache → offline after first run). `oem: 1` (LSTM only — smaller, no legacy data).
- **Worker reuse:** one cached worker per language set; `terminate()` on reader clear/unmount to free memory.
- Pin **tesseract.js 7.x** (latest 7.0.0; core 6.1.2). **Verify the `createWorker(langs, oem, options)` signature + default `langPath` against context7 at implementation** — the v4→v5 async-init change means the signature must be confirmed for v7.

### 4.3 PDFReader wiring (surgical — read the whole file first)
- **Entry card + toolbar `accept`:** widen to `application/pdf,image/*`; add a **"Take a photo"** affordance (second hidden `<input type="file" accept="image/*" capture="environment">`) so mobile opens the rear camera. Update copy: *"Drop a PDF or photo, or take a picture."*
- **Capture guidance + privacy** on the entry card: *"📸 Fill the frame · good light · hold the page flat"* and *"Read on your device — your photo is never uploaded."*
- **`handleFile(file)` branch on `file.type`:**
  - `application/pdf` → existing `loadPdf`+`extractTextFromDoc`; **if `isImageOnlyPdf(pages)`** → show a non-punitive offer *"This PDF has no selectable text — read it with OCR?"*; on accept, rasterise each page (`page.render` → canvas, ~2× scale) → `runOcr(canvases)` → `setPdfData({pages})`.
  - `image/*` → `runOcr([file])` → `setPdfData({pages})`; `pdfDoc` stays `null` → `setView('reflow')`.
- **OCR progress state** (OCR is slow): an `aria-live` progress bar fed by the Tesseract logger (`ratio` 0..1) + *"Reading your page… you can cancel"* + a **Cancel** button (abort). Reuse the existing translating-progress styling.
- **Quality note (non-punitive):** after OCR, if `meanConfidence < LOW_CONFIDENCE`, show a dismissible banner: *"This photo came out a bit blurry — some words may be wrong. Tap a word to check, or retake the photo for a cleaner read."*
- **Low-confidence word cue:** thread per-word confidence into the gloss layer so words below `LOW_CONFIDENCE` carry the **existing `unverified` marker** (no new visual language).
- **Layout toggle gate:** render the Layout button + `view==='layout'` branch only when `pdfDoc` is non-null; `switchView('layout')` is a no-op without a `pdfDoc`.
- **Recents:** `addPdfRecent` already stores `{name, sizeKB, pages}`; add `kind:'image'|'pdf'` so the recents list can show a 📷 vs 📄 hint (optional, low-priority).
- **Synergy (free):** OCR text flows into the **same reveal-gated reader**, so the **density nudge** (shipped today) and reveal-gating apply automatically — a dense OCR'd page already eases itself.

### 4.4 Assets / build
- `public/ocr/`: `tesseract-core.wasm`, `tesseract-core-fallback.wasm` (or the v7 single-thread/SIMD variant the worker selects), `worker.min.js`; `public/ocr/lang/`: `msa.traineddata.gz`, `eng.traineddata.gz` (from `tessdata_fast`).
- Decide **commit-the-binaries vs a `postinstall`/build copy step** at implementation (default: a small `scripts/copy-ocr-assets.mjs` run in `prebuild`, mirroring how PDF/worker assets are handled, to avoid committing multi-MB binaries — verify what the repo prefers).
- Ensure the PWA service worker (`vite-plugin-pwa`) **caches `public/ocr/**`** for offline OCR.

---

## 5. Decision log

| # | Decision | Evidence (source · grade) | Confidence | Changes my mind |
|---|---|---|---|---|
| D1 | Free path = **Tesseract.js on-device**; BYOK vision is Phase 2 | No-paywall invariant + Apache-2.0 + privacy; Latin-script transfer (Wikipedia/tessdata) · High | High | If Tesseract Malay-printed accuracy on real fixtures <~80% even when clean |
| D2 | **Printed prose only** in Phase 1; park handwriting | Multiple practitioner + docs sources: Tesseract handwriting "poor by design" (Medium/Tesseract docs) · High | High | — |
| D3 | OCR is a **draft the learner verifies**, never silent-trusted; low-confidence → `unverified` cue | Phone-photo accuracy 80–90% (DEV/Medium consensus) + app's existing grounding ethos · High | High | — |
| D4 | **No heavy preprocessing** (no OpenCV.js); rely on Tesseract's internal Otsu + capture guidance | Tesseract docs/autbor: binarises internally, pre-processing can *worsen* results · High | High | If real fixtures show deskew/upscale is the dominant lever — add a light canvas upscale only |
| D5 | **`{pages}` shape seam** (`src/lib/ocr.js`), `handleFile` branches — core untouched | Read of `PDFReader.jsx` + `pdf.js` (`extractTextFromDoc` shape) · High | High | — |
| D6 | **Self-host** WASM + `tessdata_fast` under `public/ocr/`; never CDN the image | tesseract.js local-install docs + offline/privacy invariant · High | High | If self-hosted asset size is unacceptable → fall back to CDN with an offline caveat |
| D7 | Images use **reflow only**; gate Layout on `pdfDoc` | Code: `LayoutView doc={pdfDoc}` needs a live doc · High | High | — |
| D8 | **Never persist/sync the raw image** (text only) | Privacy + existing no-image-in-blob posture · High | High | — |
| D9 | Pin **tesseract.js 7.x**, LSTM-only (`oem:1`), `cacheMethod:'write'` | npm (latest 7.0.0) + context7 API · High | Med | Verify v7 `createWorker` signature at implementation |
| D10 | Lazy-import the engine; **eager `index` bundle unchanged** | Code-splitting convention (CLAUDE.md) · High | High | — |

---

## 6. Open questions for Kheshav (product calls — defaults chosen, veto any)

| # | Question | Default (decide-and-flag) | Why |
|---|---|---|---|
| Q1 | Phase 1 = **read-only OCR into the reader** (tap-to-check + retake), or include an **inline correction editor**? | **Read-only + retake**; editor = Phase 1.5 | Keeps scope tight; tap-to-check already catches errors via reveal-gating |
| Q2 | OCR language: **MS/EN toggle (default Malay)**, auto-detect, or `msa+eng` combined? | **Toggle, default Malay** (mirrors Roleplay/Speaking toggles) | Multi-lang OCR is slower + less accurate; app is Malay-first |
| Q3 | Tesseract assets: **self-host** (offline + privacy, +served MB) or CDN? | **Self-host** | Offline-first + privacy invariants; no CDN rotation risk |
| Q4 | Image-only PDF → **detect + offer OCR** (one tap) or require an explicit toggle? | **Detect + offer** (never auto-run; OCR is slow) | Avoids a blank reader without a surprise long compute |
| Q5 | Preprocessing: **none** (rely on Tesseract + capture tips) or a **light canvas upscale** for small images? | **Upscale-only if the image is small**, else none | Cheap, no dep; avoids the "preprocessing can hurt" trap |
| Q6 | Multi-page scanned PDF in Phase 1: **all pages** or **cap at N** with a "more" control? | **Cap at 10 pages** in one run, with a logged note (no silent truncation) | Bounds worst-case mobile latency/memory |

---

## 7. Measurable acceptance criteria (the "done" bar)

**Functional**
- F1. A photographed **clean printed Malay** fixture produces reader text where the **expected content words tokenise and are tappable**, and **add-to-FSRS works unchanged** (proven by an e2e: OCR fixture → tap word → assert card added to the 'PDF'/Mistakes deck path).
- F2. An **image-only PDF** fixture is **detected** (`isImageOnlyPdf` true) and the OCR offer appears instead of a blank reader.
- F3. A **digital (text-layer) PDF** still uses the existing path — **zero behaviour change** (existing 65 PDF e2e stay green).

**Quality (measurable on controlled fixtures)**
- Q-ACC. On a generated clean-printed fixture with **known ground-truth text**, OCR **word accuracy ≥ 90%** (computed in-test as 1 − word-error-rate). **Scope honesty:** the synthetic fixture is crisp digital text rasterised to pixels, so this is a **pipeline-correctness floor** (does OCR → `{pages}` → tokens → tappable actually work end-to-end), *not* a measurement of real-world phone-photo accuracy — which is inherently 80–90% (§3) and can only be judged post-ship on real photos. Treat the field number as a manual post-launch check, not a CI gate.
- Q-CONF. A deliberately **blurry fixture** triggers the low-confidence note (`meanConfidence < 70`) and at least one word carries the `unverified` cue.

**Non-functional**
- N1. **No-paywall:** the full OCR path works with **zero keys configured** (assert in e2e with an empty key state).
- N2. **Privacy:** in the free path, **the image is never sent over the network** (assert no network POST of image data; only `public/ocr/**` asset fetches).
- N3. **Bundle:** eager `index-*.js` **unchanged (±0 KB)**; the OCR engine + WASM load lazily; the new lazy chunk size is recorded in `RESUME_HERE`.
- N4. **Performance/UX:** progress UI appears <1 s after OCR start; **Cancel** aborts cleanly; OCR runs in a **web worker** (main thread not blocked — UI stays responsive).
- N5. **Offline:** after one online OCR run, a second run **works offline** (traineddata cached; assets SW-cached).
- N6. **A11y + theme:** progress is `aria-live`; controls keyboard-reachable; **light + dark** both correct.
- N7. **Core untouched:** the diff shows **no edits** to `fsrs.js`, the dictionary, or the gloss-core grounding logic.

---

## 8. Test plan (TDD: pure logic first)

**Unit (no WASM) — `src/lib/ocr.test.js`:**
- `paragraphsFromOcrText`: blank-line splitting, single-\n collapse, trim, empty/garbage input.
- `pagesFromOcrResults`: shape equals `extractTextFromDoc` output; multi-image → multi-page.
- `isImageOnlyPdf`: empty-text-layer PDF → true; normal → false; boundary at `OCR_PDF_TEXT_FLOOR`.
- `meanConfidence`: NaN-safe, empty blocks → 0/NaN handled.
- `runOcr` (injected fake `recognize`): sequential order, progress aggregation, abort mid-run returns partial, one image throwing doesn't kill the run.

**Fixtures — `scripts/gen-ocr-fixtures.mjs`** (reuse the `sharp` dev-dep + the existing `scripts/gen-fixtures.mjs` pattern): render known Malay/English printed text to a **clean PNG** and a **blurred PNG** with the ground-truth text recorded alongside.

**e2e — `tests/e2e/past-paper-ocr.spec.js`:**
- Happy path: upload clean fixture → progress → recognised text contains expected words → tap word → FSRS add (F1, Q-ACC).
- Image-only PDF detection + offer (F2).
- Digital PDF unchanged (F3 — and the existing PDF e2e suite stays green).
- Blurry fixture → low-confidence note + `unverified` cue (Q-CONF).
- **Go-wild:** non-image file, 20 MB image, cancel mid-OCR, theme-swap mid-OCR, rotate-device, rapid replace, offline second run, garbage/blank image → graceful empty state (never a crash or a silent hang).

**Eyeball:** light + dark, mobile viewport (390×844), the camera-capture affordance on a real phone if possible.

---

## 9. Risks & mitigations
- **R1 — Malay-printed accuracy underwhelms on real photos.** Mitigation: the verify-don't-trust framing (D3) means even 85% is *useful* (tap-to-check); capture guidance lifts quality; BYOK vision (Phase 2) is the escape hatch. The Q-ACC fixture test makes the number visible, not assumed.
- **R2 — Mobile latency (2–20 s/page).** Mitigation: web-worker (non-blocking) + progress + cancel + page cap (Q6); `tessdata_fast` (faster than `_best`).
- **R3 — Asset size bloats the served app.** Mitigation: lazy + self-host + SW cache + `tessdata_fast` gzipped; eager bundle unchanged (N3). If unacceptable, D6 fallback to CDN.
- **R4 — v7 API drift vs the v5 examples in docs.** Mitigation: D9 — confirm `createWorker` signature via context7 before wiring.
- **R5 — Image-only-PDF false positives** (a mostly-image PDF with a little text). Mitigation: `OCR_PDF_TEXT_FLOOR` is a *floor*, and the OCR offer is a non-destructive *offer*, not an auto-takeover.

---

## 10. Phase 2 preview (framed, NOT designed here)
- **BYOK vision rung:** extend the instruct seam with an **optional image-parts capability** (`callInstructVision({image, prompt})`) — Gemini native `inlineData` (base64) + OpenRouter `image_url`. Better on messy photos, handwriting, and tables; discloses the upload; opt-in. ~$0.0006/image (Gemini Flash).
- **Handwriting + tables**, **inline correction editor**, **answer-key extraction** — each its own scoped follow-up.

---

## 11. Sources (graded in §5)
- Tesseract.js accuracy / phone photos — DEV Community, Smashing Magazine, Tim Santeford, naptha/tesseract.js issues #515/#963.
- Handwriting weakness — José Ureña (Medium), Tesseract docs (ImproveQuality), Extend.ai PyTesseract guide.
- Preprocessing internal Otsu — autbor.com, Tesseract docs, freeCodeCamp.
- Malay/Latin-script transfer + license — tesseract-ocr/tessdata (Apache-2.0), Wikipedia (Tesseract), Debian `tesseract-ocr-msa`.
- Self-host/offline/mobile — tesseract.js local-installation + performance docs, ITNEXT offline-OCR, issue #101.
- BYOK vision cost/accuracy — Vellum (LLMs vs OCR 2026), Gemini API pricing, towardsai.
- API — context7 `/naptha/tesseract.js` (`createWorker`, `recognize`, word bbox+confidence, PSM); npm (`tesseract.js@7.0.0`, `tesseract.js-core@6.1.2`).
</content>
</invoke>
