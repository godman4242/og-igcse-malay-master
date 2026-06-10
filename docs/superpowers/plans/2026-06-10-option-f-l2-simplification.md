# Option F — L2 (Malay) sentence simplification — Implementation plan (2026-06-10)

Spec: `docs/superpowers/specs/2026-06-10-option-f-l2-simplification-design.md`.
TDD, **pure logic first**. Surgical diffs — extend, never rewrite `PDFReader.jsx`.

Hook points (verified live 2026-06-10):
- `src/lib/openrouter.js` — `callOpenRouter({systemPrompt, messages, maxTokens, signal})` (`:217`),
  `hasUserOpenRouterKey()` (`:157`).
- `src/lib/sentenceModel.js` — `groupSentences`, `detectDocLanguage`, `MALAY_MARKERS` (reuse the
  Malay-detection idea for the parser's `english` guard).
- `src/lib/revealState.js` — generic reveal reducer (already shared via the sentence shim).
- `src/components/SentenceReveal.jsx` — the inline revealed block to extend.
- `src/pages/PDFReader.jsx` — `revealSentenceHandler` (`:580`), `collapseSentence` (`:593`),
  sentence state (`:99-107`), render (`:1054-1067`), `sentenceDisabled` (`:475`).

---

## Task 1 — `src/lib/simplifyModel.js` (pure, TDD)
**Test first** (`src/lib/__tests__/simplifyModel.test.js`):
- `buildSimplifyPrompt(text)` returns `{systemPrompt, messages}`; system text mentions simpler Malay /
  no English / return only the sentence; `messages[0].content` contains the exact `text`.
- `parseSimplifyResponse(raw, original)`:
  - blank / whitespace → `{status:'empty'}`.
  - wrapping quotes (`"…"`, `「…」`) and leading labels (`Simpler:`, `Jawapan:`, `Ayat mudah:`) stripped.
  - output equal to `original` (case/space-insensitive) → `{status:'echo'}`.
  - English-dominated output (few/zero `MALAY_MARKERS`, mostly ASCII English) → `{status:'english'}`.
  - clean Malay rewrite → `{status:'ok', text}`.
  - never throws on `null`/numbers/garbage.
**Then implement** to green. No DOM, no network.

## Task 2 — `src/lib/instruct.js` (provider-agnostic seam, thin)
**Test first** (`src/lib/__tests__/instruct.test.js`, stub `openrouter`):
- `hasInstructProvider()` true iff `hasUserOpenRouterKey()` (v1); false otherwise.
- `callInstruct(args)` forwards `{systemPrompt, messages, maxTokens, signal}` to `callOpenRouter` and
  returns its resolved string; propagates `AbortError`.
**Then implement.** Document this as the single hook for the future multi-provider router.

## Task 3 — extend `src/components/SentenceReveal.jsx` (ladder UI)
New props: `simplified`, `simplifyPending`, `simplifyFailed`, `englishShown`, `onShowEnglish`
(keep all existing props/behaviour). Inline-revealed block:
- ladder on (`simplified !== undefined`): lead with simpler Malay (`…` while `simplifyPending`),
  `"Simplified Malay — a study aid, not the exam wording"` marker, existing **Add words**, and a
  **"Show English ▾"** control; when `englishShown`, render the existing `translation` (English) nested
  beneath with its machine marker + "Hide English ▴". `simplifyFailed` → one-line notice + English rung.
- ladder off (`simplified === undefined`): render **exactly as today** (English directly) — existing
  tests unchanged.
- every new control `stopPropagation()`s (pointer + click), mirroring the current ones.
*(Component is presentational — verified by the existing sentence-reveal e2e; new behaviour covered by Task 5.)*

## Task 4 — wire `PDFReader.jsx` (surgical)
- Import `hasInstructProvider`, `callInstruct` (`instruct.js`), `buildSimplifyPrompt`,
  `parseSimplifyResponse` (`simplifyModel.js`).
- Add state: `sentenceSimplify` (`{}`), `pendingSimplify` (`new Set()`), `englishShownSentences`
  (`new Set()`). Module-level `EMPTY_SET`/`EMPTY_ARR` already exist — reuse.
- `const ladder = hasInstructProvider()` (call in body, not in a selector).
- **Retarget `revealSentenceHandler`:** on reveal, if `ladder` and no cached simplify → set pending,
  `callInstruct(buildSimplifyPrompt(s.text), {signal})`, `parseSimplifyResponse`, cache on `ok` /
  mark `simplifyFailed` otherwise; clear pending. If **not** `ladder` → unchanged (lazy gtx English).
- **New `showEnglishHandler(s)`:** add id to `englishShownSentences`; lazily fetch gtx English via the
  **existing** `translateDocument([s.text], …)` → `sentenceGloss` path (reuse `pendingSentences`).
- `collapseSentence`: also delete the id from `englishShownSentences`.
- Render (`:1054-1067`): pass the new props — `simplified={sentenceSimplify[id]}`,
  `simplifyPending={pendingSimplify.has(id)}`, `simplifyFailed`, `englishShown={englishShownSentences.has(id)}`,
  `onShowEnglish={() => showEnglishHandler(blockS)}`, only when `ladder`. When `!ladder`, pass nothing new.
- Cancel: include `sentenceSimplify` fetches under the existing abort discipline (reuse
  `sentenceAbortRef` or a sibling ref).

## Task 5 — e2e + verification (GO WILD)
- `tests/e2e/option-f-simplify.spec.js`: stub `hasInstructProvider`→true and `callInstruct` to a fixed
  simpler-Malay string (bindStore + live-`?t=`-URL pattern). Cover: simplify-first reveal; Show/Hide
  English escalation; no-provider fallback (stub false → English directly); model returns
  English/garbage/empty → degrade to English; cancel mid-fetch; re-reveal cached; add-unknowns → FSRS;
  no Select v2 selection on taps; spam toggles; offline; EN doc disabled; theme swap. Light+dark shots.
- Gate: `npm run build` · `npm run lint` (0 err, no new warns) · `npm run test:run` (all green) ·
  `npm run test:e2e` (SOLO).

## Commit & ship
- Atomic commits per task (pre-commit gate runs build→test→lint, aborts on failure).
- Final commit refreshes `RESUME_HERE.md` (point at the multi-provider-router / multimodal backlog).
- Repo auto-pushes; confirm PUBLIC `upg-…vercel.app` READY. Bounded self-review + honest verdict.
