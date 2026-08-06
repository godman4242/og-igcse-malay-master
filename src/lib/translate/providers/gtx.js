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
  const segments = data?.[0]
  const out = Array.isArray(segments)
    ? segments.map(s => s?.[0] ?? '').join('').trim()
    : ''
  // A 200 carrying no usable translation is a FAILURE. The old code fell back
  // to `|| text` and returned the SOURCE WORD tagged `source: 'gtx'` — the
  // success marker — which bypassed every `source === 'error'` guard
  // downstream, including writeCache's, whose whole job is to stop an echo
  // being cached and served as a gloss forever (census A7).
  // Note this checks that we PARSED nothing, not that the result equals the
  // input: `radio` legitimately translates to `radio`.
  if (!out) return { text, source: 'error', provider: 'gtx' }
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
