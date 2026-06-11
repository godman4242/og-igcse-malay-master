import { describe, it, expect } from 'vitest'
import { State } from 'ts-fsrs'
import { interleaveByPrefix, shouldInterleave, BLOCK_FIRST_N } from '../study/interleaveByPrefix.js'
import { IMBUHAN_DRILLS } from '../../data/grammar.js'
import { CONFUSABLE_DRILLS_EN } from '../../data/grammarEng.js'

// ─── Helpers ──────────────────────────────────────────────────────
const d = (id, prefix) => ({ id, prefix, type: 'prefix' })

// Largest run of same-prefix adjacency in a sequence
const maxAdjacentRun = (arr) => {
  let max = 0, cur = 0, prev = null
  for (const x of arr) {
    cur = x.prefix === prev ? cur + 1 : 1
    if (cur > max) max = cur
    prev = x.prefix
  }
  return max
}
const prefixesOf = (arr) => arr.map((x) => x.prefix)
const idsOf = (arr) => arr.map((x) => x.id)

describe('interleaveByPrefix', () => {
  it('returns empty array unchanged', () => {
    const input = []
    expect(interleaveByPrefix(input)).toBe(input)
  })

  it('returns a single-element array unchanged', () => {
    const input = [d('a', 'meN-')]
    expect(interleaveByPrefix(input)).toBe(input)
  })

  it('is a no-op for a single-prefix set (same order)', () => {
    const input = [d('a', 'meN-'), d('b', 'meN-'), d('c', 'meN-')]
    const out = interleaveByPrefix(input)
    expect(idsOf(out)).toEqual(['a', 'b', 'c'])
  })

  it('guards non-imbuhan drills with no prefix field (returns as-is)', () => {
    const input = [
      { id: 'tense-1', type: 'tense' },
      { id: 'tense-2', type: 'tense' },
    ]
    expect(interleaveByPrefix(input)).toBe(input)
  })

  it('interleaves a realistic mixed imbuhan set (prefix + passive + suffix), grouping non-prefix drills by type', () => {
    const input = [
      d('m1', 'meN-'), d('m2', 'meN-'),
      d('b1', 'ber-'), d('b2', 'ber-'),
      { id: 'passive-1', type: 'passive' }, { id: 'passive-2', type: 'passive' },
      { id: 'suffix-1', type: 'suffix' }, { id: 'suffix-2', type: 'suffix' },
    ]
    const out = interleaveByPrefix(input)
    // nothing dropped or duplicated
    expect(new Set(idsOf(out))).toEqual(new Set(idsOf(input)))
    // confusable prefixes are separated (no meN-/ber- run)
    const definedPrefixRun = (arr) => {
      let max = 0, cur = 0, prev = null
      for (const x of arr) {
        if (!x.prefix) { cur = 0; prev = null; continue }
        cur = x.prefix === prev ? cur + 1 : 1
        if (cur > max) max = cur
        prev = x.prefix
      }
      return max
    }
    expect(definedPrefixRun(out)).toBe(1)
  })

  it('alternates so no two adjacent share a prefix for balanced buckets', () => {
    // 3 prefixes, 3 each, authored grouped (blocked)
    const input = [
      d('m1', 'meN-'), d('m2', 'meN-'), d('m3', 'meN-'),
      d('b1', 'ber-'), d('b2', 'ber-'), d('b3', 'ber-'),
      d('p1', 'peN-'), d('p2', 'peN-'), d('p3', 'peN-'),
    ]
    const out = interleaveByPrefix(input)
    expect(maxAdjacentRun(out)).toBe(1)
    // round-robin in first-appearance order
    expect(prefixesOf(out)).toEqual([
      'meN-', 'ber-', 'peN-',
      'meN-', 'ber-', 'peN-',
      'meN-', 'ber-', 'peN-',
    ])
  })

  it('preserves set membership and count (no drops, no dupes)', () => {
    const input = [
      d('m1', 'meN-'), d('m2', 'meN-'), d('m3', 'meN-'), d('m4', 'meN-'),
      d('b1', 'ber-'), d('b2', 'ber-'),
      d('p1', 'peN-'),
    ]
    const out = interleaveByPrefix(input)
    expect(out).toHaveLength(input.length)
    expect(new Set(idsOf(out))).toEqual(new Set(idsOf(input)))
  })

  it('keeps stable relative order within each prefix bucket', () => {
    const input = [
      d('m1', 'meN-'), d('m2', 'meN-'), d('m3', 'meN-'),
      d('b1', 'ber-'), d('b2', 'ber-'),
    ]
    const out = interleaveByPrefix(input)
    const meN = idsOf(out).filter((id) => id.startsWith('m'))
    const ber = idsOf(out).filter((id) => id.startsWith('b'))
    expect(meN).toEqual(['m1', 'm2', 'm3'])
    expect(ber).toEqual(['b1', 'b2'])
  })

  it('minimises adjacency for uneven real-world buckets (dominant bucket only repeats in the tail)', () => {
    // meN- dominates (pigeonhole: some adjacency is unavoidable), but the
    // first stretch must alternate cleanly.
    const input = [
      ...Array.from({ length: 8 }, (_, i) => d(`m${i}`, 'meN-')),
      ...Array.from({ length: 3 }, (_, i) => d(`b${i}`, 'ber-')),
      ...Array.from({ length: 2 }, (_, i) => d(`p${i}`, 'peN-')),
    ]
    const out = interleaveByPrefix(input)
    expect(out).toHaveLength(13)
    // first 6 (2 full rounds of 3 buckets) alternate with no repeat
    expect(maxAdjacentRun(out.slice(0, 6))).toBe(1)
  })

  it('is deterministic (same input → same output)', () => {
    const input = [
      d('m1', 'meN-'), d('b1', 'ber-'), d('m2', 'meN-'),
      d('p1', 'peN-'), d('b2', 'ber-'),
    ]
    expect(idsOf(interleaveByPrefix(input))).toEqual(idsOf(interleaveByPrefix(input)))
  })

  it('does not mutate the input array', () => {
    const input = [d('m1', 'meN-'), d('b1', 'ber-'), d('m2', 'meN-')]
    const snapshot = idsOf(input)
    interleaveByPrefix(input)
    expect(idsOf(input)).toEqual(snapshot)
  })

  it('returns drills unchanged when input is not an array', () => {
    expect(interleaveByPrefix(null)).toBe(null)
    expect(interleaveByPrefix(undefined)).toBe(undefined)
  })

  // Regression guard: IMBUHAN_DRILLS is a MIXED set (prefix + passive + suffix).
  // An all-or-nothing "every drill must have a prefix" guard would silently
  // no-op the whole toggle on the real data.
  it('actually reorders the real IMBUHAN_DRILLS set (not a silent no-op)', () => {
    const out = interleaveByPrefix(IMBUHAN_DRILLS)
    expect(out).toHaveLength(IMBUHAN_DRILLS.length)
    expect(new Set(out.map((dr) => dr.id))).toEqual(new Set(IMBUHAN_DRILLS.map((dr) => dr.id)))
    // order must change (authored order is blocked by form)
    expect(out.map((dr) => dr.id)).not.toEqual(IMBUHAN_DRILLS.map((dr) => dr.id))
    // first six drills must not all share one prefix (the authored block is broken up)
    const firstPrefixes = out.slice(0, 6).map((dr) => dr.prefix).filter(Boolean)
    expect(new Set(firstPrefixes).size).toBeGreaterThan(1)
  })

  it('leaves the English confusable set untouched (no prefix field)', () => {
    expect(interleaveByPrefix(CONFUSABLE_DRILLS_EN)).toBe(CONFUSABLE_DRILLS_EN)
  })
})

// ─── shouldInterleave (block-first gate, Claim 4b) ────────────────
const gc = (state) => ({ state, reps: 1, lapses: 0 })

describe('shouldInterleave', () => {
  it('exports a conservative default threshold of 3', () => {
    expect(BLOCK_FIRST_N).toBe(3)
  })

  it('is false with no grammar history at all', () => {
    expect(shouldInterleave('prefix', {})).toBe(false)
  })

  it('is false for null/undefined inputs (no crash)', () => {
    expect(shouldInterleave('prefix', null)).toBe(false)
    expect(shouldInterleave(undefined, {})).toBe(false)
  })

  it('does not count New or Learning cards as learned', () => {
    const cards = {
      'prefix-meN-a': gc(State.New),
      'prefix-meN-b': gc(State.Learning),
      'prefix-ber-c': gc(State.Learning),
    }
    expect(shouldInterleave('prefix', cards)).toBe(false)
  })

  it('is false at N-1 graduated drills', () => {
    const cards = {
      'prefix-meN-a': gc(State.Review),
      'prefix-ber-b': gc(State.Review),
      'prefix-peN-c': gc(State.Learning),
    }
    expect(shouldInterleave('prefix', cards)).toBe(false)
  })

  it('is true at exactly N graduated drills', () => {
    const cards = {
      'prefix-meN-a': gc(State.Review),
      'prefix-ber-b': gc(State.Review),
      'prefix-peN-c': gc(State.Review),
    }
    expect(shouldInterleave('prefix', cards)).toBe(true)
  })

  it('counts Relearning (lapsed-from-Review) as learned', () => {
    const cards = {
      'prefix-meN-a': gc(State.Review),
      'prefix-ber-b': gc(State.Relearning),
      'prefix-peN-c': gc(State.Review),
    }
    expect(shouldInterleave('prefix', cards)).toBe(true)
  })

  it('counts drill types independently (tense history does not unlock prefix)', () => {
    const cards = {
      'tense-1': gc(State.Review),
      'tense-2': gc(State.Review),
      'tense-3': gc(State.Review),
      'prefix-meN-a': gc(State.Review),
    }
    expect(shouldInterleave('prefix', cards)).toBe(false)
    expect(shouldInterleave('tense', cards)).toBe(true)
  })

  it('respects a custom N', () => {
    const cards = {
      'prefix-meN-a': gc(State.Review),
      'prefix-ber-b': gc(State.Review),
    }
    expect(shouldInterleave('prefix', cards, 2)).toBe(true)
    expect(shouldInterleave('prefix', cards, 3)).toBe(false)
  })
})
