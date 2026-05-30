# Speaking Progression v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Dashboard "Speaking progress" widget — band trend + recurring-weakness readout + "due for another go" topics — so a student can *feel* improvement over time, reusing data already stored.

**Architecture:** One pure flag-extractor in `speakingGrader.js` (stores exact weakness flags per attempt as additive JSONB), three pure aggregation helpers in `patterns.js` (trend / recurring weakness / due-for-reattempt), and one self-contained `SpeakingProgress.jsx` Dashboard widget. No store migration, no schema change, no new Gemini calls, no new dependency. `patterns.js` must NOT import the grader/gemini (keeps the eager Dashboard bundle clean).

**Tech Stack:** React 19, Zustand 5, Vite 8, Vitest, lucide-react, Tailwind CSS 4 (tokens via `var(--color-*)`).

**Spec:** `docs/superpowers/specs/2026-05-30-speaking-progression-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/speakingGrader.js` (modify) | + `weaknessFlags(h, topic)` — pure, derives named weakness categories from one heuristic result. |
| `src/pages/Speaking.jsx` (modify) | Store the exact `weak` flags on each logged attempt (1 import edit + 1 field). |
| `src/lib/patterns.js` (modify) | + `speakingBandSeries`, `recurringSpeakingWeakness`, `topicsDueForReattempt` (pure aggregations). |
| `src/components/dashboard/SpeakingProgress.jsx` (create) | Self-contained Dashboard widget: headline trend + sparkline + weakness line + due chips + inert AI-coach hook + telemetry. |
| `src/pages/Dashboard.jsx` (modify) | Lazy-import + mount the widget. |
| `src/lib/__tests__/speakingProgress.test.js` (create) | Unit tests for the four pure functions. |

---

## Task 1: `weaknessFlags` in speakingGrader.js

**Files:**
- Modify: `src/lib/speakingGrader.js` (add new export near `heuristicGrade`)
- Test: `src/lib/__tests__/speakingProgress.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/speakingProgress.test.js`:

```js
// Unit suite for the Speaking Progression pure functions (band trend,
// recurring weakness, due-for-reattempt) + the weaknessFlags extractor.
// All pure — exhaustively testable with plain fixtures.
// Design: docs/superpowers/specs/2026-05-30-speaking-progression-design.md

import { describe, it, expect } from 'vitest'
import { weaknessFlags } from '../speakingGrader.js'

// A "clean" band-6-shaped heuristic result: nothing should flag.
const cleanH = {
  durationSec: 90, wordsPerSec: 2.0, markerCount: 3, formalCount: 3,
  uniqueWordRatio: 0.6, fillerCount: 1, wordCount: 120, cuesHit: 4, cuesTotal: 4,
}
const topic = { expectedDurationSec: 90 }

describe('weaknessFlags', () => {
  it('returns [] for a clean, well-rounded attempt', () => {
    expect(weaknessFlags(cleanH, topic)).toEqual([])
  })

  it('flags tooShort when duration is under 70% of expected', () => {
    expect(weaknessFlags({ ...cleanH, durationSec: 50 }, topic)).toContain('tooShort')
  })

  it('flags disfluent for too-slow and too-fast pace', () => {
    expect(weaknessFlags({ ...cleanH, wordsPerSec: 1.0 }, topic)).toContain('disfluent')
    expect(weaknessFlags({ ...cleanH, wordsPerSec: 3.5 }, topic)).toContain('disfluent')
  })

  it('flags fewMarkers, weakVocab, repetitive on low signals', () => {
    const flags = weaknessFlags(
      { ...cleanH, markerCount: 1, formalCount: 1, uniqueWordRatio: 0.3 }, topic)
    expect(flags).toEqual(expect.arrayContaining(['fewMarkers', 'weakVocab', 'repetitive']))
  })

  it('flags fillerHeavy when fillers exceed max(3, 4% of words)', () => {
    expect(weaknessFlags({ ...cleanH, fillerCount: 10, wordCount: 100 }, topic)).toContain('fillerHeavy')
  })

  it('flags missedCues when under 75% of cues addressed', () => {
    expect(weaknessFlags({ ...cleanH, cuesHit: 1, cuesTotal: 4 }, topic)).toContain('missedCues')
  })

  it('uses a 75s default expected duration when topic is missing', () => {
    // 50s < 75*0.7=52.5 -> tooShort; passing no topic must not throw.
    expect(weaknessFlags({ ...cleanH, durationSec: 50 }, undefined)).toContain('tooShort')
  })

  it('returns [] when the heuristic result is null/undefined', () => {
    expect(weaknessFlags(null, topic)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- speakingProgress`
Expected: FAIL — `weaknessFlags` is not exported from `../speakingGrader.js`.

- [ ] **Step 3: Add the implementation**

In `src/lib/speakingGrader.js`, add this export immediately AFTER the
`heuristicGrade` function (it ends with `}` around line 157, before
`export function aiGradeAvailable()`):

```js
// Map one heuristic result (+ its topic) to a list of named weakness
// categories. Pure — reads only metrics heuristicGrade already computed, so
// it adds no new dependency. Single source of truth for "what was weak" on an
// attempt; stored on the speaking record at log time and read back by the
// progression widget. Thresholds mirror the banding booleans above so a flag
// never contradicts the band.
export function weaknessFlags(h, topic) {
  if (!h) return []
  const flags = []
  const expected = topic?.expectedDurationSec ?? 75
  if (h.durationSec < expected * 0.7) flags.push('tooShort')
  if (h.wordsPerSec < 1.4 || h.wordsPerSec > 2.8) flags.push('disfluent')
  if (h.markerCount < 2) flags.push('fewMarkers')
  if (h.formalCount < 2) flags.push('weakVocab')
  if (h.uniqueWordRatio < 0.45) flags.push('repetitive')
  if (h.fillerCount > Math.max(3, Math.round(h.wordCount * 0.04))) flags.push('fillerHeavy')
  if (h.cuesTotal > 0 && h.cuesHit / h.cuesTotal < 0.75) flags.push('missedCues')
  return flags
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- speakingProgress`
Expected: PASS (8 tests in the `weaknessFlags` block).

- [ ] **Step 5: Commit**

```bash
git add src/lib/speakingGrader.js src/lib/__tests__/speakingProgress.test.js
git commit -m "feat(speaking): weaknessFlags extractor for progression signal"
```

---

## Task 2: Persist `weak` flags on each speaking attempt

**Files:**
- Modify: `src/pages/Speaking.jsx:15-17` (import) and `:166-173` (logged record)

This is a wiring change (production of the data the Task-1 function defines).
The output is exercised by Task 1 (production of flags) and Tasks 3–5
(consumption of records carrying `weak`); the wiring itself is verified by
build + lint.

- [ ] **Step 1: Add `weaknessFlags` to the existing grader import**

In `src/pages/Speaking.jsx`, change the existing import block (lines 15-17):

```js
import {
  heuristicGrade, aiGrade, aiGradeAvailable,
} from '../lib/speakingGrader'
```

to:

```js
import {
  heuristicGrade, aiGrade, aiGradeAvailable, weaknessFlags,
} from '../lib/speakingGrader'
```

- [ ] **Step 2: Store the exact flags on the logged record**

In the same file, find the `logSpeakingSession?.({ ... })` call (around line 166).
Add a `weak` field computed from the full heuristic `h` and `topic`:

```js
      logSpeakingSession?.({
        topicId: topic.id,
        band: h.band,
        durationSec: h.durationSec,
        wordCount: h.wordCount,
        transcript: fullTranscript.slice(0, 1000), // cap for storage
        lang,
        weak: weaknessFlags(h, topic), // exact weakness flags (additive JSONB)
      })
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build`
Expected: build succeeds, zero errors.

Run: `npm run lint`
Expected: 0 errors, no NEW warnings (the 3 pre-existing exhaustive-deps
warnings in `MixedSession.jsx`/`Study.jsx` remain; do not add a 4th).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Speaking.jsx
git commit -m "feat(speaking): persist exact weakness flags on each attempt"
```

---

## Task 3: `speakingBandSeries` in patterns.js

**Files:**
- Modify: `src/lib/patterns.js` (add module-private lang helpers + new export at end of file)
- Test: `src/lib/__tests__/speakingProgress.test.js` (extend)

- [ ] **Step 1: Write the failing test**

First, add this import to the TOP of `src/lib/__tests__/speakingProgress.test.js`
(with the existing imports — keep all `import` lines at the top of the file so
`import/first` cannot fire):

```js
import { speakingBandSeries } from '../patterns.js'
```

Then append the following describe block (and the shared `rec` fixture helper)
to the END of the file:

```js
// Build a speaking record. `ts` is an ISO string; oldest-to-newest ordering
// is by ts. `weak` omitted unless provided (old-format records lack it).
// (Function declaration — hoisted, so later describe blocks may use it too.)
function rec({ ts, band, topicId = 'hobby', lang = 'malay', weak, durationSec = 80, wordCount = 100 }) {
  return { id: ts, ts, band, topicId, durationSec, wordCount, lang, ...(weak ? { weak } : {}) }
}

describe('speakingBandSeries', () => {
  it('orders oldest→newest and computes first/last/delta/best/avg/count', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3 }),
      rec({ ts: '2026-05-22T10:00:00Z', band: 4 }),
      rec({ ts: '2026-05-24T10:00:00Z', band: 5 }),
    ]
    const s = speakingBandSeries(history, { lang: 'malay' })
    expect(s.bands).toEqual([3, 4, 5])
    expect(s.first).toBe(3)
    expect(s.last).toBe(5)
    expect(s.delta).toBe(2)
    expect(s.best).toBe(5)
    expect(s.avg).toBe(4)
    expect(s.count).toBe(3)
  })

  it('rounds avg to 1 decimal place', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3 }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 4 }),
      rec({ ts: '2026-05-22T10:00:00Z', band: 4 }),
    ]
    expect(speakingBandSeries(history, { lang: 'malay' }).avg).toBe(3.7)
  })

  it('scopes to the requested language (eng vs malay)', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 2, lang: 'malay' }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 6, lang: 'eng' }),
    ]
    expect(speakingBandSeries(history, { lang: 'eng' }).bands).toEqual([6])
    expect(speakingBandSeries(history, { lang: 'malay' }).bands).toEqual([2])
  })

  it('keeps only the last n attempts', () => {
    const history = Array.from({ length: 12 }, (_, i) =>
      rec({ ts: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`, band: 3 }))
    expect(speakingBandSeries(history, { lang: 'malay', n: 8 }).count).toBe(8)
  })

  it('returns a safe empty shape for no scoped attempts', () => {
    const s = speakingBandSeries([], { lang: 'malay' })
    expect(s).toEqual({ lang: 'malay', bands: [], first: null, last: null, delta: 0, best: null, avg: null, count: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- speakingProgress`
Expected: FAIL — `speakingBandSeries` is not exported from `../patterns.js`.

- [ ] **Step 3: Add module-private lang helpers + the export**

At the END of `src/lib/patterns.js`, append:

```js
// --- Speaking Progression helpers -------------------------------------------
// Pure aggregations over speakingHistory for the Dashboard SpeakingProgress
// widget. Intentionally read only fields already on the record (band / ts /
// topicId / lang / weak) so this module stays dependency-light — it is
// imported by the EAGER Dashboard, so it must NOT import speakingGrader/gemini.
// Design: docs/superpowers/specs/2026-05-30-speaking-progression-design.md

const DAY_MS = 86400000

function isEnglishLang(lang) {
  return lang === 'eng' || lang === 'en'
}

// Keep only records whose language matches `lang` (English vs Malay buckets),
// mirroring the grader's own 'eng'/'en' normalisation.
function scopeByLang(history, lang) {
  const wantEn = isEnglishLang(lang)
  return (history || []).filter(e => isEnglishLang(e.lang) === wantEn)
}

/**
 * Last-N per-attempt bands for one language, plus a headline summary.
 * best / avg are computed over the SAME last-N window (i.e. "recent", not
 * all-time) so the headline is internally consistent. avg → 1 dp.
 * Returns a safe empty shape when there are no scoped attempts.
 */
export function speakingBandSeries(speakingHistory, { lang, n = 8 } = {}) {
  const series = scopeByLang(speakingHistory, lang)
    .filter(e => typeof e.band === 'number')
    .sort((a, b) => new Date(a.ts) - new Date(b.ts)) // oldest → newest
    .slice(-n)
  const bands = series.map(e => e.band)
  const count = bands.length
  if (count === 0) {
    return { lang, bands: [], first: null, last: null, delta: 0, best: null, avg: null, count: 0 }
  }
  const first = bands[0]
  const last = bands[count - 1]
  const best = Math.max(...bands)
  const avg = Math.round((bands.reduce((a, x) => a + x, 0) / count) * 10) / 10
  return { lang, bands, first, last, delta: last - first, best, avg, count }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- speakingProgress`
Expected: PASS (the `speakingBandSeries` block + Task 1 block).

- [ ] **Step 5: Commit**

```bash
git add src/lib/patterns.js src/lib/__tests__/speakingProgress.test.js
git commit -m "feat(speaking): speakingBandSeries trend aggregation"
```

---

## Task 4: `recurringSpeakingWeakness` in patterns.js

**Files:**
- Modify: `src/lib/patterns.js` (add export after `speakingBandSeries`)
- Test: `src/lib/__tests__/speakingProgress.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Add this import to the TOP of `src/lib/__tests__/speakingProgress.test.js`
(with the other imports):

```js
import { recurringSpeakingWeakness } from '../patterns.js'
```

Then append this describe block to the END of the file:

```js
describe('recurringSpeakingWeakness', () => {
  it('picks the most frequent weak category across recent attempts', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3, weak: ['fewMarkers', 'fillerHeavy'] }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 3, weak: ['fewMarkers'] }),
      rec({ ts: '2026-05-22T10:00:00Z', band: 4, weak: ['weakVocab'] }),
    ]
    const r = recurringSpeakingWeakness(history, { lang: 'malay' })
    expect(r.tallied).toBe(3)
    expect(r.flagTotal).toBe(4)
    expect(r.top[0]).toEqual({ category: 'fewMarkers', count: 2 })
  })

  it('counts clean attempts toward tallied with flagTotal 0 (balanced state)', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 6, weak: [] }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 6, weak: [] }),
    ]
    const r = recurringSpeakingWeakness(history, { lang: 'malay' })
    expect(r.tallied).toBe(2)
    expect(r.flagTotal).toBe(0)
    expect(r.top).toEqual([])
  })

  it('ignores old-format records that have no weak array', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3 }), // no weak
      rec({ ts: '2026-05-21T10:00:00Z', band: 3, weak: ['repetitive'] }),
    ]
    const r = recurringSpeakingWeakness(history, { lang: 'malay' })
    expect(r.tallied).toBe(1)
    expect(r.top[0].category).toBe('repetitive')
  })

  it('scopes by language', () => {
    const history = [
      rec({ ts: '2026-05-20T10:00:00Z', band: 3, lang: 'eng', weak: ['tooShort'] }),
      rec({ ts: '2026-05-21T10:00:00Z', band: 3, lang: 'malay', weak: ['fewMarkers'] }),
    ]
    expect(recurringSpeakingWeakness(history, { lang: 'eng' }).top[0].category).toBe('tooShort')
  })

  it('respects the window cap (newest first)', () => {
    const history = Array.from({ length: 15 }, (_, i) =>
      rec({ ts: `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`, band: 3, weak: ['fewMarkers'] }))
    expect(recurringSpeakingWeakness(history, { lang: 'malay', window: 12 }).tallied).toBe(12)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- speakingProgress`
Expected: FAIL — `recurringSpeakingWeakness` is not exported.

- [ ] **Step 3: Add the implementation**

In `src/lib/patterns.js`, append AFTER `speakingBandSeries`:

```js
/**
 * Weakness signal over recent attempts (one language), from the stored
 * record.weak flags. Records WITHOUT a `weak` array are not counted (the
 * signal is forward-looking). `tallied` = windowed records that HAVE a `weak`
 * array (a clean band-6 attempt counts, contributing 0 flags). `flagTotal` =
 * total flags across them (0 ⇒ balanced/positive state). `top` = the most
 * frequent categories (length 0–2; the widget renders top[0]).
 */
export function recurringSpeakingWeakness(speakingHistory, { lang, window = 12 } = {}) {
  const scoped = scopeByLang(speakingHistory, lang)
    .filter(e => Array.isArray(e.weak))
    .sort((a, b) => new Date(b.ts) - new Date(a.ts)) // newest first
    .slice(0, window)
  const counts = {}
  let flagTotal = 0
  for (const e of scoped) {
    for (const cat of e.weak) {
      counts[cat] = (counts[cat] || 0) + 1
      flagTotal++
    }
  }
  const top = Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
  return { tallied: scoped.length, flagTotal, top }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- speakingProgress`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/patterns.js src/lib/__tests__/speakingProgress.test.js
git commit -m "feat(speaking): recurringSpeakingWeakness tally"
```

---

## Task 5: `topicsDueForReattempt` in patterns.js

**Files:**
- Modify: `src/lib/patterns.js` (add export after `recurringSpeakingWeakness`)
- Test: `src/lib/__tests__/speakingProgress.test.js` (extend)

- [ ] **Step 1: Write the failing test**

Add this import to the TOP of `src/lib/__tests__/speakingProgress.test.js`
(with the other imports):

```js
import { topicsDueForReattempt } from '../patterns.js'
```

Then append this describe block to the END of the file:

```js
// Fixed "now" anchor for deterministic recency math.
const NOW = new Date('2026-05-30T12:00:00Z').getTime()
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString()

describe('topicsDueForReattempt', () => {
  it('ranks weak (band ≤3) before stale, then oldest-first', () => {
    const history = [
      rec({ ts: daysAgo(10), band: 5, topicId: 'family' }), // stale (≥3d, band>3)
      rec({ ts: daysAgo(2), band: 2, topicId: 'hobby' }),   // weak (band ≤3)
      rec({ ts: daysAgo(20), band: 6, topicId: 'school' }), // stale, older
    ]
    const due = topicsDueForReattempt(history, NOW, { lang: 'malay' })
    expect(due.map(d => d.topicId)).toEqual(['hobby', 'school', 'family'])
    expect(due[0].reason).toBe('weak')
    expect(due[1].reason).toBe('stale')
  })

  it('excludes topics practised today', () => {
    const history = [rec({ ts: daysAgo(0), band: 2, topicId: 'hobby' })]
    expect(topicsDueForReattempt(history, NOW, { lang: 'malay' })).toEqual([])
  })

  it('does not nag a strong, recently-practised topic (band ≥4, <3 days)', () => {
    const history = [rec({ ts: daysAgo(1), band: 5, topicId: 'family' })]
    expect(topicsDueForReattempt(history, NOW, { lang: 'malay' })).toEqual([])
  })

  it('uses the most recent attempt per topic to decide reason', () => {
    const history = [
      rec({ ts: daysAgo(9), band: 2, topicId: 'hobby' }), // older, weak
      rec({ ts: daysAgo(1), band: 5, topicId: 'hobby' }), // newer, strong+recent
    ]
    // newest attempt is strong & recent → not due
    expect(topicsDueForReattempt(history, NOW, { lang: 'malay' })).toEqual([])
  })

  it('caps at limit and scopes by language', () => {
    const history = [
      rec({ ts: daysAgo(5), band: 2, topicId: 'a', lang: 'malay' }),
      rec({ ts: daysAgo(6), band: 2, topicId: 'b', lang: 'malay' }),
      rec({ ts: daysAgo(7), band: 2, topicId: 'c', lang: 'malay' }),
      rec({ ts: daysAgo(8), band: 2, topicId: 'd', lang: 'eng' }),
    ]
    const due = topicsDueForReattempt(history, NOW, { lang: 'malay', limit: 2 })
    expect(due.length).toBe(2)
    expect(due.every(d => d.topicId !== 'd')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- speakingProgress`
Expected: FAIL — `topicsDueForReattempt` is not exported.

- [ ] **Step 3: Add the implementation**

In `src/lib/patterns.js`, append AFTER `recurringSpeakingWeakness`:

```js
/**
 * Topics worth another go (one language), excluding any practised TODAY.
 *   - reason 'weak'  : most recent band ≤ 3 (surfaced regardless of recency).
 *   - reason 'stale' : last practised ≥ 3 days ago (spaced re-attempt; a
 *                      strong-but-recent topic is NOT nagged).
 * Ranked weak-first, then oldest-first. Capped at `limit`.
 */
export function topicsDueForReattempt(speakingHistory, now, { lang, limit = 3 } = {}) {
  const scoped = scopeByLang(speakingHistory, lang)
    .filter(e => (e.topicId || e.scenarioId) && typeof e.band === 'number')

  // Most recent attempt per topic.
  const latest = {}
  for (const e of scoped) {
    const id = e.topicId || e.scenarioId
    const t = new Date(e.ts).getTime()
    if (!latest[id] || t > latest[id].t) {
      latest[id] = { topicId: id, lastBand: e.band, lastTs: e.ts, t }
    }
  }

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayMs = todayStart.getTime()

  const candidates = []
  for (const v of Object.values(latest)) {
    if (v.t >= todayMs) continue // practised today — no same-day nag
    let reason = null
    if (v.lastBand <= 3) reason = 'weak'
    else if (now - v.t >= 3 * DAY_MS) reason = 'stale'
    if (!reason) continue
    v.reason = reason
    candidates.push(v) // v = { topicId, lastBand, lastTs, t, reason }
  }

  candidates.sort((a, b) => {
    if (a.reason !== b.reason) return a.reason === 'weak' ? -1 : 1 // weak first
    return a.t - b.t // oldest first
  })

  // Project to the public shape (drop the internal `t` epoch field).
  return candidates.slice(0, limit).map(v => ({
    topicId: v.topicId, lastBand: v.lastBand, lastTs: v.lastTs, reason: v.reason,
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- speakingProgress`
Expected: PASS (all four describe blocks).

- [ ] **Step 5: Run lint to confirm clean**

Run: `npm run lint`
Expected: 0 errors, no new warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/patterns.js src/lib/__tests__/speakingProgress.test.js
git commit -m "feat(speaking): topicsDueForReattempt (weak + stale, spaced)"
```

---

## Task 6: `SpeakingProgress.jsx` Dashboard widget

**Files:**
- Create: `src/components/dashboard/SpeakingProgress.jsx`

Component is self-contained (reads its own slice, uses `useNavigate`), mirroring
`DailyPlan.jsx`. No props. No unit test (matches the project pattern: the
engine is unit-tested, the presentational widget is verified by build/lint and
manual check), but ALL hooks are declared before the gate's early return.

- [ ] **Step 1: Create the widget**

Create `src/components/dashboard/SpeakingProgress.jsx`:

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import useStore from '../../store/useStore'
import {
  speakingBandSeries, recurringSpeakingWeakness, topicsDueForReattempt,
} from '../../lib/patterns'
import { trackEvent } from '../../lib/telemetry'
import TOPICS, { TOPICS_EN } from '../../data/speakingTopics'

// Speaking progression widget — band trend + recurring-weakness readout +
// "due for another go" topics. Pure synthesis over speakingHistory; the
// intelligence lives in src/lib/patterns.js. Reads, routes, renders. No store
// API change, no persisted state, no new Gemini calls.
// Design: docs/superpowers/specs/2026-05-30-speaking-progression-design.md

// Forward hook for feature B (BYOK). Returns false in v1 → the AI-coach button
// is never rendered. When BYOK ships, wire this to "is a user AI key present?".
function aiCoachAvailable() {
  return false
}

const ALL_TOPICS = [...TOPICS, ...TOPICS_EN]
function topicTitle(topicId) {
  return ALL_TOPICS.find(t => t.id === topicId)?.title || topicId
}

function isEnglishLang(lang) {
  return lang === 'eng' || lang === 'en'
}

// Most-recent attempt's language, used as the default scope.
function mostRecentLang(history) {
  let lang = 'malay'
  let best = -Infinity
  for (const e of history || []) {
    const t = new Date(e.ts).getTime()
    if (t > best) { best = t; lang = isEnglishLang(e.lang) ? 'eng' : 'malay' }
  }
  return lang
}

// Bilingual labels + one-line fixes, keyed by the weaknessFlags categories.
const WEAKNESS_COPY = {
  tooShort: {
    malay: { label: 'jawapan terlalu pendek', fix: 'Cuba capai masa sasaran — kembangkan setiap idea.' },
    eng: { label: 'answers too short', fix: 'Aim for the full target time — keep developing each idea.' },
  },
  disfluent: {
    malay: { label: 'kelajuan tidak sekata', fix: 'Latih kelajuan sekata — jangan terlalu laju atau perlahan.' },
    eng: { label: 'uneven pace', fix: 'Practise a steady pace — not too fast, not too slow.' },
  },
  fewMarkers: {
    malay: { label: 'kurang penanda wacana', fix: 'Tambah penanda (pertama, walau bagaimanapun, kesimpulannya).' },
    eng: { label: 'few connectors', fix: 'Add discourse markers (firstly, however, in conclusion).' },
  },
  weakVocab: {
    malay: { label: 'kosa kata harian', fix: 'Gantikan satu dua perkataan biasa dengan yang lebih formal.' },
    eng: { label: 'everyday vocabulary', fix: 'Swap one or two plain words a minute for stronger ones.' },
  },
  repetitive: {
    malay: { label: 'perkataan berulang', fix: 'Variasikan perkataan — elak mengulang yang sama.' },
    eng: { label: 'repetitive wording', fix: 'Vary your word choice — avoid repeating the same words.' },
  },
  fillerHeavy: {
    malay: { label: 'kata pengisi', fix: 'Kurangkan kata pengisi (um, lah) — berhenti senyap sebentar.' },
    eng: { label: 'filler words', fix: 'Trim fillers (um, like, you know) — pause silently instead.' },
  },
  missedCues: {
    malay: { label: 'isi terlepas', fix: 'Sentuh lebih banyak cadangan isi bagi topik itu.' },
    eng: { label: 'missed prompt cues', fix: 'Cover more of the suggested cues for the topic.' },
  },
}

function Sparkline({ bands }) {
  const w = 132
  const h = 34
  const pad = 4
  const lo = 1
  const hi = 6
  const n = bands.length
  const points = bands.map((b, i) => {
    const x = pad + (i * (w - 2 * pad)) / Math.max(1, n - 1)
    const y = pad + (h - 2 * pad) * (1 - (b - lo) / (hi - lo))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Recent speaking bands: ${bands.join(', ')}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function SpeakingProgress() {
  const navigate = useNavigate()
  const speakingHistory = useStore(s => s.speakingHistory)
  const userRole = useStore(s => s.userRole)
  const isEnhanced = userRole !== 'static'
  const now = useMemo(() => Date.now(), [])

  // Per-language counts → drive the gate and the optional MS/EN toggle.
  const { msCount, enCount } = useMemo(() => {
    let ms = 0
    let en = 0
    for (const e of speakingHistory || []) {
      if (isEnglishLang(e.lang)) en++
      else ms++
    }
    return { msCount: ms, enCount: en }
  }, [speakingHistory])

  const [lang, setLang] = useState(() => mostRecentLang(speakingHistory))
  const bothQualify = msCount >= 2 && enCount >= 2
  const scopedCount = isEnglishLang(lang) ? enCount : msCount
  const langKey = isEnglishLang(lang) ? 'eng' : 'malay'

  const series = useMemo(
    () => speakingBandSeries(speakingHistory, { lang }), [speakingHistory, lang])
  const weakness = useMemo(
    () => recurringSpeakingWeakness(speakingHistory, { lang }), [speakingHistory, lang])
  const due = useMemo(
    () => topicsDueForReattempt(speakingHistory, now, { lang }), [speakingHistory, lang, now])

  // Telemetry (Enhanced tier only) — once per mount, after the gate passes.
  const shownRef = useRef(false)
  useEffect(() => {
    if (!isEnhanced || shownRef.current || scopedCount < 2) return
    shownRef.current = true
    trackEvent('speaking_progress_shown', {
      lang, count: scopedCount, delta: series.delta, best: series.best,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (scopedCount < 2) return null

  const onReattempt = (d) => {
    if (isEnhanced) {
      trackEvent('speaking_progress_reattempt_clicked', { topicId: d.topicId, reason: d.reason })
    }
    navigate('/speaking', { state: { topicId: d.topicId } })
  }

  const showSparkline = scopedCount >= 5 && series.bands.length >= 2
  const showArrow = scopedCount >= 3
  const TrendIcon = series.delta > 0 ? TrendingUp : series.delta < 0 ? TrendingDown : Minus
  const trendColor = series.delta > 0
    ? 'var(--color-green)'
    : series.delta < 0 ? 'var(--color-red)' : 'var(--color-dim)'

  const headlineId = 'speaking-progress-headline'

  return (
    <section
      role="region"
      aria-labelledby={headlineId}
      className="rounded-2xl p-5 shadow-md"
      style={{ background: 'var(--color-card)', borderLeft: '4px solid var(--color-accent2)' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Mic size={18} style={{ color: 'var(--color-accent2)' }} aria-hidden={true} />
          <h2 id={headlineId} className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {langKey === 'eng' ? 'Speaking progress' : 'Kemajuan pertuturan'}
          </h2>
        </div>
        {bothQualify && (
          <div className="flex items-center gap-1">
            {[{ id: 'malay', label: 'BM' }, { id: 'eng', label: 'EN' }].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLang(opt.id)}
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{
                  minHeight: 44,
                  background: lang === opt.id ? 'var(--color-accent2)' : 'var(--color-bg)',
                  color: lang === opt.id ? '#fff' : 'var(--color-dim)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Headline trend stat (primary) + sparkline (secondary). */}
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>
              {langKey === 'eng' ? 'Recent average' : 'Purata terkini'}
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              {series.avg}
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dim)' }}> / 6</span>
            </div>
          </div>
          {showArrow && (
            <div className="flex items-center gap-1" style={{ color: trendColor }}>
              <TrendIcon size={18} aria-hidden={true} />
              <span className="text-sm font-semibold">
                {series.delta === 0
                  ? (langKey === 'eng' ? 'steady' : 'stabil')
                  : `${series.delta > 0 ? '+' : ''}${series.delta} ${langKey === 'eng' ? 'from' : 'dari'} ${series.first}`}
              </span>
            </div>
          )}
          <div className="text-xs" style={{ color: 'var(--color-dim)' }}>
            {langKey === 'eng' ? 'Best' : 'Terbaik'} {series.best}
          </div>
        </div>
        {showSparkline && <Sparkline bands={series.bands} />}
      </div>

      {!showArrow && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-dim)' }}>
          {langKey === 'eng'
            ? 'One more attempt to start seeing your trend.'
            : 'Satu lagi percubaan untuk mula melihat trend anda.'}
        </p>
      )}

      {/* Recurring weakness — three states. */}
      <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
        {weakness.tallied < 2 ? (
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
            {langKey === 'eng'
              ? 'Log a couple more attempts to surface your recurring weakness.'
              : 'Log beberapa percubaan lagi untuk menemukan kelemahan berulang anda.'}
          </p>
        ) : weakness.flagTotal === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-green)' }}>
            {langKey === 'eng'
              ? 'No recurring weakness — your recent attempts are well-rounded. Keep it up.'
              : 'Tiada kelemahan berulang — percubaan terkini anda seimbang. Teruskan!'}
          </p>
        ) : (
          <div>
            <div className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-accent2)' }}>
              {langKey === 'eng' ? 'Most common gap' : 'Kelemahan paling kerap'}
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {WEAKNESS_COPY[weakness.top[0].category]?.[langKey]?.label || weakness.top[0].category}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-dim)' }}>
              {WEAKNESS_COPY[weakness.top[0].category]?.[langKey]?.fix || ''}
            </div>
          </div>
        )}
      </div>

      {/* Due for another go. */}
      {due.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-dim)' }}>
            {langKey === 'eng' ? 'Due for another go' : 'Sesuai dicuba semula'}
          </div>
          <div className="flex flex-wrap gap-2">
            {due.map(d => (
              <button
                key={d.topicId}
                type="button"
                onClick={() => onReattempt(d)}
                className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-full"
                style={{ minHeight: 44, background: 'var(--color-bg)', color: 'var(--color-text)' }}
              >
                <span>{topicTitle(d.topicId)}</span>
                <ChevronRight size={16} style={{ color: 'var(--color-dim)' }} aria-hidden={true} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI-coach slot — inert in v1 (feature B / BYOK flips aiCoachAvailable). */}
      {aiCoachAvailable() && (
        <button
          type="button"
          onClick={() => navigate('/speaking')}
          className="mt-4 text-sm font-semibold"
          style={{ color: 'var(--color-accent2)', minHeight: 44 }}
        >
          {langKey === 'eng' ? 'Get an AI coaching summary →' : 'Dapatkan ringkasan jurulatih AI →'}
        </button>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build`
Expected: build succeeds, zero errors. Confirm `index-*.js` has not jumped
materially (the widget is lazy-loaded in Task 7; `patterns.js` pulls no
grader/gemini, so the eager bundle is unaffected).

Run: `npm run lint`
Expected: 0 errors, no new warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/SpeakingProgress.jsx
git commit -m "feat(speaking): SpeakingProgress dashboard widget"
```

---

## Task 7: Mount the widget on the Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx:20` (lazy import) and `:558-562` (mount near WorstTurnWidget)

- [ ] **Step 1: Add the lazy import**

In `src/pages/Dashboard.jsx`, after the existing line 20:

```js
const WorstTurnWidget = lazy(() => import('../components/dashboard/WorstTurnWidget'))
```

add:

```js
const SpeakingProgress = lazy(() => import('../components/dashboard/SpeakingProgress'))
```

- [ ] **Step 2: Mount the widget**

In the same file, find the "Worst speaking turn" block (around line 558):

```jsx
      {/* Worst speaking turn → one-tap rematch */}
      {worstSpeak && (
        <Suspense fallback={<WidgetSkeleton height={150} />}>
          <WorstTurnWidget session={worstSpeak} navigate={navigate} />
        </Suspense>
      )}
```

Immediately AFTER that block, add:

```jsx
      {/* Speaking progress — band trend + recurring weakness + due-for-another-go */}
      {speakingHistory.length >= 2 && (
        <Suspense fallback={<WidgetSkeleton height={200} />}>
          <SpeakingProgress />
        </Suspense>
      )}
```

(`speakingHistory` is already read into scope at `Dashboard.jsx:43`. The widget
applies its own per-language ≥2 gate internally; this outer guard just avoids
mounting a guaranteed-null child.)

- [ ] **Step 3: Verify build + lint**

Run: `npm run build`
Expected: build succeeds, zero errors.

Run: `npm run lint`
Expected: 0 errors, no new warnings.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat(speaking): mount SpeakingProgress on the Dashboard"
```

---

## Task 8: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test:run`
Expected: PASS — all prior tests plus the new `speakingProgress` block
(weaknessFlags + the three patterns helpers). No failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors; exactly the 3 pre-existing exhaustive-deps warnings
(`MixedSession.jsx`, `Study.jsx`) — no new ones.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: zero errors. `index-*.js` ≈ prior size (no grader/gemini pulled into
the eager bundle); `SpeakingProgress` emits as its own lazy chunk.

- [ ] **Step 4: Manual browser check (optional but recommended)**

Run: `npm run dev`, open `http://localhost:5173/`, and on an account with ≥2
speaking attempts confirm:
- the "Speaking progress" card renders with a headline avg/best;
- with ≥3 attempts a trend arrow appears; with ≥5 the sparkline appears;
- the recurring-weakness line shows one of the three states correctly;
- "due for another go" chips deep-link into `/speaking` on the chosen topic;
- dark AND light themes both render correctly;
- no console "Maximum update depth exceeded" / no errors.

- [ ] **Step 5: Update handoff docs**

Per project convention, refresh `RESUME_HERE.md` with a short entry for this
feature (what shipped, test counts, that BYOK / AI-coach remain deferred) in the
SAME commit batch as the final state, then ensure everything is committed.

```bash
git add RESUME_HERE.md
git commit -m "docs(handoff): Speaking Progression v1 shipped"
```

---

## Notes for the implementer

- **DRY:** `isEnglishLang` exists module-privately in BOTH `patterns.js` and the
  widget — this is a deliberate one-line predicate duplication (the widget must
  not import internal helpers from `patterns.js`, and the value isn't worth a
  shared module). Do not "fix" by exporting it.
- **YAGNI:** Do NOT add BYOK, an AI coach summary, per-topic mastery, or
  dailyPlan deep-linking — all explicitly deferred in the spec §8.
- **Store conventions:** never call a Zustand getter inside a selector; read the
  slice ref and derive in `useMemo`; no `Date.now()` in render (use the
  `useMemo(() => Date.now(), [])` anchor). All hooks precede the gate's early
  return.
- **Theming:** colours via `var(--color-*)` only; verify dark + light.
```
