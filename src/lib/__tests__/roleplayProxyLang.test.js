// Contract guard for V9 (2026-08-03): English roleplay was examined and SCORED
// in Malay. The ai-proxy edge function held one hardcoded Malay prompt per
// roleplay action, so an 0510 learner met an examiner told to "Respond ONLY in
// Malay", was "gently redirected" for writing English, and was scored on
// imbuhan — Malay verb morphology that does not exist in English. Static
// (non-AI) mode is hidden for EN scenarios, so the AI path is the only path.
//
// These are SOURCE-LEVEL assertions because neither file can be imported here:
// index.ts calls Deno.env at module scope (no Deno in vitest), and the client
// half is a call-site payload. Same approach as the store's source-level guards.
// Both halves must hold together — the client sending `lang` is inert until the
// function that reads it is deployed, and vice versa.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const proxySrc = readFileSync(resolve(here, '../../../supabase/functions/ai-proxy/index.ts'), 'utf8')
const sessionSrc = readFileSync(resolve(here, '../../components/RoleplaySession.jsx'), 'utf8')

describe('ai-proxy — roleplay prompts are language-aware (server half)', () => {
  it('keeps the Malay prompts byte-identical', () => {
    expect(proxySrc).toContain('You are an IGCSE Malay Paper 3 oral exam simulator.')
    expect(proxySrc).toContain('Respond ONLY in Malay (Bahasa Melayu standard/baku).')
    expect(proxySrc).toContain('You are an IGCSE Malay Paper 3 exam scorer.')
  })

  it('carries an English examiner prompt that answers in English', () => {
    expect(proxySrc).toContain('Respond ONLY in English.')
  })

  it('does not score an English roleplay on imbuhan', () => {
    // The EN scorer must say so explicitly — otherwise the model invents
    // affix feedback for a language with no affix system.
    expect(proxySrc).toMatch(/do NOT assess imbuhan/i)
  })

  // Content truth, same rule the scorecard already follows: "Paper 3" is the
  // Malay 0546 speaking paper; English 0510 speaking is Component 3.
  it('never labels English speaking as "Paper 3"', () => {
    const enBlocks = proxySrc.match(/^.*IGCSE English.*$/gm) || []
    expect(enBlocks.length).toBeGreaterThan(0)
    for (const line of enBlocks) {
      expect(line, line).not.toMatch(/Paper 3/)
    }
  })

  it('selects the prompt from payload.lang, defaulting to Malay', () => {
    expect(proxySrc).toMatch(/payload\.lang \|\| 'ms'/)
  })
})

describe('RoleplaySession — sends the scenario language (client half)', () => {
  // Both the per-turn examiner calls and the final scoring call must carry it;
  // a missing `lang` silently falls back to Malay on the server.
  it('every roleplay proxy call includes lang in its payload', () => {
    const proxyCalls = (sessionSrc.match(/action: 'roleplay(-score)?'/g) || []).length
    expect(proxyCalls, 'the two examiner turns + the scoring call').toBe(3)
    const langSends = (sessionSrc.match(/lang: roleplayLang/g) || []).length
    expect(langSends, 'each of those payloads carries lang').toBe(proxyCalls)
  })

  it('derives the language from the scenario, not from studyLang', () => {
    expect(sessionSrc).toMatch(/const roleplayLang = scenario\??\.lang === 'en' \? 'en' : 'ms'/)
  })
})
