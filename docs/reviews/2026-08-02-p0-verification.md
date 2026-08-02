# P0 verification pass — 2026-08-02

Verifies the **11 unverified 🟡 P0 findings** in `docs/reviews/2026-08-01-full-codebase-review.md`, whose
adversarial pass was killed by a usage limit. Method is that document's own: **three independent lenses per
finding — mechanical correctness · reachability by a real user · prior-art & honest severity — each agent
prompted to REFUTE, killed on majority refute.**

**33/33 lens agents completed, 0 errors** (2.99M subagent tokens, 1133 tool calls, ~29 min wall clock).
Every agent was read-only on the repo; content-truth claims were required to quote PRPM / Kamus Dewan /
DBP or an official `.gov.my` source rather than assert from memory. The two externally-grounded verdicts
(`justeru`, `991`) were then **re-checked by the lead session directly against the source** — see below.

## Headline

| | |
|---|---|
| Confirmed as real defects | **10 / 11** |
| Refuted | **1** (P0-2 `justeru`) |
| **Still P0 after honest severity review** | **0** |
| Re-graded to P1 | 8 · to P2 | 1 · to P3/refuted | 2 |
| Proposed fixes that are **wrong or incomplete as written** | **9 / 11** |

Two conclusions, both load-bearing:

1. **The review's P0 tier did not survive.** Not one finding is a P0 by the review's own definition
   ("a student is taught something wrong, **or** user data is corrupted/lost"). The real queue is
   8×P1 + 1×P2. Nothing here is an emergency; all of it is worth fixing.
2. **"Do not fix these blind" was the right instruction, and the danger was in the *fixes*, not the
   findings.** Nine of eleven proposed fixes would have shipped a new defect, broken a green test, or
   been silently inert. Details in each row.

---

## ❌ REFUTED — do not touch

### P0-2 · `src/data/dictionary.js:727` — `'justeru': 'therefore'` — **2/3 refute. The gloss is CORRECT.**

The finder cited **Kamus Dewan Edisi Keempat (2016)**, which lists only *kebetulan/tepat* and
*malahan/bahkan*, plus a 2013 DBP Khidmat Nasihat answer prohibiting the causal sense — and treated
*absence in a 2016 edition* as *prohibition*. Two lenses found the newer, higher-authority source.
**Re-verified by the lead session directly** (`curl`, tags stripped):

- DBP's own magazine, *Dewan Bahasa* / JendelaDBP, "Maksud dan Fungsi Kata 'Justeru'" (26 Ogos 2021),
  citing **Kamus Dewan Perdana (2020: 925)** sense iii, verbatim:
  > *"Penanda wacana atau kata pangkal ayat yang membawa maksud "jadi" atau "oleh itu"."*
- **PRPM's own Tesaurus**, verbatim:
  > *"justeru ( kata tugas ) 1. Bersinonim dengan senyampang : **oleh itu**, terlanjurkan, kebetulan…"*

`oleh itu` = *therefore*. DBP's current flagship dictionary **codifies** this sense.

**The proposed fix was actively harmful** and would have:
(a) deleted the DBP-codified connector sense — the one an IGCSE candidate needs for essay cohesion;
(b) contradicted the app's own `src/data/writing.js:8`, which already lists `justeru` as a cohesion marker;
(c) created a **Produce-mode gloss collision** with the existing `'malah': 'in fact'` (`dictionary.js:729`)
— the exact objection that killed an earlier `meskipun` proposal.

Also note: `RESUME_HERE.md` records this was **already investigated and cleared during Batch 5 (2026-07-18)**.
The finder re-opened a settled question. Leave `dictionary.js:727` and `dictionaryExamples.js:495` alone.

---

## ✅ CONFIRMED — verified queue, severity-ordered

Every row: 3/3 or 2/3 lenses confirm, mechanism re-derived **and executed** against the live modules.
The **⚠️ fix correction** is what the review got wrong — read it before writing any code.

### P1

#### V1 · `src/data/listeningPassages.js:125,130` — the app teaches a defunct emergency number and marks the real one wrong
3/3 confirm. Passage `berita-cuaca` says *"talian kecemasan **991**"*; Q4 keys `correctIndex: 1` (`B) 991`)
and scores `A) 999` — the real number — as **wrong**, logging a mistake and printing `Correct: B) 991`.
**Verified by the lead session** against APM's own portal (`civildefence.gov.my/999-emergency-services/`,
the agency that *ran* 991), verbatim:
> *"From 1 October 2007 the 999 emergency line was introduced … by combining all emergency numbers namely
> **991, 994 and 999** into one emergency number"*

991 has been defunct for ~19 years. A prior repo clearance called 991 "the genuine APM flood line" — that
clearance was **wrong**; this supersedes it.
**⚠️ Fix correction:** the review's fix misses the third edit and adds a wrong one. Correct minimal fix is
**three** string changes, all in this file: line 125 `991`→`999`; line 130 `correctIndex: 1`→`0`; **and line
130's `explanation: '"talian kecemasan 991".'`→`999`** (rendered verbatim at `Listening.jsx:166`). There is
**no** duplicate distractor to replace — drop that clause. `ExamRehearsal.jsx:264` reads `correctIndex`
dynamically, so it is fixed by the same edit. No test imports this file, so add one.

#### V2 · `src/lib/writingErrorsMalay.js:177-182,200-201` — three Kamus Dewan headwords flagged HIGH as imbuhan errors
3/3 confirm (one lens graded it P0). `mempertingkatkan`, `memberitahukan`, `menyinar` are all live KD4
headwords; the grader flags all three at severity HIGH. Sharpest case: KD4's own illustrative example under
`menyinar` is *"matahari ~ menerangi alam"* — **the app flags the dictionary's own sentence as an error.**
**⚠️ Fix correction:** applying the fix literally **turns the pre-commit gate red** — two currently-green
assertions in `src/lib/__tests__/writingErrorsMalay*.test.js` pin the exact behaviour being deleted. They
must be updated in the same commit. Either deletion or the `msg: null` disable (the `mengkaji` precedent at
`:119-120`, short-circuited by `if (!r.msg) continue` at `:211`) works.

#### V3 · `src/lib/writingErrors.js:1029` — the English grader flags the correct "I was" and tells students to write "I were"
3/3 confirm, executed on a 103-word correct narrative → 6 HIGH findings, five of them `"I was"`.
Free, always-on tier — no AI key, no flag; 2 taps for a 0510 learner.
**⚠️ Fix correction:** the split is right (`/\b(I|we|they|you)\s+(doesn't|does not|has not|hasn't)\b/gi`
plus a `was`-only branch restricted to `/\b(we|they|you)\s+was\b/gi`) and verified against 14 probes with
zero false-negatives — but all three lenses call it **incomplete**; check the sibling `he/she/it` rule in
the same pass.

#### V4 · `src/lib/writingErrors.js:1101` — every correct inverted question ("Did he go…") flagged HIGH with the ungrammatical fix "he goes"
3/3 confirm, all four named sentences reproduce exactly.
**⚠️ Fix correction:** the proposed token list is **both over-broad and holed**. The wh-words
(`why/how/when/where/what`) are unnecessary — in "Why does he study" the immediately-preceding word is
`does`, which the `([A-Za-z']+)\s*$` lookback already reads. And it still **misses** `won't`, `can't`,
`couldn't`, `has`. Ship only the auxiliary/modal core plus the negated contractions.

#### V5 · `src/components/RoleplayScorecard.jsx:41` — every scorecard silently mints a self-gloss FSRS card (`card.e === card.m`)
3/3 confirm; the real component was mounted and produced
`{m:'pencuci mulut', e:'pencuci mulut', t:'Mistakes'}` on mount **with no user action**.
**⚠️ Fix correction:** the proposed fix **breaks a green test** — `roleplayScorecardMistakeLang.test.js`
asserts a card exists for `'reference number'`, which is in no dictionary, so `correct: gloss || ''` makes
the store gate bail and both assertions go red. That test must be updated in the same change.

#### V6 · `src/components/RoleplayScorecard.jsx:70` — each turn's grammar feedback is attached to the NEXT answer; the final turn's note is dropped
3/3 confirm, both loops executed on the real `[E0,S1,E2,S3,…]` shape.
✅ **The proposed fix is correct and complete as written** — one of only two that are.

#### V7 · `src/hooks/useInterleavedSession.js:226` — a missed English micro-task promotes an English word into the Malay deck
3/3 confirm; replaying the literal payload produced
`promoted card = { m:'weather', e:'cuaca', lang:'ms' }` — gloss-inverted, in the wrong partition.
**⚠️ Fix correction:** use **`language: cardLang(task.card)`** (`src/lib/cardLang.js`), *not* the proposed
`task.card.lang || studyLang`. The proposed form is wrong at the pre-v34 edge: an untagged card (which
`cardLang` documents as Malay) would fall through to `studyLang`, promoting a **Malay** word into the
English deck — the mirror image of the bug.

#### V8 · `src/components/SearchModal.jsx:36` — Malay-only sources inherit `studyLang`, so an English learner gets Malay words stamped `lang:'en'`
3/3 confirm, executed: searching "house" under `studyLang:'en'` yields
`{m:'halaman rumah', e:'house yard', lang:'en'}`, served by `cardsForLang(cards,'en')`. It then reads aloud
in **en-GB** and runs **en-GB speech recognition against a Malay utterance**
(`localeFor(card.lang)`, `SpeakMode.jsx:55`).
**⚠️ Fix correction:** hardcoding `lang:'ms'` fixes the content harm but introduces a **milder new
dead-end** — `isInDeck` (`:33`) is lang-agnostic, so the row shows "In deck" while the card is invisible in
the learner's English session. Handle that in the same change. Mirror omissions exist at
`RoleplayScorecard.jsx:121` and `writing/AIFeedbackPanel.jsx:15`; `SelectionToCard.jsx:177` already does it
right.

#### V9 · `supabase/functions/ai-proxy/index.ts:88` — English roleplay is examined and scored in Malay
3/3 confirm; **verified against the live deployed function (version 9)**, which carries the Malay-only
prompts and reads `payload.lang` only for `writing-feedback-v2`. An 0510 learner gets an examiner told to
*"Respond ONLY in Malay"*, is redirected for writing English, and is scored on **imbuhan** — a concept
English does not have. Static mode is hidden for EN scenarios, so AI is the only path.
**⚠️ Fix correction:** the client half is **inert on its own** — prod runs v9 and ignores unknown payload
keys, so this ships as a no-op until `supabase functions deploy ai-proxy` runs. **Both halves must land
together.** Mirror the existing proven `buildWritingFeedbackV2Prompt(String(payload.lang || 'ms'))` pattern
in the same file; defaulting to `'ms'` keeps every Malay session byte-identical.

### P2

#### V10 · `src/data/dictionaryExamples.js:172` — the `berkongsi` example uses `adalah` before a noun phrase
3/3 confirm. DBP (Tatabahasa Dewan Ed.3 p.263, via two DBP publications): `adalah` may only precede a frasa
adjektif or frasa sendi nama; a frasa nama predicate takes `ialah`/`merupakan`. PRPM confirms `saat` is a
kata nama. Graded P2, not P0: a register error in a model sentence, not a falsehood.
✅ **The proposed rewrite is correct and DBP-endorsed** — DBP's 2024 article explicitly sanctions
`merupakan` in this slot. 9 words, inside `lintExampleQuality`'s 5–18 band, still blanks on `berkongsi`.
One lens notes it is *incomplete*: sweep the file for sibling `adalah + frasa nama` instances.

---

## Recommended order

1. **V1** (defunct emergency number — content truth, 3 string edits, add the missing test).
2. **V2 · V3 · V4** (the graders — each needs its pinned tests updated in the same commit).
3. **V5 · V6 · V7** (roleplay + smart-session data integrity).
4. **V8** (search/word-family card language, plus the two mirror sites).
5. **V9** (needs a `supabase functions deploy` — not a repo-only change).
6. **V10** (content polish; sweep for siblings).

**Do not** start any of these from the 2026-08-01 fix text. Use the ⚠️ corrections above.

## Method note for the next review

The 2026-08-01 run's own lesson was "interleave verification with discovery so a hard stop degrades
gracefully". This pass adds a second: **verify the proposed fix, not just the finding.** 9 of 11 fixes were
defective while 10 of 11 findings were sound — the fix text was the weaker artifact by a wide margin, and
nothing in the original method examined it.
