// Google Cloud Translation v2 via server-side proxy at /api/translate
// Set VITE_GOOGLE_TRANSLATE_ENABLED=true when GOOGLE_TRANSLATE_KEY is in Vercel.

const ENABLED = import.meta.env.VITE_GOOGLE_TRANSLATE_ENABLED === 'true'

export function isGoogleAvailable() {
  return ENABLED
}

async function callProxy(texts, from, to) {
  const { getSessionAuthHeader } = await import('./sessionHeader')
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionAuthHeader()) },
    body: JSON.stringify({ provider: 'google', texts, from, to }),
  })
  if (!res.ok) {
    const err = new Error(`google proxy ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return data?.translations ?? []
}

export async function googleTranslateOne(text, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('google: not enabled (set VITE_GOOGLE_TRANSLATE_ENABLED=true)')
  const [t] = await callProxy([text], from, to)
  return { text: t?.text ?? text, source: 'google', provider: 'google' }
}

export async function googleTranslateBatch(texts, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('google: not enabled (set VITE_GOOGLE_TRANSLATE_ENABLED=true)')
  if (!texts.length) return []
  // The proxy takes ≤100 texts per request (api/translate.js MAX_TEXTS). A
  // result the proxy didn't return stays undefined, so the router marks it
  // source:'error' — which the cache refuses to store.
  const out = []
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100)
    const tt = await callProxy(chunk, from, to)
    chunk.forEach((text, j) => out.push(tt[j] && { text: tt[j].text ?? text, source: 'google', provider: 'google' }))
  }
  return out
}

export function googleCompareUrl(text, from = 'ms', to = 'en') {
  return `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text)}&op=translate`
}
