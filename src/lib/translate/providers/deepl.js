// DeepL via server-side proxy at /api/translate
// Set VITE_DEEPL_ENABLED=true in .env.local when DEEPL_KEY is configured in Vercel.
// The proxy adds the key — nothing secret lives in the browser bundle.

const ENABLED = import.meta.env.VITE_DEEPL_ENABLED === 'true'

const SUPPORTED = new Set([
  'BG','CS','DA','DE','EL','EN','EN-GB','EN-US','ES','ET','FI','FR','HU','ID',
  'IT','JA','KO','LT','LV','NB','NL','PL','PT','PT-BR','PT-PT','RO','RU','SK',
  'SL','SV','TR','UK','ZH',
])

function toDeepLLang(code) {
  if (!code) return null
  const c = code.toUpperCase()
  if (c === 'EN') return 'EN-GB'
  if (SUPPORTED.has(c)) return c
  return null
}

export function isDeepLAvailable() {
  return ENABLED
}

export function isDeepLPairSupported(from, to) {
  return Boolean(toDeepLLang(from) && toDeepLLang(to))
}

async function callProxy(texts, from, to) {
  const sl = toDeepLLang(from)
  const tl = toDeepLLang(to)
  if (!sl || !tl) {
    const err = new Error(`deepl: unsupported pair ${from}->${to}`)
    err.code = 'unsupported'
    throw err
  }

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'deepl', texts, from: sl, to: tl }),
  })
  if (!res.ok) {
    const err = new Error(`deepl proxy ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return data?.translations ?? []
}

export async function deeplTranslateOne(text, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('deepl: not enabled (set VITE_DEEPL_ENABLED=true)')
  const [t] = await callProxy([text], from, to)
  return { text: t?.text ?? text, source: 'deepl', provider: 'deepl' }
}

export async function deeplTranslateBatch(texts, from = 'ms', to = 'en') {
  if (!ENABLED) throw new Error('deepl: not enabled (set VITE_DEEPL_ENABLED=true)')
  if (!texts.length) return []
  const chunks = []
  for (let i = 0; i < texts.length; i += 50) chunks.push(texts.slice(i, i + 50))
  const out = []
  for (const chunk of chunks) {
    const tt = await callProxy(chunk, from, to)
    for (let i = 0; i < chunk.length; i++) {
      out.push({ text: tt[i]?.text ?? chunk[i], source: 'deepl', provider: 'deepl' })
    }
  }
  return out
}

export function deeplCompareUrl(text, from = 'ms', to = 'en') {
  const f = (from || 'auto').toLowerCase()
  const t = (to || 'en').toLowerCase()
  return `https://www.deepl.com/translator#${f}/${t}/${encodeURIComponent(text)}`
}
