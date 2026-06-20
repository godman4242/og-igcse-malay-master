# Guide Phase 3a — Full Page Guide (infrastructure + Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the ▶ "Tour this page" Full Page Guide — a per-page deep dive that spotlights each control with an animated arrow + "what it does + example" — wired end-to-end and proven on the **Dashboard** page.

**Architecture:** A page guide reuses the existing tour engine: `startTour(buildPageSteps(route), { tier: 'page' })` where every step shares the current route, so the controller never navigates (it still skips-missing, pauses, docks, jumps). New surface is pure `pointerGeometry.js` (arrow math) → `GuidePointer.jsx` (animated SVG hosted in the Phase-2 `GuideHud`), `pageGuides.js` content (lazy) + a tiny eager `pageGuideRoutes.js` seam, the controller emitting the arrow's box+target rects (computed on rAF + tracked on scroll/resize because driver uses `smoothScroll`), and a header ▶ entry point.

**Tech Stack:** React 19 (`useSyncExternalStore`, `react-dom/client` + `act` for JSX tests — this project does NOT use @testing-library; test files end `.test.js` and use `React.createElement`), driver.js@1.4.0 (lazy), Vitest (node for pure modules, `@vitest-environment jsdom` for DOM/JSX), Playwright (e2e, viewport 390×844), Tailwind v4 + `var(--color-*)` tokens.

---

## Scope (decide-and-flag)

- **This plan = infrastructure + the Dashboard page only.** Study (`/study`) and Practice (`/practice`) are **repeat increments (3b/3c)** — same recipe (add `data-guide` anchors + verified prose + a per-page e2e), each a small follow-on plan. Shipping one real page proves the whole vertical slice without authoring 3 pages' content in one pass. **Veto:** if you want all 3 pages in this plan, say so and I'll extend it.
- **Entry point = the header ▶ only in 3a.** The spec's *in-popover* ▶ (drop into a page guide from within a running tour) is **deferred to 3b** — it needs the controller to restart itself (more plumbing) and the header ▶ already fully delivers "tap ▶ → page deep dive." **Veto:** if you want the in-popover ▶ now, it's +1 task.
- **No `STORE_VERSION` bump** (the ▶ is user-initiated; no "seen" memory in 3a — per spec §6).

## File structure

| File | New? | Responsibility |
|---|---|---|
| `src/lib/guide/tourSteps.js` | change | Extend `APP_ROUTES` 19 → 21 (`/dictation`, `/cloze-listening`). |
| `src/lib/guide/pointerGeometry.js` | new | Pure arrow math: `arrowPath(boxRect, targetRect, viewport)` → `{ start, end, headDeg, clamped }`. No DOM. |
| `src/lib/guide/guideState.js` | change | Add `pointer: {box,target}|null` to the shape + initial. |
| `src/components/guide/GuidePointer.jsx` | new | Animated SVG arrow (box→target), reduced-motion aware, `pointer-events:none`, `aria-hidden`. |
| `src/components/guide/GuideHud.jsx` | change | Lazy-render `<GuidePointer>` when `pointer` set (mirrors the dock-zones branch). |
| `src/lib/guide/pageGuideRoutes.js` | new | Tiny zero-import eager list `PAGE_GUIDE_ROUTES` (route keys with a guide) for the eager header. |
| `src/lib/guide/pageGuides.js` | new | `PAGE_GUIDES` content (Dashboard) + pure `buildPageSteps(route)`. Lazy. |
| `src/lib/guide/guideController.js` | change | Emit `pointer` rects for `tier:'page'` steps (rAF + scroll/resize tracking); clear on teardown. |
| `src/hooks/useGuide.js` | change | Add `startPage(route)` (lazy-imports controller + pageGuides, `startTour({tier:'page'})`). |
| `src/components/Layout.jsx` | change | Header ▶ "Tour this page" button, shown when `PAGE_GUIDE_ROUTES.includes(route)`. |
| `src/pages/Dashboard.jsx` | change | Add `data-guide="dashboard-*"` anchors to the controls the guide points at. |
| `src/index.css` | change | Arrow stroke/head styles + header ▶ button styles (token-driven, reduced-motion). |
| `tests/e2e/guide-full-page.spec.js` | new | Dashboard ▶ → arrow → Next; pause still works (no regression). |
| `README.md`, `RESUME_HERE.md` | change | Document Phase 3a (standing rule). |

---

## Task 1: Route reconcile — `APP_ROUTES` 19 → 21

**Files:**
- Modify: `src/lib/guide/tourSteps.js`
- Test: `src/lib/guide/__tests__/tourSteps.test.js`

- [ ] **Step 1: Update the failing assertion first (red)**

Open `src/lib/guide/__tests__/tourSteps.test.js`, find the assertion about `APP_ROUTES` (it checks the contents/length against the route table). Change it to expect the full 21 routes including `/dictation` and `/cloze-listening`. Example (match the file's existing style — adapt to its actual assertion):

```js
import { APP_ROUTES } from '../tourSteps'
// ...
it('APP_ROUTES mirrors the App.jsx route table (21 routes)', () => {
  expect(APP_ROUTES).toContain('/dictation')
  expect(APP_ROUTES).toContain('/cloze-listening')
  expect(APP_ROUTES).toHaveLength(21)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/tourSteps.test.js`
Expected: FAIL (currently 19 routes; `/dictation` / `/cloze-listening` missing).

- [ ] **Step 3: Extend APP_ROUTES**

In `src/lib/guide/tourSteps.js`, replace the `APP_ROUTES` array with the full 21 (order mirrors `src/App.jsx`):

```js
export const APP_ROUTES = [
  '/', '/study', '/roleplay', '/grammar', '/writing', '/import', '/settings',
  '/mistakes', '/word-families', '/cikgu', '/comprehension', '/pdf-reader',
  '/speaking', '/exam-rehearsal', '/listening', '/dictation', '/cloze-listening',
  '/smart-study', '/practice', '/saved-cloze', '/for-you',
]
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/tourSteps.test.js`
Expected: PASS.

- [ ] **Step 5: Commit** (batched at Milestone A — see end of plan; or commit now if running per-task).

---

## Task 2: `pointerGeometry.js` — pure arrow math

**Files:**
- Create: `src/lib/guide/pointerGeometry.js`
- Test: `src/lib/guide/__tests__/pointerGeometry.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/guide/__tests__/pointerGeometry.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { arrowPath } from '../pointerGeometry'

const VP = { width: 1000, height: 800 }
// box centred ~ (500,400); helper to make a rect-lite
const rect = (left, top, width = 200, height = 100) => ({ left, top, width, height })

describe('arrowPath', () => {
  it('target below the box → start at box bottom, head points down (~90°)', () => {
    const box = rect(400, 300)            // box centre (500,350), bottom edge y=400
    const target = rect(460, 600, 80, 40) // target centre (500,620) — below
    const r = arrowPath(box, target, VP)
    expect(r.start.y).toBeGreaterThan(box.top)          // starts near/under the box
    expect(r.end.y).toBeLessThan(target.top + 1)        // ends just above the target top
    expect(r.headDeg).toBeGreaterThan(45)
    expect(r.headDeg).toBeLessThan(135)
    expect(r.clamped).toBe(false)
    expect(typeof r.path).toBe('string')
  })

  it('target above the box → head points up (~-90°/270°)', () => {
    const box = rect(400, 500)
    const target = rect(460, 100, 80, 40)
    const r = arrowPath(box, target, VP)
    expect(r.end.y).toBeGreaterThan(target.top + target.height - 1) // ends near target bottom
    expect(r.start.y).toBeLessThan(box.top + 1)                     // starts at box top
  })

  it('target to the right → start at box right edge', () => {
    const box = rect(100, 350)
    const target = rect(800, 360, 80, 40)
    const r = arrowPath(box, target, VP)
    expect(r.start.x).toBeGreaterThan(box.left + box.width - 1)
    expect(Math.abs(r.headDeg)).toBeLessThan(45)        // pointing right-ish
  })

  it('off-screen target clamps the end to the viewport and flags it', () => {
    const box = rect(400, 350)
    const target = rect(2000, 360, 80, 40) // way off to the right
    const r = arrowPath(box, target, VP)
    expect(r.end.x).toBeLessThanOrEqual(VP.width)
    expect(r.clamped).toBe(true)
  })

  it('degenerate (overlapping rects) returns a finite, safe arrow', () => {
    const box = rect(400, 350)
    const r = arrowPath(box, box, VP)
    expect(Number.isFinite(r.start.x)).toBe(true)
    expect(Number.isFinite(r.end.x)).toBe(true)
    expect(Number.isFinite(r.headDeg)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/pointerGeometry.test.js`
Expected: FAIL — `Failed to resolve import "../pointerGeometry"`.

- [ ] **Step 3: Implement**

Create `src/lib/guide/pointerGeometry.js`:

```js
// pointerGeometry.js — pure geometry for the Full Page Guide's animated arrow.
// No DOM. Mirrors dragDock.js: given the guide box rect and the spotlighted
// control's rect, compute where the arrow starts (a point on the box edge facing
// the target), where it ends (just outside the target edge facing the box), the
// arrowhead angle, and an SVG path. Off-screen targets clamp to the viewport.
// Rects are DOMRect-lite { left, top, width, height } so they serialise through
// guideState. Unit-tested in __tests__/pointerGeometry.test.js.

const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)

/**
 * @param {{left,top,width,height}} boxRect     the guide popover
 * @param {{left,top,width,height}} targetRect  the spotlighted control
 * @param {{width,height}} viewport
 * @returns {{ start:{x,y}, end:{x,y}, headDeg:number, path:string, clamped:boolean }}
 */
export function arrowPath(boxRect, targetRect, viewport) {
  const b = centre(boxRect)
  const t = centre(targetRect)
  const dx = t.x - b.x
  const dy = t.y - b.y

  // Pick the box edge facing the target (dominant axis), so the arrow leaves the
  // box from the side nearest the control.
  let start
  if (Math.abs(dx) > Math.abs(dy)) {
    start = { x: dx > 0 ? boxRect.left + boxRect.width : boxRect.left, y: b.y }
  } else {
    start = { x: b.x, y: dy > 0 ? boxRect.top + boxRect.height : boxRect.top }
  }

  // End just outside the target edge facing the box (so the head sits on the edge,
  // not over the control's centre).
  let end
  if (Math.abs(dx) > Math.abs(dy)) {
    end = { x: dx > 0 ? targetRect.left : targetRect.left + targetRect.width, y: t.y }
  } else {
    end = { x: t.x, y: dy > 0 ? targetRect.top : targetRect.top + targetRect.height }
  }

  // Clamp the end into the viewport for off-screen / scrolled-away targets.
  const cx = clamp(end.x, 0, viewport.width)
  const cy = clamp(end.y, 0, viewport.height)
  const clamped = cx !== end.x || cy !== end.y
  end = { x: cx, y: cy }

  const headDeg = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI

  // Gentle quadratic curve: control point offset perpendicular to the line.
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  const path = `M ${round(start.x)} ${round(start.y)} Q ${round(mx)} ${round(my)} ${round(end.x)} ${round(end.y)}`

  return { start, end, headDeg, path, clamped }
}

function round(n) { return Math.round(n * 100) / 100 }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/pointerGeometry.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit** (Milestone A).

---

## Task 3: `guideState.js` — add the `pointer` field

**Files:**
- Modify: `src/lib/guide/guideState.js`
- Test: `src/lib/guide/__tests__/guideState.test.js` (update existing shape assertions + add one)

- [ ] **Step 1: Update the existing shape assertions first (red)**

In `src/lib/guide/__tests__/guideState.test.js`, the two assertions that check the exact idle shape must include `pointer: null`. Change BOTH occurrences of:

```js
expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '' })
```
to:
```js
expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '', pointer: null })
```

Then add a new test before the closing `})`:

```js
  it('carries a pointer payload (box + target rects) for the page-guide arrow', () => {
    const p = { box: { left: 1, top: 2, width: 3, height: 4 }, target: { left: 5, top: 6, width: 7, height: 8 } }
    setGuideState({ pointer: p })
    expect(getGuideState().pointer).toEqual(p)
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/guideState.test.js`
Expected: FAIL (idle shape lacks `pointer`; new test reads `undefined`).

- [ ] **Step 3: Add `pointer` to the state shape**

In `src/lib/guide/guideState.js`, change the `INITIAL` constant:

```js
const INITIAL = { dragging: false, zone: null, docked: null, announce: '', pointer: null }
```

(No other change — `setGuideState`'s key-diff loop already handles the new key.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/guideState.test.js`
Expected: PASS.

- [ ] **Step 5: Fix the OTHER suites that assert the 4-field shape (red→green)**

The Phase-2 controller test asserts the idle shape on teardown. Update it: in `src/lib/guide/__tests__/guideController.test.js`, the test `teardown resets the guideState HUD` has:

```js
expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '' })
```
Change to:
```js
expect(getGuideState()).toEqual({ dragging: false, zone: null, docked: null, announce: '', pointer: null })
```

Run: `npx vitest run src/lib/guide/__tests__/guideController.test.js src/components/guide/__tests__/GuideHud.test.js`
Expected: PASS (no other suite hard-codes the full shape — GuideHud reads fields individually).

- [ ] **Step 6: Commit** (Milestone A).

---

## Task 4: `GuidePointer.jsx` — the animated arrow

**Files:**
- Create: `src/components/guide/GuidePointer.jsx`
- Test: `src/components/guide/__tests__/GuidePointer.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/components/guide/__tests__/GuidePointer.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, GuidePointer
let root, host

const box = { left: 400, top: 300, width: 200, height: 100 }
const target = { left: 460, top: 600, width: 80, height: 40 }

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: GuidePointer } = await import('../GuidePointer'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('GuidePointer', () => {
  it('renders an SVG arrow (path + arrowhead) for a box→target pointer', async () => {
    await act(async () => { root.render(React.createElement(GuidePointer, { pointer: { box, target } })) })
    const svg = host.querySelector('svg.guide-pointer')
    expect(svg).toBeTruthy()
    expect(svg.querySelector('path')).toBeTruthy()        // the line
    expect(svg.querySelector('polygon')).toBeTruthy()     // the arrowhead
    expect(svg.getAttribute('aria-hidden')).toBe('true')  // decorative
  })

  it('renders nothing when the pointer has no target', async () => {
    await act(async () => { root.render(React.createElement(GuidePointer, { pointer: { box, target: null } })) })
    expect(host.querySelector('svg.guide-pointer')).toBe(null)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/guide/__tests__/GuidePointer.test.js`
Expected: FAIL — `Failed to resolve import "../GuidePointer"`.

- [ ] **Step 3: Implement**

Create `src/components/guide/GuidePointer.jsx`:

```jsx
import { arrowPath } from '../../lib/guide/pointerGeometry'

// The Full Page Guide's animated arrow: a fixed full-viewport SVG that draws a
// curve from the guide box to the spotlighted control, with an arrowhead at the
// control. Decorative (aria-hidden — the popover copy carries the meaning) and
// pointer-events:none so it never blocks clicks. The "draw-on" animation +
// reduced-motion handling live in index.css (.guide-pointer-path). Hosted by
// GuideHud, lazy-loaded.
export default function GuidePointer({ pointer }) {
  if (!pointer || !pointer.box || !pointer.target) return null
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const { path, end, headDeg } = arrowPath(pointer.box, pointer.target, { width: vw, height: vh })
  // A small triangle arrowhead, rotated to the line's heading, positioned at end.
  const head = `${end.x},${end.y} ${end.x - 12},${end.y - 5} ${end.x - 12},${end.y + 5}`
  return (
    <svg className="guide-pointer" aria-hidden="true" width={vw} height={vh}
         viewBox={`0 0 ${vw} ${vh}`}>
      <path className="guide-pointer-path" d={path} fill="none" />
      <polygon className="guide-pointer-head" points={head}
               transform={`rotate(${headDeg} ${end.x} ${end.y})`} />
    </svg>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/guide/__tests__/GuidePointer.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit** (Milestone B).

---

## Task 5: `GuideHud.jsx` — render the arrow when `pointer` is set

**Files:**
- Modify: `src/components/guide/GuideHud.jsx`
- Test: `src/components/guide/__tests__/GuideHud.test.js` (extend)

- [ ] **Step 1: Write the failing test (append before the closing `})` of the describe)**

In `src/components/guide/__tests__/GuideHud.test.js`, add:

```js
  it('renders the lazy arrow when a pointer is set', async () => {
    await act(async () => { root.render(React.createElement(GuideHud)) })
    await act(async () => {
      setGuideState({ pointer: {
        box: { left: 400, top: 300, width: 200, height: 100 },
        target: { left: 460, top: 600, width: 80, height: 40 },
      } })
    })
    const svg = await waitForEl('svg.guide-pointer') // lazy GuidePointer chunk resolves
    expect(svg).toBeTruthy()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/guide/__tests__/GuideHud.test.js`
Expected: FAIL — no `svg.guide-pointer` (HUD doesn't render the arrow yet).

- [ ] **Step 3: Implement**

In `src/components/guide/GuideHud.jsx`, add the lazy import and render branch. Final file:

```jsx
import { useSyncExternalStore, lazy, Suspense } from 'react'
import { subscribeGuideState, getGuideState } from '../../lib/guide/guideState'
import FeedbackLive from '../FeedbackLive'

// Always mounted in Layout, cheap in the eager path: subscribes to the tiny
// guideState observable and renders null until needed. The dock-zone overlay
// (Phase 2) and the page-guide arrow (Phase 3) are both lazy-imported so their
// bytes only land when used; the controller + driver.js stay in their own lazy
// chunk. Announcements reuse the shared polite live region (FeedbackLive).
const GuideDockZones = lazy(() => import('./GuideDockZones'))
const GuidePointer = lazy(() => import('./GuidePointer'))

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
      {state.pointer && state.pointer.target && (
        <Suspense fallback={null}>
          <GuidePointer pointer={state.pointer} />
        </Suspense>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/guide/__tests__/GuideHud.test.js`
Expected: PASS (existing + new arrow test).

- [ ] **Step 5: Commit** (Milestone B).

---

## Task 6: `pageGuideRoutes.js` + `pageGuides.js` (Dashboard content) + `buildPageSteps`

**Files:**
- Create: `src/lib/guide/pageGuideRoutes.js`
- Create: `src/lib/guide/pageGuides.js`
- Test: `src/lib/guide/__tests__/pageGuides.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/lib/guide/__tests__/pageGuides.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { PAGE_GUIDES, buildPageSteps } from '../pageGuides'
import { PAGE_GUIDE_ROUTES } from '../pageGuideRoutes'
import { APP_ROUTES } from '../tourSteps'

const SELECTOR_RE = /^\[data-(tour|guide)="[a-z0-9-]+"\]$/

describe('pageGuides content', () => {
  it('every step has a non-empty title + body and a valid anchor selector', () => {
    for (const [route, steps] of Object.entries(PAGE_GUIDES)) {
      expect(Array.isArray(steps), route).toBe(true)
      for (const s of steps) {
        expect(s.title?.trim(), `${route} title`).toBeTruthy()
        expect(s.body?.trim(), `${route} body`).toBeTruthy()
        if (s.arrow !== 'none') expect(s.selector, `${route} selector`).toMatch(SELECTOR_RE)
      }
    }
  })

  it('all route keys are real app routes', () => {
    for (const route of Object.keys(PAGE_GUIDES)) expect(APP_ROUTES).toContain(route)
  })

  it('PAGE_GUIDE_ROUTES stays in sync with PAGE_GUIDES (eager seam cannot drift)', () => {
    expect([...PAGE_GUIDE_ROUTES].sort()).toEqual(Object.keys(PAGE_GUIDES).sort())
  })
})

describe('buildPageSteps', () => {
  it('stamps the given route on every step and maps to the engine shape', () => {
    const steps = buildPageSteps('/')
    expect(steps.length).toBeGreaterThan(0)
    for (const s of steps) {
      expect(s.route).toBe('/')
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('title')
      expect(s).toHaveProperty('body')
    }
  })

  it('returns [] for a route with no page guide', () => {
    expect(buildPageSteps('/nope')).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/pageGuides.test.js`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement the two data files**

Create `src/lib/guide/pageGuideRoutes.js`:

```js
// pageGuideRoutes.js — the tiny EAGER seam: just the route keys that have a Full
// Page Guide. The header ▶ ("Tour this page") imports ONLY this (zero deps) to
// decide its visibility, so the eager Layout never pulls the heavy lazy
// pageGuides.js content into the index chunk (same pattern as guideState.js).
// A unit test pins this list === Object.keys(PAGE_GUIDES) so it can't drift.
export const PAGE_GUIDE_ROUTES = ['/']
```

Create `src/lib/guide/pageGuides.js`:

```js
// pageGuides.js — Full Page Guide content (LAZY: loaded only when ▶ is tapped).
// PURE data + buildPageSteps. Structure (selectors/order) is hand-derived from
// the live page; prose is hand-authored + verified against the code (no AI,
// no confident-wrong — the load-bearing learning-tool rule). Anchors are
// [data-guide="{page}-{control}"] added to the page component (or a reused
// [data-tour="…"]). A missing anchor is skipped by the engine — never dead-ends.
//
// Step shape: { selector, title, body, example?, side?, align?, arrow? }
//   arrow:'none' → a centered intro/outro step with no pointer.

export const PAGE_GUIDES = {
  '/': [
    {
      arrow: 'none',
      title: 'Tour: your home base 🏠',
      body: 'A 30-second look at everything on your dashboard and what each part is for. Tap Next.',
    },
    {
      selector: '[data-tour="dashboard-cta"]',
      title: 'Smart Session',
      body: 'Your daily adaptive cycle — it drills exactly what you owe today, mixing recognition and production.',
      example: 'Tap it each morning: about 10 minutes clears your due cards.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-stats"]',
      title: 'Your deck at a glance',
      body: 'Due Now, Mastered and total Words. Tap any tile to jump straight into Study.',
      example: 'Due Now: 12 → tap it to clear them right now.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-quick-actions"]',
      title: 'Jump straight in',
      body: 'Shortcuts to Study, a mixed session, and roleplay speaking practice.',
      example: 'Tap Mix for one interleaved round of vocab + grammar + speaking.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-exam"]',
      title: 'Exam Rehearsal',
      body: 'A timed run across reading, writing and speaking that scores your overall Readiness %.',
      example: 'Do one a week and watch your readiness climb before the real paper.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-mistakes"]',
      title: 'Mistake Journal',
      body: 'Every slip is logged, and the important ones come back as targeted re-drills until you fix them.',
      example: 'Miss a “ber-” word twice and it queues a drill on exactly that.',
      side: 'bottom', align: 'center',
    },
  ],
}

// Map page content → the engine's step shape (tourSteps), stamping the route so
// the controller treats them as same-route steps (no navigation). Pure.
export function buildPageSteps(route) {
  const steps = PAGE_GUIDES[route]
  if (!Array.isArray(steps)) return []
  return steps.map((s, i) => ({
    id: `page-${route}-${i}`,
    route,
    title: s.title,
    body: s.body + (s.example ? `\n\n${s.example}` : ''),
    ...(s.selector ? { selector: s.selector } : {}),
    ...(s.side ? { side: s.side } : {}),
    ...(s.align ? { align: s.align } : {}),
  }))
}
```

> Note: `body` folds `example` in on its own line via `\n\n` (the engine step shape has no `example` field — the popover shows title + body). **driver.js renders the description via `innerHTML`**, so (a) the Task-8 CSS sets `white-space: pre-line` so the `\n\n` actually breaks, and (b) page-guide prose must be **plain text only — no raw `<`, `>`, or `&`** (it's hand-authored, so this is a content rule, not escaping). The arrow comes from the controller computing rects off the step's `selector` (Task 7).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/pageGuides.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit** (Milestone B).

---

## Task 7: `guideController.js` — emit the `pointer` rects for page-guide steps

**Files:**
- Modify: `src/lib/guide/guideController.js`
- Test: `src/lib/guide/__tests__/guideController.test.js` (extend)

- [ ] **Step 1: Write the failing test (append before the closing `})` of the describe)**

In `src/lib/guide/__tests__/guideController.test.js`, add a jsdom-backed test. **Add `// @vitest-environment jsdom` is NOT possible mid-file**, so this test guards on a real DOM by constructing the popover + target nodes; in the node env `document` exists only under jsdom — so instead assert the *non-DOM* contract: a non-page tour never emits a pointer. Add:

```js
  it('a non-page tour never sets guideState.pointer', async () => {
    const steps = [{ id: 'a', route: '/', selector: '[data-tour="a"]', title: 'A', body: 'a' }]
    const { factory, created } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ tier: 'quick' }), driverFactory: factory })
    await handle.ready
    created[0].calls.config.onPopoverRender({ wrapper: {} }, {}) // render a step
    expect(getGuideState().pointer).toBe(null)
  })

  it('exposes the tier on the handle so the page-guide branch is testable', async () => {
    const steps = [{ id: 'a', route: '/', title: 'A', body: 'a' }]
    const { factory } = driverHarness()
    const handle = startTour(steps, { ...baseOpts({ tier: 'page' }), driverFactory: factory })
    await handle.ready
    expect(handle.getTier()).toBe('page')
  })
```

> The full rAF + rect emission is exercised by the e2e (Task 10) in a real browser — node/jsdom has no layout, so `getBoundingClientRect` returns zeros and a unit assertion on real coordinates would be meaningless. The unit tests pin the *guards* (non-page → no pointer; tier exposed).

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/guide/__tests__/guideController.test.js`
Expected: FAIL — `handle.getTier is not a function`.

- [ ] **Step 3: Implement the pointer emission + tracking**

In `src/lib/guide/guideController.js`:

**(a)** Add `import { arrowPath } ...`? No — geometry runs in the React component. The controller only emits rects. Add near the drag block (after `function startDrag` / before `const config`):

```js
  // ── Page-guide arrow (Phase 3) ───────────────────────────────────────
  // Emits the box + target rects for the current step so GuideHud can draw the
  // animated arrow. Only active for tier:'page'. driver uses smoothScroll, so we
  // compute on rAF (after layout settles) and re-emit on scroll/resize so the
  // arrow tracks the element. All DOM-guarded (node tests have no window).
  let pointerCleanup = null
  const isPageGuide = () => tier === 'page'

  function rectLite(r) {
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }

  function emitPointer() {
    if (!isPageGuide()) return
    const pop = popoverEl()
    const step = list[active]
    if (!pop || !step || !step.selector) { setGuideState({ pointer: null }); return }
    const targetEl = document.querySelector(step.selector)
    if (!targetEl) { setGuideState({ pointer: null }); return }
    setGuideState({ pointer: { box: rectLite(pop.getBoundingClientRect()), target: rectLite(targetEl.getBoundingClientRect()) } })
  }

  function clearPointerTracking() {
    if (pointerCleanup) { pointerCleanup(); pointerCleanup = null }
  }

  function trackPointer() {
    if (!isPageGuide() || typeof window === 'undefined') return
    clearPointerTracking()
    const raf = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (cb) => setTimeout(cb, 16)
    raf(() => emitPointer())                 // after smoothScroll/layout settles
    const onMove = () => emitPointer()
    window.addEventListener('scroll', onMove, true) // capture: catch inner scrollers
    window.addEventListener('resize', onMove)
    pointerCleanup = () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }
```

**(b)** Call `trackPointer()` from the `onPopoverRender` wrapper (after `reapplyDock()`):

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
        onDock: keyboardDock,
        docked: dockedZone,
      })
      reapplyDock()
      trackPointer()
    },
```

**(c)** In `destroyDriver`, clear the tracking (add the line next to `if (dragCleanup) dragCleanup()`):

```js
  function destroyDriver() {
    if (torn) return
    torn = true
    if (dragCleanup) dragCleanup()
    clearPointerTracking()
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', onPopState)
    }
    try { driverObj && driverObj.destroy() } catch { /* idempotent */ }
    resetGuideState()
    if (_active === handle) _active = null
  }
```

**(d)** Expose `getTier` on the handle:

```js
  const handle = {
    destroy: teardownSilently, pause, resume, togglePause, jumpTo,
    dock, undock, getMode: () => mode, getDockState: () => dockedZone,
    getTier: () => tier,
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/guide/__tests__/guideController.test.js`
Expected: PASS (all Phase 1/2 + the 2 new guard tests).

- [ ] **Step 5: Commit** (Milestone C).

---

## Task 8: `useGuide.startPage` + header ▶ entry + CSS

**Files:**
- Modify: `src/hooks/useGuide.js`
- Modify: `src/components/Layout.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add `startPage` to the hook**

In `src/hooks/useGuide.js`, add a `startPage` callback (mirrors `start`) and return it. Insert after the existing `start` useCallback:

```js
  const startPage = useCallback(async (route) => {
    const path = route || location.pathname
    const [{ startTour }, { buildPageSteps }] = await Promise.all([
      import('../lib/guide/guideController'),
      import('../lib/guide/pageGuides'),
    ])
    const steps = buildPageSteps(path)
    if (!steps.length) return null
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return startTour(steps, {
      tier: 'page',
      navigate,
      onEvent: trackEvent,
      getPath: () => location.pathname,
      prefersReducedMotion,
      onPopoverRender: themePopover,
    })
  }, [navigate, location])
```

And change the return to include it:

```js
  return { start, stop, startPage }
```

- [ ] **Step 2: Add the header ▶ button to Layout**

In `src/components/Layout.jsx`: import the hook + route list + an icon, and render a ▶ button in the header that shows only on guided routes. Add imports near the top (with the other imports):

```js
import { useLocation } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useGuide } from '../hooks/useGuide'
import { PAGE_GUIDE_ROUTES } from '../lib/guide/pageGuideRoutes'
```

(If `useLocation` / `useGuide` are already imported, don't duplicate.) Inside the `Layout` component body, derive:

```js
  const location = useLocation()
  const { startPage } = useGuide()
  const hasPageGuide = PAGE_GUIDE_ROUTES.includes(location.pathname)
```

The header's right-side controls live in `<div className="absolute right-4 top-5 flex items-center gap-2">` (the cluster with the account/Save button + the round Search button, ~line 132). Add the ▶ as the **first child** of that div (so it sits left of Save/Search), styled round to match the Search button:

```jsx
<div className="absolute right-4 top-5 flex items-center gap-2">
  {hasPageGuide && (
    <button
      type="button"
      onClick={() => startPage(location.pathname)}
      aria-label="Tour this page — a guided walk through every control here"
      title="Tour this page"
      className="guide-page-btn"
    >
      <Play size={16} aria-hidden="true" />
    </button>
  )}
  {/* …existing account/Save button + Search button stay as-is… */}
```

- [ ] **Step 3: Add the CSS**

In `src/index.css`, after the Phase-2 dock block, add:

```css
/* ── In-app guide: Full Page Guide (Phase 3) ─────────────────────────
   Header ▶ "Tour this page" entry + the animated arrow. Token-driven; the
   draw-on animation is gated by reduced-motion. */
.guide-page-btn {
  width: 44px; height: 44px;                  /* matches the round Search button; WCAG 2.5.5 */
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 9999px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  color: var(--color-dim);
  cursor: pointer;
}
.guide-page-btn:hover, .guide-page-btn:focus-visible { color: var(--color-accent); }

/* Page-guide bodies fold in a concrete "example" on its own line. driver sets the
   popover description via innerHTML, which collapses newlines — so honor the \n
   with pre-line. Phase 1/2 single-line bodies are unaffected. */
.driver-popover.guide-theme .driver-popover-description { white-space: pre-line; }

.guide-pointer {
  position: fixed; inset: 0;
  pointer-events: none;                      /* never blocks clicks */
  z-index: 10001;                            /* above driver's overlay */
}
.guide-pointer-path {
  stroke: var(--color-accent);
  stroke-width: 3;
  stroke-linecap: round;
  fill: none;
  stroke-dasharray: 600;
  stroke-dashoffset: 0;
  animation: guide-pointer-draw 0.45s ease-out;
}
.guide-pointer-head { fill: var(--color-accent); }
@keyframes guide-pointer-draw {
  from { stroke-dashoffset: 600; }
  to   { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .guide-pointer-path { animation: none; }
}
```

- [ ] **Step 4: Build + verify wiring**

Run: `npm run build`
Expected: build succeeds. Confirm in the chunk list that `pageGuides`, `pointerGeometry`, `GuidePointer` are their OWN chunks (lazy) and `index` grew only by the tiny `pageGuideRoutes` + header button (a few hundred bytes — measure with the stash technique if unsure: build, note `index-*.js`, compare).

- [ ] **Step 5: Commit** (Milestone C).

---

## Task 9: Dashboard anchors (`data-guide`)

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add the anchors the Dashboard page guide points at**

Read `src/pages/Dashboard.jsx` and add `data-guide` attributes to these existing controls (the Smart Session CTA already has `data-tour="dashboard-cta"` — reuse it, no change). Match by the described control:

| Anchor to add | On which element (locate by) |
|---|---|
| `data-guide="dashboard-stats"` | the **stats tiles row** — the container wrapping the Due Now / Mastered / Words buttons (the `.map` that renders `data-tour={s.tour}` buttons; add the anchor to their shared wrapper element). |
| `data-guide="dashboard-quick-actions"` | the **quick-actions row** — the container wrapping the Study / Mix / Roleplay buttons (`onClick={() => setShowMixed(true)}` etc.). |
| `data-guide="dashboard-exam"` | the **Exam Rehearsal** button (`onClick={() => navigate('/exam-rehearsal')}`). |
| `data-guide="dashboard-mistakes"` | the **Mistakes** entry button (`onClick={() => navigate('/mistakes')}`). |

Example edit (stats wrapper):

```jsx
{/* before */}
<div className="grid grid-cols-3 gap-3">
{/* after */}
<div className="grid grid-cols-3 gap-3" data-guide="dashboard-stats">
```

> The Exam/Mistakes controls may render conditionally (e.g. only when mistakes exist). That's fine — the engine **skips a missing anchor**, so the guide degrades gracefully on a fresh account.

- [ ] **Step 2: Build (anchors are inert markup)**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit** (Milestone C).

---

## Task 10: e2e — Dashboard ▶ → arrow → Next

**Files:**
- Create: `tests/e2e/guide-full-page.spec.js`

- [ ] **Step 1: Write the test**

Create `tests/e2e/guide-full-page.spec.js`:

```js
import { test, expect } from '@playwright/test'

// Phase 3a — the header ▶ "Tour this page" starts a page-scoped deep dive on the
// Dashboard: the arrow appears pointing at the first spotlighted control, Next
// advances, and pausing (backdrop click) still works (no Phase 1/2 regression).

test('full page guide: ▶ on Dashboard shows the arrow and advances', async ({ page }) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: /Tour this page/i })
  await expect(start).toBeVisible()
  await start.click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Advance off the centered intro to the first anchored step → arrow draws.
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(page.locator('svg.guide-pointer')).toBeVisible()

  // Next still advances; pause (backdrop) still works (Phase 1 intact).
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(1)
})
```

- [ ] **Step 2: Run the e2e**

Run: `npm run test:e2e -- guide-full-page`
Expected: PASS. (If the intro step count differs, adjust the number of Next clicks to reach the first `arrow !== 'none'` step.)

- [ ] **Step 3: Commit** (Milestone D).

---

## Task 11: Docs + my review pass + final gate

**Files:**
- Modify: `README.md`, `RESUME_HERE.md`

- [ ] **Step 1: README** — add a bullet under the App-guide section:

```markdown
- **Tour this page (▶)** — on the Dashboard (more pages coming), tap the ▶ "Tour this page" button in the header for a deep dive: each control is spotlighted with an animated arrow and a plain-English "what it does + example". Uses the same Next/Back/Pause/drag controls as the main tour.
```

- [ ] **Step 2: RESUME_HERE.md** — add a "Phase 3a shipped" section mirroring the Phase 1/2 entries (commits, files, the deferred-to-3b items: in-popover ▶, Study/Practice content, optional auto-offer + STORE_VERSION).

- [ ] **Step 3: My own review pass** — read the final `guideController.js` pointer block + `GuidePointer.jsx` + `pageGuides.js` for: a stale scroll/resize listener after teardown (must be removed — verify `clearPointerTracking` runs in `destroyDriver`), an arrow that lingers after the guide closes (verify `resetGuideState` clears `pointer`), and any confident-wrong Dashboard prose (re-read each line against the live control). Fix findings.

- [ ] **Step 4: Final gate**

Run: `npm run build && npm run test:run && npm run lint`
Expected: build clean; all unit tests PASS (Phase 3a adds ~ pointerGeometry 5 + guideState 1 + GuidePointer 2 + GuideHud 1 + pageGuides 5 + controller 2 ≈ +16); lint 0 errors (only the 3 known warnings).

Run: `npm run test:e2e -- guide-full-page guide-drag-dock guide-pause-skip`
Expected: all guide e2e PASS (no Phase 1/2 regression).

- [ ] **Step 5: Commit** (Milestone D) — then confirm the `upg-` Vercel deploy reaches READY.

---

## Commit milestones (avoid prod-deploy-per-task churn)

Per the Phase-2 decision: keep per-task TDD (targeted red→green) but commit at ~4 logical milestones, each passing the full gate:
- **A — pure base:** Tasks 1–3 (route reconcile + pointerGeometry + guideState).
- **B — components/content:** Tasks 4–6 (GuidePointer + GuideHud + pageGuides/pageGuideRoutes).
- **C — wiring:** Tasks 7–9 (controller emit + entry/CSS + Dashboard anchors).
- **D — proof + docs:** Tasks 10–11 (e2e + README/RESUME + final gate).

---

## Self-Review (spec §6/§8 coverage)

| Spec requirement | Task |
|---|---|
| ▶ starts a page-scoped deep dive (current route, no nav) | 8 (`startPage` → `startTour({tier:'page'})`) + 6 (`buildPageSteps` stamps route) |
| Animated arrow box→control, reduced-motion, no click-block, aria-hidden | 2 (geometry) + 4 (`GuidePointer`) + 8 (CSS draw-on + reduced-motion) |
| Smooth-scroll timing fix (rAF + scroll/resize re-emit) | 7 (`trackPointer`) |
| Missing control skipped (never dead-end) | reused engine (`resolve` skip-missing); Dashboard conditional anchors noted (9) |
| Each step: what-it-does + example, hand-verified | 6 (Dashboard content; example folded into body) + 11 step 3 (re-verify) |
| Entry point = header ▶ (eager seam, no bundle bloat) | 6 (`pageGuideRoutes`) + 8 (Layout uses it) |
| ≥44px, keyboard-operable, announced | 8 (44px ▶, real `<button>`); arrow aria-hidden; popover copy carries meaning |
| Lazy bundle, tiny eager seam | 6 (`pageGuides` lazy, `pageGuideRoutes` eager) + 8 step 4 (measure) |
| Route reconcile 19→21 | 1 |
| Telemetry (route, no PII) | `tier:'page'` flows through existing `guide_started`/`guide_step` (carry `tier`); no new PII. (Optional `guide_page_started{route}` can be added in 3b.) |
| Theming dark+light | 8 (token-only colors) — visual check in Task 11 |
| Tests: pointerGeometry, pageGuides, guideState/HUD, controller guards, e2e | 2,3,4,5,6,7,10 |

**Placeholder scan:** none — every code step has complete source; the Dashboard-anchors task gives a locate-by table (anchors are placed against real, grep-verified controls).
**Type/name consistency:** `pointer:{box,target}` shape identical in guideState (3), GuidePointer (4), HUD (5), controller `rectLite`/`emitPointer` (7); `PAGE_GUIDE_ROUTES`/`PAGE_GUIDES`/`buildPageSteps` consistent across 6/8; `getTier` added in 7 and used in test (7).
**Deferred (flagged, not gaps):** in-popover ▶ → 3b; Study/Practice content → 3b/3c; auto-offer + `fullPageSeen` pref → later (STORE_VERSION bump).
