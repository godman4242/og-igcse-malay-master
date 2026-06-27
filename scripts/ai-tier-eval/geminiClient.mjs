// Thin Gemini text client for the eval harness — native generateContent
// endpoint with the x-goog-api-key header (same call shape as the OCR harness;
// the OpenAI-compat endpoint CORS-fails but works here, we just match the app's
// native path). Temperature 0 for reproducibility. No product coupling.

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

// Copy-pasted API keys sometimes carry INVISIBLE characters — zero-width spaces
// (U+200B–U+200D), a BOM (U+FEFF), or U+2028/U+2029 line/paragraph separators —
// plus surrounding whitespace/newlines. Any code-point > 255 makes fetch() throw a
// cryptic "Cannot convert argument to a ByteString" while BUILDING the request
// (so 0 quota is spent, but EVERY call fails identically). Strip those artifacts so
// a clean key is recovered automatically. Pure-ASCII source (code points listed
// numerically) + exported for unit testing.
const KEY_STRIP_CODEPOINTS = new Set([0x200b, 0x200c, 0x200d, 0xfeff, 0x2028, 0x2029])
export function sanitizeApiKey(key) {
  if (typeof key !== 'string') return ''
  return Array.from(key)
    .filter((ch) => !KEY_STRIP_CODEPOINTS.has(ch.codePointAt(0)))
    .join('')
    .trim()
}

// Small bounded retry for transient 429/5xx (the user's free-tier quota is
// ~15 req/min — a brief backoff keeps the run from dying on a burst).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * One text completion.
 * @param {{ apiKey:string, model:string, systemPrompt:string, userContent:string,
 *           json?:boolean, maxTokens?:number, temperature?:number }} args
 *   temperature defaults to 0 (reproducible) so existing callers are byte-
 *   unchanged. The Content over-praise eval passes 0.3 so its N=3 samples
 *   actually stress run-to-run non-determinism (at temp 0 the 3 samples would be
 *   identical and prove nothing about robustness).
 * @returns {Promise<string>} the model's text
 */
export async function geminiText({ apiKey, model, systemPrompt, userContent, json = false, maxTokens = 2048, temperature = 0, thinkingConfig }) {
  // Recover the key from paste artifacts BEFORE the retry loop (a bad header char
  // is a permanent error — retrying 4× is pointless). If a non-ASCII char still
  // remains after sanitising, fail with an ACTIONABLE message instead of the raw
  // ByteString error so the cause (a corrupted paste) is obvious.
  const key = sanitizeApiKey(apiKey)
  if (!key) throw new Error('Gemini API key is empty (set GEMINI_KEY / GEMINI_API_KEY).')
  const badAt = Array.from(key).findIndex((ch) => ch.codePointAt(0) > 255)
  if (badAt !== -1) {
    throw new Error(`Gemini API key has a non-ASCII character at position ${badAt} (code ${key.codePointAt(badAt)}) even after sanitising — re-copy the key from Google AI Studio; it picked up an invisible character on paste.`)
  }

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
      // Passthrough: when a caller minimises thinking (the Content task-aware
      // grade does, so the bigger JSON isn't truncated) it reaches the API
      // unchanged. Omitted when not passed — existing callers are byte-identical.
      ...(thinkingConfig ? { thinkingConfig } : {}),
    },
  }

  let lastErr = null
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(ENDPOINT(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      })
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`)
        // 429 = per-MINUTE quota window (~60s). Honor Retry-After if present, else
        // back off long enough to clear the window: min(60s, 15s × (attempt+1)).
        // 5xx is usually transient → keep the shorter 2s × (attempt+1) backoff.
        let waitMs = 2000 * (attempt + 1)
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get('retry-after'))
          waitMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(60000, retryAfter * 1000)
            : Math.min(60000, 15000 * (attempt + 1))
        }
        await sleep(waitMs)
        continue
      }
      if (!res.ok) {
        throw new Error(`Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
      }
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
      if (!text) throw new Error('Gemini returned empty text')
      return text
    } catch (err) {
      lastErr = err
      await sleep(1500 * (attempt + 1))
    }
  }
  throw lastErr || new Error('Gemini call failed')
}

// Tolerant JSON parse — strips ```json fences a model may add despite
// responseMimeType, returns null on failure (caller decides how to handle).
export function parseJson(text) {
  if (typeof text !== 'string') return null
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  // Last resort: grab the outermost {...}
  const a = cleaned.indexOf('{')
  const b = cleaned.lastIndexOf('}')
  if (a !== -1 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)) } catch { /* noop */ } }
  return null
}
