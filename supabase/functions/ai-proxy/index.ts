/**
 * Supabase Edge Function: AI Proxy
 * Routes requests to Claude API with streaming support.
 * Handles CORS, rate limiting, and error responses.
 *
 * Deploy: supabase functions deploy ai-proxy
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

  // writing-feedback-v2 — annotated, scaffold-aware feedback. Built per-request
  // by buildWritingFeedbackV2Prompt() so the schema doc can reference lang.
};

function buildWritingFeedbackV2Prompt(lang: string): string {
  const isMS = lang !== 'en';
  const langName = isMS ? 'Malay (Bahasa Melayu)' : 'English';
  const errorCategory = isMS
    ? '"imbuhan" for verb-affix errors (do NOT use "verb-form")'
    : '"verb-form" for verb-conjugation errors (do NOT use "imbuhan")';

  return `You are an IGCSE ${langName} writing examiner. Produce ANNOTATED feedback as a strict JSON object.

CRITICAL OUTPUT INVARIANT — the spans inside studentText MUST partition the original essay text exactly. concat(studentText.spans[i].text) === originalText, character for character, including whitespace and punctuation. Do not paraphrase, drop, or alter the original text. Split it into spans.

Category enum (use ONLY these values, or null):
imbuhan | verb-form | vocab-upgrade | cohesion | sophisticated-lexicon | spelling | register | sentence-structure
For ${langName} essays use ${errorCategory}.

Each non-null span MUST have a groupId that references an existing entry in studentText.groups[].id.

RESPONSE FORMAT (JSON, no markdown fences):
{
  "band": 4,
  "overall": "one-paragraph diagnosis in plain prose",
  "scaffoldLevelApplied": "heavy" | "medium" | "light",
  "studentText": {
    "spans": [
      { "text": "<literal text from the essay>", "category": null, "groupId": null },
      { "text": "<literal text>", "category": "imbuhan", "groupId": 1, "note": "..." }
    ],
    "groups": [
      { "id": 1, "label": "Verb form (imbuhan)", "category": "imbuhan" }
    ]
  },
  "modelRewrite": {
    "spans": [
      { "text": "Saya ", "isKey": false },
      { "text": "menikmati", "isKey": true, "lift": "verb upgrade" }
    ]
  },
  "strengths": ["..."],
  "fixes": [{ "groupId": 1, "issue": "...", "fix": "..." }],
  "nextStep": "..."
}

Always respond with valid JSON only.`;
}

const SCAFFOLD_RULES_WRITING = {
  heavy: `
SCAFFOLD LEVEL: heavy.
RULES:
- Lead with ONE genuine strength drawn from \`recentStrengths\` if present; otherwise from the essay itself. Never manufacture praise.
- Surface AT MOST 3 fixes, grouped under AT MOST 2 numbered themes in \`groups[]\`.
- \`modelRewrite\` covers only the WEAKEST sentence (one sentence, not the whole essay).
- Tone: warm and concrete. No exam-doom phrases ("you will lose marks", "this is wrong", "below standard").
- Anchor at least one fix in \`focusTopics\` if non-empty — the student has been working on these.`,
  medium: `
SCAFFOLD LEVEL: medium.
RULES:
- Up to 5 fixes across up to 3 numbered themes.
- \`modelRewrite\` is a full-paragraph rewrite (~50-80 words).
- Balanced tone. Cite the rule by name when correcting (e.g. "meN- + p → mem-").`,
  light: `
SCAFFOLD LEVEL: light.
RULES:
- Full feedback. Up to 5 fixes; up to 4 groups.
- \`modelRewrite\` is a full-paragraph rewrite.
- Add a \`nextStep\` that pushes toward the NEXT band (e.g. "Try one passive-voice sentence with \`di-\` + agent.").
- You may suggest stylistic flourishes (e.g. peribahasa, advanced kata hubung) the student has not yet used.`,
};

const SCAFFOLD_RULES_ROLEPLAY = {
  heavy: `
SCAFFOLD LEVEL: heavy.
RULES:
- High-frequency vocabulary only; avoid rare lexis.
- Keep examinerResponse to AT MOST 2 sentences.
- Ask exactly ONE closed question per turn.
- Cap feedback.vocabMissed at 2 items.
- Tone: warm and concrete; no exam-doom phrases.`,
  medium: `
SCAFFOLD LEVEL: medium.
RULES:
- Baseline examiner behaviour. Mix open and closed questions as appropriate.`,
  light: `
SCAFFOLD LEVEL: light.
RULES:
- Richer vocabulary; 3-4 sentence prompts with embedded follow-ups.
- Push the student toward higher-band lexis and structures.`,
};

const SCAFFOLD_RULES_ROLEPLAY_SCORE = {
  heavy: `
SCAFFOLD LEVEL: heavy.
RULES:
- strengths[] MUST contain at least 2 specific, evidence-based items (quote the student where possible).
- Keep areasToImprove[] concise (≤3 items) and group related fixes.
- Tone: warm and concrete; no exam-doom phrases.`,
  medium: `
SCAFFOLD LEVEL: medium.
RULES:
- Baseline scorecard behaviour.`,
  light: `
SCAFFOLD LEVEL: light.
RULES:
- Add a brief "stretch goal" inside areasToImprove[0] (prefix with "Stretch:") that pushes toward the next band.`,
};

type LearnerProfile = {
  scaffoldLevel?: 'heavy' | 'medium' | 'light';
  focusTopics?: string[];
  recentStrengths?: string[];
  signals?: Record<string, unknown>;
};

function scaffoldLevelOf(profile: unknown): 'heavy' | 'medium' | 'light' {
  const p = profile as LearnerProfile | null | undefined;
  const lvl = p?.scaffoldLevel;
  if (lvl === 'heavy' || lvl === 'medium' || lvl === 'light') return lvl;
  return 'medium';
}

// Bound user-controlled strings before they hit the prompt. Caps each item
// at 80 chars and the array at 5 — generous for legitimate use, defensive
// against a malicious client trying to blow the context window.
function sanitiseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .slice(0, 5)
    .map((v) => v.slice(0, 80));
}

function appendAdaptation(
  base: string,
  rules: Record<'heavy' | 'medium' | 'light', string>,
  profile: unknown,
): string {
  const level = scaffoldLevelOf(profile);
  let block = rules[level];
  const p = profile as LearnerProfile | null | undefined;
  const focus = sanitiseStringList(p?.focusTopics);
  const strengths = sanitiseStringList(p?.recentStrengths);
  if (focus.length || strengths.length) {
    block += `\n\nLearner profile:`;
    if (focus.length) block += `\n- focusTopics: ${focus.join(', ')}`;
    if (strengths.length) block += `\n- recentStrengths: ${strengths.join(', ')}`;
  }
  return base + '\n' + block;
}

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

  // Resolve the base system prompt. writing-feedback-v2 is built per request
  // because the schema instructions reference the language.
  let systemPrompt: string;
  if (action === 'writing-feedback-v2') {
    systemPrompt = buildWritingFeedbackV2Prompt(String(payload.lang || 'ms'));
  } else {
    systemPrompt = SYSTEM_PROMPTS[action];
  }
  if (!systemPrompt) {
    return errorResponse(`Unknown action: ${action}`, 'invalid', 400, origin);
  }

  // Build messages from payload. writing-feedback-v2 expects payload.text;
  // wrap it as a single user turn. Reject obviously bad input before burning
  // a real Anthropic call.
  let messages;
  if (action === 'writing-feedback-v2') {
    if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      return errorResponse('writing-feedback-v2 requires payload.text (string)', 'invalid', 400, origin);
    }
    messages = [{ role: 'user', content: payload.text }];
  } else if (Array.isArray(payload.messages)) {
    const cleaned = payload.messages.filter(
      (m): m is { role: string; content: string } =>
        m && typeof m === 'object' && typeof (m as { content?: unknown }).content === 'string'
    );
    if (cleaned.length === 0) {
      return errorResponse('payload.messages had no valid entries', 'invalid', 400, origin);
    }
    messages = cleaned;
  } else {
    const single = typeof payload.text === 'string' ? payload.text
      : typeof payload.content === 'string' ? payload.content
      : '';
    if (single.length === 0) {
      return errorResponse('payload must provide text/content/messages', 'invalid', 400, origin);
    }
    messages = [{ role: 'user', content: single }];
  }

  // Append scenario context if present
  let fullSystem = systemPrompt;
  if (payload.scenarioContext) fullSystem += `\n\nSCENARIO CONTEXT: ${payload.scenarioContext}`;
  if (payload.turnInfo) fullSystem += `\n\n${payload.turnInfo}`;

  // Adaptation: append scaffold-aware rules driven by payload.learnerProfile.
  // writing-feedback-v2 always adapts (falls back to medium per spec §4.1).
  // Legacy roleplay actions only adapt when an explicit profile is sent —
  // this keeps behaviour bytewise identical for old clients (spec §6.5).
  if (action === 'writing-feedback-v2') {
    fullSystem = appendAdaptation(fullSystem, SCAFFOLD_RULES_WRITING, payload.learnerProfile);
  } else if (action === 'roleplay' && payload.learnerProfile) {
    fullSystem = appendAdaptation(fullSystem, SCAFFOLD_RULES_ROLEPLAY, payload.learnerProfile);
  } else if (action === 'roleplay-score' && payload.learnerProfile) {
    fullSystem = appendAdaptation(fullSystem, SCAFFOLD_RULES_ROLEPLAY_SCORE, payload.learnerProfile);
  }

  const maxTokens = Math.min(Number(payload.maxTokens) || DEFAULT_MAX_TOKENS, 2048);

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
            const detail = err?.message || err?.error?.message || String(err);
            console.error(`[ai-proxy stream:${action}]`, detail);
            const errData = JSON.stringify({ type: 'error', error: detail });
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

      // Claude sometimes wraps JSON in ```json fences despite the prompt
      // forbidding it. Strip a single leading/trailing fence before parse so
      // v1 clients (which expect an object) don't get a string back.
      const stripped = responseText
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '');

      let parsed;
      try {
        parsed = JSON.parse(stripped);
      } catch {
        console.warn(`[ai-proxy:${action}] response is not valid JSON, returning raw text`);
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
    const status = err?.status === 429 ? 429 : 502;
    const code = err?.status === 429 ? 'rate_limited' : 'unavailable';
    const detail = err?.message || err?.error?.message || String(err);
    console.error(`[ai-proxy:${action}] upstream failure`, detail);
    return errorResponse(`Claude API error: ${detail}`, code, status, origin);
  }
});
