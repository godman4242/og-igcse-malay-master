# Guide Phase 2 — Drag + Magnetic Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-app guide box draggable; while dragging, translucent-green dashed drop zones glow on all 4 edges + 4 corners; dropping on one docks + minimizes the box (all controls still reachable); dragging it back to the centre re-detaches it. Keyboard-operable and announced. In-session only (no `STORE_VERSION` bump).

**Architecture:** The pure `guideController.js` engine stays the single source of truth for guide state. Phase 2 adds: (1) a pure `dragDock.js` geometry module (which zone is a point in? where does a box snap?) — unit-tested, no DOM, mirroring `gestureModel.js`; (2) a tiny zero-import observable `guideState.js` so the always-eager React HUD can subscribe to drag state without pulling the lazy controller into the eager bundle; (3) a drag handle injected into the popover via the existing `decoratePopover` DOM seam; (4) the impure pointer-drag loop + dock/undock logic inside `guideController.js` (delegating all geometry to `dragDock.js`); (5) a React `GuideHud` mounted in `Layout` that renders the lazy `GuideDockZones` overlay during a drag and announces dock changes via the existing `FeedbackLive`. Phase 1 pause/skip code is untouched.

**Tech Stack:** React 19 (`useSyncExternalStore`, `react-dom/client` + `act` for tests — this project does NOT use @testing-library), driver.js@1.4.0 (lazy), Pointer Events API, Vitest (node for pure modules, `@vitest-environment jsdom` for DOM/JSX), Playwright (e2e), Tailwind CSS 4 + `var(--color-*)` tokens.

---

## Architecture notes & decisions (read before starting)

- **Why `guideState.js` is a separate module (deviation from spec §3.1, which folds `subscribeGuideState` into `guideController.js`):** `GuideHud` is mounted in the always-eager `Layout`. It must subscribe synchronously to know when to show the dock zones. If the subscription seam lived in `guideController.js`, statically importing it into the eager `Layout` would pull the controller (and `popoverDecorations`, `waitForElement`) into the eager `index` chunk — violating the spec's "no eager bundle weight" invariant (§1.3, §7). A zero-import `guideState.js` keeps the eager cost to a few hundred bytes. The controller (lazy) writes via `setGuideState`; the HUD (eager) reads via `subscribeGuideState`. `guideController.js` re-exports both for spec-contract symmetry. **Veto note:** if you'd rather keep it in the controller, you'd have to make `GuideHud` lazy-load the seam and render nothing on first paint — worse UX and more code; the tiny module is the cleaner call.
- **Keyboard dock parity = arrow keys on the focused handle dock to the 4 edges; Escape floats.** Spec §5.3 allows "a 'Dock to…' menu OR arrow-key nudge." Arrow-to-edge needs no menu DOM, is fully testable, and meets the a11y bar. Corners stay a pointer-only nicety (edges cover the keyboard-parity requirement). **Veto note:** swap for an explicit menu later if discoverability complaints arise.
- **Dock persists across step changes; a free (non-docked) drag resets to driver's placement on the next step.** A docked, minimized box staying put as you Next/Back is the useful behavior; a one-off free drag is view-local. `reapplyDock()` re-sticks the dock when driver re-renders the popover.
- **Telemetry:** add `guide_docked` / `guide_undocked`, each carrying ONLY `{ tier, stepIndex }` (privacy invariant §7 — zone is omitted). **Veto note:** zone is non-PII; add it if you later want dock-target analytics.
- **A no-move click on the handle does nothing** (a `moved` threshold of 4px gates dock/float), so tapping the grip never accidentally docks.

## File structure

| File | New? | Responsibility |
|---|---|---|
| `src/lib/guide/dragDock.js` | new | Pure geometry: `zoneForPoint`, `snapRectForZone`, `shouldDetach`, `DOCK_ZONES`, `DEFAULT_THRESHOLD`. No DOM. |
| `src/lib/guide/guideState.js` | new | Zero-import observable: `getGuideState`/`setGuideState`/`resetGuideState`/`subscribeGuideState`. |
| `src/lib/guide/popoverDecorations.js` | change | Add `addDragHandle` (grip button: pointerdown→drag, arrows→dock edge, Escape→float). |
| `src/lib/guide/guideController.js` | change | Impure drag loop + `dock`/`undock`/`reapplyDock`; wire callbacks into `decoratePopover`; reset state on teardown; expose `dock`/`undock`/`getDockState` on the handle; re-export the state seam. |
| `src/components/guide/GuideDockZones.jsx` | new | Presentational overlay: 8 dashed-green zones; active one highlighted; `pointer-events:none`. |
| `src/components/guide/GuideHud.jsx` | new | Eager React host: subscribes to `guideState`; renders lazy `GuideDockZones` while dragging + `FeedbackLive` for announcements. |
| `src/components/Layout.jsx` | change | Mount `<GuideHud />`. |
| `src/index.css` | change | Drag-handle, docked/minimized, and dock-zone styles (token-driven, reduced-motion aware). |
| `tests/e2e/guide-drag-dock.spec.js` | new | Drag-to-dock + detach + keyboard dock. |
| `README.md`, `RESUME_HERE.md` | change | Document the feature (standing rule: README + handoff in the same change). |

---

## Task 1: `dragDock.js` — pure dock geometry

**Files:**
- Create: `src/lib/guide/dragDock.js`
- Test: `src/lib/guide/__tests__/dragDock.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/guide/__tests__/dragDock.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { zoneForPoint, snapRectForZone, shouldDetach, DOCK_ZONES } from '../dragDock'

const VP = { width: 1000, height: 800 }
const T = 80

describe('zoneForPoint', () => {
  it('returns null for a point in the free centre', () => {
    expect(zoneForPoint({ x: 500, y: 400 }, VP, T)).toBe(null)
  })
  it('detects the four edges', () => {
    expect(zoneForPoint({ x: 500, y: 10 }, VP, T)).toBe('top')
    expect(zoneForPoint({ x: 500, y: 790 }, VP, T)).toBe('bottom')
    expect(zoneForPoint({ x: 10, y: 400 }, VP, T)).toBe('left')
    expect(zoneForPoint({ x: 990, y: 400 }, VP, T)).toBe('right')
  })
  it('detects the four corners (corner beats edge)', () => {
    expect(zoneForPoint({ x: 10, y: 10 }, VP, T)).toBe('tl')
    expect(zoneForPoint({ x: 990, y: 10 }, VP, T)).toBe('tr')
    expect(zoneForPoint({ x: 10, y: 790 }, VP, T)).toBe('bl')
    expect(zoneForPoint({ x: 990, y: 790 }, VP, T)).toBe('br')
  })
  it('returns null for non-finite or missing input', () => {
    expect(zoneForPoint({ x: NaN, y: 5 }, VP, T)).toBe(null)
    expect(zoneForPoint(null, VP, T)).toBe(null)
    expect(zoneForPoint({ x: 5, y: 5 }, null, T)).toBe(null)
  })
})

describe('snapRectForZone', () => {
  const box = { width: 300, height: 200 }
  it('top edge: horizontally centred, near the top', () => {
    expect(snapRectForZone('top', box, VP)).toEqual({ left: (1000 - 300) / 2, top: 12 })
  })
  it('bottom-right corner: pinned to bottom-right with the margin', () => {
    expect(snapRectForZone('br', box, VP)).toEqual({ left: 1000 - 300 - 12, top: 800 - 200 - 12 })
  })
  it('left edge: vertically centred, near the left', () => {
    expect(snapRectForZone('left', box, VP)).toEqual({ left: 12, top: (800 - 200) / 2 })
  })
  it('clamps when the box is larger than the viewport (never off-screen)', () => {
    const big = { width: 2000, height: 2000 }
    const r = snapRectForZone('br', big, VP)
    expect(r.left).toBe(12)
    expect(r.top).toBe(12)
  })
  it('unknown zone falls back to centred', () => {
    expect(snapRectForZone('nope', box, VP)).toEqual({ left: 350, top: 300 })
  })
})

describe('shouldDetach', () => {
  it('false while the pointer is still in the docked band', () => {
    expect(shouldDetach({ x: 500, y: 10 }, 'top', VP, T)).toBe(false)
  })
  it('true when the pointer reaches the free centre', () => {
    expect(shouldDetach({ x: 500, y: 400 }, 'top', VP, T)).toBe(true)
  })
  it('true when the pointer moves to a different zone', () => {
    expect(shouldDetach({ x: 500, y: 790 }, 'top', VP, T)).toBe(true)
  })
})

describe('DOCK_ZONES', () => {
  it('exports all 8 zone keys', () => {
    expect(DOCK_ZONES).toEqual(['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/dragDock.test.js`
Expected: FAIL — `Failed to resolve import "../dragDock"` / functions undefined.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/guide/dragDock.js`:

```js
// dragDock.js — pure geometry for the guide box's drag-to-dock.
// No DOM. Mirrors gestureModel.js: the SINGLE source of truth for "which dock
// zone is this point in?" and "where does a docked box snap to?" so the mapping
// is unit-tested and can't silently drift. Used by guideController's drag loop +
// keyboard dock path; GuideDockZones renders the same 8 zones.
//
// Zones: 4 edges (top|bottom|left|right) + 4 corners (tl|tr|bl|br). A point
// within `threshold` px of an edge is "in" that edge's band; within threshold of
// two adjacent edges → the corner. Free centre (no band) → null (float, no dock).

export const DOCK_ZONES = ['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br']

export const DEFAULT_THRESHOLD = 80 // margin-band thickness in px
const DEFAULT_MARGIN = 12           // gap from the viewport edge when docked

const finite = (n) => Number.isFinite(n)
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)

/**
 * Which dock zone contains `point`, or null if it's in the free centre.
 * @param {{x:number,y:number}} point  pointer position (clientX/clientY)
 * @param {{width:number,height:number}} viewport
 * @param {number} [threshold]
 * @returns {'top'|'bottom'|'left'|'right'|'tl'|'tr'|'bl'|'br'|null}
 */
export function zoneForPoint(point, viewport, threshold = DEFAULT_THRESHOLD) {
  if (!point || !viewport) return null
  const { x, y } = point
  const { width, height } = viewport
  if (!finite(x) || !finite(y) || !finite(width) || !finite(height)) return null
  const left = x <= threshold
  const right = x >= width - threshold
  const top = y <= threshold
  const bottom = y >= height - threshold
  if (top && left) return 'tl'
  if (top && right) return 'tr'
  if (bottom && left) return 'bl'
  if (bottom && right) return 'br'
  if (top) return 'top'
  if (bottom) return 'bottom'
  if (left) return 'left'
  if (right) return 'right'
  return null
}

/**
 * Top-left position a box of `boxSize` snaps to when docked in `zone`.
 * Clamped so a box larger than the viewport still stays on-screen.
 * @returns {{left:number,top:number}}
 */
export function snapRectForZone(zone, boxSize, viewport, margin = DEFAULT_MARGIN) {
  const bw = boxSize?.width ?? 0
  const bh = boxSize?.height ?? 0
  const vw = viewport?.width ?? 0
  const vh = viewport?.height ?? 0
  const midX = (vw - bw) / 2
  const midY = (vh - bh) / 2
  const maxX = vw - bw - margin
  const maxY = vh - bh - margin
  let left
  let top
  switch (zone) {
    case 'top':    left = midX;   top = margin; break
    case 'bottom': left = midX;   top = maxY;   break
    case 'left':   left = margin; top = midY;   break
    case 'right':  left = maxX;   top = midY;   break
    case 'tl':     left = margin; top = margin; break
    case 'tr':     left = maxX;   top = margin; break
    case 'bl':     left = margin; top = maxY;   break
    case 'br':     left = maxX;   top = maxY;   break
    default:       return { left: midX, top: midY }
  }
  return {
    left: clamp(left, margin, Math.max(margin, maxX)),
    top: clamp(top, margin, Math.max(margin, maxY)),
  }
}

/**
 * True when a docked box should detach — the pointer has left its dock band
 * (moved to the centre, or into a different zone's band).
 */
export function shouldDetach(point, dockedZone, viewport, threshold = DEFAULT_THRESHOLD) {
  return zoneForPoint(point, viewport, threshold) !== dockedZone
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/dragDock.test.js`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guide/dragDock.js src/lib/guide/__tests__/dragDock.test.js
git commit -m "feat(guide): pure drag-dock geometry (zoneForPoint/snapRect/shouldDetach)"
```

---

## Task 2: `guideState.js` — tiny observable for the HUD

**Files:**
- Create: `src/lib/guide/guideState.js`
- Test: `src/lib/guide/__tests__/guideState.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/guide/__tests__/guideState.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGuideState, setGuideState, resetGuideState, subscribeGuideState } from '../guideState'

beforeEach(() => resetGuideState())

describe('guideState', () => {
  it('starts idle', () => {
    expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '' })
  })

  it('setGuideState merges a patch and notifies subscribers', () => {
    const fn = vi.fn()
    const off = subscribeGuideState(fn)
    setGuideState({ dragging: true, zone: 'top' })
    expect(getGuideState()).toMatchObject({ dragging: true, zone: 'top', docked: null })
    expect(fn).toHaveBeenCalledTimes(1)
    off()
  })

  it('returns a STABLE snapshot reference when nothing changed (React-safe)', () => {
    const before = getGuideState()
    setGuideState({ dragging: false }) // same value → no-op
    expect(getGuideState()).toBe(before)
  })

  it('does NOT notify on a no-op set', () => {
    const fn = vi.fn()
    const off = subscribeGuideState(fn)
    setGuideState({ dragging: false, zone: null }) // already these values
    expect(fn).not.toHaveBeenCalled()
    off()
  })

  it('unsubscribe stops further notifications', () => {
    const fn = vi.fn()
    const off = subscribeGuideState(fn)
    off()
    setGuideState({ dragging: true })
    expect(fn).not.toHaveBeenCalled()
  })

  it('resetGuideState restores the idle shape', () => {
    setGuideState({ dragging: true, zone: 'br', docked: 'br', announce: 'x' })
    resetGuideState()
    expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/guideState.test.js`
Expected: FAIL — `Failed to resolve import "../guideState"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/guide/guideState.js`:

```js
// guideState.js — a tiny framework-agnostic observable for the guide's
// full-screen HUD chrome (dock zones now; the Phase-3 pointer arrow later).
//
// WHY a separate module (vs. living in guideController): GuideHud is mounted in
// the always-eager Layout, but the controller + driver.js MUST stay in the lazy
// guide chunk. The HUD subscribes synchronously to know when to show the dock
// zones, so the seam must be importable WITHOUT pulling the heavy controller into
// the eager bundle. This module has ZERO imports → the eager cost is a few
// hundred bytes. The controller (lazy) writes; the HUD (eager) reads via
// useSyncExternalStore.
//
// Shape: { dragging:boolean, zone:Zone|null, docked:Zone|null, announce:string }

const INITIAL = { dragging: false, zone: null, docked: null, announce: '' }

let state = INITIAL
const listeners = new Set()

export function getGuideState() {
  return state
}

export function setGuideState(patch) {
  const next = { ...state, ...patch }
  let changed = false
  for (const k in next) {
    if (next[k] !== state[k]) { changed = true; break }
  }
  if (!changed) return // keep the snapshot reference stable for React
  state = next
  for (const fn of listeners) fn(state)
}

export function resetGuideState() {
  setGuideState(INITIAL)
}

export function subscribeGuideState(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/guideState.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guide/guideState.js src/lib/guide/__tests__/guideState.test.js
git commit -m "feat(guide): tiny guideState observable for the eager HUD seam"
```

---

## Task 3: `popoverDecorations.js` — inject the drag handle

**Files:**
- Modify: `src/lib/guide/popoverDecorations.js`
- Test: `src/lib/guide/__tests__/popoverDecorations.test.js` (extend)

- [ ] **Step 1: Write the failing test (append to the existing `describe`)**

Add these tests inside the existing `describe('decoratePopover', ...)` block in `src/lib/guide/__tests__/popoverDecorations.test.js` (before its closing `})`):

```js
  it('adds a drag handle; pointerdown calls onDragStart', () => {
    const p = fakePopover()
    const onDragStart = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), onDragStart })
    const handle = p.wrapper.querySelector('.guide-drag-handle')
    expect(handle).toBeTruthy()
    handle.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(onDragStart).toHaveBeenCalledTimes(1)
  })

  it('arrow keys on the handle dock to an edge; Escape floats', () => {
    const p = fakePopover()
    const onDock = vi.fn()
    const onUndock = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), onDock, onUndock })
    const handle = p.wrapper.querySelector('.guide-drag-handle')
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(onDock.mock.calls.map((c) => c[0])).toEqual(['top', 'bottom', 'left', 'right'])
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onUndock).toHaveBeenCalledTimes(1)
  })

  it('reflects docked state on the handle via aria-pressed', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), docked: 'top' })
    expect(p.wrapper.querySelector('.guide-drag-handle').getAttribute('aria-pressed')).toBe('true')
  })

  it('is idempotent — re-decorating does not add a second drag handle', () => {
    const p = fakePopover()
    const opts = { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), onDragStart: vi.fn() }
    decoratePopover(p, opts)
    decoratePopover(p, opts)
    expect(p.wrapper.querySelectorAll('.guide-drag-handle')).toHaveLength(1)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/popoverDecorations.test.js`
Expected: FAIL — `.guide-drag-handle` is null (handle not injected yet).

- [ ] **Step 3: Write minimal implementation**

In `src/lib/guide/popoverDecorations.js`, update the `decoratePopover` signature + body to also call `addDragHandle`, and add the new function. Replace the existing `decoratePopover` export with:

```js
export function decoratePopover(popover, {
  mode = 'spotlight',
  current = 1,
  total = 1,
  onTogglePause,
  onJump,
  onDragStart,
  onDock,
  onUndock,
  docked = null,
} = {}) {
  if (!popover) return
  addPauseButton(popover, mode, onTogglePause)
  makeProgressJumpable(popover, current, total, onJump)
  addDragHandle(popover, { onDragStart, onDock, onUndock, docked })
}
```

Then add this function at the end of the file:

```js
// Drag grip (Phase 2). Pointer drag → onDragStart; keyboard parity → arrow keys
// dock to the 4 edges, Escape floats. Corners are a pointer-only nicety. The
// impure drag loop + geometry live in guideController/dragDock — this only wires
// the handle's intents. Idempotent: a second render won't add a second handle.
function addDragHandle(popover, { onDragStart, onDock, onUndock, docked }) {
  const host = popover.wrapper
  if (!host || host.querySelector?.('.guide-drag-handle')) return
  const handle = document.createElement('button')
  handle.type = 'button'
  handle.className = 'guide-drag-handle'
  handle.textContent = '⠿'
  handle.setAttribute(
    'aria-label',
    'Move guide. Drag to reposition, press arrow keys to dock to an edge, Escape to float.',
  )
  handle.setAttribute('aria-pressed', String(!!docked))
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    onDragStart?.(e)
  })
  handle.addEventListener('keydown', (e) => {
    const map = { ArrowUp: 'top', ArrowDown: 'bottom', ArrowLeft: 'left', ArrowRight: 'right' }
    if (map[e.key]) {
      e.preventDefault()
      e.stopPropagation() // don't let driver scroll / re-key
      onDock?.(map[e.key])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // Escape floats the box; must NOT reach driver's close
      onUndock?.()
    }
  })
  host.insertBefore(handle, host.firstChild)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/popoverDecorations.test.js`
Expected: PASS (existing pause/progress tests + the 4 new drag-handle tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guide/popoverDecorations.js src/lib/guide/__tests__/popoverDecorations.test.js
git commit -m "feat(guide): inject drag handle into the popover (pointer + keyboard dock)"
```

---

## Task 4: `guideController.js` — drag loop + dock/undock wiring

**Files:**
- Modify: `src/lib/guide/guideController.js`
- Test: `src/lib/guide/__tests__/guideController.test.js` (extend)

- [ ] **Step 1: Write the failing test (append to the existing `describe`)**

Add these tests inside `describe('guideController.startTour', ...)` in `src/lib/guide/__tests__/guideController.test.js` (before its closing `})`). Also add the import at the top of the file, after the existing imports:

```js
import { getGuideState } from '../guideState'
```

New tests:

```js
  it('dock(zone) records the dock, emits guide_docked, and updates guideState', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    expect(handle.getDockState()).toBe(null)
    handle.dock('top')
    expect(handle.getDockState()).toBe('top')
    expect(getGuideState().docked).toBe('top')
    expect(onEvent.mock.calls.map((c) => c[0])).toContain('guide_docked')
  })

  it('undock() clears the dock and emits guide_undocked', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    handle.dock('br')
    handle.undock()
    expect(handle.getDockState()).toBe(null)
    expect(getGuideState().docked).toBe(null)
    expect(onEvent.mock.calls.map((c) => c[0])).toContain('guide_undocked')
  })

  it('dock(null) / dock after teardown are no-ops', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const onEvent = vi.fn()
    const handle = startTour(steps, { ...baseOpts({ onEvent }), driverFactory: factory })
    await handle.ready
    handle.dock(null)
    expect(handle.getDockState()).toBe(null)
    handle.destroy()
    handle.dock('top')
    expect(handle.getDockState()).toBe(null)
  })

  it('teardown resets the guideState HUD (dragging/docked cleared)', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    handle.dock('left')
    expect(getGuideState().docked).toBe('left')
    handle.destroy()
    expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '' })
  })

  it('onPopoverRender wrapper passes drag/dock callbacks to decoratePopover', async () => {
    decoratePopover.mockClear()
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts(), driverFactory: factory })
    await handle.ready
    created[0].calls.config.onPopoverRender({ wrapper: {} }, {})
    const arg = decoratePopover.mock.calls.at(-1)[1]
    expect(typeof arg.onDragStart).toBe('function')
    expect(typeof arg.onDock).toBe('function')
    expect(typeof arg.onUndock).toBe('function')
  })
```

> Note: this suite runs in the node env (no `document`/`window`), so `dock()`/teardown exercise the geometry + state + telemetry paths; the DOM repositioning is covered by the Task 7 e2e. `getGuideState` is the real singleton (per-file module registry), reset by `afterEach(() => stopActiveTour())` which tears down → `resetGuideState()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/guideController.test.js`
Expected: FAIL — `handle.dock is not a function` / `getDockState is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/guide/guideController.js`:

**(a)** Add imports after the existing `import { decoratePopover } from './popoverDecorations'` line:

```js
import { zoneForPoint, snapRectForZone, DEFAULT_THRESHOLD } from './dragDock'
import { setGuideState, resetGuideState } from './guideState'

// Re-exported for spec-contract symmetry; the eager GuideHud imports these
// directly from ./guideState so it never pulls this lazy controller into index.
export { subscribeGuideState, getGuideState } from './guideState'
```

**(b)** Inside `startTour`, after the Pause/Explore section (just after the `jumpTo` function, before `const config = {`), add the drag/dock block:

```js
  // ── Drag + Dock (Phase 2) ────────────────────────────────────────────
  // The popover is position:fixed, so a free drag is just inline left/top. The
  // pure dragDock.js decides zones + snap targets; this is the impure glue +
  // state emission. In-session only — no store, no STORE_VERSION bump.
  let dockedZone = null
  let dragCleanup = null

  const ZONE_LABEL = {
    top: 'top edge', bottom: 'bottom edge', left: 'left edge', right: 'right edge',
    tl: 'top-left corner', tr: 'top-right corner', bl: 'bottom-left corner', br: 'bottom-right corner',
  }

  function popoverEl() {
    return typeof document === 'undefined' ? null : document.querySelector('.driver-popover')
  }
  function viewport() {
    return { width: window.innerWidth, height: window.innerHeight }
  }

  function applyDockClass(zone) {
    const pop = popoverEl()
    if (!pop) return
    for (const z of Object.keys(ZONE_LABEL)) pop.classList.remove('guide-docked-' + z)
    pop.classList.toggle('guide-docked', !!zone)
    if (zone) pop.classList.add('guide-docked-' + zone)
  }

  function positionBox(left, top) {
    const pop = popoverEl()
    if (!pop) return
    pop.style.left = left + 'px'
    pop.style.top = top + 'px'
    pop.style.right = 'auto'
    pop.style.bottom = 'auto'
    pop.setAttribute('data-guide-dragged', '')
  }

  function dock(zone) {
    if (torn || settled || !zone) return
    dockedZone = zone
    const pop = popoverEl()
    if (pop) {
      const box = { width: pop.offsetWidth, height: pop.offsetHeight }
      const { left, top } = snapRectForZone(zone, box, viewport())
      positionBox(left, top)
      applyDockClass(zone)
    }
    setGuideState({ dragging: false, zone: null, docked: zone, announce: `Guide docked to ${ZONE_LABEL[zone]}.` })
    onEv('guide_docked', { tier, stepIndex: active })
  }

  function undock() {
    if (torn || settled || !dockedZone) return
    dockedZone = null
    applyDockClass(null)
    setGuideState({ docked: null, announce: 'Guide floating.' })
    onEv('guide_undocked', { tier, stepIndex: active })
  }

  // Re-stick the dock after driver re-renders the popover on a step change.
  function reapplyDock() {
    if (!dockedZone) return
    const pop = popoverEl()
    if (!pop) return
    const box = { width: pop.offsetWidth, height: pop.offsetHeight }
    const { left, top } = snapRectForZone(dockedZone, box, viewport())
    positionBox(left, top)
    applyDockClass(dockedZone)
  }

  // Impure pointer-drag loop. Delegates all geometry to dragDock.js. A no-move
  // click (< 4px) is treated as a click → no dock/float (so tapping the grip
  // never accidentally docks).
  function startDrag(downEvent) {
    if (torn || settled || typeof window === 'undefined') return
    const pop = popoverEl()
    if (!pop) return
    const rect = pop.getBoundingClientRect()
    const offsetX = downEvent.clientX - rect.left
    const offsetY = downEvent.clientY - rect.top
    const startX = downEvent.clientX
    const startY = downEvent.clientY
    let moved = false
    let zone = null
    try { downEvent.target?.setPointerCapture?.(downEvent.pointerId) } catch { /* capture optional */ }

    const onMove = (e) => {
      positionBox(e.clientX - offsetX, e.clientY - offsetY)
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > 4) {
        moved = true
        setGuideState({ dragging: true, zone: null, docked: dockedZone, announce: 'Dragging guide — release on a green zone to dock.' })
      }
      if (!moved) return
      const z = zoneForPoint({ x: e.clientX, y: e.clientY }, viewport(), DEFAULT_THRESHOLD)
      if (z !== zone) { zone = z; setGuideState({ dragging: true, zone: z, docked: dockedZone }) }
    }
    const onUp = (e) => {
      cleanup()
      if (!moved) { setGuideState({ dragging: false, zone: null, docked: dockedZone }); return }
      const z = zoneForPoint({ x: e.clientX, y: e.clientY }, viewport(), DEFAULT_THRESHOLD)
      if (z) { dock(z); return }
      dockedZone = null
      applyDockClass(null)
      setGuideState({ dragging: false, zone: null, docked: null, announce: 'Guide moved.' })
    }
    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      dragCleanup = null
    }
    dragCleanup = cleanup
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
```

**(c)** Update `destroyDriver` to cancel an in-flight drag and reset the HUD. Replace the existing `destroyDriver` body:

```js
  function destroyDriver() {
    if (torn) return
    torn = true
    if (dragCleanup) dragCleanup()
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', onPopState)
    }
    try { driverObj && driverObj.destroy() } catch { /* idempotent */ }
    resetGuideState()
    if (_active === handle) _active = null
  }
```

**(d)** Update the `onPopoverRender` wrapper inside `config` to pass the new callbacks + re-stick the dock. Replace the existing `onPopoverRender` block:

```js
    onPopoverRender: (popover, o) => {
      if (typeof onPopoverRender === 'function') onPopoverRender(popover, o)
      decoratePopover(popover, {
        mode,
        current: active + 1,
        total: list.length,
        onTogglePause: togglePause,
        onJump: jumpTo,
        onDragStart: startDrag,
        onDock: dock,
        onUndock: undock,
        docked: dockedZone,
      })
      reapplyDock()
    },
```

**(e)** Expose the new methods on `handle`. Replace the existing `const handle = {...}` line:

```js
  const handle = {
    destroy: teardownSilently, pause, resume, togglePause, jumpTo,
    dock, undock, getMode: () => mode, getDockState: () => dockedZone,
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/guideController.test.js`
Expected: PASS (all existing Phase-1 tests + the 5 new drag/dock tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/guide/guideController.js src/lib/guide/__tests__/guideController.test.js
git commit -m "feat(guide): drag loop + dock/undock in controller, reset HUD on teardown"
```

---

## Task 5: `GuideDockZones.jsx` — the drop-zone overlay

**Files:**
- Create: `src/components/guide/GuideDockZones.jsx`
- Test: `src/components/guide/__tests__/GuideDockZones.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/guide/__tests__/GuideDockZones.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, GuideDockZones
let root, host

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: GuideDockZones } = await import('../GuideDockZones'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('GuideDockZones', () => {
  it('renders all 8 dock zones', async () => {
    await act(async () => { root.render(React.createElement(GuideDockZones, { activeZone: null })) })
    expect(host.querySelectorAll('.guide-dock-zone')).toHaveLength(8)
  })

  it('marks only the active zone with is-active', async () => {
    await act(async () => { root.render(React.createElement(GuideDockZones, { activeZone: 'top' })) })
    expect(host.querySelector('[data-zone="top"]').classList.contains('is-active')).toBe(true)
    expect(host.querySelector('[data-zone="bottom"]').classList.contains('is-active')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guide/__tests__/GuideDockZones.test.jsx`
Expected: FAIL — `Failed to resolve import "../GuideDockZones"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/guide/GuideDockZones.jsx`:

```jsx
import { DOCK_ZONES } from '../../lib/guide/dragDock'

// The translucent-green dashed drop targets shown while the guide box is being
// dragged (4 edges + 4 corners — the "book margins"). Presentational only: the
// active zone (under the pointer) is highlighted. pointer-events:none so it never
// blocks the drag underneath. Styling lives in index.css (.guide-dock-zones).
export default function GuideDockZones({ activeZone = null }) {
  return (
    <div className="guide-dock-zones" aria-hidden="true">
      {DOCK_ZONES.map((zone) => (
        <div
          key={zone}
          data-zone={zone}
          className={'guide-dock-zone guide-dock-zone-' + zone + (zone === activeZone ? ' is-active' : '')}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guide/__tests__/GuideDockZones.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/guide/GuideDockZones.jsx src/components/guide/__tests__/GuideDockZones.test.jsx
git commit -m "feat(guide): GuideDockZones drop-zone overlay (8 zones, active highlight)"
```

---

## Task 6: `GuideHud.jsx` + mount in Layout

**Files:**
- Create: `src/components/guide/GuideHud.jsx`
- Modify: `src/components/Layout.jsx`
- Test: `src/components/guide/__tests__/GuideHud.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/guide/__tests__/GuideHud.test.jsx`:

```jsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, GuideHud, setGuideState, resetGuideState
let root, host

const flush = async () => { await act(async () => {}) }

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: GuideHud } = await import('../GuideHud'))
  ;({ setGuideState, resetGuideState } = await import('../../../lib/guide/guideState'))
  resetGuideState()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  resetGuideState()
})

describe('GuideHud', () => {
  it('renders no dock zones while idle', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    expect(host.querySelector('.guide-dock-zones')).toBe(null)
  })

  it('renders the lazy dock zones once a drag begins', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    await act(async () => { setGuideState({ dragging: true, zone: 'top' }) })
    await flush() // let the lazy GuideDockZones chunk resolve
    expect(host.querySelector('.guide-dock-zones')).toBeTruthy()
    expect(host.querySelector('[data-zone="top"]').classList.contains('is-active')).toBe(true)
  })

  it('announces dock changes via the polite live region', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    await act(async () => { setGuideState({ announce: 'Guide docked to top edge.' }) })
    const live = host.querySelector('[role="status"][aria-live="polite"]')
    expect(live).toBeTruthy()
    expect(live.textContent).toContain('Guide docked to top edge.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guide/__tests__/GuideHud.test.jsx`
Expected: FAIL — `Failed to resolve import "../GuideHud"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/guide/GuideHud.jsx`:

```jsx
import { useSyncExternalStore, lazy, Suspense } from 'react'
import { subscribeGuideState, getGuideState } from '../../lib/guide/guideState'
import FeedbackLive from '../FeedbackLive'

// Always mounted in Layout, but cheap in the eager path: it subscribes to the
// tiny guideState observable and renders null until a drag begins. The dock-zone
// overlay is lazy-imported so its (and dragDock's) bytes only land when needed —
// the controller + driver.js stay in their own lazy chunk. Announcements reuse
// the shared polite live region (FeedbackLive) for WCAG 4.1.3 parity.
const GuideDockZones = lazy(() => import('./GuideDockZones'))

export default function GuideHud() {
  const state = useSyncExternalStore(subscribeGuideState, getGuideState, getGuideState)
  return (
    <>
      <FeedbackLive text={state.announce} />
      {state.dragging && (
        <Suspense fallback={null}>
          <GuideDockZones activeZone={state.zone} />
        </Suspense>
      )}
    </>
  )
}
```

Then mount it in `src/components/Layout.jsx`. Add the import near the other component imports (after `import GuideOffer from './GuideOffer'`):

```js
import GuideHud from './guide/GuideHud'
```

And render it right after `<GuideOffer />`:

```jsx
      {/* First-run "App tour" offer — once-only, skippable; replayable in Settings */}
      <GuideOffer />

      {/* Guide HUD — drag dock-zones + a11y announcements (null when idle) */}
      <GuideHud />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guide/__tests__/GuideHud.test.jsx`
Expected: PASS (idle = no zones; dragging = lazy zones appear; announce = live region text).

- [ ] **Step 5: Run the full unit suite + build (catch regressions + verify bundle)**

Run: `npm run test:run && npm run build`
Expected: all tests PASS; build succeeds with zero errors. Confirm `index-*.js` did not jump materially (only `guideState` + `GuideHud` shell are new eager bytes — a few hundred bytes; `GuideDockZones` + `dragDock` are in a lazy chunk). The per-route `PDFReader`/`CikguBot` budgets are unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/components/guide/GuideHud.jsx src/components/guide/__tests__/GuideHud.test.jsx src/components/Layout.jsx
git commit -m "feat(guide): GuideHud host (lazy dock zones + live announcements), mount in Layout"
```

---

## Task 7: CSS — drag handle, docked/minimized, dock zones

**Files:**
- Modify: `src/index.css` (after the existing injected-popover-controls block, near line 284)

- [ ] **Step 1: Add the styles**

In `src/index.css`, immediately after the `.driver-popover.guide-theme .guide-progress-input { … }` rule (the end of the Phase-1 injected-controls block, ~line 284), insert:

```css
/* ── In-app guide: Drag + Dock (Phase 2) ─────────────────────────────
   Drag grip injected at the top of the popover; docked = compact bar that
   re-expands on hover/focus/tap; drop-zone overlay shown while dragging.
   All colors via tokens (work light/dark); motion gated by reduced-motion. */
.driver-popover.guide-theme .guide-drag-handle {
  all: unset;
  cursor: grab;
  touch-action: none;                  /* let Pointer Events drive the drag, not scroll */
  display: flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px;   /* WCAG 2.5.5 target size */
  margin: -4px -4px 2px;               /* sit snug in the header */
  color: var(--color-dim);
  font-size: 18px; line-height: 1;
  border-radius: 8px;
}
.driver-popover.guide-theme .guide-drag-handle:hover,
.driver-popover.guide-theme .guide-drag-handle:focus-visible {
  background: var(--color-card2);
  color: var(--color-text);
}
.driver-popover.guide-theme .guide-drag-handle:active { cursor: grabbing; }

/* Docked = compact bar; the description hides until hover/focus/tap re-expands
   the box. Footer controls (Next/Back/Pause/…) stay visible at all times. */
.driver-popover.guide-theme.guide-docked {
  max-width: 220px;
  transition: max-width 0.15s ease;
}
.driver-popover.guide-theme.guide-docked .driver-popover-description { display: none; }
.driver-popover.guide-theme.guide-docked:hover,
.driver-popover.guide-theme.guide-docked:focus-within { max-width: 340px; }
.driver-popover.guide-theme.guide-docked:hover .driver-popover-description,
.driver-popover.guide-theme.guide-docked:focus-within .driver-popover-description { display: block; }

/* Drop-zone overlay shown while dragging. pointer-events:none → never blocks the
   drag underneath. z-index above driver's dark overlay so the zones are visible. */
.guide-dock-zones {
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: 10001;
}
.guide-dock-zone {
  position: absolute;
  border: 2px dashed var(--color-green);
  background: color-mix(in srgb, var(--color-green) 14%, transparent);
  border-radius: 10px;
  opacity: 0.55;
  transition: opacity 0.12s ease, background 0.12s ease;
}
.guide-dock-zone.is-active {
  opacity: 1;
  background: color-mix(in srgb, var(--color-green) 30%, transparent);
}
.guide-dock-zone-top    { top: 8px;    left: 18%; right: 18%; height: 64px; }
.guide-dock-zone-bottom { bottom: 8px; left: 18%; right: 18%; height: 64px; }
.guide-dock-zone-left   { left: 8px;   top: 22%; bottom: 22%; width: 64px; }
.guide-dock-zone-right  { right: 8px;  top: 22%; bottom: 22%; width: 64px; }
.guide-dock-zone-tl { top: 8px;    left: 8px;   width: 72px; height: 64px; }
.guide-dock-zone-tr { top: 8px;    right: 8px;  width: 72px; height: 64px; }
.guide-dock-zone-bl { bottom: 8px; left: 8px;   width: 72px; height: 64px; }
.guide-dock-zone-br { bottom: 8px; right: 8px;  width: 72px; height: 64px; }

@media (prefers-reduced-motion: reduce) {
  .driver-popover.guide-theme.guide-docked { transition: none; }
  .guide-dock-zone { transition: none; }
}
```

- [ ] **Step 2: Verify the build compiles the CSS**

Run: `npm run build`
Expected: build succeeds (Tailwind v4 + plain CSS, no errors). `color-mix` + `var(--color-green)` are already used elsewhere in `src/` so they're supported.

- [ ] **Step 3: Visual check (human eye — items 2-4 of the Verification checklist)**

Run `npm run dev`, open `/settings`, start the Quick tour, and verify:
- Drag the box → green dashed zones appear on all 4 edges + 4 corners; the one under the cursor brightens.
- Drop on a zone → box snaps + shrinks to a compact bar; hovering/focusing it re-expands the description; Next/Back/Pause still work.
- Drag back to the centre → box detaches.
- Toggle dark/light (Settings) → zones + docked box read correctly in both (green token re-tunes for light).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style(guide): drag-handle + docked/minimized + dashed-green dock-zone styles"
```

---

## Task 8: e2e — drag-to-dock + detach + keyboard dock

**Files:**
- Create: `tests/e2e/guide-drag-dock.spec.js`

- [ ] **Step 1: Write the test**

Create `tests/e2e/guide-drag-dock.spec.js`:

```js
import { test, expect } from '@playwright/test'

// Phase 2 — drag the guide box to an edge → it docks + minimizes (controls still
// reachable); drag back to the centre → it detaches. Plus keyboard dock parity.
// Playwright's page.mouse synthesizes pointer events in Chromium, so the
// controller's pointerdown/move/up drag loop runs faithfully.

test('guide: drag to an edge docks + minimizes; drag out detaches', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const handle = popover.locator('.guide-drag-handle')
  await expect(handle).toBeVisible()

  // Drag the handle toward the top edge.
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(400, 300, { steps: 6 })          // mid-flight: zones appear
  await expect(page.locator('.guide-dock-zones')).toBeVisible()
  await page.mouse.move(400, 12, { steps: 6 })           // into the top band
  await page.mouse.up()

  await expect(popover).toHaveClass(/guide-docked/)      // docked + minimized
  // Footer controls remain reachable while docked.
  await expect(popover.getByRole('button', { name: /Next/i })).toBeVisible()

  // Drag back to the centre → detaches.
  const hb2 = await handle.boundingBox()
  await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2)
  await page.mouse.down()
  await page.mouse.move(400, 420, { steps: 8 })          // centre = no zone
  await page.mouse.up()
  await expect(popover).not.toHaveClass(/guide-docked/)
})

test('guide: keyboard docks via arrow keys on the move handle', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  const handle = popover.locator('.guide-drag-handle')
  await handle.focus()
  await handle.press('ArrowUp')
  await expect(popover).toHaveClass(/guide-docked-top/)
  await handle.press('Escape')
  await expect(popover).not.toHaveClass(/guide-docked/)
})
```

- [ ] **Step 2: Run the e2e**

Run: `npm run test:e2e -- guide-drag-dock`
Expected: both tests PASS. (The webServer auto-spawns `npm run dev` on :5173.) If the drag is flaky on the first run due to driver's entry animation, the `await expect(popover).toBeVisible()` gate before grabbing the handle already covers it.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/guide-drag-dock.spec.js
git commit -m "test(e2e): guide drag-to-dock + detach + keyboard dock"
```

---

## Task 9: Docs — README + RESUME_HERE (standing rule)

**Files:**
- Modify: `README.md` (the in-app guide / "App tour" section)
- Modify: `RESUME_HERE.md`

- [ ] **Step 1: Update README**

Find the README section describing the in-app guide / pause-explore (Phase 1) and add a short bullet for Phase 2:

```markdown
- **Drag + dock the guide box** — grab the ⠿ handle to drag the guide anywhere; green dashed drop zones glow on every edge + corner, and dropping on one docks the box as a compact bar (it re-expands on hover/focus; all controls stay reachable). Drag it back to the centre to detach. Keyboard: focus the handle and press an arrow key to dock to that edge, Escape to float. (In-session only.)
```

- [ ] **Step 2: Update RESUME_HERE.md**

Update the guide status / "what shipped" area to record Phase 2 (drag + magnetic dock) as shipped — mirror the wording/structure already used for Phase 1, and note the new files (`dragDock.js`, `guideState.js`, `GuideHud.jsx`, `GuideDockZones.jsx`) + that Phase 3 (Full Page Guide) remains the next phase per the spec.

- [ ] **Step 3: Run the full gate one last time**

Run: `npm run build && npm run test:run && npm run lint`
Expected: build clean; ~1030+ unit tests PASS (now including dragDock/guideState/GuideHud/GuideDockZones + the controller/decoration extensions); lint 0 errors (3 pre-existing exhaustive-deps warnings only — do not add new ones).

- [ ] **Step 4: Commit (this auto-pushes → prod deploy)**

```bash
git add README.md RESUME_HERE.md
git commit -m "docs(guide): README + RESUME_HERE — drag + magnetic dock (Phase 2)"
```

- [ ] **Step 5: Confirm prod deploy**

After the push, confirm the `upg-` Vercel project reaches READY (the public site). The docs-only commit message above is NOT docs-only by itself, but the behavior commits in Tasks 1-8 each triggered the gate; this final commit ships the docs alongside.

---

## Self-review (spec §5 coverage)

| Spec §5 requirement | Covered by |
|---|---|
| Drag handle starts a pointer drag; free positioning + `data-guide-dragged` (§5.1) | Task 3 (handle) + Task 4 (`startDrag`/`positionBox`) |
| Dock zones on 4 edges + 4 corners; hovered zone brightens (§5.1) | Task 5 (`GuideDockZones`, 8 zones, `is-active`) + Task 6 (HUD shows on drag) + Task 7 (CSS) |
| Drop in a zone → dock + minimize, controls still exposed (§5.1) | Task 4 (`dock`) + Task 7 (`.guide-docked` compact + focus-within expand) + Task 8 e2e |
| Drop outside → float where dropped (§5.1) | Task 4 (`onUp` else-branch) |
| Drag a docked box back past threshold → undock (§5.1) | Task 4 (`onUp` → `zoneForPoint` null → float) + Task 8 e2e ("drag out detaches") |
| In-session only, no STORE_VERSION bump (§5.1) | No store touched (state in controller closure + `guideState` singleton) |
| Pure geometry `zoneForPoint`/`snapRectForZone`/`shouldDetach` (§5.2) | Task 1 (`dragDock.js` + tests) |
| Drop-zone visuals: dashed green, color-mix bg, token-driven, reduced-motion (§5.3) | Task 7 CSS |
| Keyboard parity to dock + announced + ≥44px handle (§5.3) | Task 3 (arrows/Escape, aria-label) + Task 4 (announce via `guideState.announce`) + Task 6 (`FeedbackLive`) + Task 7 (44px) + Task 8 keyboard e2e |
| Pure-geometry unit tests; e2e drag→dock→detach (§5.4) | Task 1 + Task 8 |
| Never dead-end / idempotent / teardown safety (§7) | `dock`/`undock` guards (Task 4); `destroyDriver` cancels drag + `resetGuideState` (Task 4) |
| Bundle: lazy chunk, no eager index growth (§7) | `guideState` zero-import eager seam; `GuideDockZones`+`dragDock` lazy via `GuideHud` (Task 6 Step 5 verifies) |
| Theming dark + light (§7) | Task 7 token-only colors; Task 7 Step 3 visual check |

**Placeholder scan:** none — every code step contains complete source.
**Type/name consistency:** `dockedZone`/`getDockState`/`dock`/`undock`/`reapplyDock`/`startDrag`/`positionBox`/`applyDockClass` are consistent across Tasks 4 + tests; `guideState` shape `{ dragging, zone, docked, announce }` is identical in Tasks 2, 4, 6; `DOCK_ZONES` order matches between Task 1 and the GuideDockZones render + e2e.
**Phase-1 isolation:** no edits to pause/resume/jumpTo logic or their tests; the only shared-line edits (`destroyDriver`, `onPopoverRender` wrapper, `handle` object) are additive.
