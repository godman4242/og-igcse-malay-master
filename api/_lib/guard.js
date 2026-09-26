// api/_lib/guard.js
// Shared request guards for the Vercel serverless proxies (api/gemini.js,
// api/translate.js). Underscore-prefixed paths under api/ are never exposed
// as routes — this is a helper module, not an endpoint.
import { createClient } from '@supabase/supabase-js'

// Verify the Supabase session JWT in the Authorization header.
// Returns { user, adminClient } on success, or { errorStatus, errorBody }
// for the caller to send. Same checks/messages the gemini proxy has always
// used, extracted so translate can share them.
export async function verifySession(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { errorStatus: 401, errorBody: { error: 'Unauthorized — session required' } }
  }
  const token = authHeader.slice(7)

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('SERVER ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    return { errorStatus: 500, errorBody: { error: 'Server auth not configured' } }
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return { errorStatus: 401, errorBody: { error: 'Invalid or expired session' } }
  }
  return { user, adminClient }
}

// A daily cap from the environment. 0 must work as a kill switch, so this is
// NOT `Number(v) || fallback` (which turns 0 into the fallback).
export function capFromEnv(name, fallback) {
  const raw = process.env[name]
  const n = Number(raw)
  return raw !== undefined && raw.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : fallback
}

// Server-side per-uid daily cap — atomic counter via the increment_api_usage
// RPC (supabase/migrations/20260612_api_usage_counters.sql). The JWT gate is
// the primary control; this cap is defense-in-depth against a registrant
// scripting the proxy directly (the client-side DAILY_LIMIT is UX-only and
// trivially bypassed). The per-account cap fails OPEN (allow + log loudly) so
// a counter blip never blocks a learner; `failClosed` is for the all-accounts
// ceiling below, which is the owner's spend bound.
export async function enforceDailyCap(adminClient, user, endpoint, limit, { failClosed = false } = {}) {
  const onFailure = failClosed
    ? { errorStatus: 503, errorBody: { error: 'Service temporarily unavailable. Try again shortly.' } }
    : null
  try {
    const { data: count, error } = await adminClient.rpc('increment_api_usage', {
      p_uid: user.id,
      p_endpoint: endpoint,
    })
    if (error) {
      console.error(`CAP CHECK FAILED (${failClosed ? 'fail-closed' : 'fail-open'}): endpoint=${endpoint} uid=${user.id} err=${error.message}`)
      return onFailure
    }
    if (count > limit) {
      console.warn(`DAILY CAP TRIPPED: endpoint=${endpoint} uid=${user.id} count=${count} limit=${limit}`)
      const error = user.id === ALL_ACCOUNTS_UID
        ? 'Daily limit reached for this service. Try again tomorrow.'
        : `Daily limit reached for this account (${limit}/day). Try again tomorrow.`
      return { errorStatus: 429, errorBody: { error } }
    }
    return null
  } catch (err) {
    console.error(`CAP CHECK FAILED (${failClosed ? 'fail-closed' : 'fail-open'}): endpoint=${endpoint} uid=${user.id} err=${err?.message || err}`)
    return onFailure
  }
}

// Signup is open, so a per-account cap alone multiplies: N minted accounts =
// N × cap on the owner's key. Every call therefore also counts against ONE
// shared row per endpoint, keyed on the nil UUID (Supabase issues random v4
// ids, so no real account holds it; only service_role can run the RPC). The
// shared row is only touched once the account's own cap passes, so a capped
// account's retries don't drain everyone else's allowance. It fails CLOSED:
// otherwise a flood that times out the counter (while auth still answers)
// would lift the spend bound. Keep the per-account cap well under it (~1/10),
// or a few minted accounts can lock every learner out for the day.
export const ALL_ACCOUNTS_UID = '00000000-0000-0000-0000-000000000000'

export async function enforceCaps(adminClient, user, endpoint, perAccountLimit, allAccountsLimit) {
  return (await enforceDailyCap(adminClient, user, endpoint, perAccountLimit))
    ?? (await enforceDailyCap(adminClient, { id: ALL_ACCOUNTS_UID }, endpoint, allAccountsLimit, { failClosed: true }))
}
