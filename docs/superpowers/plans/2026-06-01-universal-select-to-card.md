# Build plan — universal select→translate→add-to-cards (MVP / Tier 1)

**Read first:** the design + research spec
`docs/superpowers/specs/2026-06-01-universal-select-to-card-design.md`.
This plan is the executable version of that spec's §8 **MVP (Tier 1)**.
**Estimate:** ~45–60 min focused. Presentational + capture only — **no FSRS/schema
change, no STORE_VERSION bump.**

---

## 0. Decisions — RESOLVED with defaults (confirm in 30s, else proceed)

These were §9 open questions. Defaults chosen so the next session isn't blocked —
override at the start if you disagree:
1. **Scope:** Tier 1 only (transient highlight + save-flash). Persistent cross-site
   highlight (Tier 2, CSS Custom Highlight API) is a **separate** later plan.
2. **Surfaces:** **global by default** (matches "EVERY word on the website"), via an
   **opt-OUT** model — exclude form fields, buttons, nav, and the Writing/Import
   textareas (so selecting your own draft doesn't offer to translate it).
3. **Deck:** one deck, `t: 'Saved'`.
4. **Guardrails:** two-step (translate shows first, **Save** is a deliberate 2nd
   tap) = ON. "Guess first" blur = deferred. Context sentence captured into `ex`.

## 1. Goal

Select a word/short phrase anywhere on a reading surface → popover shows the
translation + 🔊 + **Save** → one tap adds `{ m, e, ex, t:'Saved' }` to the FSRS
deck (deduped). Brief "saved ✓" flash. No persistent highlight in MVP.

## 2. Files

**New:**
- `src/lib/selectionToCard.js` — PURE helpers (the TDD target):
  - `normalizeSelection(rawText)` → `{ term, wordCount }` or `null`. Trims, collapses
    whitespace, strips leading/trailing punctuation; rejects empty, numbers-only,
    or > 6 words (a sentence, not a card).
  - `isCardWorthy(rawText)` → boolean wrapper.
- `src/lib/__tests__/selectionToCard.test.js` — vitest for the above (TDD FIRST).
- `src/components/SelectionToCard.jsx` — the global listener + floating popover
  (integration; mounted once in `Layout`).

**Modify:**
- `src/components/Layout.jsx` — mount `<SelectionToCard />` once (it self-manages
  via `document` selection events; no per-page wiring).
- Mark opt-out containers with `data-no-select-card` (Writing/Import textareas, the
  bottom nav, the header). Cheap, additive.

**Reuse (do NOT reinvent):** `translateWord`/`translateSentence` (`src/lib/translate.js`,
already cached + provider-routed + BYOK-aware) and `addCard` (`src/store/useStore.js`,
already dedupes by `{m,t}` and enqueues sync).

## 3. Build order (TDD where it's pure)

1. **TDD `selectionToCard.js`** — write `selectionToCard.test.js` first:
   - empty / whitespace / punctuation-only → `null`
   - `"  Makan. "` → `{ term: 'Makan', wordCount: 1 }`
   - numbers-only `"123"` → `null`
   - 2–4 word phrase → kept; > 6 words → `null`
   - leading/trailing punctuation stripped, inner kept (`"jalan-jalan"` stays)
   Then implement until green.
2. **`SelectionToCard.jsx`** (integration):
   - Listen on `document` for `mouseup` + `touchend` (debounced) → read
     `window.getSelection()`. Bail if collapsed, if inside `[data-no-select-card]`
     or an editable/input, or if `normalizeSelection` returns `null`.
   - Position a small popover at `selection.getRangeAt(0).getBoundingClientRect()`
     (fixed, clamp to viewport). Tokens only: `var(--color-*)`.
   - State machine: `idle → showing(term) → translating → translated → saved`.
     On show, fire `translateWord`/`translateSentence` (phrase if wordCount>1).
   - **Save** → `addCard({ m: srcTerm, e: translation, ex: contextSentence, t:'Saved' })`.
     If `addCard` no-ops (dupe), show "already saved". Flash, then dismiss.
   - Context sentence: from the selection's container text, the sentence containing
     the selection (simple split on `.?!`); cap length.
   - Dismiss on tap-away / `Esc` / scroll. Honour `prefers-reduced-motion`.
   - Language direction: infer from the term (Malay-ish vs English) or a surface
     hint; default Malay→English (the dominant study direction). Keep it simple in
     MVP; note the limitation.
   - a11y: popover is a `role="dialog"`/menu, focusable, Esc closes, buttons labelled.
3. **Mount in `Layout`** + add `data-no-select-card` to the textareas + nav + header.
4. **Telemetry (Enhanced-only):** `select_to_card_shown` / `_saved` `{ surface, wordCount }`.

## 4. Verification gates
- `npm run test:run` — new `selectionToCard` tests pass (target ~+6); existing 347 still pass.
- `npm run lint` — 0 errors (don't add exhaustive-deps warnings).
- `npm run build` — clean; `SelectionToCard` should ride the eager Layout bundle but
  is tiny, OR lazy if it grows.
- **Eyeball (light + dark)** via the Playwright screenshot harness pattern from the
  2026-06-01 session (start `npm run dev`, drive selection): popover legible both
  themes; doesn't block normal copy; doesn't appear on nav/buttons/textareas.
- Manually: select a word on Comprehension → translate → Save → it appears in a
  Study session on the `Saved` deck; re-select same word → "already saved".

## 5. Gotchas (learned / anticipated)
- The global `selectionchange`/`mouseup` listener must **not** hijack ordinary text
  copy — only show on a real word, dismiss freely, never `preventDefault` the selection.
- Mobile selection UX differs (long-press handles); test touch.
- Don't wrap selected text in `<span>` (breaks React) — MVP uses native selection +
  a flash on the saved term only. Persistent highlight is Tier 2 (CSS Custom
  Highlight API), separate.
- Keep the popover non-modal and small — cognitive-load guardrail from the spec §2.
- `addCard` expects `{ m, e, ... t }`; `m` is the source term, `e` the translation.

## 6. Paste-ready next-session kickoff

> Continue IGCSE Malay Master. Read `RESUME_HERE.md`, then build the universal
> select→translate→add-to-cards **MVP (Tier 1)** per
> `docs/superpowers/plans/2026-06-01-universal-select-to-card.md` (design/research in
> the sibling `...-universal-select-to-card-design.md`). Defaults in §0 are approved
> unless I say otherwise. TDD `selectionToCard.js` first, then the global
> `SelectionToCard` popover mounted in Layout, reusing `translate.js` + `addCard`.
> Verify build/lint/tests + eyeball light AND dark (Playwright screenshot harness).
> Atomic commits. Tell me the time estimate before long steps. Deploy when I say so.
