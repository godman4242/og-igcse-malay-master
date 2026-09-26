# src/store/ — local rules for the Zustand store

Folder-local supplement to the root `CLAUDE.md`. Claude Code auto-loads this when you edit anything under `src/store/`. It captures the **store-specific invariants an edit can silently break** — read it before touching `useStore.js`. (Cite **symbols**, not line numbers; line numbers shift on every edit.)

`useStore.js` is ~2400 lines and is the single source of truth for all app state. **Read the whole file before editing** (Critical Conventions in root CLAUDE.md).

## Versioning & migrations
- `STORE_VERSION` is the persist version (currently **35** — v35 added `studyMix {ms,en}`). The root CLAUDE.md prose may lag the real constant; **the constant in this file wins.**
- Bumping `STORE_VERSION` to `N` **requires** adding a matching `if (version < N) { … }` block inside the `migrate:` callback, in order. The block must **spread prior state and add only the new key with a default**, new-default-first / existing-value-last so an existing user's value wins: `pdfReader: { asrLang: 'ms', ...(state.pdfReader || {}) }`. Migrations must be **idempotent** and preserve payload refs (never rebuild `cards`).
- Non-trivial migrations are extracted to an **exported pure helper** (`applyV34Migration`, `applyV35Migration`, `migrateGuideSlice`) with a matching `*.test.js` that also pins `STORE_VERSION === N`. Follow that pattern: pure helper + test, not inline logic.

## The #1 trap: never call a fresh-object getter inside a selector
Getters that build a **new object/array every call** cause an infinite render loop if used as a Zustand selector return. Extract the ref, then call in the component body / `useMemo` / `useEffect` — never `useStore(s => s.getX())` for these:
`getChallengeStats`, `getConfidenceCalibration`, `getHypercorrectionTargets`, `getExamReadiness`, `getNextExamDue`, `getDecks`, `getFilteredCards`, `getStreak`, `getDueGrammarDrills`, `getFixUpQueue`, `getMistakeStats`, `getStudyPlan`.
Getters returning a **primitive** are selector-safe (`getDueCount`, `getDaysSinceLastSession`, `getAnkiExport`).

## Sync invariants (any change here needs a cross-device test — see root Cloud sync note)
- **Persisted *preference* setters must funnel through `commitPrefMutation`**, not raw `set(...)`. It stamps `lastMutationAt` + calls `triggerCloudSync()`. Skipping it makes the newer-wins tie-break treat the old cloud blob as newer and **silently revert the setting on next signed-in reload**. Setters that can no-op (e.g. `markGuideSeen`) must **guard before calling** so a non-change doesn't bump the stamp.
- **Card / writing / speaking mutations must go through `enqueueSyncEventAction`** (also stamps `lastMutationAt` + `triggerCloudSync()`). `syncEnqueue.test.js` statically asserts that call is still there.
- **`flushSyncQueue`** must re-slice the *live* queue by processed/failed ids (not replace with a stale `remainingQueue`) and keep the `_flushInFlight` re-entrancy guard — else mid-flush enqueues drop and overlapping flushes double-process (`flushQueueReslice.test.js`).
- **`onRehydrateStorage` must call `reconcileSyncOnHydrate()`** to heal a stuck `syncStatus:'syncing'`; without it an interrupted flush deadlocks the queue (`syncRehydrateGuard.test.js`).

## Persistence / backup
- Persisted localStorage key is **`'igcse-malay-store'`** — never rename (breaks every existing user).
- There is **no `partialize`** — the whole store persists.
- Backup export/import share ONE source: `makeBackupDefaults()` / `BACKUP_KEYS`. A new persisted user-data field you add **must also be added to `makeBackupDefaults`** or it's dropped on device migration. Deliberately excluded (must NOT cross devices): `sync`, `auth`, `installPrompt`, `lastMutationAt`, `userRole`, `reviewedToday`/`lastStudyDate`/`activeDeck`.
- Keep in sync with siblings: `LOGGED_SKILLS` ↔ `lib/skillBalance.js`; `MISTAKE_CATEGORIES` ↔ the MistakeJournal renderer; `canAutoPromoteMistake` encodes the ms=vocab+imbuhan / en=vocab-only promotion gate.

## Testing the store
Runner is **Vitest in `node` env (no jsdom)** — several store tests are source-level string/regex assertions on `useStore.js`, not behavioral. Run just this folder:
```bash
npx vitest run src/store/__tests__          # one-shot
npx vitest run src/store/__tests__/applyV35Migration.test.js   # single file
```
23 test files. Migrations → `applyV35Migration.test.js`, `studyLangMigration.test.js`; sync → `syncEnqueue.test.js`, `syncRehydrateGuard.test.js`, `flushQueueReslice.test.js`, `syncTwoDeviceIntegration.test.js`, `prefMutationSync.test.js`; backup → `exportImportRoundTrip.test.js`.

## What the store holds
Moved out of the root `CLAUDE.md` on 2026-09-26 so it loads on demand instead of into every session. The `STORE_VERSION` rule and the selector trap stay in root `CLAUDE.md`.

Single Zustand store at `src/store/useStore.js` (STORE_VERSION = 35 — **the constant in the file always wins over this prose**; recent bumps: v31 per-paper balance meter `skillActivity` log, v32 XP retired — Dashboard tile is now Mastered words via `countMastered`, v33 audio transcription language pref `pdfReader.asrLang`, v34 **True English study mode**: per-card `lang` `'ms'｜'en'` backfilled to `'ms'` + global `studyLang` pref — exported `applyV34Migration`, v35 per-language study-mix focus preset `studyMix {ms,en}` — exported `applyV35Migration`). Persisted to localStorage under key `igcse-malay-store`. Contains:
- Cards deck with FSRS scheduling fields (`due`, `stability`, `difficulty`, `state`, `lapses`)
- Grammar SRS state (`grammarCards` — keyed by drill ID)
- AI state (`ai.dailyCalls`, `ai.roleplayHistory`, `ai.cikguHistory`)
- Engagement layer (streaks, freezes, daily challenges — XP retired in v32, feature #6)
- Metacognitive tracking (`confidenceLog`, `mistakeReasons`, `sessionFeedback`, `reflections`)
- Identity & motivation (`identity.label`, `identity.idealSelf`, `identity.cue`, `lastSessionAt`)
- Offline sync queue (`sync.queue`, `sync.syncStatus`, `sync.networkStatus`) + `lastMutationAt` (cloud-sync tie-break) — see **Cloud sync** below
- **Mistake pipeline (v11)** — `mistakes` array with rich records: `{ id, ts, type, source, language, category, severity, word, given, correct, surface, correction, note, promotedCardId, attempts, reviewed, lastReviewedAt, _k }`. Categories: vocab / imbuhan / tense / spelling / cohesion / register / pronunciation / comprehension / fluency / other. `addMistake` dedupes by content hash within 24h, escalates severity on repeat hits, and auto-promotes mistakes to FSRS cards in a 'Mistakes' deck — gated by `canAutoPromoteMistake(language, category)` (Malay: vocab+imbuhan; English: vocab only, as English has no imbuhan; any other/untagged language never promotes, preserving the pre-v34 strict ms-only gate). The promoted card's gloss direction follows the mistake's `language` (English miss → `lang:'en'` card). `promoteMistakeToCard` is also exposed for manual promotion. `getFixUpQueue(limit)` returns the highest-priority unfixed mistakes.
- **Exam rehearsal (v12)** — `examAttempts` array (capped at 50) of `{ id, ts, passageId, lang, comprehensionPct, writingBand, speakingBand, listeningPct?, readinessScore, durationSec }`. The rehearsal runs 4 stages (Comprehension → **Listening (Paper 4)** → Writing → Speaking); the listening stage is **TTS-gated** — skipped when `hasSpeechSynthesis()` is false, in which case `listeningPct` is absent. The composite **readiness scorer lives in ONE place**, `src/lib/examReadiness.js` (`composeReadiness`), shared by `getExamReadiness()` and `ExamRehearsal.finishRehearsal` (no longer duplicated): comp 0.30 / writing 0.35 / speaking 0.35, + listening 0.30 **only when present**, re-normalised over present components — so attempts logged before the listening stage compute **byte-identical** (no STORE_VERSION bump). `getExamReadiness()` returns smoothed readiness %; `getNextExamDue()` returns FSRS-shaped 3-30 day schedule.
- **Speaking history** — bilingual; entries include `{ topicId, band, durationSec, wordCount, transcript, lang }`.
- **Skill activity log (v31)** — `skillActivity` `{ 'YYYY-MM-DD': { reading, listening, grammar } }`, LOCAL-day keyed, pruned to 30 days on write. `logSkillActivity(skill)` accepts only those 3 skills (the ones with no history array); Writing/Speaking/Exam/Vocab derive from their existing slices. Pure 7-day aggregator: `src/lib/skillBalance.js` (`skillBalance`), rendered by the lazy Dashboard `PaperBalance` widget.

- **Card format**: Cards in the store have dictionary fields plus FSRS fields (`due`, `stability`, `difficulty`, `state`, `lapses`, `reps`, etc.) and a topic tag `t`.
