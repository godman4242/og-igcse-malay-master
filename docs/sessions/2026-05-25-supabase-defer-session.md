# Session — 2026-05-25 (night) — Supabase auth-cold-load refactor

> Direct follow-on from the tactical-followups session
> (`docs/sessions/2026-05-25-tactical-followups-session.md`). The
> highest-priority item from that handoff — the `supabase.js
> INEFFECTIVE_DYNAMIC_IMPORT` warning + the auth cold-load surface —
> has landed. Single commit, surgical diff, build is now warning-free.

---

## 1. Status snapshot (end of session)

- **Branch / HEAD:** `main` at `32a09d3` (one commit beyond the prior
  handoff at `4938ed0`).
- **Build:** clean (`npm run build` zero errors, **no
  `INEFFECTIVE_DYNAMIC_IMPORT` warning** for the first time in weeks).
  Main chunk `index-*.js` = **404.98 KB / gz 130.33 KB** (was 408.84 /
  131.58 — −3.86 KB raw / −1.25 KB gz).
- **New chunk:** `supabase-D179DSsV.js` = **12.94 KB / gz 3.18 KB**.
  Lazy-loaded only when AuthGuard's `useEffect` runs, an auth handler
  fires, or a cloud telemetry event triggers. The 184 KB `dist-*.js`
  chunk (`@supabase/supabase-js` itself) is unchanged — still lazy via
  `initSupabase`'s existing dynamic import.
- **Lint:** identical to prior session (1 pre-existing error in
  `vite.config.js:11`, 3 pre-existing warnings). No new lint issues.
- **Tests:** **168 / 168 passing**.
- **Working tree:** clean.
- **Live site:** Vercel auto-deployed.
- **STORE_VERSION:** `19` — unchanged.

## 2. Commits shipped this session (newest first)

| Commit | Subject | Bundle Δ |
|---|---|---|
| `32a09d3` | `perf(bundle): defer supabase.js to own chunk (-4KB main, kills INEFFECTIVE_DYNAMIC_IMPORT)` | 408.84 → 404.98 KB (main); + new 12.94 KB lazy chunk |

The `.claude/settings.local.json` permission file did NOT get
co-staged this session — clean diff of 12 files, no harness noise.

## 3. What changed and WHY

### `32a09d3` — Supabase deferral

**Problem.** `src/config/supabase.js` was both dynamic-imported (by
`ai.js`, `gemini.js`, `useStore.js`) AND statically imported by NINE
files: `Layout.jsx`, `AuthGuard.jsx`, `AuthModal.jsx`, `AuthUnlock.jsx`,
`AdminPanel.jsx`, `Settings.jsx`, `ai.js`, `useStore.js`,
`syncEngine.js`, and `telemetry.js`. Rollup correctly emitted an
`INEFFECTIVE_DYNAMIC_IMPORT` warning and refused to give supabase.js
its own chunk — its code stayed in the main chunk for cold-load.

A complicating factor the prior handoff understated: most of those
static importers needed only `SUPABASE_CONFIG` (the env-derived
`{ url, key, enabled }` object), not the supabase API surface. Just
deferring function imports wouldn't have solved the warning because
the SUPABASE_CONFIG re-export was the load-bearing edge.

**Fix — two-pronged.**

1. **Created `src/config/supabaseConfig.js`** — a zero-dependency shim
   that exports only `SUPABASE_CONFIG`. The full `supabase.js` now
   imports `SUPABASE_CONFIG` from this shim and re-exports it for
   back-compat (no external API change). Config-only consumers
   (`useStore.js`, `ai.js`, `syncEngine.js`, `Settings.jsx`, plus the
   `SUPABASE_CONFIG` portion of the auth components) now import from
   the shim and never pull supabase.js into their chunk.

2. **Deferred remaining function imports at use sites** — every
   eager importer that pulled supabase.js functions was converted to
   a dynamic import at the call site:

   - **AuthGuard.jsx**: the cold-load `useEffect` was rewritten as an
     async IIFE that begins with
     `const supa = await import('../config/supabase')`. `handleSignIn`
     was given a third arg (`supa`) instead of relying on closure-
     scoped imports. Session restoration still works for returning
     visitors — there's now a 1× chunk-fetch (~3 KB gz) before
     `initSupabase()` runs, but the user is already on the dashboard
     in guest mode during that window.
   - **AuthModal.jsx**: `sendMagicLink` + `signInWithGoogle` moved
     into `handleSend` / `handleGoogle` as `const { fn } = await
     import('../config/supabase')`. Modal renders `null` until the
     user clicks "Save" in the header pill, so the chunk only loads
     on first sign-in attempt.
   - **AuthUnlock.jsx**: same pattern. The cold-load session check
     inside its `useEffect` was wrapped in an async IIFE, click
     handlers do their own dynamic import.
   - **AdminPanel.jsx**: useEffect-loader uses a cancelled flag to
     guard against races; both `handleInvite` and `handleRemove`
     dynamic-import their specific functions. Vite/browser caches
     the module after first resolve so subsequent calls are free.
   - **Layout.jsx**: only used `signOut`. Moved into `handleSignOut`
     as a one-line dynamic import.
   - **telemetry.js**: hot path from useStore. `sendTelemetryEvent`
     is now `import('../config/supabase').then(...)` inside the
     `cloudEnabled` branch (fire-and-forget; failure path silently
     drops, never breaks app flow).

**Result.** Rollup emits a dedicated `supabase-*.js` chunk for the
first time. Main chunk shrinks 3.86 KB (the JS that used to live
inline). For cold-load guest users (the common case) the chunk
never downloads — for authenticated visitors it streams in parallel
with @supabase/supabase-js.

**Edge cases verified.** AuthGuard's `mounted` flag still guards
post-unmount state updates after the new `await import()`.
AdminPanel uses a `cancelled` ref so the useEffect's cleanup path
beats any in-flight setState. All eight handler-scoped dynamic
imports are inside async functions — no synchronous render-time
calls. `await` happens on a click or sign-in callback, never during
React render.

## 4. What's still open (next-session priority queue)

With the supabase warning closed, the remaining items shift up:

1. ~~`supabase.js INEFFECTIVE_DYNAMIC_IMPORT`~~ ✅ shipped (`32a09d3`).
2. **Fix `vite.config.js` no-undef on `process`** (2-min drive-by) —
   `'process' is not defined` on line 11. Either `/* global process */`
   at the top or migrate to Vite's `loadEnv` in a config function.
   Pre-existing since `6a6b3c2`. Lint runs with 1 error until this is
   fixed. **This is the obvious next item.**
3. **Word Families search debounce** (~10 min, low risk) — currently
   filters on every keystroke.
4. **Mistake journal pagination** — `mistakes` array is capped at the
   store level but `src/pages/MistakeJournal.jsx` may not virtualise
   rendering. Audit needed.
5. **Bundle slice 2 (riskier)** — split `useStore.js` (1748 lines)
   into modules. Touches persisted state — every slice extraction
   must preserve the `igcse-malay-store` schema or it'll wipe user
   progress. The big remaining perf lever, but high blast radius.
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
- Do NOT re-introduce `react-helmet-async`. Use the imperative `<Meta>`
  component, or edit `index.html` directly.
- Do NOT consolidate the new `supabaseConfig.js` shim back into
  `supabase.js` — that re-creates the warning instantly.
- `git status` before every `git add`. (This session shipped a clean
  diff — pattern to repeat.)
- `npm run build` (0 errors, no `INEFFECTIVE_DYNAMIC_IMPORT`) +
  `npm run test:run` (168/168) after any store / FSRS / grading edit.

## 6. Where to find more context

- `docs/sessions/2026-05-25-tactical-followups-session.md` — the
  immediately-prior handoff. Section §7 contained the prompt that
  drove this session's work. Now superseded for this item.
- `docs/sessions/2026-05-25-bundle-perf-session.md` — the original
  bundle-perf sprint (full codebase orientation).
- `RESUME_HERE.md` — historical archive. Treat anything before the
  top banner as background.
- `CLAUDE.md` — repo-wide conventions.

---

## 7. Next-session prompt (paste into a fresh Claude session)

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
> 1. `docs/sessions/2026-05-25-supabase-defer-session.md` (this doc).
> 2. `docs/sessions/2026-05-25-tactical-followups-session.md` (the
>    previous handoff — only if you need extra orientation).
> 3. `CLAUDE.md`.
>
> Then run, in parallel:
>
> ```
> git log --oneline -5
> npm run build 2>&1 | tail -8
> npm run test:run 2>&1 | tail -5
> ```
>
> Expected: HEAD = `32a09d3`, build emits `index-*.js` ≈ **404.98 KB**
> with **zero warnings (no `INEFFECTIVE_DYNAMIC_IMPORT`)**, `supabase-*.js`
> chunk exists at ~13 KB, vitest reports 168 passed. Any drift means
> the handoff is stale — stop and ask.
>
> ### Step 2 — Quick drive-by: `vite.config.js` `process` error
>
> `npm run lint` currently reports 1 error: `'process' is not defined`
> on `vite.config.js:11`. This predates the bundle-perf sprint and
> has been latent for two sessions. Fix options:
>
> 1. **Add `/* global process */`** at the top of the file. One line,
>    zero risk.
> 2. **Migrate to Vite's `loadEnv`** in a config function:
>    ```js
>    export default defineConfig(({ mode }) => {
>      const env = loadEnv(mode, process.cwd(), '') // ← still process here, but…
>      // …actually, loadEnv is the idiomatic Vite path and ESLint's
>      // node-globals config can be opted in via a `globals: { process: 'readonly' }`
>      // in `eslint.config.js`.
>    })
>    ```
>    Cleaner long-term but bigger diff.
>
> The user's preference (from prior sessions): surgical diffs win.
> Pick option 1 unless there's a reason to go deeper.
>
> Verify with `npm run lint` showing only the 3 pre-existing warnings
> (RoleplayScorecard, Comprehension, Roleplay).
>
> ### Step 3 — Then pick the next item from §4 of this handoff
>
> Recommended order:
> - **Word Families search debounce** (~10 min) — trivial perf win.
> - **Mistake journal pagination audit** — read
>   `src/pages/MistakeJournal.jsx`, count DOM nodes when mistakes are
>   at the cap (50). If >300 nodes, virtualise.
> - **useStore.js split** (high risk) — only if the user explicitly
>   asks. Touching persisted state can wipe user progress.
>
> ### Verification gauntlet (after each commit)
>
> - `npm run build 2>&1 | tail -8` — zero errors, no
>   `INEFFECTIVE_DYNAMIC_IMPORT` warning, main chunk stable or smaller.
> - `npm run test:run 2>&1 | tail -5` — 168/168 must hold.
>
> ### Hard rules (unchanged)
>
> - Surgical diffs only. No full-file rewrites for small changes.
> - `git status` before every `git add`. The harness occasionally adds
>   `.claude/settings.local.json`; verify nothing else slipped in.
> - After any behaviour change, update RESUME_HERE.md's top banner
>   and the auto-memory file at
>   `~/.claude/projects/-Users-kheshav-Kheshav-kheshav-code-og-igcse-malay-master/memory/project_state_2026_05_25.md`
>   in the same session.
> - At the end of your session, write a new handoff at
>   `docs/sessions/YYYY-MM-DD-<topic>-session.md` mirroring this
>   structure, and update RESUME_HERE.md's banner to point at it.
>
> ### Do NOT re-introduce (history explains why)
>
> 1. `framer-motion` in any component reachable from
>    `Layout / Dashboard / AuthGuard` on cold load.
> 2. The full `writingGrader.js` when you only need `listFormats`.
> 3. `react-helmet-async`.
> 4. **Static imports of `../config/supabase`** in any of the eleven
>    files that were just refactored. Use `../config/supabaseConfig`
>    for `SUPABASE_CONFIG`, and dynamic-import the rest at the call
>    site.
>
> ### Working style
>
> Tight responses. State decisions directly; one short sentence before
> tool calls. End-of-turn summary: 1–2 sentences. Match depth to task.
