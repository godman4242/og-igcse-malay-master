# Security Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove API keys from the browser bundle and lock down serverless gateways with authentication.

**Architecture:** Four independent security fixes: (1) proxy DeepL + Google Translate calls through a Vercel serverless function so the keys never reach the client bundle; (2) enforce Supabase JWT on the Claude AI Edge Function so only authenticated users can call Claude; (3) verify Supabase session JWTs in the Gemini Vercel function; (4) tighten the Supabase RLS policy on `telemetry_events` to reject unauthenticated inserts. Each task is independently shippable.

**Tech Stack:** Vercel serverless functions (Node.js ESM), Supabase Edge Functions (Deno TypeScript), `@supabase/supabase-js`, React 19 + Zustand for the client side. No new npm packages required — `@supabase/supabase-js` is already a dependency.

---

## File map

| File | Change |
|------|--------|
| `api/translate.js` | **Create** — Vercel serverless proxy for DeepL + Google Translate |
| `src/lib/translate/providers/deepl.js` | **Modify** — route calls through `/api/translate`, replace key-presence check with `VITE_DEEPL_ENABLED` flag |
| `src/lib/translate/providers/google.js` | **Modify** — route calls through `/api/translate`, replace key-presence check with `VITE_GOOGLE_TRANSLATE_ENABLED` flag |
| `supabase/functions/ai-proxy/index.ts` | **Modify** — remove `--no-verify-jwt` comment, update deploy instruction |
| `supabase/functions/ai-proxy/config.toml` | **Create** — enable JWT verification for the Edge Function |
| `src/lib/ai.js` | **Modify** — pass Supabase session JWT instead of anon key |
| `api/gemini.js` | **Modify** — verify Supabase session JWT before proxying to Gemini |
| `.env.example` | **Modify** — document new server-side env vars, remove VITE_ for moved keys |
| `docs/plans/PLANS_STATUS.md` | **Modify** — mark S2/S3/S4/S10 DONE when complete |

---

## Task 1: Translation Proxy — move DeepL + Google keys server-side

**Files:**
- Create: `api/translate.js`
- Modify: `src/lib/translate/providers/deepl.js`
- Modify: `src/lib/translate/providers/google.js`
- Modify: `.env.example`

The proxy accepts `POST /api/translate` with a JSON body `{ provider, texts, from, to }` and returns `{ translations: [{ text }] }`. The client providers call this endpoint instead of the upstream APIs directly. `VITE_DEEPL_KEY` and `VITE_GOOGLE_TRANSLATE_KEY` are replaced by server-only `DEEPL_KEY` and `GOOGLE_TRANSLATE_KEY`.

- [ ] **Step 1: Create `api/translate.js`**

```js
// api/translate.js
// Vercel serverless proxy for DeepL and Google Translate.
// Keeps DEEPL_KEY and GOOGLE_TRANSLATE_KEY out of the client bundle.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { provider, texts, from, to } = req.body ?? {}

  if (!provider || !Array.isArray(texts) || !texts.length || !from || !to) {
    return res.status(400).json({ error: 'Missing required fields: provider, texts[], from, to' })
  }

  if (provider === 'deepl') {
    const key = process.env.DEEPL_KEY
    if (!key) return res.status(503).json({ error: 'DeepL not configured on server' })

    const endpoint = key.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate'

    const body = new URLSearchParams()
    for (const t of texts) body.append('text', t)
    body.set('source_lang', from.toUpperCase())
    body.set('target_lang', to.toUpperCase() === 'EN' ? 'EN-GB' : to.toUpperCase())

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `DeepL error ${upstream.status}` })
    }

    const data = await upstream.json()
    const translations = (data?.translations ?? []).map(t => ({ text: t.text }))
    return res.status(200).json({ translations })
  }

  if (provider === 'google') {
    const key = process.env.GOOGLE_TRANSLATE_KEY
    if (!key) return res.status(503).json({ error: 'Google Translate not configured on server' })

    const chunks = []
    for (let i = 0; i < texts.length; i += 100) chunks.push(texts.slice(i, i + 100))
    const all = []

    for (const chunk of chunks) {
      const upstream = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: chunk, source: from, target: to, format: 'text' }),
        },
      )
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: `Google error ${upstream.status}` })
      }
      const data = await upstream.json()
      all.push(...(data?.data?.translations ?? []).map(t => ({ text: t.translatedText })))
    }

    return res.status(200).json({ translations: all })
  }

  return res.status(400).json({ error: `Unknown provider: ${provider}` })
}
```

- [ ] **Step 2: Update `src/lib/translate/providers/deepl.js`**

Replace the entire file with this proxy-aware version. The key changes are: `VITE_DEEPL_KEY` → `VITE_DEEPL_ENABLED`, and the `call()` function now POSTs to `/api/translate` instead of DeepL directly.

```js
// DeepL via server-side proxy at /api/translate
// Set VITE_DEEPL_ENABLED=true in .env.local when DEEPL_KEY is configured in Vercel.
// The proxy adds the key — nothing secret lives in the browser bundle.

const ENABLED = import.meta.env.VITE_DEEPL_ENABLED === 'true'

const SUPPORTED = new Set([
  'BG','CS','DA','DE','EL','EN','EN-GB','EN-US','ES','ET','FI','FR','HU','ID',
  'IT','JA','KO','LT','LV','NB','NL','PL','PT','PT-BR','PT-PT','RO','RU','SK',
  'SL','SV','TR','UK','ZH',
])

function toDeepLLang(code) {
  if (!code) return null
  const c = code.toUpperCase()
  if (c === 'EN') return 'EN-GB'
  if (SUPPORTED.has(c)) return c
  return null
}

export function isDeepLAvailable() {
  return ENABLED
}

export function isDeepLPairSupported(from, to) {
  return Boolean(toDeepLLang(from) && toDeepLLang(to))
}

async function callProxy(texts, from, to) {
  const sl = toDeepLLang(from)
  const tl = toDeepLLang(to)
  if (!sl || !tl) {
    const err = new Error(`deepl: unsupported pair ${from}->${to}`)
    err.code = 'unsupported'
    throw err
  }

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'deepl', texts, from: sl, to: tl }),
  })
  if (!res.ok) {
    const err = new Error(`deepl proxy ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return data?.translations ?? []
}

export async function deeplTranslateOne(text, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('deepl: not enabled (set VITE_DEEPL_ENABLED=true)')
  const [t] = await callProxy([text], from, to)
  return { text: t?.text ?? text, source: 'deepl', provider: 'deepl' }
}

export async function deeplTranslateBatch(texts, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('deepl: not enabled (set VITE_DEEPL_ENABLED=true)')
  if (!texts.length) return []
  // DeepL accepts up to 50 texts per call; proxy handles chunking
  const chunks = []
  for (let i = 0; i < texts.length; i += 50) chunks.push(texts.slice(i, i + 50))
  const out = []
  for (const chunk of chunks) {
    const tt = await callProxy(chunk, from, to)
    for (let i = 0; i < chunk.length; i++) {
      out.push({ text: tt[i]?.text ?? chunk[i], source: 'deepl', provider: 'deepl' })
    }
  }
  return out
}

export function deeplCompareUrl(text, from = 'ms', to = 'en') {
  const f = (from || 'auto').toLowerCase()
  const t = (to || 'en').toLowerCase()
  return `https://www.deepl.com/translator#${f}/${t}/${encodeURIComponent(text)}`
}
```

- [ ] **Step 3: Update `src/lib/translate/providers/google.js`**

Replace the entire file:

```js
// Google Cloud Translation v2 via server-side proxy at /api/translate
// Set VITE_GOOGLE_TRANSLATE_ENABLED=true when GOOGLE_TRANSLATE_KEY is in Vercel.

const ENABLED = import.meta.env.VITE_GOOGLE_TRANSLATE_ENABLED === 'true'

export function isGoogleAvailable() {
  return ENABLED
}

async function callProxy(texts, from, to) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google', texts, from, to }),
  })
  if (!res.ok) {
    const err = new Error(`google proxy ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return data?.translations ?? []
}

export async function googleTranslateOne(text, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('google: not enabled (set VITE_GOOGLE_TRANSLATE_ENABLED=true)')
  const [t] = await callProxy([text], from, to)
  return { text: t?.text ?? text, source: 'google', provider: 'google' }
}

export async function googleTranslateBatch(texts, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('google: not enabled (set VITE_GOOGLE_TRANSLATE_ENABLED=true)')
  if (!texts.length) return []
  const tt = await callProxy(texts, from, to)
  return tt.map((t, i) => ({ text: t?.text ?? texts[i], source: 'google', provider: 'google' }))
}

export function googleCompareUrl(text, from = 'ms', to = 'en') {
  return `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text)}&op=translate`
}
```

- [ ] **Step 4: Update `.env.example`**

Find the Translation providers section:
```
# ───── Translation providers ─────
# Google Cloud Translation v2 — https://cloud.google.com/translate/docs
VITE_GOOGLE_TRANSLATE_KEY=

# DeepL Free or Pro — https://www.deepl.com/pro-api
VITE_DEEPL_KEY=
```

Replace with:
```
# ───── Translation providers ─────
# Keys now live SERVER-SIDE in Vercel environment variables (not VITE_ prefixed).
# Set DEEPL_KEY and GOOGLE_TRANSLATE_KEY in your Vercel project settings.
# Then flip the VITE_ flags below to true so the client knows the provider is active.

# Set to "true" when DEEPL_KEY is configured in Vercel
VITE_DEEPL_ENABLED=false

# Set to "true" when GOOGLE_TRANSLATE_KEY is configured in Vercel
VITE_GOOGLE_TRANSLATE_ENABLED=false

# For local dev: add these to .env.local (gitignored) and Vercel will read them
# DEEPL_KEY=your-deepl-key-here
# GOOGLE_TRANSLATE_KEY=your-google-key-here
```

- [ ] **Step 5: Build and verify**

```bash
npm run build
```
Expected: zero errors. Confirm neither `DEEPL_KEY` nor `GOOGLE_TRANSLATE_KEY` nor `VITE_DEEPL_KEY` nor `VITE_GOOGLE_TRANSLATE_KEY` appear in the output bundle:
```bash
grep -r "DEEPL_KEY\|GOOGLE_TRANSLATE_KEY" dist/ 2>/dev/null | grep -v ".map" || echo "✓ No keys in bundle"
```
Expected: `✓ No keys in bundle`

- [ ] **Step 6: Commit**

```bash
git add api/translate.js src/lib/translate/providers/deepl.js src/lib/translate/providers/google.js .env.example
git commit -m "feat(security): proxy DeepL+Google translate through Vercel function, remove VITE_ keys"
```

---

## Task 2: Supabase Edge Function JWT enforcement

**Files:**
- Create: `supabase/functions/ai-proxy/config.toml`
- Modify: `supabase/functions/ai-proxy/index.ts` (deploy comment only)
- Modify: `src/lib/ai.js`

When `verify_jwt = true` is set in `config.toml`, Supabase's Edge Runtime automatically rejects requests without a valid JWT before the function even runs. The client must send a session access token instead of the anon key. Guest/static users who have no Supabase session will receive a `401` from the platform.

- [ ] **Step 1: Create `supabase/functions/ai-proxy/config.toml`**

```toml
[functions.ai-proxy]
verify_jwt = true
```

- [ ] **Step 2: Update the deploy comment in `supabase/functions/ai-proxy/index.ts`**

Find line 6:
```ts
 * Deploy: supabase functions deploy ai-proxy --no-verify-jwt
```
Replace with:
```ts
 * Deploy: supabase functions deploy ai-proxy
```

- [ ] **Step 3: Update `src/lib/ai.js` to pass the session JWT**

The `callAI` function currently sends `Authorization: Bearer ${SUPABASE_CONFIG.key}` (the public anon key). Replace this with the user's session access token.

Find the `callAI` function. Just before the `try {` block that performs the fetch (around line 149), add session token retrieval:

Find:
```js
  const url = `${baseUrl}/functions/v1/ai-proxy`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
      },
```

Replace with:
```js
  const url = `${baseUrl}/functions/v1/ai-proxy`;

  // Get the user's session token for JWT-verified Edge Function auth.
  // Authenticated (enhanced) users send their session JWT; guests have none
  // and will receive a 401 from Supabase before the function runs.
  let authToken = SUPABASE_CONFIG.key // anon key fallback (guest path)
  try {
    const { getSupabase } = await import('../config/supabase')
    const client = getSupabase()
    if (client) {
      const { data } = await client.auth.getSession()
      if (data?.session?.access_token) {
        authToken = data.session.access_token
      }
    }
  } catch { /* no session — use anon key fallback */ }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```
Expected: zero errors.

- [ ] **Step 5: Deploy the Edge Function (run in terminal)**

```bash
supabase functions deploy ai-proxy
```
Expected: deploys without `--no-verify-jwt`. After this, unauthenticated calls to the Edge Function will return `401`.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/ai-proxy/config.toml supabase/functions/ai-proxy/index.ts src/lib/ai.js
git commit -m "feat(security): enforce JWT on ai-proxy Edge Function, pass session token from client"
```

---

## Task 3: Gemini Vercel proxy — Supabase JWT verification

**Files:**
- Modify: `api/gemini.js`
- Modify: `.env.example`

The Vercel function verifies the caller's Supabase session JWT using the Supabase Admin client (via `SUPABASE_SERVICE_ROLE_KEY` — a server-only env var). `@supabase/supabase-js` is already installed.

- [ ] **Step 1: Update `api/gemini.js`**

Replace the entire file:

```js
// api/gemini.js
// Vercel serverless proxy for Google Gemini.
// Requires a valid Supabase session JWT in the Authorization header.
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Auth: verify Supabase session JWT ──────────────────────
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — session required' })
  }
  const token = authHeader.slice(7)

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('SERVER ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    return res.status(500).json({ error: 'Server auth not configured' })
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  // ── Proxy to Gemini ────────────────────────────────────────
  const key = process.env.GEMINI_KEY
  if (!key) {
    console.error('SERVER ERROR: GEMINI_KEY missing from environment')
    return res.status(500).json({ error: 'AI service not configured on server' })
  }

  const model = 'gemini-2.0-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (err) {
    console.error('FETCH ERROR:', err)
    return res.status(500).json({ error: 'Failed to reach AI service', details: err.message })
  }
}
```

- [ ] **Step 2: Update `src/lib/gemini.js` to pass the session JWT**

Open `src/lib/gemini.js`. Find where it calls `/api/gemini` (the `fetch('/api/gemini', ...)` call). Add the Authorization header with the session token.

Find the fetch call — it will look like:
```js
const response = await fetch('/api/gemini', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
  signal,
})
```

Replace with:
```js
// Attach session JWT so the proxy can verify the caller
let authHeader = ''
try {
  const { getSupabase } = await import('../config/supabase')
  const client = getSupabase()
  if (client) {
    const { data } = await client.auth.getSession()
    if (data?.session?.access_token) {
      authHeader = `Bearer ${data.session.access_token}`
    }
  }
} catch { /* no session */ }

const response = await fetch('/api/gemini', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(authHeader ? { 'Authorization': authHeader } : {}),
  },
  body: JSON.stringify(payload),
  signal,
})
```

- [ ] **Step 3: Update `.env.example` with Vercel server-side vars**

Add a new section after the Supabase section:

```
# ───── Vercel server-side env vars (NOT VITE_ — never exposed to the browser) ─────
# Set these in your Vercel project settings → Environment Variables.
# These are also needed locally in .env.local for `vercel dev`.

# Supabase service role key (for JWT verification in api/gemini.js and future proxies)
# Find it in Supabase → Project Settings → API → service_role key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add api/gemini.js src/lib/gemini.js .env.example
git commit -m "feat(security): require Supabase session JWT in Gemini Vercel proxy"
```

---

## Task 4: RLS — restrict telemetry_events to authenticated users

**Files:**
- Create: `supabase/migrations/20260518_telemetry_rls.sql`

This is a SQL-only change. The migration adds an `authenticated`-only INSERT policy to `telemetry_events`, replacing the existing `WITH CHECK (true)` policy that allows unauthenticated writes.

- [ ] **Step 1: Create the migration file**

```bash
mkdir -p "/Users/kheshav/Kheshav/kheshav code/og igcse malay master/supabase/migrations"
```

Create `supabase/migrations/20260518_telemetry_rls.sql`:

```sql
-- Migration: restrict telemetry_events INSERT to authenticated users only.
-- Replaces the open "WITH CHECK (true)" policy that allowed unauthenticated spam.

-- Drop the old permissive insert policy if it exists
DROP POLICY IF EXISTS "Anyone can insert telemetry" ON telemetry_events;

-- New policy: only logged-in users may insert telemetry
CREATE POLICY "Authenticated users can insert telemetry"
  ON telemetry_events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply the migration via Supabase CLI (run in terminal)**

```bash
supabase db push
```
Expected: migration applies cleanly. Or apply it manually via the Supabase SQL editor if the CLI isn't connected.

**Alternatively — apply directly in the Supabase SQL editor:**

Open the Supabase dashboard → SQL Editor → New query. Paste and run:

```sql
DROP POLICY IF EXISTS "Anyone can insert telemetry" ON telemetry_events;

CREATE POLICY "Authenticated users can insert telemetry"
  ON telemetry_events
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

- [ ] **Step 3: Verify via Supabase dashboard**

In the Supabase dashboard: Table Editor → `telemetry_events` → Policies. Confirm:
- The old `"Anyone can insert telemetry"` policy is gone.
- The new `"Authenticated users can insert telemetry"` policy with `WITH CHECK (auth.role() = 'authenticated')` is present.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260518_telemetry_rls.sql
git commit -m "fix(security): restrict telemetry_events INSERT to authenticated users (RLS)"
```

---

## Post-completion checklist

After all 4 tasks are committed and deployed:

- [ ] Set `DEEPL_KEY` and `GOOGLE_TRANSLATE_KEY` in Vercel → Environment Variables (not VITE_)
- [ ] Set `VITE_DEEPL_ENABLED=true` and/or `VITE_GOOGLE_TRANSLATE_ENABLED=true` in Vercel env vars to re-enable those providers
- [ ] Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel → Environment Variables
- [ ] Remove `VITE_DEEPL_KEY` and `VITE_GOOGLE_TRANSLATE_KEY` from Vercel env vars (no longer needed)
- [ ] Rotate `VITE_DEEPL_KEY` and `VITE_GOOGLE_TRANSLATE_KEY` in DeepL/Google consoles (they were exposed, so treat them as compromised)
- [ ] Redeploy on Vercel to pick up all env var changes
- [ ] Test translation in the deployed app (Import page, tap-to-translate)
- [ ] Test AI chat in the deployed app as an authenticated (enhanced) user
- [ ] Update `docs/plans/PLANS_STATUS.md` — mark S2, S3, S4, S10 as DONE
