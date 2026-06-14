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

**🤖 Build queue now EMPTY — all 4 vetted items shipped this loop** (AWL S2, AWL S3, locale audit,
pure-lib coverage). A fresh local/cloud builder run will hit "queue empty — nothing to build" until
Kheshav adds a new `[ ]` item.

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
