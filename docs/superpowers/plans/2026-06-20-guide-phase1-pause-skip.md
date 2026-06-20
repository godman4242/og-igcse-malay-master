# Guide Phase 1 — Bug Fix + Pause/Explore + Skip-to-Step — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-app guide impossible to dead-end (fix the hang), let the user click the dark area to *pause* into an interactive "explore the page" mode and resume to the same step, and let them tap the progress counter to jump to any step.

**Architecture:** Additive to the existing tested engine. `guideController.js` gains `pause()/resume()/togglePause()`, `jumpTo()`, a fixed `onDestroyStarted`, an `overlayClickBehavior` that pauses instead of closes, and an `onPopoverRender` wrapper that calls the injected themer **and** a new pure DOM decorator. A new `popoverDecorations.js` injects a Pause/Resume button + a tap-to-jump progress control into driver.js's popover. CSS toggles a `guide-explore` class on driver's root to hide the dark veil and re-enable page clicks. No React changes in Phase 1.

**Tech Stack:** React 19 SPA, `driver.js@1.4.0` (lazy), Vitest (`environment: 'node'` default; DOM tests use `// @vitest-environment jsdom`), Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-06-20-guide-pause-drag-fullpage-design.md` (§4 = Phase 1).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/guide/guideController.js` | Modify | Bug fix; `pause/resume/togglePause/jumpTo`; `overlayClickBehavior`; `onPopoverRender` wrapper; handle exports |
| `src/lib/guide/popoverDecorations.js` | Create | Pure DOM injector: Pause/Resume button + tap-to-jump progress control |
| `src/lib/guide/__tests__/guideController.test.js` | Modify | Add regression + pause + jumpTo + wrapper tests; update the old forwarding test |
| `src/lib/guide/__tests__/popoverDecorations.test.js` | Create | jsdom tests for the decorator DOM |
| `src/index.css` | Modify | `guide-explore` veil-off + page-clickable rules; control styles (after the `.guide-theme` block, ~line 242) |
| `tests/e2e/guide-pause-skip.spec.js` | Create | Smoke: backdrop-click no longer hangs; pause lights page; skip jumps |
| `README.md` | Modify | Note the new pause/skip guide behavior |
| `RESUME_HERE.md` | Modify | Refresh handoff for the shipped Phase 1 |

**Key reference — current `guideController.js` anchors (verified):**
- L149–173 `config` object (`onPopoverRender` forwarded at L161; `onDestroyStarted` at L167–172 — the bug).
- L175 `const handle = { destroy: teardownSilently }`.
- L127–147 `landOn`, `handleNext`, `handlePrev`; L72–89 `resolve(start, dir)`.

**PopoverDOM refs used (driver.js@1.4.0):** `popover.footerButtons` (nav-button container), `popover.progress` (the `.driver-popover-progress-text` node), `popover.wrapper`.

---

## Task 1: Fix the dead-overlay hang (`onDestroyStarted` must destroy)

**Files:**
- Modify: `src/lib/guide/guideController.js:167-172`
- Test: `src/lib/guide/__tests__/guideController.test.js`

- [ ] **Step 1: Write the failing regression test**

Add inside `describe('guideController.startTour', …)` in `guideController.test.js`:

```js
it('REGRESSION: onDestroyStarted actually destroys the driver (no dead box)', async () => {
  const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
  const { factory, created } = driverHarness()
  const onEvent = vi.fn()
  const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
  await handle.ready
  // Simulate a backdrop/Esc destroy request the way driver.js would.
  created[0].calls.config.onDestroyStarted()
  expect(created[0].calls.destroyed).toBe(1)          // was 0 → the hang
  const names = onEvent.mock.calls.map(c => c[0])
  expect(names).toContain('guide_dismissed')
})
```

- [ ] **Step 2: Run it and watch it FAIL**

Run: `npm run test:run -- src/lib/guide/__tests__/guideController.test.js`
Expected: FAIL — `expected 1, received 0` (current `onDestroyStarted` never calls `destroy()`).

- [ ] **Step 3: Fix `onDestroyStarted` to tear down**

Replace L167–172 (the `onDestroyStarted: () => { … }` block) with:

```js
    // Esc / programmatic destroy request: log the dismissal AND actually tear
    // down. driver.js suppresses its own teardown when this hook is overridden —
    // omitting destroy() is what left the box mounted-but-dead (the hang bug).
    // (Backdrop click no longer reaches here — overlayClickBehavior pauses; see
    // Task 2 — but Esc still does, so this fix stands.)
    onDestroyStarted: () => {
      if (torn) return
      markDismissed()
      destroyDriver()
    },
```

- [ ] **Step 4: Run the test and watch it PASS**

Run: `npm run test:run -- src/lib/guide/__tests__/guideController.test.js`
Expected: PASS (and all pre-existing tests in the file still pass).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guide/guideController.js src/lib/guide/__tests__/guideController.test.js
git commit -m "fix(guide): onDestroyStarted now calls destroy() — no more dead overlay hang"
```
(The pre-commit hook runs build+test+lint; it must pass.)

---

## Task 2: Pause / Resume / Explore mode in the controller

**Files:**
- Modify: `src/lib/guide/guideController.js` (add functions before L175; add `overlayClickBehavior` to `config`; extend `handle`)
- Test: `src/lib/guide/__tests__/guideController.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `guideController.test.js`:

```js
it('pause()/resume() toggle explore mode + emit telemetry; pause is idempotent', async () => {
  const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
  const { factory } = driverHarness()
  const onEvent = vi.fn()
  const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
  await handle.ready
  expect(handle.getMode()).toBe('spotlight')
  handle.pause()
  expect(handle.getMode()).toBe('explore')
  handle.pause()                       // idempotent — no second event
  handle.resume()
  expect(handle.getMode()).toBe('spotlight')
  const names = onEvent.mock.calls.map(c => c[0])
  expect(names.filter(n => n === 'guide_paused')).toHaveLength(1)
  expect(names.filter(n => n === 'guide_resumed')).toHaveLength(1)
})

it('overlayClickBehavior PAUSES (never closes) — backdrop click cannot kill the box', async () => {
  const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
  const { factory, created } = driverHarness()
  const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
  await handle.ready
  expect(typeof created[0].calls.config.overlayClickBehavior).toBe('function')
  created[0].calls.config.overlayClickBehavior()
  expect(handle.getMode()).toBe('explore')
  expect(created[0].calls.destroyed).toBe(0)    // did NOT close
})
```

- [ ] **Step 2: Run and watch them FAIL**

Run: `npm run test:run -- src/lib/guide/__tests__/guideController.test.js`
Expected: FAIL — `handle.getMode is not a function` / `overlayClickBehavior` undefined.

- [ ] **Step 3: Add the pause machinery**

In `guideController.js`, **after** `handlePrev` (L147) and **before** `const config = {` (L149), add:

```js
  // ── Pause / Explore ───────────────────────────────────────────────
  // 'spotlight' = page dimmed + locked (default); 'explore' = veil off, whole
  // page clickable so a learner can wander. The box stays live in both.
  let mode = 'spotlight'

  function applyExploreClass(on) {
    if (typeof document === 'undefined') return
    const root = document.querySelector('.driver-active') || document.documentElement
    root && root.classList.toggle('guide-explore', on)
  }

  function updatePauseButton() {
    if (typeof document === 'undefined') return
    const btn = document.querySelector('.driver-popover .guide-pause-btn')
    if (!btn) return
    const explore = mode === 'explore'
    btn.textContent = explore ? '▶ Resume' : '⏸ Pause'
    btn.setAttribute('aria-label', explore ? 'Resume the guided tour' : 'Pause the tour to explore the page')
    btn.setAttribute('aria-pressed', String(explore))
  }

  function pause() {
    if (torn || settled || mode === 'explore') return
    mode = 'explore'
    applyExploreClass(true)
    updatePauseButton()
    onEv('guide_paused', { tier, stepIndex: active })
  }

  function resume() {
    if (torn || settled || mode === 'spotlight') return
    mode = 'spotlight'
    applyExploreClass(false)
    updatePauseButton()
    onEv('guide_resumed', { tier, stepIndex: active })
  }

  function togglePause() { mode === 'explore' ? resume() : pause() }
```

- [ ] **Step 4: Wire `overlayClickBehavior` into `config`**

In the `config` object (after `allowClose: true,` at L154), add:

```js
    // Clicking the dark area PAUSES into explore mode (never closes). This is
    // also the fix for the old hang — the backdrop no longer routes to destroy.
    overlayClickBehavior: () => pause(),
```

- [ ] **Step 5: Export the controls on `handle`**

Change L175 from:

```js
  const handle = { destroy: teardownSilently }
```
to:
```js
  const handle = { destroy: teardownSilently, pause, resume, togglePause, getMode: () => mode }
```

- [ ] **Step 6: Run and watch them PASS**

Run: `npm run test:run -- src/lib/guide/__tests__/guideController.test.js`
Expected: PASS (all tests in the file).

- [ ] **Step 7: Commit**

```bash
git add src/lib/guide/guideController.js src/lib/guide/__tests__/guideController.test.js
git commit -m "feat(guide): pause/explore mode — backdrop click lights up the page instead of closing"
```

---

## Task 3: `popoverDecorations.js` — Pause button + tap-to-jump progress

**Files:**
- Create: `src/lib/guide/popoverDecorations.js`
- Create: `src/lib/guide/__tests__/popoverDecorations.test.js`

- [ ] **Step 1: Write the failing tests (jsdom)**

Create `src/lib/guide/__tests__/popoverDecorations.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { decoratePopover } from '../popoverDecorations'

function fakePopover() {
  const footerButtons = document.createElement('div')
  const progress = document.createElement('div')
  progress.className = 'driver-popover-progress-text'
  progress.textContent = '2 of 5'
  const wrapper = document.createElement('div')
  wrapper.className = 'driver-popover guide-theme'
  wrapper.append(footerButtons, progress)
  document.body.append(wrapper)
  return { wrapper, footerButtons, progress }
}

afterEach(() => { document.body.innerHTML = '' })

describe('decoratePopover', () => {
  it('adds a Pause button wired to onTogglePause', () => {
    const p = fakePopover()
    const onTogglePause = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 2, total: 5, onTogglePause, onJump: vi.fn() })
    const btn = p.wrapper.querySelector('.guide-pause-btn')
    expect(btn).toBeTruthy()
    expect(btn.textContent).toContain('Pause')
    btn.click()
    expect(onTogglePause).toHaveBeenCalledTimes(1)
  })

  it('labels the button Resume in explore mode', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'explore', current: 2, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    expect(p.wrapper.querySelector('.guide-pause-btn').textContent).toContain('Resume')
  })

  it('progress becomes an input that calls onJump(n) on Enter', () => {
    const p = fakePopover()
    const onJump = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 2, total: 5, onTogglePause: vi.fn(), onJump })
    const jump = p.wrapper.querySelector('.guide-progress-jump')
    expect(jump.textContent).toBe('2')
    jump.click()
    const input = p.wrapper.querySelector('.guide-progress-input')
    expect(input).toBeTruthy()
    input.value = '4'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onJump).toHaveBeenCalledWith(4)
  })

  it('ignores an out-of-range jump value', () => {
    const p = fakePopover()
    const onJump = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 2, total: 5, onTogglePause: vi.fn(), onJump })
    p.wrapper.querySelector('.guide-progress-jump').click()
    const input = p.wrapper.querySelector('.guide-progress-input')
    input.value = '99'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onJump).not.toHaveBeenCalled()
  })

  it('is idempotent — re-decorating does not add a second button', () => {
    const p = fakePopover()
    const opts = { mode: 'spotlight', current: 2, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() }
    decoratePopover(p, opts)
    decoratePopover(p, opts)
    expect(p.wrapper.querySelectorAll('.guide-pause-btn')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run and watch them FAIL**

Run: `npm run test:run -- src/lib/guide/__tests__/popoverDecorations.test.js`
Expected: FAIL — cannot import `decoratePopover` (file does not exist).

- [ ] **Step 3: Implement the decorator**

Create `src/lib/guide/popoverDecorations.js`:

```js
// popoverDecorations.js — injects the guide popover's extra controls:
//   • a Pause/Resume toggle (enter/leave Explore mode)
//   • a tap-to-jump progress counter ("4 of 22" → type a number → jump)
// Pure DOM, no React/store — mirrors the onPopoverRender DOM-injection pattern
// already used for theming. Called per step render by guideController's wrapper.
// Idempotent: guards stop a second button/input if driver re-renders the popover.

export function decoratePopover(popover, {
  mode = 'spotlight',
  current = 1,
  total = 1,
  onTogglePause,
  onJump,
} = {}) {
  if (!popover) return
  addPauseButton(popover, mode, onTogglePause)
  makeProgressJumpable(popover, current, total, onJump)
}

function addPauseButton(popover, mode, onTogglePause) {
  const host = popover.footerButtons || popover.footer || popover.wrapper
  if (!host || host.querySelector?.('.guide-pause-btn')) return
  const explore = mode === 'explore'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'guide-pause-btn'
  btn.textContent = explore ? '▶ Resume' : '⏸ Pause'
  btn.setAttribute('aria-label', explore ? 'Resume the guided tour' : 'Pause the tour to explore the page')
  btn.setAttribute('aria-pressed', String(explore))
  btn.addEventListener('click', (e) => { e.preventDefault(); onTogglePause?.() })
  host.insertBefore(btn, host.firstChild)
}

function makeProgressJumpable(popover, current, total, onJump) {
  const prog = popover.progress
  if (!prog || prog.querySelector?.('.guide-progress-jump')) return
  prog.textContent = ''

  const jump = document.createElement('button')
  jump.type = 'button'
  jump.className = 'guide-progress-jump'
  jump.textContent = String(current)
  jump.setAttribute('aria-label', `Step ${current} of ${total}. Tap to jump to a step.`)

  const rest = document.createElement('span')
  rest.textContent = ` of ${total}`
  prog.append(jump, rest)

  jump.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'number'
    input.min = '1'
    input.max = String(total)
    input.value = String(current)
    input.className = 'guide-progress-input'
    input.setAttribute('aria-label', `Jump to step (1 to ${total})`)
    jump.replaceWith(input)
    input.focus()
    input.select?.()

    const commit = () => {
      const n = Math.round(Number(input.value))
      if (Number.isFinite(n) && n >= 1 && n <= total) onJump?.(n)
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit() }
      else if (e.key === 'Escape') { e.preventDefault(); input.replaceWith(jump) }
    })
    input.addEventListener('blur', commit)
  })
}
```

- [ ] **Step 4: Run and watch them PASS**

Run: `npm run test:run -- src/lib/guide/__tests__/popoverDecorations.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guide/popoverDecorations.js src/lib/guide/__tests__/popoverDecorations.test.js
git commit -m "feat(guide): popover decorator — Pause/Resume button + tap-to-jump progress"
```

---

## Task 4: Wire the `onPopoverRender` wrapper (themer + decorator)

**Files:**
- Modify: `src/lib/guide/guideController.js` (import + L161 config + the wrapper)
- Modify: `src/lib/guide/__tests__/guideController.test.js` (replace the old forwarding test)

- [ ] **Step 1: Replace the old forwarding test with the wrapper test**

In `guideController.test.js`, add the mock at the **top** (after the imports, L2):

```js
vi.mock('../popoverDecorations', () => ({ decoratePopover: vi.fn() }))
import { decoratePopover } from '../popoverDecorations'
```

Then **delete** the existing test `'forwards an injected onPopoverRender …'` (L179–186) and replace it with:

```js
it('onPopoverRender wrapper calls the injected themer AND decorates the popover', async () => {
  decoratePopover.mockClear()
  const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
  const onPopoverRender = vi.fn()
  const { factory, created } = driverHarness()
  const handle = startTour(steps, { ...baseOpts({ onPopoverRender }), driverFactory: factory })
  await handle.ready
  const wrapped = created[0].calls.config.onPopoverRender
  expect(typeof wrapped).toBe('function')
  wrapped({ any: 'popover' }, {})            // invoke as driver.js would
  expect(onPopoverRender).toHaveBeenCalled() // React themer still runs
  expect(decoratePopover).toHaveBeenCalled() // our controls get injected
})
```

- [ ] **Step 2: Run and watch it FAIL**

Run: `npm run test:run -- src/lib/guide/__tests__/guideController.test.js`
Expected: FAIL — `decoratePopover` not called (config still forwards the raw injected fn).

- [ ] **Step 3: Import the decorator**

At the top of `guideController.js`, below the existing `import { waitForElement } …` (L20), add:

```js
import { decoratePopover } from './popoverDecorations'
```

- [ ] **Step 4: Replace the forwarded `onPopoverRender` with a wrapper**

In `config`, replace L161 `...(onPopoverRender ? { onPopoverRender } : {})` with:

```js
    // Wrap the React-injected themer so we ALSO inject our Pause/Resume button
    // and tap-to-jump progress on every step render. Both always run.
    onPopoverRender: (popover, o) => {
      if (typeof onPopoverRender === 'function') onPopoverRender(popover, o)
      decoratePopover(popover, {
        mode,
        current: active + 1,
        total: list.length,
        onTogglePause: togglePause,
        onJump: jumpTo,
      })
    },
```

> Note: `jumpTo` is referenced here but defined in Task 5. Between Task 4 and Task 5 the controller will not build. **Do Task 5 immediately after Task 4** (they ship in one logical unit); commit at the end of Task 5. If you must commit after Task 4, temporarily pass `onJump: () => {}` and swap it in Task 5 — but the cleaner path is to treat 4+5 as back-to-back.

- [ ] **Step 5: (defer the green commit to Task 5)**

Do not commit yet — `jumpTo` lands in Task 5. Proceed directly.

---

## Task 5: `jumpTo()` — route-aware skip-to-step

**Files:**
- Modify: `src/lib/guide/guideController.js` (add `jumpTo`; add to `handle`)
- Test: `src/lib/guide/__tests__/guideController.test.js`

- [ ] **Step 1: Write the failing tests**

Add to `guideController.test.js`:

```js
it('jumpTo(n) lands on step n (1-based), navigating its route', async () => {
  const steps = [
    { id: 'a', route: '/', title: 'A', body: 'a' },
    { id: 'b', route: '/study', selector: '[data-tour="b"]', title: 'B', body: 'b' },
    { id: 'c', route: '/grammar', selector: '[data-tour="c"]', title: 'C', body: 'c' },
  ]
  const navigate = vi.fn(async () => {})
  const { factory, created } = driverHarness()
  const handle = startTour(steps, { ...baseOpts({ navigate }), driverFactory: factory })
  await handle.ready
  await handle.jumpTo(3)                         // → index 2
  expect(navigate).toHaveBeenCalledWith('/grammar')
  expect(created[0].calls.moveTo).toEqual([2])
})

it('jumpTo ignores out-of-range / non-numeric values', async () => {
  const steps = [
    { id: 'a', route: '/', title: 'A', body: 'a' },
    { id: 'b', route: '/', selector: '[data-tour="b"]', title: 'B', body: 'b' },
  ]
  const { factory, created } = driverHarness()
  const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
  await handle.ready
  await handle.jumpTo(99)
  await handle.jumpTo(0)
  await handle.jumpTo('x')
  expect(created[0].calls.moveTo).toEqual([])
})

it('jumpTo while paused returns to spotlight mode', async () => {
  const steps = [
    { id: 'a', route: '/', title: 'A', body: 'a' },
    { id: 'b', route: '/', selector: '[data-tour="b"]', title: 'B', body: 'b' },
  ]
  const { factory } = driverHarness()
  const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
  await handle.ready
  handle.pause()
  await handle.jumpTo(2)
  expect(handle.getMode()).toBe('spotlight')
})
```

- [ ] **Step 2: Run and watch them FAIL**

Run: `npm run test:run -- src/lib/guide/__tests__/guideController.test.js`
Expected: FAIL — `handle.jumpTo is not a function`.

- [ ] **Step 3: Implement `jumpTo`**

In `guideController.js`, add **after** `togglePause` (added in Task 2) and before `const config`:

```js
  // Skip-to-step: land on a specific 1-based step number. Route-aware — reuses
  // resolve() so a missing target snaps to the nearest renderable step.
  async function jumpTo(displayIndex) {
    if (torn || settled || !driverObj) return
    const idx = Math.round(Number(displayIndex)) - 1
    if (!Number.isFinite(idx) || idx < 0 || idx >= list.length) return
    if (mode === 'explore') resume()            // landing implies spotlight
    const dir = idx >= active ? +1 : -1
    const target = await resolve(idx, dir)
    if (torn || settled) return
    if (target === -1) return
    await landOn(target)
    onEv('guide_jumped', { tier, stepIndex: target })
  }
```

- [ ] **Step 4: Add `jumpTo` to the handle**

Update the `handle` line (from Task 2) to:

```js
  const handle = { destroy: teardownSilently, pause, resume, togglePause, jumpTo, getMode: () => mode }
```

- [ ] **Step 5: Run the whole guide suite — PASS**

Run: `npm run test:run -- src/lib/guide/`
Expected: PASS (all guideController + popoverDecorations tests).

- [ ] **Step 6: Commit Tasks 4 + 5 together**

```bash
git add src/lib/guide/guideController.js src/lib/guide/__tests__/guideController.test.js
git commit -m "feat(guide): skip-to-step (jumpTo) + onPopoverRender wrapper injecting the controls"
```

---

## Task 6: CSS — Explore-mode veil-off + control styles

**Files:**
- Modify: `src/index.css` (insert after the `.guide-theme` arrow rules, ~L242, before the `/* UDL Principle 1 — Theme Choice */` block)

- [ ] **Step 1: Add the styles**

Insert:

```css
/* ── In-app guide: Pause / Explore mode ──────────────────────────────
   guideController toggles `guide-explore` on the .driver-active root. It hides
   the dark veil and re-enables clicks across the whole page so a learner can
   explore the current page; the popover box stays live. The overlay itself is
   forced click-through so taps fall through to the page (a transparent SVG must
   not keep capturing clicks). */
.driver-active.guide-explore .driver-overlay {
  opacity: 0 !important;
  pointer-events: none !important;
}
.driver-active.guide-explore * { pointer-events: auto !important; }
.driver-active.guide-explore :not(body):has(> .driver-active-element) {
  overflow: auto !important;            /* re-allow page scroll while exploring */
}

/* Injected popover controls (Pause/Resume + tap-to-jump progress) */
.driver-popover.guide-theme .guide-pause-btn {
  min-height: 44px;                     /* WCAG 2.5.5 target size */
  min-width: 44px;
  cursor: pointer;
}
.driver-popover.guide-theme .guide-progress-jump {
  all: unset;
  cursor: pointer;
  color: var(--color-dim);
  font: inherit;
  font-weight: 700;
  text-decoration: underline dotted;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.driver-popover.guide-theme .guide-progress-input {
  width: 3.5em;
  font: inherit;
  color: var(--color-text);
  background: var(--color-card2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 2px 6px;
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds, zero errors.

- [ ] **Step 3: Manual visual check (dark + light)**

Run: `npm run dev`, open the app, Settings → App guide → Quick tour. Verify: (a) clicking the dark area lights the whole page + the page is clickable; (b) the box shows ▶ Resume and clicking it re-darkens + re-spotlights; (c) the "N of M" counter is tappable → number input → Enter jumps; (d) repeat with light theme toggled. → *No console errors; both themes legible.*

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style(guide): explore-mode veil-off + pause/jump control styling (44px, themed)"
```

---

## Task 7: e2e smoke — the bug repro + pause + skip

**Files:**
- Create: `tests/e2e/guide-pause-skip.spec.js`

- [ ] **Step 1: Write the e2e**

Create `tests/e2e/guide-pause-skip.spec.js`:

```js
import { test, expect } from '@playwright/test'

// Starts the Quick tour deterministically from Settings → App guide, then:
//  1) clicks the dark overlay and asserts the box is STILL interactive (the bug)
//  2) resumes and asserts the spotlight returns
//  3) taps the progress counter and jumps to a step

test('guide: backdrop click pauses (no hang), resume + skip work', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // 1) Click the dark overlay — must NOT kill the box.
  await page.locator('.driver-overlay').click({ position: { x: 5, y: 5 }, force: true })
  await expect(popover).toBeVisible()                                  // box alive
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(1)
  await expect(popover.locator('.guide-pause-btn')).toContainText(/Resume/i)

  // 2) Resume → spotlight returns (veil class removed).
  await popover.locator('.guide-pause-btn').click()
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(0)
  await expect(popover.locator('.guide-pause-btn')).toContainText(/Pause/i)

  // 3) Next still works (proves no dead state), then skip-to-step.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toBeVisible()
  await popover.locator('.guide-progress-jump').click()
  const input = popover.locator('.guide-progress-input')
  await input.fill('1')
  await input.press('Enter')
  await expect(popover).toBeVisible()
})
```

- [ ] **Step 2: Run it**

Run: `npm run test:e2e -- guide-pause-skip.spec.js`
Expected: PASS. (driver.js animates; if the first overlay click races the entrance animation, the `force: true` + visibility assertions absorb it. If flaky on cold start, add `await popover.waitFor()` before the overlay click — already implied by the `toBeVisible` above.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/guide-pause-skip.spec.js
git commit -m "test(e2e): guide backdrop-pause never hangs + resume + skip-to-step"
```

---

## Task 8: Docs — README + RESUME_HERE

**Files:**
- Modify: `README.md` (guide/tour section)
- Modify: `RESUME_HERE.md`

- [ ] **Step 1: Update README**

Find the app-guide / tour mention in `README.md` and add a sentence:

> The in-app guide can be **paused** — click the dimmed area (or the ⏸ Pause button) to light up the whole page and explore freely, then ▶ Resume to drop back into the tour at the same step. Tap the "N of M" counter to **jump to any step**.

(If no guide section exists, add this under the features list near the other study-tool bullets.)

- [ ] **Step 2: Update RESUME_HERE**

Add a dated entry to `RESUME_HERE.md` summarizing Phase 1 shipped (bug fix + pause/explore + skip-to-step), pointing to the spec + this plan, and noting Phase 2 (drag/dock) and Phase 3 (full page guide) remain.

- [ ] **Step 3: Commit (docs-only fast-path)**

```bash
git add README.md RESUME_HERE.md
git commit -m "docs(guide): README + handoff — pause/explore + skip-to-step shipped (Phase 1)"
```

- [ ] **Step 4: Final full-suite gate**

Run: `npm run build && npm run test:run && npm run lint`
Expected: build zero errors; full unit suite green; lint 0 errors (3 known exhaustive-deps warnings only). Then confirm the Vercel deploy reaches READY after the auto-push.

---

## Self-Review (run after writing; fixed inline)

**1. Spec coverage (§4):**
- §4.1 bug fix → Task 1 ✅
- §4.2 pause/explore (backdrop → pause, button toggle, veil-off + page-clickable, resume re-spotlights, primary button vs enhancement, reduced-motion) → Tasks 2 (logic) + 3 (button) + 6 (CSS) ✅. *Reduced-motion:* the veil toggle is an instant class change (no transition declared) — inherently reduced-motion-safe; no JS branch needed. ✅
- §4.2 cross-route-while-paused resume → covered by `jumpTo`/`resume` reusing `resolve`; `resume()` itself relies on the spotlight persisting (driver never destroyed) ✅
- §4.3 skip-to-step (editable counter, route-aware, clamp, a11y label) → Tasks 3 + 5 ✅
- §4.4 telemetry `guide_paused/resumed/jumped`, `{tier,stepIndex}` only → Tasks 2 + 5 ✅
- §4.5 tests (regression, pause idempotent, jumpTo navigates, jumpTo clamp, e2e bug-repro) → Tasks 1,2,5,7 ✅

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code. The one forward-reference (`jumpTo` used in Task 4, defined in Task 5) is called out explicitly with the back-to-back instruction. ✅

**3. Type/name consistency:** `decoratePopover({ mode, current, total, onTogglePause, onJump })` — same shape in the module (Task 3), the controller wrapper (Task 4), and tests. `handle` exposes `pause/resume/togglePause/jumpTo/getMode` consistently across Tasks 2 & 5. Class names `guide-explore` / `guide-pause-btn` / `guide-progress-jump` / `guide-progress-input` match across controller, decorator, CSS, and e2e. ✅

**4. Ambiguity:** "the box stays live in explore mode" is concrete — `.driver-popover` keeps `pointer-events:auto` (driver base) and the `guide-explore *` rule only *adds* auto; the overlay is explicitly forced back to `pointer-events:none` so it can't re-capture. ✅

---

## Out of scope (later plans)
- **Phase 2** — drag + magnetic dock (own plan: `dragDock.js`, `GuideHud.jsx`, `GuideDockZones.jsx`).
- **Phase 3** — Full Page Guide ▶ (own plan: `pageGuides.js`, `pointerGeometry.js`, `GuidePointer.jsx`; refined-Hybrid content).
