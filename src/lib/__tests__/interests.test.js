import { describe, it, expect } from 'vitest'
import { INTERESTS, matchInterests, prioritiseByInterests } from '../interests'

describe('INTERESTS catalog', () => {
  it('exposes a curated, deduplicated set of IGCSE-themed interests', () => {
    const ids = INTERESTS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(8)
    // Must include the four interests the user named in the brief
    expect(ids).toContain('environment')
    expect(ids).toContain('travel')
    expect(ids).toContain('technology')
    expect(ids).toContain('sports')
  })

  it('every interest carries label, emoji, and a non-empty matchers list', () => {
    for (const i of INTERESTS) {
      expect(i.label).toBeTruthy()
      expect(i.emoji).toBeTruthy()
      expect(Array.isArray(i.matchers)).toBe(true)
      expect(i.matchers.length).toBeGreaterThan(0)
      // Matchers are lowercase by convention so the substring search stays simple
      for (const m of i.matchers) expect(m).toBe(m.toLowerCase())
    }
  })
})

describe('matchInterests', () => {
  it('returns empty Set on no starred interests', () => {
    expect(matchInterests(['environment'], []).size).toBe(0)
    expect(matchInterests(['environment'], undefined).size).toBe(0)
    expect(matchInterests(['environment'], null).size).toBe(0)
  })

  it('returns empty Set on empty / non-array topic tokens', () => {
    expect(matchInterests([], ['environment']).size).toBe(0)
    expect(matchInterests(null, ['environment']).size).toBe(0)
  })

  it('matches by case-insensitive substring across the token bag', () => {
    expect(matchInterests(['Alam Sekitar'], ['environment']).has('environment')).toBe(true)
    expect(matchInterests(['Kapal-Terbang'], ['travel']).has('travel')).toBe(true)
    expect(matchInterests(['Hari Sukan'], ['sports']).has('sports')).toBe(true)
    // English titles also match — scenarios pass [id, title, titleEn]
    expect(matchInterests(['hotel-booking', 'Booking a Hotel Room'], ['travel']).has('travel')).toBe(true)
  })

  it('returns the FULL intersection when one item triggers multiple starred interests', () => {
    // A "school cafe interview" scenario could plausibly trigger both
    // education AND work AND food — make sure we surface all hits.
    const tokens = ['cafe-interview', 'School Cafe Interview']
    const matched = matchInterests(tokens, ['education', 'work', 'food', 'sports'])
    expect(matched.has('education')).toBe(true)
    expect(matched.has('work')).toBe(true)
    expect(matched.has('food')).toBe(true)
    expect(matched.has('sports')).toBe(false)
  })

  it('does not match interests the student has not starred', () => {
    const matched = matchInterests(['Alam Sekitar'], ['travel', 'sports'])
    expect(matched.size).toBe(0)
  })
})

describe('prioritiseByInterests', () => {
  const items = [
    { id: 'a', topic: 'keluarga' },
    { id: 'b', topic: 'alam sekitar' },
    { id: 'c', topic: 'pendidikan' },
    { id: 'd', topic: 'kesihatan' },
    { id: 'e', topic: 'environment' },
  ]
  const getTopic = (it) => [it.topic]

  it('returns items unchanged when no interests are starred', () => {
    const out = prioritiseByInterests(items, [], getTopic)
    expect(out.map(r => r.item.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    for (const r of out) expect(r.matchedInterests.size).toBe(0)
  })

  it('pulls matching items to the top, stable within each group', () => {
    const out = prioritiseByInterests(items, ['environment', 'health'], getTopic)
    // b (alam sekitar) and e (environment) match environment;
    // d (kesihatan) matches health; a + c do not match — keep original order.
    expect(out.map(r => r.item.id)).toEqual(['b', 'd', 'e', 'a', 'c'])
    // Matched items carry a populated set; unmatched ones carry empty
    expect(out[0].matchedInterests.has('environment')).toBe(true)
    expect(out[1].matchedInterests.has('health')).toBe(true)
    expect(out[2].matchedInterests.has('environment')).toBe(true)
    expect(out[3].matchedInterests.size).toBe(0)
    expect(out[4].matchedInterests.size).toBe(0)
  })

  it('handles empty / non-array inputs defensively', () => {
    expect(prioritiseByInterests([], ['travel'], getTopic)).toEqual([])
    expect(prioritiseByInterests(null, ['travel'], getTopic)).toEqual([])
  })

  it('does not mutate the input array', () => {
    const before = items.map(i => i.id)
    prioritiseByInterests(items, ['environment'], getTopic)
    expect(items.map(i => i.id)).toEqual(before)
  })
})
