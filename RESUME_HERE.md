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

## 4. What is NOT done — open work

| #   | Task                                       | Where to start                                         |
| --- | ------------------------------------------ | ------------------------------------------------------ |
| 1   | ✅ Open the PR for the merge               | DONE. PR #2 against main, includes all of the above.   |
| 2   | Smoke-test in browser before merging PR #2 | `npm run dev`, walk `/pdf-reader`, `/speaking`, `/writing`, `/cikgu`, `/import`, `/comprehension` (try AI question regen + an English passage) |
| 3   | Pronunciation diff feedback on Speaking    | Compare student transcript to AI-generated model answer; render colored diff. Multi-hour build. `src/lib/speakingGrader.js` already returns `modelAnswer` from Gemini. |
| 4   | Mistake review surfacing                   | `MistakeJournal.jsx` could surface patterns (most-missed imbuhan, most-missed format) and feed back into Study queue. |
| 5   | Dashboard insights                         | Surface weakest topics + last-band-per-topic on `/`. Foundation: `speakingHistory`, `writingHistory`, `confidenceLog` are all in store. |
| 6   | More dictionary entries                    | `src/data/dictionary.js` has 804. Quality > quantity. |
| 7   | English writing format examples            | Plan §"Open follow-ups" — English writing grader has lighter format coverage than Malay for letter sub-types. Extend `writingGrader.js` rule sets. |
| 8   | Decide og branch fate                      | After PR #2 merges: delete `feat/pdf-translator-writing-upgrade-og` from origin? |

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
