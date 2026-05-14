# RESUME HERE — read this first

You are a fresh Claude Code session continuing work on the IGCSE Malay
Master app. Read this doc end-to-end **before** opening any other file.

> **Latest state (2026-05-15): UDL Round 3 Part 5 — Personal Interests
> (Star Topics).** Closes the final UDL box. **The UDL roadmap is
> officially 9/9 — every Principle 1, 2, and 3 box ticked.** HEAD
> moves forward by one commit on top of Round 3 Part 4 (`2932629`).
>
> 1. **Star-topic taxonomy in `src/lib/interests.js`** — 10 curated
>    IGCSE interests (Environment, Travel, Technology, Health, Sports,
>    Food, Education, Community, Family, Work & Jobs) each with id,
>    label, emoji, and a small `matchers[]` bag of lowercase substring
>    hits. Substring-case-insensitive matching means the same
>    `environment` interest fires on both the passage tagged
>    `alam sekitar` AND the scenario titled `Alam Sekitar` without
>    touching the source data files. Pure leaf module — `INTERESTS`,
>    `matchInterests(tokens, starredIds)`, and `prioritiseByInterests
>    (items, starredIds, getTopicTokens)` are all React-free, vitest-
>    pinned without JSDOM.
> 2. **`prioritiseByInterests`** — stable sort that pulls matching
>    items to the front while preserving original order WITHIN the
>    "matched" and "unmatched" groups (no surprise reshuffles for a
>    student who starred two interests). Returns enriched rows
>    `{ item, matchedInterests: Set<string> }` so the caller renders
>    the ⭐ badge from the SAME computation that drives the sort —
>    no risk of "badge shown but item not prioritised" drift.
> 3. **STORE_VERSION 16 → 17** — new `userInterests: []` array,
>    `toggleUserInterest(id)` + `clearUserInterests()` actions.
>    Migration is defaults-empty so returning users see zero change
>    in Comprehension / Roleplay ordering until they opt in. No
>    validation against the catalog at write time so the interest
>    list can grow without a new migration.
> 4. **Settings → "Your Interests" section** — 10 emoji chips between
>    Preferences and Translation & AI. Click toggles; on-state uses
>    the orange palette with a filled Star icon for clear "on"
>    affordance. Counter pill + "Clear all" button appear once any
>    interest is starred. Empty state copy ("Star nothing and
>    ordering stays the same") makes the opt-in semantics explicit.
> 5. **Comprehension + Roleplay list prioritisation** — both pages
>    pull the active list through `prioritiseByInterests`. Matched
>    cards get an orange border + 1px shadow ring, a Star icon next
>    to the title, and a "Your interest" pill in the metadata row.
>    Roleplay's English + Malay scenario tabs both flow through the
>    same helper (English scenarios match by `id` + `title` +
>    `titleEn` since `scenarios.js` doesn't carry a `topic` field).
> 6. **Vitest pin** — new `src/lib/__tests__/interests.test.js`
>    (11 cases): catalog completeness (id uniqueness, named brief
>    interests present, every entry well-formed), `matchInterests`
>    contract (empty/null guards, substring + case-insensitive
>    matching, English-title fallback, full intersection across
>    multiple starred interests, no-star = no-match), and
>    `prioritiseByInterests` contract (identity when no stars,
>    stable sort with star-first ordering, defensive empty/null
>    handling, input non-mutation). Total suite **168/168** (was 157;
>    net +11, no flips).
>
> Earlier Round-3 Part-4 work (still load-bearing):
>
> 1. **Radial SVG tree on `/word-families`** — new
>
> 1. **Radial SVG tree on `/word-families`** — new
>    `src/components/WordFamilyTree.jsx` replaces the static
>    `WordFamilyCard` per-POS list with a 500×500 viewBox SVG. The
>    root sits dead-centre with its `<DictionaryIcon>` embedded via
>    `<foreignObject>`; N derived forms branch out on a deterministic
>    circle (radius 175, first node at -π/2, sweeping clockwise so the
>    layout is identical every render). Forms are POS-grouped (verbs
>    → nouns → adjectives, contiguous arc per group). Cubic-Bezier
>    paths whose control points sit ON the same radial vector keep
>    the curves sweeping outward instead of zig-zagging.
> 2. **Pure layout math, `src/lib/wordFamilyLayout.js`** — `layoutTree`,
>    `sortFormsByPOS`, `bezierPath`, and a `POS_STYLE` palette
>    centralised so the legend + path stroke + node border + + button
>    all read from one source of truth. Leaf module on purpose —
>    vitest pins it without spinning up JSDOM (same pattern as
>    `parseRatingKeyword`, `parseStopKeyword`, `plainifyForSpeech`).
> 3. **Sync-highlight on click** — each node is its own clickable
>    `<g>` that routes through `speakWithBoundaries` (not the
>    fire-and-forget `speak()`). Active node pulses a thicker ring +
>    `animate-pulse` class while TTS is mid-flight; `onEnd`/`onError`
>    flip it off. Speaker ref is cancelled on unmount and on the next
>    click, matching the Roleplay / CikguBot lifecycle pattern. The
>    detail strip below the SVG also tints the active row in the
>    POS soft colour so the link between heard-word and printed-word
>    is unambiguous.
> 4. **Per-node "+ Add to deck"** — small overlay circle at top-left
>    of every node, `<Plus>` icon for new forms, `<Check>` (filled
>    green) for ones already in the deck. Click stops propagation so
>    you don't accidentally also speak the word. Same `addCard`
>    contract the old `WordFamilyCard` had — zero store changes.
> 5. **ADHD-safe styling** — no idle animations anywhere; the only
>    motion is the user-triggered pulse during TTS playback. POS legend
>    strip above the SVG names the colour code in plain language
>    (Kata Kerja / Kata Nama / Kata Sifat) so the colour-to-meaning
>    mapping is explicit, not inferred. All colours through
>    `var(--color-*)` so `.contrast-high` (WCAG-AAA) and
>    `.font-dyslexic` (Lexend) reskin it without touching the SVG.
> 6. **Dead-code cleanup** — `src/components/WordFamilyCard.jsx`
>    deleted (no other call site after the swap; CLAUDE.md says
>    delete confidently rather than keep stubs).
> 7. **Vitest pin** — new `src/lib/__tests__/wordFamilyLayout.test.js`
>    (9 cases): empty/null guard, single-node centred-above contract,
>    radial-circle-and-evenly-spaced contract, Bezier-control-points-
>    on-radial-vector contract, 9-form no-overlap contract (every
>    pairwise distance > 2× node radius — guarantees zero collisions
>    even for the densest root in the corpus), POS bucketing order,
>    unknown-POS defaults to verb, bezierPath SVG-string format,
>    palette completeness. Total suite **157/157** (was 148; net +9,
>    no flips).
>
> Earlier Round-3 Part-3 work (still load-bearing):
>
> 1. **Voice-mode toggle on `/cikgu`** — new "Voice" Headphones button
>
> 1. **Voice-mode toggle on `/cikgu`** — new "Voice" Headphones button
>    in the header (next to the Expert/AI mode toggle). When on, the
>    mic button in the input row stops being a one-shot dictation
>    helper and becomes a full conversation driver: a state machine
>    (`idle → listening → thinking → speaking → idle`) with a status
>    banner above the input that pulses the current phase
>    (red=listening, orange=thinking, purple=speaking).
> 2. **Imperative flow, not setState-in-effect** — the read-aloud
>    pipeline is kicked off directly from the `handleSpeech` event
>    handler after `sendMessage` resolves, NOT from a `useEffect`
>    watching `messages`. Same pattern Roleplay uses. `sendMessage`
>    now returns the assistant content string (all four branches:
>    expert, Gemini, OpenRouter, Supabase, fallback) so the caller
>    can hand it straight to `readResponse(idx, content)`. The only
>    `useEffect` is an unmount cleanup that cancels imperative refs
>    with no setState — passes the `react-hooks/set-state-in-effect`
>    lint that v19's eslint-plugin-react-hooks enforces.
> 3. **Per-word highlight on the spoken bubble** — new
>    `<SpokenMessage>` renderer tokenises the same plainified text
>    that feeds `speakWithBoundaries`, so the visible highlight stays
>    locked to the TTS boundary stream. Bubble swaps `<FormattedText>`
>    → `<SpokenMessage>` only while `speakingMsgIdx === i`; markdown
>    formatting returns after TTS ends. Highlight uses purple
>    (`rgba(124,58,237,0.45)`) consistent with the existing Roleplay /
>    Comprehension Read-Along styling.
> 4. **"Say stop" interrupt** — `startKeywordSpotter` is generalised
>    with an optional `parser` arg (defaults to `parseRatingKeyword`
>    so the flashcard call site is unchanged) and reused with the new
>    `parseStopKeyword` to listen for `stop`/`cancel`/`halt`/`quiet`/
>    `berhenti`/`diam` while the synthesiser is talking. Chromium
>    tolerates concurrent SR + TTS on desktop; on Safari we degrade
>    gracefully — the manual Stop button in the status banner stays
>    available.
> 5. **`plainifyForSpeech` markdown stripper** (also in
>    `src/lib/speech.js`) — covers bold / italic / underline / inline
>    code / links / leading list markers / headings / horizontal
>    rules / table syntax (separator rows dropped, pipes → spaces).
>    Pure leaf so vitest pins it without a JSDOM dance.
> 6. **Vitest pin** — `src/lib/__tests__/speech.test.js` grows from
>    11 → 21 cases: 4 cases for `parseStopKeyword` (registered words,
>    Malay equivalents, substring guard), 6 cases for
>    `plainifyForSpeech` (bold/italic, code/link/headings, lists +
>    HR, table flattening, round-trip-with-tokeniser). Total suite
>    now **148/148** (was 138; net +10 with no flips).
>
> Earlier Round-3 Part-2 work (still load-bearing):
>
> 1. **Speak-to-rate keyword spotter** — `FlashcardMode.jsx` standard
>
> 1. **Speak-to-rate keyword spotter** — `FlashcardMode.jsx` standard
>    & hint variants now ship a Mic toggle next to the front-face
>    Volume2. When on AND the card is flipped AND TTS is not actively
>    reading, a continuous `webkitSpeechRecognition` instance
>    (`en-US`, `continuous=true`, `interimResults=true`) listens for
>    `Again / Hard / Good / Easy` and calls `rate(matched)` the
>    instant a partial transcript contains a keyword. Pulsing
>    `animate-pulse` mic + colour-coded keyword hint show the
>    affordance. New `parseRatingKeyword(transcript)` in
>    `src/lib/speech.js` is the pure leaf — whole-word, case-
>    insensitive, conflict priority `again > hard > good > easy`
>    (conservative grade on self-correction). `startKeywordSpotter()`
>    is the controller (auto-restarts on benign `onend`, swallows
>    `no-speech`/`aborted`, returns `{stop}`).
> 2. **TTS↔ASR gating** — `speak()` extended with a backward-compat
>    4th-arg `options = { onStart, onEnd, onError }` so the
>    flashcard's `isSpeaking` flag flips true while it reads the
>    Malay word aloud and the spotter `useEffect` un-mounts the
>    recogniser (then re-mounts on `onEnd`). Stops the
>    self-recognition loop where the mic would hear "saya" and
>    misfire.
> 3. **Per-card state reset** — `flipped`, `showHint`, `lastMatch`
>    now reset on `card.m` change via the React 19 "adjust state on
>    prop change" pattern (synchronous `if (card?.m !== prev)
>    setState` during render, not a `setState`-in-effect — passes the
>    `react-hooks/set-state-in-effect` lint that the v19 toolchain
>    enforces).
> 4. **Vitest pin** — `src/lib/__tests__/speech.test.js` grows from 5
>    → 11 cases pinning `parseRatingKeyword`: empty/null guard,
>    one-keyword happy path, case-insensitivity + punctuation,
>    substring guard (`hardest`/`goodness`/`uneasy`/`regain` must
>    NOT match), conflict priority, natural-speech phrasings ("try
>    again please", "too easy"). Total suite now **138/138** (was
>    132; net +6 with no flips).
>
> Earlier Round-3 Part-1 work (still load-bearing):
>
> 1. **Connective Checklist (Penanda Wacana sidebar)** — new
>
> 1. **Connective Checklist (Penanda Wacana sidebar)** — new
>    `src/components/writing/ConnectorChecklist.jsx` plus
>    `src/data/connectors.js`. Appears on `/writing` whenever the
>    Bahasa Melayu tab is active, above the textarea. 28 high-yield
>    connectors grouped into 5 buckets: Tambahan (addition),
>    Pertentangan (contrast), Urutan (sequence), Sebab & Akibat
>    (cause/effect), Contoh (example). Each chip lights up in its
>    group colour the instant the student types the phrase — soft
>    word-boundary regex, case-insensitive, accepts variants like
>    `walaubagaimanapun ↔ walau bagaimanapun`, and tolerates extra
>    whitespace between multi-word tokens. Header pill shows total
>    coverage `N/28 used`; each group header shows per-group `n/k`.
>    All colours flow through `var(--color-*)` so the existing
>    `.contrast-high` overlay and `.font-dyslexic` Lexend body font
>    reskin it with zero extra CSS. Collapsible: panel-level + per
>    group, defaults to open so first-time users see the affordance.
> 2. **Vitest pin** — `src/data/__tests__/connectors.test.js` (7
>    cases) locks the detector contract: substring guard (`tetapinya`
>    must NOT match `tetapi`), flexible whitespace between multi-word
>    tokens, registered variants, case insensitivity, coverage stats
>    shape, and the zero-usage path. Total suite now **132/132** (was
>    125; net +7 with no flips).
>
> Earlier Round-2 work (still load-bearing):
>
> 1. **Theme Choice — Dyslexic font + High Contrast** (`7778132`) —
>    UDL Principle 1 closed. New `dyslexicFont` + `highContrast` prefs
>    (both default OFF, opt-in from Settings). `.font-dyslexic` swaps
>    body type to Lexend with +0.02em tracking and 1.6 line-height
>    (research-backed reading-proficiency font; loaded via the existing
>    Google Fonts `<link>` so zero extra preconnects). `.contrast-high`
>    overlays WCAG-AAA tokens on top of dark OR light + auto-bumps every
>    inline 1px-solid border to 2px so card edges read clearly. Composes
>    cleanly with `.light` via specificity (`light.contrast-high` wins).
>    STORE_VERSION bumped 15 → 16 with a defaults-off migration.
>
> 1. **Theme Choice — Dyslexic font + High Contrast** (`7778132`) —
>    UDL Principle 1 closed. New `dyslexicFont` + `highContrast` prefs
>    (both default OFF, opt-in from Settings). `.font-dyslexic` swaps
>    body type to Lexend with +0.02em tracking and 1.6 line-height
>    (research-backed reading-proficiency font; loaded via the existing
>    Google Fonts `<link>` so zero extra preconnects). `.contrast-high`
>    overlays WCAG-AAA tokens on top of dark OR light + auto-bumps every
>    inline 1px-solid border to 2px so card edges read clearly. Composes
>    cleanly with `.light` via specificity (`light.contrast-high` wins).
>    STORE_VERSION bumped 15 → 16 with a defaults-off migration.
> 2. **+20 verb emojis** (`48c211e`, Round 2) — Visual Dictionary map grew
>    50 → 70 entries with the high-yield verb roots called out in §4
>    Item 24: tulis ✍️, ajar 🧑‍🏫, kerja 💼, main 🎮, masak 🍳,
>    jual 💰, beli 🛒, jalan 🚶, cari 🔍, dengar 👂, tanya ❓,
>    fikir 💭, tahu 💡, guna 🔧, ubah 🔄, nyanyi 🎤, lukis 🎨,
>    latih 🏋️, hantar 📤, potong ✂️. Each root blooms 5–7 forms
>    through imbuhan so Roleplay vocab-chip reach ≈ +130 hits.
> 3. **Roleplay Read-Along (the killer feature)** (`9598d16`, Round 2) — §4
>    Item 25(c) lands. AI mode + Static mode examiner bubbles now read
>    aloud with the same ADHD-safe purple word-by-word highlight
>    Comprehension uses. Per-bubble token render, one in-flight
>    speaker shared across the chat, cleanup wired at every state
>    transition (turn advance, Try Again, scenario exit, route change,
>    component unmount). Listen button replaced with a localised
>    `Read along ↔ Stop` toggle. No setState-in-effect anti-pattern.
>
> Build / lint / **168/168 vitest** all green locally. STORE_VERSION = 17.
> **🎉 UDL roadmap is officially 9/9 — every Principle 1, 2, and 3
> box ticked.** With the pedagogical scaffolding closed, the natural
> next axis is content depth, not more UDL plumbing:
> §4 Item 25(a) PDFReader full-page read-along (the third Audio-Visual
> Sync surface), §4 Item 25(b) Flashcard back-face example read-along,
> more dictionary entries (especially derived imbuhan forms — every
> new root unlocks ≥5 word-family nodes), more roleplay scenarios
> (especially for English Paper 0500), more reading passages, more
> grammar drills, or shipping the production polish chapter (PWA
> install banner, analytics, beta-tester telemetry).

---

## 1. Where you are

```
/Users/kheshav/Kheshav/kheshav code/
├── og igcse malay master/        ← DEPRECATED. Slated for archival to avoid maintenance hell.
└── upg-igcse-malay-master/        ← THIS repo. Active. Single Codebase (Free/Pro Toggle).
```

Both clones share the **same GitHub remote** (`godman4242/og-igcse-malay-master.git`).
The "fork" is just two local checkouts on different branches.

**STRATEGIC DIRECTIVE: Single Codebase with Feature Gate**
All future work happens in the **upg** version. Instead of maintaining two codebases, we are using a "Free/Pro Toggle":
- **Free Tier (Guest Mode)**: Full access to learning pedagogy, stored in `localStorage`.
- **Pro Tier (Authenticated)**: Supabase cloud sync + premium AI features, unlocked via Auth.

## 2. Current branch & status (upg repo)

- **Branch:** `main`. PR #2 merged 2026-05-13 19:22 UTC at `7d1c2bb`;
  Round 1 added 9 commits (`1c72eeb` → `2b0aeab`); Round 2 added 3
  more (`7778132`, `48c211e`, `9598d16`). HEAD = `9598d16`. The
  feature branch `feat/phase-a-into-upg` still exists on origin —
  delete it once you're confident no follow-ups need it.
- **Build:** clean. `npm run build` passes locally (Vite 8, requires Node 20+).
- **Lint:** `npm run lint` — 0 errors, 1 pre-existing warning (`MixedSession.jsx:30`
  exhaustive-deps).
- **Tests:** `npm run test:run` — **168/168** pass (120 baseline + 21
  cases in `src/lib/__tests__/speech.test.js` pinning the Read-Along
  tokeniser, the speak-to-rate `parseRatingKeyword`, the Cikgu-voice
  `parseStopKeyword`, and the `plainifyForSpeech` markdown stripper
  + 7 cases in `src/data/__tests__/connectors.test.js` pinning the
  Penanda-Wacana detector + 9 cases in
  `src/lib/__tests__/wordFamilyLayout.test.js` pinning the radial
  layout math + 11 cases in
  `src/lib/__tests__/interests.test.js` pinning the personal-interest
  catalog, matcher, and prioritisation sort).
- **CI on `main`:** all jobs green (Node bumped 18 → 20 in commit
  `8f4668e`; Vercel deploy action swapped from removed
  `vercel/vercel-action@v23` to `amondnet/vercel-action@v25` on
  2026-05-14, commit `1c72eeb`).
- **Store schema:** STORE_VERSION = 17 (v17 migration adds
  `userInterests: []`, defaults-empty so the Comprehension + Roleplay
  ordering stays untouched until a student stars something). v16 still
  adds `dyslexicFont` + `highContrast` (both default off). v15 still
  defaults `showDictionaryImages: true`.
- **Working tree:** clean.

## 3. What is DONE — do NOT redo

### From og's Phase A (just merged in)
- ✅ **Translation router** (`src/lib/translate.js`) — DeepL → Google → free `gtx`
- ✅ **PDF Reader** at `/pdf-reader` — drop, click=word, drag=phrase, Select mode
- ✅ **Import page tabs** — paste / PDF upload, sticky result panels
- ✅ **Writing grader** (`src/lib/writingGrader.js`) — 21 IGCSE formats, EN+MY, auto-detect
- ✅ **Writing Tutor** (`src/components/WritingTutor.jsx`) — Gemini Flash, follow-up Q&A
- ✅ **Speaking page** at `/speaking` — IGCSE Paper 3 grader (heuristic + Gemini AI),
  filler-word detection, discourse-marker checking, type-token ratio, words-per-second
- ✅ **Cikgu Maya** — prefers Gemini over OpenRouter
- ✅ **Settings → Translation & AI** — provider radios, cache controls
- ✅ **Roleplay lint fix** — opening message in `useState` initializer
- ✅ **Lint sweep** — 154 pre-existing errors fixed; eslint ignores nested clone + scripts

### From upg's prior work (preserved)
- ✅ **Supabase cloud sync** — `src/lib/cloudSync.js`, `src/lib/syncEngine.js`, queue + retry
- ✅ **Telemetry** — `src/lib/telemetry.js`, dual-write localStorage + Supabase
- ✅ **AuthUnlock** — `src/components/AuthUnlock.jsx` for enhanced/admin/owner tiers
- ✅ **Service worker** — `public/sw.js`
- ✅ **Network/sync UI** — header pill in `Layout.jsx`

### Conflict resolutions (during the merge)
- **`src/lib/speakingGrader.js`** — kept og's version. Reason: IGCSE-rubric-aligned,
  filler-word detection, fluency by duration, evidence-based AI feedback. upg's
  scenario-based grader was better suited for roleplay (which has its own grader).
- **`src/pages/Speaking.jsx`** — kept og's version (paired with the grader above).
- **`src/store/useStore.js`** — kept STORE_VERSION = 9 (upg's), v8 migration adds
  og's fields (translation, writingTutor, writingHistory, speakingHistory,
  pdfRecents), v9 migration is redundant-but-harmless.
- **`src/components/Layout.jsx`** — auto-merged; deduped a duplicate `/speaking`
  MORE_ITEM that both branches added.

### English writing analyzer accuracy overhaul (2026-05-05)
- ✅ **`src/lib/writingErrors.js`** (NEW, ~700 lines) — rule-based English
  grammar/style engine. Returns `{type, severity, start, end, excerpt,
  message, suggestion}` per finding. Detects: 200+ misspellings,
  apostrophe-missing contractions (dont/didnt/etc.), confusables
  (their/there/they're, its/it's, then/than, affect/effect, lose/loose,
  accept/except, advice/advise, less/fewer, would-of, …), a/an articles,
  repeated words, capitalization, SVA patterns, double negatives,
  comma splice / run-on / fragment with conservative guards (skip
  letter greetings, transitional phrases, intro phrases ≤4 words),
  weak/filler words, cliches, wordy phrases, contractions in formal
  formats. **Tense-shift detection is intentionally disabled** — needs
  clause-level parsing to avoid false positives on grammatical
  generic-present clauses inside past-tense narration; LLM tutor
  handles it.
- ✅ **`src/lib/writingGrader.js`** — added real metrics: TTR (with
  100-word MSTTR window for length bias), sentence-length σ, complex
  ratio, opener variety, long-word ratio, avg syllables/word, unique
  discourse markers, error density per 100w. Replaced single-band
  English scoring with **multi-criterion sub-bands**: Content (25%),
  Accuracy (25%), Vocabulary (20%), Sentence Variety (15%), Cohesion
  (10%), Format (5%). Hard cap: overall ≤ accuracy + 1, so a
  high-error essay cannot reach band 6.
- ✅ **`src/pages/Writing.jsx`** — `SubBandsPanel` (band-breakdown grid
  with the 10 metric lines exposed) + `IssuesPanel` (severity filters,
  inline highlighted essay with wavy underlines, click-to-expand
  findings list).
- ✅ **`src/components/WritingTutor.jsx`** — Gemini system prompt now
  pre-loaded with sub-bands, metrics, and top 25 rule-engine findings
  as ground-truth evidence. LLM is told to "agree or disagree, do not
  invent new ones" — fixes the prior hallucinated-issue problem.
- **Calibration:** error-laden essay → 24 real findings; clean formal
  letter → 0 false positives; narrative w/ dialogue + past narration
  → 0 false positives.
- **Future-work pointer:** if accuracy still falls short, the next
  natural step is to layer `retext-spell` + `dictionary-en` (true
  spell check) and/or `harper-wasm` for parser-grade grammar checks.
  Bundle cost ~300–500 KB; acceptable on a desktop revision tool.
  Malay analyzer is unchanged — it still uses the same count-based
  metrics; mirroring this rule engine for Malay (imbuhan, register
  errors) is a future task.

### Learning-quality pass (added on top of the merge)
- ✅ **Bug fix:** speaking sessions weren't syncing to Supabase. The merge had
  left two log actions; `logSpeakingSession` (used by the page) didn't enqueue
  cloud sync. Fixed in `8a83348` — now generates a UUID, calls `trackEvent`,
  and enqueues a sync event.
- ✅ **Telemetry wiring** — added `speaking_attempt`, `writing_analyzed`,
  `pdf_opened`, `roleplay_completed` events at the store-action level so they
  fire regardless of caller. Card-review telemetry deliberately skipped (would
  saturate the 500-event localStorage cap).
- ✅ **English Comprehension** — three IGCSE 0500/0510-style passages added
  (narrative "The Empty Seat", argumentative "Are Phones Really the Problem?",
  environmental informative "The Cities Beneath the Waves"). Added `lang`
  field to all passages. Page now shows EN/MY pill, gates dictionary lookup
  to Malay, switches TTS voice, localises feedback text.
- ✅ **AI question generation in Comprehension** — was stubbed; now wired.
  "Get fresh AI questions" button calls Gemini with a prompt for 5 fresh
  IGCSE-style MCQs in the passage's language. Gracefully hidden when no key.
- ✅ **AI prompt tightening** (Speaking, Writing tutor, Cikgu) — replaced
  abstract criteria with band descriptors, language-specific focus blocks
  (Malay = imbuhan/tense/connectors/penanda wacana/register; English =
  tense consistency/SVA/comma splices/sentence variety/vocab precision),
  evidence-anchored output, anti-grade-inflation guards, and concrete-drill
  "next step" requirements.
- ✅ **5 new speaking topics** — `cita-cita` (career), `cabaran` (challenge
  overcome), `perayaan` (festival), `buku` (book that changed me),
  `bandar-kampung` (city vs village). Now 15 topics rotating through
  narrative / opinion / cultural / reflection / comparative genres.

### Malay analyzer + analyzer-driven banding (2026-05-06, commit 7481b75)
- ✅ **`src/lib/writingErrorsMalay.js`** (NEW, ~830 lines) — mirror of
  the English engine for Bahasa Melayu. Detects MS misspellings
  (kerena/masaalah/ibubapa…), imbuhan errors (mempukul→memukul,
  mengkira→mengira, mensapu→menyapu, mentulis→menulis,
  merubah→mengubah, mempertingkatkan→meningkatkan), preposition fixes
  (dari pada→daripada, kerumah→ke rumah, walaubagaimanapun, terdiri
  dari→terdiri daripada), slang in formal contexts (tak/nak/dah/
  macam/lah/je/sgt…), repeated words, capitalization, run-ons, closing
  markers placed too early, tense conflicts (sudah/sedang/akan +
  conflicting markers), style nudges. Reduplication-safe (kanak-kanak
  treated as a single token). Calibrated against clean rencana,
  noisy tak/nak text, and quoted-dialog narratives.
- ✅ **`src/lib/writingGrader.js`** — Malay branch now runs through
  `bandMalayCriteria` mirroring the English sub-band engine: Content
  (25%), Accuracy (25%), Vocabulary (20%), Variety (15%), Cohesion
  (10%), Format (5%), with the same hard caps (overall ≤ accuracy + 1,
  capped to content if word-count < minW × 0.6). MS-specific
  sophisticated-vocab list (segolongan/sebaliknya/ironinya/kompleks/
  signifikan/lazim/tradisional/…), MS stop-word list, MS syllable
  estimator. WritingTutor evidence block now active for both languages.
- ✅ **AI hybrid evaluator (Phase C, commits 4778edb → cbaee66)**:
  Gemini-based `fetchAIGrade` runs alongside the local analyzer, fed
  the local metrics + top findings + format markers as evidence.
  System prompt includes chain-of-thought ("step_by_step_reasoning"),
  explicit anti-central-tendency calibration ("you MUST use the full
  1-6 range"), hard thresholds tied to local evidence, and band
  descriptors. Structured JSON output. UI surfaces AI band, marker
  checklist, positives, improvements; falls back to local heuristic
  band when the API errors (no silent failures — error surfaces in
  UI).
- ✅ **Pronunciation diff feedback on Speaking (commit 37ded14)** —
  `src/lib/diff.js` (LCS word diff). `Speaking.jsx` renders a coloured
  diff between student transcript and Gemini's `improvedTranscript`:
  green pills for additions, red strikethrough for removals,
  unchanged in body colour.

### Insights pass (2026-05-09)
- ✅ **`src/lib/patterns.js`** — added `weakestWritingFormats(history,
  limit)` and `weakestSpeakingTopics(history, limit)` helpers built on
  a generic `aggregateByKey`.
- ✅ **`src/pages/MistakeJournal.jsx`** — new "Performance Trends"
  section between filter tabs and pattern clusters. Shows weakest
  writing formats and speaking topics with avg/last/total stats and
  a "Practice" jump button. Empty-state guard updated to consider
  these signals.
- ✅ **`src/pages/Dashboard.jsx`** — `<RecentPerformance>` card surfaces
  last band + weakest formats and topics for both Writing and
  Speaking, gated on having any history; navigates to /writing or
  /speaking on click.

### Format coverage round-out (2026-05-09)
- ✅ **English: Review, Interview Transcript, Diary** — added to
  `FORMATS` in `writingGrader.js`. Review is the most common Paper 2
  Section 1 directed-writing task that wasn't covered.
- ✅ **Malay: Wawancara, Berita, Autobiografi** — added to `FORMATS`.
  Wawancara is a key 0546 Paper 2 task; Berita and Autobiografi round
  out long-form factual coverage. New formal formats (`ms-berita`,
  `ms-autobiografi`) flag slang/contractions. `eng-speech` added to
  English formal-format set.
- ✅ **Lint clean** — no errors after the format pass.

### Learning-content lifts (2026-05-09, commits da9ac57 → f8675c2)

- ✅ **Band-6 exemplars per format** (`src/data/exemplars.js`,
  `Writing.jsx#ExemplarPanel`, commit da9ac57) — annotated opening +
  closing paragraphs for 14 IGCSE formats (7 EN, 7 MS). Each
  annotation highlights a vocab / cohesion / format / craft technique
  that earns marks. Surfaced as a collapsible panel above the
  textarea once a specific format is selected (or auto-detected),
  so students see what the top band looks like *before* they draft.
  Renderer uses non-overlapping range walk + paragraph-aware splitter;
  all 14 exemplars × annotations verified to exist verbatim.

- ✅ **254 curated vocab example sentences**
  (`src/data/dictionaryExamples.js`, commit da9ac57) — full coverage
  of the 254 unique seed words across the 13 topic packs. Replaces
  the old `'kerja (work).'` placeholder pattern with real,
  IGCSE-register Malay sentences (7-15 words, headword used in
  natural context, concrete situational framing). `loadTopicPack`
  reads from EXAMPLES first; STORE_VERSION bumped to 10 with a
  migration that detects the placeholder pattern and upgrades existing
  cards in place. The cloze study mode (`Study.jsx`) automatically
  benefits — it now shows real sentences with the headword blanked.

- ✅ **English grammar drills + language toggle**
  (`src/data/grammarEng.js`, `Grammar.jsx`, commit 1df4618) — the
  Grammar page was Malay-only. Now a top-level lang toggle swaps the
  whole experience: Bahasa Melayu (5 tabs: Imbuhan / Tense / Find
  Error / Transform / Rules) vs English (7 tabs: Confusables / Tense
  / SVA / Articles / Find Error / Transform / Rules). 60+ English
  drills covering 15 mixed tenses, 12 SVA traps, 12 article patterns,
  15 high-yield confusables (their/there/they're, its/it's, fewer/
  less, would-of, …), 10 sentence-level error-spotters, 9 transforms
  (active↔passive, direct→reported, second conditional, so→too,
  relative clauses). Shared `<McqDrillCard>` component matches
  Tense-card styling for visual parity.

- ✅ **English speaking practice** (`src/data/speakingTopics.js
  TOPICS_EN`, `src/lib/speakingGrader.js`, `src/pages/Speaking.jsx`,
  commit f8675c2) — Speaking page was Malay-only. Now language-aware:
  10 English topics (family, school, hobby, technology, environment,
  future, book/film, challenge, city/village, friendship), each
  written for 0500/0510 register and pushing argument + concrete
  example over generic listing. Grader is fully parametrised:
  PW_EN (30 discourse markers), FORM_EN (40 sophisticated lexicon
  items), language-specific filler list (drops Malay particles in
  English mode and adds English-specific fillers like / you know /
  basically). `aiGrade` selects SYS_PROMPT_EN vs SYS_PROMPT_MS
  with rubric-correct band descriptors and pitfall lists. Speech
  recognition + TTS switch between en-GB and ms-MY. Recent-sessions
  recents look up from both topic arrays so a learner can switch
  languages without losing prior bands.

### Coverage round-out (2026-05-10)

- ✅ **English roleplay scenarios** (`src/data/scenarios.js#SCENARIOS_EN`,
  `src/pages/Roleplay.jsx`) — 7 IGCSE 0500/0510 scenarios (lost luggage,
  faulty product return, hotel booking, asking directions, café job
  interview, hospital visit, noisy neighbour). Lang toggle on Roleplay
  swaps the scenario list. Static-mode evaluator stays Malay-only;
  English scenarios are AI-only with a friendly fallback when the
  daily quota is exhausted. RoleplaySession now picks SR/TTS locale
  from `scenario.lang`.
- ✅ **Listening (Paper 4)** (`src/data/listeningPassages.js`,
  `src/pages/Listening.jsx`, route `/listening`) — TTS-rendered passages
  with replay limit (max 2, second play slower). Questions stay locked
  until at least one play completes. 6 starter passages (3 EN, 3 MS)
  covering announcements, voicemails, briefings, news. Wrong answers
  feed the unified mistake pipeline as `type='comprehension'` with a
  `[Listening]` prefix. Lazy-loaded route + Layout drawer entry.
- ✅ **Mistakes-deck shortcut** (`src/pages/MistakeJournal.jsx`,
  `src/pages/Dashboard.jsx`) — auto-promoted mistakes already land in a
  deck tagged 'Mistakes'. The Mistake Journal grows a 2-up CTA
  ("Practice all" + "Mistakes deck (N)") and the Dashboard's first
  Quick Action swaps to a red→orange "Mistakes deck (N)" gradient
  when the deck is non-empty.

### Pillar 4 — Performance + bundle split (2026-05-10)

- ✅ **Route-level code splitting** (`src/App.jsx`) — every page except
  Dashboard is `React.lazy()`-imported and wrapped in `<Suspense>`.
  Initial JS bundle dropped from **1,323 KB / 390 KB gzipped** to
  **421 KB / 128 KB gzipped** (~3x reduction). pdfjs is its own
  330 KB chunk that only loads when `/pdf-reader` is opened. Each route
  is its own chunk under 70 KB.
- ✅ **Memoized Dashboard widgets** — `ProgressSparkline` and
  `WorstTurnWidget` wrapped in `React.memo`; `worstSpeak` and `rolling`
  computed with `useMemo` so they don't re-run when unrelated store state
  changes.
- ✅ **Stable empty-array refs** — Speaking page no longer uses
  `?? []` inside the selector (which would allocate a new array every
  render and bust shallow equality); switched to a module-level
  `EMPTY_ARR` plus `useMemo` for the recents slice.

### Pillar 2 — Spaced exam rehearsal (2026-05-10)

- ✅ **New `/exam-rehearsal` route** (`src/pages/ExamRehearsal.jsx`) —
  30-minute IGCSE simulation: comprehension passage (8 min) → directed
  writing prompt auto-derived from the passage (12 min) → 90-second
  spoken defense (10 min). Soft per-stage timers; reuses existing
  `gradeWriting` and `heuristicGrade` libraries; no new AI calls.
- ✅ **Composite Exam Readiness %** — `getExamReadiness()` blends
  comprehension (30%), writing band (35%), speaking band (35%) into a
  0-100 score, then smooths the latest attempt (70%) against the
  previous three (30%). Surfaced as a prominent CTA card on the
  Dashboard with "due now" highlight when the FSRS-style schedule says
  it's time.
- ✅ **FSRS-style scheduling** — `getNextExamDue()` clamps the next
  rehearsal to 3-30 days based on smoothed readiness.
- ✅ **Store version 11 → 12** — `examAttempts` array (capped at 50),
  migration adds the array. `logExamAttempt` writes per-attempt records
  and enqueues a sync event.
- ✅ **Routes wired** — `/exam-rehearsal` added to `App.jsx`, surfaced in
  the Layout "More" drawer with the Trophy icon at the top of the list.

### Pillar 1 — Universal mistake pipeline (2026-05-10, commit d01fc6b)

- ✅ **Mistakes flow through one stream** — Writing sentence-level errors,
  roleplay key-phrase misses + per-turn grammar notes, comprehension wrong
  answers, and low-band speaking sessions all call `addMistake` with rich
  context (`type`, `category`, `severity`, `surface`, `correction`,
  `language`). Existing `mistakeReasons` and existing call sites stay
  working.
- ✅ **Auto-promotion to FSRS cards** — vocab/imbuhan mistakes with a
  Malay headword + English correction become cards in a `Mistakes` deck
  (elevated initial difficulty). Manual promotion via `+ Card` button on
  each row in the journal and Dashboard widget.
- ✅ **Dedup + escalation** — `addMistake` dedupes by content hash within
  24h and bumps an attempts counter; severity escalates (low→med→high)
  as a mistake recurs.
- ✅ **Fix-Up queue** — `getFixUpQueue(limit)` returns top mistakes ranked
  by severity × recency, deduped per word. Surfaced as a 3-row card on
  the Dashboard with inline promote/fix actions, and as the canonical
  feed in the Mistake Journal.
- ✅ **Rich Journal UI** — category pills (Vocab / Imbuhan / Tense /
  Spelling / Cohesion / Register / Pronunciation / Comprehension /
  Fluency / Other), source icons (writing / roleplay / speaking / comp),
  severity dots, attempts counter, given→correct diff, language tag.
  Filter chips become category-driven.
- ✅ **STORE_VERSION 10 → 11** — migration backfills new fields on
  legacy mistake records without losing data.

## 4. What is NOT done — open work

| #   | Task                                       | Where to start                                         |
| --- | ------------------------------------------ | ------------------------------------------------------ |
| 1   | ✅ Open the PR for the merge               | DONE. PR #2 **MERGED** to `main` 2026-05-13 19:22 UTC (commit `7d1c2bb`). |
| 2   | ✅ Smoke-test in browser before merging PR #2 | DONE. Antigravity browser-agent ran the full per-route checklist; all 10 points passed including the new UDL goal toggle and the `/speaking` timeout warning. |
| 3   | ✅ Pronunciation diff feedback on Speaking | DONE (commit 37ded14). |
| 4   | ✅ Mistake review surfacing                | DONE. |
| 5   | ✅ Dashboard insights                      | DONE. |
| 6   | More dictionary entries                    | `src/data/dictionary.js` has 804 headwords. The 254 used by topic packs now have `dictionaryExamples.js` coverage. Adding more requires (a) a new headword in `dictionary.js`, (b) a topic pack assignment, and (c) an example sentence. Quality > quantity. |
| 7   | ✅ English writing format examples         | DONE. |
| 8   | ✅ Mirror writingErrors.js for Malay       | DONE. |
| 9   | Optional: layered spell check              | If misspellings still slip through, add `retext-spell` + `dictionary-en` lazy-loaded behind the existing rule engine (~300–500 KB). |
| 10  | ✅ Per-format band-5/6 exemplar essays | DONE — **27 of 27** coverage. Round 1 (7) + Round 2 (7) + Round 3 (6: `eng-directed`, `ms-directed`, `ms-email`, `eng-diary`, `ms-autobiografi`, `eng-interview`). Cross-checked: every `id:` in `src/lib/writingGrader.js` has a matching key in `src/data/exemplars.js`; zero orphans. Per-entry shape: `{ opening, closing, annotations: [{ phrase, category: 'vocab'\|'cohesion'\|'format'\|'craft' }] }`. Adding new formats in the future = add to grader AND drop a matching exemplar key. |
| 11  | ✅ English roleplay scenarios              | DONE — 7 scenarios + lang toggle. |
| 12  | ✅ IGCSE Listening (Paper 4)               | DONE — `/listening` MVP with 6 passages (3 EN, 3 MS), TTS replay, locked questions, mistake-pipeline integration. Adding more passages is purely additive content. |
| 13  | More comprehension passages                | `src/data/comprehensionPassages.js` has 8 passages (5 ms + 3 en). Both syllabuses benefit from more practice across genres. |
| 14  | Decide og branch fate (now actionable)     | PR #2 is merged. Safe to delete `feat/pdf-translator-writing-upgrade-og` from origin, plus the now-merged `feat/phase-a-into-upg` if no follow-ups need it. |
| 22  | ✅ Fix Vercel deploy workflow rot           | DONE 2026-05-14. Both `deploy-preview` and `deploy-production` jobs now use `amondnet/vercel-action@v25` (with `github-token` for PR comments and `vercel-args: '--prod'` on production). Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` are still required in repo settings. |
| 15  | ✅ Mistakes pipeline + auto-promotion      | DONE — Pillar 1. Universal mistake stream from Writing/Roleplay/Comprehension/Speaking → MistakeJournal → auto-FSRS card promotion → Mistakes deck shortcut from Dashboard + Journal. |
| 16  | ✅ Spaced exam rehearsal                   | DONE — Pillar 2. `/exam-rehearsal` 30-min IGCSE simulation. Composite Exam Readiness % on Dashboard. |
| 17  | ✅ Worst-turn widget + 30-day chart        | DONE — Pillar 3. |
| 18  | ✅ Code-splitting + memoization            | DONE — Pillar 4. Initial JS dropped 1.3 MB → 421 KB. |
| 19  | ✅ Vitest pin on graders + FSRS            | DONE. 79 tests across `fsrs`, `writingErrors`, `writingErrorsMalay`, `writingGrader`, `speakingGrader`, `writingMistakeHarvest`. Run with `npm test` (watch) or `npm run test:run` (CI). |
| 20  | ✅ Writing.jsx atomic refactor             | DONE. Page 1042 → 367 lines. Logic split into `useWritingEvaluator` hook + 6 components in `src/components/writing/` + `lib/writingMistakeHarvest.js` + `lib/json.js`. ZERO behaviour change — same render tree, same store interactions. |
| 21  | ✅ Study.jsx atomic refactor               | DONE. Page 1016 → 149 lines. Logic split into `useStudySession` hook + 6 mode components + 2 shared sub-components + SessionSummary in `src/components/study/` + `lib/study/quizOptions.js`. 10 new Vitest cases pin the seeded RNG and quiz-option generator. ZERO behaviour change. Mode components remount per-card via React `key` so per-mode local state resets cleanly without the old global `nextCard()` state-clear sweep. |
| 23  | Tier-1 AI dictionary icons (BLOCKED on provider) | Infrastructure shipped 2026-05-14 (`2b0aeab`): `scripts/generate-dict-icons.mjs` + manifest + resolver upgrade. **Blocked**: Gemini free tier has `limit: 0` for `gemini-2.5-flash-image`. Provider options (user picked "defer" 2026-05-14): (a) Gemini billing — ~$3.85 for 50 icons at $0.077/image, script works unchanged; (b) Replicate Flux Schnell — ~$0.15 for 50, needs ~30-line adapter in the script + `REPLICATE_API_TOKEN`; (c) OpenAI DALL-E 3 — ~$2 for 50, needs OpenAI adapter + `OPENAI_API_KEY`. When ready: pick provider, set env var, `npm run gen:dict-icons -- --only=rumah,nasi,ayam,buku,kereta` first (5-word style check), review, then drop `--only` to do the rest. Resolver auto-prefers manifest hits — no call-site changes required. |
| 24  | ✅ Expand Tier-0 emoji map (+20 verbs)     | DONE 2026-05-14 night, commit `48c211e`. `src/data/dictionaryIcons.js` now 50 → 70 entries; the 20 verb roots from the original brief (tulis, ajar, kerja, main, masak, jual, beli, jalan, cari, dengar, tanya, fikir, tahu, guna, ubah, nyanyi, lukis, latih, hantar, potong) all landed. Skips honoured: pandu / tinggal / bangun. |
| 25  | Extend Read-Along to other surfaces        | (c) ✅ **DONE 2026-05-14 night, commit `9598d16`** — Roleplay AI mode + Static mode examiner turns now read aloud with the same purple word-highlight Comprehension uses. Per-bubble tokenised render, single in-flight speaker shared across the chat, cleanup at turn-advance / retry / scenario-exit / unmount. Still open: (a) PDFReader full-page read-along — layer on top of existing tap-translate without breaking it; (b) Flashcard example sentence read-along on the back face with intra-sentence highlight. |
| 26  | ✅ UDL Principle 1 — Theme Choice          | DONE 2026-05-14 night, commit `7778132`. Dyslexic-friendly Lexend font + WCAG-AAA high-contrast overlay. Both opt-in from Settings (defaults off so returning users see no change). STORE_VERSION 15 → 16. Closes the last two unchecked boxes on UDL Principle 1 (the Goal-level box was already ticked). |

### Testing layer (2026-05-10)

- ✅ **Vitest 4 added** (`vite.config.js` test block, `node` env, no jsdom — pure-fn libs only).
- ✅ **`src/lib/__tests__/fsrs.test.js`** — pins createNewCardState shape, migrateFromSM2 box mapping, getSchedulingOptions returns 4 ratings with valid card+interval, reviewCard advances reps, Again on a mature card bumps lapses, isDue/getDueCards/sortByPriority correctness, buildComebackQueue ordering.
- ✅ **`src/lib/__tests__/writingErrors.test.js`** — pins specific confusable IDs (`would-of-error`, `then-comparative-error`, `between-you-and-i`, `their-be-verb`), finding shape invariants, sort order, summariseIssues math, AND the calibration negatives (clean formal letter → 0 high-severity; dialogue narrative ≤ 1 high).
- ✅ **`src/lib/__tests__/writingErrorsMalay.test.js`** — pins all 6 imbuhan rewrites (mempukul→memukul etc.), 5 preposition fixes (dari pada, kerumah, walaubagaimanapun, …), slang-gating-by-format (only fires inside formal contexts), reduplication-safe tokenisation (kanak-kanak), clean rencana → 0 high-severity.
- ✅ **`src/lib/__tests__/writingGrader.test.js`** — pins listFormats partition, autoDetectFormat picks the right format from markers, both hard caps (overall ≤ accuracy + 1; overall ≤ content when wlen < minW × 0.6), full result shape EN+MS, Malay too-short message in Malay.
- ✅ **`src/lib/__tests__/speakingGrader.test.js`** — pins return shape, all-7-gates-met → band 6, degraded path → ≤ band 3, lang-specific filler list swap (Malay particles count in MS mode but not EN; English fillers like/you-know count in EN mode), cue coverage arithmetic, wps math.

This is the safety net that future Architectural Detox work (extracting hooks out of `Writing.jsx` / `Study.jsx`) will depend on — refactor with confidence that the calibrated thresholds didn't drift.

### Writing.jsx atomic refactor (2026-05-10)

Phase 1 of the Architectural Detox plan. `Writing.jsx` shrank from
**1042 → 367 lines** with **zero behaviour change** — identical render
tree, identical store wiring, identical AI-grade flow.

New layout:

```
src/
  hooks/
    useWritingEvaluator.js     ← owns text/results/aiFeedback/isAIGrading
                                  state + analyze() (local + Gemini hybrid)
                                  + getAIFeedback() (Claude path) + reset()
  components/writing/
    Stat.jsx                   ← 10-line label/value row
    TemplatesView.jsx          ← Paper 4 Q3 karangan templates accordion
    SubBandsPanel.jsx          ← band breakdown grid + 10 metric lines
    IssuesPanel.jsx            ← severity filter + inline highlighted essay
                                  + click-to-expand finding list
    ExemplarPanel.jsx          ← annotated band-6 opening/closing exemplar
    AIFeedbackPanel.jsx        ← Claude AI sentence-level feedback render
  lib/
    writingMistakeHarvest.js   ← pure mapper: grader-result → mistake batch
                                  (also handles AI improvements branch).
                                  Pinned by 17 Vitest cases.
    json.js                    ← shared tryParseJSON (LLM JSON unwrap)
  pages/
    Writing.jsx                ← orchestration: lang/format/paper state +
                                  layout shell that composes the above
```

The hook owns the entire evaluator state machine and exposes the
minimum surface the page needs: `{ text, setText, results, aiFeedback,
isAIGrading, analyze, getAIFeedback, ai, reset }`. Two AI paths run
independently inside it:

- **English Gemini hybrid grader** (`fetchAIGrade`) fires automatically
  inside `analyze()` when `lang === 'eng'` and a Gemini key is
  configured. AI band overrides local band; on failure, local band is
  preserved and the failure surfaces in a toast (no silent fallback).
- **Claude-via-Edge-Function** (`useAI`) is opt-in — the user clicks
  "Get AI Feedback" and uses one of their daily quota calls. JSON
  output goes through `tryParseJSON` (now in `lib/json.js`).

The harvest module is the field-mapping that used to be inlined as
`harvestMistakesFromGrade`. Its 17 test cases pin the routing of
sentence-level errors (`type === 'imbuhan' | 'tense' | 'spelling' |
'register' | 'cohesion' | 'other'`), severity mapping (`'high'` stays
`'high'`, everything else becomes `'med'`), the Malay-only
`imbuhanAnalysis.incorrect[]` branch (with the `correct || suggested`
fallback), and the AI-improvements branch (severity escalates to
`'high'` when `band ≤ 3`, surface clipped to 140 chars).

Smoke-test plan after pulling this branch:

1. `npm run dev`, open `/writing`.
2. Toggle EN ↔ MS ↔ Templates — all three render and clear on switch.
3. Pick a specific format (e.g. Formal Letter) — exemplar panel
   appears above the textarea.
4. Paste an essay, click Analyze — band score, sub-bands, issues panel
   (with wavy underlines), tips render.
5. With a Gemini key set: AI grade overrides band, marker_check chips
   appear, justification line appears.
6. Templates tab → karangan accordion expands.

### Study.jsx atomic refactor (2026-05-10)

Phase 1 of the Zero-Waste Cognitive Engine, second slice. `Study.jsx`
shrank from **1016 → 149 lines** with **zero behaviour change** —
same FSRS scheduling, same comeback warm-up, same end-of-session
summary, same keyboard shortcuts, same five flashcard variants.

New layout:

```
src/
  hooks/
    useStudySession.js                 ← owns the entire session state
                                          machine: queue, mode, cardIdx,
                                          sessionStats, comeback, confidence,
                                          pendingWrongWord, vocabTip + the
                                          central rate() / nextCard() actions
  components/study/
    FlashcardMode.jsx                  ← 5 sub-variants (standard, hint,
                                          reverse, cloze, audio, produce);
                                          owns flipped/showHint/per-input
                                          state; mounts the FC keyboard
                                          handler lifecycle-correctly
    QuizMode.jsx                       ← 4 MCQ buttons via generateQuizOptions
    TypeMode.jsx, ListenMode.jsx,
    ClozeMode.jsx                      ← single-input modes
    SpeakMode.jsx                      ← speech-recognition + pronunciation diff
    ConfidenceSlot.jsx                 ← shared metacognitive prompt
    WrongExtras.jsx                    ← shared "why wrong?" reason chips +
                                          hypercorrect callout
    SessionSummary.jsx                 ← end-of-session screen with optimal-
                                          challenge prompt + reflection prompt
  lib/study/
    quizOptions.js                     ← seededRandom + generateQuizOptions
                                          (pinned by 10 Vitest cases —
                                          determinism, uniqueness, includes
                                          correct answer, infinite-loop guard)
  pages/
    Study.jsx                          ← shell: deck picker, progress bar,
                                          comeback banner, mode picker, stats
                                          row, mounts the right Mode by
                                          card key, bottom Skip button
```

The hook surface is intentionally wide (one orchestrator, not five
nested hooks) because every mode component needs to read the same
session-shared state (confidence, pendingWrongWord, scheduling preview)
and the same actions (rate, nextCard, tagReason, setMode). Splitting
it would force prop-drilling without semantic gain.

The key architectural shift for the upcoming Phase 4 work (framer-motion
transitions): mode components are **remounted per card** via
`<XMode key={cardKey} ... />`. The previous approach was one persistent
mount that the global `nextCard()` swept by manually clearing 19
useState pairs — an `<AnimatePresence>` wrapper would have been
impossible to add safely on that surface. Now each card's mode mount
is a clean unmount → enter, which AnimatePresence will pick up
naturally.

Smoke-test plan after pulling:

1. `npm run dev`, open `/study`.
2. Cycle through all 6 modes (FC, Quiz, Type, Listen, Cloze, Speak) on
   the same deck — each renders, accepts input, advances on rate.
3. Flashcard adaptive variants — let FSRS surface a `reverse` / `cloze`
   / `audio` / `produce` variant (or pick a card with stability ≥ 7d
   to trigger one) and confirm the variant block renders correctly.
4. Wrong answer in Quiz / Type → "Why?" reason chips appear; tagging
   one persists to the mistake journal.
5. Confidence prompt appears once per non-flashcard card; logging it
   then answering "wrong" while confidence == 3 surfaces the
   hypercorrect callout.
6. Comeback warm-up (set `lastSessionAt` to >7 days ago in dev tools
   localStorage to trigger) shows the purple banner + 5-dot progress.
7. Finish all due cards → Session Summary with stats + optional
   challenge / reflection prompts.
8. Keyboard: in FC mode, Space flips, 1/2/3/4 rate, S speaks, N/→ skips.


### UDL Round 1 — Visual Dictionary + Read-Along (2026-05-14 evening)

A Universal Design for Learning sprint on top of the merged PR #2
work. 9 commits, all on `main`, three coherent feature families.

**Visual Dictionary** — Tier-0 emoji + dormant Tier-1 image pipeline:
- `src/data/dictionaryIcons.js` — 50 hand-curated Malay→emoji
  mappings, IGCSE-frequency weighted (people / food / body /
  transport / places / nature / colours / time).
- `src/lib/dictionaryIcon.js` — single resolver `getDictionaryIcon(word)`.
  Returns `{ kind: 'image' | 'emoji' | 'none', src }`. Tier order:
  AI image (manifest hit) → emoji → none. Future Tier-1 slots in
  above the emoji lookup without touching call sites.
- `src/components/DictionaryIcon.jsx` — presentational. Reads
  `showDictionaryImages` from the store internally so consumers
  don't re-implement the toggle gating.
- Wired into 5 surfaces (size px chosen for context density):
  - `FlashcardMode.jsx` standard + hint variants (56px) — front
    face only. Deliberately NOT on reverse / cloze / audio /
    produce variants — would leak the answer in retrieval tasks.
  - `WordFamilyCard.jsx` root header (48px).
  - `Comprehension.jsx` word popover (28px, gated to ms passages
    to dodge cross-language confusables like `jam`).
  - `PDFReader.jsx` translation-panel rows (22px).
  - `RoleplaySession.jsx` "Good vocab" + per-turn-analysis chips
    (14px, `inline-flex` inside the `px-1.5 py-0.5` pill).
- `useStore.js`: new `showDictionaryImages: true` flag + setter;
  STORE_VERSION 14 → 15 with v15 migration that defaults the field
  on for returning users.
- `Settings.jsx`: "Word Pictures 🖼️" toggle in the Preferences
  card, directly under Theater Mode. Copy calls out the UDL
  rationale ("visual support for ADHD & dyslexia").
- **Tier-1 AI image pipeline (dormant)**:
  - `scripts/generate-dict-icons.mjs` — Gemini 2.5 Flash Image →
    `cwebp` WebP at 256px / q=85. Cached via manifest; idempotent.
    Flags: `--only=a,b,c`, `--force`, `--dry-run`, `--quality=N`,
    `--size=N`. Per-key `ENGLISH_OVERRIDES` table tunes the prompt
    subject per word so the model gets the IGCSE-syllabus sense.
    Throttled 4s/req (≈15 RPM) for free-tier safety.
  - `npm run gen:dict-icons` — wired with `--env-file=.env.local`
    so `VITE_GEMINI_KEY` loads automatically.
  - `src/data/dictionaryIconsManifest.json` — schema stub + empty
    `icons: {}`. Auto-sorted on each write so diffs stay clean.
  - **Status: blocked.** `VITE_GEMINI_KEY` has `limit: 0` on every
    image-gen model (free-tier-locked across `gemini-2.5-flash-image`,
    `gemini-2.5-flash-preview-image`, `gemini-3.1-flash-image-preview`).
    Text endpoints (writing tutor, Cikgu Maya, etc.) unaffected.
    The moment billing is enabled or a different provider is
    wired, `npm run gen:dict-icons` produces all 50 icons without
    code changes; the resolver auto-prefers the manifest hits.
    See §4 Item 23 for the provider options + costs.

**Read-Along audio-visual sync** — UDL Principle 2 (dual-coding):
- `src/lib/speech.js` extensions (backwards-compatible — existing
  `speak()` and recognition functions unchanged):
  - `tokenizeWithOffsets(text)` — pure. Returns
    `[{ word, start, end, index }]` for every non-whitespace run.
    Same tokenisation in render AND boundary-mapping so the
    highlight cursor stays locked to the visible word grid.
  - `speakWithBoundaries({ text, lang, rate, onWordChange, onStart,
    onEnd, onError, wordsPerMinute })` — 3-tier fidelity ladder
    auto-selected per platform: real `word` boundary events
    (Chromium / good voices) → `sentence` boundary events (Safari)
    → time-estimated `setTimeout` ticks at `60000 / (wpm × rate)`
    (no-boundary engines, including iOS Safari for ms-MY).
    Watchdog at 600ms after `onstart` decides tier 3. Returns
    `{ cancel }`; `cancel()` is idempotent and clears every
    internal timer.
- `src/pages/Comprehension.jsx` — old "Listen (first paragraph)"
  replaced with a "Read along / Stop" toggle that reads the FULL
  passage. Active word highlighted via
  `rgba(124,58,237,0.22)` (low-saturation 22%-opacity tint of
  `--color-accent2` purple — deliberately NOT yellow, which strobes
  for sensory-sensitive readers on rapid word changes). 120ms
  background-color transition; no border or padding change, so no
  reflow mid-playback. Cleanup `useEffect` tied to `passage?.id`
  cancels in-flight playback on passage switch / component unmount.
- 5 new vitest cases in `src/lib/__tests__/speech.test.js` pin the
  tokeniser (empty input, basic offsets, multi-whitespace collapse,
  newline/tab handling, slice-by-offset round-trip property).

**Vercel CI rescue** (`1c72eeb`):
- Both `deploy-preview` and `deploy-production` jobs swapped from
  removed `vercel/vercel-action@v23` to `amondnet/vercel-action@v25`.
  Preview now passes `github-token` for PR comments; production
  uses `vercel-args: '--prod'` instead of the old `VERCEL_ENV=production`
  env hack. Same `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`
  secrets work unchanged.

**Commit ledger (chronological, all on `main`):**
- `1c72eeb` ci(vercel): swap action@v23 → amondnet@v25
- `8dd560b` feat(visual-dict): emoji map + resolver + component
- `552be00` feat(visual-dict): Settings toggle + STORE_VERSION 14→15
- `c05b64d` feat(visual-dict): Flashcard front face
- `b07f8b4` feat(visual-dict): WordFamilies tree root
- `b4e35e8` feat(visual-dict): Comprehension popover
- `50f749d` feat(visual-dict): PDFReader translation panel
- `fa13005` feat(visual-dict): Roleplay vocab chips
- `4397891` feat(speech): boundary tracking + 3-tier fallback + 5 tests
- `049a180` feat(comprehension): Read Along — word-sync highlight
- `2b0aeab` feat(visual-dict): Tier-1 AI-image pipeline (dormant)

### UDL Round 2 — Theme Choice + verb-emoji expansion + Roleplay Read-Along (2026-05-14 night)

Three commits on top of Round 1. Closes UDL Principle 1 entirely
(only the Goal-level box was previously ticked); pushes Principle 2
further by extending Read-Along from Comprehension into Roleplay
(the §4 Item 25(c) killer surface); multiplies the just-shipped
Visual Dictionary by adding 20 verb roots.

**Theme Choice — Dyslexic font + High Contrast** (`7778132`):
- `index.html`: Lexend added to the existing Google Fonts `<link>`
  alongside DM Sans / DM Serif Display. Same `preconnect`, same
  `display=swap`, no perf penalty until the font is actually
  enabled.
- `src/index.css`: new `.font-dyslexic` class (Lexend +0.02em
  letter-spacing +1.6 line-height); new `.contrast-high` overlay
  with WCAG-AAA tokens for dark; `.light.contrast-high` for light.
  Auto-bumps every inline `1px solid` border to 2px under
  `.contrast-high` via attribute selector, plus a fallback for
  `.border / .border-{t,b,l,r}` utility classes.
- `src/store/useStore.js`: STORE_VERSION 15 → 16. New `dyslexicFont`
  + `highContrast` booleans (defaults false), `setDyslexicFont` /
  `setHighContrast` setters, v16 migration that preserves any
  existing value via `?? false`.
- `src/App.jsx`: root className composes `light` + `font-dyslexic`
  + `contrast-high` from store, joined with a single
  `.filter(Boolean).join(' ')`.
- `src/pages/Settings.jsx`: two new toggle rows directly under
  "Word Pictures" in the Preferences card, matching the existing
  On/Off pill recipe.

**+20 verb emojis** (`48c211e`):
- `src/data/dictionaryIcons.js`: 50 → 70 entries (sorted A–Z, all
  keys lowercase). Added: ajar, beli, cari, dengar, fikir, guna,
  hantar, jalan, jual, kerja, latih, lukis, main, masak, nyanyi,
  potong, tahu, tanya, tulis, ubah. Skipped per the §4 Item 24
  rationale: pandu (kereta collision), tinggal (polysemous —
  "live in" / "remaining"), bangun (rise / wake / build).
- Reach amplifier: each verb root expands into 5-7 forms via
  imbuhan (meN-, ber-, di-, -kan, -an), so the visible icon
  surface in the Word-Family tree + Roleplay vocab chips grows
  ~130 chip-render hits in Roleplay alone.

**Roleplay Read-Along — the killer feature** (`9598d16`):
- `src/components/RoleplaySession.jsx` (AI mode): per-bubble
  `ExaminerText` renderer. Inactive bubbles render plain `<p>`
  text (zero render churn). Active bubble tokenises via the same
  `tokenizeWithOffsets` the boundary-mapper uses and tints the
  active word with the Comprehension Read-Along recipe —
  `rgba(124,58,237,0.22)` purple, 120 ms ease, 3 px padding,
  zero reflow.
- One `speakerRef` shared across the whole chat. Tapping
  Read-Along on a new bubble auto-cancels any in-flight playback
  before starting fresh. On-unmount cleanup `useEffect` catches
  the case where `phase === 'done'` swaps the scorecard in, plus
  any navigation away from `/roleplay`.
- onRetry path explicitly calls `stopReadAlong()` before
  resetting messages so a retry never inherits a stale highlight.
- Listen button replaced with toggle: `Volume2 Read along ↔ Pause
  Stop`, localised per `scenario.lang` to `Baca bersama ↔
  Berhenti` on Malay scenarios.
- `src/pages/Roleplay.jsx` `StaticRoleplay`: same tokenised render
  + toggle applied only to the active examiner turn bubble.
  Historical examiner bubbles above stay plain (already past —
  no need to revisit). Cleanup hooks at the two call sites that
  change `turn` (the 2.5 s setTimeout in `submitResponse` and
  the scorecard "Try Again" handler), keeping the React 19
  `react-hooks/set-state-in-effect` rule happy.

**Commit ledger (Round 2):**
- `7778132` feat(udl): dyslexic font + high-contrast theme (Principle 1)
- `48c211e` feat(visual-dict): +20 verb emojis (50 → 70 entries)
- `9598d16` feat(roleplay): Read-Along on examiner turns (UDL killer feature)

### Perfection Pass — Zero-Waste Engine v1.1 (2026-05-11)

Ten-item polish pass over the Phase 2-5 surface area. All edits are
small, ZERO behaviour change to the happy path. Verified with
`npm run lint` (0 errors), `npm run test:run` (120/120 pass),
`npm run build` (clean), and `npm run dev` boots HTTP 200.

1. ✅ **`SmartSession.jsx` empty state** — when `tasks.length === 0`
   (deck empty / no FSRS-due cards), the `status==='done' && !summary`
   branch now renders a friendly empty state (📚 "Your deck is empty"
   + explanatory copy + "Back to Dashboard" CTA). Text colour bumped
   from `--color-dim` to `--color-text` for the primary button so the
   CTA reads clearly.
2. ✅ **`MistakeToast.jsx` hydration guard** — added an
   `isHydrated` `useRef(false)` that's flipped on the first effect
   run. The first run is treated as a baseline (records
   `prevLen.current = mistakesLen`) so a non-zero
   `mistakes.length` re-hydrated from localStorage never fires a
   spurious "Saved to Mistakes · +12" toast on page load. Subsequent
   deltas behave exactly as before.
3. ✅ **`Writing.jsx` theater re-engage** — `isDrafting` trigger
   changed from `!results && (textareaFocused || text.length > 0)` to
   `textareaFocused && text.length > 0`. Both conditions matter:
   focus alone shouldn't hide chrome before any writing begins, and
   stale text in a blurred textarea shouldn't keep chrome hidden
   after analysis. Dropping `!results` lets Theater Mode re-engage
   cleanly when the user clicks back in to edit after an analysis.
4. ✅ **`interleavedQueue.js` `enforceNoBB3` safety counter** —
   already in place (`passes < 50` on the rebalance while-loop).
   Verified.
5. ✅ **`SessionProgress.jsx` a11y** — root container now has
   `role="progressbar"` + `aria-valuemin/max/now` + descriptive
   `aria-label`. Each dot has `role="img"` and a per-state
   `aria-label` (`"Task 3 of 10, completed"` /
   `"…, in progress"` / `"…, upcoming"`).
6. ✅ **Adapter consolidation** —
   `AdapterFlashcard.jsx` / `AdapterQuiz.jsx` / `AdapterCloze.jsx`
   (three near-identical files) deleted; replaced by a single
   `TaskAdapter.jsx` that dispatches on `task.type` via a switch.
   `SmartSession.jsx` now imports one component and renders it
   when `currentTask.type` is `'fc' | 'quiz' | 'cloze'`.
   `WritingMicroPrompt` / `SpeakingMicroTurn` still dispatched
   separately (they own their own grader flow, not a study-mode
   shim).
7. ✅ **Mistake pruning into `mistakeHistory` (STORE_VERSION 13→14)**
   — when `state.mistakes.length` crosses `MISTAKE_PRUNE_THRESHOLD`
   (500), the oldest `MISTAKE_PRUNE_BATCH` (100) **reviewed**
   (resolved) mistakes are moved to a new `mistakeHistory` array.
   `MISTAKE_HISTORY_CAP` (2000) trims the archive itself.
   Unresolved mistakes never get pruned — the journal/Smart Session
   still surface them. v14 migration adds
   `mistakeHistory: state.mistakeHistory || []`. `exportData` /
   `importData` round-trip the new field.
8. ✅ **Smart Session telemetry guard** — `useInterleavedSession.js`
   now holds a `hasTracked` `useRef(false)` that gates the two
   `addStudyMinutes` call sites (natural completion in
   `completeTask`, and `endSessionEarly`). Reset on `startSession`
   and `discardAndRestart`. Defends against any race / re-render
   path that could double-credit study minutes.
9. ✅ **Z-index audit** — added a `:root` block to `index.css`
   defining `--z-pill: 999` (Theater Mode exit pill) and
   `--z-toast: 1000` (MistakeToast). Both surfaces updated to use
   `z-[var(--z-pill)]` / `z-[var(--z-toast)]` instead of bare
   `z-50` / `z-[60]`, so the layering is now a single
   source-of-truth.
10. ✅ **Smart Session 2-hour TTL** — already in place
    (`useInterleavedSession.js` lines 21-25:
    `if (Date.now() - parsed.startTime > 2 * 60 * 60 * 1000)`
    → discard + clear localStorage). Verified.

**Smoke-test walkthrough (manual — Item 2 of §4):**
```bash
npm run dev   # serve at :5173/:5174
```
Walk these flows in a browser:
1. `/` Dashboard — confirm "Today's Loop" widget hides when caught & drilled are both 0; visit `/comprehension`, fail one passage, return → widget appears.
2. `/study` — start a session. Chrome hides (header + bottom nav slide away). Mode-swap fades in 220 ms. "Lights On" pill visible top-right, opacity 50% → 100% on hover; Esc exits Theater Mode.
3. `/smart-study` — start a session. Task swap animates with no 600 ms pause. Empty-deck case shows the new 📚 empty state.
4. `/writing` — focus an EN/MS textarea + type → Theater Mode kicks in. Click Analyze → chrome returns. Re-focus textarea (text still present) → Theater Mode RE-ENGAGES. IssuesPanel auto-Focus mode + "Show all" toggle + re-analyze → focus mode resyncs (key-prop remount).
5. `/roleplay` — start an AI scenario. Each turn animates in, chrome hides. Scorecard returns chrome.
6. `/speaking` — pick a topic; prep/record phase hides chrome; Results phase brings it back.
7. `/settings` — toggle Theater Mode off → all of the above keeps chrome visible everywhere.
8. Quick mistake stack → make 3 wrong answers on `/comprehension` in <3 s → toast says "Saved to Mistakes · +3"; inside a Smart Session, toast omits the "Practice" chip.
9. Reload the app with non-empty Mistakes — toast does NOT pop on hydrate.

If anything regresses, the Perfection Pass diff is single-file localised — easy to revert per item.

### Phase 5 — Tight Feedback Loops: visible mistake-to-knowledge layer (2026-05-11)

Pillar 1 already ships the *plumbing* — every module funnels mistakes
into the store, FSRS auto-promotes eligible categories, the Mistake
Journal renders the feed. Phase 5 adds the **visible feedback layer**
on top: students now see, at the moment of error, that their mistake
was caught — and on the Dashboard, how many of today's mistakes
they've already turned into knowledge.

- ✅ **`src/components/MistakeToast.jsx` (NEW)** — single global toast
  mounted in `Layout.jsx`. Subscribes to `mistakes.length` via a
  Zustand selector + `prevLen` ref to detect deltas; fires once per
  delta. **Stacking counter:** within the 3-second auto-dismiss
  window, additional mistakes increment the toast text to
  `"Saved to Mistakes · +N"` and reset the timer. Counter resets
  ~300 ms after the toast hides so isolated mistakes start fresh.
  framer-motion `Motion.div` slide+fade (220 ms ease-out-quart, same
  recipe as Phase 4); `useReducedMotion()` honoured.
  **Theater-Mode-aware:** during a session the "Practice" chip is
  suppressed so the toast is a quiet zen confirmation, not a CTA that
  pulls the student out of focus. Outside Theater Mode the chip
  navigates to `/mistakes`. Manual dismiss via tap on the X button.
  Position adapts: `bottom: 16` in Theater Mode (no nav), `bottom: 80`
  otherwise (clears the bottom nav).
- ✅ **`Dashboard.jsx` "Today's Loop" widget** — single horizontal
  strip card placed directly above the Smart Session CTA. Two
  metrics derived inline with `useMemo` (no new store getters):
  - **Caught**: `mistakes.filter(m => m.timestamp >= startOfToday).length`
  - **Drilled**: cards in the `Mistakes` deck whose `last_review` is
    today (FSRS-managed timestamp).
  Loop closure = `min(100, drilled / caught)`. Shows
  `"All caught up"` when `drilled >= caught > 0`. Auto-hides when
  both are 0. Thin gradient progress bar (purple → green) underneath
  the icon-number pairs. Whole strip taps through to `/mistakes`.
- **Side-effect-only architecture.** Zero new store actions, zero
  new schema fields, zero per-surface code in any of the 6+ pages
  that call `addMistake`/`logMistakeBatch`. Comprehension, Speaking,
  Roleplay, Writing, Listening and Smart Session all trigger the
  toast (and feed today's loop) for free because they were already
  wired into the unified mistake pipeline in Pillar 1.

This closes the master-plan §4a 5-phase "Zero-Waste Cognitive
Engine" sequence. The architecture is now: detoxified pages (Phase
1 / Architectural Detox), interleaved practice (Phase 2 / Smart
Sessions), adaptive scaffolding (Phase 3 / Cognitive Budget),
frictionless transitions + Theater Mode (Phase 4), and the visible
loop closure that makes mistake-to-knowledge feel like progress
(Phase 5).

### Phase 4 — Frictionless UX: framer-motion + Theater Mode (2026-05-11)

Functional micro-animations on the three high-focus task surfaces, plus
a context-driven Theater Mode that auto-hides chrome during active
tasks. Single shared transition recipe for predictability;
`prefers-reduced-motion` honoured everywhere.

- ✅ **`framer-motion` installed**, lazy-chunked into a shared 120.66 kB
  / 39.16 kB gzipped bundle that only loads when one of `/study`,
  `/smart-study`, `/roleplay`, `/writing`, `/speaking` opens. Initial
  index bundle moved from 423.66 kB → 425.64 kB (+2 kB, mostly Theater
  Mode wiring).
- ✅ **Animation recipe** (one shared definition across three surfaces
  for ADHD-calm consistency):
  `initial { opacity:0, y:8 } → animate { opacity:1, y:0 } → exit { opacity:0, y:-8 }`,
  `duration: 0.22s`, `ease-out-quart [0.16, 1, 0.3, 1]`. `useReducedMotion()`
  collapses the recipe to instant swap.
- ✅ **Surfaces wired:**
  - `src/pages/Study.jsx` — `<AnimatePresence mode="wait">` on the
    mode mount, keyed by `${mode}-${cardKey}` so card and mode swaps
    both trigger enter/exit.
  - `src/components/interleaved/SmartSession.jsx` — `<AnimatePresence
    mode="wait">` on the active task mount, keyed by cursor.
    `useInterleavedSession.js`'s `'transition'` status + 600 ms
    `setTimeout` removed; `TaskTransition.jsx` deleted. Hook status
    collapsed to `idle | active | done | resume-prompt`.
  - `src/components/RoleplaySession.jsx` — per-message
    `<motion.div initial animate>` (no exit; turns are append-only).
- ✅ **`TheaterModeContext` + `TheaterModeProvider` + `useTheaterMode`**
  (`src/contexts/TheaterModeContext.js`,
  `src/contexts/TheaterModeProvider.jsx`,
  `src/hooks/useTheaterMode.js`). React context, NOT Zustand store —
  Theater Mode is ephemeral session UI, not user data.
  - **Route-change reset** via the key-prop pattern (provider remounts
    on `useLocation().pathname` change), so the on-mount `useState(false)`
    is the source of truth — no setState-in-effect anti-pattern.
  - **Esc key escape hatch** at the provider level (skipped while a
    text input is focused).
  - **Pref gating:** `prefs.theaterModeEnabled` (new in store v13,
    default `true`) short-circuits the whole feature when off.
- ✅ **`Layout.jsx`** — header and bottom nav use plain Tailwind/CSS
  transitions (`-translate-y-full opacity-0 pointer-events-none` /
  `translate-y-full opacity-0 pointer-events-none`,
  `transition-transform duration-200 ease-out motion-reduce:transition-none`).
  framer-motion is intentionally NOT used here so the chrome animations
  don't pull the lib into the initial bundle. `aria-hidden={theaterMode}`
  on both. **"Lights On" Exit pill** (Lucide `Sun`, fixed top-right,
  ~32×32 px, `opacity-50` → hover `opacity-100`) renders only when
  Theater Mode is on.
- ✅ **Per-route triggers** — single `useEffect` per page, dependency
  is the "active" boolean. Cleanup runs `setTheaterMode(false)` on flip
  or unmount:
  - **Study:** `!showSummary && card != null`
  - **SmartSession:** `status === 'active'`
  - **Roleplay AI:** `phase !== 'done'`
  - **Roleplay Static:** `!complete`
  - **Speaking:** `stage === PREP || stage === RECORD`
  - **Writing:** `(textareaFocused || text.length > 0) && !results`
    — special case: also hides the `ExemplarPanel` during drafting,
    leaving only the textarea + Analyze button. Theater Mode auto-disengages
    once results land so all feedback panels (sub-bands, IssuesPanel,
    AI feedback) appear with full chrome.
- ✅ **Settings toggle** — *"Theater Mode (auto-hide chrome during
  active tasks)"* row in `pages/Settings.jsx`, wired to
  `theaterModeEnabled` / `setTheaterModeEnabled`. Default on. Off
  short-circuits all triggers.
- ✅ **Store v12 → v13** — adds `theaterModeEnabled: true` field with
  trivial migration.

#### IssuesPanel polish (folded into the same lint sweep)

The Phase 3 polish commit's `useEffect`-driven Focus Mode resync hit
the new React 19 `react-hooks/set-state-in-effect` rule. Refactored to
use the same key-prop pattern as TheaterMode: parent (`Writing.jsx`)
keys IssuesPanel as `key={`${results.band}-${results.findings.length}`}`,
so the `useState(band <= 4 || findings.length > 8)` initialiser
re-evaluates fresh whenever the analysis output changes. Manual
override stays sticky within a single analysis, resets cleanly on
the next one. Behaviour identical, no anti-pattern.

#### Lint cleanup along the way

- Pre-existing unused `completedCount` destructure in
  `SmartSessionSummary` removed.
- Pre-existing unused `eslint-disable react-hooks/exhaustive-deps`
  directive on the on-mount `useEffect` in `useInterleavedSession.js`
  removed.
- Pre-existing in-render ref-mutation pattern in `useInterleavedSession.js`
  (`cursorRef.current = cursor` etc) wrapped in
  `eslint-disable react-hooks/refs`. The pattern is a documented React
  idiom; refactoring to functional setState across three pieces of
  state would be invasive and is out of scope.
- `framer-motion`'s `motion` import is renamed to `Motion` in all three
  consumers (`Study.jsx`, `SmartSession.jsx`, `RoleplaySession.jsx`) so
  the `varsIgnorePattern: '^[A-Z_]'` config keeps it as legitimately
  used. The repo's eslint config doesn't include
  `eslint-plugin-react`'s `jsx-uses-vars` rule, so JSX-only usage of a
  lowercase identifier looks unused to the linter.

### Phase 3 — Adaptive Scaffolding / Desirable Difficulty (2026-05-10)

Hybrid trigger: AI-side cognitive budget (per-attempt) + UI-side
Focus Mode (auto + manual override).

- ✅ **`src/components/WritingTutor.jsx`** — Gemini system prompt
  rewritten as a coaching prompt with an explicit `COGNITIVE BUDGET`
  ceiling derived from the local heuristic band: band ≤ 2 → 1 fix,
  band ≤ 4 → 2 fixes, else → 3 fixes. Tone shifts too: band ≤ 3 gets
  `EXTREMELY ENCOURAGING & SIMPLE`, else `DIRECT & PROFESSIONAL`.
  Output structure: Status → One Thing You Nailed → Focus Area
  (budgeted, each with Hint / Issue / Solution) → Model Fragment →
  1-Minute Drill. Same evidence block (sub-bands, metrics, top
  rule-engine findings) — the LLM still anchors on local truth, just
  picks fewer threads to elaborate on.
- ✅ **`src/components/writing/IssuesPanel.jsx`** — Focus Mode caps
  the inline-issues list to the top 5 (high → medium → low) when
  `band ≤ 4 || findings.length > 8` and the severity filter is
  `'all'`. Banner explains the truncation; `Show all N` button
  flips to full list; `Switch back to Focus Mode` re-enables when
  more than 5 findings exist. Receives the new `band` prop from
  `Writing.jsx`. Wavy underlines on the inline essay still come
  from the visible subset, so the highlighted essay matches the
  shown list.
- ✅ **Polish (same day):** IssuesPanel auto-Focus now resyncs on each
  fresh analysis via `useEffect([findings, band])` — a worse second
  attempt re-engages Focus Mode. Sort path uses `[...list].sort(...)`
  so the prop array is no longer mutated in place. Manual override
  via "Show all" is intentionally reset on each new analysis (fresh
  decision per attempt).

### Phase 2 — Smart Sessions / Interleaved Practice (2026-05-10)

- ✅ **Thematic micro-cycle queue** (`src/lib/study/interleavedQueue.js`,
  pinned by 25 Vitest cases in `interleavedQueue.test.js`) — one focal
  card per cycle, escalates recognition (FC) → contextual recall
  (cloze if `ex` contains the headword, else MCQ) → production
  (micro-write), with a speaking graduation every 3rd cycle. Focal
  selection priority: recent vocab mistakes (≤7d) → FSRS-due →
  lowest-stability backfill. Queue post-processors `enforceNoBB3`
  (no two back-to-back load-3 production tasks) and
  `enforceSoftLanding` (last task is recognition, not production).
  Session size scales with `targetMinutes` (1–8 cycles).
- ✅ **`useInterleavedSession` hook** (`src/hooks/useInterleavedSession.js`)
  — owns status / cursor / results state, persists snapshot to
  `localStorage['smart-session-state']` after every task for resumability
  (TTL 2h), hooks FSRS `reviewCardAction` for fc/quiz/cloze tasks,
  enqueues `addMistake` for wrong answers, builds an end-of-session
  summary via `lib/study/sessionResult.js`.
- ✅ **`/smart-study` route** (`src/pages/SmartStudy.jsx`,
  `src/components/interleaved/SmartSession.jsx`) — top-level dispatcher
  picks the right component by `task.type`: `Adapter{Flashcard,Quiz,Cloze}`
  reuse the existing study mode components (zero duplication),
  `WritingMicroPrompt` and `SpeakingMicroTurn` are new minimal task
  surfaces. `TaskTransition` provides a 600ms breathing pause between
  tasks. `SessionProgress` shows cycle X of N + the focal word.
- ✅ **Dashboard CTA** (`src/pages/Dashboard.jsx`) — primary blue→purple
  gradient "Smart Session" button above the Quick Actions grid.
- ✅ **Templated micro-prompts** (`src/data/microPrompts.js`) —
  4 writing + 3 speaking IGCSE-register templates, all interpolate the
  focal headword.

## 4a. The "Zero-Waste Cognitive Engine" Master Plan

To take the architecture from a "feature-complete MVP" to an Enterprise-Grade, World-Class Application, future AI sessions must focus on maximizing learning efficiency using elite cognitive science. We are NOT chasing cheap novelty or extrinsic gamification (XP/leaderboards). We are using neuro-inclusive, friction-reducing UX to ensure 100% of the student's energy goes into learning. Focus on this 5-Phase Plan (execute one at a time with ZERO regressions):

1. **Architectural Detox:** Extract logic from massive files (`Study.jsx`, `Writing.jsx`) into clean custom hooks and atomic components. This provides a stable, performant foundation for functional animations.
2. **Interleaved Practice (Anti-Boredom):** Replace isolated study sessions with dynamic interleaving. Build a "Smart Session" engine that mixes flashcards, short writing prompts, and speaking turns to build stronger neural pathways and maintain novelty.
3. **Adaptive Scaffolding (Desirable Difficulty):** Refine the AI evaluators. If a student fails a task, the AI should dynamically lower the cognitive load (e.g., "Just fix your tense this time") rather than overwhelming them with 10 corrections.
4. **Frictionless UX & Deep Work:** Integrate `framer-motion` purely for functional, tactile micro-animations that prevent jarring context switches. Implement a visual "Theater Mode" to eliminate peripheral distractions during high-focus tasks.
5. **Tight Feedback Loops:** Ensure every mistake across all modules (Writing, Speaking, Comprehension) instantly and visually flows into the Mistake Journal and FSRS pipeline, creating an intrinsic dopamine loop of visible progress.

## 4c. Road to Perfection — Phases 6–12 (2026-05-11)

The Zero-Waste Cognitive Engine (§4a) is complete. The following phases
take the app from "feature-complete" to "nothing left to improve."
Execute in priority order. Each phase has ready-to-use prompts in the
full plan artifact (saved externally). Summary below:

### Phase 6 — Content Expansion (P0, Highest Impact)
- **6.1** More comprehension passages: 8 → 20 (add 12 new: 6 MS + 6 EN).
  File: `src/data/comprehensionPassages.js`. Shape: `{ id, title, titleEn,
  topic, difficulty, lang, text, questions: [5 MCQs] }`.
- **6.2** More dictionary examples: 254 → 500+.
  File: `src/data/dictionaryExamples.js`.
- **6.3** More listening passages: 6 → 12.
  File: `src/data/listeningPassages.js`.
- **6.4** More grammar drills: expand EN confusables/SVA/punctuation,
  expand MS imbuhan/kata hubung/ayat majmuk.
  Files: `src/data/grammarEng.js`, `src/data/grammar.js`.

### Phase 7 — Student Mastery Dashboard (P1, High Impact)
§4b says deep progress tracking FOR THE STUDENT is "highly desired."
- **7.1** GitHub-style study heatmap (SVG, 90-day view, derive from
  existing `studyMinutes`). New component in `src/components/dashboard/`.
- **7.2** Per-skill radar chart (6 axes: Vocab / Grammar / Writing /
  Speaking / Comprehension / Listening). SVG polygon, no chart library.
- **7.3** Daily goal system: `dailyGoalMinutes` pref (default 15),
  circular progress ring on streak card, confetti on completion.
- **7.4** Weekly progress summary card (this week vs last week).

### Phase 8 — UX & Accessibility Polish (P2)
- **8.1** First-time onboarding flow (4-step guided walkthrough for
  users with zero study data).
- **8.2** Keyboard shortcuts help modal (press `?` anywhere).
- **8.3** Dark/light theme audit (WCAG AA contrast on all routes).
- **8.4** PWA install prompt banner on Dashboard.
- **8.5** Offline indicator pill in header when `navigator.onLine === false`.

### Phase 9 — AI Intelligence Upgrades (P3)
- **9.1** Speaking grader scaffolding (same cognitive budget pattern
  as Writing Tutor Phase 3).
- **9.2** Cikgu Maya scaffolding (patience mode for struggling students).
- **9.3** AI-generated vocab example sentences (Gemini batch generation).

### Phase 10 — Architecture & Performance (P4)
- **10.1** Dashboard.jsx refactor: 47 KB → ~200 lines shell + atomic
  components in `src/components/dashboard/`.
- **10.2** CikguBot.jsx refactor (same atomic pattern).
- **10.3** Bundle size audit with `rollup-plugin-visualizer`.

### Phase 11 — Content Quality Assurance (P5)
- **11.1** Spell check integration evaluation (§4 Item 9).
- **11.2** Exemplar quality review (all 27 entries).

### Phase 12 — Final Polish (P6)
- **12.1** SEO & meta tags in `index.html`.
- **12.2** Error boundary polish.
- **12.3** Branch cleanup (§4 Item 14 — delete og branch after PR merge).

### Phase 13 — Completeness Gaps (P6, identified 2026-05-11)
- **13.1** Bookmark/Favorites system: let students star vocab words,
  passages, or drills for quick revisit. Store as `bookmarks: []` array
  in the Zustand store. Surface a "Starred" filter on relevant pages.
- **13.2** Print/Export Revision Sheet: a "Print my revision sheet"
  button on the Dashboard that generates a single-page PDF (or printable
  HTML) of the student's weakest areas + key vocab + upcoming due cards.
- **13.3** Spaced repetition reminders: Dashboard urgency indicator
  showing "N cards due today" prominently. If PWA notifications are
  available, send a daily morning reminder.
- **13.4** Global search (`Cmd+K` / `Ctrl+K`): search across dictionary
  (804 words), passages, grammar drills, and exemplars. Render as a
  modal with categorized results. Reuse `SearchModal.jsx` or replace it.
- **13.5** More roleplay scenarios: add 5+ EN and 5+ MS scenarios
  covering IGCSE-specific situations (doctor visit, lost item at school,
  booking a hotel, returning a faulty product, asking a teacher for help).

## 4b. Product invariants — DO NOT VIOLATE

The user has set these durably. Future sessions must not propose work
that contradicts them without explicit re-approval.

- **No paywall.** Ever. The site stays free for invited users.
- **Invite-only access.** The user personally approves who gets in.
  Implementation hook: the existing `userRole: 'static' | 'enhanced' |
  'admin' | 'owner'` system + Supabase auth in upg. `static` is
  guest/local-only; the upgraded tiers gate cloud sync and AI quota.
  Do not build self-serve sign-up flows.
- **Individual revision only — not a teacher tool.** No homework
  assignment, no class dashboards, no progress reports for teachers.
  Out of scope until the user reverses this. **HOWEVER, deep progress reports, dashboards, and mastery tracking specifically OPTIMIZED FOR THE STUDENT to check their own progress are highly desired and should be built.**
- **No native apps.** PWA is sufficient. Don't propose iOS/Android
  builds, Capacitor, React Native, etc.
- **Focus on learning quality for Malay AND English.** When choosing
  between two improvements, prefer the one that materially raises
  feedback quality, content quality, or practice variety for the
  IGCSE 0546 (Malay) or 0500/0510 (English) syllabus over engagement
  mechanics or polish.

## 5. Conventions you MUST follow

From `CLAUDE.md`:

1. **Never call store getters inside Zustand selectors:**
   ```js
   // WRONG — infinite loop
   const streak = useStore(s => s.getStreak())
   // CORRECT
   const getStreak = useStore(s => s.getStreak)
   const streak = getStreak()
   ```
2. **Always use `var(--color-*)` for colors** — never raw hex.
3. **Verify with `npm run build`** after every meaningful edit. Zero errors required.
4. **Read full files before editing** — pages like `Study.jsx`, `Dashboard.jsx`,
   `CikguBot.jsx` are complex state machines with many modes.
5. **No `Date.now()` in render or useState initializers** — wrap in arrow functions.
6. **Commit frequently** — small commits so a follow-up session can pick up cleanly.

## 6. Env keys (for `.env.local` — already in `.gitignore`)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_TRANSLATE_KEY=...   # Restrict to Cloud Translation API + your domain
VITE_DEEPL_KEY=...              # Optional. DeepL doesn't support Malay.
VITE_GEMINI_KEY=...             # Powers writing tutor, speaking AI, Cikgu.
VITE_OPENROUTER_KEY=...         # Optional fallback for Cikgu.
```

⚠️ All `VITE_*` are inlined into the bundle. Restrict each key in its
provider's console.

## 7. Suggested first prompt for the new chat

> Read `RESUME_HERE.md` end-to-end. UDL Round 1 just landed —
> Visual Dictionary across 5 surfaces, Read-Along audio-visual sync
> on Comprehension passages, Vercel CI rescue, and a dormant Tier-1
> image pipeline parked on provider/billing. Build / lint /
> 132/132 vitest green. Run `git status`, `git log --oneline -12`,
> and `npm run build` to confirm. Then wait for me to pick:
> (a) §4 Item 23 if I've sorted out an image-gen provider,
> (b) §4 Item 24 (drop in the 20-verb emoji additions),
> (c) §4 Item 25 (extend Read-Along to one of the three high-value
> surfaces — Roleplay examiner-turn highlight is the killer),
> (d) earlier §4 items (content expansion: more dictionary entries
> / comprehension passages / format exemplars), or
> (e) housekeeping (§4 Item 14 — delete the now-merged og branch).
