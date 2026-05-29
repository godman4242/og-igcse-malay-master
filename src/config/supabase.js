// src/config/supabase.js
// 2-table Supabase schema: allowed_users + telemetry_events
// Static users never touch this. Enhanced+ users send anonymous telemetry.

// SUPABASE_CONFIG lives in a sibling module so config consumers can static-
// import it without dragging this file (and the @supabase/supabase-js runtime
// loaded by initSupabase) into their chunk. Re-exported for back-compat.
import { SUPABASE_CONFIG } from './supabaseConfig'
export { SUPABASE_CONFIG }

const OWNER_EMAIL = 'kheshav0@gmail.com'

let supabaseClient = null

/**
 * Initialize Supabase client (lazy-loaded).
 * Returns null if credentials not configured — static users are never affected.
 */
export async function initSupabase() {
  if (!SUPABASE_CONFIG.enabled) return null
  if (supabaseClient) return supabaseClient

  try {
    const { createClient } = await import('@supabase/supabase-js')
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key)
    return supabaseClient
  } catch {
    return null
  }
}

export function getSupabase() {
  return supabaseClient
}

/**
 * Send magic link OTP to email.
 * @returns {{ error: string|null }}
 */
export async function sendMagicLink(email) {
  const client = await initSupabase()
  if (!client) return { error: 'Supabase not configured' }

  const { error } = await client.auth.signInWithOtp({ email })
  return { error: error?.message || null }
}

/**
 * Redirect to Google OAuth. Supabase handles the callback.
 * The redirectTo URL must be added to Supabase Auth → URL Configuration → Redirect URLs.
 */
export async function signInWithGoogle() {
  const client = await initSupabase()
  if (!client) return { error: 'Supabase not configured' }

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return { error: error?.message || null }
}

/**
 * Check if authenticated user is in the allowed_users table.
 * Owner email bypasses the check.
 * @returns {{ role: 'owner'|'admin'|'enhanced'|null, error: string|null }}
 */
export async function checkUserRole(email) {
  if (email === OWNER_EMAIL) return { role: 'owner', error: null }
  // Open signup: any authenticated user gets enhanced role automatically.
  // The allowed_users table is reserved for manual admin promotion only.
  return { role: 'enhanced', error: null }
}

/**
 * Send anonymous telemetry event (fire-and-forget).
 * Only called for enhanced+ users. Failures are silently dropped.
 */
export async function sendTelemetryEvent(eventType, payload = {}) {
  const client = getSupabase()
  if (!client) return

  try {
    await client.from('telemetry_events').insert({
      event_type: eventType,
      payload,
    })
  } catch {
    // Fire-and-forget — never break app flow
  }
}

/**
 * Read telemetry events (admin/owner only).
 * @param {number} [limit=100]
 * @returns {Array}
 */
export async function readTelemetryEvents(limit = 100) {
  const client = getSupabase()
  if (!client) return []

  try {
    const { data } = await client
      .from('telemetry_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  } catch {
    return []
  }
}

/**
 * Manage allowed_users (owner only).
 */
export async function addAllowedUser(email, role = 'enhanced') {
  const client = getSupabase()
  if (!client) return { error: 'Not connected' }

  try {
    const { error } = await client.from('allowed_users').upsert({
      email,
      role,
      invited_by: OWNER_EMAIL,
    })
    return { error: error?.message || null }
  } catch (e) {
    return { error: e.message }
  }
}

export async function removeAllowedUser(email) {
  const client = getSupabase()
  if (!client) return { error: 'Not connected' }

  try {
    const { error } = await client.from('allowed_users').delete().eq('email', email)
    return { error: error?.message || null }
  } catch (e) {
    return { error: e.message }
  }
}

export async function listAllowedUsers() {
  const client = getSupabase()
  if (!client) return []

  try {
    const { data } = await client.from('allowed_users').select('*').order('invited_at', { ascending: false })
    return data || []
  } catch {
    return []
  }
}

// ── JSONB state blob sync (Phase 1) ──────────────────────────
// Requires a `user_state` table (see docs/PHASE_1_SUPABASE_MIGRATION.md).
// Fields excluded from the cloud blob (transient / device-specific):
const SYNC_OMIT = new Set(['installPrompt'])

/**
 * Upload the entire Zustand store as a single JSONB blob.
 * Called from the store's triggerCloudSync (debounced 5s).
 */
export async function pushStateBlob(storeState) {
  const client = getSupabase()
  if (!client) throw new Error('Supabase not configured')
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Strip transient fields
  const state = Object.fromEntries(
    Object.entries(storeState).filter(([k]) => !SYNC_OMIT.has(k))
  )
  // Sanitise sync queue — it's device-specific
  if (state.sync) {
    state.sync = { ...state.sync, networkStatus: 'offline', syncStatus: 'synced', queue: [] }
  }
  // Strip modal flags
  if (state.auth) state.auth = { ...state.auth, showModal: false }

  const { error } = await client
    .from('user_state')
    .upsert(
      { user_id: user.id, state, state_version: state._version || 19, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) throw error
  return true
}

/**
 * Fetch the JSONB blob for the current user.
 * Returns `{ state, state_version, updated_at }` or null if none exists.
 */
export async function pullStateBlob() {
  const client = getSupabase()
  if (!client) return null
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  const { data, error } = await client
    .from('user_state')
    .select('state, state_version, updated_at')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Sign out current user.
 */
export async function signOut() {
  const client = getSupabase()
  if (!client) return
  await client.auth.signOut()
}

/**
 * Get current authenticated user session.
 */
export async function getCurrentUser() {
  const client = await initSupabase()
  if (!client) return null

  try {
    const { data: { user } } = await client.auth.getUser()
    return user
  } catch {
    return null
  }
}

export async function readCloudTranslation(key) {
  const client = await initSupabase()
  if (!client || !key) return null

  try {
    const { data, error } = await client
      .from('translations')
      .select('text, source, provider, lang_from, lang_to')
      .eq('key', key)
      .maybeSingle()
    if (error || !data) return null
    return {
      text: data.text,
      source: data.source || 'cloud',
      provider: data.provider || data.source || 'cloud',
      langFrom: data.lang_from,
      langTo: data.lang_to,
    }
  } catch {
    return null
  }
}

export async function writeCloudTranslation({ key, value, from, to }) {
  const client = await initSupabase()
  if (!client || !key || !value?.text) return false

  const user = await getCurrentUser()
  if (!user) return false

  try {
    const { error } = await client.from('translations').upsert({
      key,
      text: value.text,
      source: value.source || value.provider || 'unknown',
      provider: value.provider || value.source || 'unknown',
      lang_from: from,
      lang_to: to,
      created_by: user.id,
    }, { onConflict: 'key' })
    return !error
  } catch {
    return false
  }
}

// ────────────────────────────────────────────────────────────────────────
// User profile (UDL preferences sync). Local-first: writes are best-effort.
// The `profiles` row mirrors a subset of the Zustand store keyed by auth.uid.
// ────────────────────────────────────────────────────────────────────────

const PROFILE_COLUMNS = [
  'user_interests',
  'dyslexic_font',
  'high_contrast',
  'show_dictionary_images',
  'identity',
  'exam_date',
  'theme',
  'daily_goal',
]

function toProfileRow(userId, prefs = {}) {
  const row = { user_id: userId, updated_at: new Date().toISOString() }
  if (Array.isArray(prefs.userInterests)) row.user_interests = prefs.userInterests
  if (typeof prefs.dyslexicFont === 'boolean') row.dyslexic_font = prefs.dyslexicFont
  if (typeof prefs.highContrast === 'boolean') row.high_contrast = prefs.highContrast
  if (typeof prefs.showDictionaryImages === 'boolean') row.show_dictionary_images = prefs.showDictionaryImages
  if (prefs.identity && typeof prefs.identity === 'object') row.identity = prefs.identity
  if (prefs.examDate !== undefined) row.exam_date = prefs.examDate
  if (typeof prefs.theme === 'string') row.theme = prefs.theme
  if (typeof prefs.dailyGoal === 'number') row.daily_goal = prefs.dailyGoal
  return row
}

function fromProfileRow(row) {
  if (!row) return null
  return {
    userInterests: Array.isArray(row.user_interests) ? row.user_interests : [],
    dyslexicFont: !!row.dyslexic_font,
    highContrast: !!row.high_contrast,
    showDictionaryImages: row.show_dictionary_images ?? true,
    identity: row.identity || null,
    examDate: row.exam_date || null,
    theme: row.theme || null,
    dailyGoal: typeof row.daily_goal === 'number' ? row.daily_goal : null,
  }
}

export async function fetchUserProfile() {
  const client = await initSupabase()
  if (!client) return null
  const user = await getCurrentUser()
  if (!user) return null
  try {
    const { data, error } = await client
      .from('profiles')
      .select(PROFILE_COLUMNS.join(','))
      .eq('user_id', user.id)
      .maybeSingle()
    if (error || !data) return null
    return fromProfileRow(data)
  } catch {
    return null
  }
}

export async function upsertUserProfile(prefs) {
  const client = await initSupabase()
  if (!client) return false
  const user = await getCurrentUser()
  if (!user) return false
  try {
    const { error } = await client
      .from('profiles')
      .upsert(toProfileRow(user.id, prefs), { onConflict: 'user_id' })
    return !error
  } catch {
    return false
  }
}

/**
 * Listen for auth state changes.
 */
export function onAuthStateChange(callback) {
  const client = getSupabase()
  if (!client) return { data: { subscription: { unsubscribe: () => {} } } }
  return client.auth.onAuthStateChange(callback)
}

// SQL for Supabase SQL editor — run this once to set up tables
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS allowed_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('enhanced', 'admin')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  dyslexic_font BOOLEAN NOT NULL DEFAULT FALSE,
  high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  show_dictionary_images BOOLEAN NOT NULL DEFAULT TRUE,
  identity JSONB,
  exam_date DATE,
  theme TEXT,
  daily_goal INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_cards_user_updated_idx ON user_cards (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS writing_history_user_created_idx ON writing_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS speaking_history_user_created_idx ON speaking_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sync_events_user_created_idx ON sync_events (user_id, created_at DESC);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert telemetry" ON telemetry_events;
DROP POLICY IF EXISTS "Only authenticated can read telemetry" ON telemetry_events;
CREATE POLICY "Anyone can insert telemetry" ON telemetry_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Only authenticated can read telemetry" ON telemetry_events FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read allowlist" ON allowed_users;
DROP POLICY IF EXISTS "Owner can manage allowlist" ON allowed_users;
CREATE POLICY "Authenticated can read allowlist" ON allowed_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owner can manage allowlist" ON allowed_users FOR ALL USING (auth.jwt() ->> 'email' = 'kheshav0@gmail.com');

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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
`
