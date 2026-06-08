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

## Status (2026-06-08) — ALL PURE LOGIC PRE-BUILT + GREEN
**Steps 1–3 DONE + committed** (pure, nothing imports them yet → zero app risk):
- `src/lib/translateDocument.js` — `normalizeWord`, `collectDocTokens`, `chunkTexts`,
  `backoffDelay`, `groundGloss`, **`buildGlossIndex`** (token-index → gloss decision,
  mirrors `selIdx`), and the DI'd `translateDocument` runner (chunk + retry/backoff +
  abort-without-mislabel + progress).
- `src/lib/docGlossState.js` — the reveal-gated reducer.
- Tests: `translateDocument.test.js` + `docGlossState.test.js`
  (**44 tests, all passing**; full suite **598 green**, 0 lint errors, build clean).
**Steps 4–6 DONE + SHIPPED (2026-06-08).** In-place gloss UI (`src/components/DocGloss.jsx`),
PDFReader/LayoutView wiring, "Translate page" + "Show all/Hide all" toolbar, grounding flag,
one-tap add-to-FSRS, and e2e (`tests/e2e/translate-document.spec.js`, 11 cases + GO WILD,
light/dark screenshots). +1 unit test (599 green), build clean, 0 lint errors. See RESUME_HERE.
**Remaining (fast-follows): Step 7 (Tier-2 whole-doc prefetch / Scope D), BYOK quality provider,
sentence-level reveal (Q5 v2).**

## Step 0 — Baseline (no code)
Confirm git clean, `npm run test:run` green, `npm run lint` 0 errors, prod READY.

## Step 1 — Pure document-translation pipeline (TDD) — `src/lib/translateDocument.js`  ✅ DONE
Write tests first in `src/lib/__tests__/translateDocument.test.js`.
- `collectDocTokens(tokens, dictionary, {cacheLookup})` → `{ toTranslate, knownCount,
  cachedCount }`: lowercase-dedupe, **skip dictionary-known**, skip cache hits.
- `chunkTexts(texts, {maxChars=4000, maxItems=100})` → arrays that never exceed the
  gtx 5000-char cap and never split a word.
- `backoffDelay(attempt, {base=500, factor=2, max=8000})` → exponential schedule for
  429/503.
- `groundGloss(malay, english, index)` → `{ display, verified, confidence,
  canonicalEn?, marker }` wrapping `verifyPair` into a render-ready decision.
Pure, no DOM, no network. **Gate: new unit tests pass, lint clean.** ✅ DONE.

## Step 2 — Document translate runner (TDD where possible) — same module
- `translateDocument(tokens, { from, to, signal, onProgress, provider })`: walk
  chunks, call `translateBatch` **per chunk** (so cache still applies), throttle +
  `backoffDelay` retry on transient failure, honour `AbortSignal`, emit progress
  `{ done, total, cachedReused }`. Resumable: a re-run hits cache for the done part.
- Provider: default free `gtx`; if `provider==='quality' && hasUserOpenRouterKey()`
  route the higher-quality path (still cache the result).
Unit-test the orchestration with a stubbed `translateBatch`. **Gate: tests + lint.**
✅ DONE — runner is dependency-injected (`{ translateBatch, delay, signal, onProgress,
maxRetries, backoff }`), so Step 5 just passes the real `translateBatch` from
`./translate.js`.

## Step 3 — Reveal-state model (TDD) — `src/lib/docGlossState.js`  ✅ DONE
Pure reducer: `createGlossState / isRevealed / revealToken / hideToken / setShowAll /
hideAll`. Reveal-gated by default; `showAll` overrides. No DOM. Unit-tested.

> **The load-bearing architecture insight (read first):** both PDF views already
> consume a `selIdx` **Map keyed by global token index** (`PDFReader.jsx:245` builds
> it; reflow reads `selIdx.get(p.i)` at `:607`; `LayoutView` reads `sel.get(wr.gi)` at
> `:236`). The gloss layer is a **second parallel map of exactly the same shape** —
> `glossByIndex` from `buildGlossIndex(...)` (already built + tested) — so it renders
> the SAME way in both views with no new geometry. Treat Step 4 as "add a second
> `selIdx`," not "build an overlay."

## Step 4 — In-place gloss layer (UI). Files: `PDFReader.jsx` + `pdfreader/LayoutView.jsx`
**4a. New state + derived maps in `PDFReader.jsx`** (near the other `useState`, ~`:48–73`):
- `const [docGloss, setDocGloss] = useState({})` — `normalizedWord → {text, source}`
  (accumulates across "Translate" passes; survives view switches).
- `const [glossState, setGlossState] = useState(createGlossState)` — reveal state.
- `const [translating, setTranslating] = useState(null)` — `{done,total}` or null.
- `const translateAbortRef = useRef(null)`.
- Grounding index: module-level `const DICT_PAIRS = Object.entries(DICTIONARY).map(([m,e])=>({m,e}))`
  (DICTIONARY is static); in-component `const cards = useStore(s => s.cards)` +
  `const groundingIndex = useMemo(() => buildGroundingIndex(DICT_PAIRS, cards), [cards])`.
- `const glossByIndex = useMemo(() => buildGlossIndex(activeTokens, DICTIONARY, docGloss, groundingIndex), [activeTokens, docGloss, groundingIndex])`.
  (Imports: `buildGlossIndex, collectDocTokens, normalizeWord, translateDocument` from
  `../lib/translateDocument`; `createGlossState, isRevealed, setShowAll` from
  `../lib/docGlossState`; `buildGroundingIndex` from `../lib/dictionaryGrounding`.)

**4b. Reveal affordance — SAFEST design (purely additive, does NOT touch the
Select v2 / translate gesture):** for a token with `glossByIndex.has(i)`:
- when `!isRevealed(glossState, i)` → render a tiny own-button cue **after** the word
  (a dotted-underline dot / `Languages` micro-icon), `onClick` = `stopPropagation()` +
  `setGlossState(s => revealToken s, i)`. (Keep the word's existing tap→translate.)
- when revealed → render the gloss inline: `glossByIndex.get(i).display`, styled by
  `marker` (`null`=plain `--color-dim`; `unverified`=dotted underline + title "machine,
  unverified"; `mismatch`=show canonical + a small `--color-orange` flag). Add a `＋`
  own-button → add-to-deck (4d).
- Reflow: insert this right after the token `<span data-token-i={p.i}>` at
  `PDFReader.jsx:609–625`. Layout: pass `glossByIndex` + `glossState` + `onReveal` +
  `onAddGloss` into `LayoutView`; in its overlay `.map` (`LayoutView.jsx:235–255`)
  render the cue/label anchored at `top: wr.top + wr.height` (own-button, `pointerEvents:auto`),
  leaving the existing transparent selection span untouched.
- *(Optional polish for eyeball: in translate mode, tapping the WORD itself reveals
  when a gloss exists — more natural, but it routes through `handleCommit`/Select v2,
  so only do it if it survives the GO WILD selection tests. The additive cue above is
  the no-regression baseline.)*
- a11y: cues are real `<button>`s with `aria-label` (e.g. `Reveal meaning of {word}`);
  revealed gloss has `aria-live="polite"`. `var(--color-*)` only; bilingual-safe.

**4c. "Show all / hide all"** — drive `glossState.showAll` via `setShowAll`; both views
already honour it because `isRevealed` checks `showAll` first.

**4d. Add-to-deck** — `addCards([{ m: g.malay, e: g.display, t: deckName, p: 'n', ex: \`${g.malay} — ${g.display}\` }])`.
For `marker==='unverified'|'mismatch'`, still one-tap (Q4 default) but the card uses the
canonical `display`; optionally also `addMistake({category:'vocab',...})` for mismatches.

**Bars:** must NOT regress Select v2 / selection / copy / links (tappable-highlights §3);
React-19 purity (no `Date.now()` in render); no new eager imports (PDFReader is already
lazy). **Gate: build + lint + test:run + eyeball light/dark.**

## Step 5 — Wire the "Translate" toolbar action in `PDFReader.jsx` (surgical)
- Add a **"Translate page"** button beside "Translate all unknowns" (`:433–437`). On click:
  1. `const { toTranslate } = collectDocTokens(activeTokens, DICTIONARY, { cacheLookup: w => !!getFromCache(w) })`
     (`getFromCache` from `../lib/translate` — already exported). Empty → toast "nothing to translate".
  2. `const ac = new AbortController(); translateAbortRef.current = ac; setTranslating({done:0,total:toTranslate.length})`.
  3. `const results = await translateDocument(toTranslate, { translateBatch, signal: ac.signal, onProgress: setTranslating })`.
  4. `setDocGloss(prev => ({ ...prev, ...results })); setTranslating(null)`.
  - Reuse the existing `batchProgress` bar pattern (`:444`) for `translating` (it already
    has a sticky bar slot) and show a **Cancel** → `translateAbortRef.current?.abort()`.
- **Provider:** MVP ships the **free gtx default** (it's already in `translateBatch`'s
  fallback chain, no key). **BYOK "higher quality" is deferred** — OpenRouter isn't a
  provider inside `translate.js`, so a quality path = a new provider/route; note it as a
  fast-follow, don't block MVP. (Spec D7 stays; free-first is the honest MVP cut.)
- **Keep `translateAllUnknowns`** + its list panel (Q3) — it's complementary.
- **Scope (Q2 = current-page-first):** reflow has all pages in the DOM, so it naturally
  translates the visible doc; in Layout, if a 30–50pp paper throttles, scope `toTranslate`
  to the visible page range (`LayoutView` already tracks it) — wire that only if needed.

## Step 6 — e2e + GO WILD + eyeball — `tests/e2e/translate-document.spec.js`
Reuse the committed `layout-2col.pdf` fixture (+ an English doc + scanned). Cases:
reveal one gloss (read-Malay-first → tap the cue → English appears); show-all then
collapse; **Cancel** mid-job; re-run resumes from cache (few/no new network calls);
known words never get a cue; a deliberately-wrong machine gloss shows `unverified`/
`mismatch` + canonical; one-tap add lands an FSRS card (assert via `bindStore`); offline
→ graceful; theme swap; **English doc**; spam the show-all toggle / navigate mid-job /
pinch while glosses shown (Layout). Light + dark screenshots. Honour the Vite `?t=`
module-URL trap + `bindStore()` rules (CLAUDE.md).

## Step 7 (Tier-2, optional follow-up) — whole-doc background prefetch (Scope D)
Prefetch+cache the whole document in the background (throttled, cancellable) so reveals
are instant. Same gating; just warms the IndexedDB cache ahead of the viewport.

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
- **BYOK-quality is a fast-follow, not MVP** — needs a new provider in `translate.js`;
  don't let it block the free-gtx ship.
