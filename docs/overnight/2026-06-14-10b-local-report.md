# Local build-loop report — 2026-06-14 ~10:27 UTC (18:27 KL)

**Loop:** `docs/LOCAL_BUILD_LOOP.md`, cycle 2. Same fresh `/loop` session, before the 7pm KL cutoff.

## Item shipped
**AWL Sublist 3 academic seed** — second unchecked queue item. Third free, no-key, on-device academic
English deck (the next 60 Coxhead AWL families after Sublist 2). Exact mirror of the Sublist 2 pattern
shipped in cycle 1.

## Decision log
- Same labelled-deck design as Sublist 2: distinct `academicEn3.js` + `seedAcademicEnglish3` action +
  "Academic English 3" deck + a third `AcademicSublistRow`. Keeps Sublists 1 & 2 byte-identical and the
  count-check unambiguous. v34 scopes Study by `lang`, so all three academic decks study together in one
  English session.

## Content grounding (web-verified)
- **Headword list:** verified against eapfoundation.com — matches the canonical Coxhead AWL Sublist 3
  (60 words). The answer-key test also pins it **disjoint from Sublists 1 + 2**.
- **Non-obvious Malay glosses web-checked:** deduce→menyimpulkan, convene→mengadakan, negate→menafikan,
  imply→membayangkan, constrain→mengekang, compensate→memberi pampasan, correspond→sepadan,
  immigrate→berhijrah. Rest cognate/standard DBP.

## Red → green evidence
- **Red:** ran the two new test files before implementing → `Cannot find module '../academicEn3'`
  (module missing) — the right reason.
- **Green:** after writing `academicEn3.js` + the action → `9 passed (9)` in the two new files.

## Gate result (`build && test:run && lint`)
- **build:** green. `academicEn3` = its own **5.23 KB** lazy chunk; eager `index` unchanged.
- **test:run:** **1406 passed** (+9 from this item).
- **lint:** 0 errors, 3 pre-existing exhaustive-deps warnings (unchanged).

## Hard-limits / self-review
No STORE_VERSION bump. No Supabase-schema / free-path break. No feature deleted. `instruct.js` untouched.
No `ms` leak (test-pinned). Theme-safe (reused `AcademicSublistRow`, all `var(--color-*)`). Default
`studyLang='ms'` → component hidden, byte-identical.

## Files
- `src/data/academicEn3.js` (new, 60 entries)
- `src/data/__tests__/academicEn3.test.js` (new, +5)
- `src/store/__tests__/seedAcademicEnglish3.test.js` (new, +4)
- `src/store/useStore.js` (+`seedAcademicEnglish3`)
- `src/pages/Settings.jsx` (third `AcademicSublistRow`)
- `public/CREDITS.txt` (attribution widened to AWL Sublists 1–3)
- `RESUME_HERE.md` (queue item `[x]` + shipped section)

## Deploy
Committed to `main` (= prod deploy). Confirm Vercel READY on `upg-igcse-malay-master`.

## Cumulative (this loop)
180 free academic words now available across 3 graded "Academic English" decks (Sublists 1–3).
