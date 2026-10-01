# 🎯 Build-loop GOAL — the north-star the autonomous loop optimizes

> **This file IS the loop's intent**, read first by every cycle (`scripts/build-loop.sh` → one fresh process →
> `docs/LOCAL_BUILD_LOOP.md` "One cycle"). **Re-steer the loop by editing THIS file.** Keep it short — every
> cycle pays to read it. The pre-2026-09-28 text (70 KB: the June directed epic, the older queues, all
> history) is archived VERBATIM in `docs/loop/GOAL-archive-2026-09-28.md`.

## North-star

Make **IGCSE Malay Master** the best possible IGCSE **Malay (0546)** + **English (0500 / 0510)**
revision website — measured by how much it actually improves a student's exam outcome per minute spent.
**Keep improving until no axis below has a real, evidenced gap left.** "Best" = the axes below, **not
vibes**.

## 🎯 Current focus (2026-09-28)

**Work the 🐛 Bug-hunt queue top-down, one item per cycle.** Every item is a PROVEN defect — found by 4
adversarial reviewers + a live-UI chaos pass, with the reproduction quoted in
`docs/reviews/2026-09-28-bug-hunt/` (README = index; R1–R4 = the reports). Re-verify it still reproduces at
HEAD, turn the report's scenario into the red test, fix, then LOOK + CHAOS per `LOCAL_BUILD_LOOP.md`.
The 17 fixes already shipped 2026-09-28 (1 P0 · 13 P1 · 3 P2) are listed in `RESUME_HERE.md` → "🐛 2026-09-28 bug
hunt".

## 🐛 Bug-hunt queue — loop-safe (bounded, proven, no product judgment)

1. ✅ **SHIPPED 2026-09-28** ("Grader: correct complex sentences, "there is some", irregular pasts and
   abbreviations are no longer errors") — report `docs/overnight/20260928-0539-local-report.md`.
   **English grader flags CORRECT sentences** (R2 F3/F4/F5/F7 — costs a correct essay a full band).
   `writingErrors.js`: comma splice fires after a subordinate clause ("When I got home, I felt tired");
   "There is some news/information/advice" → wrong fix "there are"; "no clear verb" on found/began/thought/
   rang/understood/it's/I'm/practise; HIGH flags on e.g./a.m./email/URL/ellipsis. **Done:** every correct
   sentence quoted in the report → 0 findings; the report's genuine-splice control and every existing
   `writingErrors*.test.js` still green; `npx vite-node scripts/grader-accuracy-harness.mjs` Malay ≥ 15/17,
   English ≥ 10/13 (paste before/after). Each rule change names the 0510 mark-scheme line it serves.
2. ✅ **SHIPPED 2026-09-28** ("Malay grader: a story's \"akhirnya\" and a mid-sentence dll./dsb./… are no longer errors") —
   report `docs/overnight/20260928-0721-local-report.md`.
   **Malay grader: "akhirnya" mid-narrative flagged as a misplaced closing marker** (R2 F12; also `dll.`/
   `dsb.` capitalisation flags from F7, `writingErrorsMalay.js`). **Done:** the report's narrative + the
   dll./dsb. sentences → 0 findings; expository closing-marker flags unchanged. **Web-verify** the usage
   (PRPM / Kamus Dewan) and quote it in the commit.
3. ✅ **SHIPPED 2026-09-28** ("Dictation: a perfect answer typed on a phone now scores 100%") — report
   `docs/overnight/20260928-0800-local-report.md`.
   **Dictation scoring** (R2 F8/F9, `dictation.js` `normalize`): the em-dash counts as a word (6 of 59
   sentences can never score 100%) and iOS curly apostrophes (’) fail correct contractions. **Done:** the 6
   em-dash sentences typed perfectly → 100%; "Don’t"/"I’ve" typed with ’ → match.
4. ✅ **SHIPPED 2026-09-28** ("Type mode: a bare "to", "a" or "the" is no longer a correct meaning; a phone's ’ matches") —
   report `docs/overnight/20260928-0814-local-report.md`.
   **Type mode credits a bare function word** (R2 F10, `TypeMode.jsx`): "to" is accepted for 97 verbs
   ("to work"…), "in"/"for"/"a"/"the" too. **Done:** those alone → not credited; a real content word of a
   multi-word gloss still is (`typeModeGrading.test.js` stays green). Same cycle: F9's TypeMode half — "don’t"
   typed with iOS’s curly ’ for `jangan` ("don't") is marked wrong (`TypeMode.jsx:20` compares raw lowercase); fold
   ’→' into its compare (dictation's fix, item 3, is the model).
5. ✅ **SHIPPED 2026-09-28** ("Comprehension: AI questions land only on the passage they were made for") — report
   `docs/overnight/20260928-0826-local-report.md`.
   **Comprehension: AI questions land on the wrong passage** (census A15, `Comprehension.jsx:103-127`):
   go back and open passage B while A's questions generate → B shows A's questions. **Done:** a passage-
   identity check after the await; a test that swaps passages mid-generation.
6. ✅ **SHIPPED 2026-09-28** ("PDF reader: a double-tap on Record opens one microphone, and leaving always turns it off") —
   report `docs/overnight/20260928-0906-local-report.md`. Follow-up queued as #15.
   **PDF reader "Record" double-tap orphans a live mic stream** (R4 #6, `PDFReader.jsx:591-624`), plus the
   stream leaked if `new MediaRecorder` throws. **Done:** double-tap → exactly one stream, and it is stopped
   on Stop and on unmount (a fake-getUserMedia test).
7. ✅ **SHIPPED 2026-09-28** ("PDF reader: Translate page → Cancel → Translate again keeps the new run's progress and Cancel") —
   report `docs/overnight/20260928-0936-local-report.md`. Follow-ups queued as #16 and #17.
   **PDF "Translate page" cancel → re-translate race** (R4 #8, known since 07-03): run #1's late resolve
   hides run #2's progress and kills its Cancel. **Done:** the one-line `if (translateAbortRef.current !== ac)
   return` guard + a test.
8. ✅ **SHIPPED 2026-09-28** ("Restore: the app's own Export JSON and shared-deck files are refused, progress kept") —
   report `docs/overnight/20260928-0948-local-report.md`. Follow-up queued as #18.
   **Restore-from-backup accepts the app's OWN "Export JSON" / `.deck.json`** and wipes progress (R1 #7,
   `importBackup.js` `isValidBackup`). **Done:** both files are rejected with a message naming the right
   importer; a real backup still restores (`exportImportRoundTrip.test.js` green).
9. ✅ **SHIPPED 2026-09-28** ("Streak: a freeze used after a missed day is no longer handed straight back at 7/14/30") —
   report `docs/overnight/20260928-0958-local-report.md`.
   **Streak freeze is refunded at a milestone** — a streak parked on 7/14/30 can never break (R1 #8, census
   A12, `updateStreak`). **Done:** the report's 7-day → 13-day-gap → 6-day-gap sequence consumes the freeze
   once and then breaks; a milestone reached by a real study day still awards one.
10. ✅ **SHIPPED 2026-09-28** ("Phone: no keyboard hint on touch screens, long Import words wrap, every Grammar tab on screen") —
    report `docs/overnight/20260928-1017-local-report.md`.
    **UI polish from the chaos pass** (README U7–U9): the "Keys: Space=flip…" hint shows on phones
    (hide on `pointer: coarse`); a very long word overflows its chip on Import (wrap it); the Grammar tab row
    is cut at the right edge with no scroll cue. **Done:** `scripts/ui-smoke.mjs` ✓ and the 390 px screenshots
    show none of the three.
11. ✅ **SHIPPED 2026-09-28** ("Cikgu Maya: a signed-out learner is asked to sign in for AI, not promised free Gemini") —
    report `docs/overnight/20260928-1032-local-report.md`. At HEAD the pill actually read "AI Mode (Free via Gemini Flash)" +
    "(50)" (`isGeminiAvailable()` is always true). Follow-up queued as #19.
    **Cikgu Maya's "AI Mode — N calls remaining today"** is shown to signed-out learners, whose AI calls
    are refused (sibling of U6, fixed for Roleplay in `55b2043`). **Done:** signed out, the label says AI
    needs a free account; signed in, unchanged — mirror `roleplaySignedOutBanner.test.js`.

12. ✅ **SHIPPED 2026-09-28** ("Writing score: "a.m.", "e.g.", emails and "dll." no longer count as sentence ends") —
    report `docs/overnight/20260928-1056-local-report.md`. Known limit: a capitalised dialogue tag (`"Where?" Dad asked.`) counts 2.
    **Band scorer counts "a.m." / "e.g." / an email address as sentence ends** (found in the item-1 cycle, both
    languages): `writingGrader.js:137,229` split on every `[.!?]+`, so a 7-sentence, 72-word English essay showed
    "Sentences 14 · Avg Length 5" in the UI (seen at 390 px); a short avg length feeds Sentence Variety. Malay
    `dll.`/`dsb.`/`...` do the same (item-2 cycle, seen in the preview: a 6-sentence Malay story → "Sentences 9"). **Done:** that essay → 7 sentences; the grader harness before/after pasted for BOTH
    languages (Malay ≥ 15/17, English ≥ 10/13); reuse the sentence-end rule from `writingErrors.js` (`NON_FINAL_DOT`
    + the lazy splitter) instead of forking a third copy. Do it after item 2 (the Malay `dll.`/`dsb.` side).

13. ✅ **SHIPPED 2026-09-28** ("PDF reader: the 75-word Tips footer is gone; Group gets its own tour step") — report
    `docs/overnight/20260928-1106-local-report.md`.
    **Walls of text the "brain turned off" rule forbids** (Kheshav 2026-09-28: "I skim, I don't read"; the tours
    now follow it — ≤14 words, one idea). Still breaking it: the PDF reader's **"Tips:" footer** (≈60 words under
    the passage, `PDFReader.jsx` near "Clear PDF") and the density banner's second sentence. **Done:** the Tips
    footer is gone or ≤2 lines of ≤14 words each (the tour teaches the rest); a 390 px screenshot opened and
    viewed in dark + light; no feature removed (every tip is covered by a page-tour step — check
    `pageGuides.js` `/pdf-reader`).
14. ✅ **NOT REPRODUCED 2026-09-28** (item-15 cycle): the test passed alone, in two full `user-guide.spec.js` runs (13/13 each)
    and again after `rm -rf node_modules/.vite` (cold dep cache) — nothing to fix; reopen with a trace if it fails again.
    **e2e rot: `user-guide.spec.js` "works offline once the guide chunks are warm" fails locally on HEAD**
    (found 2026-09-28; also fails with the tour overhaul stashed, so it predates it). The Quick tour's popover
    never appears after `context.setOffline(true)`. Root-cause it (which import refetches offline?) — don't
    loosen the assertion.

15. ✅ **SHIPPED 2026-09-28** ("PDF reader: loading a document mid-recording turns the mic off") — report
    `docs/overnight/20260928-1120-local-report.md`. Follow-up queued as #21.
    **PDF reader: loading a document WHILE recording hides Stop, mic stays live** (R4 #6 "related trigger", left over from
    item 6): picking a sample/file/photo swaps out the empty state — the only place the Stop button lives — so the recorder
    keeps running with no visible control. **Done:** a test that starts recording, loads a sample, and sees every track
    stopped (extend `pdfReaderRecordStream.test.js`). Same cycle: a `new MediaRecorder` failure says "Microphone access was
    blocked" even though the mic WAS allowed — give it its own message.

16. ✅ **SHIPPED 2026-09-28** ("PDF reader: the translate bars' Cancel is a 44 px button, not a 10 px link") — report
    `docs/overnight/20260928-1138-local-report.md`. Follow-up queued as #22.
    **PDF reader: the translate progress bar's "Cancel" is a 10 px text link** (seen at 390 px in the item-7 cycle,
    `PDFReader.jsx` ~line 1821, `text-[10px]`, no min size) — far under the 44×44 px rule every other reader control meets.
    **Done:** it gets `min-h-[44px]` (+ padding) without pushing the bar onto two lines at 390 px; screenshot opened in dark
    + light; if `tests/e2e/a11y-tap-targets.spec.js` can reach it, extend it.
17. ✅ **SHIPPED 2026-09-28** ("PDF reader: the dense-page offer no longer starts a second translate run") — report
    `docs/overnight/20260928-1156-local-report.md`. Follow-up queued as #24.
    **PDF reader: the dense-page "help me" offer can start a SECOND translate run** (reviewer note, item-7 cycle):
    `acceptDenseHelp` (`PDFReader.jsx` ~line 1068) calls `translatePage()` without checking `translating`; the Translate
    button is disabled mid-run but the offer isn't. Run #1's controller is overwritten un-aborted, so it keeps spending
    rate-limited batches no Cancel can stop (UI stays correct since item 7). **Done:** a test — Translate page, then accept
    the offer mid-run → exactly one run's batches keep going (or run #1 is aborted first).

18. ✅ **SHIPPED 2026-09-28** ("Settings: a refused action shows a red toast, not the green \"done\" one") — report
    `docs/overnight/20260928-1205-local-report.md`. Follow-up queued as #25.
    **Settings shows every message on a GREEN "success" toast** — including the refusals ("That's a shared deck…",
    "Not a valid backup file", "Invalid file!", "No cards to share"), seen at 390 px in the item-8 cycle
    (`Settings.jsx` ~line 234, `background: var(--color-green)` for all `msg`). A red-flagged action reads as done.
    **Done:** `flash` takes a tone; refusals use the error colour with `--color-on-bright` text (≥4.5:1 in both
    themes); success toasts unchanged; 390 px screenshots opened in dark + light.
19. ✅ **SHIPPED 2026-09-28** ("Cikgu Maya: a signed-out learner's "not sure" reply points to sign-in, not to an AI that refuses them") —
    report `docs/overnight/20260928-1213-local-report.md`. Follow-up queued as #26.
    **Cikgu's Expert "not sure" reply sends learners to AI mode even where AI can't answer** (seen at 390 + 1280 px in the
    item-11 cycle): `cikguKnowledge.js:1423` always says "switch to ✨ AI mode … it's free" — a dead end signed out with no own
    key, and in AI mode its fallback reads "[AI unavailable — using Expert System]" then "switch to AI mode" (it's already on).
    `getExpertResponse` is pure and the AI-tier eval imports it — keep the KB answer text byte-identical; vary only the hedge's
    call-to-action from the caller. **Done:** signed out/no key → the hedge points to sign-in; inside the AI-unavailable fallback
    → no "switch to AI" line; signed-in Expert mode unchanged; a test per case.
20. ✅ **SHIPPED 2026-09-28** ("Tests: the guide's dock-zones test waits for its lazy chunk, not a tick count") — report
    `docs/overnight/20260928-1222-local-report.md`.
    **Gate flake: `GuideHud.test.js` "renders the lazy dock zones once a drag begins"** aborted the item-11 commit (full-suite
    run: `expected null to be truthy` at line 49), then 5/5 green alone; an earlier de-flake is `33ae387`. `waitForEl` polls a
    fixed 100 `setTimeout(0)` ticks for a LAZY import — tick-counting loses under load. **Done:** wait on the import itself
    (await the lazy module / a time-bounded `vi.waitFor`), never more ticks; 10 full-suite runs with 0 failures of it.
21. ✅ **SHIPPED 2026-09-28** ("PDF reader: a damaged or locked file is explained in plain English, not pdf.js jargon") — report
    `docs/overnight/20260928-1229-local-report.md`. Follow-up queued as #27.
    **PDF reader shows pdf.js's raw error on an empty reader** (seen at 390 px in the item-15 chaos pass): a damaged/non-PDF
    file picked on the empty state shows "Invalid PDF structure." (`PDFReader.jsx` ~line 341, `e?.message` fallback) — library
    jargon, no next step. The loaded-reader branch already says "Couldn’t open that file…". **Done:** the empty-state message is
    plain English with a next step (e.g. "Couldn’t open that file — it may be damaged or not a PDF. Try another file.");
    a test with a garbage `.pdf`; 390 px screenshot opened in dark + light.
22. ✅ **SHIPPED 2026-09-28** ("PDF reader: the OCR and transcription screens' Cancel and "Read with OCR" are 44 px tall") —
    report `docs/overnight/20260928-1239-local-report.md`. Follow-ups queued as #28 and #29.
    **PDF reader: three more Cancels look under 44 px** (seen by class in the item-16 cycle, NOT yet measured): the on-device
    transcription and OCR progress screens (`PDFReader.jsx` ~lines 1447 + 1475) and the scanned-PDF "Read with OCR" offer (~1504, with
    its sibling "Read with OCR") are `px-3 py-1.5 text-xs` ≈ 30 px tall. **Done:** measure them first (real Chromium, fake a slow OCR /
    a no-text PDF); any under 44×44 gets `min-h-[44px]`; extend `tests/e2e/a11y-tap-targets.spec.js` where the state is reachable.
23. ✅ **SHIPPED 2026-09-28** ("PDF reader: Stop → leave no longer downloads Whisper on a dead page") — report
    `docs/overnight/20260928-1249-local-report.md`.
    **PDF reader: Stop → leave the page can still start Whisper on the dead page** (found in the item-16 cycle while de-flaking
    `pdfReaderRecordStream.test.js`): `runAudioTranscribe` (`PDFReader.jsx` ~line 558) awaits two lazy imports, then creates the
    object URL, `asrAbortRef` and the transcriber — with no `unmountedRef` re-check. The unmount cleanup already ran, so nothing
    aborts or terminates them. The window is the first-ever chunk download (seconds on a slow phone). **Done:** a test that slows the
    engine import, presses Stop, unmounts, and sees `createTranscriber` never called (and no object URL left); re-check after each await.
24. ✅ **SHIPPED 2026-09-28** ("PDF reader: Cancel stops "Translate page" fetching; translating again skips words already fetched") —
    report `docs/overnight/20260928-1300-local-report.md`.
    **PDF reader: a cancelled translate keeps fetching, and "Translate page" again re-fetches the same words** (measured in the
    item-17 chaos pass, preview + stubbed gtx at 400 ms/word, dense-malay.pdf = 28 words): Cancel at 5 fetched → run #1's batch still
    fetched all 28, then the re-run fetched all 28 again (56 total). `translateBatch` (`translate.js:141`) isn't signal-aware and writes
    the cache only after the whole provider batch. Spends the rate-limited free gtx quota twice. **Done:** a test — Cancel mid-batch →
    no further word fetches (thread the signal into the provider loop) and a re-run fetches only the words run #1 never got.
25. ✅ **SHIPPED 2026-09-28** ("Settings: toasts are announced to screen readers; a failed \"Share My Deck\" copy says so") — report
    `docs/overnight/20260928-1310-local-report.md`. Follow-up queued as #30.
    **Settings toast: silent to screen readers, and a failed "Share My Deck" copy shows nothing** (hostile pass, item-18 cycle):
    the toast (`Settings.jsx` ~line 237) is a conditionally-mounted `div` with no live region (WCAG 4.1.3), and
    `navigator.clipboard.writeText(...).then(...)` (~line 191) has no `catch`: a denied/insecure clipboard gives no feedback at all.
    **Done:** the toast text lives in an always-mounted polite region (`FeedbackLive`'s pattern), a refusal is announced; a rejected
    `writeText` shows a red "Couldn't copy the link" toast; a test for each (extend `settingsToastTone.test.js`).

26. ✅ **SHIPPED 2026-09-28** ("Cikgu: switching AI → Expert mid-answer no longer puts a reply under the wrong question") — report
    `docs/overnight/20260928-1318-local-report.md`. Follow-up queued as #31.
    **Cikgu: flipping AI → Expert mid-request answers out of order** (chaos pass, item-19 cycle, preview + AI stubbed to fail after
    1.5 s): ask in AI mode, flip to Expert, ask again → Expert's instant reply lands first and the AI fallback for the FIRST question lands
    after it, under the wrong question (`CikguBot.jsx` `sendMessage` appends on resolve; the mode buttons stay enabled mid-request).
    **Done:** a test — AI request in flight, switch mode, ask → each reply sits under its own question (disable the mode toggle while
    loading, or insert the late reply after its question).

27. ✅ **SHIPPED 2026-09-29** ("Import: a damaged or locked PDF is explained in plain English, and the last file picked wins") — report
    `docs/overnight/20260929-0813-local-report.md`.
    **Import page shows pdf.js's raw error too** (found in the item-21 cycle): the PDF picker on `/import` does
    `setPdfError(e?.message || 'Failed to read PDF')` (`Import.jsx:88`), so a damaged file shows "Invalid PDF structure." and a
    0-byte one "The PDF file is empty, i.e. its size is zero bytes." **Done:** the same plain-English messages as the reader
    (damaged/not-a-PDF vs password-protected, `e.name === 'PasswordException'`); a test with each error shape; 390 px screenshot.

28. ✅ **SHIPPED 2026-09-29** ("PDF reader: Cancel works at once while the OCR or speech engine is still downloading") — report
    `docs/overnight/20260929-0841-local-report.md`. Follow-up queued as #32.
    **PDF reader: OCR "Cancel" does nothing until the OCR engine has downloaded** (measured in the item-22 chaos pass, preview, every
    `/ocr/**` asset delayed 6 s): a photo picked → Cancel tapped at 0.8 s → the progress screen stayed **18 s** (3 asset fetches).
    `runOcr` in `PDFReader.jsx` (~line 505) awaits `createOcrRecognizer` with no abort race — `ctrl.signal` is first read after it.
    On a slow phone's first OCR, Cancel looks dead. The scanned-PDF path's Cancel works (36 ms — it aborts during rasterising).
    **Done:** Cancel leaves the screen at once mid-download (race the engine load against the signal; terminate the worker if it
    lands after), a test with a never-resolving `createOcrRecognizer`; check the transcription screen for the same (sibling of #23).
29. ✅ **SHIPPED 2026-09-29** ("PDF reader: the dense-page offer, the Sharper-read dialog and its error banner are 44 px to tap") —
    report `docs/overnight/20260929-0850-local-report.md`. Follow-up queued as #33.
    **PDF reader: the dense-page offer and the Sharper-read consent modal buttons look under 44 px** (seen by class in the item-22
    cycle, NOT yet measured): `PDFReader.jsx` ~2080 / ~2088 ("Show English as I read" / "No, I'll try first") and ~2359 / ~2364
    ("Not now" / "Continue") are `px-3 py-1.5 text-xs` — the same class that measured 30 px tall on the OCR screen. **Done:** measure
    (dense-malay.pdf reaches the offer; the modal needs a vision BYOK key set); any under 44 gets `min-h-[44px]`; extend
    `a11y-tap-targets.spec.js`.
30. ✅ **SHIPPED 2026-09-29** ("Settings: one card reads \"1 card\" on Export CSV / JSON and the Anki toast") — report
    `docs/overnight/20260929-0857-local-report.md`. Follow-up queued as #34.
    **Settings: "Export CSV (1 cards)" / "Export JSON (1 cards)"** (seen at 390 px in the item-25 cycle, `Settings.jsx:762,764`
    `(${cards.length} cards)`). **Done:** 1 card reads "(1 card)", 0 and 2+ unchanged; a test; 390 px screenshot.
31. ✅ **SHIPPED 2026-09-29** ("Cikgu: a question left by a reload or by leaving mid-answer now says \"ask it again\"; AI stops
    waiting after 25 s") — report `docs/overnight/20260929-0910-local-report.md`.
    **Cikgu: a reload (or leaving the page) mid-AI-answer leaves the question unanswered forever** (item-26 chaos pass, preview, AI
    held 3 s): ask in AI mode → reload → history ends `…,user` and no reply ever comes; the next question then sits under it
    (`CikguBot.jsx` `sendMessage` appends the reply only on resolve; nothing survives the reload). Pre-existing, not from #26.
    Same root, found by the #26 reviewer: ask in AI mode → go to Dashboard → back to /cikgu (mode resets to Expert, switch unlocked,
    since both loading flags are component state) → ask → Expert answers, then the first question's late AI reply lands UNDER it.
    **Done:** a test — AI in flight, unmount → on the next mount the orphan question gets a visible "not answered — ask again" reply
    (or the request is finished and saved); no history ever shows two questions in a row. Same cycle: the OpenRouter and Supabase
    routes pass no timeout (Gemini has 25 s), so since #26 locks the mode switch while AI thinks, a hung own-key request keeps it
    locked until the server gives up — give them the same 25 s bound.
32. ✅ **SHIPPED 2026-09-29** ("PDF reader: Cancel → pick again during a first engine download reuses that download") — report
    `docs/overnight/20260929-0922-local-report.md`.
    **PDF reader: Cancel → pick again during an engine's FIRST download starts a second parallel download** (reviewer, item-28
    cycle): since #28 Cancel works mid-download, so a retry calls `createOcrRecognizer` / `createTranscriber` again while the
    first load is still fetching — both module caches (`ocrEngine.js` `workerCache`, `transcribeEngine.js` `pipeCache`) hold only
    FINISHED engines, so the retry fetches everything again in parallel (Whisper ≈76 MB on a phone), and the cancelled one is then
    freed on landing. **Done:** the caches hold the in-flight promise so a retry reuses the running download; a cancelled run's late
    engine is NOT terminated while a newer run is waiting on the same cache entry (today's `onLate` in `PDFReader.jsx` frees it);
    a test: pick → Cancel → pick → exactly one `createWorker` / `pipeline` call, and the second run completes.
33. ✅ **SHIPPED 2026-09-29** ("PDF reader: the Select bucket's Add, group, ungroup and remove buttons are 44 px to tap") — report
    `docs/overnight/20260929-0932-local-report.md`.
    **PDF reader: the Select-mode selection bucket's controls look under 44 px** (seen by class in the item-29 cycle, NOT yet
    measured): `PDFReader.jsx` ~2052 "Add N" is `px-3 py-1.5 text-xs` (the class that measured 28–30 px tall), and each chip's
    ungroup/remove button (~2068+) wraps a 10 px icon with no padding. **Done:** measure (load a PDF → Select → tap 2 words);
    any under 44 gets a ≥44 hit box without making the chip row wrap badly at 390 px; extend `a11y-tap-targets.spec.js` (sweep
    the bucket); 390 px screenshot opened in dark + light.

34. ✅ **SHIPPED 2026-09-29** ("Import and study plan: one card reads \"1 card\", not \"1 cards\"") — report
    `docs/overnight/20260929-1003-local-report.md`. Same-file siblings "Add 1 cards to…" + "1 words found" fixed too; follow-up queued as #36.
    **Two more "1 cards" labels** (found by sweeping the item-30 fix's pattern): `Import.jsx:389` "Undo — remove
    {lastAdded.cards.length} cards" (adding ONE word → "Undo — remove 1 cards") and `useStore.js:2003` the study plan's
    "`${weakCards.length}` cards need attention" (1 weak card → "1 cards need attention" — verb too). **Done:** 1 → "1 card" /
    "1 card needs attention", 0 and 2+ unchanged; a test each (mirror `settingsExportCount.test.js`).

35. ✅ **SHIPPED 2026-09-29** ("Tests: the Cikgu AI-timeout test no longer fails when run alone") — report
    `docs/overnight/20260929-0944-local-report.md`.
    **Gate flake: `cikguAiTimeout.test.js` fails every time run ALONE and ~1 full-suite run in 2** (found in the item-33 cycle,
    reproduced at clean HEAD `6db7822`): `npx vitest run src/pages/__tests__/cikguAiTimeout.test.js` → 2/2 failed, 5 runs of 5
    (`:90` `expected +0 to be 1` — Supabase never called after `advance(25_000)`; `:101` `expected 2 to be 1`); full `npm run
    test:run` failed on it 2 of 4 runs — the pre-commit gate aborts commits at random. Order-dependent: something another file
    warms (a lazy import / module cache) is what lets the 25 s timer chain run. **Take BEFORE #34.** **Done:** root cause named;
    passes alone 10/10 and in 5 full-suite runs; never by raising timeouts or advancing more.

36. ✅ **SHIPPED 2026-09-29** ("Dashboard, Settings and the coach line: a first study day reads \"1 day\", not \"1 days\"") — report
    `docs/overnight/20260929-0957-local-report.md`. Sweep found no further sites.
    **"1 days" / "1 cards" on the Dashboard, Settings and the coach line** (found by the item-34 sweep, by READING — not yet
    rendered): `Dashboard.jsx:483` streak tile `${streak} days` (a learner's FIRST study day reads "1 days"), `Settings.jsx:272`
    "🔥 1 days", `Settings.jsx:620` "1 days until exam", `Settings.jsx:158` "Restored 1 cards!", `feedback.js:64` "Final stretch —
    1 days to exam". **Done:** 1 → singular at each, 0 and 2+ unchanged; a test each (mirror `settingsExportCount.test.js` /
    `studyPlanWeakCount.test.js`); 390 px screenshot of the Dashboard streak tile on day 1, dark + light.

37. ✅ **SHIPPED 2026-09-29** ("Roleplay: out of AI calls says \"back tomorrow\", not \"add your own key\"") — report
    `docs/overnight/20260929-1027-local-report.md`. Routing Roleplay through the learner's own key stays a 🔶 feature (streaming + server prompts).
    **Roleplay tells an out-of-calls learner to "Add your own free key" — a key can't unlock Roleplay** (found in the older-#8
    cycle, by reading): `Roleplay.jsx:151` shows `AddKeyNudge` ("Out of AI for today. Add your own free key →") when signed in with
    0 calls left, but Roleplay's AI is `callAI` (`src/lib/ai.js:133`) → the ai-proxy only, with the shared daily cap — it never reads
    the learner's OpenRouter key, and `aiAvailable` (`Roleplay.jsx:77`) ignores it. The learner adds a key and still gets no AI.
    **Re-verify in the preview first** (signed in via the store, `igcse-ai-daily` count 50, then add a key). **Done:** the promise is
    true or gone: either drop the nudge on Roleplay (say AI is back tomorrow) or route Roleplay through the BYOK seam — the second is a
    feature, so 🔶 unless it is a one-line instruct.js call. `addkey-smoke.spec.js` pins the Roleplay nudge today — update it with the fix.
38. ✅ **SHIPPED 2026-09-29** ("PDF reader tour: a learner touring in Translate mode now hears that Group exists") — report
    `docs/overnight/20260929-1035-local-report.md`. Follow-up queued as #39.
    **The PDF reader's "Group a phrase" tour step only shows when the tour starts in Select mode** (found in the older-#8 cycle):
    the Group toggle renders only in Select mode (`PDFReader.jsx:1708`) and the tour skips steps whose control isn't on screen, so a
    learner touring in the default Translate mode never meets it — and item 13 moved the Group tip OUT of the footer into that step.
    **Done:** a learner touring in Translate mode learns Group exists (e.g. the `pdf-mode` step's body names it, ≤14 words, one idea —
    `pageGuides.js`), Select-mode tours unchanged; `guide-page-tours.spec.js` green.
39. ✅ **NOT REPRODUCED 2026-09-29** (item-40 cycle): 4 scripted 390×844 walks (Translate, Select, dark, light) put the "Translate or
    Select" box BELOW its toggle every time (box y 322–567 / 353–598, toggle y 198–244); screenshot opened. The quoted numbers
    (box y 10–255 over y 198–244) are the PREVIOUS step, "Tap a word", whose lit control is the whole 582 px reading pane — no side
    has room, so its box must cover the pane's top lines (geometry, not a placement bug).
    **Phone: the PDF reader tour's "Translate or Select" box covers the very control it lights up** (seen in the item-38 cycle,
    390×844, sample loaded, pre-existing — identical on an untouched `1faca73` build): the lit `pdf-mode` toggle sits at y 198–244
    but the popover is drawn at y 10–255, on top of it, despite `side: 'bottom'`; the next step ("Translate page", same row
    height) correctly lands below (y 241). Root-cause in `guideController.js` placement (driver flip/clamp or the dock) — don't
    special-case the step. **Done:** at 390 px every `/pdf-reader` step's popover and lit control don't overlap (a Playwright
    check over the whole walk, Translate + Select modes), desktop unchanged; screenshot opened dark + light.
40. ✅ **SHIPPED 2026-09-29** ("Tours: starting a page tour puts away the "New here? Take the tour" card") — report
    `docs/overnight/20260929-1048-local-report.md`. Follow-up queued as #41.
    **The first-run "New here? Take the tour" card floats over a running page tour** (seen in the item-39 LOOK, 390 px): a new
    learner who lands on a page and taps ▶ Tour this page gets the card on top of the tour, undimmed — a second, competing "Take the
    tour". `useGuide.start()` marks the offer seen; `startPage()` didn't. **Done:** ▶ marks it seen; the card goes and stays gone
    over a reload; "Take the tour" / "Maybe later" unchanged.
41. ✅ **SHIPPED 2026-09-29** ("Tour offer: the \"New here?\" card's ✕, \"Take the tour\" and \"Maybe later\" are 44 px to tap") — report
    `docs/overnight/20260929-1057-local-report.md`.
    **The "New here?" card's controls are under 44 px** (measured in the item-40 cycle, preview, 390×844, `GuideOffer.jsx`): ✕ Dismiss
    28×28, "Take the tour" 221×40, "Maybe later" 96×40 (`minHeight: 40`, `w-7 h-7`). It is a `role="dialog"` — the ≥44×44 rule
    applies. **Done:** all three ≥44 tall (✕ 44×44) without the card growing awkwardly at 390 px; a test (unit or extend
    `a11y-tap-targets.spec.js` — the card needs a fresh store + 2 s); 390 px screenshot opened in dark + light.
42. ✅ **SHIPPED 2026-09-29** ("Writing: one mouse click on Analyze grades the essay, even while typing") — report
    `docs/overnight/20260929-1137-local-report.md`. Touch and keyboard were never affected (measured). Follow-up queued as #43.
    **Writing: the first click on "Analyze" is lost while the essay box has focus** (measured in the older-#13 cycle, preview,
    390×844, Playwright `click()` with the textarea focused): the button sits at y 626, the mousedown blurs the textarea, `isDrafting`
    flips off (`Writing.jsx` ~line 119) → theater mode ends and `ExemplarPanel` mounts above it → the button jumps to y 788 before
    mouseup, so no click fires, nothing is graded, and the learner must press again. Blurring first → graded. Re-check with a real
    phone tap (`hasTouch`) before fixing — touch may target differently. **Done:** a Playwright check that types, then presses Analyze
    once with the box focused → graded; no layout jump between press and release at 390 + 1280 px; theater mode still hides chrome
    while typing.
43. ✅ **SHIPPED 2026-09-29** ("Writing: after Analyze the Band result is on screen, even on a phone") — report
    `docs/overnight/20260929-1157-local-report.md`. Follow-up queued as #44.
    **Writing: after Analyze the Band result is off-screen on a phone** (measured in the item-42 cycle, preview, 390×844, English
    formal letter, signed out): the "Band N/6" panel lands at y 1085 with scrollY 0 — the learner sees the button, an orange "AI
    grade unavailable" note, and no grade unless they think to scroll (ADD-first: one clear next action). Pre-existing. **Done:**
    after a grade, "Band N/6" is in view at 390 × 844 (scroll it into view, respecting `prefers-reduced-motion`) without stealing
    focus from a keyboard user; desktop unchanged if it already fits; a Playwright check; 390 px screenshot dark + light.
44. ✅ **SHIPPED 2026-09-29** ("Writing: a keyboard Analyze keeps focus on the button while the AI grades") — report
    `docs/overnight/20260929-1212-local-report.md`. Follow-up queued as #45.
    **Writing: a keyboard Analyze drops focus to the page when the AI grade runs** (measured in the item-43 cycle, preview + dev,
    English, `/api/gemini` aborted): Tab to "Analyze Essay" → Enter → `document.activeElement` is BODY (same at `7e1b75e`, before
    #43). The button gets `disabled={isAIGrading}` (`Writing.jsx`), and Chromium drops focus off a disabled control, so the next Tab
    restarts at the top of the page (WCAG 2.4.3). Malay free-write (no AI run) keeps focus. **Done:** Enter → the AI run → focus is still
    on the button (e.g. `aria-disabled` + a no-op click while grading, keeping the visible "Analyzing…" state); a double press still
    grades once; extend `writing-band-in-view.spec.js` (its keyboard test runs Malay today for this reason).
45. ✅ **SHIPPED 2026-09-29** ("Writing: a second Enter or Space on the busy Analyze button keeps the Band in view") — report
    `docs/overnight/20260929-1224-local-report.md`. Follow-up queued as #46.
    **Writing: a second Enter on the busy Analyze button ends the keep-Band-in-view** (measured in the item-44 cycle, dev, 390×844,
    English, `/api/gemini` held 800 ms then aborted): Enter → Enter again mid-run → after the "AI grade unavailable" note mounts
    above it the Band panel is no longer fully above the nav (`expectBandInView` fails). The #43 effect stops on ANY `keydown`; the
    same at `7f23713` (there the keydown hit `<body>`). Low impact (the grade is one scroll away). **Done:** an Enter/Space on the busy
    button doesn't end it, while arrow keys / PageDown / Tab still do (never fight a keyboard scroll); an e2e for each.
46. ✅ **SHIPPED 2026-09-29** ("Writing: the first-visit \"New here?\" card no longer covers the Band on a phone") — report
    `docs/overnight/20260929-1242-local-report.md`. Known limit: Analyze within 2 s of landing (the card mounts later). Follow-up queued as #47.
    **Writing: the first-visit "New here? Take the tour" card covers the Band result on a phone** (measured in the item-45 chaos
    pass, preview, 390×844, fresh store, English, AI aborted): after Analyze the Band panel is scrolled to y 650–748, and the floating
    offer card (`GuideOffer.jsx`, "New here?" text at y 621) sits on top of it — the #43 in-view promise is hidden until the learner
    dismisses the card; "Maybe later" → "Band 2/6" fully visible (screenshot). Pre-existing, first visit only. **Done:** a fresh-store
    learner who Analyzes at 390 × 844 sees "Band N/6" uncovered (e.g. the keep-in-view clears the card's height, or the card yields
    while a grade is shown — pick the smaller change, no new offer logic); "Take the tour" / "Maybe later" unchanged; a Playwright check;
    390 px screenshot dark + light.
47. ✅ **SHIPPED 2026-09-29** ("Tests: the Writing \"mid-run ends the keep-in-view\" e2e no longer flakes") — report
    `docs/overnight/20260929-1255-local-report.md`. Root cause: a test race, not a pull-back (0 keep-in-view scrolls after the key in 24 timelines).
    **e2e flake: `writing-band-in-view.spec.js` "keyboard: ArrowUp / PageUp / Shift+Tab mid-run ends the keep-in-view"** (measured in
    the item-46 cycle): at clean HEAD `e748599` 4 of 24 runs failed with `scrollY` 2–6 instead of 0 (same rate with the #46 fix, 3/18).
    A timeline (scroll events + `scrollIntoView` calls) showed the keep-in-view's own smooth scroll still running when the test calls
    `window.scrollTo(0, 0)` (`html { scroll-behavior: smooth }`); swapping in an instant scrollTo made it WORSE (11/44) — the in-flight
    animation outlives it. Not in the pre-commit gate (e2e). **Done:** root cause named (test race vs a real pull-back after the key);
    the test waits for the page's scroll to settle before simulating the learner, never a longer sleep; 24/24 green with `--repeat-each 8`.

48. ✅ **SHIPPED 2026-09-29** ("Settings: every checkbox and the exam date are named for screen readers") — report
    `docs/overnight/20260929-1420-local-report.md`. Found by the first axe sweep (older #9a, scratch script, preview, 390 px, all 23
    routes, dark + light, serious/critical only); its other finds are #49–#53.
    **Settings: 4 checkboxes + the exam-date picker had no accessible name** (axe `label`, critical, both themes): a screen reader said
    "checkbox, checked" with no hint what it controls. **Done:** each named by its visible text (`settingsControlNames.test.js`); axe
    `label` on /settings 5 → 0.
49. ✅ **SHIPPED 2026-09-29** ("Cikgu: the Send button is named for screen readers") — report
    `docs/overnight/20260929-1427-local-report.md`.
    **Cikgu: the Send button has no name** (axe `button-name`, critical, both themes, measured 2026-09-29): `CikguBot.jsx` ~line 727
    is an icon-only `<Send>` button — a screen reader says "button". **Done:** `aria-label` (e.g. "Send"); a test; axe `button-name` on
    /cikgu → 0.
50. ✅ **SHIPPED 2026-10-01** (cloud worker, branch `claude/bug-50-settings-hint`: "Settings: the cloud-cache hint is readable — only the
    inactive toggle dims") — report `docs/overnight/20261001-0831-local-report.md`.
    **Settings: the disabled cloud-cache row's hint is unreadable** (axe `color-contrast`, serious, measured 2026-09-29 after #48):
    "Sign in to sync cached translations" (`Settings.jsx` ~line 1410, 10 px `--color-dim` inside a row at `opacity: 0.6`) is 2.55:1 in
    light, 3.37:1 in dark (needs 4.5:1). The toggle's own label is exempt (inactive control), but this sentence is HOW to enable it.
    **Done:** the hint ≥4.5:1 in both themes (e.g. dim only the label + checkbox, not the hint); axe clean; 390 px screenshot dark + light.
51. ✅ **SHIPPED 2026-10-01** ("Dashboard (light): the Smart Session \"Start →\" chip reads at 5.9:1, not 4.07:1") — report
    `docs/overnight/20261001-0838-local-report.md` (cloud branch `claude/bug-51-dashboard-chip`; LOOK/CHAOS pending: driver).
    **Dashboard (light): the Smart Session "Start →" chip is 4.07:1** (axe `color-contrast`, serious, light only, measured 2026-09-29):
    `Dashboard.jsx` ~line 833, `--color-blue` text on a 12% blue tint, 12 px bold (needs 4.5:1). **Done:** ≥4.5:1 in light, dark
    unchanged; no rgba literal (`designTells.test.js`); screenshot dark + light. Check the palette's CVD test still passes.
52. **Import: opening /import downloads and runs all of pdf.js (~330 KB raw) up front** (measured 2026-09-29: the `Import-*.js` chunk
    starts with a static `import … from "./pdfOpenError-*.js"`, the 330 KB pdf chunk; since 2026-05-03 `Import.jsx:7` imports
    `extractPdfText` statically), even for a learner who only pastes text — PDF is one optional picker. **Done:** `lib/pdf` is
    dynamic-imported in the PDF handler (the reader's pattern), the Import chunk no longer statically imports the pdf chunk (measure
    before/after), `vi.mock('../lib/pdf')` tests still green, a PDF still imports in the preview; `bundle-budget.md` updated.
53. **Land the axe sweep as a gate (older #9a)** — after #49–#51, so it starts green: a Playwright spec over all 21 routes (390 px,
    dark + light, `bypassCSP` for the injected script, `serviceWorkers: 'block'`) asserting 0 serious/critical. `axe-core` 4.13 is
    already in node_modules (transitive via jsx-a11y) — add it as a direct devDependency instead of relying on that. Prove it goes
    RED on a planted unnamed button before trusting its green.

**From the 2026-09-29 loop review** (`docs/reviews/2026-09-29-loop-review.md`, P3s — each proven by reading the code path; re-verify
at HEAD). **Chaos plants:** a fix you ship with a unit test gets a plant in `tests/chaos/` (bump `expectedTotal`); pre-commit
checks the anchors, `npm run chaos` proves them red.
54. **Produce near-miss wording** (P3-2): `baru`/`baharu` and `bila`/`bilakah` are the SAME word (spelling variant / -kah) but get
    "means “new” too, but this card wants another word"; `minum`/`minuman` (verb/noun) share the gloss "drink". **Done:** a spelling
    variant or a -kah form of the card's word is accepted as correct (never a near miss); minum/minuman glosses disambiguated
    ("to drink" / "a drink") — content-truth test; `produceSameGloss.test.js` green.
55. ✅ **SHIPPED 2026-09-30 (cloud worker → driver re-gated + promoted `d4665bd`, live smoke ✓)** ("PDF open: a stale tab or app bug says reload, not \"damaged file\"") — report
    `docs/overnight/20260930-1528-local-report.md`.
    **PDF open errors blame the file for everything** (P3-4): `lib/pdfOpenError.js` maps ANY exception to "damaged or not a PDF —
    try another file" — a tab left open across a deploy (hashed `pdf.worker` 404) or an app bug sends the learner the wrong way.
    **Done:** only pdf.js's `InvalidPDFException`/`MissingPDFException` say "damaged"; anything else says "Couldn't open the reader —
    reload the page"; tests for both; update the chaos plant anchor if the line moves.
56. **A page tour permanently hides the app-tour offer** (P3-5): `useGuide.js` `markGuideSeen('quick')` on ANY ▶ page tour.
    **Done:** the "New here?" card is hidden only WHILE a page tour runs; a learner who toured one page still gets the offer later;
    `guideOfferPageTour.test.js` extended (the chaos plant on this line must still go red).
57. **Reader lost its zoom / hyphen / Volume tips** (P3-6, 2d21ecf deleted the Tips footer): add ONE page-tour step (≤14 words)
    for Layout's pinch/double-tap zoom — not a wall of text. **Done:** `guide-page-tours.spec.js` coverage stays green.
58. **Chaos plants on the app's CORE rules** (the half of the 2026-09-29 plant plan not done yet — today's 51 plants guard the
    loop's recent fixes, none guard the invariants): one plant each where a silent break damages learners — sync merge only ADDS
    (never removes) · English stays hidden until the tap (reveal gate) · dictionary values stay plain strings · FSRS keeps
    `learning_steps` (the P0 of 2026-09-28) · a `STORE_VERSION` migration keeps existing data. Each names the existing test that
    must go red; a plant that stays green = write that test first. **Done:** `npm run chaos` all red, `expectedTotal` bumped.

**Content + foundation items for the $250 cloud lanes** (Kheshav, 2026-09-30 — `docs/sessions/2026-09-30-cloud-credit-driver.md`;
the local loop may take them too). Malay rule for all three: a confidently wrong line is the worst defect this app can ship — check
every Malay word against DBP PRPM (`https://prpm.dbp.gov.my/cari1?keyword=<word>`, look up, never copy text) and put anything you
can't verify in the report as "unverified", never in the data.
59. **121 dictionary words have no example sentence** (measured 2026-09-30: `sangat`, `satu`, `saya`, `sebab`, `sebelum`, …;
    `getExample(word)` returns null). Write ORIGINAL sentences in `src/data/dictionaryExamples.js`: Malaysian standard Malay,
    IGCSE level, ≤12 words, the headword used in the sense of its gloss. **25 words per cycle** (5 cycles, alphabetical).
    **Done per cycle:** a test pins the missing count dropping by the batch (121 → 96 → …) · `dictionaryExamples.test.js` +
    content-lint green · a fresh reviewer read every new sentence for Malay correctness (quote any line it doubts).
60. **Audit the rest of the Malay content** the 2026-09-29 audit didn't cover — ONE file per cycle: `src/data/grammar.js` ·
    `cikguKnowledge.js` imbuhan entries · its other entries · `scenarios.js` · `comprehensionPassages.js` · `listeningPassages.js` ·
    `readingSamples.js`. Same method as `docs/research/2026-09-29-malay-content-audit.md`. **Done per cycle:** each verified fix
    pinned like `src/data/__tests__/contentAudit20260929.test.js` (a new file per audit date is fine) · the report lists entries
    read, fixes, unverified doubts · scenario ids never renamed (saved progress keys on them).
61. **Word → family lookup + what each affix does** (Phase 2 foundation, no UI): a pure `src/lib/wordFamilyIndex.js` —
    `familyOf(word)` → `{ root, rootMeaning, form, siblings }` for a DERIVED form, `null` for a root word or an unknown word
    (Kheshav: the family chip must not appear on a root word) — plus `AFFIX_MEANINGS`: one short learner line for each of the
    22 `type` labels in `data/wordFamilies.js` (measured 2026-09-30), consistent with `cikguKnowledge.js`'s imbuhan answers and
    DBP. **Done:** tests — every type used has a meaning; `familyOf` finds every form of all 41 roots, returns null for each root;
    a test fails if a new type is added without a meaning.
62. **PDF reader (390 px): the open-error box is covered** (measured 2026-09-30 by the driver's LOOK on #55): on a first visit
    the "New here?" tour card, and after it the "Ready for offline study" toast, sit on top of the red error box at the bottom
    of the page (`docs/sessions/2026-09-30-cloud-credit-driver.md` pilot). **Done:** at 390 px with either one showing, the whole
    error line is readable (a Playwright check or a `ui-smoke` screenshot of the error state); desktop unchanged.
63. **Learners see developer setup text** (seen live at 390 px by the driver's LOOK on #50, 2026-10-01): Settings → Translation & AI
    shows "Add VITE_DEEPL_KEY to enable", "Add VITE_GOOGLE_TRANSLATE_KEY to enable" and "Add VITE_OPENROUTER_KEY" (`Settings.jsx`
    ~1304–1311, ~1416) — a learner can't act on an env-var name. Same family: `WritingTutor.jsx` ~98/105/192 and `Speaking.jsx` ~794
    ("Add VITE_… to .env.local"). **Done:** no learner-visible string in `src/` names `VITE_` or `.env.local` (comments + tests
    exempt) — a test renders Settings signed out with no keys and finds neither; an unavailable provider says what a learner CAN do
    (OpenRouter: "Paste your own key below" — the BYOK field is right under it; DeepL/Google: "Not available on this site");
    390 px screenshot dark + light.

## 🔶 Attended — NOT for the loop (a Kheshav decision, prod data/DB, or high-risk code)

- **A1 · Sign-in & sync decision logic — ONE epic, full 4-reviewer gauntlet, cross-device tests.** R1 #2 (a
  new device that seeds a starter deck before signing in overwrites the account's streak/exam date/grammar
  SRS/journal in the cloud), R1 #3 (census A16: one signed-in device loses Cikgu chat/roleplay/journal/
  reflections on every reload), **R3 F1 (shared device: after A signs out, A's cards, chat and private notes
  are uploaded into B's account; A's BYOK keys stay pre-filled)**, R1 #5 (retry backoff ignored → a queued
  delete dead-letters), R1 #6 (Retry resurrects a deleted card), R1 #10 (localStorage quota + the duplicate
  `igcse-malay-backup` copy). All live in `AuthGuard.jsx` + the hydrate/flush paths.
  **RULING (Kheshav, 2026-09-28):** *"Fresh start for shared devices; people can continue from different
  devices if they log in and have their data saved."* So:
  1. **Same account, any device → continue.** Signing in restores that account's saved progress (already
     the invariant: sign-in merge adds, never removes). Nothing in A1 may weaken it.
  2. **Different person on a shared device → fresh start, never mixed.** Sign-out returns the device to fresh
     (flush first; if something can't upload, say so and let them choose), clearing local learner data, the
     `igcse-malay-backup` copy and the BYOK key slots. A sign-in by a DIFFERENT account over another
     account's local data never merges or uploads it — offer "Save a copy", then start from the new account.
  3. *(Claude's call, flagged — veto it here)* **Guest progress → joins the first account signed in on that
     device**: the app promises "sign in to save your progress". Cost: on a shared computer a stranger's
     never-signed-in progress would merge into the next account; accepted — it has no owner to protect.
  Kickoff: `RESUME_HERE.md` top block.
- **A2 · Supabase security** (prod DB changes): R3 F2 — anyone can insert unlimited `telemetry_events` rows
  with no account (fills the free-tier DB → read-only for every learner; fix = `TO authenticated` + uid check
  + a daily cap) · R3 F3 — `scenarioContext`/`turnInfo` still write the ai-proxy SYSTEM prompt · R3 F5 —
  `translations.created_by` world-readable + blocks account deletion · R3 F6 — `user_state` has no CREATE/RLS
  in the committed SQL, and `phase-b-cloud-sync.sql` would revert the 2026-06-12 hardening if re-run.
- **A3 · Check Supabase → API → Max Rows** (R1 #9): if 1000, a learner with >1000 cards gets only 1000 back
  on a new device — paginate `fetchCloudCards` with `.range()`.
- **A4 · PWA auto-update reloads an open tab** (R4 #7): an OCR'd page or a Speaking answer is lost within the
  hour after any deploy. Trade-off with archive item 12 (users stuck on a stale build) — product call.
- **A6 · Connected app epic — APPROVED 2026-09-29 (all 8 combos).** Phases 1–2 are built by the $250 cloud CODE lane
  (2026-09-30), each held for Kheshav's look at its Vercel preview before `main`; Phase 3 (store/sync) stays local + gauntlet. Hubs + page-name header with ← →,
  search-everything (replaces the Expert chat), one word panel everywhere, flashcard family chip, editable meanings + 30-day
  restore (store/sync → gauntlet), Reader absorbs Import, AI flash-lite eval, Bergamot bake-off, real-past-papers links.
  Plan + verdicts + red-team: `docs/plans/2026-09-29-connected-app.md`. Product/UI judgment → attended, not the loop.
- **A7 · Dependabot PRs (#9–#17, opened 2026-09-29)** — 3 are red in CI (the 20-update minor/patch group, vite 8.3.1,
  sharp + transformers). Each merge is a prod deploy; triage attended. The 3 GitHub Actions bumps (checkout / setup-node /
  upload-artifact v7) are green and CI-only.
- **A5 · The older attended lists, unchanged** — in the archive, by heading: "📏 Writing-grader follow-ups"
  (the current kickoff is its item 2), "🛡️ Launch-gate follow-ups" (7c–i, 5a–e), "🌟 VISION EPICS", "🆕
  free-AI-tier expansion", For-You Phase 2, multimodal video, BYOK quality-translate, cross-browser e2e.

## 📋 Older open loop-safe items — take only after the 🐛 queue, and re-verify each at HEAD first

Full text in the archive under "✅ Loop-safe queue"; read `docs/reviews/2026-08-06-defect-census.md` Batch A
before any of them (half the entries were already fixed when it was taken). Open there: ~~`0-quater`~~ **✅ FIXED 2026-09-29** ("Tests: the authGuard sign-in test no longer fails at random in the commit gate",
report `docs/overnight/20260929-1107-local-report.md` — root cause: test 1's un-awaited AuthGuard cloud pull leaked into test 2's
fresh module registry and built REAL supabase clients; stressed 3/48 fails → 0/144). Old notes kept: (the authGuard sign-in test that fails ~1 run in 3 — do NOT raise timeouts; make the chain awaitable. **2026-09-29: 0 failures in 5
full-suite runs at `1f8619e`**, instrumented: sign-in #2 settled in 1–3 ms every time, so it is not slowness — the chain must die
outright when it fails; next time it trips, keep the gate log. **TRIPPED 2026-09-29 in the item-38 pre-commit gate, AGAIN in the item-41 gate** (both reruns green; item-41 log not kept — piped to grep): PLAUSIBLE-2 waited the full 15 s with state neither restored nor wiped, right after `[cloud sync] Not authenticated` — the chain died, not slow; log kept locally at `docs/loop/logs/authguard-flake-20260929-1035.log` (gitignored)) ·
~~Dependabot~~ **✅ SHIPPED 2026-09-29** ("Dependabot: weekly dependency PRs gated by CI; GitHub security alerts on", report
`docs/overnight/20260929-1304-local-report.md`) · ~~Produce-mode gloss collisions (archive 0-bis, last bullet)~~ **✅ SHIPPED 2026-09-29**
("Produce: a word that means the same, like kamu for awak, is a near miss, not a wrong answer", report
`docs/overnight/20260929-1408-local-report.md`; the archive's optional gloss narrowings — `pun`, `minuman` — stay open) · ASR off the main thread · AWL Sublists 2 & 3 · AI-tier eval · #8 e2e-rot gap (**2026-09-29: the 3 specs red on EVERY CI run
fixed** — "CI e2e: the Roleplay and PDF-reader tour specs match the app again"; the remaining CI reds are retry-flaky one-offs:
mistake-micro-drills, past-paper-ocr offline, study-lang reload, instruct-router 429) · #9 a11y audit +
per-route size budget (**2026-09-29: the axe half is 🐛 #48–#53; the size half measured clean** — only the two documented
exceptions are over 70 KB: CikguBot 78.8, PDFReader 75.3; Roleplay 68.1 is the closest) · ~~#10 micro-guide UDL rollout~~ (✅ done 2026-09-28 — every tour, see the amended spec) · #12 PWA stale-build · ~~#13 Writing grade clears on task
change~~ (**✅ FIXED 2026-09-29**, "Writing: changing the task or format clears the old grade; the essay stays", report
`docs/overnight/20260929-1119-local-report.md`; follow-up queued as 🐛 #42) · the dictionary-examples batch grind (epic #2 in "🎖️ Kheshav-ranked epics"; 704 of 825 at its last count).

## How each cycle works against this goal (the anti-drift contract)

Before building anything, the cycle MUST:

1. **Assess** the live app against the 6 axes → a short **gap list**, each with **concrete evidence**:
   a real `file:line`, a reproducible behaviour, a **web-verified** wrong content item, or a measured
   number over budget. No evidence ⇒ not a gap.
2. **Pick the single biggest gap** by the priority order below that also passes the HARD invariant screen.
3. **Anti-hallucination gate** — you may ONLY build a gap that is ALL of:
   - **Real** — you can point to the concrete evidence above; never "this might help" or a guess.
   - **Measurable Done** — an observable pass/fail: a failing test that turns green, a number that moves
     past a stated threshold, a rendered element that now appears. **Never "make it nicer".**
   - **Verified** — every Malay/English gloss, grammar rule, or fact is checked against an authority on
     the web before shipping. A confident-**WRONG** change to a learning tool is worse than no change.
4. **If NO gap clears the bar → make NO commit.** Report `no gap above bar on any axis` + the closest
   candidate you considered, and let the shell back off. **This is the correct, desired outcome when the
   app is already good — it is the realization of "stop only when it cannot be improved." An idle, honest
   cycle BEATS a prod-deployed churn commit.**

## The 6 axes (priority order — break ties top-down)

1. **Correctness & content truth** *(highest)* — a broken study mode, crash, or state bug; OR a Malay/
   English gloss, grammar rule, or exemplar that is **verifiably wrong**. Gap = a reproducible defect or
   web-verified wrong content. Fixing a confident-wrong answer ALWAYS outranks any new feature.
2. **Learning efficacy (pedagogy)** — a surface that is passive where retrieval / spacing / immediate
   feedback would teach better, or a research-backed improvement to scheduling, scaffolding, or feedback.
   Must cite the principle (CLAUDE.md learning-science table) AND a real place it is missing today.
3. **UX & accessibility / low friction** — a **measurable** WCAG miss (target < 44px, missing live
   region, keyboard trap), or a real friction point that adds attention cost. This app is **ADD-first**:
   one clear next action, calm, short completable units. Gap = a specific violated rule or broken flow.
4. **Performance** — a per-route page chunk over the **70 KB raw** budget (CLAUDE.md Verification), a
   measurable TTI/runtime regression, or an infinite-render risk. Gap = a number over budget.
5. **Critical-risk test coverage** — an **untested path where a bug would silently corrupt user data or
   break the free path** (cloud sync/merge, FSRS scheduling, store migrations, money-free invariants).
   Gap = a critical path with no test AND a plausible failure mode. ⚠️ **NOT generic "add tests to
   pure-lib X".** Coverage of low-risk pure helpers is **busywork, not a gap** — prefer NO-OP over it.
6. **Bilingual completeness** — a surface broken or absent in ONE language that blocks a learner. Gap =
   a real MS/EN parity break (not cosmetic).

## Ship contract — keep discovery surfaces current (every feature cycle)

When a cycle ships a **user-facing feature** (new mode, route, or capability), the SAME commit MUST also:
- update **`README.md`** so the feature list / overview stays accurate, and
- add it to the **in-app gamified user guide** (driver.js tour, `src/lib/guide/tourSteps.js`; route-modal
  entry too if it's a new route) so the guide never goes stale.

A feature a student can't discover (absent from README + the tour) is not "done". This is alongside the
existing `RESUME_HERE.md` handoff-doc rule. (Pure-internal refactors/test-only cycles are exempt.)

## HARD invariants — never cross without a human (screen EVERY candidate)

No paywall · individual-revision only · no native-app dependency · no `STORE_VERSION` bump without a
data-preserving migration · no Supabase-schema or free-path break · `instruct.js` public API
(`hasInstructProvider` / `callInstruct`) frozen · never delete a feature · no secrets in repo or logs ·
web-verify all content. (These mirror CLAUDE.md + `~/.claude` memory — the irreversible ones.)

## "Improve the loop, not just the app"

If a cycle's highest-value gap is in the **loop itself** — this file, `LOCAL_BUILD_LOOP.md`, or
`build-loop.sh` (e.g. the assessment is missing an axis, a guardrail is weak, a backoff is wrong) — that
is a legitimate axis-1 (correctness) or axis-3 (friction) improvement. Fix it surgically, gate-green,
then resume building the app. Bound it: stop when the next change would be churn, not improvement.
