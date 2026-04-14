/**
 * OpenRouter free model integration.
 * Provides free AI responses using OpenRouter's free-tier models.
 *
 * Free models available on OpenRouter (no API key required for some):
 * - google/gemma-3-1b-it:free
 * - meta-llama/llama-4-scout:free
 * - deepseek/deepseek-r1-0528:free
 *
 * To use: Set VITE_OPENROUTER_KEY in .env.local (free key from openrouter.ai)
 * If no key is set, falls back to the expert system.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Free models ranked by quality for educational use
const FREE_MODELS = [
  'deepseek/deepseek-r1-0528:free',
  'meta-llama/llama-4-scout:free',
  'google/gemma-3-1b-it:free',
]

/**
 * Check if OpenRouter is configured (has API key).
 */
export function isOpenRouterAvailable() {
  return !!(import.meta.env.VITE_OPENROUTER_KEY)
}

/**
 * Call OpenRouter's free models.
 *
 * @param {Object} options
 * @param {string} options.systemPrompt - System instructions
 * @param {Array} options.messages - Chat messages [{role, content}]
 * @param {number} [options.maxTokens=1024] - Max response tokens
 * @param {AbortSignal} [options.signal] - Cancellation signal
 * @returns {Promise<string>} Response text
 */
export async function callOpenRouter({ systemPrompt, messages, maxTokens = 1024, signal }) {
  const apiKey = import.meta.env.VITE_OPENROUTER_KEY
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  // Try each free model in order until one works
  let lastError = null
  for (const model of FREE_MODELS) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://igcse-malay.app',
          'X-Title': 'IGCSE Malay Master',
        },
        body: JSON.stringify({
          model,
          messages: fullMessages,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
        signal,
      })

      if (!res.ok) {
        const err = await res.text().catch(() => '')
        lastError = new Error(`OpenRouter ${model}: ${res.status} ${err}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (content) return content

      lastError = new Error(`OpenRouter ${model}: empty response`)
    } catch (err) {
      if (err.name === 'AbortError') throw err
      lastError = err
    }
  }

  throw lastError || new Error('All free models failed')
}

/**
 * Simplified Cikgu Maya chat via OpenRouter free models.
 * Uses a condensed system prompt optimized for free model capabilities.
 */
export async function chatWithFreeModel(messages, contextNote = '', signal) {
  const systemPrompt = `You are Cikgu Maya, a friendly IGCSE Malay language tutor. Help students learn Malay grammar, vocabulary, and exam preparation.

Rules:
- Explain in simple English with Malay examples
- Focus on IGCSE syllabus: imbuhan (meN-, ber-, di-, ter-), tense markers, kata hubung, essay writing, speaking tips
- Always provide example sentences
- Be encouraging and patient
- Keep answers concise (under 200 words)
${contextNote}`

  return callOpenRouter({ systemPrompt, messages, maxTokens: 512, signal })
}
