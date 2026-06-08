# BYOK "higher quality" translation — Implementation plan (2026-06-08)

Fast-follow #1 for "Translate the whole document, free" (spec D7). Free **gtx stays the
default**; a user who has supplied their own **OpenRouter key** can flip a "Higher
quality" toggle that routes the SAME document-translate pipeline through OpenRouter's
(free) instruct models, which translate Malay→English more idiomatically than gtx —
and the result still passes through grounding (D9) and the FSRS add path (D10).

**All hook points + signatures verified against live code 2026-06-08.** TDD: pure
logic + provider unit-tested first, UI last, e2e to close. Surgical diffs only.

---

## What ships
1. A new `openrouter` translation provider inside `src/lib/translate.js` (same
   `{ one, batch }` shape as deepl/google/gtx; returns `{ text, source:'openrouter',
   provider:'openrouter' }`).
2. `providerOrder()` routes `preferred === 'quality'|'openrouter'` to try `openrouter`
   FIRST (when a key exists), then fall back to the normal MT chain — so a failed
   quality call degrades to gtx instead of erroring.
3. `translateDocument` threads a `provider` option down to `translateBatch`.
4. A small **"Higher quality"** toggle in `PDFReader.jsx`, shown ONLY when
   `hasUserOpenRouterKey()` — non-key users never see it; gtx stays default.

## Verified signatures (no re-discovery needed)
- `callOpenRouter({ systemPrompt, messages, maxTokens=1024, signal }) → Promise<string>`
  (`src/lib/openrouter.js:217`). Uses the **live free-model chain** (`getFreeModels`),
  so it needs a key only for access/rate-limit, not for paid models — stays free.
- `hasUserOpenRouterKey() → boolean` (`openrouter.js:157`, module-var, non-reactive —
  fine to read in render). `isOpenRouterAvailable()` (`:169`) = user OR env key.
- Provider shape (mirror this): `deeplTranslateBatch` returns
  `[{ text, source:'deepl', provider:'deepl' }]` (`providers/deepl.js:58`).
- `translateBatch(texts, from, to, opts)` already honours `opts.provider`
  (`translate.js:119`), writes cache per word (`:128`), pulls cache first (`:109`).
- `providerOrder(preferred, from, to)` at `translate.js:40`; `PROVIDERS` at `:58`.

## ⚠️ Two gotchas this plan PRE-SOLVES (read before coding)
1. **Cache key has no provider dimension.** `makeKey(text, from, to)` in
   `translationCache.js` ignores provider. So if a word was already gtx-cached, a
   later "quality" request returns the **gtx** result and never calls OpenRouter
   (and vice-versa). FIX: give the quality path its own cache namespace. Add an
   optional 4th arg to the cache helpers — `makeKey(text, from, to, ns='')` — and
   thread a `ns` through `readCache/readCacheSync/writeCache` and the two
   `translateBatch` cache calls. The interchangeable MT providers (gtx/google/deepl)
   keep `ns=''` (existing cache stays valid); `openrouter` uses `ns='q'`. Result:
   quality glosses cache + resume SEPARATELY from free ones, no collision. Unit-test
   the namespaced key.
2. **OpenRouter does one completion, not a batch.** For a chunk of N words, send ONE
   prompt asking for a numbered list back and parse it; on a count mismatch, fall back
   to bounded per-word `callOpenRouter` calls. Keep the prompt STRICT so single-word
   glosses stay terse (free instruct models love to ramble): e.g.
   `"Translate each numbered Malay item to English. Reply with ONLY a numbered list,
   same numbers, one short gloss each (1–4 words), no notes."` Grounding (`verifyPair`)
   still catches bad output, and a too-long gloss should be trimmed/flagged unverified.

## Steps (TDD)
**Step 1 — cache namespace (pure, TDD).** Add `ns` param to `makeKey` +
`readCache/readCacheSync/writeCache`; default `''` (no behaviour change). Test: same
text different ns → different keys; `ns=''` matches today's key exactly. Gate: tests + lint.

**Step 2 — openrouter provider (TDD with stubbed fetch/callOpenRouter).** New module
`src/lib/translate/providers/openrouter.js`:
- `openrouterTranslateBatch(texts, from, to)`: build the numbered prompt, call
  `callOpenRouter`, parse the numbered reply into N glosses, fall back to per-word on
  mismatch, return `[{text, source:'openrouter', provider:'openrouter'}]`. Guard
  `isOpenRouterAvailable()`; throw if no key (so providerOrder falls through to gtx).
- `openrouterTranslateOne(text, from, to)`: single-item convenience.
- Unit-test the parse (numbered list, ragged numbering, mismatch→fallback, empty).

**Step 3 — wire into translate.js (surgical).**
- Import the two fns; add `openrouter: { one, batch }` to `PROVIDERS`.
- In `providerOrder`: if `preferred==='quality'||preferred==='openrouter'`, and
  `isOpenRouterAvailable()`, prepend `'openrouter'`; ALWAYS keep the gtx/google/deepl
  fallback after it. (So quality fails soft to free.)
- In the two `translateBatch`/`translateWord` cache calls, pass `ns` = `'q'` when the
  resolved provider chain leads with openrouter, else `''`. (Cleanest: derive `ns`
  from `pref==='quality'`.) Unit-test: quality pref → openrouter called even when a
  gtx result is already cached (proves the namespace fix).

**Step 4 — translateDocument passes provider (TDD).** Add `provider` to the runner's
opts; call `translateBatch(chunk, from, to, { provider })`. Existing tests stay green
(default undefined provider = today's behaviour). Add one test: provider threaded through.

**Step 5 — PDFReader toggle (UI).** Next to "Translate page", render a "Higher quality"
pill ONLY when `hasUserOpenRouterKey()`. Keep it in component state
(`const [quality, setQuality] = useState(false)`). Pass `provider: quality ? 'quality'
: undefined` into `translateDocument`. Tooltip explains "uses your OpenRouter key".
Free path unchanged when off / no key. Gate: build + lint + test:run + eyeball light/dark.

**Step 6 — e2e.** Extend `tests/e2e/translate-document.spec.js` (or a sibling): with a
user key seeded (`setUserOpenRouterKey` via bindStore), the toggle appears; mock the
OpenRouter endpoint to return a numbered list; "Translate page" + quality reveals the
OpenRouter gloss; without a key the toggle is absent; quality + free cache don't
collide (namespace). Honour the `?t=`/`bindStore` rules.

## Quality / safety bars
- gtx free default is untouched; no key ⇒ no toggle ⇒ zero change for normal users.
- Quality fails SOFT to free (never a dead end). Grounding still flags low-confidence.
- Reveal-gated default + Select v2 + reflow/Layout all unaffected (additive only).
- `var(--color-*)`, React-19 purity, bilingual-safe.

## OPEN QUESTION for Kheshav (the one real product call)
Free OpenRouter **instruct** models clearly beat gtx for **phrases/sentences**, but for
**single words** gtx is often fine and instruct models can be verbose/hallucinate
(mitigated by the strict prompt + grounding, but not eliminated). Options:
- **(default) Ship quality for all unknown words** — simplest; grounding is the safety net.
- **(alt) Quality only kicks in for multi-word/phrase glosses**, single words stay gtx —
  arguably the genuinely-higher-quality cut, less hallucination risk.
Decide at session start; default is fine to proceed with if you don't want to pick.

## Alternative next feature (if you'd rather)
**Sentence-level on-demand reveal (Q5 v2)** is the higher-*learning*-value option and is
where instruct models shine. Hook points: reflow already groups by paragraph
(`PDFReader.jsx` `tokenized.pages[].paragraphs`); Layout has line/item structure in the
token model (`pdfLayout.buildPageTokenModel`). Tap a line → translate the sentence via
the same pipeline → reveal in place (reuse `DocGloss`-style reveal). Heavier than BYOK
(new gesture + boundary mapping), lighter prep than BYOK above — say the word and the
next session does the deeper Design&Research pass on it instead.
