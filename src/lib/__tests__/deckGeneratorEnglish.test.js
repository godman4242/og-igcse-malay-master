import { describe, it, expect, vi } from 'vitest'
import {
  buildDeckPrompt,
  groundCandidates,
  buildEnDeckGroundingIndex,
  loadEnglishValiditySet,
  generateGroundedDeck,
} from '../deckGenerator.js'
import { annotateValidity } from '../malayValidity.js'

// The AI deck generator must author the ACTIVE study language. For an English
// (0510 ESL) learner: English headwords glossed in Malay, grounded against the
// English seed — not the Malay dictionary (which would mislabel real English words).

describe('buildDeckPrompt — language direction', () => {
  it("defaults to Malay (0546): m=Malay word, e=English meaning (byte-identical)", () => {
    const { system } = buildDeckPrompt('goal', [], [])
    expect(system).toMatch(/Malay/)
    expect(system).toMatch(/0546/)
    expect(system).not.toMatch(/0510/)
  })

  it("lang='en' authors an IGCSE English (0510) deck: m=English word, e=Malay meaning", () => {
    const { system } = buildDeckPrompt('goal', [], [], 'en')
    expect(system).toMatch(/English/)
    expect(system).toMatch(/0510/)
    // The headword is the English word; the gloss is Malay.
    expect(system).toMatch(/"m":[^\n]*English/i)
    expect(system).toMatch(/"e":[^\n]*Malay/i)
  })

  it("lang='ms' explicitly is identical to the default", () => {
    expect(buildDeckPrompt('g', ['t'], ['i'], 'ms')).toEqual(buildDeckPrompt('g', ['t'], ['i']))
  })
})

describe('English deck grounding (reuses the English seed)', () => {
  it('grounds a dictionaryEn seed pair as verified (auto-accept)', async () => {
    const index = await buildEnDeckGroundingIndex([])
    const { accepted } = groundCandidates(
      [{ m: 'airplane', e: 'kapal terbang', ex: 'The airplane is fast.' }],
      index,
    )
    expect(accepted.map((c) => c.m)).toContain('airplane')
  })

  it('sends an unknown English word to review (never silent-ship)', async () => {
    const index = await buildEnDeckGroundingIndex([])
    const { accepted, review } = groundCandidates(
      [{ m: 'zzqxborptl', e: 'something', ex: '' }],
      index,
    )
    expect(accepted).toHaveLength(0)
    expect(review.map((c) => c.m)).toContain('zzqxborptl')
  })

  it('includes the learner’s own en cards in the index', async () => {
    const index = await buildEnDeckGroundingIndex([{ m: 'spaceship', e: 'kapal angkasa' }])
    const { accepted } = groundCandidates([{ m: 'spaceship', e: 'kapal angkasa' }], index)
    expect(accepted.map((c) => c.m)).toContain('spaceship')
  })
})

describe('generateGroundedDeck — English pipeline (mock)', () => {
  it('produces English→Malay cards grounded against the English seed', async () => {
    vi.stubEnv('VITE_AI_MOCK', 'true')
    try {
      const { accepted, review } = await generateGroundedDeck({ goal: 'pass 0510', lang: 'en' })
      // seed words auto-accept; the invented word goes to learner-confirm.
      expect(accepted.map((c) => c.m)).toEqual(expect.arrayContaining(['airplane', 'school', 'happy']))
      expect(review.map((c) => c.m)).toContain('zzqxborptl')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('English validity set', () => {
  it('flags real English words valid and gibberish invalid', async () => {
    const set = await loadEnglishValiditySet()
    const annotated = annotateValidity(
      [{ m: 'airplane', e: 'x' }, { m: 'zzqxborptl', e: 'x' }],
      set,
    )
    expect(annotated.find((c) => c.m === 'airplane').validWord).toBe(true)
    expect(annotated.find((c) => c.m === 'zzqxborptl').validWord).toBe(false)
  })
})
