// api/gemini.js
// Vercel serverless proxy for Google Gemini.
// Requires a valid Supabase session JWT in the Authorization header
// (gate shared with api/translate.js via _lib/guard.js), plus a per-uid
// daily cap — the client-side DAILY_LIMIT is UX-only and bypassable.
import { verifySession, enforceDailyCap } from './_lib/guard.js'

const DAILY_CAP = Number(process.env.GEMINI_DAILY_CAP) || 200

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Auth: verify Supabase session JWT ──────────────────────
  const session = await verifySession(req)
  if (session.errorStatus) {
    return res.status(session.errorStatus).json(session.errorBody)
  }
  const capped = await enforceDailyCap(session.adminClient, session.user, 'gemini', DAILY_CAP)
  if (capped) {
    return res.status(capped.errorStatus).json(capped.errorBody)
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
