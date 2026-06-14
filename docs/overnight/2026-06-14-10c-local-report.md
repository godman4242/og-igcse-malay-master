# Local build-loop report — 2026-06-14 ~10:33 UTC (18:33 KL)

**Loop:** `docs/LOCAL_BUILD_LOOP.md`, cycle 3. Same fresh `/loop` session, before the 7pm KL cutoff.

## Item shipped
**Voice/locale leak audit** — third unchecked queue item. Swept the study/reader/speaking paths for
hardcoded `ms-MY` and fixed the one remaining genuine English-card locale leak.

## The leak (fixed)
`src/components/SelectionToCard.jsx` — the universal select→card popover (the reader's English Select-mode
path) had a Pronounce button hardcoded `speak(malay || state.term, 'ms-MY')`. An English learner selecting
an English word heard the Malay gloss (post-translate) or the English word in a Malay voice (pre-translate).

## Fix
`speak(state.term, localeFor(state.source))` — pronounce the visible selected term (line 195 shows
`state.term`) in its detected source language. `localeFor` is the canonical locale source. Malay path is
byte-identical (`source==='ms'` → `malay===state.term`, `localeFor('ms')==='ms-MY'`).

## Full audit conclusion (decide-and-flag — why this is the ONLY leak)
Every other hardcoded `ms-MY` is NOT a leak:
- Already `lang`-aware ternaries: Comprehension, Listening, Dictation, ClozeListening, ExamRehearsal,
  Speaking, Roleplay, RoleplaySession.
- Correct-by-design Malay-domain: CikguBot (Cikgu Maya Malay tutor), WordFamilyTree (Malay families),
  SavedWordPopover (Malay reveal-gated reader's saved-word review — `language:'ms'` hardcoded there too).
- Prop default the caller overrides: ForYou Shelf `locale='ms-MY'` (caller passes `localeFor(studyLang)`).

So the audit is complete → item retired. Flagged a distinct out-of-scope gap: SelectionToCard still creates
a Malay-target card (`m: malay`) regardless of `studyLang` — a card-DIRECTION issue, not a locale leak.

## Red → green evidence
- **Red:** ran the structural pin before the fix → both assertions failed (hardcode `'ms-MY'` present,
  `localeFor` not imported).
- **Green:** after the import + one-line change → `2 passed (2)`.

## Gate result (`build && test:run && lint`)
- **build:** green (eager `index` unchanged).
- **test:run:** **1408 passed** (+2 from this item).
- **lint:** 0 errors, 3 pre-existing exhaustive-deps warnings (unchanged). `malay` still used in card
  creation → no unused-var.

## Hard-limits / self-review
No STORE_VERSION bump. No schema/free-path break. No feature deleted. `instruct.js` untouched. Malay path
byte-identical (test-reasoned). Theme/UI untouched.

## Files
- `src/components/SelectionToCard.jsx` (import `localeFor` + one-line speaker fix)
- `src/components/__tests__/selectionToCardLocale.test.js` (new, +2 structural)
- `RESUME_HERE.md` (queue item `[x]` + shipped section)

## Deploy
Committed to `main` (= prod deploy). Confirm Vercel READY on `upg-igcse-malay-master`.
