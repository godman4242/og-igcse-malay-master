# React Quality & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix React hook violations, memory leaks, hardcoded colors, and accessibility issues across components and pages.

**Architecture:** In-place edits only. No new dependencies. Verify each task with `npm run build` (zero errors). No test framework configured — manual browser testing for behaviour changes.

**Tech Stack:** React 19, Zustand 5, Web Speech API, Tailwind CSS 4, CSS custom properties.

---

### Task 1: Fix `useState` used as side-effect initializer in RoleplayScorecard

**Files:**
- Modify: `src/components/RoleplayScorecard.jsx:2,17-96`

`useState(() => {...})` with a callback returning `undefined` is being abused as a `useEffect`. In React 19 StrictMode, `useState` lazy initializers are pure-computation contracts — side effects (history writes, mistake logging, confetti) belong in `useEffect`. StrictMode double-invokes the initializer in development, creating duplicate history/mistake records.

- [x] **Step 1: Add `useEffect` to the React import**

Find line 2 in `src/components/RoleplayScorecard.jsx`:
```js
import { useState } from 'react'
```
Replace with:
```js
import { useState, useEffect } from 'react'
```

- [x] **Step 2: Replace `useState` with `useEffect`**

Find lines 17 onwards — the `useState(() => {` block. It starts with:
```js
  // Save to history on first render
  useState(() => {
```
Replace `useState(() => {` with `useEffect(() => {`:
```js
  // Save to history on first render
  useEffect(() => {
```

Then find the closing of that block. It will end with a bare `})` with no second argument. Add `[]` as the dependency array:

Find (the closing of the useState call):
```js
  })
```
But this closing `})` must be the one for the `useState(() => {` block specifically. Add the dependency array:
```js
  }, [])
```

- [x] **Step 3: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 4: Commit**

```bash
git add src/components/RoleplayScorecard.jsx
git commit -m "fix(roleplay): useState->useEffect for history/mistake logging in RoleplayScorecard"
```

---

### Task 2: Fix `setTimeout` in render phase of `useStudySession`

**Files:**
- Modify: `src/hooks/useStudySession.js:72-74`

`setTimeout(() => setComebackDismissed(true), 0)` is called directly in the render body (not inside a `useEffect`). React 19 forbids side effects in render. The 0ms setTimeout creates a deferred render loop and fires twice in StrictMode.

- [x] **Step 1: Apply the fix**

In `src/hooks/useStudySession.js`, find lines 72–74:
```js
  if (comeback && !comebackDismissed && sessionStats.reviewed >= 5) {
    setTimeout(() => setComebackDismissed(true), 0)
  }
```
Replace with a `useEffect` — this must be inserted at the hook level (not conditional). Find the nearest `useEffect` or add after the existing `useMemo` calls:
```js
  useEffect(() => {
    if (comeback && !comebackDismissed && sessionStats.reviewed >= 5) {
      setComebackDismissed(true)
    }
  }, [comeback, comebackDismissed, sessionStats.reviewed])
```

Delete the old two-line `if` block entirely.

- [x] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 3: Commit**

```bash
git add src/hooks/useStudySession.js
git commit -m "fix(study): move comeback setTimeout from render to useEffect"
```

---

### Task 3: Fix Grammar.jsx — uncleared timeouts fire after unmount

**Files:**
- Modify: `src/pages/Grammar.jsx`

Every `checkDrill*` function schedules a `setTimeout` that calls state setters after 2–5 seconds. None are cleared on unmount. If the user navigates away mid-drill, the timer fires on the unmounted component.

- [x] **Step 1: Add a timer-cleanup ref**

In `src/pages/Grammar.jsx`, find the block of `useState` declarations at the top of the component (around lines 115–135). After the last `useState`, add:

```js
  const pendingTimers = useRef([])
  useEffect(() => () => pendingTimers.current.forEach(clearTimeout), [])
```

Make sure `useRef` and `useEffect` are imported. Find the React import line (likely `import { useState, useEffect, useMemo, useRef, useCallback } from 'react'` or similar) and ensure `useRef` is listed.

- [x] **Step 2: Replace all bare `setTimeout` calls in Grammar.jsx**

Search for every `setTimeout(` call in the file. Each one currently looks like:
```js
setTimeout(() => {
  ...
}, 2200)
```
Replace each one with:
```js
pendingTimers.current.push(setTimeout(() => {
  ...
}, 2200))
```

Do this for every `setTimeout` in the file (there will be approximately 7–10 — one in `checkDrill`, one in `checkDrillMCQ`, one in `checkSva`, one in `checkArticle`, one in `checkTense`, one in `checkError`, one in `checkTransform`).

- [x] **Step 3: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 4: Commit**

```bash
git add src/pages/Grammar.jsx
git commit -m "fix(grammar): clear all drill-check timeouts on component unmount"
```

---

### Task 4: Fix AbortController never aborted on Speaking page unmount

**Files:**
- Modify: `src/pages/Speaking.jsx`

`abortRef.current` is set when AI grading starts but `abort()` is never called on unmount. The fetch continues after navigation, then calls `setAi`/`setAiLoading` on an unmounted component.

- [x] **Step 1: Add the cleanup effect**

In `src/pages/Speaking.jsx`, find the block of `useEffect` calls (after the refs are declared around lines 50–60). Add:

```js
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])
```

- [x] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 3: Commit**

```bash
git add src/pages/Speaking.jsx
git commit -m "fix(speaking): abort in-flight AI grade request on unmount"
```

---

### Task 5: Fix MixedSession — dishonest `useMemo` deps and uncancelled timeout

**Files:**
- Modify: `src/components/MixedSession.jsx:30,108-117`

Two separate bugs in this file:
1. `useMemo(() => buildMixedSession(...), [])` uses `cards` and `grammarCards` inside but lists no deps. React warns about this (pre-existing lint warning per CLAUDE.md). The correct pattern for "compute once on mount" is `useState` with a lazy initializer.
2. `advance()` schedules a `setTimeout` that is never cancelled on unmount.

- [x] **Step 1: Fix the session initialization (useMemo → useState)**

Find line 30:
```js
  const session = useMemo(() => buildMixedSession({ cards, grammarCards }), [])
```
Replace with:
```js
  const [session] = useState(() => buildMixedSession({ cards, grammarCards }))
```

- [x] **Step 2: Add timer ref and cleanup**

In the component's state declarations area, after the existing `useState` calls, add:
```js
  const advanceTimer = useRef(null)
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])
```

- [x] **Step 3: Wrap the setTimeout in `advance()` with the ref**

Find the `advance` function body. It will contain something like:
```js
    setTimeout(() => {
```
Replace with:
```js
    advanceTimer.current = setTimeout(() => {
```

- [x] **Step 4: Remove `useMemo` import if it's no longer used**

Check the React import at the top of the file. If `useMemo` is no longer referenced anywhere in the file after Step 1, remove it from the import.

- [x] **Step 5: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 6: Commit**

```bash
git add src/components/MixedSession.jsx
git commit -m "fix(mixed-session): useState for session init, clear advance timeout on unmount"
```

---

### Task 6: Fix Grammar.jsx — cram mode shuffles deck on every card answer

**Files:**
- Modify: `src/pages/Grammar.jsx:95-100`

Six `useMemo` calls run `shuffle(drillSrc)` inside the factory when `cramMode` is true. `grammarCards` is in the dep array, and `reviewGrammarDrill` updates `grammarCards` on every answer — so the entire cram deck is reshuffled after each card answer, causing the current card to jump.

Fix: compute the shuffled order once when cram mode activates, not on every `grammarCards` change.

- [x] **Step 1: Add cram-deck state**

In `src/pages/Grammar.jsx`, near the other `useState` declarations, add six state entries for the cram-mode shuffled arrays (one per drill type):

```js
  const [cramImbuhan, setCramImbuhan] = useState(() => cramMode ? shuffle(drillSrc) : null)
  const [cramTense, setCramTense] = useState(() => cramMode ? shuffle(tenseSrc) : null)
  const [cramError, setCramError] = useState(() => cramMode ? shuffle(errorSrc) : null)
  const [cramTransform, setCramTransform] = useState(() => cramMode ? shuffle(transformSrc) : null)
  const [cramSva, setCramSva] = useState(() => cramMode ? shuffle(svaSrc) : null)
  const [cramArticles, setCramArticles] = useState(() => cramMode ? shuffle(articleSrc) : null)
```

- [x] **Step 2: Re-shuffle when cram mode is toggled on**

Add a `useEffect` that fires when `cramMode` changes to `true`:

```js
  useEffect(() => {
    if (cramMode) {
      setCramImbuhan(shuffle(drillSrc))
      setCramTense(shuffle(tenseSrc))
      setCramError(shuffle(errorSrc))
      setCramTransform(shuffle(transformSrc))
      setCramSva(shuffle(svaSrc))
      setCramArticles(shuffle(articleSrc))
    }
  }, [cramMode]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [x] **Step 3: Update the six `useMemo` calls to use the stable cram state**

Find lines 95–100:
```js
  const sortedImbuhan = useMemo(() => cramMode ? shuffle(drillSrc) : sortDrillsBySRS(drillSrc, grammarCards), [grammarCards, cramMode, drillSrc])
  const sortedTense = useMemo(() => cramMode ? shuffle(tenseSrc) : sortDrillsBySRS(tenseSrc, grammarCards), [grammarCards, cramMode, tenseSrc])
  const sortedError = useMemo(() => cramMode ? shuffle(errorSrc) : sortDrillsBySRS(errorSrc, grammarCards), [grammarCards, cramMode, errorSrc])
  const sortedTransform = useMemo(() => cramMode ? shuffle(transformSrc) : sortDrillsBySRS(transformSrc, grammarCards), [grammarCards, cramMode, transformSrc])
  const sortedSva = useMemo(() => cramMode ? shuffle(svaSrc) : sortDrillsBySRS(svaSrc, grammarCards), [grammarCards, cramMode, svaSrc])
  const sortedArticles = useMemo(() => cramMode ? shuffle(articleSrc) : sortDrillsBySRS(articleSrc, grammarCards), [grammarCards, cramMode, articleSrc])
```
Replace with:
```js
  const sortedImbuhan = useMemo(() => cramMode ? (cramImbuhan || shuffle(drillSrc)) : sortDrillsBySRS(drillSrc, grammarCards), [grammarCards, cramMode, cramImbuhan, drillSrc])
  const sortedTense = useMemo(() => cramMode ? (cramTense || shuffle(tenseSrc)) : sortDrillsBySRS(tenseSrc, grammarCards), [grammarCards, cramMode, cramTense, tenseSrc])
  const sortedError = useMemo(() => cramMode ? (cramError || shuffle(errorSrc)) : sortDrillsBySRS(errorSrc, grammarCards), [grammarCards, cramMode, cramError, errorSrc])
  const sortedTransform = useMemo(() => cramMode ? (cramTransform || shuffle(transformSrc)) : sortDrillsBySRS(transformSrc, grammarCards), [grammarCards, cramMode, cramTransform, transformSrc])
  const sortedSva = useMemo(() => cramMode ? (cramSva || shuffle(svaSrc)) : sortDrillsBySRS(svaSrc, grammarCards), [grammarCards, cramMode, cramSva, svaSrc])
  const sortedArticles = useMemo(() => cramMode ? (cramArticles || shuffle(articleSrc)) : sortDrillsBySRS(articleSrc, grammarCards), [grammarCards, cramMode, cramArticles, articleSrc])
```

- [x] **Step 4: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 5: Commit**

```bash
git add src/pages/Grammar.jsx
git commit -m "fix(grammar): stable cram deck — shuffle once on activation, not every card answer"
```

---

### Task 7: Fix stale `turn` closure in Roleplay `submitResponse`

**Files:**
- Modify: `src/pages/Roleplay.jsx:297-305`

`submitResponse` closes over `turn` from the enclosing render. The 2500ms timer reads the captured `turn` value. Rapid double-submit calls `setTurn(turn + 1)` twice with the same captured value, skipping a turn. Fix: use the functional updater form `setTurn(prev => prev + 1)`.

- [x] **Step 1: Apply the fix**

In `src/pages/Roleplay.jsx`, find lines 300–304:
```js
      if (turn >= scenario.turns.length - 1) {
        setComplete(true)
      } else {
        setTurn(turn + 1)
      }
```
Replace with:
```js
      setTurn(prev => {
        if (prev >= scenario.turns.length - 1) {
          setComplete(true)
          return prev
        }
        return prev + 1
      })
```

- [x] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 3: Commit**

```bash
git add src/pages/Roleplay.jsx
git commit -m "fix(roleplay): use functional setTurn to avoid stale closure in submitResponse"
```

---

### Task 8: Add `hasSpeechSynthesis()` guard to "Baca bersama" button

**Files:**
- Modify: `src/pages/Roleplay.jsx` (around line 502)

The "Baca bersama" button is always rendered. On browsers without speech synthesis (Firefox desktop, some Android WebViews), tapping it silently does nothing. CLAUDE.md requires `hasSpeechSynthesis()` to be checked before exposing speech features.

- [x] **Step 1: Apply the fix**

In `src/pages/Roleplay.jsx`, find the "Baca bersama" button block:
```js
          <button onClick={() => startReadAlong(currentTurn.examiner)}
            className="mt-2 text-xs flex items-center gap-1"
            style={{ color: 'var(--color-cyan)' }}
            aria-label="Read examiner prompt aloud with word highlighting">
            <Volume2 size={12} /> Baca bersama
          </button>
```
Wrap it with the synthesis check:
```js
          {hasSpeechSynthesis() && (
            <button onClick={() => startReadAlong(currentTurn.examiner)}
              className="mt-2 text-xs flex items-center gap-1"
              style={{ color: 'var(--color-cyan)' }}
              aria-label="Read examiner prompt aloud with word highlighting">
              <Volume2 size={12} /> Baca bersama
            </button>
          )}
```

Make sure `hasSpeechSynthesis` is imported from `'../lib/speech'` (it likely already is since `hasSpeechRecognition` is imported).

- [x] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 3: Commit**

```bash
git add src/pages/Roleplay.jsx
git commit -m "fix(roleplay): hide Baca bersama button when speech synthesis unavailable"
```

---

### Task 9: Fix hardcoded hex colors

**Files:**
- Modify: `src/pages/Dashboard.jsx:773`
- Modify: `src/components/Layout.jsx:192`
- Modify: `src/index.css`

CLAUDE.md: "Always use `var(--color-*)` for colors via inline `style` props. Never hardcode hex values." Two hardcoded values need CSS variable replacements.

- [x] **Step 1: Add `--color-green-mid` and `--color-accent-subtle` to `src/index.css`**

Open `src/index.css`. Find the `@theme` block that defines the other custom properties (it will contain `--color-bg`, `--color-accent`, etc.). Add these two new variables inside the dark-mode defaults (the root-level `@theme` or `:root` block):

```css
  --color-green-mid: rgba(0, 230, 118, 0.6);
  --color-accent-subtle: rgba(255, 77, 109, 0.1);
```

Then find the `.light` class override block and add corresponding light-mode values:
```css
  --color-green-mid: rgba(0, 180, 90, 0.6);
  --color-accent-subtle: rgba(255, 112, 141, 0.1);
```

- [x] **Step 2: Fix Dashboard.jsx**

Find line 773 in `src/pages/Dashboard.jsx`:
```js
    b >= 4 ? '#69f0ae' :
```
Replace with:
```js
    b >= 4 ? 'var(--color-green-mid)' :
```

- [x] **Step 3: Fix Layout.jsx**

Find line 192 in `src/components/Layout.jsx`:
```js
                      background: active ? 'rgba(255,77,109,0.1)' : 'var(--color-card)',
```
Replace with:
```js
                      background: active ? 'var(--color-accent-subtle)' : 'var(--color-card)',
```

- [x] **Step 4: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 5: Commit**

```bash
git add src/index.css src/pages/Dashboard.jsx src/components/Layout.jsx
git commit -m "fix(style): replace hardcoded hex colors with CSS custom properties"
```

---

### Task 10: Wrap `PWAUpdateToast` in its own `ErrorBoundary`

**Files:**
- Modify: `src/App.jsx`

`PWAUpdateToast` is rendered outside the existing `ErrorBoundary`. If `useRegisterSW` throws (e.g. in non-PWA environments or tests), it crashes the entire React tree, showing a blank page.

- [x] **Step 1: Apply the fix**

In `src/App.jsx`, find the `<PWAUpdateToast />` line (around line 76):
```jsx
  <PWAUpdateToast />
```
Wrap it:
```jsx
  <ErrorBoundary>
    <PWAUpdateToast />
  </ErrorBoundary>
```

Make sure `ErrorBoundary` is imported (it likely already is from `'./components/ErrorBoundary'`).

- [x] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "fix(app): wrap PWAUpdateToast in ErrorBoundary to prevent full tree crash"
```

---

### Task 11: Accessibility — nav buttons, SmartSession exit, and mic buttons

**Files:**
- Modify: `src/components/Layout.jsx:240-266`
- Modify: `src/components/interleaved/SmartSession.jsx:140-147`
- Modify: `src/components/PronunciationDrill.jsx:95`
- Modify: `src/components/RoleplaySession.jsx:430`

Four accessibility gaps: nav icons not `aria-hidden`, "More" button missing `aria-expanded`, SmartSession exit using `title` not `aria-label`, mic buttons missing `aria-pressed`.

- [x] **Step 1: Fix nav items in Layout.jsx**

In `src/components/Layout.jsx`, find the nav item buttons in the bottom nav (around lines 188–200). Each renders `<Icon size={20} ... />`. Add `aria-hidden={true}` to the Icon component:
```jsx
                    <Icon size={20} strokeWidth={active ? 2.5 : 1.5} aria-hidden={true} />
```

Find the "More" button (around line 252). It currently has no `aria-expanded`. Add it:
```jsx
                  aria-expanded={showMore}
                  aria-label="More navigation options"
```

- [x] **Step 2: Fix SmartSession exit button**

In `src/components/interleaved/SmartSession.jsx`, find the exit button (around lines 140–147):
```jsx
<button
  onClick={endSessionEarly}
  ...
  title="End session"
>
  <X size={14} />
</button>
```
Replace `title="End session"` with `aria-label="End session"` and add `aria-hidden={true}` to the `X` icon:
```jsx
<button
  onClick={endSessionEarly}
  ...
  aria-label="End session"
>
  <X size={14} aria-hidden={true} />
</button>
```

- [x] **Step 3: Fix mic button in PronunciationDrill.jsx**

In `src/components/PronunciationDrill.jsx`, find the record button (around line 95). Add `aria-pressed` and `aria-label`:
```jsx
  aria-pressed={listening}
  aria-label="Record pronunciation"
```

- [x] **Step 4: Fix mic button in RoleplaySession.jsx**

In `src/components/RoleplaySession.jsx`, find the voice record button (around line 430). Add:
```jsx
  aria-pressed={listening}
  aria-label="Record voice response"
```

- [x] **Step 5: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 6: Commit**

```bash
git add src/components/Layout.jsx src/components/interleaved/SmartSession.jsx src/components/PronunciationDrill.jsx src/components/RoleplaySession.jsx
git commit -m "fix(a11y): aria-hidden on icons, aria-expanded on More, aria-pressed on mic buttons"
```

---

### Task 12: Performance — memoize Dashboard expensive loops

**Files:**
- Modify: `src/pages/Dashboard.jsx:118-150`

`deckStats`, `weakTopics`, and `forecast` are computed in the component's render body on every render. Any store update (XP tick, streak update, card review in another tab) re-renders Dashboard and reruns these O(n×7) loops. For 400–500 card decks this causes jank on mobile.

- [x] **Step 1: Read the relevant section**

Open `src/pages/Dashboard.jsx` and read lines 118–150 to see the exact variable names and inputs to each computation.

- [x] **Step 2: Wrap each computation in `useMemo`**

For each derived variable (`deckStats`, `weakTopics`, `forecast`), identify which store values it reads. Wrap it:

```js
const deckStats = useMemo(() => {
  // ... existing computation ...
}, [cards])

const weakTopics = useMemo(() => {
  // ... existing computation ...
}, [cards])

const forecast = useMemo(() => {
  // ... existing computation ...
}, [cards, dailyGoal])
```

Make sure `useMemo` is imported from React.

- [x] **Step 3: Verify build**

Run: `npm run build`
Expected: zero errors.

- [x] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "perf(dashboard): memoize deckStats, weakTopics, forecast to prevent re-computation on every store update"
```
