# Loop review 2026-09-29 — 47 build-loop commits (c7e9c25..1143d0b)

## Triage (attended session, 2026-09-29)

| Finding | Verdict |
|---|---|
| Chaos plants (42, one per loop fix with a unit test; `npm run chaos`) | **39/42 RED.** 3 stayed green = missing tests → added: Import "two good picks" (`importPdfError.test.js`), reader "file picked mid-recording" (`pdfReaderRecordStream.test.js`), and translate "cancel during the LAST retry" — a real gap: `translateDocument` reported progress after a cancel when the final retry threw (guard + test added at the source; the reader-level plant moved there). |
| P2-1 Cikgu drops a real answer on leave-and-return | **Fixed.** Module-level `answering` set: a question whose answer is still on its way is not marked "Not answered"; it shows "Thinking…" and the answer lands. A NEW question marks the old one first (never two questions in a row). |
| P2-2 Writing: false red "AI feedback unavailable" after a task change | **Fixed at the root** in `useAI` (`src/lib/ai.js`): a reset / cancelled / replaced call no longer writes text, spinner or error (it also stopped an interrupted call from switching a NEWER call's spinner off). `useAIStaleCall.test.js`. |
| P2-3 OpenRouter 25 s total budget | **Fixed.** Each free model gets 20 s (`callOpenRouter({ modelTimeoutMs })`); a hung one is skipped for the next; Cikgu's OpenRouter route waits up to 45 s in all; the learner's own cancel still stops everything. `openrouterModelTimeout.test.js`. |
| P3-1 near miss then correct = Good | **Fixed:** Hard. |
| P3-3 "Not answered" sent to the AI as its own reply | **Fixed:** filtered out of the AI's context. |
| P3-2 baru/baharu, bila/bilakah called "another word"; minum/minuman | Deferred → GOAL 🐛 #54 (loop-safe wording). |
| P3-4 every PDF open failure blamed on the file | Deferred → GOAL 🐛 #55. |
| P3-5 a page tour permanently hides the app-tour offer | Deferred → GOAL 🐛 #56. |
| P3-6 reader lost its zoom / hyphen / Volume tips | Deferred → GOAL 🐛 #57 (into the page tour, not back into a wall of text). |

---

# Fresh-context review — build-loop range c7e9c25..1143d0b (47 commits, 24a50ab excluded)

Reviewer: read-only. All code read at 1143d0b via `git show` / `git diff`. No files edited, no tests/e2e/build run
(every claim below comes from reading the code path end-to-end; each has a concrete scenario).

## Verdict

**0 P0 · 0 P1 · 3 P2 · 7 P3** (+1 test-gap noted under P3).
Nothing in the range loses data, crashes, or teaches wrong Malay. The riskiest-looking work (PDF reader races,
engine ref-counting, translate cancel, backup restore, streak freeze) holds up under a line-by-line read. The three
P2s are all side effects of race/timeout guards added in this range: each one fixes its named bug and creates a
smaller new one.

---

## P2 findings

### P2-1 · Cikgu: leave the page and come back mid-answer → the real AI answer is thrown away, and the learner is told something false
- **Where:** `src/pages/CikguBot.jsx:306-313` (mount effect) together with `:133-137` (`addReply` guard). Commit edeabaf.
- **Evidence:**
  ```js
  // mount: "Nothing is in flight on a fresh mount, so a trailing question was left behind…"
  if (useStore.getState().ai.cikguHistory.at(-1)?.role === 'user') {
    useStore.getState().addCikguMessage({ role: 'assistant', content: UNANSWERED })
  }
  // addReply: drops the reply unless its question is still the LAST message
  if (last?.role !== 'user' || last.timestamp !== question.timestamp || last.content !== question.content) return null
  ```
- **Scenario:** In AI mode the learner asks "Explain meN-", taps Dashboard in the nav while Cikgu is thinking, then
  taps back to Cikgu within the answer window (Gemini ≤25 s, then OpenRouter ≤25 s, then Supabase ≤25 s). The old
  `sendMessage` closure is **still running**: its promise was never cancelled on unmount. On remount the effect sees a
  trailing user message and appends "**Not answered** — the page closed before this answer arrived. Ask it again below."
  When the reply lands a second later, `addReply` sees an assistant message last and discards it.
  Result: (a) the message is false, because the page did not close and the answer was on its way; (b) the answer is lost;
  (c) re-asking costs another daily AI call (Supabase quota) or another BYOK request.
- **Regression:** yes. Before edeabaf the reply always landed in the store, so the learner saw it on return. Only the
  reload case (the request really dies) needed the "ask again" marker.
- **Why the tests pass:** `cikguOrphanQuestion.test.js` "leaving mid-answer and coming back" pins exactly this
  drop. It asks a new question first, so it never checks the case where the learner doesn't.
- **Fix direction:** keep a module-level in-flight marker (for example, the question's timestamp in a `Set` outside the
  component) that `sendMessage` adds and removes. On mount, mark a question unanswered only when it is **not** in flight.
  A reload clears module state, so the reload case still works.

### P2-2 · Writing: changing the task, format or language while "Get AI Feedback" runs leaves a false red error under the next grade
- **Where:** `src/hooks/useWritingEvaluator.js:244-246` (`clearGrade` → `ai.reset()`), `src/lib/ai.js:326-332`
  (`useAI.call` catch), `src/pages/Writing.jsx:601-606`. Commit 717835a.
- **Evidence:** `clearGrade` calls `ai.reset()`. That sets `error = null` and then aborts the in-flight request. The
  aborted fetch rejects **asynchronously**, and `useAI.call`'s catch runs after the reset:
  ```js
  } catch (err) {
    setIsLoading(false);
    const aiError = err instanceof AIError ? err : new AIError(err.message, 'unavailable');
    setError(aiError);          // ← AIError('Request aborted','timeout') written AFTER reset() cleared it
    throw aiError;
  }
  ```
  `Writing.jsx:601` renders `{ai.error && … 'AI feedback unavailable — showing basic analysis above.'}` inside the
  results block. `analyze()` never clears `ai.error`.
- **Scenario:** Analyze an essay → tap **Get AI Feedback** → while "Analyzing with AI…" spins, pick a different Task
  (or Format, or flip to Bahasa Melayu). The grade clears as designed. Tap **Analyze** again: the fresh grade shows a
  red "AI feedback unavailable — showing basic analysis above." even though the learner never asked for AI feedback on
  this grade and nothing failed. The notice stays until they tap Get AI Feedback again.
- **Why the tests pass:** `writingTaskChangeClearsGrade.test.js` mocks `useAI` with a constant `error: null` (line ~43),
  so it cannot model the real hook's post-reset `setError`.
- **Fix direction:** in `clearGrade`, clear the error after the abort settles. Alternatively, have `useAI.call` skip
  `setError` when its own controller was aborted by `reset()`/`cancel()` (compare `abortRef.current !== controller`).

### P2-3 · Cikgu: the new 25 s cap on OpenRouter covers the whole non-streamed model chain, so a slow-but-working free model becomes "[AI unavailable]"
- **Where:** `src/pages/CikguBot.jsx:171-178`. Commit edeabaf.
  ```js
  const stop = new AbortController()
  const giveUp = setTimeout(() => stop.abort(), AI_TIMEOUT_MS)   // 25 000
  const response = await chatWithFreeModel([...], contextNote, stop.signal)
  ```
- **Evidence:** `callOpenRouter` (`src/lib/openrouter.js:219-270`) shares that one signal across three things: the
  `/models` discovery fetch (on a cache miss), then **each** of up to 5 free models in turn, and each request is
  non-streamed. An AbortError is re-thrown immediately (`if (err.name === 'AbortError') throw err`), so there is no
  next model after the cap fires. The #2 preferred family, `gpt-oss-120b`, is a reasoning model.
- **Scenario:** A signed-out learner with their own OpenRouter key (the only AI path open to them, per 502c83b) is on
  school Wi-Fi. Model 1 answers 429 after 3 s, and model 2 needs 24 s to finish a 512-token reply. At 25 s the whole
  request is aborted and the learner gets "**[AI unavailable — using Expert System]**" followed by an Expert "not sure"
  reply. Before edeabaf the same request succeeded, with no bound at all.
- **Assessment:** the bound itself is reasonable, since the mode switch is now locked while AI thinks. The issue is that
  it is a *total* budget for a sequential, non-streaming chain. Consider a per-model timeout, or a longer cap (e.g. 45 s)
  for this route only. Unlike the Supabase route, there is no "stop the timer once words stream" escape here.

---

## P3 findings (polish / edge)

1. **Near miss then correct is rated Good.** A near miss (`kamu` for an `awak` card) returns without rating. The retry
   then goes through the normal path, `rate(correct ? Good : Again)`
   (`ProduceMode.jsx:42`, `FlashcardMode.jsx:73`). Scenario: a learner who doesn't know the card's word cycles through
   the 2–3 same-gloss words ("you" → kamu → engkau → awak) and is credited **Good** by elimination. `Hard` after a near
   miss would be the honest FSRS signal. (Commit 045215f.)
2. **Malay near-miss wording, checked word by word.** All 21 shared-gloss groups in `dictionary.js` are genuine synonyms
   or near-synonyms, and **no wrong answer is ever credited** (a near miss is never rated). Three are imprecise:
   - `baru`/`baharu` and `bila`/`bilakah` are the *same word* (a spelling variant, or the `-kah` particle). The learner is
     told "“baru” means “new” too, but this card wants another word". That is correct Malay treated as "another word"
     (not penalised, only mislabelled).
   - `minum` (verb, to drink) / `minuman` (noun, a drink) share the gloss "drink". A wrong part of speech gets a free
     retry and "means “drink” too". This comes from an ambiguous existing gloss, not from 045215f's logic.
   - Deck-sourced near misses (`produceAnswer.js:18`) trust the learner's own machine-glossed cards. gtx often gives
     unrelated words the same English, e.g. "go" for pergi and jalan, so the message can assert a false synonymy (still
     never credited).
3. **The "Not answered" marker is sent to the AI as its own reply.** `CikguBot.jsx:150` builds `recentMessages` from the
   last 8 history items, so the UNANSWERED text goes into the next prompt as an assistant turn ("**Not answered** — the
   page closed…"). The model then sees a fake reply of its own. Filter it out of the context.
4. **Every open failure is blamed on the file.** `pdfOpenErrorMessage` (`src/lib/pdfOpenError.js:4-8`, used at
   `PDFReader.jsx:361` and `Import.jsx:92`) maps *every* exception to "may be damaged or not a PDF. Try another file."
   (18b1eb2 / c244088). Scenario: a tab left open across a prod deploy (the loop deploys on every commit) → the hashed
   `pdf.worker` asset 404s → every PDF the learner tries reads "damaged — try another file", which sends them down the
   wrong path. It also misreports app bugs thrown after parsing (for example, in `offerPdfOcr`). Suggest matching
   pdf.js's `InvalidPDFException`/`MissingPDFException` for the "damaged" text and using a neutral "Couldn't open the
   reader — reload the page" for everything else.
5. **A page tour permanently removes the app-wide tour offer.** `useGuide.js:89` (35e0249) calls `markGuideSeen('quick')`
   on any ▶ page tour. A new learner who tours one page never sees the "New here? Take the tour" offer for the app-wide
   quick tour again (it only replays from Settings). The bug was only the card floating *during* the tour; hiding it
   for the tour's duration would be enough.
6. **Lost reader tips.** 2d21ecf deleted the reader's "Tips:" footer (`PDFReader.jsx:2352`). The page tour now covers
   Group, but not what else the footer taught: Layout's pinch / double-tap zoom, "hyphenated words count as one", and the
   translation panel's Volume button. Low discoverability cost.
7. **Test gap (category 3).** `writingTaskChangeClearsGrade.test.js` mocks `useAI` with a fixed `error: null`, so it cannot
   fail for P2-2. No test in the range was found that asserts nothing or mocks the unit under test. Every new test read
   exercises the real component or lib, and most were red-proofed per their commit.

---

## Area-by-area status

| Area | Status |
|---|---|
| `src/pages/PDFReader.jsx` (15 commits: d213e12, 4fb1d59, 2d21ecf, 1c5b3f8, 2c8119e, ca68330, 18b1eb2, 94086af, 22dac1e, b44088b, c244088, 393ba7f, 27e6b33, 6db7822, d828cc4) | **Checked.** Recording (`recBusyRef`/`recTakeRef`/`discardRecording`, StrictMode reset), `untilAborted`, OCR/ASR `finally` ownership guards, translate-page twin guard + `isCurrent` + epoch, unmount guard, tap targets: **correct for every scenario traced**, including cancel→repick, second pick, clearPdf/loadSample mid-run, the vision success path through `resetGloss`, and `acceptPdfOcr`. Findings: P3-4 (error wording), P3-6 (lost tips). |
| `src/pages/CikguBot.jsx` (502c83b, 2e5727c, 3474edf, edeabaf, 1143d0b) + `cikguKnowledge.js` | **Checked.** P2-1, P2-3, P3-3. Mode-toggle lock, sign-in label/hedge (`aiRefused`), voice null-reply handling and the Send label are clean. |
| `src/pages/Writing.jsx` + `src/hooks/useWritingEvaluator.js` (717835a, 7e1b75e, 7f23713, 56f885d, e748599, a5422d5, 6ea8a8f) | **Checked.** P2-2, P3-7. The run token, aria-disabled Analyze, mousedown-preventDefault and keep-in-view effect are otherwise sound (AI-failure path covered by e2e). |
| `src/lib/writingGrader.js` / `writingErrors*.js` (0d00636) | **Checked — clean.** The new splitter never splits more than the old `split(/[.!?]+/)`; the Malay `dll./dsb.` path is wired. |
| `src/lib/produceAnswer.js` + `FlashcardMode.jsx` / `ProduceMode.jsx` (045215f) | **Checked.** Malay verified across all 21 shared-gloss groups: no wrong answer is ever credited, per-card reset works, and EN cards never borrow the Malay dictionary. P3-1, P3-2. |
| `src/lib/ocrEngine.js` + `transcribeEngine.js` (6db7822) | **Checked — clean.** Ref-count/release is idempotent. A rejected download releases every holder and evicts the cache. Join-before-resolve works because both imports settle FIFO. The new `asrEngineRef.terminate()` only drops a handle. |
| `src/lib/translate.js` + gtx/instruct providers + `translateDocument.js` (b44088b) | **Checked — clean.** Words not fetched after a cancel come back as `source:'error'`, which `writeCache` refuses to persist (`translationCache.js:98`), so a re-run refetches them. A cancel no longer falls through to the next provider. deepl/google ignore the new 4th arg harmlessly. |
| `src/store/useStore.js` (8fb95bf streak; 3d99799 plural) | **Checked — clean.** `streak.count > state.streak.count` blocks only the freeze-kept case: day-1, milestone and reset paths all behave. |
| `src/lib/importBackup.js` + Settings restore (10ff27b) | **Checked — clean.** `exportDate` has been in every `exportData()` since the initial commit (27f4036), and the only caller is the Settings restore. |
| `.github/` + dependabot (de73665) | **Checked — clean.** The config is valid, the transformers v4 ignore is correct, `js-yaml@4.3.2` is present in the lockfile, and the review job skips dependabot. |
| Settings (9ddd055, be7b23d, 855eb59, 1f8619e, ec67f4e) | **Checked — clean.** The red error toast, the always-mounted live region, clipboard failure → toast, label/`htmlFor` wiring and singular counts are all correct. |
| Import (6a1b58a, c244088, 3d99799) | **Checked — clean**, apart from the P3-4 wording. The pick-sequence guard is correct. |
| Roleplay (1faca73) | **Checked — clean.** The "back tomorrow" branch is reachable only when signed in with 0 calls (`aiAvailable = signedIn && remaining > 0`). |
| Guide / tours (35e0249, e461c41, c521efc, 2d21ecf pageGuides) | **Checked.** P3-5. 44 px targets fine. |
| Grammar/Study phone polish (6a1b58a) | **Checked — clean.** Tailwind v4 has the `pointer-coarse:` variant. |
| Tests-only (1789e5c, d71da95, 66ece96, df2ec42, 6ea8a8f) | **Checked — clean.** Each waits on the real async source rather than raising a tick budget. df2ec42 re-aligns e2e with intended app behaviour and does not weaken assertions. |

**Not checked:** the e2e specs were read, not run (they need a browser, which this review's rules excluded). Visual and
tap-target claims (44 px measurements, 390/1280 screenshots) are taken from the commits' own evidence and were not
re-measured here.
