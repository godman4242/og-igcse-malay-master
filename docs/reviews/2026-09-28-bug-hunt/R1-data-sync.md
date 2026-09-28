# R1 — Data integrity & sync adversarial review (FINAL)

Started 2026-09-28. HEAD = 5603d88. Probes: `scratchpad/probes/r1/__tests__/*.probe.js`,
run with `npx vitest run --config <scratch>/probes/r1/vitest.probe.config.mjs <name> --silent=false`.

**Counts:** P0 ×1 · P1 ×3 · P2 ×6 (10 findings; 9 CONFIRMED by probe, 1 TRACED). 3 are KNOWN-STILL-LIVE
(census A16 → #3, census A12 → #8, 07-03 deferred (b) → #5 with a new root cause). All others are new.

## Findings (ranked worst-first)

### #1 — P0 (scale) — New cards rated "Good" NEVER graduate: FSRS `learning_steps` is dropped, every Learning card loops at 10 min forever
- **File:** `src/lib/fsrs.js:64-76` (`toFSRSCard`) + `:91-102` (`getSchedulingOptions` output) + `:12-25` (`createNewCardState`)
- **Code:**
  ```js
  function toFSRSCard(card) {
    return {
      due: new Date(card.due || new Date()),
      stability: card.stability || 0,
      ...
      state: card.state ?? State.New,
      last_review: card.last_review ? new Date(card.last_review) : undefined,
    }   // <-- no learning_steps; and the returned card{} never stores scheduled.learning_steps
  }
  ```
- **Why:** ts-fsrs is pinned at 5.3.2 (package.json:47). v5 tracks the learning-step index in `card.learning_steps`.
  The wrapper never persists it and never passes it back, so on every review of a Learning card the step
  index is `undefined` and the scheduler re-issues the same 10-minute step. Relearning (lapsed Review cards)
  happens to escape because it has a single step; NEW cards do not.
- **Failure scenario:** learner adds "rumah", answers it correctly in Quiz/Cloze/Type/Listen/Produce (all map
  correct → `Rating.Good`: QuizMode.jsx:17, ClozeMode.jsx:17, TypeMode.jsx:23, ProduceMode.jsx:36,
  FlashcardMode.jsx:66-84) or taps "Good" on a flashcard. Card goes New → Learning (due +10 min). Every later
  correct answer, even days later, → Learning again, due +10 min. It is due at every session, forever, and never
  counts as Mastered (`countMastered` needs state=Review), so the daily due count never shrinks. "Easy" was observed to graduate; "Hard" not tested. Grammar drills
  (`reviewGrammarDrill` only ever rates Good/Again, useStore.js:1664-1666) can NEVER graduate.
- **Proof: CONFIRMED** — `fsrsStore.probe.js` drives the REAL store `reviewCardAction(...,3,'ms')`, returning
  3 days after each due date:
  ```
  review#1 at 2026-09-28T02:00Z -> state=1 sched=0 reps=1 due=2026-09-28T02:10Z learning_steps=undefined
  review#2 at 2026-10-01T02:10Z -> state=1 sched=0 reps=2 due=2026-10-01T02:20Z
  ...
  review#8 at 2026-10-19T03:10Z -> state=1 sched=0 reps=8 due=2026-10-19T03:20Z
  countMastered = 0
  GRAMMAR  grammar correct#1..#6 -> state=1 sched=0 (due +10 min every time)
  ```
  Same sequence through raw ts-fsrs (keeping `learning_steps`) graduates on the 2nd Good:
  `i=1 state=2 sched=2 … i=5 state=2 sched=498` (`fsrsSteps.probe.js`).
- **Why tests miss it:** `fsrs.test.js:100` reviews a card exactly once; nothing reviews a card twice.
- **Fix direction:** persist `learning_steps` in createNewCardState/getSchedulingOptions output and pass it in
  toFSRSCard; for existing state=1 cards with no `learning_steps`, default it to the last step so their next Good graduates.
  Pin with a "Good ×2 graduates" test.

### #2 — P1 — A new device that seeds a starter deck BEFORE signing in overwrites the account's streak, exam date, grammar SRS, mistake journal and exam attempts — in the cloud and then on every other device
- **File:** `src/components/AuthGuard.jsx:139-144` (card-count heuristic outranks the timestamp)
- **Code:**
  ```js
  const cardDelta = cloudCardCount - localCardCount
  ...
  } else if (cardDelta < -CARD_DELTA_THRESHOLD) {
    // Local has materially more cards → push local (don't let this device wipe out a fuller deck)
    await supa.pushStateBlob(localState)      // whole blob, incl. streak/grammarCards/mistakes/examAttempts
  ```
- **Why:** "more cards" is used as a proxy for "fuller account", but one tap on "English starter deck" (682 cards,
  `seedEnglishStarter`) or a few topic packs gives a brand-new device more cards than the real account. The push
  ignores `lastMutationAt` and replaces the ENTIRE blob. Cards survive (hydrate's union), but every blob-only field
  is replaced by the new device's defaults. The other device then sees cloud cards > local + 5 → `restoreFromCloud`
  → wipes its local copy too. The pre-overwrite `backupState()` snapshot has no UI to restore it (`restoreFromBackup`
  has zero callers).
- **Failure scenario:** learner with a 42-day streak and months of grammar/journal/exam history gets a new laptop,
  taps the English starter on the empty Dashboard, then signs in → streak 0, exam date gone, grammar SRS gone,
  journal empty, exam readiness history empty — on the phone as well, next time it opens.
- **Proof: CONFIRMED** — `cardCountWipe.probe.js`: two devices, REAL `<AuthGuard>` (jsdom), repo fake backend:
  ```
  cloud blob after PHONE sign-in : {"cards":5,"streak":{"count":42,...},"examDate":"2026-11-02","grammarCards":2,"mistakes":1,"examAttempts":1}
  laptop fresh state before seeding: {"cards":0,"streak":{"count":0,"last":""},...}
  laptop seeded English starter cards: 682
  cloud blob after LAPTOP sign-in: {"cards":682,"streak":{"count":0,"last":""},"examDate":null,"grammarCards":0,"mistakes":0,"examAttempts":0}
  PHONE local after reopening   : {"cards":687,"streak":{"count":0,"last":""},"examDate":null,"grammarCards":0,"mistakes":0,"examAttempts":0}
  ```
- **Fix direction:** decide blob-vs-local on `lastMutationAt` only (cards are already reconciled by hydrate's
  union, so the card count is no longer a meaningful signal); at minimum never let a device with no prior
  sign-in (no `auth.lastCloudSyncAt`) overwrite an existing blob.

### #3 — P1 — KNOWN-STILL-LIVE (census A16, was "verify first") — signed-in, ONE device: every reload wipes Cikgu chat, roleplay history, journal mistakes, confidence log, reflections, grammar stats made since the last blob push
- **Files:** `src/components/AuthGuard.jsx:95-137` (tie-break) · `src/config/supabase.js:186` (`updated_at: new Date()` at push time) · raw-`set` actions in `src/store/useStore.js`: `addCikguMessage` :788, `addRoleplayHistory` :771, `addMistake` :1716 (non-promoting path), `logConfidence` :830, `logReflection` :887, `logSessionFeedback` :881, `updateGrammarStats` :1641, `markSessionStart` :940, `logCognitiveMistake` :803.
- **Code:**
  ```js
  // AuthGuard.handleSignIn
  const cloudMs = new Date(cloud.updated_at).getTime()          // = push time, always ≥ lastMutationAt + 5 s
  const localMs = localState.lastMutationAt ? new Date(localState.lastMutationAt).getTime() : 0
  ...
  } else if (cloudMs > localMs) {
    restoreFromCloud()   // setState({...cloudBlobOnly}) — replaces ai, mistakes, confidenceLog, grammarStats, …
  ```
- **Why:** the blob's `updated_at` is stamped when the debounced push fires (≥5 s after the stamp that scheduled
  it), so on a single device `cloudMs > localMs` is ALWAYS true after any push → every cold load takes the
  restore branch. Anything mutated after that push by an action that neither stamps `lastMutationAt` nor
  schedules a push is overwritten by the older blob. Not multi-device-only: it hits a learner with one phone.
- **Failure scenario:** signed-in learner reviews some cards (stamp + push), then chats with Cikgu Maya for 10
  min / finishes a roleplay with no missed key-phrases / writes reflections, closes the app. Next open: chat,
  roleplay entry, journal cohesion mistakes, confidence log, reflections are gone.
- **Proof: CONFIRMED** — `blobRevert.probe.js` mounts the REAL `<AuthGuard>` twice (jsdom) over the repo's
  fake-Supabase harness (`src/test-utils/twoDeviceSync.js`), same device:
  ```
  after sign-in #1: blob pushes = 1  blob.updated_at= 2026-09-28T04:00:50.298Z  local lastMutationAt= 2026-09-28T03:59:50.289Z
  local BEFORE reload: {"cikgu":2,"roleplay":1,"mistakes":1,"confidence":1,"reflections":1,"imbuhanTotal":1}
  local AFTER reload : {"cikgu":0,"roleplay":0,"mistakes":0,"confidence":0,"reflections":0,"imbuhanTotal":0}  blob pushes = 1
  ```
- **Fix direction:** route these actions through `commitPrefMutation` (stamp + push) or stamp in a single
  persist-level hook; better, compare `updated_at` against the *pushed* stamp (store `lastPushedMutationAt`)
  so a device never restores its own older blob.

### #4 — P1 — Two open tabs/windows: a stale tab overwrites the whole persisted store; reviews, streak, study history silently lost (no user action needed in the stale tab)
- **Files:** `src/store/useStore.js:2120-2129` (persist config: no cross-tab `storage` listener, no `partialize`) ·
  `src/components/Layout.jsx:95-100` (`online` handler → `setNetworkStatus` → full-store write).
- **Code:** `persist(…, { name: 'igcse-malay-store', version: STORE_VERSION, onRehydrateStorage, migrate })` —
  every `set()` serialises the tab's *entire in-memory* state to the one key; `grep` finds no
  `addEventListener('storage'` / `persist.rehydrate()` / BroadcastChannel anywhere in `src/`.
- **Failure scenario:** learner has the installed PWA window and an old browser tab (or two tabs) open. Studies
  in tab A. Phone/laptop drops and regains Wi-Fi → tab B's `online` handler calls `setNetworkStatus(true)` →
  tab B writes its pre-study snapshot over tab A's. Next launch: reviews, streak and study minutes are gone.
  Guest (default, local-only) users have no recovery path. Signed-in users usually recover (cards via
  hydrate's `fresher`, blob fields via restore) — UNLESS the stale tab made any stamped change (a setting,
  exam date, a card add): then its older snapshot wins the tie-break and is pushed over the cloud blob too
  (probe variant with `toggleTheme()` in tab B: same loss, `theme= light`).
- **Proof: CONFIRMED** — `multiTab.probe.js` (two store instances, one shared localStorage):
  ```
  tab A after study: reps= 1 state= 2 due= 2026-10-06T04:03:19Z streak= {"count":1,"last":"Mon Sep 28 2026"}
  [tab B: setNetworkStatus(true) — the Layout 'online' handler, no user action]
  after reload: reps= 0 state= 0 due= 2026-09-28T04:03:19Z streak= {"count":0,"last":""} studyHistory= {}
  ```
- **Fix direction:** `window.addEventListener('storage', e => e.key === 'igcse-malay-store' && useStore.persist.rehydrate())`
  (zustand's documented cross-tab pattern), or a BroadcastChannel; at minimum rehydrate on `visibilitychange`.

### #5 — P2 — KNOWN-STILL-LIVE (07-03 deferred (b)) with a sharper root cause: retry backoff is never honoured, so 4 ordinary reviews during an outage dead-letter a queued delete and the card resurrects
- **Files:** `src/lib/syncEngine.js:120-151` (processes every event on every flush; never checks `nextRetryAt`) ·
  `src/components/Layout.jsx:114-119` (flush on every `queue.length` change) · `src/store/useStore.js:1079-1092` (union re-adds)
- **Code:**
  ```js
  for (const event of queue) {
    try { await processEvent(event); processedCount += 1 }
    catch (err) { const attempts = (event.attempts ?? 0) + 1 ...
      if (!fatal && attempts < MAX_ATTEMPTS) remainingQueue.push({...event, attempts, nextRetryAt: …})
      else deadLetter.push(...)          // dropped from the queue
  ```
- **Why:** the 07-03 review assumed the 5 attempts are spread by `nextRetryDelayMs` (~30 s). They are not: each
  enqueue changes `queue.length`, Layout re-flushes, and every queued event is retried immediately. The attempt
  budget is spent at the speed of the learner's clicks.
- **Failure scenario:** free-tier project paused / network flaky. Learner deletes a card, then reviews 4 cards →
  the delete is dead-lettered (archive also fails during the outage). Backend returns → next hydrate re-adds
  the card from the still-live cloud row.
- **Proof: CONFIRMED** — `deadLetterBurn.probe.js` (backend `beforeUpsert` throws `TypeError('Failed to fetch')`):
  ```
  after delete: card_removed attempts = 1
  after review 1..3: attempts = 2, 3, 4
  after review 4: card_removed attempts = GONE (dead-lettered)
  elapsed wall-clock ms for all 5 "retries": 4
  after outage + hydrate: local has rumah = true  cloud row deleted = false
  ```
- **Fix direction:** skip events whose `nextRetryAt` is in the future inside `processSyncQueue`; never dead-letter
  `card_removed` on transient errors.

### #6 — P2 — Tapping "Retry" on the red cloud pill resurrects a card deleted during the outage (and studying it undeletes it on every device)
- **Files:** `src/store/useStore.js:590-596` (`retrySync`) · `:1079-1092` (`hydrateCloudData` union ignores queued `card_removed`) · `src/lib/cloudSync.js:41-55` (any later `card_reviewed` upserts `deleted:false`)
- **Code:**
  ```js
  retrySync: async () => {
    if (get().sync.cloudUnavailable) await get().hydrateCloudData();   // pulls cloud cards FIRST
    return get().flushSyncQueue();                                       // …then sends the queued delete
  },
  ```
- **Why:** hydrate's key-union re-adds every live cloud card that is missing locally; it never consults the local
  queue, so a removal that has not flushed yet looks like "a card this device is missing". The delete then
  flushes (cloud tombstone) but the card is already back locally; the next review of it upserts `deleted:false`.
- **Failure scenario:** signed-in learner, Supabase paused/unreachable (pill: "Cloud backup unavailable"), deletes
  a wrong card; backend returns; learner taps Retry → card reappears in the deck; they study it → it is now
  live again in the cloud and comes back on every device.
- **Proof: CONFIRMED** — `retryResurrect.probe.js` (real store + cloudSync + syncEngine over the repo's fake backend):
  ```
  1. synced: cloud row deleted = false
  2. deleted locally: local has rumah = false  queue = card_removed
  3. after Retry: local has rumah = true  cloud row deleted = true  queue = 0
  4. after studying it: cloud row deleted = false  (false = resurrected on every device)
  ```
- **Fix direction:** flush before hydrate in `retrySync`, and in `hydrateCloudData` skip union-adding any key with
  a pending `card_removed` in `sync.queue`.

### #7 — P2 — "Restore from Backup" accepts the app's OWN "Export JSON" and `.deck.json` files; restoring one wipes all progress and (Export JSON) blanks every card
- **Files:** `src/lib/importBackup.js:11-17` · `src/pages/Settings.jsx:149-154` · `src/store/useStore.js:2092-2106` (`importData`) · `src/lib/export.js:35-52` (`exportToJSON`) · `src/lib/sharedDeck.js:70-71`
- **Code:**
  ```js
  export function isValidBackup(data) {
    return !!data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.cards)
  }
  // importData: next[k] = src[k] !== undefined ? src[k] : defaults[k]   (every missing key → default)
  ```
- **Why:** the guard exists to stop "unrelated JSON wiping the store", but the Settings page itself produces two
  other JSON files with a `cards` array: "Export JSON (N cards)" → `{exported,version,cardCount,cards:[{malay,english,…}]}`
  and the shared `.deck.json` → `{v,cards:[{m,e,t,lang}]}`. Both pass. The confirm text quotes "this backup's N
  cards" — N equals the learner's own deck size, so it reads as correct.
- **Failure scenario:** learner taps "Export JSON" believing it's a backup, later restores it: streak, exam date,
  mistakes, grammar SRS, exam attempts, settings reset to defaults; every card becomes `{malay, english,…}` with
  `m`/`e` undefined (blank study cards; `SearchModal.jsx:34` `c.m.toLowerCase()` throws on first search). For a
  signed-in user `importData` stamps + pushes, so the wiped blob also overwrites the cloud blob.
- **Proof: CONFIRMED** — `wrongFileRestore.probe.js` (real `exportToJSON` output captured, real `isValidBackup` + `importData`):
  ```
  BEFORE: {"cards":[["rumah","house",2,1],["buku","book",0,0]],"streak":{"count":1,...},"examDate":"2026-11-01","mistakes":1}
  Export JSON file: isValidBackup=true confirmCount=2 AFTER: {"cards":[[null,null,null,null],[null,null,null,null]],"streak":{"count":0,"last":""},"examDate":null,"mistakes":0}
  .deck.json file:  isValidBackup=true confirmCount=2 AFTER: {"cards":[["rumah","house",null,null],...],"streak":{"count":0,"last":""},"examDate":null,"mistakes":0}
  ```
  (`null` = `undefined` in JSON.stringify of an array.)
- **Fix direction:** require a backup-only marker (`exportDate` + e.g. `streak`/`grammarCards` object) and that
  every card has string `m`/`e`; route a deck-shaped file to the shared-deck importer instead.

### #8 — P2 — KNOWN-STILL-LIVE (census A12) — streak freeze refunded at a milestone; a streak parked on 7/14/30… becomes unloseable for ANY gap length
- **File:** `src/store/useStore.js:1587-1613` (`updateStreak`)
- **Code:**
  ```js
  } else if (streak.last && streak.last !== yesterday && streakFreezes > 0) {
    streakFreezes -= 1; freezeConsumed = true; ...        // count NOT incremented
  } ...
  if (checkStreakMilestone(streak.count)) { streakFreezes += 1; ... }   // same count → re-awarded
  ```
- **Failure scenario:** 7-day streak (freeze awarded). Learner skips 13 days, returns: freeze consumed AND
  re-awarded, count stays 7. Skips 6 more days: same again. The streak never breaks and never grows on return days.
- **Proof: CONFIRMED** — `streakFreeze.probe.js` (TZ=Asia/Kuala_Lumpur, real store):
  ```
  after 7 days: streak {"count":7,"last":"Mon Sep 07 2026"} freezes 1
  after 13-day gap: streak {"count":7,"last":"Mon Sep 21 2026"} freezes 1 log awarded,consumed,awarded
  after another 6-day gap: streak {"count":7,"last":"Mon Sep 28 2026"} freezes 1
  ```
  (Also: one freeze covers a gap of any length — 13 days here.)

### #9 — P2 — TRACED (conditional on the project's API "Max Rows", Supabase default 1000) — a learner with >1000 cards gets only 1000 back on a new/wiped device
- **File:** `src/lib/cloudSync.js:77-88` (`fetchCloudCards … .limit(5000)`) and `:96-106` (`fetchCloudDeletedCardKeys … .limit(5000)`)
- **Code:**
  ```js
  .from('user_cards').select('card').eq('user_id', user.id).eq('deleted', false)
  .order('updated_at', { ascending: false })
  .limit(5000)          // PostgREST's server-side max-rows cap still applies; no pagination / .range()
  ```
- **Trace:** a client `.limit()` cannot exceed PostgREST's `max_rows` (Supabase's documented project default is
  1000; there is no `supabase/config.toml` in the repo overriding it, and I did not query prod by rule). Cards
  are ONLY restored via this call — `restoreFromCloud` deliberately excludes the blob's `cards`
  (AuthGuard.jsx:113). Seeds alone reach 1171 cards (English starter 682 + AWL 3×60 + Malay starter 45 + topic
  packs 264, measured by `deckSizes.probe.js`). Trigger: new phone, reinstall, cleared site data, or iOS Safari
  ITP's 7-day script-storage eviction for a non-installed tab → hydrate restores 1000 cards, the rest silently
  never come back (and >1000 tombstones would similarly un-hide deleted cards).
- **Verify first:** Supabase dashboard → API settings → Max Rows. If 1000, paginate with `.range()`.

### #10 — P2 — Once localStorage is full, every study action throws before applying and nothing is saved, with no message
- **Files:** `src/store/useStore.js:2120-2129` (default `createJSONStorage`, no quota handling) · `:1279-1284`
  (`backupState` writes a SECOND full copy of the store to `igcse-malay-backup`; per #3 this runs on every
  signed-in cold load because the restore branch is always taken)
- **Code:** zustand's persist wraps every `set` as `set(...); void setItem()` — a synchronous `QuotaExceededError`
  from `localStorage.setItem` propagates out of the action.
- **Proof: CONFIRMED (mechanism)** — `quota.probe.js`, `setItem` throwing `QuotaExceededError`:
  ```
  reviewCardAction threw -> QuotaExceededError: The quota has been exceeded.
  in-memory: reps= 0  mistakes= 0  queue= card_added  challenge.reviewDone= 0
  persisted: reps= 0 (was 0)
  ```
  The very first `set` (inside `ensureDailyChallenge`) throws, so the review is never applied in memory either;
  the click handler throws, the card doesn't advance, and there is no UI signal.
- **Not measured:** how close real heavy users get to the ~5 MB origin quota (store = cards + up to 2500
  mistakes + 100 writing entries with AI feedback + speaking transcripts, ×2 with the backup key). Graded P2
  for that reason. Fix: drop/trim the `igcse-malay-backup` duplicate and wrap storage.setItem to catch + surface.

## Checked — no finding (or design, not a bug)
- **All `persist.migrate` cases v<2 … v<35** walked with null/missing fields: every later case uses `|| {}` /
  `??` / spread-with-defaults; `applyV34Migration` tolerates null cards. Only v<2 (`card.stability` on a null card,
  `migrateFromSM2` on an unparseable `nextReview` → RangeError) can throw — pre-FSRS stores only; noted, not reported.
- **zustand merge** is shallow; nested prefs (`pdfReader`, `identity`, `recallProbe`, `ui`) are all back-filled by
  their migration case. `sync.cloudUnavailable` added without a bump → `undefined` is falsy, safe.
- **Corrupt persisted JSON:** zustand's hydrate catches the parse error and leaves defaults (next `set` then
  overwrites the key). Browsers write localStorage atomically, so not a realistic path — not reported.
- **Offline queue replay twice:** every processor is an idempotent upsert keyed by `card_key` / `entry_id`;
  `flushSyncQueue` re-slices the LIVE queue by id and keeps `_flushInFlight` (P1-2 fix verified by reading).
- **`reconcileSyncStatusOnLoad`** heals stale `syncing` / `offline` / `cloudUnavailable` — correct.
- **hydrate merge:** `(m,t,lang)` key + `fresher()` by `last_review` then `reps`; tombstone filter after the
  union; writing/speaking now both ASC + `slice(-100)` (review #10 fix verified).
- **Time zones:** `localDay.js` (`toLocalISO`, `daysUntilLocalDate`) and `dailyPlan.isSameLocalDay` are local-day
  correct for UTC+8; streak uses `toDateString()` (local) and `Date.now() - 86400000` — Malaysia has no DST, so
  no midnight/DST defect for the target audience (would be off by one on DST days elsewhere; not reported).
- **FSRS edge cases:** Relearning path graduates correctly (probe: Again on Review → Good → Review, sched 3/8/20/47);
  Review-state Good intervals grow normally. The defect is confined to the Learning path (#1).
- **`importData` from an OLDER real backup:** missing keys fall back to defaults; pre-v34 cards default to `ms`
  via `cardLang`; round-trip pinned by `exportImportRoundTrip.test.js`. Stamps `lastMutationAt` (review #11 fix live).
- **export.js:** CSV cells sanitised against formula injection.
- **Sign-in union / tombstones (P2-C2), per-deck review scope (P2-C1), `::en` card_key, promoteMistakeToCard
  lang scope, dedupe-bump reopen** — all verified fixed at HEAD by reading.
- **Design, not reported:** blob fields (`grammarCards`, `mistakes`, `streak`, `studyHistory`, `examAttempts`)
  are whole-blob last-writer-wins across devices (only cards/writing/speaking merge per item); `importData`
  for a signed-in user is re-merged with pre-restore cloud cards by the next hydrate union.

## Probe files (all under scratchpad/probes/r1/__tests__/)
`fsrsSteps.probe.js`, `fsrsStore.probe.js` (#1) · `cardCountWipe.probe.js` (#2) · `blobRevert.probe.js` (#3) ·
`multiTab.probe.js` (#4) · `deadLetterBurn.probe.js` (#5) · `retryResurrect.probe.js` (#6) ·
`wrongFileRestore.probe.js` (#7) · `streakFreeze.probe.js` (#8) · `deckSizes.probe.js` (#9) · `quota.probe.js` (#10).
Run: `npx vitest run --config <scratch>/probes/r1/vitest.probe.config.mjs <name> --silent=false --reporter=verbose`
from the repo root. No repo file was modified.
