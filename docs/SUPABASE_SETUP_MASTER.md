# Supabase Database Setup & AI Quality Assurance Guidelines

This document serves as the absolute master authority for the Supabase database schema and the engineering quality assurance guidelines for the **IGCSE Malay Master** codebase. 

---

## 🗄️ PART 1: Unified Supabase SQL Schema (100% Verified)

The following SQL script is surgically matched to every single `.from('table')` and column reference inside `src/config/supabase.js`. Executing this single script will initialize every table, index, and Row-Level Security (RLS) policy required for the system to run.

```sql
-- ============================================================================
-- IGCSE Malay Master — Master Supabase Schema Setup (One-Click Setup)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ALLOWED USERS (Invite-only list for gating access)
CREATE TABLE IF NOT EXISTS allowed_users (
  email       TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('enhanced', 'admin')),
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  invited_by  TEXT NOT NULL
);
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read allowlist" ON allowed_users;
CREATE POLICY "Authenticated can read allowlist" ON allowed_users FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Owner can manage allowlist" ON allowed_users;
CREATE POLICY "Owner can manage allowlist" ON allowed_users FOR ALL USING (auth.jwt() ->> 'email' = 'kheshav0@gmail.com');

-- 2. USER PROFILES (Syncs UDL user preferences)
CREATE TABLE IF NOT EXISTS profiles (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_interests         JSONB NOT NULL DEFAULT '[]'::jsonb,
  dyslexic_font          BOOLEAN NOT NULL DEFAULT FALSE,
  high_contrast          BOOLEAN NOT NULL DEFAULT FALSE,
  show_dictionary_images BOOLEAN NOT NULL DEFAULT TRUE,
  identity               JSONB DEFAULT NULL,
  exam_date              DATE DEFAULT NULL,
  theme                  TEXT DEFAULT NULL,
  daily_goal             INTEGER DEFAULT NULL,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- 3. USER STATE (Zustand FSRS Spaced-Repetition State Blob Sync)
CREATE TABLE IF NOT EXISTS user_state (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state         JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_version INTEGER NOT NULL DEFAULT 19,
  byte_size     INTEGER GENERATED ALWAYS AS (octet_length(state::text)) STORED,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own state" ON user_state;
CREATE POLICY "Users read own state" ON user_state FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users write own state" ON user_state;
CREATE POLICY "Users write own state" ON user_state FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own state" ON user_state;
CREATE POLICY "Users update own state" ON user_state FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own state" ON user_state;
CREATE POLICY "Users delete own state" ON user_state FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_state_updated ON user_state(updated_at);

-- 4. TELEMETRY EVENTS (Anonymous logs for activity analysis)
CREATE TABLE IF NOT EXISTS telemetry_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert telemetry" ON telemetry_events;
CREATE POLICY "Anyone can insert telemetry" ON telemetry_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Only authenticated can read telemetry" ON telemetry_events;
CREATE POLICY "Only authenticated can read telemetry" ON telemetry_events FOR SELECT USING (auth.role() = 'authenticated');

-- 5. TRANSLATIONS (Shared vocabulary translation cache)
CREATE TABLE IF NOT EXISTS translations (
  key         TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  source      TEXT NOT NULL,
  provider    TEXT NOT NULL,
  lang_from   TEXT NOT NULL,
  lang_to     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read translations" ON translations;
CREATE POLICY "Anyone can read translations" ON translations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can insert translations" ON translations;
CREATE POLICY "Authenticated can insert translations" ON translations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated can update translations" ON translations;
CREATE POLICY "Authenticated can update translations" ON translations FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 6. ADMIN INITIALIZATION (Insert owner email directly)
-- ============================================================================
INSERT INTO allowed_users (email, role, invited_by)
VALUES ('kheshav0@gmail.com', 'admin', 'kheshav0@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

---

## 🔬 PART 2: Database-to-Frontend Code Mapping

To verify the schema integrity, here are the direct mappings to `src/config/supabase.js`:

| Table Name | Code Query Path | Purpose |
| :--- | :--- | :--- |
| **`allowed_users`** | `client.from('allowed_users')` | Checks access privileges on auth trigger in `checkUserRole()`. |
| **`profiles`** | `client.from('profiles')` | Stores and reads UDL styles in `fetchUserProfile()` / `upsertUserProfile()`. |
| **`user_state`** | `client.from('user_state')` | Backs up FSRS scheduling and mistake data in `pushStateBlob()` / `pullStateBlob()`. |
| **`telemetry_events`**| `client.from('telemetry_events')` | Logs engagement parameters in `sendTelemetryEvent()`. |
| **`translations`** | `client.from('translations')` | Caches DeepL/Google API results in `writeCloudTranslation()`. |

---

## 🚫 PART 3: Anti-Hallucination & Quality Control Guidelines

To maintain absolute flawless execution and prevent any AI agent (including terminal subagents or models) from generating hallucinated solutions:

### 1. The Verification Mandate
*   **NEVER** skip verification. Any model making modifications to the repository code MUST immediately execute:
    ```bash
    npm run build
    ```
*   The build step must achieve **zero errors**. Any compilation warning or error is treated as a failed task.

### 2. State-Hook Isolation Rules
*   Do not instantiate inline arrays or nested loops directly in Zustand store selectors.
*   Always wrap async updates in functional state setters (`setMyState(prev => ...)`).
*   Always clear active global SpeechRecognition instances and SpeechSynthesis queues on unmount triggers.

### 3. Structural Diff Rules
*   When editing files, models must retrieve exact line numbers via `grep` or `view_file` before making code changes.
*   **NEVER** perform full-file rewrites for minor bug fixes or API updates.
*   Always stage, verify, and commit changes incrementally using atomic commits.
