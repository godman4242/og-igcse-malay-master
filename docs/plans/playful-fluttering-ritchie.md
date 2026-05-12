# Learning Science Improvements — Sequential Implementation Plan

## Context
The IGCSE Malay Master app has strong learning mechanics (FSRS, interleaving, elaborative feedback, adaptive variants) but session-end experiences are purely statistical — they tell students *what happened* but not *what to do next*. A comprehensive learning science audit identified 5 remaining high-impact gaps. This plan implements them one by one.

## Improvement 1: Smart Session-End Recommendations (HIGH impact)

**Problem:** Study.jsx and MixedSession.jsx session summaries show accuracy/counts but zero actionable next steps. Students finish a session and don't know what to do next.

**Solution:** Create a `src/lib/recommendations.js` utility that takes session results + store state and returns 2-3 prioritized, specific recommendations with action buttons.

### Files to modify:
- **Create:** `src/lib/recommendations.js` — pure function: `getSessionRecommendations(sessionData, storeState) → Recommendation[]`
- **Modify:** `src/pages/Study.jsx` (lines 260-303) — add recommendation cards below stats grid
- **Modify:** `src/components/MixedSession.jsx` (lines 53-92) — add recommendation cards below breakdown
- **Modify:** `src/lib/interleave.js` — export `getMixedSessionSummary` enhancement to include wrong items list

### Recommendation logic (in `recommendations.js`):
1. **Low accuracy (<60%)** → "Review your mistakes" — link to Mistakes page
2. **Weak grammar patterns** → "Practice {pattern} drills" — uses `clusterMistakes()` from patterns.js
3. **Due grammar drills** → "You have {N} grammar drills due" — uses `getDueGrammarDrills()`
4. **Roleplay practice gap** → "Try a roleplay scenario" — if no recent roleplay in `ai.roleplayHistory`
5. **Topic weakness** → "Focus on {topic}" — from `getStudyPlan().focusTopic`
6. **High accuracy (>85%)** → "Great work! Add new cards" or "Try speaking mode"
7. **All caught up** → "Try a mixed session" or "Challenge: grammar drills"

Each recommendation: `{ icon, title, subtitle, action: 'navigate' | 'mode', target: '/path' | 'mode-name', priority: 1-10 }`

### UI: Compact recommendation cards
- Below stats grid, above action buttons
- Each card: icon + title + subtitle + arrow
- Max 3 shown, sorted by priority
- React Router `useNavigate()` for navigation actions

### Data needed from Study.jsx session:
- `sessionStats` (reviewed, correct, wrong)
- `accuracy` (computed)
- Current `activeDeck`
- Access to store state via `useStore.getState()`

### Data needed from MixedSession.jsx:
- `summary` object (total, correct, accuracy, byType, weakest)
- Store state via `useStore.getState()`

---

## Improvement 2: Warm-Up Phase (HIGH impact, LOW effort)

**Problem:** Sessions jump straight to hard/due cards. Learning science shows 2-3 easy cards first reduces anxiety and primes recall.

**Solution:** In `src/lib/fsrs.js`, modify `sortByPriority` to put 2-3 high-stability mature cards at the front of the queue before the normal priority sort.

### Files to modify:
- **Modify:** `src/lib/fsrs.js` — add `sortWithWarmup(cards, count=3)` wrapper around `sortByPriority`
- **Modify:** `src/pages/Study.jsx` — use `sortWithWarmup` instead of `sortByPriority`

---

## Improvement 3: Production Practice Integration (HIGH impact)

**Problem:** Writing exercises and vocab study are disconnected. Students don't practice producing Malay from scratch enough.

**Solution:** After Study sessions, if accuracy is high, recommend a "produce" challenge that asks students to write sentences using recent vocab.

### Files to modify:
- **Modify:** `src/lib/recommendations.js` — add production practice recommendation
- **Modify:** `src/pages/Study.jsx` — track which words were reviewed in session for sentence prompts

---

## Improvement 4: Personalized Daily Study Plan (MEDIUM-HIGH)

**Problem:** Dashboard's `getStudyPlan()` only shows exam-phase recommendations. Students without exam dates get nothing. Daily guidance should be universal.

**Solution:** New `getDailyPlan()` store getter that works for all users — not just those with exam dates.

### Files to modify:
- **Modify:** `src/store/useStore.js` — add `getDailyPlan()` getter
- **Modify:** `src/pages/Dashboard.jsx` — replace/augment study plan card with daily plan

---

## Improvement 5: Memory Stability Visualization (MEDIUM)

**Problem:** Students can't see their forgetting curves. Visualizing memory strength motivates review.

**Solution:** Small stability badge on cards during study showing "Memory: Strong/Good/Weak/New".

### Files to modify:
- **Modify:** `src/pages/Study.jsx` — add stability indicator badge

---

## Implementation Order
Execute improvements 1-5 sequentially, verifying `npm run build` after each.

## Verification
After each improvement:
1. `npm run build` — zero errors
2. Dev server: visit affected routes, verify new UI renders
3. Complete a study session → verify recommendations appear
4. Complete a mixed session → verify recommendations appear
5. No console errors or infinite re-render loops
