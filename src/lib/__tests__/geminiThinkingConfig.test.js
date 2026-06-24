// Guards the task-aware-writing-grade output-budget fix (Task 4.2):
//
//   The task-aware grade returns a BIGGER JSON (content_band,
//   content_justification, task_coverage{…}) than the no-task grade. Gemini
//   flash models THINK before emitting, and thinking consumes maxOutputTokens.
//   With the old 1024 cap the JSON got truncated → unparseable → content_band
//   missing (a real keyed 2.5-flash run produced ALL "parse miss"). The fix:
//   for the TASK path raise maxTokens to 2048 AND minimise thinking; the no-task
//   path must stay byte-identical at runtime (1024, NO thinkingConfig).
//
// These seams are unit-testable without a real API call: callGemini's request
// body is built before fetch, and fetchAIGrade routes through callGemini. We
// mock fetch (mirrors cikguSystemPrompt.test.js) and inspect the body.

import { describe, it, expect, vi, afterEach } from 'vitest'

// callGemini dynamically imports the Supabase client to attach a session JWT;
// stub it so this body-shape test never touches the auth/network layer
// (same pattern as cikguSystemPrompt.test.js).
vi.mock('../../config/supabase', () => ({ initSupabase: vi.fn(async () => null) }))

import { callGemini, fetchAIGrade } from '../gemini.js'

function mockGeminiFetch(responseText) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: responseText }] } }] }),
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const bodyOf = (fetchMock) => JSON.parse(fetchMock.mock.calls[0][1].body)

describe('callGemini — thinkingConfig passthrough', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('includes generationConfig.thinkingConfig when thinkingConfig is passed', async () => {
    const fetchMock = mockGeminiFetch('ok')
    await callGemini({
      systemPrompt: 's',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 2048,
      thinkingConfig: { thinkingLevel: 'low' },
    })
    const body = bodyOf(fetchMock)
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' })
    expect(body.generationConfig.maxOutputTokens).toBe(2048)
  })

  it('OMITS thinkingConfig from the body when not passed (no-task path byte-identical)', async () => {
    const fetchMock = mockGeminiFetch('ok')
    await callGemini({
      systemPrompt: 's',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 1024,
    })
    const body = bodyOf(fetchMock)
    expect('thinkingConfig' in body.generationConfig).toBe(false)
    expect(body.generationConfig.maxOutputTokens).toBe(1024)
  })
})

describe('fetchAIGrade — task path raises budget + minimises thinking; no-task path unchanged', () => {
  afterEach(() => vi.unstubAllGlobals())

  const validGrade = JSON.stringify({ band: 4, content_band: 3 })
  const baseArgs = ['Some essay text.', ['Clear structure'], { wordCount: 50, ttr: 0.6, errorsPer100: 1 }, '', []]

  it('task present → maxTokens 2048 + thinkingConfig { thinkingLevel: "low" }', async () => {
    const fetchMock = mockGeminiFetch(validGrade)
    const task = { prompt: 'Write an article.', requirements: ['A clear opinion', 'Two reasons'] }
    await fetchAIGrade(...baseArgs, undefined, task)
    const body = bodyOf(fetchMock)
    expect(body.generationConfig.maxOutputTokens).toBe(2048)
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' })
  })

  it('NO task → maxTokens 1024 + NO thinkingConfig (runtime byte-identity)', async () => {
    const fetchMock = mockGeminiFetch(validGrade)
    await fetchAIGrade(...baseArgs) // signal + task omitted
    const body = bodyOf(fetchMock)
    expect(body.generationConfig.maxOutputTokens).toBe(1024)
    expect('thinkingConfig' in body.generationConfig).toBe(false)
  })
})
