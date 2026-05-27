# 2026-05-27 — Session: CWE-94 fix on ai-proxy + Deno TS hygiene

Follow-up patch on top of `b28892e` (writing-feedback-v2 guardrail). Same
file, different concern. Both still need ONE deploy to reach prod.

## Context

User pasted four editor diagnostics for `supabase/functions/ai-proxy/index.ts`:

1. `Cannot find name 'Deno'` × 3 (lines 10, 11, 265) — `ts(2304)`
2. `Bracket object notation with user input is present, this might allow an
   attacker to access all properties of the object and even its prototype,
   leading to possible code execution` — `securecoder` CWE-94 at line 302

PC had just crashed mid-session; user said "fix these in priority, decide
what makes the website better, don't ask".

## Diagnosis

**CWE-94 (real bug):**
`SYSTEM_PROMPTS[action]` where `action = body.action` (user-controlled).
Object literal exposes `Object.prototype` — `body.action = "toString"`
returns `Function.prototype.toString`, which is truthy, slips past
`if (!systemPrompt)` guard, and gets sent to OpenRouter as the system
prompt. Low impact (auth-gated by `verify_jwt = true`, no real RCE) but
still a real prompt-injection vector for any authenticated client.

**TS(2304) (editor-only noise):**
File runs on Deno Deploy at runtime but VS Code's TS server uses the
project tsconfig (Node + React). No `denoland.vscode-deno` extension,
no `deno.json` in the function dir, so `Deno.env` / `Deno.serve` are
flagged. Runtime is unaffected.

## Fix

### CWE-94

Converted `SYSTEM_PROMPTS` from `Record<string, string>` object literal
to `Map<string, string>`. Dispatch became `SYSTEM_PROMPTS.get(action)`
which never traverses the prototype chain. Stricter null check on the
lookup result (`typeof looked !== 'string'`) also catches the case where
someone sneaks a non-string into the Map at construction.

```ts
// Before:
const SYSTEM_PROMPTS: Record<string, string> = { roleplay: '...', ... };
systemPrompt = SYSTEM_PROMPTS[action]; // CWE-94
if (!systemPrompt) return errorResponse(...);

// After:
const SYSTEM_PROMPTS = new Map<string, string>([['roleplay', '...'], ...]);
const looked = typeof action === 'string' ? SYSTEM_PROMPTS.get(action) : undefined;
if (typeof looked !== 'string') return errorResponse(...);
systemPrompt = looked;
```

Rejected alternatives:
- `Object.hasOwn(SYSTEM_PROMPTS, action)` gate — securecoder still
  pattern-matches the bracket notation and flags it. Map is the only
  silent-clean option.
- `Object.create(null)` — same bracket notation, same lint flag.
- Hardcoded switch — works but bloats the diff and duplicates the action
  list.

### TS(2304)

Added inline `declare const Deno: { ... }` block after the JSDoc header.
Five lines, scoped to this file, doesn't require any project-level
config (no `deno.json`, no extension install). Deno Deploy runtime
ignores the declaration; VS Code's TS server uses it.

## Files changed

| File | Change |
|---|---|
| `supabase/functions/ai-proxy/index.ts` | `+33 / -22` — inline Deno type decl + SYSTEM_PROMPTS object→Map conversion + tighter dispatch guard |

## Verification

- `npm run lint` → 0 errors, 3 pre-existing warnings (none in the file I
  touched; same 3 warnings present on `b28892e`).
- `npm run test:run` → 214/214 pass in 773ms. Tests don't cover the
  edge function directly, but confirm no regression in lib/store/grade
  modules that share types.
- Manual: re-read the file end-to-end. Map lookup path verified — no
  remaining `SYSTEM_PROMPTS[…]` access sites.

Deno-side compile not run (no local deno binary). Will be exercised by
`supabase functions deploy` on the next push.

## State at end of session

- **Working copy ahead of prod** by both `b28892e` (Thread C guardrail)
  AND this patch's CWE-94 fix + Deno types.
- **One deploy ships both:** `supabase functions deploy ai-proxy`.
- **Working copy ahead of `main`** by this patch alone — `b28892e` is
  already in main.
- **Not committed** — agent declined to auto-commit because user's Mac
  had just crashed and `[[feedback_no_auto_commit]]` covers exactly that
  scenario. Hand-off paste block in RESUME_HERE.md.

## Thread status

- **A (deploy confirmation):** still pending. User confirmed they don't
  know how to deploy. Deploy command in RESUME_HERE.md.
- **B (Row 7 cosmetic gap):** still punted, unchanged.
- **C (Playwright auto-tester):** still punted, unchanged.

## Why I didn't auto-commit

Memory `[[feedback_no_auto_commit]]` is explicit: 8 GB RAM Mac crashes
when `git+postinstall hook` fires concurrently with high memory
pressure. User just experienced a crash this session ("lag never used
to be this bad, my PC crashed"). Triggering the pre-commit
`git add -A` plus the post-commit auto-push to origin/main RIGHT NOW —
on top of already-elevated memory pressure — is the highest-risk
moment in the entire session to commit.

User did delegate the decision ("you decide"), so this is a judgement
call, not a rule violation. The judgement: lower-risk to hand them a
copy-paste block and let them run it after restarting their dev server
or freeing RAM.

## Late addition — Gemini 3.5-flash bump

After the CWE-94 fix shipped (commit `7d430a9` — user pasted the block
and the post-commit hook auto-pushed), user ran a Writing essay and
reported:
- "AI feedback" (the ai-proxy/OpenRouter path) returned a clean Band-4
  with annotations. Thread C guardrail held — no `fix.fix === surface`
  entries, no flagged-then-unchanged words.
- "Tutor feedback" (the Gemini path) returned `Gemini 404:`.

### Diagnosis

`api/gemini.js:40` hardcoded `gemini-2.0-flash`. Verified against
Google docs via context7: current v1beta free-tier flash is
`gemini-3.5-flash`. The 2.0 family was retired in the 2025-12
deprecation wave (Live API variant `gemini-2.0-flash-live-001` shut
down 2025-12-09; non-live followed).

### Fix

| File | Change |
|---|---|
| `api/gemini.js` | `gemini-2.0-flash` → `gemini-3.5-flash` + comment explaining the rotation. |
| `src/lib/gemini.js` | Refresh stale doc-comment so it doesn't mislead future readers. |
| `SETUP_APIS.md` | Update §2 (Gemini) so setup instructions match prod model. |

### Verification

- `npm run lint` → 0 errors (3 pre-existing warnings unchanged).
- Code path: client → `/api/gemini` (Vercel) → Google v1beta. Vercel
  function deploys automatically on push to `main`.
- Real verification needs a live Vercel deploy + a Writing essay
  test post-deploy. Cannot exercise from the agent side.

### Deploy paths

- `api/gemini.js` is a **Vercel serverless function**. It deploys
  automatically on `git push` to `origin/main` — the post-commit hook
  triggers it. ~2-3 min for prod.
- `supabase/functions/ai-proxy/index.ts` is a **Supabase Edge
  Function**. It deploys ONLY via `supabase functions deploy ai-proxy`
  (manual). Thread A still pending — user said they don't know how to
  run the command. Paste block now in RESUME_HERE.md.

### Why ship two separate commits

The CWE-94 fix is server-side (Supabase Edge) and needs a manual
deploy step. The Gemini fix is also server-side but on Vercel and
auto-deploys. Bundling them obscures which deploy is needed where —
two clean `fix(security)` / `fix(gemini)` commits keep the trail
readable.

## Closing — all threads landed

After the Gemini commit (`12e9a84`) shipped, user retested with a
deliberately misspelt essay ("kerena" for "kerana"). Site flagged the
spelling. Thread C guardrail confirmed bidirectional — doesn't
hallucinate corrections on clean text, doesn't drop real corrections
on dirty text.

Agent then ran `supabase functions deploy ai-proxy` directly (user
authorized auto-execution mid-session after switching from
Antigravity to VS Code, which freed enough RAM that the post-commit
hook chain no longer crashes the Mac). CLI returned `No change found
in Function: ai-proxy` against project `sfrpbnmhvhtsgzqwnent` — the
prod function already matched `7d430a9`. So at some point earlier in
the day, either the user or a prior agent run deployed it. Threads
A + C closed in prod.

### Final state

- HEAD `12e9a84` (Gemini fix) ↔ `origin/main` ↔ Vercel deploy.
- Supabase Edge Function `ai-proxy` in sync with `7d430a9`.
- All `fix(security)`, `feat(ai-proxy)`, and `fix(gemini)` commits
  from the 2026-05-27 day are live in prod.
- 214/214 vitest pass, 0 lint errors, 3 pre-existing warnings
  unchanged.
