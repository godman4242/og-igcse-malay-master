// Coverage for the pure LCS word-diff that powers the pronunciation/speaking
// colored feedback (✅ kept / ❌ changed). Pure + deterministic (no randomness,
// no DOM, no deps), so the contract is fully pinnable. Expectations are grounded
// against the function's REAL output (captured before writing these), not a
// guess. Behaviour-preserving: this adds tests only, it does not change diff.js.
import { describe, it, expect } from 'vitest'
import { computeWordDiff } from '../diff'

describe('computeWordDiff', () => {
  it('returns a single equal group for identical text', () => {
    expect(computeWordDiff('hello world', 'hello world')).toEqual([
      { type: 'equal', value: 'hello world' },
    ])
  })

  it('marks the whole new text as added when old is empty', () => {
    expect(computeWordDiff('', 'hello world')).toEqual([
      { type: 'add', value: 'hello world' },
    ])
  })

  it('marks the whole old text as removed when new is empty', () => {
    expect(computeWordDiff('hello world', '')).toEqual([
      { type: 'remove', value: 'hello world' },
    ])
  })

  it('returns an empty diff when both sides are empty', () => {
    expect(computeWordDiff('', '')).toEqual([])
  })

  it('detects a single inserted word in the middle', () => {
    expect(computeWordDiff('the cat', 'the big cat')).toEqual([
      { type: 'equal', value: 'the' },
      { type: 'add', value: 'big' },
      { type: 'equal', value: 'cat' },
    ])
  })

  it('detects a single removed word in the middle', () => {
    expect(computeWordDiff('the big cat', 'the cat')).toEqual([
      { type: 'equal', value: 'the' },
      { type: 'remove', value: 'big' },
      { type: 'equal', value: 'cat' },
    ])
  })

  it('represents a replaced word as remove-then-add between the equal anchors', () => {
    expect(computeWordDiff('the cat sat', 'the dog sat')).toEqual([
      { type: 'equal', value: 'the' },
      { type: 'remove', value: 'cat' },
      { type: 'add', value: 'dog' },
      { type: 'equal', value: 'sat' },
    ])
  })

  it('groups a fully replaced phrase into one remove group then one add group', () => {
    expect(computeWordDiff('a b c', 'x y z')).toEqual([
      { type: 'remove', value: 'a b c' },
      { type: 'add', value: 'x y z' },
    ])
  })

  it('normalises whitespace (collapses runs, trims edges) before diffing', () => {
    expect(computeWordDiff('  hello   world  ', 'hello world')).toEqual([
      { type: 'equal', value: 'hello world' },
    ])
  })

  it('joins each adjacent run of the same type into one space-separated group', () => {
    // "saya makan" stays equal as ONE group; only the final word differs.
    expect(computeWordDiff('saya makan nasi', 'saya makan roti')).toEqual([
      { type: 'equal', value: 'saya makan' },
      { type: 'remove', value: 'nasi' },
      { type: 'add', value: 'roti' },
    ])
  })

  it('never emits two adjacent groups of the same type', () => {
    const samples = [
      ['the quick brown fox', 'the slow brown dog'],
      ['one two three four', 'one three five'],
      ['a a a', 'a b a'],
    ]
    for (const [a, b] of samples) {
      const groups = computeWordDiff(a, b)
      for (let k = 1; k < groups.length; k++) {
        expect(groups[k].type, `adjacent same-type at ${k} for "${a}"→"${b}"`)
          .not.toBe(groups[k - 1].type)
      }
    }
  })

  it('reconstruction invariant: equal+remove rebuilds old words, equal+add rebuilds new words', () => {
    const samples = [
      ['the cat sat on the mat', 'the dog sat under the mat'],
      ['saya suka makan nasi goreng', 'saya suka minum air sejuk'],
      ['hello', 'hello world again'],
      ['keep all of these words', 'keep all of these words'],
    ]
    for (const [a, b] of samples) {
      const groups = computeWordDiff(a, b)
      const oldRebuilt = groups
        .filter(g => g.type === 'equal' || g.type === 'remove')
        .map(g => g.value).join(' ')
      const newRebuilt = groups
        .filter(g => g.type === 'equal' || g.type === 'add')
        .map(g => g.value).join(' ')
      expect(oldRebuilt).toBe(a.split(/\s+/).filter(Boolean).join(' '))
      expect(newRebuilt).toBe(b.split(/\s+/).filter(Boolean).join(' '))
    }
  })
})
