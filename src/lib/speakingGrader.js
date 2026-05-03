import DICTIONARY from '../data/dictionary'
import { callGemini, isGeminiAvailable } from './gemini'
import { callOpenRouter, isOpenRouterAvailable } from './openrouter'

const CONNECTORS = ['kerana', 'tetapi', 'walaupun', 'supaya', 'apabila', 'jika', 'dan', 'lalu', 'kemudian']
const IMBUHAN_RE = /\b(me[nm]?[a-z]+|mem[a-z]+|men[a-z]+|meng[a-z]+|ber[a-z]+|di[a-z]+|ter[a-z]+|pe[nm]?[a-z]+)\b/gi

function wordsOf(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function uniqueCount(items) {
  return new Set(items.filter(Boolean)).size
}

export function gradeSpeakingAttempt({ transcript, scenario, turn }) {
  const words = wordsOf(transcript)
  const wordCount = words.length
  const lower = (transcript || '').toLowerCase()
  const scenarioWords = [
    ...(scenario?.keyVocab || []),
    ...(scenario?.keyImbuhan || []),
  ].map(w => w.toLowerCase())

  const matchedScenarioVocab = scenarioWords.filter(term => lower.includes(term))
  const dictionaryHits = words.filter(word => DICTIONARY[word])
  const imbuhan = lower.match(IMBUHAN_RE) || []
  const connectors = CONNECTORS.filter(connector => words.includes(connector))
  const sentences = (transcript || '').split(/[.!?]+/).filter(s => s.trim().length > 3)
  const complexSentences = sentences.filter(s => /(yang|kerana|tetapi|walaupun|supaya|apabila|jika)/i.test(s)).length

  const coverage = Math.min(100, uniqueCount(matchedScenarioVocab) * 18 + Math.min(20, uniqueCount(dictionaryHits) * 3))
  const fluency = Math.min(100, wordCount * 4 + sentences.length * 10)
  const grammar = Math.min(100, uniqueCount(imbuhan) * 18 + connectors.length * 10 + complexSentences * 12)
  const task = turn?.hint
    ? Math.min(100, wordCount * 5 + uniqueCount(matchedScenarioVocab) * 20)
    : Math.min(100, wordCount * 5)

  const overall = Math.round((coverage * 0.3) + (fluency * 0.25) + (grammar * 0.25) + (task * 0.2))
  const band = overall >= 85 ? 6 : overall >= 70 ? 5 : overall >= 55 ? 4 : overall >= 40 ? 3 : overall >= 25 ? 2 : 1

  const strengths = []
  const fixes = []
  if (uniqueCount(matchedScenarioVocab) >= 2) strengths.push('Relevant topic vocabulary')
  if (wordCount >= 14) strengths.push('Developed answer length')
  if (connectors.length > 0) strengths.push('Uses connectors')
  if (uniqueCount(imbuhan) >= 2) strengths.push('Good imbuhan range')
  if (wordCount < 10) fixes.push('Extend the answer with one reason and one detail')
  if (uniqueCount(matchedScenarioVocab) < 2) fixes.push('Use more words from the scenario')
  if (connectors.length === 0) fixes.push('Add a connector such as kerana, tetapi, or supaya')
  if (uniqueCount(imbuhan) < 2) fixes.push('Include more meN-, ber-, di-, or ter- verbs')

  return {
    overall,
    band,
    wordCount,
    coverage,
    fluency,
    grammar,
    task,
    matchedScenarioVocab: [...new Set(matchedScenarioVocab)].slice(0, 8),
    dictionaryWords: [...new Set(dictionaryHits)].slice(0, 8),
    imbuhan: [...new Set(imbuhan)].slice(0, 8),
    connectors,
    strengths: strengths.length ? strengths : ['Clear attempt at the task'],
    fixes: fixes.length ? fixes : ['Polish pronunciation and keep answers natural'],
  }
}

export function buildSpeakingPrompt({ scenario, turn, transcript, grade }) {
  return `Scenario: ${scenario?.title} (${scenario?.contextEn})
Examiner prompt: ${turn?.examiner}
Expected task hint: ${turn?.hint}
Student transcript: ${transcript}
Local score: Band ${grade.band}/6, ${grade.overall}%.`
}

export async function getAISpeakingFeedback({ scenario, turn, transcript, grade, provider = 'gemini', signal }) {
  const systemPrompt = `You are an IGCSE Malay Paper 3 speaking examiner and coach.
Return concise JSON only with keys: examinerComment, pronunciationTip, improvedAnswer, nextDrill.
Mark kindly but honestly. The improvedAnswer must be in natural Malay and should be 1-3 sentences.`
  const content = buildSpeakingPrompt({ scenario, turn, transcript, grade })
  const messages = [{ role: 'user', content }]

  const raw = provider === 'openrouter' && isOpenRouterAvailable()
    ? await callOpenRouter({ systemPrompt, messages, maxTokens: 500, signal })
    : isGeminiAvailable()
      ? await callGemini({ systemPrompt, messages, maxTokens: 500, signal })
      : null

  if (!raw) return null
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw
  try {
    return JSON.parse(jsonText)
  } catch {
    return {
      examinerComment: raw.slice(0, 320),
      pronunciationTip: '',
      improvedAnswer: '',
      nextDrill: '',
    }
  }
}

export function isAISpeakingFeedbackAvailable(provider = 'gemini') {
  return provider === 'openrouter' ? isOpenRouterAvailable() : isGeminiAvailable()
}

