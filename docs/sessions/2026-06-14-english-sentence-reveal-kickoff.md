# Kickoff — English sentence-level reveal (next session)

Paste the block below as the FIRST message in a new attended session. It's the
**last** reader Malay-only piece: the **dense-page easing** half already supports
English (shipped 2026-06-14, commit `1f3a2f6`); **sentence-reveal** is still
Malay-only. This is **design-before-coding** — the forks are pre-resolved below
(grounded in the live code), so confirm/veto then execute.

> Builds on (all live): English dense-page easing (`1f3a2f6`), the reusable
> `src/lib/englishKnownWords.js` known-set + `unknownDensity` injected predicate,
> and the F5 English-source gloss path (`plan`/`isEn`/`glossEnWords`).

---

```text
You are continuing the IGCSE Malay Master app. Read RESUME_HERE.md and CLAUDE.md
first (esp. the "Reveal-gated translation" + the N1 EXCEPTION note + "True English
study mode"). Follow the working agreement: TDD (red-proof first), surgical diffs,
the pre-commit gate stays green, RESUME_HERE.md updated in the same commit, and
decide-and-flag every call (decision + why + one-line veto note) — questions only
for destructive ops / money / invariants.

GOAL: bring the reflow reader's SENTENCE-LEVEL reveal to English (0510 ESL) docs.
Today the whole sentence feature is gated off for English (sentenceDisabled =
docLang === 'en', PDFReader.jsx:902) and its plumbing is Malay-only:
  • runSentenceTranslation (PDFReader.jsx:1155) + fetchSentenceEnglish (:1183) call
    translateDocument(...) with NO from/to → it defaults ms→en (wrong direction for
    an English doc).
  • sentenceUnknownsById (:1095) tests the Malay DICTIONARY → every English word
    reads as "unknown".
  • the F7 ladder (simpler-MALAY rung, revealSentenceHandler :1197) is Malay-source-
    specific.
For a Malay learner reading an English doc, revealing the English is a no-op (kept
disabled). For an ENGLISH learner reading an English doc, revealing the MALAY (L1)
translation of a sentence is a real comprehension aid — enable it.

WHY: it completes English parity for the reader. The dense-page banner (the "too
hard, want the translation?" easing) already works for English; sentence-reveal is
the finer-grained "reveal THIS sentence's meaning, then add its unknown words to my
deck" comprehension tool. Both are validated reveal-gated comprehension aids.

DESIGN — pre-resolved (confirm/veto, then code):
1. Direction — English learner reveals the sentence's MALAY translation (en→ms).
   Thread plan.from/plan.to into runSentenceTranslation + fetchSentenceEnglish.
   Veto: en→en is a no-op.
2. Ladder — SKIP the F7 simpler-Malay rung for English (its source is English; a
   simpler-English rung is its own feature). For isEn, revealSentenceHandler goes
   straight to the direct fetch (the existing `!ladder` path).
   Veto: building English→simpler-English now balloons scope.
3. Unknown set — sentenceUnknownsById uses the English known-set (reuse
   makeIsKnownEnglish + the lazy frequency/seed/cards blend already built for the
   density feature) when isEn, the Malay DICTIONARY otherwise. Extract a pure
   sentenceUnknowns(sentences, wordByIndex, isKnown) helper so it's unit-testable.
   Veto: the Malay DICTIONARY flags every English word.
4. Enable guard — make it symmetric, mirroring the density guard already shipped:
   sentenceDisabled = docLang === (isEn ? 'ms' : 'en'). Malay path byte-identical
   (isEn false → docLang === 'en', unchanged). English learner: enabled on an
   English/unknown doc, disabled on a clearly-Malay doc (en→ms reveal is a no-op
   there). Veto: enabling unconditionally would reveal-no-op on a Malay doc.
5. Copy — the toggle title + "Show/Hide English" sentence labels flip by isEn
   (English learner → "Show Malay"). Label-only.

READ FIRST: PDFReader.jsx sentence-reveal block (sentenceUnknownsById :1095,
sentenceDisabled :902, runSentenceTranslation :1143, fetchSentenceEnglish :1180,
revealSentenceHandler :1197, addUnknownsFromSentence :1267 — already isEn-aware,
the render gates ~:1592/:1946, the toolbar copy ~:1580/:1604); src/lib/englishKnownWords.js;
src/components/SentenceReveal.jsx; the CLAUDE.md reveal-gating + N1 EXCEPTION notes.

DON'T BREAK: the gloss→FSRS core; the Malay sentence-reveal + the F7 ladder
(byte-identical for isEn=false — the ladder, simplify state, englishShownSentences
all stay Malay-only); the dense-page easing just shipped; the N1 word-level gloss
path (English word-tap stays Select-mode). Reveal-gating: revealing is never
failure; nothing auto-reveals.

DONE (measurable):
- With studyLang='en' on an English doc, Sentence mode is selectable (not disabled),
  revealing a sentence shows its MALAY translation (en→ms, not a ms→en echo), and
  "add unknowns from this sentence" adds only words outside the English known-set.
- Malay sentence-reveal + ladder behaviour byte-identical (proven by the existing
  reader e2e + a Malay-unchanged unit test).
- New pure-unit tests for sentenceUnknowns (injected isKnown), red-proofed first.
- Gate green (build + test:run + lint). CLAUDE.md N1 note updated (sentence-reveal
  now English-capable; the ladder stays Malay-only).

Start by telling me what RESUME_HERE.md says is current, then confirm/adjust the 5
pre-resolved forks with veto notes, before writing code.
```

---

## Smaller alternative (quick win instead of the big item)

- **Reader dense-page e2e for English** — the one follow-up flagged on the density
  ship: an end-to-end Playwright test mounting `PDFReader` with an English fixture
  that asserts the banner appears ("Show Malay as I read") on a hard English page
  and NOT on a normal one. Pins the React wiring the pure tests can't. ~30–45 min.
