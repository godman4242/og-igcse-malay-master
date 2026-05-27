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

  // gemini-2.0-flash was retired by Google during the 2025-12 wave (Live API
  // variant shut down 2025-12-09; non-live followed). 3.5-flash is the current
  // free-tier flash model on v1beta. If Google rotates again the failure mode
  // is a 404 from this endpoint — bump the constant.
  const model = 'gemini-3.5-flash'
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
