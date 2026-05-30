# Speaking Progression v1 — Design Spec

**Status:** APPROVED design — ready for implementation plan
**Date:** 2026-05-30
**Author:** Claude + Kheshav (brainstorm session)
**Source brief:** `docs/superpowers/specs/2026-05-29-speaking-pillar-opportunity-brief.md` §3
**Checkpoint:** built on HEAD `9a7ccc8` (clean, 284 vitest pass)

---

## 1. Goal & student outcome

Speaking *mechanics* are already mature (turn-based roleplay, dual-layer
heuristic+AI grader, word-level pronunciation diff, exam band, history). The
missing thing is **the loop over time**: today every attempt is graded in
isolation, so a student can't *feel* improvement.

This v1 delivers the **"I'm getting better"** outcome (brief §2 #1) plus a light
slice of **spaced re-attempt** (#2):

- a **band trend** ("best 5 · recent avg 4.2 · ↑ from 3") with a small sparkline,
- a **recurring-weakness readout** ("your most common gap: few connectors"),
- a **"due for another go"** list of 2–3 weak/stale topics that deep-link into
  the existing `/speaking` flow.

Exam-realism (#3) and a full per-topic mastery model are **explicitly out of
scope** (see §8). Bring-Your-Own-Key (BYOK, feature B) is a **separate
follow-on spec**; this design only leaves a documented, inert hook for it.

### Non-goals (do NOT build here)

- No new study mode, no timed mock, no roleplay changes.
- No per-topic mastery scores / weakness clustering engine (overlaps the
  existing mistake pipeline — see brief §3.2). Deferred.
- No new Gemini calls. No BYOK UI. No store migration. No DB schema change.

---

## 2. Guiding constraints

- **$0 / client-side.** No new AI calls, no new dependency.
- **No `STORE_VERSION` bump.** The one new field (`weak`) is an optional
  additive property on speaking records; records that lack it degrade
  gracefully. Speaking records persist as a whole-object **JSONB `entry`
  column** in Supabase (`cloudSync.js:128`), so adding a field is pure
  additive JSONB — no column, no schema drift (contrast the 2026-05-29
  `user_cards.deleted` saga; that risk class does not apply to JSONB-blob
  tables).
- **Bundle-safe.** `patterns.js` is imported by the *eager* Dashboard. It must
  NOT import `speakingGrader.js`/`gemini.js` (would pull the grader + writing
  word-lists into `index-*.js`). The weakness readout therefore reads the
  **stored** `weak` flags rather than re-deriving — see §4.2.
- **Reuse, don't rebuild.** `src/lib/patterns.js` already has
  `weakestSpeakingTopics`, `worstSpeakingSession`, `rollingActivity`. Extend it.
- **React-19 purity & store conventions.** No `Date.now()` in render/useState
  init (wrap in `useMemo(() => Date.now(), [])`); never call store getters
  inside a Zustand selector; never allocate inside a selector (read the slice
  ref, derive in `useMemo`).
- **Theming.** Colours via `var(--color-*)` only; dark + light must both work.
  Tap targets ≥44px.

---

## 3. Data already available (no new state)

Each speaking attempt is stored in `speakingHistory` (capped last 100) by
`logSpeakingSession` (`useStore.js:811`):

```
{ id, ts, topicId, band, durationSec, wordCount, transcript (≤1000 chars), lang }
```

The heuristic grader (`speakingGrader.js:heuristicGrade`) computes — but does
**not** currently persist — these per-attempt metrics:

```
band, wordCount, sentenceCount, durationSec, wordsPerSec,
fillerCount, markerCount, formalCount, uniqueWordRatio,
cuesHit, cuesTotal, tips[]
```

Weak sessions (band ≤3) already pipe up to 3 tips into the mistake journal
(`Speaking.jsx:174-184`) — this v1 does **not** touch that path.

Topics live in `src/data/speakingTopics.js`: `TOPICS` (MS) + `TOPICS_EN`, each
`{ id, title, titleEn, prompt, cues[], expectedDurationSec }`.

---

## 4. Architecture

Five small, well-bounded units.

### 4.1 `src/lib/speakingGrader.js` — add `weaknessFlags` (pure)

```js
// Map one heuristic result + its topic to a list of named weakness
// categories. Pure; reads only metrics heuristicGrade already computed,
// so it adds NO new dependency. Single source of truth for "what was weak".
export function weaknessFlags(h, topic) // -> string[]
```

Categories (return the ones that apply):

| Category | Condition (from `h` + `topic`) |
|---|---|
| `tooShort`    | `h.durationSec < (topic?.expectedDurationSec ?? 75) * 0.7` |
| `disfluent`   | `h.wordsPerSec < 1.4 \|\| h.wordsPerSec > 2.8` |
| `fewMarkers`  | `h.markerCount < 2` |
| `weakVocab`   | `h.formalCount < 2` |
| `repetitive`  | `h.uniqueWordRatio < 0.45` |
| `fillerHeavy` | `h.fillerCount > Math.max(3, Math.round(h.wordCount * 0.04))` |
| `missedCues`  | `h.cuesTotal > 0 && h.cuesHit / h.cuesTotal < 0.75` |

(Thresholds mirror the existing banding booleans in `heuristicGrade` so the
flags never contradict the band.) **Must not import `patterns.js`** (one-way
dependency).

### 4.2 `src/pages/Speaking.jsx` — store exact flags at log time (1 line + import)

The log site (`Speaking.jsx:166`) already holds the full heuristic `h` and the
`topic`. `Speaking.jsx` already imports `heuristicGrade` from
`../lib/speakingGrader` — **add `weaknessFlags` to that existing import** (do
not create a second import line). Then add the exact flags to the logged record:

```js
// existing import, now: import { heuristicGrade, weaknessFlags } from '../lib/speakingGrader'
logSpeakingSession?.({
  topicId: topic.id,
  band: h.band,
  durationSec: h.durationSec,
  wordCount: h.wordCount,
  transcript: fullTranscript.slice(0, 1000),
  lang,
  weak: weaknessFlags(h, topic),   // NEW — exact, from untruncated heuristic
})
```

Why store rather than re-derive: re-running the heuristic later would use the
**truncated** transcript (≤1000 chars) and drift on long answers; computing at
log time uses the full text and is exact. Stored as JSONB → safe (§2).

### 4.3 `src/lib/patterns.js` — three new pure helpers

`patterns.js` stays dependency-light (no grader import). All helpers are pure,
no React, no module-scope `Date.now()`.

```js
// Last-N per-attempt bands for one language, plus a headline summary.
// best / avg are computed over the SAME last-N window (i.e. "recent",
// not all-time), so the headline is internally consistent. avg rounded
// to 1 dp. delta = last - first of the windowed series.
export function speakingBandSeries(speakingHistory, { lang, n = 8 })
// -> { lang, bands: number[], first, last, delta, best, avg, count }

// Weakness signal over recent attempts (one language), using the stored
// record.weak flags. Records WITHOUT a `weak` array are not counted
// (forward-looking signal). `tallied` = number of windowed records that
// HAVE a `weak` array (clean band-6 attempts count, contributing 0 flags).
// `top` = the most frequent categories (length 0–2); the widget renders
// top[0], the 2nd is reserved for the future AI slot.
export function recurringSpeakingWeakness(speakingHistory, { lang, window = 12 })
// -> { tallied: number, flagTotal: number, top: [{ category, count }] }

// Topics worth another go (one language), excluding topics practised TODAY.
//   - reason 'weak'  : most recent band ≤ 3  (surfaced regardless of recency)
//   - reason 'stale' : last practised ≥ 3 days ago (spaced re-attempt;
//                      a strong-but-recent topic is NOT nagged)
// Ranked weak-first, then oldest-first. Capped at `limit`.
export function topicsDueForReattempt(speakingHistory, now, { lang, limit = 3 })
// -> [{ topicId, lastBand, lastTs, reason: 'weak' | 'stale' }]
```

- `speakingBandSeries` / `topicsDueForReattempt` only read `band/ts/topicId/lang`
  → work retroactively on **all** existing records.
- `recurringSpeakingWeakness` reads `record.weak` → only counts new-format
  records. The widget picks one of three states from `{ tallied, flagTotal,
  top }` (§4.4).
- `lang` scoping: filter records by `lang` (treat `'en'|'eng'` as English, else
  Malay), matching the grader's own normalisation.

### 4.4 `src/components/dashboard/SpeakingProgress.jsx` — new widget

Self-contained, mirrors `DailyPlan.jsx` / `WorstTurnWidget.jsx` conventions.

- Reads its own slice: `const speakingHistory = useStore(s => s.speakingHistory)`.
  `now` via `useMemo(() => Date.now(), [])`. All derived values in `useMemo`
  keyed on `[speakingHistory, scopedLang]` (no allocation in selectors).
- **Language scope:** default = most-recent attempt's language. Render a small
  MS/EN toggle **only** when both languages have ≥2 attempts.
- **Gate:** render nothing unless the scoped language has ≥2 attempts.
- **Headline stat** (primary): `Best {best} · recent avg {avg} · {arrow} from {first}`.
  Sample-size honesty:
  - 2 attempts → "nascent": show best/avg, no trend arrow, microcopy "one more
    for a trend".
  - 3–4 → "emerging": show arrow.
  - 5+ → "trend": show arrow + sparkline.
- **Sparkline** (secondary): inline `<svg>`, polyline over `bands`, y-domain
  1–6, stroke `var(--color-accent)`, `aria-label` describing the series (the
  headline is the text fallback). No new dependency; honours the
  "no framer-motion in `index`" rule.
- **Recurring weakness (three states, from `{ tallied, flagTotal, top }`):**
  1. `tallied < 2` → **transitional**: "Log a couple more attempts to surface
     your recurring weakness." (not enough new-format records yet).
  2. `tallied >= 2 && flagTotal === 0` → **balanced/positive**: "No recurring
     weakness — your recent attempts are well-rounded. Keep it up." (do not show
     a discouraging "log more" message to a strong student).
  3. `tallied >= 2 && top[0]` → **weakness**: "Most common gap: {label}" +
     one-line {fixHint}.
  Labels & fixHints come from a local bilingual `WEAKNESS_COPY[category][lang]`
  map (keys = the §4.1 categories). All three states' copy is bilingual
  (scoped lang).
- **Due for another go:** up to 3 chips (≥44px), each `topic.title` (scoped
  lang), onClick → `navigate('/speaking', { state: { topicId } })`
  (target read at `Speaking.jsx:30`). Section hidden if list empty.
- **AI-coach slot (inert in v1):** local
  `function aiCoachAvailable() { return false } // feature B (BYOK) flips this`.
  Button only rendered when it returns true → renders nothing now. Documented
  contract: feature B wires it to "user key present?".
- **Telemetry (Enhanced-tier only, additive JSONB):**
  `speaking_progress_shown` (once per mount, after gate passes),
  `speaking_progress_reattempt_clicked` (`{ topicId, reason }`).
  Future: `speaking_coach_clicked`.

### 4.5 `src/pages/Dashboard.jsx` — mount

Lazy-import (`const SpeakingProgress = lazy(() => import('../components/dashboard/SpeakingProgress'))`)
and mount inside the existing speaking block near `RecentPerformance` /
`WorstTurnWidget` (~`Dashboard.jsx:543-559`), wrapped in the existing
`<Suspense>`. Position so its copy does not duplicate `WorstTurnWidget` (which
shows the single worst session); this widget owns the **trend + weakness +
re-attempt CTA**.

---

## 5. Data flow

```
student finishes a speaking attempt (Speaking.jsx)
  -> heuristicGrade() -> h
  -> weaknessFlags(h, topic) -> weak[]
  -> logSpeakingSession({ ...band/duration/wordCount/transcript/lang, weak })
       -> speakingHistory (localStorage; JSONB entry to cloud via queue)

Dashboard render (SpeakingProgress.jsx)
  -> reads speakingHistory slice
  -> scopedLang = most-recent attempt lang (or in-widget toggle)
  -> useMemo:
       speakingBandSeries(history, { lang })        -> headline + sparkline
       recurringSpeakingWeakness(history, { lang })  -> weakness line
       topicsDueForReattempt(history, now, { lang }) -> chips
  -> chip click -> navigate('/speaking', { state: { topicId } })
       -> Speaking.jsx reads location.state.topicId (existing)
```

---

## 6. Error handling & edge cases

- **0–1 scoped attempts:** widget hidden (gate ≥2).
- **All old records (no `weak`):** trend + due-list still work; weakness line
  shows the **transitional** message (`tallied < 2`). No crash, no backfill.
- **Strong student, enough data, no flags** (`tallied ≥ 2 && flagTotal === 0`):
  weakness line shows the **balanced/positive** message — never "log more".
- **Unknown `topicId`** (e.g. legacy/renamed): excluded from due-list and from
  any topic lookup; trend (band-only) unaffected.
- **Mixed languages:** never blended — always scoped; toggle only when both
  qualify.
- **Flat bands** (e.g. 3,3,3): delta 0, arrow "→", no false "improving" claim.
- **Practised today:** excluded from due-list (no same-day nag).
- **Strong-but-recent topic** (band ≥4, practised <3 days ago): not surfaced as
  "stale"; only `weak` (band ≤3) overrides recency.
- **Enhanced-tier gating:** telemetry only fires for Enhanced tier (mirrors
  `DailyPlan`); Static tier sees the widget, emits nothing.

---

## 7. Testing

- **Vitest** (mirror `dailyPlan.test.js` style), in
  `src/lib/__tests__/` :
  - `weaknessFlags`: each category triggers on its threshold; clean attempt → `[]`.
  - `speakingBandSeries`: ordering (oldest→newest), `delta = last - first`,
    `best`/`avg`, lang filtering, `n` cap, empty/single.
  - `recurringSpeakingWeakness`: picks the most frequent `weak` category;
    `tallied` counts only records with a `weak` array; clean attempts count
    toward `tallied` with `flagTotal === 0` (balanced state); records without
    `weak` excluded; window cap; lang scoping; tie handling.
  - `topicsDueForReattempt`: band ≤3 ('weak') ranked before 'stale'; 'stale'
    requires ≥3 days since last attempt; excludes today; strong-but-recent
    (band ≥4, <3 days) not surfaced; `limit` cap; lang scoping; reason label.
- **No e2e, no migration test** (no persisted-state shape change requiring a
  migration; `weak` is optional-additive). Optional: a light Dashboard smoke
  render if desired, not required.
- Gates before "done": `npm run build` (zero errors; `index-*.js` must not
  regress materially — verify `patterns.js` still pulls no grader/gemini),
  `npm run lint` (0 errors, no new warnings), `npm run test:run` (all pass).

---

## 8. Explicitly deferred (future specs, not now)

- **Feature B — BYOK** (one optional OpenRouter key in Settings, wired to
  `openrouter.js`, unlocks the AI-coach button). Own brainstorm + spec.
- **AI coach summary** (one capped call synthesising trajectory + next drill) —
  lands when B exists; the inert slot (§4.4) is its forward hook.
- **Full per-topic mastery model / weakness clustering** — overlaps the mistake
  pipeline; revisit only if the trend readout proves motivating.
- **Deep-linking the exact due-topic through `dailyPlan.js`** — the widget chips
  already satisfy "due for another go"; coupling topicIds into the plan is a
  YAGNI nice-to-have.
- **Timed Paper-3 oral mock (#3)** — biggest build, most AI; separate.

---

## 9. Touch-surface summary

| File | Change |
|---|---|
| `src/lib/speakingGrader.js` | + `weaknessFlags(h, topic)` (pure) |
| `src/pages/Speaking.jsx` | + import; + `weak:` on logged record (1 line) |
| `src/lib/patterns.js` | + `speakingBandSeries`, `recurringSpeakingWeakness`, `topicsDueForReattempt` |
| `src/components/dashboard/SpeakingProgress.jsx` | NEW widget |
| `src/pages/Dashboard.jsx` | + lazy import & mount |
| `src/lib/__tests__/*` | + unit tests for the four pure functions |

No store migration. No schema change. No new dependency. No new Gemini calls.
