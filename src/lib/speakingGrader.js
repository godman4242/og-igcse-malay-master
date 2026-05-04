// IGCSE Paper 3 speaking grader. Two layers:
//
//   1. Heuristic — runs offline, no API. Scores fluency proxies (word
//      count vs expected duration), filler-word density, vocabulary
//      range, marker usage. Returns a band 1-6 with concrete tips.
//
//   2. AI grade — sends the transcript + topic to Gemini with an IGCSE
//      Paper 3 rubric system prompt. Returns structured JSON that the
//      UI renders.
//
// The heuristic always runs first so the student sees something even if
// no Gemini key is configured.

import { PW_ML, FORM_ML } from '../data/writing'
import { isGeminiAvailable, callGemini } from './gemini'

const FILLERS = ['um', 'uh', 'er', 'erm', 'macam', 'yelah', 'lah', 'errr', 'aaa', 'eee']

function countMatches(text, list, wordBoundary = true) {
  let n = 0
  const lower = text.toLowerCase()
  for (const item of list) {
    const re = wordBoundary
      ? new RegExp('\\b' + item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi')
      : new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'gi')
    n += (lower.match(re) || []).length
  }
  return n
}

export function heuristicGrade({ transcript, topic, durationSec }) {
  const text = transcript.trim()
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^\p{L}-]/gu, ''))).size
  const ttr = wordCount > 0 ? uniqueWords / wordCount : 0 // type-token ratio

  const fillerCount = countMatches(text, FILLERS)
  const markerCount = countMatches(text, PW_ML, false)
  const formalCount = countMatches(text, FORM_ML)

  // Cue coverage: how many of the topic's cues did the student touch?
  const cues = topic?.cues || []
  let cuesHit = 0
  if (cues.length) {
    const lower = text.toLowerCase()
    for (const cue of cues) {
      // Tokenize cue into key content words (strip parens / commas).
      const keys = cue
        .replace(/[(),/]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .map(w => w.toLowerCase())
      if (keys.some(k => lower.includes(k))) cuesHit++
    }
  }

  // Words per second — fluency proxy. IGCSE expects roughly 90-130 wpm
  // (1.5 - 2.2 wps) for natural speech.
  const wps = durationSec > 0 ? wordCount / durationSec : 0
  const expected = topic?.expectedDurationSec || 75

  // Banding
  let band = 3
  const longEnough = durationSec >= expected * 0.7
  const fluentEnough = wps >= 1.4 && wps <= 2.8
  const goodMarkers = markerCount >= 2
  const goodVocab = formalCount >= 2
  const goodRange = ttr >= 0.45
  const lowFiller = fillerCount <= Math.max(3, Math.round(wordCount * 0.04))
  const cueCoverage = cues.length ? cuesHit / cues.length : 1

  if (longEnough && fluentEnough && goodMarkers && goodVocab && goodRange && lowFiller && cueCoverage >= 0.75) band = 6
  else if (longEnough && (fluentEnough || goodMarkers) && (goodVocab || goodRange) && cueCoverage >= 0.5) band = 5
  else if (longEnough && (goodMarkers || goodVocab) && cueCoverage >= 0.4) band = 4

  const tips = []
  if (!longEnough) tips.push(`Bercakap lebih lama — sasaran sekitar ${expected} saat, anda hanya ${Math.round(durationSec)} saat.`)
  if (!fluentEnough) tips.push(wps < 1.4 ? 'Cuba bercakap dengan lebih lancar — kelajuan terlalu perlahan.' : 'Bercakap sedikit lebih perlahan — agar lebih jelas.')
  if (!goodMarkers) tips.push('Tambah penanda wacana (selain itu, walau bagaimanapun, kesimpulannya).')
  if (!goodVocab) tips.push('Gunakan kosa kata yang lebih formal.')
  if (!goodRange) tips.push('Variasikan perkataan — anda mengulang banyak perkataan yang sama.')
  if (!lowFiller) tips.push(`Kurangkan kata pengisi (um, ahh, lah) — dikesan ${fillerCount} kali.`)
  if (cues.length && cueCoverage < 0.75) tips.push(`Sentuh lebih banyak isi yang dicadangkan — ${cuesHit}/${cues.length} disentuh.`)
  if (tips.length === 0) tips.push('Bagus! Anda sudah mencapai band tinggi — terus berlatih.')

  return {
    band,
    wordCount,
    sentenceCount: sentences.length,
    durationSec: Math.round(durationSec),
    wordsPerSec: Math.round(wps * 100) / 100,
    fillerCount,
    markerCount,
    formalCount,
    uniqueWordRatio: Math.round(ttr * 100) / 100,
    cuesHit,
    cuesTotal: cues.length,
    tips,
  }
}

export function aiGradeAvailable() {
  return isGeminiAvailable()
}

const SYS_PROMPT = `You are an IGCSE Malay Paper 3 (oral) examiner. You grade a student's spoken response that was transcribed automatically from speech, so expect transcription glitches, filler words (lah, errr, um), and missing punctuation.

CALIBRATION — abbreviated band descriptors. Anchor your grade on these, not on vibes:
- Band 6: addresses the prompt fully and develops it with reasons + examples; uses a wide range of imbuhan (meN-, ber-, di-, ter-, peN-) and complex sentences (yang, kerana, walaupun, supaya, apabila); occasional minor slips don't impede meaning; formal-leaning register; clear sustained fluency for the expected duration.
- Band 5: addresses the prompt fully; some range in grammar and vocabulary; mostly fluent with brief hesitations; minor errors don't affect meaning.
- Band 4: addresses the main task; range is limited but adequate; noticeable hesitations; some errors that briefly cloud meaning.
- Band 3: partial coverage of the prompt; relies on simple sentences and high-frequency vocabulary; frequent hesitation; errors sometimes obscure meaning.
- Band 2: very limited coverage; basic vocabulary only; frequent breakdowns; meaning often unclear.
- Band 1: minimal communication; isolated words or memorised fragments only.

PITFALLS to call out specifically when present:
- Off-topic drift (student lists generic facts instead of answering the cues).
- Memorised script (formulaic openings with no real engagement with the prompt).
- Heavy code-switching to English where Malay would suffice.
- Monotone listing without connectors ("Saya suka X. Saya suka Y. Saya suka Z." with no kerana/dan/lalu/walaupun).
- Wrong-register slang (lah, je, nak) in a context that calls for formal Malay.
- Tense markers missing (sudah/sedang/akan/telah) when narrating events.

Be HONEST. Soft-grading helps no one. Use the full band range.

Return ONLY valid JSON in this exact shape — no markdown, no prose, no leading text:
{
  "band": <integer 1-6>,
  "summary": "<one sentence anchored on a band descriptor above, e.g. 'Addresses the prompt with reasons but limited grammar range — Band 4.'>",
  "strengths": ["<specific, evidence-backed bullet>", "<another>"],
  "improvements": [
    {"issue": "<short label like 'missing connectors' or 'register too informal'>", "evidence": "<short verbatim quote from transcript>", "fix": "<one concrete actionable suggestion, in Malay or English>"}
  ],
  "modelAnswer": "<a 2-3 sentence band-6 opening that a strong student could realistically deliver — natural, not over-polished>",
  "vocabUpgrades": [
    {"used": "<word or phrase from transcript>", "better": "<more advanced/formal replacement, with the same meaning>"}
  ],
  "nextStep": "<one sentence naming a single drill or focus, e.g. 'Drill three connectors (kerana, walaupun, supaya) on tomorrow's attempt.'>"
}`

export async function aiGrade({ transcript, topic, durationSec, signal }) {
  if (!isGeminiAvailable()) throw new Error('Gemini key not configured')
  const userMsg = `Topic: ${topic.title} (${topic.titleEn})
Prompt given to student: ${topic.prompt}
Suggested cues: ${topic.cues.join('; ')}
Speaking duration: ${Math.round(durationSec)} seconds
Expected duration: about ${topic.expectedDurationSec} seconds

Transcript:
"""
${transcript}
"""

Grade the speaking response. Reply with the JSON shape only.`

  const raw = await callGemini({
    systemPrompt: SYS_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: 1500,
    signal,
  })

  // Gemini sometimes wraps JSON in ```json fences — strip them.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return { error: 'parse', raw }
  }
}
