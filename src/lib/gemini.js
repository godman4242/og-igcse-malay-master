// Google Gemini integration. Mirrors the openrouter.js shape so the AI
// router in src/lib/ai.js can swap providers cleanly. Free tier on
// gemini-2.0-flash is generous (15 RPM, 1M tokens/day) which makes it the
// default writing tutor when a user has set VITE_GEMINI_KEY.
//
// Throws are typed via `error.cause = 'no_key' | 'offline' | 'http' | 'empty' | 'network'`
// so UI callers can branch on the failure mode (toast vs. silent fallback).
import { PROMPT_SYSTEM_IDENTITY } from '../core/agent/promptLibrary';

const ENDPOINT = '/api/gemini'
const DEFAULT_TIMEOUT_MS = 25_000

export function isGeminiAvailable() {
  // Always true now, as the server handles the check
  return true
}

function makeError(message, cause, extra = {}) {
  const err = new Error(message)
  err.cause = cause
  Object.assign(err, extra)
  return err
}

function isOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
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

export async function callGemini({ systemPrompt, messages, maxTokens = 1024, signal, responseMimeType, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (!isOnline()) throw makeError('You appear to be offline — Gemini needs a network connection', 'offline')

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

  // Compose abort signal: caller's signal + our own timeout. Either trips → abort.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new DOMException('timeout', 'AbortError')), timeoutMs)
  const onCallerAbort = () => controller.abort(signal?.reason)
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    else signal.addEventListener('abort', onCallerAbort, { once: true })
  }

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw makeError(`Gemini network error: ${err?.message || err}`, 'network')
  } finally {
    clearTimeout(timeoutId)
    if (signal) signal.removeEventListener('abort', onCallerAbort)
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw makeError(`Gemini ${res.status}: ${errText.slice(0, 200)}`, 'http', { status: res.status })
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
  if (!text) throw makeError('Gemini returned an empty response', 'empty')
  return text
}

// Convenience: plain chat with a context-aware system prompt — used by
// Cikgu Maya / writing tutor when Gemini is the chosen provider.
export async function chatWithGemini(messages, contextNote = '', signal) {
  const systemPrompt = `${PROMPT_SYSTEM_IDENTITY}

${contextNote}`;
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

CRITICAL CALIBRATION - OVERCOMING AI BIAS:
LLMs typically suffer from "central tendency bias" (scoring everything a 3 or 4). You MUST use the full 1-6 range:
- DO NOT hesitate to award a 6. A 6/6 does NOT mean a Pulitzer-prize winning masterpiece. It means an excellent, highly competent essay for a 16-year-old IGCSE student. Do not withhold 6s for minor, non-impeding slips.
- DO NOT artificially inflate poor essays. If the text is very short, highly repetitive, or full of basic errors, it MUST be a 1 or 2.

HARD THRESHOLDS:
- Rule 1: If errors frequently obscure meaning or word count is very low (< 80 words), MAX BAND is 2.
- Rule 2: If local metrics show very few errors, complex structures are present, and the format is mostly met, you MUST award a 5 or 6.

Grading Protocol:
1. Analyze the Format: Identify if the student has met the specific conventions for the selected genre.
2. Incorporate Local Heuristics:
   We have already run a local rule-based analysis on this essay. 
   ${metricsString}
   Identified Errors:
   ${findingsList}
   Do not hallucinate errors. Use the provided list of errors to judge the accuracy.
3. Score out of 6 (Holistic Bands):
   Band 6: Sophisticated, varied vocabulary; seamless cohesion; strong voice; few to no errors. (Award this if metrics show very few errors and high word count).
   Band 5: Consistent communication; wide vocabulary; well-organized; minor slips.
   Band 4: Clear communication; some complex structures; generally accurate but may lack flair.
   Band 3: Understandable but relies on simple structures; noticeable errors that do not impede meaning.
   Band 2: Basic vocabulary; frequent errors that sometimes impede meaning; limited development.
   Band 1: Highly flawed; severe and frequent errors; minimal communication; very short.

Output Requirements:
You must return your analysis strictly in JSON format. Do not include any conversational text. Use this exact schema:
{
  "step_by_step_reasoning": "Before grading, briefly analyze the grammar, vocabulary, and cohesion based on the heuristics and the text. Decide if it leans towards the extreme ends (1/2 or 5/6).",
  "band": number,
  "justification": "A 2-sentence summary of why this grade was given, explicitly referencing the band descriptors.",
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
  } catch {
    throw new Error('Failed to parse AI grading JSON');
  }
}
