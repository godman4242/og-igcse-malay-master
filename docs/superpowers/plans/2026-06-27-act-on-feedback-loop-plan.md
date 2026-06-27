# Act-on-Feedback Loop (Writing) — Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the writing feedback loop — durably capture the task-aware Content gap, give the student a structured, where-to-next **"Improve your answer"** re-attempt targeting the *specific* missed requirements, and show an honest before→after comparison — with the "improved" claim eval-pinned so a cosmetic edit can never earn it.

**Architecture:** All new logic is **pure and separately tested** (`src/lib/writingReattempt.js` + a pure `ReattemptPanel.jsx`, mirroring the existing `writingMistakeHarvest.js` / `ContentTraitPanel.jsx` split). The Writing page and the grade hook only *wire* the tested pieces. The only new persistence enriches the existing `logWritingFeedback` entry — **no STORE_VERSION bump** (the entry is spread at `useStore.js:988`; sync uses key-union merge). A new `scripts/ai-tier-eval` surface is the ship gate.

**Tech Stack:** React 19 (no TS), Zustand 5, Vitest 4 (jsdom; **no @testing-library** — render via raw `createRoot` + `act`, pattern in `src/components/writing/__tests__/ContentTraitPanel.test.js`), Node ESM eval scripts under `scripts/ai-tier-eval/`.

Spec: [`../specs/2026-06-27-act-on-feedback-loop-design.md`](../specs/2026-06-27-act-on-feedback-loop-design.md). Research: [`../../research/2026-06-27-act-on-feedback-loop-research.md`](../../research/2026-06-27-act-on-feedback-loop-research.md).

## Global Constraints

- **No STORE_VERSION bump.** Durable capture only *adds* fields to the `logWritingFeedback` entry, and only when a task was graded. The no-task entry stays exactly `{ lang, format, band, words }` (+ `id`/`ts` added by the store) — identical to today.
- **No-task / Malay / AI-down paths unchanged.** Task fields appear only when an English task produced a numeric `content_band`.
- **NO praise copy in the revise phase.** Research-forced (Brooks 2021: praise −0.15 with improvement). The re-attempt panel must contain no praise strings (`great`, `well done`, `excellent`, `amazing`, `awesome`, `nice job`, …). Lead with where-to-next.
- **`improved` is only ever a real, earned change** — a higher `content_band` or a genuine ✗→✓ requirement flip. Never derived from positive language.
- **Student does the rewrite.** No "apply AI fix" / auto-rewrite button (guards passive-acceptance over-reliance).
- **How-to-fix hints are authored + offline** (in `writingTasks.js`), index-aligned to `requirements`; honest fallback = show the requirement text alone.
- **Pre-commit gate** runs `build → test:run → lint` automatically and aborts on failure. Run a single test file fast with `npx vitest run <path>`.
- **Standing doc rule:** the same commit that changes behaviour updates README, the driver.js guide (`src/lib/guide/tourSteps.js`), and RESUME_HERE.md.
- **Stage 2 (spaced feed-forward via the mistake queue) is OUT OF SCOPE** — gated on Stage-1 data per the spec; do not build it here.

---

### Task 1: Authored how-to-fix hints in the task catalogue

**Files:**
- Modify: `src/data/writingTasks.js` (add `hints: string[]` to each of the 3 tasks, index-aligned to `requirements`)
- Test: `src/data/__tests__/writingTasks.test.js` (extend)

**Interfaces:**
- Produces: each `WRITING_TASKS[i]` gains an optional `hints` array, `hints.length === requirements.length`, each a non-empty string. Consumed by `missedRequirements` (Task 2).

- [ ] **Step 1: Write the failing test** — append to `src/data/__tests__/writingTasks.test.js`:

```js
describe('writingTasks — how-to-fix hints (act-on-feedback loop)', () => {
  it('every task has a hint for every requirement, index-aligned', () => {
    for (const task of WRITING_TASKS) {
      expect(Array.isArray(task.hints)).toBe(true)
      expect(task.hints.length).toBe(task.requirements.length)
      for (const h of task.hints) {
        expect(typeof h).toBe('string')
        expect(h.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/data/__tests__/writingTasks.test.js` → FAIL (`task.hints` is undefined → `Array.isArray(undefined)` is false).

- [ ] **Step 3: Add the hints** — in `src/data/writingTasks.js`, add a `hints` array to each task (verbatim, index-aligned):

```js
// eng-article-phone-free-lessons
hints: [
  'Say plainly in your opening whether phones should be banned — do not sit on the fence.',
  'Give two reasons and back each with a concrete example (a lesson where a phone helped or distracted).',
  "Name one specific rule and say when it would and wouldn't apply (e.g. off in lessons, allowed at break).",
  'Use a lively, direct tone for fellow students and finish with a one-line takeaway.',
],
// eng-letter-formal-bus-complaint
hints: [
  "State exactly what goes wrong — give times, the route, or how late/crowded — not just 'the bus is bad'.",
  'Spell out the consequence (late for lessons, missed registration) so the manager sees why it matters.',
  "Ask for two concrete actions (an extra bus, a revised timetable), not a vague 'please fix this'.",
  'Open with Dear Sir/Madam, keep a calm respectful tone, and avoid slang or anger.',
],
// eng-report-canteen-survey
hints: [
  'Give it a title and use headings such as Introduction, Findings, Recommendations.',
  "Quote your survey/observation (most students said…, at lunch I saw…) — do not just give opinions.",
  "Recommend two changes and tie each to a finding (because queues were long, …).",
  'Write impersonally and factually for the headteacher — no chatty or emotional language.',
],
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/data/__tests__/writingTasks.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/writingTasks.js src/data/__tests__/writingTasks.test.js
git commit -m "feat(writing): authored how-to-fix hints per task requirement (act-on-feedback loop)"
```

---

### Task 2: Pure re-attempt helpers (`writingReattempt.js`)

**Files:**
- Create: `src/lib/writingReattempt.js`
- Test: `src/lib/__tests__/writingReattempt.test.js`

**Interfaces:**
- Consumes: a task `{ id, requirements, hints? }` (Task 1); an `aiResponse` with `content_band` + `task_coverage` (live `fetchAIGrade` shape); `writingHistory` entries.
- Produces:
  - `missedRequirements(task, coverage) → { index:number, text:string, hint:string }[]`
  - `buildAttemptEntry({ lang, format, band, words, task, aiResponse }) → entry` (task fields only when `task?.id`)
  - `compareAttempts(prevEntry, currEntry, task) → { bandBefore, bandAfter, delta, flipsToMet:number[], flipsToMissed:number[], improved:boolean } | null`
  - `lastTwoAttemptsForTask(history, taskId) → [prev, curr] | null`

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/writingReattempt.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  missedRequirements, buildAttemptEntry, compareAttempts, lastTwoAttemptsForTask,
} from '../writingReattempt'

const TASK = {
  id: 't1',
  requirements: ['R0', 'R1', 'R2'],
  hints: ['H0', 'H1', 'H2'],
}

describe('missedRequirements', () => {
  it('returns only the ✗ requirements, each paired with its hint', () => {
    const missed = missedRequirements(TASK, { req_0: true, req_1: false, req_2: false })
    expect(missed).toEqual([
      { index: 1, text: 'R1', hint: 'H1' },
      { index: 2, text: 'R2', hint: 'H2' },
    ])
  })
  it('treats a missing coverage flag as ✗', () => {
    expect(missedRequirements(TASK, { req_0: true }).map(m => m.index)).toEqual([1, 2])
  })
  it('is empty when all requirements are met', () => {
    expect(missedRequirements(TASK, { req_0: true, req_1: true, req_2: true })).toEqual([])
  })
  it('falls back to empty hint when none authored', () => {
    const t = { id: 'x', requirements: ['A'] }
    expect(missedRequirements(t, {})).toEqual([{ index: 0, text: 'A', hint: '' }])
  })
})

describe('buildAttemptEntry', () => {
  it('adds task fields only when a task was graded', () => {
    const e = buildAttemptEntry({
      lang: 'eng', format: 'eng-article', band: 4, words: 200,
      task: TASK, aiResponse: { content_band: 3, task_coverage: { req_0: true } },
    })
    expect(e).toEqual({
      lang: 'eng', format: 'eng-article', band: 4, words: 200,
      taskId: 't1', contentBand: 3, coverage: { req_0: true },
    })
  })
  it('no-task entry is exactly {lang,format,band,words} (today\'s shape)', () => {
    const e = buildAttemptEntry({ lang: 'eng', format: 'auto', band: 5, words: 150, task: undefined, aiResponse: null })
    expect(e).toEqual({ lang: 'eng', format: 'auto', band: 5, words: 150 })
  })
  it('contentBand is null when the AI returned no Content band', () => {
    const e = buildAttemptEntry({ lang: 'eng', format: 'eng-article', band: 4, words: 200, task: TASK, aiResponse: { band: 4 } })
    expect(e.taskId).toBe('t1')
    expect(e.contentBand).toBeNull()
    expect(e.coverage).toBeNull()
  })
})

describe('compareAttempts', () => {
  const prev = { taskId: 't1', contentBand: 2, coverage: { req_0: true, req_1: false, req_2: false } }
  it('improved=true on a content-band rise', () => {
    const curr = { taskId: 't1', contentBand: 4, coverage: { req_0: true, req_1: false, req_2: false } }
    const c = compareAttempts(prev, curr, TASK)
    expect(c.delta).toBe(2); expect(c.improved).toBe(true)
  })
  it('improved=true on a ✗→✓ flip even with an unchanged band', () => {
    const curr = { taskId: 't1', contentBand: 2, coverage: { req_0: true, req_1: true, req_2: false } }
    const c = compareAttempts(prev, curr, TASK)
    expect(c.flipsToMet).toEqual([1]); expect(c.improved).toBe(true)
  })
  it('improved=false when nothing real changed (the anti-over-praise case)', () => {
    const curr = { taskId: 't1', contentBand: 2, coverage: { req_0: true, req_1: false, req_2: false } }
    expect(compareAttempts(prev, curr, TASK).improved).toBe(false)
  })
  it('improved=false on a band drop; records a ✓→✗ regression', () => {
    const curr = { taskId: 't1', contentBand: 1, coverage: { req_0: false, req_1: false, req_2: false } }
    const c = compareAttempts(prev, curr, TASK)
    expect(c.improved).toBe(false); expect(c.flipsToMissed).toEqual([0])
  })
  it('returns null when an entry is missing', () => {
    expect(compareAttempts(null, prev, TASK)).toBeNull()
  })
})

describe('lastTwoAttemptsForTask', () => {
  it('returns the two most recent entries for the task, oldest-first', () => {
    const history = [
      { taskId: 't1', contentBand: 1 }, { taskId: 'other', contentBand: 9 },
      { taskId: 't1', contentBand: 2 }, { taskId: 't1', contentBand: 4 },
    ]
    expect(lastTwoAttemptsForTask(history, 't1')).toEqual([
      { taskId: 't1', contentBand: 2 }, { taskId: 't1', contentBand: 4 },
    ])
  })
  it('returns null with fewer than two attempts for the task', () => {
    expect(lastTwoAttemptsForTask([{ taskId: 't1' }], 't1')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/__tests__/writingReattempt.test.js` → FAIL (module not found).

- [ ] **Step 3: Write the implementation** — `src/lib/writingReattempt.js`:

```js
// Pure helpers for the act-on-feedback loop. No React, no store, no AI calls.
// Mirrors the writingMistakeHarvest.js split: testable field-mapping in isolation.

// The ✗ requirements of a graded task — those whose coverage flag is not true —
// each paired with its authored how-to-fix hint (empty string when none authored).
export function missedRequirements(task, coverage = {}) {
  if (!task || !Array.isArray(task.requirements)) return []
  return task.requirements
    .map((text, index) => ({ index, text, hint: (task.hints && task.hints[index]) || '' }))
    .filter(({ index }) => coverage?.[`req_${index}`] !== true)
}

// The writingHistory entry for a graded attempt. Task fields are added ONLY when a
// task was graded, so the no-task entry stays byte-identical to today.
export function buildAttemptEntry({ lang, format, band, words, task, aiResponse }) {
  const entry = { lang, format, band, words }
  if (task?.id) {
    entry.taskId = task.id
    entry.contentBand = typeof aiResponse?.content_band === 'number' ? aiResponse.content_band : null
    entry.coverage = aiResponse?.task_coverage ?? null
  }
  return entry
}

// Diff two attempt entries for the SAME task. `improved` is true ONLY on a real,
// earned change: a higher content band OR a requirement that flipped ✗→✓.
export function compareAttempts(prevEntry, currEntry, task) {
  if (!prevEntry || !currEntry) return null
  const bandBefore = typeof prevEntry.contentBand === 'number' ? prevEntry.contentBand : null
  const bandAfter = typeof currEntry.contentBand === 'number' ? currEntry.contentBand : null
  const before = prevEntry.coverage || {}
  const after = currEntry.coverage || {}
  const flipsToMet = []
  const flipsToMissed = []
  const reqCount = task?.requirements?.length || 0
  for (let i = 0; i < reqCount; i++) {
    const wasMet = before[`req_${i}`] === true
    const nowMet = after[`req_${i}`] === true
    if (!wasMet && nowMet) flipsToMet.push(i)
    if (wasMet && !nowMet) flipsToMissed.push(i)
  }
  const delta = (bandBefore != null && bandAfter != null) ? bandAfter - bandBefore : null
  const improved = (delta != null && delta > 0) || flipsToMet.length > 0
  return { bandBefore, bandAfter, delta, flipsToMet, flipsToMissed, improved }
}

// The two most recent writingHistory entries for a task (oldest-first), or null.
export function lastTwoAttemptsForTask(history, taskId) {
  if (!Array.isArray(history) || !taskId) return null
  const forTask = history.filter(e => e.taskId === taskId)
  if (forTask.length < 2) return null
  return forTask.slice(-2)
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/__tests__/writingReattempt.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/writingReattempt.js src/lib/__tests__/writingReattempt.test.js
git commit -m "feat(writing): pure re-attempt helpers — missed reqs, attempt entry, honest compare"
```

---

### Task 3: Durable gap capture (wire `buildAttemptEntry` into the grade hook)

**Files:**
- Modify: `src/hooks/useWritingEvaluator.js` (the two `logWritingFeedback?.(...)` calls at lines ~72-77 and ~85-90, and the Malay/no-Gemini call further down)
- Test: covered by Task 2's `buildAttemptEntry` unit tests + the Task 4 render path; this task is verified by reading the diff + the gate build (no hook-test harness exists — `renderHook`/@testing-library are NOT deps, confirmed).

**Interfaces:**
- Consumes: `buildAttemptEntry` (Task 2). `task`, `aiResponse`, `r` are already in scope at the success site.

- [ ] **Step 1: Import the helper** — at the top of `src/hooks/useWritingEvaluator.js`, add:

```js
import { buildAttemptEntry } from '../lib/writingReattempt'
```

- [ ] **Step 2: Replace the success-path log** (lines ~72-77) — from:

```js
        logWritingFeedback?.({
          lang: 'eng',
          format: r.format,
          band: aiResponse.band,
          words: r.words,
        })
```

to:

```js
        logWritingFeedback?.(buildAttemptEntry({
          lang: 'eng', format: r.format, band: aiResponse.band, words: r.words,
          task, aiResponse,
        }))
```

- [ ] **Step 3: Replace the AI-failure-path log** (catch block, lines ~85-90) — from the `logWritingFeedback?.({ lang:'eng', format:r.format, band:r.band, words:r.words })` to:

```js
        logWritingFeedback?.(buildAttemptEntry({
          lang: 'eng', format: r.format, band: r.band, words: r.words,
          task, aiResponse: null, // AI down → no Content band; honest null
        }))
```

- [ ] **Step 4: Route the Malay/no-Gemini-path log (lines ~99-104) through the helper too** — replace the `logWritingFeedback?.({ lang: lang === 'eng' ? 'eng' : 'malay', format: r.format, band: r.band, words: r.words })` with:

```js
    logWritingFeedback?.(buildAttemptEntry({
      lang: lang === 'eng' ? 'eng' : 'malay', format: r.format, band: r.band, words: r.words,
      task, aiResponse: null,
    }))
```

For **Malay**, `task` is `undefined` (Writing.jsx only sets `selectedTask` for English) → `buildAttemptEntry` yields exactly today's `{lang,format,band,words}` (no regression). For **English-without-Gemini**, a task may be selected → it correctly records `taskId` with `contentBand:null` (an attempt with no AI Content band — honest).

- [ ] **Step 5: Verify no regression** — `npx vitest run src/lib/__tests__/writingReattempt.test.js src/lib/__tests__/writingMistakeHarvest.test.js` → PASS; then `npm run build` → exit 0. Confirm by reading the diff that the no-task/Malay entry shape is unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useWritingEvaluator.js
git commit -m "feat(writing): durably capture taskId+contentBand+coverage on graded attempts (no migration)"
```

---

### Task 4: The re-attempt panel + honest comparison (`ReattemptPanel.jsx`, wired into Writing)

**Files:**
- Create: `src/components/writing/ReattemptPanel.jsx`
- Test: `src/components/writing/__tests__/ReattemptPanel.test.js`
- Modify: `src/pages/Writing.jsx` (render the panel below `ContentTraitPanel`; compute `missed` + `comparison`; the button focuses the textarea)

**Interfaces:**
- Consumes: `missedRequirements`, `compareAttempts`, `lastTwoAttemptsForTask` (Task 2); `writingHistory` from the store; `selectedTask`.
- Props: `ReattemptPanel({ missed, comparison, onImprove })` — `missed: {index,text,hint}[]`, `comparison: null | <compareAttempts result>`, `onImprove: () => void`. Returns `null` when `missed` is empty AND `comparison` is null.

- [ ] **Step 1: Write the failing render test** — `src/components/writing/__tests__/ReattemptPanel.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ReattemptPanel from '../ReattemptPanel'

let root, host
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
const render = (el) => act(async () => root.render(el))

const MISSED = [
  { index: 1, text: 'Gives at least two developed reasons', hint: 'Back each reason with a concrete example.' },
  { index: 2, text: 'Suggests what a fair rule could look like', hint: 'Name one specific rule and when it applies.' },
]
const PRAISE = /\b(great|well done|excellent|amazing|awesome|nice job|fantastic|brilliant)\b/i

describe('ReattemptPanel — pre-resubmit (missed reqs)', () => {
  it('lists each missed requirement AND its how-to-fix hint', async () => {
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison: null, onImprove: () => {} }))
    expect(host.textContent).toContain('Gives at least two developed reasons')
    expect(host.textContent).toContain('Back each reason with a concrete example.')
    expect(host.textContent).toContain('Name one specific rule and when it applies.')
  })
  it('contains NO praise copy in the revise phase', async () => {
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison: null, onImprove: () => {} }))
    expect(host.textContent).not.toMatch(PRAISE)
  })
  it('the Improve button calls onImprove', async () => {
    const onImprove = vi.fn()
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison: null, onImprove }))
    const btn = host.querySelector('[data-reattempt-improve]')
    await act(async () => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onImprove).toHaveBeenCalled()
  })
})

describe('ReattemptPanel — after resubmit (comparison)', () => {
  it('shows the band before→after and the flipped requirement, with no praise', async () => {
    const comparison = { bandBefore: 2, bandAfter: 4, delta: 2, flipsToMet: [1], flipsToMissed: [], improved: true }
    await render(React.createElement(ReattemptPanel, { missed: [], comparison, onImprove: () => {} }))
    expect(host.textContent).toContain('2')
    expect(host.textContent).toContain('4')
    expect(host.textContent).not.toMatch(PRAISE)
  })
  it('states "still needs work" (not improvement) when nothing real changed', async () => {
    const comparison = { bandBefore: 2, bandAfter: 2, delta: 0, flipsToMet: [], flipsToMissed: [], improved: false }
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison, onImprove: () => {} }))
    expect(host.textContent.toLowerCase()).toContain('still')
  })
})

describe('ReattemptPanel — honest degrade', () => {
  it('renders nothing when there is nothing to act on', async () => {
    await render(React.createElement(ReattemptPanel, { missed: [], comparison: null, onImprove: () => {} }))
    expect(host.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/components/writing/__tests__/ReattemptPanel.test.js` → FAIL (module not found).

- [ ] **Step 3: Write the component** — `src/components/writing/ReattemptPanel.jsx`:

```jsx
// ReattemptPanel — the act-on-feedback "Improve your answer" surface.
// PURE & STORE-FREE: props only. Renders the specific missed requirements + their
// how-to-fix hints (focused, where-to-next — NO praise in the revise phase), and,
// after a resubmit, an HONEST before→after comparison (band change + ✗→✓ flips).
// Returns null when there is nothing to act on (all met, no prior attempt).

export default function ReattemptPanel({ missed = [], comparison = null, onImprove }) {
  if ((!missed || missed.length === 0) && !comparison) return null

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)' }}>
      <h3 className="text-sm font-bold">Improve your answer</h3>

      {comparison && (
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
          {comparison.bandBefore != null && comparison.bandAfter != null
            ? <>Content band {comparison.bandBefore} → {comparison.bandAfter}.{' '}</>
            : null}
          {comparison.improved
            ? <>You now meet {comparison.flipsToMet.length} more requirement{comparison.flipsToMet.length === 1 ? '' : 's'}.</>
            : <>Unchanged — these points still need work.</>}
        </p>
      )}

      {missed.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
            Focus on these
          </span>
          {missed.map(m => (
            <div key={m.index} className="text-xs">
              <div className="flex items-start gap-2">
                <span aria-hidden="true" style={{ color: 'var(--color-orange)' }}>✗</span>
                <span style={{ color: 'var(--color-text)' }}>{m.text}</span>
              </div>
              {m.hint && (
                <p className="ml-5 mt-0.5" style={{ color: 'var(--color-dim)' }}>→ {m.hint}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {missed.length > 0 && (
        <button data-reattempt-improve onClick={onImprove}
          className="w-full rounded-xl py-2 text-sm font-bold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-bright)', minHeight: '44px' }}>
          Rewrite, focusing on these points
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/components/writing/__tests__/ReattemptPanel.test.js` → PASS.

- [ ] **Step 5: Wire it into `src/pages/Writing.jsx`** — add the imports:

```jsx
import ReattemptPanel from '../components/writing/ReattemptPanel'
import { missedRequirements, compareAttempts, lastTwoAttemptsForTask } from '../lib/writingReattempt'
```

Read the history (top of the component, with the other `useStore` refs — extract the ref, never call a getter in a selector):

```jsx
const writingHistory = useStore(s => s.writingHistory)
```

Compute, near where `results` is used:

```jsx
const coverage = results?.aiGrade?.task_coverage
const missed = selectedTask && coverage ? missedRequirements(selectedTask, coverage) : []
const pair = selectedTask ? lastTwoAttemptsForTask(writingHistory, selectedTask.id) : null
const comparison = pair ? compareAttempts(pair[0], pair[1], selectedTask) : null
```

Render below `<ContentTraitPanel .../>`:

```jsx
<ReattemptPanel
  missed={missed}
  comparison={comparison}
  onImprove={() => {
    document.querySelector('textarea')?.focus()
    document.querySelector('textarea')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }}
/>
```

(De-emphasis note from the spec §3.3: keep the `ContentTraitPanel` coverage checklist reading above its band ring in this context — it already renders the checklist; this is ordering only, no new logic.)

- [ ] **Step 6: Verify the page builds + the panel test still passes** — `npm run build` → exit 0; `npx vitest run src/components/writing/__tests__/ReattemptPanel.test.js` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/writing/ReattemptPanel.jsx src/components/writing/__tests__/ReattemptPanel.test.js src/pages/Writing.jsx
git commit -m "feat(writing): Improve-your-answer panel — focused missed-req hints + honest before/after"
```

---

### Task 5: The improvement-detection eval (the ship gate)

**Files:**
- Create: `scripts/ai-tier-eval/goldWritingReattemptEn.mjs`
- Modify: `scripts/ai-tier-eval/harness.mjs` + `scripts/ai-tier-eval/score.mjs` (add an `EVAL_SURFACE=reattempt` branch, mirroring the existing `content` surface — read its branch first as the template)

**Interfaces:**
- Consumes: the shipped `buildWritingGradePrompt` (`src/lib/writingGradePrompt.js`) — parity rule, same builder the product uses (mirrors the 2026-06-25 Content eval; do NOT use `prompts.mjs`).
- Produces: an `EVAL_SURFACE=reattempt` report: for each `cosmeticEdit` pair the Content score on `after` must NOT exceed the score on `before`, and no genuinely-missed requirement may flip ✗→✓.

- [ ] **Step 1: Author the gold set** — `scripts/ai-tier-eval/goldWritingReattemptEn.mjs`. Each row: a task (import from `../../src/data/writingTasks.js`), a `before` essay, an `after` essay, a `label` (`realImprovement | cosmeticEdit`), and `targetReq` (the requirement index the edit is tested against). **Weight toward subtle cosmetic edits** (synonym swaps, reordering, an added flourish that does NOT add the missing content). Start with ≥10 pairs across the 3 tasks; ≥6 `cosmeticEdit`. Example shape (author full essays):

```js
export const GOLD_REATTEMPT_EN = [
  {
    id: 'article-cosmetic-1',
    taskId: 'eng-article-phone-free-lessons',
    targetReq: 2, // "Suggests what a fair rule could look like"
    label: 'cosmeticEdit',
    before: '…fluent article that argues a position and gives reasons but proposes NO concrete rule…',
    after:  '…same article with synonyms swapped and a sentence reordered, STILL proposing no concrete rule…',
  },
  {
    id: 'article-real-1',
    taskId: 'eng-article-phone-free-lessons',
    targetReq: 2,
    label: 'realImprovement',
    before: '…same as above, no concrete rule…',
    after:  '…now adds: "Phones should be off during lessons but allowed at break, checked by the class teacher." (genuinely satisfies req 2)…',
  },
  // … ≥8 more, weighted to subtle cosmetic edits …
]
```

- [ ] **Step 2: Add the `reattempt` surface to the harness** — in `harness.mjs`, add a branch (gated by `EVAL_SURFACE=reattempt`, reusing `EVAL_N` for samples + `EVAL_PACE_MS` for pacing, like the `content` surface) that, for each pair, grades `before` and `after` with `fetchAIGrade(...)`-equivalent built from `buildWritingGradePrompt({ task, … })`, records `content_band` + which `targetReq` is met in each, across `EVAL_N` samples.

- [ ] **Step 3: Add the assertion to `score.mjs`** — report, for the `reattempt` surface:
  - **over-praise rate** = fraction of `cosmeticEdit` pairs where `after`'s `content_band` > `before`'s OR `targetReq` flipped ✗→✓ (this must be ~0);
  - **real-improvement recall** = fraction of `realImprovement` pairs where `after` is correctly scored up / flipped;
  - variance across the N samples.

- [ ] **Step 4: Run the gate (free-tier, paced)** — Gemini free quota is ~9–10 calls/day (`[[reference_gemini_free_quota_eval]]`), and each pair = 2 essays × N samples. Run a smoke first:

```bash
EVAL_SURFACE=reattempt EVAL_N=1 EVAL_PACE_MS=6000 node scripts/ai-tier-eval/harness.mjs
```

**Pinned ship gate (Done §5.4):** cosmetic-edit over-praise rate within ceiling (≈0; target ≥9/10 pairs correct) AND real improvements detected. If the free tier fails it, the *comparison/improvement verdict* degrades to a neutral "re-graded — review your requirements" (no improvement claim) or BYOK-gates — record the decision in the results doc; do NOT ship a green improvement claim the eval can't back.

- [ ] **Step 5: Record + commit** — write `docs/research/ai-tier-eval-results/2026-06-27-reattempt-cosmetic-over-praise.md` (mirror the 2026-06-25 content result doc), then:

```bash
git add scripts/ai-tier-eval/goldWritingReattemptEn.mjs scripts/ai-tier-eval/harness.mjs scripts/ai-tier-eval/score.mjs docs/research/ai-tier-eval-results/2026-06-27-reattempt-cosmetic-over-praise.md
git commit -m "feat(eval): cosmetic-edit over-praise gate for the writing re-attempt loop"
```

---

### Task 6: Ship contract — docs, guide, gate

**Files:**
- Modify: `README.md`, `src/lib/guide/tourSteps.js` (and `src/lib/guide/pageGuides.js` Writing entry if a step fits), `RESUME_HERE.md`, `docs/loop/GOAL.md`

- [ ] **Step 1: README** — under the Writing feature, add one line: the analyzer now offers an **"Improve your answer"** re-attempt that targets the specific requirements you missed and shows an honest before→after when you resubmit.
- [ ] **Step 2: Guide** — add/extend the Writing tour step to mention the re-attempt panel (one short step; keep `pageGuides` lazy).
- [ ] **Step 3: RESUME_HERE.md** — record the shipped increment (what landed, the eval verdict, file:lines) per the standing handoff rule, and **supersede the top kickoff block** with the next bet (Stage-2-gate decision OR Malay content increment, per the Stage-1 data).
- [ ] **Step 4: GOAL.md** — mark the act-on-feedback Stage-1 slot done; add the Stage-2 gate (with its data threshold) to the backlog as **needs-Kheshav** (a product/scope decision, not loop-safe).
- [ ] **Step 5: Full gate** — `npm run test:run` (all ~1970+ unit tests) → green; `npm run lint` → 0 errors (3 known warnings); `npm run build` → exit 0. Paste the counts into the RESUME_HERE entry (evidence, not assertion).
- [ ] **Step 6: Commit** (docs-only fast-path applies only if every staged file is `*.md`; here `tourSteps.js` is JS, so the full gate runs)

```bash
git add README.md src/lib/guide/tourSteps.js RESUME_HERE.md docs/loop/GOAL.md
git commit -m "docs(writing): act-on-feedback Stage 1 — README + guide + handoff + GOAL gate for Stage 2"
```

---

## Self-Review (against the spec)

**Spec coverage:** §3.1 durable capture → Task 3 (+ Task 2 `buildAttemptEntry`). §3.2 re-attempt + compare → Tasks 2+4. §3.3 de-emphasis → Task 4 Step 5 note. §3.4 hints → Task 1. §3.6 eval → Task 5. §4 invariant (improved only on real change) → Task 2 `compareAttempts` tests + Task 5 gate. §5 Done items 1–7 → Tasks 3/2/4/5/5/1/6. §3.5 Stage 2 is explicitly OUT (Global Constraints) — correct, it's gated.

**Placeholder scan:** the eval gold essays in Task 5 Step 1 are described, not written verbatim — that is deliberate (authored content the implementer writes + web-verifies, like the 2026-06-25 gold set); the *shape* and the pinned assertion are concrete. All unit-test code is complete and runnable.

**Type consistency:** `missedRequirements`/`buildAttemptEntry`/`compareAttempts`/`lastTwoAttemptsForTask` names + shapes match across Tasks 2, 3, 4. `coverage` keying `req_${i}` matches `ContentTraitPanel.jsx:64`. `content_band`/`task_coverage` match the live `fetchAIGrade` shape. Entry fields (`taskId`/`contentBand`/`coverage`) consistent between Task 2 and Task 3.

## Execution Handoff

This is a **design & research session** — implementation is the NEXT (attended) session. Do not execute now. When Kheshav approves, the next session should use **superpowers:subagent-driven-development** (fresh subagent per task + review between) or **executing-plans** (inline with checkpoints).
