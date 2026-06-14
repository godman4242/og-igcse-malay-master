// Structural regression guard (repo convention cf. studyTtsLocale.test.js): the
// Roleplay static-mode mic (speakResponse → startRecognition) must follow the
// scenario language, not a hardcoded 'ms-MY'. The static turn UI renders English
// scenarios (its read-aloud at :300 already uses en-GB), so a hardcoded ms-MY STT
// recognises an English roleplay's spoken answer with the wrong (Malay) model.
//
// Source-pinned (not mounted): a full roleplay session mount is heavy + store-
// coupled, and the bug is a one-line hardcode — the pin is the right grain.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(resolve(here, '../Roleplay.jsx'), 'utf8')

describe('Roleplay speech input follows the scenario language (structural)', () => {
  it('never hardcodes startRecognition(\'ms-MY\')', () => {
    expect(code).not.toMatch(/startRecognition\(\s*'ms-MY'\s*\)/)
  })

  it('chooses the recognition locale from scenario.lang', () => {
    expect(code).toMatch(/startRecognition\(\s*scenario\.lang === 'en' \? 'en-GB' : 'ms-MY'\s*\)/)
  })
})
