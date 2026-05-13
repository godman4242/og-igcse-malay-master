// Google Cloud Translation v2 — https://cloud.google.com/translate/docs/reference/rest/v2/translate
// POST https://translation.googleapis.com/language/translate/v2?key={KEY}
// Body: { q, source, target, format: 'text' }   (q can be string or string[] up to 128 items)

const KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_KEY

export function isGoogleAvailable() {
  return Boolean(KEY)
}

async function call(payload) {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, format: 'text' }),
  })
  if (!res.ok) {
    const err = new Error(`google ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return data?.data?.translations || []
}

export async function googleTranslateOne(text, from = 'ms', to = 'en') {
  if (!KEY) throw new Error('google: missing VITE_GOOGLE_TRANSLATE_KEY')
  const [t] = await call({ q: text, source: from, target: to })
  return { text: t?.translatedText ?? text, source: 'google', provider: 'google' }
}

export async function googleTranslateBatch(texts, from = 'ms', to = 'en') {
  if (!KEY) throw new Error('google: missing VITE_GOOGLE_TRANSLATE_KEY')
  if (!texts.length) return []
  // API caps q at 128 items per request; chunk safely
  const chunks = []
  for (let i = 0; i < texts.length; i += 100) chunks.push(texts.slice(i, i + 100))
  const out = []
  for (const chunk of chunks) {
    const tt = await call({ q: chunk, source: from, target: to })
    for (let i = 0; i < chunk.length; i++) {
      out.push({
        text: tt[i]?.translatedText ?? chunk[i],
        source: 'google',
        provider: 'google',
      })
    }
  }
  return out
}

export function googleCompareUrl(text, from = 'ms', to = 'en') {
  return `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text)}&op=translate`
}
