# Tutor Output Contract v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a model-agnostic, app-side post-processor that makes Cikgu Maya's AI-tier answers short-where-appropriate, one-next-action, honest, and non-answer-dumping in retrieval contexts — regardless of which backend produced the text.

**Architecture:** A new **pure** module `src/lib/tutorContract.js` (no DOM/network, `now` injected) exposing `enforceTutorTurn(rawText, ctx)`. It is called at the one convergence point in `CikguBot.jsx`'s `sendMessage`, wrapping the 3 AI-generated branches (Gemini / OpenRouter / Supabase) before `addMessage` + `return`. Expert-tier branches are exempt (curated + already hedged). A small mode-conditional fragment is appended to the shared system prompt (Layer A nudge) so cooperative models self-shape; the pure enforcer is the deterministic backstop for weak models (Layer B). Ships behind a default-OFF flag; flip default-ON only after eval + a manual smoke pass.

**Tech Stack:** React 19, Zustand, Vitest. Plain JS in `src/lib` (`.js`, not TS). Follows the repo's "pure module + thin impure caller" convention.

## Global Constraints

- **Pure-layer purity:** no `Date.now()` / `Math.random()` in module scope or render; inject `now` (default param). (`src/lib/CLAUDE.md`)
- **File type:** `src/lib/tutorContract.js` is **`.js`** (matches the logic layer).
- **Prompt parity (load-bearing):** any change to `CIKGU_SYSTEM_PROMPT` (`src/core/agent/promptLibrary.ts`) MUST be mirrored into `scripts/ai-tier-eval/prompts.mjs` (`CIKGU_BYOK_SYSTEM`) and is guarded by `src/lib/__tests__/cikguSystemPrompt.test.js`. "Change one, change all."
- **Do NOT reverse direct-instruction.** `explain` mode keeps "lead with the answer + worked example." The contract only *adds* a one-next-step rule and a *retrieval-mode* no-reveal-before-attempt rule. (Pedagogy decision 2026-07-08.)
- **Expert-tier exempt.** The enforcer wraps only the 3 AI branches (`chatWithGemini`, `chatWithFreeModel`, `ai.call`), never `getExpertResponse`.
- **Ship behind a flag.** `TUTOR_CONTRACT_ENABLED` (module const in `tutorContract.js`) defaults to `false`; the wiring no-ops until flipped. No STORE_VERSION bump (v1 stores no new state).
- **Canonical signature (used across tasks):**
  `enforceTutorTurn(rawText: string, ctx: { mode: 'explain'|'retrieval', attempted: boolean, now: number }) → { text: string, meta: { truncated: boolean, leakFlagged: boolean, nextActionPresent: boolean, hadControlBlock: boolean } }`

---

### Task 1: Control-block parse/strip

**Files:**
- Create: `src/lib/tutorContract.js`
- Test: `src/lib/__tests__/tutorContract.test.js`

**Interfaces:**
- Produces: `parseTutorControl(rawText: string) → { text: string, control: object|null }` — strips a trailing `⟦CTRL⟧{...}` tail (forward-compat with v1.1's model control block) so it can never render or be read aloud; defensive on malformed JSON.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/__tests__/tutorContract.test.js
import { describe, it, expect } from 'vitest'
import { parseTutorControl } from '../tutorContract'

describe('parseTutorControl', () => {
  it('returns text unchanged and null control when no control block', () => {
    expect(parseTutorControl('Jawapannya ialah "makan".')).toEqual({
      text: 'Jawapannya ialah "makan".', control: null,
    })
  })
  it('strips a trailing control block and parses it', () => {
    const raw = 'Guna "mem-" di sini.\n⟦CTRL⟧{"gave_answer":true,"next_action":"try one"}'
    const out = parseTutorControl(raw)
    expect(out.text).toBe('Guna "mem-" di sini.')
    expect(out.control).toEqual({ gave_answer: true, next_action: 'try one' })
  })
  it('is defensive: malformed control JSON is stripped, control=null', () => {
    const out = parseTutorControl('Answer.\n⟦CTRL⟧{not json')
    expect(out.text).toBe('Answer.')
    expect(out.control).toBeNull()
  })
  it('handles non-string input', () => {
    expect(parseTutorControl(undefined)).toEqual({ text: '', control: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js`
Expected: FAIL — "Failed to resolve import '../tutorContract'" / `parseTutorControl is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/tutorContract.js
// Pure tutor-output post-processor (Layer B). No DOM, no network, `now` injected.
// Wraps ONLY the AI-generated Cikgu branches; expert-tier is exempt.
export const CTRL_DELIM = '⟦CTRL⟧'

export function parseTutorControl(rawText) {
  const text = typeof rawText === 'string' ? rawText : ''
  const i = text.lastIndexOf(CTRL_DELIM)
  if (i === -1) return { text: text.trim(), control: null }
  let control = null
  try { control = JSON.parse(text.slice(i + CTRL_DELIM.length).trim()) } catch { control = null }
  return { text: text.slice(0, i).trim(), control }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutorContract.js src/lib/__tests__/tutorContract.test.js
git commit -m "feat(tutor-contract): parseTutorControl — strip trailing control block"
```

---

### Task 2: Mode-aware length safety-net

**Files:**
- Modify: `src/lib/tutorContract.js`
- Test: `src/lib/__tests__/tutorContract.test.js`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `enforceLength(text: string, opts: { mode: 'explain'|'retrieval' }) → { text: string, truncated: boolean }` — a **safety-net only**: leaves normal answers untouched, truncates run-away replies at a sentence boundary. `explain` budget = 220 words (above the prompt's 120–200 target, so real worked examples pass); `retrieval` budget = 60.

- [ ] **Step 1: Write the failing test**

```js
// append to src/lib/__tests__/tutorContract.test.js
import { enforceLength } from '../tutorContract'

describe('enforceLength', () => {
  it('leaves a normal explain answer untouched', () => {
    const t = 'Guna "mem-". Contoh: "memasak". ✓'
    expect(enforceLength(t, { mode: 'explain' })).toEqual({ text: t, truncated: false })
  })
  it('truncates a runaway explain answer at a sentence boundary', () => {
    const t = Array.from({ length: 300 }, (_, i) => (i % 12 === 11 ? 'end.' : 'word')).join(' ')
    const out = enforceLength(t, { mode: 'explain' })
    expect(out.truncated).toBe(true)
    expect(out.text.split(/\s+/).length).toBeLessThanOrEqual(221)
    expect(out.text.trim().endsWith('.') || out.text.trim().endsWith('…')).toBe(true)
  })
  it('applies a tighter budget in retrieval mode', () => {
    const t = Array.from({ length: 120 }, () => 'kata').join(' ')
    const out = enforceLength(t, { mode: 'retrieval' })
    expect(out.truncated).toBe(true)
    expect(out.text.split(/\s+/).length).toBeLessThanOrEqual(61)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js -t enforceLength`
Expected: FAIL — `enforceLength is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/lib/tutorContract.js`:
```js
const WORD_BUDGET = { explain: 220, retrieval: 60 }

export function enforceLength(text, { mode = 'explain' } = {}) {
  const budget = WORD_BUDGET[mode] ?? WORD_BUDGET.explain
  const words = (text || '').split(/\s+/).filter(Boolean)
  if (words.length <= budget) return { text, truncated: false }
  const capped = words.slice(0, budget).join(' ')
  const lastStop = Math.max(capped.lastIndexOf('. '), capped.lastIndexOf('! '), capped.lastIndexOf('? '))
  const out = lastStop > budget * 0.4 ? capped.slice(0, lastStop + 1) : capped + '…'
  return { text: out, truncated: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js -t enforceLength`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutorContract.js src/lib/__tests__/tutorContract.test.js
git commit -m "feat(tutor-contract): enforceLength mode-aware safety-net"
```

---

### Task 3: Next-action detection + answer-leak heuristic

**Files:**
- Modify: `src/lib/tutorContract.js`
- Test: `src/lib/__tests__/tutorContract.test.js`

**Interfaces:**
- Produces:
  - `hasNextAction(text: string) → boolean` — true if the reply ends with a question or an explicit next-step line.
  - `detectAnswerLeak(text: string, ctx: { mode, attempted }) → boolean` — v1 heuristic **flag** (never a block): true only when `mode==='retrieval' && attempted===false` AND the text hands a full answer ("jawapannya ialah" / "the answer is" / "correct answer" / a ✓-corrected line). Low-precision by design → validated in Task 8.

- [ ] **Step 1: Write the failing test**

```js
// append to src/lib/__tests__/tutorContract.test.js
import { hasNextAction, detectAnswerLeak } from '../tutorContract'

describe('hasNextAction', () => {
  it('true when reply ends with a question', () => {
    expect(hasNextAction('Guna mem-. Cuba awak buat satu?')).toBe(true)
  })
  it('true on an explicit next-step arrow line', () => {
    expect(hasNextAction('Betul.\n→ Seterusnya: cuba "beli".')).toBe(true)
  })
  it('false when the reply just states facts', () => {
    expect(hasNextAction('Imbuhan mem- digunakan sebelum huruf p.')).toBe(false)
  })
})

describe('detectAnswerLeak', () => {
  it('flags a full answer given before an attempt in retrieval mode', () => {
    expect(detectAnswerLeak('Jawapannya ialah "memasak".', { mode: 'retrieval', attempted: false })).toBe(true)
  })
  it('does NOT flag in explain mode (answers are expected there)', () => {
    expect(detectAnswerLeak('Jawapannya ialah "memasak".', { mode: 'explain', attempted: false })).toBe(false)
  })
  it('does NOT flag once the student has attempted', () => {
    expect(detectAnswerLeak('Jawapannya ialah "memasak".', { mode: 'retrieval', attempted: true })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js -t "hasNextAction|detectAnswerLeak"`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Write minimal implementation**

```js
// add to src/lib/tutorContract.js
export function hasNextAction(text) {
  const t = (text || '').trim()
  if (!t) return false
  const lastLine = t.split('\n').filter(Boolean).pop() || ''
  return /\?\s*$/.test(t) || /^(→|next|seterusnya|cuba|try)\b/i.test(lastLine)
}

const LEAK_PATTERNS = [
  /jawapan(nya)?\s+(ialah|adalah)/i,
  /the\s+answer\s+is/i,
  /correct\s+answer\s*[:—-]/i,
  /^✓/m,
]
export function detectAnswerLeak(text, { mode = 'explain', attempted = false } = {}) {
  if (mode !== 'retrieval' || attempted) return false
  return LEAK_PATTERNS.some((re) => re.test(text || ''))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js -t "hasNextAction|detectAnswerLeak"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutorContract.js src/lib/__tests__/tutorContract.test.js
git commit -m "feat(tutor-contract): hasNextAction + detectAnswerLeak heuristics"
```

---

### Task 4: Assemble `enforceTutorTurn` + the `TUTOR_CONTRACT_ENABLED` flag

**Files:**
- Modify: `src/lib/tutorContract.js`
- Test: `src/lib/__tests__/tutorContract.test.js`

**Interfaces:**
- Consumes: `parseTutorControl`, `enforceLength`, `hasNextAction`, `detectAnswerLeak`.
- Produces:
  - `TUTOR_CONTRACT_ENABLED: boolean` (default `false`).
  - `enforceTutorTurn(rawText, ctx) → { text, meta: { truncated, leakFlagged, nextActionPresent, hadControlBlock } }` (canonical signature in Global Constraints).

- [ ] **Step 1: Write the failing test**

```js
// append to src/lib/__tests__/tutorContract.test.js
import { enforceTutorTurn, TUTOR_CONTRACT_ENABLED } from '../tutorContract'

describe('enforceTutorTurn', () => {
  it('defaults the ship flag to OFF', () => {
    expect(TUTOR_CONTRACT_ENABLED).toBe(false)
  })
  it('strips the control block, reports meta, and never alters a clean explain answer', () => {
    const raw = 'Guna "mem-". Contoh: "memasak". Cuba awak buat satu?\n⟦CTRL⟧{"gave_answer":false}'
    const out = enforceTutorTurn(raw, { mode: 'explain', attempted: false, now: 0 })
    expect(out.text).toBe('Guna "mem-". Contoh: "memasak". Cuba awak buat satu?')
    expect(out.meta).toEqual({ truncated: false, leakFlagged: false, nextActionPresent: true, hadControlBlock: true })
  })
  it('flags a retrieval-mode leak', () => {
    const out = enforceTutorTurn('Jawapannya ialah "memasak".', { mode: 'retrieval', attempted: false, now: 0 })
    expect(out.meta.leakFlagged).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js -t enforceTutorTurn`
Expected: FAIL — `enforceTutorTurn is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// add to src/lib/tutorContract.js
export const TUTOR_CONTRACT_ENABLED = false

// eslint-disable-next-line no-unused-vars — `now` reserved for future recency-aware rules; keeps signature stable.
export function enforceTutorTurn(rawText, { mode = 'explain', attempted = false, now = 0 } = {}) {
  const { text: stripped, control } = parseTutorControl(rawText)
  const { text, truncated } = enforceLength(stripped, { mode })
  return {
    text,
    meta: {
      truncated,
      leakFlagged: detectAnswerLeak(text, { mode, attempted }),
      nextActionPresent: hasNextAction(text),
      hadControlBlock: control !== null,
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/tutorContract.test.js`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutorContract.js src/lib/__tests__/tutorContract.test.js
git commit -m "feat(tutor-contract): assemble enforceTutorTurn + default-off flag"
```

---

### Task 5: Prompt fragment (Layer A) + parity mirror + parity test

**Files:**
- Modify: `src/core/agent/promptLibrary.ts:12-35` (append fragment to `CIKGU_SYSTEM_PROMPT`)
- Modify: `scripts/ai-tier-eval/prompts.mjs` (mirror the fragment into `CIKGU_BYOK_SYSTEM`)
- Modify: `src/lib/__tests__/cikguSystemPrompt.test.js` (assert the fragment in both)

**Interfaces:**
- Produces: a `CIKGU_SYSTEM_PROMPT` that additionally instructs one-next-step + retrieval-mode no-reveal, without removing the direct-instruction stance.

- [ ] **Step 1: Write the failing test**

```js
// add inside the first describe in src/lib/__tests__/cikguSystemPrompt.test.js
  it('adds the tutor-contract rules (one next step + retrieval no-reveal) without dropping direct instruction', () => {
    const p = promptLib.CIKGU_SYSTEM_PROMPT
    expect(p).toContain('Lead with the answer')            // direct instruction survives
    expect(p).toMatch(/end (every|each) reply with exactly one/i)
    expect(p).toMatch(/attempting an exercise|checking their answer/i)
    expect(p).toMatch(/don'?t reveal the full answer/i)
  })
```
Add a parity assertion (new describe at end of file):
```js
import { readFileSync } from 'node:fs'
describe('eval prompt mirrors the app prompt', () => {
  it('CIKGU_BYOK_SYSTEM carries the same one-next-step rule', () => {
    const evalPrompt = readFileSync(new URL('../../../scripts/ai-tier-eval/prompts.mjs', import.meta.url), 'utf8')
    expect(evalPrompt).toMatch(/end (every|each) reply with exactly one/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/cikguSystemPrompt.test.js`
Expected: FAIL — new assertions not satisfied.

- [ ] **Step 3: Write minimal implementation**

Append to the `CIKGU_SYSTEM_PROMPT` template literal in `src/core/agent/promptLibrary.ts` (before the closing backtick), keeping existing content:
```
- End every reply with exactly one next step or one check-for-understanding question — never more than one.
- If the student is attempting an exercise or checking their answer, DON'T reveal the full answer first: give one hint and invite an attempt. Otherwise, lead with the answer as usual.
```
Mirror the identical two lines into `CIKGU_BYOK_SYSTEM` in `scripts/ai-tier-eval/prompts.mjs`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/cikguSystemPrompt.test.js`
Expected: PASS (existing + new assertions).

- [ ] **Step 5: Commit**

```bash
git add src/core/agent/promptLibrary.ts scripts/ai-tier-eval/prompts.mjs src/lib/__tests__/cikguSystemPrompt.test.js
git commit -m "feat(tutor-contract): Layer-A prompt fragment + eval parity mirror"
```

---

### Task 6: Wire learner-profile scaffold hint into Cikgu context

**Files:**
- Create: `src/lib/tutorContext.js` (pure helper) + `src/lib/__tests__/tutorContext.test.js`
- Modify: `src/pages/CikguBot.jsx:88-93` (append the hint to `contextNote`)

**Interfaces:**
- Produces: `learnerScaffoldNote(profile) → string` — one line the model receives, e.g. `"\nScaffold level: heavy (student is struggling — smaller steps, more checks)."` Empty string when profile is absent/medium.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/__tests__/tutorContext.test.js
import { describe, it, expect } from 'vitest'
import { learnerScaffoldNote } from '../tutorContext'

describe('learnerScaffoldNote', () => {
  it('returns a heavy-scaffold hint', () => {
    expect(learnerScaffoldNote({ scaffoldLevel: 'heavy' })).toMatch(/scaffold level: heavy/i)
  })
  it('returns empty string for medium or missing profile', () => {
    expect(learnerScaffoldNote({ scaffoldLevel: 'medium' })).toBe('')
    expect(learnerScaffoldNote(null)).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tutorContext.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/tutorContext.js
const NOTE = {
  heavy: '\nScaffold level: heavy (student is struggling — smaller steps, one idea at a time, more checks).',
  light: '\nScaffold level: light (student is strong — you can be brisk).',
}
export function learnerScaffoldNote(profile) {
  return (profile && NOTE[profile.scaffoldLevel]) || ''
}
```
Then in `src/pages/CikguBot.jsx`, import `buildLearnerProfile` + `learnerScaffoldNote`, and extend `contextNote` (currently built at lines 91-93):
```jsx
// after existing contextNote is computed:
const profile = buildLearnerProfile(useStore.getState(), { lang: 'ms' })
const scaffoldNote = learnerScaffoldNote(profile)
// then send `contextNote + scaffoldNote` wherever contextNote is passed (Gemini/OpenRouter/Supabase branches)
```

- [ ] **Step 4: Run test + build**

Run: `npx vitest run src/lib/__tests__/tutorContext.test.js && npm run build`
Expected: tests PASS; build zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tutorContext.js src/lib/__tests__/tutorContext.test.js src/pages/CikguBot.jsx
git commit -m "feat(tutor-contract): feed learner scaffold level into Cikgu context"
```

---

### Task 7: Wire `enforceTutorTurn` into CikguBot (flag-gated) + streaming strip

**Files:**
- Modify: `src/pages/CikguBot.jsx` — `sendMessage` (75-156) 3 AI branches; streaming bubble (548).

**Interfaces:**
- Consumes: `enforceTutorTurn`, `TUTOR_CONTRACT_ENABLED`, `parseTutorControl` (all from `src/lib/tutorContract.js`).

- [ ] **Step 1: Add a `finalizeAi` helper inside `sendMessage`**

Add near the top of `sendMessage` (after `content` is set), a local helper and a `ctx`:
```jsx
const ctx = { mode: 'explain', attempted: false, now: Date.now() } // v1: Cikgu chat defaults to explain
const finalizeAi = (raw) => TUTOR_CONTRACT_ENABLED ? enforceTutorTurn(raw, ctx).text : raw
```

- [ ] **Step 2: Wrap the 3 AI branches (NOT expert)**

Replace each AI-branch pair. Example for the Gemini branch (lines 104-106):
```jsx
const shaped = finalizeAi(response)
addMessage({ role: 'assistant', content: shaped, mode: 'ai' })
setAiLoading(false)
return shaped
```
Apply the identical shape to the OpenRouter branch (121-123, wrap `response`) and the Supabase branch (140-141, wrap `result.response`). **Leave the two `getExpertResponse` branches (84-85, 148-155) untouched.**

- [ ] **Step 3: Strip any control tail from the live streaming bubble**

At `src/pages/CikguBot.jsx:548`, change:
```jsx
<FormattedText text={ai.streamedText} />
```
to:
```jsx
<FormattedText text={TUTOR_CONTRACT_ENABLED ? parseTutorControl(ai.streamedText).text : ai.streamedText} />
```

- [ ] **Step 4: Verify build + full gate + manual smoke**

Run: `npm run build && npm run test:run`
Expected: build zero errors; all tests pass (flag is OFF, so behaviour is unchanged — this proves the wiring is inert until enabled).
Manual smoke (flip `TUTOR_CONTRACT_ENABLED = true` locally, `npm run dev`): ask Cikgu a normal question (answer intact), paste a 400-word essay to trigger truncation, test voice mode (no control tail read aloud), dark + light. Revert the flag to `false` before committing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CikguBot.jsx
git commit -m "feat(tutor-contract): wire enforceTutorTurn into Cikgu AI branches (flag-gated)"
```

---

### Task 8: Answer-leak validation fixture + precision/recall report

**Files:**
- Create: `scripts/ai-tier-eval/leakFixture.mjs` (labeled examples)
- Create: `scripts/ai-tier-eval/leakEval.mjs` (measurement)
- Test: `src/lib/__tests__/tutorContractLeakEval.test.js`

**Interfaces:**
- Consumes: `detectAnswerLeak`.
- Produces: a printed precision/recall so the detector's known recall can be reported *alongside* any "leak rate" (per spec §1/§9). v1 keeps the detector SOFT (flag only) regardless of the numbers; the report gates any future promotion to a hard block.

- [ ] **Step 1: Write the failing test (fixture sanity + recall floor)**

```js
// src/lib/__tests__/tutorContractLeakEval.test.js
import { describe, it, expect } from 'vitest'
import { detectAnswerLeak } from '../tutorContract'
import { LEAK_FIXTURE } from '../../../scripts/ai-tier-eval/leakFixture.mjs'

describe('leak detector against the labeled fixture', () => {
  it('fixture has both leak and no-leak, retrieval-context examples', () => {
    expect(LEAK_FIXTURE.some(x => x.leak)).toBe(true)
    expect(LEAK_FIXTURE.some(x => !x.leak)).toBe(true)
  })
  it('reports recall — and it must be > 0 so "0 leaks" is meaningful', () => {
    const pos = LEAK_FIXTURE.filter(x => x.leak)
    const caught = pos.filter(x => detectAnswerLeak(x.text, { mode: 'retrieval', attempted: false })).length
    const recall = caught / pos.length
    // eslint-disable-next-line no-console
    console.log(`[leak-detector] recall=${recall.toFixed(2)} on ${pos.length} positives`)
    expect(recall).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/tutorContractLeakEval.test.js`
Expected: FAIL — fixture module missing.

- [ ] **Step 3: Write the fixture + a measurement script**

```js
// scripts/ai-tier-eval/leakFixture.mjs
// Starter labeled set. EXPAND to ~100 with Kheshav's Gemini key; include
// LEGIT Malay grammar explanations that contain the form (hard negatives).
export const LEAK_FIXTURE = [
  { text: 'Jawapannya ialah "memasak".', leak: true },
  { text: 'The answer is "beli".', leak: true },
  { text: 'Correct answer: berjalan.', leak: true },
  { text: 'Cuba awak fikir — imbuhan mana yang sesuai sebelum "masak"?', leak: false },
  { text: 'Petunjuk: huruf pertama ialah "m". Awak cuba dulu?', leak: false },
  { text: 'Imbuhan "mem-" digunakan sebelum huruf p/b. Contohnya "membeli".', leak: false }, // hard negative: legit explanation
]
```
```js
// scripts/ai-tier-eval/leakEval.mjs
import { detectAnswerLeak } from '../../src/lib/tutorContract.js'
import { LEAK_FIXTURE } from './leakFixture.mjs'
const ctx = { mode: 'retrieval', attempted: false }
let tp = 0, fp = 0, fn = 0
for (const x of LEAK_FIXTURE) {
  const pred = detectAnswerLeak(x.text, ctx)
  if (pred && x.leak) tp++; else if (pred && !x.leak) fp++; else if (!pred && x.leak) fn++
}
const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1)
console.log(`precision=${precision.toFixed(2)} recall=${recall.toFixed(2)} (tp=${tp} fp=${fp} fn=${fn})`)
```

- [ ] **Step 4: Run test + script**

Run: `npx vitest run src/lib/__tests__/tutorContractLeakEval.test.js && node scripts/ai-tier-eval/leakEval.mjs`
Expected: test PASS; script prints precision/recall.

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-tier-eval/leakFixture.mjs scripts/ai-tier-eval/leakEval.mjs src/lib/__tests__/tutorContractLeakEval.test.js
git commit -m "feat(tutor-contract): answer-leak validation fixture + precision/recall report"
```

---

## Deferred to v1.1 (documented, NOT built here)
- **Model control block** (`⟦CTRL⟧{hint_level,…}`): the prompt asks for it and `parseTutorControl` already strips it, but v1 does not depend on the model emitting it.
- **Self-condense retry** (ask the model to shorten instead of hard-truncate) — needs an extra round-trip; v1 uses the safety-net truncate.
- **BYOK routing**, **hard cloze-surface answer-gate**, **Writing/Roleplay-scoring application**, and **flag → default-ON** (after eval conformance ≥95% + known leak recall + a manual smoke pass).

## Self-Review
- **Spec coverage:** §3 seam → Tasks 6-7; §6 Layer 1 (length/next-action/hedge-passthrough/profile) → Tasks 2,3,6; §6 Layer 2 (retrieval leak flag) → Tasks 3,4; §7 control-strip + TTS-safety + streaming → Tasks 1,7; §7 no STORE_VERSION bump → Global Constraints; §9 validate-detector-first + two honest numbers → Task 8; §10 flag rollout → Task 4 + Deferred. Expert-tier exemption → Task 7 Step 2. Prompt parity → Task 5.
- **Placeholder scan:** every code step has real code; the only intentional "expand later" is the Task-8 fixture size, explicitly flagged as a starter set (not a code placeholder).
- **Type consistency:** `enforceTutorTurn` signature + `{text, meta:{truncated,leakFlagged,nextActionPresent,hadControlBlock}}` shape is identical in Global Constraints, Task 4 test, and Task 7 usage; `parseTutorControl`/`enforceLength`/`hasNextAction`/`detectAnswerLeak` names are stable across tasks.
