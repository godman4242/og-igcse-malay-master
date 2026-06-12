# Exam Rehearsal — Paper-4 Listening stage (review feature #4, score 8)

**Shipped 2026-06-13.** Built test-first in one autonomous loop iteration. Gate green
(build · 1079 unit tests · lint 0 errors · content).

## Why
The 30-min Exam Rehearsal simulated only 3 of the 4 IGCSE-assessed skills
(comprehension + writing + speaking). The app already had 8 TTS listening passages
(`src/data/listeningPassages.js`) and a working `/listening` page, but listening was
not part of the rehearsal's composite **Readiness %**. Adding it makes the rehearsal
cover all four skills.

## Design forks (decide-and-flag)

### 1. How listening folds into the readiness formula — **the load-bearing decision**
The composite scorer was **duplicated** (inline in `ExamRehearsal.finishRehearsal` AND
`useStore.getExamReadiness.compose`). Extracted to one pure, tested module
`src/lib/examReadiness.js` → `composeReadiness(attempt)`; both callers now use it.

- **DECISION:** base weights comprehension 0.30 / writing 0.35 / speaking 0.35 /
  **listening 0.30** (listening = comprehension's twin — both receptive). Folded via
  **present-component normalisation**: divide by the summed weight of the components the
  attempt actually has. Listening is included only when `attempt.listeningPct != null`.
- **Consequence (why this is safe):** a pre-listening attempt (no `listeningPct`)
  normalises over comp+writing+speaking (weights sum 1.0) → **byte-identical** to the old
  formula, so historical readiness % never shifts. **No data migration, no STORE_VERSION
  bump.** A 4-skill attempt weights listening 0.30/1.30 ≈ 23%.
- **VETO:** to make listening count more/less, change `READINESS_WEIGHTS.listening` (one
  constant). Equal-quarters would be 0.25 each.
- Pinned: `src/lib/__tests__/examReadiness.test.js` (backward-compat vs the old formula;
  null-vs-0 listeningPct distinction; 1.30 normalisation; null/all-zero → 0).

### 2. No-TTS fallback
- **DECISION:** if `hasSpeechSynthesis()` is false, **skip the listening stage** entirely
  (flow stays COMP → WRITE → SPEAK; `listeningPct` absent → readiness normalises over 3).
  Leverages the normalisation rather than faking "listening" with visible text.
- **VETO:** add a text-reading fallback stage later if we want listening to always run.

### 3. Stage order & UX
- **DECISION:** COMP → **LISTEN** → WRITE → SPEAK (groups the two receptive MCQ tasks).
  6-min soft budget. Audio-only: transcript hidden, ≤2 plays (2nd slower, rate 0.95→0.85),
  questions unlock after ≥1 play — mirrors the `/listening` page. No mid-stage feedback
  (exam realism); review at RESULTS. Picker: `pickRehearsalListening` in `examPassages.js`
  (pure, rand-injectable, single-language — mirrors `pickRehearsalPassage`).
- Pinned: `src/lib/__tests__/examPassages.test.js` (eligibility + single-language + null).

## Files
- `src/lib/examReadiness.js` (new, pure) + test
- `src/lib/examPassages.js` (`eligibleListening` + `pickRehearsalListening`) + test
- `src/store/useStore.js` (getExamReadiness uses composeReadiness; logExamAttempt carries `listeningPct`)
- `src/pages/ExamRehearsal.jsx` (LISTEN stage, player, scoring, results tile, intro copy)

## Not verified by automation (flagged for a human eye)
The pure cores are unit-tested red-green; the UI stage is covered by build + lint + the
proven COMP/Listening patterns it mirrors, **not** a component/e2e test (repo norm: pages
aren't unit-tested). Worth a manual pass on prod: TTS playback + replay-limit, the 4-tile
results grid, and dark/light. A `tests/e2e/exam-rehearsal-listening.spec.js` is a good
follow-up.
