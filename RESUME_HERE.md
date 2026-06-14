# RESUME HERE — read this first

You are a fresh Claude Code session continuing work on the IGCSE Malay
Master app. Read this doc end-to-end **before** opening any other file.

---

## 🤖 Autonomous build queue (read by the every-2h Opus cloud builder)

The cloud **builder** routine (Opus 4.8, every 2 hours) takes the **first unchecked `[ ]` item**
below, builds **only that one** to a gate-green state (TDD red-proof first), ships it to `main`
(= prod deploy), and **checks it off in the same commit**. Items here are PRE-VETTED as
**safe-to-solo**: bounded, with a clear "best" answer, no big UX / architecture / pedagogy
judgment call. If every item is done, the builder may add behaviour-preserving test coverage or
write a research doc — it must **NOT invent a large feature unsupervised**. A nightly read-only
**quality-watch** routine files "🌙 Quality-watch regressions" issues; the builder **pauses** while
one is open. Most daytime runs will hit the "recent commit on main" guard and skip — that is
correct (it never collides with Kheshav's live session). Kheshav: add/reorder items freely;
remove the `[ ]` (→ `[x]`) to retire one.

- [x] **Content-truth fix: Cikgu Maya `imbuhan-ber` taught the `be-` allomorph with a conflated/wrong rule label** —
  SHIPPED 2026-06-14 (local build loop, self-sourced, **axis-1 content-truth**, the pre-thought `▶ NEXT` of the
  imbuhan-men/berasa fixes: "the still-muddled `ber-` be- notation — needs a grounded ruling before touching"). The
  `imbuhan-ber` entry's `be-` variation bullet (`cikguKnowledge.js:78`, rendered VERBATIM to the student) read
  *"**be-** → before r + consonant: bekerja (NOT berkerja), berenang"* — conflating TWO distinct allomorph rules
  under one inaccurate label: `bekerja` = ber-+**kerja** (first syllable "ker" ends in **-er** → be-) and `berenang`
  = ber-+**renang** (root **starts with r** → be-; renang is r+vowel, NOT "r + consonant"). The forms were right; the
  taught rule was wrong — the same conflation already grounded-and-fixed in `grammar.js` (the berasa ruling). Fixed to
  *"**be-** → when the root starts with **r** (renang → berenang), or its first syllable ends in **-er** (kerja →
  bekerja, NOT berkerja)"*. Web-verified (Bobo.grid.id; malaytuitionsg) + corroborated by the app's own grammar.js.
  New `cikguKnowledge.test.js` block (+4) red-proofs it. See the shipped section below.
- [x] **Content-truth fix: Cikgu Maya `imbuhan-men` answer garbled the p-drop rule (`menulis ❌ mempulis`)** —
  SHIPPED 2026-06-14 (local build loop, self-sourced, **axis-1 content-truth**, the pre-thought `▶ NEXT` of the
  memakan/grammar.js fixes: "grounded content audits of the OTHER answer-bearing data files"). After auditing
  `listeningPassages.js` / `scenarios.js` / `exemplars.js` / `dictionary.js` (all clean), the bug was in
  `cikguKnowledge.js:38` — the `imbuhan-men` `answer` (rendered VERBATIM to the student by
  `formatKnowledgeResponse`) taught the p-drop rule as *"mem- (p drops) before p → **menulis ❌ mempulis** →
  memukul"*. It injected `menulis` (a **t-drop** word from `tulis`, belonging to the very next bullet) and the
  nonsense token `mempulis`, instead of cleanly teaching `pukul → memukul`. meN- + a p-initial root drops the p
  (KPST/luluh): `pukul → memukul`; the genuine wrong form is `mempukul` (the app's OWN `writingErrorsMalay.js` +
  `goldWriting.mjs` already flag `mempukul → memukul`). Fixed to *"mem- (p drops) before p → **memukul** (NOT ❌
  mempukul; p→m: pukul→memukul)"* — preserves the ❌-contrast teaching intent with the correct token. Web-verified
  (Kompas "Peluluhan Kata Dasar Berawalan KPST"; BahasaMelayuOnline). New `cikguKnowledge.test.js` block (+4)
  red-proofs it. See the shipped section below.
- [x] **Content-truth fix: comprehension answer key mislabeled the affix on `memakan` (`meN-...-kan`, no such suffix)** —
  SHIPPED 2026-06-14 (local build loop, self-sourced, **axis-1 content-truth**, the pre-thought `▶ NEXT` thread of the
  grammar.js fixes: "content-truth audits of other data files — `comprehensionPassages.js`"). The `kesihatan`
  comprehension passage's grammar question *"apakah imbuhan pada 'memakan'?"* keyed **`correctIndex: 1`** (`B) meN-...-kan`)
  and its explanation invented *"(-kan implied transitive)"* — but **`memakan` = `meN-` + `makan`** with **no suffix**
  (root `makan` is m-initial → me- no-change allomorph, exactly like the app's own `memasak`; a `-kan` form would be
  `memakankan`). `correctIndex` is the GRADED key (`Comprehension.jsx:202/240`), so a student who correctly picked
  `A) me-` was marked **wrong** and shown a fabricated rule. Fixed to `correctIndex: 0` + a grounded explanation; the
  word/options/passage are untouched. Web-verified (Kompasiana imbuhan-makan) + corroborated by `grammar.js`'s own
  no-change rule. New `comprehensionPassages.test.js` red-proofs the fix + an answer-key-in-range invariant over the
  whole bank. See the shipped section below.
- [x] **Content-truth fix: `ber- + asa → berasa` drill taught the WRONG root (`asa`, not `rasa`)** — SHIPPED
  2026-06-14 (local build loop, self-sourced, **axis-1 content-truth**, the pre-thought `▶ NEXT` of the kejar +
  peN- fixes: "the still-muddled `ber- + asa → berasa` notation — ambiguous root rasa vs asa; needs a grounded
  ruling before touching"). The `prefix-ber-asa` drill carried `root:'asa'` / `rule:'ber- + asa → berasa'` — but
  `berasa` ("to feel") is `ber-` + **`rasa`** (root starts with `r`, so `ber-`→`be-`: `be- + rasa → berasa`), the
  same be-reduction family as the app's own `bekerja`. The drill also **contradicted** `GRAMMAR_RULES['ber-']`,
  which already (correctly) files `berasa` under the be-/r-initial rule. Fixed the drill (`root:'rasa'`,
  `rule:'be- + r → r drops'`, `hint:'ber- + rasa'`; **answer unchanged**), degarbled the reference example
  (`'bekerja, berasa → berasa'`→`'bekerja, berasa, berenang'`), and added a precise
  `GRAMMAR_FEEDBACK['be- + r → r drops']` entry (rasa/rehat/renang). Web-verified (awalmulamy, malaytuitionsg) +
  corroborated by the app's own cikgu/scenario/mock data. See the shipped section below.
- [x] **Content-truth fix: `peN-` reference table listed `penulis` under "No change" (wrong allomorph)** —
  SHIPPED 2026-06-14 (local build loop, self-sourced, **axis-1 content-truth**, the pre-thought `▶ NEXT` of the
  kejar fix: "audit other data files"). `GRAMMAR_RULES['peN-']`'s "No change" rule (`pe- + l,m,n,r,w,y`) listed
  `penulis` as an example — but `penulis` is the **t-drop** form (root `tulis` → `pen-` + (t)ulis), already
  correctly listed under the "T drops" rule. So one word sat under **two contradictory allomorph rules** — the
  same bug class as kejar (a word filed under the wrong imbuhan rule). Fixed to `peramal` (pe- + ramal, a
  web-verified genuine no-change form, adds the `r` consonant mirroring meN-'s `merangkak`). New `grammar.test.js`
  invariant ("no derived word under two rules of the same prefix") would have caught it. See the shipped section below.
- [x] **Content-truth fix: `kejar → mengejar` taught with the WRONG imbuhan rule** — SHIPPED 2026-06-14
  (local build loop, self-sourced, **axis-1 content-truth** — the first non-test ship after the test-padding
  drift). The `prefix-meN-kejar` drill AND the `GRAMMAR_RULES['meN-']` reference table taught `mengejar` as a
  `menge- + 1-syllable` form, but **"kejar" is two syllables (ke-jar)** — `mengejar` is the **k-drop** form
  (`meng-` + kejar → k elides, exactly like `karang → mengarang`). The `menge-` allomorph applies ONLY to
  monosyllabic (ekasuku) roots — web-verified (kuihbahasa.com, cikgutancl). Re-pointed the drill `rule` to
  `'meng- + k → k drops'` (already a valid `GRAMMAR_FEEDBACK` key, so the drill's elaborative feedback is now
  correct too) and fixed the reference example `mengejar`→`mengelap` (lap = a true monosyllabic menge- form).
  New `grammar.test.js` pins the ekasuku invariant (would have caught this). See the shipped section below.
- [x] **Loop is now GOAL-driven (anti-drift) + runs forever** — SHIPPED 2026-06-14 (Kheshav-directed,
  this session). Root cause of the test-padding drift below: `LOCAL_BUILD_LOOP.md` §3B named generic test
  coverage as the *preferred* empty-queue fallback, so the loop optimized for activity. Fix: new
  **`docs/loop/GOAL.md`** (north-star + 6 measurable axes + anti-hallucination gate) is read FIRST every
  cycle; self-source mode now **assesses the app against those axes and NO-OPs when no evidenced gap clears
  the bar** — generic "add tests to pure-lib X" is demoted to *busywork, not a gap* (only critical-risk-path
  coverage counts). `scripts/build-loop.sh` defaults to a far-future cutoff (**forever**) and adds geometric
  no-op/error **backoff** (SLEEP→×2→`MAX_SLEEP` 30 min, resets on a real ship) so a "finished" app — or a
  rate-limit stall — idles cheaply instead of hot-looping. **Re-steer the loop by editing `docs/loop/GOAL.md`.**
  Gate green; backoff smoke-tested. See the shipped section below.
- [x] **Pure-lib test coverage (`cikguBot`)** — SHIPPED 2026-06-14 (local build loop). Red-proofed unit
  tests for `src/lib/cikguBot.js` — the **Malay static-mode roleplay evaluator** (live: `Roleplay.jsx`
  imports `evaluateResponse`+`generateFeedback`). All 7 exports + 2 constants pinned: score bands, the
  `length:1` empty-string gotcha, the loose imbuhan regex over-count, the **`fair`→negative feedback
  branch** fall-through, `getNextPrompt` clamp, `addTurn` immutability, `generateSessionSummary`
  strengths/suggestions gates (`Math.random`/`Date.now` seamed). Behaviour-preserving (`cikguBot.js`
  byte-identical). Self-sourced (queue empty). See the shipped section below.
- [x] **Pure-lib test coverage (`json`)** — SHIPPED 2026-06-14 (local build loop). Red-proofed unit tests
  for `src/lib/json.js` (`tryParseJSON` — the best-effort LLM-JSON parser load-bearing for AI writing
  feedback: falsy guard, object/array pass-through by reference, bare-JSON parse, prose-wrapped `{...}`
  recovery incl. multiline + code-fence, the **greedy first-`{`-to-last-`}` over-capture → null** gotcha,
  and unrecoverable→null). Behaviour-preserving (`json.js` byte-identical). Self-sourced (queue empty);
  was the pre-thought `▶ NEXT` of the `writingFormats` pin. See the shipped section below.
- [x] **Pure-lib test coverage (`writingFormats`)** — SHIPPED 2026-06-14 (local build loop). Red-proofed
  unit tests for `src/lib/writingFormats.js` (the IGCSE writing format catalogue: `listFormats` lang
  filter, `FORMATS_BY_ID` derived map + id-uniqueness, and `FORMATS` data integrity — 13 EN + 14 MS = 27,
  lang enum, word bounds, id-prefix↔lang convention). Behaviour-preserving (`writingFormats.js`
  byte-identical). Self-sourced (queue empty); next thread target = `json.js` (`tryParseJSON`). See below.
- [x] **Pure-lib test coverage (`patterns`)** — SHIPPED 2026-06-14 (local build loop). Red-proofed unit
  tests for `src/lib/patterns.js` (all 8 exports: `clusterMistakes` drill-ID classification + count-gate +
  dedup, `weakestWritingFormats`/`weakestSpeakingTopics` aggregation, `worstSpeakingSession` 30-day window
  + tiebreak via fake timers, `rollingActivity` carry-forward sparkline, `speakingBandSeries`/
  `recurringSpeakingWeakness`/`topicsDueForReattempt` language-scoped Dashboard signals). Behaviour-
  preserving (`patterns.js` byte-identical). Last name in the `interleave→pronunciation→feedback→patterns`
  thread chain. See the shipped section below.
- [x] **Pure-lib test coverage (`feedback`)** — SHIPPED 2026-06-14 (local build loop). Red-proofed unit
  tests for `src/lib/feedback.js` (`buildDrillFeedback`/`buildTenseFeedback`/`buildVocabFeedback` + the
  full `buildSessionFeedback` branch routing — incl. the `examDate`→`daysToExam` goal lines via fake
  timers). Behaviour-preserving (`feedback.js` byte-identical). See the shipped section below.
- [x] **Pure-lib test coverage (`pronunciation`)** — SHIPPED 2026-06-14 (local build loop). Red-proofed
  unit tests for `src/lib/pronunciation.js` (`scorePronunciation` word-status/score/tip-selection +
  `generatePracticeSentences` filter/cap/mapping — counts & shapes, never shuffle order). Behaviour-
  preserving (`pronunciation.js` byte-identical). See the shipped section below.
- [x] **Reader Select-mode card direction follows `studyLang`** — SHIPPED 2026-06-14 (local build loop).
  New pure `cardSidesFor` (`src/lib/selectionToCard.js`, routes through `glossPlanFor`) + `SelectionToCard.jsx`
  wired to it: an English learner's Select-mode save now files an English-target `{ m:English, e:Malay-gloss,
  lang:'en' }` card (was filed backwards/`m:Malay`); `studyLang='ms'` byte-identical. TDD red-proofed
  (+6 behavioural tests). See the shipped section below.
- [x] **Pure-lib test coverage (`interleave`)** — SHIPPED 2026-06-14 (local build loop). Red-proofed unit
  tests for `src/lib/interleave.js` (`getMixedSessionSummary` + `buildMixedSession`'s ratio/target math —
  counts, not shuffle order). Behaviour-preserving (`interleave.js` byte-identical). See the shipped
  section below.
- [x] **AWL Sublist 2 academic seed** — SHIPPED 2026-06-14 (local build loop). See the shipped section
  below: `src/data/academicEn2.js` (own 5.13 KB lazy chunk) + `seedAcademicEnglish2` action + a labelled
  second "Academic English 2" deck row in Settings. Web-verified Malay glosses; gate green.
- [x] **AWL Sublist 3 academic seed** — SHIPPED 2026-06-14 (local build loop). `src/data/academicEn3.js`
  (own 5.23 KB lazy chunk) + `seedAcademicEnglish3` action + a third "Academic English 3" deck row in
  Settings. Web-verified glosses; gate green. See the shipped section below.
- [x] **Voice/locale leak audit** — SHIPPED 2026-06-14 (local build loop). Full sweep done: fixed the one
  remaining genuine English-card leak (`SelectionToCard` Pronounce button), structural pin added. The other
  hardcoded `ms-MY` spots are correct-by-design (Malay-domain: CikguBot/WordFamilyTree/SavedWordPopover) or
  already `lang`-aware ternaries. Re-add this item only if a NEW surface introduces a leak. See below.
- [x] **Pure-lib test coverage** — SHIPPED 2026-06-14 (local build loop). Pinned `src/lib/diff.js`
  (`computeWordDiff`, the pronunciation colored-diff LCS) with +12 grounded, red-proofed tests. Behaviour-
  preserving (diff.js byte-identical). REPEATABLE — ~20 untested pure helpers remain (next: `interleave`,
  `pronunciation`, `feedback`, `patterns`); re-add a `[ ]` to queue another. See below.

---

## ✅ Content-truth fix — Cikgu Maya `imbuhan-ber` taught the `be-` allomorph with a conflated/wrong rule — SHIPPED 2026-06-14 (local build loop)

**Axis-1 (content-truth) gap — self-sourced (queue empty), the pre-thought `▶ NEXT` that BOTH the imbuhan-men and
berasa ships flagged: "the still-muddled `ber-` be- notation — needs a grounded ruling before touching, like the
berasa drill did."** This cycle did the grounded ruling and the matching axis-1 sweep. **Web-verified each suspect
before acting** (a confident-wrong change is worse than no change): the `cikguKnowledge.js` **peribahasa bank** —
checked "Bulat air kerana pembetung, bulat **manusia** kerana muafakat" (→ `maksudperibahasa.com` lists both "bulat
kata" AND "bulat manusia" as valid DBP variants; meaning correct → **no change**, false-positive avoided) and "Alah
bisa tegal biasa" (correct) → clean; the **`common-mistakes`** entry (membantu/mengambil/mempunyai-exception, di-/di,
dari/daripada, seekor/sebuah, bahawa-not-bahwa) → all correct; and **`grammarEng.js`** (never audited — all 60+
tense/SVA/article/confusable/error-ID/transform drills) → every answer key correct. The one real gap was in
`src/data/cikguKnowledge.js:78`.

The `imbuhan-ber` (`Awalan ber-`) entry's `be-` variation bullet is **rendered verbatim to the student**
(`formatKnowledgeResponse` returns `entry.answer`). It read:

> `- **be-** → before r + consonant: bekerja (NOT berkerja), berenang`

**That conflates two distinct allomorph rules under one inaccurate label.** `ber-` reduces to `be-` in two separate
cases: (1) the root **starts with `r`** (`renang → berenang`, the prefix's r dropping to avoid `berr-`); (2) the
root's **first syllable ends in `-er`** (`kerja → bekerja`, avoiding `-er-...-er-`). "before r + consonant" describes
neither cleanly — `renang` is r + a vowel (not "r + consonant"), and `kerja`'s case is the `-er-` first-syllable rule.
The **forms were correct**, but the *taught rule* was wrong — the exact same conflation the app already
grounded-and-fixed in `grammar.js` (the `prefix-ber-asa` berasa fix: `be- + r → r drops` for r-initial roots vs the
`-er-` first-syllable case in `GRAMMAR_RULES['ber-']`). So `cikguKnowledge.js` was internally inconsistent with the
app's own already-corrected reference table — the same bug class as `penulis` (two rules) and `kejar` (wrong rule).

- **Web-verified** before shipping (not memory): `ber- → be-` when the root begins with **r** (berambut, beragam)
  OR its first syllable ends in **-er** (bekerja, beserta, beternak) —
  [Bobo · Bentuk Awalan 'Ber-' yang Berubah Menjadi 'Be-'](https://bobo.grid.id/read/084165454/bentuk-awalan-ber-yang-berubah-menjadi-be-materi-bahasa-indonesia?page=all),
  [malaytuitionsg · Fungsi Kata Imbuhan beR-](https://malaytuitionsg.com/fungsi-kata-imbuhan-ber/). **Corroborated by
  the app's OWN data:** `grammar.js`'s `GRAMMAR_RULES['ber-']` + the shipped `prefix-ber-asa` drill already file
  `berasa`/`bekerja` under exactly this split.
- **Fix (surgical, 1 data line):** `→ before r + consonant: bekerja (NOT berkerja), berenang` →
  `→ when the root starts with **r** (renang → berenang), or its first syllable ends in **-er** (kerja → bekerja, NOT berkerja)`.
  *Decision/why:* name both web-verified conditions accurately, each example under the right condition. *Veto note:*
  considered leaving it (a prior cycle deferred it as "imprecise, not clearly wrong") — but that deferral was pending
  a grounded ruling, now in hand; also considered splitting into two bullets — rejected as a larger diff that breaks
  the entry's one-bullet-per-variation structure.
- **Scoring-neutral (gate-calibration safe):** the `answer` feeds keyword scoring only via *presence*
  (`answerLower.includes(w)` → +1, not per-occurrence). `bekerja`/`berkerja`/`berenang` all remain present; the edit
  only adds tokens (renang/kerja/starts/syllable). No gold/real query is keyed on those, so the confidence-gate
  calibration (`MIN_CONFIDENCE`) and all gate tests are unaffected (23/23 in this file green).
- **TDD (red-proofed):** new `src/data/__tests__/cikguKnowledge.test.js` block (+4) over `getEntryById('imbuhan-ber').answer`:
  the `be-` line carries both examples + the wrong form `berkerja`; does **NOT** use the inaccurate "r + consonant"
  label; **names the r-initial-root condition** ("start"); **names the -er- first-syllable condition** ("-er").
  Watched **3 of 4 FAIL first** against the pre-fix data (the label, "start", "-er" assertions) while the existence
  test PASSED (non-vacuity — bekerja/berenang/berkerja all present pre-fix), then all 4 green after the fix.
- **Verified:** build green (`index` unchanged — data file) · **1597** unit tests (+4) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no schema/free-path break; pure content fix.** e2e skipped by
  design — a single rule-bullet string edit in existing data is no layout/flow change (the content test + unit gate
  cover it); CI runs e2e on push.
- **▶ NEXT:** the meN-/peN-/ber- allomorph tables across BOTH `grammar.js` and `cikguKnowledge.js` are now internally
  consistent and guarded. Remaining unexhausted axis-1 content-truth threads: `scenarios.js` (Malay/English roleplay
  model answers + `keyImbuhan`), `exemplars.js` (band-6 writing exemplars), `listeningPassages.js` answer keys, and
  the `imbuhan-pen`/`golongan-kata`/`kata-ganda` cikgu entries — each needs a grounded web-verified audit; pick the
  single biggest evidenced wrong item or NO-OP if clean.

---

## ✅ Content-truth fix — Cikgu Maya `imbuhan-men` answer garbled the p-drop rule — SHIPPED 2026-06-14 (local build loop)

**Axis-1 (content-truth) gap — self-sourced (queue empty), the pre-thought `▶ NEXT` of the grammar.js/comprehension
content-truth ships ("grounded content audits of the OTHER answer-bearing data files").** This cycle audited the
named threads first: `listeningPassages.js` (answer keys all internally consistent — incl. `991`, the real
Malaysian Civil Defence/APM flood line), `scenarios.js` (fluent Malay model answers + correct `keyImbuhan`),
`exemplars.js` (high-quality band-6 Malay/English), and `dictionary.js` (825 glosses — clean). The bug was in the
**Cikgu Maya expert knowledge base**, `src/data/cikguKnowledge.js:38`.

The `imbuhan-men` (`Awalan meN-`) entry's `answer` is **rendered verbatim to the student** (`formatKnowledgeResponse`
returns `entry.answer`, `cikguKnowledge.js:1462`). Its p-drop rule bullet read:

> `- **mem- (p drops)** before p → menulis ❌ mempulis → **memukul** (p→m: pukul→memukul)`

**That is a garbled, confident-wrong grammar lesson.** The p-drop rule's example was corrupted with `menulis` (a
**t-drop** word from root `tulis` — it belongs to the *next* bullet, `men- (t drops) before t → menulis`) and the
**nonsense token `mempulis`**. The rule it teaches is correct (meN- + a p-initial root drops the p — the KPST/luluh
rule), but the *illustration* was scrambled: a student reading it sees `menulis` filed under the p-drop rule and a
non-word `mempulis`, instead of the clean `pukul → memukul`. Same confident-wrong bug class as the kejar/penulis/
berasa grammar.js fixes.

- **Web-verified** before shipping (not memory): meN- + p-initial → the **p luluh** (drops, prefix surfaces as
  `mem-`): `pukul → memukul`, the wrong form being `mempukul`/`mepukul` —
  [Kompas · Peluluhan Kata Dasar Berawalan KPST](https://edukasi.kompas.com/read/2021/01/08/144019571/peluluhan-kata-dasar-berawalan-kpst?page=all),
  [BahasaMelayuOnline · Awalan meN-](https://bahasamelayuonline.com/tatabahasa/imbuhan/awalan/). **Corroborated by
  the app's OWN data:** `writingErrorsMalay.js:96-98` ("'mempukul' — base 'pukul' loses p with meN-. Use 'memukul'.")
  and `scripts/ai-tier-eval/goldWriting.mjs:54` ("meN- + p → p drops: 'memukul'.") — so the genuine wrong form is
  `mempukul`, never `mempulis`. The entry's own `examples` array (`{ root:'pukul', derived:'memukul' }`) and the
  "Quick Memory Trick" (`P T S K drop … → memukul`) were already correct — only the rule bullet was garbled.
- **Fix (surgical, 1 data line):** `→ menulis ❌ mempulis → **memukul** (p→m: pukul→memukul)` →
  `→ **memukul** (NOT ❌ mempukul; p→m: pukul→memukul)`.
  *Decision/why:* keep the author's ❌-contrast teaching intent (the p-drop case is the one students most often get
  wrong) but with the *correct* wrong-form token `mempukul` — which matches what the app's own writing-error checker
  flags — and drop the misplaced `menulis`. *Veto note:* considered stripping the ❌ entirely to mirror the plain
  sibling bullets (no contrast), but the explicit "NOT mempukul" is pedagogically stronger for the highest-error
  allomorph and is consistent with `writingErrorsMalay.js`; kept it.
- **Scoring-neutral (gate-calibration safe):** the `answer` feeds keyword scoring only via *presence*
  (`answerLower.includes(w)` → +1, not per-occurrence; `cikguKnowledge.js:1355-1357`). `menulis` and `memukul`
  remain present elsewhere in the answer, so no real/gold query's score changes; only the nonsense `mempulis` was
  removed and the rare in-coverage `mempukul` added. The confidence-gate calibration (MIN_CONFIDENCE ∈ [32,48]) and
  all gate tests are unaffected.
- **TDD (red-proofed):** new `src/data/__tests__/cikguKnowledge.test.js` block (+4) over `getEntryById('imbuhan-men').answer`:
  the p-drop line illustrates `pukul → memukul`, does **NOT** misfile `menulis` under the p-drop rule, and the answer
  contains no `mempulis` token anywhere. Watched the `menulis`-in-p-drop-line + `mempulis` assertions **FAIL first**
  against the pre-fix data (2 failed / 2 passed — the has-line + pukul→memukul checks passed pre-fix, proving
  non-vacuity), then all 4 green after the fix.
- **Verified:** build green (`index` unchanged — data file) · **1593** unit tests (+4) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no schema/free-path break; pure content fix.** e2e skipped by
  design — a single rule-bullet string edit in existing data is no layout/flow change (the content test + unit gate
  cover it); CI runs e2e on push.
- **▶ NEXT:** the imbuhan tables across `grammar.js` AND `cikguKnowledge.js` are now internally consistent and
  guarded. A lower-confidence loose spot remains in `cikguKnowledge.js`'s `imbuhan-ber` entry (line 78: the
  `be- → before r + consonant: bekerja … berenang` rule conflates the r-initial-root case (berenang/berasa) with the
  -er- first-syllable case (bekerja) — the *forms* are correct, only the *rule wording* is imprecise; needs a
  grounded ruling before touching, like the berasa drill did). Strongest fresh axis-1 threads: `common-mistakes` +
  the `peribahasa` bank in `cikguKnowledge.js` (proverb spellings/meanings — one was already caught + fixed
  pembentung→pembetung), and `grammarEng.js` English drills.

---

## ✅ Content-truth fix — comprehension answer key mislabeled the affix on `memakan` — SHIPPED 2026-06-14 (local build loop)

**Axis-1 (content-truth) gap — self-sourced (queue empty), the pre-thought `▶ NEXT` thread of the grammar.js
content-truth ships ("content-truth audits of other data files: `scenarios`, `exemplars`,
`comprehensionPassages`").** Audited `grammarEng.js` (clean) and `grammar.js` (now internally consistent after
the meN-/peN-/ber- fixes), then `comprehensionPassages.js` — and found one confident-wrong **graded** key.

The `kesihatan` (Healthy Lifestyle) passage's question 5 — *"apakah imbuhan pada 'memakan'?"*
(`comprehensionPassages.js:298–305`) — listed options `['A) me-', 'B) meN-...-kan', 'C) ber-', 'D) di-']` with
**`correctIndex: 1`** (`B) meN-...-kan`) and an explanation that invented *"(-kan implied transitive)"*.

**That is wrong content.** The passage word is **`memakan`** (`Kita harus memakan lebih banyak sayur-sayuran`),
which is **`meN-` + `makan`** with **NO suffix**: `makan` is m-initial — one of the `l/m/n/r/w/y` no-change
consonants — so the prefix surfaces as **`me-`**, identical to the app's own `memasak` = me- + masak
(`grammar.js:145`). A `-kan` form would be `memakankan`, not the passage word. So the correct option is
**`A) me-` (index 0)**. `correctIndex` IS the graded key (`Comprehension.jsx:202` compares the learner's choice
to it; `:240` renders `options[correctIndex]` as "Correct:"), so a student who **correctly** picked `me-` was
marked **wrong** and shown a fabricated rule — the confident-wrong failure axis-1 ranks highest.

- **Web-verified** before shipping (not memory): memakan = prefix `me-` + makan, no `-kan` —
  [Kompasiana · imbuhan pada "makan"](https://www.kompasiana.com/suprihadi48660/6330ccc34addee4d724b3e82/pemberian-imbuhan-pada-kata-makan).
  Internally corroborated by `grammar.js`'s own no-change rule (`memasak`, `menanti`) and by the sibling Q in the
  `keluarga` passage (`mempunyai` = meN-...-i, correct).
- **Fix (surgical — 2 data lines):** `correctIndex: 1` → `0`; explanation →
  *'"Memakan" = meN- + makan. The root "makan" begins with m (one of l/m/n/r/w/y), so the prefix stays "me-"
  with no change — there is no -kan suffix.'* The **word/options/passage/referenceText are untouched** — only the
  mismarked key + the wrong explanation changed.
  *Decision/why:* flip the key to the already-present correct option `A) me-` and de-fabricate the explanation,
  rather than rewrite the question or swap the word — the word is fixed by the passage and `me-` is the genuinely
  correct affix among the options, so this is the minimal correction. *Veto note:* considered swapping the asked
  word to one that truly has meN-...-kan (e.g. `menghabiskan`) to keep the key non-trivial — rejected as a
  needlessly larger diff; the question is pedagogically fine once the key is right.
- **TDD (red-proofed):** NEW `src/data/__tests__/comprehensionPassages.test.js` (+5) — the `kesihatan` "memakan"
  Q resolves to `A) me-` (`correctIndex 0`); the explanation carries no fabricated `-kan` suffix / "implied"
  hand-wave and affirms the me- prefix; PLUS an **answer-key-integrity invariant** over the WHOLE bank (every
  question's `correctIndex` is an integer in `[0, options.length)` resolving to a non-empty option) + unique
  question ids per passage. Watched the 2 fix-specific tests FAIL first against the pre-fix data (`git stash` the
  fix → `correctIndex` 1 → `B) meN-...-kan`; explanation contained the fabrication) while the 3 integrity/existence
  tests passed (non-vacuity — the rest of the bank is already clean), then all 5 green after the fix.
- **Verified:** build green (`index` unchanged — data file) · **1589** unit tests (+5) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no schema/free-path break; pure content fix.** e2e skipped by
  design — a single key + explanation string edit in existing data is no layout/flow change (the content test +
  unit gate cover it); CI runs e2e on push.
- **▶ NEXT:** `grammarEng.js` + `grammar.js` + `comprehensionPassages.js` are now content-audited and clean (the
  English passages were already correct on this pass). Strongest remaining axis-1 content-truth threads:
  `scenarios.js` (Malay/English model roleplay answers), `exemplars.js` (band-6 writing exemplars), and
  `listeningPassages.js` — none audited yet for wrong glosses/grammar in their answer-bearing content.

---

## ✅ Content-truth fix — `ber- + asa → berasa` drill taught the WRONG root (`asa`, not `rasa`) — SHIPPED 2026-06-14 (local build loop)

**Axis-1 (content-truth) gap — self-sourced (queue empty), the pre-thought `▶ NEXT` flagged by BOTH prior
content-truth ships (kejar, peN-) as "the still-muddled `ber- + asa → berasa` notation — needs a grounded
ruling before touching."** Grounded ruling done. `src/data/grammar.js` taught `berasa` ("to feel") two
**contradictory** ways:

- **Drill (line 37):** `{ root:'asa', answer:'berasa', rule:'ber- + asa → berasa', hint:'ber- + asa' }` — treats
  `berasa` as plain `ber-` + a vowel-initial root `asa`.
- **Reference table `GRAMMAR_RULES['ber-']` (line 157):** files `berasa` under `pattern:'be- + r-initial syllable'`,
  `note:'Avoids ber-r'` (next to `bekerja`) — i.e. the root starts with **`r`** (`rasa`), the opposite analysis.
  Its example string `'bekerja, berasa → berasa'` was also **garbled** (the self-arrow `berasa → berasa` says nothing).

**The drill was wrong.** `berasa` (to feel/taste) = `ber-` + **`rasa`**; the prefix `ber-` reduces to `be-` before
an **r-initial root** (its own r drops to avoid `berrasa`): `be- + rasa → berasa`, `be- + rehat → berehat`,
`be- + renang → berenang` — the same be-reduction family as the app's own `bekerja`. `asa` is a *separate* word
("hope"; `putus asa`). `drill.rule` is **shown to the student** (Grammar.jsx line 588 `Rule: {fb.rule}` + read
aloud line 574) AND keys the elaborative feedback, so the drill displayed a confident-wrong morphology lesson and
contradicted the app's own reference table one section below — the same internal-contradiction bug class as
`penulis` (two rules) and `kejar` (wrong rule).

- **Web-verified** before shipping (not memory): ber- → be- before an r-initial root (berasa = be- + rasa,
  berenang, berehat) — [awalmulamy](https://awalmulamy.blogspot.com/2021/02/perkataan-bermula-huruf-ber.html),
  [malaytuitionsg · fungsi imbuhan beR-](https://malaytuitionsg.com/fungsi-kata-imbuhan-ber/). Corroborated by the
  app's OWN data: `cikguKnowledge.js:943` "Saya **berasa** tidak sihat" (= I feel unwell); `aiMocks.js:12` "use
  'saya **berasa**' instead of 'saya **rasa**'" (ties berasa→root rasa); many `scenarios.js` uses.
- **Fix (surgical — 3 data edits):** (1) drill → `root:'rasa'`, `rule:'be- + r → r drops'` (matches the file's
  `'{form} + {letter} → {letter} drops'` convention, e.g. `meng- + k → k drops`), `hint:'ber- + rasa'`; **answer
  `berasa` UNCHANGED** (only the taught root/reason changed). (2) reference example
  `'bekerja, berasa → berasa'`→`'bekerja, berasa, berenang'` (degarbled; 3 web-verified be-/r forms, matches
  sibling-row format; pattern + note kept). (3) NEW `GRAMMAR_FEEDBACK['be- + r → r drops']` in `feedbackRules.js`
  (examples rasa→berasa / rehat→berehat / renang→berenang) so the drill's elaborative feedback is grounded
  (axis-2: immediate specific feedback) — `relatedRule` cross-links the kerja `-er-` case.
  *Decision/why:* added a dedicated feedback key rather than reuse `'be- + kerja (r-initial syllable)'` — that
  key's text literally says "kerja" and would display wrongly on a `rasa` drill; `rasa` is the distinct
  r-initial-ROOT case. *Veto note:* considered swapping the drill to `berenang` to dodge the rasa/asa surface
  ambiguity, but `berasa` is high-frequency and heavily used across the app — preserving it with the correct root
  is more surgical and keeps the drill's identity.
- **TDD (red-proofed):** new `grammar.test.js` block (+3): the `prefix-ber-asa` drill (`root:'rasa'`,
  `answer:'berasa'`, `rule:'be- + r → r drops'`, hint `/rasa/`); the reference example is NOT garbled
  (`!/berasa → berasa/`) and lists `berasa`+`bekerja`; the drill's `rule` resolves to a real `GRAMMAR_FEEDBACK`
  entry whose examples include `berasa` (no dangling key). Watched all 3 FAIL first against the pre-fix data
  (root was 'asa', example garbled, rule not a feedback key), then green after the fix. `feedback.test.js` (38,
  by-reference key tests) still green → the new feedback entry is additive.
- **Verified:** build green (`index` unchanged — data file) · **1584** unit tests (+3) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no schema/free-path break; pure content fix.** e2e skipped by
  design — string edits in an existing drill/reference list are no layout/flow change (the content test + unit
  gate cover it); CI runs e2e on push.
- **▶ NEXT:** the meN-/peN-/ber- allomorph tables are now internally consistent and guarded by cross-rule
  invariants. Strongest remaining axis-1 threads = grounded content audits of the OTHER data files that ship
  answer-as-content: `scenarios.js` (model answers), `exemplars.js` (band-6 writing), `comprehensionPassages.js`,
  and `grammarEng.js` (English drills, not yet audited for parity bugs).

---

## ✅ Content-truth fix — `peN-` reference table listed `penulis` under "No change" (wrong allomorph) — SHIPPED 2026-06-14 (local build loop)

**Axis-1 (content-truth) gap — self-sourced (queue empty), the pre-thought `▶ NEXT` of the kejar fix
("audit other data files for wrong morphology").** The `peN-` (doer-noun prefix) reference table in
`src/data/grammar.js` — rendered on the Grammar page — taught one word under **two contradictory rules**:

- `GRAMMAR_RULES['peN-']` rule #0 (`pe- + l, m, n, r, w, y`, note **"No change"**) listed `penulis` as an example.
- `GRAMMAR_RULES['peN-']` rule #2 (`pen- + c, d, j, t`, note **"T drops!"**) ALSO lists `penulis` — correctly.

**Rule #0 is wrong.** `penulis` (writer) is built from root **`tulis`** (t-initial), where the **t drops**
(`pen-` + (t)ulis → `penulis`) — the t-drop rule, NOT a no-change form. The app's OWN data already defines this
everywhere else (drill `prefix-peN-tulis` has `root:'tulis'` + `rule:'pen- + t → t drops'`; `cikguKnowledge.js`
says "pen- (t drops) before t → penulis"). The "No change" allomorph applies only to roots starting
l/m/n/r/w/y, where nothing drops. Listing `penulis` there mis-taught the morphology — a confident-wrong lesson
(the worst failure for a learning tool), and it contradicted the app's own t-drop rule one line below.

- **Web-verified** before shipping (not memory): peN- stays `pe-` (no change) only before l/m/n/r/w/y
  (pelari, peramal, pelukis); t-initial native roots drop the t —
  [BM Tatabahasa · imbuhan pe-](https://sites.google.com/site/bmalaysiatatabahasa/imbuhan/pe) ("Pe– tidak
  berubah jika bertemu huruf n, l, m"; t "luluh"). Web search also confirmed `peramal` = pe- + ramal (no change).
- **Fix (surgical, 1 word):** rule #0 example `pelukis, pemasak, penulis` → `pelukis, pemasak, peramal`.
  *Decision/why:* `peramal` (pe- + ramal = forecaster) is a verified clean no-change form that adds the `r`
  consonant, mirroring the meN- table's `merangkak` (r); `pelukis` already covers `l`. *Veto note:* considered
  `pelari` (also correct) but it duplicates the `l` example — `peramal` gives better consonant spread at equal
  correctness. The answer key `penulis` (now only under the t-drop rule) and every drill are untouched.
- **TDD (red-proofed):** extended `src/data/__tests__/grammar.test.js` (+4) with a generalizable invariant —
  *no derived word may appear under two different rules of the same prefix's allomorph table* (run over BOTH
  `meN-` and `peN-`) — plus the specific `penulis`-only-in-t-drop and `peramal`-present pins. Watched the
  `peN-` branch FAIL first (`"penulis" appears under two peN- rules (#0 and #2)`) while the `meN-` branch
  PASSED (non-vacuity: the invariant isn't always-failing), then all green after the fix.
- **Verified:** build green (`index` unchanged — data file) · **1581** unit tests (+4) · lint 0 errors
  (same 3 pre-existing warnings). **No STORE_VERSION bump; no schema/free-path break; pure content fix.**
  e2e skipped by design — a single text token in an existing reference list is no layout/flow change (the
  content test + unit gate cover it).
- **▶ NEXT:** the meN-/peN- tables are now internally consistent (the new cross-rule invariant guards them).
  Strongest remaining axis-1 threads: grounded content audits of `scenarios.js`, `exemplars.js`,
  `comprehensionPassages.js`, and the still-muddled `ber- + asa → berasa` notation (line 37 + `GRAMMAR_RULES['ber-']`'s
  `'berasa → berasa'` example — ambiguous root `rasa` vs `asa`; needs a grounded ruling before touching).

---

## ✅ Content-truth fix — `kejar → mengejar` was taught with the WRONG imbuhan rule — SHIPPED 2026-06-14 (local build loop)

**Axis-1 (content-truth) gap — self-sourced (queue empty), the first non-test ship after ~8 cycles of
pure-lib test-padding that `GOAL.md` flags as busywork.** The Malay grammar drills mis-taught the
morphology of `mengejar` in two places in `src/data/grammar.js`:

- The `prefix-meN-kejar` drill (`kejar → mengejar`) carried `rule: 'menge- + 1-syllable'`.
- `GRAMMAR_RULES['meN-']` listed `mengejar` as a `menge- + 1-syllable` reference example.

**Both are wrong.** "kejar" is **two syllables** (ke-jar), so `mengejar` is the **k-drop** form
(`meng-` + kejar → the initial k elides → `meng·ejar`), identical to the app's own `karang → mengarang`
drill. The `menge-` allomorph applies **ONLY to monosyllabic (ekasuku) roots** — cat→mengecat,
lap→mengelap, bom→mengebom. A student drilling this was taught that "kejar" is monosyllabic and that
menge- is its rule — a confident-wrong morphology lesson (the worst failure for a learning tool).

- **Web-verified** before shipping (not memory): menge- = one-syllable roots only —
  [Kuih Bahasa](https://kuihbahasa.com/imbuhan-men/),
  [Cikgu Tan CL](http://cikgutancl.blogspot.com/2016/02/informasi-bahasa-imbuhan-menge-dan.html).
- **Fix (surgical, 2 lines):** drill `rule` → `'meng- + k → k drops'` (already a valid `GRAMMAR_FEEDBACK`
  key in `feedbackRules.js`, so the drill's elaborative feedback now correctly shows the karang/kira/kupas
  k-drop family instead of the menge- explanation); reference example `mengejar` → `mengelap` (lap, a true
  monosyllabic menge- form already used elsewhere in the file). The **answer stays `mengejar`** — only the
  taught *reason* changed. `feedbackRules.js`'s own menge- examples were already correct (cat/lap/bom).
- **TDD (red-proofed):** new `src/data/__tests__/grammar.test.js` (+3) pins the general ekasuku invariant
  (every drill tagged `menge- + 1-syllable` must have a 1-vowel-group root — this is what caught the bug),
  the specific kejar drill (answer `mengejar` + k-drop rule + 2-syllable root), and that the reference
  example excludes `mengejar`/includes `mengelap`. Watched all 3 FAIL first against the pre-fix data, then
  green after the fix.
- **Verified:** build green (`index` unchanged — data file) · **1577** unit tests (+3) · lint 0 errors
  (same 3 pre-existing warnings). **No STORE_VERSION bump; no schema/free-path break; pure content fix.**
- **▶ NEXT:** the rest of `grammar.js`/`grammarEng.js` looked sound on this pass (the loanword-t rules —
  mentadbir/menterjemah keeping their t — are correctly handled). The `ber- + asa → berasa` drill (line 37)
  and the `be-` example notation in `GRAMMAR_RULES['ber-']` are slightly muddled but not clearly wrong —
  flag for a future grounded audit, don't auto-change. Content-truth audits of other data files
  (`scenarios`, `exemplars`, `comprehensionPassages`) are the strongest remaining axis-1 thread.

---

## ✅ Pure-lib test coverage — `cikguBot.js` (Malay static-mode roleplay evaluator) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for `src/lib/cikguBot.js` — the rule-based Malay conversation evaluator
that scores an IGCSE Paper 3 speaking turn when the AI quota is exhausted. **`Roleplay.jsx` imports
`evaluateResponse` + `generateFeedback`**, yet it had **no dedicated test file**, so its scoring bands,
feedback branch routing, and session aggregation were all unpinned. **It is byte-identical** (tests only
— no app behaviour change). Self-sourced (queue empty); plan:
`docs/superpowers/plans/2026-06-14-cikgubot-test-coverage-plan.md`.

- **`src/lib/__tests__/cikguBot.test.js` (+27):**
  - **`evaluateResponse` (8):** the `needs_work`/`fair`/`good`/`excellent` bands; each scoring tier; the
    `''`/`'ok'` → `length:1` **split-on-whitespace gotcha**; the **loose imbuhan regex** over-counting
    real false positives (`"selamat"`+`"pagi"` → `imbuhanCount:2`); the `Math.min` 100-cap.
  - **`generateFeedback` (7):** band routing incl. the key **`fair`→negative branch fall-through** (only
    `excellent`/`good` are special-cased); the three "good" targeted suffixes appended in order; default
    persona = casual. `Math.random` seeded to 0 so the exact first-element string is asserted.
  - **`getNextPrompt` (3):** topic routing, unknown-topic→general fallback, the out-of-range `Math.min`
    clamp to the last prompt.
  - **`initializeConversation` (2):** persona name/greeting, empty turns, `startTime` (fake timers).
  - **`addTurn` (2):** **immutability** of the input conversation (original untouched), score
    accumulation, turn shape + `timestamp`.
  - **`generateSessionSummary` (3):** the empty-turns "Belum Bermula" placeholder; multi-turn
    strengths/suggestions gates + the avg-band `quality` ladder (`Sangat Bagus`/`Bagus`/`Boleh Lagi`);
    `durationSeconds` via fake timers.
  - **constants (2):** `CIKGU_PERSONAS` (casual+formal banks), `VOCABULARY_CATEGORIES` (6 buckets).
- **Grounded, not guessed:** every expected value was captured from the function's **real output** via a
  node probe **before** the assertions were written. Malay strings are pinned **verbatim from the shipped
  source** (this is coverage of existing content, not new content needing web-verification).
- **Red-proofed (non-vacuity):** mutated two SUT behaviours at once — greeting score `+15`→`+25` AND
  routed `'fair'` into the neutral `good` branch → **exactly 3 matching tests failed** (`evaluateResponse`
  35→45, the `addTurn` score accumulation, and the `fair`-fall-through feedback), the other 24 stayed
  green. Restored byte-identical (`git checkout`, zero diff) → 27/27 green.
- **Verified:** build green (`index` unchanged) · **1574** unit tests (+27) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** the named `examReadiness`/`skillBalance`/`passageOrder` candidates already
  have tests, and there is no `confidence.js` — the genuinely-untested **pure** helpers left are
  `speakingCoach.js` (`buildCoachPrompt`/`cleanCoachText`) and `dictionaryIcon.js`
  (`getDictionaryIcon`/`hasDictionaryIcon`). Re-add a `[ ] Pure-lib test coverage` item to queue another.

---

## ✅ Pure-lib test coverage — `json.js` (`tryParseJSON`, the best-effort LLM-JSON parser) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for `src/lib/json.js` — the best-effort JSON parser that survives common
LLM output quirks (object/array pass-through, bare JSON, prose-wrapped `{...}` recovery). It is
**load-bearing for AI writing feedback** (`src/hooks/useWritingEvaluator.js` parses the model response
through it), yet had **no dedicated test file**. It was the pre-thought `▶ NEXT` target named in the
`writingFormats` pin. **It is byte-identical** (tests only — no app behaviour change). Self-sourced
(queue empty); plan: `docs/superpowers/plans/2026-06-14-json-test-coverage-plan.md`.

- **`src/lib/__tests__/json.test.js` (+15):**
  - **Falsy guard (3):** `''` / `null` / `undefined` → `null`.
  - **Object pass-through, no clone (2):** an already-parsed object returns the **same reference**
    (`toBe`); an already-parsed **array** also passes through by reference — the `typeof [] === 'object'`
    gotcha the `▶ NEXT` thread flagged.
  - **Bare JSON parses normally (3):** object string `{"a":1}`, array string `[1,2,3]`, and a bare
    primitive `'123'` → `123` (first-try parse, no recovery).
  - **Prose-wrapped `{...}` recovery (4):** extracts the object from surrounding prose; recovers a
    **multiline** object (`[\s\S]` spans newlines); recovers from a ```` ```json … ``` ```` **code
    fence** (a common LLM quirk); recovers a **nested** object when the last `}` is the real closer.
  - **Unrecoverable → null (3):** the **greedy first-`{`-to-last-`}` over-capture** of two separate
    objects in prose (`'{"a":1} text {"b":2}'`) → `null` (the regex spans both, invalid JSON — the key
    gotcha); no-braces prose → `null`; malformed brace content (`'{not valid json}'`) → `null`.
- **Grounded, not guessed:** every expected value was captured from the function's **real output** via a
  node probe **before** writing the assertions; pass-through asserted by reference (`toBe`), recovery by
  value (`toEqual`). Skipped incidental JS coercion edges (number/boolean inputs) — not part of the
  contract or the real consumer's usage (it only passes strings/objects).
- **Red-proofed (non-vacuity):** mutated two SUT behaviours at once — greedy regex `/\{[\s\S]*\}/` →
  non-greedy `/\{[\s\S]*?\}/` AND the object branch `return text` → `return null` → **exactly the 4
  matching tests failed** (object + array pass-through, nested recovery, greedy over-capture); the other
  11 stayed green. Restored byte-identical (`git checkout`, zero diff) → 15/15 green.
- **Verified:** build green (`index` unchanged) · **1547** unit tests (+15) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** ~14 untested pure `src/lib/` helpers remain — candidate next targets:
  `confidence`, `examReadiness`, `skillBalance`, `passageOrder`. Re-add a `[ ] Pure-lib test coverage`
  item to queue another.

---

## ✅ Pure-lib test coverage — `writingFormats.js` (IGCSE writing format catalogue) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for `src/lib/writingFormats.js` — the lightweight format catalogue split
out of `writingGrader.js` so the Dashboard (`RecentPerformance`) and `MistakeJournal` can list formats
without dragging in the 700-line grader. **3 consumers** (writingGrader, Dashboard, MistakeJournal), and
it had **no dedicated test file**. **It is byte-identical** (tests only — no app behaviour change).
Self-sourced (queue empty); plan: `docs/superpowers/plans/2026-06-14-writing-formats-test-coverage-plan.md`.

- **`src/lib/__tests__/writingFormats.test.js` (+14):**
  - **`listFormats` (5):** no-arg → all 27 (the `!lang` short-circuit); falsy lang (`undefined`/`null`/
    `''`) → all 27; `'eng'` → 13 (all `lang:'eng'`); `'malay'` → 14 (all `lang:'malay'`); unknown
    `'french'` → `[]` (no throw).
  - **`FORMATS_BY_ID` (3):** `Object.keys().length === FORMATS.length === 27` (pins **id uniqueness** — a
    dup id would collapse the map); a known id maps **by reference** to its FORMATS entry; absent id →
    `undefined`.
  - **`FORMATS` data integrity (6):** exact split 13 EN + 14 MS = 27; non-empty string `id`+`label`;
    `lang` ∈ `{eng, malay}`; word bounds are numbers with `0 < minWords < maxWords`; `markers`+
    `requiredHints` are non-empty arrays of non-empty strings; **id-prefix↔lang** (`eng-*` ⇒ eng,
    `ms-*` ⇒ malay).
- **Grounded, not guessed:** the counts 13/14/27 are hand-typed LITERALS (NOT `FORMATS.length`-derived),
  so an added/dropped/relang'd format actually fails here; `FORMATS_BY_ID` membership asserted by
  reference (`toBe`).
- **Red-proofed (non-vacuity):** mutated two SUT behaviours at once — removed `listFormats`'s `!lang`
  guard AND changed `eng-email`'s `lang` to `'english'` → **exactly the 6 matching tests failed** (the 2
  falsy/no-arg `listFormats` tests + the eng-count/total-count/lang-enum/id-prefix tests); the other 8
  stayed green. Restored byte-identical (`git checkout`, zero diff) → 14/14 green.
- **Verified:** build green (`index` unchanged) · **1532** unit tests (+14) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** the `interleave→pronunciation→feedback→patterns` thread plus this catalogue
  pin are shipped. Next strongest untested pure target: **`json.js`** (`tryParseJSON` — subtle greedy
  `{...}`-extraction + array-passthrough-via-`typeof`, load-bearing for AI JSON parsing). Re-add a
  `[ ] Pure-lib test coverage` item to queue another.

---

## ✅ Pure-lib test coverage — `patterns.js` (mistake clustering + Dashboard performance trends) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for `src/lib/patterns.js` — the mistake-clustering + performance-trend
aggregations behind the Dashboard widgets (mistake-cluster cards, weakest-format/topic, worst-session
callout, activity sparkline, and the three SpeakingProgress signals). It was the **last unshipped name**
in the `interleave→pronunciation→feedback→patterns` thread chain, and had **no dedicated test file**.
**It is byte-identical** (tests only — no app behaviour change). Self-sourced (queue empty); plan:
`docs/superpowers/plans/2026-06-14-patterns-test-coverage-plan.md`.

- **`src/lib/__tests__/patterns.test.js` (+22):**
  - **`clusterMistakes` (5):** keeps only unreviewed `type:'grammar'` mistakes; the `count >= 2` gate
    drops singleton patterns; sorts clusters by count desc; de-dupes `drillIds` (same drill twice → count
    2, one drillId); a **table-driven classification test** pins all 12 `classifyPattern` branches
    (prefix-meN PTKS-drop vs standard via first-char, ber-/peN-/passive/4 suffix circumfixes/tense/error/
    transform) → exact `pattern` + a distinctive ASCII substring of each `PATTERN_DESCRIPTIONS` entry
    (avoids em-dash retype fragility); unrecognised drill → `other` (description === `'other'`); empty/
    all-reviewed → `[]`.
  - **`weakestWritingFormats` (2) + `weakestSpeakingTopics` (1):** the shared `aggregateByKey` min-2-
    attempts exclusion + weakest-avg-first sort + `last`=most-recent-ts band + non-number-band skip +
    limit + null→`[]`; the speaking variant proves the **`topicId|scenarioId|topic` union** (food via both
    id fields → `total:2`) and untagged-entry drop.
  - **`worstSpeakingSession` (4, fake timers):** `< 2` scorable → `null`; lowest band wins; **band tie →
    newer ts**; the **30-day window** (2+ recent → an ancient band-1 is ignored); **fallback to all** when
    `< 2` recent.
  - **`rollingActivity` (2, fake timers + local-day construction):** oldest-first one-entry-per-day with
    same-day **averaging**, **carry-forward** of writing/speaking bands into gap days, `null` before first
    data, and zero-filled `reviews` from `studyHistory[dayKey]`; all-null/zero shape on empty input.
  - **`speakingBandSeries` (3):** safe empty shape `{bands:[],first:null,…,delta:0,count:0}`; language
    scoping (`en`/`eng` vs `ms`/undefined buckets); oldest→newest summary (first/last/delta/best/avg);
    **last-N window** + **avg rounded to 1 dp** (5/3 → 1.7).
  - **`recurringSpeakingWeakness` (2):** tallies only records WITH a `weak` array (empty array counts → 0
    flags; missing array excluded), `flagTotal` + top-2 categories; window (newest-first) + language scope
    + top capped at 2.
  - **`topicsDueForReattempt` (3, injected `now`):** surfaces weak (band ≤ 3) + stale (≥ 3 days), excludes
    practised-today + strong-recent; the internal `t` epoch is dropped from the public shape; **latest
    attempt per topic** drives the band; same-reason oldest-first ranking + limit + language scope.
- **Grounded, not guessed:** day-keyed/clock-reading fns use **local `new Date(y,m,d,…)`** timestamps so
  `toLocalISO`/`setHours` day-keys are deterministic regardless of the runner's timezone; fake timers torn
  down via `afterEach(useRealTimers)`; averages/scores are hand-calculated literals; em-dash descriptions
  asserted by ASCII substring.
- **Red-proofed (non-vacuity):** mutated three SUT behaviours at once — the cluster gate `>= 2` → `>= 1`,
  the worst-session tiebreak `b−a` → `a−b`, and the reattempt weak threshold `<= 3` → `<= 1` → **exactly
  the 4 matching tests failed** for the right reasons (the band-threshold mutant correctly breaks both
  band-2-weak `topicsDueForReattempt` tests); restored byte-identical (`git checkout`, zero diff) → 22/22
  green.
- **Verified:** build green (`index` unchanged) · **1518** unit tests (+22) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** the `interleave→pronunciation→feedback→patterns` thread chain is now fully
  shipped. ~15 untested pure `src/lib/` helpers remain — candidate next targets: `confidence`,
  `examReadiness`, `skillBalance`, `passageOrder`. Re-add a `[ ] Pure-lib test coverage` item to queue another.

---

## ✅ Pure-lib test coverage — `feedback.js` (drill / tense / vocab / session feedback) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for `src/lib/feedback.js` — the elaborative-feedback layer behind grammar
drills (`buildDrillFeedback`/`buildTenseFeedback`), the vocab "Again" tip (`buildVocabFeedback`), and the
Hattie/Timperley three-line session feedback (`buildSessionFeedback`). It was the top target named in the
`pronunciation.js` pin's `▶ NEXT` thread, and had **no dedicated test file**. **It is byte-identical**
(tests only — no app behaviour change). Plan: `docs/superpowers/plans/2026-06-14-feedback-test-coverage-plan.md`.

- **`src/lib/__tests__/feedback.test.js` (+38):**
  - **`buildDrillFeedback` (8):** `correct` short-circuits to `null`; `!drill` → `null`; a known `rule`
    returns the exact `GRAMMAR_FEEDBACK` entry (by reference); unknown `rule` (rule wins over hint as the
    key) → fallback (explanation = `hint`, mnemonic = `Rule focus: <rule>`, examples `[]`, relatedRule
    `null`); a `hint`-only drill whose hint IS a map key returns that entry; hint-only non-key → fallback
    w/ `mnemonic:null`; no-rule/no-hint + answer → `Expected answer: <answer>`; nothing → `See correction.`
  - **`buildTenseFeedback` (5):** `!drill` → `null`; `chosen === answer` → `null`; both in map → correct
    entry's explanation/mnemonic/examples + a `relatedRule` naming chosen vs answer + `tense`; neither in
    map → synthesized `The correct tense marker is "<answer>".`, `mnemonic:null`, `examples:[]`,
    `relatedRule:null`; correct-in-map-but-chosen-not → `relatedRule:null`.
  - **`buildVocabFeedback` (7):** `state` 0 / undefined / null-card → `new`; 1 → `learning`; 2 & 4
    (out-of-range) → `review` (the `else`); 3 → `relearning`.
  - **`buildSessionFeedback` (18):** unknown context → `{goal, now:'', next:'', nextHref:null}`;
    study-session accuracy routing (`<60` → `/mistakes`, `60–79` → `/`, `>=80`+empty roleplay history →
    `/roleplay`, else → `/`); the calibration snippet gate (`totalEntries >= 5` appends, `< 5` suppresses);
    `accuracy`/`reviewed` default-to-0; grammar-drill / roleplay / writing context lines + thresholds +
    optional `weakest`/`scenario`/`band` snippets. **Time-dependent goal lines** pinned with
    `vi.useFakeTimers()` + `vi.setSystemTime` at an exact UTC midnight and whole-day `examDate` offsets
    (10d → "Final stretch", 30d → "Review phase", 90d → "Build phase", past → clamps to 0 → default line).
- **Grounded, not guessed:** strings OWNED BY `feedback.js` (synthesized fallbacks, session lines) are
  hand-typed LITERALS so a regression there actually fails; passthrough of a `feedbackRules.js` entry is
  asserted by reference (`toBe`) so a wrong-key regression fails. Day-boundary math is exact (midnight→
  midnight) so the band thresholds are non-flaky; fake timers torn down via `afterEach(useRealTimers)`.
- **Red-proofed (non-vacuity):** mutated three SUT behaviours at once — vocab `state===1` → `review`, the
  study routing `acc < 60` → `< 40`, and the tense `relatedRule` guard (removed) → **exactly the 4
  matching tests failed** for the right reasons (the other 34 stayed green); restored byte-identical
  (`git checkout`, zero diff) → 38/38 green.
- **Verified:** build green (`index` unchanged) · **1496** unit tests (+38) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** ~16 untested pure `src/lib/` helpers remain — next strongest target:
  `patterns` (the other name in the prior thread). Re-add a `[ ] Pure-lib test coverage` item to queue another.

---

## ✅ Pure-lib test coverage — `pronunciation.js` (Speak-mode scorer) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for the pronunciation scorer behind the **Speak study mode**
(`SpeakMode.jsx` imports `scorePronunciation`) — the next target named in the `interleave.js` pin's
`▶ NEXT` thread. `src/lib/pronunciation.js` had **no dedicated test file**. **It is byte-identical**
(tests only — no app behaviour change). Plan: `docs/superpowers/plans/2026-06-14-pronunciation-test-coverage-plan.md`.

- **`src/lib/__tests__/pronunciation.test.js` (+17):**
  - **`scorePronunciation` word classification & score (6 tests):** all-exact → 100% + the "Perfect
    pronunciation" tip; `normalize` folds case + strips punctuation (`"Saya, makan!"` ≡ `"saya makan"`
    → 100%); the **`close` threshold** (`lev ≤ ceil(len*0.3)` — 1 edit on a 5-char word → half a point
    → 50%); a **missing** spoken word → `status:'wrong'` rendered as `spoken:'—'` (75% on 3/4);
    **extra** spoken words append `status:'extra'` rows and do NOT count as missed (so the perfect tip
    still fires); score **rounding** (1/3 → 33%).
  - **`scorePronunciation` tip selection (5 tests):** a MALAY_TIPS pattern match (`ny`); the **general
    fallbacks** that fire only when no MALAY_TIPS hit — long-word (>8 chars, `kebudayaan`) and
    imbuhan-prefix (`menulis`); **Set-dedup** (three `r`-words → one tip); the **`slice(0,3)` cap**
    (four distinct patterns ny/ng/r/kh → only 3 returned).
  - **`generatePracticeSentences` (6 tests):** the `ex.length > 5` filter (strict — a 5-char example is
    excluded); the `count` cap; the default-5 cap; the mapped `{ malay, english, word }` shape with the
    parenthetical-gloss strip (`'Rumah saya besar (…)'` → `'Rumah saya besar'`); the `c.m` fallback when
    `split('(')[0]` is empty; `[]` for an empty deck. **Counts/shapes only — never the shuffled order**
    (the fn uses `Math.random`).
- **Grounded, not guessed:** expected scores/strings are **hand-calculated literals** (e.g. `round(0.5/1*100)=50`,
  `round(1/3*100)=33`, `ceil(5*0.3)=2`), NOT re-derived from the SUT — so a threshold/rounding/precedence
  regression actually fails. Tip-text assertions use the exact MALAY_TIPS / fallback prefixes.
- **Red-proofed (non-vacuity):** temporarily mutated four SUT behaviours at once — `close` `score += 0.5`
  → `+= 1`, the missing-word `spk || '—'` → `spk`, the tips `.slice(0,3)` → `.slice(0,4)`, and the
  example filter `> 5` → `>= 5` → **the 4 matching tests failed** for the right reasons (the other 13,
  which don't touch those paths, stayed green); restored byte-identical (`git checkout`, zero diff) → 17/17 green.
- **Verified:** build green (`index` unchanged) · **1458** unit tests (+17) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** ~17 untested pure `src/lib/` helpers remain — next strongest targets:
  `feedback` (drill/vocab feedback — `buildSessionFeedback` is time-dependent so pin the pure trio),
  `patterns`. Re-add a `[ ] Pure-lib test coverage` item to queue another.

---

## ✅ Pure-lib test coverage — `interleave.js` (Smart-Study mixer) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for the Smart-Study session mixer — the next target named in the `diff.js`
pin's `▶ NEXT` thread. `src/lib/interleave.js` had **no dedicated test file** (the similarly-named
`interleaveByPrefix.test.js` / `interleavedQueue.test.js` cover different modules under `src/lib/study/`).
**`interleave.js` is byte-identical** (tests only — no app behaviour change).

- **`src/lib/__tests__/interleave.test.js` (+15):**
  - **`buildMixedSession` ratio/target math (9 tests, order-independent):** default settings → 8 vocab /
    5 grammar / 2 comp (15 total); custom ratios (size 10, 0.6/0.2 → 6/2/2); the **comp floor** (`cTarget =
    max(1, …)` clamps a raw-0 to 1, pushing total to 11 > sessionSize); pool-limited vocab (3 due < vTarget
    8 → 3); the **`ex.length > 15` comprehension filter** (short examples → comp 0); **not-due exclusion**
    (future-`due` cards never appear); the **grammar `due`-filter** (all drills scheduled future → grammar
    0); the **gTarget cap** (119 due drills, target 5 → 5, guarded by an `> 5` pool assertion); and a
    type-tag invariant (every item is `vocab`｜`grammar`｜`comprehension`). Asserts **counts/targets, never
    the shuffled order** (the mixer uses `Math.random`).
  - **`getMixedSessionSummary` (6 tests, fully pure/deterministic):** empty → all-zero + `weakest:null`;
    all-correct → 100% + `weakest:null` (the `worstAcc < 100` guard); accuracy rounding (1/3 → 33);
    per-type `byType` accumulation + lowest-accuracy `weakest`; **tie → first-seen type** (strict `<`);
    zero-correct type is weakest.
- **Grounded, not guessed:** expected counts are **hand-calculated literals** (e.g. `round(15*0.5)=8`), NOT
  re-derived from the SUT's formula — so a rounding/clamp regression actually fails. The 119-drill pool size
  was confirmed against the live `grammar.js` exports.
- **Red-proofed (non-vacuity):** temporarily mutated three SUT behaviours at once — `vTarget` `Math.round`→
  `Math.floor`, the comp filter `> 15`→`> 1`, and the accuracy `Math.round` removed → **5 targeted tests
  failed** for the right reasons (the other 10, which don't touch those paths, stayed green); restored
  byte-identical → 15/15 green.
- **Verified:** build green (`index` unchanged) · **1441** unit tests (+15) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** ~18 untested pure `src/lib/` helpers remain — next strongest targets:
  `pronunciation` (scoring), `feedback`, `patterns`. Re-add a `[ ] Pure-lib test coverage` item to queue
  another.

---

## ✅ Reader Select-mode card direction follows `studyLang` — SHIPPED 2026-06-14 (local build loop)

Closed the last v34 free-path coherence gap in the universal **select→card** popover (`SelectionToCard.jsx` —
the reader's English **Select-mode** path). It always filed a **Malay-front** card (`m: malay`, `e: english`)
regardless of `studyLang`. For an English (0510) learner the store still tagged it `lang:'en'` (the `addCard`
default), but **backwards** — `m` held the Malay gloss and `e` the English word — so the card studied
Malay→English inside an English session (the opposite of what an English learner wants; the queue's
"invisible" framing was the symptom, reversed-direction the precise cause). Now card direction **and** the
`lang` tag follow the active study language via the one source of truth, `glossPlanFor` — mirroring the
shipped Import/PDFReader F5 threading.

- **New pure helper `cardSidesFor({ term, translation, source }, studyLang)`** (`src/lib/selectionToCard.js`,
  its natural home alongside `normalizeSelection`/`detectLanguage`): routes through `glossPlanFor(studyLang)`
  and places whichever of the selected term / its gloss is in `plan.from` on `m` (the target word), the other
  on `e`, and stamps `lang: plan.lang`. `studyLang='en'` → `{ m:English, e:Malay-gloss, lang:'en' }` for BOTH
  selection languages (select an English word OR a Malay word → always a correctly-directed English card).
- **`SelectionToCard.jsx` wired to it** (surgical: reads `studyLang`, swaps the inline `malay`/`english`
  derivation for `cardSidesFor`, threads `lang` into `addCard`, updates the dedup checks). The popover's
  DISPLAY is unchanged (still shows `term → translation`); only the SAVED card's data direction changes.
- **`studyLang='ms'` byte-identical:** for the Malay path `cardSidesFor` returns the exact same `m`/`e` as
  the old inline ternaries, and `lang:'ms'` matches the prior `addCard` store-default — no Malay regression.
- **TDD (red-proofed):** `src/lib/__tests__/selectionToCard.test.js` (+6) — both study languages × both
  selection languages, the missing/unknown-`studyLang`→`ms` default, and an `m`-is-always-the-target
  invariant. Watched all 6 FAIL first with `cardSidesFor is not a function`, then green after implementing.
- **Verified:** build green (`index` unchanged) · **1426** unit tests (+6) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump** (the `lang` field already exists in v34); no
  schema/free-path break; Malay path byte-identical.
- **▶ NEXT:** the v34 voice/locale + card-direction audit chain is now complete for the reader. Remaining
  English-study work stays in the queue (`interleave` pure-lib coverage) + the True-English roadmap (richer
  BYOK 0510 starter, AWL Sublists 4+).

---

## ✅ Pure-lib test coverage — `diff.js` (`computeWordDiff`) pinned — SHIPPED 2026-06-14 (local build loop)

Behaviour-preserving coverage for the pure LCS **word-diff** that powers the pronunciation/speaking
colored feedback (✅ kept / ❌ changed). It was the cleanest untested pure helper — deterministic, zero
deps, no randomness/DOM — so its contract is fully pinnable. **`diff.js` is byte-identical** (tests only).

- **`src/lib/__tests__/diff.test.js` (+12):** identical text → one equal group; empty-old → all-add;
  empty-new → all-remove; both-empty → `[]`; middle insertion/deletion; word replacement = remove-then-add
  between equal anchors; full-phrase replacement = one remove group + one add group; whitespace
  normalisation (collapse runs, trim edges); multi-word same-type grouping; a **no-two-adjacent-same-type**
  invariant; and a **reconstruction invariant** (equal+remove rebuilds the old words, equal+add rebuilds
  the new words) over several MS/EN samples.
- **Grounded, not guessed:** every expectation was captured from the function's REAL output (a node probe)
  before writing the assertions — so the tests pin actual behaviour.
- **Red-proofed:** temporarily mutated `diff.js`'s group-join separator → **7/12 failed**; restored
  byte-identical → 12/12 green (the standard non-vacuity proof for coverage tests of existing code).
- **Verified:** build green (`index` unchanged) · **1420** unit tests (+12) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump; no app behaviour change.**
- **▶ NEXT (repeatable):** ~20 untested pure `src/lib/` helpers remain — strongest next targets:
  `interleave` (Smart-Study mixing), `pronunciation` (scoring), `feedback`, `patterns`. Re-add a
  `[ ] Pure-lib test coverage` item to queue another.

**🤖 All 4 original vetted items shipped this loop** (AWL S2, AWL S3, locale audit, pure-lib coverage).
The queue was then **re-armed via the loop's new self-source mode** (`docs/LOCAL_BUILD_LOOP.md` §
Self-source) with 2 fresh vetted `[ ]` items at the top: the reader Select-mode card-direction fix +
`interleave` pure-lib coverage — so the next `/loop` run builds immediately instead of stopping.

---

## ✅ Voice/locale leak audit — reader Select-mode Pronounce now follows the word's language — SHIPPED 2026-06-14 (local build loop)

Closed the one remaining v34 voice leak. The universal **select→card** popover (`SelectionToCard.jsx` —
the reader's English **Select-mode** path) had a Pronounce 🔊 button hardcoded to `speak(malay || state.term,
'ms-MY')`. So an English learner who selected an English word heard either the **Malay gloss** (post-translate)
or the English word **in a Malay voice** (pre-translate) — never the English word in en-GB.

- **Fix (one line + one import):** `speak(state.term, localeFor(state.source))` — pronounce the **visible
  selected term** (line 195 displays `state.term`) in its **detected source language**. `localeFor`
  (`src/lib/langLocale.js`) is the canonical locale source (mirrors the shipped study-path TTS-parity fixes).
- **Malay path byte-identical:** for a Malay selection `state.source==='ms'`, where `malay === state.term`,
  so the spoken word is unchanged and `localeFor('ms')==='ms-MY'`. English selection now speaks en-GB.
- **Full audit conclusion (the rest are NOT leaks):** every other hardcoded `ms-MY` is either an
  already-`lang`-aware ternary (Comprehension / Listening / Dictation / ClozeListening / ExamRehearsal /
  Speaking / Roleplay / RoleplaySession) or correct-by-design **Malay-domain** (CikguBot = Cikgu Maya Malay
  tutor; WordFamilyTree = Malay families; SavedWordPopover = the Malay reveal-gated reader's saved-word
  review, `language:'ms'` hardcoded there too) or a prop **default** the caller overrides (`ForYou` Shelf).
- **TDD (red-proofed):** `src/components/__tests__/selectionToCardLocale.test.js` (+2, structural source-pin
  per repo convention cf. `roleplaySttLocale.test.js` — SelectionToCard is selection-event + dynamic-import
  driven, heavy to mount; the bug is a one-line hardcode). Watched both assertions FAIL first (hardcode
  present, `localeFor` not imported).
- **Verified:** build green (`index` unchanged) · **1408** unit tests (+2) · lint 0 errors (same 3
  pre-existing warnings). **No STORE_VERSION bump.**
- **▶ NEXT:** the audit is complete; this item is retired. Out-of-scope deeper v34 gap noted for later:
  `SelectionToCard` still creates a **Malay-target** card (`m: malay`) regardless of `studyLang` — a
  card-DIRECTION gap (not a locale leak), distinct from this audit.

---

## ✅ Free "Academic English" vocab seed (AWL **Sublist 3**) — the next 60 academic words — SHIPPED 2026-06-14 (local build loop)

Third free, no-key academic deck — the next 60 Coxhead AWL families after Sublist 2. **Exact mirror of
the Sublist 2 pattern** (which mirrors Sublist 1); Sublists 1 & 2 stay byte-identical (their tests pass
untouched).

- **Content (`src/data/academicEn3.js`, own 5.23 KB lazy chunk):** the 60 canonical AWL Sublist 3
  headwords (`{ m, e, ex, p }`). **Headword list web-verified** against eapfoundation.com (matches the
  canonical Coxhead list; the answer-key test also pins **disjoint from Sublists 1 + 2**). **Non-obvious
  glosses web-checked:** `deduce`→menyimpulkan, `convene`→mengadakan, `negate`→menafikan,
  `imply`→membayangkan, `constrain`→mengekang, `compensate`→memberi pampasan, `correspond`→sepadan,
  `immigrate`→berhijrah. Rest are cognates (alternatif/komponen/korporat/kriteria/dokumen/falsafah/
  fizikal/teknik/teknologi/skim) or standard DBP. British `-ise` kept for the AWL headword (`maximise`).
- **Store (`seedAcademicEnglish3`, `useStore.js`):** exact mirror of `seedAcademicEnglish2` — lazy import,
  `addCards` dedupe on `(m,t,lang)`, distinct **"Academic English 3"** deck. **No STORE_VERSION bump.**
- **UI (`Settings.jsx`):** a third `AcademicSublistRow` (the DRY row added for Sublist 2) — "Sublist 3
  (60 more)". Copy nudges "level up through Sublists 2 and 3".
- **TDD (red-proofed):** `academicEn3.test.js` (+5 — canonical-60 answer key, disjoint from S1+S2, every
  card studiable, every example contains its base word) + `seedAcademicEnglish3.test.js` (+4 — 60
  `lang:'en'` cards, idempotent, no `ms` leak, coexists with S1+S2). Watched both fail first (missing
  module/action).
- **Verified:** build green (`academicEn3` own 5.23 KB lazy chunk; eager `index` unchanged) · **1406**
  unit tests (+9) · lint 0 errors (same 3 pre-existing warnings). CREDITS widened to AWL Sublists 1–3.
- **▶ NEXT (open thread):** AWL Sublists 4+ (same pattern, diminishing IGCSE value past S3 — flag before
  auto-adding); a BYOK-generated richer 0510 seed; or pivot off English. **180 free academic words now
  available across 3 graded decks.**

---

## ✅ Free "Academic English" vocab seed (AWL **Sublist 2**) — the next 60 academic words — SHIPPED 2026-06-14 (local build loop)

Second free, no-key academic deck — the next 60 highest-frequency Coxhead AWL families after Sublist 1.
Same band-booster rationale: the basic 682-word reversed-dictionary starter is general vocab, not the
sophisticated/academic register the writing grader rewards. **Mirrors the Sublist 1 pattern EXACTLY** —
the Sublist 1 data/action/path is **byte-identical** (its tests still pass untouched).

- **Content (`src/data/academicEn2.js`, own 5.13 KB lazy chunk):** the 60 canonical AWL Sublist 2
  headwords, each `{ m: English, e: Malay gloss, ex: IGCSE-level example containing the base word, p: POS }`.
  **Headword list web-verified** against eapfoundation.com (the same source the Sublist 1 answer-key test
  cites) — matches the canonical Coxhead list. **Glosses verified, not memory-asserted:** the non-obvious
  ones web-checked before shipping — `administrate`→mentadbir, `regulate`→mengawal selia,
  `consequent`→berikutan/akibat, `perceive`→menanggap/menyedari, `commission`→suruhanjaya/komisen; the rest
  are cognates (aspek/kategori/kredit/budaya/positif/strategi/teks/tradisi) or standard DBP register.
- **Store (`seedAcademicEnglish2`, `useStore.js`):** exact mirror of `seedAcademicEnglish` — lazy import,
  `addCards` dedupe on `(m,t,lang)`, returns the count added. Seeds `lang:'en'` cards into a **distinct
  "Academic English 2"** deck. **No STORE_VERSION bump** (new action, no persisted-schema change).
- **DECIDE-AND-FLAG — labelled second set, not one combined deck:** a *distinct* deck + action keeps the
  Sublist 1 path byte-identical (no refactor-regression risk; "mirror EXACTLY / surgical") and the Settings
  count-check unambiguous (`c.t === 'Academic English 2'`). *Veto on one combined deck:* would force either
  refactoring the shipped action or a 60-vs-120 ambiguous count. v34 scopes the Study session by `lang`,
  **not** by deck `t`, so both academic decks still study together in one English session — the second deck
  label is organizational only, no session fragmentation. AWL sublists are disjoint → no `m` collision.
- **UI (`Settings.jsx`):** refactored the self-gated `AcademicEnglishSeed` into two graded rows via a DRY
  inner `AcademicSublistRow` (no chrome drift) — **Sublist 1 (60 words)** then **Sublist 2 (60 more)**,
  each its own idempotent Add button + result line. Still shows ONLY when `studyLang==='en'`. Copy nudges
  "Start with Sublist 1, then level up to Sublist 2" (graded, cognitive-load-aware).
- **TDD (red-proofed):** `src/data/__tests__/academicEn2.test.js` (+5 pure — canonical-60 answer key, no
  dupes, **disjoint from Sublist 1**, every card studiable, every example contains its base word) +
  `src/store/__tests__/seedAcademicEnglish2.test.js` (+4 jsdom — 60 `lang:'en'` cards in "Academic
  English 2", idempotent, no `ms` leak, coexists with Sublist 1). Watched both files FAIL first (module /
  action missing) before implementing.
- **Verified:** build green (`academicEn2` = own 5.13 KB lazy chunk; eager `index` unchanged) · **1397**
  unit tests (+9) · lint 0 errors (same 3 pre-existing warnings). CREDITS widened to AWL Sublists 1 + 2.
- **▶ NEXT (open thread):** AWL Sublist 3 (next queue item, same proven pattern); a BYOK-generated richer
  0510 seed; or pivot off English.

---

## ✅ Free "Academic English" vocab seed (AWL Sublist 1) — a no-key band-booster deck — SHIPPED 2026-06-14 (Opus xhigh)

One of the two flagged English follow-ups ("BYOK-generated 0510 seed" vs "0500 academic vocab"). **Built the
academic seed, NOT the BYOK one** — decide-and-flag: the BYOK "Make a deck" panel (`MakeDeckPanel.jsx:47,74`)
is *already* English-aware, so a BYOK seed would duplicate it and only serve key-holders; a **curated, free,
on-device** academic deck works for **every** learner (no-paywall + offline invariants) and fills a real gap —
the basic 682-word reversed-dictionary starter (`dictionaryEn`) is general vocab, not the **sophisticated/
academic register the writing grader rewards** (higher 0510 bands / 0500). *Veto on BYOK: lower marginal value,
needs a key, overlaps MakeDeckPanel.*

- **Content (`src/data/academicEn.js`):** the 60 canonical headwords of **Coxhead's Academic Word List
  Sublist 1** (the most-frequent academic word families), each `{ m: English, e: Malay gloss, ex: IGCSE-level
  example containing the base word, p: POS }`. **Glosses verified, not memory-asserted** — standard DBP Bahasa
  Malaysia (mostly cognates: konsep/faktor/proses/struktur/teori…); the less-obvious verbs (constitute →
  membentuk, derive → memperoleh, legislate → menggubal undang-undang) were web-checked against Glosbe /
  Cambridge / english-malay.net before shipping (a wrong gloss = the confident-wrong failure a learning tool
  must avoid). Word list is factual/non-copyrightable; glosses+examples are ours — attributed in
  `public/CREDITS.txt`. **Own lazy 5 KB chunk** (`academicEn-*.js`), not in the eager bundle.
- **Store (`seedAcademicEnglish`, `useStore.js`):** mirrors `seedEnglishStarter` exactly — lazy import,
  `addCards` dedupe on `(m,t,lang)`, returns the count added. Seeds `lang:'en'` cards in a dedicated **"Academic
  English"** deck (so they sit in the v34-scoped English Due queue, never the Malay session). **No STORE_VERSION
  bump** (new action, no persisted-schema change).
- **UI (`Settings.jsx`):** a self-contained, self-gated `AcademicEnglishSeed` component inside the **Study
  language** card — shows ONLY when `studyLang==='en'` (one-line insertion; the 1000-line page stays surgical).
  "Add academic words" → seeds, reports the count, idempotent (re-tap = "nothing new added"). Placed here (not
  the Dashboard empty-state) so it works for **any** deck state — the empty-state is the *getting-started*
  moment (basic vocab first); academic is a deliberate *level-up* opt-in.
- **TDD (red-proofed):** `src/store/__tests__/seedAcademicEnglish.test.js` (+3, jsdom — watched failing first:
  `seedAcademicEnglish is not a function`) seeds 60 `lang:'en'` "Academic English" cards, idempotent, never
  leaks into a `ms` session; `src/data/__tests__/academicEn.test.js` (+4 pure) pins the canonical 60 AWL words
  (independent answer key, not reverse-derived), no dupes, every card studiable, every example contains its base
  word (so cloze/produce can blank it).
- **Verified:** build green (`academicEn` = own 5 KB lazy chunk; eager `index` unchanged — Settings is a lazy
  route) · **1388** unit tests (+7) · lint 0 errors (same 3 pre-existing warnings).
- **▶ NEXT (open threads):** expand to AWL Sublists 2–3 (more academic words, same verify-before-ship bar); a
  BYOK-generated richer 0510 seed (distinct from MakeDeckPanel — a curated *starter*, not ad-hoc); or pivot to
  a non-English surface.

---

## ✅ Dashboard "Your plan for today" now follows studyLang — the home plan is one language too — SHIPPED 2026-06-14 (Opus xhigh)

The open thread from the section below ("lang-scope the **Dashboard** daily plan too") is done. `DailyPlan.jsx`
(the ordered "what should I do today?" queue at the top of the Dashboard) read the **full** mixed-language
store slices, so an English (0510) learner's plan could count **Malay** due cards, fix-ups, grammar drills,
and speaking/writing — the same v34 cross-language leak ForYou's "Keep going" shelf had. Now the Dashboard
plan is single-language too, so the WHOLE home (Dashboard widgets were already `cardsForLang`-scoped + ForYou)
is consistent.

- **Wiring (`DailyPlan.jsx`, surgical — mirrors ForYou's call site):** read `studyLang`; `langCards =
  cardsForLang(cards, studyLang)` feeds `dueCount` (`getDueCards(langCards)`) + `buildDailyPlan({ cards:
  langCards, … })`; the 4 language-tagged slices are scoped via the **shared `forYouLangScope`** helper
  (`scopeMistakes`/`scopeSpeaking`/`scopeWriting`/`scopeGrammarCards`); `fixUpQueue` is
  widened-then-scoped-then-sliced (`scopeMistakes(getFixUpQueue(30), studyLang).slice(0,3)`). **The pure
  `buildDailyPlan` (and `src/lib/__tests__/dailyPlan.test.js`) are UNTOUCHED** — only its INPUTS are filtered.
- **DECIDE-AND-FLAG:** (1) **`hasReviewed` stays on the FULL deck**, not `langCards`. *Veto: DailyPlan's render
  gate hands off from `FirstRunCard`, which also gates on full-deck `hasReviewed` — keeping them in lockstep
  avoids a blank moment for a bilingual user mid-switch (Malay-reviewed, just flipped to English); the
  `!hasTasks` guard already self-hides when the active-language deck has no tasks. Scoping it would re-litigate
  the hand-off contract for no gain.* (2) **`examAttempts`/`studyPlan`/`challenge`/`examReadiness`/`examDue`
  left cross-language** — exact mirror of the shipped ForYou decision (the composite exam/study getters have
  no clean per-language key). (3) Reused `forYouLangScope` rather than a new module (same field conventions:
  `mistakes.language` `'ms'|'en'`, `speaking/writing .lang` `'eng'|'malay'`, grammar `'eng-'` ids).
- **TDD (red-proofed):** `src/components/dashboard/__tests__/dailyPlanLang.test.js` (+3, jsdom mount) — an
  English session **hides** a Malay fix-up task (watched FAILING first: the Malay mistake drove "Fix your top
  mistakes" on the pre-wire cross-language component); a same-language English mistake **does** drive it; a
  Malay session is byte-identical.
- **Verified:** build green · **1381** unit tests (+3) · lint 0 errors (same 3 pre-existing warnings). **No
  STORE_VERSION bump** (read-only of the existing `studyLang` pref; no persisted field). Default
  (`studyLang='ms'`) is byte-identical — `langCards` is the whole deck + the scopers keep every Malay/untagged
  record.
- **▶ NEXT (open thread):** the whole home (Dashboard + ForYou) is now one language. Remaining English-study
  work is non-home: a BYOK-generated 0510 vocab seed, 0500 academic vocab; or pivot to a different surface.

---

## ✅ "For You" non-card shelves now follow studyLang — page is fully one language — SHIPPED 2026-06-14 (Opus xhigh)

ForYou already scoped its CARD slice (`cardsForLang`) + the "Picked for you" weak-spot chips
(`learnerProfile.focusTopics` filters `m.language`) + the writing band. The remaining leak was the
**"Keep going" daily-plan shelf** — its fix-up, grammar, speaking, and writing signals flowed through the
shared `buildDailyPlan` **cross-language**, so an English (0510) learner could see "Fix your top mistakes /
N grammar drills due" counting **Malay** activity. Now the whole page is one language.

- **Pure scoper (`src/lib/forYouLangScope.js`, TDD red-proofed):** `scopeMistakes` / `scopeSpeaking` /
  `scopeWriting` / `scopeGrammarCards` + the `keepByLanguage` / `keepBySpeechLang` predicates. **Field
  conventions verified against source:** `mistakes.language` `'ms'|'en'` (untagged = pre-v34 legacy → Malay
  only, never bleeds into English); `speaking/writing .lang` `'eng'|'malay'`; grammar drill ids `'eng-…'` =
  English (Malay ids are `error-`/`imbuhan-`/`tense-…`, never `eng-`).
- **Wiring (`ForYou.jsx`, surgical):** the 4 language-tagged slices are scoped at the selector→body, and
  `fixUpQueue` is widened-then-scoped-then-sliced (`scopeMistakes(getFixUpQueue(30), studyLang).slice(0,3)`).
  `buildDailyPlan` / `learnerProfile` / the **Dashboard** plan are **untouched** (no shared-fn change).
- **DECIDE-AND-FLAG:** (1) Scoped ONLY at the ForYou call site → the "Keep going" plan can now **diverge**
  from the Dashboard's (still-mixed) plan for a *bilingual* user. *Veto: that's the intended v34 scoping
  (ForYou is the scoped surface); lang-scoping the Dashboard daily-plan is a separate, bigger change to the
  main home — flagged as follow-up.* (2) Left `confidenceLog`/`studyHistory` (no language field) and the
  composite exam signals (`examReadiness`/`examDue` getters) cross-language — no clean key to scope on.
- **TDD (red-proofed):** `forYouLangScope.test.js` (+6, pure) + `forYouLang.test.js` (+2 mount: an English
  session **hides** a Malay fix-up task; a same-language English mistake **does** drive it — the negative
  case watched failing first against the pre-wire cross-language plan).
- **Verified:** build green (ForYou 31.78 KB, well under the 70 KB page budget; `index` unchanged) ·
  **1378** unit tests (+8) · lint 0 errors (same 3 pre-existing warnings). **No STORE_VERSION bump.**
- **▶ NEXT (open thread):** lang-scope the **Dashboard** daily plan too (so bilingual users get a consistent
  one-language plan everywhere); or pivot to a different surface.

---

## ✅ Free Cikgu tutor — KB WIDENED (recovers what the gate hedged) — SHIPPED 2026-06-14 (Opus xhigh)

The confidence gate (below) stopped the free tutor bluffing but exposed thin coverage — common IGCSE
questions hedged. This is the proper recovery: widened the rule-based KB so the most-asked questions get a
real answer instead of the honest-uncertainty reply. **Data-only — the gate, its mechanism, the entry shape,
the AI tier, and every existing entry's answer are untouched. No STORE_VERSION bump.**

- **New / enriched entries (`src/data/cikguKnowledge.js`):**
  - **Peribahasa BANK** — replaced the 1 generic proverb entry with ~15 common IGCSE proverbs, each with
    *literal image → meaning → which essay theme it fits* (cooperation / effort / caution / belonging).
    Distinctive multi-word anchor phrases as keywords → a quoted proverb scores high; an *un-banked* proverb
    only scrapes the topic (~28–37) → still hedges.
  - **3 penulisan format skeletons** — `penulisan-rencana` (article), `penulisan-laporan` (report),
    `penulisan-syarahan` (speech), each paragraph-by-paragraph (pendahuluan → isi: ayat topik+huraian+contoh →
    kesimpulan; report kronologi + sign-off; speech kata aluan + retorik + seruan).
  - **`vocab-formal-upgrade`** — register-correct alternatives for over-used words (banyak→pelbagai/sebilangan
    besar; baik→cemerlang/terpuji; besar→luas/agung; cantik→indah/jelita…), each with an example phrase.
  - **Boosted 2 weak in-coverage entries** (keywords/patterns only): `penjodoh-bilangan` (added the standalone
    *penjodoh*/*bilangan* terms) and `kata-sendi` (added *daripada* + a `dari.*daripada` pattern). Both
    additions are domain-specific (low false-positive risk).
- **Measured recovery (keyless `npm run eval:ai-tier`, the `[Cikgu · FREE confidence gate]` table):**
  `in` confidentAnswers **3/5 → 8/8**, `partial` **3/4 → 4/4**, `out` **0/3** (the *fresh* safety-net) —
  **every in/partial gold question now answers; only the 3 deliberately out-of-scope ones hedge.**
  Per-question scores: dari-daripada 31→**57**, penjodoh 28→**56**, peribahasa-aur 28→**59**, rencana
  30→**80**, vocab 31→**78**, ke-an 29→**65** (all now ≥40 confident). The 3 reclassified questions moved `out`→`in` in
  `goldCikgu.mjs` `coverageHint` (metadata only — keyFacts, the answer key, are UNTOUCHED, never reverse-
  engineered into the entries).
- **Kept the gate's safety net measurable:** added **3 fresh genuinely-out-of-scope** gold questions
  (`peribahasa-pagar` = an un-banked proverb; `kata-nama-am-khas` = common vs proper nouns; `surat-rasmi-format`
  = formal letter) — all still hedge (37/17/19 < MIN_CONFIDENCE=40), so the `out` bucket stays non-empty at
  **0 confident**.
- **TDD (red-proofed):** `src/data/__tests__/cikguKnowledge.test.js` (+6, watched failing first — each newly
  covered area returned `confident:false` pre-widening) — peribahasa-meaning / rencana / vocab-upgrade /
  penjodoh / dari-daripada → `confident:true` + the answer contains the real concept; a fresh out-of-scope
  query still → `confident:false`. The 2 old "bagai aur dengan tebing" hedge tests migrated to the still-
  un-banked "harapkan pagar, pagar makan padi" (that proverb is now covered).
- **DECIDE-AND-FLAG:** (1) Did NOT teach to the test — entries written as general IGCSE syllabus content;
  measured AFTER writing. (2) **`ke-an` RECOVERED (29→65)** — the first commit flagged it as a deferred
  follow-up (FP-risk veto); on review that veto applied only to *short* keywords. Phrase-level anchors
  (`'circumfix ke'`, the unicode `ke-…-an`) + a `circumfix.*word` pattern cleared the gate with **no
  over-broadening** (the 3 fresh out-of-scope Qs still hedge 37/17/19). So **all in/partial gold Qs now
  answer.** (3) Kept the proverb bank as ONE enriched entry (id `peribahasa` preserved → existing `related`
  links stay valid).
- **Verified:** build green (data-only — no eager `index` change) · **1368** unit tests (+7) · lint 0 errors
  (same 3 pre-existing warnings). **No STORE_VERSION bump.**
- **Post-ship CORRECTNESS AUDIT (grounded, web-sourced):** the widening made the tutor *confidently assert*
  ~15 proverb meanings + 3 format skeletons + a vocab table — so each was re-checked against authoritative
  Malay sources (DBP/maksudperibahasa + SPM format guides). Caught + fixed **one confident-wrong spelling**:
  "bulat air kerana *pembentung*" → **"pembetung"** (the canonical form; meaning was already correct). All
  other meanings + the laporan/syarahan formats verified accurate ("alah bisa tegal biasa" = a hard task
  becomes easy with practice; laporan ends "Disediakan oleh" + nama + jawatan; syarahan = kata alu-aluan →
  "Sekian, terima kasih").
- **PAID (BYOK) tutor — SYLLABUS PARITY (2026-06-14):** verified the BYOK Cikgu prompt
  (`CIKGU_SYSTEM_PROMPT` in `src/core/agent/promptLibrary.ts`; single source — both `gemini.js` +
  `openrouter.js` import it) was already direct-instruction (unified 2026-06-12, **NOT thin** — so I did
  NOT churn it). But its `WHAT TO TEACH` list predated this session's free-KB widening, so it omitted
  peribahasa/penjodoh/kata ganda/golongan kata/dari-vs-daripada — **added them** (+ rencana/laporan/syarahan
  formats) so the paid tutor isn't NARROWER than the free tier. Mirrored **byte-identical (2049 chars)** into
  the eval's `CIKGU_BYOK_SYSTEM`. Pinned by `cikguSystemPrompt.test.js` (+5 assertions, red-proofed).
  *Decide-and-flag: this is prompt GUIDANCE; the actual answer-quality lift needs a GEMINI_KEY to measure
  (keyed `eval:ai-tier`) — flagged as your confirmation step.*
- **FOLLOW-ON COVERAGE (2026-06-14):** added 2 foundational *uncovered* grammar entries — `kata-ganda`
  (reduplication: penggandaan penuh / separa / berentak) and `golongan-kata` (word classes: kata nama am/khas,
  kata kerja transitif/tak transitif, kata adjektif, kata tugas). Chosen as real gaps, NOT more proverbs.
  The gold's `kata-nama-am-khas` (was a fresh out-of-scope Q) is now covered → reclassified out→in (gate `in`
  **8/8 → 9/9**), and a new fresh out-of-scope Q (`e-taling-pepet`, a phonology topic) keeps the safety net
  at **3 (0 confident)**. **33 KB entries.** +2 red-proofed tests (red-proofed: both hedged pre-entry). Gate
  green: build · **1370** tests · lint 0 errors.
- **▶ NEXT (this feature, optional):** widen further (more proverbs, more vocab-upgrade base words, a real
  kata-nama-am/khas entry — currently a fresh out-of-scope gold Q); or — with a GEMINI_KEY — run the full
  `npm run eval:ai-tier` to confirm fact-recall is high + wrong-fact rate ~0 on the new areas.

---

## ✅ Free Cikgu tutor — calibrated CONFIDENCE GATE (stop confident-wrong answers) — SHIPPED 2026-06-14 (Opus xhigh)

The free rule-based Cikgu tutor no longer bluffs. `searchKnowledge`'s `scoreMatch` scrapes a point off
almost any query, so the top match was almost never empty — a weak/off-topic match was presented as
authoritative via `formatKnowledgeResponse`. **A confident WRONG grammar answer is the worst failure mode
for a learning tool** (a student trusts it). The free path now gates on a calibrated `MIN_CONFIDENCE` and
admits uncertainty below it.

- **Calibration (the key finding — keyless, deterministic):** ran the 12-question `goldCikgu.mjs` set
  through `searchKnowledge`. **Raw topScore does NOT cleanly separate in- from out-of-coverage** — the
  in-coverage "penjodoh bilangan" Q and the out-of-coverage "bagai aur dengan tebing" Q score
  **identically (28 each)**; keyword scoring can't tell "has the answer" from "matched the topic." **BUT
  there's a wide empty gap:** every genuinely-strong match is **≥49**, the whole ambiguous floor is **≤31**
  (nothing 32–48). **`MIN_CONFIDENCE = 40`** (mid-gap, robust to small KB edits).
- **Fork decisions (decide-and-flag, veto notes):** (1) **Threshold = 40** — *veto: cannot keep ALL
  in-coverage answers; the 2 weak-but-correct ones (penjodoh 28, dari-daripada 31) collide exactly with
  out-of-coverage scrapes, so NO threshold separates them. I honor the harder DON'T-BREAK clause — every
  STRONG match ≥49 still answers fully — and let the 2 weak ones hedge.* (2) **Below-threshold** — reuse
  the existing "here's what I cover" menu, prepend an honest admission that NAMES the closest topic + offers
  the free **✨ AI** tutor (*veto: a suggestion after still giving the menu + topic — never a dead-end, never
  a paywall; AI mode is free*). (3) **Scope** — gate the FREE path ONLY; **moved `getExpertResponse` into
  `cikguKnowledge.js`** as one pure shared fn so `CikguBot.jsx` AND the eval's `freeCikgu` import the SAME
  thing (kills the harness's hand-copied replication its own comment lamented). *Veto: did NOT widen KB
  coverage — bigger content task; flagged as the follow-up that recovers the 2 hedged in-coverage Qs.*
- **Measurable result (keyless `npm run eval:ai-tier`, new `[Cikgu · FREE confidence gate]` table):**
  **out-of-coverage confident answers 3/3 → 0/3** (all 3 route to honest uncertainty). In-coverage: 3/5
  strong matches still answer; 2 weak-but-correct hedge (flagged). Partial: 3/4. Untouched:
  `formatKnowledgeResponse`, the "Related" logic, `searchKnowledge`'s return shape, the AI tier.
- **TDD (red-proofed):** `src/data/__tests__/cikguKnowledge.test.js` (+6) — off-topic "bagai aur dengan
  tebing" → uncertainty + AI offer + names closest topic; nonsense → uncertainty; "Explain the meN- prefix"
  → full canned answer; `MIN_CONFIDENCE` in [32,48]; `isConfidentMatch` boundary. Watched the 3 gate cases
  FAIL first (ungated `getExpertResponse` returned `confident:true` for the off-topic/nonsense queries).
- **Verified:** build green (no chunk size change — pure data/logic) · **1361** unit tests (+6) · lint
  0 errors (same 3 pre-existing warnings). **No STORE_VERSION bump** (no persisted field).
- **▶ NEXT (this feature):** widen free KB coverage (add entries for the 3 legit-but-uncovered out Qs —
  peribahasa meaning, rencana structure, vocab upgrade — AND boost the 2 weak in-coverage entries'
  keywords so they clear 40). That's the proper recovery; a bigger content+QA task, deliberately separate.

---

## ✅ AI "Make a deck" + "Practise a conversation" go English-aware — SHIPPED 2026-06-14 (Opus xhigh)

The For-You AI generators now author the learner's ACTIVE study language. This closed a coherence gap
the v34 deck-scoping exposed: an English (0510) learner's generated cards were Malay AND — now that
ForYou/Study/Dashboard scope by `studyLang` — **invisible** in their deck. (English learner + BYOK key
+ "Make a deck" → unusable.) **Malay path byte-identical** (`lang` defaults `'ms'`).

- **Prompt (`deckGenerator.buildDeckPrompt(goal, topics, interests, lang)`):** for `'en'` it authors an
  IGCSE English (0510) deck — `m`=English word, `e`=Malay meaning, `ex`=English example. `'ms'`
  unchanged.
- **Grounding/validity — REUSES this session's assets** (the grounding fns key by `m`, so they're
  language-agnostic): new `buildEnDeckGroundingIndex(cards)` (reversed `dictionaryEn` ∪ the learner's
  en cards → seed/known English→Malay pairs auto-accept) + `loadEnglishValiditySet()` (the dense-page
  `buildKnownEnglish` blend = "is `m` a real English word?"). `annotateValidity` is generic Set
  membership → reused as-is. `generateGroundedDeck({…, lang})` routes by language; `'ms'` byte-identical.
- **Card lang (`MakeDeckPanel`):** reads `studyLang`, threads `lang` to `generateGroundedDeck` +
  `generateScenario` (was hardcoded `'ms'`), and **stamps `lang: studyLang` on `addCards`** — the actual
  coherence fix. The scenario generator was already lang-aware.
- **Mock:** added a `deckEn` case (`aiMocks.MOCK_DECK_EN_RESPONSE`) so `VITE_AI_MOCK`/dev work for English.
- **TDD (red-proofed):** `src/lib/__tests__/deckGeneratorEnglish.test.js` (+8: prompt direction,
  English grounding, validity, AND the full `generateGroundedDeck` English mock pipeline → grounded
  English cards) watched failing first; `makeDeckPanelLang.test.js` (+4 structural — studyLang read +
  card lang stamp + both generator calls). **e2e:** `make-deck.spec.js` +1 — `studyLang='en'` →
  English deck reply → grounded vs the English seed (3 verified) → cards added stamped `lang:'en'`.
- **Verified:** build green (ForYou 31.23 KB; `index` ±0) · **1355** unit tests (+12) · lint 0 errors ·
  **4/4** make-deck e2e green (incl. the new English test). No STORE_VERSION bump.
- **▶ NEXT (open threads):** lang-scope ForYou's non-card shelves (mistakes/grammar/speaking); a
  BYOK-generated richer 0510 seed; 0500 academic vocab; or pivot off English. The whole app's
  user-facing English surfaces are now bilingual.

---

## ✅ "Picked for you" (ForYou) follows studyLang + Roleplay English STT — last v34 voice leaks closed — SHIPPED 2026-06-14 (Opus xhigh)

The two remaining flagged v34 English voice/locale leaks are fixed. **ForYou** ("Picked for you") was
Malay-blind — it fed the FULL mixed deck + a hardcoded `lang:'ms'` to `buildForYouShelves` and spoke
`'ms-MY'`, so an English (0510) learner got a Malay/mixed page in a Malay voice (breaking the v34
no-mixing invariant). **Roleplay** static-mode speech input hardcoded `'ms-MY'` STT even for English
scenarios (its read-aloud at :300 was already `en-GB`).

- **ForYou now follows `studyLang`:** read `studyLang`, compute `langCards = cardsForLang(cards,
  studyLang)`, and feed it to `buildForYouShelves` (`cards`) + the due-count (`getDueCards`) + the
  daily-plan inputs; pass `lang: studyLang` (the builder already threads lang). The card speaker
  passes `localeFor(studyLang)` via a new `Shelf` `locale` prop. So an English learner sees ONLY their
  English deck, spoken `en-GB`; a Malay learner sees only Malay. (Mixed-deck users previously saw both
  — this is the intended no-mixing fix, matching Dashboard/Study, not a regression.)
- **DECIDE-AND-FLAG — scope line:** at the time, only the `cards` slice was scoped.
  **UPDATE 2026-06-14: the non-card signals (`mistakes`/`grammar`/`speaking`/`writing`) are NOW scoped too**
  — see the TOP section ("For You non-card shelves follow studyLang"). They DID have lang keys after all
  (`mistakes.language`, `speaking/writing .lang`, grammar `eng-` ids), so the earlier "no lang field to key
  on" veto was superseded once those fields were verified.
- **Roleplay STT:** one line — `startRecognition(scenario.lang === 'en' ? 'en-GB' : 'ms-MY')`,
  mirroring the lang-aware TTS at :300.
- **TDD (red-proofed):** `src/pages/__tests__/forYouLang.test.js` (+3, jsdom mount + MemoryRouter +
  mocked speech — en-scoping hides the Malay card + the speaker calls `speak(…, 'en-GB')`; watched
  failing on the old mixed/ms-MY behaviour first). `roleplaySttLocale.test.js` (+2, structural —
  red-proofed by temporarily restoring the hardcode).
- **Verified:** build green (ForYou 29.76 KB; Roleplay unchanged; `index` ±0) · **1343** unit tests
  (+5) · lint 0 errors · **8/8** `for-you` + `for-you-settings` e2e green (no regression — seeded
  cards lack a `lang` field → default `'ms'`, still shown under the default `studyLang`). No
  STORE_VERSION bump.
- **▶ NEXT (open threads):** ForYou non-card shelves are now lang-scoped (DONE — see the TOP section);
  `MakeDeckPanel` is now English-aware (DONE — see the TOP section); or pivot to a non-English area
  entirely. Reader + study-loop + ForYou + AI-deck-gen English parity are all DONE.

---

## ✅ English full-document translation — reader English parity COMPLETE — SHIPPED 2026-06-14 (Opus xhigh)

The reader's **Full-translation page** (`FullTranslationView` — reveal a whole document's translation
paragraph-by-paragraph) now works for **English (0510 ESL)** docs. This was the LAST reader Malay-only
surface; with it, the whole reflow reader is bilingual (word-tap + dense-page easing + sentence-reveal
+ full-doc translation). **Malay byte-identical** (props default to ms→en; gate collapses to the
shipped value for a Malay learner).

- **Same direction-fix shape as sentence-reveal:** both `translateDocument` calls in
  `FullTranslationView` (`revealOne`, `revealAll`) passed NO `from/to` → defaulted ms→en (wrong
  direction on an English doc). They now take `from`/`to` props (PDFReader passes `plan.from/plan.to`).
- **3 forks (pre-resolved in the kickoff):** (1) direction — `from`/`to` props, default `'ms'`/`'en'`;
  (2) un-gate — `fullTranslationDisabled = docLang === (isEn ? 'ms' : 'en')` (symmetric, mirrors
  `sentenceDisabled`; Malay learner byte-identical → still hidden on an English doc, pinned by
  `full-translation.spec.js` "English document hides the entry"); (3) copy — a `revealLabel` prop
  (default `'English'` ⇒ Malay byte-identical; `'Malay'` for English) flips the paragraph reveal/hide
  labels + the "read the X first, reveal the Y" notice.
- **Also fixed (grammar, found via the e2e):** last increment's sentence-toggle tooltip read "a English
  document" — now "an English document" / "a Malay document".
- **TDD (red-proofed, GATED):** `src/components/__tests__/fullTranslationDirection.test.js` (+3, jsdom
  mount + mocked `translateDocument`) — watched failing (no from/to threaded; label not flipped) first.
- **End-to-end proof (NEW — pays down the English-reader verification debt):**
  `tests/e2e/english-reader.spec.js` (+2) sets `studyLang='en'`, loads `english-doc.pdf`, and asserts
  the REAL gtx request carries `sl=en&tl=ms` (never ms→en) for BOTH the Full-translation page AND
  sentence-reveal (regression-covers the prior increment, which previously had no e2e). The 3 prior
  English-reader increments were unit-tested + reasoned only — this is the first browser-level proof
  that the en→ms direction actually fires.
- **Verified:** build green (`FullTranslationView` 7.73 KB; `PDFReader` 79.90 KB; `index` unchanged) ·
  **1338** unit tests (+3) · lint 0 errors · **21/21** Malay e2e (`full-translation` + `sentence-reveal`)
  green (no regression) · **2/2** new English e2e green. **No STORE_VERSION bump.**
- **▶ NEXT:** reader + study-loop + ForYou English parity are ALL DONE; the flagged TTS/STT leaks are
  fixed (see the TOP section). Remaining English-study work is non-reader: a BYOK-generated 0510 vocab
  seed; 0500 academic vocab; lang-scoping ForYou's non-card shelves; or pivot off English entirely
  (the app has many other surfaces).

---

## ✅ English reader SENTENCE-LEVEL reveal — SHIPPED 2026-06-14 (Opus xhigh)

The reflow reader's **sentence-level reveal** (read a sentence, tap to reveal its whole-sentence
translation, then one-tap "add its unknown words to my deck") now works for **English (0510 ESL)**
docs, completing English reader parity. Before, the whole feature was gated off for English
(`sentenceDisabled = docLang === 'en'`) and its plumbing was Malay-only. **Malay + the F7 ladder are
byte-identical** (`isEn=false` → every changed expression collapses to the shipped value).

- **5 forks (pre-resolved in the kickoff, all executed):** (1) **direction** — an English learner
  reveals the sentence's **Malay** translation (en→ms); the two sentence-translation calls
  (`runSentenceTranslation`, `fetchSentenceEnglish`) now thread `plan.from/plan.to` (they were
  calling `translateDocument` with NO from/to → silently defaulting ms→en, i.e. wrong-direction on
  an English doc). (2) **ladder OFF for English** — `ladder = hasInstructProvider() && !isEn` (the
  F7 simpler-**Malay** rung is Malay-source-only; English goes straight to the direct reveal).
  (3) **unknown set** — extracted pure `sentenceUnknowns(sentences, wordByIndex, isKnown)` (in
  `sentenceModel.js`, predicate-driven); English injects the **same blended known-set** built for
  the dense-page feature (`makeIsKnownEnglish`), Malay injects dictionary-membership. (4) **enable
  guard symmetric** — `sentenceDisabled = docLang === (isEn ? 'ms' : 'en')` (mirrors the density
  guard: an English learner gets sentence-reveal on an English/unknown doc, not on a clearly-Malay
  one). (5) **copy** — `SentenceReveal` gains a `revealLabel` prop (default `'English'` ⇒ Malay
  byte-identical; `'Malay'` for English) + the toolbar tooltip flips by `isEn`.
- **Decide-and-flag — `FullTranslationView` kept Malay-only:** it shared the old `sentenceDisabled`
  gate but is still hardcoded ms→en (no `plan`). I decoupled it (`fullTranslationDisabled = isEn ||
  docLang === 'en'`) so it stays hidden for English instead of wrong-direction-translating English
  text. **Full-document English translation is the remaining reader follow-up.** *(Veto: threading
  `plan` through `FullTranslationView` is its own increment, out of scope here.)*
- **TDD (red-proofed):** `src/lib/__tests__/sentenceUnknowns.test.js` (+7, watched failing on the
  missing export first) — incl. a Malay dictionary-predicate case pinning the unchanged behaviour.
- **Verified:** build green (PDFReader 79.85 KB / 23.5 KB gz, +0.36 KB; `index` unchanged) · **1335**
  unit tests (+7) · lint 0 errors (same 3 pre-existing warnings). **No STORE_VERSION bump.**
- **▶ NEXT (reader):** DONE — full-document English translation shipped (see the TOP section); reader
  English parity is complete, and `tests/e2e/english-reader.spec.js` now covers the en→ms direction
  end-to-end for full-doc + sentence-reveal.

---

## ✅ English reader dense-page easing — SHIPPED 2026-06-14 (Opus xhigh)

The reflow reader's **dense-page help** (the non-punitive "this page has a lot of new words —
want the translation shown as you read?" banner) now works for **English (0510 ESL)** docs, not
just Malay. Before today, an English learner loading an English doc got density ≈ 0 (every English
word was "unknown to the Malay dictionary", but the banner was hard-suppressed on English docs) — so
no too-hard easing, only tap-to-translate. **Malay behaviour is byte-identical.**

- **Why density was dead for English (both fixed):** (1) `unknownDensity` measured "unknown to the
  **Malay** dictionary" → pinned at ≈1.0 for any English text; (2) the eligibility guard
  `docLang !== 'en'` hard-suppressed the banner on every English doc.
- **Fork decisions (logged + veto-noted):** (1) **Known-English source = a blend** — a high-frequency
  English list (the principled base; Nation's running-word coverage) ∪ the `dictionaryEn` 682 seed ∪
  the learner's own `lang:'en'` cards. *Veto: seed-only fires on easy text (function words absent →
  false nudges); deck-only ≈ 0 for a beginner → always dense.* (2) **Lemmatisation = a light pure
  English de-inflector** (`enLemmaCandidates`: plural/past/gerund/comparative/adverb, incl.
  e-restore + doubled-consonant), NO Malay stemmer. *Veto: exact-only over-counts inflections;
  full Porter mangles + forces pre-stemming the list.* (3) **Scope = dense-page banner FIRST**;
  sentence-reveal (`sentenceUnknownsById`) is a later increment. *Veto: bundling it balloons the
  diff into the reflow render + F7 ladder.*
- **Frequency asset:** `src/data/englishFrequency.js` = top-2000 of `first20hours/google-10000-english`
  (MIT code; Google corpus, educational/personal use permitted — fits our non-commercial no-paywall
  invariant; commercial caveat + the NGSL swap-path noted in `public/CREDITS.txt`). Fetched once +
  committed via `scripts/build-english-frequency.mjs` (`npm run build:en-freq`). **Own lazy chunk**
  (`englishFrequency-*.js`, ~13.8 KB / 7.6 KB gz; `loadEnglishFrequency`) — NOT in the eager bundle.
- **Pure core (TDD, red-proofed):** `src/lib/englishKnownWords.js` (`enLemmaCandidates`,
  `buildKnownEnglish`, `makeIsKnownEnglish`). `unknownDensity(tokens, dict, grounding, isKnown?)`
  gains an **optional injected `isKnown` predicate** — Malay path byte-identical when omitted.
- **Wiring (`PDFReader.jsx`, surgical):** lazy-builds the blended known set when `studyLang='en'`
  (until ready, English density reports not-dense → no premature nudge); density branches on `isEn`;
  the guard is now symmetric (`docLang !== wrongLang`, `wrongLang = isEn ? 'ms' : 'en'` — suppresses
  the English nudge on a clearly-Malay doc, where en→ms reveal would be wrong-direction); banner +
  Settings copy flip by `isEn`/`studyLang` (English learner → "Show **Malay** as I read", "you'll
  still see the English first"). The reveal action reuses the **existing en→ms `translatePage`+`showAll`
  plumbing untouched** — no new reveal path.
- **Real-asset calibration (measured, pinned):** normal IGCSE-level English ≈ **0.04** unknown → NOT
  dense (no false nudge); academic English ≈ **0.81** → dense → banner fires. The 0.4 threshold sits
  cleanly between.
- **Verified:** build green (PDFReader 79.5 KB / 23.3 KB gz, +~2.2 KB raw for the wiring; eager
  `index` unchanged; frequency = a separate lazy chunk) · **1324** unit tests (+26:
  `englishKnownWords.test.js`, `unknownDensity.test.js` injected-predicate, `englishDensityCalibration.test.js`,
  all red-proofed first) · lint 0 errors (same 3 pre-existing warnings). **No STORE_VERSION bump**
  (read-only of `studyLang`; no new persisted field).
- **▶ NEXT (this feature):** DONE — sentence-reveal AND full-document translation both ship for
  English now (see the two sections ABOVE). Reader English parity is complete.
- **Flagged → now PARTLY DONE:** `tests/e2e/english-reader.spec.js` pins the en→ms direction
  end-to-end for full-doc + sentence-reveal. A dense-page **banner** e2e for English still needs a
  hard-English fixture (the pure + real-asset calibration tests cover the
  logic; the React wiring is reasoned + build-verified, not e2e'd this increment).

---

## ✅ Produce mode — selectable productive recall — SHIPPED 2026-06-14

The app's #1 principle (production > recognition) is now a CHOICE, not just an FSRS surprise.
A 7th Study pill **Produce** → `src/components/study/ProduceMode.jsx` shows the gloss
(`card.e`) and asks you to **produce** the target word (`card.m`), graded by an **exact**
trim/lowercase match. FlashcardMode's reverse/produce variants already did this, but ONLY
when the FSRS variant engine handed Flashcard mode a Strong/Mature card — New/Learning cards
never got it, and the user-facing Type mode is recognition-only. Produce makes production
available for ANY card in any state.

- **Bilingual by `card.lang`:** 🇲🇾 deck → show English gloss, "Type the Malay word…"; 🇬🇧
  deck → show Malay gloss, "Type the English word…" (mirrors FlashcardMode reverse). It
  inherits `studyLang` deck scoping for free (the session is already filtered upstream).
- **Affordances:** optional blanked context line when `card.ex` is usable (reuses
  `drillVariants.js`'s `>10`-char rule) + a "Show first letter" hint (try-first, reveal-freely).
  ConfidenceSlot / WrongExtras / hypercorrection / FeedbackLive wired exactly like `TypeMode`.
- **`mode` is local `useState` → NO STORE_VERSION bump.** FlashcardMode and the FSRS
  adaptive-variant engine are **untouched** — Produce is purely additive.
- **Verified:** build green (Study chunk 28.4 KB, index unchanged); 1287 unit tests
  (+8 in `src/components/study/__tests__/produceMode.test.js`, red-proofed first); lint 0
  errors. The a11y FeedbackLive structural sweep now covers ProduceMode too.
- **Out of scope (own spec):** production as a global default/toggle across Quiz+Listen+Speak;
  Levenshtein typo tolerance. *(The latent `VARIANT_INFO` Malay-only badge bug → fixed; see below.)*

---

## ✅ TTS locale parity in the study path — SHIPPED 2026-06-14

Two leftover spots pronounced an **English** card in a **Malay** voice (v34 cards carry `lang`;
`localeFor(lang)` is the single locale source). Both now follow `card.lang`:
- `FlashcardMode.jsx:95` — the keyboard **`s`** shortcut hardcoded `'ms-MY'` (the on-card
  speaker button was already correct). Pressing `s` on a 🇬🇧 card now speaks `en-GB`.
- `MixedSession.jsx` (Smart Study) — both speaker buttons called `speak(item.m)` with **no**
  locale → defaulted to `ms-MY`. Now pass `localeFor(current.item.lang)`.

**Verified:** build green; 1301 unit tests (+5 in `studyTtsLocale.test.js` — behavioural mount
for the FlashcardMode `s` key, structural source-pin for the store-coupled MixedSession buttons;
red-proofed first); lint 0 errors. No STORE_VERSION bump.

**▶ FIXED 2026-06-14 (see the TOP section):** `Roleplay.jsx` static-mode STT now follows
`scenario.lang` (traced reachable — the static turn UI DOES render English scenarios; :300 already
spoke `en-GB`), and `ForYou` now follows `studyLang` (scopes the deck + speaks `localeFor(studyLang)`).
`CikguBot`/`WordFamilyTree` are Malay-domain → correct as-is.

---

## ✅ Bilingual variant badges — SHIPPED 2026-06-14

The last hardcoded-Malay leak in the study loop. The adaptive-variant badge/desc (shown above
a Flashcard/Smart-Study card, e.g. "E → M — English to Malay") came from the static Malay-centric
`VARIANT_INFO`, so an **English** card showed the **wrong direction** — "E → M" on a reverse card
that is actually Malay→English, "M → E+" on a hint card that's English→Malay. The renderers below
the badge already flipped correctly; only the badge lied.

- Pure helper `variantInfoFor(variant, lang)` in `src/data/drillVariants.js` is now the single
  source: `standard`/`hint` = word→gloss, `reverse` = gloss→word, flipped by `card.lang`;
  `cloze`/`audio`/`produce` stay language-neutral. `lang` omitted ⇒ `'ms'` ⇒ **byte-identical**
  to the legacy table (zero Malay regression).
- Both consumers (`FlashcardMode.jsx:51`, `MixedSession.jsx:170`) call it with the card's lang.
- **Verified:** build green (Study/index chunks unchanged); 1296 unit tests
  (+9 in `src/data/__tests__/drillVariants.test.js`, red-proofed first); lint 0 errors.
  No STORE_VERSION bump.

---

## ✅ F5 Increment 7 — study-mode labels name the right language — SHIPPED 2026-06-14

Fixed a live wrong-language instruction: `TypeMode.jsx` hardcoded "Type the English
meaning", shown even to an English learner whose answer (`card.e`) is the **Malay** gloss.
Now both `TypeMode.jsx` and `QuizMode.jsx` flip by `card.lang` — `en` card → "Type the
Malay meaning" / "Choose the correct Malay meaning"; `ms` → English (byte-identical to
before). The flip is the **opposite** of FlashcardMode's reverse-mode word labels because
these two modes check against `card.e` (the gloss), not `card.m` (the word). Label-only →
**no STORE_VERSION bump**. The other 4 study modes (Flashcard/Listen/Speak/Cloze) were
already correct. Pinned by `src/components/study/__tests__/typeModeLang.test.js` (+4 tests,
red-proofed first). All 7 study modes now show the right language for both `card.lang` values.

**▶ READER ENGLISH PARITY: COMPLETE (2026-06-14).** word-tap (Select-mode), dense-page easing,
sentence-level reveal, AND full-document translation all support English — see the four "English
reader …" sections at the TOP. The word-level gloss layer (`buildGlossIndex`) stays Malay-based by
design (N1 — English word-tap is Select-mode). Productive gloss→word recall is DONE via Produce mode.
Kickoffs (all done): `2026-06-14-english-reader-grounding-kickoff.md` (density),
`…-english-sentence-reveal-kickoff.md` (sentence-reveal), `…-english-full-doc-translation-kickoff.md`
(full-doc). **Next English-study work is non-reader** (BYOK 0510 seed / 0500 academic vocab / TTS-STT
leaks) — or pivot to another surface entirely.

---

## ✅ "Study from a recording" — PHASE 1 SHIPPED 2026-06-14

Free, on-device audio → transcript → the existing reveal-gated reader. On `/pdf-reader`,
upload or **record** a clip (teacher voice note, listening track); it transcribes
**on-device — the audio NEVER uploads** — and feeds the SAME `{pages}` reader, so the
word-gloss → FSRS core is untouched (audio is just another producer of the reader shape,
like OCR). Tap a word → translate / build a flashcard exactly as with a PDF.

**Model:** `mesolitica/malaysian-whisper-base` → ONNX, **fully int8 (q8), ~103 MB**.
Real WER on FLEURS: **Malay 20.1% / English 14.6%** (generic whisper-base = 50% Malay →
rejected). Self-hosted under `public/asr/` (gitignored); `scripts/copy-asr-assets.mjs`
**fetches it from the GitHub Release `asr-model-mesolitica-base-q8`** at build time and copies
the ORT-Web wasm from node_modules. Recipe + the merged-decoder quantize fix: `CONVERSION.md`.

**⚠️ PINNED to `@huggingface/transformers` v3 (^3.8.1) — DO NOT bump to v4.** v4.2.0 pulls a
nightly ORT-web (1.26-dev) that DEADLOCKS pipeline()/session-create in the browser (hangs at
"Setting up the speech model… 100%", never fetches the wasm, no error — yet loads fine in
Node). v3.8.1 (ORT-web 1.22) works in-browser. Re-verify in a real browser before any bump.

**Shape:** `src/lib/transcribe.js` (pure — `{pages}` producer + `runTranscribe` +
`isSilentSamples`) + `src/lib/transcribeEngine.js` (lazy transformers.js + Web Audio decode,
self-hosted, MAIN THREAD for now). `PDFReader.handleFile` branches on `audio/*`. STORE_VERSION
**33** (`pdfReader.asrLang`; one combined MS/EN toggle drives both OCR + ASR). Lazy chunk
`transformers.web` ≈847 KB (loaded only when transcribing; eager `index` unchanged ±0).
Whisper hallucinates subtitle credits on silence → `isSilentSamples` gates no-speech to the
friendly empty state.

**Verified:** 1239 unit tests; `tests/e2e/audio-transcribe.spec.js` (6 tests vs a production
PREVIEW server :4173 — happy path/Q-ACC, silent→empty/Q-EMPTY, cancel, bad file, theme swap,
**offline N5**). ASR e2e runs against `vite preview` (not dev): ORT's wasm glue is a /public
static asset Vite dev can't import, and offline needs the built SW. Headless gets a /asr
`no-store` (preview-only middleware) for the ~76 MB model's ERR_CACHE_WRITE_FAILURE.

**Follow-ups (Phase 1.5 / 2):** (1) move `createTranscriber` into a module Web Worker → zero
UI-freeze during inference (main-thread now; the injected-contract shape is drop-in);
(2) BYOK "Sharper listen" (cloud ASR for messy clips — mirror the OCR vision rung);
(3) video → audio → transcript; (4) revisit transformers.js v4 once its ORT-web stabilises.
Spec/plan: `docs/superpowers/{specs,plans}/2026-06-13-multimodal-audio-transcribe*`.

---

## ✅ True English study mode — PHASE 1.5 / F5 INCREMENTS 1 + 2 + 3 + 4 + 5 SHIPPED 2026-06-14 (Opus xhigh)

English learners can now **grow** their English deck from real text via BOTH the **Import page** and the
**PDF/photo/audio reader** (no longer capped at the 682-word starter seed). With `studyLang='en'`, tapping or
selecting an English word builds a `{ m:English, e:Malay-gloss, lang:'en' }` card — gloss from the reversed
`dictionaryEn` seed first, then `translateWord(w,'en','ms')` fallback, **no Malay stemmer**. `studyLang='ms'`
is **byte-identical to before** (proven by the unchanged reader-keyboard + OCR e2e).

- **Keystone decision (the one fork, resolved):** the active **`studyLang` signals the text's SOURCE
  language** → fixes gloss direction + deck. (Vetoed: reader `ocrLang`/`asrLang` = recognizer language not
  study intent; per-surface override = a later increment; auto-detect = silent-misfile risk.)
- **Pure core (TDD, red-proofed):** `src/lib/glossPlan.js` `glossPlanFor(studyLang)` →
  `{ lang, from, to, useStemmer }` — the direction lives in ONE place so Import + the reader can't diverge
  (mirrors `localeFor`/`cardsForLang`). 3 tests in `glossPlan.test.js`. Shared lazy `dictionaryEn` loader =
  `src/lib/enDictionary.js` (`loadEnDictionary`, still its own ~12.5 KB chunk, N4 ✓).
- **Increment 1 — Import.jsx:** `processText`/`processWordByWord`/`translateUnknown`/`addSelected` thread the
  plan — English uses the lazy seed, skips `stem()`, translates `en→ms`, stamps `lang:'en'`; copy/placeholder
  follow the source language.
- **Increment 2 — PDFReader.jsx:** all `translateWord`/`translateBatch` calls thread `plan.from/plan.to`; the
  3 card-creation sites (`addSelectionToDeck`, `addGloss`, `addUnknownsFromSentence`) stamp `lang:plan.lang`;
  EN card-creation does seed-first gloss via `glossEnWords` ("never a Malay-dict miss"); `translatePage` glosses
  `en→ms`. **N1 honored — the reveal-gated `{pages}` grounding engine (buildGlossIndex / groundingIndex /
  collectDocTokens / unknownDensity / sentenceUnknownsById) stays Malay-based.** For an English doc those treat
  every word as unknown, so the working English path is **Select-mode / tap-translate** (English docs already
  disable sentence-reveal via `detectDocLanguage`). PDFReader chunk 77.3 KB (+0.56 KB; the jump from the
  recorded ~71 KB is pre-existing audio-transcribe drift — re-recorded in CLAUDE.md).
- **Increment 3 — Fork I / Task 11 (bilingual surfaces follow `studyLang`):** the 4 surfaces with a real
  binary lang toggle now seed their INITIAL value from `studyLang`, still toggleable in-page —
  **Roleplay** (`'ms'|'en'`), **Speaking** (`'malay'|'eng'`, only when no preset topic), **Grammar**
  (`'malay'|'eng'`), **Writing** (`'malay'|'eng'`; was hardcoded `'eng'` → now follows `studyLang`, so an
  `ms` user opens Writing in Malay). Flip the global switch once and the app leans that language.
  **DECIDE-AND-FLAG — scoped to those 4: Comprehension + Listening are passage PICKERS** (each passage
  carries its own `lang` tag; no binary toggle), so "follow `studyLang`" there = a different mechanism + UX
  call — **done in Increment 5 below** (the pickers now LEAD with the active language, not filter). **Bonus
  fix surfaced by this change:** Speaking's mistake-journal language tag
  was a pre-existing typo (`lang === 'en'` never matched — `lang` is `'eng'`), so English speaking-mistakes
  were mis-tagged `'ms'`; fixed to use the existing `isEng`.
- **Increment 4 — Fork F (English mistakes → FSRS auto-promotion):** completes the app's #1 principle
  ("mistake → spaced retrieval") for English learners. **Store gate** (`useStore.js`): the old strict
  `added.language === 'ms'` is now `canAutoPromoteMistake(language, category)` — a tiny pure helper (Malay:
  vocab+imbuhan; **English: vocab only**, no imbuhan; any other/untagged language never promotes, so the
  pre-v34 gate is byte-identical). `promoteMistakeToCard` already stamped `lang` off the mistake's language, so
  an English vocab miss now seeds a `{ m:English, e:Malay-gloss, lang:'en', t:'Mistakes' }` card that lands in
  the English Due queue (`cardsForLang(cards,'en')`). **Sources** (`Dictation.jsx` + `ClozeListening.jsx` —
  the ONLY two surfaces that emit `en`+`vocab`+word+gloss; audited every `addMistake` site to confirm):
  English misses gloss to Malay via `glossFor(word, DICTIONARY_EN)`, the seed loaded lazily into a `useRef`
  (dict stays a lazy chunk — N4 ✓) and read synchronously in `check()`; words absent from the seed stay
  **journal-only**, byte-identical to the Malay contract (no network-translate fallback in the hot path). No
  STORE_VERSION bump (no new persisted field). **TDD red-proofed:** new `englishMistakePromotion.test.js`
  (4 cases — seed-known EN miss → `lang:'en'` card; no-gloss → journal-only; EN imbuhan → never; Malay
  vocab+imbuhan unregressed) watched failing on the old gate first; updated the now-obsolete en-negative case
  in `listeningMistakePromotion.test.js` to the new invariant.
- **Increment 5 — Fork I finished (Comprehension + Listening pickers LEAD with `studyLang`):** the last
  "whole app leans your language" gap. An English learner who flips the global 🇬🇧 switch now opens both
  core IGCSE skill pickers — **Comprehension** (Paper 1 reading) and **Listening** (Paper 4) — to the
  English-badged passages on top; Malay still listed below (lead, don't filter — non-punitive, no dead-ends).
  Flip to 🇲🇾 and Malay leads; the set is identical, nothing vanishes. **Pure core (TDD, red-proofed):**
  `src/lib/passageOrder.js` `leadByLang(items, lang, getLang?)` — a stable reorder-don't-filter sort shaped
  exactly like `interests.js prioritiseByInterests` (explicit `idx` tiebreak; non-array → `[]`; no mutation;
  any non-`'en'` lang → the Malay default; missing-`lang` items sink to the bottom group). 8 tests in
  `passageOrder.test.js` watched failing (module-missing) first. **Wiring:** Comprehension **composes** it
  over the already interest-prioritised `{ item, matchedInterests }` array via the custom accessor
  `(w) => w.item.lang` — so **language is the primary key and the interest order rides along as the stable
  secondary** (both reorder-don't-filter, so starred topics still float within each language group); Listening
  sorts the raw `LISTENING_PASSAGES` list. **No STORE_VERSION bump** (read-only of the existing `studyLang`
  pref). Both pages stay lazy. Untouched: the EN/MY badge, AI question gen, Comprehension's Malay-only
  word-tap, mistake logging.
- Gate green: build (Comprehension 13.8 KB / Listening 10.2 KB — both far under the 70 KB page budget;
  `index` unchanged) · **1273** unit tests (+8) · lint 0 err (same 3 pre-existing warnings — the
  Comprehension `userInterests` one is the documented baseline, unchanged). e2e: `study-lang.spec.js` **5**
  (added "pickers lead with studyLang" — first card EN under 🇬🇧, MY under 🇲🇾, both pickers, 5.5 s).
- **Increment 6 — RoleplayScorecard tags mistakes by the roleplay's language (last loose thread):** closes the
  one place the "English mistake → spaced retrieval" loop leaked. `RoleplayScorecard.jsx` hardcoded
  `language: 'ms'` at all 4 `addMistake` sites, so an English (🇬🇧) roleplay's missed key phrases were
  journaled as Malay and — now that Increment 4 (Fork F) auto-promotes English vocab misses — seeded a
  **wrong-language** card (Malay deck) instead of the English Due queue. **One-line fix:** derive
  `const lang = scenario?.lang === 'en' ? 'en' : 'ms'` once in the save-on-mount effect and thread it to all 4
  sites. The store gate (`canAutoPromoteMistake`/`promoteMistakeToCard`) was already correct, so no store
  change. **No STORE_VERSION bump.** **TDD (END-RESULT, red-proofed):** new
  `src/components/__tests__/roleplayScorecardMistakeLang.test.js` (jsdom) **mounts** the real scorecard with an
  EN scenario + `keyPhraseMissed` and asserts the journaled mistake is `language:'en'` AND the auto-promoted
  card is `lang:'en'` (in the English partition, not Malay); watched failing against the hardcode first
  (`expected 'ms' to be 'en'`). A Malay-scenario case (`scenario.lang` undefined → `'ms'`) pins byte-identical
  behaviour.
- Gate green: build (`PDFReader` unchanged; `index` unchanged — markdown + component-internal change) ·
  **1275** unit tests (+2) · lint 0 err (same 3 pre-existing warnings).
- **▶ NEXT — deeper-English follow-ups:** productive (gloss→word) direction; English grounding/`unknownDensity`
  in the reader; BYOK-generated 0510 seed; 0500 academic vocab.

---

## ✅ True English study mode — PHASE 1 SHIPPED 2026-06-14 (Opus xhigh)

First-class IGCSE **0510 (English as a Second Language)** vocab→FSRS study — a student can now revise English
as the *target* language, not just Malay. **Design insight (verified in code):** the 6 study modes already
treat `card.m` = prompt word / `card.e` = gloss, so English = a per-card `lang` flag + a TTS/STT locale switch
+ content — **NOT a study-loop rewrite**. Gate green per commit: build · **1258** unit tests (+16) · lint 0 err
· content. New e2e `tests/e2e/study-lang.spec.js` (2, green vs the production preview server). STORE_VERSION
**33→34**. Eager `index` ~471.7 KB / 150.8 KB gz (≈unchanged — `dictionaryEn` is a lazy chunk).

- **Engine:** per-card `lang` (`'ms'｜'en'`, backfilled `'ms'` via exported `applyV34Migration`); persisted
  global `studyLang` + `setStudyLang`; `cardsForLang(cards,lang)` (`src/lib/cardLang.js`) scopes Dashboard
  counts + Study + Smart-Study (**no MS/EN mixing** — e2e-proven: seed → 682 en / 0 ms); `localeFor(lang)`
  (`src/lib/langLocale.js`) = single TTS/STT locale source, wired into Flashcard/Listen/Speak; card dedupe
  widened to `(m,t,lang)`.
- **Content:** `buildEnDictionary` (`src/lib/reverseDictionary.js`) reverses the 825-entry dictionary →
  committed `src/data/dictionaryEn.js` (**682 English→Malay headwords**; `npm run build:en-dict`). Dashboard
  empty-state "Start your English deck" → `seedEnglishStarter` (lazy, deck `'English'`). Grounded in the
  L1-gloss>L2 vocab meta-analysis (Malay = the ESL learner's L1).
- **UI:** `StudyLangSwitch` (`src/components/StudyLangSwitch.jsx`) in Settings + compact on Dashboard/Study.
  Import/PDFReader stamp `lang:'ms'` on cards they create (Malay-source pipeline) so they never leak into the
  English deck.
- **Decisions (decide-and-flag, all in the spec):** target 0510 (0500 First-Language served by the bilingual
  Writing/Comprehension surfaces); global switch + per-card lang over parallel decks; reuse /study
  /smart-study /dashboard (no new route); generalize `m`=target/`e`=gloss (no rename).
- **⏳ DEFERRED to Phase 1.5 (flagged, NOT built):** **F5** reader/Import *English-source* gloss path
  (re-points the Malay stemmer/translate/grounding — risks the reader core N1); **Task 11** (bilingual surfaces
  follow `studyLang`); English mistake→FSRS promotion; productive (gloss→word) direction; BYOK-generated 0510
  seed; 0500 academic vocab; English `unknownDensity`.

Spec/plan: `docs/superpowers/{specs,plans}/2026-06-14-true-english-study-mode*`.

---


## ✅ For You Phase 2 — increments A + B + C ALL SHIPPED 2026-06-13

AI custom decks now work for ANY BYOK provider, and the AI roleplay seed is live. Gate green:
build · **1145** unit tests (+19 across A/B/the fix) · lint 0 errors · content. ForYou page chunk
28.6 KB (RoleplaySession stays its own 27 KB lazy chunk — off the ForYou eager path). Spec:
`docs/superpowers/specs/2026-06-13-for-you-phase2-completion-design.md`.

- **Increment A (commit 059360b):** `generateDeckText` now tries `callInstruct` (the user's own
  OpenRouter/Gemini/Ollama key, router cooldown auto-switch) FIRST, then the legacy chain; panel
  gate adds `hasInstructProvider()`. Red-proofed `deckGeneratorInstruct.test.js` (4); old
  `deckGenerator.test.js` untouched + green.
- **Increment B (THIS commit):** `src/lib/scenarioGenerator.js` (pure, red-proofed 7 tests) —
  `buildScenarioPrompt` + STRICT-validating `parseScenarioCandidate` (rejects malformed JSON,
  empty examiner, bad turn count, non-array keyVocab, missing title; caps turns ≤6; whitelists
  keys so prompt-injection fields never reach React). `generateScenario` reuses A's chain.
  `aiMocks.js` gains a `scenario` case. `MakeDeckPanel` gets a 2nd CTA "Practise a conversation"
  → preview card (provenance + dotted unknown-vocab cue) → launches the EXISTING
  `RoleplaySession({ scenario, onExit })` (lazy). DECISIONS: scenarios SESSION-ONLY v1 (veto:
  "my scenarios" shelf later); unknown keyVocab marks but never blocks (veto note in spec).
- **🔧 Fix found mid-build (commit a4268d3):** `glossFor` (listening-mistakes feature from the
  earlier loop) guarded `Array.isArray(dictionary)` but `src/data/dictionary.js` is an OBJECT MAP
  → it returned '' for EVERY word, so dictionary-known Dictation/ClozeListening misses were
  journaled WITHOUT a gloss and NEVER auto-promoted to FSRS. Tests were green because the unit
  fixtures were arrays and the e2e asserted journaling, not promotion. **This is the canonical
  "overnight loop ships green-but-broken" failure mode** — see the ⚠️ quality-watch note below.

### ✅ INCREMENT C — SHIPPED 2026-06-13 (Opus session; the polish layer)
Tier-2 CC-BY-4.0 Malay validity word-list now labels the deck confirm-flow. Gate green: build ·
**1162** unit tests (+10) · lint 0 errors. **Hard gate met: the validity asset is its OWN lazy
chunk `malayValidityList` = 71.0 KB gz ≤ 120 KB** (loads only at deck-gen; main bundle untouched).
- **Data:** `scripts/build-malay-validity.mjs` (committed, regenerates from the pinned source URL
  or a local `.dic`) processes iannho/Malay-Dataset `dictionary/Malays.dic.txt` (24.5k words,
  hunspell) → `src/data/malayValidityList.js` (24,439 words; flags stripped, lowercased, deduped,
  sorted; newline string for smallest gzip). License **re-verified** CC-BY 4.0 on the *data* (repo
  code is Apache-2.0) → attribution in `public/CREDITS.txt` + the asset header.
- **Logic:** `src/lib/malayValidity.js` (pure, TDD 9 tests) — `buildValiditySet`,
  `isRealMalayWord` (phrase = every token real), `annotateValidity` (additive `validWord` flag,
  never mutates). Wired in `deckGenerator.generateGroundedDeck` via `loadMalayValiditySet()`
  (lazy + **try/catch → empty Set**, so a Tier-2 load failure can NEVER break A+B deck-gen).
- **UI:** `MakeDeckPanel` review rows now show a NEUTRAL "real word" pill + "Real Malay word —
  confirm the meaning" hint ONLY when the word is unknown-to-dictionary BUT real (no suggestion).
  DECISION: positive-label-only — the list omits some inflected forms, so a miss ≠ fake word; we
  never show a warning (false-alarm risk). Pill is deliberately neutral (not the accent "verified"
  look) so it can't be mistaken for full verification. Badge copy compressed from the spec's "real
  word, translation unconfirmed" to a pill + hint (a full sentence overflows the pill).

---

## 🛡️ QUALITY-WATCH — ✅ AUDIT DONE 2026-06-13 (Opus xhigh): code clean, canonical bug now LOCKED
The `glossFor` bug passed build + 1133 tests + lint + a feature e2e yet was 100% dead (test
fixtures didn't match the production data shape). A dedicated audit swept every feature shipped
since 2026-06-10 for that bug CLASS. **Verdict: all shipped code is correct** — the glossFor fix
(a4268d3) is real, and the For You A/B, listening-mistake routing, countMastered, skillBalance,
examReadiness, calibration panel, deck/scenario generators + their mocks, and OCR-vision capability
routing all trace correct against live data (each verified, not assumed).

**The one residual risk was the GUARDRAIL, not the code:** the glossFor regression test used a
synthetic `{membeli:'to buy'}` object (not the real dictionary) and NO test asserted the END
result (FSRS promotion). Fixed this session:
- `listeningMistakes.test.js` now imports the REAL `src/data/dictionary.js` and pins `glossFor`
  against it → a future shape-drift of dictionary.js fails loudly here.
- NEW `src/store/__tests__/listeningMistakePromotion.test.js` drives the real store action through
  real glossFor + real dictionary and asserts the END result (card lands in the 'Mistakes' deck).
  Red-proofed: both fail against the old array-only glossFor (`expected '' to be 'water'`).
Gate green: build · **1152** tests (+7) · lint 0 err · content ✓.

### ♻️ Reusable "overnight-loop quality guardrail" checklist (paste into future loop kickoffs)
Before declaring a feature done, for EVERY new function/feature:
1. **Trace one real caller, not the test.** Open the actual call site and confirm the argument
   shapes match the function's guards (`Array.isArray`/`typeof`/`!= null`). The unit test's fixture
   is NOT evidence the real caller passes that shape.
2. **At least one test imports the REAL data/module**, not a synthetic fixture — especially when a
   helper branches on data shape (dictionary, store slice, AI response).
3. **Assert the END result a user sees, not the side-effect.** "Mistake journaled" ≠ "card promoted
   to FSRS". "AI returned JSON" ≠ "scenario launches". Walk the chain to the visible outcome.
4. **Check store-action gates explicitly.** If a feature calls `addMistake`/`logSkillActivity`/etc,
   confirm the payload satisfies EVERY clause of that action's gate (category set, severity≠low,
   language==='ms', field present) — a silent filter looks identical to "no data yet".
5. **Mocks must match the parser's contract.** Diff `aiMocks`/fixtures against the real
   call/response shape the production parser expects; a passing mock test on a drifted mock is a lie.
6. **Red-proof the guard.** Temporarily break the fix; confirm the new test fails; restore. A test
   that can't fail isn't a guard.

---


## 🧭 MODEL ROUTING — ⛔ FABLE GONE 2026-06-13 → Opus 4.8 xhigh for EVERYTHING

**Fable 5 is no longer available to Kheshav (his report 2026-06-13). NEW DEFAULT: Opus 4.8 at
`xhigh` is the top tier for ALL work** — including the hard/long-horizon/from-scratch jobs this queue
used to escalate to Fable (Opus 4.8 is itself SOTA long-horizon). `/fast` on for interactive. Do NOT
route anything to Fable until Kheshav says access is back. (Memory: reference_fable5_vs_opus48_working.)

### ✅ Done — were the "fire now" epics
- **"Picked for you" Phase 2 — A + B + C ALL SHIPPED 2026-06-13** (BYOK-router deck-gen, AI-roleplay
  seed, Tier-2 validity badge). Details at the top of this file.
- **#9 record-and-compare in SpeakMode — SHIPPED 2026-06-13 (Opus xhigh).** Study Speak mode now
  captures the attempt in PARALLEL with STT; after an attempt a `<audio controls>` replay + a "🔊
  Model" TTS button appear so the learner compares themselves to the model even when ms-MY STT scores
  noise. **Speak/record/score/compare use the example SENTENCE** when the card has a real one
  (`src/lib/speakTarget.js` `speakTargetFor`, red-proofed 7 tests; falls back to the word for the
  store's `"word (gloss)."` placeholder examples so ms-MY TTS never mispronounces the English gloss) —
  sentence prosody is the exam-relevant skill (Kheshav's call 2026-06-13). Object URL only, never
  persisted (revoked on card-advance via `key={card.m}` remount + unmount). Orphan
  `PronunciationDrill.jsx` deleted (grep-zero) + dead `getPronunciationDrills` removed from
  `pronunciation.js`. Gate green: build · 1169 tests · lint 0 err. **OPEN: Kheshav's live audio
  sign-off on phone + laptop (mic playback quality) — the one thing not verifiable in-build.**

- **Free writing-feedback grammar floor RAISED — SHIPPED 2026-06-13 (Opus xhigh, quality-debt #2).**
  The free rule-based Malay grader measured **0/24 semantic grammar errors** caught (your ai-tier
  eval) — silently passing 69% of real mistakes (false reassurance). Added high-confidence,
  low-FP rules to `src/lib/writingErrorsMalay.js`: meN- verbs missing -kan/-i (mengamal→mengamalkan,
  mengabai, menjejas, memusnah, menyinar), passive `di `+verb spacing (di selesaikan→diselesaikan),
  comparison `lebih…dari`→daripada (off spatial "lebih jauh dari"), missing direction `ke`,
  `Oleh kerana itu`→`Oleh itu`, unambiguous English loanwords (any format), `tapi`. **Eval: semantic
  recall 0/24 → 15/24 (62.5%), regex still 11/11, s-perfect control STILL 0 false positives** (the 9
  misses are POS/semantic, deliberately left to BYOK). +12 unit tests (red-proofed; each rule paired
  with an FP guard). Honest bilingual scope note added to `Writing.jsx` (basic check ≠ full grammar
  tutor → calibrates trust + nudges BYOK). Re-measure: `node` over `findIssuesMalay` + `WRITING_GOLD`
  + `freeSpanCoverage` (scripts/ai-tier-eval). Gate green: build · 1181 tests · lint 0 err.

- **Free ENGLISH writing-feedback grammar floor RAISED — SHIPPED 2026-06-13 (Opus xhigh, quality-debt
  #2, English sibling of the Malay win above).** The English grader (`src/lib/writingErrors.js`) was
  already MUCH richer than Malay's (confusables, a/an, comma splices, some SVA), so the gap was
  narrower. Built the first English gold set — `scripts/ai-tier-eval/goldWritingEn.mjs` (10 synthetic
  IGCSE-English essays, 33 planted+catalogued errors incl. a ZERO-error control) — measured, then
  closed the biggest low-FP miss classes in `writingErrors.js`:
  - **Uncountable nouns pluralised** (`detectUncountablePlurals`): informations/advices/furnitures/
    equipments/luggages/homeworks/softwares/knowledges — each NEVER a valid plural OR a verb (ambiguous
    "researches/works/staffs" deliberately excluded). The cleanest win.
  - **SVA: `he/she` + bare verb** (`detectSubjectVerbBareVerb`): "he go"→"he goes". Guarded against
    subjunctive ("I suggest he go"), compound subjects ("Tom and she walk"), relative clauses ("the
    girl who sit"), invariant-past bare forms (he put/cut/read/set), and `it` (dummy-subject/imperative
    "let it go"). Curated verb list only.
  - **3 preposition gaps**: `interested about`→in, `depend(s/ed/ing) of`→on (no FP on "independent of"),
    `according with`→to.
  - **Eval: free semantic-grammar recall 0/20 → 12/20 (60%), regex segment STILL 13/13 (100%),
    control essay STILL 0 false positives.** The 8 deliberate misses left to BYOK (logged in the gold
    notes): noun-/plural-subject SVA ("the teachers gives"), tense shift (detector intentionally
    disabled), lowercase comma splices, article/number ("one of the biggest problem"), advice-as-verb.
  - +10 unit tests in `writingErrors.test.js` (each new rule paired with an FP guard; red-proofed —
    disabling the wiring made exactly the 5 positive tests fail, guards stayed green). Re-measure (the
    throwaway runner was deleted per the brief; this one-liner reproduces the number):
    `node --input-type=module -e "import {findIssues} from './src/lib/writingErrors.js';import {WRITING_GOLD_EN} from './scripts/ai-tier-eval/goldWritingEn.mjs';import {freeSpanCoverage,recallBySegment} from './scripts/ai-tier-eval/score.mjs';const r=[];let c=0;for(const e of WRITING_GOLD_EN){const f=findIssues(e.text,{formatId:e.format}),v=freeSpanCoverage(e.text,f,e.errors);if(e.id==='e-perfect'){c=f.length;continue}e.errors.forEach((x,i)=>r.push({regexExpected:x.regexExpected,caught:v.bySpan[i]}))}const s=recallBySegment(r);console.log('semantic',s.semantic.caught+'/'+s.semantic.total,'regex',s.regexCatchable.caught+'/'+s.regexCatchable.total,'control',c)"`
  - ✅ FIXED 2026-06-13: the English scope note in `Writing.jsx` (~line 420) said "can miss deeper
    grammar and **imbuhan** errors" — "imbuhan" is a Malay-only concept leaking into the English
    branch. Now reads "deeper grammar errors". Malay branch (tatabahasa/imbuhan) unchanged.
  Gate green: build · **1195** unit tests (+10) · lint 0 err.

- **English free grammar floor — determiner-anchored SVA extension — SHIPPED 2026-06-13 (Opus xhigh,
  continues 0/20 → 12/20 above).** A determiner fixes the head noun's NUMBER, so subject-verb
  agreement is catchable WITHOUT a parser at near-zero FP. New `detectDeterminerAgreement` in
  `writingErrors.js` (mirrors `detectSubjectVerbBareVerb`'s code-guard style, id `subject-verb-determiner`):
  - **Singular branch** — "every/each (+adj) NOUN + are/have/were/do" → singular ("every teenager have"
    → "has").
  - **Plural branch** — "many/several/few/both/numerous (+adj) PLURAL-NOUN + is/was/has/does" → plural
    ("many students is" → "are"). Plural branch additionally REQUIRES a plural-looking head noun
    (non-{ss,us,is,ous} -s, or irregular people/children/men/women/police).
  - **Guards (conservative bias = LAW):** "many a NOUN is" idiom (skip when a/an follows), collective
    "this/that NOUN are" (those determiners simply absent from both sets), singular -s nouns
    (news/physics/series/species…), measure/duration nouns ("ten years is a long time"), relative
    clauses ("every student that are…" — head noun is a function word), compound subjects ("every
    effort and resource are…" — gap capped at one adjective). Bare-noun-subject SVA ("the teachers
    gives"), tense, and article omission STAY BYOK (need a parser).
  - **Eval: free semantic recall 12/20 (60.0%) → 16/23 (69.6%)** — the existing planted "every teenager
    have" flips missed→caught, plus 3 NEW determiner rows in the gold (e-uniforms "each pupil have",
    e-environment "many countries is", e-technology "several teachers is", all `regexExpected:false`,
    category `sva`). **Regex segment STILL 13/13, control essay STILL 0 false positives**, all gold
    spans resolve. Re-measure with the same one-liner as above (now reports 16/23).
  - +11 unit tests in `writingErrors.test.js` (positive + FP-guard per branch incl. "many a student is"
    / "this team are" / "several species is" / "every student that are"). **Red-proofed:** disabling
    the `pushAll(detectDeterminerAgreement)` wiring fails exactly the 4 positive blocks; all 7 guards
    stay green. Gate green: build · **1206** unit tests (+11) · lint 0 err.

- **English free grammar floor — increment 2 (THREE curated-list classes) — SHIPPED 2026-06-13 (Opus
  xhigh, continues 16/23 above).** Three more near-zero-FP classes catchable WITHOUT a parser via
  curated lists, each its OWN `pushAll` line in `findIssues` + a dedicated detector (mirrors the
  determiner / uncountable style):
  - **`double-comparative`** (`detectDoubleComparatives`) — `more`/`most` + an ALREADY-comparative
    (`COMPARATIVE_FORMS`) or superlative (`SUPERLATIVE_FORMS`) word → drop the `more`/`most`
    ("more better" → "better", "most happiest" → "happiest"). CURATED sets, NOT a generic -er/-est
    match → no FP on nouns ("more teachers", "most interest"), base adjectives ending in -er
    ("more eager", "more clever"), or the correct periphrastic forms ("more important",
    "most beautiful"). Noun homographs (lighter, cooler) omitted.
  - **`much-countable`** (`detectMuchCountable`) — `much` + a curated countable-plural noun
    (`MUCH_COUNTABLE_NOUNS`) → "many" ("much people"/"much books"). Uncountables after "much"
    ("much time/money/water/information") stay unflagged; only the DIRECT collision is caught
    ("much good friends" with an adjective gap stays BYOK).
  - **`do-support-past`** (`detectDoSupportPast` — the brief's optional 3rd class; INCLUDED via
    decide-and-flag) — after do-support (did/didn't/do/don't/does/doesn't) the main verb must be the
    BASE form ("didn't went" → "didn't go"). CURATED `IRREGULAR_PAST_TO_BASE` map EXCLUDES every
    collision: invariant verbs whose past==base (put/cut/read/set/let/hit/cost/hurt/shut/spread/bet/
    quit) and ambiguous base/noun homographs (saw, found, left, felt, fell, rose). Leading
    "did/do/does" is safe even as a main verb ("did my homework") because the 2nd word must be in the
    curated map. Regular "-ed" pasts left to BYOK (they overlap adjectives/participles).
  - **Eval: free semantic recall 16/23 (69.6%) → 22/29 (75.9%)** — 6 NEW gold rows
    (`regexExpected:false`), all caught: e-social "more worse" + e-health "most healthiest"
    (cat `comparison`, enum extended); e-phones "much hours" + e-technology "much computers"
    (cat `countability`); e-storm "didn't knew" + e-library "did not gave" (cat `verb-form`, enum
    extended). **Regex STILL 13/13, control essay STILL 0 false positives**, all gold spans resolve.
    Adversarial probe (23 correct + 6 wrong sentences) → 0 FP, 0 misses.
  - +14 unit tests in `writingErrors.test.js` (positive + FP-guard per class; the brief's required
    guards "more important" / "most beautiful" / "much time" all pinned). **Red-proofed per class:**
    disabling each `pushAll` line fails ONLY that class's positives (3 / 2 / 2); all guards stay green.
    Gate green: build · **1220** unit tests (+14) · lint 0 err. `writingGrader` chunk 88.3 KB
    (shared/on-demand, exempt from the 70 KB per-route rule).

### Re-measure the English free-grammar eval (no committed runner — paste this)
```
node --input-type=module -e "import {findIssues} from './src/lib/writingErrors.js';import {WRITING_GOLD_EN} from './scripts/ai-tier-eval/goldWritingEn.mjs';import {freeSpanCoverage,recallBySegment} from './scripts/ai-tier-eval/score.mjs';const r=[];let c=0;for(const e of WRITING_GOLD_EN){const f=findIssues(e.text,{formatId:e.format}),v=freeSpanCoverage(e.text,f,e.errors);if(e.id==='e-perfect'){c=f.length;continue}e.errors.forEach((x,i)=>r.push({regexExpected:x.regexExpected,caught:v.bySpan[i]}))}const s=recallBySegment(r);console.log('semantic',s.semantic.caught+'/'+s.semantic.total,'regex',s.regexCatchable.caught+'/'+s.regexCatchable.total,'control',c)"
```

### ✅ Multimodal AUDIO — DESIGN + PLAN SHIPPED 2026-06-13 (Opus xhigh; no app code, as briefed)
"Study from a recording": upload/record a clip → free on-device Whisper (transformers.js +
ONNX Runtime Web, self-hosted under `public/asr/`) → the SAME `{pages}` shape → the existing
reveal-gated reader, untouched. Mirrors the OCR feature's shape (pure lib + injected engine +
self-hosted assets + PWA runtime-cache + manual WER harness). Committed:
- `docs/superpowers/specs/2026-06-13-multimodal-audio-transcribe-design.md`
- `docs/superpowers/plans/2026-06-13-multimodal-audio-transcribe.md` (ends in a paste-ready
  **bounded Phase-1 build kickoff** — approve with "build phase 1" or veto any one decision).

**Research verdict (cited in the spec):** on-device free IS viable as PRIMARY (NOT "too poor →
BYOK"). English is Whisper's strongest language; Malay's quality lever = **mesolitica
Malaysian-Whisper** (Malay+Manglish fine-tune, beats Google ASR on Malay/FLEURS) — but it ships
PyTorch-only, so **Task 0 is a BLOCKING spike**: convert mesolitica-base → ONNX q8, load it in
transformers.js, and MEASURE real Malay WER before any UI. Decide-and-flag escape: if mesolitica
won't convert AND generic whisper-base Malay >40% WER, flip Malay to BYOK-primary (English stays
on-device). vosk-browser ruled out (no Malay model). BYOK "Sharper listen" + video = Phase 2.
**▶ RECOMMENDED NEXT ACTION = the Task-0 SPIKE, not the full build.** The measured Malay WER is
the one fact that decides the whole feature, and it's a Python/ONNX-conversion toolchain separate
from the React build — so it gets its own focused session. **Paste the box at the TOP of the plan**
("▶️ NEXT SESSION = TASK-0 SPIKE ONLY"). It uses FLEURS `ms_my`/`en_us` clips (no recording needed),
proves the plumbing on a pre-converted generic model FIRST, then converts mesolitica via the
transformers.js `scripts/convert.py` (the Xenova-tested path; raw `optimum-cli` is what hits the
known custom-Whisper failures), reports both Malay WER numbers, and records the model decision.
Then the Phase-1 build (kickoff at the BOTTOM of the plan) runs with the model settled.

### ▶️ Next (all Opus 4.8 xhigh now)
1. **True English study mode — ✅ PHASE 1 SHIPPED 2026-06-14.** English-as-target vocab→FSRS is live
   (see the SHIPPED block above). **Phase 1.5 next:** F5 reader/Import English-source gloss path ·
   bilingual surfaces follow `studyLang` · English mistake→FSRS promotion · productive (gloss→word)
   direction. None blocking; pick when you want to deepen English support.
2. **Multimodal AUDIO follow-ups (Phase 2).** Phase 1 SHIPPED (top of file). Remaining: Web Worker
   for zero UI-freeze during inference · BYOK "Sharper listen" (cloud ASR for messy clips) · video →
   audio → transcript · revisit transformers.js v4 once ORT-web stabilises.
3. **#8 parameterized listening passages** — gated on a native speaker reviewing Malay variants.
4. **Keyed AI-tier eval** — ⛔ PARKED INDEFINITELY: needs a *billed* Gemini key, which Kheshav
   cannot obtain (confirmed 2026-06-13). Do NOT recommend this as a next step until that changes.
   The free-tier floor work (Malay + English grammar) is the repayment that WAS in our control.

### ✅ Done 2026-06-13 (were "session 2/3" in the first draft of this queue)
- Docs mini-pass: DEPLOYMENT.md clone URL/repo name fixed (godman4242/og-igcse-malay-master);
  **ARCHITECTURE.md archived** → docs/archive/ARCHITECTURE-2026-04-phase0.md (DECISION: archive
  over rewrite — it re-drifted within days of its partial refresh and its own banner already
  deferred to CLAUDE.md; veto note: resurrect + rewrite if a public architecture doc is ever
  needed for contributors; no live links broke — CLAUDE.md/README never referenced it).
- Mastered tile promoted to ALL users (was signed-in only): grid = Due / Streak / Mastered for
  everyone + 4th tile Freezes (signed-in) or **Words** = deck size (guests) — both audiences keep
  an even 2×2 (DECISION; veto: 6-tile signed-in grid = more noise, against ADD-first).

---


## ⏹️ STOP-AND-REPORT — "Close the listening loop" SHIPPED 2026-06-13 · everything left needs Kheshav

**This session shipped both kickoff items (record below). The 2026-06-13 run is now fully done:
#7 balance meter · #10 cloze-listening · listening-mistake routing · 3 e2e specs.** Open calls:
- **#6 XP — ✅ APPROVED BY KHESHAV + SHIPPED 2026-06-13.** Design pass re-verified the call against
  the live footprint (one award site, one tile, one copy line) and refined it: slot-for-slot tile
  swap XP → **Mastered** (`countMastered` in lib/fsrs.js — Review-state cards with stability ≥ 21d,
  the app's own stable threshold), challenge completion line de-XP'd, AuthUnlock copy reworded,
  `engagementXP` field + award removed via STORE_VERSION **31→32** migration (old key stripped;
  an old cloud blob may briefly re-introduce the orphan key — harmless, zero readers). Red-proofed:
  countMastered.test.js (3) + retireXP.test.js (4). Vetoes: threshold constant; Mastered tile stays
  in the signed-in block (promote to guests later = needs a 4th tile for the even grid).
- **#8 Parameterized passages** — needs a native speaker for the Malay variants first.
- **#9 Record-and-compare Speaking** — MediaRecorder UI, needs Kheshav watching/listening live.
- **Human eye on prod (5 min):** paper-balance card, /dictation, /cloze-listening — dark+light,
  real TTS playback (e2e stubs TTS; real ms-MY voice quality is unverified on device).
- Minor: `DEPLOYMENT.md:19-20,55` stale clone URL; keyed AI-tier eval parked on a billed key.

---

## ✅ Listening-mistake routing + 3 e2e specs SHIPPED — 2026-06-13 ("close the listening loop")

Dictation + ClozeListening errors now land in the mistake journal (they previously evaporated —
Vision Phase 5 gap; Listening/Comprehension already journaled). Dictionary-known Malay words carry
their gloss so the store AUTO-PROMOTES them to FSRS cards. Gate green: build · **1126** unit tests
(+8) · lint 0 errors · content · **9/9 new e2e**. Chunks: Dictation 8.97 KB, ClozeListening 10.2 KB.

- **Pure core (red-proofed, watched failing):** `src/lib/listeningMistakes.js` —
  `missedDictationWords` (content-word rule, longest-first, **cap 2/sentence** so a flubbed
  sentence can't flood the journal; veto: raise cap), `clozeGapMistakes` (every wrong gap, carries
  what was typed), `glossFor` (dictionary lookup → the `correct` field the promotion gate needs;
  unknown words stay journal-only). 8 tests.
- **Pages:** both `check()` handlers call `addMistake` mirroring Listening.jsx:187's shape
  (type/category `vocab`, severity `med`, `language` = page lang, surface = the sentence). Store
  dedupe (24h) absorbs repeats; promotion stays Malay-only via the existing store gate.
- **E2E (`tests/e2e/{dictation,cloze-listening,paper-balance}.spec.js`, 9 tests):** play-gated
  typing, replay lock, exit-mid-set, journal routing + cap, per-gap diff, full 5-sentence set →
  results + exactly ONE Listening unit logged, balance card hidden-at-zero → appears → untouched
  callout → row navigation → count accumulation.
- **Two e2e gotchas encoded in the specs:** (1) `window.speechSynthesis` is a getter-only accessor
  in Chromium — plain assignment in addInitScript silently no-ops; stub via
  `Object.defineProperty`. (2) FeedbackLive's sr-only region duplicates visible score text —
  strict-mode locators must target the unambiguous string.

---

## ✅ Cloze-listening SHIPPED — 2026-06-13 (review feature #10, score 4; loop iteration 6)

New `/cloze-listening` route: hear a sentence (TTS, ≤2 plays, 2nd slower) while its transcript is
VISIBLE with 1–2 words blanked — type the missing words, per-gap ✓/✗ with the correct answer shown.
One difficulty rung below /dictation (the visible text scaffolds listening). Test-first. Gate
green: build · **1118** unit tests (+10) · lint 0 errors · content. Page chunk 9.95 KB.
Kickoff: the (now-replaced) ▶️ box, decisions baked by Kheshav.

- **Pure core (red-proofed, watched failing first):** `src/lib/clozeListening.js` —
  `buildClozeFromSentence` (gap rule: alphabetic word ≥4 letters, hyphenated reduplication = one
  word, never the sentence's first word, no duplicate answers, injectable rand),
  `buildClozeListeningSet` (reuses dictation's `buildDictationSet` corpus flattening), `checkGap`
  (case/punctuation-insensitive exact match). 10 tests in `clozeListening.test.js`.
- **DECISION — new core, not clozeBuilder:** `clozeBuilder.makeClozeItem(card)` is card-shaped
  (blanks a saved word in the card's own example) — reused its pattern, not the function (veto:
  generalise makeClozeItem later if a third cloze surface appears).
- **DECISION — 2 gaps when available, else 1** (more retrieval per play; veto: tune MAX_GAPS).
  **Scoring = per-gap exact match** (veto: LCS/fuzzy). **No persistence v1** (mirrors dictation;
  veto: history feeds FSRS + the meter later).
- **Meter hook:** set completion calls `logSkillActivity('listening')` — cloze sets count in the
  new paper-balance card alongside /listening and /dictation.
- **Registration sweep (Dictation precedent):** App.jsx lazy route (20→21), practiceSurfaces
  "Reading & Listening" tile (Ear icon) + guard-test EXPECTED_PATHS, sitemap.xml, CLAUDE.md
  routes line. Listening.jsx/Dictation.jsx untouched this iteration.
- ⚠️ **Not automated (repo norm):** page UI rides on build/lint + the proven Dictation player
  pattern; human eye on prod (gap inputs, TTS, diff colours, dark/light) + a follow-up
  `cloze-listening.spec.js` would close it.

---

## ✅ Per-paper balance meter SHIPPED — 2026-06-13 (review feature #7, score 6; loop iteration 5)

Dashboard "Paper balance" card: last-7-LOCAL-days activity counts across all 7 skills, with
untouched skills called out — each row navigates straight to its surface. Test-first (both
cores red-proofed). Gate green: build · **1108** unit tests (+17) · lint 0 errors · content.
PaperBalance lazy chunk 3.8 KB; eager index 467.8 KB / 149.9 KB gz (+~0.5 KB, the store action).
Spec: `docs/superpowers/specs/2026-06-13-per-paper-balance-meter-design.md` (decisions baked by Kheshav).

- **Pure core (red-proofed):** `src/lib/skillBalance.js` — `skillBalance(sources, todayISO)` rolls a
  7-local-day window into `{ counts, total, neglected }`. 10 tests in `skillBalance.test.js`.
- **Store (red-proofed):** STORE_VERSION **30→31** additive migration adds `skillActivity`
  (`{ 'YYYY-MM-DD': { reading, listening, grammar } }`, local-day keyed via `localDay.js`, pruned to
  30 days on write). `logSkillActivity(skill)` accepts ONLY reading/listening/grammar and funnels
  through `commitPrefMutation` (stamps `lastMutationAt` + schedules the cloud-blob push — P1-1
  contract). Registered in `BACKUP_KEYS` so export/import round-trips. 7 tests in `skillActivity.test.js`.
- **DECISION — hybrid derivation (veto: uniform logging):** only the 3 history-less skills log;
  Writing/Speaking (incl. roleplay `date` field)/Exam derive from their existing arrays and
  **Vocab = active study days** (`studyHistory` days with `reviews > 0` — the store has no
  per-session counts, so active-days is the honest proxy; veto note: instrument real session counts
  later). Derived skills show correct 7-day data from day one with zero double-count risk.
- **Instrumented units:** Comprehension finished set · Listening scored passage · Dictation
  completed set (both log `listening`) · PDFReader successful document load incl. fresh OCR
  (`reading`; vision "Sharper read" re-reads return early and do NOT double-log; DECISION: load =
  unit since the reader has no completion event; veto: first-gloss-reveal) · Grammar **once per
  page visit with ≥1 drill answered** via the `recordDrillAnswer` wrapper around all 7
  `updateGrammarStats` call sites (a "drill batch" ≈ one set; veto: per-N-drills counting).
- **Widget:** lazy `src/components/dashboard/PaperBalance.jsx` (below SpeakingProgress); renders
  null until any in-window activity (new users never see seven zero bars); module-level
  EMPTY_ARR/EMPTY_OBJ selector fallbacks (no allocation-in-selector); skill names only, NO paper
  numbers (0546 vs 0500/0510 paper numbering differs — do not claim a mapping).
- ⚠️ **Not automated (repo norm — pages/widgets ride on build/lint):** the card needs a human eye
  on prod (dark+light, bar colours, nudge line); a `paper-balance.spec.js` e2e would close it.

---

## ✅ Dictation mode SHIPPED — 2026-06-13 (review feature #5, score 8; loop iteration 3)

New `/dictation` route: hear a sentence (audio only, ≤2 plays, hidden text) → type it → word-level
diff. Test-first. Gate green: build · **1091** unit tests · lint 0 errors · content. Dictation page
chunk 9.6 KB. Spec: `docs/superpowers/specs/2026-06-13-dictation-mode.md`.

- **Pure core (red-proofed):** `src/lib/dictation.js` — `splitIntoSentences` (MIN_WORDS=3),
  `buildDictationSet`/`pickDictationItems` (rand-injectable), and `scoreDictation` using **LCS word
  alignment** (recall = matched ref words / total). LCS chosen over reusing the position-based
  `scorePronunciation` so a dropped word doesn't shift-penalise every later word. 12 tests in
  `dictation.test.js`.
- **Corpus DECISION:** reuse Paper-4 `listeningPassages` split into sentences — bilingual, curated,
  zero new authoring (no native-speaker risk). Veto: dedicated dictation bank later.
- **Placement DECISION:** standalone `/dictation` route (not folded into Listening) — isolates from
  the working Listening page (no regression risk), easy to test. Route count **19 → 20**: updated
  `src/App.jsx`, `practiceSurfaces.js` (+ guard test EXPECTED_PATHS), CLAUDE.md, ARCHITECTURE.md,
  `public/sitemap.xml`. Veto: fold into `/listening` later.
- **No persistence (v1):** pure practice surface, no store change / no STORE_VERSION bump. Veto: add a
  dictation history later (would feed the per-paper balance meter above + FSRS scheduling).
- ⚠️ **Not automated:** the page UI rides on build/lint + the proven Listening player pattern, not a
  component/e2e test (repo norm). Human eye on prod (TTS playback, replay limit, word-diff colours,
  dark/light) + a follow-up `dictation.spec.js` would close it.

---

## ✅ Nested duplicate app purged — 2026-06-13 (repo hygiene; loop iteration 2)

Removed the tracked stale duplicate app `igcse-malay-master/` from the public repo. Gate green:
build · **1079** unit tests · lint 0 errors · content.

- **`git rm -r igcse-malay-master/`** — 46 tracked files. Grep-zero proof: nothing in root `src/`/`tests/`
  imports the dir; the only outside matches were the prod DOMAIN (`upg-igcse-malay-master.vercel.app`)
  and the GitHub repo NAME — neither is the directory.
- **Disk cruft cleared (GOTCHA):** `git rm` removes only TRACKED files, so the dir's UNTRACKED artifacts
  stayed on disk — its own **160 MB `node_modules/`**, 380 KB `dist/`, a `.DS_Store`. `rm -rf
  igcse-malay-master/` removed the remainder. This briefly spiked lint to **116 errors** (removing the
  root eslint ignore exposed the nested `dist/*.js` bundles) until the `rm -rf` — lesson: when purging a
  tracked dir that was independently built, clear the untracked build/deps too, not just `git rm`.
- **Dead config exclusions removed:** `igcse-malay-master/**` dropped from `eslint.config.js`
  globalIgnores AND the `vite.config.js` test `exclude` (both pointed at a now-deleted path; the vite
  one was already redundant — the test `include` is `src/**`, never matching the nested `…/src/**`).
- **`.obsidian/` untracked:** added to `.gitignore` + `git rm -r --cached .obsidian` (5 editor-state
  files, kept on disk). DECISION: per-machine editor state doesn't belong in a shared repo.
- ⚠️ Minor flag (separate doc-rot, NOT fixed here): `DEPLOYMENT.md:19-20,55` has a stale clone URL
  (`github.com/kheshav/igcse-malay-master.git` — wrong owner+name vs the real
  `godman4242/og-igcse-malay-master`). Worth a one-line fix in a future docs pass.

---

## ✅ Exam Rehearsal listening stage SHIPPED — 2026-06-13 (review feature #4, score 8)

Test-first in one overnight loop iteration. Gate green: build · **1079** unit tests · lint 0 errors ·
content. ExamRehearsal chunk 24.2 KB (was 19.2; +5 KB, well under the 70 KB page limit). Spec:
`docs/superpowers/specs/2026-06-13-exam-rehearsal-listening-stage.md`.

- **One shared readiness scorer.** The composite formula was DUPLICATED (inline in
  `ExamRehearsal.finishRehearsal` + `useStore.getExamReadiness`). Extracted to pure
  `src/lib/examReadiness.js` (`composeReadiness`); both callers use it now. Weights comp 0.30 /
  writing 0.35 / speaking 0.35 / **listening 0.30**, folded via **present-component normalisation** —
  attempts logged before listening compute **byte-identical** (totalW stays 1.0). **No STORE_VERSION
  bump, no data migration** — the kickoff assumed v30→31 + migration, but the normalisation trick made
  it unnecessary (DECISION; veto = bump if you later backfill or require listening).
- **TTS-gated stage.** Flow COMP → **LISTEN** → WRITE → SPEAK; if `hasSpeechSynthesis()` is false the
  stage is SKIPPED and readiness normalises over 3 (DECISION: skip rather than fake listening with
  visible text; veto = add a text-reading fallback). Audio-only, ≤2 plays (2nd slower), questions
  unlock after ≥1 play — mirrors `/listening`. `listeningPct` added to `examAttempts` + a RESULTS tile
  (4-tile grid when present).
- **Pure cores red-proofed first:** `examReadiness.test.js` (6) + `examPassages.test.js`
  `pickRehearsalListening` (5) — both watched failing before implementing.
- ⚠️ **One axis NOT automated:** the UI stage rides on build/lint + the proven COMP/Listening patterns
  it mirrors, not a component/e2e test (repo norm: pages aren't unit-tested). A human eye on prod (TTS
  playback, 4-tile results, dark/light) + a follow-up `exam-rehearsal-listening.spec.js` would close it.

---

## ✅ Repo hygiene sweep SHIPPED — 2026-06-13 (review backlog #8, score 10)

Last mechanical item from `docs/reviews/2026-06-12-full-codebase-review.md` (§P3 health/docs). Gate
green: build · **1068** unit tests · lint 0 errors · content (0 genuinely missing). Every deletion
was git-tracked = fully reversible.

- **Public doc-rot fixed.** README: FSRS-4.5 → **FSRS-6** (lines 14/23/82) + "495-word" → **825-word**
  dictionary. ARCHITECTURE.md: every SM-2 reference → FSRS-6 (algorithm, store sketch, data-flow,
  routing table), "7 study modes" → 6, "7 routes" → 19, "9 roleplay scenarios" → 22 (15 MS + 7 EN),
  495 → 825 (×2), `sm2.js` → `fsrs.js` in the dir tree, + an honest **"partial refresh" banner**
  pointing to CLAUDE.md as the authoritative architecture (see FLAG 4). CLAUDE.md: dropped the
  "legacy sm2.js exists for reference" line, "6 starter passages (3 EN, 3 MS)" → **8 (4 EN, 4 MS)**,
  added the `use-reduced-motion` (~120 KB, framer-motion) + `dist`/supabase (~184 KB) shared chunks
  to the chunk-exemption list, relinked the 2026-05-29 schema-drift pointer to the archive file.
- **Dead code deleted:** `src/lib/sm2.js`. Grep-zero proof:
  `grep -rnE "['\"][^'\"]*(/|\./)sm2['\"]" src/ tests/` → **ZERO** importers (the only `sm2` symbol
  in the codebase is `migrateFromSM2`, which lives in `fsrs.js` — unrelated to the dead module).
- **Root junk deleted (11 files):** `test-{circle,hf,sharp}.mjs` (one-off icon-gen experiments),
  3 test images, 2 empty-`{}` `Untitled*.canvas`, empty `.verb.md`, and `NEXT_SESSION_PROMPT.md`
  (which self-identified as deletable). **Fossils archived (git mv):** `MASTER_PLAN.md` +
  `PHASE_0_DELIVERY.md` → `docs/archive/`.
- **This file rotated:** 320 KB / 4773 lines → readable in one Read call. All closed/historical
  sections → `docs/archive/RESUME_ARCHIVE-2026-06.md`.

⚠️ **Decide-and-flag corrections to the kickoff (verified live):**
1. **`tailwind.css` KEPT — not deleted.** The kickoff labelled it "true junk," but it is a deliberate,
   self-documented Tailwind-IntelliSense helper for VS Code (9 lines; the file's own comment explains
   its purpose). Deleting it gives ~zero hygiene benefit and risks a contributor's Tailwind autocomplete,
   so I kept it. Re-grep confirmed **zero code references** (only two markdown docs mention it).
2. **`.verb.md` was still tracked** (empty 0-byte file) — the kickoff said it was "already gone." Deleted.
3. **Repo `CLAUDE.md` has no "495."** That kickoff bullet maps to README's two 495s (both fixed). The
   *parent* `kheshav code/CLAUDE.md` (one dir up, outside this git repo) still says 495 but is not part
   of this repo, so it was left untouched.
4. **ARCHITECTURE.md is a deeper Phase-0 fossil** than the named lines (still says "Vitest configured
   next phase," "lazy-load future Phase 2," Phase 0/1 framing). I fixed the false FACTS + added a
   banner; a **full rewrite (or deleting it in favour of CLAUDE.md) is deferred as its own item** to
   stay bounded and avoid introducing new inaccuracies.

🔴 **NEW DISCOVERY — now PROMOTED to the ▶️ NEXT item at the top of this file:** a whole
**nested duplicate app `igcse-malay-master/` (46 tracked files) sits inside this public repo.** It's a
stale Apr-13-2026 snapshot (root app is May-31+), a plain tracked dir (no `.git`, not a submodule),
and `vite.config.js:133` already excludes it (`'igcse-malay-master/**'`) — so it's a known stray that
nothing in the root build/deploy depends on. I did **not** delete it: a 46-file bulk removal is
destructive and wasn't in the kickoff's re-verified list. **Recommended next micro-task (1 min, high
value):** `git rm -r igcse-malay-master/` → gate → commit. Glance at it first only if you suspect any
unique asset/history lives there (unlikely — it's an older copy of the same app). Also minor:
`.obsidian/` (5 files incl. a stale `workspace.json` recent-files list) is tracked — consider gitignoring it.

---
## ✅ Content batch + dictionary-gap triage SHIPPED — 2026-06-13 (review feature #2, score 15)

Live-truth finding first: most of the review's P3-content list was ALREADY fixed by the earlier
content batch (`menulis` correctly under the t-drop row; no `merenang` anywhere; no duplicate MCQ
option; `semalam` present) — only the header count + two POS glosses were still live. Gate green:
build · **1068** unit tests · lint 0 errors · content-lint ✓ with **0 genuinely-missing words**.

- **Gap triage (feature #2):** `categorizeGaps` in `scripts/lint-content.mjs` splits the warn
  list into planted / properNoun / inflection / missing via a pure Malay affix-stripper
  (`rootCandidates`: meN-/peN- nasal restoration, ber-/ter-/di-/se-/ke- prefixes, -kan/-an/-i/-nya
  suffixes, reduplication halving). The pre-commit warn line now reads e.g. "0 genuinely missing ·
  14 inflections · 7 proper nouns · 8 planted error forms" instead of 61 undifferentiated words.
  6 red-proofed unit tests in `src/data/__tests__/contentLint.test.js`.
- **34 dictionary entries added** (was 791 → **825**): the entire genuinely-missing bucket —
  bahasa, tempat, sejak, sampai, pulang, tiba, kucing, bola, cerita, kuat, comel, kek, bil, bakat,
  baharu, jadi, mula, siap, terkenal, pentas, pencuri, seekor, bersiar-siar, berteriak, mempunyai,
  memukul, menangkap, menyediakan, menyukai, menyuruh, mentadbir, menterjemahkan + roots bina/sepak
  (so passive dibina/disepak classify as inflections). All basic IGCSE-level vocabulary with
  standard glosses (no native-speaker-risk items; nothing dubious was guessed).
- **POS gloss fixes:** `menjahit` 'sewing'→'to sew', `mesej` 'messages'→'message'.
- **New FATAL lint rule:** `lintDictionaryHeader` — the dictionary.js header "— N entries" claim
  must equal the real entry count (red-proofed on the live 804-vs-791 drift, then header fixed to
  825). Header doc-rot is now un-shippable.

---

## ✅ P2 correctness batch #3 SHIPPED — 2026-06-13 (C7 replace-safety · C8 view-switch re-gate · C9 cancellable OCR · dark dim bump)

The LAST P2s from `docs/reviews/2026-06-12-full-codebase-review.md` — the review's P2 list is now
CLOSED. All test-first (red watched per fix). Gate green: build · **1059** unit tests · lint 0
errors · content. New e2e spec `tests/e2e/pdf-replace-viewswitch.spec.js` (2 tests) + 26 adjacent
reader/OCR e2e re-run green. PDFReader chunk 71.9 KB raw (recorded exception was ~71 KB; +0.9 KB
= the C7 error banner + parse-first guard, re-recorded deliberately).

- **C7 — "Replace" with a corrupt file destroyed the open doc.** `handleFile` now parses the NEW
  file fully (loadPdf + extractTextFromDoc) BEFORE `resetGloss()`/`destroyDoc()` — a failed parse
  leaves the open document byte-for-byte untouched (e2e proves Layout still renders, i.e. the
  worker doc was never destroyed) and surfaces a dismissible `data-testid="pdf-error-banner"`
  (role=alert, 44px dismiss) in the OPEN-doc toolbar — previously the error only rendered in the
  empty state. Half-loaded new docs are destroyed on failure (no worker leak).
- **C8 — selection/reveal indices leaked across Reflow⇄Layout.** The two views tokenize into
  different global index spaces; `switchView` now clears index-keyed state on a real switch
  (selection, per-token reveals, keyboard roving + range). DECISION: clear-on-switch (re-gate),
  NOT remap — the word-keyed docGloss cache survives so re-revealing is one tap, and reveal-gating
  means a cleared reveal is never lost work (veto: remapping would need a reflow⇄layout index
  bridge that doesn't exist). `showAll` is preserved (it's index-free).
- **C9 — scanned-PDF OCR un-cancellable during rasterise.** New pure `rasterisePdfPages(doc,
  {maxPages, signal, renderPage})` in `src/lib/ocr.js` (injected renderPage, mirrors runOcr's
  injected-engine pattern; 3 unit tests incl. mid-loop abort). `acceptPdfOcr` installs the
  AbortController BEFORE rasterising, so Cancel works the whole way; render failures now surface
  via setError instead of an unhandled rejection with a stuck progress bar.
- **Dark-mode dim bump (deferred from P2-U1):** `--color-dim` #7a7a9e → **#8f8fb3** (3.88 →
  5.13:1 on card2, 5.50 on card; ratio comment in CSS). New guard test
  `src/lib/__tests__/themeContrast.test.js` parses index.css and pins BOTH themes' dim ≥4.5:1 —
  a future palette tweak can't silently drop below AA again.

---

## ✅ Calibration loop SHIPPED — 2026-06-13 ("You were sure, but…" + smart-study boost)

Review feature #3 (score 10), test-first (4 red-green cycles, red watched each time). Gate green:
build · **1054** unit tests · lint 0 errors · content. STORE_VERSION unchanged (30) — no persisted
field changed shape (getter-only store change).

- **Store** — `getHypercorrectionTargets(sinceTs?)` upgraded (had ZERO consumers; signature
  re-confirmed before design): optional since-timestamp (default still 14 days), now returns
  **deduped, most-recent-first** words. Pinned in `src/store/__tests__/hypercorrectionTargets.test.js`.
- **Smart-study boost** — new Priority-0 tier in `selectFocalCards` (`src/lib/study/interleavedQueue.js`):
  certain-but-wrong words outrank mistakes/due, **capped at `HYPERCORRECTION_FOCAL_CAP = 2`**
  cycles so FSRS due cards stay the session majority (DECISION: top-tier + cap-2, most-recent-first;
  why: strongest correction-encoding window + FSRS can't see calibration; veto: tune the one
  constant — 1 = gentler, remove = max). `buildSession` passes `hypercorrectionWords` through;
  `useInterleavedSession` feeds it from the store getter (behavioural wiring test:
  `src/hooks/__tests__/useInterleavedSessionHypercorrection.test.js` — non-due, non-mistake word
  leads the session).
- **"You were sure, but…" panel** — `SessionSummary.jsx`, session-scoped via
  `getHypercorrectionTargets(sessionStats.startTime)`, max 5 items, word + meaning, non-punitive
  copy ("fastest wins… get priority in your next Smart Session" — matches the cap behaviour).
  Test: `src/components/__tests__/sessionSummaryHypercorrection.test.js` (in-session certain-wrong
  shown; older + low-confidence entries excluded; hidden when none).
- Side-note for future archaeology: CLAUDE.md's mistake-record sketch says `ts` but `addMistake`
  actually writes `timestamp` (epoch ms) — code is consistent, doc sketch is drifted; queue tier
  filters on `timestamp` correctly.

---

## ✅ P2 correctness batch #2 SHIPPED — 2026-06-13 (C3 day-keys · C4 summary · C6 export · C10 cram)

Four DEMONSTRATED P2 correctness bugs from `docs/reviews/2026-06-12-full-codebase-review.md`, all
test-first (red watched before green, per bug). Gate green: build · **1044** unit tests · lint
0 errors · content. **STORE_VERSION unchanged (30)** — no persisted field changed MEANING.

- **C3 — two "day" definitions (heatmap/challenge/AI-quota rolled at 08:00 local in UTC+8).** New
  shared `src/lib/localDay.js` (`toLocalISO(date)` + `getTodayISO()`, both LOCAL-calendar).
  Replaced every functional UTC day-key: `useStore.js` (getTodayISO import; reviewCardAction +
  addStudyMinutes studyHistory keys), `Dashboard.jsx` heatmap cells, `SessionSummary.jsx`
  today's-review filter, `lib/ai.js` AI-quota keys, `lib/learnerProfile.js` 7-day shelf keys.
  **Extended beyond the kickoff** to `lib/patterns.js` rollingActivity (161/168/177): it built the
  key as the UTC date of a LOCAL-midnight Date (off-by-one in UTC+8) and reads `studyHistory[k]`,
  so it had to stay aligned with the now-local keys (veto note: leaving it would keep the Dashboard
  sparkline misaligned with the heatmap). Streak left as-is (already local via `toDateString`). Old
  studyHistory keys NOT migrated (one-day boundary artifact accepted). Test:
  `src/lib/__tests__/localDay.test.js` — TZ=Asia/Kuala_Lumpur set at file top **plus a precondition
  guard** so it can't silently pass on a UTC machine; also pins rollingActivity.
- **C4 — single-due-card session never showed the summary.** `useStudySession.js` rate(): the
  setTimeout read `sessionStats.reviewed` from the stale pre-increment closure (still 0 on the only
  review) → fell through to `nextCard()`. Fixed with a `reviewedNow = sessionStats.reviewed + 1`
  captured in the same closure. Test: `src/hooks/__tests__/useStudySessionSingleCard.test.js`
  (jsdom + `vi.mock` confetti). Double-rate latch (C5) still green.
- **C6 — export/import dropped data on device migration.** New module-level `makeBackupDefaults()`
  + `BACKUP_KEYS`; `exportData`/`importData` both iterate the ONE list, and import falls back to
  per-field defaults for keys an OLD backup lacks. Now round-trips
  examAttempts/guide/pdfReader/examRehearsalLang/ai **and** previously-unexported user prefs
  (theme, dailyGoal, a11y prefs, cognitiveProfile, …). Excluded device-transient:
  sync/auth/installPrompt/lastMutationAt/userRole/reviewedToday/lastStudyDate/activeDeck. Decision:
  expanded past the 5 named fields to "every user field" per the kickoff's intent (veto note: the
  minimal 5-field fix would leave theme/goal/a11y silently dropped — same bug class; trade-off is
  that importing an OLD backup now resets unspecified prefs to defaults, i.e. the "import =
  replace" contract). Test: `src/store/__tests__/exportImportRoundTrip.test.js` (round-trip +
  old-file-with-defaults guard).
- **C10 — Grammar cram served the stale wrong-language deck after MS⇄EN.** `switchLang()` now
  reseeds all six cram decks from the NEXT language's sources synchronously (batched with
  `setLang`) when cramMode is on — fixing both the wrong language AND a hard crash (a Malay imbuhan
  item fed to the English MCQ card has no `options`). Test:
  `src/pages/__tests__/grammarCramLangSwitch.test.js` (an error boundary turns the old crash into a
  clean assertion).

---

## ✅ P2 quick-wins batch shipped — 2026-06-13 (light-mode contrast + SW slim + double-rate latch)

Three fixes from `docs/reviews/2026-06-12-full-codebase-review.md`, test-first:

- **P2-U1 — light mode got its own contrast palette.** The `.light` block in `src/index.css`
  now overrides accent/green/orange/red/blue/cyan/purple/dim with darkened values, every one
  ≥4.5:1 (WCAG AA) against the worst light background `--color-card2 #e8e8f0` (ratios are
  comments in the CSS; computed, not eyeballed). accent2 was already passing and is inherited.
  **New convention:** `--color-on-bright` (black in dark, white in light) is THE label color for
  text sitting on a `--color-*` filled control — 28 sites converted from `text-black`/`'#000'`
  (Check buttons, PDFReader OCR/sentence/group toggles, Settings interest stars + segment
  pickers, IssuesPanel severity chips, WordFamilyTree add button, Dashboard heatmap level-3
  cell, SavedWordCloze rate buttons). Never put `text-black` or `'#000'` on a colored fill
  again — use `var(--color-on-bright)`. Dark mode is pixel-identical (on-bright = #000 there;
  verified by before/after screenshots, dark pair indistinguishable).
- **P2-P1 — og-image.png (752 KB) no longer precached** by the service worker
  (`globIgnores` in `vite.config.js`); precache manifest now 110 entries / ~2.37 MB. Crawlers
  still fetch it normally — only the PWA install diet changed.
- **P2-C5 — double-rate latch on flashcards.** `useStudySession.rate` now latches via
  `advancingRef` during the 300 ms / 5 s advance window, so a double-tap or button+keyboard-1-4
  combo applies exactly ONE FSRS review. Red-proofed first (watched `reps` hit 2) in
  `src/hooks/__tests__/useStudySessionDoubleRate.test.js` (3 tests; jsdom + real store; reuses
  the Node-25 localStorage shim pattern from the auth-guard integration suite).

Deliberately OUT of scope (flagged, not forgotten): the dark-mode `--color-dim` bump the review
mentioned alongside P2-U1 (kickoff froze dark pixels byte-for-byte) and `#69f0ae` in
`Writing.jsx:39` (P3 hardcoded-hex item).

---

## 🔧 Tooling change — 2026-06-09 (read this)

**Commits are now quality-gated.** `.githooks/pre-commit` runs `build → test:run → lint`
and **aborts the commit (and the auto-push/prod deploy) if any fail** — so a broken build
can no longer reach users. Adds ~30s to each commit. Emergency bypass: `git commit --no-verify`.
**Docs-only fast-path:** commits where every staged file is `*.md` skip the gate (instant) —
safe because nothing in src/tests imports markdown.

**CLAUDE.md was slimmed:** the "Zero-Waste Cognitive Engine" master plan + full agent
guidelines moved to **`docs/PROJECT_VISION.md`** (read it when planning features). Stale facts
fixed (test count ~630, correct lint-warning file names). Rationale: a leaner always-loaded
CLAUDE.md = better rule adherence (Anthropic best-practice).

---

## 🧪 AI-tier eval shipped — 2026-06-12 (repays ledger #2, measurement half)

Built a MANUAL eval comparing the **free/rule-based** vs **BYOK/LLM** tiers on two surfaces
(Malay writing feedback, Cikgu answers). Harness: `scripts/ai-tier-eval/` + `npm run eval:ai-tier`
(node loader `scripts/lib/extless-resolver.mjs` lets raw node import the app's Vite-style modules,
so it runs the REAL `score()` / `searchKnowledge()`). Design + pre-registered decision thresholds +
the teaching narrative: `docs/research/2026-06-12-ai-tier-eval.md`.

**Free-tier dry run DONE (deterministic, committed `results.json`):** writing free recall = **100% on
regex-catchable errors, 0% on semantic grammar errors** (24/35 planted errors silent). The free writing
tier is a spelling+slang checker, not a grammar tutor — that reframes ledger #2 from "lesser tutor" to
"different tool with a structural ceiling." Surprising side-finding: the Gemini BYOK Cikgu prompt
(`PROMPT_SYSTEM_IDENTITY`) is THINNER than the free OpenRouter one.

**KEYED RUN PARKED 2026-06-12 — needs a billed key.** A free Gemini key caps at **20 generateContent
req/day/model** (some models limit 0); the full run is **72 calls** (24 contestant + 48 judge), so it
can't complete on a free key (3/12 writing comparisons succeeded before the cap — pipeline verified).
NEW FINDING (in the doc, §8 #4): a *free* BYOK key is barely usable for daily study → "nudge BYOK" only
mitigates ledger #2 with a PAID key. **When a billed key exists:**
`GEMINI_KEY=… GEMINI_MODEL=gemini-2.5-flash JUDGE_MODEL=gemini-2.0-flash npm run eval:ai-tier` (~$0.10–0.20),
then audit `ai-tier-eval-results/spot-check.md` + fill the §10 decision table. **Free-key pilot (no billing):**
prepend `EVAL_SAMPLE_N=4` on fresh daily quota (8+16 calls; put contestant + judge on two *different* fresh models).

---

## ✅ SHIPPED 2026-06-12 (LATEST) — Unified the Cikgu BYOK prompt (closed eval finding #2)

**Done.** Added `CIKGU_SYSTEM_PROMPT` (the detailed direct-instruction prompt) to
`src/core/agent/promptLibrary.ts`; `chatWithGemini` (`src/lib/gemini.js`) + `chatWithFreeModel`
(`src/lib/openrouter.js`) both import it (each keeps its own `${contextNote}` append); deleted the old
Socratic `PROMPT_SYSTEM_IDENTITY` (no users left — the Socratic stance survives ONLY in the mistake flow:
`getMetacognitivePrompt`/`getRelationalHookPrompt` → `feedbackGenerator.ts`, untouched). Eval mirror
`scripts/ai-tier-eval/prompts.mjs` `CIKGU_BYOK_SYSTEM` + `docs/research/2026-06-12-ai-tier-eval.md`
finding #2 synced to "fixed". **Test:** `src/lib/__tests__/cikguSystemPrompt.test.js` (+4) — red-proofed
(the fetch mocks captured the OLD prompts before the fix; assert both providers transmit the shared
constant + its content contract). **Gate green:** build · 997 tests · lint 0 err · content-lint.
**Baseline:** eager `index` 464.03→**465.05 KB** (gz 148.35→**148.91**, +0.56 KB gz — the full prompt now
sits in the eager chunk via gemini.js; openrouter.js's chunk lost its inline copy). Net win: a Gemini-key
user now gets the GOOD prompt instead of the thin Socratic one. *The executed decisions are kept verbatim
in the box just below as the implementation record; the **next session** is the ▶ box further down.*

> **WHY.** Cikgu chat teaches with contradictory philosophies by provider key: Gemini path
> (`PROMPT_SYSTEM_IDENTITY`, `src/core/agent/promptLibrary.ts`) = Socratic *"NEVER spoon-feed the answer"* +
> syllabus-vague; free OpenRouter path (`chatWithFreeModel`, `src/lib/openrouter.js`) = *"lead with the answer +
> always a Malay example + name the rule"* + IGCSE-grounded. Same feature, opposite tutoring — the Gemini-key
> user gets the worse one.
>
> **DECISIONS (made — execute as written; veto only if you disagree).**
> 1. **Pedagogy = direct answer + worked example** (the OpenRouter stance), NOT Socratic, for general Cikgu Q&A.
>    Grounded: for beginners, direct instruction + worked examples beat minimal-guidance/discovery
>    (Kirschner–Sweller–Clark 2006; worked-example effect), and it matches the app's ADD-first / immediate-feedback
>    north star. Socratic "explain your reasoning first" stays ONLY in the mistake flow (`getMetacognitivePrompt`
>    → `feedbackGenerator.ts`) — the right context for it; do NOT touch that.
> 2. **Single source of truth:** add `CIKGU_SYSTEM_PROMPT` to `src/core/agent/promptLibrary.ts` (the detailed
>    OpenRouter-style prompt). `chatWithGemini` (`src/lib/gemini.js` ~L111) and `chatWithFreeModel`
>    (`src/lib/openrouter.js` ~L464) both import it and drop their inline prompts (keep each caller's
>    `${contextNote}` append). `PROMPT_SYSTEM_IDENTITY` then has no users (grep-confirmed sole user is
>    `chatWithGemini`) → delete it, no dead exports.
> 3. **Keep the eval in sync:** update `scripts/ai-tier-eval/prompts.mjs` `CIKGU_BYOK_SYSTEM` to the new unified
>    prompt (mirror + keep the "sync-pin" comment) so a future eval run measures the fixed version.
>
> **WHAT I'LL SEE.** A unit test asserts `CIKGU_SYSTEM_PROMPT` contains the core instructions (mandatory Malay
> example + EN gloss, name-the-rule, IGCSE 0546 imbuhan/tense/kata-hubung focus, mark-student-Malay ✓/✗,
> lead-with-answer) and that both providers import it. Manual: a Cikgu answer with a Gemini key now leads with
> the rule + a Malay example.
>
> **WHAT NOT TO BREAK.** `getMetacognitivePrompt`/`getRelationalHookPrompt` + `feedbackGenerator.ts` (Socratic
> mistake flow stays); `callGemini`/`callOpenRouter` `{systemPrompt,messages,maxTokens,signal}` contract; BYOK
> keys (localStorage only); MS/EN behaviour; `chatWithGemini` is called only by `CikguBot.jsx` (verified).
>
> **PROVE IT.** Gate green (build+test+lint+content); new test red-proofed (fails before, passes after); paste
> output. Update RESUME_HERE + eval-doc finding #2 → "fixed".
>
> **GROUNDING (read first).** `src/core/agent/promptLibrary.ts`, `src/lib/gemini.js` `chatWithGemini`,
> `src/lib/openrouter.js` `chatWithFreeModel` (the GOOD template to lift), `src/pages/CikguBot.jsx`,
> `scripts/ai-tier-eval/prompts.mjs`. **MODEL:** Opus 4.8 `/fast`.

---

## ✅ SHIPPED 2026-06-12 (LATEST) — P1-5 reader/drill a11y pass — ALL FIVE P1s NOW CLOSED

**Done — the reader's core loop works end-to-end with no pointer.** Built to the spec/plan
(`docs/superpowers/{specs,plans}/2026-06-12-reader-drill-a11y*`), test-first, every new test red-proofed
(the reader e2e was watched fail against the stashed pre-implementation code, then green):

- **#1 Reader keyboard (F1–F8):** pure `src/lib/readerKeymap.js` dispatcher (18 unit tests; keyboard ranges
  classify EXACTLY like drags via `classifyGesture`) + roving tabindex / `id="tok-N"` / delegated `onKeyDown`
  in `PDFReader.jsx` + `:focus-visible` ring. Tab→token, arrows/Home/End move, Enter reveals (reveal-gate
  intact — focus alone reveals NOTHING), Shift+Arrow+Enter→bucket→"Add N"→FSRS, `a` adds a revealed gloss,
  Esc clears. e2e `tests/e2e/reader-keyboard.spec.js` (5 specs). **F8 proof:** `useSelectionMode.js` +
  `gestureModel.js` zero-diff; their suites + select-v2/select-to-card/translate-document e2e green unmodified.
- **#2 SR answer feedback (F9):** shared `src/components/FeedbackLive.jsx` (polite, atomic, sr-only, mounted
  unconditionally) wired into ClozeMode/TypeMode/ListenMode/QuizMode/FlashcardMode (all 4 typed sub-modes) +
  ALL Grammar surfaces (typed drill, McqDrillCard→confusables/SVA/articles, tense, error, **transform** —
  added beyond plan, same pattern). Tests: `feedbackLive.test.js` + `studyFeedbackA11y.test.js` (mount-driven
  Cloze/Quiz + structural pins).
- **#4 SearchModal dialog (F11):** `src/lib/useFocusTrap.js` (5 unit tests) + role=dialog/aria-modal/label.
  **Decision (flagged):** removed the input's `autoFocus` — it fired before the trap's effect, so focus-return
  recorded the input as the "trigger" and close dropped focus to `<body>`; the trap now does the focusing
  (same UX, correct return). Veto = restore autoFocus and accept broken focus-return.
- **#3 44px sweep (F10):** generic Chromium e2e `tests/e2e/a11y-tap-targets.spec.js` (measures EVERY button
  in header / reader toolbar / SearchModal — new controls are covered automatically). Red run produced the
  offender list (Search 32×32, toolbar 28-30px, SearchModal chips 14-24px); fixed via honest `min-h-[44px]`
  (segmented buttons) + 44px hit-box-around-small-glyph (modal chips, density preserved) + aria-labels on the
  previously unnamed icon buttons. **Decision:** grew toolbar buttons rather than invisible overlay extensions
  (overlays on adjacent segmented buttons would overlap → mis-taps; unmeasurable generically). Screenshots
  dark+light verified. **Flag (pre-existing, NOT a regression — verified via before-screenshot):** the
  signed-out "Save" pill overlaps the long title on <400px widths; cosmetic follow-up.
- **Gate:** build ✓ (PDFReader chunk 67.3→70.7 KB raw — keyboard layer; baseline re-recorded in CLAUDE.md;
  index 465.0→466.6 KB) · **1031/1031 unit** · lint 0 errors (3 pre-existing warnings) · 89/89 reader-family
  e2e (incl. OCR, layout, sentence-reveal, full-translation). No content-lint script exists in this repo —
  the kickoff's "content-lint" resolved to nothing extra. Vitest gotcha encoded: new tests MUST be `.js`
  under `__tests__/` (the include glob ignores `.test.jsx`) — the plan's `*.test.jsx` names were adjusted.

*Ledger #2's open thread — the **keyed** AI-tier eval run — stays PARKED on a **billed** Gemini key.*


---

## 🗄️ Archive

Closed/historical sections — shipped boxes kept for archaeology, superseded "next session" picks,
the autonomous research queue, and the full 2026-05 implementation log — were rotated out of this
file on 2026-06-13 to keep the live handoff readable in one pass. They live in
[`docs/archive/RESUME_ARCHIVE-2026-06.md`](docs/archive/RESUME_ARCHIVE-2026-06.md). Nothing there is
an active TODO — the live queue is the ▶️ box at the top of this file.
