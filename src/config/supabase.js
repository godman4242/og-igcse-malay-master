// src/config/supabase.js
// 2-table Supabase schema: allowed_users + telemetry_events
// Static users never touch this. Enhanced+ users send anonymous telemetry.

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  key: import.meta.env.VITE_SUPABASE_KEY || '',
  enabled: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_KEY),
}

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
 * Check if authenticated user is in the allowed_users table.
 * Owner email bypasses the check.
 * @returns {{ role: 'owner'|'admin'|'enhanced'|null, error: string|null }}
 */
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

/**
 * Listen for auth state changes.
 */
export function onAuthStateChange(callback) {
  const client = getSupabase()
  if (!client) return { data: { subscription: { unsubscribe: () => {} } } }
  return client.auth.onAuthStateChange(callback)
}

/**
 * Call a Supabase Edge Function with optional streaming support.
 * Used by the AI service layer (src/lib/ai.js).
 */
export async function callEdgeFunction(functionName, body, options = {}) {
  const url = `${SUPABASE_CONFIG.url}/functions/v1/${functionName}`
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  })
}

// SQL for Supabase SQL editor — run this once to set up tables
export const SCHEMA_SQL = `
CREATE TABLE allowed_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('enhanced', 'admin')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by TEXT NOT NULL
);

CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert telemetry" ON telemetry_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Only authenticated can read telemetry" ON telemetry_events FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read allowlist" ON allowed_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owner can manage allowlist" ON allowed_users FOR ALL USING (auth.jwt() ->> 'email' = 'kheshav0@gmail.com');
`
