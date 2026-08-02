# Full codebase review — 2026-08-01

**Read-only.** No file under `src/`, `tests/`, `scripts/` or `supabase/` was touched. The only writes are
this document and the pointer in `docs/loop/GOAL.md`.

## Method (honest)

Three waves of scoped finder agents, then adversarial verification, then a completeness critic.

- **Wave 1 (17 agents)** — 8 at FULL depth on the genuinely unreviewed delta (`git log --since=2026-07-03`:
  SEO prerender · Tutor Output Contract · shared-deck link+import · Malay starter + academic-EN seeds ·
  `dictionaryExamples.js` · `dictionary.js` + derived files · the patched graders · the patched
  store/sync/AI/media plumbing) and 9 whole-repo axis sweeps (content-truth ×2 · data-correctness ×2 ·
  silent failures · accessibility · perf/bundle · test coverage · dead code).
- **Wave 2 (8 agents)** — the 7 subsystems wave 1 never opened (server tier · BYOK instruct router ·
  translation layer · Web Speech layer · guide engine · study modes · app shell/PWA), then a
  **completeness critic** asked "which subsystem did no finder ever open?".
- **Wave 3 (4 agents)** — the three high-risk areas the critic named (roleplay client · auth/RLS, queried
  live · the `useStudySession` + PDF-reader-satellite seam) plus a re-framed coverage sweep ("which live
  modules have *no test file at all*", instead of "which tests are weak").
- **Verification** — every P0/P1 finding was to get **3 independent skeptics prompted to REFUTE it**, with
  distinct lenses (mechanical correctness · reachability by a real user · prior-art & honest severity), and
  killed on majority refute.
- **Lead session** — separately covered `api/`, `vercel.json`, npm-audit, dependency reachability, the red
  e2e CI, a clean `npm run build` measurement, and the live production bundle.

### ⚠️ Limitation you must read before trusting a severity

**The skeptic fleet was killed by a weekly usage limit — 161 of 178 verification agents failed** with
`You've hit your weekly limit`. This is the *same* failure mode that truncated the 2026-07-03 review.

What that means concretely:
- **4 findings received the full 3-lens adversarial treatment** (13 lens votes landed, **0 refutations**,
  2 honest severity corrections). Those are in ✅ CONFIRMED.
- **5 more are in ✅ CONFIRMED because I verified them myself, inline, against live code or the live
  production deployment** — each cites the exact command or line I checked.
- **Everything else is 🟡 PLAUSIBLE: extracted by a finder, never independently refuted.** Do **not** fix
  those blind. Verify first — the one wave-3 P0 I *did* spot-check turned out to be mis-anchored (see
  ❌ REFUTED R1), which is exactly why the verification step exists.

### Counts

| | |
|---|---|
| **Proposed** (raw, all three waves + critic) | **140** |
| **✅ CONFIRMED** (3-lens verified, or lead-session verified against live code/prod) | **9** |
| **🟡 PLAUSIBLE** (extracted, NOT independently verified) | **131** — 11 P0 · 43 P1 · 64 P2 · 13 P3; 115 marked loop-safe |
| **❌ REFUTED / severity-corrected** | **6** |
| Agents spawned | 203 attempted · 42 completed · **161 killed by the usage limit** |
| Findings that restate the 2026-06-12 or 2026-07-03 queues | **0** (every finder read a dedupe brief first and each finding carries a `dedupeCheck`) |

Baseline at review time: **2208 unit tests / 223 files green**, lint clean, `npm run build` clean.
**e2e CI is RED on every push for at least the last 18 days** — `gh run list --workflow=ci.yml --limit 20`
returns **20 consecutive failures**, the oldest visible dated 2026-07-14 (see C2/C3).

---

## ✅ CONFIRMED — fix queue (severity-ordered)

### P0

#### C1 · Production auth and cloud sync are completely dead — the Supabase project the prod bundle points at no longer exists
**`.env.local` → `VITE_SUPABASE_URL` → baked into the prod bundle at build time.**

Evidence, all re-runnable:
```bash
# The host baked into the LIVE production bundle:
curl -s https://upg-igcse-malay-master.vercel.app/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js'
curl -s https://upg-igcse-malay-master.vercel.app/assets/index-DtdT0DDX.js \
  | grep -oE 'https://[a-z0-9]+\.supabase\.co' | sort -u
#   → https://sfrpbnmhvhtsgzqwnent.supabase.co

# That host does not exist — three independent resolvers agree:
nslookup sfrpbnmhvhtsgzqwnent.supabase.co 8.8.8.8   # NXDOMAIN
nslookup sfrpbnmhvhtsgzqwnent.supabase.co 1.1.1.1   # NXDOMAIN
nslookup supabase.co 8.8.8.8                        # control: resolves (76.76.21.21)
curl -s -o /dev/null -w '%{http_code}\n' https://sfrpbnmhvhtsgzqwnent.supabase.co/auth/v1/health  # 000
```

**Failure scenario (reproducible now):** open the live site → Settings → Sign in. Google OAuth, magic
link, sign-out, cloud sync, cross-device merge and cloud backup restore all fail at the network layer.
The app keeps working because it is offline-first (Zustand + localStorage), so **nothing tells the user
their cloud backup is unreachable** — the worst possible shape for a data-safety feature. Every
cross-device sync fix shipped 2026-07-06..08 is currently unexercised in prod.

**Why it was invisible:** `SUPABASE_CONFIG.enabled` (`src/config/supabaseConfig.js:9`) is
`!!(VITE_SUPABASE_URL && VITE_SUPABASE_KEY)` — a *presence* check, never a reachability check. Both vars
are set, so the app believes cloud sync is on.

**Fix (needs Kheshav — money/infrastructure, not loop-safe):** determine whether the project was deleted
or is recoverable in the Supabase dashboard. Then either restore it or create a new project and update
`VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` on **both** Vercel projects and in `.env.local`, re-apply the
schema from `supabase/setup_all_tables.sql`, and redeploy. **Independently loop-safe hardening:** make the
failure loud — a one-time reachability probe on first sync attempt that surfaces "cloud backup
unavailable" instead of failing silently, plus a test that asserts a dead host produces a visible error.

> Supabase pauses free-tier projects after ~1 week of inactivity and deletes long-paused ones; a deleted
> project's subdomain stops resolving, which matches NXDOMAIN exactly.

### P1

#### C2 · The 2026-07-15 sr-only `<h1>` duplicated the page heading on 6 routes — 3 routes now have two `<h1>`s, and it turned e2e CI red 16 days ago
`src/components/Layout.jsx:212` renders `<h1 className="sr-only">{metaForPath(location.pathname).name}</h1>`
on **every** route, but no page's existing heading was demoted.

Duplicate **accessible name** (Layout's sr-only `<h1>` + the page's own heading, identical text) on:
`ForYou.jsx:121` (h2 "For You") · `Practice.jsx:53` (**h1** "Practice") · `WordFamilies.jsx:62` ("Word
Families") · `Comprehension.jsx:138` (h2 "Comprehension") · `CikguBot.jsx:407` (h2 "Cikgu Maya") ·
`MistakeJournal.jsx:102` ("Mistake Journal").
Genuine **double `<h1>`** on 3 routes — `Practice.jsx:53`, `Dictation.jsx:119`, `ClozeListening.jsx:162`
(verified: `grep -rn "<h1" src/pages src/components` returns exactly these three plus Layout).

**Failure scenario 1 (a11y):** a screen-reader user on `/practice` hears "Practice, heading level 1" twice
in a row, and the invariant the change was made to establish — one `<h1>` per page, equal to the page name
— is false on 3 of 21 routes.
**Failure scenario 2 (the expensive one):** Playwright's `getByRole('heading', {name: /^for you$/i})` now
matches two elements → strict-mode violation. `tests/e2e/for-you.spec.js:58` and `guide-for-you.spec.js:48`
fail deterministically. `tests/e2e/seo-h1.spec.js` cannot catch it — line 4 loops over exactly
`[['/study','Study'], ['/writing','Writing'], ['/grammar','Grammar']]`, none of which collide.

Combined with C3, CI has been red on **every push for at least 18 days** (`gh run list --workflow=ci.yml
--limit 20` → 20 consecutive failures, oldest visible 2026-07-14), so the regression net that would have
caught much of this document has been down since before either change landed on main.

**Fix (loop-safe):** demote the three page-level `<h1>`s to `<h2>` (every other page already uses `<h2>`),
leaving Layout's sr-only `<h1>` as the sole H1; then add `/practice`, `/dictation`, `/cloze-listening`,
`/for-you` to the `seo-h1.spec.js` loop so the invariant is actually pinned on the routes that broke it.

#### C3 · The Malay-starter guide step (2026-07-14) broke two Dashboard guide e2e tests, which were never updated
`src/lib/guide/pageGuides.js` `'/'` now opens with **two consecutive `arrow:'none'` centered steps** — the
intro, then "New to Malay? Start here" (added with the starter deck, commit `35076c7`).
`tests/e2e/guide-full-page.spec.js:7` and `:69` each click **Next once** and then assert
`expect(page.locator('svg.guide-pointer')).toBeVisible()`.

**Failure scenario:** after one Next the tour is on the *second* centered step, which by definition draws
no pointer arrow → `element(s) not found` (exact CI error text). Both tests fail on every push.

**Fix (loop-safe):** advance past both centered steps before asserting the arrow (or assert on the first
step carrying a `selector`). Same commit should re-run `npm run test:e2e -- guide-full-page.spec.js`.

> C2 + C3 together are the entire e2e CI outage, apart from `instruct-router.spec.js:162`, which CLAUDE.md
> already documents as a pre-existing AI-mock/timing flake. C3's cause landed 2026-07-14 and C2's on
> 2026-07-15, which matches the failure history exactly. **GOAL.md item #8 exists to prevent exactly this**
> ("the loop MUST run the e2e spec(s) covering the touched area, or treat a red CI as a top axis-1 gap") —
> the rule is written but was not followed for either July change.

#### C4 · Shared-deck import fabricates `card.ex` as `"word — gloss"`, which defeats the Speak-mode placeholder guard — **3/3 skeptics, 0 refutations**
`src/components/SharedDeckImport.jsx:51`:
```js
.map(c => ({ m: c.m, e: c.e, lang: c.lang, t: name, p: 'n', ex: `${c.m} — ${c.e}`, mn: '' }))
```
`speakTargetFor` (`src/lib/speakTarget.js:17`) filters placeholder examples with
`PLACEHOLDER_EX = /^[^(]+\([^)]*\)\.?\s*$/` — the parenthesised shape `rumah (house).`. The em-dash form
has no parentheses, so it is **not** filtered.

**Failure scenario:** import a shared deck containing `{m:'rumah', e:'house'}` → the card stores
`ex: "rumah — house"` → Study → Speak labels it **"Say this sentence"**, reads the bilingual glue string
aloud in `ms-MY`, and scores the learner's pronunciation against it. All three skeptics independently
re-derived the chain; two executed the real modules. Reachable via two unflagged UI paths (Settings →
Import a Shared Deck, and the `?deck=` link gate).

**Fix (loop-safe):** either mirror `MakeDeckPanel` (`ex: ''`) or emit the guard-compatible placeholder
`ex: \`${c.m} (${c.e}).\`` so `PLACEHOLDER_EX` matches. Add a test asserting no imported card produces a
`speakTargetFor` sentence target.

#### C5 · The Malay survival-starter deck models sentences that omit the obligatory numeral classifier (*penjodoh bilangan*) — **3/3 skeptics, 0 refutations** (severity corrected P0 → P1)
`src/data/malayStarter.js:51-53, :76` — e.g. `ex: 'Saya ada satu adik.'`, `'Saya ada dua abang.'`,
`'Saya ada dua kucing.'` Standard Malay requires a classifier after the numeral (`satu **orang** adik`,
`dua **ekor** kucing`) — the exact construction the app's own Cikgu Maya tutor teaches.

**Failure scenario:** a beginner taps "Start your Malay deck" on a zero-card Malay Dashboard
(`Dashboard.jsx:316`, the default first-run path for `studyLang:'ms'`), receives ~45 cards, and is shown
these as *model* sentences in cloze/Speak — learning a form the app elsewhere marks as an error.

Two of three skeptics corrected P0 → **P1**: the sentences are colloquially attested and not *meaning*-wrong,
so this is "teaching a sloppy register", not "teaching a falsehood". Severity recorded honestly as P1.

**Fix (loop-safe, content — web-verify each against PRPM/Kamus Dewan before editing):** add the classifier
to the affected examples.

#### C6 · A Grammar drill renders a raw LLM system-prompt — including the correct answer — to the student as the "Think:" hint — **3/3 skeptics, 0 refutations**
`src/pages/Grammar.jsx:239-243`:
```js
const intervention = agentFeedbackEngine.generateIntervention(mistakeData, cognitiveProfile);
feedbackObj = { ...feedbackObj, generativePrompt: intervention.message }
```
`generateIntervention` returns an assembled *prompt string*, not learner-facing prose, and it overwrites the
curated pedagogical hint.

**Failure scenario:** `/grammar` is unflagged (`App.jsx:62`) and defaults to `tab='drill'` with
`lang='malay'` (from `studyLang:'ms'`), so the Malay Imbuhan typed-input card is the **default** first
interaction. Answer one wrong → the "Think:" hint shows internal prompt scaffolding containing
`Context: "undefined"` **and the correct answer**, destroying the retrieval attempt the drill exists to
create. All three skeptics confirmed the path is the default, unflagged one.

**Fix (loop-safe):** stop overwriting `generativePrompt` with `intervention.message`, or have
`generateIntervention` return a learner-facing string. Add a test asserting no rendered hint contains the
answer or the substring `Context:`.

### P2

#### C7 · "Share My Deck" silently drops every card past #200 — **3/3 skeptics, 0 refutations** (severity corrected P1 → P2)
`src/pages/Settings.jsx:186` `const target = shareTargetFor(cards, base)` passes the **full, unscoped**
store deck into `sharedDeck.js:89` → `sanitiseDeck` → `sharedDeck.js:35` `if (cards.length >= MAX_SHARED_CARDS) break`
(`MAX_SHARED_CARDS = 200`). A skeptic executed the live module on a 500-card deck: the emitted file
contained **200 of 500** cards, and the UI reported success.

**Failure scenario:** a student with 500 cards shares their deck; the recipient silently gets 40% of it,
and the sharer is never told. Downgraded to P2 by two skeptics: no data is *destroyed* and the recipient
can re-share — but it is still a silent, unannounced truncation.

**Fix (loop-safe):** report the truncation in the success toast (`"Shared the first 200 of 500 words"`),
or split into multiple files. Add a test asserting a >200-card share surfaces the count.

#### C8 · The eager `index-*.js` entry chunk is 9% over its documented budget
Measured on a clean `npm run build` (and confirmed byte-identical against the live prod bundle,
`size_download=527122`):

| | measured | CLAUDE.md budget | over by |
|---|---|---|---|
| `index-*.js` raw | **514.8 KB** | ~471.7 KB | **+43.1 KB (+9.1%)** |
| `index-*.js` gzipped | **162.2 KB** | ~150.8 KB | **+11.4 KB (+7.6%)** |

**No per-route PAGE chunk is over budget** — `CikguBot` 75.0 KB and `PDFReader` 70.6 KB are both within
their documented allowances; the next largest is `Roleplay` at 65.4 KB. So this is purely the eager entry
chunk, which every cold load pays. CLAUDE.md Verification §1 names this number as a gate; nothing enforces
it (GOAL.md item #9 already queues a CI chunk-budget step).

**Fix (loop-safe):** identify what the store/entry graph pulled in since the budget was recorded and
lazy-split it, **or** re-baseline the documented number with a written justification. Do not game the
metric by moving bytes into a chunk the entry still requires.

### P3

#### C9 · CLAUDE.md — the file loaded as project instructions every session — is stale on three verifiable numbers and contradicts itself on a fourth
| CLAUDE.md says | live code says | check |
|---|---|---|
| `STORE_VERSION = 34` (line 46) | **35** — `v35 = per-language study-mix focus preset (studyMix {ms,en})` | `grep -n "STORE_VERSION = " src/store/useStore.js` → `:40` |
| `~2066 tests` (line 34) | **2208** (223 files) | `npm run test:run` |
| "21 routes" (line 95) vs "**All 19 routes** render without console errors" (line 139) | 21 routes + a `*` catch-all (`grep -c "<Route " src/App.jsx` → 22) | line 95 is right, **line 139 is wrong** |
| `index-*.js` should be ~471.7 KB / ~150.8 KB gz (line 138) | 514.8 KB / 162.2 KB — see C8 | clean `npm run build` |

The v35 feature (`studyMix`, shipped 2026-06-24) is entirely undocumented in CLAUDE.md. **Fix (loop-safe):**
correct all four; the store-version line should describe v35 the way v31–v34 are described.

> ✅ Checked and **clean**, so not a finding: the migration chain is complete and correct — sequential
> `if (version < N)` cases for **every** N from 2 to 35, including `applyV35Migration`. A store that skips
> versions still applies the whole chain cumulatively. No `STORE_VERSION` bump lacks a migration.

---

## 🟡 PLAUSIBLE — extracted, **NOT** independently verified

**Do not fix any of these blind.** Each was produced by one finder agent that was instructed to
refute itself first and to quote verbatim evidence, but the 3-lens adversarial pass never reached
them (see the limitation note above). Treat each as *a lead with a file:line and a hypothesis*.

Before acting on one, run the same three lenses against it:
**(1) correctness** — does the quoted evidence appear verbatim, and does the mechanism re-derive from
the surrounding code? **(2) reachability** — is there a real UI path, or is it flag-gated / dead?
**(3) prior art** — is it already fixed, already pinned by a test, or a documented deliberate choice?
Kill on majority refute. The R1 refutation above shows why this matters.

`loop-safe: Y` = bounded, one clear best answer, no product/UX/architecture judgement — the autonomous
build loop may take it **after** verifying it. `N` = needs Kheshav.

### P0 — unverified (11)

*A student is taught something **wrong**, or user data is corrupted/lost. Verify these first.*

- **`src/components/SearchModal.jsx:36`** — Cards created from Malay-only sources (dictionary search, Word Families) inherit `studyLang`, so an English-mode learner gets Malay words stamped `lang:'en'` and is then taught them AS English.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Learner flips the Dashboard StudyLangSwitch to English (`setStudyLang('en')`, useStore.js:953). They tap the global header search (Layout.jsx:119 renders SearchModal on every route), type "house", and hit + on the Malay dictionary hit `rumah → house`. `addCard` has no `lang`, so `const lang = card.lang \|\| state.studyLang \|\| 'ms'` (useStore.js:1311) stamps `lang:'en'`. `cardsForLang(cards,'en')` now serves it in the English session: ProduceMode renders the…
  <br>**Fix:** Pass an explicit `lang` at every call site whose CONTENT language is fixed rather than following `studyLang`: `lang:'ms'` in SearchModal.handleAdd (it reads `DICT_ENTRIES = Object.entries(DICTIONARY)`, the Malay dictionary, exclusively), `lang:'ms'` in WordFamilyTree.handleAdd, `lang:'ms'` in…
- **`src/data/dictionary.js:727`** — `justeru` is glossed 'therefore', a usage DBP explicitly rules out — Kamus Dewan defines it as "kebetulan, tepat" / "malahan, bahkan", and the error propagates into the reversed English seed and the example sentence.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A student taps `justeru` in the Connectors block (or draws it in Study/Produce mode) and is taught it means "therefore". They then write it in a Paper 4 essay exactly the way the app's own example sentence models it — `src/data/dictionaryExamples.js:495`: `'justeru': 'Dia belajar dengan tekun, justeru dia berjaya dalam peperiksaan itu.'` ("He studied hard, THEREFORE he succeeded"). That is the precise construction DBP prohibits. Kamus Dewan Edisi Keempat…
  <br>**Fix:** Change the gloss to the Kamus Dewan sense: `'justeru': 'in fact/moreover'` (slash form, which `buildEnDictionary` drops, removing the bad reverse pair automatically). Rewrite the example at `dictionaryExamples.js:495` to the malahan sense, e.g. `'Dia tidak pernah malas, justeru dia sentiasa…
- **`src/data/dictionaryExamples.js:172`** — The `berkongsi` example sentence uses `adalah` before a noun phrase — the exact kata-pemeri error DBP prohibits and that this file's own header documents as a pitfall.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Settings → load the 'Family & Social' topic pack (useStore.js:1495 `loadTopicPack` sets `ex: EXAMPLES[m]`). The `berkongsi` card ships with this sentence and it is rendered verbatim by FlashcardMode.jsx:337, ClozeMode.jsx:12, ProduceMode.jsx:28 and MixedSession.jsx:317. `saat yang tidak ternilai` is a frasa nama, and DBP Khidmat Nasihat states `adalah` "tidak boleh diikuti oleh frasa kerja dan frasa nama"…
  <br>**Fix:** Replace with a noun-predicate-safe rewrite that still blanks on `berkongsi`, e.g. `'Berkongsi kegembiraan dengan keluarga merupakan saat yang tidak ternilai.'` (9 words, still passes lintExampleQuality's 5-18 band and blankInExample). Then add a content-truth regex guard in scripts/lint-content.mjs…
- **`src/data/listeningPassages.js:130`** — The Malay listening passage `berita-cuaca` teaches Malaysia's emergency number as 991 (defunct since 2007) and keys the real number, 999, as a WRONG distractor.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Student opens /listening → picks 'Berita Cuaca Petang' → hears/reads line 125: "Penduduk yang merasa terancam digesa supaya menghubungi talian kecemasan 991." → reaches Q4 → selects 'A) 999' (the real Malaysian emergency line) → Listening.jsx:195 (`optIndex !== currentQ.correctIndex`) marks it WRONG, logs a mistake, and the feedback at Listening.jsx:166 prints `Correct: B) 991 — "talian kecemasan 991"`. The student is explicitly taught that 999 is not the…
  <br>**Fix:** In the passage text (line 125) change `talian kecemasan 991` → `talian kecemasan 999`; in Q4 (line 130) set `correctIndex: 0`, replace the now-duplicate-truth distractor 'B) 991' with a plausible non-emergency number (e.g. 'B) 991 (talian lama)' is still misleading — use 'B) 994'/'C) 995'/'D) 112'…
- **`src/hooks/useInterleavedSession.js:226`** — Smart-Session `addMistake` omits `language`, so an English micro-write/micro-speak miss defaults to 'ms' and AUTO-PROMOTES an English word into the learner's Malay deck.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Set Study language = English (Dashboard/Settings StudyLangSwitch). Smart Study scopes its queue with `cardsForLang(allCards, studyLang)` (useInterleavedSession.js:72), so every `task.card` is an `lang:'en'` card. Fail a micro-write or micro-speak task (WritingMicroPrompt.jsx:35 / SpeakingMicroTurn.jsx:81 call `onComplete({ correct: false })`) — these are the only task types that reach line 225 (`!fsrsTask && task.card`). The payload has no `language`, so…
  <br>**Fix:** Pass the card's language: `language: task.card.lang \|\| studyLang` (import nothing new — `studyLang` is already read at useInterleavedSession.js:70). Add a store test asserting an `lang:'en'` micro-task miss produces a mistake with `language:'en'` and never creates a `lang:'ms'` card.
- **`src/lib/writingErrors.js:1101`** — detectSubjectVerbBareVerb has no guard for auxiliary/modal inversion, so every correct question of the form "Did he go…" / "Can he come…" / "Does she like…" is flagged HIGH with the ungrammatical fix "he goes".
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Paste into Writing (English) any of these grammatical sentences and press Analyze: "Did he go to the market yesterday with his mother and father?" / "Can he come to the meeting tomorrow morning?" / "Does she like the new library?" / "Will she stay for the whole afternoon session?". Verified by running findIssues() on all four — each returns a HIGH 'subject-verb-bare' finding, e.g. excerpt "he go" → suggestion "he goes", message '"he go" — a singular…
  <br>**Fix:** Add the inverting auxiliaries/modals to SVA_BARE_BLOCK_BEFORE (writingErrors.js:1082-1090): 'do','does','did','doesn't','didn't','don't','can','could','will','would','shall','should','may','might','must','let','make','help','why','how','when','where','what','never','neither','nor','not','only','rare…
- **`src/lib/writingErrors.js:1029`** — The English writing grader flags the perfectly correct "I was" as a HIGH subject-verb agreement error and tells the student to write "I were".
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Verified by executing the live module (node import of src/lib/writingErrors.js). Input: a 103-word, entirely correct Year-11 narrative — `Last summer I was staying with my grandmother in Ipoh. … I was curious, so I picked it up … I was certain then … I was glad that I had kept it. I was changed by what she said…`. Output: `summariseIssues` → `{"counts":{"high":6,...},"byType":{"grammar":6}}`, five of them `"I was" -> With I/we/they/you, use "don't / do…
  <br>**Fix:** Split the rule: keep `I\|we\|they\|you` for `doesn't\|does not\|has not\|hasn't`, but restrict the `was` branch to `we\|they\|you` (a separate regex). Pin with a unit test asserting `findIssues('I was tired.')` yields no `subject-verb` finding while `findIssues('They was late.')` still does (`They was` is…
- **`src/lib/writingErrorsMalay.js:181`** — IMBUHAN_FIXES flags three words that ARE Kamus Dewan Edisi Keempat headwords — mempertingkatkan, memberitahukan and menyinar — as HIGH imbuhan errors (same defect class as the fixed mengikuti/mengambilkan, different entries).
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Verified live: findIssuesMalay('Kerajaan berusaha mempertingkatkan mutu pendidikan negara…', {formatId:'ms-rencana'}) → HIGH finding, suggestion "meningkatkan". Same for 'Guru itu memberitahukan keputusan peperiksaan…' and 'Matahari menyinar dengan terang…'. PRPM (prpm.dbp.gov.my, raw HTML) returns Kamus Dewan Edisi Keempat headwords for all three: mempertingkatkan = "menjadikan lebih tinggi atau lebih besar lagi (kedudukan, taraf, mutu, hasil…
  <br>**Fix:** Delete the three entries (or set msg:null the way the mengkaji entry at line 119-120 is disabled) and add the same PRPM-verified NOTE comment used for mengikut/mengambil at writingErrorsMalay.js:558-562. Pin each with a content-truth test in writingErrorsMalay.test.js asserting findIssuesMalay does…
- **`supabase/functions/ai-proxy/index.ts:88`** — The edge function's `roleplay` / `roleplay-score` system prompts are hard-coded IGCSE **Malay** Paper 3 and the client never sends `lang` — so an English (0510) learner's roleplay is examined in Malay, told to stop writing English, and scored on imbuhan
  <br>*content-truth · loop-safe: N · finder confidence: high*
  <br>**Fails:** Roleplay.jsx:31 selects `SCENARIOS_EN` when lang==='en' (scenarios.js:389, each entry `lang: 'en'`, e.g. 'Lost Luggage'), and Roleplay.jsx:193 HIDES static mode for those (`{s.lang !== 'en' && …}`) with the copy 'English roleplay needs AI' at :201 — so AI mode is the ONLY path for an English scenario. AI mode renders RoleplaySession (Roleplay.jsx:46 `if (scenario && mode === 'ai')`), whose only backend is `ai.call` → `callAI` → the ai-proxy edge function.…
  <br>**Fix:** Plumb language through the action, not the prose: send `lang: scenario.lang === 'en' ? 'en' : 'ms'` in both roleplay payloads (RoleplaySession.jsx:138 and :173) and in the roleplay-score payload (:216), then make the edge function build the roleplay/roleplay-score prompts per-request the way…
- **`src/components/RoleplayScorecard.jsx:70`** — Scorecard attaches each turn's AI grammar feedback to the NEXT student answer — every conversation-review note and every journalled `surface` is off by one turn, and the final turn's note is dropped
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** 5-turn session. The student's Turn 1 answer has an imbuhan slip; the examiner's next message carries `grammarNote: "guna 'menaiki', bukan 'naik'"`. The scorecard renders that note under **Turn 2**, beside a Turn 2 answer that contains no such error — the student is told a correct sentence is wrong and cannot find the error being described. Simultaneously `addMistake` writes `{ category:'imbuhan', note:<Turn 1's note>, surface:<Turn 2's sentence> }`, so…
  <br>**Fix:** Read the student turn the feedback actually describes: in the journal loop use `messages[i - 1]` (guarded on `role === 'student'`), which also fixes the dropped final turn. In the review reducer keep the (examiner_i → student_i+1) transcript pairing but source the note from the NEXT examiner…
- **`src/components/RoleplayScorecard.jsx:41`** — Every roleplay scorecard silently auto-promotes self-gloss FSRS cards — the missed key phrase is written as both the word AND its "correct" translation, so `promoteMistakeToCard` mints a card whose answer is its own prompt
  <br>*data-integrity · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Finish the `restoran` scenario; the scorer returns `keyPhraseMissed: ['pencuci mulut']`. On scorecard mount — with no user action at all — an FSRS card `{ m:'pencuci mulut', e:'pencuci mulut', t:'Mistakes', ex:'Missed key phrase in roleplay: Di Restoran' }` enters the deck at elevated difficulty. In Flashcard mode the front and back are the same string; in Produce mode the gloss shown IS the word the learner must type; in Speak mode the `ex` string…
  <br>**Fix:** Only pass `correct` when a real gloss exists. In the scorecard, resolve the phrase against `DICTIONARY` (already imported by the sibling `RoleplayTurnFeedback.jsx`) for `lang === 'ms'`, and pass `correct: gloss \|\| ''` — the store's promotion gate already requires a non-empty `correct`, so a…

### P1 — unverified (43)

*A feature is broken or silently failing for a real user.*

- **`src/components/Layout.jsx:132`** — Theater mode sets aria-hidden="true" on the header and bottom nav while every button inside stays in the tab order, so a keyboard/switch user tabs into ~8 invisible, unannounced controls during every study session.
  <br>*accessibility · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `theaterModeEnabled` defaults to true (src/store/useStore.js:206) and Study.jsx:42, Roleplay.jsx:268, Speaking.jsx:81, Writing.jsx:120 and SmartSession.jsx:36 all call `setTheaterMode(true)` as soon as a session starts. Repro: open /study with a keyboard only, press "Start" → header gets `aria-hidden="true" ... opacity-0 h-0 overflow-hidden` and nav gets `aria-hidden={theaterMode}` + `translate-y-full opacity-0 pointer-events-none` (Layout.jsx:311-315).…
  <br>**Fix:** Add `inert={theaterMode \|\| undefined}` to both the <header> (line 130) and <nav> (line 309) — `inert` removes descendants from the tab order AND the accessibility tree, making the separate `aria-hidden` prop redundant (drop it to avoid the double-signal). If the project needs wider browser support,…
- **`src/components/study/SpeakMode.jsx:128`** — SpeakMode is the one study mode with no FeedbackLive — its pronunciation score and per-word correct/close/wrong verdict are never announced, violating the repo's own drill rule.
  <br>*accessibility · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Repro: /study → mode `speak` (wired at Study.jsx:24 `{ id: 'speak', label: 'Speak', ... }` and rendered at Study.jsx:165). Speak the word; the component renders a 0-100% ring (line 125), a verdict string (line 128), the recognised transcript (line 129), a per-word correct/close/wrong chip row (lines 135-144) and a tally (lines 148-150) — and, invisibly to the learner, calls `session.rate(Rating.Easy/Good)` (lines 59-60), so the card's FSRS schedule…
  <br>**Fix:** Import FeedbackLive and render it unconditionally (empty until `result`), e.g. `<FeedbackLive text={result ? (result.error \|\| `${result.score} percent. ${result.score >= 80 ? 'Excellent' : result.score >= 50 ? 'Good try' : 'Keep practicing'}. ${result.correct} correct, ${result.close} close,…
- **`supabase/setup_all_tables.sql:231`** — telemetry_events SELECT is granted to every authenticated user — any student can read every other student's activity stream
  <br>*authorization · loop-safe: N · finder confidence: medium*
  <br>**Fails:** Any signed-in student takes the anon key out of the public prod bundle plus their own session JWT and issues one request — `GET /rest/v1/telemetry_events?select=*` — or simply edits `localStorage['igcse-malay-store']` to set `userRole:'owner'`, reloads, and opens the Admin Panel, whose `readTelemetryEvents(200)` call (AdminPanel.jsx:27) the server happily answers. They receive up to every telemetry row in the project: every other user's `user_id`,…
  <br>**Fix:** Replace the role predicate with the owner predicate already proven on `allowed_users`: `DROP POLICY "Only authenticated can read telemetry" ON telemetry_events; CREATE POLICY "Owner can read telemetry" ON telemetry_events FOR SELECT USING (auth.jwt() ->> 'email' = 'kheshav0@gmail.com');`. Better…
- **`supabase/setup_all_tables.sql:45`** — allowed_users SELECT is granted to every authenticated user — the full invitee email list is dumpable, for no functional reason
  <br>*authorization · loop-safe: N · finder confidence: medium*
  <br>**Fails:** Any signed-in user issues `GET /rest/v1/allowed_users?select=*` with the public anon key and their own JWT and harvests every invited person's email address, their role, and who invited them. Because this app is invite-adjacent and its users are school students, that is a direct roster leak of real personal email addresses to any peer who signs up — and it also reveals which accounts hold elevated roles, handing an attacker a target list for phishing the…
  <br>**Fix:** Simply drop it: `DROP POLICY "Authenticated can read allowlist" ON allowed_users;`. The owner path keeps working with no replacement policy needed — `"Owner can manage allowlist" FOR ALL` already covers SELECT, and because its `WITH CHECK` is omitted Postgres reuses the `USING` expression for…
- **`src/components/RoleplayScorecard.jsx:300`** — The scorecard speaks English roleplay content with the Malay TTS voice — all three `speak()` calls take the `ms-MY` default while the session it just left correctly switches to `en-GB`
  <br>*bilingual · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Finish the English `lost-luggage` scenario, expand a turn and tap the model answer's audio button. `"I'm afraid my suitcase didn't come out on the carousel from flight BA239…"` is queued with `utterance.lang = 'ms-MY'`; on any device with a Malay voice installed (the target audience's, per the app's own `ms-MY` requirement) the sentence is read with Malay phonology. The one artefact a speaking-exam learner is meant to imitate is modelled in the wrong…
  <br>**Fix:** Add `const ttsLang = localeFor(isEng ? 'en' : 'ms')` (import `localeFor` from `../lib/langLocale`, the repo's designated single source) and pass it as the 2nd arg at :300, :382 and :408; make the :384 label `{isEng ? 'Listen' : 'Dengar'}` (and likewise the hardcoded `Pemeriksa:`/`Awak:` row labels…
- **`src/pages/Import.jsx:114`** — Import's stemmer fallback presents the ROOT's gloss as the word's meaning — `sebuah` → "fruit", `pesakit` → "sick", `menarik` → "pull"
  <br>*content-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** In Word-by-Word, when a word misses the dictionary, `stem()` strips an affix and the ROOT's gloss is pushed as that word's `meaning`. `buildWbwChips` (wbwChips.js:19) renders `{word, meaning}` only — the root is never shown — so the chip reads exactly like a dictionary hit, with the only cue being a cyan dot whose legend says "Stemmed". I ran the real `stem()` against the real 825-entry dictionary; words absent from the dictionary that produce a WRONG…
  <br>**Fix:** Keep the stem fallback but make the provenance visible in the gloss itself rather than in a colour: `meaning: \`${stemmed}: ${DICTIONARY[stemmed]} (root)\`` — so the chip reads "sebuah / buah: fruit (root)". One-line change in Import.jsx; wbwChips.js needs no edit. Optionally suppress the fallback…
- **`src/data/dictionaryExamples.js:26`** — The `teh` example uses `di waktu petang` — DBP Khidmat Nasihat corrects that exact phrase to `pada waktu petang` (`di` is for place, `pada` for time).
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Load the 'Food & Drink' topic pack (topics.js line 2 lists `teh`); useStore.js:1501 attaches this sentence as `ex`. Every study surface then shows it. DBP Khidmat Nasihat answers this verbatim: it corrects "Imran menikmati goreng pisang **di waktu petang**" to "**pada waktu petang**", stating "'pada' sesuai merujuk pada waktu dan 'di' merujuk pada tempat" (https://prpm.dbp.gov.my/Cari1?keyword=di%20waktu&d=175768). Kesalahan kata sendi nama is one of the…
  <br>**Fix:** Change to `'Datuk saya gemar minum teh hangat pada waktu petang.'` (unchanged word count, still blanks on `teh`). Same call on line 174 `'wajah': '… terbayang di kala saya jauh dari rumah.'` — Kamus Dewan's `kala` entry sanctions only `pd ~` (pada kala), so prefer `pada kala` there too, though `di…
- **`src/data/dictionaryExamples.js:146`** — The `masa lapang` example says `pada waktu masa lapang` — a doubled time-marker (kesalahan lewah) that the same file writes correctly elsewhere.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Load the 'Leisure & Travel' topic pack (topics.js lists `masa lapang`); the card's `ex` becomes this sentence and ClozeMode renders `Saya membaca novel pada waktu _____.` `waktu` and `masa` are synonyms here, so `pada waktu masa lapang` literally reads "at the time of the free time" — pleonasm (lewah), an explicitly-marked error class in IGCSE/SPM Malay writing. The file itself gets it right twice: line 390 `'buat': 'Apa yang awak buat pada masa lapang?'`…
  <br>**Fix:** Drop the redundant marker: `'Saya membaca novel pada masa lapang setiap hujung minggu.'` (9 words — inside lintExampleQuality's 5-18 band, still blanks the multi-word headword). For line 722 use `'Sila pakai kasut sukan semasa waktu pendidikan jasmani.'` → `'… semasa kelas pendidikan jasmani.'`
- **`src/data/exemplars.js:277`** — The `ms-surat-tidak-rasmi` band-6 exemplar's sign-off "Salam sayang dari sahabat," contains the exact dari/daripada error the app's own Malay grader flags HIGH and Cikgu Maya teaches against.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Verified by running the live `findIssuesMalay` over every exemplar: `=== ms-surat-tidak-rasmi / closing === [high] grammar: "dari sahabat" -> "dari" is for places. Use "daripada" for people, things, or comparison.` The same string is registered as a model structural element at line 286 (`{ phrase: 'Salam sayang dari sahabat,', category: 'format' }`), i.e. it is highlighted to the student as the sign-off to imitate — and `src/data/cikguKnowledge.js:1306`…
  <br>**Fix:** Change both the closing text and the index-aligned annotation phrase to `Salam sayang daripada sahabat,` (the header comment warns the phrase must appear verbatim or the annotation silently fails to render). Add a content-lint test that asserts every Malay exemplar produces zero HIGH findings from…
- **`src/data/grammarEng.js:36`** — `eng-sva-team` states the British collective-noun rule backwards and marks 'have' — the more idiomatic British form for this exact sentence — as wrong.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** An English learner (0500/0510, a British syllabus) opens /grammar → SVA tab → sees 'The team ___ been training hard for the final.' → picks 'have' → marked WRONG, and the rule shown to them asserts that British convention requires the singular. Cambridge Dictionary's British Grammar 'Collective nouns' entry and Cambridge English's own ELT article 'My Team is Winning (or are They?)' both state that with `team` plural verbs are MORE COMMON in British…
  <br>**Fix:** Replace this item with an unambiguous SVA point rather than patching the rule text — the intervening-phrase classic works and has exactly one defensible answer: `{ id: 'eng-sva-listnames', sentence: 'The list of prize-winning names ___ been posted on the noticeboard.', options: ['have', 'has',…
- **`src/lib/writingErrors.js:68`** — STARTS_VOWEL_SOUND's /juː/ exception list is prefix-based and incomplete, so "a unanimous", "a utility", "a utopia", "a euphemism", "a eulogy", "a euro", "a ewe" are all flagged HIGH with the wrong fix "an unanimous".
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Verified by running findIssues() on seven grammatical sentences: 'The committee reached a unanimous decision after a long debate.' → 'a-before-vowel' HIGH, excerpt "a unanimous", suggestion "an unanimous". Same for 'a eulogy'→'an eulogy', 'a euphemism'→'an euphemism', 'a utopia'→'an utopia', 'a utility'→'an utility', 'a ewe'→'an ewe'. "a unanimous decision" and "a utopia" are ordinary IGCSE discursive-essay vocabulary; the student is handed an…
  <br>**Fix:** Replace the prefix allow-list with a broader /juː/ rule: return false for /^(u[bcglmnprst]\|eu)/ that is followed by a vowel-consonant pattern — concretely `if (/^(u(?:ni\|se\|su\|til\|top\|ten\|ran\|kule\|nan)\|eu\|ewe\|one\|once)/.test(w)) return false` covers…
- **`src/lib/writingErrors.js:530`** — "orientated" is in the English MISSPELLINGS map, so a valid British-English word is flagged HIGH as "a common misspelling" in an app that teaches Cambridge IGCSE (British) English.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Verified live: findIssues('The task is student orientated and therefore very engaging for learners.') → { id:'spell-orientated', severity:'high', type:'spelling', suggestion:'oriented', message:'"orientated" is a common misspelling.' }. "orientated" is a Cambridge Dictionary headword and the standard British form of "oriented" (OED lists both, marking orientated chiefly UK) — it is a variant, not a misspelling. A student writing correct British English is…
  <br>**Fix:** Delete the ['orientated','oriented'] entry. If the pedagogical intent is a style nudge toward the more modern form, move it to WEAK_WORDS (type 'style', severity LOW) with wording like '"orientated" is correct British English, but "oriented" is more concise' — never type 'spelling'/HIGH. Same…
- **`src/lib/writingErrors.js:883`** — The comma-splice heuristic fires HIGH on any introductory phrase of 5+ words followed by ", I/we/they + verb" — flagging correct sentences, including the app's own band-6 formal-letter exemplar.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `m[1]` is only the single word immediately BEFORE the comma, but the subordinators in `COMMA_SPLICE_SKIP_WORDS` ('although','because','since','while','as','after','when'…) OPEN a dependent clause — they can essentially never be the last word before the comma, so that half of the skip-list is dead. Verified by executing the live module: `In the middle of the crowded morning market near my house, I found my old friend.` → `[high] "house, I found" ->…
  <br>**Fix:** Before firing, test the FIRST token of `segBefore` (not `m[1]`) against `COMMA_SPLICE_SKIP_WORDS`, and additionally skip when `segBefore` contains no finite verb or begins with a preposition/participle (`In`, `After`, `Having`, `Despite`, `-ing` opener). Add regression tests for the four sentences…
- **`src/lib/writingErrorsMalay.js:734`** — Both writing graders flag every email address and URL as a HIGH "missing space after full stop" punctuation error — including 4 hits on the app's own `ms-email` band-6 exemplar.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** The abbreviation guard on the next line only whitelists `e.g\|i.e\|etc\|tn\|pn\|dr\|sk\|smk\|no`, and the digit guard only covers numerics — nothing exempts an email address or a domain. Verified by execution: `findIssuesMalay('Sila hubungi saya di alamat e-mel pengetua@sekolah.edu.my untuk maklumat lanjut.')` → two `[high] punctuation ".e"/".m" -> Tambah ruang selepas "."`; `www.sekolah.edu.my` yields three. Running the grader over the app's own exemplars…
  <br>**Fix:** Skip the match when the punctuation sits inside an email address or URL — e.g. bail if the surrounding token matches `/[\w.+-]+@[\w.-]+/` or `/\b(?:https?:\/\/\|www\.)?[\w-]+(?:\.[\w-]+)+\b/`. Apply the same guard in both writingErrors.js and writingErrorsMalay.js and pin with a test on the…
- **`src/pages/Writing.jsx:198`** — The Malay Writing Analyzer offers a "Paper 2" option and defaults to it, but IGCSE Malay 0546 Paper 2 is Reading — writing is Paper 4 (the repo's own web-verified note says so).
  <br>*content-truth · loop-safe: N · finder confidence: high*
  <br>**Fails:** `src/pages/Writing.jsx:51` is `const [mlPaper, setMlPaper] = useState(2)`, and line 206 renders the label `Paper {p}` — so every Malay user landing on /writing sees "Paper 2" selected by default on a *writing* surface. Cambridge IGCSE Malay – Foreign Language 0546 (2025–27) is Paper 1 Listening / Paper 2 Reading / Paper 3 Speaking / Paper 4 Writing (web-verified; the repo asserts the same at `src/data/cikguKnowledge.js:1068-1069` — "Cambridge IGCSE Malay…
  <br>**Fix:** Drop the 2/4 toggle for Malay (writing is Paper 4 only under 0546) and set the word target from the selected FORMAT's `minWords`; if a length switch is still wanted, relabel it as a word-target chooser with no paper number. Also fix the persona at `src/lib/writingGradePrompt.js:65` — "Pemeriksa…
- **`src/store/useStore.js:1626`** — `reviewGrammarDrill` hardcodes `language:'ms'` + `category:'imbuhan'` for EVERY drill, so English grammar misses are filed in the Malay journal as "Imbuhan" (a Malay-affix category English does not have).
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** English learner opens /grammar in English mode and gets `eng-sva-news` ("The news ___ rarely cheerful these days", answer "is", src/data/grammarEng.js:37) wrong. `Grammar.jsx:294 reviewGrammarDrill(sva.id, correct)` → the store's `addMistake({ type:'grammar', source: drillId.split('-')[0], language:'ms', category:'imbuhan', word: drillId, ... })`. Two wrong outputs: (1) MistakeJournal renders it under the label "Imbuhan" (MistakeJournal.jsx:12 `imbuhan:…
  <br>**Fix:** Derive both fields from the drill id inside `reviewGrammarDrill`: `const isEng = drillId.startsWith('eng-')`, pass `language: isEng ? 'en' : 'ms'`, and map the category off the drill-type segment (`drillId.replace(/^eng-/,'').split('-')[0]`): `tense` → 'tense', `sva`/`art`/`error`/`transform` →…
- **`src/store/useStore.js:1343`** — `seedEnglishStarter` stamps the em-dash pseudo-sentence onto all 682 English starter cards — the SharedDeckImport bug, but on the default English on-ramp
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A 0510 English learner taps the Dashboard empty-state "English starter deck" (`seedEnglishStarter`). 682 cards land with `ex: "about — tentang"`. In Study → Speak, `SpeakMode.jsx:11` runs `speakTargetFor(card)` → returns the whole bilingual glue string; `isSentence` (SpeakMode.jsx:13) is true, so the card renders the heading "Say this sentence" (SpeakMode.jsx:90) over “about — tentang”. "Listen First" calls `speak('about — tentang', localeFor('en'))` →…
  <br>**Fix:** Use the guard-compatible placeholder the rest of the app already uses: `ex: `${en} (${ms}).`` at useStore.js:1343 — `PLACEHOLDER_EX` then matches and Speak falls back to the bare word (same shape as `Import.jsx:189` and the store's own seed at line 1501). Because 682 bad cards are already persisted…
- **`src/lib/speech.js:5`** — Nothing in the app ever selects or checks a TTS voice — on a device with no ms-MY voice the Malay audio drills are spoken by the default English voice and the student is scored, journalled and auto-promoted on the resulting mis-transcription
  <br>*content-truth/correctness · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** `speak()` and `speakWithBoundaries()` (line 290 does the same) set `utterance.lang` and never assign `utterance.voice`; `grep -rn "getVoices" src/` returns zero hits, so no code path verifies a voice exists for the requested locale. `hasSpeechSynthesis()` only tests `'speechSynthesis' in window`, which is true on every desktop Chrome regardless of installed voices — and desktop Chrome on macOS/Windows ships no Bahasa Melayu voice by default. Concrete…
  <br>**Fix:** Add a voice resolver to speech.js: `getVoices()` (with a one-time `voiceschanged` re-read), pick the first voice whose `voice.lang` starts with the requested language subtag, assign it to `u.voice`, and export `hasVoiceFor(lang)`. Gate the audio-graded surfaces (/dictation, /cloze-listening,…
- **`src/components/study/ListenMode.jsx:16`** — Listen mode never rates a wrong answer — the FSRS review, the lapse, the mistake entry and the session-advance are all silently dropped
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Study → Listen mode. Card 'sekolah' (e: 'school') is due. Learner taps 🔊, types 'skolah', presses Enter. `check()` computes correct=false, renders the answer ('💡 sekolah = school'), and then does NOT call session.rate — because rate() is gated on `correct`. Consequences, all silent: (1) the card is never rated Rating.Again, so `reviewCardAction` never runs → FSRS `lapses`/`stability`/`due` are untouched and the card stays exactly as due as before; (2)…
  <br>**Fix:** Rate the failure like every other mode: `session.rate(correct ? Rating.Good : Rating.Again)`. Do the same for `reveal()` (currently `setTimeout(session.nextCard, 2000)` with no rating at line 21) — a revealed answer is a failed retrieval and should rate Again before advancing. Add a unit test…
- **`src/hooks/useStudySession.js:134`** — The double-rate latch is session-wide, not per-card: after any wrong answer the NEXT card's rating is silently swallowed while the drill still says "Correct!"
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Study → Cloze (or Type/Quiz/Produce). (1) Answer card A wrong → rate(Again) arms a 5000 ms timer and latches advancingRef. (2) Tap "Next Card" (ungated) → card B renders, its local fb is cleared. (3) Answer B correctly and press Enter, still inside A's 5 s window → ClozeMode shows "✅ Correct!" but rate() returns at the guard: no reviewCardAction, no updateStreak, no sessionStats increment, no advance. B's review is gone. (4) At t=5 s A's stale timer…
  <br>**Fix:** Latch per card, not per session, and own the timer: `const advanceRef = useRef({ id: null, key: null })`; in rate() set `advanceRef.current.key = currentId` and store the timeout id; guard with `if (!card \|\| advanceRef.current.key === currentId) return`. Clear the pending timeout in nextCard()…
- **`src/hooks/useStudySession.js:93`** — The Study queue memo deliberately drops `cards`/`studyLang` from its deps, so an async cloud card merge or a blob-restored studyLang strands the page — with no in-page recovery
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Trigger A (no recovery): signed-in user on a device with empty/small localStorage (new browser, cleared storage, second device) opens or refreshes /study. `sorted` is computed once from the empty deck → `[]` → Study early-returns the "No cards to study!" empty state. A second later hydrateCloudData unions the full cloud deck in; `filtered`, `due` and `decks` all update, `sorted` does not. The deck chips are not rendered, so the one control that would…
  <br>**Fix:** Add `cards` to the dep list and keep the queue stable by identity instead of by memo staleness: keep the current `sorted` array in a ref and only recompute when the set of card ids actually changes (`cards.map(c => c.m+' '+c.t).join('\|')` as the memo input), so FSRS field mutations from rate()…
- **`src/lib/study/quizOptions.js:30`** — Quiz mode is trivially solvable for 97 of the 180 Academic-English cards — the correct option is the only one containing a semicolon
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** studyLang='en'; learner seeds an Academic English deck from Settings (`seedAcademicEnglish`, useStore.js:1360 → `lang:'en'`). Card `area` has `e: 'kawasan; bidang'`. `generateQuizOptions` draws the three distractors from `Object.keys(dictionary)` — Malay headwords, of which I measured ZERO contain a ';'. So the rendered options are e.g. ['beri', 'kawasan; bidang', 'sakit tekak', 'jalan']: the answer is the only string with a semicolon, in every single…
  <br>**Fix:** Normalise the option text: for the quiz only, render the FIRST alternative — `const answerText = String(card.e).split(';')[0].trim()` — build `opts` from that and compare `answer === answerText` in QuizMode.jsx:15. That makes the correct option shape-identical to the distractors. Pin it with a test…
- **`src/lib/translate/providers/gtx.js:26`** — gtx swallows every per-word failure, so the whole-document translate never retries and fails 100% silently (offline / 429)
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `gtxTranslateBatch` catches each word's rejection and returns `{text:t, source:'error', provider:'gtx'}` instead of throwing, so the batch call NEVER rejects. `translateDocument`'s retry/backoff loop only re-attempts on a thrown error (`translateDocument.js:170-176` — `try { results = await translateBatch(...) } catch { ... await delay(backoff(attempt)) }`), so for the default, always-available provider the entire retry machinery is dead code. Repro: go…
  <br>**Fix:** Make `gtxTranslateBatch` rethrow when every item in the chunk failed (keep the per-item catch for partial failures) so the router's fallback and `translateDocument`'s backoff both engage. Then surface a real failure in `translatePage`: count `source:'error'` entries in `results` and show "Couldn't…
- **`src/pages/PDFReader.jsx:496`** — "Sharper read" partial failure silently truncates the document and overwrites the complete free on-device read, while the banner claims success
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Import a scanned multi-page PDF (up to 10 pages rasterised by rasterisePdfPages) -> Tesseract produces a complete on-device read -> tap "Sharper read". runImageOcr issues one callInstructVision per page. runOcr (src/lib/ocr.js:86 `} catch { results.push({ text: '' }) }`) converts every per-page failure into an EMPTY page and never rejects. Free-tier quota is the normal failure here: 10 sequential 4096-token image calls will 429 partway through (and once…
  <br>**Fix:** Treat a partial vision run as a failure of the pages that failed: have the vision branch compare the per-page success count against `images.length` and either (a) merge - keep the Tesseract text for any page whose vision result is empty - or (b) abort the replace and surface…
- **`src/pages/PDFReader.jsx:935`** — "Higher quality" (BYOK) re-translate is silently cancelled by a free-namespace cache pre-filter — the reader answers "Nothing new to translate on this document."
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `getFromCache(word, from='ms', to='en')` is `readCacheSync(word, from, to)` with ns='' (translate.js:191-193) — the FREE gtx namespace. `translatePage` uses it to decide which words still need translating, BEFORE the router ever sees `provider:'quality'` (line 962). Repro: (1) open a Malay PDF, press "Translate page" with quality off → every word is written to ns='' ; (2) the learner sees a bad gloss, taps the BYOK "Higher quality" toggle (line 1636) ;…
  <br>**Fix:** Make the pre-filter namespace-aware: give `getFromCache` an ns/provider argument (`readCacheSync(word, from, to, readNsFor(pref))`) and have `translatePage` pass `quality ? 'q' : ''`. Same for the `getFromCache(norm)` recovery read at line 943. Bonus: that read also hardcodes `from='ms', to='en'`,…
- **`src/pages/Speaking.jsx:89`** — Speaking.jsx never stops its SpeechRecognition on unmount, and onend auto-restarts it — the mic stays hot forever after navigating away
  <br>*correctness/resource-lifecycle · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Student opens /speaking, taps "Speak my answer", says one sentence (so rec._gotResult = true), then leaves without pressing "Stop & grade" — Esc exits theater mode and taps the bottom nav, or presses browser Back / swipe-back. Speaking unmounts. The unmount cleanup (lines 85-92) aborts the AI AbortController and stops the MediaRecorder but NEVER touches recRef.current, and recRef.current._stopRequested is still false, so the recogniser's onend handler…
  <br>**Fix:** In the unmount effect at src/pages/Speaking.jsx:85-92 add the same teardown stopRecording() already performs: `if (recRef.current) { recRef.current._stopRequested = true; try { recRef.current.abort() } catch { /* ignore */ } recRef.current = null }` — `_stopRequested` must be set BEFORE abort() so…
- **`src/components/SavedWordPopover.jsx:102`** — The global saved-word review popover hardcodes `language: 'ms'`, so an English learner's "I forgot" is journalled as a Malay mistake and can be one-click promoted into the Malay deck.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `useSavedWordTap` is mounted globally in Layout.jsx:46 and matches against the WHOLE deck — `savedWordsForMode(cards, highlightMode)` (savedWordHighlight.js:31) has no lang filter, and SelectionToCard saves English reader words into `DECK = 'Saved'` (SelectionToCard.jsx:21,177), the default highlight mode. So: study in English mode, save 'furthermore' from the reader, later tap it anywhere in the app and press "I forgot". The popover receives only `{…
  <br>**Fix:** Thread the card's language through: return `lang: cardLang(card)` from `reviewAt` (useSavedWordTap.js:72), accept it as a prop in SavedWordPopover, and use `language: lang` at line 102. Same one-line pattern as the shipped `reviewCardAction` fix.
- **`src/components/SearchModal.jsx:36`** — Malay-only card-creation surfaces call `addCard` without `lang`, so `addCard` stamps them with `studyLang` — a Malay word lands in the English deck and is spoken/recognised as `en-GB`.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** SearchModal is mounted globally (Layout.jsx:119, opened by the header button or the `/` key on every route) and its results come from `src/data/dictionary.js` — Malay headword → English gloss, always. It passes no `lang`, and `addCard` does `const lang = card.lang \|\| state.studyLang \|\| 'ms'` (useStore.js:1311). With Study language = English, searching 'abad' and tapping + creates `{ m: 'abad', e: 'century', lang: 'en' }`. The card then (a) disappears from…
  <br>**Fix:** Pass `lang: 'ms'` explicitly at SearchModal.jsx:36 and WordFamilyTree.jsx:82 — both surfaces render Malay-only content, so the source language is known, not inferable from `studyLang`. Add a store test that `addCard` from a Malay-only surface produces `lang:'ms'` regardless of `studyLang`.
- **`src/pages/Grammar.jsx:217`** — The 8 Malay `passive` imbuhan drills are graded by an exact-string comparator that does NOT strip the trailing full stop, so a correct answer typed without a final '.' is marked wrong, penalised in FSRS, and logged as a cognitive mistake.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Go to /grammar (Malay) → Imbuhan tab → advance to drill `passive-ibu-masak` (src/data/grammar.js:47, `answer: 'Nasi dimasak oleh ibu.'`). The prompt shows only `Ibu memasak nasi.` + hint `Convert meN- to di-`; the input placeholder is 'Type your answer...' and nothing asks for punctuation. Type `Nasi dimasak oleh ibu` and press Enter → `'nasi dimasak oleh ibu' === 'nasi dimasak oleh ibu.'` is false → marked WRONG, `setNeedsCorrection(true)` forces the…
  <br>**Fix:** Apply the same normalisation `checkTransform` already uses: in `checkDrill` compare `input.trim().toLowerCase().replace(/\.\s*$/, '')` against `drill.answer.toLowerCase().replace(/\.\s*$/, '')`. While there, also accept the standard agent-less passive — DBP allows dropping `oleh` when the agent…
- **`src/pages/Import.jsx:203`** — Import's Undo deletes cards it never added — it keys on `m::t` (ignoring `lang`) and replays the PRE-dedupe selection list, so it destroys pre-existing cards and their FSRS review history.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Two independent repros, both at these two lines. (a) PRE-DEDUPE LIST: `addSelected` sets `setLastAdded({ cards: newCards })` (Import.jsx:194) from the raw selection, but `addCards` skips any word already present (`existing.has(`${c.m}::${c.t}::${langOf(c)}`)`, useStore.js:1328-1329). The word chips carry no "already saved" state (they colour only by `w.type` dict/phrase/unknown), so a learner re-pasting last week's passage selects `makan` — already in…
  <br>**Fix:** Have `addCards` return the cards it actually inserted (it already computes `addedCards`) and store THAT in `lastAdded`; then make Undo call the store's `removeCard(c.m, c.t, c.lang)` per card instead of raw `useStore.setState`, so the key includes `lang` and each removal enqueues its `card_removed`…
- **`src/store/useStore.js:1500`** — loadTopicPack builds Malay cards with no `lang` field, so addCards stamps them with the active studyLang — an English learner who taps any Topic Pack gets Malay headwords injected into the ENGLISH deck.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** 1. Settings → Study language → English (studyLang='en', shipped v34). 2. Settings → Topic Packs → tap "Food". 3. `loadTopicPack` maps TOPIC_PACKS words to `{m, e: DICTIONARY[m], t: topicName, …}` with NO `lang` key. 4. `addCards` (useStore.js:1326) does `const langOf = (c) => c.lang \|\| studyLang;` → every one of those Malay headwords is stored as `lang:'en'`. 5. Result: `cardsForLang(cards,'en')` now returns Malay words, so a session in English mode…
  <br>**Fix:** Hardcode the source language in `loadTopicPack`: `m, e: DICTIONARY[m], t: topicName, lang: 'ms', …` (TOPIC_PACKS + DICTIONARY are Malay-only content, exactly like `seedMalayStarter`, which already does `lang: 'ms'` at useStore.js:1418). Close it with one store test: set `studyLang:'en'`, call…
- **`src/components/PWAUpdateToast.jsx:24`** — Hourly forced SW update check + autoUpdate reload wipes an in-flight 30-min Exam Rehearsal (all state is component-only, no beforeunload)
  <br>*data-loss · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A student opens the installed PWA and starts Exam Rehearsal. `ExamRehearsal.jsx` holds the ENTIRE rehearsal in component state — `const [stage, setStage] = useState(STAGE.INTRO)`, `compAnswers`, `writingText`, `speakTranscript`, `listenAnswers`, `rehearsalStartedAt` (lines 90-112) — and only ever writes to the store at the very end via `logExamAttempt` before `setStage(STAGE.RESULTS)` (line ~308). Meanwhile this `setInterval` actively POLLS for a new…
  <br>**Fix:** Gate the auto-reload on "nothing in flight": expose a store flag (e.g. `session.inProgress`) set by ExamRehearsal/Writing/Speaking while a timed or unsaved surface is active, switch `registerType` to `'prompt'` so the SW waits, and show the existing toast ("New version ready — tap to update")…
- **`src/store/useStore.js:1990`** — `setDailyGoalLevel` has zero call sites, so `dailyGoalLevel` is permanently frozen at 'standard' — the Settings Daily Goal control never reaches the daily-plan budget or the challenge sizing.
  <br>*dead-code · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Fresh store (dailyGoalLevel:'standard'). Open Settings → Daily Goal → tap 50. Settings.jsx:524 (`<button key={g} onClick={() => setDailyGoal(g)}`) is the ONLY Daily-Goal control in the app and it calls setDailyGoal, which writes `dailyGoal` only. `setDailyGoalLevel` (useStore.js:1297 — the one action that writes `dailyGoalLevel`) has zero call sites outside its own definition and one test (`prefMutationSync.test.js:61`; grep over src/ tests/ scripts/…
  <br>**Fix:** Make `setDailyGoal` derive and co-write the level (10→'casual', 20/30→'standard', 50→'intensive') via the existing single `commitPrefMutation` call, or have Settings.jsx:524 call `setDailyGoalLevel` and widen its mapping to the 4 shipped buttons [10,20,30,50]. Either way the two writers must stop…
- **`src/pages/Roleplay.jsx:139`** — Roleplay's "Add your own free key" nudge is a dead end — `lib/ai.js` never consults a BYOK key, so the key the student is sent to add can never restore AI roleplay (and English scenarios then have no practice path at all)
  <br>*free-path-honesty · loop-safe: N · finder confidence: high*
  <br>**Fails:** Student exhausts the 50/day quota. The orange nudge promises a way forward; they open Settings → BYOK, paste a free OpenRouter key, and return to /roleplay. `getRemainingCalls()` is still 0, so the banner still reads "AI unavailable — using static roleplay mode", the AI Practice button is still hidden — and the nudge has now vanished (they have a key), so there is no explanation whatsoever. For the 7 English scenarios there is no static mode at all (:194…
  <br>**Fix:** Pick one and make the copy match reality. (a) Give `callAI` the same BYOK fall-through the rest of the app has — try `hasUserOpenRouterKey() → callOpenRouter(...)` before the edge function (mirror `src/lib/aiText.js:16-23`), which makes the nudge's promise true and unblocks English roleplay offline…
- **`src/components/study/SpeakMode.jsx:59`** — SpeakMode rates the card on a good score, so the 300 ms auto-advance wipes the pronunciation breakdown — and the "Hear yourself vs the model" panel can never render on a passing attempt
  <br>*pedagogy/UX · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Student in Study → Speak mode pronounces the word well (score 62). `setResult(...)` renders the % circle, the per-word correct/close/wrong chips and the ✅/〜/✗ tally; the very next statement calls `session.rate(Rating.Good)`, and useStudySession.rate schedules `nextCard()` on a 300 ms setTimeout (src/hooks/useStudySession.js:158-177). Study renders `<SpeakMode key={card.m} …>` (src/pages/Study.jsx:165), so the card change REMOUNTS the component and all of…
  <br>**Fix:** Don't rate inside record(). Store the pending rating in state, show the result + replay panel, and rate on an explicit "Next" tap (mirrors ListenMode's reveal→timeout pattern but with a user-driven commit) — or, minimally, defer `session.rate(...)` until the audio finalisation promise settles AND a…
- **`src/components/study/FlashcardMode.jsx:181`** — The flashcard's answer is in the accessibility tree before the flip — `backface-visibility: hidden` is visual-only — so retrieval practice, the app's core mechanic, silently fails for screen-reader users.
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Repro: turn on VoiceOver/NVDA, go to /study in Flashcard mode with card `{ m:'rumah', e:'house', ex:'Saya tinggal di rumah besar.' }`. Both card faces are always mounted; the back face is hidden only by `.backface-hidden { backface-visibility: hidden; }` (src/index.css:110), which is a paint-time property and does NOT remove the node from the accessibility tree (unlike display:none / visibility:hidden). Neither face carries `aria-hidden` (grep for…
  <br>**Fix:** Gate both leaks on `flipped`: put `aria-hidden={!flipped}` on the back-face div (line 179) and `aria-hidden={flipped}` on the front-face div (line 144); on the front face pass the icon no gloss (`<DictionaryIcon word={card.m} size={56} />`, whose label falls back to the word alone) or…
- **`src/lib/ai.js:236`** — `readSSEStream` has no branch for the edge function's `{type:'error'}` SSE event — a total upstream failure returns an EMPTY string, calls `recordSuccess()`, and CikguBot posts a blank tutor bubble instead of falling through to the always-works expert system
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** When every model in FREE_MODELS fails (the file's own comment at index.ts:26-28 says the free tiers 'are frequently 429-throttled'), the streaming path does NOT return an HTTP error — headers were already flushed. It enqueues a payload event instead (index.ts:452): `const errData = JSON.stringify({ type: 'error', error: lastError.message });`. On the client, `processLine` parses it, matches none of the three branches above (`parsed.type` is 'error';…
  <br>**Fix:** In `processLine`, add `if (parsed.type === 'error') throw new AIError(parsed.error \|\| 'AI stream failed', 'unavailable')` (or set an `streamError` flag the reader checks before returning), and in `readSSEStream` replace the unconditional `recordSuccess()` at :271 with `if (!accumulated) {…
- **`src/lib/gemini.js:131`** — Cikgu's default AI tier sends maxOutputTokens 512 with no thinkingConfig to gemini-3.5-flash, whose thinking defaults to "medium" and eats that budget — replies truncate mid-sentence or come back empty and silently fall back.
  <br>*silent-failure · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** `isGeminiAvailable()` is hardcoded `return true` (gemini.js:20-23), so every AI-mode Cikgu turn takes Strategy 0 (CikguBot.jsx:124-139). That request goes to /api/gemini, which forwards the client body unchanged (`body: JSON.stringify(req.body)`) to model `gemini-3.5-flash` (api/gemini.js:35). The repo's own grounded note says 3.x-flash defaults to `thinkingLevel: "medium"` and that thinking consumes maxOutputTokens…
  <br>**Fix:** Mirror the fix already shipped for the grade path: pass a thinking budget and a realistic cap, e.g. `callGemini({ systemPrompt, messages, maxTokens: 1536, thinkingConfig: thinkingConfigForGrade('gemini-3.5-flash'), signal })` — the selector already exists (scripts/ai-tier-eval/thinkingBudget.mjs)…
- **`src/pages/Import.jsx:186`** — Import's "Add cards" writes the untranslated source word (or the literal string 'loading...') as the card's gloss when translateWord fails or is still in flight.
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Import → paste Malay text → "Process Text" → tap an `unknown` chip (line 320 fires `translateUnknown(w.word)`), which at line 169 does `setTranslations(t => ({ ...t, [word]: result.text }))` with NO check of `result.source`. When every provider fails, `translateWord` returns `{ text: <the input word>, source:'error' }` (src/lib/translate.js:134), so `translations['belanja'] === 'belanja'` and `addSelected` creates `{ m:'belanja', e:'belanja', ex:'belanja…
  <br>**Fix:** In `translateUnknown`, store `{ text, source }` (or store nothing on `source === 'error'`) and render an explicit "couldn't translate" state; in `addSelected`, exclude any selected word with no real gloss instead of falling through to `w.word`, and never treat the `'loading...'` placeholder as a…
- **`src/pages/PDFReader.jsx:873`** — PDFReader "Add selection to deck" silently creates FSRS cards whose English gloss IS the Malay word when machine translation fails.
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Reader → Select mode → drag/Shift+Arrow to pick `belanja`, `rumah`, `pentas` → tap "Add to deck" while the free gtx endpoint is rate-limited (HTTP 429 on the unauthenticated `translate.googleapis.com/translate_a/single?client=gtx` endpoint) or the device is offline. `translateBatch` never throws — src/lib/translate.js:185 fills every miss with `{ text: missing[j], source: 'error', provider: null }`, i.e. the SOURCE word as its own translation.…
  <br>**Fix:** Inspect the result's `source` before building the card: drop (or hold back) any entry where `translations[pi]?.source === 'error'`, and surface an inline "Couldn't translate these — try again" notice listing the skipped words instead of adding them. Bonus: consult DICTIONARY/enDictionary for…
- **`src/store/useStore.js:1660`** — addMistake (and the other raw-`set` writers: addRoleplayHistory, addCikguMessage, logConfidence, logSessionFeedback, logReflection, logMistakeReason, addPdfRecent, updateChallengeProgress) never stamps `lastMutationAt` nor pushes the blob, so AuthGuard's…
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Signed-in user, cloud sync on. (1) App loads → AuthGuard.handleSignIn pushes/refreshes the blob, so `user_state.updated_at` = T0 while `lastMutationAt` stays at the last stamped mutation (< T0). (2) User finishes a Roleplay; RoleplayScorecard.jsx:53 calls `addMistake({… category:'cohesion' …})` for each `areasToImprove` line and `addRoleplayHistory(...)` (useStore.js:742, raw set). `cohesion` is not in AUTO_PROMOTE_CATEGORIES, so promoteMistakeToCard…
  <br>**Fix:** Route the journal WRITE path through the existing single-source funnel: replace the bare `set(...)` in `addMistake` with `commitPrefMutation(state => …)` (exactly what `markMistakeReviewed` at 1822 already does), and do the same for addRoleplayHistory, addCikguMessage, logConfidence,…
- **`src/store/useStore.js:1329`** — addCards dedupes the incoming batch only against the EXISTING deck, never within itself — and SharedDeckImport rewrites every imported card's deck name — so importing a shared deck that holds one word in two decks creates two cards with an identical (m, t,…
  <br>*silent-failure · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Sender has "rumah" in two decks — a documented, supported state that syncTwoDeviceIntegration.test.js:81 itself sets up (`addCards([card('rumah','house','DeckA'), card('rumah','house','DeckB')])`). Sender taps Settings → Share Deck; `handleShare` (Settings.jsx:186) shares `cards` = the WHOLE deck, so the payload carries two `rumah` entries differing only in `t`. Recipient opens the link → SharedDeckImport.jsx:51 maps every chosen card with `t: name` (one…
  <br>**Fix:** Carry the dedupe set forward inside the loop: replace the `filter` with a reduce that does `existing.add(key)` as each card is accepted, so an internally-duplicated batch collapses to one card. Belt-and-braces: dedupe on `(m, lang)` inside `sanitiseDeck` (src/lib/sharedDeck.js), which already…
- **`src/components/interleaved/TaskAdapter.jsx:33`** — TaskAdapter (zero tests) collapses the learner's 4-way FSRS rating to Good/Again — pressing "Hard" in Smart Study lapses the card and writes a false mistake-journal entry
  <br>*test-coverage · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Learner opens Smart Study, recalls `berkongsi` with effort and presses **Hard** (FSRS's "I got it, but it was hard"). `2 >= 3` is false → `correct:false` → `reviewCardAction(..., Rating.Again)`. FSRS increments `lapses`, flips `state` to Relearning and resets the interval as if the learner had blanked completely. `useStore.js:1463-1489` then fires `addMistake({type:'vocab', source:'study', ...})` for a word the learner actually remembered — polluting the…
  <br>**Fix:** Add `src/hooks/__tests__/interleavedRatingPassthrough.test.js`: render `useInterleavedSession` with a spied `reviewCardAction`, drive `completeTask({ correct:true, rating: Rating.Hard, type:'fc' })` and `{ correct:true, rating: Rating.Easy }`, and assert `reviewCardAction` received `Rating.Hard` /…

### P2 — unverified (64)

*Degraded behaviour, or a narrow reproduction.*

- **`src/components/AdminPanel.jsx:126`** — AdminPanel revokes a user's access from a 12px unlabelled icon with no confirmation, and swallows the failure
  <br>*accessibility · loop-safe: Y · finder confidence: high*
  <br>**Fails:** The owner scrolls the invited-user list on a phone (the app's only viewport — Playwright runs 390×844) and a thumb brush lands on the ~12px trash glyph. `removeAllowedUser` fires immediately: that learner's row vanishes, their access is…
- **`src/components/MixedSession.jsx:133`** — MixedSession auto-advances 1.5 s / 4 s after every answer with no pause, extend or manual Continue — a WCAG 2.2.1 timing limit on the explanation the learner is meant to read.
  <br>*accessibility · loop-safe: N · finder confidence: high*
  <br>**Fails:** Repro: open the Dashboard "Smart Study" widget, answer a grammar item wrong. `advance(false)` (line 121) shows `<ElaborativeFeedback feedback={elaborative} />` (lines 265/341/364/389 — a multi-line why-you-were-wrong explanation plus the…
- **`src/components/study/SpeakMode.jsx:155`** — SpeakMode is the only study mode with no FeedbackLive live region, so screen-reader users get no announcement of their pronunciation result or of a recognition error.
  <br>*accessibility · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Study → Speak mode (Study.jsx:24 registers `{ id: 'speak', label: 'Speak' }`, line 165 renders `<SpeakMode …>`) → tap "Tap & Speak" and finish. The verdict — the score ring, "Excellent!"/"Good try!"/"Keep practicing!", the per-word…
- **`src/pages/Settings.jsx:391`** — Six Settings toggles — including the two accessibility settings themselves — expose only "On"/"Off" as their accessible name, so a screen-reader user cannot tell which setting a button…
  <br>*accessibility · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Repro: open /settings with VoiceOver/NVDA and tab through the Appearance/Accessibility block. The label lives in a sibling `<span className="text-sm">Dyslexic-friendly font …</span>` (line 379) that is NOT a `<label>`, and the button…
- **`vite.config.js:97`** — Web app manifest locks the installed PWA to portrait — WCAG 1.3.4 (Orientation, AA) failure with no CSS compensation anywhere
  <br>*accessibility · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A student installs the app on Android (Chrome honours manifest `orientation` for `display: 'standalone'`, set on the line above at vite.config.js:96) and opens /pdf-reader on a photographed A4 past-paper page, or the Writing analyzer with…
- **`supabase/functions/ai-proxy/index.ts:40`** — The edge function's 50/day AI cap is keyed on the `x-forwarded-for` network header instead of the authenticated uid the `verify_jwt` gate already guarantees — two learners behind one NAT…
  <br>*auth-cap · loop-safe: N · finder confidence: medium*
  <br>**Fails:** `config.toml` sets `verify_jwt = true`, so every request that reaches this code carries a validated Supabase session — the uid is available and is exactly what the cap should key on. It isn't. `checkRateLimit(getRateLimitKey(req))`…
- **`supabase/setup_all_tables.sql:194`** — translations cache is anon-readable and its primary key IS the user's raw source text — uploaded document content becomes world-readable
  <br>*authorization · loop-safe: N · finder confidence: medium*
  <br>**Fails:** A student enables Settings → 'Cache translations to cloud' and then studies from a document containing personal or identifying content (a marked-up school past paper, a teacher's handout, a personal letter used for writing practice, an…
- **`supabase/setup_all_tables.sql:18`** — user_state — the table holding every user's entire store blob — is missing from BOTH canonical schema files; its RLS exists only in a doc
  <br>*authorization · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Two ways this bites, and the first one is now imminent given the project is INACTIVE/NXDOMAIN and may need recreating. (a) Someone rebuilds the backend by running the file that says it builds everything. `user_state` does not get created,…
- **`src/pages/PDFReader.jsx:923`** — The reader's add-to-deck example lookup is dead code, so every word saved from the PDF reader gets a bilingual glue string that the Speak-mode placeholder guard cannot detect
  <br>*content-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Read a Malay PDF, tap a gloss cue on an unknown word (e.g. `abad`), tap +. The card is stored with `ex: 'abad — century'`. In Study → Speak, SpeakMode.jsx:12-13 `speakTargetFor(card)` returns that string, the UI prints `Say this sentence:…
- **`src/data/dictionaryExamples.js:227`** — The `kerja` example uses `Kerja kuat` for "hard work" — a non-idiomatic calque; standard Malay is `kerja keras`.
  <br>*content-truth · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Load the 'Work & Careers' topic pack; the `kerja` card (gloss "work/job") models `Kerja kuat` as the phrase for hard work. `kuat` is Kamus Dewan's 'strong/powerful'; the collocation Kamus Dewan attests for effortful work is `keras` — sense…
- **`src/data/grammarEng.js:51`** — `eng-art-univ` has two defensible answers — British English takes the zero article in 'attends university in Manchester', but '(none)' is marked wrong.
  <br>*content-truth · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** /grammar → Articles tab → 'My cousin attends ___ university in Manchester.' → student picks '(none)' → marked WRONG. But `university`, like `school`, `hospital` and `prison`, is an institutional noun that takes the ZERO article in British…
- **`src/data/wordFamilies.js:412`** — `wordFamilies.js` lists `kediaman` as a ke-…-an derivation of the root `tinggal`, but kediaman derives from `diam` — and the false claim is baked verbatim into the FSRS card the student…
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** This entry sits inside `'tinggal': { root: 'tinggal', … }` (line 406). `kediaman` = ke- + **diam** + -an; applying ke-…-an to *tinggal* gives `ketinggalan`, which the SAME family already lists correctly two lines later (line 414). Repro:…
- **`src/lib/reverseDictionary.js:18`** — The reversed English seed keeps 15 identity pairs (English headword === Malay answer), producing zero-information FSRS cards whose cloze hint IS the answer.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `buildEnDictionary` filters empty, slash and >2-word glosses but never filters `en === ms`, so 15 pairs survive into the generated file — e.g. `src/data/dictionaryEn.js:273`: ` "hospital": "hospital",` (also bank, digital, durian, laksa,…
- **`src/lib/routeMeta.js:24`** — The shipped "21 IGCSE formats" claim is wrong in 6 live places — `FORMATS` actually holds 27 (13 English + 14 Malay) — and a unit test pins the wrong number.
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Load `src/lib/writingFormats.js` and count: `FORMATS.length === 27` — 13 with `lang:'eng'` (eng-letter-formal … eng-diary) and 14 with `lang:'malay'` (ms-surat-rasmi … ms-autobiografi); all 27 have exemplars (`exemplars.js` has 27 keys,…
- **`src/lib/writingErrors.js:424`** — The lets-imperative rule has no subject guard, so third-person-singular "lets" ("He lets go of the rope") is flagged HIGH and "corrected" to "let's".
  <br>*content-truth · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Verified live: findIssues('He lets go of the rope and the bucket falls into the deep well.') → { id:'lets-imperative', severity:'high', type:'spelling', excerpt:'lets', suggestion:"let's", message:'"lets" needs an apostrophe when it means…
- **`src/lib/writingErrors.js:1452`** — detectDoubleNegatives allows a 3-word gap with no clause-boundary guard, so correct formal English where the two negatives sit in different clauses ("It cannot be denied that no one…
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Verified live: findIssues('It cannot be denied that no one benefits from a longer school day.') → 'double-negative' MED, excerpt "cannot be denied that no". Also 'We should not forget that hardly anyone reads the noticeboard.' → excerpt…
- **`src/pages/Dashboard.jsx:252`** — Googlebot indexes the homepage with the app-shell title "Dashboard \| IGCSE Malay Master", not the prerendered marketing title the SEO ship created — the client <Meta> overwrites it on…
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Build emits dist/index.html with <title>IGCSE Malay Master — Flashcards, AI Roleplay & Exam Revision</title> and description "IGCSE Malay revision with spaced-repetition flashcards…" (seoPrerender + ROUTE_META['/']). Googlebot fetches…
- **`supabase/functions/ai-proxy/index.ts:108`** — The Supabase edge `chat` tier still sends the old thin Socratic Cikgu prompt instead of the single-source CIKGU_SYSTEM_PROMPT, so the fallback tutor teaches with the pedagogy the project…
  <br>*content-truth · loop-safe: N · finder confidence: high*
  <br>**Fails:** When the Gemini call throws (429 from the per-uid daily cap, 5xx, or the empty-response case above) and the learner has no OpenRouter key, CikguBot Strategy 2 calls the edge function with action 'chat' (CikguBot.jsx:160-171). That path…
- **`src/components/AddKeyNudge.jsx:18`** — AddKeyNudge still gates on the OpenRouter key alone, so Gemini-only and Ollama-only BYOK users are nagged to add a key they already have
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A learner pastes ONLY a Gemini key in Settings -> #byok (a first-class, e2e-pinned configuration: tests/e2e/instruct-router.spec.js:139 "Gemini-ONLY key lights the ladder"). That key genuinely powers Writing/Roleplay/CikguBot via…
- **`src/components/RoleplayScorecard.jsx:115`** — `overallBand` is never validated or clamped, and the history row is written from a different value than the one displayed — every AI-scoring failure celebrates an estimated band while…
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** (A) Guaranteed on the free path: the scorer call fails (quota, signed-out, circuit-open) or returns prose. The scorecard shows a trophy and "5 / 6 — Estimated score (AI scoring unavailable)", but `addRoleplayHistory` has already stored…
- **`src/components/RoleplaySession.jsx:514`** — In-session vocab chips still use substring matching — the exact 'menu' inside 'menunggu' false-positive the repo fixed in the scorecard is still live in `RoleplaySession`, so the two halves…
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** In the `restoran` scenario (`keyVocab: [... 'menu' ...]`, scenarios.js:63) the student types "Kami menunggu meja dekat tingkap". Immediately under their bubble a green `✓ menu` chip appears with a dictionary icon, praising vocabulary they…
- **`src/components/study/ClozeMode.jsx:15`** — Cloze mode has no empty-input guard — one stray Check/Enter instantly rates the card Again, lapsing FSRS and writing a false mistake-journal entry
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Study → Cloze. The input is `autoFocus`. Learner taps the green 'Check' button (or presses Enter) before typing anything: `''.trim() === 'sekolah'` → false → `session.rate(Rating.Again)` fires immediately. That runs `reviewCardAction(...,…
- **`src/components/study/ClozeMode.jsx:14`** — Cloze mode lacks the `if (fb) return` re-entrancy guard every other mode has — in a Smart Session a second Enter FSRS-rates the NEXT, unseen task with the previous card's verdict
  <br>*correctness · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Smart Session (/smart-study) serves cloze tasks through TaskAdapter, whose `sessionShim.rate` (TaskAdapter.jsx:31) calls `onComplete` directly — it has NO equivalent of useStudySession's `advancingRef` double-rate latch…
- **`src/components/study/SpeakMode.jsx:59`** — Speak mode never rates a failed attempt — below 50% the FSRS review, the lapse and the session advance are all dropped
  <br>*correctness · loop-safe: N · finder confidence: high*
  <br>**Fails:** Study → Speak on a due card, mispronounce it (score 20%). The UI shows a red 20% ring and "Keep practicing!", but FSRS is never told: `stability`, `difficulty`, `lapses` and `due` are untouched, so the word the learner demonstrably cannot…
- **`src/hooks/useInterleavedSession.js:123`** — Smart Session resume rehydrates a persisted queue with no studyLang check — resuming after a language switch mixes Malay and English cards in one session
  <br>*correctness · loop-safe: N · finder confidence: medium*
  <br>**Fails:** `startSession` correctly scopes the queue with `cardsForLang(allCards, studyLang)` (line 72) — but the resume path does not. Full card objects are serialised into localStorage key 'smart-session-state' on every `completeTask` (line 254),…
- **`src/lib/guide/guideController.js:103`** — The tour never detects the user's own in-app navigation — `currentRoute` is read once, so a route change mid-tour strands the guide and makes it silently self-complete
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `currentRoute` is seeded once (lines 81-84, `getPath()`) and is thereafter mutated ONLY by the controller's own `navigate` (line 106). The one route-change listener is `popstate` (line 159), whose own comment says it "only catches genuine…
- **`src/lib/guide/pageGuides.js:78`** — The /pdf-reader page guide's ONLY anchored step points at an empty-state-exclusive button, so launching the deep dive with a document open stalls 800 ms and silently drops the step
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `data-guide="pdf-sample"` lives inside PDFReader.jsx's early-return `if (!pdfData && !loading) {` (line 1464; the button is line 1473), so it exists ONLY on a blank reader. The /pdf-reader page guide has 9 steps and exactly 1 anchor — this…
- **`src/lib/guide/popoverDecorations.js:221`** — Escape inside the progress-bar jump input destroys the whole tour instead of cancelling the input — the handler only calls preventDefault, never stopPropagation
  <br>*correctness · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** `openJumpInput` is the only jump-to-step affordance for a tour with more than DOTS_MAX=7 steps (popoverDecorations.js:144), i.e. the 24-step FULL_TOUR that Settings → App guide offers. The code's own contract is "Escape restores the…
- **`src/lib/study/quizOptions.js:36`** — A quiz distractor can be a genuinely correct alternative gloss — picking it marks a correct learner wrong and FSRS-lapses the card
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** The dedupe is exact-string only, so it cannot see that a drawn Malay distractor is itself one of the correct answer's alternatives. 20 Academic-English cards have a ';'-separated alternative that is ALSO a `dictionary.js` headword and…
- **`src/lib/translate.js:207`** — DeepL is offered as a selectable translator (and a "Compare on DeepL" link) although DeepL supports neither of the app's language pairs — picking it silently does nothing
  <br>*correctness · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** `getProviderHealth()` reports DeepL health from the env flag alone (`isDeepLAvailable()` = `VITE_DEEPL_ENABLED === 'true'`), with no pair check — but `deepl.js:7-11`'s SUPPORTED set has no 'MS', so `isDeepLPairSupported('ms','en')` and…
- **`src/pages/Listening.jsx:77`** — Switching listening passages never cancels the in-flight utterance, so the old passage's onend credits a play to the NEW passage and unlocks its questions unheard
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Student taps Play on passage A, decides they picked the wrong one, taps Back (`setPassage(null)`) and selects passage B. The cleanup that would cancel speech has `[]` deps (line 39: `return () => { … window.speechSynthesis.cancel() }`) so…
- **`src/pages/PDFReader.jsx:507`** — Sharper-read consent dialog and provenance banner name the FIRST configured vision provider, not the one that actually received the image
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** User configures BOTH an OpenRouter and a Gemini key (the exact setup the Settings copy sells: "With two or more, the app auto-switches when one hits its limit"). getConfiguredVisionProviders() returns [OpenRouter, Gemini] and reflects…
- **`src/pages/CikguBot.jsx:223`** — CikguBot pins both TTS and STT to ms-MY while the tutor's answers and the student's questions are English — voice mode auto-sends the mis-transcription with no confirmation
  <br>*correctness/locale · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Cikgu Maya's expert-tier answers are English prose about Malay grammar — src/data/cikguKnowledge.js entries read "**meN-** is the most important active verb prefix in Malay. It changes based on the first letter of the root word…" — and the…
- **`src/pages/ExamRehearsal.jsx:132`** — ExamRehearsal's LISTEN stage latches `listenPlaying` true if the utterance never completes, and the stage renders no Back, Skip or Continue control — the timed rehearsal becomes unfinishable
  <br>*correctness/UX · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** `playListening` sets listenPlaying true before `speechSynthesis.speak()`, and only `onend`/`onerror` can clear it. The listening passages are 95-127 words (~38-50 s at rate 0.95), which is well past the point where a long Chrome utterance…
- **`src/components/SharedDeckImport.jsx:37`** — The language heads-up uses `includes`, so a MIXED-language shared deck shows no warning and the off-language half of the import is invisible in Study/Dashboard forever.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `handleShare` (Settings.jsx:186) shares `cards` un-scoped by language, so any bilingual sharer produces a mixed payload. Recipient with studyLang='ms' opens a 40-word deck holding 25 ms + 15 en cards: deckLangs = ['ms','en'],…
- **`src/lib/export.js:19`** — Settings → Export Cards emits fabricated SM-2 columns, drops every FSRS field, and inverts the Malay/English headers for all English cards
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A student with six months of FSRS history opens Settings → Export Cards → "Export JSON (900 cards)". Every one of the 900 objects reads `ease: 2.5, interval: 1, box: 0, lastReview: null, nextReview: null` — identical fabricated constants —…
- **`src/lib/translationCache.js:68`** — The `writeCache` guard against caching `source:'error'` glosses is bypassed by the cloud read-through, and `readCache` has no matching read-side guard, so poisoned entries still serve a…
  <br>*data-correctness · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** The 2026-07-06 fix added `if (!value \|\| value.source === 'error') return` to `writeCache` (translationCache.js:93) and its commit claims 'one structural guard covering all callers'. But `writeLocalRecord` has a SECOND caller — the cloud…
- **`src/pages/CikguBot.jsx:112`** — CikguBot feeds the AI tutor the five OLDEST unreviewed mistakes while labelling them "recent mistakes" in the prompt.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `addMistake` appends (`const nextMistakes = [...state.mistakes, added]`, useStore.js:1719), so `mistakes` is oldest-first, and nothing re-sorts it on hydrate/import. `slice(0, 5)` therefore returns the five OLDEST unreviewed mistakes,…
- **`src/pages/Import.jsx:190`** — In English study mode (`studyLang === 'en'`), Import attaches a Malay example sentence from the Malay-only EXAMPLES map to English (`lang:'en'`) cards.
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** With `studyLang = 'en'`, `processText` resolves words against the English seed (`activeDict()` → `loadEnDictionary()`, Import.jsx:91/125), so `w.word` is an ENGLISH headword, and `addSelected` still stamps `lang: plan.lang` = 'en' (line…
- **`src/store/useStore.js:1418`** — All four seed decks write a part-of-speech tag into `card.p`, which is the app's legacy progress field and the only thing export.js reads it as — so the 'Progress' column of every export is…
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `card.p` has exactly one consumer in the whole app, src/lib/export.js, and it is a progress code there: line 25 emits it under the CSV header 'Progress' (headers = ['Malay','English','Example','Topic','Progress',…]), line 47 emits…
- **`src/store/useStore.js:1890`** — `getStudyPlan()` is the one DailyPlan input that is never language-scoped, so a bilingual learner's "Vocabulary mastery %", weak-card count and focus topic are computed across BOTH decks.
  <br>*data-correctness · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Learner has `studyLang:'ms'`, an exam date set, 50 new Malay cards (0 mature) and 570 English cards seeded by `seedAcademicEnglish`/`seedAcademicEnglish2`/`seedAcademicEnglish3` that have matured (`state === 2 && stability >= 21`).…
- **`src/store/useStore.js:1587`** — `grammarStats` is persisted, rendered on the Dashboard, and is the ONE store data field missing from `makeBackupDefaults()`/BACKUP_KEYS — Settings Export → Import on a new device silently…
  <br>*data-correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** User has 300 grammar drills logged (Dashboard.jsx:219-220 `Object.values(grammarStats).reduce(...)` and the 4-tile accuracy grid at Dashboard.jsx:625 `const s = grammarStats[g.key] \|\| { correct: 0, total: 0 }`). They migrate phones:…
- **`src/store/useStore.js:1251`** — `restoreFromBackup` has zero callers, so the pre-overwrite snapshot `backupState()` writes before EVERY cloud restore is unrecoverable — the documented undo for a wrong cloud overwrite does…
  <br>*dead-code · loop-safe: N · finder confidence: high*
  <br>**Fails:** AuthGuard.jsx:106 calls `backupState()` on every `restoreFromCloud()`, and useStore.js:1242-1243 documents it as 'Snapshot the current store to localStorage before any cloud overwrite. Restored with restoreFromBackup() if the user wants to…
- **`src/lib/deckGenerator.js:214`** — Deck/scenario generators re-call the SAME just-rate-limited user OpenRouter key immediately after the router cools it down
  <br>*efficiency · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A learner whose only BYOK key is OpenRouter taps "Make me a deck" on /for-you. generateDeckText hits `hasInstructProvider()` -> callInstruct -> openrouterAdapter -> callOpenRouter, which already loops up to 5 discovered free models…
- **`src/lib/translate.js:158`** — translateBatch does the cloud cache read one key at a time, serially — a 100-word chunk is up to 100 sequential Supabase round-trips before the first translation starts
  <br>*efficiency · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** This `await` sits inside the per-item `for` loop (lines 152-165). With cloud cache on, `readCache` falls through to `readCloudTranslation(key)` (translationCache.js:65), which is a full Supabase HTTP round-trip per key…
- **`src/components/ErrorBoundary.jsx:28`** — ErrorBoundary's primary "Try Again" button is a guaranteed no-op for the chunk-load failures lazyWithRetry deliberately routes into it
  <br>*error-recovery · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** `lazyWithRetry` is explicit that a permanently-failing chunk ends up here: 'if it already reloaded once for this route and the chunk STILL won't load, we rethrow and let the ErrorBoundary show' (lazyWithRetry.js:14-16), implemented at…
- **`src/contexts/TheaterModeProvider.jsx:39`** — `TheaterModeProvider` keys its inner component on `location.pathname`, so the entire `<Layout>` shell (header, bottom nav, SearchModal, SelectionToCard, GuideHud) is unmounted and rebuilt…
  <br>*perf · loop-safe: N · finder confidence: medium*
  <br>**Fails:** `App.jsx:105-112` nests `<TheaterModeProvider><Layout>…</Layout></TheaterModeProvider>`, and `children` is part of `TheaterModeInner`'s rendered output, so changing its `key` unmounts the whole subtree — Layout included — on every route…
- **`src/hooks/useSavedWordHighlights.js:41`** — `applyHighlights` rebuilds the full saved-word alternation RegExp once per text node, so the global saved-word highlighter is O(nodes × words log words) and blocks paint on every DOM…
  <br>*perf · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `findSavedWordMatches` calls `buildRegex(words)` on every invocation (`src/lib/savedWordHighlight.js:57` — `const re = buildRegex(words)`), and `buildRegex` does `new Set(...)` + `.sort((a,b)=>b.length-a.length)` + `.map(escapeRegExp)` +…
- **`src/components/SharedDeckImport.jsx:54`** — The import success message reports the number of words TICKED, not the number actually added — `addCards` silently drops (m,t,lang) duplicates, so a re-imported link claims "Added 12 words"…
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Open a `?deck=` share link with 12 words, keep the default deck name, click 'Add 12 words' → 12 cards land. Open the SAME link again (the obvious user behaviour: the sender re-pastes it, or the recipient imports the `.deck.json` they…
- **`src/pages/Comprehension.jsx:206`** — Comprehension never normalises AI-generated question ids — a string or missing `id` silently reports 0/5 after a perfect run
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A student taps "Get fresh AI questions" (visible whenever `isGeminiAvailable()`); a free model returns the documented shape but with `"id": "1"` instead of `1` — routine for the free tiers this app deliberately depends on. The student…
- **`src/pages/Import.jsx:121`** — Import's Word-by-Word view labels failed translations as "● Google Translate", presenting each word as its own English gloss.
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Import → paste a Malay paragraph → "Word-by-Word Translation" while offline or while gtx is 429ing. `translateWord` resolves (it never rejects on provider failure — it catches internally and returns `{ text: <input>, source:'error' }` at…
- **`src/pages/MistakeJournal.jsx:249`** — The manual "+ Card" mistake-promotion button is gated on `m.language === 'ms'`, so an English learner can never promote any mistake even though the v34 store gate allows it.
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** v34 widened the store's promotion gate to English (`canAutoPromoteMistake` returns true for `('en','vocab')`, useStore.js:92-95) and `promoteMistakeToCard` builds a correctly-tagged `lang:'en'` card (useStore.js:1788,1806). The two UI…
- **`src/pages/PDFReader.jsx:657`** — Scanned-PDF OCR silently drops every page past the 10th — the cap is announced only to the browser console.
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Reader → open a 24-page scanned past paper → accept the "read this scan" offer. `rasterisePdfPages(offer.doc, { maxPages: 10, … })` (src/lib/ocr.js:103-104, `const total = Math.min(doc.numPages, maxPages)`) rasterises pages 1-10 only, and…
- **`src/pages/Settings.jsx:188`** — "Share My Deck" has an unhandled clipboard promise and no fallback — in any non-secure context the button does nothing at all, with no toast and no link.
  <br>*silent-failure · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** This is the only `navigator.clipboard` call in the whole app (grepped src/) — there is no shared helper, no `.catch`, and no manual fallback. Open the app over a non-secure origin (a LAN IP such as http://192.168.1.20:5173 for phone…
- **`src/pages/Settings.jsx:817`** — When a seed's lazy data import fails, the store's catch returns 0 and Settings tells the user "You already have these — nothing new added." — a false success message for a deck that was not…
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** seedAcademicEnglish3 (useStore.js:1392-1404) wraps its `await import('../data/academicEn3')` in `try { … } catch { return 0; }`, and `0` is also the legitimate already-seeded result — the two are indistinguishable to the caller. Repro:…
- **`src/pages/Settings.jsx:817`** — Settings' academic-English seed reports a chunk-load failure as "You already have these — nothing new added."
  <br>*silent-failure · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Settings (studying English) → tap "Add Sublist 1 (60 words)". `seedAcademicEnglish` in src/store/useStore.js:1357-1369 wraps `await import('../data/academicEn')` in `try { … } catch { return 0 }`. A stale-chunk 404 after a deploy (the…
- **`src/store/useStore.js:1063`** — The sign-in tombstone filter drops a card the user re-added, with no recency check — a word re-saved while signed out is silently deleted from the deck at the next sign-in.
  <br>*silent-failure · loop-safe: N · finder confidence: medium*
  <br>**Fails:** (1) User deletes the card 'abad' in deck 'Reading' on device A → `deleteCloudCard` writes `deleted:true` for card_key `abad::Reading`. (2) Later the user signs OUT (account menu) and keeps studying as a guest — `clearAuthUser` sets…
- **`src/store/useStore.js:1251`** — `restoreFromBackup` has zero call sites, so the pre-cloud-overwrite snapshot written on every sign-in can never be restored — the documented undo path is unreachable.
  <br>*silent-failure · loop-safe: N · finder confidence: high*
  <br>**Fails:** Sign in on device B where the cloud blob is newer (or has materially more cards). `AuthGuard.jsx:105` runs `backupState()` inside `restoreFromCloud()`, which `JSON.stringify(get())`s the WHOLE store into localStorage key…
- **`supabase/functions/ai-proxy/index.ts:533`** — The non-streaming path throws away the `<think>`/markdown-fence-stripped text on the JSON-parse fallback and returns the RAW `responseText` — defeating the defensive strip on exactly the…
  <br>*silent-failure · loop-safe: N · finder confidence: medium*
  <br>**Fails:** Lines 522-526 strip a known DeepSeek defect ('DeepSeek R1 occasionally leaks <think>…</think> reasoning even with reasoning.exclude=true. Strip defensively.') plus stray ```json fences, producing `stripped`. Line 530 tries…
- **`src/data/__tests__/dictionary.test.js:19`** — Nothing verifies that `dictionaryEn.js` is a faithful regeneration of `dictionary.js` — only 5 hand-picked pairs are pinned, so a forgotten `npm run build:en-dict` ships silently green.
  <br>*test-coverage · loop-safe: Y · finder confidence: high*
  <br>**Fails:** CLAUDE.md states the derived files "must be regenerated in lock-step when dictionary.js changes", but the only checks are five spot-check pairs (`academic degree`, `noodles`, `to limit`, `to cook`, `pencil`) plus…
- **`src/hooks/useWritingEvaluator.js:76`** — useWritingEvaluator (zero tests) has no in-flight generation guard — switching the Writing language mid-grade writes the abandoned essay's band into persisted writing history under the…
  <br>*test-coverage · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Learner analyses an English essay; the Gemini grade takes ~3 s. Impatient, they tap the Malay toggle. `reset()` blanks the form. The stale promise then resolves and (a) calls `logWritingFeedback` with `lang:'eng'` and the abandoned essay's…
- **`src/lib/translate/providers/instructTranslate.js:113`** — instructTranslate (zero tests) validates a BYOK batch translation by COUNT only, never by the emitted index — a renumbered reply misaligns every gloss and is then cached permanently as a…
  <br>*test-coverage · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** A free OpenRouter instruct model is asked for 12 words and replies with a list that merges items 3+4 onto one line and appends a numbered trailing note (`13. Note: informal register`). `parsed.length === 12 === texts.length`, so the count…
- **`src/lib/useSelectionMode.js:42`** — useSelectionMode has no test on its impure half — a two-finger touch in the DEFAULT reflow reader commits a selection spanning both fingers, because pointerId is stored but never checked
  <br>*test-coverage · loop-safe: Y · finder confidence: high*
  <br>**Fails:** On a phone (the app's primary device) in the reflow reader, the learner puts two fingers on the page to pinch-zoom or to steady a two-thumb scroll. Finger 1 lands on token 10 → `startRef={i:10}`. Finger 2 lands on token 40 → `startRef` is…
- **`src/store/useStore.js:1587`** — grammarStats is persisted user progress but is absent from makeBackupDefaults/BACKUP_KEYS, so Settings → Export backup silently omits it and it never migrates to a new device; no test…
  <br>*test-coverage · loop-safe: Y · finder confidence: high*
  <br>**Fails:** 1. Student does 200 grammar drills; `updateGrammarStats` accumulates `grammarStats.imbuhan = {correct:150,total:200}`. Dashboard.jsx:219-220 renders the grammar-accuracy figure from it, and Grammar.jsx:369 renders per-drill-type stats. 2.…

### P3 — unverified (13)

*Hygiene. Only worth a cycle when something adjacent is already open.*

- **`src/config/supabase.js:68`** — The 'admin' role tier is unreachable — inviting someone as Admin grants them nothing, but the owner UI says otherwise
  <br>*authorization · loop-safe: Y · finder confidence: high*
  <br>**Fails:** The owner opens the Admin Panel, invites a co-teacher as 'Admin', sees the success message 'Invited x@y.com as admin' (AdminPanel.jsx:39) and the row rendered with a purple 'admin' badge (AdminPanel.jsx:119-123). The invitee signs in and…
- **`src/data/academicEn3.js:42`** — The academic-English seed glosses 'emphasis' partly as 'emfasis', which DBP does not list as a Malay word.
  <br>*content-truth · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** An IGCSE 0510 learner seeds Sublist 3 (Settings → 'Add Sublist 3') and studies the card 'emphasis'. The reverse/Produce prompt shows the L1 gloss 'penekanan; emfasis', presenting 'emfasis' as an equally valid Malay equivalent. PRPM…
- **`src/data/scenarios.js:69`** — The `restoran` roleplay model answer switches persona mid-scenario — the speaker orders 'untuk anak-anak' (for my children) then calls one of the same diners 'Adik saya' (my younger…
  <br>*content-truth · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Student opens /roleplay → 'Di Restoran' → reads the band-6 model answers they are told to emulate. Turn 1 (line 67) establishes the party as 'Kami berempat — dua orang dewasa dan dua kanak-kanak', turn 2 (line 68) orders 'susu coklat untuk…
- **`src/components/SelectionToCard.jsx:166`** — Select-to-card's duplicate check ignores `lang`, so an English learner is told a word is "Already in your flashcards" when their English deck has no such card
  <br>*correctness · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Learner on the English (0510) track (studyLang='en') with the Malay starter deck loaded selects "hospital" while reading an English passage. cardSidesFor returns `{ m:'hospital', lang:'en' }`; the lang-blind check finds the Malay…
- **`src/core/agent/FSRSEngine.ts:15`** — `src/core/agent/FSRSEngine.ts` is a dead, divergent second "FSRS" scheduler re-exported through the barrel Grammar.jsx imports
  <br>*dead-code · loop-safe: Y · finder confidence: high*
  <br>**Fails:** No runtime failure — this is a maintenance trap. Root CLAUDE.md states "The app uses FSRS-6 (via the ts-fsrs library) in src/lib/fsrs.js — not SM-2 … fsrs.js is the active algorithm." A future agent (or the build loop) asked to touch…
- **`src/data/systemPrompts.js:1`** — `src/data/systemPrompts.js` (243 lines, 5 prompt constants + 5 builders) has zero production importers — the live prompts are the Deno edge function's `SYSTEM_PROMPTS` Map.
  <br>*dead-code · loop-safe: Y · finder confidence: high*
  <br>**Fails:** A repo-wide scan of every .js/.jsx/.mjs/.ts/.html/.json under src/, tests/, scripts/, api/ plus vite.config.js and index.html for the basename `systemPrompts` returns exactly ONE importer: `src/lib/__tests__/examPaperLabels.test.js:33`…
- **`src/lib/guide/guideController.js:609`** — The page-guide arrow tracker re-renders a full-viewport SVG on every scroll event — unthrottled capture-phase listener plus a fresh state object each time
  <br>*efficiency · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `onMove = () => emitPointer()` runs on every scroll event in the capture phase (so every inner scroller counts) with no rAF throttle and no `{passive:true}`. Each call does two `getBoundingClientRect()` reads and then `setGuideState({…
- **`src/lib/study/interleavedQueue.js:101`** — Smart Session scopes its cards by language but feeds the queue builder a cross-language mistake list and hypercorrection list
  <br>*lang-scoping · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Bilingual learner. They miss the English card `hospital` in a Study session → a mistake record `{ type:'vocab', language:'en', word:'hospital' }` and a `confidenceLog` entry with no language. They then switch to Malay and start a Smart…
- **`src/components/ErrorBoundary.jsx:14`** — ErrorBoundary swallows every production crash to console.error while the app's own telemetry pipe is wired up for trivial UI events
  <br>*observability · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Every render crash anywhere in the routed subtree (App.jsx:107 wraps all 21 routes) terminates in this line and nowhere else. `src/lib/telemetry.js` exports `trackEvent` (line 42) and it is already imported and fired for low-stakes events…
- **`vite.config.js:115`** — The service worker precaches all 20 per-route index.html files the SEO plugin emits, which navigateFallback guarantees will never be served.
  <br>*perf · loop-safe: Y · finder confidence: medium*
  <br>**Fails:** Since 2026-07-15 the build writes dist/study/index.html, dist/writing/index.html … (20 files, each a ~4 KB copy of the shell — index.html is 3985 bytes before Vite injects the asset tags). globPatterns includes `html` and globIgnores (line…
- **`src/App.jsx:80`** — Catch-all route pushes instead of replacing, trapping the Back button on any unknown URL, and gives no 404 explanation
  <br>*routing · loop-safe: Y · finder confidence: high*
  <br>**Fails:** react-router v7's `<Navigate>` defaults to `replace={false}` (package.json:43 pins react-router-dom 7.17.0), so an unknown path pushes a new history entry instead of replacing the bad one. Repro: a student on /study follows a stale…
- **`scripts/verify-seo.mjs:2`** — scripts/verify-seo.mjs is orphaned — the build-only seoPrerender plugin is the one part of the SEO subsystem with no automated verification anywhere in the gate.
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** `grep -c verify-seo package.json .githooks/pre-commit .github/workflows/ci.yml` returns 0/0/0 — the script exists only in docs (CLAUDE.md line 100 claims it 'verifies the built output'). The unit tests only exercise the pure functions…
- **`src/lib/tutorContract.js:23`** — enforceLength rebuilds truncated text with `split(/\s+/).join(' ')`, destroying every newline — a truncated tutor reply loses all markdown structure (bullets, tables, ✓/✗ lines) when the…
  <br>*silent-failure · loop-safe: Y · finder confidence: high*
  <br>**Fails:** Latent today (TUTOR_CONTRACT_ENABLED is false), but the module ships to be flipped on after eval. Once on: a 250-word Cikgu reply containing a markdown table and bullet list is split on all whitespace and rejoined with single spaces, so…


---

## ❌ REFUTED / severity-corrected

Each of these was proposed (by a finder, by a tool, or by me) and does **not** survive contact with the
evidence. Recorded so a later session does not re-open them.

**R1 · "Production Supabase project is INACTIVE and its hostname is NXDOMAIN — `src/config/supabaseConfig.js:7`"
— REFUTED AS ANCHORED, but the underlying fact is real and was re-filed as C1.**
`supabaseConfig.js:7` is `url: import.meta.env.VITE_SUPABASE_URL || ''` — an env-var read containing **no
hostname at all**, so the finder's quoted evidence cannot be where it looked. The project ref appears only
in *historical docs* (`docs/sessions/…`, `docs/archive/…`, two 2026-05-25 specs) and in the untracked,
gitignored `.env.local`. The correct anchor is the **build-time env var**, which is why I verified it
against the deployed bundle instead. *This is the single clearest argument for the verification step: the
finding was directionally right and its stated evidence was wrong.*

**R2 · "npm audit: react-router HIGH — open redirect via backslash in `<Link>`/`useNavigate`
(GHSA-wrjc-x8rr-h8h6)" — REAL ADVISORY, NOT REACHABLE HERE. P3, not P1.**
`react-router-dom` is at 7.17.0 (the 2026-06-12 review's upgrade *was* done); the advisory range is
`6.0.0 – 8.2.0`, fixed in 7.18.2. But the open redirect needs a **user-controlled navigation target**, and
there is none: every `navigate()` call site takes an internal constant (`item.path`, `task.route`,
`shelf.cta.route`, `plan.to`, `fb.nextHref`), and the only URL params read are `?deck=` (a base64 payload,
never a nav target) and `?drill=1` (compared to a literal). The DoS advisory needs server-side route
matching, which a static SPA does not do. **Still bump to 7.18.2** — one line, non-breaking — but as
hygiene, not as a live vulnerability.

**R3 · "npm audit: `tar` CRITICAL + `sharp` HIGH in production dependencies" — NOT USER-FACING.**
`npm ls tar` → `@huggingface/transformers@3.8.1 → onnxruntime-node@1.21.0 → tar@7.5.16`.
`onnxruntime-node` is the **Node** binding; the browser build uses `transformers.web`. Neither `tar` nor
`sharp` (a devDependency, deduped) ever reaches a user. `@huggingface/transformers` itself is HIGH with
`fixAvailable: false` and **must stay pinned to v3** (v4's nightly ORT-web deadlocks `pipeline()`,
CLAUDE.md). No action beyond awareness.

**R4 · "The eager entry chunk is 527.19 KB raw / 167.91 KB gz" — WRONG UNITS.**
527,122 is the chunk's size in **bytes**; in KiB that is 514.8, which matches the other finder's figure and
my clean-build measurement exactly. Superseded by C8.

**R5 · "`api/translate.js` is an unauthenticated proxy on the owner's keys" (2026-06-12 P2-S1) — GENUINELY
CLEARED; do not re-open.** `api/translate.js:16-23` now calls `verifySession(req)` then
`enforceDailyCap(session.adminClient, session.user, 'translate', DAILY_CAP)` before touching a key. Read in
full during this review. A trust anchor: the prior queue really is closed.

**R6 · "A `STORE_VERSION` bump shipped without a migration" — REFUTED.** Verified every case from
`if (version < 2)` to `if (version < 35)` is present and sequential. See the note under C9.

---

## Recommended fix order

Content truth and data safety first; everything else waits.

1. **C1 — restore Supabase (or point prod at a live project).** Nothing else in this list matters if
   sign-in and cloud backup are dead. **Needs Kheshav** (infrastructure/billing decision). Ship the
   loud-failure hardening as a separate loop-safe commit either way.
2. **C2 + C3 — get e2e CI green** (one commit each). Until the net is back up, every fix below ships
   unverified. Both are bounded and loop-safe.
3. **C6 — Grammar drill leaking the raw prompt + the answer** (loop-safe; a student-visible content defect
   on a default path).
4. **C4 — shared-deck `ex`** (loop-safe) — and while in there, verify the 🟡 sibling claim that
   `seedEnglishStarter` stamps the same pseudo-sentence on 682 cards, which would be far larger.
5. **C5 — starter-deck classifiers** (loop-safe, content; web-verify each sentence).
6. **C7 — share truncation honesty**, then **C8 — entry-chunk budget**, then **C9 — CLAUDE.md drift**.
7. **Then, and only then, start verifying the 🟡 PLAUSIBLE queue** — highest-severity first, using the
   3-lens method above. Do not fix any of it blind.

## Coverage appendix

**Swept by a scope owner:** SEO prerender · Tutor Output Contract · shared deck · seeded decks ·
`dictionaryExamples.js` · `dictionary.js` + derived · both writing graders · speaking grader ·
pronunciation · store + migrations + FSRS · cloud sync + auth merge · silent failures · accessibility ·
perf/bundle · test coverage (twice, two framings) · dead code · grammar/scenario/comprehension/listening
content · tutor KB + exemplars + word families · Supabase edge function · `api/` · BYOK instruct router ·
translation layer + providers · Web Speech layer · guide engine · study modes · app shell/PWA/error
boundary · roleplay client · auth/RLS (queried live) · the session/reader seam.

**Named by the completeness critic as still thin — carry into the next review:**
- **Authorization** got zero findings in waves 1–2 and had no scope owner until wave 3; the wave-3 pass
  produced 5 🟡 RLS findings that are all unverified. The critic separately confirmed the *injection*
  surface is clean (one `dangerouslySetInnerHTML` hit repo-wide, and it is a comment; zero `eval`/`new
  Function`; every `target="_blank"` carries `noopener`).
- **Perf** — nothing was measured at runtime (no profiling, no render counts, no heap check on the
  682-card seed). Call it *unverified*, not clean.
- **Not opened by anyone:** `src/pages/ForYou.jsx` + the personalization libs, the 7 Dashboard widgets, the
  5 interleaved-session components, the 9 writing panels, the mistake-journal UI and re-drill logic, and
  `scripts/auto-sync.js` (the postinstall hook that auto-pushes to main — i.e. auto-deploys to prod).

---

## MODEL-TEST FOOTER

Recorded so an Opus 5 vs Fable 5 comparison is answerable rather than a vibe. **Re-run this prompt on
Fable 5 @ effort `high` and fill the second column.**

| Metric | Opus 5 (this run) | Fable 5 (TBD) |
|---|---|---|
| Model / effort | **Opus 5 (1M context) @ `xhigh`**, ultracode on, `/fast` OFF | Fable 5 @ `high` |
| Agents spawned | **203 attempted** — 42 completed, **161 killed by a weekly usage limit** | |
| Agent errors (excl. usage limit) | **0** | |
| Wall clock | **≈1 h 50 min of active work**, split across two sittings by a ~13.5 h usage-limit reset | |
| Subagent tokens | **5,895,981** (2,720,607 + 1,226,368 + 1,949,006) | |
| Subagent tool calls | 1,678 | |
| Proposed findings | **140** | |
| CONFIRMED | **9** | |
| REFUTED / corrected | **6** | |
| Confirmed : refuted (verified subset only) | **4 : 0** across 13 lens votes, with **2 severity corrections** (P1→P2, P0→P1) | |
| Restatements of the two prior reviews | **0** | |
| Findings the lead session **originated** (no agent proposed them) | **1** (C3) | |
| Findings an agent seeded but only the lead session **grounded or corrected** | **4** — C1 (re-anchored from a wrong line to the deployed bundle), C2 (extended from 3 double-`<h1>`s to the 16-day CI outage), C8 (measured), C9 (each number checked) | |
| Reconciliation of the 140 | 8 → CONFIRMED · 1 → REFUTED (R4) · 131 → PLAUSIBLE; +C3 lead-originated = 9 CONFIRMED | |

**Honest read of this run.** The finder fan-out was the strong part: 140 proposed findings, zero
restatements of two cleared queues, and the completeness critic correctly predicted that unopened areas
still held defects (~1.7 per area — wave 3 then produced 22 more, including the roleplay-scorecard and
auth clusters). The weak part was **resource planning**: verification was scheduled last and at the widest
fan-out (144 agents), so when the limit hit it took out the entire quality gate rather than a slice of it.
A better shape is to interleave verification with discovery — verify each wave's P0/P1 before starting the
next — so a hard stop degrades coverage gracefully instead of leaving 125 findings unverified. That is a
scheduling lesson, not a model lesson, and it applies identically to a Fable 5 re-run.

**The 3 findings I rate highest-value:**
1. **C1 — prod auth + cloud sync are dead.** Found only because I read the *deployed bundle* rather than
   the repo, and it is invisible from the source: `enabled` checks that the env vars are *present*, never
   that the host *answers*. Nothing in the test suite, the gate, or CI can see it.
2. **The roleplay-scorecard cluster** (🟡, `RoleplayScorecard.jsx:41` and `:70`): every scored roleplay
   auto-promotes an FSRS card whose gloss **is** its own prompt (`card.e === card.m` by construction), and
   each turn's grammar feedback is attached to the *next* answer. The repo's own test already asserts the
   card is created — it just never checked `.e`. A passing test that pins half a behaviour is worse than
   no test, and this is a clean example. **Verify before fixing.**
3. **C2/C3 — 16 days of red CI.** Not the most severe defect, but the most *expensive* one: it is the
   reason a review was needed to find the others. GOAL.md item #8 already prescribes the rule that would
   have caught both; the rule exists and was not followed.
