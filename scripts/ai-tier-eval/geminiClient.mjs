// Thin Gemini text client for the eval harness — native generateContent
// endpoint with the x-goog-api-key header (same call shape as the OCR harness;
// the OpenAI-compat endpoint CORS-fails but works here, we just match the app's
// native path). Temperature 0 for reproducibility. No product coupling.

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

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
export async function geminiText({ apiKey, model, systemPrompt, userContent, json = false, maxTokens = 2048, temperature = 0 }) {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  }

  let lastErr = null
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(ENDPOINT(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
