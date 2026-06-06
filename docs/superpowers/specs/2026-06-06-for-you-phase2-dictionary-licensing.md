# For You Phase 2 — dictionary-grounding licensing decision (2026-06-06)

Resolves the open licensing question blocking Phase 2 (spec §7 caveat, plan
"PHASE 2 Step 1 — resolve CC-BY-SA first"). Companion to
`2026-06-06-personalized-for-you-design.md` §5.4/§7. **Researched + decided
2026-06-06; web-sourced, not from memory.**

---

## TL;DR (the decision — UPDATED 2026-06-06 after evaluating iannho/Malay-Dataset)
**Two independent constraints, often conflated: (a) LICENSE — may we redistribute
it? (b) TRUST — is the data correct enough to be an ACCURACY authority?** A
grounding gate's whole job is trust, so trust dominates. The best gate is
**layered, all-permissive, mostly client-side** — higher quality AND simpler than
a server-side Wiktionary build:
1. **Tier 1 — OWNED `src/data/dictionary.js` (~495 curated MS↔EN pairs) + learner
   cards.** Exact pair match → **auto-verify** (highest trust, zero license risk).
2. **Tier 2 — bundle a permissive monolingual Malay word-list as a VALIDITY check.**
   `iannho/Malay-Dataset` `dictionary/Malays.dic.txt` = 24,550 curated real Malay
   words (hunspell format), **CC-BY 4.0** per its README → bundle-safe with an
   attribution/credits line. Confirms the AI's Malay word is a REAL word (catches
   invented non-words). Does NOT confirm the translation → medium confidence.
3. **Tier 3 — trusted bilingual coverage (optional, later): CC0 Wikidata lexemes**
   (public domain, human-edited; bundle-safe; pending MS↔EN coverage check). For
   true translation verification of the long tail.
4. **Tier 4 — learner-in-the-loop confirm** for anything unverified. Never silent-ship.

**Net: Phase 2 starts NOW with no licensing dependency** — `verifyPair` is a pure,
source-agnostic lookup (Tier 1 + confirm) shippable immediately; Tiers 2/3 layer in
as separate increments.

### What changed the plan: iannho/Malay-Dataset (evaluated 2026-06-06)
- **License = permissive** (README says CC-BY 4.0; GitHub detects Apache-2.0 LICENSE
  — both attribution-only, NO ShareAlike). So unlike kaikki/Wiktionary, we CAN
  bundle/commit derivatives into this PUBLIC repo with just an attribution notice.
- **BUT its bilingual translations are LOW-TRUST.** The `200k-english-malay` set is
  `[["en","ms"], …]` but visibly machine-translated: untranslated tokens
  (`["anarch","anarch"]`), nonsense (`["unhoodwink","unitywink"]`), and semantic
  errors (`["divinator","penyelam"]` = *diver*). README confirms it's MT-bootstrapped
  + "Not an official release from Dewan Bahasa." **Using it as a translation
  authority would auto-verify WRONG pairs and teach wrong Malay → violates the
  learning-quality-first invariant.** DO NOT use bulk MT lists as the accuracy truth.
- **Its monolingual `Malays.dic.txt` (24.5k real Malay words) IS usable** — as a
  validity signal (Tier 2), not a translation source.

### Why NOT a big bundled translation list (answers "why not just copy-paste?")
Two reasons, both must hold to bundle: license AND trust. Permissive-but-noisy
(iannho 200k) fails trust; high-trust-but-copyleft (Wiktionary/kaikki, CC-BY-SA in
a PUBLIC repo) fails license. The intersection of high-trust AND bundle-safe is:
owned data, a permissive curated word-list (validity only), and CC0 Wikidata.

**The one move to avoid:** committing/bundling a kaikki/Wiktionary-derived (CC-BY-SA)
word-list — the repo is PUBLIC (`godman4242/og-igcse-malay-master`, verified
2026-06-06), so that's public distribution → ShareAlike + attribution attach to our
file. (If we ever want Wiktionary's coverage, do it SERVER-SIDE: edge function holds
the set, ships only a boolean — internal use, ShareAlike doesn't attach.)

---

## The facts (web-sourced 2026-06-06)
- **kaikki.org / wiktextract data is Wiktionary-derived → CC-BY-SA (+ GFDL).**
  kaikki's own raw-data page only *requests* academic citation of the Wiktextract
  paper + a courtesy link, but the underlying Wiktionary **content** is CC-BY-SA,
  so reuse must comply with CC-BY-SA. (Software in `wiktextract` itself is
  permissively licensed, but that's the *extractor tool*, not the *data*.)
- **CC obligations trigger on DISTRIBUTION / sharing, not private use.** Per the
  CC FAQ: license terms are *not* triggered by uses that fall outside copyright's
  scope; private internal use does not activate attribution/ShareAlike. So the
  decisive axis is **"do we distribute the licensed data (or an adaptation)?"**,
  NOT "runtime vs build-time."
- **For a web app, "bundled client-side asset" = distribution.** The spec's
  "build-time-generated local lookup" shipped in the client bundle would be
  redistribution of a CC-BY-SA adaptation → ShareAlike + attribution attach to
  that file. **Server-side-only** use (edge function holds the set, ships only a
  boolean) is internal use → ShareAlike does **not** attach.
- **CC-BY-SA 4.0 covers databases** (sui generis database rights licensed on the
  same terms); sharing a substantial portion of an adapted database carries the
  full attribution + ShareAlike obligation.
- **Wikidata lexemes are CC0** (public-domain dedication) — no attribution, no
  ShareAlike, reuse without permission. Ideal for bundling **if** MS↔EN coverage
  is adequate (the open question).
- **mesolitica / malaysia-ai `malaysian-dataset`** is a mixed-license collection
  (speech/translation/instruction); **no clean, single-license MS↔EN dictionary
  was found** there — not a drop-in alternative. Don't assume CC-BY without
  checking the specific sub-dataset.

## Why owned-data-first is the right MVP
- It removes the only blocker (licensing) from the Phase 2 critical path.
- The grounding gate's job is to stop the AI silently shipping a wrong pair —
  matching against ~495 curated pairs + the learner's cards already catches the
  common cases; unknowns become a one-tap "keep which?" prompt (spec §5.4), which
  is the desired UX anyway (learner-in-the-loop, never silent-ship).
- Coverage is a *quality* dial we can turn later with a CC0 or server-side source,
  without re-architecting `verifyPair` (it stays a pure lookup + a boolean).

## Open items (not blockers)
- **CC0 Wikidata MS↔EN coverage check** — before choosing it as the expansion
  source, query lexeme coverage for common IGCSE vocabulary (separate data task).
- If we ever expand the bundled base dictionary itself (parked "base-dictionary
  expansion" task), apply the SAME rule: CC0/owned → commit freely; CC-BY-SA →
  don't commit to this public repo.

## Sources
- [kaikki.org raw data](https://kaikki.org/dictionary/rawdata.html) · [kaikki.org index](https://kaikki.org/dictionary/index.html)
- [Creative Commons FAQ](https://creativecommons.org/faq/) · [CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode)
- [Wikidata:Lexicographical data](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data) (CC0) · [Wikidata](https://en.wikipedia.org/wiki/Wikidata)
- [malaysia-ai/malaysian-dataset](https://github.com/mesolitica/malaysian-dataset)
- [iannho/Malay-Dataset](https://github.com/iannho/Malay-Dataset) (CC-BY-4.0 / Apache-2.0; Malaya project mirror) — `dictionary/Malays.dic.txt` = 24.5k real Malay words (usable validity list); `dictionary/200k-english-malay` = MT-noisy translations (NOT a trust authority)
