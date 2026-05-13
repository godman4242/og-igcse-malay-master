// Free unauthenticated Google "gtx" endpoint — undocumented and rate-limited
// per IP, but works without any API key. This is the legacy translator the
// app shipped with; we keep it as the zero-config fallback.

export function isGtxAvailable() {
  return true
}

export async function gtxTranslateOne(text, from = 'ms', to = 'en') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error(`gtx ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  const out = data?.[0]?.map(s => s[0]).join('') || text
  return { text: out, source: 'gtx', provider: 'gtx' }
}

// gtx has no batch endpoint; we just sequence single calls.
export async function gtxTranslateBatch(texts, from = 'ms', to = 'en') {
  const out = []
  for (const t of texts) {
    out.push(await gtxTranslateOne(t, from, to).catch(() => ({
      text: t, source: 'error', provider: 'gtx',
    })))
  }
  return out
}
