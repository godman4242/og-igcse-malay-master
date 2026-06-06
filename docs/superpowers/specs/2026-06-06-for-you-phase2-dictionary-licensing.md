# For You Phase 2 — dictionary-grounding licensing decision (2026-06-06)

Resolves the open licensing question blocking Phase 2 (spec §7 caveat, plan
"PHASE 2 Step 1 — resolve CC-BY-SA first"). Companion to
`2026-06-06-personalized-for-you-design.md` §5.4/§7. **Researched + decided
2026-06-06; web-sourced, not from memory.**

---

## TL;DR (the decision)
1. **v1 grounding source = OWNED data only** — the project's existing
   `src/data/dictionary.js` (~495 hand-curated MS↔EN pairs) + the learner's own
   cards. **Zero licensing risk, ships immediately.** AI-proposed pairs that match
   owned data → auto-accept; everything else → **learner-in-the-loop confirm**
   (the spec already forbids silently shipping an unverified pair). This is a
   sufficient accuracy gate for the MVP.
2. **Coverage expansion = a SEPARATE, later data task** (do NOT couple it to
   shipping Phase 2). When we do it, in preference order:
   - **CC0 Wikidata lexemes** (public domain — bundle/commit freely, no
     attribution, no ShareAlike). Pending a MS↔EN **coverage check** (lexeme
     coverage is thinner than Wiktionary; Malay vs Indonesian lexemes are separate).
   - **else server-side validation** against a Wiktionary/kaikki-derived set held
     **only on the server** (Supabase edge function): validate pairs, return a
     verified/flagged boolean, **never ship or commit the dataset**. Add a
     courtesy attribution/credits line regardless (good practice + cheap).
3. **DO NOT** commit a kaikki/Wiktionary-derived word-list into this repo, or
   bundle one into the client JS. **The repo is PUBLIC** (`godman4242/
   og-igcse-malay-master`, verified 2026-06-06) → that is public distribution →
   it triggers CC-BY-SA ShareAlike + attribution **on our derived file** (others
   could then reuse our list under CC-BY-SA, and we'd owe attribution). This is
   the single move to avoid.

**Net: Phase 2 can start NOW with no licensing dependency** — build `verifyPair`
against owned data (TDD); treat external-dictionary coverage as deferred.

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
