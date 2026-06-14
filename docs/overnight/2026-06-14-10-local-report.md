# Local build-loop report — 2026-06-14 10:xx UTC (18:xx KL)

**Loop:** `docs/LOCAL_BUILD_LOOP.md`, cycle 1. Fresh `/loop` session, time-boxed to the 7pm KL cutoff.

## Item shipped
**AWL Sublist 2 academic seed** — the first unchecked queue item in `RESUME_HERE.md`.
Free, no-key, on-device academic English deck (the next 60 Coxhead AWL families after Sublist 1) —
the sophisticated/academic register the IGCSE writing grader rewards. Mirrors the just-shipped
Sublist 1 pattern exactly.

## Decision log
- **Labelled second set, not one combined deck** (the one fork the queue flagged). Distinct
  `academicEn2.js` + `seedAcademicEnglish2` action + a separate **"Academic English 2"** deck.
  *Why:* keeps the Sublist 1 path byte-identical (no refactor-regression; "mirror EXACTLY / surgical")
  and the Settings count-check unambiguous (`c.t === 'Academic English 2'`). *Veto on combined deck:*
  would force refactoring the shipped action OR a 60-vs-120 ambiguous count. v34 scopes Study by `lang`
  not deck `t`, so both academic decks study together in one English session — the label is
  organizational only. AWL sublists are disjoint → no `m` collision.
- **Settings UI** refactored into a DRY inner `AcademicSublistRow` (two graded rows, no chrome drift)
  rather than duplicating the button/state block.

## Content grounding (web-verified, not memory-asserted)
- **Headword list:** verified against eapfoundation.com (the same source the Sublist 1 answer-key test
  cites) — matches the canonical Coxhead AWL Sublist 2 (60 words).
- **Non-obvious Malay glosses, web-checked:** `administrate`→mentadbir, `regulate`→mengawal selia,
  `consequent`→berikutan/akibat, `perceive`→menanggap/menyedari, `commission`→suruhanjaya/komisen.
  The rest are cognates or standard DBP register.

## Red → green evidence
- **Red:** ran the two new test files before implementing → both failed with
  `Failed to resolve import "../../data/academicEn2"` (module missing) — the right reason.
- **Green:** after writing `academicEn2.js` + the store action → `9 passed (9)` in the two new files.

## Gate result (`build && test:run && lint`)
- **build:** green. `academicEn2` = its own **5.13 KB** lazy chunk (mirrors Sublist 1's 5.08 KB); eager
  `index` unchanged.
- **test:run:** **1397 passed** (+9 from this item).
- **lint:** 0 errors, 3 pre-existing exhaustive-deps warnings (unchanged).

## Hard-limits / self-review
No STORE_VERSION bump (new action, no persisted schema). No Supabase-schema or free-path break. No
feature deleted. `instruct.js` untouched. No `ms` leak (test-pinned). Theme-safe (all `var(--color-*)`).
Default `studyLang='ms'` → component hidden, byte-identical to before. Working tree scoped to the one
item (6 files).

## Files
- `src/data/academicEn2.js` (new, 60 entries)
- `src/data/__tests__/academicEn2.test.js` (new, +5)
- `src/store/__tests__/seedAcademicEnglish2.test.js` (new, +4)
- `src/store/useStore.js` (+`seedAcademicEnglish2`)
- `src/pages/Settings.jsx` (`AcademicEnglishSeed` → two graded rows + `AcademicSublistRow`)
- `public/CREDITS.txt` (attribution widened to AWL Sublists 1 + 2)
- `RESUME_HERE.md` (queue item `[x]` + shipped section)

## Deploy
Committed to `main` (= prod deploy). Confirm Vercel READY on `upg-igcse-malay-master`.
