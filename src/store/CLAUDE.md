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
