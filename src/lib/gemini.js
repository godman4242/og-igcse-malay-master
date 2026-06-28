// Google Gemini integration. Mirrors the openrouter.js shape so the AI
// router in src/lib/ai.js can swap providers cleanly. Current default model
// is gemini-3.5-flash (set in api/gemini.js); previous gemini-2.0-flash was
// retired by Google in the 2025-12 deprecation wave.
//
// Throws are typed via `error.cause = 'no_key' | 'offline' | 'http' | 'empty' | 'network'`
// so UI callers can branch on the failure mode (toast vs. silent fallback).
import { CIKGU_SYSTEM_PROMPT } from '../core/agent/promptLibrary';
import { buildWritingGradePrompt } from './writingGradePrompt.js';

// Re-export so existing callers (and the Task-2 byte-identity test, which imports
// from '../gemini.js') keep working unchanged. The builder itself now lives in
// writingGradePrompt.js — see the header there for why (the eval harness's Node
// resolver can't reach the .ts promptLibrary that gemini.js imports).
export { buildWritingGradePrompt } from './writingGradePrompt.js';

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

export async function callGemini({ systemPrompt, messages, maxTokens = 1024, signal, responseMimeType, timeoutMs = DEFAULT_TIMEOUT_MS, thinkingConfig }) {
  if (!isOnline()) throw makeError('You appear to be offline — Gemini needs a network connection', 'offline')

  const body = {
    contents: toGeminiContents(messages || []),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      ...(responseMimeType && { responseMimeType }),
      // Only set when a caller passes it (the task-aware grade does, to minimise
      // thinking so the bigger JSON isn't truncated). When omitted the body is
      // byte-identical to before — the no-task grade path stays unchanged.
      ...(thinkingConfig && { thinkingConfig }),
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

  // Attach session JWT so the proxy can verify the caller. Await initSupabase
  // (not the sync getSupabase getter) so we don't race AuthGuard's lazy init
  // on cold load — without this, the first call after a hard reload may fire
  // before the client is ready and arrive at the proxy with no Authorization.
  let sessionHeader = ''
  try {
    const { initSupabase } = await import('../config/supabase')
    const client = await initSupabase()
    if (client) {
      const { data } = await client.auth.getSession()
      if (data?.session?.access_token) {
        sessionHeader = `Bearer ${data.session.access_token}`
      }
    }
  } catch { /* no session — request will be rejected by the proxy */ }

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionHeader ? { 'Authorization': sessionHeader } : {}),
      },
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
  const systemPrompt = `${CIKGU_SYSTEM_PROMPT}

${contextNote}`;
  return callGemini({ systemPrompt, messages, maxTokens: 512, signal })
}

// AI-Driven Evaluator for IGCSE Paper 2 Writing. `lang` selects the examiner
// persona/descriptors: omitted/'eng' → English (byte-identical), 'malay' → the
// Bahasa Melayu 0546 examiner. The JSON schema keys are identical across both.
export async function fetchAIGrade(content, formatHints, localMetrics, errorSummary, findings, signal, task, lang) {
  const systemPrompt = buildWritingGradePrompt({ formatHints, metrics: localMetrics, findings, task, lang });

  // The task-aware grade returns a BIGGER JSON (content_band,
  // content_justification, task_coverage{…}). Production runs gemini-3.5-flash,
  // which THINKS before emitting and consumes maxOutputTokens doing so. With the
  // old 1024 cap the JSON gets truncated → unparseable → content_band missing.
  // For the task branch ONLY: raise the budget to 2048 AND minimise thinking
  // (thinkingLevel 'low'). The no-task branch is byte-identical to before
  // (1024, no thinkingConfig).
  const resText = await callGemini({
    systemPrompt,
    messages: [{ role: 'user', content }],
    ...(task
      ? { maxTokens: 2048, thinkingConfig: { thinkingLevel: 'low' } }
      : { maxTokens: 1024 }),
    signal,
    responseMimeType: 'application/json',
  });

  try {
    return JSON.parse(resText);
  } catch {
    throw new Error('Failed to parse AI grading JSON');
  }
}
