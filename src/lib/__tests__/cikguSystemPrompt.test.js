// Guards the unified Cikgu chat prompt: ONE source of truth
// (CIKGU_SYSTEM_PROMPT in src/core/agent/promptLibrary.ts) that BOTH BYOK
// providers — chatWithGemini (Gemini-first) and chatWithFreeModel (OpenRouter
// fallback) — send verbatim, so a Gemini-key user and an OpenRouter-key user get
// the SAME direct-instruction tutoring (not the old Socratic Gemini prompt).
//
// Why a behavioural test (mocked fetch) and not a source grep: it proves each
// provider actually transmits the shared constant as its system instruction,
// so re-inlining a divergent prompt in one provider would fail here.
import { readFileSync } from 'node:fs'
import { describe, it, expect, vi, afterEach } from 'vitest'
import * as promptLib from '../../core/agent/promptLibrary'
import { chatWithGemini } from '../gemini'
import { chatWithFreeModel, setUserOpenRouterKey } from '../openrouter'

// callGemini dynamically imports the Supabase client to attach a session JWT;
// stub it so this wiring test never touches the auth/network layer.
vi.mock('../../config/supabase', () => ({ initSupabase: vi.fn(async () => null) }))

describe('CIKGU_SYSTEM_PROMPT — single source of truth', () => {
  it('encodes the direct-instruction Cikgu teaching contract', () => {
    const p = promptLib.CIKGU_SYSTEM_PROMPT
    expect(typeof p).toBe('string')
    // Pedagogy = lead with the answer + worked example (NOT Socratic).
    expect(p).toContain('Lead with the answer')
    expect(p).not.toContain('spoon-feed')
    // Mandatory Malay example + English gloss for any rule taught.
    expect(p).toMatch(/Malay example sentence with English gloss/i)
    // Name the rule when answering grammar.
    expect(p).toMatch(/name the rule/i)
    // Mark the student's Malay with ✓ / ✗.
    expect(p).toContain('✓')
    expect(p).toContain('✗')
    // IGCSE 0546 syllabus focus: imbuhan / tense markers / kata hubung.
    expect(p).toContain('IGCSE 0546')
    expect(p).toContain('Imbuhan')
    expect(p).toMatch(/Tense markers/i)
    expect(p).toMatch(/Kata hubung/i)
    // Syllabus parity with the widened free KB (2026-06-14): the paid tutor must
    // also be told to teach proverbs (with meaning + essay theme), classifiers,
    // reduplication, word classes, and the dari/daripada split — else it covers
    // a NARROWER syllabus than the free rule-based tier.
    expect(p).toMatch(/peribahasa/i)
    expect(p).toMatch(/penjodoh bilangan/i)
    expect(p).toMatch(/kata ganda/i)
    expect(p).toMatch(/golongan kata|kata nama am/i)
    expect(p).toMatch(/dari vs daripada/i)
  })

  it('adds the tutor-contract rules (one next step + retrieval no-reveal) without dropping direct instruction', () => {
    const p = promptLib.CIKGU_SYSTEM_PROMPT
    expect(p).toContain('Lead with the answer')            // direct instruction survives
    expect(p).toMatch(/end (every|each) reply with exactly one/i)
    expect(p).toMatch(/attempting an exercise|checking their answer/i)
    expect(p).toMatch(/don'?t reveal the full answer/i)
  })

  it('removes the old Socratic PROMPT_SYSTEM_IDENTITY but keeps the mistake-flow prompts', () => {
    expect(promptLib.PROMPT_SYSTEM_IDENTITY).toBeUndefined()
    // The Socratic "explain your reasoning first" prompts belong to the mistake
    // flow (feedbackGenerator.ts) and must survive the unification.
    expect(typeof promptLib.getMetacognitivePrompt).toBe('function')
    expect(typeof promptLib.getRelationalHookPrompt).toBe('function')
  })
})

describe('both Cikgu providers send the shared prompt', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setUserOpenRouterKey(null)
  })

  it('chatWithGemini → CIKGU_SYSTEM_PROMPT + contextNote as systemInstruction', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'jawapan' }] } }] }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await chatWithGemini([{ role: 'user', content: 'Apa itu imbuhan meN-?' }], '\nNOTA: konteks ujian')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const sysText = JSON.parse(fetchMock.mock.calls[0][1].body).systemInstruction.parts[0].text
    expect(sysText).toContain(promptLib.CIKGU_SYSTEM_PROMPT)
    expect(sysText).toContain('NOTA: konteks ujian')
  })

  it('chatWithFreeModel → CIKGU_SYSTEM_PROMPT + contextNote as the system message', async () => {
    setUserOpenRouterKey('test-key')
    // node env has no localStorage model cache → getFreeModels fetches /models
    // first; serve a free model, then a completion. Mock branches on the URL.
    const fetchMock = vi.fn(async (url) => {
      if (typeof url === 'string' && url.includes('/models')) {
        return { ok: true, json: async () => ({ data: [{ id: 'test/model:free', pricing: { prompt: '0', completion: '0' } }] }) }
      }
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'jawapan' } }] }) }
    })
    vi.stubGlobal('fetch', fetchMock)

    await chatWithFreeModel([{ role: 'user', content: 'Apa itu imbuhan meN-?' }], '\nNOTA: konteks ujian')

    const completionCall = fetchMock.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('/chat/completions'),
    )
    expect(completionCall).toBeTruthy()
    const sys = JSON.parse(completionCall[1].body).messages[0]
    expect(sys.role).toBe('system')
    expect(sys.content).toContain(promptLib.CIKGU_SYSTEM_PROMPT)
    expect(sys.content).toContain('NOTA: konteks ujian')
  })
})

describe('eval prompt mirrors the app prompt', () => {
  it('CIKGU_BYOK_SYSTEM carries the same one-next-step rule', () => {
    const evalPrompt = readFileSync(new URL('../../../scripts/ai-tier-eval/prompts.mjs', import.meta.url), 'utf8')
    expect(evalPrompt).toMatch(/end (every|each) reply with exactly one/i)
  })
})
