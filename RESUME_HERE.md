# RESUME HERE — read this first

You are a fresh Claude Code session continuing work on the IGCSE Malay
Master app. Read this doc end-to-end **before** opening any other file.

---

## 1. Where you are

```
/Users/kheshav/Kheshav/kheshav code/
├── og igcse malay master/        ← Static, free, client-only fork. PR #1 closed/abandoned.
└── upg-igcse-malay-master/        ← THIS repo. Active. Supabase cloud sync, Phase A merged.
```

Both clones share the **same GitHub remote** (`godman4242/og-igcse-malay-master.git`).
The "fork" is just two local checkouts on different branches.

The user uses the **upg** version. All future work happens here.

## 2. Current branch & status (upg repo)

- **Branch:** `feat/phase-a-into-upg` — merge of og's Phase A work into upg.
- **Base branch on remote:** `feat/pdf-translator-writing-upgrade` (upg's
  Supabase + own speaking grader). `main` is the long-term target.
- **Build:** clean. `npm run build` passes.
- **Lint:** `npm run lint` should be 0 errors after the merge.
- **Working tree:** clean once merge is committed.

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
| 1   | ✅ Open the PR for the merge               | DONE. PR #2 against main, includes all of the above.   |
| 2   | Smoke-test in browser before merging PR #2 | `npm run dev`, walk `/pdf-reader`, `/speaking` (toggle EN/MS), `/writing` (try a format → exemplar appears), `/grammar` (toggle EN/MS), `/cikgu`, `/import`, `/comprehension`. |
| 3   | ✅ Pronunciation diff feedback on Speaking | DONE (commit 37ded14). |
| 4   | ✅ Mistake review surfacing                | DONE. |
| 5   | ✅ Dashboard insights                      | DONE. |
| 6   | More dictionary entries                    | `src/data/dictionary.js` has 804 headwords. The 254 used by topic packs now have `dictionaryExamples.js` coverage. Adding more requires (a) a new headword in `dictionary.js`, (b) a topic pack assignment, and (c) an example sentence. Quality > quantity. |
| 7   | ✅ English writing format examples         | DONE. |
| 8   | ✅ Mirror writingErrors.js for Malay       | DONE. |
| 9   | Optional: layered spell check              | If misspellings still slip through, add `retext-spell` + `dictionary-en` lazy-loaded behind the existing rule engine (~300–500 KB). |
| 10  | ✅ Per-format band-5/6 exemplar essays     | DONE (14 formats). Extending to remaining formats (eng-letter-informal, eng-email, eng-report, eng-directed, ms-surat-tidak-rasmi, ms-email, ms-laporan, ms-directed, ms-wawancara, ms-berita, ms-autobiografi, ms-interview) is purely additive content. |
| 11  | English roleplay scenarios                 | `src/data/scenarios.js` has 9 Malay-only IGCSE Paper 3 scenarios (kapal-terbang, …). Adding 5-7 English scenarios + a lang toggle on Roleplay.jsx would reach parity with Speaking. The scenario shape is reusable; only `keyImbuhan` would drop in English mode. |
| 12  | IGCSE Listening (Paper 4 0500/0510)        | Genuine gap — no listening practice surface today. MVP: short TTS-rendered passages + 5 MCQ each. Could share the comprehension UI with an audio playback step. |
| 13  | More comprehension passages                | `src/data/comprehensionPassages.js` has 8 passages (5 ms + 3 en). Both syllabuses benefit from more practice across genres. |
| 14  | Decide og branch fate                      | After PR #2 merges: delete `feat/pdf-translator-writing-upgrade-og` from origin? |

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
  Out of scope until the user reverses this.
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

> Read `RESUME_HERE.md` end-to-end. Then run `git status`, `git log
> --oneline -10`, and `npm run build` to confirm working state. Wait for me
> to pick which §4 item to tackle.
