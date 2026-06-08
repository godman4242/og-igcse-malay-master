# Translate the whole document, free — Implementation plan (2026-06-08)

Build plan for the spec
`docs/superpowers/specs/2026-06-08-translate-document-design.md` (Scope A MVP, then
Tier-2 prefetch). **TDD order: pure logic first, UI last, e2e + eyeball to close.**
Surgical diffs; no full-file rewrites (Study/Writing/PDFReader are stateful).

Reuse-map this builds on (all live, verified 2026-06-07/08):
- `src/lib/translate.js` — `translateBatch` (IndexedDB-cached, splits cached vs missing).
- `src/pages/PDFReader.jsx:300` — `translateAllUnknowns` (the seam: already filters
  to dictionary-unknown `activeTokens`; today renders a list panel).
- `src/lib/pdfLayout.js` + `LayoutView.overlayFor` — per-word screen rects; global
  token indices via `buildPageTokenModel`.
- `src/lib/dictionaryGrounding.js` — `buildGroundingIndex` + `verifyPair`.
- `src/lib/openrouter.js:162` — `resolveKey()` / `hasUserOpenRouterKey()` (BYOK).
- `src/lib/deckGenerator.js` — cancellable long-job shape (AbortSignal + progress).
- `SavedWordPopover.jsx` + shipped tappable-highlight reveal — the reveal-gate pattern.

---

## Step 0 — Baseline (no code)
Confirm git clean, `npm run test:run` green, `npm run lint` 0 errors, prod READY.

## Step 1 — Pure document-translation pipeline (TDD) — `src/lib/translateDocument.js`
Write tests first in `src/lib/__tests__/translateDocument.test.js`.
- `collectDocTokens(tokens, dictionary, {cacheLookup})` → `{ toTranslate, knownCount,
  cachedCount }`: lowercase-dedupe, **skip dictionary-known**, skip cache hits.
- `chunkTexts(texts, {maxChars=4000, maxItems=100})` → arrays that never exceed the
  gtx 5000-char cap and never split a word.
- `backoffDelay(attempt, {base=500, factor=2, max=8000})` → exponential schedule for
  429/503.
- `groundGloss(malay, english, index)` → `{ display, verified, confidence,
  canonicalEn?, marker }` wrapping `verifyPair` into a render-ready decision.
Pure, no DOM, no network. **Gate: new unit tests pass, lint clean.**

## Step 2 — Document translate runner (TDD where possible) — same module
- `translateDocument(tokens, { from, to, signal, onProgress, provider })`: walk
  chunks, call `translateBatch` **per chunk** (so cache still applies), throttle +
  `backoffDelay` retry on transient failure, honour `AbortSignal`, emit progress
  `{ done, total, cachedReused }`. Resumable: a re-run hits cache for the done part.
- Provider: default free `gtx`; if `provider==='quality' && hasUserOpenRouterKey()`
  route the higher-quality path (still cache the result).
Unit-test the orchestration with a stubbed `translateBatch`. **Gate: tests + lint.**

## Step 3 — Reveal-state model (TDD) — `src/lib/docGlossState.js` (or a hook reducer)
Pure reducer for: per-token `hidden|revealed`, a page-level **"show all / hide all"**,
and "revealed → eligible for add-to-deck". No DOM. Unit-tested. **Gate: tests + lint.**

## Step 4 — In-place gloss layer (UI) — extend `LayoutView` + reflow overlay
- Render a small English gloss anchored to each unknown token's existing rect,
  **hidden until tapped** (reuse the tappable-highlight reveal + `SavedWordPopover`
  a11y: role, Esc, focus move/restore, dismiss, WCAG 1.4.13).
- Low-confidence machine glosses get the subtle "unverified" marker + canonical-on-
  mismatch (from `groundGloss`).
- Must NOT break Select v2 / selection / copy / links (the tappable-highlights §3
  safety bars). `var(--color-*)` only; bilingual-safe; touch-first 390×844.

## Step 5 — Wire the toolbar action in `PDFReader.jsx` (surgical)
- Add **"Translate page"** (and gate **"Translate whole document"** behind it or a
  follow-up) that runs `translateDocument` over `activeTokens` with progress + cancel,
  then drives the gloss layer + reveal state. **Reveal-gated by default**; "show all"
  toggle = the opt-in escape hatch.
- Keep `translateAllUnknowns`'s list panel reachable (Q3 default = keep as list view)
  unless Kheshav says replace.
- One-tap **add-to-deck** on a revealed gloss → `addCards` (grounding decides
  verified vs learner-confirm). React-19 purity; no new eager imports (stay lazy).

## Step 6 — e2e + GO WILD + eyeball — `tests/e2e/translate-document.spec.js`
Per the spec's test plan: multi-page fixture; reveal one gloss (read-Malay-first →
tap); show-all then collapse; cancel mid-job; re-run resumes from cache; known words
never glossed; wrong machine gloss shows unverified + canonical; one-tap add lands an
FSRS card; offline graceful; BYOK path when key present; theme swap; **English doc**;
spam toggle / nav mid-job / pinch while shown. Light + dark screenshots.
Follow the Vite `?t=` module-URL trap + `bindStore()` rules from CLAUDE.md.

## Step 7 (Tier-2, optional follow-up) — whole-doc background prefetch (Scope D)
Prefetch+cache the whole document in the background (throttled, cancellable) so
reveals are instant. Same gating; just warms the cache ahead of the viewport.

---

## Verification gate (every step)
`npm run build` (0 err) · `npm run lint` (0 err, no new warnings) · `npm run test:run`
(all pass) · all 15 routes render · dark+light · persistence survives reload · no
infinite-render loops. Atomic commits; refresh `RESUME_HERE.md` in the same commit.

## Risks / watch-items
- **gtx volume** is the top technical risk — Step 1/2 chunk+throttle+backoff+cache is
  the mitigation; if gtx still throttles hard on 30–50pp, ship MVP as **current-page**
  (Q2 default) and lean on Tier-2 prefetch + cache for whole-doc.
- **Don't let convenience creep the default to default-on** — D1 is load-bearing.
- **Grounding marker must be honest but not noisy** — subtle, not alarming.
</content>
