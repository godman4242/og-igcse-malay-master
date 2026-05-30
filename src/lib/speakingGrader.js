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

// Filler words commonly produced by speech-recog drift. Shared across
// languages, with the Malay-specific particles only flagged in Malay
// mode (the English heuristic strips those).
const FILLERS_COMMON = ['um', 'uh', 'er', 'erm', 'errr', 'aaa', 'eee', 'eh', 'hmm']
const FILLERS_MS_ONLY = ['macam', 'yelah', 'lah', 'je', 'kan']
const FILLERS_EN_ONLY = ['like', 'you know', 'basically', 'actually', 'sort of', 'kind of']

// English discourse markers — same role as PW_ML for Malay essays.
// These are the connector phrases an examiner expects in a band-5/6
// response. Multi-word phrases use spaces; the matcher handles them.
const PW_EN = [
  'firstly', 'secondly', 'thirdly', 'finally', 'in addition', 'moreover',
  'furthermore', 'however', 'nevertheless', 'on the other hand',
  'on the contrary', 'for example', 'for instance', 'in particular',
  'specifically', 'as a result', 'consequently', 'therefore',
  'in contrast', 'similarly', 'in conclusion', 'to sum up',
  'overall', 'on balance', 'in my opinion', 'personally', 'in fact',
  'indeed', 'meanwhile', 'eventually', 'in the long run',
]

// English "formal / sophisticated" lexicon. Mirrors FORM_ML for Malay.
const FORM_EN = [
  'significantly', 'substantially', 'considerably', 'evidently',
  'notably', 'arguably', 'undoubtedly', 'predominantly', 'profoundly',
  'genuinely', 'inherently', 'fundamental', 'crucial', 'pivotal',
  'imperative', 'salient', 'nuanced', 'nuance', 'caveat', 'context',
  'perspective', 'implication', 'consequence', 'rationale',
  'circumstance', 'phenomenon', 'mitigate', 'foster', 'cultivate',
  'sustain', 'address', 'tackle', 'navigate', 'reflect', 'illustrate',
  'demonstrate', 'underline', 'highlight', 'emphasize', 'emphasise',
]

function fillersFor(lang) {
  if (lang === 'eng' || lang === 'en') return [...FILLERS_COMMON, ...FILLERS_EN_ONLY]
  return [...FILLERS_COMMON, ...FILLERS_MS_ONLY]
}

function markersFor(lang) {
  return (lang === 'eng' || lang === 'en') ? PW_EN : PW_ML
}

function sophisticatedFor(lang) {
  return (lang === 'eng' || lang === 'en') ? FORM_EN : FORM_ML
}

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

export function heuristicGrade({ transcript, topic, durationSec, lang }) {
  const text = transcript.trim()
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^\p{L}-]/gu, ''))).size
  const ttr = wordCount > 0 ? uniqueWords / wordCount : 0 // type-token ratio

  const isEng = lang === 'eng' || lang === 'en'
  const fillerCount = countMatches(text, fillersFor(lang))
  const markerCount = countMatches(text, markersFor(lang), false)
  const formalCount = countMatches(text, sophisticatedFor(lang))

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
  if (isEng) {
    if (!longEnough) tips.push(`Speak for longer — target around ${expected}s, you spoke for only ${Math.round(durationSec)}s.`)
    if (!fluentEnough) tips.push(wps < 1.4 ? 'Try to speak more fluently — your pace is quite slow.' : 'Slow down a little so each idea lands clearly.')
    if (!goodMarkers) tips.push('Add discourse markers (firstly, however, on the other hand, in conclusion).')
    if (!goodVocab) tips.push('Reach for more sophisticated vocabulary — replace one or two everyday words per minute.')
    if (!goodRange) tips.push('Vary your wording — you are repeating the same words too often.')
    if (!lowFiller) tips.push(`Trim filler words (um, like, you know) — ${fillerCount} detected.`)
    if (cues.length && cueCoverage < 0.75) tips.push(`Touch more of the suggested cues — ${cuesHit}/${cues.length} addressed.`)
    if (tips.length === 0) tips.push('Excellent — you are already in the top band. Keep practising.')
  } else {
    if (!longEnough) tips.push(`Bercakap lebih lama — sasaran sekitar ${expected} saat, anda hanya ${Math.round(durationSec)} saat.`)
    if (!fluentEnough) tips.push(wps < 1.4 ? 'Cuba bercakap dengan lebih lancar — kelajuan terlalu perlahan.' : 'Bercakap sedikit lebih perlahan — agar lebih jelas.')
    if (!goodMarkers) tips.push('Tambah penanda wacana (selain itu, walau bagaimanapun, kesimpulannya).')
    if (!goodVocab) tips.push('Gunakan kosa kata yang lebih formal.')
    if (!goodRange) tips.push('Variasikan perkataan — anda mengulang banyak perkataan yang sama.')
    if (!lowFiller) tips.push(`Kurangkan kata pengisi (um, ahh, lah) — dikesan ${fillerCount} kali.`)
    if (cues.length && cueCoverage < 0.75) tips.push(`Sentuh lebih banyak isi yang dicadangkan — ${cuesHit}/${cues.length} disentuh.`)
    if (tips.length === 0) tips.push('Bagus! Anda sudah mencapai band tinggi — terus berlatih.')
  }

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

// Map one heuristic result (+ its topic) to a list of named weakness
// categories. Pure — reads only metrics heuristicGrade already computed, so
// it adds no new dependency. Single source of truth for "what was weak" on an
// attempt; stored on the speaking record at log time and read back by the
// progression widget. Thresholds mirror the banding booleans above so a flag
// never contradicts the band.
export function weaknessFlags(h, topic) {
  if (!h) return []
  const flags = []
  const expected = topic?.expectedDurationSec ?? 75
  if (h.durationSec < expected * 0.7) flags.push('tooShort')
  if (h.wordsPerSec < 1.4 || h.wordsPerSec > 2.8) flags.push('disfluent')
  if (h.markerCount < 2) flags.push('fewMarkers')
  if (h.formalCount < 2) flags.push('weakVocab')
  if (h.uniqueWordRatio < 0.45) flags.push('repetitive')
  if (h.fillerCount > Math.max(3, Math.round(h.wordCount * 0.04))) flags.push('fillerHeavy')
  if (h.cuesTotal > 0 && h.cuesHit / h.cuesTotal < 0.75) flags.push('missedCues')
  return flags
}

export function aiGradeAvailable() {
  return isGeminiAvailable()
}

const SYS_PROMPT_MS = `You are an IGCSE Malay Paper 3 (oral) examiner. You grade a student's spoken response that was transcribed automatically from speech, so expect transcription glitches, filler words (lah, errr, um), and missing punctuation.

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
  "improvedTranscript": "<the student's exact transcript rewritten to fix grammar/vocab errors and improve flow, keeping their original ideas and length>",
  "vocabUpgrades": [
    {"used": "<word or phrase from transcript>", "better": "<more advanced/formal replacement, with the same meaning>"}
  ],
  "nextStep": "<one sentence naming a single drill or focus, e.g. 'Drill three connectors (kerana, walaupun, supaya) on tomorrow's attempt.'>"
}`

const SYS_PROMPT_EN = `You are an IGCSE English (0500/0510) speaking examiner. You grade a student's spoken response that was transcribed automatically from speech, so expect transcription glitches, filler words (um, like, you know), and missing punctuation.

CALIBRATION — abbreviated band descriptors. Anchor your grade on these, not on vibes:
- Band 6: addresses the prompt in depth with reasons + concrete examples; wide range of structures (relative clauses, conditionals, perfect tenses); precise vocabulary, occasional sophisticated word; clear cohesion (firstly / however / on balance); minor slips don't impede meaning; sustained fluency for the expected duration.
- Band 5: covers the prompt with development; some grammatical range; mostly fluent with brief hesitations; minor errors don't affect meaning.
- Band 4: addresses the main task; structures and vocabulary are limited but adequate; noticeable hesitations; some errors briefly cloud meaning.
- Band 3: partial coverage; relies on simple sentences and high-frequency vocabulary; frequent hesitation; errors sometimes obscure meaning.
- Band 2: very limited coverage; basic vocabulary only; frequent breakdowns; meaning often unclear.
- Band 1: minimal communication; isolated words or memorised fragments only.

PITFALLS to call out specifically when present:
- Off-topic drift (student lists generic facts instead of answering the cues).
- Memorised script (formulaic openings with no real engagement with the prompt).
- Monotone listing without connectors ("I like X. I like Y. I like Z." with no because/so/although/whereas).
- Tense slipping (jumping between past and present narration without reason).
- Filler-heavy delivery (like, basically, you know) that thins the response.
- "Would of / could of" — flag the auxiliary error.

Be HONEST. Soft-grading helps no one. Use the full band range.

Return ONLY valid JSON in this exact shape — no markdown, no prose, no leading text:
{
  "band": <integer 1-6>,
  "summary": "<one sentence anchored on a band descriptor above, e.g. 'Addresses the prompt with examples but limited grammar range — Band 4.'>",
  "strengths": ["<specific, evidence-backed bullet>", "<another>"],
  "improvements": [
    {"issue": "<short label like 'missing connectors' or 'tense slip'>", "evidence": "<short verbatim quote from transcript>", "fix": "<one concrete actionable suggestion>"}
  ],
  "improvedTranscript": "<the student's exact transcript rewritten to fix grammar / vocab errors and improve flow, keeping their original ideas and approximate length>",
  "vocabUpgrades": [
    {"used": "<word or phrase from transcript>", "better": "<more precise / sophisticated replacement, with the same meaning>"}
  ],
  "nextStep": "<one sentence naming a single drill or focus, e.g. 'Drill three connectors (however, in addition, on the contrary) before the next attempt.'>"
}`

export async function aiGrade({ transcript, topic, durationSec, lang, signal }) {
  if (!isGeminiAvailable()) throw new Error('Gemini key not configured')
  const isEng = lang === 'eng' || lang === 'en'
  const SYS_PROMPT = isEng ? SYS_PROMPT_EN : SYS_PROMPT_MS
  const userMsg = `Topic: ${topic.title} (${topic.titleEn})
Prompt given to student: ${topic.prompt}
Suggested cues: ${(topic.cues ?? []).join('; ')}
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
