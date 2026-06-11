# Bundle baseline note — 2026-06-11 (manual session, for the nightly quality-watch)

Not a builder run — a manual, human-supervised session. Recorded here because the
nightly quality-watch reads `docs/overnight/` for `BASELINE CHANGE` declarations before
flagging bundle sizes. This supersedes the 2026-06-08 quality-watch issues #3/#4 (now
closed).

## BASELINE CHANGE — bundle sizes (commit 9b95fa8)

- **Per-route PAGE chunks are back UNDER the 70 KB budget** (the #3/#4 violations are fixed
  by code-splitting, not re-baselining): **`Writing-*` 88 → ~44 KB**, **`Roleplay-*` 92 → ~67 KB**.
  Lazy subtrees were split off: `RoleplaySession-*` (AI session, off the Roleplay picker),
  `ExemplarPanel-*` + `exemplars.js` and `WritingTutor-*` (off the Writing route).
- **`writingGrader-*` (~77 KB) is NOT a per-route violation — do NOT flag it.** It is a
  SHARED, analyze-time helper chunk (the regex grading lexicons: `writingErrors` +
  `writingErrorsMalay`), loaded once and cached — not a per-navigation page cost. The
  2026-06-08 reports mis-listed it under "per-route chunks"; it is exempt from the <70 KB
  per-route rule by design. (Forcing it under budget would make a synchronous grading hot
  path async across 3 callers — worse engineering for a number.) Only flag it if it GROWS
  notably (say, past ~96 KB).
- Other exempt SHARED / on-demand chunks (load once, cached — not per-route): the
  `wikidata`/dictionary data chunk (~120 KB), the `pdf` chunk (~330 KB), and the lazy guide
  chunks (`guideController-*`, `tourSteps-*`, `driver.js-*`).
- **`index-*.js` baseline is now ~457 KB raw / ~147 KB gz** (was ~451/145; the +~6 KB is the
  always-eager `GuideOffer` first-run UI shipped with the user guide, commit bddc9b3). Within
  the watch's ~15% tolerance; flag only past ~526 KB.

The CLAUDE.md "Verification" note now encodes this per-route-vs-shared distinction.

---
REVIEWED: 2026-06-11 (Kheshav, live session). Manual baseline declaration; no builder work.
