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
Sync/store: hydrate pushes stale local card copies over fresher cloud reviews (useStore.js `hydrateCloudData`)
— ✅ **VERIFIED REAL + FIXED 2026-07-08** (red→green cross-device test `syncTwoDeviceIntegration.test.js`
"PLAUSIBLE-1"). Root cause: the sign-in merge was a key-union where the **local copy always won on a key
collision** (`missingCards` = cloud cards NOT already local), then `syncCloudSnapshot` pushed that local
copy back to the cloud. So a device holding a STALE copy of a card another device reviewed kept the stale
one AND overwrote the cloud's fresher review — silent loss of study progress. `hydrateCloudData` runs on
EVERY sign-in incl. cold session restore (AuthGuard `pullCloudData`), so it's reachable for any returning
multi-device user. **Fix:** reconcile per TRUE card identity `(m,t,lang)` (mirrors `cloudSync.cardKey`'s
`::en` suffix — also closed a latent lang-collision + en-tombstone-miss in the old `m::t`-only merge key);
on collision keep the **fresher** copy by `last_review` (null=never-reviewed loses), `reps` tiebreak —
symmetric, so an unsynced-newer LOCAL review still wins. Existing P2-C1/P2-C2/v34 merge tests still green.
AuthGuard `handleSignIn` blob restore skipped for 0-card accounts (fresh-device overwrite risk) — ✅
**VERIFIED REAL + FIXED 2026-07-08** (red→green jsdom test `authGuardSignInMergeIntegration.test.js`
"PLAUSIBLE-2"). The tie-break's `else if (cloudMs > localMs && cloudCardCount > 0)` gated blob restore on a
NON-empty cloud deck, so an account with **0 vocab cards but real blob-only progress** (streak / identity /
settings / dailyChallenge / grammarCards / mistakes) fell through to `pushStateBlob(local)` when a fresh
0-card device signed in — the empty local blob silently overwrote the account everywhere. (The existing
P1-1 test's own comment admits it *"requires cloudCardCount > 0"* — direct confirmation.) **Fix:** drop the
`&& cloudCardCount > 0` guard — cards merge separately via the key-union and `restoreFromCloud` already
excludes them, so blob-only state must restore on newer-wins regardless of deck size. syncEngine.js
`processSyncQueue` retry reorders dependent add/remove events + `MAX_ATTEMPTS`/~30s budget dead-letters
deletions — ⏳ **ANALYZED 2026-07-08, likely-real-but-NARROW, fix DEFERRED (needs a queue-semantics design
decision, not a blind patch).** (a) The loop processes every event independently, so if `card_added(X)`
fails transiently while a later `card_removed(X)` succeeds, the deferred add retries AFTER the remove
already applied → resurrects a deleted card. But a transient network failure usually fails the WHOLE flush
(same connection), so a partial failure hitting only one of a dependent pair is uncommon; the correct fix
(head-of-line blocking — stop at the first retriable failure to preserve FIFO order) trades throughput and
would change semantics the existing `syncEngine.test.js` pins, so it needs a deliberate design call.
(b) Dead-lettered `card_removed` events are archived to `sync_events` (`_deadLetter:true`) for debugging
but **never re-applied**, so a deletion lost to a >30s transient outage permanently resurrects the card;
the real fix is a dead-letter REPLAY mechanism (or a longer budget for deletions specifically) — a design
choice for Kheshav, out of scope for a one-line patch. Both need a red reproduction test before any fix.
cloudSync.js:6 `card_key = m::t` ignores `lang` (v34
same-word MS/EN pair collides in cloud) — ✅ **VERIFIED REAL + FIXED 2026-07-06** (bigger than the cloud line: card identity was `(m,t)` across `reviewCardAction`/`removeCard`/`cloudSync` while `addCards` allows `(m,t,lang)`, so reviewing the English "hotel" also rescheduled the Malay one AND the cloud collapsed both into one row = data loss. Threaded an optional, default-preserving `lang` through the whole path; en cards get a `::en` `card_key` suffix so MS keys stay byte-identical → **no SQL migration/backfill**. +cross-device collision test + store lang-scope test); useStore.js:1727 promoteMistakeToCard cross-language card
link — ✅ **VERIFIED REAL + FIXED 2026-07-06** (`promoteMistakeToCard`'s existing-card lookup was `cards.find(c => c.m === m)` — headword only, ignoring lang — so an English vocab miss whose word is spelled the same as an existing Malay card, e.g. the loanword "radio", linked to the MALAY card and never created an English one; the English study deck silently never gained it. Every other identity site — `addCards`, `reviewCardAction` — already keys on `(m,t,lang)`; this was the lone outlier, same collision class as the shipped cloud `card_key ::en`. Fix: scope the lookup by `cardLang(c) === targetLang` and reuse `targetLang` for the new card. No sync-engine/schema change — the new en card syncs via the already-tested `card_added` → `::en` path); :1627 dedupe-bump keeps `reviewed:true` — ✅ **VERIFIED REAL + FIXED 2026-07-06** (the 24h dedupe "bump" branch refreshed `attempts`/`timestamp`/`severity` but never reset `reviewed`, so a mistake the learner marked fixed then got wrong AGAIN within 24h stayed `reviewed:true` and vanished from `getFixUpQueue`/`getMistakeStats.total` — the exact hypercorrection signal the journal exists to surface. Fix: `bumped.reviewed = false` on bump so recurrence re-opens it. Both in one cluster commit + `mistakePipelineDataCorrectness.test.js` red→green, full 2129-test suite green).
Reader/multimodal: PDFReader.jsx:1203 in-flight sentence translations attach doc A's English to doc
B — ✅ **VERIFIED REAL + FIXED 2026-07-07**. Root-cause traced end to end: (1) `sentenceId` is POSITIONAL (`sentenceModel.js` → `${pageNum}:${pi}:${firstTokenI}`), so doc A's first sentence and doc B's first sentence share the id `…:0:0`; (2) `translateDocument` RESOLVES with partial results on abort (`break` → `return out`, not a throw); (3) both sentence-reveal paths (`runSentenceTranslation`, `fetchSentenceEnglish`) wrote `setSentenceGloss` AFTER the await with NO staleness guard — unlike the word/OCR paths, which guard `signal.aborted` (PDFReader.jsx:463). `resetGloss` clears `sentenceGloss` on doc swap, but an in-flight doc-A translation that landed *after* the swap repopulated `sentenceGloss["…:0:0"]`, and doc B's identically-positioned (but different) sentence then revealed doc A's English = confident-wrong content. **Fix:** a document-epoch guard — `docEpochRef` bumped inside `resetGloss` (the single doc-swap boundary); each sentence path captures the epoch at start and drops its `setSentenceGloss` write if `docEpochRef.current !== epoch`. Epoch (not content-matching) is required: doc B parses *after* `resetGloss`, so during the parse window `sentenceData` still holds doc A and a content check would wrongly match. **Verified:** `tests/e2e/pdf-sentence-docswap.spec.js` (deterministic gated-translate mock, red→green — fails without the guard: doc B's first sentence shows doc A's English; passes with it). Full 2129-unit suite + reader e2e green; PDFReader chunk +0.12 KB. **Env note (the real "blank app" cause):** the earlier "local e2e renders blank" was NOT Console Ninja — a **different project's dev server (`iaido-duel`, the samurai game) was squatting on port 5173**, and Playwright's `reuseExistingServer:true` reused it, so every store-binding spec was testing the wrong app. Freeing 5173 fixed it. **The remaining Reader/multimodal group is now triaged (2026-07-08) — 5 fixed, 1 deferred-with-fix:**
`PDFReader` index-keyed **selection/keyboard state leaks across doc replace** — ✅ **VERIFIED REAL +
FIXED 2026-07-08** (red→green e2e `pdf-replace-viewswitch.spec.js` "PLAUSIBLE-1"). `resetGloss` (the
single doc-swap boundary, where `docEpochRef` is bumped) cleared the gloss/reveal state but NOT
`selection`/`activeTokenIndex`/`kbRange` — yet `switchView` DOES clear exactly those on a Reflow⇄Layout
switch *because* the token index space changes. A document REPLACE is also a new index space, so doc A's
selection chips + index-keyed highlights leaked onto doc B's (different) tokens = confident-wrong visual +
Add-to-deck could add doc A's leftover words. **Fix:** clear the three index-keyed states in `resetGloss`
(mirrors switchView's re-gate); C7/C8 still green.
`runImageOcr` **OCR worker leak** — ✅ **VERIFIED REAL + FIXED 2026-07-08** (code-inspection + `past-paper-ocr`
e2e regression guard, incl. the second-run test). Every tesseract run did `createOcrRecognizer` and
overwrote `ocrRecognizerRef.current` WITHOUT terminating the previous worker — so a second run (guaranteed
on an `ocrLang` switch, where the old language worker can't be reused) orphaned a heavy Tesseract WASM
worker each time; the `resetGloss` "kept for reuse" comment was aspirational (nothing reused it). **Fix:**
`terminate?.()` the prior worker before creating the replacement; comment corrected. *(No dedicated failing
test — worker lifecycle isn't observable in Vitest/Playwright here; regression-guarded by the OCR e2e.)*
`toggleRecord` **unmount-while-recording leak** — ✅ **VERIFIED REAL + FIXED 2026-07-08** (code-inspection).
The unmount cleanup calls `mediaRecorder.stop()`, whose async `onstop` then fired `runAudioTranscribe` on
the dead component — minting a new object URL + Whisper worker that nothing would ever revoke/terminate.
**Fix:** an `unmountedRef` set FIRST in the unmount cleanup; `onstop` still releases the mic but skips the
transcription kickoff when unmounted. *(Same coverage caveat — MediaRecorder lifecycle not observable in-repo.)*
`runAudioTranscribe` **engine failure misreported as "no clear speech"** — ✅ **VERIFIED REAL + FIXED
2026-07-08** (red→green unit `transcribe.test.js` "PLAUSIBLE-5" ×3). `runTranscribe` swallowed generic
engine errors (e.g. `decodeAudioData` rejecting on a corrupt/unsupported clip) to empty pages, indistinguishable
from true silence — so the UI told the user "try a quieter clip", a dead end for an undecodable file. True
silence is detected INSIDE the engine and RESOLVES empty (no throw), so the two ARE separable. **Fix:**
`runTranscribe` returns `failed:true` on a swallowed error (preserves the pinned "empty pages, never rejects"
contract — `pages` stays `[]`); PDFReader shows an accurate "couldn't read that recording (damaged/unsupported)"
message on `failed`, keeping the silence copy for genuine silence.
`pdf.js` **`extractPdfText` leaks the PDFDocumentProxy** — ✅ **VERIFIED REAL + FIXED 2026-07-08** (red→green
unit `pdf.test.js`, pdfjs mocked). `extractPdfText` (Import's text-only path) created a doc via `loadPdf`
and neither returned nor destroyed it — the caller gets only `{pages, meta}`, so nobody could free it → a
leaked worker doc on every Import PDF parse. (The reader path is safe: it holds the doc in `docRef` and
destroys on replace/clear.) **Fix:** `try { …extract… } finally { doc.destroy() }`; also destroys on an
extraction error.
`translatePage`/`cancelTranslate` **cancel-retranslate race** — ⏳ **VERIFIED REAL but NARROW, fix DEFERRED
(one gated-mock e2e needed first).** `translateDocument` RESOLVES with partial results on abort, and
`translatePage`'s post-await tail unconditionally runs `setTranslating(null)` + `translateAbortRef.current =
null`. So cancel-then-retranslate: run #1's late resolve WIPES run #2's progress bar AND nulls run #2's abort
ref (its Cancel button goes dead). **UX only — no wrong content** (the partial glosses applied are correct).
**Fix (specified):** capture `ac` locally and guard the tail with `if (translateAbortRef.current !== ac)
return` — on plain cancel the ref is still `ac` so partial results still apply; on supersede it's `ac2` so the
newer run isn't clobbered. Deferred only for a deterministic gated-translate e2e (à la `pdf-sentence-docswap`)
to red-prove the race before shipping the 1-line guard.
AI plumbing (all three ✅ **VERIFIED REAL + FIXED 2026-07-08**, one `src/lib/ai.js`+`gemini.js` cluster
commit): (a) **`ai.js` non-stream double-encode** — the SSE path returns the model's text as a PLAIN
string, but the non-stream path wrapped `data.response` in an unconditional `JSON.stringify`, so a
plain-text edge reply `"Selamat pagi"` came back as `'"Selamat pagi"'` (literal quotes leaking into
roleplay/chat replies). The edge fn returns EITHER already-parsed structured output (object) OR raw
text (string); fix stringifies ONLY non-strings, matching the streaming contract AND preserving the
deck/scenario JSON-string parse contract. (b) **`ai.js` quota masks success** — `incrementDailyUsage`'s
bare `localStorage.setItem` runs AFTER a successful `res.ok` fetch; a quota/private-mode throw fell
into callAI's outer catch → turned the already-received reply into `AIError('unavailable')` AND tripped
the circuit breaker. Fix: best-effort try/catch around the write. (c) **`gemini.js` abort/timeout
disarmed at headers** — the timeout `clearTimeout` + caller-abort `removeEventListener` sat in the
fetch-only `finally`, which runs the moment headers arrive, BEFORE `res.json()` reads the body — so a
stalled body was unbounded and a caller cancel during the body read was ignored (contradicting the
intent comment "Either trips → abort"). Fix: wrap fetch + body read in one try/catch/finally, keeping
both guards armed until the body is fully read; error semantics preserved via the `err.cause` marker
`makeError` sets (http/empty re-thrown untouched, only raw network errors re-wrapped). +3 tests
(`aiNonStreamResponse.test.js`) + 1 (`geminiAbortDuringBody.test.js`, deterministic no-hang red→green);
existing `aiSSEStream`/`geminiThinkingConfig` pins still green. No STORE_VERSION/schema change.

Discovered en route (NOT a review item, but blocked the gate): `learnerProfile.js`/`competenceSnapshot.js`
filtered recency windows against wall-clock `Date.now()` while `competenceSnapshot` did `void now` — the
pinned `competenceSnapshot.test.js` fixture (2026-06-24) fell outside the 14-day window exactly 14 days
later, so the full `test:run` gate time-bombed 2026-07-08. Fixed by threading an injectable `now`
(default `Date.now()`, non-test callers byte-identical) through `buildLearnerProfile`; shipped as its own
commit FIRST to unblock the gate. Also silently drifted the live For-You weak-spots panel.
Grading: writingGrader.js:170 "sehinggakan" rewarded and flagged simultaneously — ✅ **VERIFIED REAL
+ FIXED 2026-07-06** (`MS_SOPHISTICATED` counted `sehinggakan` as *sophisticated vocab* — inflating the
Malay vocab band — while `findIssuesMalay`/`writingErrorsMalay.js:313` flags it HIGH as colloquial
`suggestion:'sehingga'`; the grader praised and penalised the same token. Swept the other 26
`MS_SOPHISTICATED` entries against the Malay error map — `sehinggakan` was the only genuine overlap
(`walaupun` only matched inside the no-space misspelling `walaupunbegitu`; `namun` only in a `msg`
string suggesting it as the *correct* alternative). Removed `sehinggakan` from the reward list —
exam-safe direction: `sehingga` is indisputably standard, and it's not a genuinely sophisticated
connector anyway. +1 differential regression test in `writingGrader.test.js` red→green); pronunciation.js:25
positional alignment cascades one insertion into all-wrong — ✅ **VERIFIED REAL + FIXED 2026-07-06**
(`scorePronunciation` compared `expWords[i]` vs `spkWords[i]` index-for-index, so ONE inserted or
dropped word shifted every downstream word and marked it wrong — a fully-correct utterance with one
filler scored ~25%. Replaced the positional loop with a Levenshtein token **alignment** (`alignWords`
DP + backtrack: diagonal=align/`classifyPair`, deletion=`wrong '—'`, insertion=`extra`) so a single
indel no longer cascades. All 17 pre-existing behaviour-pins still pass + 2 new cascade tests
red→green; SpeakMode result shape unchanged. Discovered en route: SpeakMode.jsx:129 reads
`result.spoken` which `scorePronunciation` never returned — pre-existing "You said: " display bug,
logged as a GOAL follow-up, out of scope here).
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
