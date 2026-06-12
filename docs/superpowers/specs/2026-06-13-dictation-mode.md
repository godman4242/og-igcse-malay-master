# Dictation mode (review feature #5, score 8)

**Shipped 2026-06-13** (overnight loop iteration 3), test-first. Gate green: build · 1091 unit
tests · lint 0 errors · content. New `/dictation` route; Dictation page chunk 9.6 KB.

## Why
The review's highest-scoring **buildable** undone feature ("doubles the Paper-4 surface from existing
TTS + diff libs"). Dictation = hear a sentence → type what you heard → word-level diff. Trains
listening + spelling + vocabulary together (active production from audio = strong retrieval).
Distinct from the existing WORD-level `listen` study mode in `Study.jsx` (one word → type it).
(The only equal-scoring undone item, #6 "retire/retie XP", is a product-direction call — not
auto-built.)

## Design forks (decide-and-flag)

### 1. Corpus
- **DECISION:** reuse the Paper-4 `listeningPassages` (bilingual, curated, audio-designed), split
  into individual sentences (`splitIntoSentences`, MIN_WORDS=3 to drop 1-2 word fragments). **No new
  content authored → no native-speaker risk.**
- **VETO:** add a dedicated dictation sentence bank later for tighter length control.

### 2. Placement
- **DECISION:** a standalone `/dictation` route (lazy), surfaced on the Practice hub under
  "Reading & Listening". Isolated → **zero regression risk to the working Listening page**, and far
  easier to test/reason about. Route count 19 → 20 (CLAUDE.md, ARCHITECTURE.md, sitemap.xml, the
  practice-hub guard test all updated).
- **VETO:** fold into `/listening` as a mode toggle later if route count becomes a concern.

### 3. Scoring — `scoreDictation` (pure, in `src/lib/dictation.js`)
- **DECISION:** **LCS (longest-common-subsequence) word alignment**, recall-based (matched reference
  words / total reference words). Chosen over reusing the position-based `scorePronunciation` so a
  single dropped word doesn't shift-penalise every later word — the learner gets credit for every
  word reproduced in order. Normalisation matches `pronunciation.js` (lowercase, strip
  `.,!?;:'"()`, collapse whitespace; hyphens kept so reduplication like *kanak-kanak* stays one token).
- **VETO / known v1 limit:** extra inserted words are NOT penalised (recall-only). Add a precision
  term later if false-credit becomes an issue.

### 4. Persistence
- **DECISION:** none — v1 is a pure practice surface (no store change, no STORE_VERSION bump).
- **VETO:** log dictation attempts to a history array later (would enable a per-paper balance meter
  and FSRS-style scheduling).

## Files
- `src/lib/dictation.js` (new, pure) + `src/lib/__tests__/dictation.test.js` (12 tests, red-proofed)
- `src/pages/Dictation.jsx` (new page — TTS player ≤2 plays/hidden text, textarea, word diff, FeedbackLive)
- `src/App.jsx` (lazy route), `src/lib/practiceSurfaces.js` (+ tile) + its guard test
- Docs: CLAUDE.md (route count + list), ARCHITECTURE.md (route count), public/sitemap.xml

## Not automated (flagged)
The pure corpus + scoring are unit-tested red-green; the page UI rides on build/lint + the proven
Listening player pattern it mirrors (repo norm: pages aren't unit-tested). Worth a manual pass on
prod: TTS playback + replay limit, the word-diff colours, dark/light. A follow-up
`tests/e2e/dictation.spec.js` would close it.
