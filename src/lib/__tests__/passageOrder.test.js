import { describe, it, expect } from 'vitest'
import { leadByLang } from '../passageOrder'

// F5 Increment 5 — Comprehension + Listening passage pickers should LEAD with
// the active study language (studyLang) instead of the file order. Pure helper,
// mirrors interests.js prioritiseByInterests: stable "reorder, don't filter"
// sort with an optional accessor so it composes over either raw passages
// (Listening) or the interest-prioritised { item, matchedInterests } wrappers
// (Comprehension).

describe('leadByLang', () => {
  const passages = [
    { id: 'a', lang: 'ms' },
    { id: 'b', lang: 'en' },
    { id: 'c', lang: 'ms' },
    { id: 'd', lang: 'en' },
    { id: 'e', lang: 'ms' },
  ]

  it("floats English passages to the top when lang='en', stable within each group", () => {
    const out = leadByLang(passages, 'en')
    // EN (b, d) lead in original order; MS (a, c, e) follow in original order.
    expect(out.map(p => p.id)).toEqual(['b', 'd', 'a', 'c', 'e'])
  })

  it("floats Malay passages to the top when lang='ms', stable within each group", () => {
    const out = leadByLang(passages, 'ms')
    // MS (a, c, e) lead in original order; EN (b, d) follow in original order.
    expect(out.map(p => p.id)).toEqual(['a', 'c', 'e', 'b', 'd'])
  })

  it("treats any non-'en' lang (undefined / garbage) as the Malay default", () => {
    expect(leadByLang(passages, undefined).map(p => p.id)).toEqual(['a', 'c', 'e', 'b', 'd'])
    expect(leadByLang(passages, 'xx').map(p => p.id)).toEqual(['a', 'c', 'e', 'b', 'd'])
  })

  it('preserves the full set — nothing is dropped or duplicated', () => {
    const out = leadByLang(passages, 'en')
    expect(out).toHaveLength(passages.length)
    expect(new Set(out.map(p => p.id)).size).toBe(passages.length)
  })

  it('does not mutate the input array', () => {
    const before = passages.map(p => p.id)
    leadByLang(passages, 'en')
    expect(passages.map(p => p.id)).toEqual(before)
  })

  it('handles empty / non-array inputs defensively', () => {
    expect(leadByLang([], 'en')).toEqual([])
    expect(leadByLang(null, 'en')).toEqual([])
    expect(leadByLang(undefined, 'ms')).toEqual([])
  })

  it('treats items with a missing lang field as non-target (sink to the bottom group)', () => {
    const mixed = [{ id: 'a', lang: 'en' }, { id: 'b' }, { id: 'c', lang: 'en' }]
    // 'en' targets EN; the field-less item is not EN, so it sinks below.
    expect(leadByLang(mixed, 'en').map(p => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('accepts a custom accessor so it composes over wrapper objects (Comprehension path)', () => {
    // Comprehension feeds the already interest-prioritised { item, matchedInterests }
    // array; language must be the PRIMARY key while interest order is preserved
    // as the stable secondary order within each language group.
    const wrapped = [
      { item: { id: 'a', lang: 'ms' }, matchedInterests: new Set() },
      { item: { id: 'b', lang: 'en' }, matchedInterests: new Set(['x']) },
      { item: { id: 'c', lang: 'ms' }, matchedInterests: new Set() },
      { item: { id: 'd', lang: 'en' }, matchedInterests: new Set() },
    ]
    const out = leadByLang(wrapped, 'en', (w) => w.item.lang)
    expect(out.map(w => w.item.id)).toEqual(['b', 'd', 'a', 'c'])
    // The wrapper (and its matchedInterests) rides along untouched.
    expect(out[0].matchedInterests.has('x')).toBe(true)
  })
})
