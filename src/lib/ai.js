/**
 * Client-side AI service layer.
 * Handles communication with Supabase Edge Function proxy,
 * SSE streaming, circuit breaker, mock mode, and rate limiting.
 */

import { useState, useRef, useCallback } from 'react';
import { getMockResponse } from '../data/aiMocks';
import { SUPABASE_CONFIG } from '../config/supabase';

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
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return { count: 0, date: today };
    return data;
  } catch {
    return { count: 0, date: null };
  }
}

function incrementDailyUsage() {
  const today = new Date().toISOString().split('T')[0];
  const current = getDailyUsage();
  const next = { count: (current.date === today ? current.count : 0) + 1, date: today };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    this.code = code; // rate_limited | unavailable | timeout | invalid | circuit_open
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

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
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

    // Non-streaming JSON response
    const data = await res.json();
    recordSuccess();
    return { response: JSON.stringify(data.response ?? data), tokensUsed: data.tokensUsed ?? 0, cached: false };

  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err.name === 'AbortError') throw new AIError('Request aborted', 'timeout');
    recordFailure();
    throw new AIError(err.message || 'AI service unavailable', 'unavailable');
  }
}

// ── SSE Stream Reader ───────────────────────────────────────

async function readSSEStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let tokensUsed = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

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
            // Non-JSON line in stream, treat as raw text
            if (data.trim()) {
              accumulated += data;
              onChunk?.(data);
            }
          }
        }
      }
    }

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
