import { describe, it, expect } from 'vitest'
import { harvestMistakesFromGrade, harvestAIImprovements } from '../writingMistakeHarvest.js'

describe('harvestMistakesFromGrade', () => {
  it('returns [] for null / empty / no-feedback grade', () => {
    expect(harvestMistakesFromGrade(null)).toEqual([])
    expect(harvestMistakesFromGrade(undefined)).toEqual([])
    expect(harvestMistakesFromGrade({})).toEqual([])
    expect(harvestMistakesFromGrade({ feedback: {} })).toEqual([])
  })

  it('maps language from page-level lang toggle', () => {
    const r = {
      format: 'eng-article',
      feedback: { sentences: [{ text: 'a', errors: [{ type: 'grammar' }] }] },
    }
    expect(harvestMistakesFromGrade(r, { lang: 'eng' })[0].language).toBe('en')
    expect(harvestMistakesFromGrade(r, { lang: 'malay' })[0].language).toBe('ms')
  })

  it('falls back to format prop when grader did not set r.format', () => {
    const r = { feedback: { sentences: [{ text: 'a', errors: [{ type: 'spelling' }] }] } }
    const out = harvestMistakesFromGrade(r, { lang: 'eng', format: 'eng-letter-formal' })
    expect(out[0].source).toBe('eng-letter-formal')
  })

  it.each([
    ['imbuhan', 'imbuhan'],
    ['tense', 'tense'],
    ['spelling', 'spelling'],
    ['register', 'register'],
    ['cohesion', 'cohesion'],
    ['Grammar', 'other'],
    [undefined, 'other'],
  ])('routes err.type "%s" → category "%s"', (errType, category) => {
    const r = {
      format: 'eng-article',
      feedback: { sentences: [{ text: 's', errors: [{ type: errType }] }] },
    }
    const [m] = harvestMistakesFromGrade(r, { lang: 'eng' })
    expect(m.category).toBe(category)
  })

  it('severity is high only when err.severity === "high", otherwise med', () => {
    const r = {
      format: 'eng-article',
      feedback: { sentences: [{
        text: 'x',
        errors: [{ severity: 'high' }, { severity: 'medium' }, { severity: 'low' }, {}],
      }] },
    }
    const out = harvestMistakesFromGrade(r, { lang: 'eng' })
    expect(out.map(m => m.severity)).toEqual(['high', 'med', 'med', 'med'])
  })

  it('imbuhan analysis skips entries missing used or correct', () => {
    const r = {
      format: 'ms-rencana',
      feedback: {
        imbuhanAnalysis: {
          incorrect: [
            { used: 'mempukul', correct: 'memukul', note: 'wrong nasal' },
            { used: '', correct: 'memukul' },        // skipped
            { used: 'mengkira' },                     // skipped (no correct/suggested)
            { used: 'menanya', suggested: 'bertanya' }, // suggested fallback
          ],
        },
      },
    }
    const out = harvestMistakesFromGrade(r, { lang: 'malay' })
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      category: 'imbuhan',
      language: 'ms',
      word: 'mempukul',
      correct: 'memukul',
      note: 'wrong nasal',
    })
    expect(out[1].correct).toBe('bertanya') // suggested → correct fallback
  })

  it('every mistake has a stable shape', () => {
    const r = {
      format: 'eng-article',
      feedback: {
        sentences: [{ text: 'whole sentence', improved: 'better sentence', errors: [{ type: 'grammar', snippet: 'bad', fix: 'good', issue: 'why' }] }],
        imbuhanAnalysis: { incorrect: [{ used: 'mempukul', correct: 'memukul' }] },
      },
    }
    const out = harvestMistakesFromGrade(r, { lang: 'eng' })
    for (const m of out) {
      expect(m).toMatchObject({
        type: 'writing',
        source: expect.any(String),
        language: expect.stringMatching(/^(en|ms)$/),
        category: expect.any(String),
        severity: expect.stringMatching(/^(high|med)$/),
      })
    }
  })
})

describe('harvestAIImprovements', () => {
  it('returns [] when input lacks improvements array', () => {
    expect(harvestAIImprovements(null, { format: 'x' })).toEqual([])
    expect(harvestAIImprovements({}, { format: 'x' })).toEqual([])
    expect(harvestAIImprovements({ improvements: 'oops' }, { format: 'x' })).toEqual([])
  })

  it('escalates severity when band ≤ 3', () => {
    const lo = harvestAIImprovements({ band: 3, improvements: ['fix this'] }, { format: 'eng-article' })
    const hi = harvestAIImprovements({ band: 5, improvements: ['fix this'] }, { format: 'eng-article' })
    expect(lo[0].severity).toBe('high')
    expect(hi[0].severity).toBe('med')
  })

  it('truncates surface excerpts to 140 chars', () => {
    const long = 'x'.repeat(500)
    const out = harvestAIImprovements({ band: 5, improvements: [long] }, { format: 'eng-article' })
    expect(out[0].surface.length).toBe(140)
  })

  it('falls back source to eng-general when no format passed', () => {
    const out = harvestAIImprovements({ band: 5, improvements: ['x'] }, {})
    expect(out[0].source).toBe('eng-general')
  })
})
