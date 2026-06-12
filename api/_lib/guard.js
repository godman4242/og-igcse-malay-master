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

// Server-side per-uid daily cap — atomic counter via the increment_api_usage
// RPC (supabase/migrations/20260612_api_usage_counters.sql). The JWT gate is
// the primary control; this cap is defense-in-depth against a registrant
// scripting the proxy directly (the client-side DAILY_LIMIT is UX-only and
// trivially bypassed). Fail-open by design: if the counter infra errors we
// allow the request and log loudly — the cap must never become a hard
// availability dependency, and a silent skip would hide the outage.
export async function enforceDailyCap(adminClient, user, endpoint, limit) {
  try {
    const { data: count, error } = await adminClient.rpc('increment_api_usage', {
      p_uid: user.id,
      p_endpoint: endpoint,
    })
    if (error) {
      console.error(`CAP CHECK FAILED (fail-open): endpoint=${endpoint} uid=${user.id} err=${error.message}`)
      return null
    }
    if (count > limit) {
      console.warn(`DAILY CAP TRIPPED: endpoint=${endpoint} uid=${user.id} count=${count} limit=${limit}`)
      return {
        errorStatus: 429,
        errorBody: { error: `Daily limit reached for this account (${limit}/day). Try again tomorrow.` },
      }
    }
    return null
  } catch (err) {
    console.error(`CAP CHECK FAILED (fail-open): endpoint=${endpoint} uid=${user.id} err=${err?.message || err}`)
    return null
  }
}
