# Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 14 critical and important bugs across writing grader, store mutations, logic errors, and the XSS vulnerability.

**Architecture:** Pure in-place edits — no new files, no new dependencies. Each task is a surgical one-to-three line change or a targeted block replacement. Fixes are ordered from highest-impact first.

**Tech Stack:** React 19, Zustand 5, TypeScript (Edge function), Vite. No test framework — verify every task with `npm run build` (zero errors required).

---

### Task 1: Fix English essays always scoring content Band 2

**Files:**
- Modify: `src/lib/writingGrader.js:428-430`

`bandEnglishCriteria` compares `g.paras >= 3` where `g.paras` is an array. Array-to-number coercion produces `NaN`, so every comparison is false and `content` falls through to `2`. Every English essay is silently capped at Band 3 overall.

- [ ] **Step 1: Apply the fix**

In `src/lib/writingGrader.js`, find lines 428–430:
```js
  if (wlen >= minW * 1.1 && g.paras >= 3) content = 6
  else if (wlen >= minW && g.paras >= 3) content = 5
  else if (wlen >= minW * 0.8 && g.paras >= 2) content = 4
```
Replace with:
```js
  if (wlen >= minW * 1.1 && g.paras.length >= 3) content = 6
  else if (wlen >= minW && g.paras.length >= 3) content = 5
  else if (wlen >= minW * 0.8 && g.paras.length >= 2) content = 4
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/writingGrader.js
git commit -m "fix(writing): g.paras.length — English essays were always content Band 2"
```

---

### Task 2: Fix `aiAvailable` always being true in Roleplay

**Files:**
- Modify: `src/pages/Roleplay.jsx:57`

Operator precedence: `A && B || A` simplifies to `A`. The mock-mode check is completely swallowed, so `aiAvailable` equals `getRemainingCalls() > 0` — the banner always shows AI as available in production when any calls remain.

- [ ] **Step 1: Apply the fix**

In `src/pages/Roleplay.jsx`, find line 57:
```js
  const aiAvailable = getRemainingCalls() > 0 && import.meta.env.VITE_AI_MOCK === 'true' || getRemainingCalls() > 0
```
Replace with:
```js
  const aiAvailable = getRemainingCalls() > 0
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Roleplay.jsx
git commit -m "fix(roleplay): aiAvailable operator precedence — was always true"
```

---

### Task 3: Fix CONTRACTION_RE stale `lastIndex` across calls

**Files:**
- Modify: `src/lib/writingErrors.js:1291-1295`

`CONTRACTION_RE` is a module-level `/gi` regex used with `.exec()`. Its `lastIndex` persists between `findIssues` calls — the second call resumes from the old position, missing contractions at the start of text until the regex wraps around.

- [ ] **Step 1: Apply the fix**

In `src/lib/writingErrors.js`, find the `detectContractions` function (around line 1291):
```js
function detectContractions(text, formatId) {
  if (!formatId || !FORMAL_FORMATS.has(formatId)) return []
  const out = []
  let m
  while ((m = CONTRACTION_RE.exec(text)) !== null) {
```
Replace with:
```js
function detectContractions(text, formatId) {
  if (!formatId || !FORMAL_FORMATS.has(formatId)) return []
  CONTRACTION_RE.lastIndex = 0
  const out = []
  let m
  while ((m = CONTRACTION_RE.exec(text)) !== null) {
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/writingErrors.js
git commit -m "fix(writing): reset CONTRACTION_RE.lastIndex before each call"
```

---

### Task 4: Guard `topic.cues` in speakingGrader `aiGrade`

**Files:**
- Modify: `src/lib/speakingGrader.js:239`

`topic.cues.join('; ')` crashes with `TypeError` when `topic.cues` is undefined (English topics use a different schema). `heuristicGrade` already guards with `topic?.cues || []` — `aiGrade` must do the same.

- [ ] **Step 1: Apply the fix**

In `src/lib/speakingGrader.js`, find line 239:
```js
Suggested cues: ${topic.cues.join('; ')}
```
Replace with:
```js
Suggested cues: ${(topic.cues ?? []).join('; ')}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/speakingGrader.js
git commit -m "fix(speaking): guard topic.cues in aiGrade to prevent TypeError"
```

---

### Task 5: Fix interleaved session — comprehension cards overlap vocab slot

**Files:**
- Modify: `src/lib/interleave.js:21`

`comp` is built by filtering the entire `dueVocab` array, including cards already consumed by the `vocab` slot. The same card can appear in both slots in one session.

- [ ] **Step 1: Apply the fix**

In `src/lib/interleave.js`, find line 21:
```js
  const comp = shuffleArray(dueVocab.filter(c => c.ex && c.ex.length > 15)).slice(0, cTarget).map(item => ({ type: 'comprehension', item }))
```
Replace with:
```js
  const comp = shuffleArray(dueVocab.slice(vTarget).filter(c => c.ex && c.ex.length > 15)).slice(0, cTarget).map(item => ({ type: 'comprehension', item }))
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/interleave.js
git commit -m "fix(interleave): exclude vocab slot cards from comprehension candidates"
```

---

### Task 6: Fix inverted v11/v12 migration blocks in store

**Files:**
- Modify: `src/store/useStore.js:1555-1593`

The `version < 12` block runs before the `version < 11` block. This violates the sequential migration contract — any code in the v12 block that depends on v11's shape transformation having run first will silently corrupt data.

- [ ] **Step 1: Apply the fix**

In `src/store/useStore.js`, find and swap the two blocks so v11 appears before v12. Current order (around lines 1555–1593):

```js
        // Migrate to v12: exam rehearsal attempts.
        if (version < 12) {
          state = {
            ...state,
            examAttempts: state.examAttempts || [],
          };
        }

        // Migrate to v11: extend mistake records with category/severity/surface/etc.
        // Old records keep their type/word/source; new fields default sensibly.
        if (version < 11) {
          state = {
            ...state,
            mistakes: (state.mistakes || []).map(m => {
              if (!m) return m;
              const language = m.language || 'ms';
              const category = m.category || (m.type === 'vocab' ? 'vocab'
                : m.type === 'grammar' ? 'imbuhan'
                : m.type === 'comprehension' ? 'comprehension'
                : 'other');
              const severity = m.severity || 'med';
              const surface = m.surface || '';
              const dedupeKey = m._k || `${m.type}::${m.word || ''}::${hashString(surface)}::${language}`;
              return {
                ...m,
                language,
                category,
                severity,
                surface,
                correction: m.correction || '',
                note: m.note || '',
                promotedCardId: m.promotedCardId ?? null,
                attempts: m.attempts ?? 1,
                lastReviewedAt: m.lastReviewedAt ?? null,
                _k: dedupeKey,
              };
            }),
          };
        }
```

Replace the entire block with v11 first, then v12:

```js
        // Migrate to v11: extend mistake records with category/severity/surface/etc.
        // Old records keep their type/word/source; new fields default sensibly.
        if (version < 11) {
          state = {
            ...state,
            mistakes: (state.mistakes || []).map(m => {
              if (!m) return m;
              const language = m.language || 'ms';
              const category = m.category || (m.type === 'vocab' ? 'vocab'
                : m.type === 'grammar' ? 'imbuhan'
                : m.type === 'comprehension' ? 'comprehension'
                : 'other');
              const severity = m.severity || 'med';
              const surface = m.surface || '';
              const dedupeKey = m._k || `${m.type}::${m.word || ''}::${hashString(surface)}::${language}`;
              return {
                ...m,
                language,
                category,
                severity,
                surface,
                correction: m.correction || '',
                note: m.note || '',
                promotedCardId: m.promotedCardId ?? null,
                attempts: m.attempts ?? 1,
                lastReviewedAt: m.lastReviewedAt ?? null,
                _k: dedupeKey,
              };
            }),
          };
        }

        // Migrate to v12: exam rehearsal attempts.
        if (version < 12) {
          state = {
            ...state,
            examAttempts: state.examAttempts || [],
          };
        }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.js
git commit -m "fix(store): restore correct v11-before-v12 migration order"
```

---

### Task 7: Add missing `studentId` to v18 migration

**Files:**
- Modify: `src/store/useStore.js:1642-1651`

The v18 migration initializes `cognitiveProfile` without `studentId`. Any code reading `cognitiveProfile.studentId` gets `undefined` for all returning users.

- [ ] **Step 1: Apply the fix**

In `src/store/useStore.js`, find lines 1642–1651:
```js
        // Migrate to v18: Initialize cognitiveProfile for returning users to prevent agent crashes.
        if (version < 18) {
          state = {
            ...state,
            cognitiveProfile: state.cognitiveProfile || {
              masteredConcepts: [],
              learningConcepts: [],
              recentMistakes: []
            },
          };
        }
```
Replace with:
```js
        // Migrate to v18: Initialize cognitiveProfile for returning users to prevent agent crashes.
        if (version < 18) {
          state = {
            ...state,
            cognitiveProfile: {
              studentId: 'local_user',
              masteredConcepts: [],
              learningConcepts: [],
              recentMistakes: [],
              ...(state.cognitiveProfile || {}),
              studentId: state.cognitiveProfile?.studentId || 'local_user',
            },
          };
        }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.js
git commit -m "fix(store): add studentId to v18 cognitiveProfile migration"
```

---

### Task 8: Fix `reviewCardAction` bypassing `addMistake`

**Files:**
- Modify: `src/store/useStore.js:820-858`

The inline mistake object is missing `_k`, `language`, `category`, `severity`, `surface`, and other v11 fields. `getFixUpQueue` crashes with `TypeError: Cannot read properties of undefined (reading 'slice')` on these records. Fix: remove the inline push from `set()` and call `get().addMistake()` after.

- [ ] **Step 1: Apply the fix**

In `src/store/useStore.js`, find the entire `reviewCardAction` action (lines ~808–858). Replace the `set()` callback and the code after it:

Find this block inside the `set()` callback:
```js
          // Track mistakes for Again rating
          let mistakes = state.mistakes;
          if (rating === Rating.Again) {
            const card = state.cards.find(c => c.m === malay);
            if (card) {
              const now = Date.now();
              const isDuplicate = mistakes.some(m =>
                m.type === 'vocab' && m.word === card.m && (now - m.timestamp) < 86400000
              );
              if (!isDuplicate) {
                mistakes = [...mistakes, {
                  id: crypto.randomUUID(),
                  type: 'vocab',
                  source: 'study',
                  word: card.m,
                  correct: card.e,
                  given: '',
                  timestamp: now,
                  reviewed: false,
                }];
              }
            }
          }

          return {
            cards,
            mistakes,
```

Replace with (remove inline mistakes logic, return only cards):
```js
          return {
            cards,
```

Then add a variable before the `set()` call to capture the card for mistake logging, and call `addMistake` after `set()`. The full updated action looks like:

```js
      reviewCardAction: (malay, rating) => {
        get().ensureDailyChallenge();
        let cardToLog = null;
        set(state => {
          const today = new Date().toDateString();
          const isoDate = new Date().toISOString().split('T')[0];
          const cards = state.cards.map(c => {
            if (c.m !== malay) return c;
            const fsrsFields = reviewCard(c, rating);
            return { ...c, ...fsrsFields };
          });
          const prev = state.studyHistory[isoDate] || { reviews: 0, minutes: 0 };

          if (rating === Rating.Again) {
            cardToLog = state.cards.find(c => c.m === malay) || null;
          }

          return {
            cards,
            reviewedToday: state.lastStudyDate === today ? state.reviewedToday + 1 : 1,
            lastStudyDate: today,
            studyHistory: {
              ...state.studyHistory,
              [isoDate]: { ...prev, reviews: prev.reviews + 1 },
            },
          };
        });

        if (cardToLog) {
          get().addMistake({
            type: 'vocab',
            source: 'study',
            language: 'ms',
            category: 'vocab',
            severity: 'low',
            word: cardToLog.m,
            correct: cardToLog.e,
            given: '',
          });
        }

        get().enqueueSyncEventAction('card_reviewed', { malay, rating });
        get().updateChallengeProgress('review', 1);
      },
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.js
git commit -m "fix(store): reviewCardAction — use addMistake instead of inline push"
```

---

### Task 9: Fix `reviewGrammarDrill` bypassing `addMistake`

**Files:**
- Modify: `src/store/useStore.js:978-1008`

Same problem as Task 8 — inline mistake object missing all v11 fields including `_k`, causing crashes in `getFixUpQueue`.

- [ ] **Step 1: Apply the fix**

In `src/store/useStore.js`, find the `reviewGrammarDrill` action. Find this block inside the `set()` callback:
```js
          let mistakes = state.mistakes;
          if (!correct) {
            const now = Date.now();
            const isDuplicate = mistakes.some(m =>
              m.type === 'grammar' && m.word === drillId && (now - m.timestamp) < 86400000
            );
            if (!isDuplicate) {
              mistakes = [...mistakes, {
                id: crypto.randomUUID(),
                type: 'grammar',
                source: drillId.split('-')[0],
                word: drillId,
                correct: '',
                given: '',
                timestamp: now,
                reviewed: false,
              }];
            }
          }

          return {
            grammarCards: { ...state.grammarCards, [drillId]: cardState },
            mistakes,
          };
```

Replace with (remove inline push, return only grammarCards):
```js
          return {
            grammarCards: { ...state.grammarCards, [drillId]: cardState },
          };
```

Then call `addMistake` after the `set()`. The full updated section after the `set()` call:
```js
        if (!correct) {
          get().addMistake({
            type: 'grammar',
            source: drillId.split('-')[0],
            language: 'ms',
            category: 'imbuhan',
            severity: 'low',
            word: drillId,
            correct: '',
            given: '',
          });
        }

        get().enqueueSyncEventAction('grammar_reviewed', { drillId, correct });
        get().updateChallengeProgress('grammar', 1);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.js
git commit -m "fix(store): reviewGrammarDrill — use addMistake instead of inline push"
```

---

### Task 10: Move confetti `setTimeout` outside Zustand `set()` updater

**Files:**
- Modify: `src/store/useStore.js:915-928`

`setTimeout` inside a `set()` updater fires twice in React 19 StrictMode, causing confetti to animate twice per milestone. `milestoneReached` is already captured as a closure variable outside the `set()`.

- [ ] **Step 1: Apply the fix**

In `src/store/useStore.js`, find inside the `set()` callback:
```js
            setTimeout(() => fireConfetti(4000), 500);
          }
          return { streak, streakFreezes, streakFreezeLog };
        });

        get().enqueueSyncEventAction('streak_updated', { streak: get().streak.count });
```

Replace with (remove setTimeout from inside set(), add it after):
```js
          }
          return { streak, streakFreezes, streakFreezeLog };
        });

        if (milestoneReached) {
          setTimeout(() => fireConfetti(4000), 500);
        }
        get().enqueueSyncEventAction('streak_updated', { streak: get().streak.count });
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.js
git commit -m "fix(store): move confetti setTimeout outside set() updater"
```

---

### Task 11: Fix `addCards` sharing a single `createNewCardState()` across the batch

**Files:**
- Modify: `src/store/useStore.js:789-790`

All cards in an imported batch get the same `due` timestamp (the single call's result spread onto every card). Fix: call `createNewCardState()` once per card in the map.

- [ ] **Step 1: Apply the fix**

In `src/store/useStore.js`, find lines 789–790:
```js
          const fsrsState = createNewCardState();
          addedCards = unique.map(c => ({ ...c, ...fsrsState }));
```
Replace with:
```js
          addedCards = unique.map(c => ({ ...c, ...createNewCardState() }));
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useStore.js
git commit -m "fix(store): call createNewCardState() per card in addCards batch"
```

---

### Task 12: Fix `userInterests ?? []` selector allocation in three components

**Files:**
- Modify: `src/pages/Roleplay.jsx:21`
- Modify: `src/pages/Comprehension.jsx:43`
- Modify: `src/pages/Settings.jsx:52`

`useStore(s => s.userInterests ?? [])` allocates a new `[]` reference on every render when `userInterests` is undefined, breaking Zustand's shallow equality check and causing re-renders on every unrelated store mutation. Per CLAUDE.md: "Don't allocate inside selectors."

- [ ] **Step 1: Fix Roleplay.jsx**

Find line 21 in `src/pages/Roleplay.jsx`:
```js
  const userInterests = useStore(s => s.userInterests ?? [])
```
Replace with:
```js
  const userInterests = useStore(s => s.userInterests) ?? []
```

- [ ] **Step 2: Fix Comprehension.jsx**

Find line 43 in `src/pages/Comprehension.jsx`:
```js
  const userInterests = useStore(s => s.userInterests ?? [])
```
Replace with:
```js
  const userInterests = useStore(s => s.userInterests) ?? []
```

- [ ] **Step 3: Fix Settings.jsx**

Find line 52 in `src/pages/Settings.jsx`:
```js
  const userInterests = useStore(s => s.userInterests ?? [])
```
Replace with:
```js
  const userInterests = useStore(s => s.userInterests) ?? []
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Roleplay.jsx src/pages/Comprehension.jsx src/pages/Settings.jsx
git commit -m "fix(store): move ?? [] outside selector to prevent per-render allocation"
```

---

### Task 13: Fix XSS — escape HTML before `dangerouslySetInnerHTML` in CikguBot

**Files:**
- Modify: `src/pages/CikguBot.jsx:695-743`

`renderMessage` applies bold/code regex substitutions on raw AI text then passes it to `dangerouslySetInnerHTML`. A prompt-injected AI response containing `<script>` or `<img onerror=...>` executes in the browser. Fix: escape HTML entities in each line before applying markdown transformations.

- [ ] **Step 1: Apply the fix**

In `src/pages/CikguBot.jsx`, find the `renderMessage` function. Just above the `lines.map(...)` call (around line 697), insert an HTML escape helper and apply it to each line before the regex substitutions:

Find:
```js
  const lines = text.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Bold text
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
```

Replace with:
```js
  const lines = text.split('\n')

  const esc = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const safeLine = esc(line)
        // Bold text
        let formatted = safeLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
```

Then update the table cell renderer on line 722. Find:
```js
                  dangerouslySetInnerHTML={{ __html: cell.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
```
Replace with:
```js
                  dangerouslySetInnerHTML={{ __html: esc(cell.trim()).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
```

Also update the bullet point renderer. Find:
```js
          return <p key={i} className="pl-2" dangerouslySetInnerHTML={{ __html: '• ' + formatted.slice(2) }} />
```
This already uses `formatted` (which now starts from `safeLine`), so no change needed here.

- [ ] **Step 2: Verify the `line` variable references in the function are updated**

After the change, all `line` usages inside the map body that feed into `dangerouslySetInnerHTML` must use `safeLine` or `formatted` (which derives from `safeLine`). Check that the horizontal rule check and table row check that return early still use `line` (for structural checks), not `safeLine` — that's fine because those checks only test structure, not inject content.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CikguBot.jsx
git commit -m "fix(security): escape HTML in renderMessage before dangerouslySetInnerHTML"
```

---

### Task 14: Cap `maxTokens` in Edge function to prevent cost amplification

**Files:**
- Modify: `supabase/functions/ai-proxy/index.ts`

The Edge function accepts `payload.maxTokens` from the unauthenticated client request and passes it straight to the Claude API. An attacker can set it to the API maximum (8192+) to maximize per-request cost.

- [ ] **Step 1: Find the maxTokens line**

Search for `payload.maxTokens` in `supabase/functions/ai-proxy/index.ts`. It will look like:
```ts
const maxTokens = Number(payload.maxTokens) || DEFAULT_MAX_TOKENS;
```

Replace with:
```ts
const maxTokens = Math.min(Number(payload.maxTokens) || DEFAULT_MAX_TOKENS, 2048);
```

- [ ] **Step 2: Verify the file is valid TypeScript**

Run: `npm run build`
Expected: zero errors (Vite does not compile the Edge function, so this just confirms no import side-effects broke).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-proxy/index.ts
git commit -m "fix(security): cap maxTokens at 2048 in ai-proxy Edge function"
```

---

## Security items requiring infrastructure changes (out of scope for this plan)

These require deploying new server-side proxies or changing Supabase RLS policies and are tracked separately:

- **S2**: `VITE_DEEPL_KEY` and `VITE_GOOGLE_TRANSLATE_KEY` exposed in browser bundle — create Vercel/Supabase proxy functions.
- **S3**: Edge function deployed with `--no-verify-jwt` — remove flag, pass session JWT from client.
- **S4**: `telemetry_events` INSERT allows unauthenticated writes — change RLS to `WITH CHECK (auth.role() = 'authenticated')`.
- **S10**: Gemini Vercel proxy has no auth — add session JWT verification.
