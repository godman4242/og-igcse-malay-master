# Personalization "Show me why" (Direction B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the For-You page show *why* each item was picked, let the learner steer the daily skill-focus with constrained presets, and show one simple competence panel — all from signals the app already computes, with zero change to FSRS scheduling.

**Architecture:** Three additive sub-features on `/for-you`, built on small pure libs + thin UI glue. The "why" copy is centralised in `whyReason.js`; the steer is a bounded `need`-bonus policy in `studyMix.js` consumed by `dailyPlan.pickSkillFocus`; the competence panel is a pure composition (`competenceSnapshot.js`) of existing aggregators. A new per-language store pref `studyMix` (STORE_VERSION 34→35) carries the chosen preset.

**Tech Stack:** React 19, Zustand 5 (persisted), Vitest (unit), Playwright (e2e). All pure libs are plain ESM, no React.

**Spec:** [`../specs/2026-06-24-personalization-show-me-why-design.md`](../specs/2026-06-24-personalization-show-me-why-design.md).

## Global Constraints

- **FSRS isolation (load-bearing):** no code introduced here may write `due / stability / difficulty / state / reps / lapses`. The steer changes selection only. Pinned by Task 5's no-mutation test.
- **Default = identity:** preset `'balanced'` and "no preset passed" must be **byte-identical** to today's behavior. Every reweight defaults to `'balanced'`.
- **Spine floor:** the steer's `need`-bonus is bounded (`MIX_NEED_BONUS = 2`) and only affects which *discretionary* skill fills the single skill-focus slot — it must never raise a discretionary task above the spine (review priority 100/`always`, fix-ups 80).
- **Bilingual:** `studyMix` is per-language `{ ms, en }`; reason *content* is `studyLang`-scoped upstream in `ForYou.jsx`; reason *prose* is English (matches existing For-You copy).
- **Empty-state safe:** an empty deck shows only `<GetStarted>` — no why-strings, no MixSteer control, no CompetencePanel.
- **Colors:** use `var(--color-*)` via inline `style`; labels on colored fills use `var(--color-on-bright)` (never `text-black`/`#000`). Interactive targets ≥44×44px.
- **Gate green:** `npm run build` (zero errors, ForYou route chunk stays <70 KB raw), `npm run test:run` (~1030 tests + new), `npm run lint` (0 errors, no new exhaustive-deps warnings). README + `src/lib/guide/tourSteps.js` + `RESUME_HERE.md` updated when behavior changes (standing rule).
- **Store getters in components:** extract the getter ref, call in the body — never call a store getter inside a selector (infinite-loop rule).

---

### Task 1: `topicLabels.js` (extract) + `whyReason.js` (the "why" copy, one place)

**Files:**
- Create: `src/lib/topicLabels.js`
- Create: `src/lib/whyReason.js`
- Test: `src/lib/__tests__/whyReason.test.js`

**Interfaces:**
- Produces: `categoryLabel(topic) → string`, `CATEGORY_LABELS` (from `topicLabels.js`); `reasonForTask(task) → string`, `reasonForPicked(focusTopics) → string`, `reasonForRail(shelfId) → string` (from `whyReason.js`).
- Consumes: nothing (plain data).

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/whyReason.test.js`

```js
import { describe, it, expect } from 'vitest'
import { reasonForTask, reasonForPicked, reasonForRail } from '../whyReason.js'

describe('whyReason', () => {
  it('passes a task reason through', () => {
    expect(reasonForTask({ reason: 'Spaced review is time-sensitive.' }))
      .toBe('Spaced review is time-sensitive.')
  })
  it('returns empty string when a task has no reason', () => {
    expect(reasonForTask({})).toBe('')
    expect(reasonForTask(null)).toBe('')
  })
  it('names the weak spots for Picked for you', () => {
    expect(reasonForPicked(['vocab', 'tense']))
      .toBe('Built around your weak spots this week: Vocabulary, Tenses.')
  })
  it('maps the refined meN- key to its label', () => {
    expect(reasonForPicked(['imbuhan:meN-']))
      .toBe('Built around your weak spots this week: meN- prefixes.')
  })
  it('falls back when there are no focus topics', () => {
    const fallback = 'A focused session built from what you most need to review.'
    expect(reasonForPicked([])).toBe(fallback)
    expect(reasonForPicked(null)).toBe(fallback)
  })
  it('returns a rail blurb for known shelves, empty for others', () => {
    expect(reasonForRail('saved')).toMatch(/captured while reading/i)
    expect(reasonForRail('unknown')).toBe('')
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test:run -- whyReason`
Expected: FAIL — `Cannot find module '../whyReason.js'`.

- [ ] **Step 3: Create `src/lib/topicLabels.js`** (lift the map verbatim from `forYouShelves.js`)

```js
// src/lib/topicLabels.js
// Shared mistake-category → human label map. Extracted from forYouShelves.js so
// the "Picked for you" chips and the whyReason copy share ONE source (DRY).
// 'imbuhan:meN-' is the refined meN- prefix family (learnerProfile.focusTopics).

export const CATEGORY_LABELS = {
  vocab: 'Vocabulary',
  imbuhan: 'Imbuhan (affixes)',
  'imbuhan:meN-': 'meN- prefixes',
  tense: 'Tenses',
  spelling: 'Spelling',
  cohesion: 'Cohesion',
  register: 'Register',
  pronunciation: 'Pronunciation',
  comprehension: 'Comprehension',
  fluency: 'Fluency',
  other: 'Mixed practice',
}

export function categoryLabel(topic) {
  return CATEGORY_LABELS[topic] || topic
}
```

- [ ] **Step 4: Create `src/lib/whyReason.js`**

```js
// src/lib/whyReason.js
// Single source of truth for the For-You "why" copy. Pure. The reason PROSE is
// English (matches the page's existing subtitles); the CONTENT (which weak
// spots) is already studyLang-scoped upstream in ForYou.jsx.

import { categoryLabel } from './topicLabels'

const PICKED_FALLBACK = 'A focused session built from what you most need to review.'

const RAIL_REASONS = {
  'still-remember': 'Words you have not seen in a while — a quick check they are still in memory.',
  saved: 'Words you captured while reading — practising them turns saves into recall.',
}

export function reasonForTask(task) {
  return (task && typeof task.reason === 'string' && task.reason) || ''
}

export function reasonForPicked(focusTopics) {
  const topics = (Array.isArray(focusTopics) ? focusTopics : []).filter(Boolean)
  if (topics.length === 0) return PICKED_FALLBACK
  return `Built around your weak spots this week: ${topics.map(categoryLabel).join(', ')}.`
}

export function reasonForRail(shelfId) {
  return RAIL_REASONS[shelfId] || ''
}
```

- [ ] **Step 5: Run the test — verify it passes**

Run: `npm run test:run -- whyReason`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/topicLabels.js src/lib/whyReason.js src/lib/__tests__/whyReason.test.js
git commit -m "feat(foryou): whyReason + shared topicLabels — surfaceable 'why' copy in one place"
```

---

### Task 2: `forYouShelves` — carry the task `reason`, share `topicLabels`

**Files:**
- Modify: `src/lib/forYouShelves.js` (replace the local `CATEGORY_LABELS`/`categoryLabel` with an import; add `reason` to Keep-going items)
- Test: `src/lib/__tests__/forYouShelves.test.js` (extend)

**Interfaces:**
- Consumes: `categoryLabel` from `topicLabels.js` (Task 1).
- Produces: Keep-going shelf items now include `reason`.

- [ ] **Step 1: Write the failing test** — append to `src/lib/__tests__/forYouShelves.test.js`

```js
import { reasonForTask } from '../whyReason.js'  // add to existing imports at top

describe('buildKeepGoing carries the task reason', () => {
  it('includes a non-empty reason on undone plan tasks', () => {
    // A deck with due cards yields a 'review' task that carries a reason string.
    const snap = emptySnapshot({
      cards: [{ m: 'a', e: 'a', due: new Date(NOW - DAY).toISOString(), state: State.Review, stability: 5 }],
      dailyPlanInputs: {
        cards: [{ m: 'a', e: 'a', due: new Date(NOW - DAY).toISOString() }],
        dueCount: 1,
      },
    })
    const shelves = buildForYouShelves(snap, NOW)
    const keepGoing = byId(shelves, 'keep-going')
    expect(keepGoing.items.length).toBeGreaterThan(0)
    expect(keepGoing.items.every(it => typeof it.reason === 'string')).toBe(true)
    expect(keepGoing.items.some(it => reasonForTask(it).length > 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test:run -- forYouShelves`
Expected: FAIL — items have no `reason` property (`it.reason` is `undefined`).

- [ ] **Step 3: Edit `src/lib/forYouShelves.js`** — replace the label map with the shared import

Delete the local `CATEGORY_LABELS` object (lines ~28–40) **and** the local `categoryLabel` function (lines ~59–61). Add at the top with the other imports:

```js
import { categoryLabel } from './topicLabels'
```

- [ ] **Step 4: Edit `buildKeepGoing`** — stop dropping `reason`

```js
  const items = asArray(plan.tasks)
    .filter(t => !t.done)
    .map(t => ({ id: t.id, label: t.label, sublabel: t.sublabel, route: t.route, reason: t.reason }))
```

- [ ] **Step 5: Run tests — verify pass**

Run: `npm run test:run -- forYouShelves`
Expected: PASS (existing + new). The `categoryLabel` import keeps "Picked for you" chips byte-identical.

- [ ] **Step 6: Commit**

```bash
git add src/lib/forYouShelves.js src/lib/__tests__/forYouShelves.test.js
git commit -m "feat(foryou): Keep-going items carry their reason; share topicLabels (DRY)"
```

---

### Task 3: `studyMix.js` — the preset policy (pure)

**Files:**
- Create: `src/lib/studyMix.js`
- Test: `src/lib/__tests__/studyMix.test.js`

**Interfaces:**
- Produces: `STUDY_MIX_PRESETS` (`[{id,label,emphasis}]`), `MIX_NEED_BONUS` (number), `mixNeedBonus(presetId, skillKind) → number`, `presetEmphasis(id) → 'speaking'|'writing'|'grammar'|null`, `isValidPreset(id) → boolean`.
- Consumed by: `dailyPlan.pickSkillFocus` (Task 5), `useStore.setStudyMix` (Task 4), `SmartStudy` + `MixSteer` UI (Task 8).

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/studyMix.test.js`

```js
import { describe, it, expect } from 'vitest'
import {
  mixNeedBonus, isValidPreset, presetEmphasis, STUDY_MIX_PRESETS, MIX_NEED_BONUS,
} from '../studyMix.js'

describe('studyMix', () => {
  it('balanced is identity — zero bonus for every skill', () => {
    for (const skill of ['speaking', 'writing', 'grammar']) {
      expect(mixNeedBonus('balanced', skill)).toBe(0)
    }
  })
  it('gives the bonus only to the emphasised skill', () => {
    expect(mixNeedBonus('more-speaking', 'speaking')).toBe(MIX_NEED_BONUS)
    expect(mixNeedBonus('more-speaking', 'writing')).toBe(0)
    expect(mixNeedBonus('more-grammar', 'grammar')).toBe(MIX_NEED_BONUS)
  })
  it('unknown preset is identity (safe default)', () => {
    expect(mixNeedBonus('nonsense', 'speaking')).toBe(0)
    expect(mixNeedBonus(undefined, 'writing')).toBe(0)
  })
  it('validates ids and exposes emphasis', () => {
    expect(isValidPreset('more-writing')).toBe(true)
    expect(isValidPreset('xyz')).toBe(false)
    expect(presetEmphasis('more-grammar')).toBe('grammar')
    expect(presetEmphasis('balanced')).toBe(null)
  })
  it('ships exactly the v1 set in order', () => {
    expect(STUDY_MIX_PRESETS.map(p => p.id))
      .toEqual(['balanced', 'more-speaking', 'more-writing', 'more-grammar'])
  })
  it('keeps the bonus bounded so a real urgent need can still win (<= 3)', () => {
    expect(MIX_NEED_BONUS).toBeLessThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test:run -- studyMix`
Expected: FAIL — `Cannot find module '../studyMix.js'`.

- [ ] **Step 3: Create `src/lib/studyMix.js`**

```js
// src/lib/studyMix.js
// Pure study-mix preset policy. A preset adds a BOUNDED need-bonus to ONE skill
// so the daily plan's single skill-focus slot leans that way — SELECTION ONLY,
// never FSRS, never above the spine. Default 'balanced' = identity (zero bonus).
//
// The bonus is intentionally small (2): it can tip a coin-flip toward the
// preferred skill, but a genuinely urgent need (>= 3) still wins. Constrained
// autonomy, not a hard override (expertise-reversal guard for beginners).

export const MIX_NEED_BONUS = 2

export const STUDY_MIX_PRESETS = [
  { id: 'balanced', label: 'Balanced', emphasis: null },
  { id: 'more-speaking', label: 'More speaking', emphasis: 'speaking' },
  { id: 'more-writing', label: 'More writing', emphasis: 'writing' },
  { id: 'more-grammar', label: 'More grammar', emphasis: 'grammar' },
]

const BY_ID = new Map(STUDY_MIX_PRESETS.map(p => [p.id, p]))

export function isValidPreset(id) {
  return BY_ID.has(id)
}

export function presetEmphasis(id) {
  return BY_ID.get(id)?.emphasis ?? null
}

// Bonus added to `skillKind`'s need under `presetId`. 0 for balanced/unknown
// (identity) and for any non-emphasised skill.
export function mixNeedBonus(presetId, skillKind) {
  const emphasis = presetEmphasis(presetId)
  return emphasis && emphasis === skillKind ? MIX_NEED_BONUS : 0
}
```

- [ ] **Step 4: Run the test — verify pass**

Run: `npm run test:run -- studyMix`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/studyMix.js src/lib/__tests__/studyMix.test.js
git commit -m "feat(foryou): studyMix preset policy — bounded skill-focus need-bonus (pure)"
```

---

### Task 4: Store — `studyMix` pref + `setStudyMix` + STORE_VERSION 34→35

**Files:**
- Modify: `src/store/useStore.js` (bump version; add field to defaults; export `applyV35Migration`; call it in `migrate`; add `setStudyMix`; import `isValidPreset`)
- Test: `src/store/__tests__/applyV35Migration.test.js`

**Interfaces:**
- Consumes: `isValidPreset` from `studyMix.js` (Task 3).
- Produces: store field `studyMix: { ms, en }`; action `setStudyMix(lang, presetId)`; exported `applyV35Migration(state) → state`.

- [ ] **Step 1: Write the failing test** — `src/store/__tests__/applyV35Migration.test.js`

```js
import { describe, it, expect } from 'vitest'
import { applyV35Migration } from '../useStore.js'

describe('applyV35Migration (v34 → v35)', () => {
  it('adds a balanced studyMix and preserves all existing data', () => {
    const before = { cards: [{ m: 'x' }], studyLang: 'en', mistakes: [] }
    const after = applyV35Migration(before)
    expect(after.studyMix).toEqual({ ms: 'balanced', en: 'balanced' })
    expect(after.cards).toBe(before.cards)   // same ref — no clone of payload
    expect(after.studyLang).toBe('en')
  })
  it('preserves an already-present studyMix (idempotent)', () => {
    const before = { studyMix: { ms: 'more-speaking', en: 'balanced' } }
    expect(applyV35Migration(before).studyMix).toEqual({ ms: 'more-speaking', en: 'balanced' })
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test:run -- applyV35Migration`
Expected: FAIL — `applyV35Migration` is not exported.

- [ ] **Step 3: Bump `STORE_VERSION` and import `isValidPreset`** in `src/store/useStore.js`

Line 39 — change `34` → `35` and update the comment:

```js
export const STORE_VERSION = 35; // v35 = per-language study-mix focus preset (studyMix {ms,en})
```

Add to the imports at the top of the file:

```js
import { isValidPreset } from '../lib/studyMix'
```

- [ ] **Step 4: Add `studyMix` to the default state** — next to **each** `studyLang: 'ms'` initializer (lines ~148 and ~314)

```js
  studyMix: { ms: 'balanced', en: 'balanced' },
```

- [ ] **Step 5: Export `applyV35Migration`** — directly below `applyV34Migration` (≈ line 189)

```js
// v35: per-language study-mix focus preset. Pure; default 'balanced' = no change.
export function applyV35Migration(state) {
  return { ...state, studyMix: state.studyMix || { ms: 'balanced', en: 'balanced' } }
}
```

- [ ] **Step 6: Call it in `migrate`** — immediately before `state._version = STORE_VERSION;` (≈ line 2375)

```js
        // v35: per-language study-mix focus preset.
        if (version < 35) {
          state = applyV35Migration(state);
        }
```

- [ ] **Step 7: Add the `setStudyMix` action** — next to `setStudyLang` (≈ line 945)

```js
      setStudyMix: (lang, presetId) => {
        const l = lang === 'en' ? 'en' : 'ms'
        if (!isValidPreset(presetId)) return
        get().commitPrefMutation(state => ({
          studyMix: { ...(state.studyMix || { ms: 'balanced', en: 'balanced' }), [l]: presetId },
        }))
      },
```

- [ ] **Step 8: Run the migration test + full suite**

Run: `npm run test:run -- applyV35Migration`
Expected: PASS (2 tests).
Run: `npm run test:run` — Expected: all green (migration touches no existing field).

- [ ] **Step 9: Commit**

```bash
git add src/store/useStore.js src/store/__tests__/applyV35Migration.test.js
git commit -m "feat(store): studyMix per-language focus preset + setStudyMix (STORE_VERSION 35)"
```

---

### Task 5: Wire the steer into `dailyPlan.pickSkillFocus` (+ FSRS no-mutation pin)

**Files:**
- Modify: `src/lib/dailyPlan.js` (thread `mixPreset`; add bounded need-bonus; never touch the spine or cards)
- Test: `src/lib/__tests__/dailyPlan.test.js` (extend)

**Interfaces:**
- Consumes: `mixNeedBonus` from `studyMix.js`; `inputs.mixPreset` (string, default `'balanced'`).
- Produces: `buildDailyPlan` skill-focus selection now responds to `inputs.mixPreset`; default unchanged.

- [ ] **Step 1: Write the failing tests** — append to `src/lib/__tests__/dailyPlan.test.js`

```js
// Build inputs where WRITING would naturally edge out SPEAKING (both never
// practised => base need 3; identical), so the bonus is what tips the choice.
function skillFocusInputs() {
  return {
    cards: Array.from({ length: 50 }, (_, i) => ({ m: `w${i}`, e: 'x', due: null })),
    dueCount: 0,            // no due review → skill focus is free to surface
    grammarCards: {},
    studyPlan: { phase: 'review' },   // not 'build' → no grammar bias, no foundation
    speakingHistory: [],
    writingHistory: [],
    mistakes: [],
    examAttempts: [],
  }
}

describe('mix preset steers the skill focus (selection only)', () => {
  it('default (no mixPreset) equals balanced — byte-identical', () => {
    const i = skillFocusInputs()
    expect(buildDailyPlan(i, NOW)).toEqual(buildDailyPlan({ ...i, mixPreset: 'balanced' }, NOW))
  })

  it('more-speaking makes the speaking focus win the slot over writing', () => {
    const i = skillFocusInputs()
    const balanced = buildDailyPlan({ ...i, mixPreset: 'balanced' }, NOW)
    const speaking = buildDailyPlan({ ...i, mixPreset: 'more-speaking' }, NOW)
    // Balanced tie-break is speaking>writing already, so assert via more-writing:
    const writing = buildDailyPlan({ ...i, mixPreset: 'more-writing' }, NOW)
    expect(speaking.tasks.some(t => t.id === 'speaking')).toBe(true)
    expect(writing.tasks.some(t => t.id === 'writing')).toBe(true)
    expect(writing.tasks.some(t => t.id === 'speaking')).toBe(false)
    void balanced
  })

  it('the bonus is bounded — a real urgent need outranks the preset', () => {
    // Writing band 1 (need 5) must beat a more-speaking bonus (+2 on base 3 = 5,
    // tie → tie-break speaking) ... so make writing need 6 to clearly win.
    const i = skillFocusInputs()
    i.writingHistory = [{ ts: NOW - 3 * DAY, band: 0, lang: 'malay' }]  // need = 6
    const speaking = buildDailyPlan({ ...i, mixPreset: 'more-speaking' }, NOW)
    expect(speaking.tasks.some(t => t.id === 'writing')).toBe(true)
  })

  it('never mutates input cards under any preset (FSRS isolation)', () => {
    const i = skillFocusInputs()
    const snapshot = JSON.parse(JSON.stringify(i.cards))
    for (const p of ['balanced', 'more-speaking', 'more-writing', 'more-grammar']) {
      buildDailyPlan({ ...i, mixPreset: p }, NOW)
    }
    expect(i.cards).toEqual(snapshot)   // deep-equal: no field touched
  })
})
```

> If `NOW`/`DAY` aren't already defined in this test file, add `const DAY = 86400000` and reuse the file's existing `now` constant (grep the file header).

- [ ] **Step 2: Run them — verify they fail**

Run: `npm run test:run -- dailyPlan`
Expected: FAIL — `more-writing` does not change the focus yet (steer not wired).

- [ ] **Step 3: Import the policy** in `src/lib/dailyPlan.js` (top of file)

```js
import { mixNeedBonus } from './studyMix'
```

- [ ] **Step 4: Thread `mixPreset` through `pickSkillFocus`** — change the signature and fold the bounded bonus into the not-done branch (preserves the novelty rule: a skill already done today stays at need 0)

```js
function pickSkillFocus(inputs, now, phase, mixPreset = 'balanced') {
  const speakingHistory = asArray(inputs.speakingHistory)
  const writingHistory = asArray(inputs.writingHistory)
  const grammarCards = inputs.grammarCards || {}

  const speakingToday = speakingHistory.some(e => isSameLocalDay(e.ts, now))
  const writingToday = writingHistory.some(e => isSameLocalDay(e.ts, now))

  const latestSpeakBand = speakingHistory[0]?.band
  const latestWriteScore = writingHistory[0]?.score ?? writingHistory[0]?.band
  const speakingNeed = speakingToday ? 0
    : (speakingHistory.length ? clamp(6 - (latestSpeakBand || 0), 0, 6) : 3) + mixNeedBonus(mixPreset, 'speaking')
  const writingNeed = writingToday ? 0
    : (writingHistory.length ? clamp(6 - (latestWriteScore || 0), 0, 6) : 3) + mixNeedBonus(mixPreset, 'writing')

  const dueGrammar = Object.values(grammarCards).filter(c => {
    if (!c || !c.due) return true
    return new Date(c.due).getTime() <= now
  }).length
  let grammarNeed = clamp(dueGrammar / 3, 0, 6)
  if (phase === 'build') grammarNeed += 1
  grammarNeed += mixNeedBonus(mixPreset, 'grammar')
  // ...candidates array and the rest are UNCHANGED...
```

Leave the rest of `pickSkillFocus` (candidates array, sort, return) exactly as-is. The bonus moves the *need* only; `priority` stays `60`/`35`, so the spine (100/80/90) is never crossed.

- [ ] **Step 5: Read `mixPreset` in `buildDailyPlan`** — where the local consts are set (near `const isComeback = ...`) add:

```js
  const mixPreset = inputs.mixPreset || 'balanced'
```

and update the `pickSkillFocus` call (≈ line 229):

```js
  const skill = pickSkillFocus(inputs, now, phase, mixPreset)
```

- [ ] **Step 6: Run tests — verify pass**

Run: `npm run test:run -- dailyPlan`
Expected: PASS (existing + 4 new). The "default equals balanced" + "no mutation" tests pin FSRS isolation.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dailyPlan.js src/lib/__tests__/dailyPlan.test.js
git commit -m "feat(foryou): daily skill-focus responds to study-mix preset (bounded, FSRS-safe)"
```

---

### Task 6: `competenceSnapshot.js` — the "Where you stand" view-model (pure)

**Files:**
- Create: `src/lib/competenceSnapshot.js`
- Test: `src/lib/__tests__/competenceSnapshot.test.js`

**Interfaces:**
- Consumes: `countMastered`, `MASTERED_STABILITY_DAYS` (`fsrs.js`); `skillBalance`, `SKILL_KEYS` (`skillBalance.js`); `buildLearnerProfile` (`learnerProfile.js`).
- Produces: `buildCompetenceSnapshot(input, now) → { readinessPct, mastered, bars:[{skill,count,neglected}], weakSpots:string[] } | null`.

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/competenceSnapshot.test.js`

```js
import { describe, it, expect } from 'vitest'
import { buildCompetenceSnapshot } from '../competenceSnapshot.js'
import { MASTERED_STABILITY_DAYS, State } from '../fsrs.js'

const TODAY = '2026-06-24'
const NOW = new Date(`${TODAY}T12:00:00`).getTime()

describe('buildCompetenceSnapshot', () => {
  it('returns null on an empty deck', () => {
    expect(buildCompetenceSnapshot({ langCards: [], todayISO: TODAY }, NOW)).toBe(null)
    expect(buildCompetenceSnapshot({ todayISO: TODAY }, NOW)).toBe(null)
  })

  it('composes mastered, skill bars, weak spots and readiness', () => {
    const snap = buildCompetenceSnapshot({
      langCards: [{ m: 'a', e: 'a', state: State.Review, stability: MASTERED_STABILITY_DAYS + 50 }],
      readinessPct: 62,
      todayISO: TODAY,
      lang: 'ms',
      writingHistory: [{ ts: NOW, band: 5, lang: 'malay' }],
      mistakes: [{ category: 'vocab', timestamp: NOW, severity: 'high', language: 'ms' }],
    }, NOW)
    expect(snap.readinessPct).toBe(62)
    expect(snap.mastered).toBeGreaterThanOrEqual(1)
    expect(snap.bars.find(b => b.skill === 'writing').count).toBe(1)
    expect(snap.bars.find(b => b.skill === 'reading').neglected).toBe(true)
    expect(snap.weakSpots).toContain('vocab')
  })

  it('readiness is null when not provided', () => {
    const snap = buildCompetenceSnapshot({ langCards: [{ m: 'a' }], todayISO: TODAY }, NOW)
    expect(snap.readinessPct).toBe(null)
  })
})
```

> Before writing, confirm `fsrs.js` exports `MASTERED_STABILITY_DAYS` and `State`. Run: `grep -n "MASTERED_STABILITY_DAYS\|export.*State" src/lib/fsrs.js`. If `MASTERED_STABILITY_DAYS` is not exported, export it (one-line `export const`).

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test:run -- competenceSnapshot`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/competenceSnapshot.js`**

```js
// src/lib/competenceSnapshot.js
// Pure composer for the For-You "Where you stand" panel. Reuses existing
// aggregators — no new tracking, no persisted state. Returns null on an empty
// deck (the panel is hidden; GetStarted owns that moment).
//
// `readinessPct` is passed in (getExamReadiness is a store getter, not pure);
// everything else is composed here. buildLearnerProfile reads recency windows
// via its own Date.now() — a pre-existing trait shared with forYouShelves.

import { countMastered } from './fsrs'
import { skillBalance, SKILL_KEYS } from './skillBalance'
import { buildLearnerProfile } from './learnerProfile'

export function buildCompetenceSnapshot(input = {}, now = Date.now()) {
  const {
    langCards = [], readinessPct = null, todayISO, lang = 'ms',
    skillActivity, writingHistory, speakingHistory, roleplayHistory,
    studyHistory, examAttempts, mistakes, confidenceLog,
  } = input
  void now
  if (!Array.isArray(langCards) || langCards.length === 0) return null

  const balance = skillBalance(
    { skillActivity, writingHistory, speakingHistory, roleplayHistory, studyHistory, examAttempts },
    todayISO,
  )
  const profile = buildLearnerProfile(
    { mistakes, confidenceLog, writingHistory, studyHistory }, { lang },
  )
  const bars = SKILL_KEYS.map(skill => ({
    skill,
    count: balance.counts[skill] || 0,
    neglected: balance.neglected.includes(skill),
  }))
  return {
    readinessPct: typeof readinessPct === 'number' ? readinessPct : null,
    mastered: countMastered(langCards),
    bars,
    weakSpots: profile.focusTopics,
  }
}
```

- [ ] **Step 4: Run the test — verify pass**

Run: `npm run test:run -- competenceSnapshot`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/competenceSnapshot.js src/lib/__tests__/competenceSnapshot.test.js
git commit -m "feat(foryou): competenceSnapshot — compose existing aggregators (pure, null on empty)"
```

---

### Task 7: Surface the "why" in `ForYou.jsx` (WhyLine on heroes, WhyChip on rails)

**Files:**
- Modify: `src/pages/ForYou.jsx` (add `WhyLine` + `WhyChip`; render reason on Picked + Keep-going; ⓘ on the two card rails)

**Interfaces:**
- Consumes: `reasonForTask`, `reasonForPicked`, `reasonForRail` (`whyReason.js`); `meta.focusTopics` on the Picked shelf (already produced by `buildPicked`).

- [ ] **Step 1: Add imports** to `src/pages/ForYou.jsx`

```jsx
import { reasonForTask, reasonForPicked, reasonForRail } from '../lib/whyReason'
import { Info } from 'lucide-react'
```

- [ ] **Step 2: Add the two small presentational components** (above `function Shelf(...)`)

```jsx
// Inline one-line reason for the load-bearing hero items. Always visible —
// transparency is the felt-adaptivity lever.
function WhyLine({ text }) {
  if (!text) return null
  return (
    <p className="text-[11px] mt-2 flex items-start gap-1.5" style={{ color: 'var(--color-dim)' }}>
      <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden={true} />
      <span>{text}</span>
    </p>
  )
}

// Tap-gated "why these?" for the dense word rails — reveal-gated to keep the
// rails clean (ADD-first). Pure UI state, never touches FSRS.
function WhyChip({ text }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1.5"
        style={{ minHeight: 44, color: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}>
        <Info size={12} aria-hidden={true} /> {open ? 'Hide' : 'Why these?'}
      </button>
      {open && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-dim)' }}>{text}</p>
      )}
    </div>
  )
}
```

> `useState` is already imported at the top of `ForYou.jsx`.

- [ ] **Step 3: Render `WhyLine` on the "Picked for you" hero** — inside the `shelf.kind === 'session'` branch, right after the chips `<div>` and before `<PrimaryButton>`:

```jsx
          <WhyLine text={reasonForPicked(shelf.meta?.focusTopics)} />
```

- [ ] **Step 4: Render `WhyLine` on each "Keep going" task card** — inside the `shelf.kind === 'tasks'` branch, after the `{it.sublabel && ...}` block, before the "Start" span:

```jsx
              <WhyLine text={reasonForTask(it)} />
```

- [ ] **Step 5: Render `WhyChip` on the two card rails** — in the final `cards` rail return (the `still-remember`/`saved` shelves), right after `<ShelfHeader shelf={shelf} />`:

```jsx
      <WhyChip text={reasonForRail(shelf.id)} />
```

- [ ] **Step 6: Verify in the browser** (no unit test — JSX layout needs a real browser; e2e lands in Task 10)

Run: `npm run dev`, open `http://localhost:5173/for-you` with a seeded deck (do a study session first).
Expected: "Picked for you" shows a "Built around your weak spots…" line; each Keep-going card shows its reason; the word rails show a tappable "Why these?" chip that expands. Toggle dark/light — text uses `--color-dim`, legible in both.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ForYou.jsx
git commit -m "feat(foryou): surface the 'why' — inline on heroes, tap-gated on word rails"
```

---

### Task 8: `MixSteer` control + wire `mixPreset` into the daily plan & smart session

**Files:**
- Create: `src/components/foryou/MixSteer.jsx`
- Modify: `src/pages/ForYou.jsx` (render `MixSteer`; pass `mixPreset` into `dailyPlanInputs`)
- Modify: `src/components/DailyPlan.jsx` (pass `mixPreset` into its `buildDailyPlan` inputs, for Dashboard parity)
- Modify: `src/pages/SmartStudy.jsx` (default `includeSpeaking` from the active preset)

**Interfaces:**
- Consumes: `STUDY_MIX_PRESETS`, `presetEmphasis` (`studyMix.js`); store `studyMix`, `setStudyMix`, `studyLang`.
- Produces: `dailyPlanInputs.mixPreset` is set on both For-You and Dashboard plans; the preset persists across reload (Task 4 store).

- [ ] **Step 1: Create `src/components/foryou/MixSteer.jsx`**

```jsx
import useStore from '../../store/useStore'
import { STUDY_MIX_PRESETS } from '../../lib/studyMix'

// Constrained focus chooser — named presets (recognition-cost), NOT sliders.
// Steers SELECTION only (which discretionary skill the daily plan surfaces);
// never FSRS scheduling. Hidden by the caller on an empty deck.
export default function MixSteer() {
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const studyMix = useStore(s => s.studyMix)
  const setStudyMix = useStore(s => s.setStudyMix)
  const active = studyMix?.[studyLang] || 'balanced'

  return (
    <section>
      <h3 className="text-base font-bold mb-1">Tune your focus</h3>
      <p className="text-[12px] mb-2.5" style={{ color: 'var(--color-dim)' }}>
        Nudges what your next plan leans toward. Your due reviews always come first.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Focus preset">
        {STUDY_MIX_PRESETS.map(p => {
          const on = p.id === active
          return (
            <button key={p.id} onClick={() => setStudyMix(studyLang, p.id)}
              aria-pressed={on}
              className="px-3.5 py-2.5 rounded-2xl font-semibold text-sm"
              style={{
                minHeight: 44,
                background: on ? 'var(--color-accent)' : 'var(--color-card)',
                color: on ? 'var(--color-on-bright)' : 'var(--color-text)',
                border: '1px solid ' + (on ? 'var(--color-accent)' : 'var(--color-border)'),
              }}>
              {p.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Wire `MixSteer` + `mixPreset` into `src/pages/ForYou.jsx`**

Add imports:

```jsx
import MixSteer from '../components/foryou/MixSteer'
```

Read the preset (with the other slices, body — not in a selector):

```jsx
  const studyMix = useStore(s => s.studyMix)
  const mixPreset = studyMix?.[studyLang] || 'balanced'
```

Add `mixPreset` to `dailyPlanInputs`:

```jsx
    speakingHistory, writingHistory, examAttempts, mistakes, dailyGoalLevel,
    isComeback: daysSince != null && daysSince >= 7,
    mixPreset,
```

Render `MixSteer` only when there's signal — inside the `visible.length === 0 ? ... : ( ... )` populated branch, above the shelves map:

```jsx
        <MixSteer />
```

- [ ] **Step 3: Dashboard parity** — in `src/components/DailyPlan.jsx`, find where it builds `buildDailyPlan` inputs (grep `buildDailyPlan` / `dailyPlanInputs` in that file) and add `mixPreset` from the store the same way:

```jsx
  const studyMix = useStore(s => s.studyMix)
  const studyLang = useStore(s => s.studyLang) || 'ms'
  // ...in the inputs object:
  mixPreset: studyMix?.[studyLang] || 'balanced',
```

> If `DailyPlan.jsx` already reads `studyLang`, reuse it — don't double-declare.

- [ ] **Step 4: SmartStudy speaking default from the preset** — in `src/pages/SmartStudy.jsx`

```jsx
import useStore from '../store/useStore'
import { presetEmphasis } from '../lib/studyMix'
// ...inside the component, replace the includeSpeaking init:
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const studyMix = useStore(s => s.studyMix)
  const [includeSpeaking, setIncludeSpeaking] = useState(
    () => presetEmphasis(studyMix?.[studyLang]) === 'speaking',
  )
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, open `/for-you` (seeded deck). Pick "More writing" → the "Keep going" skill task should lean to writing on next visit (navigate away and back — the page re-snapshots per visit). Pick "More speaking" → open Smart Session, the speaking toggle defaults on. Reload the page → the preset is still selected (persistence). Switch `studyLang` (Settings) → the preset is independent per language.

- [ ] **Step 6: Commit**

```bash
git add src/components/foryou/MixSteer.jsx src/pages/ForYou.jsx src/components/DailyPlan.jsx src/pages/SmartStudy.jsx
git commit -m "feat(foryou): MixSteer focus presets — steer the daily skill-focus + smart-session default"
```

---

### Task 9: `CompetencePanel` — render "Where you stand" (empty-state safe)

**Files:**
- Create: `src/components/foryou/CompetencePanel.jsx`
- Modify: `src/pages/ForYou.jsx` (compose the snapshot input; render the panel only when non-null)

**Interfaces:**
- Consumes: `buildCompetenceSnapshot` (`competenceSnapshot.js`); `getExamReadiness` getter; `toLocalISO` (`localDay.js`); existing ForYou slices.
- Produces: the panel renders from the snapshot; returns nothing when snapshot is null (empty deck).

- [ ] **Step 1: Create `src/components/foryou/CompetencePanel.jsx`**

```jsx
import { categoryLabel } from '../../lib/topicLabels'

const SKILL_LABEL = {
  reading: 'Reading', listening: 'Listening', writing: 'Writing',
  speaking: 'Speaking', vocab: 'Vocab', grammar: 'Grammar', exam: 'Exam',
}

// "Where you stand" — a simple skill-meter OLM. All data is composed upstream
// in competenceSnapshot (pure); this is presentation only.
export default function CompetencePanel({ snapshot }) {
  if (!snapshot) return null
  const { readinessPct, mastered, bars, weakSpots } = snapshot
  const maxCount = Math.max(1, ...bars.map(b => b.count))

  return (
    <section>
      <h3 className="text-base font-bold mb-2.5">Where you stand</h3>
      <div className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-4">
          {typeof readinessPct === 'number' && (
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{readinessPct}%</p>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>exam readiness</p>
            </div>
          )}
          <div>
            <p className="text-2xl font-bold">{mastered}</p>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>words mastered</p>
          </div>
        </div>

        <div className="space-y-1.5" aria-label="Practice balance, last 7 days">
          {bars.map(b => (
            <div key={b.skill} className="flex items-center gap-2">
              <span className="text-[11px] w-16 flex-shrink-0" style={{ color: 'var(--color-dim)' }}>
                {SKILL_LABEL[b.skill] || b.skill}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-card2)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.round((b.count / maxCount) * 100)}%`,
                  background: b.neglected ? 'var(--color-border)' : 'var(--color-accent)',
                }} />
              </div>
              {b.neglected && (
                <span className="text-[10px] font-semibold" style={{ color: 'var(--color-dim)' }}>untouched</span>
              )}
            </div>
          ))}
        </div>

        {weakSpots?.length > 0 && (
          <div>
            <p className="text-[11px] mb-1.5" style={{ color: 'var(--color-dim)' }}>Your weak spots this week</p>
            <div className="flex flex-wrap gap-1.5">
              {weakSpots.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                  {categoryLabel(t)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Compose the snapshot + render it in `src/pages/ForYou.jsx`**

Add imports:

```jsx
import CompetencePanel from '../components/foryou/CompetencePanel'
import { buildCompetenceSnapshot } from '../lib/competenceSnapshot'
import { toLocalISO } from '../lib/localDay'
```

Read the extra slices the snapshot needs (body — these mostly exist already; add only the missing ones):

```jsx
  const skillActivity = useStore(s => s.skillActivity)
  const roleplayHistory = useStore(s => s.roleplayHistory)
```

Build the snapshot (after `shelves`/`visible` are computed):

```jsx
  const competence = buildCompetenceSnapshot({
    langCards,
    readinessPct: getExamReadiness()?.smoothed ?? null,
    todayISO: toLocalISO(new Date(now)),
    lang: studyLang,
    skillActivity, writingHistory, speakingHistory, roleplayHistory,
    studyHistory, examAttempts, mistakes, confidenceLog,
  }, now)
```

Render it in the populated branch (e.g. just below `<MixSteer />`):

```jsx
        <CompetencePanel snapshot={competence} />
```

> Empty-state is automatic: on an empty deck `visible.length === 0` → the whole populated branch (MixSteer + shelves + CompetencePanel) is skipped and `<GetStarted>` renders; and `buildCompetenceSnapshot` returns `null` anyway.

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`. Seeded deck → `/for-you` shows the "Where you stand" panel (readiness %, mastered count, 7 skill bars with "untouched" tags, weak-spot chips). Fresh profile (clear store / new deck empty) → only `<GetStarted>` shows, no panel/steer/why. Dark + light both legible.

- [ ] **Step 4: Commit**

```bash
git add src/components/foryou/CompetencePanel.jsx src/pages/ForYou.jsx
git commit -m "feat(foryou): CompetencePanel — simple skill-meter from existing aggregators"
```

---

### Task 10: e2e + docs + final gate

**Files:**
- Create: `tests/e2e/for-you-show-me-why.spec.js`
- Modify: `README.md` (feature note), `src/lib/guide/tourSteps.js` (For-You guide step), `RESUME_HERE.md` (session state)

**Interfaces:**
- Consumes: the live `/for-you` route; the `bindStore` pattern (see `tests/e2e/mistake-promotion.spec.js`) for the Vite `?t=` module-URL trap.

- [ ] **Step 1: Write the e2e** — `tests/e2e/for-you-show-me-why.spec.js` (mirror the `bindStore` + seed pattern from `mistake-promotion.spec.js`; re-bind after every `goto`/`reload`)

```js
import { test, expect } from '@playwright/test'
// Reuse the project's bindStore helper pattern from mistake-promotion.spec.js
// (pull the live ?t= module URL from performance resource entries).

test.describe('For-You "show me why"', () => {
  test('empty deck shows only Get Started — no why/steer/panel', async ({ page }) => {
    await page.goto('/for-you')
    await expect(page.getByText('Your home fills up as you learn')).toBeVisible()
    await expect(page.getByText('Where you stand')).toHaveCount(0)
    await expect(page.getByText('Tune your focus')).toHaveCount(0)
  })

  test('seeded deck shows reason, steer and competence panel; preset persists', async ({ page }) => {
    await page.goto('/for-you')
    // seed via the live store (bindStore): add cards + a mistake + a study record,
    // then reload so ForYou re-snapshots. (See mistake-promotion.spec.js for the
    // exact window.__STORE binding.)
    // ...seed...
    await page.reload()
    await expect(page.getByText(/Built around your weak spots|need to review/)).toBeVisible()
    await expect(page.getByText('Tune your focus')).toBeVisible()
    await expect(page.getByText('Where you stand')).toBeVisible()
    await page.getByRole('button', { name: 'More writing' }).click()
    await page.reload()
    await expect(page.getByRole('button', { name: 'More writing' })).toHaveAttribute('aria-pressed', 'true')
  })
})
```

- [ ] **Step 2: Run the e2e**

Run: `npm run test:e2e -- for-you-show-me-why`
Expected: PASS (2 tests). If the seed step needs the live store, copy `bindStore` verbatim from `mistake-promotion.spec.js`.

- [ ] **Step 3: Update `README.md`** — add a one-line bullet under the personalization/For-You feature list: *"For-You now shows **why** each item was picked, lets you **tune your focus** (constrained presets — steers selection, never your spaced-repetition schedule), and shows a **Where you stand** competence panel."*

- [ ] **Step 4: Update the in-app guide** — `src/lib/guide/tourSteps.js`: add/extend the For-You step to point at the new "Tune your focus" control and "Where you stand" panel (follow the existing step shape in that file; anchor via the section text or a `data-guide` attr if the tour uses them).

- [ ] **Step 5: Update `RESUME_HERE.md`** — record: Direction B shipped (why-surfacing + mix-steer presets + competence panel); STORE_VERSION 35; deferred follow-up = listening/exam as daily-plan candidates (so they become steerable) → log to `docs/loop/GOAL.md` when the loop is paused.

- [ ] **Step 6: Full gate**

Run: `npm run build` — Expected: 0 errors; ForYou route chunk <70 KB raw (check the build output line for the ForYou chunk).
Run: `npm run test:run` — Expected: all green (~1030 + new).
Run: `npm run lint` — Expected: 0 errors, no new exhaustive-deps warnings.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/for-you-show-me-why.spec.js README.md src/lib/guide/tourSteps.js RESUME_HERE.md
git commit -m "test(foryou): e2e for show-me-why; docs + guide + handoff for Direction B"
```

---

## Self-Review

**1. Spec coverage:**
- §3 Q1 why-visibility → Tasks 1, 2, 7 (whyReason + WhyLine/WhyChip). ✅
- §3 Q2 presets → Tasks 3, 4, 5, 8 (studyMix policy + store + dailyPlan steer + MixSteer UI). ✅
- §3 Q3 competence map → Tasks 6, 9 (competenceSnapshot + CompetencePanel). ✅
- §3 Q4 bilingual/empty-state → per-language `studyMix` (Task 4), empty-state gating (Tasks 7/9), e2e (Task 10). ✅
- §5 FSRS isolation → Task 5 no-mutation + default-equals-balanced tests; no task writes FSRS fields. ✅
- §6 Done #1–7 → Tasks 7/2 (#1), 5/8 (#2), 5 (#3), 6/9 (#4), 7/9/10 (#5), 4/8/10 (#6), 10 (#7). ✅

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to". The two browser-verify steps (Task 7 Step 6, Task 8/9 verify) are deliberate manual UI checks, not code placeholders; the e2e (Task 10) is the automated pin. The e2e seed body references the existing `bindStore` helper rather than re-pasting it — acceptable, it's a named, in-repo pattern with a file pointer.

**3. Type consistency:** `mixNeedBonus(presetId, skillKind)`, `presetEmphasis(id)`, `isValidPreset(id)` used identically in Tasks 3/4/5/8. `buildCompetenceSnapshot(input, now)` shape matches its consumer in Task 9. `studyMix` is `{ ms, en }` everywhere (Tasks 4/8/9). Skill-focus candidate ids `'speaking'|'writing'|'grammar'` match `STUDY_MIX_PRESETS` emphasis values (Tasks 3/5). ✅

**Residual implementation-time checks (cannot be settled on paper):** exact line numbers in `useStore.js`/`dailyPlan.js` drift with edits — anchored by surrounding code, not just line numbers; `MASTERED_STABILITY_DAYS` export confirmed in Task 6 Step 1; `DailyPlan.jsx` input-object location confirmed by grep in Task 8 Step 3; the ForYou route chunk budget is verified, not assumed, in Task 10 Step 6.
