// Speaking AI-coach summary. Turns the already-computed band trend + recurring
// weakness into a short, motivating coaching note ("here's your trajectory +
// the one thing to drill next"). Routed through callTextAI, so it runs on the
// user's own OpenRouter key when they've set one (it's BYOK-gated in the UI, so
// it never adds owner cost). Design:
// docs/superpowers/specs/2026-05-30-byok-design.md

import { callTextAI } from './aiText'

const COACH_SYS_EN = `You are an encouraging but honest IGCSE English speaking coach. Given a student's recent speaking-band trend and their most common weakness, reply in 2-3 short sentences: (1) one specific, encouraging line about their trajectory, (2) the single most useful thing to drill next. No lists, no preamble, under 60 words.`

const COACH_SYS_MS = `Anda jurulatih pertuturan IGCSE Bahasa Melayu yang memberi semangat tetapi jujur. Berdasarkan trend band pertuturan terkini pelajar dan kelemahan paling kerap mereka, balas dalam 2-3 ayat pendek: (1) satu ayat menggalakkan tentang perkembangan mereka, (2) satu perkara paling berguna untuk dilatih seterusnya. Tanpa senarai, tanpa mukadimah, kurang 60 patah perkataan.`

// Human-readable weakness labels (keys match speakingGrader weaknessFlags).
const WEAKNESS_LABEL = {
  tooShort: 'short answers',
  disfluent: 'uneven pace',
  fewMarkers: 'few connectors',
  weakVocab: 'everyday vocabulary',
  repetitive: 'repetitive wording',
  fillerHeavy: 'filler words',
  missedCues: 'missing prompt cues',
}

function isEnglishLang(lang) {
  return lang === 'eng' || lang === 'en'
}

/**
 * Pure builder: turns the trend + weakness into a { systemPrompt, userMsg }
 * pair. Kept separate from the network call so it is unit-testable.
 */
export function buildCoachPrompt(series, weakness, lang) {
  const top = weakness?.top?.[0]?.category
  const weak = top ? (WEAKNESS_LABEL[top] || top) : 'no clear recurring weakness'
  const userMsg = [
    `Recent bands (oldest to newest): ${(series?.bands || []).join(', ') || 'n/a'}`,
    `Recent average: ${series?.avg ?? 'n/a'} out of 6`,
    `Best recent band: ${series?.best ?? 'n/a'}`,
    `Change from first to last: ${series?.delta ?? 0}`,
    `Most common weakness: ${weak}`,
  ].join('\n')
  return { systemPrompt: isEnglishLang(lang) ? COACH_SYS_EN : COACH_SYS_MS, userMsg }
}

/**
 * Tidy a raw model reply for display. Reasoning models (e.g. DeepSeek R1) can
 * inline a <think>…</think> block before the answer; strip it so the card shows
 * the summary, not the model's scratch-work. Pure + testable.
 */
export function cleanCoachText(raw) {
  return (raw || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // strip reasoning blocks
    .replace(/^```(?:\w+)?\s*|\s*```$/g, '')   // strip stray code fences
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/**
 * Generate the coaching summary string. Throws bubble up to the caller, which
 * shows a friendly fallback.
 */
export async function speakingCoachSummary({ series, weakness, lang, signal }) {
  const { systemPrompt, userMsg } = buildCoachPrompt(series, weakness, lang)
  const text = await callTextAI({
    systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 200,
    signal,
  })
  return cleanCoachText(text)
}
