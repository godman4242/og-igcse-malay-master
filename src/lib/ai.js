/**
 * Client-side AI service layer.
 * Handles communication with Supabase Edge Function proxy,
 * SSE streaming, circuit breaker, mock mode, and rate limiting.
 */

import { useState, useRef, useCallback } from 'react';
import { getMockResponse } from '../data/aiMocks';
import { SUPABASE_CONFIG } from '../config/supabaseConfig';
import { initSupabase } from '../config/supabase';
import { getTodayISO } from './localDay';

// ── Constants ───────────────────────────────────────────────

const DAILY_LIMIT = 50;
const CIRCUIT_BREAKER_THRESHOLD = 3;   // failures before tripping
const CIRCUIT_BREAKER_WINDOW = 60_000; // 60s window for counting failures
const CIRCUIT_BREAKER_COOLDOWN = 120_000; // 120s cooldown after trip
const MOCK_STREAM_DELAY = 30; // ms between mock chunks

const STORAGE_KEY = 'igcse-ai-daily';

// ── Rate Limiting (client-side) ─────────────────────────────

function getDailyUsage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: null };
    const data = JSON.parse(raw);
    const today = getTodayISO();
    if (data.date !== today) return { count: 0, date: today };
    return data;
  } catch {
    return { count: 0, date: null };
  }
}

function incrementDailyUsage() {
  const today = getTodayISO();
  const current = getDailyUsage();
  const next = { count: (current.date === today ? current.count : 0) + 1, date: today };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort counter. A storage write failure (quota exceeded, Safari
    // private mode) must NOT convert an already-received successful reply into
    // an AIError, nor trip the circuit breaker (#42, 2026-07-03 review).
  }
  return next;
}

export function getRemainingCalls() {
  const usage = getDailyUsage();
  return Math.max(0, DAILY_LIMIT - usage.count);
}

// ── Circuit Breaker ─────────────────────────────────────────

const circuitState = {
  failures: [],       // timestamps of recent failures
  trippedAt: null,    // when the breaker tripped
};

function isCircuitOpen() {
  if (!circuitState.trippedAt) return false;
  if (Date.now() - circuitState.trippedAt > CIRCUIT_BREAKER_COOLDOWN) {
    // Cooldown expired — half-open, allow one attempt
    circuitState.trippedAt = null;
    circuitState.failures = [];
    return false;
  }
  return true;
}

function recordFailure() {
  const now = Date.now();
  circuitState.failures = circuitState.failures.filter(t => now - t < CIRCUIT_BREAKER_WINDOW);
  circuitState.failures.push(now);
  if (circuitState.failures.length >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitState.trippedAt = now;
  }
}

function recordSuccess() {
  circuitState.failures = [];
  circuitState.trippedAt = null;
}

// ── Custom Error ────────────────────────────────────────────

export class AIError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AIError';
    this.code = code; // rate_limited | unavailable | timeout | invalid | circuit_open | unauthenticated
  }
}

// ── Mock Streaming ──────────────────────────────────────────

async function streamMockResponse(action, onChunk, signal) {
  const fullText = getMockResponse(action);
  const chunks = [];
  // Split into ~20-char chunks to simulate streaming
  for (let i = 0; i < fullText.length; i += 20) {
    chunks.push(fullText.slice(i, i + 20));
  }

  let accumulated = '';
  for (const chunk of chunks) {
    if (signal?.aborted) throw new AIError('Request aborted', 'timeout');
    await new Promise(r => setTimeout(r, MOCK_STREAM_DELAY));
    accumulated += chunk;
    onChunk?.(chunk);
  }

  return { response: accumulated, tokensUsed: 0, cached: false, mock: true };
}

// ── Core AI Call ────────────────────────────────────────────

/**
 * Call the AI proxy edge function.
 *
 * @param {Object} options
 * @param {string} options.action - 'roleplay' | 'roleplay-score' | 'writing-feedback' | 'chat' | 'comprehension'
 * @param {Object} options.payload - Action-specific data (messages, essay text, etc.)
 * @param {boolean} [options.stream=true] - Whether to stream the response
 * @param {function} [options.onChunk] - Called with each text chunk during streaming
 * @param {AbortSignal} [options.signal] - AbortController signal for cancellation
 * @returns {Promise<{ response: string, tokensUsed: number, cached: boolean }>}
 */
export async function callAI({ action, payload, stream = true, onChunk, signal }) {
  // Mock mode — return canned responses
  if (import.meta.env.VITE_AI_MOCK === 'true') {
    return streamMockResponse(action, onChunk, signal);
  }

  // Circuit breaker check
  if (isCircuitOpen()) {
    throw new AIError('AI service temporarily unavailable. Will retry automatically.', 'circuit_open');
  }

  // Rate limit check
  if (getRemainingCalls() <= 0) {
    throw new AIError('Daily AI limit reached. Resets at midnight.', 'rate_limited');
  }

  // Build request URL
  const baseUrl = SUPABASE_CONFIG.url;
  if (!baseUrl) {
    throw new AIError('Supabase not configured.', 'unavailable');
  }

  const url = `${baseUrl}/functions/v1/ai-proxy`;

  // The edge function runs with verify_jwt = true, so the gateway requires a
  // real Supabase session JWT (eyJ...). The publishable key in SUPABASE_CONFIG
  // (sb_publishable_*) is not JWT format and gets rejected with
  // UNAUTHORIZED_INVALID_JWT_FORMAT before reaching function code.
  // Await initSupabase() (rather than the sync getSupabase getter) so we don't
  // race AuthGuard's lazy init on cold load.
  const client = await initSupabase();
  const { data } = client ? await client.auth.getSession() : { data: null };
  const authToken = data?.session?.access_token;
  if (!authToken) {
    throw new AIError(
      'Sign in with Google or email to use AI features.',
      'unauthenticated'
    );
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ action, payload, stream }),
      signal,
    });

    if (!res.ok) {
      const code = res.status === 429 ? 'rate_limited'
        : res.status >= 500 ? 'unavailable'
        : 'invalid';
      recordFailure();
      throw new AIError(`AI request failed: ${res.status}`, code);
    }

    incrementDailyUsage();

    // Streaming response
    if (stream && res.headers.get('content-type')?.includes('text/event-stream')) {
      return await readSSEStream(res, onChunk);
    }

    // Non-streaming JSON response. `data.response` is either raw model text (a
    // string — the edge fn couldn't JSON.parse it) or already-parsed structured
    // output (object/array). Match the streaming path's contract: return a plain
    // string. Stringify ONLY non-strings, else a text reply "Hi" double-encodes
    // to '"Hi"' — literal quotes leaking into the reply (2026-07-03 review).
    const data = await res.json();
    recordSuccess();
    const resp = data.response ?? data;
    const responseStr = typeof resp === 'string' ? resp : JSON.stringify(resp);
    return { response: responseStr, tokensUsed: data.tokensUsed ?? 0, cached: false };

  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err.name === 'AbortError') throw new AIError('Request aborted', 'timeout');
    recordFailure();
    throw new AIError(err.message || 'AI service unavailable', 'unavailable');
  }
}

// ── SSE Stream Reader ───────────────────────────────────────

export async function readSSEStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let tokensUsed = 0;
  // Carries the last, possibly-incomplete line across reads. Without it a
  // `data:` line split at a chunk boundary failed JSON.parse — leaking the raw
  // JSON fragment into the reply and dropping the tail (#14).
  let buffer = '';

  const processLine = (line) => {
    if (!line.startsWith('data: ')) return;
    const data = line.slice(6);
    if (data === '[DONE]') return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        accumulated += parsed.delta.text;
        onChunk?.(parsed.delta.text);
      } else if (parsed.type === 'message_stop') {
        tokensUsed = parsed.usage?.output_tokens ?? 0;
      } else if (parsed.text) {
        // Simple text chunk format
        accumulated += parsed.text;
        onChunk?.(parsed.text);
      }
    } catch {
      // A COMPLETE data line that isn't JSON — treat as raw text. Partial lines
      // never reach here: they wait in `buffer` until the rest of the chunk lands.
      if (data.trim()) {
        accumulated += data;
        onChunk?.(data);
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // last element may be an incomplete line — hold it over
      for (const line of lines) processLine(line);
    }

    // Flush the decoder + any trailing complete line the stream ended on.
    buffer += decoder.decode();
    if (buffer) processLine(buffer);

    recordSuccess();
    return { response: accumulated, tokensUsed, cached: false };
  } finally {
    reader.releaseLock();
  }
}

// ── React Hook ──────────────────────────────────────────────

/**
 * React hook for AI calls with loading/error/streaming state.
 *
 * @returns {{ call, isLoading, error, streamedText, reset }}
 */
export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamedText, setStreamedText] = useState('');
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setStreamedText('');
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const call = useCallback(async ({ action, payload, stream = true }) => {
    reset();
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await callAI({
        action,
        payload,
        stream,
        signal: controller.signal,
        onChunk: (chunk) => {
          setStreamedText(prev => prev + chunk);
        },
      });

      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      const aiError = err instanceof AIError ? err : new AIError(err.message, 'unavailable');
      setError(aiError);
      throw aiError;
    }
  }, [reset]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    call,
    cancel,
    isLoading,
    error,
    streamedText,
    reset,
    remainingCalls: getRemainingCalls(),
    isCircuitOpen: isCircuitOpen(),
  };
}
