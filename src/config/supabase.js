/**
 * Supabase configuration and client initialization
 * Phase 1: Backend integration for user accounts, cloud sync, analytics
 *
 * SETUP INSTRUCTIONS:
 * 1. Create account at https://supabase.com
 * 2. Create new project (free tier)
 * 3. Copy SUPABASE_URL and SUPABASE_KEY from Settings > API
 * 4. Add to .env.local:
 *    VITE_SUPABASE_URL=https://xxx.supabase.co
 *    VITE_SUPABASE_KEY=eyJxxx
 * 5. Run migrations: npm run db:migrate (Phase 1)
 */

// This is a placeholder for Phase 1 implementation
// When ready, install: npm install @supabase/supabase-js

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  key: import.meta.env.VITE_SUPABASE_KEY || '',
  enabled: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY)
}

/**
 * Call a Supabase Edge Function with optional streaming support.
 * Used by the AI service layer (src/lib/ai.js).
 *
 * @param {string} functionName - Edge function name (e.g. 'ai-proxy')
 * @param {Object} body - JSON body to send
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] - AbortController signal
 * @returns {Promise<Response>} Raw fetch Response (caller handles streaming/JSON)
 */
export async function callEdgeFunction(functionName, body, options = {}) {
  const url = `${SUPABASE_CONFIG.url}/functions/v1/${functionName}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });
}

/**
 * Initialize Supabase client (lazy-loaded when credentials available)
 */
let supabaseClient = null

export async function initSupabase() {
  if (!SUPABASE_CONFIG.enabled) {
    console.warn('Supabase not configured. Phase 1 feature: Cloud sync will be disabled.')
    return null
  }

  if (supabaseClient) return supabaseClient

  try {
    const { createClient } = await import('@supabase/supabase-js')
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key)
    console.log('✓ Supabase initialized')
    return supabaseClient
  } catch (err) {
    console.error('Failed to initialize Supabase:', err)
    return null
  }
}

/**
 * Get Supabase client instance (must call initSupabase first)
 */
export function getSupabase() {
  return supabaseClient
}

/**
 * Check if Supabase is available and authenticated
 */
export async function isSupabaseReady() {
  const client = await initSupabase()
  if (!client) return false

  const { data: { user } } = await client.auth.getUser()
  return !!user
}

/**
 * Sync local progress to Supabase
 * Phase 1: Called after study sessions to persist progress
 */
export async function syncProgressToCloud(userId, cardState) {
  const client = getSupabase()
  if (!client) return false

  try {
    const { error } = await client.from('card_state').upsert({
      user_id: userId,
      card_m: cardState.m,
      ease: cardState.ease,
      interval: cardState.interval,
      box: cardState.box,
      last_review: new Date().toISOString(),
      next_review: cardState.nextReview,
      updated_at: new Date().toISOString()
    })

    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to sync progress:', err)
    return false
  }
}

/**
 * Fetch progress from Supabase
 * Phase 1: Called on app load to restore cloud state
 */
export async function fetchProgressFromCloud(userId) {
  const client = getSupabase()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('card_state')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    return data
  } catch (err) {
    console.error('Failed to fetch progress:', err)
    return null
  }
}

/**
 * Update streak in cloud
 * Phase 1: Called after daily review completion
 */
export async function updateStreakInCloud(userId, streakCount) {
  const client = getSupabase()
  if (!client) return false

  try {
    const { error } = await client.from('streak').upsert({
      user_id: userId,
      count: streakCount,
      last_date: new Date().toISOString()
    })

    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to update streak:', err)
    return false
  }
}

/**
 * Database schema initialization (run once per project)
 * Phase 1: Execute these SQL commands in Supabase SQL editor
 */
export const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  daily_goal INTEGER DEFAULT 10,
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'ms-MY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card state (SM-2 progress for each card)
CREATE TABLE IF NOT EXISTS card_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_m TEXT NOT NULL,
  ease FLOAT DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  box INTEGER DEFAULT 0,
  last_review TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_m)
);

-- Study sessions
CREATE TABLE IF NOT EXISTS study_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  deck TEXT,
  cards_due INTEGER,
  cards_reviewed INTEGER,
  duration_seconds INTEGER,
  average_quality FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roleplay attempts
CREATE TABLE IF NOT EXISTS roleplay_attempt (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  score INTEGER,
  turns_json JSONB,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Streaks
CREATE TABLE IF NOT EXISTS streak (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 0,
  last_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_state_user ON card_state(user_id);
CREATE INDEX IF NOT EXISTS idx_study_session_user ON study_session(user_id);
CREATE INDEX IF NOT EXISTS idx_roleplay_user ON roleplay_attempt(user_id);

-- Row-level security (Phase 2: implement fine-grained auth)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleplay_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak ENABLE ROW LEVEL SECURITY;
`

export default {
  SUPABASE_CONFIG,
  initSupabase,
  getSupabase,
  isSupabaseReady,
  syncProgressToCloud,
  fetchProgressFromCloud,
  updateStreakInCloud,
  SCHEMA_SQL
}
