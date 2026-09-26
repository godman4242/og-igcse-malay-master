// api/gemini.js
// Vercel serverless proxy for Google Gemini.
// Requires a valid Supabase session JWT in the Authorization header
// (gate shared with api/translate.js via _lib/guard.js), plus a per-uid
// daily cap — the client-side DAILY_LIMIT is UX-only and bypassable.
import { verifySession, enforceCaps, capFromEnv } from './_lib/guard.js'

// Per account, and across ALL accounts (bounds the owner's key however many
// accounts exist). ~1/10 ratio: see enforceCaps in guard.js.
const DAILY_CAP = capFromEnv('GEMINI_DAILY_CAP', 50)
const ALL_ACCOUNTS_DAILY_CAP = capFromEnv('GEMINI_ALL_ACCOUNTS_DAILY_CAP', 500)
// ~16× the biggest one-shot request (a task-aware writing grade, ~8 KB,
// measured 2026-09-26); leaves the Writing Tutor ~24 follow-ups, since it
// re-sends the whole chat. Before this the only limit was Vercel's 4.5 MB.
const MAX_BODY_BYTES = 128 * 1024
// The largest client ask (fetchAIGrade's task branch, Comprehension), same
// ceiling as the ai-proxy. Gemini spends thinking tokens out of this budget
// too (see fetchAIGrade in src/lib/gemini.js), so it bounds both.
const MAX_OUTPUT_TOKENS = 2048
const DEFAULT_OUTPUT_TOKENS = 1024

// The body is client-controlled, so it is rebuilt from what src/lib/gemini.js
// sends: text parts only. A media part is the expensive smuggle — a few bytes
// of `fileData` (a YouTube URL) or a few hundred tiny `inlineData` images can
// cost ~1M input tokens — and `tools` (paid Search grounding), `cachedContent`
// or a huge thinking budget would all spend the owner's key. Returns null for
// anything else. Rebuilt in the client's key order, so a real request is
// forwarded byte-for-byte (pinned by api/__tests__/gemini.test.js).
const isTextParts = (parts) => Array.isArray(parts) && parts.length > 0 && parts.every(p =>
  p && typeof p === 'object' && Object.keys(p).length === 1 && typeof p.text === 'string')

function pickGeminiBody(body) {
  const { contents, generationConfig, systemInstruction } = body ?? {}
  if (!Array.isArray(contents) || contents.length === 0) return null
  const turnsOk = contents.every(c =>
    c && (c.role === 'user' || c.role === 'model') && isTextParts(c.parts))
  if (!turnsOk || !contents.some(c => c.parts.some(p => p.text.trim()))) return null
  if (systemInstruction !== undefined && !isTextParts(systemInstruction?.parts)) return null

  const gc = generationConfig && typeof generationConfig === 'object' ? generationConfig : {}
  const out = gc.maxOutputTokens
  const level = gc.thinkingConfig?.thinkingLevel
  return {
    contents: contents.map(c => ({ role: c.role, parts: c.parts.map(p => ({ text: p.text })) })),
    generationConfig: {
      ...(typeof gc.temperature === 'number' && gc.temperature >= 0 && gc.temperature <= 2 && { temperature: gc.temperature }),
      maxOutputTokens: Number.isInteger(out) && out >= 1 ? Math.min(out, MAX_OUTPUT_TOKENS) : DEFAULT_OUTPUT_TOKENS,
      ...((gc.responseMimeType === 'application/json' || gc.responseMimeType === 'text/plain') && { responseMimeType: gc.responseMimeType }),
      ...(typeof level === 'string' && { thinkingConfig: { thinkingLevel: level } }),
    },
    ...(systemInstruction !== undefined && { systemInstruction: { parts: systemInstruction.parts.map(p => ({ text: p.text })) } }),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Auth: verify Supabase session JWT ──────────────────────
  const session = await verifySession(req)
  if (session.errorStatus) {
    return res.status(session.errorStatus).json(session.errorBody)
  }

  // Validate before counting, so a rejected request costs no allowance.
  if (Buffer.byteLength(JSON.stringify(req.body ?? null)) > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request too large' })
  }
  const upstreamBody = pickGeminiBody(req.body)
  if (!upstreamBody) {
    return res.status(400).json({ error: 'Expected contents[] of text parts' })
  }

  const key = process.env.GEMINI_KEY
  if (!key) {
    console.error('SERVER ERROR: GEMINI_KEY missing from environment')
    return res.status(500).json({ error: 'AI service not configured on server' })
  }

  const capped = await enforceCaps(session.adminClient, session.user, 'gemini', DAILY_CAP, ALL_ACCOUNTS_DAILY_CAP)
  if (capped) {
    return res.status(capped.errorStatus).json(capped.errorBody)
  }

  // ── Proxy to Gemini ────────────────────────────────────────
  // gemini-2.0-flash was retired by Google during the 2025-12 wave (Live API
  // variant shut down 2025-12-09; non-live followed). 3.5-flash is the current
  // free-tier flash model on v1beta. If Google rotates again the failure mode
  // is a 404 from this endpoint — bump the constant.
  const model = 'gemini-3.5-flash'
  // Key in a header, not `?key=` — a URL ends up in error messages and logs.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(upstreamBody),
    })
    if (!response.ok) {
      // Log Google's body and status, never relay them: the body can name the
      // GCP project, and a relayed 403/456-style status tells any user the
      // owner's key or quota state. 429 survives so the client backs off.
      const detail = await response.text().catch(() => '')
      console.error(`GEMINI UPSTREAM ${response.status}: ${detail.slice(0, 500)}`)
      const status = response.status === 429 ? 429 : 502
      return res.status(status).json({ error: `AI service error ${status}` })
    }
    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    // err.message can quote the upstream body (a JSON parse error does).
    console.error('FETCH ERROR:', err)
    return res.status(500).json({ error: 'Failed to reach AI service' })
  }
}
