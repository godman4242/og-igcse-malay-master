// DeepL Free / Pro — https://developers.deepl.com/docs/api-reference/translate
// Free endpoint: https://api-free.deepl.com/v2/translate
// Pro endpoint:  https://api.deepl.com/v2/translate
// Authorization header: "DeepL-Auth-Key {KEY}"
//
// Note: DeepL doesn't currently support Malay (ms). For ms<->en pairs we
// throw `unsupported` so the router falls through to Google.

const KEY = import.meta.env.VITE_DEEPL_KEY

// DeepL identifies free keys with a `:fx` suffix (e.g. abc-123:fx)
const ENDPOINT = KEY?.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate'

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
  return Boolean(KEY)
}

export function isDeepLPairSupported(from, to) {
  return Boolean(toDeepLLang(from) && toDeepLLang(to))
}

async function call(textArr, from, to) {
  const sl = toDeepLLang(from)
  const tl = toDeepLLang(to)
  if (!sl || !tl) {
    const err = new Error(`deepl: unsupported pair ${from}->${to}`)
    err.code = 'unsupported'
    throw err
  }
  const body = new URLSearchParams()
  for (const t of textArr) body.append('text', t)
  body.set('source_lang', sl)
  body.set('target_lang', tl)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    const err = new Error(`deepl ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return data?.translations || []
}

export async function deeplTranslateOne(text, from = 'ms', to = 'en') {
  if (!KEY) throw new Error('deepl: missing VITE_DEEPL_KEY')
  const [t] = await call([text], from, to)
  return { text: t?.text ?? text, source: 'deepl', provider: 'deepl' }
}

export async function deeplTranslateBatch(texts, from = 'ms', to = 'en') {
  if (!KEY) throw new Error('deepl: missing VITE_DEEPL_KEY')
  if (!texts.length) return []
  // DeepL accepts up to 50 texts per call
  const chunks = []
  for (let i = 0; i < texts.length; i += 50) chunks.push(texts.slice(i, i + 50))
  const out = []
  for (const chunk of chunks) {
    const tt = await call(chunk, from, to)
    for (let i = 0; i < chunk.length; i++) {
      out.push({
        text: tt[i]?.text ?? chunk[i],
        source: 'deepl',
        provider: 'deepl',
      })
    }
  }
  return out
}

export function deeplCompareUrl(text, from = 'ms', to = 'en') {
  // DeepL's web translator doesn't support Malay either, but if the user
  // wants to compare a translation done elsewhere, this is the closest we
  // can get. For unsupported source langs DeepL auto-detects.
  const f = (from || 'auto').toLowerCase()
  const t = (to || 'en').toLowerCase()
  return `https://www.deepl.com/translator#${f}/${t}/${encodeURIComponent(text)}`
}
