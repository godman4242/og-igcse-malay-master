// Phase-2 completion increment B — AI roleplay seed. The pure core turns
// goal + interests into a prompt for a FULL custom roleplay scenario, and
// parseScenarioCandidate strict-validates the AI's JSON against the SCENARIOS
// entry contract (RoleplaySession({ scenario }) consumes it directly) — a
// malformed scenario is NEVER launched, it returns null for a friendly retry.
// Spec: docs/superpowers/specs/2026-06-13-for-you-phase2-completion-design.md §B

import { describe, it, expect } from 'vitest'
import { buildScenarioPrompt, parseScenarioCandidate } from '../scenarioGenerator'

const validScenario = () => ({
  title: 'Di Pasar Malam',
  titleEn: 'At the Night Market',
  context: 'Anda membeli makanan di pasar malam. Bercakap dengan penjual.',
  contextEn: 'You are buying food at a night market. Speak to the vendor.',
  keyVocab: ['pasar malam', 'berapa harga', 'sedap', 'bungkus'],
  turns: [
    { examiner: 'Selamat malam! Nak beli apa?', hint: 'Greet and say what you want to buy' },
    { examiner: 'Baik. Berapa banyak?', hint: 'Say the quantity and ask the price' },
    { examiner: 'Lima ringgit semua. Nak makan di sini?', hint: 'Decide: eat here or take away' },
    { examiner: 'Terima kasih! Datang lagi ya.', hint: 'Thank them and say goodbye politely' },
  ],
})

describe('buildScenarioPrompt', () => {
  it('embeds goal, interests and language with a strict-JSON instruction', () => {
    const { system, user } = buildScenarioPrompt('order food confidently', ['food', 'travel'], 'ms')
    expect(system.toLowerCase()).toContain('json')
    expect(user).toContain('order food confidently')
    expect(user).toContain('food')
    expect(system + user).toMatch(/malay|melayu/i)
  })

  it('defaults safely on empty input and supports English scenarios', () => {
    const { user } = buildScenarioPrompt('', [], 'en')
    expect(user.length).toBeGreaterThan(20)
    const { system } = buildScenarioPrompt('goal', [], 'en')
    expect(system).toMatch(/english/i)
  })
})

describe('parseScenarioCandidate', () => {
  it('accepts a full valid scenario and stamps id/lang/totalTurns', () => {
    const s = parseScenarioCandidate(JSON.stringify(validScenario()), 'ms')
    expect(s).not.toBeNull()
    expect(s.lang).toBe('ms')
    expect(s.id).toMatch(/^ai-/)
    expect(s.totalTurns).toBe(4)
    expect(s.turns).toHaveLength(4)
    expect(s.keyVocab.length).toBeGreaterThan(0)
  })

  it('extracts JSON from prose-wrapped / fenced model output', () => {
    const wrapped = 'Here is your scenario!\n```json\n' + JSON.stringify(validScenario()) + '\n```\nEnjoy.'
    expect(parseScenarioCandidate(wrapped, 'ms')).not.toBeNull()
  })

  it('rejects structural violations (never launch a malformed scenario)', () => {
    const noTurns = { ...validScenario(), turns: [] }
    expect(parseScenarioCandidate(JSON.stringify(noTurns), 'ms')).toBeNull()

    const emptyExaminer = validScenario()
    emptyExaminer.turns[1].examiner = '   '
    expect(parseScenarioCandidate(JSON.stringify(emptyExaminer), 'ms')).toBeNull()

    const badVocab = { ...validScenario(), keyVocab: 'pasar' }
    expect(parseScenarioCandidate(JSON.stringify(badVocab), 'ms')).toBeNull()

    const noTitle = { ...validScenario(), title: '' }
    expect(parseScenarioCandidate(JSON.stringify(noTitle), 'ms')).toBeNull()

    expect(parseScenarioCandidate('not json at all', 'ms')).toBeNull()
    expect(parseScenarioCandidate('', 'ms')).toBeNull()
    expect(parseScenarioCandidate(null, 'ms')).toBeNull()
  })

  it('caps turn count and strips unknown keys (prompt-injection shaped output)', () => {
    const tooMany = validScenario()
    tooMany.turns = Array.from({ length: 9 }, (_, i) => ({ examiner: `Soalan ${i + 1}?`, hint: 'jawab' }))
    const capped = parseScenarioCandidate(JSON.stringify(tooMany), 'ms')
    expect(capped.turns.length).toBeLessThanOrEqual(6)
    expect(capped.totalTurns).toBe(capped.turns.length)

    const sneaky = { ...validScenario(), __proto__: { evil: 1 }, dangerouslySetInnerHTML: 'x', onClick: 'alert(1)' }
    const clean = parseScenarioCandidate(JSON.stringify(sneaky), 'ms')
    expect(clean.dangerouslySetInnerHTML).toBeUndefined()
    expect(clean.onClick).toBeUndefined()
  })

  it('coerces missing hints to empty strings (hints are optional per turn)', () => {
    const noHints = validScenario()
    noHints.turns = noHints.turns.map(t => ({ examiner: t.examiner }))
    const s = parseScenarioCandidate(JSON.stringify(noHints), 'ms')
    expect(s).not.toBeNull()
    expect(s.turns.every(t => typeof t.hint === 'string')).toBe(true)
  })
})

// Weak-spot seed (2026-06-29): the scenario can be biased toward the learner's
// weak areas. The param is additive — a default/empty call is byte-identical to
// the pre-feature prompt, so the existing suite + the shipped no-bias flow are
// unaffected.
describe('buildScenarioPrompt weak-spot bias (focusTopics)', () => {
  it('asks the examiner to exercise the given weak areas', () => {
    const { user } = buildScenarioPrompt('chat about my weekend', [], 'ms', ['imbuhan (awalan meN-)', 'penanda masa'])
    expect(user).toContain('imbuhan (awalan meN-)')
    expect(user).toContain('penanda masa')
    expect(user.toLowerCase()).toMatch(/weak area|practise/)
  })

  it('is byte-identical to the no-focusTopics call by default', () => {
    expect(buildScenarioPrompt('g', ['food'], 'ms', [])).toEqual(buildScenarioPrompt('g', ['food'], 'ms'))
    expect(buildScenarioPrompt('g', ['food'], 'en')).toEqual(buildScenarioPrompt('g', ['food'], 'en', []))
  })

  it('ignores a non-array focusTopics (defensive)', () => {
    const base = buildScenarioPrompt('g', [], 'ms')
    expect(buildScenarioPrompt('g', [], 'ms', null)).toEqual(base)
    expect(buildScenarioPrompt('g', [], 'ms', 'imbuhan')).toEqual(base)
  })
})
