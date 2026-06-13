// Phase-2 completion increment B — AI roleplay seed (key-gated).
// Turns the learner's goal + interests into ONE custom roleplay scenario shaped
// exactly like a src/data/scenarios.js entry, so the existing
// RoleplaySession({ scenario, onExit }) consumes it unmodified.
//
// Layering mirrors deckGenerator.js:
//  - pure (TDD): buildScenarioPrompt, parseScenarioCandidate — deterministic,
//    no network, no store. The parser STRICT-VALIDATES: a malformed/injected
//    response returns null (caller shows a friendly retry) — we never launch a
//    broken scenario or pass unknown keys through to React.
//  - orchestration: generateScenario — same chain as generateDeckText
//    (mock → callInstruct BYOK → OpenRouter env → edge proxy).
//
// Custom scenarios are SESSION-ONLY in v1 (not persisted — veto note in the
// spec: a "my scenarios" shelf later needs a store slice + cap).
// Spec: docs/superpowers/specs/2026-06-13-for-you-phase2-completion-design.md §B

import { hasInstructProvider, callInstruct } from './instruct.js'
import { isOpenRouterAvailable, callOpenRouter } from './openrouter.js'
import { callAI } from './ai.js'
import { getMockResponse } from '../data/aiMocks.js'

const MIN_TURNS = 3
const MAX_TURNS = 6

// ── Pure: prompt builder ────────────────────────────────────────────────────

export function buildScenarioPrompt(goal, interests = [], lang = 'ms') {
  const cleanGoal = (typeof goal === 'string' ? goal.trim() : '') || 'everyday IGCSE conversation practice'
  const likes = (Array.isArray(interests) ? interests.filter(Boolean) : []).slice(0, 3)
  const langName = lang === 'en' ? 'English' : 'Malay (Bahasa Melayu)'

  const system = [
    `You write IGCSE speaking-exam roleplay scenarios in ${langName}.`,
    'Respond with ONE JSON object only — no prose, no markdown fences.',
    'Schema: {"title": string, "titleEn": string, "context": string, "contextEn": string,',
    `"keyVocab": string[6-10], "turns": [{"examiner": string, "hint": string}] with ${MIN_TURNS}-5 turns}.`,
    `"examiner" lines are what the examiner SAYS, in ${langName}, simple IGCSE level.`,
    '"hint" is a short English nudge for the student\'s reply. "context"/"title" in the scenario language; the *En fields in English.',
  ].join('\n')

  const user = [
    `Learner goal: ${cleanGoal}.`,
    likes.length ? `Theme it around their interests where natural: ${likes.join(', ')}.` : '',
    'Make it a realistic everyday situation with a clear task, rising slightly in difficulty across turns.',
  ].filter(Boolean).join('\n')

  return { system, user }
}

// ── Pure: strict-validating parser ──────────────────────────────────────────

function cleanStr(v) {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Parse + validate the model's text into a launchable scenario, or null.
 * Survives prose/fence-wrapped JSON. Strips every key not in the contract.
 */
export function parseScenarioCandidate(text, lang = 'ms') {
  if (typeof text !== 'string' || !text.trim()) return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null

  let raw
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const title = cleanStr(raw.title)
  const context = cleanStr(raw.context)
  if (!title || !context) return null

  if (!Array.isArray(raw.keyVocab)) return null
  const keyVocab = raw.keyVocab.map(cleanStr).filter(Boolean).slice(0, 12)
  if (!keyVocab.length) return null

  if (!Array.isArray(raw.turns)) return null
  const turns = raw.turns
    .map(t => ({ examiner: cleanStr(t?.examiner), hint: cleanStr(t?.hint) }))
    .slice(0, MAX_TURNS)
  if (turns.length < MIN_TURNS) return null
  if (turns.some(t => !t.examiner)) return null

  // Re-built object = whitelist; unknown/injected keys never pass through.
  return {
    id: `ai-${Date.now().toString(36)}`,
    lang: lang === 'en' ? 'en' : 'ms',
    title,
    titleEn: cleanStr(raw.titleEn) || title,
    context,
    contextEn: cleanStr(raw.contextEn) || context,
    totalTurns: turns.length,
    keyVocab,
    turns,
    aiGenerated: true, // provenance — the preview shows this to the learner
  }
}

// ── Orchestration (same chain order as generateDeckText) ────────────────────

export async function generateScenarioText({ goal, interests = [], lang = 'ms', signal } = {}) {
  if (import.meta.env.VITE_AI_MOCK === 'true') {
    return getMockResponse('scenario')
  }
  const { system, user } = buildScenarioPrompt(goal, interests, lang)

  if (hasInstructProvider()) {
    try {
      return await callInstruct({
        systemPrompt: system,
        messages: [{ role: 'user', content: user }],
        maxTokens: 1024,
        signal,
      })
    } catch (e) {
      if (e?.name === 'AbortError') throw e
      // BYOK adapters exhausted — fall through to the legacy chain.
    }
  }

  if (isOpenRouterAvailable()) {
    return await callOpenRouter({
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 1024,
      signal,
    })
  }

  const result = await callAI({
    action: 'chat',
    payload: { messages: [{ role: 'user', content: user }], scenarioContext: system },
    stream: false,
    signal,
  })
  return result.response
}

/** Full pipeline: generate → parse. Returns the scenario or null (retry). */
export async function generateScenario({ goal, interests = [], lang = 'ms', signal } = {}) {
  const text = await generateScenarioText({ goal, interests, lang, signal })
  return parseScenarioCandidate(text, lang)
}
