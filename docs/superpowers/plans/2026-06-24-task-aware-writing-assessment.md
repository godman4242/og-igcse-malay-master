# Task-aware Writing Assessment (English 0510, v1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give English (0510) writing students real IGCSE-format **tasks** and grade whether they **fulfilled the task** (Content), not just the form — with a load-bearing eval proving the AI never over-praises an off-topic answer.

**Architecture:** A small original-task catalogue (`writingTasks.js`); the AI grader's system prompt extracted into a shared pure builder that takes an optional `task` and adds a Content trait; the task threaded through the existing English AI path in `useWritingEvaluator`; a new `scripts/ai-tier-eval` gold set + over-praise metric that calls the SAME builder.

**Tech Stack:** React 19, Zustand, Vitest (unit), the existing `scripts/ai-tier-eval` Node harness (manual, key-gated). No new deps.

**Spec:** [`../specs/2026-06-24-task-aware-writing-assessment-design.md`](../specs/2026-06-24-task-aware-writing-assessment-design.md).

## Global Constraints

- **No-task path is byte-identical** to today (regression guard). `task` is optional everywhere; absent → unchanged prompt, request, and parsed result.
- **Prompt parity:** the Content prompt is built by ONE exported `buildWritingGradePrompt(...)` used by BOTH `fetchAIGrade` (product) and the eval. The eval must NOT reuse the harness's existing `prompts.mjs` writing prompt for the Content test.
- **Over-praise invariant (load-bearing):** an off-topic / task-ignoring response scores **Content ≤ 2** regardless of fluency. If the free tier can't satisfy the eval floor, the Content trait BYOK-gates or degrades to "not assessed" — never ship a Content score the eval shows the tier can't back.
- **Honest degrade:** AI unavailable / parse fail / no task → Content omitted (existing `aiGradeUnavailable` + `AddKeyNudge`), never a fabricated band.
- **English 0510 only in v1.** Malay path untouched (stays local-band; Malay is the fast-follow).
- **Copyright:** tasks are ORIGINAL, web-verified IGCSE-format prompts — no real past papers.
- **Display:** two honest, plainly-labelled axes ("Did you answer the task?" = Content; "Writing quality" = existing band). NO fake summed "/15" total. Colours via `var(--color-*)`; ADD-first (scannable).
- **Gate green:** `npm run build` (0 err; Writing route chunk + `writingGrader` chunk within budget), `npm run test:run` (~1970 + new), `npm run lint` (0 err, no new exhaustive-deps). README + `src/lib/guide/tourSteps.js` + `RESUME_HERE.md` + `docs/loop/GOAL.md` updated.

---

### Task 1: `writingTasks.js` — the original English task catalogue

**Files:**
- Create: `src/data/writingTasks.js`
- Test: `src/data/__tests__/writingTasks.test.js`

**Interfaces:**
- Produces: `WRITING_TASKS` (array), `tasksForFormat(formatId, lang) → Task[]`, `getTask(id) → Task|null`. A `Task` = `{ id, lang:'eng', formatId, prompt, requirements: string[], audience, purpose }`.
- Consumes: `FORMATS` ids from `src/lib/writingFormats.js` (each `formatId` must resolve).

- [ ] **Step 1: Write the failing test** — `src/data/__tests__/writingTasks.test.js`

```js
import { describe, it, expect } from 'vitest'
import { WRITING_TASKS, tasksForFormat, getTask } from '../writingTasks.js'
import { FORMATS } from '../../lib/writingFormats.js'

const FORMAT_IDS = new Set(FORMATS.map(f => f.id))

describe('writingTasks catalogue', () => {
  it('has at least 2 English tasks', () => {
    expect(WRITING_TASKS.filter(t => t.lang === 'eng').length).toBeGreaterThanOrEqual(2)
  })
  it('every task is well-formed and points at a real format', () => {
    for (const t of WRITING_TASKS) {
      expect(t.lang).toBe('eng')                       // v1 = English only
      expect(FORMAT_IDS.has(t.formatId)).toBe(true)    // resolves in FORMATS
      expect(typeof t.prompt).toBe('string'); expect(t.prompt.length).toBeGreaterThan(20)
      expect(Array.isArray(t.requirements)).toBe(true); expect(t.requirements.length).toBeGreaterThanOrEqual(2)
    }
  })
  it('ids are unique; lookups work', () => {
    const ids = WRITING_TASKS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(getTask(ids[0])).toMatchObject({ id: ids[0] })
    expect(getTask('nope')).toBe(null)
    expect(tasksForFormat(WRITING_TASKS[0].formatId, 'eng').length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npm run test:run -- writingTasks`
Expected: FAIL — module not found.

- [ ] **Step 3: Author `src/data/writingTasks.js`** — 2–3 ORIGINAL English IGCSE-format tasks. Each `requirements` array = the bullet points an examiner marks Content against. Use the highest-frequency formats whose ids exist in `writingFormats.js` (`eng-letter-formal`, `eng-article`, `eng-report`). Keep prompts original (do NOT copy a real Cambridge question). Example shape — author the real content:

```js
// src/data/writingTasks.js
// Original, copyright-safe IGCSE-format writing TASKS (a prompt + the bullets an
// examiner marks Content/task-fulfilment against). English 0510 only in v1.
// Pure data — pinned by writingTasks.test.js. NO real past-paper text.

export const WRITING_TASKS = [
  {
    id: 'eng-article-screen-time',
    lang: 'eng',
    formatId: 'eng-article',
    prompt: 'Your school magazine is running a debate on screen time. Write an article giving your views on whether students spend too much time on screens.',
    requirements: [
      'States a clear opinion on student screen time',
      'Gives at least two developed reasons / examples',
      'Suits a school-magazine audience (engaging, semi-formal)',
      'Has a title and a clear conclusion',
    ],
    audience: 'school magazine readers (students/teachers)',
    purpose: 'argue / persuade',
  },
  // + 1–2 more (e.g. eng-letter-formal: complaint or request; eng-report).
]

export function getTask(id) {
  return WRITING_TASKS.find(t => t.id === id) || null
}
export function tasksForFormat(formatId, lang = 'eng') {
  return WRITING_TASKS.filter(t => t.formatId === formatId && t.lang === lang)
}
```

> Author 2–3 tasks total. Each `requirement` should be checkable from the essay text (so the AI can mark coverage). Flag the authored tasks for Kheshav's review (content quality) in the task report.

- [ ] **Step 4: Run — verify pass**

Run: `npm run test:run -- writingTasks`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/writingTasks.js src/data/__tests__/writingTasks.test.js
git commit -m "feat(writing): original IGCSE-format English task catalogue (writingTasks)"
```

---

### Task 2: Extract `buildWritingGradePrompt` + add the Content trait (shared, parity)

**Files:**
- Modify: `src/lib/gemini.js` (extract the prompt; add optional `task`; extend JSON schema)
- Test: `src/lib/__tests__/writingGradePrompt.test.js`

**Interfaces:**
- Produces: `buildWritingGradePrompt({ formatHints, metrics, findings, task }) → string` (pure, exported). `fetchAIGrade(content, formatHints, localMetrics, errorSummary, findings, signal, task)` (new optional `task`).
- Return JSON gains (only when `task`): `content_band` (1–6), `content_justification` (string), `task_coverage` (`{ [requirement]: boolean }`). Existing keys unchanged.

- [ ] **Step 1: Capture the current prompt as the regression baseline.** Before refactoring, copy the EXACT current system-prompt string produced by `fetchAIGrade` (gemini.js ~134–170) into the test as `EXPECTED_NO_TASK_PROMPT` (with the same `metricsString` / `findingsList` / `markerKeys` inputs). This pins byte-identity.

- [ ] **Step 2: Write the failing test** — `src/lib/__tests__/writingGradePrompt.test.js`

```js
import { describe, it, expect } from 'vitest'
import { buildWritingGradePrompt } from '../gemini.js'

const metrics = { wordCount: 220, ttr: 0.5, errorsPer100: 1 }
const findings = []
const formatHints = ['Catchy title', 'Hook intro']

describe('buildWritingGradePrompt', () => {
  it('without a task: prompt is byte-identical to the pre-refactor prompt (regression)', () => {
    const EXPECTED_NO_TASK_PROMPT = `...paste the exact current prompt string here...`
    expect(buildWritingGradePrompt({ formatHints, metrics, findings })).toBe(EXPECTED_NO_TASK_PROMPT)
  })
  it('with a task: includes the task prompt, every requirement, the anti-over-praise rule, and the content keys', () => {
    const task = { prompt: 'Write an article on screen time.', requirements: ['States a clear opinion', 'Two developed reasons'] }
    const p = buildWritingGradePrompt({ formatHints, metrics, findings, task })
    expect(p).toContain('Write an article on screen time.')
    expect(p).toContain('States a clear opinion')
    expect(p).toContain('Two developed reasons')
    expect(p.toLowerCase()).toContain('off-topic')          // the anti-over-praise rule
    expect(p).toContain('content_band')                      // the new schema key
    expect(p).toContain('task_coverage')
  })
})
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npm run test:run -- writingGradePrompt`
Expected: FAIL — `buildWritingGradePrompt` not exported.

- [ ] **Step 4: Refactor `gemini.js`** — extract the inline system prompt into `export function buildWritingGradePrompt({ formatHints, metrics, findings, task })`. Keep the no-task branch's text EXACTLY as today. When `task` is present, (a) append a Content section after the band descriptors:

```
TASK (the student was answering this — judge CONTENT against it):
"${task.prompt}"
The task requires the student to:
${task.requirements.map(r => `- ${r}`).join('\n')}
```

and (b) extend the "CRITICAL CALIBRATION - OVERCOMING AI BIAS" block with the anti-over-praise rule:

```
- CONTENT IS SEPARATE FROM LANGUAGE: a fluent, well-written essay that is off-topic, ignores the task, or addresses few of the required points MUST score Content band ≤ 2. Fluency NEVER rescues an off-task answer. Only award high Content when the response genuinely fulfils the task above.
```

and (c) add to the JSON schema (only in the task branch): `"content_band": number, "content_justification": "1-2 sentences citing which requirements were/were not met", "task_coverage": { ${task.requirements.map((r,i)=>`"req_${i}": boolean`).join(', ')} }`.

Then `fetchAIGrade` calls `buildWritingGradePrompt({ formatHints, metrics: localMetrics-mapped, findings, task })` and accepts the new trailing `task` param.

- [ ] **Step 5: Run — verify pass**

Run: `npm run test:run -- writingGradePrompt`
Expected: PASS (both — byte-identical no-task + task-aware).

- [ ] **Step 6: Commit**

```bash
git add src/lib/gemini.js src/lib/__tests__/writingGradePrompt.test.js
git commit -m "feat(writing): shared buildWritingGradePrompt + optional task Content trait (parity, no-task byte-identical)"
```

---

### Task 3: Thread the task through the evaluator + Writing UI (picker, Content axis, honest degrade)

**Files:**
- Modify: `src/hooks/useWritingEvaluator.js` (pass `task` to `fetchAIGrade`)
- Modify: `src/pages/Writing.jsx` (task picker; render the Content axis + coverage; "not assessed" path)
- Create: `src/components/writing/ContentTraitPanel.jsx`

**Interfaces:**
- Consumes: `WRITING_TASKS`/`tasksForFormat` (Task 1); `aiGrade.content_band`/`content_justification`/`task_coverage` (Task 2).

- [ ] **Step 1: Thread `task` in `useWritingEvaluator.js`.** Accept a `task` (hook opt or a setter the page calls), and at line ~63 change the call to `fetchAIGrade(text, r.formatHints, r.metrics, r.errorSummary, r.findings, undefined, task)`. No task → `undefined` → byte-identical. (Malay/no-Gemini path untouched.)

- [ ] **Step 2: Create `src/components/writing/ContentTraitPanel.jsx`** — renders the Content axis when `aiGrade.content_band` is present: the band, `content_justification`, and a coverage checklist from `task_coverage` (✓/✗ per requirement). Returns `null` when there's no Content data. Colours via `var(--color-*)`; label it "Did you answer the task?" (distinct from the existing "Writing quality" band). NO summed total.

- [ ] **Step 3: Add the task picker to `Writing.jsx`.** Above the textarea, when `lang === 'eng'` and the chosen format has tasks (`tasksForFormat`), let the student pick a task or "Free write (no task)". The picked task drives the evaluator (Step 1) and shows the prompt + requirements while writing. "Free write" = no task = today's behavior. Render `<ContentTraitPanel>` in the results when present; when `aiGradeUnavailable`, the existing `AddKeyNudge` shows and NO Content number is fabricated.

- [ ] **Step 4: Verify (browser — JSX layout, no unit test here).** `npm run dev` → `/writing` (English): pick a format with a task → pick the task → write an ON-TASK answer → AI grade shows a Content axis + coverage. Write an OFF-TOPIC but fluent answer → Content is low. "Free write" → no Content axis (unchanged). Dark + light legible.

- [ ] **Step 5: Build + lint, then commit.**

Run: `npm run build` (0 err; note Writing chunk size). `npm run lint` (no new warnings).

```bash
git add src/hooks/useWritingEvaluator.js src/pages/Writing.jsx src/components/writing/ContentTraitPanel.jsx
git commit -m "feat(writing): task picker + Content/task-fulfilment axis in the writing grader (English)"
```

---

### Task 4 (LOAD-BEARING): the over-praise eval — gold set + harness + metric

**Files:**
- Create: `scripts/ai-tier-eval/goldWritingTasksEn.mjs`
- Modify: `scripts/ai-tier-eval/harness.mjs` (a Content-trait section), `scripts/ai-tier-eval/score.mjs` (over-praise metric)
- Test: `scripts/ai-tier-eval/__tests__/goldWritingTasksEn.test.js` (gold-set well-formedness — runs in the unit gate)

**Interfaces:**
- Consumes: `buildWritingGradePrompt` (Task 2 — parity), `WRITING_TASKS` (Task 1), the eval's `geminiClient.mjs`.
- Produces: a `Content` section in the harness report; `overPraiseRate(...)` in `score.mjs`.

- [ ] **Step 1: Author `goldWritingTasksEn.mjs`** — synthetic English essays, each `{ id, taskId, label, expectedContentMax, text }` where `label ∈ onTask|partial|offTopicFluent`. **Weight toward SUBTLE cases:** mostly `partial` (addresses some-but-not-all `requirements`; on-topic-but-wrong-register; drifts off halfway) and `offTopicFluent` (well-written, wrong topic). `expectedContentMax`: `offTopicFluent`→2, `partial`→4, `onTask`→6. Author ~8–10, the majority subtle. Mirror the authoring rigor of `goldWritingEn.mjs` (you KNOW the ground truth because you wrote them).

- [ ] **Step 2: Write the well-formedness test** — `scripts/ai-tier-eval/__tests__/goldWritingTasksEn.test.js`

```js
import { describe, it, expect } from 'vitest'
import { WRITING_TASKS_GOLD } from '../goldWritingTasksEn.mjs'
import { getTask } from '../../../src/data/writingTasks.js'

describe('goldWritingTasksEn', () => {
  it('every gold essay points at a real task and has a valid label + expectedContentMax', () => {
    for (const g of WRITING_TASKS_GOLD) {
      expect(getTask(g.taskId)).not.toBe(null)
      expect(['onTask', 'partial', 'offTopicFluent']).toContain(g.label)
      expect(g.expectedContentMax).toBeGreaterThanOrEqual(1)
      expect(g.text.length).toBeGreaterThan(40)
    }
  })
  it('is weighted toward subtle cases (partial + offTopicFluent are the majority)', () => {
    const subtle = WRITING_TASKS_GOLD.filter(g => g.label !== 'onTask').length
    expect(subtle).toBeGreaterThan(WRITING_TASKS_GOLD.length / 2)
  })
})
```

Run: `npm run test:run -- goldWritingTasksEn` → FAIL (module missing) → author the gold set → PASS.

- [ ] **Step 3: Wire the Content section into `harness.mjs`.** For each gold essay: build the product prompt via `buildWritingGradePrompt({ formatHints: <task format hints>, metrics: <cheap local metrics or {}>, findings: [], task: getTask(g.taskId) })`, send it through the eval's `geminiClient` (`geminiText` + `parseJson`) **N=3 times at low temperature**, collect `content_band` each time. Key-gated like the rest of the harness (no key → dry run + cost estimate).

- [ ] **Step 4: Add the metric to `score.mjs`.**

```js
// Over-praise: a gold essay whose Content band exceeds its expectedContentMax.
export function overPraiseRate(results) {
  // results: [{ expectedContentMax, samples: number[] }] — one per gold essay
  const flagged = results.filter(r => r.samples.some(b => b > r.expectedContentMax))
  return { rate: flagged.length / Math.max(1, results.length), flagged }
}
```

The harness prints: over-praise rate, per-label breakdown, and sample variance. **Decision gate (the spec's Done #2): off-topic/partial essays within `expectedContentMax` in ≥ 9/10, across the 3 samples.**

- [ ] **Step 5: Commit.**

```bash
git add scripts/ai-tier-eval/goldWritingTasksEn.mjs scripts/ai-tier-eval/harness.mjs scripts/ai-tier-eval/score.mjs scripts/ai-tier-eval/__tests__/goldWritingTasksEn.test.js
git commit -m "feat(eval): over-praise gold set + metric for the writing Content trait (parity prompt, N-sampled)"
```

> The eval RUN is manual + key-gated (Kheshav's Gemini key, his cost) — it is the SHIP GATE, run in Task 5's verification, not the unit gate.

---

### Task 5: Run the ship-gate eval + docs + final gate

**Files:**
- Modify: `README.md`, `src/lib/guide/tourSteps.js` (Writing step), `RESUME_HERE.md`, `docs/loop/GOAL.md`

- [ ] **Step 1: Run the over-praise eval (THE SHIP GATE).** `npm run eval:ai-tier` with a `GEMINI_KEY` set. **Decision:** if off-topic/partial essays stay within `expectedContentMax` in ≥ 9/10 (across the 3 samples) → the free-tier Content trait ships ON. If NOT → BYOK-gate the Content trait (show it only when a key is configured) or degrade to "Content: not assessed"; record the result in `docs/research/ai-tier-eval-results/`. Paste the eval output as evidence — do not assert.
- [ ] **Step 2: README** — one bullet under Writing: task-aware grading that judges whether you answered the task (English), with the honesty that it won't over-praise an off-topic answer.
- [ ] **Step 3: `tourSteps.js`** — extend the Writing step: "Pick a task and the grader checks whether you actually answered it, not just your spelling and grammar."
- [ ] **Step 4: `RESUME_HERE.md`** — record v1 shipped (English Content trait + tasks + over-praise eval + result/decision); **Malay 0546 increment is the named fast-follow** (own examiner prompt + Malay gold set).
- [ ] **Step 5: `docs/loop/GOAL.md`** — set the directed-epic slot to this; move the Malay increment into the needs-Kheshav/loop queue as appropriate (it needs authored Malay tasks + a Malay examiner prompt — likely needs-Kheshav for task content review).
- [ ] **Step 6: Final gate.** `npm run build` (0 err; Writing + writingGrader chunks within budget), `npm run test:run` (all green), `npm run lint` (0 err).
- [ ] **Step 7: Commit.**

```bash
git add README.md src/lib/guide/tourSteps.js RESUME_HERE.md docs/loop/GOAL.md
git commit -m "docs(writing): task-aware grading v1 — eval result + README + guide + handoff; Malay increment queued"
```

---

## Self-Review

**1. Spec coverage:**
- §3.1 tasks → Task 1. ✅  §3.2 grader contract + shared builder + parity → Task 2. ✅  §3.3 wiring/UI → Task 3. ✅  §3.4 honest degrade → Task 3 (AddKeyNudge / no fabricated band). ✅  §3.5 + §4 over-praise eval (subtle-weighted, N-sampled, parity prompt) → Task 4 + run in Task 5. ✅  §5 Done #1–6 → Tasks 1/2 (#1,#3), 4+5 (#2 over-praise), 3 (#4 degrade), 1 (#5 tasks), 5 (#6 gate+docs). ✅
- **English-only v1 / Malay fast-follow** → Task 5 Step 4–5 names it; no Malay code touched. ✅

**2. Placeholder scan:** The authored content (tasks in Task 1 Step 3; gold essays in Task 4 Step 1) is specified by CRITERIA + an example, not pasted in full — this is authoring work (like the existing `goldWritingEn.mjs`), not a code placeholder; the well-formedness tests pin the structure. The `EXPECTED_NO_TASK_PROMPT` fixture (Task 2 Step 1) must be filled with the captured current prompt — explicitly called out as a required capture step.

**3. Type consistency:** `Task` shape (`{id,lang,formatId,prompt,requirements}`) consistent across Tasks 1/3/4. `buildWritingGradePrompt({formatHints,metrics,findings,task})` + `content_band`/`content_justification`/`task_coverage` consistent across Tasks 2/3/4. `getTask`/`tasksForFormat`/`WRITING_TASKS` consistent. `WRITING_TASKS_GOLD` entry (`{id,taskId,label,expectedContentMax,text}`) consistent Task 4. ✅

**Residual (verified at build time, not on paper):** the exact current prompt string for the byte-identical fixture (captured in Task 2 Step 1); the eval's `geminiText`/`parseJson` signatures + how to set temperature (read `geminiClient.mjs` in Task 4 Step 3); the Writing route + writingGrader chunk budgets (checked in Task 5 Step 6). The over-praise floor itself is verified by RUNNING the eval (Task 5 Step 1) — the one Done that needs Kheshav's key.
