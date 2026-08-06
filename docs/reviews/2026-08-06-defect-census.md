# Defect census — 2026-08-06

**Read-only census.** Nothing under `src/` was touched to produce this. Written to answer one question
honestly: *how many more things actually need fixing?*

---

## The count

**About 30 things need fixing. 7 of them are proven. Budget ~59 hours.**

| | |
|---|---|
| Raw findings from 7 independent lenses | 33 |
| **Distinct** after deduping (3 pairs were the same defect twice) | **30** |
| ✅ **Adversarially verified** — survived a refute-by-default pass | **7** (~15.5 h) |
| 🟡 Strong leads, evidence-backed but not independently refuted | **23** (~43 h) |
| ❌ Refuted | 0 — **see the caution below** |

**⚠️ Caution on the 0 refutations.** A healthy adversarial pass normally kills some findings. 0-of-7 means
either the finders were unusually careful or the verifiers were soft. So the lead session **re-verified 6 of
the 7 personally**, by opening the file or running a measurement — those are marked 🔬 below. Only **V2** rests
on an agent's word alone; treat it as a strong lead, not a certainty, until someone reads
`useStore.js:767-792` themselves.

### The number that should change how you feel about the backlog

One lens did nothing but reconcile the written to-do lists against live code — GOAL.md, RESUME_HERE.md, the
2026-08-01 review, the 2026-08-02 P0 pass, the newest plans. It opened **40 open/queued items**:

| Verdict | Count |
|---|---|
| **ALREADY FIXED** (the doc is stale) | **20** |
| STILL REAL | 10 |
| NEVER REAL / not a defect | 6 |
| Partially done | 1 |
| Not judgeable without a runtime or API quota | 3 |

**Half the written backlog is already done.** That is why "140 findings" was never the real number. The
2026-08-01 review's remaining **31 P1 / 64 P2 / 13 P3** are *unverified hypotheses*, and the measured
survival rate across three separate passes is roughly **1 in 4** — and what does survive overlaps heavily
with the 30 below, which were found independently. **Do not plan against 108. Plan against ~30.**

### What this census covered — and did not

Covered: every page and hook, the store + migrations + sync, the data files, the translate/AI/OCR/ASR
libs, the e2e + unit suites, and all the planning docs. Not covered: anything requiring a real browser
(actual contrast rendering, real touch targets, real screen-reader output), anything requiring native
Malay fluency beyond internal-consistency checks, and anything requiring a live API quota.

---

## Fix in this order

Ordered by **student harm × cheapness**, not severity alone. 🔬 = opened the file / ran the measurement
myself, not taking an agent's word. **29 rows cover the 30 findings** — A18 bundles two defects in one spec
file, and A2 bundles two stale sections of one doc.

### Batch A — mechanical. No decisions needed. Ship these solo.

| # | Title | Sev | Anchor | Why here | h |
|---|---|---|---|---|---|
| A1 | 🔬 Word Families teaches `ke-…-an + tinggal = kediaman` — false | **P0** | `src/data/wordFamilies.js:412` | Teaches wrong Malay, contradicts the app's own drill, 1 line | 1 |
| A2 | 🔬 GOAL.md queues 6 shipped items + a fixed flake as live work | P1 | `docs/loop/GOAL.md:83,210` | Every wasted build cycle is a fix a student doesn't get | 1 |
| A3 | 🔬 Comeback warm-up ends, `cardIdx` never resets → 5 most-overdue cards skipped | P1 | `src/hooks/useStudySession.js:93` | Breaks the core study loop for every returning learner | 1 |
| A4 | 🔬 Comeback warm-up queue can be empty → Study hard-blocks | P1 | `src/hooks/useStudySession.js:76` | Same file, same fix session, dead-page severity | 1.5 |
| A5 | 🔬 `grammarStats` missing from `BACKUP_KEYS` → restore wipes grammar progress | P2 | `src/store/useStore.js:123` | Silent data loss, one line | 0.5 |
| A6 | 🔬 Manual "+ Card" still hard-gated `language === 'ms'` | P2 | `src/pages/MistakeJournal.jsx:249` | English learners can't use their own journal; one condition | 0.5 |
| A7 | 🔬 `gtx` returns the source word as a *successful* translation | P1 | `src/lib/translate/providers/gtx.js:18` | Poisons the cache and mints `makan = makan` cards | 2 |
| A8 | Cloud blob push swallows every failure; pill still says "Synced" | P1 | `src/store/useStore.js:1300` | Student believes their work is safe when it isn't | 1.5 |
| A9 | Dashboard Quick Review is mouse-only (bare `div onClick`) | P1 | `src/components/QuickReview.jsx:50` | Keyboard/switch users cannot use it at all | 1.5 |
| A10 | Flashcard answer face permanently in the a11y tree | P1 | `src/components/study/FlashcardMode.jsx:179` | Screen-reader students hear the answer with the prompt — kills retrieval | 2 |
| A11 | Writing "Get AI feedback" burns a quota call and renders nothing on non-JSON | P2 | `src/hooks/useWritingEvaluator.js:202` | Silent failure + wasted quota | 1 |
| A12 | Streak freeze consumed at a milestone is instantly refunded | P2 | `src/store/useStore.js:1589` | Streak becomes unloseable; the motivation layer stops meaning anything | 1 |
| A13 | Exam-rehearsal MCQ marks selection by colour alone | P2 | `src/pages/ExamRehearsal.jsx:455` | 30-min graded assessment unusable by screen reader | 1.5 |
| A14 | Writing: changing task after Analyze shows the OLD grade's ticks | P1 | `src/pages/Writing.jsx:244` | Confident-wrong feedback on a normal browsing action | 1.5 |
| A15 | Comprehension: in-flight AI questions land on whichever passage is open | P2 | `src/pages/Comprehension.jsx:118` | Marks answers against a passage never read | 1.5 |
| A16 | Roleplay/Cikgu/mistake writes never stamp `lastMutationAt` → stale cloud wins | P1 | `src/store/useStore.js:767` | Real data loss for signed-in users — **verify first** | 3 |
| A17 | 🔬 CI goes red intermittently: `GuideOffer` dialog intercepts the toast click | P1 | `tests/e2e/instruct-router.spec.js:118` | The safety net is untrustworthy while main auto-deploys | 2.5 |
| A18 | a11y tap-target sweep only ever opens SearchModal + passes vacuously if its selector goes stale | P2 | `tests/e2e/a11y-tap-targets.spec.js:22,88` | A false pin is worse than no pin — CLAUDE.md cites it as proof | 2.5 |
| A19 | Three dialogs ship sub-44px controls and no focus trap | P2 | `src/components/WordFamilyTree.jsx:385` | The defect A18 was supposed to catch (20–32px targets) | 3 |
| A20 | English starter deck fabricates `ex` as `"word — gloss"` | P1 | `src/store/useStore.js:1374` | 655/682 cards produce degenerate cloze whose hint *is* the answer | 2 |
| A21 | ~70 button labels hardcode white on bright fills (1.54:1–3.32:1 dark) | P1 | `src/components/study/FlashcardMode.jsx:233` | Fails WCAG on the rating buttons — **needs a real browser to confirm** | 5 |
| A22 | Whisper transcription runs on the main thread | P2 | `src/lib/transcribeEngine.js:118` | A 5-min clip freezes the tab; Cancel is inert | 6 |

**Batch A total: ~43 h.**

### Batch B — needs your product call first

| # | Title | Sev | Anchor | The decision | h |
|---|---|---|---|---|---|
| B1 | 🔬 Grammar advance skips every other drill (GOAL.md `0-ter-b`) | P1 | `src/pages/Grammar.jsx:274` | Freeze the deck per session · always-serve-head + de-stall cursor · defer the SRS write. Each changes spacing semantics differently | 3 |
| B2 | 🔬 MCQ answer-position bias — SVA is 12/12 at position B | P1 | `src/data/grammarEng.js:35` | Shuffle options at render (stable per drill) vs. rebalance the data by hand | 4 |
| B3 | Produce mode marks correct synonyms wrong (21 gloss collisions) | P2 | `src/components/study/ProduceMode.jsx:34` | Accept any headword sharing the gloss vs. re-gloss the sets. GOAL.md `0-bis` already argues for the former | 3 |
| B4 | Select-to-deck mints self-gloss cards from failed translations | P1 | `src/pages/PDFReader.jsx:873` | Block the add, or add it flagged "unverified" | 1.5 |
| B5 | Roleplay with failed AI scoring is recorded as 0/6 | P1 | `src/components/RoleplayScorecard.jsx:62` | Omit the entry, or record it as explicitly unscored | 1.5 |
| B6 | GuideOffer and all 3 toasts share one bottom slot + z-layer | P2 | `src/components/GuideOffer.jsx:52` | Which wins, and where the loser moves. (Product twin of A17) | 1.5 |
| B7 | English grammar errors journalled as Malay `imbuhan` mistakes | P2 | `src/store/useStore.js:1665` | Needs an English category taxonomy — `imbuhan` doesn't exist in English | 1 |

**Batch B total: ~15.5 h.**

---

## What each fix actually is

**A1 · `kediaman`** — `wordFamilies.js:406-418` lists BOTH `kediaman` and `ketinggalan` as the `ke-…-an` form
of root `tinggal`. A root has exactly one. `grammar.test.js:172-190` already web-verified the truth
(`kediaman` = ke- + **diam** + -an) and `grammar.js:138` was corrected — `wordFamilies.js` was missed.
The tree renders it (`WordFamilyTree.jsx:287,343`) and the detail modal literally prints "ke-…-an · from
tinggal". Fix: drop `kediaman` from the `tinggal` family (or open a `diam` family), then pin with a
content-truth test. `npx vitest run src/data/__tests__/wordFamilies.test.js` is green **with the false entry
present** — the existing "tinggal family content truth" block never mentions it.

**A3/A4 · comeback warm-up** — `sorted` is a `useMemo` keyed on `[activeDeck, inComebackWarmup]`. When the
warm-up flag flips false after 5 reviews the queue is rebuilt as the full priority list, but `cardIdx` is
still 5 — so the 5 most-overdue cards are jumped. Separately, `buildComebackQueue` (`fsrs.js:278`) filters
`stability > 0`; a learner who opened Study once, rated nothing, and returned 8+ days later gets an **empty**
queue, `card === null`, and `sessionStats.reviewed` can never reach 5 — the gate never lifts. Fix: reset
`cardIdx` on the warm-up transition, and fall back to the normal queue when the warm-up queue is short/empty.

**A7 · gtx** — `const out = data?.[0]?.map(s => s[0]).join('') || text` then `return { source: 'gtx' }`. On a
200 with an unexpected/empty body it returns the *source word* tagged as a **success**, so every downstream
`source === 'error'` guard is bypassed and the result is cached. Fix: return `source: 'error'` when the
parse yields nothing, instead of falling back to `text`.

**A17 · intermittently red CI** — `instruct-router.spec.js:118` wipes `localStorage` then reloads, which
resets `guide.seenQuick`, so `GuideOffer` mounts a `role="dialog"` at `bottom-24` on `--z-toast` — the same
slot and layer as `InstructSwitchToast` (`bottom: 88`). Playwright's actionability check reports
`intercepts pointer events`.

Measured across two consecutive runs: `31093599525` failed **3/3 attempts**; `31098643311` (the next push)
passed clean. **That pattern rules out "a 1-in-6 flake" and rules in a race** — `GuideOffer` appears on a
2000 ms timer, so whether it has painted before Playwright clicks depends on runner speed; once a run is
slow, every retry inside it fails the same way. Fix the seed to preserve `seenQuick` (test side, A17) *and*
separate the slots (product side, B6) — the second is a real first-run defect on its own.

**B1 · Grammar skip** — measured, not estimated. Simulating the live `sortDrillsBySRS` ranking over a
10-drill deck serves `d0 d2 d4 d6 d8 d0 d2 d4 d6 d8` — 5 unique drills, then it loops on those 5 forever.
"Don't increment" is not a fix: once every drill is seen-and-not-due the comparator returns 0, the sort is
stable, and index 0 never moves — it stalls.

**B2 · answer-position bias** — measured across every authored bank:

```
SVA_DRILLS_EN          n= 12   A/B/C/D = 0/12/0/0     ← always B
CONFUSABLE_DRILLS_EN   n= 15   A/B/C/D = 2/12/1/0
TENSE_DRILLS_EN        n= 15   A/B/C/D = 2/10/3/0
FIND_ERROR_DRILLS_EN   n= 10   A/B/C/D = 9/0/0/1      ← almost always A
ERROR_DRILLS (MS)      n= 20   A/B/C/D = 3/4/1/12     ← usually D
TENSE_DRILLS (MS)      n= 16   A/B/C/D = 4/4/4/4      ← already balanced
```

A student scores 12/12 on English SVA by tapping the second option without reading, and FSRS then schedules
those drills far out as "known". Malay Tense being perfectly balanced shows the intent existed. A render-time
shuffle is the stronger fix (it also defends future content) but **must be stable for the lifetime of the
feedback** — the exact hazard fixed in `0-ter` on 2026-08-06.

---

## Checked and NOT broken

The adversarial pass refuted nothing, but the backlog lens killed plenty — **6 items in the written backlog
are NEVER-REAL and 20 are ALREADY-FIXED.** Specifically confirmed dead, do not re-take:

- **All 11 P0 findings** from the 2026-08-01 review. Verified 2026-08-02: 10 real, 1 refuted, **0 survived as
  P0** after honest severity review; all shipped 2026-08-03 (`e51e394`, `772aaa4`, `abe0c72`).
- **The authGuard sign-in flake** (GOAL.md `0-quater`). Fixed by `af7997d`, verified over 4 clean full-suite
  runs. GOAL.md still says otherwise — that's A2.
- **C4/C5/C6/C7/C8/C9** in GOAL.md's fix queue — all shipped 2026-08-03, each re-confirmed against live code.
- **"42% unused JS / routes aren't code-split"** (JClaw audit) — the app already lazy-loads every non-Dashboard
  route.
- **Grammar drill-swap (`0-ter`)** — fixed 2026-08-06, commit `655571f`, 7 red-proofed tests.

---

## Blind spots — what this census could not see

| Blind spot | What would close it |
|---|---|
| Real rendered contrast (A21's 1.54:1 numbers are computed from source, not measured) | Chrome DevTools MCP + a Lighthouse/axe pass on the running app |
| Real tap-target geometry outside SearchModal | Extend `a11y-tap-targets.spec.js` to open each dialog (that IS A18) |
| Actual screen-reader output (A10, A13) | A human with VoiceOver — no tool substitutes |
| Malay truth beyond internal contradiction | PRPM / Kamus Dewan lookups per claim, as the dictionary batches already do |
| Anything needing live API quota (AI tiers, OCR/ASR on real files) | A funded key + the existing `scripts/ai-tier-eval` |
| **Chaotic user behaviour** — spam-tapping, cancelling mid-flow, navigating away during an async call, offline toggles, theme swaps | **A Playwright fuzz spec.** A15 (Comprehension race) and A17 (overlay interception) are both exactly this class, and both were found by reading rather than by testing — which means more of them exist |

**Recommended next tool, decided:** a `tests/e2e/chaos.spec.js` random-walk spec — visit each route, fire
rapid/duplicate taps, submit garbage into every input, navigate away mid-async, toggle offline and theme,
and assert only invariants (no uncaught error, no `Maximum update depth`, store still parses, no blank
route). **Not** Peekaboo MCP: it is a macOS-native screen-capture/GUI-automation server, and this is a web
SPA already driven by Playwright at 390×844 — Peekaboo adds a permissions burden and nothing Playwright
doesn't do better and deterministically.

---

*Method: 7 read-only finder lenses (stale-state · content-truth · store invariants · a11y/UX · silent
failures · test rot · backlog reconciliation), then 7 refute-by-default verifiers on the top findings by
severity, then synthesis. 15 agents, 1.71M tokens, 462 tool calls, ~19 min. The lead session independently
re-verified 6 of the 7 confirmed findings and personally measured the MCQ bias and the Grammar skip.*
