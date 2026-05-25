# Session — 2026-05-25 (late night) — Perf cleanup: lint fix + MistakeJournal pagination + WordFamilies debounce

> Direct follow-on from the supabase-defer session
> (`docs/sessions/2026-05-25-supabase-defer-session.md`). Knocked out
> items #2, #5 and #6 from that handoff's queue in one tight pass.
> Three surgical diffs, no behaviour regressions, build/tests
> unchanged.

---

## 1. Status snapshot (end of session)

- **Branch / HEAD:** `main` at `640499e` at session start (the
  supabase-defer docs commit). New work is **uncommitted** in the
  working tree — see §7 for the copy-paste commit block.
- **Build:** clean (`npm run build` zero errors, no
  `INEFFECTIVE_DYNAMIC_IMPORT` warning). Main chunk `index-*.js` =
  **404.98 KB / gz 130.34 KB** (unchanged — these are render-time
  perf wins, no bundle delta).
- **Lint:** **0 errors** (down from 1), 3 pre-existing warnings.
- **Tests:** **168 / 168 passing**.
- **Working tree:** 3 files modified, 1 doc added (this file). User
  will commit manually — see §7.
- **STORE_VERSION:** `19` — unchanged. No persisted state touched.

## 2. Files changed this session

| File | Change | Why |
|---|---|---|
| `vite.config.js` | +1 line: `/* global process */` | Kills the pre-existing `'process' is not defined` lint error (since `6a6b3c2`). Surgical fix per handoff guidance. |
| `src/pages/MistakeJournal.jsx` | +13 / −2 lines: opt-in pagination | Caps DOM render at 50 mistakes. "Show N more" reveals the rest. Filter change resets the toggle. Store-side cap is 500 active + 2000 archived, but even 80 cards is heavy. |
| `src/pages/WordFamilies.jsx` | +5 / −2 lines: `useDeferredValue` on search | Keeps the input responsive while the 41-root × 210-form filter reruns. Zero bundle cost — pure React 19 runtime feature. |

## 3. What changed and WHY

### `vite.config.js` — `/* global process */`

Option 1 from the supabase-defer handoff. ESLint's `globals` config
doesn't currently allow-list Node globals for this file. One-line
fix; zero runtime impact. Migrating to `loadEnv` was the only other
option, but a config-function refactor was more diff than the win
warranted. Surgical wins.

### `src/pages/MistakeJournal.jsx` — opt-in pagination

The page renders every active (unreviewed) mistake. With the store
cap at 500 active mistakes and per-card DOM weight of ~15 nodes,
the worst case was a 7,500-node tree. Even at 80 active mistakes
the page felt sluggish on mobile.

New behaviour:
- `VISIBLE_LIMIT = 50` slice of the filtered list.
- `showAll` boolean flips the slice to the full list.
- "Show N more" pill at the bottom appears when `hiddenCount > 0`.
- Filter pill change resets `showAll` to `false` so switching
  categories doesn't accidentally re-render 500 cards.

Trade-off: clicking "Show N more" reveals all remaining at once, no
chunked load-more. For the realistic case (most users <100 active
mistakes, power users <500) this is fine. If usage data later shows
power users routinely hitting "Show all" and tanking perf, swap to
chunked pagination or react-virtuoso.

### `src/pages/WordFamilies.jsx` — `useDeferredValue` on search

The search box drives a `useMemo` that filters 41 roots × up to 10
form-includes operations each — ~400 string ops per keystroke. Not
crippling on its own, but the resulting list re-renders 41 root
buttons (with style + className computation), and that's what made
typing feel laggy.

`useDeferredValue` is the React-19-idiomatic fix: it tells React to
keep the input field responsive (high priority) and rerun the
expensive filter+render at low priority. Zero deps, zero bundle
cost (it's already in `react`), no debounce timeouts to manage.

The conditional `!search` panel hide stays on the live value so the
"Related to Your Mistakes" panel disappears instantly when typing
starts — that's intentional UX.

## 4. What's still open (next-session priority queue)

1. ~~Word Families search debounce~~ ✅ shipped (this session).
2. ~~Mistake journal pagination~~ ✅ shipped (this session).
3. ~~`vite.config.js` no-undef on `process`~~ ✅ shipped (this session).
4. **`useStore.js` split into modules** (high risk) — 1748 lines, big
   remaining perf lever. Touches persisted state; any slice
   extraction must preserve the `igcse-malay-store` schema or it'll
   wipe user progress. Only do this if the user explicitly asks.
5. **MistakeJournal "Show all" perf for cap-hitters** — defer until
   real users actually complain. Easy upgrade path: react-virtuoso
   or chunk load-more.
6. **Master Plan phases 3–5** — adaptive scaffolding tuning,
   framer-motion polish (in lazy chunks only), deeper feedback loops.
7. **Icon quality regeneration** — better prompts for the 294
   mflux-generated dictionary icons.

## 5. Rules still in force (unchanged)

- Do NOT re-introduce `framer-motion` in any cold-load component
  (Layout / Dashboard / AuthGuard). Use CSS transitions; `MistakeToast.jsx`
  is the reference.
- Do NOT import the full `writingGrader.js` for just `listFormats`.
  Import from `src/lib/writingFormats.js` instead.
- Do NOT re-introduce `react-helmet-async`.
- Do NOT consolidate the `supabaseConfig.js` shim back into
  `supabase.js` — that re-creates the `INEFFECTIVE_DYNAMIC_IMPORT`
  warning instantly.
- **Do NOT auto-commit on this machine.** User's 8 GB RAM Mac
  crashes when `git add` + postinstall auto-push fire in the same
  flow. Always hand the user a copy-paste block (see §7).
- `git status` before every `git add`. Surgical diffs only.

## 6. Where to find more context

- `docs/sessions/2026-05-25-supabase-defer-session.md` — the
  immediately-prior handoff (auth-cold-load refactor).
- `docs/sessions/2026-05-25-tactical-followups-session.md` — the
  session before that (Dashboard widget lazy-loading).
- `docs/sessions/2026-05-25-bundle-perf-session.md` — full
  bundle-perf orientation.
- `RESUME_HERE.md` — banner now points here.
- `CLAUDE.md` — repo-wide conventions.

---

## 7. Copy-paste commit block

User to run manually. Each commit is independent and tightly
scoped — if any one diverges from intent, drop it from the
sequence.

```bash
# Verify only the expected files changed
git status

# 1) Lint fix
git add vite.config.js
git commit -m "fix(lint): silence vite.config.js process no-undef

Adds /* global process */ at the top of vite.config.js so ESLint
stops flagging the env-var reads on line 11+. Pre-existing error
since 6a6b3c2. Pure lint cleanup — no runtime effect.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

# 2) Mistake Journal pagination
git add src/pages/MistakeJournal.jsx
git commit -m "perf(mistakes): paginate journal at 50, opt-in show all

Renders at most 50 active mistakes by default with a 'Show N more'
button to reveal the rest. Filter pill change resets the toggle so
switching categories doesn't accidentally render the full 500-cap
list. Store cap untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

# 3) Word Families search debounce
git add src/pages/WordFamilies.jsx
git commit -m "perf(word-families): defer search filter via useDeferredValue

Routes the search input through React 19's useDeferredValue so the
text field stays responsive while the 41-root x 210-form filter
re-runs at low priority. Zero bundle cost (already in react).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

# 4) Session handoff + RESUME_HERE banner + memory note
git add docs/sessions/2026-05-25-perf-cleanup-session.md RESUME_HERE.md
git commit -m "docs: add 2026-05-25 perf-cleanup session handoff

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

# Confirm the result
git log --oneline -6
git status
npm run build 2>&1 | tail -3
npm run test:run 2>&1 | tail -3
```

## 8. Next-session prompt (paste into a fresh Claude session)

> You are continuing the IGCSE Malay Master project (React 19 SPA,
> Vite 8, Zustand 5, Tailwind 4). Working dir is
> `/Users/kheshav/Kheshav/kheshav code/og igcse malay master`.
> Live site is https://upg-igcse-malay-master.vercel.app and Vercel
> auto-deploys every push to `main`.
>
> ### Mindset
>
> Do your best. Aim for the perfect result. Keep iterating until
> nothing more can be improved. Don't ship the first thing that
> works — ship the cleanest thing that works.
>
> ### Step 1 — Verify state
>
> Read these in order:
> 1. `docs/sessions/2026-05-25-perf-cleanup-session.md` (this doc).
> 2. `docs/sessions/2026-05-25-supabase-defer-session.md` (only if
>    you need extra orientation).
> 3. `CLAUDE.md`.
>
> Then run, in parallel:
>
> ```
> git log --oneline -6
> npm run build 2>&1 | tail -8
> npm run test:run 2>&1 | tail -5
> npm run lint 2>&1 | tail -8
> ```
>
> Expected: HEAD is the docs commit; the three perf commits land
> just before it. Build emits `index-*.js` ≈ 404.98 KB with **zero
> warnings**. Vitest reports 168 passed. Lint reports **0 errors**
> and only the 3 pre-existing warnings (RoleplayScorecard,
> Comprehension, Roleplay).
>
> ### Step 2 — Pick the next item from §4
>
> Recommended order:
> - **Master Plan phase 3 (Adaptive Scaffolding)** — tune AI
>   evaluators to drop cognitive load when a student struggles.
>   Surgical: probably 1-2 prompt revisions in `ai.js` /
>   `openrouter.js` + a confidence threshold lookup.
> - **`useStore.js` split** (HIGH RISK) — only if user explicitly
>   asks. Touching persisted state can wipe user progress. Plan
>   schema migration up front.
> - **Icon quality regeneration** — 294 mflux-generated dictionary
>   icons need better prompts.
>
> ### Hard rules (unchanged)
>
> - **DO NOT auto-commit.** User has 8 GB RAM and the
>   git+postinstall flow crashes the machine. Always end the
>   session with a copy-paste block for the user to run manually.
> - Surgical diffs only. No full-file rewrites for small changes.
> - After any behaviour change, write a new handoff doc at
>   `docs/sessions/YYYY-MM-DD-<topic>-session.md` and update
>   RESUME_HERE.md's banner to point at it.
> - Update the auto-memory file at
>   `~/.claude/projects/-Users-kheshav-Kheshav-kheshav-code-og-igcse-malay-master/memory/project_state_2026_05_25.md`.
>
> ### Do NOT re-introduce (history explains why)
>
> 1. `framer-motion` in any component reachable from
>    `Layout / Dashboard / AuthGuard` on cold load.
> 2. The full `writingGrader.js` when you only need `listFormats`.
> 3. `react-helmet-async`.
> 4. Static imports of `../config/supabase` in any of the eleven
>    refactored files. Use `../config/supabaseConfig` for
>    `SUPABASE_CONFIG`; dynamic-import the rest at the call site.
>
> ### Working style
>
> Tight responses. State decisions directly; one short sentence
> before tool calls. End-of-turn summary: 1–2 sentences.
