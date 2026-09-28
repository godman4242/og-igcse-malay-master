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
10. **UI polish from the chaos pass** (README U7–U9): the "Keys: Space=flip…" hint shows on phones
    (hide on `pointer: coarse`); a very long word overflows its chip on Import (wrap it); the Grammar tab row
    is cut at the right edge with no scroll cue. **Done:** `scripts/ui-smoke.mjs` ✓ and the 390 px screenshots
    show none of the three.
11. **Cikgu Maya's "AI Mode — N calls remaining today"** is shown to signed-out learners, whose AI calls
    are refused (sibling of U6, fixed for Roleplay in `55b2043`). **Done:** signed out, the label says AI
    needs a free account; signed in, unchanged — mirror `roleplaySignedOutBanner.test.js`.

12. **Band scorer counts "a.m." / "e.g." / an email address as sentence ends** (found in the item-1 cycle, both
    languages): `writingGrader.js:137,229` split on every `[.!?]+`, so a 7-sentence, 72-word English essay showed
    "Sentences 14 · Avg Length 5" in the UI (seen at 390 px); a short avg length feeds Sentence Variety. Malay
    `dll.`/`dsb.`/`...` do the same (item-2 cycle, seen in the preview: a 6-sentence Malay story → "Sentences 9"). **Done:** that essay → 7 sentences; the grader harness before/after pasted for BOTH
    languages (Malay ≥ 15/17, English ≥ 10/13); reuse the sentence-end rule from `writingErrors.js` (`NON_FINAL_DOT`
    + the lazy splitter) instead of forking a third copy. Do it after item 2 (the Malay `dll.`/`dsb.` side).

13. **Walls of text the "brain turned off" rule forbids** (Kheshav 2026-09-28: "I skim, I don't read"; the tours
    now follow it — ≤14 words, one idea). Still breaking it: the PDF reader's **"Tips:" footer** (≈60 words under
    the passage, `PDFReader.jsx` near "Clear PDF") and the density banner's second sentence. **Done:** the Tips
    footer is gone or ≤2 lines of ≤14 words each (the tour teaches the rest); a 390 px screenshot opened and
    viewed in dark + light; no feature removed (every tip is covered by a page-tour step — check
    `pageGuides.js` `/pdf-reader`).
14. **e2e rot: `user-guide.spec.js` "works offline once the guide chunks are warm" fails locally on HEAD**
    (found 2026-09-28; also fails with the tour overhaul stashed, so it predates it). The Quick tour's popover
    never appears after `context.setOffline(true)`. Root-cause it (which import refetches offline?) — don't
    loosen the assertion.

15. **PDF reader: loading a document WHILE recording hides Stop, mic stays live** (R4 #6 "related trigger", left over from
    item 6): picking a sample/file/photo swaps out the empty state — the only place the Stop button lives — so the recorder
    keeps running with no visible control. **Done:** a test that starts recording, loads a sample, and sees every track
    stopped (extend `pdfReaderRecordStream.test.js`). Same cycle: a `new MediaRecorder` failure says "Microphone access was
    blocked" even though the mic WAS allowed — give it its own message.

16. **PDF reader: the translate progress bar's "Cancel" is a 10 px text link** (seen at 390 px in the item-7 cycle,
    `PDFReader.jsx` ~line 1821, `text-[10px]`, no min size) — far under the 44×44 px rule every other reader control meets.
    **Done:** it gets `min-h-[44px]` (+ padding) without pushing the bar onto two lines at 390 px; screenshot opened in dark
    + light; if `tests/e2e/a11y-tap-targets.spec.js` can reach it, extend it.
17. **PDF reader: the dense-page "help me" offer can start a SECOND translate run** (reviewer note, item-7 cycle):
    `acceptDenseHelp` (`PDFReader.jsx` ~line 1068) calls `translatePage()` without checking `translating`; the Translate
    button is disabled mid-run but the offer isn't. Run #1's controller is overwritten un-aborted, so it keeps spending
    rate-limited batches no Cancel can stop (UI stays correct since item 7). **Done:** a test — Translate page, then accept
    the offer mid-run → exactly one run's batches keep going (or run #1 is aborted first).

18. **Settings shows every message on a GREEN "success" toast** — including the refusals ("That's a shared deck…",
    "Not a valid backup file", "Invalid file!", "No cards to share"), seen at 390 px in the item-8 cycle
    (`Settings.jsx` ~line 234, `background: var(--color-green)` for all `msg`). A red-flagged action reads as done.
    **Done:** `flash` takes a tone; refusals use the error colour with `--color-on-bright` text (≥4.5:1 in both
    themes); success toasts unchanged; 390 px screenshots opened in dark + light.

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
- **A5 · The older attended lists, unchanged** — in the archive, by heading: "📏 Writing-grader follow-ups"
  (the current kickoff is its item 2), "🛡️ Launch-gate follow-ups" (7c–i, 5a–e), "🌟 VISION EPICS", "🆕
  free-AI-tier expansion", For-You Phase 2, multimodal video, BYOK quality-translate, cross-browser e2e.

## 📋 Older open loop-safe items — take only after the 🐛 queue, and re-verify each at HEAD first

Full text in the archive under "✅ Loop-safe queue"; read `docs/reviews/2026-08-06-defect-census.md` Batch A
before any of them (half the entries were already fixed when it was taken). Open there: `0-quater`
(the authGuard sign-in test that fails ~1 run in 3 — do NOT raise timeouts; make the chain awaitable) ·
Dependabot · ASR off the main thread · AWL Sublists 2 & 3 · AI-tier eval · #8 e2e-rot gap · #9 a11y audit +
per-route size budget · ~~#10 micro-guide UDL rollout~~ (✅ done 2026-09-28 — every tour, see the amended spec) · #12 PWA stale-build · #13 Writing grade clears on task
change · the dictionary-examples batch grind (epic #2 in "🎖️ Kheshav-ranked epics"; 704 of 825 at its last count).

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
