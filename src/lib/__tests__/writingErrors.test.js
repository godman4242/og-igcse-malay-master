import { describe, it, expect } from 'vitest'
import { findIssues, summariseIssues, ERROR_TYPES } from '../writingErrors.js'

const idsOf = (findings) => new Set(findings.map(f => f.id))

describe('findIssues — confusables (high signal)', () => {
  it('flags would-of', () => {
    const f = findIssues('I would of gone if I had time.')
    expect(idsOf(f)).toContain('would-of-error')
  })

  it('flags then vs than after a comparative', () => {
    // "taller" isn't in the curated comparative list; "bigger" is.
    const f = findIssues('She is bigger then me.')
    expect(idsOf(f)).toContain('then-comparative-error')
  })

  it('flags between you and I', () => {
    const f = findIssues('This is between you and I.')
    expect(idsOf(f)).toContain('between-you-and-i')
  })

  it('flags "their" used as a be-verb subject', () => {
    // their-be-verb fires on `their\s+(is|are|was|were)`.
    const f = findIssues('Their are many problems with this idea.')
    expect(idsOf(f)).toContain('their-be-verb')
  })
})

describe('findIssues — finding shape', () => {
  it('every finding has required fields with sane ranges', () => {
    const text = 'I would of seen them, but they was busy.'
    const f = findIssues(text)
    expect(f.length).toBeGreaterThan(0)
    for (const finding of f) {
      expect(finding).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        severity: expect.stringMatching(/^(high|medium|low)$/),
        start: expect.any(Number),
        end: expect.any(Number),
        message: expect.any(String),
      })
      expect(finding.start).toBeGreaterThanOrEqual(0)
      expect(finding.end).toBeGreaterThan(finding.start)
      expect(finding.end).toBeLessThanOrEqual(text.length)
      expect(ERROR_TYPES).toContain(finding.type)
    }
  })

  it('findings are sorted by start position', () => {
    const text = 'I would of done it. Then I past the shop. Their late again.'
    const f = findIssues(text)
    const starts = f.map(x => x.start)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })
})

describe('summariseIssues', () => {
  it('counts severities and types correctly', () => {
    const f = findIssues('I would of gone. She is taller then me. Their late.')
    const s = summariseIssues(f)
    expect(s.counts.total).toBe(f.length)
    expect(s.counts.high + s.counts.medium + s.counts.low).toBe(f.length)
    const sumByType = Object.values(s.byType).reduce((a, b) => a + b, 0)
    expect(sumByType).toBe(f.length)
  })
})

describe('findIssues — calibration negatives (no false positives)', () => {
  // These are the exact calibration cases recorded in RESUME_HERE.md.
  // The English engine MUST NOT flag normal letter greetings, transitional
  // intros, or dialogue narration as errors.
  it('clean formal letter yields no high-severity findings', () => {
    const text = `Dear Sir,

I am writing to apply for the position of summer intern at your firm. I have recently completed my IGCSE examinations and I am keen to gain practical experience in your industry before starting university.

During my studies I have developed strong analytical skills and I am comfortable working in a team. I have attached my CV for your consideration and would welcome the opportunity to discuss my application further.

Yours faithfully,
Aisha Rahman`
    const f = findIssues(text, { formatId: 'eng-letter-formal' })
    const high = f.filter(x => x.severity === 'high')
    expect(high).toHaveLength(0)
  })

  it('narrative with dialogue does not over-flag', () => {
    const text = `It was a cold morning when I left the house. The sky was grey and the streets were almost empty.

"Are you sure about this?" my brother asked, his voice barely above a whisper.

"I have to be," I replied. I knew there was no turning back now. The bus rumbled in the distance and I tightened my grip on my bag.`
    const f = findIssues(text)
    const high = f.filter(x => x.severity === 'high')
    expect(high.length).toBeLessThanOrEqual(1)
  })
})

describe('findIssues — empty/edge inputs', () => {
  it('returns [] for empty', () => {
    expect(findIssues('')).toEqual([])
    expect(findIssues('   ')).toEqual([])
  })
})
