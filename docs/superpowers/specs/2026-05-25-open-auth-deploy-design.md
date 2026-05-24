# Design: Open Auth, Cloud Sync & Production Deploy
**Date:** 2026-05-25  
**Status:** Approved — ready for implementation  
**Goal:** Take the site from localhost to a live, open-signup platform where any student can create an account, have their progress backed up to the cloud, and log in from any device.

---

## Context

The app is fully built. Auth components, cloud sync, and the Supabase schema all exist in the codebase. What's missing is:
1. The invite-only gate preventing any new user from logging in
2. The Supabase database tables (SQL never run)
3. Vercel env vars for secrets
4. Google OAuth not configured
5. A small bundle-size fix

This spec covers all five.

---

## Security Model (How User Data Is Protected)

**You do not need to worry about users seeing each other's data.** Here is why:

Supabase uses **Row Level Security (RLS)** — a database-level rule that says "user A can only SELECT/INSERT/UPDATE rows where `user_id = A`". This is enforced by the database, not the app. Even if someone found a bug in the React code, they could not read another user's rows.

What gets stored per user:
- Their email address (for login only)
- Their flashcard progress (FSRS scheduling data)
- Their study streaks and history
- Their writing and speaking session results
- Their settings (theme, daily goal, etc.)

What is **NOT** stored:
- Passwords (magic link and Google OAuth — no passwords ever)
- Payment info (no payments)
- Any other personal data

**The anon key (`VITE_SUPABASE_KEY`) being visible in the app bundle is intentional and safe.** It is a public project identifier, not a secret. The RLS policies make it impossible to abuse. Supabase explicitly designs it to be client-side.

**The service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and stays server-side only** — in Vercel's environment variables, never in the browser bundle.

---

## Changes to the Codebase

### 1. Remove the invite gate (`src/config/supabase.js`)
`checkUserRole()` currently queries the `allowed_users` table and rejects anyone not on it. Change: any authenticated Supabase user automatically gets `enhanced` role. Remove the table lookup entirely from the public-facing auth path.

### 2. Add Google OAuth button (`src/components/AuthModal.jsx`)
Add a "Continue with Google" button above the magic link form. Calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. Magic link stays as a fallback option below.

### 3. Simplify `AuthUnlock` (`src/components/AuthUnlock.jsx`)
Remove the "not on allowlist" error state. Any sign-in success → `enhanced` role. Remove the `checkUserRole` call entirely from this component's SIGNED_IN handler.

### 4. Fix static supabase imports (bundle size)
`AdminPanel.jsx` statically imports from `../config/supabase`. This pulls the Supabase JS client (~120KB) into the main bundle even though AdminPanel is lazy-loaded. Fix: use dynamic `initSupabase()` inside event handlers instead of top-level imports.

### 5. Update `AuthGuard.jsx`
The guard already handles sign-in correctly without the allowlist. Minor cleanup: remove the dependency on `checkUserRole`.

---

## One-Time Setup (You Do This — 15 Minutes Total)

### Step A: Run the database schema in Supabase (~3 min)
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → your project
2. Click **SQL Editor** in the left sidebar → **+ New query**
3. Paste the entire `SCHEMA_SQL` from `src/config/supabase.js` (it's the big const at the bottom of that file)
4. Click **Run**
5. You should see "Success. No rows returned" — that means all 6 tables were created

### Step B: Set up Google OAuth in Supabase (~5 min)
1. In Supabase dashboard → **Authentication** → **Providers** → click **Google**
2. Toggle **Enable** on
3. You need a Google OAuth Client ID and Secret. To get them:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project (or use an existing one)
   - Go to **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `https://sfrpbnmhvhtsgzqwnent.supabase.co` and your Vercel URL
   - Authorized redirect URIs: `https://sfrpbnmhvhtsgzqwnent.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
4. Paste them into Supabase → Google provider → Save

### Step C: Set Vercel environment variables (~5 min)
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard) → your project (`og-igcse-malay-master`) → **Settings** → **Environment Variables**
2. Add these (for **Production**, **Preview**, and **Development**):

| Variable Name | Where to find it | Required? |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key | ✅ Yes |
| `GEMINI_KEY` | Already in your `.env.local` | ✅ Yes |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL | ✅ Yes |
| `VITE_SUPABASE_KEY` | Supabase → Project Settings → API → anon public key | ✅ Yes |
| `DEEPL_KEY` | deepl.com → account → API key | Optional |
| `GOOGLE_TRANSLATE_KEY` | Google Cloud Console | Optional |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is the powerful key that bypasses RLS. Never put it in a VITE_ variable. It goes into Vercel server-side env vars only.

---

## Architecture After This Change

```
Any student visits the site
  ↓
Clicks "Sign in with Google" or enters email
  ↓
Supabase Auth authenticates them (Google OAuth or Magic Link)
  ↓
AuthGuard detects SIGNED_IN event
  ↓
If new user → uploads local progress to cloud
If returning → compares timestamps, loads newer data
  ↓
User has Enhanced role: streaks, mistakes, history all sync
  ↓
On any device, their progress is always up to date
```

---

## What You Can See in Supabase

After users start signing up, you can go to Supabase → **Authentication → Users** and see:
- Every user's email
- When they signed up
- When they last signed in
- Their auth provider (Google or Email)

This is built into Supabase for free. You do not need to build anything to see it.

---

## Critique & What This Does NOT Do

**What this does:** Opens the site to all users, syncs their study data across devices, adds Google login.

**What this does NOT do:**
- Does NOT add the Posthog analytics from Phase 3 of the PRD (separate task)
- Does NOT fix the bundle size fully (the supabase static import fix helps but the main contributors are the writing analyzer libs — separate task)
- Does NOT add the Word Families / PDF features from the open feature queue (separate task)
- Does NOT set up a custom domain (you can do this in Vercel Settings → Domains)

These are separate and can be done after this launches.

---

## Success Criteria
- [ ] Any new user can sign up with Google or email
- [ ] Signing in uploads their local progress to the cloud
- [ ] Signing in on a second device restores their progress
- [ ] You can see sign-ins in Supabase Auth dashboard
- [ ] Site is live at `og-igcse-malay-master.vercel.app` (or custom domain)
- [ ] `npm run build` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors
