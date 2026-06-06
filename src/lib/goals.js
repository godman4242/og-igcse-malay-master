// src/lib/goals.js
//
// Pure goal model for the "For You" home. Turns a learner's goal — a chosen
// preset and/or a free-text sentence — into a small set of emphasis tokens that
// the shelf builder (forYouShelves.js) maps to surfaces ("Toward your goal").
//
// Contract: pure, no React, no store. Emphasis tokens are surface-agnostic
// strings ('speaking' | 'writing' | 'grammar' | 'vocab' | 'exam' | 'roleplay'
// | 'listening' | 'comprehension' | 'review'); the caller owns token→route.
// Design: docs/superpowers/specs/2026-06-06-personalized-for-you-design.md §5.2

export const GOAL_PRESETS = [
  { id: 'pass', label: 'Pass my IGCSE', emphasise: ['exam', 'writing', 'grammar'] },
  { id: 'top', label: 'Top grade / scholarship', emphasise: ['writing', 'exam', 'speaking'] },
  { id: 'speak', label: 'Speak confidently', emphasise: ['speaking', 'roleplay'] },
  { id: 'date', label: 'Hit a target date', emphasise: ['exam', 'writing'] },
  { id: 'custom', label: 'Custom', emphasise: [] },
]

// Keyword → emphasis token. Order here defines the order matched tokens appear
// in the derived emphasis. Includes a few Malay keywords (bilingual app).
const SENTENCE_KEYWORDS = [
  ['speaking', /\b(speak|speaking|spoken|oral|conversation|talk|pronounce|pronunciation|bertutur|ucapan|lisan)\b/i],
  ['writing', /\b(write|writes|writing|written|wrote|essay|essays|composition|paragraph|karangan|menulis)\b/i],
  ['grammar', /\b(grammar|grammatical|imbuhan|tense|tenses|tatabahasa)\b/i],
  ['exam', /\b(exam|exams|paper|papers|test|tests|igcse|spm|peperiksaan)\b/i],
  ['vocab', /\b(vocab|vocabulary|words|word|perkataan|kosa\s?kata)\b/i],
  ['listening', /\b(listen|listening|mendengar)\b/i],
  ['comprehension', /\b(read|reading|comprehension|pemahaman)\b/i],
]

function scanSentence(sentence) {
  if (typeof sentence !== 'string' || !sentence.trim()) return []
  const out = []
  for (const [token, re] of SENTENCE_KEYWORDS) {
    if (re.test(sentence) && !out.includes(token)) out.push(token)
  }
  return out
}

/**
 * Map a goal to the surfaces the For You home should emphasise.
 *
 * A chosen non-custom preset is the explicit signal and wins outright. A
 * 'custom'/null/unknown preset falls back to scanning the free-text sentence.
 *
 * @param {string|null} goalPreset
 * @param {string} [sentence]
 * @returns {{ emphasise: string[] }}
 */
export function goalToFocus(goalPreset, sentence = '') {
  const preset = GOAL_PRESETS.find(p => p.id === goalPreset)
  if (preset && preset.id !== 'custom' && preset.emphasise.length > 0) {
    return { emphasise: [...preset.emphasise] }
  }
  return { emphasise: scanSentence(sentence) }
}
