# Open Auth + Production Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the invite-only gate so any student can sign up, add Google OAuth alongside magic link, fix the supabase bundle-size issue, and ship to Vercel production.

**Architecture:** Five surgical edits across `supabase.js`, `AuthModal.jsx`, `AuthUnlock.jsx`, and `AdminPanel.jsx` — no new files, no new dependencies. All changes are backwards-compatible (guest/offline mode unchanged). After code changes, user runs three one-time setup steps in Supabase + Vercel dashboards.

**Tech Stack:** React 19, Zustand 5, Supabase JS v2, Vercel serverless (`api/`), Vite 8.

---

## Files Modified

| File | What changes |
|---|---|
| `src/config/supabase.js` | `checkUserRole` → returns `enhanced` for any authenticated user, no allowlist lookup |
| `src/components/AuthModal.jsx` | Add "Continue with Google" button; magic link becomes secondary option |
| `src/components/AuthUnlock.jsx` | Remove allowlist error state; any SIGNED_IN → enhanced; remove `checkUserRole` call |
| `src/components/AdminPanel.jsx` | Replace 4 static `supabase.js` imports with inline `initSupabase()` calls |

---

## Task 1: Remove the invite gate from `checkUserRole`

**Files:**
- Modify: `src/config/supabase.js`

The current `checkUserRole` queries `allowed_users` and rejects anyone not on the list. For open signup, any authenticated Supabase user becomes `enhanced` automatically. We keep the function signature intact so nothing that calls it breaks — it just always returns `enhanced` now.

- [ ] **Step 1: Edit `checkUserRole` in `src/config/supabase.js`**

Find this function (around line 40):

```js
export async function checkUserRole(email) {
  if (email === OWNER_EMAIL) return { role: 'owner', error: null }

  const client = getSupabase()
  if (!client) return { role: null, error: 'Not connected' }

  try {
    const { data, error } = await client
      .from('allowed_users')
      .select('role')
      .eq('email', email)
      .single()

    if (error || !data) return { role: null, error: 'Email not on the allowlist' }
    return { role: data.role, error: null }
  } catch {
    return { role: null, error: 'Failed to check allowlist' }
  }
}
```

Replace it with:

```js
export async function checkUserRole(email) {
  if (email === OWNER_EMAIL) return { role: 'owner', error: null }
  // Open signup: any authenticated user gets enhanced role automatically.
  // The allowed_users table is kept for manual admin promotion only.
  return { role: 'enhanced', error: null }
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build
```

Expected: `✓ built in` with 0 errors. The bundle size for `index-*.js` should be similar or smaller (we haven't fixed the static import yet — that's Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/config/supabase.js
git commit -m "feat(auth): open signup — any authenticated user gets enhanced role"
```

---

## Task 2: Simplify `AuthUnlock` — remove allowlist error

**Files:**
- Modify: `src/components/AuthUnlock.jsx`

`AuthUnlock` is the auth widget in the Settings page. It currently calls `checkUserRole` and shows "Your email is not on the allowlist. Contact Kheshav." With open signup, the `checkUserRole` call is now a no-op, but the `error` state and `setStatus('error')` branch are dead code. Remove them to clean up the component.

- [ ] **Step 1: Open `src/components/AuthUnlock.jsx` and locate the SIGNED_IN handler**

Find the `onAuthStateChange` callback (around line 45) that looks like:

```js
if (event === 'SIGNED_IN' && session?.user && mounted) {
  setUser(session.user)
  setStatus('checking')
  const { role, error: roleError } = await checkUserRole(session.user.email)
  if (role && mounted) {
    setUserRole(role)
    enableCloudTelemetry()
    await hydrateCloudData()
    flushSyncQueue()
    setStatus('done')
  } else if (mounted) {
    setError(roleError || 'Your email is not on the allowlist. Contact Kheshav.')
    setStatus('error')
  }
}
```

Replace with (remove the `else` branch entirely, skip the role check):

```js
if (event === 'SIGNED_IN' && session?.user && mounted) {
  setUser(session.user)
  const { role } = await checkUserRole(session.user.email)
  if (mounted) {
    setUserRole(role || 'enhanced')
    enableCloudTelemetry()
    await hydrateCloudData()
    flushSyncQueue()
    setStatus('done')
  }
}
```

- [ ] **Step 2: Also fix the `useEffect` initial session check** (same pattern, same file, around line 30)

Find:

```js
const { role } = await checkUserRole(currentUser.email)
if (role && mounted) {
  setUserRole(role)
  enableCloudTelemetry()
  await hydrateCloudData()
  flushSyncQueue()
  setStatus('done')
}
```

Replace with:

```js
const { role } = await checkUserRole(currentUser.email)
if (mounted) {
  setUserRole(role || 'enhanced')
  enableCloudTelemetry()
  await hydrateCloudData()
  flushSyncQueue()
  setStatus('done')
}
```

- [ ] **Step 3: Remove the `error` JSX branch** — search for `status === 'error'` in the return JSX and delete that branch (it showed the allowlist rejection message). Also remove the `setError` import/usage if it becomes unused.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/AuthUnlock.jsx
git commit -m "feat(auth): remove allowlist rejection from AuthUnlock — open to all users"
```

---

## Task 3: Add Google OAuth to `AuthModal`

**Files:**
- Modify: `src/components/AuthModal.jsx`

The auth modal currently shows only a magic-link email form. We add a "Continue with Google" button above it. On click, it calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. The button uses the existing modal's design system (CSS variables, no new deps).

- [ ] **Step 1: Add a `signInWithGoogle` export to `src/config/supabase.js`**

At the bottom of the auth helpers section (after `sendMagicLink`), add:

```js
/**
 * Redirect to Google OAuth. Supabase handles the callback.
 * redirectTo must be whitelisted in Supabase Auth settings.
 */
export async function signInWithGoogle() {
  const client = await initSupabase()
  if (!client) return { error: 'Supabase not configured' }

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  return { error: error?.message || null }
}
```

- [ ] **Step 2: Import `signInWithGoogle` in `AuthModal.jsx`**

Find the existing import line at the top of `src/components/AuthModal.jsx`:

```js
import { sendMagicLink, SUPABASE_CONFIG } from '../config/supabase'
```

Change to:

```js
import { sendMagicLink, signInWithGoogle, SUPABASE_CONFIG } from '../config/supabase'
```

- [ ] **Step 3: Add Google button state and handler**

Inside the `AuthModal` component function, after the existing state declarations, add:

```js
const [googleLoading, setGoogleLoading] = useState(false)

const handleGoogle = async () => {
  setGoogleLoading(true)
  const { error } = await signInWithGoogle()
  if (error) {
    setErrorMsg(error)
    setStatus('error')
    setGoogleLoading(false)
  }
  // On success, Supabase redirects — component unmounts
}
```

- [ ] **Step 4: Insert the Google button into the JSX**

Inside the modal body (in the `status !== 'sent'` section), just before the email `<input>`, add this divider + button block:

```jsx
{/* Google OAuth — primary path */}
<button
  onClick={handleGoogle}
  disabled={googleLoading || status === 'sending'}
  className="w-full flex items-center justify-center gap-3 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-95"
  style={{
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    opacity: googleLoading ? 0.7 : 1,
  }}
>
  {/* Google logo SVG — inline, no external dep */}
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
</button>

{/* Divider */}
<div className="flex items-center gap-3 my-1">
  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
  <span className="text-xs" style={{ color: 'var(--color-dim)' }}>or use email</span>
  <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
</div>
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/config/supabase.js src/components/AuthModal.jsx
git commit -m "feat(auth): add Google OAuth button to AuthModal — primary sign-in path"
```

---

## Task 4: Fix static `supabase.js` import in `AdminPanel` (bundle size)

**Files:**
- Modify: `src/components/AdminPanel.jsx`

`AdminPanel` is a lazy-loaded route component but it statically imports from `supabase.js`. This makes Rollup pull the Supabase client into the main bundle, causing the 703KB issue. Fix: move the imports inside the async functions that need them, using `initSupabase()`.

- [ ] **Step 1: Read the top of `src/components/AdminPanel.jsx` to find the static imports**

```bash
head -20 src/components/AdminPanel.jsx
```

- [ ] **Step 2: Replace static supabase imports with inline `initSupabase()` calls**

Remove any top-level lines like:
```js
import { listAllowedUsers, addAllowedUser, removeAllowedUser, readTelemetryEvents } from '../config/supabase'
```

Inside each async function that needs these, replace with:
```js
const { listAllowedUsers } = await import('../config/supabase')
// or just use initSupabase() and call the client directly
```

The simplest fix: at the top of `AdminPanel.jsx`, keep only:
```js
import { initSupabase } from '../config/supabase'
```

Then inside each handler function that queries Supabase, call `initSupabase()` first and use the client directly instead of the helper functions.

- [ ] **Step 3: Verify build passes and check chunk size improvement**

```bash
npm run build 2>&1 | grep "index-"
```

Expected: `index-*.js` smaller than before (target: under 600KB; ideal ~500KB).

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminPanel.jsx
git commit -m "perf(bundle): remove static supabase import from AdminPanel — reduces main chunk"
```

---

## Task 5: Final build verification + push to GitHub

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: `0 errors` (3 pre-existing warnings are fine).

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: `✓ built in` with 0 errors.

- [ ] **Step 3: Push to GitHub (triggers Vercel auto-deploy)**

```bash
git push origin main
```

Expected: `main -> main` pushed. Vercel will auto-deploy within ~60 seconds.

---

## Task 6: One-Time Setup Instructions (User Does This — 15 Minutes)

These steps are done once in external dashboards. The code doesn't change.

### Step A: Run the database schema in Supabase (~3 minutes)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → your project (`sfrpbnmhvhtsgzqwnent`)
2. Click **SQL Editor** in the left sidebar → **+ New query**
3. Open `src/config/supabase.js` in any text editor — scroll to the very bottom to find `export const SCHEMA_SQL = \`...\``
4. Copy everything between the backticks (the SQL)
5. Paste it into the Supabase SQL Editor
6. Click **Run**
7. You should see: "Success. No rows returned." — all 6 tables are now created

### Step B: Set up Google OAuth (~7 minutes)

**Part 1 — Google Cloud Console:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (call it "IGCSE Malay Master") or use an existing one
3. Go to **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: "IGCSE Malay Master"
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all steps
4. Go to **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: "IGCSE Malay Master Web"
   - Authorized JavaScript origins:
     - `https://sfrpbnmhvhtsgzqwnent.supabase.co`
     - `https://og-igcse-malay-master.vercel.app` (or your custom domain)
   - Authorized redirect URIs:
     - `https://sfrpbnmhvhtsgzqwnent.supabase.co/auth/v1/callback`
5. Click **Create** — copy the **Client ID** and **Client Secret**

**Part 2 — Supabase Dashboard:**
1. Go to Supabase → **Authentication** → **Providers** → click **Google**
2. Toggle **Enable** to ON
3. Paste your **Client ID** and **Client Secret**
4. Click **Save**

### Step C: Set Vercel environment variables (~5 minutes)

1. Go to [vercel.com/dashboard](https://vercel.com) → your project (`og-igcse-malay-master`) → **Settings** → **Environment Variables**
2. Add each of these — set them for **Production**, **Preview**, and **Development**:

| Variable | Value | Where to find it |
|---|---|---|
| `SUPABASE_URL` | `https://sfrpbnmhvhtsgzqwnent.supabase.co` | Already in your `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (long key) | Supabase → Project Settings → API → **service_role** key |
| `VITE_SUPABASE_URL` | `https://sfrpbnmhvhtsgzqwnent.supabase.co` | Same as above |
| `VITE_SUPABASE_KEY` | `sb_publishable_...` | Already in your `.env.local` as `VITE_SUPABASE_KEY` |
| `GEMINI_KEY` | `AIzaSy...` | Already in your `.env.local` |

3. After adding all vars, go to Vercel → **Deployments** → find the latest deploy → click the **⋯** menu → **Redeploy**

### Step D: Verify it works

1. Visit your Vercel URL: `https://og-igcse-malay-master.vercel.app`
2. Click the **Save Progress** button (top right of Dashboard) or go to Settings
3. The auth modal should appear with a **Continue with Google** button
4. Click it — Google sign-in flow opens
5. Sign in → you're back on the app, now signed in
6. Go to Supabase → **Authentication → Users** — you should see your email listed

---

## Success Criteria

- [ ] Any user can click "Continue with Google" and sign in (no invite needed)
- [ ] Any user can enter their email and get a magic link
- [ ] After signing in, their study progress is uploaded to Supabase
- [ ] Signing in on a second device restores their progress
- [ ] You can see all sign-ins in Supabase → Authentication → Users
- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → 0 errors
- [ ] Site is live at `og-igcse-malay-master.vercel.app`
