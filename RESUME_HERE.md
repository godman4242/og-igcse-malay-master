# RESUME HERE — read this first

You are a fresh Claude Code session continuing work on the IGCSE Malay
Master app. Read this doc end-to-end **before** opening any other file.

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


## 🧭 MODEL ROUTING until 2026-06-22 — MAXIMIZE Fable 5 while the plan still has it

**CORRECTED 2026-06-13 (Kheshav's call): Fable 5 is available only UNTIL June 22 — so the
Fable-grade work fires NOW, front-loaded; Opus 4.8 takes the interactive/gated leftovers anytime.**
Routing rule unchanged (hard/long-horizon/architectural/overnight → Fable; interactive/surgical →
Opus); only the schedule flipped.

### 🔥 FIRE NOW on Fable 5 (high) — in this order, before June 22
1. **"Picked for you" Phase 2 — ✅ DESIGN DONE 2026-06-13, BUILD READY.** Live-truth audit found
   Phase 2 is ~70% BUILT (deckGenerator + grounding + CC0 Wikidata tier + MakeDeckPanel all live
   on /for-you) and the licensing fork was already resolved 2026-06-06 (owned data + CC0 only —
   no kaikki/CC-BY-SA in this public repo; verdict re-confirmed, stands). The two REAL gaps:
   deck generation predates the multi-provider BYOK router (Gemini/Ollama-only users are locked
   out) + the AI-roleplay seed was never built. Spec:
   `docs/superpowers/specs/2026-06-13-for-you-phase2-completion-design.md` · plan:
   `docs/superpowers/plans/2026-06-13-for-you-phase2-completion.md`. Build = the next Fable
   session (kickoff below).
2. **Multimodal epic — design session.** Audio/video → Malay transcripts, more import formats
   (memory: project_multimodal_direction). Pairs with the instruct.js provider router. Output =
   spec(s) + a build kickoff; the build itself can be a Fable overnight loop too.
3. **True English study mode — design session.** Full EN-learner parity (flagged 2026-06-11).
4. **Overnight Fable build loops** consuming whatever specs 1-3 produce — chain them on the
   nights remaining before June 22.

### Opus 4.8 (/fast) — anytime, including after June 22 (interactive or externally gated)
- **#9 record-and-compare in SpeakMode** — WITH Kheshav listening (audio UX needs his ears);
  spec: docs/superpowers/specs/2026-06-13-record-and-compare-speaking-design.md.
- **#8 parameterized listening passages** — gated on a native speaker reviewing Malay variants.
- **Keyed AI-tier eval** — gated on a billed Gemini key (ledger #2's open half).

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
