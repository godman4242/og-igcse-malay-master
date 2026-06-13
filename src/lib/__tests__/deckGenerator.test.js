import { describe, it, expect } from 'vitest'
import {
  buildDeckPrompt,
  parseDeckCandidates,
  groundCandidates,
  deckNameForGoal,
  loadMalayValiditySet,
} from '../deckGenerator.js'
import { buildGroundingIndex } from '../dictionaryGrounding.js'

// Phase 2 increment D — AI custom deck generator. The pure, deterministic parts:
// a prompt builder, a tolerant candidate parser, and the grounding partition that
// guarantees we NEVER silently ship an unverified pair. The AI call + UI wiring
// live elsewhere and are covered by the mock-AI e2e.

describe('buildDeckPrompt', () => {
  it('returns a system + user prompt, both non-empty strings', () => {
    const { system, user } = buildDeckPrompt('Pass my IGCSE', ['imbuhan'], ['football'])
    expect(typeof system).toBe('string')
    expect(typeof user).toBe('string')
    expect(system.length).toBeGreaterThan(20)
    expect(user.length).toBeGreaterThan(10)
  })

  it('embeds the learner goal, focus topics, and interests in the user prompt', () => {
    const { user } = buildDeckPrompt('Speak confidently', ['tense', 'cohesion'], ['cooking', 'travel'])
    expect(user).toMatch(/Speak confidently/)
    expect(user).toMatch(/tense/)
    expect(user).toMatch(/cohesion/)
    expect(user).toMatch(/cooking/)
    expect(user).toMatch(/travel/)
  })

  it('instructs the model to return a JSON array of m/e/ex and standard Malay', () => {
    const { system } = buildDeckPrompt('goal', [], [])
    expect(system).toMatch(/json/i)
    expect(system).toMatch(/\bm\b/)
    expect(system).toMatch(/\be\b/)
    expect(system).toMatch(/standard|baku|Bahasa/i)
  })

  it('never emits literal "undefined" with empty optional inputs', () => {
    const { system, user } = buildDeckPrompt('just a goal')
    expect(system).not.toMatch(/undefined/)
    expect(user).not.toMatch(/undefined/)
  })

  it('does not throw on a blank goal', () => {
    expect(() => buildDeckPrompt('')).not.toThrow()
  })
})

describe('parseDeckCandidates', () => {
  it('parses a clean JSON array of {m,e,ex}', () => {
    const out = parseDeckCandidates('[{"m":"payung","e":"umbrella","ex":"Saya bawa payung."}]')
    expect(out).toEqual([{ m: 'payung', e: 'umbrella', ex: 'Saya bawa payung.' }])
  })

  it('extracts JSON from inside a ```json fenced block', () => {
    const text = 'Here is your deck:\n```json\n[{"m":"air","e":"water"}]\n```\nEnjoy!'
    expect(parseDeckCandidates(text)).toEqual([{ m: 'air', e: 'water', ex: '' }])
  })

  it('extracts the first JSON array embedded in prose', () => {
    const text = 'Sure! [{"m":"rumah","e":"house","ex":"Rumah saya besar."}] hope that helps'
    expect(parseDeckCandidates(text)).toEqual([{ m: 'rumah', e: 'house', ex: 'Rumah saya besar.' }])
  })

  it('trims fields and drops entries missing m or e', () => {
    const text = '[{"m":"  buku ","e":" book "},{"m":"","e":"x"},{"m":"y"},{"e":"z"}]'
    expect(parseDeckCandidates(text)).toEqual([{ m: 'buku', e: 'book', ex: '' }])
  })

  it('dedupes by normalised Malay, keeping the first', () => {
    const text = '[{"m":"air","e":"water"},{"m":"Air","e":"H2O"}]'
    expect(parseDeckCandidates(text)).toEqual([{ m: 'air', e: 'water', ex: '' }])
  })

  it('returns [] for non-array, empty, or garbage input (never throws)', () => {
    expect(parseDeckCandidates('')).toEqual([])
    expect(parseDeckCandidates('not json at all')).toEqual([])
    expect(parseDeckCandidates('{"m":"x","e":"y"}')).toEqual([]) // object, not array
    expect(parseDeckCandidates(null)).toEqual([])
    expect(() => parseDeckCandidates(undefined)).not.toThrow()
  })

  it('caps the number of candidates to a sane maximum', () => {
    const many = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ m: `kata${i}`, e: `word${i}` })))
    expect(parseDeckCandidates(many).length).toBeLessThanOrEqual(40)
  })
})

describe('groundCandidates (never silent-ship)', () => {
  const index = buildGroundingIndex(
    [{ m: 'rumah', e: 'house' }],          // owned → high
    [],
    [{ m: 'payung', e: 'umbrella' }],      // Wikidata → medium
  )

  it('accepts verified pairs (owned high + Wikidata medium) and routes the rest to review', () => {
    const { accepted, review } = groundCandidates([
      { m: 'rumah', e: 'house', ex: 'a' },     // owned → accept high
      { m: 'payung', e: 'umbrella', ex: 'b' }, // wikidata → accept medium
      { m: 'rumah', e: 'car', ex: 'c' },       // known word, wrong meaning → review (mismatch)
      { m: 'zzzznope', e: 'gibberish', ex: 'd' }, // unknown → review
    ], index)

    expect(accepted.map(c => c.m)).toEqual(['rumah', 'payung'])
    expect(accepted.find(c => c.m === 'rumah').confidence).toBe('high')
    expect(accepted.find(c => c.m === 'payung').confidence).toBe('medium')

    expect(review.map(c => c.m)).toEqual(['rumah', 'zzzznope'])
    // mismatch carries the canonical suggestion so the learner can choose
    expect(review.find(c => c.m === 'rumah' && c.e === 'car').suggestion).toMatch(/house/i)
  })

  it('preserves the example sentence on accepted cards', () => {
    const { accepted } = groundCandidates([{ m: 'rumah', e: 'house', ex: 'Rumah saya.' }], index)
    expect(accepted[0].ex).toBe('Rumah saya.')
  })

  it('handles an empty candidate list', () => {
    expect(groundCandidates([], index)).toEqual({ accepted: [], review: [] })
    expect(() => groundCandidates(null, index)).not.toThrow()
  })
})

describe('deckNameForGoal', () => {
  it('prefixes with "AI ·" and uses the goal text', () => {
    expect(deckNameForGoal('Pass my IGCSE')).toBe('AI · Pass my IGCSE')
  })

  it('falls back to a generic name for a blank goal', () => {
    expect(deckNameForGoal('')).toBe('AI · Custom deck')
    expect(deckNameForGoal('   ')).toBe('AI · Custom deck')
  })

  it('truncates an overly long goal', () => {
    const long = 'x'.repeat(80)
    const name = deckNameForGoal(long)
    expect(name.length).toBeLessThanOrEqual(48)
    expect(name.startsWith('AI · ')).toBe(true)
  })
})

describe('loadMalayValiditySet (Tier-2 validity asset)', () => {
  it('lazy-loads the committed CC-BY word-list into a populated Set of real words', async () => {
    const set = await loadMalayValiditySet()
    expect(set instanceof Set).toBe(true)
    expect(set.size).toBeGreaterThan(20000) // ~24.4k real Malay words
    expect(set.has('membaca')).toBe(true)   // a real, affixed Malay word
    expect(set.has('flurbplim')).toBe(false) // an invented non-word
  })
})
