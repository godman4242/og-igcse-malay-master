// Behaviour-preserving coverage for src/lib/feedback.js — the elaborative-feedback
// layer behind grammar drills, the vocab "Again" tip, and the Hattie/Timperley
// three-line session feedback. Four exported functions:
//   - buildDrillFeedback(drill, correct):  pure → known-rule passthrough vs fallback
//   - buildTenseFeedback(drill, chosen):   pure → correct/chosen map lookup + relatedRule
//   - buildVocabFeedback(card):            pure → card.state → VOCAB_TIPS bucket
//   - buildSessionFeedback(ctx, data, st): mostly pure; the ONLY time-dependency is the
//                                          examDate→daysToExam goal line (pinned with fake timers)
// Strings OWNED BY feedback.js (synthesized fallbacks, session lines) are asserted as
// hand-typed LITERALS so a regression in feedback.js actually fails. Passthrough of a
// data-file entry is asserted by reference (toBe) so a wrong-key regression fails.
// feedback.js is byte-identical: this adds tests only.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildDrillFeedback,
  buildTenseFeedback,
  buildVocabFeedback,
  buildSessionFeedback,
} from '../feedback'
import GRAMMAR_FEEDBACK, { VOCAB_TIPS } from '../../data/feedbackRules'

describe('buildDrillFeedback', () => {
  it('correct answer short-circuits to null (no feedback when right)', () => {
    expect(buildDrillFeedback({ rule: 'sudah' }, true)).toBe(null)
  })

  it('null drill → null', () => {
    expect(buildDrillFeedback(null, false)).toBe(null)
  })

  it('a known rule returns the exact GRAMMAR_FEEDBACK entry (by reference)', () => {
    const drill = { rule: 'sudah', hint: 'ignored when rule hits the map' }
    expect(buildDrillFeedback(drill, false)).toBe(GRAMMAR_FEEDBACK['sudah'])
  })

  it('unknown rule (rule wins over hint as the key) → fallback using the hint as explanation', () => {
    const drill = { rule: 'no-such-rule', hint: 'Remember P,T,K,S drop', answer: 'menulis' }
    const fb = buildDrillFeedback(drill, false)
    expect(fb.explanation).toBe('Remember P,T,K,S drop')
    expect(fb.mnemonic).toBe('Rule focus: no-such-rule')
    expect(fb.examples).toEqual([])
    expect(fb.relatedRule).toBe(null)
  })

  it('hint-only drill whose hint IS a map key → returns that GRAMMAR_FEEDBACK entry', () => {
    // no `rule`, so key falls back to `hint`
    const drill = { hint: 'akan' }
    expect(buildDrillFeedback(drill, false)).toBe(GRAMMAR_FEEDBACK['akan'])
  })

  it('hint-only drill whose hint is NOT a map key → fallback, mnemonic null (no rule)', () => {
    const drill = { hint: 'Use the future marker' }
    const fb = buildDrillFeedback(drill, false)
    expect(fb.explanation).toBe('Use the future marker')
    expect(fb.mnemonic).toBe(null)
    expect(fb.examples).toEqual([])
  })

  it('no rule and no hint, but an answer → "Expected answer: <answer>"', () => {
    const fb = buildDrillFeedback({ answer: 'membaca' }, false)
    expect(fb.explanation).toBe('Expected answer: membaca')
    expect(fb.mnemonic).toBe(null)
  })

  it('no rule, hint, or answer → "Expected answer: See correction."', () => {
    const fb = buildDrillFeedback({}, false)
    expect(fb.explanation).toBe('Expected answer: See correction.')
    expect(fb.mnemonic).toBe(null)
  })
})

describe('buildTenseFeedback', () => {
  it('null drill → null', () => {
    expect(buildTenseFeedback(null, 'akan')).toBe(null)
  })

  it('chosen === answer (correct) → null', () => {
    expect(buildTenseFeedback({ answer: 'akan', tense: 'future' }, 'akan')).toBe(null)
  })

  it('both answer and chosen in map → correct entry fields + relatedRule naming both + tense', () => {
    const drill = { answer: 'akan', tense: 'future' }
    const fb = buildTenseFeedback(drill, 'sudah')
    expect(fb.explanation).toBe(GRAMMAR_FEEDBACK['akan'].explanation)
    expect(fb.mnemonic).toBe(GRAMMAR_FEEDBACK['akan'].mnemonic)
    expect(fb.examples).toBe(GRAMMAR_FEEDBACK['akan'].examples)
    expect(fb.relatedRule).toBe('You chose "sudah". This sentence needs "akan" (future).')
  })

  it('neither in map → synthesized explanation, mnemonic null, examples [], relatedRule null', () => {
    const fb = buildTenseFeedback({ answer: 'xyz', tense: 'past' }, 'qqq')
    expect(fb.explanation).toBe('The correct tense marker is "xyz".')
    expect(fb.mnemonic).toBe(null)
    expect(fb.examples).toEqual([])
    expect(fb.relatedRule).toBe(null)
  })

  it('answer in map but chosen NOT in map → relatedRule null, correct fields still from map', () => {
    const fb = buildTenseFeedback({ answer: 'belum', tense: 'not-yet' }, 'no-such-marker')
    expect(fb.explanation).toBe(GRAMMAR_FEEDBACK['belum'].explanation)
    expect(fb.relatedRule).toBe(null)
  })
})

describe('buildVocabFeedback', () => {
  it('null card → state defaults to 0 → "new" tip', () => {
    expect(buildVocabFeedback(null)).toBe(VOCAB_TIPS.new)
  })

  it('state 0 → new', () => {
    expect(buildVocabFeedback({ state: 0 })).toBe(VOCAB_TIPS.new)
  })

  it('state 1 → learning', () => {
    expect(buildVocabFeedback({ state: 1 })).toBe(VOCAB_TIPS.learning)
  })

  it('state 2 (Review) → review (the else branch)', () => {
    expect(buildVocabFeedback({ state: 2 })).toBe(VOCAB_TIPS.review)
  })

  it('state 3 (Relearning) → relearning', () => {
    expect(buildVocabFeedback({ state: 3 })).toBe(VOCAB_TIPS.relearning)
  })

  it('card without a state field → ?? 0 → new', () => {
    expect(buildVocabFeedback({})).toBe(VOCAB_TIPS.new)
  })

  it('out-of-range state (4) → review', () => {
    expect(buildVocabFeedback({ state: 4 })).toBe(VOCAB_TIPS.review)
  })
})

describe('buildSessionFeedback — deterministic branches (no examDate)', () => {
  const DEFAULT_GOAL = 'Move steadily toward Band 5: aim for 85%+ on review-state cards.'

  it('unknown context → default goal, empty now/next, null href', () => {
    const r = buildSessionFeedback('nope', {}, {})
    expect(r).toEqual({ goal: DEFAULT_GOAL, now: '', next: '', nextHref: null })
  })

  it('study-session: acc < 60 → Mistakes journal next, /mistakes', () => {
    const r = buildSessionFeedback('study-session', { accuracy: 45, reviewed: 12 }, {})
    expect(r.goal).toBe(DEFAULT_GOAL)
    expect(r.now).toBe('Today: 45% accuracy across 12 cards.')
    expect(r.next).toBe("Tag wrong answers by reason in the Mistakes journal — that's where the biggest gains are.")
    expect(r.nextHref).toBe('/mistakes')
  })

  it('study-session: 60 <= acc < 80 → Mixed session next, /', () => {
    const r = buildSessionFeedback('study-session', { accuracy: 70, reviewed: 10 }, {})
    expect(r.next).toBe('Try a Mixed session to interleave grammar and reading — varied practice strengthens transfer.')
    expect(r.nextHref).toBe('/')
  })

  it('study-session: acc >= 80 + empty roleplay history → Roleplay next, /roleplay', () => {
    const st = { ai: { roleplayHistory: [] } }
    const r = buildSessionFeedback('study-session', { accuracy: 90, reviewed: 8 }, st)
    expect(r.next).toBe('Strong run! Try a Roleplay scenario — Paper 3 oral practice is the next lever.')
    expect(r.nextHref).toBe('/roleplay')
  })

  it('study-session: acc >= 80 + non-empty roleplay history → "keep it tight" next, /', () => {
    const st = { ai: { roleplayHistory: [{ id: 1 }] } }
    const r = buildSessionFeedback('study-session', { accuracy: 88, reviewed: 8 }, st)
    expect(r.next).toBe('Strong run! Tomorrow keep it tight — review queue first, then add 5 new cards.')
    expect(r.nextHref).toBe('/')
  })

  it('study-session: calibration snippet appended when totalEntries >= 5', () => {
    const st = { getConfidenceCalibration: () => ({ totalEntries: 5, overconfidentPct: 20, underconfidentPct: 10 }) }
    const r = buildSessionFeedback('study-session', { accuracy: 50, reviewed: 6 }, st)
    expect(r.now).toBe('Today: 50% accuracy across 6 cards. Confidence calibration: 20% over (Sure→Wrong) · 10% under (Unsure→Right).')
  })

  it('study-session: calibration snippet suppressed when totalEntries < 5', () => {
    const st = { getConfidenceCalibration: () => ({ totalEntries: 4, overconfidentPct: 99, underconfidentPct: 1 }) }
    const r = buildSessionFeedback('study-session', { accuracy: 50, reviewed: 6 }, st)
    expect(r.now).toBe('Today: 50% accuracy across 6 cards.')
  })

  it('study-session: missing accuracy/reviewed default to 0', () => {
    const r = buildSessionFeedback('study-session', {}, {})
    expect(r.now).toBe('Today: 0% accuracy across 0 cards.')
    expect(r.nextHref).toBe('/mistakes') // 0 < 60
  })

  it('grammar-drill: acc >= 80 → transformation next + weakest snippet in now', () => {
    const r = buildSessionFeedback('grammar-drill', { accuracy: 85, weakest: 'meN- prefix' }, {})
    expect(r.goal).toBe('Grammar accuracy is a Paper 2 band lever — aim for 80%+ on each drill type.')
    expect(r.now).toBe('Drill accuracy: 85% · weakest pattern: meN- prefix.')
    expect(r.next).toBe('Try transformation drills — the harder format builds production skills.')
    expect(r.nextHref).toBe('/grammar')
  })

  it('grammar-drill: acc < 80 → focus-weakest next, no weakest snippet when absent', () => {
    const r = buildSessionFeedback('grammar-drill', { accuracy: 60 }, {})
    expect(r.now).toBe('Drill accuracy: 60%.')
    expect(r.next).toBe('Focus the next session on the weakest pattern; small daily reps fix it fast.')
  })

  it('roleplay: score >= 70 → broaden range next + scenario snippet', () => {
    const r = buildSessionFeedback('roleplay', { score: 75, scenario: 'Kapal Terbang' }, {})
    expect(r.now).toBe('Roleplay score: 75/100 · scenario: Kapal Terbang.')
    expect(r.next).toBe('Try a different scenario to broaden topical range.')
    expect(r.nextHref).toBe('/roleplay')
  })

  it('roleplay: score < 70 → re-attempt next, no scenario snippet when absent', () => {
    const r = buildSessionFeedback('roleplay', { score: 40 }, {})
    expect(r.now).toBe('Roleplay score: 40/100.')
    expect(r.next).toBe('Re-attempt this scenario after reviewing the suggested phrases — repetition compounds.')
  })

  it('writing: band present → estimated band line', () => {
    const r = buildSessionFeedback('writing', { band: 5 }, {})
    expect(r.now).toBe('Estimated band: 5.')
    expect(r.next).toBe('Pick one suggested correction and rewrite that sentence — focused revision sticks better than re-reading.')
    expect(r.nextHref).toBe('/writing')
  })

  it('writing: band null/absent → "Submission analyzed."', () => {
    const r = buildSessionFeedback('writing', {}, {})
    expect(r.now).toBe('Submission analyzed.')
  })
})

describe('buildSessionFeedback — examDate goal lines (fake timers)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // Anchor "now" to an exact UTC midnight; examDate offsets are exact whole days,
  // so Math.ceil(diff/86400000) is exact and the band boundaries are non-flaky.
  const NOW = '2026-06-14T00:00:00.000Z'
  const goalFor = (examDate) => {
    vi.setSystemTime(new Date(NOW))
    return buildSessionFeedback('study-session', { accuracy: 50, reviewed: 1 }, { examDate }).goal
  }

  it('10 days out (<= 14) → Final stretch line', () => {
    expect(goalFor('2026-06-24T00:00:00.000Z')).toBe(
      'Final stretch — 10 days to exam. Hold steady on what you know; secure weak points.',
    )
  })

  it('30 days out (<= 60) → Review phase line', () => {
    expect(goalFor('2026-07-14T00:00:00.000Z')).toBe(
      'Review phase — 30 days out. Aim for 85%+ on review-state cards.',
    )
  })

  it('90 days out (> 60) → Build phase line', () => {
    expect(goalFor('2026-09-12T00:00:00.000Z')).toBe(
      'Build phase — 90 days out. Steady daily reps lock in long-term retention.',
    )
  })

  it('exam date in the past → daysToExam clamps to 0 → default goal line', () => {
    expect(goalFor('2026-06-10T00:00:00.000Z')).toBe(
      'Move steadily toward Band 5: aim for 85%+ on review-state cards.',
    )
  })
})
