# Kickoff — English reader grounding (next session)

Paste the block below as your FIRST message in a new attended session. It's the
last big English-parity gap: the reflow reader's reveal-gating + dense-page help
are Malay-only. This is **design-before-coding** — resolve the forks first.

> Context this builds on (shipped 2026-06-14, all live): Produce mode (`e4e209f`),
> bilingual variant badges (`7e34e3d`), TTS locale parity (`8e6931a`). The core
> study loop is now fully bilingual; the **reader** is the remaining Malay-only piece.

---

```text
You are continuing the IGCSE Malay Master app. Read RESUME_HERE.md and CLAUDE.md
first (esp. the "Reveal-gated translation" + "True English study mode (N1)" notes),
then this task. Follow the repo's working agreement: TDD (red-proof first), surgical
diffs, the pre-commit gate must stay green, RESUME_HERE.md updated in the same commit,
and decide-and-flag every call (log decision + why + a one-line veto note) — questions
only for destructive ops / money / invariants.

GOAL: bring the reader's reveal-gating + dense-page help to ENGLISH docs. Today
`unknownDensity.js` and the grounding helpers (buildGlossIndex / groundingIndex /
collectDocTokens / sentenceUnknownsById) are Malay-based, so an English (0510 ESL)
learner loading an English doc gets a density of ~0 and no "this page is too hard"
easing — only tap-to-translate. Make density real for English; keep Malay byte-identical.

DESIGN FIRST (~30 min, no code until these are decided + logged):
1. "Known" English word source — Malay uses the built-in dictionary + grounding-verified
   set. Pick for English: the dictionaryEn 682-headword seed, a frequency list, or the
   learner's own English deck (or a blend). Decide + veto-note.
2. Tokenisation without the Malay stemmer — English needs light lemmatisation
   (plurals/tenses) or a stem-light match. Pick the lightest correct approach.
3. Scope order — ship unknownDensity (the dense-page banner) FIRST (smaller, high-value);
   sentenceUnknownsById / sentence-reveal can be a later increment. Recommend yes.

READ FIRST: src/lib/unknownDensity.js and the grounding helpers it calls;
src/pages/PDFReader.jsx (the dense-page banner + the pdfReader.autoHelpDensePages pref,
Settings → reading); the CLAUDE.md reveal-gating + N1 notes.

DON'T BREAK: the gloss→FSRS core; the Malay grounding path (byte-identical); the N1
invariant (English docs currently route to Select-mode/tap-translate — you're ADDING
English grounding, not rewriting the Malay engine). Reveal-gating must EASE on a too-hard
page, never block (non-punitive, dismissible).

DONE (measurable):
- An English doc computes a non-zero unknown-word density.
- The non-punitive dense-page banner appears for a hard English page and offers to reveal
  (never auto-applied unless the beginner pref opts in), and Malay behaviour is unchanged.
- New pure-unit tests for the English density/known-word path, red-proofed first.
- Gate green (build + test:run + lint). CLAUDE.md N1 note updated to reflect English support.

Start by telling me what RESUME_HERE.md says is current, then your decisions on the 3
forks above with veto notes, before writing any code.
```

---

## Smaller alternatives (if you'd rather a quick win than the big item)

- **Finish TTS/STT locale parity** — `Roleplay.jsx:335` (STT hardcodes `ms-MY`) and
  `ForYou.jsx:230` (TTS hardcodes `ms-MY`). Both need English-reachability traced first
  (Roleplay static-mode is Malay-only → English routes to the AI session; ForYou has no
  lang-awareness at all). Verify-then-fix-or-flag. ~30 min.
- **Make "Picked for you" (ForYou) bilingual** — it predates v34 and is Malay-blind
  throughout (no studyLang scoping, no localeFor, no card.lang). Medium scope.
