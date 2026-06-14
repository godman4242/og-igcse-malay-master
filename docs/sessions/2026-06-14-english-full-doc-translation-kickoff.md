# Kickoff — English full-document translation (the last reader Malay-only surface)

Paste the block below as the FIRST message in a new attended session. It finishes
the reader's English (0510 ESL) parity: word-tap, dense-page easing, and
sentence-level reveal already support English (shipped 2026-06-14). The **Full
translation page** (whole-document paragraph→translation) is the last surface still
hardcoded Malay→English. Same direction-fix shape as the sentence-reveal increment,
so it's low-risk.

> Builds on (live): `1f3a2f6` (dense-page easing), `237545f` (sentence-level reveal),
> the reusable `plan`/`isEn`/`revealLabel` already in `PDFReader.jsx`.

---

```text
You are continuing the IGCSE Malay Master app. Read RESUME_HERE.md and CLAUDE.md
first (esp. the N1 EXCEPTION note + "True English study mode"). Follow the working
agreement: TDD (red-proof first), surgical diffs, the pre-commit gate stays green,
RESUME_HERE.md updated in the same commit, decide-and-flag every call (decision +
why + one-line veto note) — questions only for destructive ops / money / invariants.

GOAL: make the reader's Full-translation page (FullTranslationView) work for English
(0510 ESL) docs. Today it is Malay-only:
  • both translateDocument calls (FullTranslationView.jsx:47 revealOne, :69 revealAll)
    pass NO from/to → translateDocument defaults ms→en (wrong direction on an English
    doc — it would echo English back as if it were Malay).
  • the entry button is gated OFF for English in PDFReader.jsx
    (fullTranslationDisabled = isEn || docLang === 'en' — set this way deliberately in
    the sentence-reveal increment so it never wrong-direction-translated).
  • the copy is hardcoded "English" ("Show English", "Reveal English for this
    paragraph", "reveal the English to check your understanding", etc.).

For an ENGLISH learner reading an English doc, the Full-translation page should reveal
the whole document's MALAY (L1) translation — the same comprehension aid as
sentence-reveal, but paragraph-by-paragraph for a whole document.

DESIGN — pre-resolved (confirm/veto, then code):
1. Direction — pass plan.from/plan.to (PDFReader already computes `plan`) into
   FullTranslationView as `from`/`to` props; thread them into BOTH translateDocument
   calls. Default the props to 'ms'/'en' so a standalone mount = the shipped behaviour.
   Veto: en→en is a no-op.
2. Un-gate — make fullTranslationDisabled SYMMETRIC, mirroring sentenceDisabled:
   fullTranslationDisabled = docLang === (isEn ? 'ms' : 'en'). Malay learner →
   docLang === 'en' (byte-identical: still hidden on an English doc, the shipped
   behaviour pinned by full-translation.spec.js "English document hides the entry").
   English learner → shown on an English/unknown doc, hidden on a clearly-Malay one.
   Veto: leaving it Malay-only blocks the whole point.
3. Copy — a `revealLabel` prop (default 'English' ⇒ Malay byte-identical; PDFReader
   passes isEn ? 'Malay' : 'English'), flipping the paragraph reveal/hide labels +
   the "read the X first, reveal the Y" notice. Label-only.

READ FIRST: src/components/FullTranslationView.jsx (the two translateDocument calls +
the copy); PDFReader.jsx (fullTranslationDisabled :916, the <FullTranslationView>
props :1461, `plan`/`isEn`/`revealLabel`); tests/e2e/full-translation.spec.js (the
shipped suite incl. "English document hides the entry" — must stay green);
tests/e2e/{dense-page-nudge,sentence-reveal}.spec.js (english-doc.pdf patterns).

DON'T BREAK: the gloss→FSRS core; the Malay Full-translation page (byte-identical for
isEn=false — props default to ms→en, gate collapses to docLang==='en'); the dense-page
easing + sentence-reveal just shipped; the N1 word-level gloss path.

DONE (measurable):
- With studyLang='en' on an English doc, the "Full translation" entry is visible,
  revealing a paragraph fetches its MALAY translation (request carries sl=en&tl=ms,
  not ms→en), and the labels say "Malay".
- Malay Full-translation page byte-identical (full-translation.spec.js stays green,
  incl. "English document hides the entry" for a Malay learner).
- TDD: a red-proofed gated unit test pinning FullTranslationView threads from/to into
  translateDocument (mount + mock the module). PLUS a new e2e (studyLang='en',
  english-doc.pdf) proving en→ms end-to-end for the Full-translation page AND
  (regression-covering the prior increment) sentence-reveal.
- Gate green (build + test:run + lint). CLAUDE.md + RESUME_HERE.md updated.

Start by stating what RESUME_HERE.md says is current, then confirm/adjust the 3
pre-resolved forks with veto notes, before writing code.
```
