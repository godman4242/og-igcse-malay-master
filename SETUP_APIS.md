# SETUP_APIS.md — Zero-Friction API Key Playbook

> Use this when starting a fresh machine, rotating keys, or onboarding a
> teammate. Every step is "open this URL → copy this field → paste into
> `.env.local`". You should never have to leave the doc to figure out what
> to do next.

## TL;DR — what you do

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Open .env.local in your editor and paste the values listed below.

# 3. Verify everything works
npm run test:connections
```

A passing run looks like:

```
✓ PASS  Supabase       host reachable, REST returned 200
✓ PASS  Gemini         replied "ok"
— SKIP  OpenRouter     VITE_OPENROUTER_KEY not set (optional)
```

---

## Current state of `.env.local` (audit, 2026-05-15)

| Key                          | Status      | What it unlocks                                         |
|------------------------------|-------------|---------------------------------------------------------|
| `VITE_GEMINI_KEY`            | **SET**     | Cikgu Maya AI, writing grader, speaking grader          |
| `VITE_SUPABASE_URL`          | **MISSING** | Auth, cloud sync (cards, writing, speaking, profile)    |
| `VITE_SUPABASE_KEY`          | **MISSING** | Same as above — anon public key for the JS client       |
| `VITE_OPENROUTER_KEY`        | MISSING     | Free-model fallback (DeepSeek / Llama / Gemma) — optional |
| `VITE_GOOGLE_TRANSLATE_KEY`  | MISSING     | Higher-quality translate fallback — optional            |
| `VITE_DEEPL_KEY`             | MISSING     | Preferred translator when set — optional                |
| `VITE_CLAUDE_API_KEY`        | MISSING     | Claude proxy via Supabase Edge Function — optional      |
| `VITE_AI_MOCK`               | n/a         | Set `true` for canned responses (no real API calls)     |

> **Lights that turn on with each key**
> - Add Supabase pair → Auth modal, allowed_users gate, telemetry, cloud sync queue drains, **UDL profile sync (Star Topics)**.
> - Add Gemini → Cikgu Maya AI tier 1, writing grader, speaking grader.
> - Add OpenRouter → Cikgu Maya tier 2 fallback when Gemini is rate-limited.

---

## 1. Supabase (Auth + DB) — REQUIRED for cloud features

**Why missing matters:** Without this, the app is fully offline-only.
Star Topics, mistake journal, speaking history etc. all stay local
and you cannot log in or invite users.

### Step 1 — open the dashboard
> https://supabase.com/dashboard/projects

If you don't have a project yet, click **New project** and pick a region
close to KL (Singapore recommended).

### Step 2 — copy the two values

Open **Project Settings → API** (left sidebar, gear icon).

| In Supabase                              | Paste into `.env.local` as |
|------------------------------------------|----------------------------|
| **Project URL** (under "Project URL")    | `VITE_SUPABASE_URL=`       |
| **`anon` `public` key** (under "Project API Keys") | `VITE_SUPABASE_KEY=` |

> ⚠️ Use the **anon** key, not the `service_role` key. The service_role
> key bypasses RLS and must never reach the browser bundle.

### Step 3 — run the schema migration

The full SQL lives in `src/config/supabase.js` as the exported
`SCHEMA_SQL` constant. To run it:

1. In Supabase dashboard → **SQL Editor → + New query**.
2. Paste the entire `SCHEMA_SQL` block (it's idempotent — safe to re-run).
3. Hit **Run**.

This creates: `allowed_users`, `telemetry_events`, `translations`,
`user_cards`, `writing_history`, `speaking_history`, `sync_events`, and
**`profiles`** (added 2026-05-15 to support the UDL Star Topics feature
and other per-user preference sync).

### Step 4 — allowlist yourself

```sql
INSERT INTO allowed_users (email, role, invited_by)
VALUES ('kheshav0@gmail.com', 'admin', 'kheshav0@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

(The owner email `kheshav0@gmail.com` is hard-coded to bypass the
allowlist in `checkUserRole`, but adding a row makes the row-level
policies predictable for testing.)

### What the new `profiles` table stores

| Column                   | Source in store           | Notes                                           |
|--------------------------|---------------------------|-------------------------------------------------|
| `user_id` (PK, FK)       | auth.users.id             |                                                 |
| `user_interests` (jsonb) | `state.userInterests`     | Star Topics — UDL Principle 1                   |
| `dyslexic_font` (bool)   | `state.dyslexicFont`      | UDL Principle 1 (Theme Choice)                  |
| `high_contrast` (bool)   | `state.highContrast`      | UDL Principle 1 (Theme Choice)                  |
| `show_dictionary_images` | `state.showDictionaryImages` | Visual Dictionary toggle                     |
| `identity` (jsonb)       | `state.identity`          | idealSelf / label / cue                         |
| `exam_date` (date)       | `state.examDate`          | Exam countdown                                  |
| `theme` (text)           | `state.theme`             | dark / light                                    |
| `daily_goal` (int)       | `state.dailyGoal`         |                                                 |
| `updated_at` (tz)        | auto                      |                                                 |

Sync flow: `toggleUserInterest` → `enqueueSyncEventAction('profile_updated', …)`
→ `processCloudSyncEvent` → `upsertUserProfile` → `profiles` table.
Local-first, offline-safe, idempotent.

---

## 2. Gemini (Google Generative Language API) — RECOMMENDED

**Why:** Free tier is generous (15 RPM, 1M tokens/day on
`gemini-2.0-flash`). This is the default for Cikgu Maya, writing grader,
and speaking grader.

### Step 1 — open AI Studio
> https://aistudio.google.com/app/apikey

(Sign in with the Google account you want billing tied to — free tier
is fine.)

### Step 2 — create a key

Click **Create API key**. Use the project Google attached you to by
default — no need to pick anything.

| In AI Studio       | Paste into `.env.local` as |
|--------------------|----------------------------|
| **API key** string | `VITE_GEMINI_KEY=`         |

### Step 3 — restrict the key (production only)

In the **Google Cloud Console → APIs & Services → Credentials**, edit
the key:

- **API restrictions:** "Restrict key" → enable **Generative Language API** only.
- **Application restrictions:** "HTTP referrers" → add your deploy URL
  (e.g. `https://igcse-malay.app/*`) and `http://localhost:5173/*` for dev.

> Vite inlines `VITE_*` vars into the production bundle. If you skip
> the referrer restriction, anyone who views the deployed JS can use
> your key.

---

## 3. OpenRouter — OPTIONAL (fallback when Gemini is rate-limited)

### Step 1 — open the keys page
> https://openrouter.ai/keys

### Step 2 — create a key

Click **Create Key**. Free models do not require credit.

| In OpenRouter      | Paste into `.env.local` as |
|--------------------|----------------------------|
| **Key** value      | `VITE_OPENROUTER_KEY=`     |

Free models used (ordered by quality): `deepseek/deepseek-r1-0528:free`,
`meta-llama/llama-4-scout:free`, `google/gemma-3-1b-it:free`. The router
tries them in order until one returns content.

---

## 4. DeepL / Google Translate — OPTIONAL

Only worth setting if the unauthenticated `gtx` fallback starts
returning rubbish or rate-limiting you.

| Provider | Dashboard | Field name in `.env.local` |
|----------|-----------|----------------------------|
| DeepL Free / Pro | https://www.deepl.com/pro-api → **Account → Your authentication key** | `VITE_DEEPL_KEY` |
| Google Cloud Translation v2 | https://console.cloud.google.com/apis/credentials → **API Keys** | `VITE_GOOGLE_TRANSLATE_KEY` |

---

## 5. Claude API via Supabase Edge Function — OPTIONAL (advanced)

Only needed when you want the Cikgu Maya tutor to use Claude as the
primary backend (paid, higher quality than Gemini for nuanced tasks).

The function code lives in `supabase/functions/ai-proxy/`. Deploy it
with the Supabase CLI:

```bash
supabase functions deploy ai-proxy --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
```

Anthropic key: https://console.anthropic.com/settings/keys → **Create Key**.

The browser never sees the Anthropic key — it only talks to the Edge
Function with the Supabase anon key.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `npm run test:connections` shows Supabase as FAIL with HTTP 4xx | Wrong project URL or key from a different project | Re-copy both from the same Project Settings page. |
| Gemini FAIL with HTTP 400 `API_KEY_INVALID` | Key restricted to wrong API or wrong referrer | Cloud Console → edit credential → broaden API restrictions to "Generative Language API" only. |
| Gemini FAIL with HTTP 429 | Hit free-tier quota | Wait an hour OR add `VITE_OPENROUTER_KEY` so the router can fall back. |
| OpenRouter FAIL with HTTP 401 | Key revoked or wrong account | Regenerate at https://openrouter.ai/keys. |
| Profile rows not appearing in Supabase | Not logged in OR allowlist row missing | Magic-link login first, then `SELECT * FROM allowed_users` to confirm membership. |
| App still feels "offline" after keys added | Vite caches env on dev start | Stop `npm run dev`, edit `.env.local`, restart. |

## Security reminders

- **Never** paste a real key into chat, screenshots, or commit messages.
- The `.env.local` file is gitignored — if you accidentally commit one,
  rotate every key in it immediately, then `git rm --cached`.
- `VITE_*` vars are embedded in the production bundle. Treat them as
  public — restrict at the provider level.
