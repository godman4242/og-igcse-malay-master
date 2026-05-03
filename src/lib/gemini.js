// Google Gemini integration. Mirrors the openrouter.js shape so the AI
// router in src/lib/ai.js can swap providers cleanly. Free tier on
// gemini-2.0-flash is generous (15 RPM, 1M tokens/day) which makes it the
// default writing tutor when a user has set VITE_GEMINI_KEY.

const KEY = import.meta.env.VITE_GEMINI_KEY
const MODEL = 'gemini-2.0-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export function isGeminiAvailable() {
  return Boolean(KEY)
}

// Convert chat-style messages into Gemini's contents format.
// Gemini uses 'user' and 'model' roles; system instructions go in a
// dedicated systemInstruction field.
function toGeminiContents(messages) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

export async function callGemini({ systemPrompt, messages, maxTokens = 1024, signal }) {
  if (!KEY) throw new Error('Gemini API key not configured')
  const body = {
    contents: toGeminiContents(messages || []),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
    },
  }
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] }
  }

  const res = await fetch(`${ENDPOINT}?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!text) throw new Error('Gemini: empty response')
  return text
}

// Convenience: plain chat with a context-aware system prompt — used by
// Cikgu Maya / writing tutor when Gemini is the chosen provider.
export async function chatWithGemini(messages, contextNote = '', signal) {
  const systemPrompt = `You are Cikgu Maya, a friendly IGCSE Malay language tutor. Help students learn Malay grammar, vocabulary, and exam preparation.

Rules:
- Explain in simple English with Malay examples
- Focus on IGCSE syllabus: imbuhan (meN-, ber-, di-, ter-), tense markers, kata hubung, essay writing, speaking tips
- Always provide example sentences
- Be encouraging and patient
- Keep answers concise (under 200 words)
${contextNote}`
  return callGemini({ systemPrompt, messages, maxTokens: 512, signal })
}
