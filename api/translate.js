// api/translate.js
// Vercel serverless proxy for DeepL and Google Translate.
// Keeps DEEPL_KEY and GOOGLE_TRANSLATE_KEY out of the client bundle.
// Requires a valid Supabase session JWT (same gate as api/gemini.js) —
// guests never dead-end: the client router falls through to the free gtx
// provider on a 401. Per-uid daily cap on top (defense-in-depth).
import { verifySession, enforceDailyCap } from './_lib/guard.js'

const DAILY_CAP = Number(process.env.TRANSLATE_DAILY_CAP) || 500

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await verifySession(req)
  if (session.errorStatus) {
    return res.status(session.errorStatus).json(session.errorBody)
  }
  const capped = await enforceDailyCap(session.adminClient, session.user, 'translate', DAILY_CAP)
  if (capped) {
    return res.status(capped.errorStatus).json(capped.errorBody)
  }

  const { provider, texts, from, to } = req.body ?? {}

  if (!provider || !Array.isArray(texts) || !texts.length || !from || !to) {
    return res.status(400).json({ error: 'Missing required fields: provider, texts[], from, to' })
  }

  if (provider === 'deepl') {
    const key = process.env.DEEPL_KEY
    if (!key) return res.status(503).json({ error: 'DeepL not configured on server' })

    const endpoint = key.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate'

    const body = new URLSearchParams()
    for (const t of texts) body.append('text', t)
    body.set('source_lang', from.toUpperCase())
    body.set('target_lang', to.toUpperCase() === 'EN' ? 'EN-GB' : to.toUpperCase())

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `DeepL error ${upstream.status}` })
    }

    const data = await upstream.json()
    const translations = (data?.translations ?? []).map(t => ({ text: t.text }))
    return res.status(200).json({ translations })
  }

  if (provider === 'google') {
    const key = process.env.GOOGLE_TRANSLATE_KEY
    if (!key) return res.status(503).json({ error: 'Google Translate not configured on server' })

    const chunks = []
    for (let i = 0; i < texts.length; i += 100) chunks.push(texts.slice(i, i + 100))
    const all = []

    for (const chunk of chunks) {
      const upstream = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: chunk, source: from, target: to, format: 'text' }),
        },
      )
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: `Google error ${upstream.status}` })
      }
      const data = await upstream.json()
      all.push(...(data?.data?.translations ?? []).map(t => ({ text: t.translatedText })))
    }

    return res.status(200).json({ translations: all })
  }

  return res.status(400).json({ error: `Unknown provider: ${provider}` })
}
