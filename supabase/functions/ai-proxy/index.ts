/**
 * Supabase Edge Function: AI Proxy
 * Routes requests to Claude API with streaming support.
 * Handles CORS, rate limiting, and error responses.
 *
 * Deploy: supabase functions deploy ai-proxy --no-verify-jwt
 * Test:   curl -X POST https://<project>.supabase.co/functions/v1/ai-proxy \
 *           -H "Authorization: Bearer <anon-key>" \
 *           -H "Content-Type: application/json" \
 *           -d '{"action":"chat","payload":{"messages":[{"role":"user","content":"Hello"}]}}'
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:5173').split(',');
const DAILY_LIMIT = 50;
const DEFAULT_MAX_TOKENS = 1024;
const MODEL = 'claude-sonnet-4-20250514';

// Simple in-memory rate limiter (resets on cold start, good enough for free tier)
const rateLimits = new Map<string, { count: number; date: string }>();

function getRateLimitKey(req: Request): string {
  return req.headers.get('x-forwarded-for')
    || req.headers.get('cf-connecting-ip')
    || 'anonymous';
}

function checkRateLimit(key: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  const entry = rateLimits.get(key);

  if (!entry || entry.date !== today) {
    rateLimits.set(key, { count: 1, date: today });
    return true;
  }

  if (entry.count >= DAILY_LIMIT) return false;

  entry.count++;
  return true;
}

function corsHeaders(origin: string) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function errorResponse(message: string, code: string, status: number, origin: string) {
  return new Response(
    JSON.stringify({ error: message, code, fallback: true }),
    {
      status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    }
  );
}

// ── System Prompts ──────────────────────────────────────────
// Duplicated server-side so they can't be tampered with from client

const SYSTEM_PROMPTS: Record<string, string> = {
  roleplay: `You are an IGCSE Malay Paper 3 oral exam simulator. You play the role of the examiner (pemeriksa).
Respond ONLY in Malay (Bahasa Melayu standard/baku). Keep responses 2-4 sentences.
After each student response, give a brief encouraging comment, then ask the next question.
Use vocabulary appropriate for IGCSE level. If the student writes in English, gently redirect.
Track which key vocabulary and imbuhan the student uses correctly.
RESPONSE FORMAT (JSON):
{"examinerResponse":"...","feedback":{"vocabUsed":[],"vocabMissed":[],"grammarNote":"...","imbuhanUsed":[],"imbuhanMissed":[]}}
Always respond with valid JSON only.`,

  'roleplay-score': `You are an IGCSE Malay Paper 3 exam scorer. Analyze the complete roleplay and produce a detailed assessment.
Score vocabulary, grammar, fluency, and task completion on bands 1-6.
RESPONSE FORMAT (JSON):
{"overallBand":4,"vocabulary":{"band":4,"comment":"..."},"grammar":{"band":4,"comment":"..."},"fluency":{"band":4,"comment":"..."},"taskCompletion":{"band":4,"comment":"..."},"strengths":[],"areasToImprove":[],"keyPhraseMissed":[],"modelAnswerHighlights":[]}
Always respond with valid JSON only.`,

  'writing-feedback': `You are an IGCSE Malay writing examiner. Analyze the essay with detailed, constructive feedback.
Focus on: imbuhan (highest marks), sentence structure, kata hubung, vocabulary range, spelling.
RESPONSE FORMAT (JSON):
{"band":4,"overall":"...","sentences":[{"text":"...","errors":[{"type":"...","issue":"...","fix":"..."}],"suggestions":[],"improved":"..."}],"strengths":[],"imbuhanAnalysis":{"correct":[],"incorrect":[{"used":"...","correct":"...","rule":"..."}]},"modelParagraph":"..."}
Always respond with valid JSON only.`,

  chat: `You are Cikgu Maya, a patient and encouraging Malay language teacher specializing in IGCSE preparation.
Use Socratic method. Respond primarily in English but use Malay examples extensively.
Always provide example sentences when explaining grammar. Stay within IGCSE syllabus.
Keep responses concise (3-8 sentences). End with a follow-up question or practice suggestion.`,

  comprehension: `You are an IGCSE Malay Paper 1 reading comprehension question generator.
Generate exactly 5 questions: vocabulary, factual, inference, main_idea, grammar.
RESPONSE FORMAT (JSON):
{"questions":[{"id":1,"type":"...","question":"...","questionEn":"...","options":["A)...","B)...","C)...","D)..."],"correctIndex":0,"explanation":"...","referenceText":"..."}]}
Always respond with valid JSON only.`,
};

// ── Main Handler ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 'invalid', 405, origin);
  }

  if (!CLAUDE_API_KEY) {
    return errorResponse('AI service not configured', 'unavailable', 503, origin);
  }

  // Rate limit
  const clientKey = getRateLimitKey(req);
  if (!checkRateLimit(clientKey)) {
    return errorResponse('Daily AI limit reached', 'rate_limited', 429, origin);
  }

  let body: { action: string; payload: Record<string, unknown>; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'invalid', 400, origin);
  }

  const { action, payload, stream = true } = body;

  const systemPrompt = SYSTEM_PROMPTS[action];
  if (!systemPrompt) {
    return errorResponse(`Unknown action: ${action}`, 'invalid', 400, origin);
  }

  // Build messages from payload
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : [{ role: 'user', content: String(payload.text || payload.content || '') }];

  // Append scenario context if present
  let fullSystem = systemPrompt;
  if (payload.scenarioContext) fullSystem += `\n\nSCENARIO CONTEXT: ${payload.scenarioContext}`;
  if (payload.turnInfo) fullSystem += `\n\n${payload.turnInfo}`;

  const maxTokens = Number(payload.maxTokens) || DEFAULT_MAX_TOKENS;

  const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

  try {
    if (stream) {
      // SSE streaming response
      const readableStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          try {
            const stream = client.messages.stream({
              model: MODEL,
              max_tokens: maxTokens,
              system: fullSystem,
              messages,
            });

            for await (const event of stream) {
              if (event.type === 'content_block_delta') {
                const data = JSON.stringify({
                  type: 'content_block_delta',
                  delta: { text: event.delta.type === 'text_delta' ? event.delta.text : '' },
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }

            const finalMessage = await stream.finalMessage();
            const stopData = JSON.stringify({
              type: 'message_stop',
              usage: finalMessage.usage,
            });
            controller.enqueue(encoder.encode(`data: ${stopData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            const errData = JSON.stringify({ type: 'error', error: err.message });
            controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming JSON response
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system: fullSystem,
        messages,
      });

      const responseText = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = responseText;
      }

      return new Response(
        JSON.stringify({ response: parsed, tokensUsed: message.usage?.output_tokens ?? 0 }),
        {
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (err) {
    const status = err.status === 429 ? 429 : 502;
    const code = err.status === 429 ? 'rate_limited' : 'unavailable';
    return errorResponse(`Claude API error: ${err.message}`, code, status, origin);
  }
});
