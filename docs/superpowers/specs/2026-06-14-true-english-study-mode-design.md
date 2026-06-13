# True English study mode — design

**Status:** DESIGNED 2026-06-14 (Opus 4.8 xhigh, async design session — NO app code written).
**Decision authority:** every product fork below was decided solo (Kheshav asleep) per the decide-and-flag
contract — each carries **DECISION / WHY / ALTERNATIVES / VETO** for the morning review. Veto any single line
and the rest stands.

This is the **#2 ▶️ Next epic** and the largest remaining one. It was first flagged 2026-06-11
(`docs/archive/RESUME_ARCHIVE-2026-06.md` "Alt B": *"true English study mode (0500/0510 as a first-class
subject)… needs an English vocabulary corpus + a `lang` tag on cards"*). This spec resolves WHAT that means
and scopes the **smallest shippable Phase 1**.

---

## 1. Why

Today the app is **bilingual on its practice surfaces but Malay-primary in its core learning loop.** A
student LEARNING English (Cambridge IGCSE **0510 English as a Second Language**) has no first-class deck or
study session — the vocab→FSRS engine assumes Malay is the language being acquired and English is only the
gloss.

The fix is small *architecturally* but high-value *pedagogically*: it turns the app from "a Malay tool with
English content bolted on" into "a bilingual revision engine" — doubling the addressable IGCSE audience
(Malaysian ESL students are a larger cohort than Malay-FL students) at near-zero new-content cost, because
**the app already owns the Malay↔English vocabulary** it needs (just keyed the other way).

### The live asymmetry (verified against the code 2026-06-14, not assumed)

| Layer | State today | Evidence |
|---|---|---|
| **Dictionary** | Strictly `{ malay: 'english' }` object map, **825 entries** (content-lint-enforced header), no language tag. No English-headword list anywhere in `src/data/`. | `src/data/dictionary.js:1-6` |
| **Card model** | `{ m, e, t, ex, p, mn, …FSRS }`, deduped on `(m, t)`. **No `lang`/`direction` field.** Created via `{ ...card, ...fsrsState }`. | `useStore.js:1229-1231` |
| **Card creation (Import/PDF)** | Always treats the source word as **Malay**: `m: w.word, e: w.meaning` where `meaning = DICTIONARY[clean]` (Malay→English). | `Import.jsx:91,165-166`; `PDFReader.jsx` gloss path uses `g.malay`/`g.display` |
| **Study modes (6)** | All prompt **`card.m`** and check/reveal **`card.e`** — i.e. *show target, recall gloss*. TTS/STT locale is **hardcoded `ms-MY`**. | `FlashcardMode.jsx:94,152` `speak(card.m,'ms-MY')`; `SpeakMode.jsx:54` `startRecognition('ms-MY')`; `Quiz/Type` check `=== card.e`; `Listen/Cloze` prompt `card.m` |
| **Smart-Study queue** | `selectFocalCards` finds cards by `c.m === word`, **no language filter**; mixes all cards. | `lib/study/interleavedQueue.js:79-126` |
| **Dashboard** | `countMastered(cards)` / `getDueCards(cards)` count **all** cards regardless of language. | `Dashboard.jsx`; `fsrs.js` |
| **Persisted language prefs that DO exist** | `pdfReader.ocrLang` (v29), `pdfReader.asrLang` (v33), `examRehearsalLang` (v27) — all `'ms'｜'en'`. **No global "study language".** | `useStore.js` |
| **Bilingual surfaces (already MS/EN)** | Roleplay / Speaking / Grammar / Writing / Comprehension / Listening — each toggles via **local `useState`**, never persisted, no shared source of truth. | `Roleplay.jsx:27`, `Speaking.jsx:40`, `Grammar.jsx:74`, `Writing.jsx:44` |
| **Existing EN *content*** | `SCENARIOS_EN`, `TOPICS_EN`, `grammarEng.js`, EN comprehension/listening passages, `exemplars.js` EN band-6 — **but NO English vocab list.** | `scenarios.js`, `speakingTopics.js`, etc. |

**The one load-bearing observation:** the study modes already use `m` = *the word being learned* and `e` =
*its gloss*. They are **not** hardcoded to "Malay vs English" semantics — only the **TTS/STT locale** and a few
label strings are. So the whole epic reduces to: *give cards a `lang`, re-point the locale + content by it, and
filter the deck by an active "study language."* No study-loop rewrite.

---

## 2. Audience & the central architecture decision

### Fork A — Which syllabus does the vocab loop target?
- **DECISION:** Phase 1 = **IGCSE 0510 English as a Second Language (ESL)** as the first-class vocab→FSRS
  learner. The internal flag is just `lang: 'en'`; "0510" is the framing + cross-links, not a code branch.
- **WHY:** Cambridge confirms **0500 = First Language English** (fluent/native speakers — they do *not*
  acquire basic vocabulary via translation flashcards; they need writing/comprehension/literary analysis,
  which the **already-bilingual** Writing/Comprehension/Grammar surfaces serve) and **0510 = English as a
  *Second* Language** (L1 = Malay or other — the genuine vocab-acquisition audience). A candidate can't sit
  both 0500 and 0510. The core retrieval loop is meaningful precisely for the ESL learner — a perfect **mirror
  of the existing 0546 Malay-FL path** (whose learner's L1 is English). ([Cambridge syllabus codes](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-english-as-a-second-language-0510/))
- **ALTERNATIVES:** *(i)* target 0500 + 0510 equally → rejected for Phase 1: 0500's vocab need is weak and its
  content is different (sophisticated/academic vocab, literature) — the architecture (below) supports adding a
  0500 content pack later with **zero rework**. *(ii)* a generic unlabeled "English" mode → viable, identical
  code; we keep the 0510 label only in copy because it sets correct learner expectations and lets us cross-link
  the existing EN exam surfaces.
- **VETO:** If you'd rather not name a syllabus at all, strike "0510" from the copy — nothing in the code
  depends on it.

### Fork B — Card field semantics (the keystone decision)
- **DECISION:** **Generalize the meaning of the existing fields** — `m` = *target-language headword* (the word
  being learned, the thing shown/spoken), `e` = *L1 gloss* (the answer/meaning). **No field rename.** Add one
  field: **`lang: 'ms' | 'en'`** (the target language).
  - Existing Malay cards already satisfy this: `m`=Malay target, `e`=English gloss, `lang:'ms'`.
  - New English cards: `m`=English target, `e`=Malay gloss, `lang:'en'`.
- **WHY:** The study modes **already** read `m` as "prompt" and `e` as "answer" (verified §1). So every mode —
  flashcard, quiz, type, listen, cloze, speak — keeps working **unchanged** in direction. The *only*
  language-specific things become (1) the TTS/STT **locale** (`ms-MY`↔`en-GB`/`en-US`, chosen by `card.lang`)
  and (2) a handful of hardcoded label strings. This is the difference between a 1-week epic and a 1-month one.
- **ALTERNATIVES:** rename `m→front`, `e→back` across the codebase → **rejected**: hundreds of call sites,
  high regression risk, and the repo's own Critical Conventions warn that big-file rewrites cause regressions.
- **VETO / known wart:** the field *names* `m`/`e` (mnemonic for Malay/English) become mildly misleading for
  English cards (`m` holds an English word). We accept the name mismatch — documented inline as "m = target,
  e = gloss" — over a risky rename. If this bothers you, the rename is its own isolated future task.

### Fork C — Global "study language" switch vs a parallel English deck
- **DECISION:** A **persisted global `studyLang: 'ms' | 'en'`** (default `'ms'`) **plus** the additive per-card
  `lang` field. The single card array **self-partitions** by `lang`; `studyLang` scopes what the Study session,
  Smart-Study queue, and Dashboard counts *see*. One deck pool, one active language at a time.
- **WHY:** *(1)* It's how every mainstream tool models it — a "course"/deck is a **(target ← L1) pair** and a
  card knows its direction (Anki decks are organized per language pair e.g. "German for English speakers"; tags
  carry the language). ([Anki language-learning practice](https://www.fluentu.com/blog/reviews/anki-language-learning/)) *(2)* It matches the app's **own** established pattern — the persisted
  `ocrLang`/`asrLang`/`examRehearsalLang` `'ms'|'en'` prefs; `studyLang` is their natural global sibling. *(3)*
  **ADD-first:** one clearly-labelled active context + one-tap switch beats a second always-visible deck that
  doubles the dashboard's surface area and forces every entry to ask "which language?".
- **ALTERNATIVES:** *(i)* a fully separate `cardsEn` array → rejected: doubles every store action, sync path,
  and migration; the `lang` filter achieves isolation with one predicate. *(ii)* no global pref, let cards mix
  freely in one session → rejected: mixing Malay + English in one FSRS queue breaks TTS locale and confuses
  retrieval direction; nobody studies two languages interleaved word-by-word.
- **VETO:** If you want both languages' due counts visible at once (no active-language filter), we show a
  2-section dashboard and skip the global scope — costs attention (against ADD-first) but is a one-flag change.

### Fork D — Route topology
- **DECISION:** **Reuse the existing `/study`, `/smart-study`, `/dashboard`**, gated by `studyLang`. **No new
  route.**
- **WHY:** A `/study-en` route would duplicate the entire (large, stateful) study page — exactly the
  big-file-rewrite regression risk the repo's conventions forbid. The switch + filter adds a *dimension* to one
  study engine instead of forking it. Route count stays 21.
- **VETO:** split into a dedicated route later only if the two languages' study UIs genuinely diverge.

---

## 3. Where English vocabulary comes from

### Fork E — Seed content source
- **DECISION (two-pronged):**
  1. **Derive a seed by reversing the existing 825-entry dictionary** into an English-headword → Malay-gloss
     list, committed as `src/data/dictionaryEn.js`, regenerated by a pure `scripts/build-en-dictionary.mjs`.
  2. **Grow it from the learner's own texts** via the **already-shipped** PDF/photo-OCR/audio reader and Import
     page: when `studyLang==='en'`, tapping an English word looks it up in the reversed dict (Malay gloss) and
     builds a `{ m:English, e:Malay, lang:'en' }` card.
- **WHY:** Zero new authoring, **zero native-speaker risk** (the Malay glosses are already curated + shipped),
  and it's **evidence-backed**: glossing an English (L2) headword in the learner's **L1 (Malay)** is exactly the
  arrangement the vocab-gloss meta-analysis favours. A 2024 meta-analysis (42 studies, N=3,802) found **L1
  glosses beat L2 glosses**, with **no interaction with proficiency** — the L1 advantage holds for beginners
  through advanced. ([Zhang & Ma 2024, *Language Teaching Research*](https://journals.sagepub.com/doi/abs/10.1177/13621688211011511); see also [the 2024 multimedia-gloss meta-analysis](https://www.sciencedirect.com/science/article/pii/S000169182400218X)). The reader path means content
  isn't capped at the seed — the learner builds their deck from real English material (the strongest, most
  personal vocabulary source), and FSRS (spaced practice has a robust L2 meta-analytic effect) schedules it.
- **CAVEATS (flagged honestly):**
  - The reversed list is **IGCSE-*Malay* vocabulary seen from the other side** — it skews toward words a
    *Malay*-learner needs, not a curated high-frequency *English*-exam list. It is a **starter, not a
    curriculum.** The reader is the real engine.
  - Reversal isn't 1:1: **many-to-one collisions** (several Malay words share one English gloss) and
    **multi-word / non-lexeme glosses** ("older brother", "is/are") must be cleaned. The builder's rules
    (see §5) keep single words + common 2-word collocations, join ≤3 distinct Malay equivalents with " / ", and
    drop function-word definitions. Expect **~400–600 usable English headwords** from the 825 (a logged number,
    not a silent truncation).
- **ALTERNATIVES / VETO:** **BYOK-generate a proper IGCSE-0510 seed list** (better-targeted than reversed-Malay
  vocab) is a clean **Phase 2** add via the existing `instruct.js` router — deferred because it needs a key +
  a validity/quality harness. If you'd rather skip the reversed seed entirely and ship "build your own English
  deck from texts" only, drop Task E and the empty-state offers the reader instead of a starter set.

### Fork F — Coexistence & data isolation
- **DECISION:** **One card array, additive `lang` field**, filtered by `studyLang` at every consumer
  (Dashboard counts, Study queue, Smart-Study focal pool, mastered/due). FSRS scheduling is per-card and
  **language-agnostic** — `fsrs.js` does not change. The mistake pipeline already carries `language` on each
  mistake record, and auto-promotion is already Malay-gated; when we later allow English mistakes to promote,
  the promoted card sets `lang` from `mistake.language` (Phase 2 — out of Phase-1 scope; English mistakes stay
  journal-only in Phase 1, same as the current non-Malay rule).
- **WHY:** smallest possible change; no schema split; fully reversible; the cloud-sync **state blob already
  last-write-wins** on settings, so `studyLang` rides along with zero new sync code.
- **VETO:** separate arrays (see Fork C alternative i) — rejected for the same reasons.

### Fork G — Migration & STORE_VERSION
- **DECISION:** **STORE_VERSION 33 → 34.** Migration: *(a)* backfill `lang: 'ms'` onto every existing card;
  *(b)* add top-level `studyLang: 'ms'`. Register `studyLang` in `BACKUP_KEYS` (export/import round-trip).
  Read-time guard everywhere: `(card.lang || 'ms')` so an un-migrated/old-blob card is treated as Malay.
- **WHY:** every existing card *is* Malay, so `'ms'` is lossless + correct; defaulting `studyLang:'ms'` means
  **existing users see zero change** until they flip the switch. An old cloud blob lacking the fields heals on
  next pull via the read-time guard.
- **VETO:** skip the per-card backfill and rely on the read-time `(card.lang||'ms')` guard alone (no migration
  write) — even lighter and viable; we lean **explicit backfill** so the data is self-describing and the filter
  predicate is clean. Flip if you prefer the minimal migration.

### Fork H — Where the switch lives (UI)
- **DECISION:** Canonical **segmented `studyLang` control in Settings** (beside the other `'ms'|'en'` prefs),
  **mirrored** as a compact "Studying: 🇲🇾 Malay / 🇬🇧 English" switcher at the **top of the Dashboard** and on
  the **Study / Smart-Study entry** so it's one-tap and never buried.
- **WHY:** Settings is the canonical home for persisted prefs; surfacing it on Dashboard/Study keeps it
  discoverable (ADD-first: the active context is always visible + switchable without spelunking).
- **VETO:** Settings-only (simpler, but buried) or Dashboard-only (loses the canonical home).

### Fork I — Should the existing bilingual surfaces follow `studyLang`?
- **DECISION (recommended, but the one cuttable Phase-1 task):** seed the **initial** local `lang` of
  Roleplay/Speaking/Grammar/Writing/Comprehension-via-default/Listening from `studyLang`, while keeping their
  in-page toggle. Makes the global switch feel genuinely global.
- **WHY:** cheap (change `useState('ms')` → `useState(studyLang)`), high coherence — flip to English once and
  the whole app leans English.
- **VETO / cut-line:** if Phase 1 needs trimming, **cut this task** — the surfaces keep their independent
  toggles exactly as today; nothing breaks. (This is the explicit scope-pressure release valve.)

### Fork J — Per-language streaks / analytics
- **DECISION:** Phase 1 keeps a **single shared** streak / engagement / skill-balance layer (language-agnostic
  — studying *either* language counts). No split.
- **WHY:** streaks reward the habit, not the language; splitting them halves the motivational signal and adds
  store complexity for little gain. The skill-balance meter is about Paper skills, not language.
- **VETO:** per-language streaks later if users ask to track two exams independently.

### Fork K — Retrieval direction
- **DECISION:** Phase 1 **mirrors the existing receptive direction** (show target `m` → recall/reveal gloss
  `e`). No new productive (gloss→target) direction.
- **WHY:** parity first; don't redesign retrieval mechanics in the same epic that introduces the language. The
  existing direction already serves reading comprehension (the 0510 reading paper).
- **VETO:** add an optional productive direction (type the English word from the Malay gloss) as a Phase-2
  study-mode enhancement — it's known to strengthen production but is a separate design.

---

## 4. Learning-science grounding (cited, not memory)

1. **L1 gloss > L2 gloss for vocabulary, at all proficiencies.** Meta-analysis, 42 studies / 359 effect sizes /
   N=3,802: glossed reading ≫ non-glossed, and **L1 glosses produced greater learning than L2 glosses with no
   gloss-language × proficiency interaction** — the L1 advantage holds for beginners. → An English headword
   glossed in **Malay (L1)** is the right default for the 0510 learner; the app already has that content.
   ([Zhang & Ma 2024](https://journals.sagepub.com/doi/abs/10.1177/13621688211011511))
2. **Spaced practice has a robust positive effect on L2 learning** (meta-analysis) — FSRS is already the engine;
   it is language-agnostic, so English cards inherit the evidence base unchanged.
   ([Kim & Webb, spaced-practice meta-analysis](https://www.semanticscholar.org/paper/The-Effects-of-Spaced-Practice-on-Second-Language-A-Kim-Webb/43ba0227417465865bbfd8354ce50f84e896320e))
3. **This matches the app's own learning-science table** (CLAUDE.md): active recall, retrieval, L1-word-gloss
   primacy. The existing CLAUDE.md note — *"L1 (English) word glosses → FSRS … evidence-backed for our beginner
   IGCSE audience (Kim/Lee/Lee 2024)"* — is the **mirror image** of what we build here: for the Malay learner,
   L1=English; for the English learner, L1=Malay. Same principle, flipped.
4. **Consistency with the reveal-gate philosophy:** the reader's "try first, reveal freely" gate is unchanged —
   it's already language-neutral (`unknownDensity.js` measures unknown words against the dictionary; for English
   docs it should measure against the reversed/English known-set — a Phase-1 wiring detail, see §6 risks).

## 5. How comparable apps model it (practitioner grounding)

- **Anki:** language is a property of the **deck / note-type / tags**, organized as explicit pairs
  ("X for Y-speakers"); direction is baked into card templates (front/back). → validates **`lang` on the unit +
  a per-language scope**, not a global-less mix. ([FluentU on Anki](https://www.fluentu.com/blog/reviews/anki-language-learning/), [Duolingo→Anki decks](https://github.com/anki-decks/anki-deck-for-duolingo-chinese))
- **Duolingo / Memrise / DuoCards:** the learner **picks a course = (from-language → to-language)** up front;
  the whole session is scoped to that one course. → validates a **single active "study language"** with a
  switch, exactly Fork C.

---

## 6. Acceptance criteria

**Functional (F):**
- **F1** — A `studyLang` switch (Settings + Dashboard/Study) flips the active language; choice **persists**
  across reload (STORE_VERSION 34).
- **F2** — With `studyLang='en'`, the Dashboard Due/Mastered/deck-size tiles, the Study session, and the
  Smart-Study queue show **only English (`lang:'en'`) cards**; with `'ms'`, only Malay — never mixed.
- **F3** — All 6 study modes work for an English card: **flashcard/listen/speak speak the English word in an
  English voice (`en-GB`/`en-US`)**; quiz/type/cloze prompt the English word and accept the Malay gloss; no
  `ms-MY` voice on an English card.
- **F4** — A one-tap **"Start your English deck"** seeds the reversed-dictionary starter set into `lang:'en'`
  cards; the English deck then schedules via FSRS like the Malay deck.
- **F5** — With `studyLang='en'`, tapping an English word in the PDF/photo/audio reader or Import builds a
  `{ m:English, e:Malay-gloss, lang:'en' }` card (English gloss path), not a Malay card.
- **F6** — Existing Malay users: after the v34 migration, **everything behaves exactly as before** (studyLang
  defaults 'ms', all old cards lang:'ms').

**Non-negotiable guardrails (N):**
- **N1** — `fsrs.js`, the reveal-gated reader `{pages}` core, and the gloss→FSRS pipeline are **not rewritten**
  — English rides the same engine via the `lang` flag + locale switch.
- **N2** — No new route (Fork D); route count stays 21.
- **N3** — No data loss: migration is additive + reversible; an old cloud blob heals via `(card.lang||'ms')`.
- **N4** — Eager `index` bundle effectively unchanged; `dictionaryEn.js` is **lazy/data-chunked** (loaded only
  on first English use), not eager.
- **N5** — ADD-first: one active language context, one clearly-labelled switch; no doubled always-on surfaces.
- **N6** — Bilingual MS/EN toggles already shipped on other surfaces are **not broken** (Fork I only changes
  their *initial* value, never removes the toggle).

**Quality (Q):**
- **Q-SEED** — log the reversed-dictionary yield (e.g. "532 English headwords from 825 Malay entries · 187
  dropped: 121 multi-word, 66 collisions") — never a silent truncation.
- **Q-LOCALE** — a single helper maps `lang→locale` so no study mode hardcodes a locale again (pin in a test).
- **Q-MIGRATION** — a red-proofed store migration test: a pre-v34 persisted blob loads with every card
  `lang:'ms'` and `studyLang:'ms'`.

---

## 7. Phase 1 scope (in / out)

**IN (smallest shippable slice):**
- Card `lang` field on every creation path + `studyLang` global pref + setter + **STORE_VERSION 33→34**
  migration + `BACKUP_KEYS` + a `lang→locale` helper.
- Deck filter by `studyLang` at: Dashboard counts, Study session source, Smart-Study `selectFocalCards`.
- Study-mode locale by `card.lang` (Flashcard/Listen/Speak) + lang-aware label strings (the few "Malay"-ish
  ones); Quiz/Type/Cloze are direction-neutral already.
- `scripts/build-en-dictionary.mjs` (pure, tested) → committed `src/data/dictionaryEn.js`; the English gloss
  path in Import + PDFReader when `studyLang='en'`.
- `studyLang` switch UI: Settings segmented control + Dashboard/Study compact switcher.
- English **empty-state onboarding** ("Start your English deck — add the starter set or import an English text").
- *(Cuttable, Fork I)* seed the bilingual surfaces' initial toggle from `studyLang`.

**OUT (Phase 2+, explicitly):**
- 0500 First-Language-English academic/sophisticated-vocab curated decks (architecture supports it later).
- BYOK-generated 0510 seed list via `instruct.js` (Fork E alternative).
- Productive/bidirectional retrieval direction (Fork K).
- Per-language streaks/analytics (Fork J).
- English mistake → FSRS auto-promotion (Fork F — Phase 1 keeps English mistakes journal-only, as today).
- `unknownDensity.js` measuring English docs against an English known-set (flagged §8) — small wiring, but its
  own verification; defaulting to "no nudge on EN docs" (current behaviour) is safe for Phase 1.

---

## 8. Risks & not-automated

- **Reversed-dictionary quality** is the biggest content risk — mitigated by the builder's cleanup rules +
  the logged yield (Q-SEED) + the fact that it's a *starter*, with the reader as the real engine. A native-Malay
  eye on a sample of the reversed glosses is worth a manual pass (not a CI gate).
- **English TTS/STT voice availability** varies by browser/OS (same caveat as Malay `ms-MY`) — the existing
  `hasSpeechSynthesis()/hasSpeechRecognition()` guards apply; English voices are *more* widely available than
  Malay, so this is lower-risk than the current Malay path.
- **`unknownDensity` on English docs:** the density nudge currently measures unknown words against the Malay
  dictionary; for an English doc it would mis-measure. Phase-1 safe default = **the nudge simply doesn't fire on
  English docs** (matches "EN docs never nudge" already in CLAUDE.md). Wiring it to an English known-set is a
  flagged Phase-2 nicety.
- **Page UI rides on build/lint + a go-wild e2e** (repo norm: pages aren't unit-tested). The pure cores
  (builder, migration, queue filter, locale helper) are TDD'd; a `study-lang.spec.js` e2e covers the switch +
  English-deck happy path + the "no mixing" guarantee.

---

## 9. Open questions for the morning review (none block the build)

1. **Fork A label** — keep the explicit "0510 ESL" framing in copy, or a generic "English"? (Code identical.)
2. **Fork E** — ship the reversed-dictionary seed *and* the build-your-own path (recommended), or build-your-own
   only? (Cuts Task E.)
3. **Fork I** — include the "bilingual surfaces follow `studyLang`" coherence task, or cut it to stay bounded?
4. **Fork G** — explicit per-card backfill (recommended) vs read-time `(card.lang||'ms')` guard only?

Each has a recommended default baked into the plan; veto any in one line and I'll adjust the plan before the
build session.
