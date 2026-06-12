-- ============================================================================
-- IGCSE Malay Master — One-Click Supabase Setup
-- ============================================================================
-- Copy this entire file into the Supabase SQL Editor and click RUN.
-- Idempotent: safe to re-run after every schema change. Existing data is
-- preserved (every CREATE uses IF NOT EXISTS; every POLICY is dropped &
-- recreated).
--
-- What this creates:
--   1. allowed_users       — invite-only allowlist (admin/enhanced roles)
--   2. profiles            — UDL preferences + Star Topics (per-user row)
--   3. user_cards          — flashcard deck (FSRS state per card)
--   4. writing_history     — Paper 2 essay grades + feedback
--   5. speaking_history    — Paper 3 oral grades + feedback
--   6. sync_events         — offline-first sync queue archive
--   7. translations        — shared translation cache (any → any)
--   8. telemetry_events    — anonymous usage events (admin/owner only)
--   9. api_usage_counters  — per-uid daily caps for the Vercel proxies (service-role only)
--
-- Every table has Row-Level Security ON. Default deny; explicit allow per row.
--
-- After running this, do step 2 at the bottom of this file (allowlist insert).
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 0. Prerequisites: ensure crypto + uuid extensions are available
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ────────────────────────────────────────────────────────────────────────────
-- 1. allowed_users  — gates auth. Owner email bypasses in checkUserRole().
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS allowed_users (
  email       TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('enhanced', 'admin')),
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  invited_by  TEXT NOT NULL
);

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read allowlist" ON allowed_users;
DROP POLICY IF EXISTS "Owner can manage allowlist"      ON allowed_users;
CREATE POLICY "Authenticated can read allowlist"
  ON allowed_users FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Owner can manage allowlist"
  ON allowed_users FOR ALL
  USING (auth.jwt() ->> 'email' = 'kheshav0@gmail.com');


-- ────────────────────────────────────────────────────────────────────────────
-- 2. profiles  — UDL preferences per authenticated user (Star Topics live here)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_interests         JSONB    NOT NULL DEFAULT '[]'::jsonb,   -- Star Topics (UDL P1)
  dyslexic_font          BOOLEAN  NOT NULL DEFAULT FALSE,         -- UDL P1 Theme Choice
  high_contrast          BOOLEAN  NOT NULL DEFAULT FALSE,         -- UDL P1 Theme Choice
  show_dictionary_images BOOLEAN  NOT NULL DEFAULT TRUE,          -- Visual Dictionary toggle
  identity               JSONB,                                   -- idealSelf / label / cue
  exam_date              DATE,                                    -- Exam countdown
  theme                  TEXT,                                    -- 'dark' | 'light'
  daily_goal             INTEGER,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can read own profile"   ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 3. user_cards  — flashcard deck + FSRS scheduling state (the deck of truth)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_key    TEXT NOT NULL,                                       -- '{malay}::{topic}'
  card        JSONB NOT NULL,                                      -- full FSRS state + dict fields
  deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, card_key)
);

CREATE INDEX IF NOT EXISTS user_cards_user_updated_idx
  ON user_cards (user_id, updated_at DESC);

ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own cards"   ON user_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON user_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON user_cards;
CREATE POLICY "Users can read own cards"   ON user_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON user_cards FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 4. writing_history  — Paper 2 essay grades (Gemini-backed AI grader)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS writing_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id    TEXT NOT NULL,
  entry       JSONB NOT NULL,                                      -- { ts, lang, format, words, band, ... }
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS writing_history_user_created_idx
  ON writing_history (user_id, created_at DESC);

ALTER TABLE writing_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own writing history"   ON writing_history;
DROP POLICY IF EXISTS "Users can insert own writing history" ON writing_history;
DROP POLICY IF EXISTS "Users can update own writing history" ON writing_history;
CREATE POLICY "Users can read own writing history"   ON writing_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own writing history" ON writing_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own writing history" ON writing_history FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 5. speaking_history  — Paper 3 oral roleplay grades
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS speaking_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id    TEXT NOT NULL,
  entry       JSONB NOT NULL,                                      -- { ts, scenarioId, turnIndex, band, ... }
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS speaking_history_user_created_idx
  ON speaking_history (user_id, created_at DESC);

ALTER TABLE speaking_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own speaking history"   ON speaking_history;
DROP POLICY IF EXISTS "Users can insert own speaking history" ON speaking_history;
DROP POLICY IF EXISTS "Users can update own speaking history" ON speaking_history;
CREATE POLICY "Users can read own speaking history"   ON speaking_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own speaking history" ON speaking_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own speaking history" ON speaking_history FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 6. sync_events  — offline-first event queue archive (idempotent replay)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key  TEXT NOT NULL,
  event_type       TEXT NOT NULL,                                  -- 'card_added' | 'profile_updated' | ...
  payload          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS sync_events_user_created_idx
  ON sync_events (user_id, created_at DESC);

ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own sync events"   ON sync_events;
DROP POLICY IF EXISTS "Users can insert own sync events" ON sync_events;
DROP POLICY IF EXISTS "Users can update own sync events" ON sync_events;
CREATE POLICY "Users can read own sync events"   ON sync_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync events" ON sync_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sync events" ON sync_events FOR UPDATE USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 7. translations  — shared cache so users don't pay for the same translation twice
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS translations (
  key         TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  source      TEXT NOT NULL,                                       -- raw provider tag
  provider    TEXT NOT NULL,                                       -- normalised provider
  lang_from   TEXT NOT NULL,
  lang_to     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read translations"           ON translations;
DROP POLICY IF EXISTS "Authenticated can insert translations"  ON translations;
DROP POLICY IF EXISTS "Authenticated can update translations"  ON translations;
CREATE POLICY "Anyone can read translations"           ON translations FOR SELECT USING (true);
-- Insert-only cache: NO update policy — first write per key wins, so a
-- malicious account can't overwrite good cached entries (the client upsert
-- swallows the conflict failure by design). created_by pinned to the caller.
CREATE POLICY "Authenticated can insert translations"
  ON translations FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND length(key) <= 600
    AND length(text) <= 20000
    AND created_by = auth.uid()
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 8. telemetry_events  — anonymous analytics (insert by anyone, read by auth)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert telemetry"          ON telemetry_events;
DROP POLICY IF EXISTS "Anyone can insert sane telemetry"     ON telemetry_events;
DROP POLICY IF EXISTS "Only authenticated can read telemetry" ON telemetry_events;
-- Scoped insert (was WITH CHECK (true)): short event names, object payloads,
-- ≤8 KB — blunts flood/poison junk while keeping guest telemetry working.
CREATE POLICY "Anyone can insert sane telemetry"
  ON telemetry_events FOR INSERT
  WITH CHECK (
    length(event_type) <= 64
    AND jsonb_typeof(payload) = 'object'
    AND pg_column_size(payload) <= 8192
  );
CREATE POLICY "Only authenticated can read telemetry"
  ON telemetry_events FOR SELECT USING (auth.role() = 'authenticated');


-- ────────────────────────────────────────────────────────────────────────────
-- 9. api_usage_counters  — per-uid daily caps for the Vercel proxies.
--    Service-role only: RLS ON with NO policies (clients can't read/write);
--    the RPC is revoked from client roles. See
--    supabase/migrations/20260612_api_usage_counters.sql (canonical).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage_counters (
  uid       UUID NOT NULL,
  day       DATE NOT NULL DEFAULT CURRENT_DATE,
  endpoint  TEXT NOT NULL,
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day, endpoint)
);

ALTER TABLE api_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION increment_api_usage(p_uid UUID, p_endpoint TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_count INTEGER;
BEGIN
  INSERT INTO api_usage_counters (uid, day, endpoint, count)
  VALUES (p_uid, CURRENT_DATE, p_endpoint, 1)
  ON CONFLICT (uid, day, endpoint)
  DO UPDATE SET count = api_usage_counters.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_api_usage(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE api_usage_counters FROM anon, authenticated;


-- ============================================================================
-- STEP 2 (after run): Allowlist yourself.
-- ============================================================================
-- Uncomment this block ONCE, run it, then re-comment so future re-runs of
-- this file don't keep re-inserting. The ON CONFLICT clause makes it safe
-- even if you forget.

-- INSERT INTO allowed_users (email, role, invited_by)
-- VALUES ('kheshav0@gmail.com', 'admin', 'kheshav0@gmail.com')
-- ON CONFLICT (email) DO NOTHING;


-- ============================================================================
-- VERIFICATION QUERIES (paste below the file above and run to confirm)
-- ============================================================================
--
-- 1. All 8 tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' ORDER BY table_name;
--
-- 2. RLS is ON for every table:
--    SELECT relname, relrowsecurity
--    FROM pg_class WHERE relnamespace = 'public'::regnamespace
--      AND relkind = 'r' ORDER BY relname;
--
-- 3. Policies are in place:
--    SELECT schemaname, tablename, policyname FROM pg_policies
--    WHERE schemaname = 'public' ORDER BY tablename, policyname;
