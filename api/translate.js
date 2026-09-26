// api/translate.js
// Vercel serverless proxy for DeepL and Google Translate.
// Keeps DEEPL_KEY and GOOGLE_TRANSLATE_KEY out of the client bundle.
// Requires a valid Supabase session JWT (same gate as api/gemini.js) —
// guests never dead-end: the client router falls through to the free gtx
// provider on a 401. Per-uid daily cap on top (defense-in-depth).
import { verifySession, enforceCaps, capFromEnv } from './_lib/guard.js'

// Per account, and across ALL accounts (bounds the owner's key however many
// accounts exist). ~1/10 ratio: see enforceCaps in guard.js.
// ⚠ These count REQUESTS, but Google/DeepL Pro bill CHARACTERS: worst case is
// cap × MAX_CHARS (1000 × 30k = 30M chars ≈ $600/day on Google). Neither key is
// set in production (2026-09-26); before adding one, set a provider-side quota.
const DAILY_CAP = capFromEnv('TRANSLATE_DAILY_CAP', 100)
const ALL_ACCOUNTS_DAILY_CAP = capFromEnv('TRANSLATE_ALL_ACCOUNTS_DAILY_CAP', 1000)
// Per request. The clients batch ≤100 (google.js) / ≤50 (deepl.js) texts, and
// Google v2 takes ≤128 segments. 30k chars caps one paid Google call at ~$0.60.
const MAX_TEXTS = 100
const MAX_CHARS = 30_000
const KEYS = { deepl: 'DEEPL_KEY', google: 'GOOGLE_TRANSLATE_KEY' }

// One upstream call → translations[], or null on any failure. Never relays
// the provider's body or status: a DeepL 456 / Google 403 tells any user the
// owner's quota or key state. 429 survives so the client backs off.
async function callProvider(provider, key, texts, from, to) {
  const request = provider === 'deepl'
    ? {
        url: key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate',
        headers: { 'Authorization': `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams([
          ...texts.map(t => ['text', t]),
          ['source_lang', from.toUpperCase()],
          ['target_lang', to.toUpperCase() === 'EN' ? 'EN-GB' : to.toUpperCase()],
        ]),
      }
    : {
        // Key in a header, not `?key=` — a URL ends up in traces and logs.
        // One call: MAX_TEXTS keeps every request inside Google's 128-segment limit.
        url: 'https://translation.googleapis.com/language/translate/v2',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ q: texts, source: from, target: to, format: 'text' }),
      }
  try {
    const upstream = await fetch(request.url, { method: 'POST', headers: request.headers, body: request.body })
    if (!upstream.ok) {
      console.error(`TRANSLATE UPSTREAM ${provider} ${upstream.status}`)
      return { status: upstream.status === 429 ? 429 : 502 }
    }
    const data = await upstream.json()
    const list = provider === 'deepl' ? data?.translations : data?.data?.translations
    return { translations: (list ?? []).map(t => ({ text: provider === 'deepl' ? t.text : t.translatedText })) }
  } catch (err) {
    // err.message can quote the upstream body (a JSON parse error does).
    console.error(`TRANSLATE FETCH ERROR ${provider}:`, err)
    return { status: 502 }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await verifySession(req)
  if (session.errorStatus) {
    return res.status(session.errorStatus).json(session.errorBody)
  }

  const { provider, texts, from, to } = req.body ?? {}

  // Validate before counting, so a rejected request costs no allowance.
  if (!Array.isArray(texts) || !texts.length || !texts.every(t => typeof t === 'string')
    || typeof from !== 'string' || !from || typeof to !== 'string' || !to) {
    return res.status(400).json({ error: 'Missing required fields: provider, texts[], from, to' })
  }
  if (provider !== 'deepl' && provider !== 'google') {
    return res.status(400).json({ error: 'Unknown provider' })
  }
  if (texts.length > MAX_TEXTS || texts.reduce((n, t) => n + t.length, 0) > MAX_CHARS) {
    return res.status(413).json({ error: `Too much text (max ${MAX_TEXTS} texts, ${MAX_CHARS} chars)` })
  }
  const key = process.env[KEYS[provider]]
  if (!key) {
    return res.status(503).json({ error: `${provider === 'deepl' ? 'DeepL' : 'Google Translate'} not configured on server` })
  }

  const capped = await enforceCaps(session.adminClient, session.user, 'translate', DAILY_CAP, ALL_ACCOUNTS_DAILY_CAP)
  if (capped) {
    return res.status(capped.errorStatus).json(capped.errorBody)
  }

  const out = await callProvider(provider, key, texts, from, to)
  if (out.status) {
    return res.status(out.status).json({ error: `Translation service error ${out.status}` })
  }
  return res.status(200).json({ translations: out.translations })
}
