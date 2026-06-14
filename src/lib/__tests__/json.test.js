// Coverage for the best-effort JSON parser that survives common LLM output
// quirks — object/array pass-through, bare JSON, and prose-wrapped {...}
// recovery. It is load-bearing for AI writing feedback (useWritingEvaluator
// parses the model response through it). Pure + deterministic (no DOM, no
// randomness, no deps), so the contract is fully pinnable. Expectations are
// grounded against the function's REAL output (captured via a node probe
// before writing these), not a guess. Behaviour-preserving: this adds tests
// only, it does not change json.js.
import { describe, it, expect } from 'vitest'
import { tryParseJSON } from '../json'

describe('tryParseJSON', () => {
  describe('falsy guard → null', () => {
    it('returns null for an empty string', () => {
      expect(tryParseJSON('')).toBeNull()
    })
    it('returns null for null', () => {
      expect(tryParseJSON(null)).toBeNull()
    })
    it('returns null for undefined', () => {
      expect(tryParseJSON(undefined)).toBeNull()
    })
  })

  describe('object pass-through (no clone)', () => {
    it('returns an already-parsed object by the SAME reference', () => {
      const obj = { a: 1, nested: { b: 2 } }
      expect(tryParseJSON(obj)).toBe(obj)
    })
    it('returns an already-parsed array by the SAME reference (typeof array === object)', () => {
      const arr = [1, 2, 3]
      expect(tryParseJSON(arr)).toBe(arr)
    })
  })

  describe('bare JSON parses normally', () => {
    it('parses a bare object string', () => {
      expect(tryParseJSON('{"a":1}')).toEqual({ a: 1 })
    })
    it('parses a bare array string', () => {
      expect(tryParseJSON('[1,2,3]')).toEqual([1, 2, 3])
    })
    it('parses a bare primitive string on the first try (no recovery needed)', () => {
      expect(tryParseJSON('123')).toBe(123)
    })
  })

  describe('prose-wrapped {...} recovery', () => {
    it('extracts the first object from surrounding prose', () => {
      expect(tryParseJSON('Here is the result: {"band":6} hope it helps')).toEqual({ band: 6 })
    })
    it('recovers a multiline object (the [\\s\\S] class spans newlines)', () => {
      expect(tryParseJSON('prefix\n{\n  "a": 1\n}\nsuffix')).toEqual({ a: 1 })
    })
    it('recovers an object from a ```json code fence (a common LLM quirk)', () => {
      expect(tryParseJSON('```json\n{"a":1,"b":[2,3]}\n```')).toEqual({ a: 1, b: [2, 3] })
    })
    it('recovers a nested object when the last } is the real closer', () => {
      expect(tryParseJSON('prefix {"a":{"b":2},"c":[1,2]} suffix')).toEqual({
        a: { b: 2 },
        c: [1, 2],
      })
    })
  })

  describe('unrecoverable → null', () => {
    it('returns null on greedy over-capture of two separate objects in prose', () => {
      // The regex is greedy (/\{[\s\S]*\}/), so it spans the first { to the LAST },
      // capturing '{"a":1} text {"b":2}' — invalid JSON — rather than the first object.
      expect(tryParseJSON('{"a":1} text {"b":2}')).toBeNull()
    })
    it('returns null for prose with no braces', () => {
      expect(tryParseJSON('just prose no json')).toBeNull()
    })
    it('returns null when the extracted brace content is malformed JSON', () => {
      expect(tryParseJSON('{not valid json}')).toBeNull()
    })
  })
})
