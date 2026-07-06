# Shared deck import — design (2026-07-06)

Fixes adversarial-review **#15**: the Settings "Share Deck via Link" button copied a
`?deck=<base64>` URL that **nothing consumed** — sharing silently failed. Kheshav approved
*building* the import path (2026-07-06), transport = **link+file hybrid**, scope = **vocab decks only**
(sharing reading passages/"resources" is a logged follow-up epic, not this build).

## Goal (measurable)
1. A `?deck=` link opens a **review panel**; the recipient picks which words to add + confirms the
   deck name; tapping Add routes through the existing `addCards` (dedupe + FSRS + sync). Never silent.
2. The Share button produces a working artifact for **any** deck size: a link for small decks, a
   downloadable `.deck.json` for large ones. Import accepts **both**.
3. An **untrusted** payload can never inject store/FSRS fields, `__proto__`, oversized data, or a
   card count that could jank the app. Malformed input → friendly error, no crash.

## Trust boundary — `src/lib/sharedDeck.js` (pure, unit-tested)
The one place share payloads are encoded/decoded/**sanitised**. No DOM, no store.

- `MAX_SHARED_CARDS = 200`, `MAX_FIELD_LEN = 200`, `SAFE_URL_LEN = 1800` (cross-browser-safe query cap).
- `sanitiseDeck(raw)` — accepts a parsed envelope `{ v, cards }`; returns `{ cards }` where each card is
  **exactly** `{ m, e, t, lang }`: `m`/`e`/`t` coerced to trimmed strings (≤ `MAX_FIELD_LEN`), entries
  missing `m` or `e` dropped, `lang` normalised to `'ms'｜'en'` (default `'ms'`), list capped to
  `MAX_SHARED_CARDS`. Whitelist only — every other key (incl. FSRS state, `__proto__`) is discarded.
- `encodeDeckParam(cards)` → URL-safe base64 (base64url: `+→-`, `/→_`, strip `=`) of `{ v:1, cards }`.
  Fixes the current button's latent bug (raw base64 `+//=` corrupts in a query string).
- `decodeDeckParam(b64)` → `sanitiseDeck(JSON.parse(fromB64url(b64)))`; malformed → `null`.
- `deckFileContent(cards)` → pretty JSON string of `{ v:1, cards }` (a human-portable `.deck.json`).
- `parseDeckFile(text)` → `sanitiseDeck(JSON.parse(text))`; malformed → `null`.
- `shareTargetFor(cards, origin)` → `{ mode:'link', url }` when the encoded link ≤ `SAFE_URL_LEN`,
  else `{ mode:'file', filename, content }`. UTF-8 safe (`encodeURIComponent`/`escape` bridge).

## UI
- **`src/components/SharedDeckImport.jsx`** — presentational modal. Props: `cards` (already sanitised),
  `defaultDeckName`, `studyLang`, `onClose`. Owns pick-state (all pre-checked); mirrors
  `MakeDeckPanel`'s `WordRow`/`DeckReview`. A deck-name input (default = payload's most common `t`, or
  "Shared deck"). A gentle note when the payload language ≠ the learner's `studyLang`. "Add N words"
  → `addCards(chosen.map(c => ({ ...c, t: deckName })))` → success state → "Study now" / close.
- **`src/components/SharedDeckGate.jsx`** — mounted in `Layout`; reads `?deck=` via `useSearchParams`,
  `decodeDeckParam`s it, renders `SharedDeckImport` as a modal, and **strips the param** on
  open (so a reload/back doesn't re-trigger). Invalid payload → a dismissible "link is invalid" toast.
- **Settings** — an "Import a shared deck (file)" button: file picker → `parseDeckFile` → render the
  SAME `SharedDeckImport` modal. The Share button switches to `shareTargetFor`: link → clipboard,
  file → download.

## Safety / invariants
- Import is **review-gated** (never auto-add) — same principle as the AI-deck grounding gate.
- `addCards` already dedupes on `(m,t,lang)` and stamps fresh FSRS + `lang`, so imports can't corrupt
  scheduling or leak across the MS/EN divide. The deck name is chosen by the **recipient**.
- No STORE_VERSION bump (no new persisted field — the modal state is component-local).

## Tests
- `sharedDeck.test.js` (pure): round-trip; sanitise strips FSRS/`__proto__`/extra keys; count + field
  caps; lang normalise; malformed base64/JSON → null; `shareTargetFor` link↔file threshold.
- `shared-deck.spec.js` (e2e): `/?deck=<encoded>` → modal → add → cards present + param stripped;
  malformed `?deck=` → friendly, no crash.
- README + `guide/tourSteps.js` / page guide updated (feedback: update both on every feature).

## Out of scope (logged follow-ups)
Sharing reading passages/PDF text ("resources"); server short-links; social/discovery.
