// Weak-spot practice seed — turns the learner's top weak mistake-categories
// (buildLearnerProfile().focusTopics) into a readable, language-aware goal +
// topic list that biases the AI deck / roleplay generators. Empty mistakes →
// empty seed (the UI hides the one-tap entry).
// Spec: docs/superpowers/specs/2026-06-29-weak-spot-practice-seed-design.md
import { describe, it, expect } from 'vitest'
import { weakSpotSeed } from '../weakSpotSeed'

const DAY = 86400000

describe('weakSpotSeed', () => {
  it('returns an empty seed when there are no recent mistakes', () => {
    expect(weakSpotSeed({ mistakes: [] }, 'ms')).toEqual({ topics: [], goal: '' })
    expect(weakSpotSeed({}, 'ms')).toEqual({ topics: [], goal: '' })
    expect(weakSpotSeed(null, 'ms')).toEqual({ topics: [], goal: '' })
  })

  it('maps Malay weak categories to readable phrases, weight-ordered, into a goal', () => {
    const now = Date.now()
    const seed = weakSpotSeed({
      mistakes: [
        // imbuhan, high + recent (meN- surface) → weight 8 → first
        { id: 'a', category: 'imbuhan', severity: 'high', language: 'ms', surface: 'mengerja', timestamp: now - DAY },
        // tense, med + old → weight 2
        { id: 'b', category: 'tense', severity: 'med', language: 'ms', surface: 'sudah', timestamp: now - 10 * DAY },
        // spelling, low + old → weight 1
        { id: 'c', category: 'spelling', severity: 'low', language: 'ms', surface: 'sekolah', timestamp: now - 10 * DAY },
      ],
    }, 'ms')

    expect(seed.topics).toEqual(['imbuhan (awalan meN-)', 'penanda masa', 'ejaan'])
    expect(seed.goal).toBe('Fokus pada kelemahan saya: imbuhan (awalan meN-), penanda masa dan ejaan.')
  })

  it('uses English phrasing and connector for an English learner', () => {
    const now = Date.now()
    const seed = weakSpotSeed({
      mistakes: [
        { id: 'a', category: 'vocab', severity: 'high', language: 'en', surface: 'consequence', timestamp: now - DAY },
        { id: 'b', category: 'tense', severity: 'low', language: 'en', surface: 'had gone', timestamp: now - 10 * DAY },
      ],
    }, 'en')

    expect(seed.topics).toEqual(['vocabulary', 'verb tenses'])
    expect(seed.goal).toBe('Focus on my weak areas: vocabulary and verb tenses.')
  })

  it('excludes mistakes tagged for the other language', () => {
    const now = Date.now()
    // An English mistake must not surface in a Malay seed.
    const seed = weakSpotSeed({
      mistakes: [{ id: 'a', category: 'vocab', severity: 'high', language: 'en', surface: 'x', timestamp: now - DAY }],
    }, 'ms')
    expect(seed).toEqual({ topics: [], goal: '' })
  })

  it('falls back to a generic phrase for an unrecognised category', () => {
    const now = Date.now()
    const seed = weakSpotSeed({
      mistakes: [{ id: 'a', category: 'totally-unknown-cat', severity: 'high', language: 'ms', surface: 'x', timestamp: now - DAY }],
    }, 'ms')
    expect(seed.topics).toEqual(['latihan am'])
    expect(seed.goal).toBe('Fokus pada kelemahan saya: latihan am.')
  })

  it('degrades to an empty seed (never throws) if profiling fails', () => {
    // Called during ForYou render — a throw here would white-screen the panel,
    // so a corrupted/proxied store must degrade, not crash (cf. the try/catch
    // around buildLearnerProfile in RoleplaySession / useWritingEvaluator).
    const evilStore = { get mistakes() { throw new Error('boom') } }
    expect(() => weakSpotSeed(evilStore, 'ms')).not.toThrow()
    expect(weakSpotSeed(evilStore, 'ms')).toEqual({ topics: [], goal: '' })
  })

  it('caps at the profile top-3 and joins a single topic without a connector', () => {
    const now = Date.now()
    const single = weakSpotSeed({
      mistakes: [{ id: 'a', category: 'register', severity: 'high', language: 'ms', surface: 'x', timestamp: now - DAY }],
    }, 'ms')
    expect(single.topics).toEqual(['laras bahasa'])
    expect(single.goal).toBe('Fokus pada kelemahan saya: laras bahasa.')

    // Five distinct categories → profile keeps only the top 3.
    const many = weakSpotSeed({
      mistakes: ['vocab', 'imbuhan', 'tense', 'spelling', 'cohesion'].map((cat, i) => ({
        id: `m${i}`, category: cat, severity: 'high', language: 'ms', surface: 'x', timestamp: now - (i + 1) * 1000,
      })),
    }, 'ms')
    expect(many.topics).toHaveLength(3)
  })
})
