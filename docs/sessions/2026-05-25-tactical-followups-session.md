# Session — 2026-05-25 (late evening) — Tactical Follow-ups

> Session continuing immediately after the bundle-perf sprint
> (`docs/sessions/2026-05-25-bundle-perf-session.md`). Two low-risk wins
> + one medium-risk perf refactor shipped. The auth-cold-load supabase
> refactor (item 3b in the prior queue) is the highest-priority remaining
> item — see §7 for the next-session prompt.

---

## 1. Status snapshot (end of session)

- **Branch / HEAD:** `main` at `0e06dcb` (3-commit beyond the
  bundle-perf handoff at `05dcbb3`).
- **Build:** clean (`npm run build` zero errors). Main chunk `index-*.js`
  = **408.84 KB / gz 131.58 KB** (was 422.71 / 135.57 — Dashboard widget
  extraction shipped the second-to-last commit).
- **Lint:** 1 pre-existing **error** in `vite.config.js`
  (`'process' is not defined` on line 11 — the `ANALYZE` env check
  introduced in `6a6b3c2`; predates this session and stays out of scope
  here). 3 pre-existing warnings (RoleplayScorecard, Comprehension,
  Roleplay — all `react-hooks/exhaustive-deps`). The bundle-perf handoff
  said "0 errors" — that was inaccurate; the error has been latent since
  `6a6b3c2`.
- **Tests:** **168 / 168 passing** (`npm run test:run`).
- **Working tree:** clean.
- **Live site:** auto-deployed via Vercel within seconds of each push.
- **STORE_VERSION:** `19` — unchanged.

## 2. Commits shipped this session (newest first)

| Commit | Subject | Bundle Δ |
|---|---|---|
| `0e06dcb` | `perf(dashboard): lazy-load 3 conditional widgets (-14KB)` | 422.71 → 408.84 KB |
| `d08affd` | `docs: add 2026-05-25 tactical-followups session handoff` *(this doc, first revision)* | 0 |
| `efca3b9` | `feat(seo): static OG + Twitter meta tags in index.html` | 0 |
| `b9597c3` | `fix(sync): handle dynamic-import failure in flushSyncQueue` | 0 |

Several commits were also co-staged with a routine
`.claude/settings.local.json` permission update from the harness —
consistent with that file's tracked history; not worth force-pushing
to fix.

## 3. What changed and WHY

### `b9597c3` — flushSyncQueue try/catch
**Problem.** `src/store/useStore.js` `flushSyncQueue` did

```js
const [{ processSyncQueue }, { processCloudSyncEvent }] = await Promise.all([
  import('../lib/syncEngine'),
  import('../lib/cloudSync'),
]);
```

…with no `try/catch`. If a chunk load failed (user offline, CDN hiccup,
ad-blocker eating the request), `syncStatus` stayed pinned at `'syncing'`
forever — visible in the header sync-state pill — and an unhandled
rejection bubbled up. The matching `hydrateCloudData` action ~400 lines
below already had the right pattern, so this was pure parity.

**Fix.** Wrapped the dynamic imports + `processSyncQueue` call + the
result `set(...)` + the success/failure `trackEvent` block in `try/catch`.
On catch: set `syncStatus='error'`, `lastError=err?.message ?? 'sync_failed'`,
fire `trackEvent('sync_flush_failed', { error })`, return `false`.

Found by `/code-review` on the prior session — the only correctness bug
the reviewer surfaced.

### `efca3b9` — Static OG + Twitter meta tags
**Problem.** Social crawlers (Facebook, WhatsApp, Twitter, LinkedIn,
Discord, Slack) don't execute JavaScript — they only parse the static
`<head>` of `index.html`. The prior session dropped `react-helmet-async`
because of this exact reason, but never followed up to add the static
tags. So shared links rendered with no title/description/image.

**Fix.** Added 10 meta tags in `index.html` immediately before `<title>`:
- `og:type`, `og:url`, `og:title`, `og:description`, `og:site_name`,
  `og:image`
- `twitter:card` = `summary_large_image`, `twitter:title`,
  `twitter:description`, `twitter:image`

Image points at the existing `/icon-512.png` (the PWA icon). After
deploy, validate with:
https://www.opengraph.xyz/url/https%3A%2F%2Fupg-igcse-malay-master.vercel.app%2F

Zero JS impact; the change is entirely static HTML.

### `0e06dcb` — Dashboard widget extraction
**Problem.** `Dashboard.jsx` was 1022 lines and eagerly imported. Three
conditionally-rendered widgets at the bottom of the file — each gated by
a feature usage check — were forcing their JSX bodies + the
`weakestWritingFormats / weakestSpeakingTopics` helpers from
`patterns.js` and `listFormats` from `writingFormats.js` into the
cold-load chunk for users who'd never trigger them (no writing/speaking
history, no 30-day activity, no low-band session).

**Fix.** Extracted three components into `src/components/dashboard/`:

- `RecentPerformance.jsx` (~95 lines) — gated by writing OR speaking
  history present. Imports `weakestWritingFormats`,
  `weakestSpeakingTopics`, `listFormats`, `Trophy/FileText/Mic` lucide
  icons.
- `ProgressSparkline.jsx` (~82 lines, includes `Legend` helper) — gated
  by rolling activity having any band or review entry. Imports
  `TrendingUp` lucide icon and `memo`.
- `WorstTurnWidget.jsx` (~37 lines) — gated by `worstSpeakingSession`
  returning a session. Imports `Mic/ArrowRight` lucide icons and `memo`.

Each gets `React.lazy()` + `<Suspense>` in `Dashboard.jsx`, with a
height-matched `WidgetSkeleton` fallback (170 / 180 / 150 px) to avoid
CLS during chunk load. Dashboard.jsx shrunk from 1022 → 841 lines.
Removed unused imports: `memo`, `FileText`, `Mic`,
`weakestWritingFormats`, `weakestSpeakingTopics`, `listFormats`.

Emitted per-widget chunks: 3.36 KB (RecentPerformance), 2.45 KB
(ProgressSparkline), 1.59 KB (WorstTurnWidget) plus the
`writingFormats-*.js` chunk (7.4 KB) that the lazy boundary unlocked
from the eager bundle. Net: **−13.87 KB raw / −4 KB gzipped** on the
main chunk.

**Edge case verified.** The `navigate` prop is stable from
`react-router-dom`'s `useNavigate`, so the inline `onClick` closures
don't bust memo equality in any meaningful way.

## 4. What's still open (next-session priority queue)

The bundle-perf queue's items 1 and 3 are now done. The medium-risk auth
refactor is the next obvious target.

1. ~~OG/Twitter meta tags~~ ✅ shipped (`efca3b9`).
2. **`supabase.js` `INEFFECTIVE_DYNAMIC_IMPORT` warning** (medium risk,
   ~5–10 KB win — but possibly more once Supabase's 184 KB chunk is
   actually allowed to defer). `src/config/supabase.js` is
   dynamic-imported by `ai.js`, `gemini.js`, `useStore.js` but ALSO
   statically imported by `AuthGuard.jsx`, `AuthModal.jsx`,
   `AuthUnlock.jsx`, `Layout.jsx`, `AdminPanel.jsx`. The static
   importers defeat the split — Rollup correctly warns. To win bytes,
   the eager importers need to defer their supabase usage (e.g.
   `AuthGuard` renders a lightweight skeleton while it
   `await import('../config/supabase')`, then upgrades). Touches auth
   cold-load timing — verify the unauthenticated route and the
   post-login redirect both still work. **This is the highest-priority
   open item — see §7 for a ready-to-paste next-session prompt.**
3. ~~Dashboard widget audit~~ ✅ shipped (`0e06dcb`).
4. **Bundle slice 2 (riskier)** — split `useStore.js` (1748 lines) into
   modules. Touches persisted state — every slice extraction must
   preserve the `igcse-malay-store` schema or it'll wipe user progress.
5. **Fix `vite.config.js` no-undef on `process`** (2-minute drive-by) —
   add `/* global process */` at the top, or properly use Vite's
   `loadEnv` in a config function. Pre-existing since `6a6b3c2`. Worth
   doing before the next bundle-perf push so lint runs clean again.
6. **Master Plan phases 3–5** — adaptive scaffolding tuning,
   framer-motion polish (in lazy chunks only), deeper feedback loops.
7. **Icon quality regeneration** — better prompts for the 294
   mflux-generated dictionary icons.

## 5. Rules still in force (from prior session + CLAUDE.md)

- Do NOT re-introduce `framer-motion` in any cold-load component
  (Layout / Dashboard / AuthGuard). Use CSS transitions; `MistakeToast.jsx`
  is the reference.
- Do NOT import the full `writingGrader.js` for just `listFormats`.
  Import from `src/lib/writingFormats.js` instead.
- Do NOT re-introduce `react-helmet-async`. Use the imperative `<Meta>`
  component, or edit `index.html` directly (this session did the latter).
- `git status` before every `git add`. The harness still co-stages
  `.claude/settings.local.json` when it auto-updates permissions — that
  file is already tracked in git history so the co-commits are noise
  rather than a real problem, but verify nothing else slips in.
- `npm run build` (0 errors) + `npm run test:run` (168/168) after any
  store / FSRS / grading edit.

## 6. Where to find more context

- `docs/sessions/2026-05-25-bundle-perf-session.md` — the long bundle-perf
  writeup that preceded this session. Read it first if you're picking up
  cold; it has the full codebase orientation, AI-tier breakdown, and the
  rationale for every removal that capped the bundle at 422.71 KB.
- `RESUME_HERE.md` — historical record (1628 lines). Treat anything
  before the top banner as background.
- `CLAUDE.md` — repo-wide conventions.

---

## 7. Next-session prompt (paste into a fresh Claude session)

> You are continuing the IGCSE Malay Master project (React 19 SPA,
> Vite 8, Zustand 5, Tailwind 4). Working dir is
> `/Users/kheshav/Kheshav/kheshav code/og igcse malay master` —
> despite the name, the parallel `upg-igcse-malay-master` clone is
> dormant and shares the same GitHub remote. Live site is
> https://upg-igcse-malay-master.vercel.app and Vercel auto-deploys
> every push to `main` within seconds, so treat each commit as a
> production deploy.
>
> ### Mindset
>
> Do your best. Aim for the perfect result. Keep iterating until
> nothing more can be improved. Don't ship the first thing that
> works — ship the cleanest thing that works. If the user asks for
> X and you can see a 5-minute path to X-and-something-better, ask
> before splitting the work; don't pre-emptively scope-creep, but
> don't pretend you didn't see the better path either.
>
> ### Step 1 — Verify state
>
> Read these in order:
> 1. `docs/sessions/2026-05-25-tactical-followups-session.md` (the
>    latest handoff — ~150 lines).
> 2. `docs/sessions/2026-05-25-bundle-perf-session.md` (the longer
>    context — only if you need codebase orientation).
> 3. `CLAUDE.md` (repo conventions; sections you haven't internalised).
>
> Then run, in parallel:
>
> ```
> git log --oneline -5
> npm run build 2>&1 | tail -5
> npm run test:run 2>&1 | tail -5
> ```
>
> Expected: HEAD = `0e06dcb`, build emits `index-*.js` ≈ **408.84 KB**
> with zero errors, vitest reports 168 passed. If any of these don't
> match, stop and ask before doing anything — drift means the handoff
> is stale and the priorities below may be wrong.
>
> ### Step 2 — The big one: `supabase.js INEFFECTIVE_DYNAMIC_IMPORT`
>
> This is the highest-impact remaining perf item and the most sensitive
> surface left on the queue. `src/config/supabase.js` is BOTH:
>
> - **Dynamic-imported** by `src/lib/ai.js`, `src/lib/gemini.js`,
>   `src/store/useStore.js` (correct — these defer auth/network code).
> - **Statically imported** by `src/components/AuthGuard.jsx`,
>   `src/components/AuthModal.jsx`, `src/components/AuthUnlock.jsx`,
>   `src/components/Layout.jsx`, `src/components/AdminPanel.jsx`
>   (wrong — these pull the 184 KB `@supabase/supabase-js` runtime into
>   the cold-load chunk).
>
> Goal: convert the five eager importers to defer their supabase usage
> so the `dist-*.js` 184 KB chunk only loads when the user actually
> needs auth. Expected win: **5–20+ KB** off the main chunk depending
> on how much of the supabase API surface tree-shakes out of the eager
> path (the warning blocks the split entirely today, so the real
> ceiling is unknown until measured).
>
> **Required reading before touching code.** Open each of the five
> eager-importer files and document, in a TodoWrite list, what each
> uses from `../config/supabase`. Specifically:
> - Layout.jsx — only needs auth state for the header pill; might be
>   able to subscribe via the existing Zustand auth slice instead of
>   touching supabase directly.
> - AuthGuard.jsx — the cold-load auth check is here; whatever you do
>   must not regress the "unauthenticated → redirect to /signin" path.
> - AuthModal.jsx, AuthUnlock.jsx — modal/unlock UIs, usually only
>   rendered after a user action, so they're lazy-able directly.
> - AdminPanel.jsx — admin-only route; almost certainly lazy-able with
>   no UX impact.
>
> **Suggested approach (verify before committing to it).**
> 1. For modal/admin importers (AuthModal, AuthUnlock, AdminPanel) —
>    the cleanest path is usually to make THEM lazy from their callers,
>    rather than refactoring their internals. Check where each is used;
>    if it's already inside a click handler or conditional, lazy-load
>    the whole component.
> 2. For Layout.jsx — see if it can read auth state from the Zustand
>    store (`auth.user`) instead of importing the supabase client
>    directly. The store already has an `auth` slice.
> 3. For AuthGuard.jsx — this is the hard one because it runs on cold
>    load. Likely needs an `await import('../config/supabase')` inside
>    the auth check, with a lightweight "checking…" skeleton while the
>    chunk loads. Verify the post-login redirect still works.
>
> ### Step 3 — Verification gauntlet
>
> After each commit:
>
> - `npm run build 2>&1 | tail -8` — zero errors, watch for new
>   `INEFFECTIVE_DYNAMIC_IMPORT` warnings, confirm `index-*.js` shrank,
>   confirm `dist-*.js` (supabase) is no longer eager-included.
> - `npm run test:run 2>&1 | tail -5` — 168/168 must hold.
> - Manual sanity check the user must be able to perform after deploy:
>   1. Open the live site in a fresh incognito window. Site loads to
>      the dashboard (guest mode).
>   2. Click "Sign in" — modal appears within ~200 ms of the click
>      (slightly slower is acceptable; >1 s means the lazy boundary
>      pulled the chunk too late).
>   3. Sign in with Google. Post-login, the dashboard reloads with the
>      authenticated user (no infinite spinner).
>   4. Refresh the page. Auth state persists, dashboard renders
>      authenticated within ~500 ms cold-load.
>
> If any manual step fails, revert the offending commit and ask before
> retrying.
>
> ### Step 4 — If supabase refactor is too risky to ship today
>
> Fallback to drive-by work that doesn't touch auth:
>
> - **Fix `vite.config.js` lint error** (2 min) — `'process' is not
>   defined` on line 11. Either add `/* global process */` at the top
>   or refactor to Vite's `loadEnv` in a config function.
>   Verify with `npm run lint` showing only the 3 expected pre-existing
>   warnings.
> - **Word Families search debounce** (~10 min) — currently filters on
>   every keystroke. Trivial perf win, very low risk.
> - **Mistake journal pagination** — `mistakes` array is capped but
>   the rendering may not be virtualised; check
>   `src/pages/MistakeJournal.jsx`.
>
> ### Hard rules (from CLAUDE.md + handoff)
>
> - `npm run build` after every change. Zero errors required. The 3
>   pre-existing lint warnings in `RoleplayScorecard.jsx`,
>   `Comprehension.jsx`, `Roleplay.jsx` are tracked — do NOT introduce
>   new ones.
> - `npm run test:run` after touching store / FSRS / grading logic.
>   168/168 must hold.
> - `git status` before EVERY `git add` — the harness keeps adding
>   permission updates to `.claude/settings.local.json`. That file is
>   already tracked so co-commits don't break anything, but verify
>   nothing else slipped in.
> - Surgical diffs only. No full-file rewrites for small changes.
> - After any behaviour change, update both `RESUME_HERE.md`'s top
>   banner and the auto-memory file at
>   `~/.claude/projects/-Users-kheshav-Kheshav-kheshav-code-og-igcse-malay-master/memory/project_state_2026_05_25.md`
>   in the same session (doesn't have to be the same commit).
> - At the end of your session, write a new handoff at
>   `docs/sessions/YYYY-MM-DD-<topic>-session.md` mirroring this
>   structure, and update `RESUME_HERE.md`'s banner to point at it.
>
> ### Do NOT re-introduce (history explains why — see prior handoffs)
>
> 1. `framer-motion` in any component reachable from
>    `Layout / Dashboard / AuthGuard` on cold load — it pulls a 190 KB
>    runtime. Use CSS transitions; `MistakeToast.jsx` is the reference
>    pattern.
> 2. The full `writingGrader.js` when you only need `listFormats`.
>    Always import from `src/lib/writingFormats.js`.
> 3. `react-helmet-async`. Use the imperative `<Meta>` component or
>    edit `index.html` directly (the static OG/Twitter tags landed
>    via the latter on `efca3b9`).
>
> ### Working style
>
> Tight responses. State decisions directly; one short sentence before
> tool calls; no narration of internal thought. End-of-turn summary:
> 1–2 sentences. Match depth to task. Do NOT dispatch parallel
> subagents for code review on diffs under ~50 files — inline review
> is faster and cheaper.
>
> If anything in this prompt or the handoff doc contradicts what you
> observe in the repo, flag it and stop. Drift between docs and
> reality is the highest-priority signal.
