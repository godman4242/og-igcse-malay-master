# Adversarial codebase review — 2026-07-03

> **Method (honest):** 14 scoped finder agents swept the codebase (find → refute design). Three
> successive usage-limit crashes killed the skeptic fleet, so **all P0/P1 verdicts below were
> verified inline by Claude reading the live code** (each verdict cites the exact lines checked);
> P2s and two subtle P1s are listed as PLAUSIBLE-unverified. Raw findings JSON survived in the
> workflow journal (`wf_ed75cf7a-447`) + scratchpad `findings.json`.
>
> **Coverage: 9/14 scopes complete** — store-migrations, cloud-sync, srs-scheduling, pdf-reader,
> multimodal, ai-plumbing, grading-feedback, security-privacy, perf-render. **5 scopes pending**
> (queue post-July-7): bilingual-v34, study-modes, app-shell-guide, wildcard-integration,
> docs-drift. (The worst v34 bilingual bug was still caught — by three other finders.)

## ✅ CONFIRMED — fix queue (severity-ordered; each = a bounded gate-green commit)

### P0 — confident-wrong Malay (worst defect class)
1. **`src/lib/writingErrorsMalay.js:559` — valid word "mengikuti" flagged as HIGH misspelling.**
   `['mengikuti', 'mengikut']` sits in the MISSPELLINGS map — the inline comment even admits
   *"both exist"*. `detectMisspellings` flags every map hit as HIGH "common misspelling", so every
   legitimate *mengikuti* (to follow/attend — standard Kamus Dewan word) is marked wrong.
   **Also `:562` `['mengambilkan','mengambil']`** — *mengambilkan* is a valid benefactive (take
   *for* someone); same class. **Fix:** delete both entries; sweep the Malay map for other
   valid-word entries; add a regression test asserting these words produce zero findings.

### P1 — confident-wrong English grader cluster (one commit, `src/lib/writingErrors.js`)
2. **`:575`/`:585` — "Saturday"/"Tuesday" self-flag.** Map entries `['saturday','Saturday']`
   differ only by case; executor (`:604` `fix !== w.lower`, compares the LOWERCASED word) fires on
   every use — including correctly capitalized ones, suggesting the exact text the student wrote.
   **Fix:** case-only entries need a capitalization-aware check (compare `fix !== w.word`), plus a
   map sweep for other case-only entries.
3. **`:518` — "everyday" flagged always.** Valid adjective ("everyday life") flagged HIGH on every
   use. **Fix:** drop, or fire only when followed by a verb/pronoun pattern (adverbial misuse).
4. **`:653-671` — "an MP / an NGO / an X-ray" flagged HIGH with wrong fix.** `STARTS_VOWEL_SOUND`
   comment says acronyms are "handled separately" (`:71`) — no such handling exists; consonant-letter
   vowel-sound acronyms (M, N, X, S, F, H, L, R) get "Use 'a' before a consonant sound → a MP".
   **Fix:** all-caps token → letter-name sound table before the vowel-letter heuristic.
5. **`:106` — "your right/wrong" auto-"corrected" to "you're".** The `your-areerror` alternation
   includes `right|wrong`, so "on your right", "your right to…" → HIGH error. **Fix:** remove
   `right|wrong` from the pattern (the cost of missing "your right" misuse is far below the cost of
   flagging correct possessives).

### P1 — grading / scheduling correctness
6. **`src/lib/speakingGrader.js:114` — bands 1–2 unreachable; silence scores 3/6.** `let band = 3`
   with only upgrade branches. **Fix:** add downgrade gates (e.g. band 1–2 when word count/duration
   is far below floor) + test that near-empty input scores < 3. (Over-praise = calibration harm.)
7. **`src/store/useStore.js:1425` — v34 regression: every study lapse journaled `language:'ms'`.**
   `reviewCardAction` hardcodes `'ms'` regardless of `cardToLog.lang` — English misses enter the
   MALAY mistake pipeline (wrong journal bucket + wrong-direction promoted card). Three finders
   converged on this independently. **Fix:** `language: cardToLog.lang || 'ms'` + unit test with an
   `'en'` card; audit other `addMistake` call-sites for the same hardcode.
8. **`src/lib/dailyPlan.js:82` — yesterday's challenge marks today's tasks done.** `deriveTaskDone`
   trusts `challenge.reviewDone/Target` without checking `challenge.date`; `getChallengeStats()`
   (useStore) returns the stale object with no date guard, and For-You/DailyPlan consume it before
   any regeneration runs. **Fix:** pass/check the date (treat non-today challenge as absent → falls
   back to the day-aware FSRS path at `:85`).
9. **`src/lib/dailyPlan.js:118` — "latest band" reads the OLDEST attempt.** `speakingHistory[0]` /
   `writingHistory[0]` are the oldest entries (writers append newest-last; cf. `slice(-100)` cap).
   Skill-need is computed from the student's *first-ever* band forever. **Fix:** read `.at(-1)`
   (or sort-guard) + test.
10. **`src/store/useStore.js:1043` — hydrate inverts `speakingHistory` order.** Sign-in merge sorts
    speaking DESC (`:1044`) while writing sorts ASC (`:1041`) and all writers/readers assume
    newest-LAST — after hydrate, "latest attempt" readers (incl. #9's fix) read wrong entries. The
    finder's sub-claim that the cap trims newest is WRONG (`slice(0,100)` on DESC keeps newest 100)
    — the real bug is order inversion. **Fix:** sort ASC + `slice(-100)` to match writing; then #9's
    `.at(-1)` is correct pre- and post-hydrate. Cross-device test required (sync invariant).
11. **`src/store/useStore.js:1974` — backup restore silently reverted for signed-in users.**
    `importData` raw-`set`s the whole store without stamping `lastMutationAt`/`triggerCloudSync` —
    violating the store's own documented invariant (src/store/CLAUDE.md "Sync invariants"): the
    newer-wins tie-break sees the old cloud blob as newer and undoes the restore on next reload.
    **Fix:** stamp `lastMutationAt` + trigger sync in `importData`; extend
    `syncTwoDeviceIntegration.test.js` with a restore-then-hydrate case.
12. **`src/hooks/useStudySession.js:162` — bilingual users can never finish a session.** The
    end-of-session check counts due cards of BOTH languages (deck-filter only, no `cardsForLang`),
    while the session queue is `studyLang`-scoped — summary/confetti never fires if the *other*
    language has due cards; `nextCard()` spins instead. **Fix:** apply the same lang scope to the
    `remaining` computation + test.
13. **`src/lib/translate.js:174-176` — transient failure permanently mistranslates a word.** The
    fallback `{text: word, source:'error'}` self-gloss is `writeCache`d into the normal read
    namespace (`writeNsFor` filters by provider only; `writeCache` stores anything), and the cache
    hit short-circuits retries forever — the Malay word is served AS its own "English". Confident-
    wrong content via cache. **Fix:** never cache `source:'error'` results (guard in `translateBatch`
    or `writeCache`) + test.
14. **`src/lib/ai.js:208-247` — SSE reader corrupts streamed replies on chunk splits.** No
    cross-chunk line buffer: a `data:` line split across reads (a) fails `JSON.parse` and the catch
    APPENDS THE RAW JSON FRAGMENT to the user-visible reply, and (b) the tail (no `data: ` prefix)
    is dropped. **Fix:** keep a `buffer` carrying the last partial line across reads (standard SSE
    pattern); only treat non-JSON as text for lines that never parsed after stream end.
15. **`src/pages/Settings.jsx:175` — "Share Deck via Link" is a dead feature.** `handleShare`
    copies `?deck=<base64>` but NOTHING consumes a `deck` param anywhere in src (only `drill` is
    read). Recipient gets a normal app; sharer believes it worked. **Fix (decide):** either build
    the import path (consume `?deck=` → MakeDeckPanel-style preview) or remove the button. Product
    call — needs Kheshav.

### Also confirmed en route (small)
16. **`src/lib/transcribe.js:13` — `MAX_AUDIO_SECONDS` is dead code.** Only the MB cap is enforced
    (`PDFReader.jsx:505`); a compressed 10 MB clip ≈ 20+ min hits main-thread Whisper (spec D12
    intended a 5-min bound). **Fix:** enforce after decode (samples.length / sampleRate) with the
    friendly error; or fold into the ASR-worker task (GOAL loop-safe #1).

## 🟡 PLAUSIBLE — extracted but NOT yet independently verified (do not fix blind; verify first)
Sync/store: hydrate pushes stale local card copies over fresher cloud reviews (useStore.js:1052 —
needs two-device-harness investigation); AuthGuard.jsx:134 blob restore skipped for 0-card accounts
(fresh-device overwrite risk); syncEngine.js:129 retry reorders dependent add/remove events; :143
~30s retry budget dead-letters deletions; cloudSync.js:6 `card_key = m::t` ignores `lang` (v34
same-word MS/EN pair collides in cloud) — ✅ **VERIFIED REAL + FIXED 2026-07-06** (bigger than the cloud line: card identity was `(m,t)` across `reviewCardAction`/`removeCard`/`cloudSync` while `addCards` allows `(m,t,lang)`, so reviewing the English "hotel" also rescheduled the Malay one AND the cloud collapsed both into one row = data loss. Threaded an optional, default-preserving `lang` through the whole path; en cards get a `::en` `card_key` suffix so MS keys stay byte-identical → **no SQL migration/backfill**. +cross-device collision test + store lang-scope test); useStore.js:1727 promoteMistakeToCard cross-language card
link; :1627 dedupe-bump keeps `reviewed:true`.
Reader/multimodal: PDFReader.jsx:1203 in-flight sentence translations attach doc A's English to doc
B (needs repro); :317 index-keyed selection state leaks across doc replace; :926 cancel-retranslate
race; :449 OCR-language worker leak; :411 unmount-while-recording transcription + object-URL leak;
:529 engine failures misreported as "no clear speech"; pdf.js:101 PDFDocumentProxy never destroyed.
AI plumbing: ai.js:196 double-encoded non-stream response; :42 localStorage quota failure turns a
successful reply into AIError; gemini.js:107 abort/timeout disarmed at headers.
Grading: writingGrader.js:170 "sehinggakan" rewarded and flagged simultaneously — ✅ **VERIFIED REAL
+ FIXED 2026-07-06** (`MS_SOPHISTICATED` counted `sehinggakan` as *sophisticated vocab* — inflating the
Malay vocab band — while `findIssuesMalay`/`writingErrorsMalay.js:313` flags it HIGH as colloquial
`suggestion:'sehingga'`; the grader praised and penalised the same token. Swept the other 26
`MS_SOPHISTICATED` entries against the Malay error map — `sehinggakan` was the only genuine overlap
(`walaupun` only matched inside the no-space misspelling `walaupunbegitu`; `namun` only in a `msg`
string suggesting it as the *correct* alternative). Removed `sehinggakan` from the reward list —
exam-safe direction: `sehingga` is indisputably standard, and it's not a genuinely sophisticated
connector anyway. +1 differential regression test in `writingGrader.test.js` red→green); pronunciation.js:25
positional alignment cascades one insertion into all-wrong.
Perf/UX: QuickReview.jsx:20 ignores `studyLang` (serves other language's cards on Dashboard —
likely real, quick check) — ✅ **VERIFIED REAL + FIXED 2026-07-06** (`getDueCards(cardsForLang(cards, studyLang))`, +3 jsdom tests `quickReviewLang.test.js`); useStudySession/useStore selector allocations (perf finder details in
journal).

## ❌ REFUTED (by inline verification)
- **"isValidBackup accepts the app's own Export JSON so restore wipes the deck"** — Export JSON IS
  the backup file (`handleExportJSON` → `exportData()` → full `BACKUP_KEYS`, filename `…backup-…`);
  round-trip is intended + test-pinned (`exportImportRoundTrip.test.js`). Residual hardening idea
  only (e.g. also require `exportDate`), P3.

## Recommended fix order (each its own commit; graders first — content truth outranks all)
1. #1 P0 Malay map (+ sweep + tests) → 2. #2–5 English grader cluster → 3. #6 speaking floor →
4. #7 v34 lapse language → 5. #8–9 dailyPlan pair → 6. #10–11 store/sync pair (cross-device tests
mandatory) → 7. #12 session-finish scope → 8. #13 translate cache → 9. #14 SSE buffer →
10. #15 share-link (needs Kheshav decision) → 11. #16 audio cap.
Then: verify the PLAUSIBLE list (starting with useStore.js:1052 + QuickReview) and run the 5
pending finder scopes.
