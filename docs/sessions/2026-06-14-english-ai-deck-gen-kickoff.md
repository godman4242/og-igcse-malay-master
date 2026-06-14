# Kickoff — AI "Make a deck" + "Practise a conversation" go English-aware

Paste the block below as the FIRST message in a new attended session. It closes the
coherence gap exposed by the v34 deck-scoping work: the AI deck/scenario generators
on the "For You" page are Malay-only, so an English (0510) learner's generated cards
are Malay AND (now that ForYou/Study/Dashboard scope by studyLang) INVISIBLE in their
deck.

> Builds on (live): v34 studyLang/cardsForLang; the dense-page known-English assets
> (`englishFrequency.js`, `buildKnownEnglish`) + `dictionaryEn` — all reused here.

---

```text
You are continuing the IGCSE Malay Master app. Read RESUME_HERE.md and CLAUDE.md
first (esp. "True English study mode" + the AI/Cikgu + For You sections). Follow the
working agreement: TDD (red-proof first), surgical diffs, the pre-commit gate stays
green, RESUME_HERE.md updated in the same commit, decide-and-flag every call (decision
+ why + one-line veto note) — questions only for destructive ops / money / invariants.

GOAL: make the For You AI deck generator (MakeDeckPanel + deckGenerator) and the
"Practise a conversation" scenario generator language-aware, so an English (0510)
learner gets an ENGLISH vocab deck / scenario that actually lands in their deck.
Today:
  • deckGenerator.buildDeckPrompt is hardcoded "IGCSE Malay (0546) … Malay vocabulary
    items, m=Malay word, e=English meaning" (deckGenerator.js:43-50).
  • generateGroundedDeck grounds against the Malay dictionary + Malay validity list
    (:258-267) — for English content that mislabels every word "not a real Malay word".
  • MakeDeckPanel.handleAdd stamps NO lang on addCards (MakeDeckPanel.jsx:113-118) →
    generated cards default to lang:'ms' → INVISIBLE to an English learner (ForYou/
    Study/Dashboard scope by studyLang via cardsForLang).
  • handleGenerateScenario passes generateScenario({…, lang:'ms'}) (:88) — hardcoded,
    though scenarioGenerator ALREADY supports lang (buildScenarioPrompt:28-39).

DESIGN — pre-resolved (confirm/veto, then code):
1. Prompt — buildDeckPrompt(goal, topics, interests, lang='ms'); for 'en' author an
   IGCSE English (0510) deck: m=English word, e=concise Malay meaning, ex=English
   example. Thread lang through generateDeckText. 'ms' byte-identical.
2. Grounding/validity — reuse what already exists (the grounding fns are language-
   agnostic; they key by `m`). generateGroundedDeck({…, lang}): English builds the
   index from dictionaryEn (English→Malay) + the learner's en cards (a new
   buildEnDeckGroundingIndex mirroring buildDeckGroundingIndex), and the validity Set
   from buildKnownEnglish(englishFrequency ∪ dictionaryEn seed) (a new
   loadEnglishValiditySet). annotateValidity is generic (Set membership) → reused.
   'ms' path byte-identical. Veto: grounding English against the Malay dict/validity
   mislabels real English words.
3. Card lang — MakeDeckPanel reads studyLang; stamps lang: studyLang on addCards;
   passes lang to generateGroundedDeck + generateScenario. Veto: unstamped cards
   vanish for English learners.
4. Mock — add an 'deckEn' case to aiMocks so VITE_AI_MOCK + the make-deck e2e work
   for English (dev/test parity). Flag if skipped.

READ FIRST: src/lib/deckGenerator.js (buildDeckPrompt:38, generateDeckText:178,
buildDeckGroundingIndex:226, loadMalayValiditySet:244, generateGroundedDeck:258);
src/components/MakeDeckPanel.jsx (handleGenerate:65, handleGenerateScenario:80,
handleAdd:108); src/lib/scenarioGenerator.js (already lang-aware);
src/lib/malayValidity.js (annotateValidity is generic); src/lib/englishKnownWords.js
+ src/data/englishFrequency.js + src/data/dictionaryEn.js (reuse).

DON'T BREAK: the Malay deck/scenario generators (byte-identical for lang='ms' — the
default keeps the whole Malay path unchanged, pinned by deckGenerator.test.js +
make-deck.spec.js); the grounding "never silent-ship" contract (unverified →
learner-confirm); the no-paywall invariant (BYOK only).

DONE (measurable):
- With studyLang='en' + a BYOK key, "Make a deck" produces English→Malay cards
  stamped lang:'en' (they show up in the English deck), grounded against the English
  seed (seed words auto-accept; real English words flagged validWord), and "Practise
  a conversation" generates an English scenario. studyLang='ms' byte-identical.
- TDD: red-proofed pure tests for buildDeckPrompt(lang) + the English grounding/
  validity helpers; MakeDeckPanel card-lang stamp pinned (mount or structural).
- Gate green (build + test:run + lint) + make-deck e2e green. RESUME_HERE + CLAUDE.md
  updated.

Start by stating what RESUME_HERE.md says is current, then confirm/adjust the 4
pre-resolved forks with veto notes, before writing code.
```
