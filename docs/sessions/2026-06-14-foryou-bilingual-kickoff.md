# Kickoff — "Picked for you" (ForYou) follows studyLang + Roleplay English speech input

Paste the block below as the FIRST message in a new attended session. It closes the
LAST v34 English voice/locale leaks (flagged in RESUME_HERE). Reader English parity
shipped 2026-06-14; ForYou is the one remaining page that's Malay-blind.

> Builds on (live): v34 `studyLang` + `cardsForLang` + `localeFor` (the single
> TTS-locale source); the reader English-parity epic.

---

```text
You are continuing the IGCSE Malay Master app. Read RESUME_HERE.md and CLAUDE.md
first (esp. "True English study mode" — cardsForLang / localeFor / studyLang).
Follow the working agreement: TDD (red-proof first), surgical diffs, the pre-commit
gate stays green, RESUME_HERE.md updated in the same commit, decide-and-flag every
call (decision + why + one-line veto note) — questions only for destructive ops /
money / invariants.

GOAL: make the "Picked for you" page (ForYou) follow the global studyLang, and fix
the last Roleplay English speech-input leak. Today:
  • ForYou.jsx passes the FULL mixed deck + a hardcoded `lang: 'ms'` to
    buildForYouShelves (ForYou.jsx:68-74), and its due-count uses unscoped cards
    (:57). So an English (0510) learner sees a Malay/mixed "Picked for you" page —
    violating the v34 invariant that Malay & English decks never mix in a session.
  • the card speaker hardcodes speak(it.m, 'ms-MY') (ForYou.jsx:230) → an English
    card is spoken in a Malay voice.
  • Roleplay.jsx:335 speakResponse() hardcodes startRecognition('ms-MY') — REACHABLE
    for English (the static turn UI renders English scenarios; :300 already reads
    en-GB for TTS), so an English roleplay's spoken answer is recognised with the
    Malay model.

DESIGN — pre-resolved (confirm/veto, then code):
1. Scope ForYou to the active language — read studyLang; compute
   langCards = cardsForLang(cards, studyLang); use it for buildForYouShelves
   `cards` AND the due-count (getDueCards). Pass `lang: studyLang` to the builder
   (it already threads lang → buildPicked/buildLearnerProfile). studyLang='ms' is
   byte-identical (cardsForLang(cards,'ms') = the legacy set; lang:'ms' = the old
   hardcode). Veto: leaving it mixed breaks the no-mixing invariant for English.
2. Card TTS — speak(it.m, localeFor(studyLang)). All shelf cards are now scoped to
   studyLang, so studyLang is the correct per-card locale (items don't carry .lang).
   Veto: 'ms-MY' speaks English cards wrong.
3. Roleplay STT — startRecognition(scenario.lang === 'en' ? 'en-GB' : 'ms-MY'),
   mirroring the lang-aware TTS at :300. One line. Veto: ms-MY mis-recognises English.
4. SCOPE LINE (decide-and-flag): scope only the `cards` slice (the only v34
   lang-tagged data). The non-card signals (mistakes / grammar / speaking / writing)
   stay cross-language for v1 — they predate v34 and lang-scoping them is a separate
   call. Flag, don't silently scope.

READ FIRST: src/pages/ForYou.jsx (the buildForYouShelves call :68, the dueCount :57,
the speaker :230); src/lib/forYouShelves.js (buildSaved/buildPicked use cards + lang);
src/lib/cardLang.js (cardsForLang); src/lib/langLocale.js (localeFor);
src/pages/Roleplay.jsx (:300 lang-aware TTS, :335 hardcoded STT).

DON'T BREAK: the Malay ForYou (byte-identical for studyLang='ms'); the gloss→FSRS
core; the no-mixing invariant (this ENFORCES it for ForYou). buildForYouShelves stays
a pure builder — scope the cards in the PAGE, don't add filtering to the builder.

DONE (measurable):
- With studyLang='en', ForYou shows ONLY English cards (English deck) and speaks them
  en-GB; studyLang='ms' is byte-identical to today.
- Roleplay English scenario's mic uses en-GB STT.
- TDD: a red-proofed gated mount test (jsdom + MemoryRouter + mocked speech, mirroring
  roleplayScorecardMistakeLang.test.js) — studyLang='en' + a mixed Saved deck → only
  the English card renders + the speaker calls speak with 'en-GB'. Roleplay STT pinned
  by a source/structural test (mirror studyTtsLocale.test.js's MixedSession pin).
- Gate green (build + test:run + lint). RESUME_HERE + CLAUDE.md updated.

Start by stating what RESUME_HERE.md says is current, then confirm/adjust the 4
pre-resolved forks with veto notes, before writing code.
```
