# Sentence-level on-demand reveal — Implementation plan (2026-06-08)

Builds the approved spec `docs/superpowers/specs/2026-06-08-sentence-reveal-design.md`
(Scope A, reflow-first). Extends the shipped word-gloss layer with a **parallel
sentence-keyed path**. TDD: pure logic first, UI last, e2e to close. **Surgical diffs
only** — do NOT rewrite `PDFReader.jsx`; add alongside.

**All hook points verified against live code 2026-06-08** (file:line below).

---

## Verified hook points (no re-discovery needed)
- **Reflow token model** — `PDFReader.jsx:156` `tokenized` → `pages[].paragraphs`; each
  paragraph is a `parts` array from `splitParagraph` (`:31`): items are
  `{kind:'token', text, i}` / `{kind:'space', text}` / `{kind:'punct', text}`. **Punct parts
  carry the literal punctuation** → sentence boundaries are detectable here. Tokens carry the
  global index `i`.
- **Word-gloss reuse** — `DocGloss.jsx` (word cue + reveal + add); `docGlossState.js`
  (`createGlossState`/`isRevealed`/`revealToken`/`hideToken`/`setShowAll`/`hideAll`);
  `glossByIndex` map at `PDFReader.jsx:188` mirrors `selIdx`.
- **Volume-safe runner** — `translateDocument(words, {translateBatch, signal, onProgress, …})`
  in `translateDocument.js:146` is **word-agnostic** (takes any string list) → reuse verbatim
  for sentence strings. `chunkTexts` (`:50`), `backoffDelay` (`:69`).
- **Translate call** — `translateBatch(texts, from, to)` from `./translate.js` (used at
  `PDFReader.jsx:214`); IndexedDB-cached per text → sentence strings cache + resume for free.
- **Reflow render** — `PDFReader.jsx:740` `page.paragraphs.map((parts, pi) => <p>…</p>)`; each
  token span at `:751` (`data-token-i={p.i}`) with the `DocGloss` sibling at `:766`. This is
  where sentence cues + the slide-down block insert.
- **Toolbar** — `PDFReader.jsx:508–557` (Translate/Select, group toggle, "Translate page",
  "Show all", "List unknowns"). The "Sentences" toggle + its "Show all sentences" slot here.
- **Gesture isolation** — `useSelectionMode`/`usePinchZoom` (`:284–286`); DocGloss already
  `stopPropagation`s pointer+click (`DocGloss.jsx:19`) — mirror exactly.
- **Add-to-deck** — `addCards` (`PDFReader.jsx:81`), card payload shape at `:333`.

---

## What ships
1. `src/lib/sentenceModel.js` — pure: group a paragraph's `parts` into sentences.
2. `src/lib/sentenceRevealState.js` — pure reveal-state reducer (sentence ids).
3. `src/components/SentenceReveal.jsx` — the per-sentence cue + slide-down block.
4. `PDFReader.jsx` (reflow only) — wire: `sentenceMode` toggle, per-page sentence map,
   translate-sentences pass (reuse `translateDocument`), render cues + blocks, "show all
   sentences", dim word cues inside a revealed sentence, add-unknowns-from-sentence.
5. Tests: unit (`sentenceModel`, `sentenceRevealState`, payload) + e2e
   `tests/e2e/sentence-reveal.spec.js`.

---

## Steps (TDD order)

### Step 1 — `sentenceModel.js` (pure) + unit tests
`groupSentences(parts) → [{ sentenceId, partsRange, tokenIndices:[i…], text }]`:
- Walk `parts`; accumulate tokens/spaces/punct; **close a sentence** after a `punct` part whose
  text ends in `. ! ? …` (and the next non-space part starts a new one).
- A paragraph with **no** sentence-ending punctuation = **one** sentence (paragraph-fallback).
- `text` = the joined source string for translation; `tokenIndices` = global `i`s in the
  sentence (for "add unknowns" + dimming word cues); `sentenceId` = stable (e.g.
  `` `${pageNum}:${pi}:${firstTokenI}` ``).
- Tests: single sentence; multi-sentence paragraph; no-punctuation fallback; trailing/leading
  punct; ellipsis `…`; abbreviation false-positive is acceptable (documented limit); empty/
  whitespace paragraph → no sentence; hyphen/reduplication token kept whole.

### Step 2 — `sentenceRevealState.js` (pure) + unit tests
Mirror `docGlossState.js` exactly but keyed by `sentenceId`: `createState()`,
`isRevealed(state, id)`, `revealSentence`, `hideSentence`, `setShowAllSentences`, `hideAll()`.
Keep it a **separate** state object from the word `glossState` (independent toggles, S-spec §4).
Tests: reveal one; hide one; show-all override; collapse; immutability.

### Step 3 — `SentenceReveal.jsx` (presentational) + render contract
Props `{ sentence, translation, revealed, onReveal, onCollapse, onAddUnknowns, marker }`.
- Not revealed → a subtle `Languages`/¶ **cue** (own button; `stopPropagation` pointer+click
  like `DocGloss.jsx:19`); `aria-label="Reveal English for this sentence"`.
- Revealed → an **inline slide-down block under the sentence**: the English (with the
  **"machine-translated" marker**, S10), a collapse control, and **"add unknown words"**
  (only if the sentence has ≥1 dictionary-unknown token). `aria-live="polite"`. `var(--color-*)`
  only; themed background like the word-gloss pill.

### Step 4 — wire into `PDFReader.jsx` (reflow only; surgical)
- State: `sentenceMode` (bool, default **false**), `sentenceGloss` (sentenceId → {text, source}),
  `sentenceReveal` (createState()), `translatingSentences` ({done,total}|null), reuse
  `translateAbortRef` pattern (separate ref or shared — separate is cleaner).
- `sentencesByPage = useMemo(...)` over `tokenized.pages` via `groupSentences`.
- Toolbar: a **"Sentences"** toggle (next to "Translate page"); when ON, reveal-gated sentence
  cues render. A **"Translate sentences"** action runs `translateDocument(sentenceTexts, {
  translateBatch, signal, onProgress })` (sentences are short → `chunkTexts` packs many/call).
  A **"Show all sentences"** appears once any sentence translation exists.
- Reflow render (`:740` map): per sentence, render the cue at its start; when revealed, render
  the `SentenceReveal` block after the sentence's last part. **Dim/hide the per-word `DocGloss`
  cues whose `p.i ∈ sentence.tokenIndices` while that sentence is revealed** (S-spec §4) — a
  small predicate in the existing token map; word cues elsewhere untouched.
- `addUnknownsFromSentence(sentence)`: filter `tokenIndices` to dictionary-unknown words →
  reuse the word-gloss add path / `addCards` (payload shape `:333`); mark added.
- **Render-location setting (Q4/S11):** add `pdfReader.sentenceRender: 'inline'|'sheet'` (default
  `'inline'`); `SentenceReveal` renders inline or into a fixed bottom panel accordingly. Read the
  pref in `PDFReader.jsx`; both themed, `var(--color-*)` only.
- **EN-doc no-op (S-spec bar):** if the doc/source language ≈ target English, skip sentence
  translation (cue hidden or disabled-with-reason) — decide the exact signal in code (reuse
  whatever the word path uses for from/to; default `from:'ms'`).
- Reset in `resetGloss()` (`:131`): clear all three new sentence states + abort.

### Step 5 — e2e `tests/e2e/sentence-reveal.spec.js` (GO WILD)
Use the documented `[[project_e2e_config_invocation]]` pattern (run via `npm run test:e2e`;
`bindStore` after each goto). Cases from the spec's test plan — esp. **wrapped-sentence reveals
the whole sentence**, **tap-cue-never-selects (Select v2 intact)**, **resume-from-cache**,
**add-unknowns→FSRS**, **show-all sentences + collapse**, **offline graceful**, **EN doc no-op**,
**spam toggle / navigate mid-job**, light+dark screenshots.

### Step 6 — verify + ship
`npm run build` (zero errors; PDFReader chunk stays lean), `npm run lint` (0 errors; no new
warnings), `npm run test:run` (all green incl. new units), `npm run test:e2e` (solo, per the
documented flake note). Eyeball light+dark. Commit atomically + refresh `RESUME_HERE.md` in the
**same commit** (point the next-session box at BYOK). Confirm Vercel READY.

---

## Risks & mitigations
- **Sentence boundary noise** (abbreviations, decimals, "No. 5", PDF artefacts) → punctuation
  split over-/under-segments. Mitigation: accept as a documented limit (paragraph-fallback keeps
  it coherent); the translation is still useful even if a sentence is slightly long. Don't
  over-engineer an NLP sentence tokenizer for v1.
- **Clutter when both word-glosses and sentence cues are on** → S-spec §4 dimming; sentence mode
  off by default; one cue per sentence (subtle).
- **Layout view** has no clean punctuation grouping (separate run index space) → **out of v1
  scope** (S6); the toggle is reflow-only or disabled-with-reason in Layout.
- **Gesture regression** → `SentenceReveal` `stopPropagation`s exactly like `DocGloss`; e2e
  asserts a cue tap starts no selection and pinch/zoom still works.
- **Volume** → reuse the proven runner + cache; cancel between chunks (good enough, same as the
  word path's documented behaviour).

## Out of scope (parked, don't lose)
- **BYOK "higher quality"** — next feature, `plans/2026-06-08-byok-quality-translation.md`
  (sentence-reveal is the validated reason it comes after).
- **Option F — L2 (Malay) sentence simplification/paraphrase** (vocab-superior per Rassaei &
  Folse 2024) — strong future candidate once BYOK lands an instruct model.
- **Layout-view sentence reveal** — fast-follow after v1.
- **Option G — Full-translation reading page** (paragraph → whole-document, on a dedicated
  reveal-gated/parallel page with a back arrow; Kheshav idea, spec §"Option G") — after
  sentence-reveal; pairs with BYOK. Sentences stay inline; do NOT route them to this page.
</content>
