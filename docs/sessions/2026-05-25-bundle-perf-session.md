# Session — 2026-05-25 — Bundle Perf Sprint + Two Small Features

> Read this if you're a fresh Claude (or human) picking up the IGCSE Malay
> Master project. It captures every commit shipped on 2026-05-25 in the
> evening session, the rationale behind each, the final bundle state, and
> the gotchas a new session needs to know to avoid re-introducing the
> things this session removed.

---

## 1. Status snapshot (end of session)

- **Branch / HEAD:** `main` at `66e89d1`
- **Build:** clean (`npm run build` zero errors)
- **Lint:** 0 errors, 3 pre-existing warnings (RoleplayScorecard, Comprehension, Roleplay — all `react-hooks/exhaustive-deps`). Do NOT introduce new ones.
- **Tests:** **168 / 168 passing** (`npm run test:run`). Same suite as upg's RESUME_HERE.md claims.
- **Working tree:** clean as of `66e89d1`.
- **Live site:** https://upg-igcse-malay-master.vercel.app (Vercel auto-deploys from `main`).
- **STORE_VERSION:** `19` (auth slice). Not bumped this session.

## 2. Commits shipped this session (newest first)

| Commit | Subject | Bundle Δ |
|---|---|---|
| `66e89d1` | `perf(bundle): drop react-helmet-async (-17KB, hits 420KB target)` | 440 → 422.7 KB |
| `6a6b3c2` | `build: opt-in bundle analyzer (rollup-plugin-visualizer)` *(also bundles the MistakeToast rewrite — see §5)* | 564 → 440 KB |
| `b75a07e` | `perf(store): lazy cloudSync + inline tiny sync helpers` | 568 → 564 KB |
| `5a8a48c` | `fix(pdf): swap drag semantics — left=sentence, right=words` | 0 |
| `e14c8f6` | `feat(word-families): click-to-expand modal + Plus/Minus toggle` | 0 |
| `2428eea` | `perf(bundle): split writingFormats + lazy MixedSession (-139KB)` | 707 → 568 KB |

## 3. Final bundle state

```
dist/assets/index-B5qASNw8.js              422.71 kB │ gzip: 135.57 kB   ← main
dist/assets/pdf-*.js                       330.07 kB │ gzip:  97.28 kB   ← pdfjs (only on /pdf-reader)
dist/assets/dist-CyvQv1Ru.js               183.87 kB │ gzip:  47.73 kB   ← @supabase/supabase-js (lazy, only on auth)
dist/assets/use-reduced-motion-*.js        120.63 kB │ gzip:  39.14 kB   ← framer-motion (lazy, only Study/Roleplay/SmartStudy)
dist/assets/Roleplay-*.js                   88.13 kB │ gzip:  25.86 kB
dist/assets/Writing-*.js                    81.32 kB │ gzip:  23.55 kB
dist/assets/writingGrader-*.js              76.99 kB │ gzip:  24.14 kB   ← created this session
dist/assets/CikguBot-*.js                   59.09 kB │ gzip:  20.20 kB
dist/assets/Grammar-*.js                    47.10 kB │ gzip:  12.96 kB
dist/assets/Settings-*.js                   39.13 kB │ gzip:  10.50 kB
... (smaller chunks)
```

**Cumulative reduction this session: 707 → 422.71 KB (−284 KB / −40%).** Gzipped: 224 → 136 KB (−88 KB / −39%).

CLAUDE.md target was 420 KB raw — we're 3 KB over, effectively at target. Pushing lower requires risky moves (slicing useStore.js, restructuring Dashboard's eager widgets).

## 4. What changed and WHY (for each commit)

### `2428eea` — Split writingFormats + lazy MixedSession
**Problem:** Dashboard and MistakeJournal imported `listFormats` from the 700-line `writingGrader.js`, dragging the entire grader (regex banks + `writingErrors.js` + `writingErrorsMalay.js`) into the main bundle. Also: `MixedSession.jsx` (399 lines) was eagerly imported by Dashboard even though it only mounts when the user clicks "Mixed Session".

**Fix:**
- New file `src/lib/writingFormats.js` holds just the `FORMATS` catalogue + `listFormats()`.
- `src/lib/writingGrader.js` re-exports them for back-compat (Writing.jsx unchanged).
- Dashboard + MistakeJournal updated to import from `writingFormats`.
- `MixedSession` wrapped in `React.lazy()` + `<Suspense>` inside Dashboard.

### `e14c8f6` — Word Families: click-to-expand modal + Plus/Minus toggle
**Two UX wins:**
1. Clicking any node in `WordFamilyTree.jsx` now opens a centred modal showing big `DictionaryIcon`, large word, meaning, imbuhan type, root, Speak + Add/Remove buttons. ESC + backdrop click close.
2. The corner Plus button was Add-only (turned to a Check once added but never offered removal). It's now a real toggle — clicking when already-added shows a confirm and removes the card from the `'Word Families'` deck.
3. The corner Volume2 speaker was previously the click target for the whole node; it's now its own button with `stopPropagation` so quick-speak still works without opening the modal.

Uses the existing `removeCard(malay, deck)` store action — no schema or `STORE_VERSION` change.

### `5a8a48c` — PDF reader drag swap
**Trivial 2-line fix in `src/lib/useSelectionMode.js`** — swaps which mouse button does what:
- Left-click drag → contiguous phrase (sentence)
- Right-click drag → list of individual words
- Single click → single word (unchanged)

PDFReader's tip footer updated to match. Hyphenated words like `jam-tangan` were already captured as one token by the existing `[\p{L}\p{M}'-]+` regex.

### `b75a07e` — Lazy cloudSync + inline sync helpers
**Problem:** `useStore.js` had top-level imports of `cloudSync.js` and `syncEngine.js`. Guest users never trigger sync but were paying the bytes.

**Fix:**
- `cloudSync.js` (214 lines) is now dynamic-imported inside the two actions that fire it: `hydrateCloudData()` and `flushSyncQueue()`.
- `syncEngine.js`'s two pure helpers (`createSyncEvent`, `enqueueSyncEvent` — 12 lines total) are inlined into useStore so the eager static import can be dropped, which also clears Rollup's `INEFFECTIVE_DYNAMIC_IMPORT` warning.
- `processSyncQueue` is dynamic-imported inside `flushSyncQueue` alongside `processCloudSyncEvent`.

**Savings were small (4 KB)** — turned out cloudSync compiled was much smaller than estimated. The lesson was: don't guess, measure.

### `6a6b3c2` — Bundle analyzer + MistakeToast rewrite (mis-bundled commit)
**Note on commit hygiene:** the commit message says "build: opt-in bundle analyzer" but the diff *also* includes the MistakeToast rewrite. I (the prior session) accidentally staged the file before realising and committed both together. The work itself is correct; only the history is slightly messy. Already pushed — leaving as-is rather than force-pushing main.

**What it actually contains:**
1. `rollup-plugin-visualizer` as devDependency.
2. Vite config gated behind `ANALYZE=true` env flag — writes `dist/stats.json` (raw-data template, gzip + brotli sizes).
3. **`src/components/MistakeToast.jsx` rewrite** — dropped framer-motion entirely. The toast had a single 200ms fade+translate transition, but because Layout (eagerly loaded) imports MistakeToast, framer-motion's `motion-dom` runtime (~190 KB renderedLength) was being pulled into the cold-load chunk. Replaced with plain CSS transitions and a `prefers-reduced-motion` media query check. Same UX: hydration baseline guard, `+N` stacking, 3 s auto-dismiss, theater-mode offset, Practice CTA, smooth exit before unmount.

**This single change delivered the −124 KB jump.**

### `66e89d1` — Drop react-helmet-async
**Final 17 KB win.** `react-helmet-async` was eagerly loaded just to render dynamic `<head>` tags from `<Meta>` (used on 6 pages). For an SPA, social crawlers (Facebook, WhatsApp, Twitter) don't run JS and only see `index.html`'s static `<head>` anyway — so Helmet was providing zero real SEO benefit. The only meaningful UX effect was updating the browser tab title.

**Fix:**
- `src/components/Meta.jsx` rewritten as 15 lines: `useEffect` sets `document.title` imperatively and updates the `<meta name="description">` tag.
- `src/main.jsx` removes the `<HelmetProvider>` wrapper.
- `npm uninstall react-helmet-async`.

**Follow-up (low priority, low risk):** if richer social previews are wanted, add OG/Twitter meta tags directly to `index.html` — they never functioned via Helmet on this SPA.

## 5. Bundle-perf lessons (DO NOT re-introduce)

These three patterns silently grew the eager bundle. Watch for them in PR review:

1. **Don't import `framer-motion` from any component eagerly loaded by `Layout`, `App`, or `Dashboard`.** The runtime is ~190 KB. Currently safe because Study, Roleplay, SmartStudy, and RoleplaySession are all behind lazy routes. If a future eager component (header, drawer, toast) wants animation, use CSS transitions instead — see `MistakeToast.jsx` for the pattern.
2. **Don't import the full `writingGrader.js` for just `listFormats`.** Use `src/lib/writingFormats.js` instead. The grader has heavy dependencies (regex banks, both writingErrors modules) that should only land in `Writing.jsx`'s chunk.
3. **Don't re-introduce `react-helmet-async`.** Use the imperative `<Meta>` component. If you need true SEO meta tags, edit `index.html`'s static `<head>`.

Additional rules from CLAUDE.md that still apply:
- New routes go in `App.jsx` as `lazy(() => import('./pages/X'))`, never eager.
- Store getter functions (`getStreak`, `getStudyPlan`) return new objects per call — never call them inside a selector. Extract the getter ref in one selector, then call it in the component body.

## 6. Codebase orientation (high-level map)

```
src/
├── App.jsx                    87 lines — Routes (15 lazy), AuthGuard, Layout
├── main.jsx                   16 lines — BrowserRouter, Analytics (no HelmetProvider as of 66e89d1)
├── pages/                     16 page components, one per route. Dashboard.jsx is eager (1022 lines); rest are lazy
├── components/                Shared UI. Layout.jsx + AuthGuard/AuthModal eager; rest situational
│   ├── writing/               6 sub-components used inside Writing.jsx
│   ├── study/                 9 mode components (FlashcardMode, QuizMode, ClozeMode, etc.) + SessionSummary
│   └── interleaved/           5 components used by SmartStudy's mixed-modality session
├── hooks/                     4 custom hooks: useStudySession, useWritingEvaluator, useInterleavedSession, useTheaterMode
├── contexts/                  TheaterModeContext + Provider — distraction-free overlay state
├── lib/                       33 leaf libraries (FSRS, graders, regex engines, translate, speech, sync...)
│   └── __tests__/            13 vitest files pinning the pure logic — 168 cases
├── data/                      Static catalogues (dictionary, scenarios, passages, exemplars, etc.)
├── store/useStore.js          1748 lines — single Zustand store, persisted under `igcse-malay-store`
└── config/supabase.js         Supabase client factory + auth helpers + JSONB state sync
api/                           Vercel serverless functions: gemini.js (AI proxy), translate.js (DeepL/Google proxy)
```

### Spaced repetition
**FSRS-4.5 via `ts-fsrs`** lives in `src/lib/fsrs.js`. The legacy `src/lib/sm2.js` exists for reference only — don't touch it. Cards are rated with `Rating.Again/Hard/Good/Easy`.

### AI three-tier fallback
1. **Expert system** (free, default) — `src/data/cikguKnowledge.js` with fuzzy keyword search.
2. **OpenRouter free models** — `src/lib/openrouter.js`, needs `VITE_OPENROUTER_KEY`.
3. **Gemini via Vercel proxy** — `src/lib/gemini.js` → `api/gemini.js` (JWT-protected, uses `GEMINI_KEY` server env).
4. **Supabase Edge Function** (Claude) — `src/lib/ai.js`, circuit breaker + 50 calls/day client-side rate limit.

Mock mode: `VITE_AI_MOCK=true` returns canned responses from `src/data/aiMocks.js`.

### Bilingual surfaces
Roleplay, Speaking, Grammar, Writing, Comprehension, Listening all toggle MS/EN. Don't break the lang toggles. See CLAUDE.md "Bilingual Awareness" guideline.

## 7. Known good / safe paths forward (in priority order)

1. **OG/Twitter tags in `index.html`** (5 min, zero risk) — make social previews actually work. Add the standard `<meta property="og:*">` block to the static head.
2. **Address the supabase.js `INEFFECTIVE_DYNAMIC_IMPORT` warning** — currently both lazy-imported (by ai.js, gemini.js, useStore) and eager-imported (by AuthGuard, AuthModal, AuthUnlock, Layout, AdminPanel). To benefit from the dynamic split, refactor the eager importers to defer their supabase usage. Medium risk — touches auth check on cold load.
3. **Audit Dashboard's eager widget imports** — currently `Dashboard.jsx` is 1022 lines and imports `patterns.js`, `writingFormats.js`, multiple components synchronously. Splitting the seldom-shown cards (e.g. `ExamReadinessCard`, `WeeklyHeatmap`) into a `<Suspense>` boundary could trim another 10–20 KB. Low–medium risk.
4. **Word Families search debounce** — currently filters on every keystroke. Tiny perf win, low impact.

## 8. Pitfalls / known footguns

- **`og igcse malay master/` is technically marked deprecated** in the top-level RESUME_HERE.md (the upg clone was supposed to be active). User chose to keep working here because the icon-generation pipeline and recent auth+security commits all landed here first. Both clones share the same GitHub remote (`godman4242/og-igcse-malay-master.git`). Don't confuse this with "the upg directory" — assume work happens in this folder until told otherwise.
- **Postinstall auto-push hook.** After `git commit`, the postinstall hook from `scripts/install-githooks.sh` auto-pushes to origin. This is why `git push` afterward often says "Everything up-to-date". Don't be surprised when fresh commits appear on the live site within seconds of committing.
- **`STORE_VERSION` bumps require a migration.** Add a case in `persist.migrate` that preserves existing data and defaults new fields. Current version is 19. If you bump it, also update the comment at line 13 of useStore.js and migrate handlers.
- **Dictionary icons:** 294 webp files in `public/dict-icons/` (FLUX1-schnell generated locally via mflux). Quality varies. Not critical but a future regeneration pass is on the backlog.
- **`writingGrader.js` retained 3 pre-existing lint warnings** about `RegExp` constructor with non-literal value + bracket-notation with user input. These are noise from a security linter — the bracket notation is bounded to small enums, and the RegExp builder is used at module load with hardcoded strings. Do not "fix" these by introducing real changes.

## 9. Where to find the previous session's notes

- `RESUME_HERE.md` (1628 lines) — long-form handoff covering everything up to and including the 2026-05-15 UDL/PWA wrap-up. Treat sections after §2 as historical.
- `MASTER_PLAN.md` — strategic 18-month vision. Phases 0–2 mostly done; phases 3–5 mostly aspirational.
- `docs/SUPABASE_SETUP_MASTER.md` — auth + sync setup, anti-hallucination protocol (always `npm run build`).
- `docs/priority/2026-04-13-*` — earlier priority planning docs, mostly historical context.
- `docs/sessions/` — this directory, new as of 2026-05-25. Add future session handoffs here.

## 10. Auto-memory state

Updated `~/.claude/projects/-Users-kheshav-Kheshav-kheshav-code-og-igcse-malay-master/memory/project_state_2026_05_25.md` in this same commit. The memory file is the per-Claude persistent context — refresh it any time the production state moves.
