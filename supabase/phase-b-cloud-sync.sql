-- Phase B cloud sync tables for the upgraded IGCSE Malay app.
-- Run this in the Supabase SQL editor after the base allowed_users and
-- telemetry_events tables are in place.

CREATE TABLE IF NOT EXISTS translations (
  key TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  source TEXT NOT NULL,
  provider TEXT NOT NULL,
  lang_from TEXT NOT NULL,
  lang_to TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_key TEXT NOT NULL,
  card JSONB NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, card_key)
);

CREATE TABLE IF NOT EXISTS writing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL,
  entry JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entry_id)
);

CREATE TABLE IF NOT EXISTS speaking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL,
  entry JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entry_id)
);

CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS user_cards_user_updated_idx ON user_cards (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS writing_history_user_created_idx ON writing_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS speaking_history_user_created_idx ON speaking_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sync_events_user_created_idx ON sync_events (user_id, created_at DESC);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read translations" ON translations;
DROP POLICY IF EXISTS "Authenticated can insert translations" ON translations;
DROP POLICY IF EXISTS "Authenticated can update translations" ON translations;
CREATE POLICY "Anyone can read translations" ON translations FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert translations" ON translations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update translations" ON translations FOR UPDATE USING (auth.role() = 'authenticated');

ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own cards" ON user_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON user_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON user_cards;
CREATE POLICY "Users can read own cards" ON user_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON user_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON user_cards FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE writing_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own writing history" ON writing_history;
DROP POLICY IF EXISTS "Users can insert own writing history" ON writing_history;
DROP POLICY IF EXISTS "Users can update own writing history" ON writing_history;
CREATE POLICY "Users can read own writing history" ON writing_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own writing history" ON writing_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own writing history" ON writing_history FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE speaking_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own speaking history" ON speaking_history;
DROP POLICY IF EXISTS "Users can insert own speaking history" ON speaking_history;
DROP POLICY IF EXISTS "Users can update own speaking history" ON speaking_history;
CREATE POLICY "Users can read own speaking history" ON speaking_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own speaking history" ON speaking_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own speaking history" ON speaking_history FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own sync events" ON sync_events;
DROP POLICY IF EXISTS "Users can insert own sync events" ON sync_events;
DROP POLICY IF EXISTS "Users can update own sync events" ON sync_events;
CREATE POLICY "Users can read own sync events" ON sync_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sync events" ON sync_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sync events" ON sync_events FOR UPDATE USING (auth.uid() = user_id);
