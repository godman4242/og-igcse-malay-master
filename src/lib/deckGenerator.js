// src/lib/deckGenerator.js
//
// Phase 2 increment D — AI custom deck generator (key-gated). Turns a learner's
// goal + weak topics + interests into a small Malay↔English vocab deck, then runs
// every proposed pair through the grounding gate (verifyPair) so a made-up or
// mistranslated word can NEVER silently land in the deck — unverified pairs are
// surfaced for the learner to confirm (Tier 4, learner-in-the-loop).
//
// Layering:
//  - pure parts (TDD): buildDeckPrompt, parseDeckCandidates, groundCandidates,
//    deckNameForGoal — deterministic, no network, no store.
//  - AI orchestration: generateDeckText (3-tier chain + VITE_AI_MOCK) and
//    buildDeckGroundingIndex (lazy-loads the owned dictionary + CC0 Wikidata asset).
//
// Design: docs/superpowers/specs/2026-06-06-personalized-for-you-design.md §5.3
// Grounding: src/lib/dictionaryGrounding.js · Licensing: …phase2-dictionary-licensing.md

import { buildGroundingIndex, verifyPair } from './dictionaryGrounding.js'
import { isOpenRouterAvailable, callOpenRouter } from './openrouter.js'
import { callAI } from './ai.js'
import { getMockResponse } from '../data/aiMocks.js'

const MAX_CANDIDATES = 40
const TARGET_COUNT = 12

// ── Pure: prompt builder ────────────────────────────────────────────────────

/**
 * Build the system + user prompts for a custom deck.
 *
 * @param {string} goal - the learner's goal (preset label or free-text sentence)
 * @param {string[]} [focusTopics] - weak areas to bias toward (e.g. ['imbuhan'])
 * @param {string[]} [interests] - personal interests to theme examples around
 * @returns {{ system: string, user: string }}
 */
export function buildDeckPrompt(goal, focusTopics = [], interests = []) {
  const cleanGoal = (typeof goal === 'string' ? goal.trim() : '') || 'general IGCSE Malay improvement'
  const topics = Array.isArray(focusTopics) ? focusTopics.filter(Boolean) : []
  const likes = Array.isArray(interests) ? interests.filter(Boolean) : []

  const system = [
    'You are a vocabulary author for an IGCSE Malay (0546) learning app.',
    `Produce a focused deck of about ${TARGET_COUNT} useful Malay vocabulary items.`,
    'Output ONLY a JSON array — no prose, no markdown fences. Each element is an object with exactly these keys:',
    '  "m": the Malay word or short phrase, in standard Bahasa Melayu spelling (baku, never slang),',
    '  "e": a concise English meaning (one to three words),',
    '  "ex": a short, natural Malay example sentence using the word.',
    'Choose common, exam-relevant words a 16-year-old needs. Use correct, real Malay only —',
    'never invent words and never guess a translation you are unsure of.',
  ].join('\n')

  const lines = [`Learner goal: ${cleanGoal}.`]
  if (topics.length) lines.push(`Bias the deck toward these weak areas: ${topics.join(', ')}.`)
  if (likes.length) lines.push(`Theme the example sentences around these interests where natural: ${likes.join(', ')}.`)
  lines.push('Return the JSON array now.')

  return { system, user: lines.join('\n') }
}

// ── Pure: tolerant candidate parser ─────────────────────────────────────────

function normM(s) {
  return typeof s === 'string' ? s.toLowerCase().trim().replace(/\s+/g, ' ') : ''
}

// Pull the first top-level JSON array out of arbitrary model text (handles clean
// arrays, ```json fences, and arrays embedded in prose). Returns the parsed value
// or null.
function extractJsonArray(text) {
  if (typeof text !== 'string') return null
  const start = text.indexOf('[')
  if (start === -1) return null
  // Walk to the matching close bracket, respecting strings/escapes.
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') inStr = !inStr
    if (inStr) continue
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) }
        catch { return null }
      }
    }
  }
  return null
}

/**
 * Parse AI deck text into clean candidate pairs. Tolerant of fences/prose,
 * trims fields, drops entries missing m or e, dedupes by normalised Malay, and
 * caps the count. Never throws.
 *
 * @param {string} text
 * @returns {Array<{m:string, e:string, ex:string}>}
 */
export function parseDeckCandidates(text) {
  const arr = extractJsonArray(text)
  if (!Array.isArray(arr)) return []
  const out = []
  const seen = new Set()
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue
    const m = typeof raw.m === 'string' ? raw.m.trim() : ''
    const e = typeof raw.e === 'string' ? raw.e.trim() : ''
    const ex = typeof raw.ex === 'string' ? raw.ex.trim() : ''
    if (!m || !e) continue
    const key = normM(m)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ m, e, ex })
    if (out.length >= MAX_CANDIDATES) break
  }
  return out
}

// ── Pure: grounding partition (never silent-ship) ───────────────────────────

/**
 * Split candidates into verified (auto-acceptable) and review (learner must
 * confirm). A pair is accepted ONLY if verifyPair verifies it; everything else —
 * unknown word OR known word with a mismatched meaning — goes to review with any
 * canonical suggestion attached.
 *
 * @param {Array<{m:string,e:string,ex?:string}>} candidates
 * @param {Map} index - from buildGroundingIndex / buildDeckGroundingIndex
 * @returns {{ accepted: Array, review: Array }}
 */
export function groundCandidates(candidates, index) {
  const accepted = []
  const review = []
  for (const c of Array.isArray(candidates) ? candidates : []) {
    if (!c || typeof c !== 'object') continue
    const v = verifyPair(c.m, c.e, index)
    if (v.verified) {
      accepted.push({ m: c.m, e: c.e, ex: c.ex || '', confidence: v.confidence })
    } else {
      review.push({ m: c.m, e: c.e, ex: c.ex || '', canonicalEn: v.canonicalEn, suggestion: v.suggestion })
    }
  }
  return { accepted, review }
}

// ── Pure: deck naming ───────────────────────────────────────────────────────

const DECK_PREFIX = 'AI · '
const DECK_NAME_MAX = 48

/**
 * Name the generated deck after the goal: "AI · {goal}", trimmed/truncated.
 * @param {string} goal
 * @returns {string}
 */
export function deckNameForGoal(goal) {
  const g = (typeof goal === 'string' ? goal.trim() : '') || 'Custom deck'
  const room = DECK_NAME_MAX - DECK_PREFIX.length
  const body = g.length > room ? g.slice(0, room - 1).trimEnd() + '…' : g
  return DECK_PREFIX + body
}

// ── AI orchestration (covered by mock-AI e2e) ───────────────────────────────

/**
 * Ask the AI for raw deck text via the existing 3-tier chain:
 *   VITE_AI_MOCK → canned · OpenRouter free models · Supabase edge (Claude).
 * Returns the raw model text for parseDeckCandidates.
 */
export async function generateDeckText({ goal, focusTopics = [], interests = [], signal } = {}) {
  if (import.meta.env.VITE_AI_MOCK === 'true') {
    return getMockResponse('deck')
  }
  const { system, user } = buildDeckPrompt(goal, focusTopics, interests)

  if (isOpenRouterAvailable()) {
    return await callOpenRouter({
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 1024,
      signal,
    })
  }

  // Edge fallback (Claude proxy) — non-streaming, returns JSON-ish text.
  const result = await callAI({
    action: 'chat',
    payload: { messages: [{ role: 'user', content: user }], scenarioContext: system },
    stream: false,
    signal,
  })
  return result.response
}

/**
 * Build the grounding index for deck verification: owned dictionary (Tier 1,
 * high) + the learner's cards (Tier 1, high) + the committed CC0 Wikidata asset
 * (Tier 3, medium). Both data sources are lazy-imported so the ~155 KB Wikidata
 * asset never enters the main bundle — it loads only when a deck is generated.
 *
 * @param {Array<{m:string,e:string}>} [cards] - the learner's cards
 * @returns {Promise<Map>}
 */
export async function buildDeckGroundingIndex(cards = []) {
  const [{ default: DICTIONARY }, { WIKIDATA_MS_EN }] = await Promise.all([
    import('../data/dictionary.js'),
    import('../data/wikidataMalayEn.js'),
  ])
  const dictionaryPairs = Object.entries(DICTIONARY).map(([m, e]) => ({ m, e }))
  return buildGroundingIndex(dictionaryPairs, cards, WIKIDATA_MS_EN)
}

/**
 * Full pipeline: generate → parse → ground. Returns the verified-accepted cards,
 * the review queue, and the raw text (for diagnostics/empty-result messaging).
 */
export async function generateGroundedDeck({ goal, focusTopics = [], interests = [], cards = [], signal } = {}) {
  const [text, index] = await Promise.all([
    generateDeckText({ goal, focusTopics, interests, signal }),
    buildDeckGroundingIndex(cards),
  ])
  const candidates = parseDeckCandidates(text)
  const { accepted, review } = groundCandidates(candidates, index)
  return { accepted, review, candidateCount: candidates.length, raw: text }
}
