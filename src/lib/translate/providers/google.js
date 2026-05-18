// Google Cloud Translation v2 via server-side proxy at /api/translate
// Set VITE_GOOGLE_TRANSLATE_ENABLED=true when GOOGLE_TRANSLATE_KEY is in Vercel.

const ENABLED = import.meta.env.VITE_GOOGLE_TRANSLATE_ENABLED === 'true'

export function isGoogleAvailable() {
  return ENABLED
}

async function callProxy(texts, from, to) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const tt = await callProxy(texts, from, to)
  return tt.map((t, i) => ({ text: t?.text ?? texts[i], source: 'google', provider: 'google' }))
}

export function googleCompareUrl(text, from = 'ms', to = 'en') {
  return `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text)}&op=translate`
}
