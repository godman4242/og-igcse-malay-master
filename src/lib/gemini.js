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

export async function callGemini({ systemPrompt, messages, maxTokens = 1024, signal, responseMimeType }) {
  if (!KEY) throw new Error('Gemini API key not configured')
  const body = {
    contents: toGeminiContents(messages || []),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      ...(responseMimeType && { responseMimeType }),
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

// AI-Driven Evaluator for IGCSE English Paper 2 Writing
export async function fetchAIGrade(content, formatHints, localMetrics, errorSummary, findings, signal) {
  // Map format hints into a JSON schema expectation string so the AI knows what keys to output
  const markerKeys = formatHints && formatHints.length > 0 
    ? formatHints.map(hint => `"${hint.toLowerCase().replace(/[^a-z0-9]+/g, '_')}": boolean`).join(', ')
    : '"meets_general_structure": boolean';

  // Format local findings to inject into the prompt
  const findingsList = findings && findings.length > 0
    ? findings.slice(0, 15).map(f => `- ${f.type} (${f.severity}): "${f.excerpt}" -> ${f.message}`).join('\n')
    : 'No major grammar or spelling errors found.';

  const metricsString = localMetrics 
    ? `Word count: ${localMetrics.wordCount}. Lexical diversity (TTR): ${localMetrics.ttr}. Errors per 100 words: ${localMetrics.errorsPer100}.`
    : '';

  const systemPrompt = `You are a Senior IGCSE English Language Examiner for Paper 2 (Writing). Your task is to provide a rigorous, fair, and evidence-based evaluation of student essays.

Grading Protocol:
1. Analyze the Format: Identify if the student has met the specific conventions for the selected genre.
2. Incorporate Local Heuristics:
   We have already run a local rule-based analysis on this essay. 
   ${metricsString}
   Identified Errors:
   ${findingsList}
   Do not hallucinate errors. Use the provided list of errors to judge the accuracy.
3. Score out of 6: Use a holistic approach where:
   5-6: Sophisticated, varied vocabulary; seamless cohesion; strong voice; few to no errors.
   3-4: Clear communication; some complex structures; generally accurate but may lack flair or consistent "voice."
   1-2: Basic vocabulary; frequent errors; limited development of ideas.
   NOTE: If errors per 100 words is high (> 2.0) or word count is very low, cap the score heavily.

Output Requirements:
You must return your analysis strictly in JSON format. Do not include any conversational text. Use this exact schema:
{
  "band": number,
  "justification": "A 2-sentence summary of why this grade was given.",
  "positives": ["Point 1", "Point 2"],
  "improvements": ["Specific area 1", "Specific area 2"],
  "marker_check": { ${markerKeys} }
}`;

  const resText = await callGemini({
    systemPrompt,
    messages: [{ role: 'user', content }],
    maxTokens: 1024,
    signal,
    responseMimeType: 'application/json',
  });

  try {
    return JSON.parse(resText);
  } catch (err) {
    throw new Error('Failed to parse AI grading JSON');
  }
}
